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
})

after(async () => {
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
      day: "Monday",
      starts: "11:00",
      ends: "12:30",
      room: "Lab 4",
      is_online: true,
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

