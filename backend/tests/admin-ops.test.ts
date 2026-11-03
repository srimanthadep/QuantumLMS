import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"

let h: TestHarness
let admin: TestUser
let student: TestUser

before(async () => {
  h = await createHarness()
  student = await h.user({ name: "Student Kavya", groups: ["students"] })
  admin = await h.user({ name: "Admin Vikram", groups: ["admins"] })
})

after(async () => {
  await h.close()
})

describe("admin operations API access control", () => {
  test("students cannot access admin operations (403)", async () => {
    const res = await student.call("GET", "/api/admin/batches")
    assert.equal(res.status, 403)
  })
})

describe("admin operations workflow", () => {
  test("admin can list batches", async () => {
    const res = await admin.call("GET", "/api/admin/batches")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.batches))
  })

  test("admin can list faculty teachers", async () => {
    const res = await admin.call("GET", "/api/admin/teachers")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.teachers))
  })

  test("admin can list all enrolled students", async () => {
    const res = await admin.call("GET", "/api/admin/students")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.students))
  })

  test("admin can view orders list", async () => {
    const res = await admin.call("GET", "/api/admin/orders")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.orders))
  })

  test("admin can refund an order", async () => {
    const res = await admin.call("POST", "/api/admin/orders/ord-123/refund")
    assert.equal(res.status, 200)
    assert.equal(res.body.status, "Refunded")
  })

  test("admin can read and patch settings", async () => {
    const getRes = await admin.call("GET", "/api/admin/settings")
    assert.equal(getRes.status, 200)
    assert.ok(getRes.body.settings)

    const patchRes = await admin.call("PATCH", "/api/admin/settings", {
      name: "Quantum Institute of Advanced AI",
    })
    assert.equal(patchRes.status, 200)
    assert.equal(patchRes.body.settings.name, "Quantum Institute of Advanced AI")
  })
})

