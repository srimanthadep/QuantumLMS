import { eq } from "drizzle-orm"
import { course_teachers, batch_teachers, cohort_batches, live_sessions } from "../src/db/schema.js"
import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"

let h: TestHarness
let student: TestUser
let teacher: TestUser

before(async () => {
  h = await createHarness()
  student = await h.user({ name: "Student Maya", groups: ["students"] })
  teacher = await h.user({ name: "Teacher Shanmuk", groups: ["teachers"] })
  const profile = await teacher.call("GET", "/api/me")
  await h.ctx.db.insert(course_teachers).values({ course_id: "c-1", teacher_id: profile.body.id })
  await h.ctx.db.insert(cohort_batches).values({ id: "teacher-dated-batch", course_id: "c-1", name: "Dated batch", instructor: "Teacher", max_seats: 10, start_date: "2030-01-01", end_date: "2030-06-30", starts_at: new Date("2030-01-01T00:00:00Z"), ends_at: new Date("2030-07-01T00:00:00Z") })
  await h.ctx.db.insert(batch_teachers).values({ batch_id: "teacher-dated-batch", teacher_id: profile.body.id })
})

after(async () => {
  await h.ctx.db.delete(live_sessions).where(eq(live_sessions.batch_id, "teacher-dated-batch"))
  await h.close()
})

describe("teacher API access control", () => {
  test("unauthenticated requests are refused with 401", async () => {
    const res = await h.app.inject({ method: "GET", url: "/api/teacher/classes" })
    assert.equal(res.statusCode, 401)
  })

  test("students cannot access teacher endpoints (403)", async () => {
    const res = await student.call("GET", "/api/teacher/classes")
    assert.equal(res.status, 403)
  })
})

describe("teacher workflow", () => {
  test("teacher can list live classes", async () => {
    const res = await teacher.call("GET", "/api/teacher/classes")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.classes))
  })

  test("teacher can schedule a live class", async () => {
    const res = await teacher.call("POST", "/api/teacher/classes", {
      title: "Advanced PyTorch & CUDA Tuning",
      course_id: "c-1",
      batch_id: "teacher-dated-batch", date: "2030-01-05", local_start: "11:00", duration_minutes: 90, timezone: "Asia/Kolkata",
      provider: "meet_link", join_url: "https://meet.google.com/abc-defg-hij",
    })
    assert.equal(res.status, 200)
    assert.ok(res.body.classSession)
    assert.equal(res.body.classSession.title, "Advanced PyTorch & CUDA Tuning")
  })

  test("teacher can view doubts list", async () => {
    const res = await teacher.call("GET", "/api/teacher/doubts")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.doubts))
  })

  test("teacher can view campus calendar", async () => {
    const res = await teacher.call("GET", "/api/teacher/calendar")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.events))
  })

  test("teacher can fetch enrolled student roster", async () => {
    const res = await teacher.call("GET", "/api/teacher/students")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.students))
  })

  test("teacher can fetch teaching analytics KPIs", async () => {
    const res = await teacher.call("GET", "/api/teacher/analytics")
    assert.equal(res.status, 200)
    assert.ok(res.body.analytics)
    assert.ok(typeof res.body.analytics.total_students === "number")
    assert.ok(typeof res.body.analytics.total_courses === "number")
  })
})

