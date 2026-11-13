import { randomUUID } from "node:crypto"
import { and, desc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import type { Db, Tx } from "../db/client.js"
import type { AuthUser } from "../auth/users.js"
import { audit_events, certificates, cohort_batches, completion_checks, completion_credentials, completion_events, completion_policies, completions, course_offers, courses } from "../db/schema.js"
import { badRequest, conflict, forbidden, notFound } from "../errors.js"
import { notify } from "../modules/student/notify.js"
import { parse } from "../http.js"

export const policySchema=z.object({requiredLessonsPercent:z.number().min(0).max(100).default(100),requiredLessonIds:z.array(z.string().min(1)).max(5000).nullable().default(null),requiredAssessments:z.boolean().default(true),passMark:z.number().min(0).max(100).default(40),batchEnded:z.boolean().default(true),attendancePercent:z.number().min(0).max(100).default(0)})
export type CompletionPolicy=z.infer<typeof policySchema>
export type LearningContext={course_id:string;context_key:string;batch_id:string|null;offer_id:string|null}
export async function lockAcademicRecord(tx:Tx,student:string,course:string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'academic:'+student+':'+course}))`)
}
export async function contextsFor(db:Tx,student:string,course?:string) {
  const rows=await db.execute(sql`select distinct g.course_id,g.batch_id,g.offer_id,case when g.batch_id is not null then 'batch:'||g.batch_id when g.offer_id is not null then 'offer:'||g.offer_id else 'legacy:'||g.course_id end as context_key
    from lms.entitlement_grants g where g.student_id=${student}::uuid and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now())
    ${course?sql`and g.course_id=${course}`:sql``}
    and (g.batch_id is null or exists(select 1 from lms.batch_registrations br where br.batch_id=g.batch_id and br.student_id=g.student_id and br.state='confirmed'))`)
  // Multiple source grants must not create multiple checks or credentials for the same context.
  return [...new Map((rows.rows as unknown as LearningContext[]).map(c=>[c.context_key,c])).values()]
}
export async function enqueueCompletion(tx:Tx,student:string,course:string) {
  await tx.insert(completion_checks).values({student_id:student,course_id:course}).onConflictDoUpdate({target:[completion_checks.student_id,completion_checks.course_id],set:{requested_version:sql`${completion_checks.requested_version}+1`,available_at:new Date(),error:null}})
}
export async function enqueueCourseCompletions(tx:Tx,course:string) {
  await tx.execute(sql`insert into lms.completion_checks(student_id,course_id) select distinct student_id,course_id from lms.entitlement_grants where course_id=${course} and revoked_at is null on conflict(student_id,course_id) do update set requested_version=lms.completion_checks.requested_version+1,available_at=now(),error=null`)
}
export async function contextPolicy(tx:Tx,c:LearningContext) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'policy:'+c.context_key}))`)
  const [existing]=await tx.select().from(completion_policies).where(eq(completion_policies.context_key,c.context_key)).orderBy(desc(completion_policies.version)).limit(1)
  if(existing)return {...existing,rules:parse(policySchema,existing.rules)}
  const [offer]=c.offer_id?await tx.select().from(course_offers).where(eq(course_offers.id,c.offer_id)):[]
  const rules=parse(policySchema,offer?.completion_policy??{})
  const [created]=await tx.insert(completion_policies).values({course_id:c.course_id,context_key:c.context_key,version:1,rules}).returning()
  return {...created,rules}
}
export async function savePolicy(tx:Tx,actor:AuthUser,c:LearningContext,input:unknown,expectedVersion:number) {
  const rules=parse(policySchema,input),previous=await contextPolicy(tx,c)
  if(previous.version!==expectedVersion)throw conflict("The completion policy changed. Reload before saving.")
  if(rules.requiredLessonIds){
    const result=await tx.execute(sql`select id from lms.lessons where course_id=${c.course_id} and archived_at is null`)
    if(rules.requiredLessonIds.some(id=>!result.rows.some(r=>r.id===id)))throw badRequest("Required lessons must belong to this course")
    if(!rules.requiredLessonIds.length&&rules.requiredLessonsPercent>0)throw badRequest("Choose required lessons or use all lessons")
  }
  const [policy]=await tx.insert(completion_policies).values({course_id:c.course_id,context_key:c.context_key,version:previous.version+1,rules,created_by:actor.id}).returning()
  await tx.insert(audit_events).values({actor_id:actor.id,actor_role:actor.role,action:"completion.policy-version",target:policy.id,outcome:`version ${policy.version}; existing credentials unchanged`})
  await enqueueCourseCompletions(tx,c.course_id)
  return policy
}
async function evidenceFor(tx:Tx,student:string,c:LearningContext,rules:CompletionPolicy) {
  const lessonRows=await tx.execute(sql`select l.id,exists(select 1 from lms.lesson_progress p where p.lesson_id=l.id and p.student_id=${student}::uuid) as done from lms.lessons l where l.course_id=${c.course_id} and l.archived_at is null`)
  const required=lessonRows.rows.filter(l=>!rules.requiredLessonIds||rules.requiredLessonIds.includes(String(l.id)))
  const completed=required.filter(l=>l.done).length,lessonPercent=required.length?100*completed/required.length:0
  const checks=await tx.execute(sql`select ao.id,ao.title,ao.passing_pct,ao.quiz_id,ao.assignment_id,
    (select max(qa.pct) from lms.quiz_attempts qa where qa.student_id=${student}::uuid and qa.quiz_id=ao.quiz_id and qa.submitted_at is not null) as quiz_pct,
    (select max(100.0*s.score/a.max_marks) from lms.assignment_submissions s join lms.assignments a on a.id=s.assignment_id where s.student_id=${student}::uuid and s.assignment_id=ao.assignment_id and s.status='Graded') as assignment_pct
    from lms.assessment_offerings ao where ao.course_id=${c.course_id} and ao.required and ao.status='Published' and
    (${c.batch_id?sql`ao.batch_id=${c.batch_id}`:c.offer_id?sql`ao.offer_id=${c.offer_id} and ao.context='self_paced'`:sql`ao.context='legacy'`})`)
  const assessments=checks.rows.map(a=>({id:String(a.id),title:String(a.title),required_pct:Math.max(Number(a.passing_pct),rules.passMark),pct:a.quiz_id?(a.quiz_pct===null?null:Number(a.quiz_pct)):(a.assignment_pct===null?null:Number(a.assignment_pct))}))
  let batchEnded=true,attendancePercent=100,attended=0,sessions=0
  if(c.batch_id){
    const [batch]=await tx.select().from(cohort_batches).where(eq(cohort_batches.id,c.batch_id))
    batchEnded=Boolean(batch&&batch.lifecycle==="Completed"&&batch.ends_at&&batch.ends_at<=new Date())
    const counts=await tx.execute(sql`select count(*)::int as total,count(a.student_id)::int as joined from lms.live_sessions s left join lms.session_attendance a on a.session_id=s.id and a.student_id=${student}::uuid where s.batch_id=${c.batch_id} and s.status='Ended'`)
    sessions=Number(counts.rows[0].total);attended=Number(counts.rows[0].joined);attendancePercent=sessions?100*attended/sessions:0
  }
  const reasons:string[]=[]
  if(rules.requiredLessonsPercent>0&&(!required.length||lessonPercent<rules.requiredLessonsPercent))reasons.push(`Complete ${rules.requiredLessonsPercent}% of required lessons (${completed}/${required.length} completed)`)
  if(rules.requiredLessonIds?.some(id=>!required.some(l=>l.id===id)))reasons.push("A required lesson is archived or missing; the administrator must review this policy")
  if(rules.requiredAssessments)for(const a of assessments)if(a.pct===null||a.pct<a.required_pct)reasons.push(`Pass ${a.title} with at least ${a.required_pct}%`)
  if(c.batch_id&&rules.batchEnded&&!batchEnded)reasons.push("The batch must reach its end date and be marked Completed")
  if(c.batch_id&&rules.attendancePercent>0&&attendancePercent<rules.attendancePercent)reasons.push(`Join-click attendance must reach ${rules.attendancePercent}% (${attended}/${sessions})`)
  return {eligible:reasons.length===0,reasons,lessons:{required:required.map(l=>String(l.id)),completed:required.filter(l=>l.done).map(l=>String(l.id)),percent:lessonPercent},assessments,batchEnded,attendance:{basis:"join clicks, not verified presence",attended,sessions,percent:attendancePercent},evaluated_at:new Date().toISOString()}
}
export async function evaluateContext(tx:Tx,student:string,c:LearningContext,options:{issue?:boolean;replaces?:typeof completion_credentials.$inferSelect;reason?:string}={}) {
  await lockAcademicRecord(tx,student,c.course_id)
  const policy=await contextPolicy(tx,c)
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'completion:'+student+':'+c.context_key}))`)
  const [existing]=await tx.select().from(completions).where(and(eq(completions.student_id,student),eq(completions.context_key,c.context_key))).orderBy(desc(completions.revision)).limit(1)
  const evidence=await evidenceFor(tx,student,c,policy.rules)
  if(existing&&!options.replaces){
    const [credential]=await tx.select().from(completion_credentials).where(eq(completion_credentials.completion_id,existing.id))
    const [issuedPolicy]=await tx.select().from(completion_policies).where(eq(completion_policies.id,existing.policy_id))
    return {context:c,policy:{...issuedPolicy,rules:parse(policySchema,issuedPolicy.rules)},evidence:existing.evidence as typeof evidence,completion:existing,credential:credential??null}
  }
  if(!options.issue||!evidence.eligible)return {context:c,policy,evidence,completion:null,credential:null}
  const [course]=await tx.select().from(courses).where(eq(courses.id,c.course_id));if(!course)throw notFound()
  const [completion]=await tx.insert(completions).values({student_id:student,course_id:c.course_id,context_key:c.context_key,batch_id:c.batch_id,offer_id:c.offer_id,revision:(existing?.revision??0)+1,policy_id:policy.id,policy_snapshot:{version:policy.version,...policy.rules},evidence}).returning()
  const [credential]=await tx.insert(completion_credentials).values({completion_id:completion.id,student_id:student,course_id:c.course_id,credential_id:`QAI-${randomUUID().replaceAll("-","").toUpperCase()}`,title:course.certificate_title||`${course.title} — Certificate of completion`,course_title:course.title,skills:course.certificate_skills,replaces_id:options.replaces?.id,issue_reason:options.reason??"Policy satisfied"}).returning()
  await tx.insert(completion_events).values({completion_id:completion.id,kind:"completed"})
  await tx.insert(audit_events).values({actor_id:student,actor_role:"Student",action:options.replaces?"certificate.reissued":"certificate.issued",target:credential.credential_id,outcome:`policy ${policy.id}, revision ${completion.revision}`})
  await notify(tx,student,"grade","Certificate earned",`${course.title} is complete. Your certificate is ready to share.`,"certificates","grades")
  return {context:c,policy,evidence,completion,credential}
}
export async function checkStudent(tx:Tx,student:string,course?:string) {
  const contexts=await contextsFor(tx,student,course),result=[]
  if(course&&!contexts.length)throw forbidden("You do not have access to this course")
  for(const c of contexts.sort((a,b)=>a.context_key.localeCompare(b.context_key)))result.push(await evaluateContext(tx,student,c,{issue:true}))
  return result
}
export async function completionSweep(db:Db) {
  const rows=await db.select().from(completion_checks).where(sql`${completion_checks.requested_version}>${completion_checks.processed_version} and ${completion_checks.available_at}<=now()`).limit(50)
  for(const row of rows)try {
    // No queue-row lock while checking: grading/progress can enqueue without a lock-order cycle. Compare the captured version after processing.
    await db.transaction(async tx=>{await checkStudent(tx,row.student_id);await tx.update(completion_checks).set({processed_version:sql`greatest(${completion_checks.processed_version},${row.requested_version})`,error:null}).where(and(eq(completion_checks.student_id,row.student_id),eq(completion_checks.course_id,row.course_id)))})
  }catch(error){await db.update(completion_checks).set({error:error instanceof Error?error.message:"Completion check failed",available_at:new Date(Date.now()+60000)}).where(and(eq(completion_checks.student_id,row.student_id),eq(completion_checks.course_id,row.course_id)))}
  return rows.length
}
export async function revokeCredential(tx:Tx,actor:AuthUser,id:string,reason:string) {
  const [credential]=await tx.select().from(completion_credentials).where(eq(completion_credentials.id,id)).for("update")
  if(!credential)throw notFound();if(credential.revoked_at)return credential
  await tx.update(completion_credentials).set({revoked_at:new Date(),revocation_reason:reason}).where(eq(completion_credentials.id,id))
  if(credential.completion_id)await tx.insert(completion_events).values({completion_id:credential.completion_id,kind:"revoked"}).onConflictDoNothing()
  await tx.insert(audit_events).values({actor_id:actor.id,actor_role:actor.role,action:"certificate.revoked",target:credential.credential_id,outcome:reason})
  return credential
}
export async function reissueCredential(tx:Tx,actor:AuthUser,id:string,reason:string) {
  const [credential]=await tx.select().from(completion_credentials).where(eq(completion_credentials.id,id)).for("update")
  if(!credential)throw notFound();if(!credential.revoked_at)throw conflict("Revoke the existing credential with a reason before reissuing")
  const [replacement]=await tx.select().from(completion_credentials).where(eq(completion_credentials.replaces_id,id));if(replacement)return replacement
  if(!credential.completion_id)throw conflict("This legacy credential has no policy snapshot. Review enrollment and run a policy completion check before issuing a new credential.")
  const [previous]=await tx.select().from(completions).where(eq(completions.id,credential.completion_id))
  const context=(await contextsFor(tx,credential.student_id,previous.course_id)).find(c=>c.context_key===previous.context_key)
  if(!context)throw conflict("Restore access and resolve eligibility before reissue")
  const result=await evaluateContext(tx,credential.student_id,context,{issue:true,replaces:credential,reason})
  if(!result.credential)throw conflict(result.evidence.reasons.join("; "))
  await tx.insert(audit_events).values({actor_id:actor.id,actor_role:actor.role,action:"certificate.reissue-approved",target:result.credential.credential_id,outcome:reason})
  return result.credential
}
export async function studentCertificates(tx:Tx,student:string) {
  const result=await tx.execute(sql`select id,student_id,course_id,title,course_title,issued_at,null::text as expected_label,credential_id,grade,skills,'Earned'::text as status
    from lms.completion_credentials where student_id=${student}::uuid and revoked_at is null
    union all select id,student_id,course_id,title,course_title,issued_at,expected_label,credential_id,grade,skills,status from lms.certificates c where student_id=${student}::uuid
      and not exists(select 1 from lms.completion_credentials cc where cc.credential_id=c.credential_id or (cc.student_id=c.student_id and cc.course_id=c.course_id and c.status='In Progress')) order by issued_at desc nulls last`)
  return result.rows as unknown as typeof certificates.$inferSelect[]
}
