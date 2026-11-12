import assert from "node:assert/strict"
import { test } from "node:test"
import { testDatabaseUrl } from "./isolation.js"
import { createHarness } from "./helpers.js"

test("database isolation never falls back to development configuration", () => {
  assert.throws(() => testDatabaseUrl({ DATABASE_URL: "postgresql://localhost/development" }), /disposable/)
  for (const target of ["postgresql://localhost/postgres", "postgresql://example.com/quantumlms_test_123456789012345678901234"]) {
    assert.throws(() => testDatabaseUrl({ TEST_DATABASE_URL: target, TEST_RUN_ID: "test" }), /uniquely named/)
  }
})

test("harness enforces strict auth even when inherited configuration enables demo mode", async () => {
  const original = process.env.DEMO_MODE
  process.env.DEMO_MODE = "true"
  const h = await createHarness()
  try {
    assert.equal(h.ctx.config.DEMO_MODE, false)
    assert.equal((await h.app.inject({ method: "GET", url: "/api/admin/courses" })).statusCode, 401)
  } finally {
    await h.close()
    if (original === undefined) delete process.env.DEMO_MODE
    else process.env.DEMO_MODE = original
  }
})
