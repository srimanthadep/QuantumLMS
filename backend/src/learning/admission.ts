import { randomUUID } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import type { Tx } from "../db/client.js"
import { batch_registrations, batch_students, cohort_batches, seat_reservations, users } from "../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { grantAccess, revokeSource } from "./entitlements.js"

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
  if (state === "confirmed") await grantAccess(tx, { student: input.student, course: batch.course_id, offer: batch.offer_id, batch: batch.id, sourceType: "batch_registration", sourceId: id })
  else await revokeSource(tx, input.student, batch.course_id, "batch_registration", id)
  return { skipped: false, waitlisted: state === "waitlisted", registrationId: id }
}
export async function cancelRegistration(tx: Tx, batchId: string, student: string) {
  const batch = await lockBatch(tx, batchId)
  const [registration] = await tx.update(batch_registrations).set({ state: "cancelled", updated_at: new Date() })
    .where(and(eq(batch_registrations.batch_id, batchId), eq(batch_registrations.student_id, student))).returning()
  if (!registration) throw notFound("Registration not found")
  await tx.delete(batch_students).where(and(eq(batch_students.batch_id, batchId), eq(batch_students.student_id, student)))
  await tx.update(seat_reservations).set({ state: "released" }).where(and(eq(seat_reservations.batch_id, batchId), eq(seat_reservations.student_id, student), eq(seat_reservations.state, "active")))
  await revokeSource(tx, student, batch.course_id, "batch_registration", registration.id)
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
