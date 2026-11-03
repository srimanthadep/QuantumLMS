import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"

let h: TestHarness
let student: TestUser
let admin: TestUser
let superAdmin: TestUser

before(async () => {
  h = await createHarness()
  student = await h.user({ name: "Student Priya", groups: ["students"] })
  admin = await h.user({ name: "Admin Rohan", groups: ["admins"] })
  superAdmin = await h.user({ name: "SuperAdmin Suresh", groups: ["super-admins"] })
})

after(async () => {
  await h.close()
})

describe("super admin API access control", () => {
  test("unauthenticated requests are refused with 401", async () => {
    const res = await h.app.inject({ method: "GET", url: "/api/super-admin/health" })
    assert.equal(res.statusCode, 401)
  })

  test("students cannot access super admin endpoints (403)", async () => {
    const res = await student.call("GET", "/api/super-admin/health")
    assert.equal(res.status, 403)
  })

  test("regular admins cannot access super admin endpoints (403)", async () => {
    const res = await admin.call("GET", "/api/super-admin/health")
    assert.equal(res.status, 403)
  })
})

describe("super admin telemetry and governance workflow", () => {
  test("super admin can fetch cluster telemetry health", async () => {
    const res = await superAdmin.call("GET", "/api/super-admin/health")
    assert.equal(res.status, 200)
    assert.ok(res.body.services)
    assert.ok(Array.isArray(res.body.services))
    assert.equal(res.body.services.length > 0, true)
  })

  test("super admin can trigger cache flush", async () => {
    const res = await superAdmin.call("POST", "/api/super-admin/flush-cache")
    assert.equal(res.status, 200)
    assert.ok(res.body.clearedAt)
  })

  test("super admin can list enterprise tenants", async () => {
    const res = await superAdmin.call("GET", "/api/super-admin/tenants")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.tenants))
    assert.equal(res.body.tenants.length > 0, true)
  })

  test("super admin can inspect RBAC matrix", async () => {
    const res = await superAdmin.call("GET", "/api/super-admin/rbac")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.matrix))
  })

  test("super admin can retrieve security audit logs", async () => {
    const res = await superAdmin.call("GET", "/api/super-admin/audit")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.logs))
  })

  test("super admin can retrieve AI inference usage", async () => {
    const res = await superAdmin.call("GET", "/api/super-admin/ai")
    assert.equal(res.status, 200)
    assert.ok(res.body.models)
    assert.ok(typeof res.body.totalTokensMonth === "number")
  })
})

