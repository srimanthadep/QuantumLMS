import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, test } from "node:test"
import { and, eq, sql } from "drizzle-orm"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"
import { courses, course_offers, entitlement_grants, seat_reservations, lessons, lesson_progress, lesson_revisions, media_assets, media_variants, orders, payments, refunds } from "../src/db/schema.js"
import { reconcilePayment } from "../src/payments/service.js"

let h: TestHarness, admin: TestUser, learner: TestUser, outsider: TestUser, studentId: string, authorId: string, course: string, module: string, first: string, second: string, offer: string
before(async () => {
  h = await createHarness()
  assert.equal((await h.ctx.db.select().from(courses)).length, 0, "this suite starts with schema only, no seed content")
  admin = await h.user({ groups: ["admins"] }); learner = await h.user(); outsider = await h.user()
  authorId = (await admin.call("GET", "/api/me")).body.id; studentId = (await learner.call("GET", "/api/me")).body.id
})
after(async () => { try { await h.ctx.db.execute(sql`delete from lms.completion_events`);await h.ctx.db.execute(sql`delete from lms.completion_credentials`);await h.ctx.db.execute(sql`delete from lms.completions`);await h.ctx.db.execute(sql`delete from lms.completion_policies`); await h.ctx.db.delete(refunds); await h.ctx.db.delete(payments); await h.ctx.db.delete(orders); await h.ctx.db.delete(seat_reservations); await h.ctx.db.delete(entitlement_grants); await h.ctx.db.delete(course_offers); await h.ctx.db.delete(courses) } finally { await h.close() } })

test("an empty install can author and publish a self-paced offer without seeded curriculum", async () => {
  const created = await admin.call("POST", "/api/admin/courses", { title: "Fresh course", category: "Testing", instructor: "Real teacher" }); assert.equal(created.status, 201); course = created.body.course.id
  module = (await admin.call("POST", `/api/admin/courses/${course}/modules`, { title: "Foundations" })).body.module.id
  first = (await admin.call("POST", `/api/admin/courses/${course}/lessons`, { moduleId: module, title: "Read the introduction", type: "reading", summary: "Original learning content" })).body.lesson.id
  second = (await admin.call("POST", `/api/admin/courses/${course}/lessons`, { moduleId: module, title: "Watch the demonstration", type: "video" })).body.lesson.id
  offer = (await admin.call("POST", "/api/admin/offers", { course_id: course, title: "Fresh self-paced learning", mode: "self_paced", price: 250 })).body.offer.id
  assert.equal((await admin.call("PATCH", `/api/admin/offers/${offer}`, { status: "Published" })).status, 400)
  const asset = randomUUID(), key = `videos/assets/${asset}/720p.mp4`
  await h.ctx.storage.put(key, Buffer.from("ready-video-fixture"), "video/mp4")
  await h.ctx.db.insert(media_assets).values({ id: asset, course_id: course, owner_id: authorId, source_key: `videos/${asset}/source.mp4`, state: "ready", duration_seconds: 60 })
  await h.ctx.db.insert(media_variants).values({ asset_id: asset, quality: "720p", key, bytes: 19, height: 720 })
  assert.equal((await admin.call("POST", `/api/admin/media/${asset}/attach`, { lessonId: second })).status, 200)
  assert.equal((await admin.call("PATCH", `/api/admin/courses/${course}`, { certificate_title: "Fresh certificate" })).status, 200)
  assert.equal((await admin.call("PATCH", `/api/admin/offers/${offer}`, { status: "Published" })).status, 200)
  const catalog = (await h.app.inject({ method: "GET", url: "/api/catalog/courses" })).json()
  assert.equal(catalog.courses.length, 1); assert.equal(catalog.courses[0].lessons_count, 2); assert.equal(catalog.courses[0].price, 250)
  assert.equal("video_url" in catalog.courses[0], false); assert.equal("summary" in catalog.courses[0], false)
  assert.equal((await outsider.call("GET", "/api/student/core")).body.lessons.length, 0)
})

test("a purchase grants only its learner playback and independent per-lesson progress", async () => {
  h.ctx.payments = { name: "razorpay", publicKey: "rzp_test_fixture", async createOrder(input) { return { ...input, id: "order_fresh", status: "created" } }, async findOrders() { return [] }, async orderPayments() { return [] }, async fetchPayment() { throw new Error("unused") }, async refund() { throw new Error("unused") }, async fetchRefund() { throw new Error("unused") } }
  const result = await learner.call("POST", "/api/student/checkout", { offer_id: offer, idempotency_key: randomUUID() }); assert.equal(result.status, 200)
  await reconcilePayment(h.ctx, { id: "pay_fresh", order_id: "order_fresh", amount: 25000, currency: "INR", status: "captured", amount_refunded: 0, created_at: Math.floor(Date.now()/1000) })
  assert.equal((await admin.call("POST", `/api/admin/lessons/${second}/playback`, {})).status, 200)
  assert.equal((await outsider.call("POST", `/api/admin/lessons/${second}/playback`, {})).status, 403)
  assert.equal((await outsider.call("POST", `/api/student/lessons/${second}/playback`, {})).status, 403)
  assert.equal((await learner.call("POST", `/api/student/lessons/${second}/playback`, {})).status, 200)
  assert.equal((await learner.call("POST", `/api/student/lessons/${first}/complete`, { done: true })).status, 200)
  const progress = await h.ctx.db.select().from(lesson_progress).where(eq(lesson_progress.student_id, studentId)); assert.equal(progress.length, 1); assert.equal(progress[0].lesson_id, first)
})

test("reordering uses stable IDs, rejects partial/cross-course orders, and preserves progress", async () => {
  assert.equal((await admin.call("PUT", `/api/admin/courses/${course}/order`, { module_ids: [module], lesson_ids: [second, first] })).status, 200)
  assert.equal((await admin.call("PUT", `/api/admin/courses/${course}/order`, { module_ids: [module], lesson_ids: [second, "foreign"] })).status, 400)
  const detail = (await admin.call("GET", `/api/admin/courses/${course}`)).body
  assert.deepEqual(detail.lessons.map((l: { id: string }) => l.id), [second, first])
  assert.equal((await h.ctx.db.select().from(lesson_progress).where(and(eq(lesson_progress.student_id, studentId), eq(lesson_progress.lesson_id, first)))).length, 1)
})

test("ready video replacement is atomic, retains history/progress, and closes enrollment for review", async () => {
  const completed = await learner.call("POST", `/api/student/lessons/${second}/complete`, { done: true })
  assert.equal(completed.status, 200); assert.equal(completed.body.certificate, null)
  const checked=await learner.call("POST","/api/student/completion/check",{course_id:course});assert.equal(checked.status,200,JSON.stringify(checked.body));assert.ok(checked.body.results[0].credential?.credential_id,"new content completes through the policy service without seeded credentials")
  const before = (await h.ctx.db.select().from(lessons).where(eq(lessons.id, second)))[0]
  const asset = randomUUID(), key = `videos/assets/${asset}/720p.mp4`
  await h.ctx.storage.put(key, Buffer.from("replacement"), "video/mp4")
  await h.ctx.db.insert(media_assets).values({ id: asset, course_id: course, owner_id: authorId, source_key: `videos/${asset}/source.mp4`, state: "ready", duration_seconds: 120 })
  await h.ctx.db.insert(media_variants).values({ asset_id: asset, quality: "720p", key, bytes: 11, height: 720 })
  assert.equal((await admin.call("POST", `/api/admin/media/${asset}/attach`, { lessonId: second })).status, 200)
  const history = await h.ctx.db.select().from(lesson_revisions).where(eq(lesson_revisions.lesson_id, second))
  assert.ok(history.some(r => (r.snapshot as typeof before).media_asset_id === before.media_asset_id))
  assert.equal((await h.ctx.db.select().from(lesson_progress).where(and(eq(lesson_progress.lesson_id, second), eq(lesson_progress.student_id, studentId)))).length, 1)
  assert.equal((await h.ctx.db.select().from(course_offers).where(eq(course_offers.id, offer)))[0].status, "Draft")
  assert.equal((await learner.call("POST", `/api/student/lessons/${second}/playback`, {})).status, 200)
  assert.equal((await h.app.inject({ method: "GET", url: "/api/catalog/courses" })).json().courses.length, 0)
})

test("archiving content retains history and progress; restore and republish keeps the course usable", async () => {
  assert.equal((await admin.call("DELETE", `/api/admin/courses/${course}/lessons/${first}`)).status, 200)
  assert.equal((await learner.call("POST", `/api/student/lessons/${first}/complete`, { done: true })).status, 404)
  assert.equal((await h.ctx.db.select().from(lesson_progress).where(eq(lesson_progress.lesson_id, first))).length, 1)
  assert.equal((await admin.call("POST", `/api/admin/courses/${course}/lessons/${first}/restore`, {})).status, 200)
  assert.equal((await admin.call("PATCH", `/api/admin/offers/${offer}`, { status: "Published" })).status, 200)
  assert.equal((await admin.call("DELETE", `/api/admin/courses/${course}`)).status, 200)
  assert.equal((await admin.call("GET", `/api/admin/courses/${course}`)).status, 404)
  assert.equal((await learner.call("GET", "/api/student/core")).body.courses[0].id, course, "existing learner access survives closing enrollment")
  assert.equal((await admin.call("POST", `/api/admin/courses/${course}/restore`, {})).status, 200)
  assert.equal((await admin.call("PATCH", `/api/admin/offers/${offer}`, { status: "Published" })).status, 200)
})
