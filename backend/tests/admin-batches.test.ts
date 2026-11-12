import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { eq } from "drizzle-orm"
import { users } from "../src/db/schema.js"
import { createHarness, TEST_DOMAIN, type TestHarness, type TestUser } from "./helpers.js"

let h: TestHarness
let student: TestUser
let admin: TestUser
let superAdmin: TestUser

const prevDemoMode = process.env.DEMO_MODE
const createdCourseIds: string[] = []
const createdBatchIds: string[] = []
const createdEmails: string[] = []

before(async () => {
  process.env.DEMO_MODE = "false"
  h = await createHarness()
  student = await h.user({ name: "Student RosterOne", groups: ["students"] })
  admin = await h.user({ name: "Admin BatchOps", groups: ["admins"] })
  superAdmin = await h.user({ name: "SuperAdmin BatchOps", groups: ["super-admins"] })
  // Materialize student user + profile in DB via first student call
  await student.call("GET", "/api/student/core")
})

after(async () => {
  for (const id of createdBatchIds) {
    await admin.call("DELETE", `/api/admin/batches/${id}`).catch(() => {})
  }
  for (const id of createdCourseIds) {
    await admin.call("DELETE", `/api/admin/courses/${id}`).catch(() => {})
  }
  for (const email of createdEmails) {
    await h.ctx.db.delete(users).where(eq(users.email, email)).catch(() => {})
  }
  await h.close()
  if (prevDemoMode === undefined) delete process.env.DEMO_MODE
  else process.env.DEMO_MODE = prevDemoMode
})

describe("admin batches and courses RBAC access control", () => {
  test("rejects unauthenticated access (401)", async () => {
    const res = await h.app.inject({ method: "GET", url: "/api/admin/batches" })
    assert.equal(res.statusCode, 401)
  })

  test("rejects student writes to batches and rosters (403)", async () => {
    const r1 = await student.call("POST", "/api/admin/batches", {
      name: "Unauthorized Batch",
      course_id: "c-1",
    })
    assert.equal(r1.status, 403)

    const r2 = await student.call("POST", "/api/admin/batches/batch-genai-14/students", {
      name: "Unauthorized",
      email: `unauth@${TEST_DOMAIN}`,
    })
    assert.equal(r2.status, 403)
  })
})

describe("admin courses full CRUD persistence", () => {
  test("creates, edits, persists price/capacity/status, and returns 404 after delete", async () => {
    const createRes = await admin.call("POST", "/api/admin/courses", {
      title: "Distributed Agent Systems Test",
      category: "Agentic Systems",
      instructor: "Srimanth",
      price: 49999,
      capacity: 120,
      status: "Draft",
    })
    assert.equal(createRes.status, 201, JSON.stringify(createRes.body))
    const cid = createRes.body.course.id as string
    createdCourseIds.push(cid)
    assert.equal(createRes.body.course.price, 49999)
    assert.equal(createRes.body.course.capacity, 120)
    assert.equal(createRes.body.course.status, "Draft")

    const patchRes = await superAdmin.call("PATCH", `/api/admin/courses/${cid}`, {
      price: 54999,
      capacity: 150,
      status: "Published",
    })
    assert.equal(patchRes.status, 200, JSON.stringify(patchRes.body))
    assert.equal(patchRes.body.course.price, 54999)
    assert.equal(patchRes.body.course.capacity, 150)
    assert.equal(patchRes.body.course.status, "Published")

    const delRes = await admin.call("DELETE", `/api/admin/courses/${cid}`)
    assert.equal(delRes.status, 200)

    const afterDel = await admin.call("GET", `/api/admin/courses/${cid}`)
    assert.equal(afterDel.status, 404)
  })
})

describe("admin cohort batches CRUD and student roster management", () => {
  let courseId: string
  let primaryBatchId: string
  let clonedBatchId: string
  let existingStudentId: string
  let createdStudentId: string

  test("validates bad date ranges and invalid meeting links", async () => {
    const courseRes = await admin.call("POST", "/api/admin/courses", {
      title: "Cohort Test Parent Course",
      category: "LLM Engineering",
      instructor: "Srimanth",
      price: 39999,
      capacity: 100,
      status: "Published",
    })
    assert.equal(courseRes.status, 201)
    courseId = courseRes.body.course.id
    createdCourseIds.push(courseId)

    const badDate = await admin.call("POST", "/api/admin/batches", {
      name: "Invalid Dates Cohort",
      course_id: courseId,
      start_date: "2027-03-10",
      end_date: "2027-01-10",
    })
    assert.equal(badDate.status, 400)

    const badUrl = await admin.call("POST", "/api/admin/batches", {
      name: "Invalid URL Cohort",
      course_id: courseId,
      meeting_url: "javascript:alert(1)",
    })
    assert.equal(badUrl.status, 400)
  })

  test("creates, edits, duplicates, and persists cohort batch fields", async () => {
    const createRes = await admin.call("POST", "/api/admin/batches", {
      name: "Batch Alpha — Nov 2026",
      course_id: courseId,
      instructor: "Dr. Elena Vance",
      start_date: "2026-11-15",
      end_date: "2027-02-15",
      schedule: "Tue, Thu · 7:00 PM - 9:00 PM",
      timezone: "Asia/Kolkata",
      max_seats: 2,
      delivery_mode: "Self-Paced",
      replay_delay_hours: 4,
      access_expiry_months: 18,
      meeting_url: "https://meet.google.com/quantum-alpha",
      features: { liveChat: true, doubtClearing: false, aiTutor: true, certificate: true },
      status: "Upcoming",
      notes: "Initial test cohort",
    })
    assert.equal(createRes.status, 201, JSON.stringify(createRes.body))
    primaryBatchId = createRes.body.batch.id
    createdBatchIds.push(primaryBatchId)

    assert.equal(createRes.body.batch.delivery_mode, "Self-Paced")
    assert.equal(createRes.body.batch.meeting_url, "https://meet.google.com/quantum-alpha")
    assert.equal(createRes.body.batch.features.doubtClearing, false)

    const patchRes = await superAdmin.call("PATCH", `/api/admin/batches/${primaryBatchId}`, {
      name: "Batch Alpha — Updated",
      status: "Active",
      max_seats: 1,
      notes: "Seat limit tightened to test capacity",
    })
    assert.equal(patchRes.status, 200, JSON.stringify(patchRes.body))
    assert.equal(patchRes.body.batch.name, "Batch Alpha — Updated")
    assert.equal(patchRes.body.batch.status, "Active")
    assert.equal(patchRes.body.batch.max_seats, 1)

    const dupRes = await admin.call("POST", `/api/admin/batches/${primaryBatchId}/duplicate`, {
      name: "Batch Beta — Overflow Target",
    })
    assert.equal(dupRes.status, 201, JSON.stringify(dupRes.body))
    clonedBatchId = dupRes.body.batch.id
    createdBatchIds.push(clonedBatchId)
    assert.equal(dupRes.body.batch.enrolled_seats, 0)
  })

  test("adds existing & new learners, enforces capacity/waitlist, transfers, and removes students", async () => {
    const initialRoster = await admin.call("GET", `/api/admin/batches/${primaryBatchId}/students`)
    assert.equal(initialRoster.status, 200)
    const foundAvailable = (initialRoster.body.available_students as any[]).find(
      (s) => s.email.toLowerCase() === student.email.toLowerCase(),
    )
    assert.ok(foundAvailable, "Harness student should appear in available_students")
    existingStudentId = foundAvailable.id

    // Add first student -> fills max_seats=1
    const addFirst = await admin.call("POST", `/api/admin/batches/${primaryBatchId}/students`, {
      student_ids: [existingStudentId],
      status: "Active",
    })
    assert.equal(addFirst.status, 201, JSON.stringify(addFirst.body))
    assert.equal(addFirst.body.added_count, 1)
    assert.equal(addFirst.body.batch.enrolled_seats, 1)

    // Trying to add a second active student when full rejects with 409 conflict
    const secondEmail = `cohort-new-${Date.now()}@${TEST_DOMAIN}`
    createdEmails.push(secondEmail)
    const overCap = await admin.call("POST", `/api/admin/batches/${primaryBatchId}/students`, {
      name: "Learner Overflow",
      email: secondEmail,
      status: "Active",
      auto_waitlist_when_full: false,
    })
    assert.equal(overCap.status, 409)

    // With auto_waitlist_when_full=true -> waitlists learner cleanly
    const waitlisted = await admin.call("POST", `/api/admin/batches/${primaryBatchId}/students`, {
      name: "Learner Overflow",
      email: secondEmail,
      status: "Active",
      auto_waitlist_when_full: true,
    })
    assert.equal(waitlisted.status, 201, JSON.stringify(waitlisted.body))
    assert.equal(waitlisted.body.waitlisted_count, 1)
    assert.equal(waitlisted.body.batch.waitlisted_seats, 1)

    const rosterAfter = await admin.call("GET", `/api/admin/batches/${primaryBatchId}/students`)
    assert.equal(rosterAfter.status, 200)
    assert.equal(rosterAfter.body.students.length, 2)
    const createdRow = rosterAfter.body.students.find((s: any) => s.email === secondEmail)
    assert.ok(createdRow)
    assert.equal(createdRow.status, "Waitlisted")
    createdStudentId = createdRow.id

    // Transfer waitlisted student to clonedBatchId cleanly
    const transferRes = await admin.call(
      "PATCH",
      `/api/admin/batches/${primaryBatchId}/students/${createdStudentId}`,
      { target_batch_id: clonedBatchId, status: "Active" },
    )
    assert.equal(transferRes.status, 200, JSON.stringify(transferRes.body))
    assert.equal(transferRes.body.transferred, true)
    assert.equal(transferRes.body.target_batch.enrolled_seats, 1)

    // Remove student from primaryBatchId
    const removeRes = await admin.call(
      "DELETE",
      `/api/admin/batches/${primaryBatchId}/students/${existingStudentId}`,
    )
    assert.equal(removeRes.status, 200)
    assert.equal(removeRes.body.batch.enrolled_seats, 0)

    // Delete batch -> subsequent GET returns 404
    const delBatch = await admin.call("DELETE", `/api/admin/batches/${primaryBatchId}`)
    assert.equal(delBatch.status, 200)
    const checkGone = await admin.call("GET", `/api/admin/batches/${primaryBatchId}`)
    assert.equal(checkGone.status, 404)
  })
})

