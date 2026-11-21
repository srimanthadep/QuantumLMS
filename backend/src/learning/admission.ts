import { randomUUID } from "node:crypto"
import { and, eq, isNull, sql } from "drizzle-orm"
import type { Tx } from "../db/client.js"
import { batch_registrations, batch_students, cohort_batches, entitlement_grants, seat_reservations, users } from "../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { revokeSource } from "./entitlements.js"

export async function lockBatch(tx: Tx, batchId: string) {
  const [batch] = await tx.select().from(cohort_batches).where(eq(cohort_batches.id, batchId)).for("update")
  if (!batch) throw notFound("Batch not found")
  return batch
}
export async function availableSeats(tx: Tx, batch: typeof cohort_batches.$inferSelect, excludeStudent?: string) {
  const result = await tx.execute(sql`select
    (select count(*) from lms.batch_registrations where batch_id = ${batch.id} and state in ('confirmed','paused') ${excludeStudent ? sql`and student_id <> ${excludeStudent}::uuid` : sql``}) +
    (select count(*) from lms.seat_reservations where batch_id = ${batch.id} and state = 'active' and expires_at > now() ${excludeStudent ? sql`and student_id <> ${excludeStudent}::uuid` : sql``}) as used`)
  return Math.max(0, batch.max_seats - Number(result.rows[0].used))
}
export function assertAdmissionWindow(batch: typeof cohort_batches.$inferSelect, now = new Date()) {
  if (["Completed", "Cancelled"].includes(batch.lifecycle)) throw conflict("This batch is closed")
  if (batch.lifecycle === "Running" && !batch.allow_late_join) throw conflict("Late joining is disabled for this batch")
  if (batch.lifecycle !== "Draft" && batch.registration_deadline && batch.registration_deadline < now && !(batch.lifecycle === "Running" && batch.allow_late_join)) throw conflict("Registration deadline has passed. Extend it before admitting learners.")
}
export async function admit(tx: Tx, input: { batchId: string; student: string; course?: string; status?: string; autoWaitlist?: boolean; notes?: string; source?: string; orderId?: string; paidAt?: Date; allowUpdate?: boolean }) {
  const batch = await lockBatch(tx, input.batchId)
  if (input.course && batch.course_id !== input.course) throw badRequest("Batch and course do not match")
  const [student] = await tx.select().from(users).where(eq(users.id, input.student))
  if (!student || student.role !== "Student" || student.disabled_at) throw badRequest("Select an active student account")
  const [existing] = await tx.select().from(batch_registrations).where(and(eq(batch_registrations.batch_id, batch.id), eq(batch_registrations.student_id, input.student)))
  if (existing && existing.state !== "cancelled" && !input.allowUpdate) return { skipped: true, waitlisted: existing.state === "waitlisted" }
  assertAdmissionWindow(batch)
  let status = input.status ?? "Active"
  if (status !== "Waitlisted" && await availableSeats(tx, batch, input.student) === 0) {
    if (input.autoWaitlist) status = "Waitlisted"
    else throw conflict("This batch is full. Increase capacity or use the waitlist.")
  }
  const state = status === "Waitlisted" ? "waitlisted" : status === "Paused" ? "paused" : "confirmed"
  const id = existing?.id ?? randomUUID()
  const row = { batch_id: batch.id, student_id: input.student, state, source_type: input.source ?? existing?.source_type ?? "manual",
    order_id: input.orderId ?? existing?.order_id, paid_at: input.paidAt ?? existing?.paid_at,
    confirmed_at: state === "confirmed" ? existing?.confirmed_at ?? new Date() : null, updated_at: new Date() }
  await tx.insert(batch_registrations).values({ id, ...row }).onConflictDoUpdate({ target: [batch_registrations.batch_id, batch_registrations.student_id], set: row })
  await tx.insert(batch_students).values({ batch_id: batch.id, student_id: input.student, status, notes: input.notes ?? "" }).onConflictDoUpdate({
    target: [batch_students.batch_id, batch_students.student_id], set: { status, ...(input.notes !== undefined ? { notes: input.notes } : {}), updated_at: new Date() } })
  await tx.update(seat_reservations).set({ state: state === "confirmed" ? "converted" : "released" }).where(and(eq(seat_reservations.batch_id, batch.id), eq(seat_reservations.student_id, input.student), eq(seat_reservations.state, "active")))
  // A confirmed registration is the whole entitlement for a batch: live classes, their recordings and batch-only videos.
  // It deliberately does not unlock any course lesson. Course access comes only from enrolling in that course.
  if (state !== "confirmed") await retireBatchGrants(tx, input.student, id)
  return { skipped: false, waitlisted: state === "waitlisted", registrationId: id }
}
export async function cancelRegistration(tx: Tx, batchId: string, student: string) {
  await lockBatch(tx, batchId)
  const [registration] = await tx.update(batch_registrations).set({ state: "cancelled", updated_at: new Date() })
    .where(and(eq(batch_registrations.batch_id, batchId), eq(batch_registrations.student_id, student))).returning()
  if (!registration) throw notFound("Registration not found")
  await tx.delete(batch_students).where(and(eq(batch_students.batch_id, batchId), eq(batch_students.student_id, student)))
  await tx.update(seat_reservations).set({ state: "released" }).where(and(eq(seat_reservations.batch_id, batchId), eq(seat_reservations.student_id, student), eq(seat_reservations.state, "active")))
  // Grants made by older versions of this flow are retired with the registration so nothing outlives it.
  await retireBatchGrants(tx, student, registration.id)
}
/** Old releases stored a course grant per registration. Revoking them keeps cancelled learners from retaining stale course access. */
async function retireBatchGrants(tx: Tx, student: string, registrationId: string) {
  const stale = await tx.select({ course_id: entitlement_grants.course_id }).from(entitlement_grants).where(and(eq(entitlement_grants.student_id, student),
    eq(entitlement_grants.source_type, "batch_registration"), eq(entitlement_grants.source_id, registrationId), isNull(entitlement_grants.revoked_at)))
  for (const grant of stale) await revokeSource(tx, student, grant.course_id, "batch_registration", registrationId)
}
export async function reserveSeat(tx: Tx, input: { batchId: string; student: string; orderId: string; minutes?: number }) {
  const batch = await lockBatch(tx, input.batchId)
  assertAdmissionWindow(batch)
  if (!["Recruiting", "Ready", "Scheduled", "Running"].includes(batch.lifecycle)) throw conflict("This batch is not accepting registrations")
  const [registration] = await tx.select().from(batch_registrations).where(and(eq(batch_registrations.batch_id, batch.id), eq(batch_registrations.student_id, input.student)))
  if (registration && ["confirmed", "paused"].includes(registration.state)) throw conflict("You already have a place in this batch")
  const [existing] = await tx.select().from(seat_reservations).where(and(eq(seat_reservations.batch_id, batch.id), eq(seat_reservations.student_id, input.student), eq(seat_reservations.state, "active"), sql`${seat_reservations.expires_at} > now()`))
  if (existing) { if (existing.order_id === input.orderId) return existing; throw conflict("You already have a pending reservation") }
  if (await availableSeats(tx, batch) === 0) throw conflict("This batch is full")
  const [row] = await tx.insert(seat_reservations).values({ id: randomUUID(), batch_id: batch.id, course_id: batch.course_id, offer_id: batch.offer_id, student_id: input.student, order_id: input.orderId, expires_at: new Date(Date.now() + (input.minutes ?? 15) * 60_000) }).returning()
  return row
}
