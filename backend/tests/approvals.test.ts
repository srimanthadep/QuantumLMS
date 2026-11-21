import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, test } from "node:test"
import { and, eq } from "drizzle-orm"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"
import { approval_requests, batch_teachers, cohort_batches, courses, live_sessions, media_assets, notification_outbox, processing_jobs, recordings, recording_chapters, recording_revisions } from "../src/db/schema.js"
import { claimJob, finishJob } from "../src/media/jobs.js"

let h: TestHarness, admin: TestUser, teacher: TestUser, otherTeacher: TestUser, student: TestUser, teacherId: string, adminId: string
const course = "approval-course", batch = "approval-batch"

before(async () => {
  h = await createHarness()
  admin = await h.user({ groups: ["admins"] }); teacher = await h.user({ groups: ["teachers"], name: "Asha Teacher" }); otherTeacher = await h.user({ groups: ["teachers"] }); student = await h.user()
  teacherId = (await teacher.call("GET", "/api/me")).body.id; adminId = (await admin.call("GET", "/api/me")).body.id
  await otherTeacher.call("GET", "/api/me"); await student.call("GET", "/api/me")
  await h.ctx.db.insert(courses).values({ id: course, code: "APPROVE", title: "Approval course", category: "AI", instructor: "Teacher", level: "Beginner" })
  await h.ctx.db.insert(cohort_batches).values({ id: batch, course_id: course, name: "Approval batch", instructor: "Teacher", start_date: "2026-01-01", end_date: "2030-01-01", starts_at: new Date(Date.now() - 86400000), ends_at: new Date(Date.now() + 86400000), max_seats: 50 })
  await h.ctx.db.insert(batch_teachers).values({ batch_id: batch, teacher_id: teacherId })
})
after(async () => {
  try {
    await h.ctx.db.delete(approval_requests); await h.ctx.db.delete(recording_chapters); await h.ctx.db.delete(recording_revisions); await h.ctx.db.delete(recordings)
    await h.ctx.db.delete(processing_jobs); await h.ctx.db.delete(media_assets); await h.ctx.db.delete(live_sessions).where(eq(live_sessions.batch_id, batch))
  } finally { await h.close() }
})

/** An ended class with a processed, attached recording draft. */
async function makeRecording(title = "Approval class") {
  const session = randomUUID()
  await h.ctx.db.insert(live_sessions).values({ id: session, batch_id: batch, teacher_id: teacherId, occurrence_key: `approval:${session}`, title, status: "Ended", starts_at: new Date(Date.now() - 5 * 3600000), ends_at: new Date(Date.now() - 3 * 3600000), actual_start: new Date(Date.now() - 5 * 3600000), actual_end: new Date(Date.now() - 3 * 3600000) })
  const bytes = Buffer.from("0000ftypapproval fixture")
  const created = await teacher.call("POST", "/api/recordings/uploads", { session_id: session, filename: "class.mp4", content_type: "video/mp4", bytes: bytes.length })
  assert.equal(created.status, 200, JSON.stringify(created.body))
  const [asset] = await h.ctx.db.select().from(media_assets).where(eq(media_assets.id, created.body.asset_id)); await h.ctx.storage.put(asset.source_key, bytes, "video/mp4")
  assert.equal((await teacher.call("POST", `/api/recordings/assets/${asset.id}/finalize`, {})).status, 200)
  const job = await claimJob(h.ctx.db); assert.ok(job)
  const variant = `videos/assets/${asset.id}/${job.lease_token}/720p.mp4`; await h.ctx.storage.put(variant, Buffer.from("ready"), "video/mp4")
  assert.equal(await finishJob(h.ctx.db, job, { duration: 60, variants: [{ quality: "720p", key: variant, bytes: 5, height: 720 }], transcript: [{ start: 0, end: 60, text: "Hello" }], chapters: [{ start: 0, title: "Introduction" }] }), true)
  const attached = await teacher.call("POST", "/api/recordings/attach", { session_id: session, asset_id: asset.id })
  assert.equal(attached.status, 200, JSON.stringify(attached.body))
  return attached.body.recording as { id: string; version: number; title: string }
}
const outboxFor = (recipient: string) => h.ctx.db.select().from(notification_outbox).where(eq(notification_outbox.recipient_id, recipient))

test("a teacher's publish opens one pending request, notifies admins and leaves the recording a draft", async () => {
  const r = await makeRecording("Week 1 replay")
  const first = await teacher.call("POST", `/api/recordings/${r.id}/publish`, { expected_version: r.version, publish: true, note: "Ready for learners" })
  assert.equal(first.status, 200, JSON.stringify(first.body))
  assert.equal(first.body.recording.status, "Draft"); assert.equal(first.body.approval.state, "Pending"); assert.equal(first.body.approval.note, "Ready for learners")
  const again = await teacher.call("POST", `/api/recordings/${r.id}/publish`, { expected_version: r.version, publish: true })
  assert.equal(again.body.approval.id, first.body.approval.id, "asking twice for the same version reuses the request")
  assert.equal((await h.ctx.db.select().from(approval_requests).where(eq(approval_requests.target_id, r.id))).length, 1)
  assert.ok((await outboxFor(adminId)).some((n) => n.title === "Recording waiting for approval" && n.link === "approvals"))

  const list = await admin.call("GET", "/api/admin/approvals")
  assert.equal(list.status, 200); assert.equal(list.body.counts.Pending, 1)
  const row = list.body.approvals.find((a: { id: string }) => a.id === first.body.approval.id)
  assert.equal(row.recording_title, "Week 1 replay"); assert.equal(row.batch_name, "Approval batch"); assert.equal(row.requested_by_name, "Asha Teacher"); assert.equal(row.chapter_count, 1); assert.equal(row.processing_state, "ready")
  assert.equal((await admin.call("GET", "/api/admin/approvals/count")).body.pending, 1)

  const detail = await teacher.call("GET", `/api/recordings/${r.id}`)
  assert.equal(detail.body.approval.state, "Pending")
  const teacherList = await teacher.call("GET", `/api/recordings?batch_id=${batch}`)
  assert.equal(teacherList.body.recordings.find((x: { id: string }) => x.id === r.id).approval_state, "Pending")
})

test("only administrators see or decide the queue; ids are validated", async () => {
  const [pending] = await h.ctx.db.select().from(approval_requests).where(eq(approval_requests.state, "Pending"))
  for (const user of [teacher, otherTeacher, student]) {
    assert.equal((await user.call("GET", "/api/admin/approvals")).status, 403)
    assert.equal((await user.call("POST", `/api/admin/approvals/${pending.id}/approve`, {})).status, 403)
  }
  assert.equal((await admin.call("POST", "/api/admin/approvals/not-a-uuid/approve", {})).status, 400)
  assert.equal((await admin.call("POST", `/api/admin/approvals/${randomUUID()}/reject`, {})).status, 404)
  assert.equal((await admin.call("GET", "/api/admin/approvals?state=Nope")).status, 400)
  assert.equal((await student.call("GET", `/api/recordings?batch_id=${batch}`)).body.recordings.every((x: object) => !("approval_state" in x)), true)
})

test("rejecting records an optional reason, tells the teacher and closes the request", async () => {
  const [pending] = await h.ctx.db.select().from(approval_requests).where(eq(approval_requests.state, "Pending"))
  const rejected = await admin.call("POST", `/api/admin/approvals/${pending.id}/reject`, { note: "Trim the first five minutes" })
  assert.equal(rejected.status, 200, JSON.stringify(rejected.body)); assert.equal(rejected.body.approval.state, "Rejected"); assert.equal(rejected.body.approval.decision_note, "Trim the first five minutes")
  assert.equal((await admin.call("POST", `/api/admin/approvals/${pending.id}/approve`, {})).status, 409)
  assert.equal((await admin.call("POST", `/api/admin/approvals/${pending.id}/reject`, {})).status, 409)
  const [rec] = await h.ctx.db.select().from(recordings).where(eq(recordings.id, pending.target_id)); assert.equal(rec.status, "Draft")
  assert.ok((await outboxFor(teacherId)).some((n) => n.title === "Publish request declined" && n.message.includes("Trim the first five minutes")))
  // A reason is optional.
  const again = await teacher.call("POST", `/api/recordings/${rec.id}/publish`, { expected_version: rec.version, publish: true })
  assert.equal(again.body.approval.state, "Pending"); assert.notEqual(again.body.approval.id, pending.id)
  const plain = await admin.call("POST", `/api/admin/approvals/${again.body.approval.id}/reject`, {})
  assert.equal(plain.status, 200); assert.equal(plain.body.approval.decision_note, "")
})

test("editing the recording supersedes the open request; approving publishes the exact requested version", async () => {
  const r = await makeRecording("Week 2 replay")
  const requested = await teacher.call("POST", `/api/recordings/${r.id}/publish`, { expected_version: r.version, publish: true })
  const d = (await teacher.call("GET", `/api/recordings/${r.id}`)).body
  const edited = await teacher.call("PATCH", `/api/recordings/${r.id}`, { expected_version: d.recording.version, title: "Week 2 replay (trimmed)", summary: "", release_at: d.recording.release_at, expires_at: d.recording.expires_at, chapters: [{ title: "All", start_seconds: 0, end_seconds: 60 }] })
  assert.equal(edited.status, 200, JSON.stringify(edited.body))
  const [old] = await h.ctx.db.select().from(approval_requests).where(eq(approval_requests.id, requested.body.approval.id))
  assert.equal(old.state, "Superseded")
  assert.equal((await admin.call("POST", `/api/admin/approvals/${old.id}/approve`, {})).status, 409)

  const fresh = await teacher.call("POST", `/api/recordings/${r.id}/publish`, { expected_version: edited.body.recording.version, publish: true })
  assert.equal(fresh.body.approval.target_version, edited.body.recording.version)
  const approved = await admin.call("POST", `/api/admin/approvals/${fresh.body.approval.id}/approve`, { note: "Looks good" })
  assert.equal(approved.status, 200, JSON.stringify(approved.body))
  assert.equal(approved.body.recording.status, "Published"); assert.equal(approved.body.recording.published_by, adminId); assert.equal(approved.body.recording.version, edited.body.recording.version + 1)
  assert.equal(approved.body.approval.state, "Approved"); assert.equal(approved.body.approval.decision_note, "Looks good")
  assert.ok((await outboxFor(teacherId)).some((n) => n.title === "Recording approved" && n.message.includes("Looks good")))
  // Teachers still unpublish directly: it only reduces access.
  const unpublished = await teacher.call("POST", `/api/recordings/${r.id}/publish`, { expected_version: approved.body.recording.version, publish: false })
  assert.equal(unpublished.status, 200); assert.equal(unpublished.body.recording.status, "Draft"); assert.equal(unpublished.body.approval, null)
})

test("a stale request can't publish a newer version", async () => {
  const r = await makeRecording("Week 3 replay")
  const requested = await teacher.call("POST", `/api/recordings/${r.id}/publish`, { expected_version: r.version, publish: true })
  await h.ctx.db.update(approval_requests).set({ target_version: r.version + 5 }).where(eq(approval_requests.id, requested.body.approval.id))
  assert.equal((await admin.call("POST", `/api/admin/approvals/${requested.body.approval.id}/approve`, {})).status, 409)
  const [rec] = await h.ctx.db.select().from(recordings).where(eq(recordings.id, r.id)); assert.equal(rec.status, "Draft")
  const [req] = await h.ctx.db.select().from(approval_requests).where(eq(approval_requests.id, requested.body.approval.id)); assert.equal(req.state, "Pending")
  await h.ctx.db.update(approval_requests).set({ target_version: r.version }).where(eq(approval_requests.id, req.id))
})

test("the requester can withdraw; other teachers can't; an admin's direct publish approves the matching request", async () => {
  const [pending] = await h.ctx.db.select().from(approval_requests).where(and(eq(approval_requests.state, "Pending")))
  assert.equal((await otherTeacher.call("POST", `/api/approvals/${pending.id}/withdraw`, {})).status, 403)
  assert.equal((await student.call("POST", `/api/approvals/${pending.id}/withdraw`, {})).status, 403)
  const withdrawn = await teacher.call("POST", `/api/approvals/${pending.id}/withdraw`, {})
  assert.equal(withdrawn.status, 200); assert.equal(withdrawn.body.approval.state, "Withdrawn")
  assert.equal((await teacher.call("POST", `/api/approvals/${pending.id}/withdraw`, {})).status, 409)

  const [rec] = await h.ctx.db.select().from(recordings).where(eq(recordings.id, pending.target_id))
  const reopened = await teacher.call("POST", `/api/recordings/${rec.id}/publish`, { expected_version: rec.version, publish: true })
  const direct = await admin.call("POST", `/api/recordings/${rec.id}/publish`, { expected_version: rec.version, publish: true })
  assert.equal(direct.status, 200, JSON.stringify(direct.body)); assert.equal(direct.body.recording.status, "Published")
  const [closed] = await h.ctx.db.select().from(approval_requests).where(eq(approval_requests.id, reopened.body.approval.id))
  assert.equal(closed.state, "Approved"); assert.equal(closed.decided_by, adminId)
  assert.equal((await admin.call("GET", "/api/admin/approvals/count")).body.pending, 0)
  const all = await admin.call("GET", "/api/admin/approvals?state=all")
  assert.ok(all.body.counts.Approved >= 2 && all.body.counts.Rejected >= 2 && all.body.counts.Withdrawn === 1 && all.body.counts.Superseded >= 1)
})

test("requests are checked like a publish: unprocessed or wrong-version recordings are refused", async () => {
  const session = randomUUID()
  await h.ctx.db.insert(live_sessions).values({ id: session, batch_id: batch, teacher_id: teacherId, occurrence_key: `approval:${session}`, title: "Unprocessed", status: "Ended", starts_at: new Date(Date.now() - 5 * 3600000), ends_at: new Date(Date.now() - 3 * 3600000), actual_start: new Date(Date.now() - 5 * 3600000), actual_end: new Date(Date.now() - 3 * 3600000) })
  const bytes = Buffer.from("0000ftypunprocessed")
  const created = await teacher.call("POST", "/api/recordings/uploads", { session_id: session, filename: "class.mp4", content_type: "video/mp4", bytes: bytes.length })
  const [asset] = await h.ctx.db.select().from(media_assets).where(eq(media_assets.id, created.body.asset_id)); await h.ctx.storage.put(asset.source_key, bytes, "video/mp4")
  await teacher.call("POST", `/api/recordings/assets/${asset.id}/finalize`, {})
  const attached = await teacher.call("POST", "/api/recordings/attach", { session_id: session, asset_id: asset.id })
  assert.equal((await teacher.call("POST", `/api/recordings/${attached.body.recording.id}/publish`, { expected_version: 1, publish: true })).status, 409)
  assert.equal((await teacher.call("POST", `/api/recordings/${attached.body.recording.id}/publish`, { expected_version: 9, publish: true })).status, 409)
  assert.equal((await h.ctx.db.select().from(approval_requests).where(eq(approval_requests.target_id, attached.body.recording.id))).length, 0)
  assert.equal((await otherTeacher.call("POST", `/api/recordings/${attached.body.recording.id}/publish`, { expected_version: 1, publish: true })).status, 403)
})
