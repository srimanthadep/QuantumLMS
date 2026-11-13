import { eq, sql } from "drizzle-orm"
import type { Tx } from "../db/client.js"
import { assessment_offerings } from "../db/schema.js"
import { forbidden, notFound } from "../errors.js"

/** Alias ao is deliberately shared by list and mutation checks. */
export function offeringScope(student: string) {
  return sql`ao.status='Published' and exists(select 1 from lms.entitlement_grants g
    where g.student_id=${student}::uuid and g.course_id=ao.course_id and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now())
    and (ao.context='legacy' or (ao.context='self_paced' and g.offer_id=ao.offer_id and g.batch_id is null)
      or (ao.context='batch' and g.batch_id=ao.batch_id and exists(select 1 from lms.batch_registrations br where br.batch_id=ao.batch_id and br.student_id=g.student_id and br.state='confirmed'))))`
}
export async function studentOfferings(db: Tx, student: string) {
  const result=await db.execute(sql`select ao.*,coalesce(b.name,o.title,'Legacy course assessment') as context_name,
    case when ao.days_after_enrollment is null then ao.due_at else least(ao.due_at,(select min(g.starts_at) from lms.entitlement_grants g where g.student_id=${student}::uuid and g.offer_id=ao.offer_id and g.batch_id is null)+ao.days_after_enrollment*interval '1 day') end as effective_due_at
    from lms.assessment_offerings ao left join lms.cohort_batches b on b.id=ao.batch_id left join lms.course_offers o on o.id=ao.offer_id where ${offeringScope(student)} order by ao.created_at`)
  return result.rows as unknown as (typeof assessment_offerings.$inferSelect & {context_name:string|null;effective_due_at:Date|null})[]
}
export async function assessmentAccess(db: Tx, student: string, kind: "quiz"|"assignment", id: string) {
  const [offering]=await db.select().from(assessment_offerings).where(eq(kind==="quiz"?assessment_offerings.quiz_id:assessment_offerings.assignment_id,id))
  if(!offering) throw notFound("This assessment has not been released in a learning context")
  const allowed=await db.execute(sql`select ao.id from lms.assessment_offerings ao where ao.id=${offering.id}::uuid and ${offeringScope(student)}`)
  if(!allowed.rows.length) throw forbidden("This assessment belongs to another learning offer or batch")
  let due=offering.due_at
  if(offering.days_after_enrollment) {
    const result=await db.execute(sql`select min(starts_at) as enrolled from lms.entitlement_grants where student_id=${student}::uuid and offer_id=${offering.offer_id} and batch_id is null`)
    if(!result.rows[0]?.enrolled) throw forbidden()
    const relative=new Date(new Date(result.rows[0].enrolled as string).getTime()+offering.days_after_enrollment*86400000)
    if(!due||relative<due) due=relative
  }
  return { offering,due,available:offering.available_from }
}
/** Explicit migration/seed operation only; never called from a GET or normal authoring endpoint. */
export async function registerLegacyAssessments(db:Tx) {
  await db.execute(sql`insert into lms.assessment_offerings(course_id,context,title,quiz_id,required,passing_pct,max_attempts,available_from,due_at)
    select course_id,'legacy',title,id,false,passing_pct,max_attempts,available_from,due_at from lms.quizzes on conflict(quiz_id) do nothing`)
  await db.execute(sql`insert into lms.assessment_offerings(course_id,context,title,assignment_id,required,passing_pct,max_attempts,due_at)
    select course_id,'legacy',title,id,false,40,1,due_at from lms.assignments on conflict(assignment_id) do nothing`)
}
