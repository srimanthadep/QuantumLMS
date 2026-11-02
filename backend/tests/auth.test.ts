import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { SignJWT, generateKeyPair } from "jose"
import { users } from "../src/db/schema.js"
import { createHarness, type TestHarness } from "./helpers.js"

let h: TestHarness
before(async () => {
  h = await createHarness()
})
after(async () => {
  await h.close()
})

const get = (url: string, token?: string) => h.app.inject({ method: "GET", url, headers: token ? { authorization: `Bearer ${token}` } : {} })

describe("health", () => {
  test("reports the database as reachable", async () => {
    const res = await get("/api/health")
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().ok, true)
  })
})

describe("access tokens", () => {
  test("requests without a token are refused", async () => {
    const res = await get("/api/me")
    assert.equal(res.statusCode, 401)
    assert.match(res.json().error.message, /sign in/i)
  })

  test("tokens from another issuer, ID tokens and tokens for another app client are refused", async () => {
    const { privateKey } = await generateKeyPair("RS256")
    const foreign = await new SignJWT({ token_use: "access", client_id: "test-client" })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer("http://cognito.test/test-pool")
      .setSubject(randomUUID())
      .setExpirationTime("5m")
      .sign(privateKey)
    for (const token of [
      foreign,
      await h.token(randomUUID(), [], { token_use: "id" }),
      await h.token(randomUUID(), [], { client_id: "another-client" }),
      await h.token(randomUUID(), [], { exp: Math.floor(Date.now() / 1000) - 60 }),
      "not-a-jwt",
    ]) {
      const res = await get("/api/me", token)
      assert.equal(res.statusCode, 401, `token should be refused: ${token.slice(0, 20)}`)
    }
  })
})

describe("accounts", () => {
  test("the first request creates the account from the Cognito attributes, later ones reuse it", async () => {
    const u = await h.user({ name: "Riya Sen" })
    const first = await u.call("GET", "/api/me")
    assert.equal(first.status, 200)
    assert.equal(first.body.email, u.email)
    assert.equal(first.body.full_name, "Riya Sen")
    assert.equal(first.body.role, "Student")
    const second = await u.call("GET", "/api/me")
    assert.equal(second.body.id, first.body.id)
    const rows = await h.ctx.db.select().from(users).where(eq(users.cognito_sub, u.sub))
    assert.equal(rows.length, 1)
  })

  test("parallel first requests still create one account", async () => {
    const u = await h.user()
    const results = await Promise.all(Array.from({ length: 5 }, () => u.call("GET", "/api/me")))
    assert.ok(results.every((r) => r.status === 200), JSON.stringify(results.map((r) => r.body)))
    assert.equal(new Set(results.map((r) => r.body.id)).size, 1)
  })

  test("the role follows the Cognito groups", async () => {
    const u = await h.user({ groups: ["evaluators"] })
    assert.equal((await u.call("GET", "/api/me")).body.role, "Evaluator")
    const promoted = await h.token(u.sub, ["evaluators", "admins"])
    assert.equal((await get("/api/me", promoted)).json().role, "Admin")
  })
})
