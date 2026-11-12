import { randomUUID } from "node:crypto"
import { eq, sql } from "drizzle-orm"
import type { Tx } from "../db/client.js"
import type { AuthUser } from "../auth/users.js"
import { audit_events, cohort_batches } from "../db/schema.js"
import { conflict } from "../errors.js"
import { lockBatch } from "./admission.js"

export async function transitionBatch(tx: Tx, actor: AuthUser, batchId: string, next: string) {
  const batch = await lockBatch(tx, batchId)
  const transitions: Record<string, string[]> = { Draft: ["Recruiting", "Cancelled"], Recruiting: ["Ready", "Cancelled"], Ready: ["Recruiting", "Scheduled", "Cancelled"], Scheduled: ["Recruiting", "Running", "Cancelled"], Running: ["Completed", "Cancelled"], Completed: [], Cancelled: [] }
  if (batch.lifecycle === next) return batch
  if (!transitions[batch.lifecycle]?.includes(next)) throw conflict(`Cannot change ${batch.lifecycle} to ${next}`)
  if (next === "Recruiting") {
    const offers = await tx.execute(sql`select id from lms.course_offers where id = ${batch.offer_id} and course_id = ${batch.course_id} and mode = 'live' and status = 'Published'`)
    if (!offers.rows.length || !batch.starts_at || !batch.ends_at || !batch.registration_deadline) throw conflict("Publish a live offer and configure batch dates and the registration deadline first")
  }
  if (["Ready", "Scheduled", "Running"].includes(next)) {
    const prerequisites = await tx.execute(sql`select
      (select count(*) from lms.batch_registrations where batch_id = ${batch.id} and state = 'confirmed' and paid_at is not null) as paid,
      (select count(*) from lms.batch_teachers bt join lms.users u on u.id = bt.teacher_id where bt.batch_id = ${batch.id} and u.disabled_at is null and u.role = 'Teacher') as teachers,
      (select count(*) from lms.live_sessions where batch_id = ${batch.id} and status <> 'Cancelled' and starts_at >= ${batch.starts_at} and ends_at <= ${batch.ends_at}) as sessions`)
    const row = prerequisites.rows[0]
    const minimum = batch.minimum_paid_registrations ?? Math.ceil(batch.max_seats * 0.6)
    if (Number(row.paid) < minimum) throw conflict(`This batch needs ${minimum} confirmed paid registrations before it can proceed`)
    if (!Number(row.teachers) || !Number(row.sessions)) throw conflict("Assign a teacher and save a schedule before this transition")
    if (next === "Running" && batch.starts_at && new Date() < batch.starts_at) throw conflict("The batch start date has not arrived")
  }
  if (next === "Completed" && (!batch.ends_at || new Date() < batch.ends_at)) throw conflict("A batch cannot complete before its configured end")
  const [row] = await tx.update(cohort_batches).set({ lifecycle: next, status: next === "Running" ? "Active" : next === "Completed" ? "Completed" : next === "Cancelled" ? "Archived" : "Upcoming", updated_at: new Date() }).where(eq(cohort_batches.id, batch.id)).returning()
  await tx.insert(audit_events).values({ id: randomUUID(), actor_id: actor.id, actor_role: actor.role, action: `batch.${next.toLowerCase()}`, target: batch.id, outcome: "success" })
  return row
}
