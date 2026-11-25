// Seeded demo students must be able to open their courses. Access comes from entitlement grants, not enrollment rows.
import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { eq } from "drizzle-orm"
import { entitlement_grants } from "../src/db/schema.js"
import { seedStudentDemo } from "../src/db/seed/index.js"
import { hasEntitlement } from "../src/learning/entitlements.js"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"

let h: TestHarness
let student: TestUser
let id: string
before(async () => {
  h = await createHarness()
  student = await h.user({ name: "Seeded Student" })
  id = (await student.call("GET", "/api/me")).body.id
})
after(async () => {
  await h.close()
})

test("the demo seed grants course access, so the courses show up and open", async () => {
  // Drop the grants first sign-in created, so only the seed can bring access back.
  await h.ctx.db.delete(entitlement_grants).where(eq(entitlement_grants.student_id, id))
  await h.ctx.db.transaction((tx) => seedStudentDemo(tx, id, new Date(), "Asia/Kolkata"))
  for (const course of ["c-1", "c-2", "c-3", "c-4"]) assert.equal(await hasEntitlement(h.ctx.db, id, course), true, course)
  const core = await student.call("GET", "/api/student/core")
  assert.equal(core.status, 200, JSON.stringify(core.body))
  assert.deepEqual(core.body.enrollments.map((e: { course_id: string }) => e.course_id).sort(), ["c-1", "c-2", "c-3", "c-4"])
})
