import { outboxSweep } from "../src/reliability/notifications.js"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, test } from "node:test"
import { and, eq, sql } from "drizzle-orm"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"
import { batch_teachers, cohort_batches, course_offers, courses, live_sessions, notifications, schedule_exceptions, schedule_rules, schedule_rule_versions, session_attendance } from "../src/db/schema.js"
import { admit } from "../src/learning/admission.js"
import { grantAccess } from "../src/learning/entitlements.js"
import { localInstant, occurrences } from "../src/live/calendar.js"
import { liveProvider } from "../src/live/providers.js"
import { generateRule, scheduleSweep } from "../src/live/schedules.js"

let h: TestHarness, admin: TestUser, teacher: TestUser, outsider: TestUser, student: TestUser, otherStudent: TestUser
let teacherId: string, studentId: string, otherId: string
const course = "live-test-course", batch = "live-test-batch"
before(async () => {
  h = await createHarness(); admin = await h.user({ groups: ["admins"] }); teacher = await h.user({ groups: ["teachers"] }); outsider = await h.user({ groups: ["teachers"] }); student = await h.user(); otherStudent = await h.user()
  teacherId = (await teacher.call("GET", "/api/me")).body.id; studentId = (await student.call("GET", "/api/me")).body.id; otherId = (await otherStudent.call("GET", "/api/me")).body.id
  await h.ctx.db.insert(courses).values({ id: course, code: "LIVE-TEST", title: "Live testing", category: "AI", instructor: "Teacher", level: "Beginner" })
  // A paid batch carries its own live offer, which is what makes the paid-registration threshold apply.
  await h.ctx.db.insert(course_offers).values({ id: "live-test-offer", course_id: null, mode: "live", title: "Live test batch", price: 100, status: "Published" })
  await h.ctx.db.insert(cohort_batches).values({ id: batch, name: "Live test batch", course_id: course, offer_id: "live-test-offer", instructor: "Teacher", start_date: "2030-01-01", end_date: "2030-06-30", max_seats: 250, minimum_paid_registrations: 1, starts_at: new Date("2030-01-01T00:00:00Z"), ends_at: new Date("2030-07-01T00:00:00Z") })
  await h.ctx.db.insert(batch_teachers).values({ batch_id: batch, teacher_id: teacherId })
  await h.ctx.db.transaction(tx => admit(tx, { batchId: batch, student: studentId }))
  await h.ctx.db.transaction(tx => grantAccess(tx, { course, student: otherId, sourceType: "manual", sourceId: "course-only" }))
})
after(async () => {
  await h.ctx.db.delete(session_attendance)
  await h.ctx.db.delete(schedule_rule_versions)
  await h.ctx.db.delete(schedule_exceptions)
  await h.ctx.db.delete(live_sessions).where(eq(live_sessions.batch_id, batch))
  await h.ctx.db.delete(schedule_rules).where(eq(schedule_rules.batch_id, batch))
  await h.close()
})
const rule = () => ({ id: randomUUID(), batch_id: batch, title: "Gen AI: six months", teacher_id: teacherId, timezone: "Asia/Kolkata", weekdays: [1,2,3], local_start: "10:00", duration_minutes: 90, start_date: "2030-01-01", end_date: "2030-06-30", provider: "meet_link", join_url: "https://meet.google.com/abc-defg-hij", apply_to: "future" })

test("Zoom/Meet reject lookalikes, redirects, credentials and HTTP; own_stream stays unavailable", () => {
  const zoom = liveProvider("zoom_link"), meet = liveProvider("meet_link")
  assert.equal(zoom.validate("https://us02web.zoom.us/j/123456789?pwd=abc", "join"), "https://us02web.zoom.us/j/123456789?pwd=abc")
  assert.equal(meet.validate("https://meet.google.com/abc-defg-hij", "join"), "https://meet.google.com/abc-defg-hij")
  for (const link of ["https://zoom.us.evil.test/j/123456789", "https://evilzoom.us/j/123456789", "http://zoom.us/j/123456789", "https://x@zoom.us/j/123456789", "https://zoom.us:444/j/123456789", "https://zoom.us/j/123456789?redirect=https://evil.test", "https://zoom.us/j/123456789#fragment"]) assert.throws(() => zoom.validate(link, "join"))
  for (const link of ["https://meet.google.com.evil.test/abc-defg-hij", "https://meet.google.com/abc-defg-hij?redirect=x", "https://meet.google.com/lookup/abc"]) assert.throws(() => meet.validate(link, "join"))
  assert.throws(() => liveProvider("own_stream").join({ join_url: null, passcode: null }), /not available yet/)
  assert.throws(() => liveProvider("constructor"))
})

test("recurrence resolves IANA timezones, rejects clock gaps and chooses the earlier repeated time", () => {
  assert.equal(localInstant("2030-01-05", "10:00", "Asia/Kolkata").instant.toISOString(), "2030-01-05T04:30:00.000Z")
  assert.throws(() => localInstant("2027-03-14", "02:30", "America/New_York"), /does not exist/)
  const repeat = localInstant("2027-11-07", "01:30", "America/New_York")
  assert.equal(repeat.ambiguous, true); assert.equal(repeat.instant.toISOString(), "2027-11-07T05:30:00.000Z")
  assert.throws(() => localInstant("2030-02-30", "10:00", "Asia/Kolkata"))
  const weekend = occurrences({ ...rule(), weekdays: [0,6], start_date: "2030-01-05", end_date: "2030-01-06" }, { starts_at: new Date("2030-01-01Z"), ends_at: new Date("2030-07-01Z") })
  assert.deepEqual(weekend.map(r => r.local_date), ["2030-01-05", "2030-01-06"])
})

test("Mon/Tue/Wed six-month preview and durable generation produce exact dates without duplicate occurrences", async () => {
  const input = rule(), expected: string[] = []
  for (let d = new Date("2030-01-01T00:00:00Z"); d < new Date("2030-07-01T00:00:00Z"); d = new Date(d.getTime()+86400000)) if ([1,2,3].includes(d.getUTCDay())) expected.push(d.toISOString().slice(0,10))
  const preview = await teacher.call("POST", "/api/live/rules/preview", input)
  assert.equal(preview.status, 200, JSON.stringify(preview.body)); assert.deepEqual(preview.body.occurrences.map((r: { local_date: string }) => r.local_date), expected)
  const saved = await teacher.call("POST", "/api/live/rules", input)
  assert.equal(saved.status, 200, JSON.stringify(saved.body)); assert.equal(saved.body.rule.generated_version, 1)
  await Promise.all([generateRule(h.ctx, input.id), generateRule(h.ctx, input.id)])
  const rows = await h.ctx.db.select().from(live_sessions).where(eq(live_sessions.schedule_rule_id, input.id))
  assert.deepEqual(rows.map(s => s.local_date).sort(), expected); assert.equal(new Set(rows.map(s => s.occurrence_key)).size, expected.length)
  assert.equal((await outsider.call("POST", "/api/live/rules", { ...input, id: randomUUID() })).status, 403)
  assert.equal((await teacher.call("POST", "/api/live/validate-link", { provider: "zoom_link", join_url: "" })).status, 400)
  const list = await student.call("GET", "/api/sessions")
  assert.equal(list.body.sessions.length, expected.length); assert.ok(!JSON.stringify(list.body).includes("meet.google.com"))
  assert.equal((await otherStudent.call("GET", "/api/sessions")).body.sessions.length, 0)
  assert.equal((await outsider.call("GET", "/api/sessions")).body.sessions.length, 0)
  await outboxSweep(h.ctx)
  assert.ok((await h.ctx.db.select().from(notifications).where(eq(notifications.student_id, studentId))).length > 0)
})

test("rule edits preserve past sessions and individual cancellation/reschedule exceptions; queued work recovers", async () => {
  const input = { ...rule(), start_date: "2030-02-01", end_date: "2030-02-15" }
  assert.equal((await teacher.call("POST", "/api/live/rules", input)).status, 200)
  const original = await h.ctx.db.select().from(live_sessions).where(eq(live_sessions.schedule_rule_id, input.id)).orderBy(live_sessions.starts_at)
  await h.ctx.db.update(live_sessions).set({ starts_at: new Date(Date.now()-3600000), ends_at: new Date(Date.now()-1800000), status: "Ended" }).where(eq(live_sessions.id, original[0].id))
  assert.equal((await teacher.call("POST", `/api/sessions/${original[1].id}/action`, { action: "cancel", reason: "Holiday" })).status, 200)
  assert.equal((await teacher.call("POST", `/api/sessions/${original[2].id}/action`, { action: "reschedule", reason: "Teacher availability", starts_at: "2030-02-09T05:00:00Z", ends_at: "2030-02-09T06:00:00Z" })).status, 200)
  const edit = await teacher.call("POST", "/api/live/rules", { ...input, expected_version: 1, local_start: "11:00" })
  assert.equal(edit.status, 200, JSON.stringify(edit.body))
  assert.equal((await teacher.call("POST", "/api/live/rules", { ...input, expected_version: 1 })).status, 409)
  await h.ctx.db.update(schedule_rules).set({ version: 3, local_start: "12:00", available_at: new Date() }).where(eq(schedule_rules.id, input.id))
  await scheduleSweep(h.ctx)
  const rows = await h.ctx.db.select().from(live_sessions).where(eq(live_sessions.schedule_rule_id, input.id))
  assert.equal(rows.length, original.length)
  assert.equal(rows.find(s => s.id === original[0].id)!.status, "Ended")
  assert.equal(rows.find(s => s.id === original[1].id)!.status, "Cancelled")
  assert.equal(rows.find(s => s.id === original[2].id)!.starts_at.toISOString(), "2030-02-09T05:00:00.000Z")
  assert.equal(rows.find(s => s.id === original[3].id)!.starts_at.getUTCHours(), 6)
  assert.equal((await h.ctx.db.select().from(schedule_rules).where(eq(schedule_rules.id, input.id)))[0].generated_version, 3)
})

test("dated teacher create persists date and timezone; undated legacy inputs are rejected", async () => {
  const input = { batch_id: batch, title: "Saturday workshop", date: "2030-03-02", local_start: "10:00", duration_minutes: 60, timezone: "Asia/Kolkata", provider: "zoom_link", join_url: "https://zoom.us/j/123456789" }
  const created = await teacher.call("POST", "/api/teacher/classes", input)
  assert.equal(created.status, 200, JSON.stringify(created.body)); assert.equal(created.body.classSession.starts_at, "2030-03-02T04:30:00.000Z")
  assert.ok(!JSON.stringify(created.body).includes("zoom.us"))
  assert.equal((await teacher.call("POST", "/api/teacher/classes", { title: "Missing actual date", batch_id: batch, day: "Monday" })).status, 400)
})

test("exact-batch enrollment, protected links and join windows enforced; clicks recorded once per student/session", async () => {
  const id = randomUUID(), now = Date.now()
  await h.ctx.db.update(cohort_batches).set({ lifecycle: "Scheduled", starts_at: new Date(now-3600000), ends_at: new Date("2030-07-01T00:00:00Z") }).where(eq(cohort_batches.id, batch))
  await h.ctx.db.insert(live_sessions).values({ id, batch_id: batch, teacher_id: teacherId, occurrence_key: `test:${id}`, title: "Join boundary", starts_at: new Date(now+5*60000), ends_at: new Date(now+3600000), provider: "meet_link", join_url: "https://meet.google.com/abc-defg-hij" })
  assert.equal((await student.call("GET", `/api/sessions/${id}/settings`)).status, 403)
  assert.equal((await student.call("POST", `/api/sessions/${id}/host`)).status, 403)
  assert.equal((await outsider.call("POST", `/api/sessions/${id}/host`)).status, 403)
  assert.equal((await otherStudent.call("POST", `/api/sessions/${id}/join`)).status, 403)
  assert.equal((await teacher.call("POST", `/api/sessions/${id}/host`)).status, 200)
  for (let i=0;i<2;i++) assert.equal((await student.call("POST", `/api/sessions/${id}/join`)).status, 200)
  const clicks = await h.ctx.db.select().from(session_attendance).where(eq(session_attendance.session_id, id))
  assert.equal(clicks.length, 1); assert.equal(clicks[0].join_clicks, 2)
  const attendance = await student.call("GET", `/api/sessions/${id}/attendance`); assert.match(attendance.body.basis, /not verified/); assert.equal(attendance.body.records.length, 1)
  await h.ctx.db.update(live_sessions).set({ starts_at: new Date(now+3600000), ends_at: new Date(now+7200000) }).where(eq(live_sessions.id, id))
  assert.equal((await student.call("POST", `/api/sessions/${id}/join`)).status, 409)
  await h.ctx.db.update(live_sessions).set({ starts_at: new Date(now-7200000), ends_at: new Date(now-3600000) }).where(eq(live_sessions.id, id))
  assert.equal((await student.call("POST", `/api/sessions/${id}/join`)).status, 409)
  const timetable = await otherStudent.call("GET", "/api/student/timetable"); assert.deepEqual(timetable.body, [])
})

test("below-threshold batch cannot start through teacher action or admin override; status persists after valid start/end", async () => {
  const id = randomUUID(), now = Date.now()
  await h.ctx.db.insert(live_sessions).values({ id, batch_id: batch, teacher_id: teacherId, occurrence_key: `test:${id}`, title: "Lifecycle gates", starts_at: new Date(now-60000), ends_at: new Date(now+3600000), provider: "zoom_link", join_url: "https://zoom.us/j/123456789" })
  assert.equal((await teacher.call("POST", `/api/sessions/${id}/action`, { action: "start" })).status, 409)
  assert.equal((await admin.call("POST", `/api/sessions/${id}/action`, { action: "override", status: "Live", reason: "Cannot bypass threshold" })).status, 409)
  await h.ctx.db.execute(sql`update lms.batch_registrations set paid_at=now() where batch_id=${batch} and student_id=${studentId}::uuid`)
  assert.equal((await teacher.call("POST", `/api/sessions/${id}/action`, { action: "start" })).status, 200)
  let saved = (await h.ctx.db.select().from(live_sessions).where(eq(live_sessions.id,id)))[0]
  assert.equal(saved.status, "Live"); assert.ok(saved.actual_start)
  assert.equal((await teacher.call("POST", `/api/sessions/${id}/action`, { action: "end" })).status, 200)
  saved = (await h.ctx.db.select().from(live_sessions).where(eq(live_sessions.id,id)))[0]
  assert.equal(saved.status, "Ended"); assert.ok(saved.actual_end)
  assert.equal((await student.call("POST", `/api/sessions/${id}/join`)).status, 409)
  assert.equal((await h.ctx.db.select().from(cohort_batches).where(and(eq(cohort_batches.id,batch), eq(cohort_batches.lifecycle,"Running")))).length, 1)
})
