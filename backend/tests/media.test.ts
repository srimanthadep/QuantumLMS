import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { eq } from "drizzle-orm"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"
import { media_assets, processing_jobs, lessons, courses } from "../src/db/schema.js"
import { claimJob, finishJob, failJob } from "../src/media/jobs.js"

let h: TestHarness, admin: TestUser, course: string, moduleId: string
before(async () => {
  h = await createHarness(); admin = await h.user({ groups: ["admins"] })
  const c = await admin.call("POST", "/api/admin/courses", { title: "Media course", instructor: "Media teacher", category: "Testing" })
  assert.equal(c.status, 201); course = c.body.course.id
  const m = await admin.call("POST", `/api/admin/courses/${course}/modules`, { title: "First module" })
  assert.equal(m.status, 201); moduleId = m.body.module.id
})
after(async () => { await h.ctx.db.delete(courses).where(eq(courses.id, course)); await h.close() })

async function upload(bytes = Buffer.from("0000ftypfake video fixture")) {
  const response = await admin.call("POST", "/api/admin/media/uploads", { courseId: course, filename: "lesson.mp4", contentType: "video/mp4", bytes: bytes.length })
  assert.equal(response.status, 200, JSON.stringify(response.body))
  const { asset, upload } = response.body
  await h.ctx.storage.put(asset.source_key, bytes, "video/mp4")
  const queued = await admin.call("POST", `/api/admin/media/${asset.id}/finalize`, {})
  assert.equal(queued.status, 200, JSON.stringify(queued.body))
  return asset as typeof media_assets.$inferSelect
}
async function lesson(title: string) {
  const result = await admin.call("POST", `/api/admin/courses/${course}/lessons`, { moduleId, title })
  assert.equal(result.status, 201, JSON.stringify(result.body)); return result.body.lesson.id as string
}

test("empty courses remain Draft and cannot be published; legacy transcode endpoints are removed", async () => {
  assert.equal((await admin.call("PATCH", `/api/admin/courses/${course}`, { status: "Published" })).status, 400)
  assert.equal((await admin.call("POST", "/api/admin/courses/video-transcode", { courseId: course, videoKey: "anything" })).status, 404)
})
test("module ownership is enforced by API and database; concurrent inserts have distinct stable IDs and positions", async () => {
  const other = await admin.call("POST", "/api/admin/courses", { title: "Other course", category: "Testing", instructor: "Teacher" })
  const mismatch = await admin.call("POST", `/api/admin/courses/${other.body.course.id}/lessons`, { moduleId, title: "Wrong module" })
  assert.equal(mismatch.status, 400)
  await assert.rejects(h.ctx.db.insert(lessons).values({ id: "mismatch", course_id: other.body.course.id, module_id: moduleId, position: 1, title: "Bad", type: "video" }))
  const results = await Promise.all([lesson("Concurrent one"), lesson("Concurrent two")])
  assert.notEqual(results[0], results[1])
  const rows = await h.ctx.db.select().from(lessons).where(eq(lessons.course_id, course))
  assert.equal(new Set(rows.map(r => r.position)).size, rows.length)
})
test("two uploads preserve separate videos; duplicate finalize queues one job; unfinished assets cannot attach", async () => {
  const a = await upload(), b = await upload()
  assert.notEqual(a.source_key, b.source_key)
  assert.equal((await admin.call("POST", `/api/admin/media/${a.id}/finalize`, {})).status, 200)
  const first = await lesson("First video"), second = await lesson("Second video")
  assert.equal((await admin.call("POST", `/api/admin/media/${a.id}/attach`, { lessonId: first })).status, 400)
  const jobs = await Promise.all([claimJob(h.ctx.db), claimJob(h.ctx.db)])
  assert.ok(jobs[0]); assert.ok(jobs[1]); assert.notEqual(jobs[0].id, jobs[1].id)
  for (const job of jobs) {
    assert.ok(job)
    const key = `videos/assets/${job.asset_id}/${job.lease_token}/720p.mp4`
    await h.ctx.storage.put(key, Buffer.from("ready"), "video/mp4")
    assert.equal(await finishJob(h.ctx.db, job, { duration: 10, variants: [{ quality: "720p", key, bytes: 5, height: 720 }], transcript: [], chapters: [] }), true)
  }
  assert.equal((await admin.call("POST", `/api/admin/media/${a.id}/attach`, { lessonId: first })).status, 200)
  const before = await h.ctx.db.query.lessons.findFirst({ where: eq(lessons.id, first) })
  assert.equal((await admin.call("POST", `/api/admin/media/${b.id}/attach`, { lessonId: second })).status, 200)
  const after = await h.ctx.db.query.lessons.findFirst({ where: eq(lessons.id, first) })
  assert.equal(after?.video_url, before?.video_url)
  const secondRow = await h.ctx.db.query.lessons.findFirst({ where: eq(lessons.id, second) })
  assert.notEqual(after?.video_url, secondRow?.video_url)
  assert.equal((await h.ctx.db.select().from(processing_jobs).where(eq(processing_jobs.asset_id, a.id))).length, 1)
})
test("expired worker leases can be reclaimed; stale workers cannot complete; transcription failure is explicit", async () => {
  const asset = await upload()
  const stale = await claimJob(h.ctx.db); assert.ok(stale)
  await h.ctx.db.update(processing_jobs).set({ lease_until: new Date(0) }).where(eq(processing_jobs.id, stale.id))
  const current = await claimJob(h.ctx.db); assert.ok(current); assert.equal(current.id, stale.id); assert.notEqual(current.lease_token, stale.lease_token)
  assert.equal(await finishJob(h.ctx.db, stale, { duration: 1, variants: [{ quality: "720p", key: "stale", bytes: 1, height: 720 }], transcript: [], chapters: [] }), false)
  await h.ctx.db.update(processing_jobs).set({ max_attempts: current.attempts }).where(eq(processing_jobs.id, current.id))
  await failJob(h.ctx.db, current, Object.assign(new Error("no model"), { name: "TranscriptionError" }))
  const failed = await h.ctx.db.query.media_assets.findFirst({ where: eq(media_assets.id, asset.id) })
  assert.equal(failed?.state, "failed"); assert.match(failed?.error ?? "", /Transcription failed/)
  assert.deepEqual(failed?.transcript, [])
})
