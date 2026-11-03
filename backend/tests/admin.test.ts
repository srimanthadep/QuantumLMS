import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"

let h: TestHarness
let student: TestUser
let evaluator: TestUser
let admin: TestUser
let superAdmin: TestUser

before(async () => {
  h = await createHarness()
  student = await h.user({ name: "Student Alex", groups: ["students"] })
  evaluator = await h.user({ name: "Evaluator Maya", groups: ["evaluators"] })
  admin = await h.user({ name: "Admin Rohan", groups: ["admins"] })
  superAdmin = await h.user({ name: "SuperAdmin Vikram", groups: ["super-admins"] })
})

after(async () => {
  await h.close()
})

describe("admin API access control", () => {
  test("unauthenticated requests are refused with 401", async () => {
    const res = await h.app.inject({ method: "GET", url: "/api/admin/courses" })
    assert.equal(res.statusCode, 401)
  })

  test("students cannot access admin endpoints (403)", async () => {
    const res = await student.call("GET", "/api/admin/courses")
    assert.equal(res.status, 403)
  })

  test("evaluators cannot access admin endpoints (403)", async () => {
    const res = await evaluator.call("GET", "/api/admin/courses")
    assert.equal(res.status, 403)
  })
})

describe("admin course management and stats workflow", () => {
  let createdCourseId: string

  test("admin can fetch platform stats", async () => {
    const res = await admin.call("GET", "/api/admin/stats")
    assert.equal(res.status, 200)
    assert.ok(res.body.stats)
    assert.ok(typeof res.body.stats.totalCourses === "number")
    assert.ok(typeof res.body.stats.totalStudents === "number")
    assert.ok(typeof res.body.stats.totalEnrollments === "number")
    assert.ok(typeof res.body.stats.totalModules === "number")
    assert.ok(typeof res.body.stats.totalLessons === "number")
  })

  test("admin can list all courses", async () => {
    const res = await admin.call("GET", "/api/admin/courses")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.courses))
  })

  test("admin can create a new course with initial module and lesson", async () => {
    const res = await admin.call("POST", "/api/admin/courses", {
      title: "Advanced Quantum Machine Learning",
      category: "Quantum Computing",
      instructor: "Dr. Vikram Seth",
      instructor_role: "Lead Quantum Architect",
      description: "Hands-on exploration of variational quantum circuits, Qiskit integration, and hybrid quantum-classical algorithms.",
      level: "Advanced",
      credits: 4,
      duration: "10 Weeks",
      is_starter: false,
    })

    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.ok(res.body.ok)
    assert.ok(res.body.course)
    assert.ok(res.body.course.id)
    assert.equal(res.body.course.title, "Advanced Quantum Machine Learning")
    assert.equal(res.body.course.category, "Quantum Computing")
    assert.equal(res.body.course.instructor, "Dr. Vikram Seth")
    assert.equal(res.body.course.modules_count, 1)
    assert.equal(res.body.course.lessons_count, 1)

    createdCourseId = res.body.course.id
  })

  test("admin can fetch course details by id", async () => {
    assert.ok(createdCourseId, "Course ID must exist")
    const res = await admin.call("GET", `/api/admin/courses/${createdCourseId}`)
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.course.id, createdCourseId)
    assert.equal(res.body.course.title, "Advanced Quantum Machine Learning")
    assert.ok(Array.isArray(res.body.modules))
    assert.equal(res.body.modules.length, 1)
    assert.ok(Array.isArray(res.body.lessons))
    assert.equal(res.body.lessons.length, 1)
    assert.equal(res.body.lessons[0].course_id, createdCourseId)
  })

  test("super admin can update a course", async () => {
    assert.ok(createdCourseId)
    const res = await superAdmin.call("PATCH", `/api/admin/courses/${createdCourseId}`, {
      title: "Advanced Quantum ML & Variational Optimization",
      duration: "12 Weeks",
    })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.ok(res.body.ok)
    assert.equal(res.body.course.title, "Advanced Quantum ML & Variational Optimization")
    assert.equal(res.body.course.duration, "12 Weeks")
  })

  test("course is immediately visible in student courses catalog", async () => {
    assert.ok(createdCourseId)
    // Student can access /api/student/core
    const res = await student.call("GET", "/api/student/core")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.courses))
    const found = res.body.courses.find((c: any) => c.id === createdCourseId)
    assert.ok(found, "Newly created admin course must be visible in student catalog")
    assert.equal(found.title, "Advanced Quantum ML & Variational Optimization")
  })

  test("admin can delete the created course", async () => {
    assert.ok(createdCourseId)
    const res = await admin.call("DELETE", `/api/admin/courses/${createdCourseId}`)
    assert.equal(res.status, 200)
    assert.ok(res.body.ok)
    assert.equal(res.body.deleted, createdCourseId)

    // Verify it is gone
    const checkRes = await admin.call("GET", `/api/admin/courses/${createdCourseId}`)
    assert.equal(checkRes.status, 404)
  })
})
