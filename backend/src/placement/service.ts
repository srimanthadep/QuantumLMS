import { and, desc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import type { Db, Tx } from "../db/client.js"
import type { AuthUser } from "../auth/users.js"
import { isAdmin } from "../auth/access.js"
import { audit_events, completion_events, job_application_events, job_applications, placement_jobs, placement_memberships, placement_support_requests, placement_tracks, resumes, support_tickets, ticket_replies } from "../db/schema.js"
import { badRequest, conflict, forbidden, notFound } from "../errors.js"
import { notify } from "../modules/student/notify.js"

export function memberScope(user:AuthUser) {
  if(isAdmin(user))return sql`true`
  if(user.role==="Support")return sql`m.mentor_id=${user.id}::uuid`
  if(user.role==="Student")return sql`m.student_id=${user.id}::uuid`
  throw forbidden()
}
export async function membershipFor(tx:Tx,user:AuthUser,id:string,lock=false) {
  const [m]=await tx.select().from(placement_memberships).where(eq(placement_memberships.id,id)).limit(1)
  if(!m)throw notFound("Placement membership not found")
  if(!isAdmin(user)&&!(user.role==="Student"&&m.student_id===user.id)&&!(user.role==="Support"&&m.mentor_id===user.id))throw forbidden("You are not assigned to this placement learner")
  if(lock){const [current]=await tx.select().from(placement_memberships).where(eq(placement_memberships.id,id)).for("update");if(!current)throw notFound();if(user.role==="Support"&&current.mentor_id!==user.id)throw forbidden();return current}
  return m
}
export async function assertEligible(tx:Tx,m:typeof placement_memberships.$inferSelect) {
  const result=await tx.execute(sql`select t.id from lms.placement_tracks t join lms.completions c on c.id=${m.completion_id}::uuid join lms.completion_credentials cc on cc.completion_id=c.id
    where t.id=${m.track_id}::uuid and t.active and cc.revoked_at is null and ${m.eligibility}='Eligible' and ${m.status}='Active'
    and (case when c.batch_id is not null then 'live' else 'self_paced' end)=any(t.eligible_modes)`)
  if(!result.rows.length)throw forbidden("Placement access is not currently active. Contact your mentor or support for a review.")
}
/** Reconcile canonical credential state, so duplicated or out-of-order completion events cannot restore a revoked credential. */
export async function reconcileMember(tx:Tx,student:string,course:string) {
  const result=await tx.execute(sql`select c.id,c.batch_id,c.completed_at,co.title from lms.completions c join lms.courses co on co.id=c.course_id join lms.completion_credentials cc on cc.completion_id=c.id
    where c.student_id=${student}::uuid and c.course_id=${course} and cc.revoked_at is null order by c.completed_at desc,c.revision desc`)
  const [existingTrack]=await tx.select().from(placement_tracks).where(eq(placement_tracks.course_id,course))
  if(!existingTrack&&result.rows.length)await tx.insert(placement_tracks).values({course_id:course,title:`${result.rows[0].title} — Placement support`}).onConflictDoNothing()
  const [track]=await tx.select().from(placement_tracks).where(eq(placement_tracks.course_id,course)).for("update")
  if(!track)return
  const completion=result.rows.find(c=>track.eligible_modes.includes(c.batch_id?"live":"self_paced"))
  const [current]=await tx.select().from(placement_memberships).where(and(eq(placement_memberships.student_id,student),eq(placement_memberships.track_id,track.id))).for("update")
  if(!completion){if(current&&current.eligibility!=="Revoked"){await tx.update(placement_memberships).set({eligibility:"Revoked",updated_at:new Date(),version:current.version+1}).where(eq(placement_memberships.id,current.id));await tx.insert(audit_events).values({actor_role:"System",action:"placement.eligibility-revoked",target:current.id,outcome:"No active qualifying credential"})}return}
  if(current){
    if(current.completion_id!==completion.id||current.eligibility!=="Eligible"){
      await tx.update(placement_memberships).set({completion_id:String(completion.id),eligibility:"Eligible",version:current.version+1,updated_at:new Date()}).where(eq(placement_memberships.id,current.id))
      await tx.insert(audit_events).values({actor_role:"System",action:"placement.eligibility-renewed",target:current.id,outcome:`completion ${completion.id}`})
      if(track.active&&current.status==="Active")await notify(tx,student,"system","Placement eligibility renewed",`Your current credential qualifies you for ${track.title}.`,"placements",undefined,{key:`placement:${current.id}:${completion.id}`,guard:{placement:current.id}})
    }
    return current.id
  }
  if(!track.active||!track.auto_enroll)return
  const [member]=await tx.insert(placement_memberships).values({track_id:track.id,student_id:student,completion_id:String(completion.id)}).returning()
  await notify(tx,student,"system","Placement support unlocked",`Your verified completion qualifies you for ${track.title}. Explore Jobs & Applications and prepare your resume in Career Hub.`,"placements",undefined,{key:`placement:${member.id}:${completion.id}`,guard:{placement:member.id}})
  await tx.insert(audit_events).values({actor_role:"System",action:"placement.eligible",target:member.id,outcome:`completion ${completion.id}`})
  return member.id
}
export async function placementSweep(db:Db) {
  let processed=0
  for(let i=0;i<100;i++){
    const done=await db.transaction(async tx=>{
      const result=await tx.execute(sql`select e.id,c.student_id,c.course_id from lms.completion_events e join lms.completions c on c.id=e.completion_id where e.processed_at is null order by e.created_at for update of e skip locked limit 1`)
      const event=result.rows[0];if(!event)return false
      await reconcileMember(tx,String(event.student_id),String(event.course_id))
      await tx.update(completion_events).set({processed_at:new Date()}).where(eq(completion_events.id,String(event.id)))
      return true
    });if(!done)break;processed++
  }
  return processed
}
export async function syncTrack(tx:Tx,track:string) {
  const [t]=await tx.select().from(placement_tracks).where(eq(placement_tracks.id,track));if(!t)throw notFound()
  const result=await tx.execute(sql`select distinct student_id from lms.completions where course_id=${t.course_id}`)
  for(const row of result.rows)await reconcileMember(tx,String(row.student_id),t.course_id)
}
const resumeSchema=z.object({name:z.string().trim().min(1),email:z.email(),skills:z.array(z.string().trim().min(1)).min(1)})
export async function applyForJob(tx:Tx,user:AuthUser,id:string,input:{cover_note:string;resume_updated_at:string}) {
  const [job]=await tx.select().from(placement_jobs).where(eq(placement_jobs.id,id)).for("update");if(!job)throw notFound("Job not found")
  const [existing]=await tx.select().from(job_applications).where(and(eq(job_applications.job_id,id),eq(job_applications.student_id,user.id)));if(existing)return existing
  if(job.status!=="Published"||(job.closes_at&&job.closes_at<=new Date()))throw conflict("This role is no longer accepting applications")
  const [m]=await tx.select().from(placement_memberships).where(and(eq(placement_memberships.track_id,job.track_id),eq(placement_memberships.student_id,user.id))).for("update");if(!m)throw forbidden("Complete the qualifying course before applying")
  await assertEligible(tx,m)
  const [resume]=await tx.select().from(resumes).where(eq(resumes.student_id,user.id)).for("share")
  if(!resume||!resumeSchema.safeParse(resume.data).success)throw badRequest("Save a resume with your name, email and at least one skill in Resume Builder before applying")
  if(resume.updated_at.toISOString()!==new Date(input.resume_updated_at).toISOString())throw conflict("Your resume changed. Review the latest saved version before applying.")
  const [application]=await tx.insert(job_applications).values({job_id:id,membership_id:m.id,student_id:user.id,resume_student_id:user.id,resume_snapshot:resume.data,resume_updated_at:resume.updated_at,cover_note:input.cover_note}).returning()
  await tx.insert(job_application_events).values({application_id:application.id,version:1,status:"Submitted",note:"Application submitted with the saved resume.",actor_id:user.id,actor_role:user.role})
  await tx.insert(audit_events).values({actor_id:user.id,actor_role:user.role,action:"placement.application-submitted",target:application.id,outcome:"success"})
  await notify(tx,user.id,"system","Application submitted",`${job.title} at ${job.company}. Track updates in Jobs & Applications.`,"placements")
  return application
}
const transitions:Record<string,string[]>={Submitted:["Reviewing","Rejected","Withdrawn"],Reviewing:["Shortlisted","Rejected","Withdrawn"],Shortlisted:["Interview","Rejected","Withdrawn"],Interview:["Offered","Rejected","Withdrawn"],Offered:["Placed","Rejected","Withdrawn"],Placed:[],Rejected:[],Withdrawn:[]}
export async function applicationFor(tx:Tx,user:AuthUser,id:string,lock=false) {
  const [row]=await tx.select().from(job_applications).where(eq(job_applications.id,id));if(!row)throw notFound()
  await membershipFor(tx,user,row.membership_id)
  if(lock){const [current]=await tx.select().from(job_applications).where(eq(job_applications.id,id)).for("update");return current}
  return row
}
export async function transitionApplication(tx:Tx,user:AuthUser,id:string,input:{status:string;expected_version:number;note:string}) {
  const row=await applicationFor(tx,user,id,true)
  if(row.version!==input.expected_version)throw conflict("This application changed. Reload before updating it.")
  if(user.role==="Student"&&input.status!=="Withdrawn")throw forbidden("Students can only withdraw their own application")
  if(!transitions[row.status]?.includes(input.status))throw conflict(`Cannot change ${row.status} to ${input.status}`)
  const member=await membershipFor(tx,user,row.membership_id,true)
  if(!["Rejected","Withdrawn"].includes(input.status))await assertEligible(tx,member)
  const [application]=await tx.update(job_applications).set({status:input.status,version:row.version+1,updated_at:new Date()}).where(eq(job_applications.id,id)).returning()
  await tx.insert(job_application_events).values({application_id:id,version:application.version,status:input.status,note:input.note,actor_id:user.id,actor_role:user.role})
  if(input.status==="Placed")await tx.update(placement_memberships).set({status:"Placed",updated_at:new Date(),version:member.version+1}).where(eq(placement_memberships.id,member.id))
  await tx.insert(audit_events).values({actor_id:user.id,actor_role:user.role,action:"placement.application-status",target:id,outcome:input.status})
  await notify(tx,row.student_id,"system","Application update",`${input.status}: ${input.note}`.slice(0,600),"placements")
  return application
}
export async function requestHelp(tx:Tx,user:AuthUser,membership:string,applicationId:string|undefined,message:string) {
  const member=await membershipFor(tx,user,membership,true)
  if(member.student_id!==user.id)throw forbidden()
  if(applicationId){const app=await applicationFor(tx,user,applicationId);if(app.membership_id!==member.id)throw badRequest("Application and placement track do not match")}
  const [track]=await tx.select().from(placement_tracks).where(eq(placement_tracks.id,member.track_id))
  const description=`Placement support for ${track.title}.\n${applicationId?`Application: ${applicationId}\n`:""}${message}`.slice(0,5000)
  const open=await tx.execute(sql`select t.id from lms.placement_support_requests r join lms.support_tickets t on t.id=r.ticket_id where r.membership_id=${member.id}::uuid and t.status in ('Open','In Progress') order by t.created_at desc limit 1`)
  if(open.rows.length){
    const id=String(open.rows[0].id),[last]=await tx.select().from(ticket_replies).where(eq(ticket_replies.ticket_id,id)).orderBy(desc(ticket_replies.created_at)).limit(1)
    if(last?.content!==description){await tx.insert(ticket_replies).values({ticket_id:id,author_id:user.id,author_name:user.full_name,author_role:"Student",content:description});await tx.update(support_tickets).set({updated_at:new Date(),last_update_by:"You"}).where(eq(support_tickets.id,id))}
    return {ticket_id:id,created:false}
  }
  const n=await tx.execute(sql`select nextval('lms.ticket_number_seq') as n`),id=`TKT-${n.rows[0].n}`
  await tx.insert(support_tickets).values({id,student_id:user.id,category:"Placement",subject:`Placement support · ${track.title}`.slice(0,200),description,priority:"Medium"})
  await tx.insert(ticket_replies).values({ticket_id:id,author_id:user.id,author_name:user.full_name,author_role:"Student",content:description})
  await tx.insert(placement_support_requests).values({membership_id:member.id,application_id:applicationId,ticket_id:id})
  await tx.insert(audit_events).values({actor_id:user.id,actor_role:user.role,action:"placement.support-requested",target:id,outcome:member.mentor_id?`mentor ${member.mentor_id}`:"Awaiting mentor allocation"})
  return {ticket_id:id,created:true}
}
