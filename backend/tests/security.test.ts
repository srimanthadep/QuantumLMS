import { grantAccess } from "../src/learning/entitlements.js"
import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { eq, sql } from "drizzle-orm"
import { loadConfig } from "../src/config.js"
import { sslOptions, withoutSslMode } from "../src/db/ssl.js"
import { courses, course_modules, lessons, enrollments, course_teachers, batch_teachers, cohort_batches, batch_students, upload_intents } from "../src/db/schema.js"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"

let h: TestHarness, student: TestUser, teacher: TestUser, admin: TestUser
before(async () => {
  h = await createHarness()
  student = await h.user(); teacher = await h.user({ groups: ["teachers"] }); admin = await h.user({ groups: ["admins"] })
  await h.ctx.db.insert(courses).values({ id: "private-course", code: "PRIVATE", title: "Private course", instructor: "Teacher", category: "AI", level: "Beginner", is_starter: false })
  await h.ctx.db.insert(course_modules).values({ id: "private-module", course_id: "private-course", title: "Private module", position: 0 })
  await h.ctx.db.insert(lessons).values({ id: "private-video", module_id: "private-module", course_id: "private-course", title: "Private video", position: 0, type: "video", video_url: "/api/files/videos/private/video.mp4" })
  await h.ctx.storage.put("videos/private/video.mp4", Buffer.from("video fixture"), "video/mp4")
})
after(async () => { await h.close() })

test("production refuses demo mode and non-verifying TLS", () => {
  const base = { DATABASE_URL: "postgresql://localhost/example", STORAGE_DRIVER: "s3", S3_BUCKET: "test", COGNITO_USER_POOL_ID: "test", COGNITO_CLIENT_ID: "test", NODE_ENV: "production" }
  assert.throws(() => loadConfig({ ...base, DEMO_MODE: "true" }), /DEMO_MODE/)
  assert.throws(() => loadConfig({ ...base, DATABASE_SSL: "require" }), /TLS/)
  assert.equal(loadConfig(base).DEMO_MODE, false)
  assert.deepEqual(sslOptions("verify"), { rejectUnauthorized: true, ca: undefined })
  assert.ok(!withoutSslMode("postgresql://localhost/example?sslmode=no-verify&sslrootcert=bad").includes("ssl"))
})

test("demo mode never bypasses missing, invalid or wrong-role tokens", async () => {
  h.ctx.config.DEMO_MODE = true
  try {
    for (const authorization of [undefined, "Bearer broken-token"]) {
      const res = await h.app.inject({ method: "GET", url: "/api/admin/courses", headers: authorization ? { authorization } : {} })
      assert.equal(res.statusCode, 401)
    }
    assert.equal((await student.call("GET", "/api/admin/courses")).status, 403)
  } finally { h.ctx.config.DEMO_MODE = false }
})

test("media denies anonymous and unenrolled access, then signs authorized playback", async () => {
  assert.equal((await h.app.inject({ method: "GET", url: "/api/files/videos/private/video.mp4" })).statusCode, 401)
  assert.equal((await student.call("POST", "/api/student/enrollments", { course_id: "private-course" })).status, 403)
  assert.equal((await student.call("POST", "/api/student/lessons/private-video/playback")).status, 403)
  assert.equal((await student.call("GET", "/api/files/videos/private/video.mp4")).status, 403)
  const core = await student.call("GET", "/api/student/core")
  assert.ok(!core.body.lessons.some((l: { id: string }) => l.id === "private-video"))
  assert.ok(core.body.lessons.every((l: { video_url: string | null }) => l.video_url === null))
  const id = (await student.call("GET", "/api/me")).body.id
  await h.ctx.db.transaction(tx => grantAccess(tx, { student: id, course: "private-course", sourceType: "manual", sourceId: "security-fixture" }))
  const playback = await student.call("POST", "/api/student/lessons/private-video/playback")
  assert.equal(playback.status, 200)
  assert.equal(playback.body.expires_in, 300)
  assert.match(playback.body.url, /^\/api\/local-files\//)
})

test("unassigned teachers cannot retrieve or mutate other courses", async () => {
  assert.deepEqual((await teacher.call("GET", "/api/teacher/courses")).body.courses, [])
  assert.equal((await teacher.call("POST", "/api/teacher/classes", { course_id: "private-course", title: "Unauthorized class" })).status, 403)
  const id = (await teacher.call("GET", "/api/me")).body.id
  await h.ctx.db.insert(course_teachers).values({ course_id: "private-course", teacher_id: id })
  const list = await teacher.call("GET", "/api/teacher/courses")
  assert.deepEqual(list.body.courses.map((c: { id: string }) => c.id), ["private-course"])
})

test("upload finalization quarantines mismatched bytes and rejects forged content type", async () => {
  const target = await student.call("POST", "/api/student/uploads", { bucket: "submissions", filename: "file.txt", content_type: "text/plain", size: 4 })
  assert.equal(target.status, 200)
  await h.ctx.storage.put(target.body.key, Buffer.from("too large"), "text/html")
  assert.equal((await student.call("POST", "/api/student/uploads/finalize", { bucket: "submissions", key: target.body.key })).status, 400)
  assert.equal((await h.ctx.db.query.upload_intents.findFirst({ where: eq(upload_intents.key, target.body.key) }))?.state, "quarantined")
  assert.equal((await student.call("GET", `/api/student/files?key=${encodeURIComponent(target.body.key)}`)).status, 403)
})

test("a batch-only teacher cannot read another cohort's learners on the same course", async () => {
  const teacherId = (await teacher.call("GET", "/api/me")).body.id
  const studentId = (await student.call("GET", "/api/me")).body.id
  const other = await h.user()
  const otherId = (await other.call("GET", "/api/student/profile")).body.id
  await h.ctx.db.delete(course_teachers).where(eq(course_teachers.teacher_id, teacherId))
  for (const id of ["scope-a", "scope-b"]) await h.ctx.db.insert(cohort_batches).values({ id, name: id, course_id: "private-course", instructor: "Display name is not authorization", start_date: "2026-11-01", end_date: "2027-04-30" })
  await h.ctx.db.insert(batch_teachers).values({ batch_id: "scope-a", teacher_id: teacherId })
  await h.ctx.db.insert(batch_students).values([{ batch_id: "scope-a", student_id: studentId }, { batch_id: "scope-b", student_id: otherId }])
  await h.ctx.db.insert(enrollments).values({ course_id: "private-course", student_id: otherId })
  const roster = await teacher.call("GET", "/api/teacher/students")
  assert.equal(roster.status, 200)
  assert.deepEqual(roster.body.students.map((s: { id: string }) => s.id), [studentId])
  assert.equal((await teacher.call("GET", "/api/teacher/analytics")).body.analytics.total_students, 1)
})

test("Super Admin policy is read-only and mutation audit records are persisted", async () => {
  const owner = await h.user({ groups: ["super-admins"] })
  assert.equal((await admin.call("GET", "/api/super-admin/rbac")).status, 403)
  assert.equal((await owner.call("PATCH", "/api/super-admin/rbac/platform", { role: "admin", enabled: true })).status, 403)
  const res = await owner.call("GET", "/api/super-admin/audit")
  assert.equal(res.status, 200)
  assert.ok(res.body.logs.some((e: { action: string }) => e.action === "PATCH /api/super-admin/rbac/:id"))
})

test("list requests do not create example batches or alumni", async () => {
  await h.ctx.db.execute(sql`delete from lms.batch_students; delete from lms.cohort_batches; delete from lms.alumni_profiles; delete from lms.app_state`)
  assert.equal((await admin.call("GET", "/api/admin/batches")).status, 200)
  assert.equal((await admin.call("GET", "/api/admin/alumni")).status, 200)
  const result = await h.ctx.db.execute(sql`select (select count(*) from lms.cohort_batches)::int as batches, (select count(*) from lms.alumni_profiles)::int as alumni`)
  assert.deepEqual(result.rows[0], { batches: 0, alumni: 0 })
})
