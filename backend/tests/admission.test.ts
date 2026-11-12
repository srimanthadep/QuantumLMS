import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { before, after, test } from "node:test"
import { and, eq, sql } from "drizzle-orm"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"
import { batch_registrations, batch_students, batch_teachers, cohort_batches, course_offers, courses, enrollments, entitlement_grants, live_sessions, users } from "../src/db/schema.js"
import { admit, cancelRegistration, reserveSeat } from "../src/learning/admission.js"
import { grantAccess, hasEntitlement } from "../src/learning/entitlements.js"

let h: TestHarness, admin: TestUser, first: TestUser, second: TestUser, teacher: TestUser
let firstId: string, secondId: string, teacherId: string
const courseId = "admission-course"
before(async () => {
  h = await createHarness(); admin = await h.user({ groups: ["admins"] }); first = await h.user(); second = await h.user(); teacher = await h.user({ groups: ["teachers"] })
  firstId = (await first.call("GET", "/api/me")).body.id; secondId = (await second.call("GET", "/api/me")).body.id; teacherId = (await teacher.call("GET", "/api/me")).body.id
  await h.ctx.db.insert(courses).values({ id: courseId, code: "ADMIT", title: "Admission course", instructor: "Ambiguous teacher", category: "AI", level: "Beginner" })
})
after(async () => {
  // Session history retains teachers; these rows belong only to this disposable fixture.
  await h.ctx.db.delete(live_sessions).where(eq(live_sessions.teacher_id, teacherId))
  await h.close()
})
async function batch(id: string, capacity = 1) {
  await h.ctx.db.insert(cohort_batches).values({ id, course_id: courseId, name: id, instructor: "Teacher", max_seats: capacity, start_date: "2027-01-01", end_date: "2027-06-30" })
}

test("legacy backfill retains access but never invents payment confirmation", async () => {
  await batch("legacy-fixture")
  await h.ctx.db.insert(enrollments).values({ student_id: firstId, course_id: courseId })
  await h.ctx.db.insert(batch_students).values({ student_id: firstId, batch_id: "legacy-fixture" })
  const migration = await readFile("drizzle/0008_offers_admission_entitlements.sql", "utf8")
  const backfill = migration.slice(migration.indexOf("-- CONSERVATIVE LEGACY BACKFILL"))
  for (let i = 0; i < 2; i++) for (const statement of backfill.split("--> statement-breakpoint")) if (statement.trim()) await h.ctx.db.execute(sql.raw(statement))
  const [registration] = await h.ctx.db.select().from(batch_registrations).where(eq(batch_registrations.batch_id, "legacy-fixture"))
  assert.equal(registration.source_type, "legacy_manual"); assert.equal(registration.paid_at, null); assert.equal(registration.order_id, null)
  const grants = await h.ctx.db.select().from(entitlement_grants).where(and(eq(entitlement_grants.student_id, firstId), eq(entitlement_grants.course_id, courseId)))
  assert.equal(grants.length, 2)
  assert.equal(await hasEntitlement(h.ctx.db, firstId, courseId, "legacy-fixture"), true)
})
test("two simultaneous claims for the last seat cannot overbook, even with override flag", async () => {
  await batch("race-batch")
  const results = await Promise.all([firstId, secondId].map(id => admin.call("POST", "/api/admin/batches/race-batch/students", { student_ids: [id], status: "Active", allow_over_capacity: true })))
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409], JSON.stringify(results))
  const registrations = await h.ctx.db.select().from(batch_registrations).where(eq(batch_registrations.batch_id, "race-batch"))
  assert.equal(registrations.length, 1)
})
test("generic enrollment rejects mismatched course and never grants waitlisted batch access", async () => {
  await batch("full-batch")
  await h.ctx.db.transaction(tx => admit(tx, { batchId: "full-batch", student: firstId }))
  const mismatch = await admin.call("POST", "/api/admin/students/enrol", { student_id: secondId, course_id: "c-1", batch_id: "full-batch" })
  assert.equal(mismatch.status, 400)
  const waitlisted = await admin.call("POST", "/api/admin/students/enrol", { student_id: secondId, course_id: courseId, batch_id: "full-batch" })
  assert.equal(waitlisted.status, 200, JSON.stringify(waitlisted.body))
  assert.equal(waitlisted.body.admission.waitlistedCount, 1)
  assert.equal(await hasEntitlement(h.ctx.db, secondId, courseId, "full-batch"), false)
  const promote = await admin.call("PATCH", `/api/admin/batches/full-batch/students/${secondId}`, { status: "Active", allow_over_capacity: true })
  assert.equal(promote.status, 409)
})
test("revoking one registration preserves an independent source; reservations occupy seats and expire", async () => {
  await batch("source-batch")
  await h.ctx.db.transaction(tx => admit(tx, { batchId: "source-batch", student: secondId }))
  await h.ctx.db.transaction(tx => grantAccess(tx, { student: secondId, course: courseId, sourceType: "manual", sourceId: "independent" }))
  await h.ctx.db.transaction(tx => cancelRegistration(tx, "source-batch", secondId))
  assert.equal(await hasEntitlement(h.ctx.db, secondId, courseId), true)
  assert.equal(await hasEntitlement(h.ctx.db, secondId, courseId, "source-batch"), false)
  await batch("reserved-batch")
  await h.ctx.db.update(cohort_batches).set({ lifecycle: "Recruiting" }).where(eq(cohort_batches.id, "reserved-batch"))
  await h.ctx.db.transaction(tx => reserveSeat(tx, { batchId: "reserved-batch", student: firstId, orderId: "test-order" }))
  await assert.rejects(h.ctx.db.transaction(tx => admit(tx, { batchId: "reserved-batch", student: secondId })), /full/)
  await h.ctx.db.execute(sql`update lms.seat_reservations set expires_at=now()-interval '1 second' where order_id='test-order'`)
  assert.equal((await h.ctx.db.transaction(tx => admit(tx, { batchId: "reserved-batch", student: secondId }))).waitlisted, false)
})
test("batch cannot become Ready below the paid threshold or without a teacher and schedule", async () => {
  await batch("launch-batch", 2)
  const offer = await admin.call("POST", "/api/admin/offers", { title: "Live learning", course_id: courseId, mode: "live", price: 100 })
  assert.equal(offer.status, 200)
  assert.equal((await admin.call("PATCH", `/api/admin/offers/${offer.body.offer.id}`, { status: "Published" })).status, 200)
  const starts = new Date(Date.now() + 5 * 86400_000), ends = new Date(Date.now() + 180 * 86400_000)
  assert.equal((await admin.call("PATCH", "/api/admin/batches/launch-batch/admission", { offer_id: offer.body.offer.id, starts_at: starts.toISOString(), ends_at: ends.toISOString(), minimum_paid_registrations: 1, teacher_ids: [teacherId] })).status, 200)
  assert.equal((await admin.call("POST", "/api/admin/batches/launch-batch/transition", { state: "Recruiting" })).status, 200)
  assert.equal((await admin.call("POST", "/api/admin/batches/launch-batch/transition", { state: "Ready" })).status, 409)
  await h.ctx.db.transaction(tx => admit(tx, { batchId: "launch-batch", student: firstId, source: "payment", orderId: "confirmed-fixture", paidAt: new Date() }))
  assert.equal((await admin.call("POST", "/api/admin/batches/launch-batch/transition", { state: "Ready" })).status, 409)
  await h.ctx.db.insert(live_sessions).values({ id: randomUUID(), batch_id: "launch-batch", teacher_id: teacherId, occurrence_key: "fixture-session", title: "First session", starts_at: starts, ends_at: new Date(starts.getTime() + 3600_000) })
  assert.equal((await admin.call("POST", "/api/admin/batches/launch-batch/transition", { state: "Ready" })).status, 200)
})
test("transfer and waitlist demotion revoke only the affected batch source", async () => {
  await batch("transfer-from"); await batch("transfer-to")
  await h.ctx.db.transaction(tx => admit(tx, { batchId: "transfer-from", student: firstId }))
  const transfer = await admin.call("PATCH", `/api/admin/batches/transfer-from/students/${firstId}`, { target_batch_id: "transfer-to" })
  assert.equal(transfer.status, 200, JSON.stringify(transfer.body))
  assert.equal(await hasEntitlement(h.ctx.db, firstId, courseId, "transfer-from"), false)
  assert.equal(await hasEntitlement(h.ctx.db, firstId, courseId, "transfer-to"), true)
  assert.equal((await admin.call("PATCH", `/api/admin/batches/transfer-to/students/${firstId}`, { status: "Waitlisted" })).status, 200)
  assert.equal(await hasEntitlement(h.ctx.db, firstId, courseId, "transfer-to"), false)
  assert.equal(await hasEntitlement(h.ctx.db, firstId, courseId), true, "the independent legacy/manual source survives")
})
test("free self-paced enrollment enforces offer mode, publication and capacity", async () => {
  await h.ctx.db.insert(courses).values({ id: "free-seat-course", code: "FREE-SEAT", title: "Free course", category: "AI", instructor: "Teacher", level: "Beginner", status: "Published", capacity: 1, price: 0 })
  await h.ctx.db.insert(course_offers).values({ id: "free-seat-offer", course_id: "free-seat-course", mode: "self_paced", title: "Free", status: "Published", price: 0 })
  const responses = await Promise.all([first, second].map(u => u.call("POST", "/api/student/enrollments", { offer_id: "free-seat-offer" })))
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409])
  const [live] = await h.ctx.db.select().from(course_offers).where(eq(course_offers.mode, "live"))
  assert.equal((await first.call("POST", "/api/student/enrollments", { offer_id: live.id })).status, 403)
})
test("teacher provisioning persists a verified identity; failed invitation is not success; disable blocks old tokens", async () => {
  const invited = await admin.call("POST", "/api/admin/teachers", { name: "New instructor", email: `teacher-${randomUUID()}@test.quantumlms.dev`, role: "Teacher" })
  assert.equal(invited.status, 200); assert.equal(invited.body.teacher.provisioning_state, "active"); assert.ok(invited.body.teacher.cognito_sub)
  const previous = h.ctx.cognito.invite
  h.ctx.cognito.invite = async () => { throw new Error("provider unavailable") }
  try {
    const failed = await admin.call("POST", "/api/admin/teachers", { name: "Pending instructor", email: `pending-${randomUUID()}@test.quantumlms.dev` })
    assert.equal(failed.status, 503)
  } finally { h.ctx.cognito.invite = previous }
  assert.equal((await admin.call("DELETE", `/api/admin/teachers/${teacherId}`)).status, 200)
  assert.equal((await teacher.call("GET", "/api/teacher/courses")).status, 403)
})
