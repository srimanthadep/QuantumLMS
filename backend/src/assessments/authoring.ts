import { randomUUID } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import { z } from "zod"
import type { Tx } from "../db/client.js"
import type { AuthUser } from "../auth/users.js"
import { assessment_definitions, assessment_definition_versions, assessment_offerings, assignments, audit_events, cohort_batches, course_offers, evaluator_assignments, quizzes, quiz_questions, rubrics, rubric_criteria, users } from "../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { parse } from "../http.js"

const text=z.string().trim().min(1).max(2000)
const level=z.object({label:text,points:z.number().int().min(0).max(1000),description:z.string().max(2000).default("")})
export const quizConfig=z.object({duration_minutes:z.number().int().min(1).max(480),questions:z.array(z.object({question:text,options:z.array(text).min(2).max(6),correct_index:z.number().int().min(0),explanation:z.string().max(4000).default("")})).min(1).max(200)}).superRefine((c,ctx)=>{c.questions.forEach((q,i)=>{if(q.correct_index>=q.options.length)ctx.addIssue({code:"custom",path:["questions",i,"correct_index"],message:"Select an existing correct option"})})})
export const rubricConfig=z.object({guidance:z.string().max(10000).default(""),criteria:z.array(z.object({title:text,description:z.string().max(4000).default(""),max_points:z.number().int().min(1).max(1000),levels:z.array(level).min(2).max(10)})).min(1).max(40),evaluator_ids:z.array(z.uuid()).min(1).max(50)}).superRefine((c,ctx)=>{c.criteria.forEach((r,i)=>{if(!r.levels.some(l=>l.points===0)||!r.levels.some(l=>l.points===r.max_points)||r.levels.some(l=>l.points>r.max_points)||new Set(r.levels.map(l=>l.points)).size!==r.levels.length)ctx.addIssue({code:"custom",path:["criteria",i,"levels"],message:"Use distinct levels from zero through the criterion maximum"})})})
export async function checkEvaluators(tx:Tx,ids:string[]) {
  const active=await tx.select({id:users.id}).from(users).where(sql`${users.id} in (${sql.join(ids.map(id=>sql`${id}::uuid`),sql`,`)}) and ${users.role}='Evaluator' and ${users.disabled_at} is null`)
  if(active.length!==new Set(ids).size) throw badRequest("Choose active evaluator accounts")
}
export const definitionInput=z.object({course_id:z.string().min(1),kind:z.enum(["quiz","assignment"]),title:z.string().trim().min(1).max(200),description:z.string().max(10000).default(""),config:z.record(z.string(),z.unknown()).default({})})
export async function validateDefinition(tx:Tx,d:typeof assessment_definitions.$inferSelect) {
  if(d.kind==="quiz")return parse(quizConfig,d.config)
  const config=parse(rubricConfig,d.config);await checkEvaluators(tx,config.evaluator_ids);return config
}
export async function snapshotDefinition(tx:Tx,d:typeof assessment_definitions.$inferSelect) {
  await tx.insert(assessment_definition_versions).values({definition_id:d.id,version:d.version,snapshot:d}).onConflictDoNothing()
}
export const offeringInput=z.object({definition_id:z.uuid(),expected_version:z.number().int().positive(),batch_id:z.string().min(1).optional(),offer_id:z.string().min(1).optional(),required:z.boolean().default(true),passing_pct:z.number().int().min(0).max(100).default(40),max_attempts:z.number().int().min(1).max(20).default(1),available_from:z.iso.datetime().nullable().optional(),due_at:z.iso.datetime().nullable().optional(),days_after_enrollment:z.number().int().min(1).max(3650).nullable().optional()})
export async function createOffering(tx:Tx,actor:AuthUser,b:z.infer<typeof offeringInput>) {
  if(Boolean(b.batch_id)===Boolean(b.offer_id))throw badRequest("Choose one batch or self-paced offer")
  const [d]=await tx.select().from(assessment_definitions).where(eq(assessment_definitions.id,b.definition_id)).for("update")
  if(!d)throw notFound();if(d.status!=="Published"||d.version!==b.expected_version)throw conflict("Publish the current definition before releasing it")
  const config=await validateDefinition(tx,d)
  if(b.batch_id){const [batch]=await tx.select().from(cohort_batches).where(and(eq(cohort_batches.id,b.batch_id),eq(cohort_batches.course_id,d.course_id)));if(!batch)throw badRequest("Batch and assessment course do not match");if(!b.due_at||b.days_after_enrollment)throw badRequest("Batch assessments need a fixed deadline")}
  if(b.offer_id){const [offer]=await tx.select().from(course_offers).where(and(eq(course_offers.id,b.offer_id),eq(course_offers.course_id,d.course_id),eq(course_offers.mode,"self_paced")));if(!offer)throw badRequest("Choose a self-paced offer for this course");if(!b.due_at&&!b.days_after_enrollment)throw badRequest("Set a deadline or days from enrollment")}
  const due=b.due_at?new Date(b.due_at):null,opens=b.available_from?new Date(b.available_from):null
  if(due&&due<=new Date())throw badRequest("Release with a future deadline")
  if(due&&opens&&due<=opens)throw badRequest("Deadline must follow the opening time")
  const id=randomUUID(),instance=`assessment-${id}`
  // Existing grading engines operate on a frozen instance; editing the reusable draft never changes past answers or rubrics.
  if(d.kind==="quiz") {
    const c=config as z.infer<typeof quizConfig>
    await tx.insert(quizzes).values({id:instance,course_id:d.course_id,title:d.title,duration_minutes:c.duration_minutes,passing_pct:b.passing_pct,max_attempts:b.max_attempts,question_count:c.questions.length,available_from:opens,due_at:due??new Date("9999-12-31T00:00:00Z")})
    await tx.insert(quiz_questions).values(c.questions.map((q,i)=>({...q,quiz_id:instance,position:i+1})))
  } else {
    const c=config as z.infer<typeof rubricConfig>,rubric=`rubric-${id}`
    await tx.insert(assignments).values({id:instance,course_id:d.course_id,title:d.title,description:d.description,max_marks:c.criteria.reduce((n,c)=>n+c.max_points,0),due_at:due??new Date("9999-12-31T00:00:00Z")})
    await tx.insert(rubrics).values({id:rubric,assignment_id:instance,title:d.title,version:`v${d.version}`,guidance:c.guidance})
    await tx.insert(rubric_criteria).values(c.criteria.map((c,i)=>({...c,id:randomUUID(),rubric_id:rubric,position:i+1})))
    await tx.insert(evaluator_assignments).values([...new Set(c.evaluator_ids)].map(evaluator_id=>({evaluator_id,assignment_id:instance})))
  }
  await snapshotDefinition(tx,d)
  const [offering]=await tx.insert(assessment_offerings).values({id,definition_id:d.id,definition_version:d.version,course_id:d.course_id,batch_id:b.batch_id,offer_id:b.offer_id,context:b.batch_id?"batch":"self_paced",title:d.title,quiz_id:d.kind==="quiz"?instance:null,assignment_id:d.kind==="assignment"?instance:null,required:b.required,passing_pct:b.passing_pct,max_attempts:b.max_attempts,available_from:opens,due_at:due,days_after_enrollment:b.days_after_enrollment}).returning()
  await tx.insert(audit_events).values({actor_id:actor.id,actor_role:actor.role,action:"assessment.released",target:id,outcome:"success"})
  return offering
}
