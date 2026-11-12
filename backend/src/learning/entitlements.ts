import { randomUUID } from "node:crypto"
import { and, eq, isNull, sql } from "drizzle-orm"
import type { Tx } from "../db/client.js"
import { enrollments, entitlement_grants, users } from "../db/schema.js"
import { forbidden } from "../errors.js"

export async function hasEntitlement(tx: Tx, student: string, course: string, batch?: string) {
  const [grant] = await tx.select({ id: entitlement_grants.id }).from(entitlement_grants).where(and(
    eq(entitlement_grants.student_id, student), eq(entitlement_grants.course_id, course), isNull(entitlement_grants.revoked_at),
    sql`${entitlement_grants.starts_at} <= now()`, sql`(${entitlement_grants.expires_at} is null or ${entitlement_grants.expires_at} > now())`,
    batch ? eq(entitlement_grants.batch_id, batch) : undefined,
  )).limit(1)
  return Boolean(grant)
}
export async function requireEntitlement(tx: Tx, student: string, course: string, batch?: string) {
  if (!await hasEntitlement(tx, student, course, batch)) throw forbidden("You do not have active access to this learning offer.")
}
export async function syncEnrollment(tx: Tx, student: string, course: string) {
  if (await hasEntitlement(tx, student, course)) await tx.insert(enrollments).values({ student_id: student, course_id: course }).onConflictDoNothing()
  else await tx.delete(enrollments).where(and(eq(enrollments.student_id, student), eq(enrollments.course_id, course)))
}
export async function grantAccess(tx: Tx, input: { student: string; course: string; offer?: string | null; batch?: string | null; sourceType: string; sourceId: string; expiresAt?: Date | null }) {
  // Serialize all source changes for this learner, including two independent offers of the same course.
  await tx.select({ id: users.id }).from(users).where(eq(users.id, input.student)).for("update")
  const values = { student_id: input.student, course_id: input.course, offer_id: input.offer, batch_id: input.batch,
    source_type: input.sourceType, source_id: input.sourceId, revoked_at: null, expires_at: input.expiresAt ?? null }
  await tx.insert(entitlement_grants).values({ id: randomUUID(), ...values }).onConflictDoUpdate({
    target: [entitlement_grants.student_id, entitlement_grants.course_id, entitlement_grants.source_type, entitlement_grants.source_id], set: values })
  await syncEnrollment(tx, input.student, input.course)
}
export async function revokeSource(tx: Tx, student: string, course: string, sourceType: string, sourceId: string) {
  await tx.select({ id: users.id }).from(users).where(eq(users.id, student)).for("update")
  await tx.update(entitlement_grants).set({ revoked_at: new Date() }).where(and(eq(entitlement_grants.student_id, student), eq(entitlement_grants.course_id, course),
    eq(entitlement_grants.source_type, sourceType), eq(entitlement_grants.source_id, sourceId), isNull(entitlement_grants.revoked_at)))
  await syncEnrollment(tx, student, course)
}
