import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, test } from "node:test"
import { and, eq, sql } from "drizzle-orm"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"
import { batch_registrations, cohort_batches, course_offers, entitlement_grants, live_sessions, media_assets, media_variants, orders, payments, recordings, refunds } from "../src/db/schema.js"
import type { PaymentProvider, ProviderOrder, ProviderPayment } from "../src/payments/provider.js"
import { admit } from "../src/learning/admission.js"
import { hasEntitlement } from "../src/learning/entitlements.js"
import { reconcilePayment } from "../src/payments/service.js"

// Courses and batches are separate products: a course is a free or paid self-paced offer, a batch is a live offer with its own price.
let h: TestHarness, admin: TestUser, learner: TestUser, other: TestUser, learnerId: string, otherId: string, adminId: string
const remotePayments = new Map<string, ProviderPayment>(), remoteOrders = new Map<string, ProviderOrder>()
const fake: PaymentProvider = {
  name: "razorpay", publicKey: "rzp_test_fixture",
  async createOrder(input) { const order = { id: `order_${randomUUID().replaceAll("-", "")}`, ...input, status: "created" }; remoteOrders.set(order.id, order); return order },
  async findOrders(receipt) { return [...remoteOrders.values()].filter(o => o.receipt === receipt) },
  async fetchPayment(id) { return structuredClone(remotePayments.get(id)!) },
  async orderPayments(id) { return [...remotePayments.values()].filter(p => p.order_id === id) },
  async refund() { throw new Error("not used") },
  async fetchRefund() { throw new Error("not used") },
}
before(async () => {
  h = await createHarness(); h.ctx.payments = fake; h.ctx.config.RAZORPAY_KEY_SECRET = "fixture-secret"
  admin = await h.user({ groups: ["admins"] }); learner = await h.user(); other = await h.user()
  adminId = (await admin.call("GET", "/api/me")).body.id; learnerId = (await learner.call("GET", "/api/me")).body.id; otherId = (await other.call("GET", "/api/me")).body.id
})
after(async () => {
  try {
    // Fixture rows reference the disposable users, so they are removed children-first before the harness deletes the accounts.
    for (const table of ["refunds", "payments", "orders", "seat_reservations", "approval_requests", "recording_chapters", "recording_revisions", "recordings", "media_variants", "processing_jobs", "media_assets", "upload_intents", "batch_students", "batch_registrations", "entitlement_grants", "enrollments", "lesson_progress", "audit_events"]) await h.ctx.db.execute(sql.raw(`delete from lms.${table}`))
  } finally { await h.close() }
})

/** Creates a course with one reading lesson, which is all a course needs to be publishable. */
async function course(price: number, publish = true) {
  const created = await admin.call("POST", "/api/admin/courses", { title: `Course ${randomUUID().slice(0, 6)}`, category: "AI", instructor: "Teacher", price })
  assert.equal(created.status, 201, JSON.stringify(created.body)); const id = created.body.course.id as string
  const module = (await admin.call("POST", `/api/admin/courses/${id}/modules`, { title: "Start" })).body.module.id
  const lesson = (await admin.call("POST", `/api/admin/courses/${id}/lessons`, { moduleId: module, title: "Read this", type: "reading", summary: "Content" })).body.lesson.id as string
  if (publish) assert.equal((await admin.call("PATCH", `/api/admin/courses/${id}`, { status: "Published" })).status, 200)
  return { id, lesson }
}
const offersOf = (courseId: string) => h.ctx.db.select().from(course_offers).where(eq(course_offers.course_id, courseId))
const catalog = async () => (await h.app.inject({ method: "GET", url: "/api/catalog/courses" })).json().courses as { id: string; price: number; is_free: boolean; offer_id: string }[]
function capture(order: { provider_order_id: string; amount: number }) {
  const row: ProviderPayment = { id: `pay_${randomUUID().replaceAll("-", "")}`, order_id: order.provider_order_id, amount: order.amount, currency: "INR", status: "captured", method: "upi", amount_refunded: 0, created_at: Math.floor(Date.now() / 1000) }
  remotePayments.set(row.id, row); return row
}

test("a course is sold as one offer whose price and publication follow the course", async () => {
  const c = await course(499, false)
  let offers = await offersOf(c.id)
  assert.equal(offers.length, 1); assert.equal(offers[0].mode, "self_paced"); assert.equal(offers[0].status, "Draft"); assert.equal(offers[0].price, 499)
  assert.equal((await catalog()).some(x => x.id === c.id), false, "a draft course is not listed")
  assert.equal((await admin.call("PATCH", `/api/admin/courses/${c.id}`, { status: "Published" })).status, 200)
  offers = await offersOf(c.id); assert.equal(offers[0].status, "Published")
  const listed = (await catalog()).find(x => x.id === c.id)!
  assert.equal(listed.price, 499); assert.equal(listed.is_free, false); assert.equal(listed.offer_id, offers[0].id)
  assert.equal((await admin.call("PATCH", `/api/admin/courses/${c.id}`, { price: 0 })).status, 200)
  assert.equal((await catalog()).find(x => x.id === c.id)!.is_free, true, "price 0 makes it a free course")
  // Older data may hold extra offers. Saving the course keeps one and retires the rest without deleting purchase history.
  await h.ctx.db.insert(course_offers).values({ id: randomUUID(), course_id: c.id, mode: "self_paced", title: "Old extra", price: 10, status: "Published" })
  assert.equal((await admin.call("PATCH", `/api/admin/courses/${c.id}`, { title: "Renamed course" })).status, 200)
  offers = await offersOf(c.id)
  assert.equal(offers.filter(o => o.status !== "Archived").length, 1); assert.equal(offers.length, 2)
  assert.equal((await admin.call("PATCH", `/api/admin/courses/${c.id}`, { status: "Draft" })).status, 200)
  assert.equal((await catalog()).some(x => x.id === c.id), false)
  assert.equal((await admin.call("POST", "/api/admin/offers", { course_id: c.id, title: "Another", mode: "self_paced", price: 5 })).status, 409)
})

test("a course has no capacity limit by default, and a free course enrolls in one step", async () => {
  const c = await course(0)
  assert.equal((await h.ctx.db.execute(sql`select capacity from lms.courses where id=${c.id}`)).rows[0].capacity, null)
  assert.equal((await learner.call("POST", "/api/student/lessons/" + c.lesson + "/complete", { done: true })).status, 403, "not enrolled yet")
  for (const s of [learner, other]) assert.equal((await s.call("POST", "/api/student/enrollments", { course_id: c.id })).status, 200)
  assert.equal(await hasEntitlement(h.ctx.db, learnerId, c.id), true); assert.equal(await hasEntitlement(h.ctx.db, otherId, c.id), true)
  assert.equal((await learner.call("POST", "/api/student/lessons/" + c.lesson + "/complete", { done: true })).status, 200)
  // An admin may still cap a course, and clear the cap again.
  assert.equal((await admin.call("PATCH", `/api/admin/courses/${c.id}`, { capacity: 2 })).status, 200)
  assert.equal((await admin.call("PATCH", `/api/admin/courses/${c.id}`, { capacity: null })).status, 200)
  assert.equal((await h.ctx.db.execute(sql`select capacity from lms.courses where id=${c.id}`)).rows[0].capacity, null)
})

test("a paid course needs checkout and unlocks only after verified payment", async () => {
  const c = await course(299)
  assert.equal((await learner.call("POST", "/api/student/enrollments", { course_id: c.id })).status, 403)
  const offer = (await offersOf(c.id))[0]
  const checkout = await learner.call("POST", "/api/student/checkout", { offer_id: offer.id, idempotency_key: randomUUID() })
  assert.equal(checkout.status, 200, JSON.stringify(checkout.body)); assert.equal(checkout.body.order.amount, 29900); assert.equal(checkout.body.order.course_id, c.id)
  assert.equal(await hasEntitlement(h.ctx.db, learnerId, c.id), false)
  await reconcilePayment(h.ctx, capture(checkout.body.order))
  assert.equal(await hasEntitlement(h.ctx.db, learnerId, c.id), true)
  const listing = (await learner.call("GET", `/api/catalog/offers?course_id=${c.id}`)); assert.equal(listing.status, 200)
})

test("the offers catalog lists only the course's own offer and never any batch", async () => {
  const c = await course(100)
  const batch = (await admin.call("POST", "/api/admin/batches", { name: "Unrelated live batch", course_id: c.id, price: 900 })).body.batch
  const response = (await h.app.inject({ method: "GET", url: `/api/catalog/offers?course_id=${c.id}` })).json()
  assert.equal(response.offers.length, 1); assert.equal(response.offers[0].mode, "self_paced"); assert.deepEqual(response.offers[0].batches, [])
  assert.ok(batch.id)
})

test("a batch is standalone: no course needed, its own price, its own live offer", async () => {
  const created = await admin.call("POST", "/api/admin/batches", { name: "Weekend live batch", price: 1500, max_seats: 3 })
  assert.equal(created.status, 201, JSON.stringify(created.body))
  const id = created.body.batch.id as string
  assert.equal(created.body.batch.course_id, null); assert.equal(created.body.batch.price, 1500)
  const [row] = await h.ctx.db.select().from(cohort_batches).where(eq(cohort_batches.id, id))
  const [offer] = await h.ctx.db.select().from(course_offers).where(eq(course_offers.id, row.offer_id!))
  assert.equal(offer.mode, "live"); assert.equal(offer.course_id, null); assert.equal(offer.price, 1500); assert.equal(offer.status, "Published")
  assert.equal((await admin.call("GET", `/api/admin/batches/${id}/admission`)).body.price, 1500)
  // Changing the price edits that same offer, so nothing else is created.
  assert.equal((await admin.call("PATCH", `/api/admin/batches/${id}`, { price: 2000 })).body.batch.price, 2000)
  assert.equal((await h.ctx.db.select().from(course_offers).where(eq(course_offers.id, offer.id)))[0].price, 2000)
  // A topic label can be added and removed without affecting anything else.
  const c = await course(0)
  assert.equal((await admin.call("PATCH", `/api/admin/batches/${id}`, { course_id: c.id })).body.batch.course_id, c.id)
  assert.equal((await admin.call("PATCH", `/api/admin/batches/${id}`, { course_id: null })).body.batch.course_id, null)
  // Free means admin-admitted only; once registration opens the price cannot silently drop to free.
  const free = (await admin.call("POST", "/api/admin/batches", { name: "Invite only", price: 0 })).body.batch
  assert.equal(free.price, 0); assert.equal((await h.ctx.db.select().from(cohort_batches).where(eq(cohort_batches.id, free.id)))[0].offer_id, null)
  assert.equal((await admin.call("PATCH", `/api/admin/batches/${free.id}`, { price: 700 })).body.batch.price, 700)
  assert.equal((await admin.call("PATCH", `/api/admin/batches/${free.id}`, { price: 0 })).body.batch.price, 0, "a draft batch can become free")
})

test("a paid batch is sold on its own, with no course, and registration unlocks no course lesson", async () => {
  const lessonCourse = await course(0)
  const batchId = (await admin.call("POST", "/api/admin/batches", { name: "Paid live batch", price: 800, max_seats: 5 })).body.batch.id as string
  const starts = new Date(Date.now() + 10 * 86400_000), ends = new Date(Date.now() + 100 * 86400_000)
  assert.equal((await admin.call("PATCH", `/api/admin/batches/${batchId}/admission`, { starts_at: starts.toISOString(), ends_at: ends.toISOString(), minimum_paid_registrations: 1 })).status, 200)
  assert.equal((await admin.call("POST", `/api/admin/batches/${batchId}/transition`, { state: "Recruiting" })).status, 200)
  const listed = ((await h.app.inject({ method: "GET", url: "/api/catalog/batches" })).json().batches as { id: string; price: number; seats_left: number; topic: string | null; offer_id: string }[]).find(b => b.id === batchId)!
  assert.ok(listed, "an open batch is listed"); assert.equal(listed.price, 800); assert.equal(listed.seats_left, 5); assert.equal(listed.topic, null)
  const checkout = await learner.call("POST", "/api/student/checkout", { offer_id: listed.offer_id, batch_id: batchId, idempotency_key: randomUUID() })
  assert.equal(checkout.status, 200, JSON.stringify(checkout.body)); assert.equal(checkout.body.order.course_id, null); assert.equal(checkout.body.order.amount, 80000)
  assert.equal((await h.app.inject({ method: "GET", url: "/api/catalog/batches" })).json().batches.find((b: { id: string }) => b.id === batchId).seats_left, 4, "a pending checkout holds a seat")
  await reconcilePayment(h.ctx, capture(checkout.body.order))
  const [registration] = await h.ctx.db.select().from(batch_registrations).where(and(eq(batch_registrations.batch_id, batchId), eq(batch_registrations.student_id, learnerId)))
  assert.equal(registration.state, "confirmed"); assert.ok(registration.paid_at)
  assert.equal((await h.ctx.db.select().from(entitlement_grants).where(and(eq(entitlement_grants.student_id, learnerId), eq(entitlement_grants.batch_id, batchId)))).length, 0, "the registration created no grant of any kind")
  assert.equal((await h.ctx.db.select().from(entitlement_grants).where(and(eq(entitlement_grants.student_id, learnerId), eq(entitlement_grants.source_type, "batch_registration")))).length, 0)
  assert.equal((await learner.call("POST", `/api/student/lessons/${lessonCourse.lesson}/complete`, { done: true })).status, 403, "a batch place is not a course enrollment")
  assert.equal((await learner.call("POST", "/api/student/enrollments", { course_id: lessonCourse.id })).status, 200)
  assert.equal((await learner.call("POST", `/api/student/lessons/${lessonCourse.lesson}/complete`, { done: true })).status, 200, "the free course enrolls separately")
  // The reverse also holds: a course enrollment does not put anyone in a live batch.
  assert.equal((await h.ctx.db.select().from(batch_registrations).where(and(eq(batch_registrations.batch_id, batchId), eq(batch_registrations.student_id, otherId)))).length, 0)
})

test("a teacher-uploaded batch video reaches only that batch, through the review and approval pipeline", async () => {
  const batchId = (await admin.call("POST", "/api/admin/batches", { name: "Video batch", price: 0, max_seats: 5 })).body.batch.id as string
  const noEnd = await admin.call("POST", "/api/recordings/batch-videos", { batch_id: batchId, asset_id: "missing", title: "Early" })
  assert.equal(noEnd.status, 400, "the batch must have an end date before it can hold videos")
  await admin.call("PATCH", `/api/admin/batches/${batchId}/admission`, { starts_at: new Date(Date.now() + 86400_000).toISOString(), ends_at: new Date(Date.now() + 90 * 86400_000).toISOString() })
  await h.ctx.db.transaction(tx => admit(tx, { batchId, student: learnerId }))
  const upload = await admin.call("POST", "/api/recordings/uploads", { batch_id: batchId, filename: "bonus.mp4", content_type: "video/mp4", bytes: 1000 })
  assert.equal(upload.status, 200, JSON.stringify(upload.body))
  const asset = upload.body.asset_id as string
  const [created] = await h.ctx.db.select().from(media_assets).where(eq(media_assets.id, asset))
  assert.equal(created.batch_id, batchId); assert.equal(created.session_id, null); assert.equal(created.course_id, null)
  const key = `videos/assets/${asset}/720p.mp4`; await h.ctx.storage.put(key, Buffer.from("fixture"), "video/mp4")
  await h.ctx.db.update(media_assets).set({ state: "ready", duration_seconds: 120 }).where(eq(media_assets.id, asset))
  await h.ctx.db.insert(media_variants).values({ asset_id: asset, quality: "720p", key, bytes: 7, height: 720 })
  const attached = await admin.call("POST", "/api/recordings/batch-videos", { batch_id: batchId, asset_id: asset, title: "Bonus walkthrough" })
  assert.equal(attached.status, 200, JSON.stringify(attached.body))
  const recording = attached.body.recording; assert.equal(recording.session_id, null); assert.equal(recording.batch_id, batchId); assert.equal(recording.status, "Draft")
  assert.equal((await h.ctx.db.select().from(recordings).where(eq(recordings.asset_id, asset))).length, 1)
  assert.equal((await admin.call("POST", "/api/recordings/batch-videos", { batch_id: batchId, asset_id: asset, title: "Again" })).body.recording.id, recording.id, "attaching twice keeps one video")
  assert.equal((await learner.call("POST", `/api/recordings/${recording.id}/playback`, {})).status, 403, "a draft is not visible to learners")
  const published = await admin.call("POST", `/api/recordings/${recording.id}/publish`, { expected_version: 1, publish: true })
  assert.equal(published.status, 200, JSON.stringify(published.body)); assert.equal(published.body.recording.status, "Published")
  assert.equal((await learner.call("POST", `/api/recordings/${recording.id}/playback`, {})).status, 200)
  assert.equal((await other.call("POST", `/api/recordings/${recording.id}/playback`, {})).status, 403, "only that batch's learners may watch")
  const mine = (await learner.call("GET", "/api/recordings")).body.recordings as { id: string; kind: string; session_id: string | null }[]
  const found = mine.find(r => r.id === recording.id)!; assert.equal(found.kind, "video"); assert.equal(found.session_id, null)
  assert.equal(((await other.call("GET", "/api/recordings")).body.recordings as { id: string }[]).some(r => r.id === recording.id), false)
  const myBatches = (await learner.call("GET", "/api/student/batches")).body.batches as { id: string; video_count: number; registration_state: string; topic: string | null }[]
  const mineBatch = myBatches.find(b => b.id === batchId)!
  assert.equal(mineBatch.video_count, 1); assert.equal(mineBatch.registration_state, "confirmed"); assert.equal(mineBatch.topic, null)
  assert.equal(((await other.call("GET", "/api/student/batches")).body.batches as { id: string }[]).some(b => b.id === batchId), false)
  // A batch video can never be pulled into a course lesson.
  assert.equal((await admin.call("POST", `/api/admin/media/${asset}/attach`, { lessonId: "any" })).status, 400)
  void adminId
})

test("a free batch can be launched: no offer or paid minimum is needed, only dates, a teacher and classes", async () => {
  const teacher = await h.user({ groups: ["teachers"] }); const teacherId = (await teacher.call("GET", "/api/me")).body.id as string
  const free = (await admin.call("POST", "/api/admin/batches", { name: "Free cohort", price: 0, max_seats: 5 })).body.batch.id as string
  assert.equal((await admin.call("POST", `/api/admin/batches/${free}/transition`, { state: "Recruiting" })).status, 409, "dates are still required")
  const starts = new Date(Date.now() + 10 * 86400_000), ends = new Date(Date.now() + 60 * 86400_000)
  assert.equal((await admin.call("PATCH", `/api/admin/batches/${free}/admission`, { starts_at: starts.toISOString(), ends_at: ends.toISOString(), teacher_ids: [teacherId] })).status, 200)
  assert.equal((await admin.call("POST", `/api/admin/batches/${free}/transition`, { state: "Recruiting" })).status, 200)
  await h.ctx.db.transaction(tx => admit(tx, { batchId: free, student: learnerId }))
  await h.ctx.db.insert(live_sessions).values({ id: randomUUID(), batch_id: free, teacher_id: teacherId, occurrence_key: "free-fixture", title: "First class", starts_at: starts, ends_at: new Date(starts.getTime() + 3600_000) })
  assert.equal((await admin.call("POST", `/api/admin/batches/${free}/transition`, { state: "Ready" })).status, 200, JSON.stringify((await admin.call("GET", `/api/admin/batches/${free}/admission`)).body))
  // It is not offered for self-service checkout either.
  assert.equal((await learner.call("GET", "/api/catalog/batches")).body.batches.some((b: { id: string }) => b.id === free), false)
  await h.ctx.db.delete(live_sessions).where(eq(live_sessions.batch_id, free))
})

test("the course learners list shows everyone enrolled, whichever route they took", async () => {
  const c = await course(0)
  assert.equal((await learner.call("POST", "/api/student/enrollments", { course_id: c.id })).status, 200)
  assert.equal((await admin.call("POST", "/api/admin/students/enrol", { student_id: otherId, course_id: c.id })).status, 200)
  assert.equal((await learner.call("POST", `/api/student/lessons/${c.lesson}/complete`, { done: true })).status, 200)
  const res = await admin.call("GET", `/api/admin/courses/${c.id}/learners`)
  assert.equal(res.status, 200, JSON.stringify(res.body))
  const rows = res.body.learners as { id: string; email: string; progress: number; total_lessons: number; source: string }[]
  assert.deepEqual(rows.map(r => r.id).sort(), [learnerId, otherId].sort())
  assert.equal(rows.every(r => r.total_lessons === 1 && r.source === "free_or_added" && r.email.length > 0), true)
  assert.equal(rows.find(r => r.id === learnerId)!.progress, 100); assert.equal(rows.find(r => r.id === otherId)!.progress, 0)
  assert.equal((await admin.call("GET", `/api/admin/courses/nope-${randomUUID()}/learners`)).status, 404)
  assert.equal((await learner.call("GET", `/api/admin/courses/${c.id}/learners`)).status, 403)
})

test("the student 360 view pulls a learner's courses, batches, payments and activity together", async () => {
  const c = await course(0)
  assert.equal((await learner.call("POST", "/api/student/enrollments", { course_id: c.id })).status, 200)
  assert.equal((await learner.call("POST", `/api/student/lessons/${c.lesson}/complete`, { done: true })).status, 200)
  const res = await admin.call("GET", `/api/admin/students/${learnerId}/360`)
  assert.equal(res.status, 200, JSON.stringify(res.body))
  const b = res.body
  assert.equal(b.student.id, learnerId); assert.equal(typeof b.student.email, "string")
  const row = b.courses.find((x: { id: string }) => x.id === c.id)
  assert.equal(row.progress, 100); assert.equal(row.completed_lessons, 1); assert.equal(row.source, "free_or_added")
  assert.equal(b.totals.courses >= 1, true); assert.equal(b.totals.lessons_completed >= 1, true)
  assert.equal(b.activity.length, 14); assert.equal(Array.isArray(b.batches) && Array.isArray(b.payments), true)
  assert.equal(b.timeline.some((t: { kind: string; title: string }) => t.kind === "lesson" && t.title === "Read this"), true)
  assert.equal((await admin.call("GET", `/api/admin/students/${randomUUID()}/360`)).status, 404)
  assert.equal((await admin.call("GET", "/api/admin/students/not-a-uuid/360")).status, 400)
  assert.equal((await learner.call("GET", `/api/admin/students/${learnerId}/360`)).status, 403)
})
