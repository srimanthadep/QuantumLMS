import { buildApp } from "../src/app.js"
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
      "fake-token:admin@lms.com:Admin",
      "dev-token:superadmin@lms.com:Super Admin",
      "dev-session:invented",
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

describe("sign out of all devices", () => {
  test("refuses every access token issued before it, and accepts the next sign-in", async () => {
    const u = await h.user()
    const older = await h.token(u.sub, [], { iat: Math.floor(Date.now() / 1000) - 30 })
    assert.equal((await get("/api/me", older)).statusCode, 200)
    const out = await h.app.inject({ method: "POST", url: "/api/me/sign-out-everywhere", headers: { authorization: `Bearer ${older}` } })
    assert.equal(out.statusCode, 204)
    const refused = await get("/api/me", older)
    assert.equal(refused.statusCode, 401)
    assert.match(refused.json().error.message, /signed out/i)
    const fresh = await h.token(u.sub, [], { iat: Math.floor(Date.now() / 1000) + 1 })
    assert.equal((await get("/api/me", fresh)).statusCode, 200)
  })

  test("a demo email does not grant demo behavior with strict auth", async () => {
    const demo = await h.user({ email: h.ctx.config.DEMO_STUDENT_EMAIL, name: "Niharika", keep: true })
    const res = await demo.call("POST", "/api/me/sign-out-everywhere")
    assert.equal(res.status, 204)
  })
})

 test("passwordless development login is absent under strict auth", async () => {
   const result = await h.app.inject({ method: "POST", url: "/api/auth/fake-login", payload: { email: "admin@lms.com", role: "Admin" } })
   assert.equal(result.statusCode, 404)
 })

 test("local development sessions are server-issued, role-stable and cannot take over real users", async () => {
   const old = { NODE_ENV: h.ctx.config.NODE_ENV, DEMO_MODE: h.ctx.config.DEMO_MODE, DEV_FAKE_LOGIN: h.ctx.config.DEV_FAKE_LOGIN }
   Object.assign(h.ctx.config, { NODE_ENV: "development", DEMO_MODE: true, DEV_FAKE_LOGIN: true })
   const app = await buildApp(h.ctx, { logger: false })
   const email = `dev-${randomUUID()}@test.quantumlms.dev`
   try {
     const response = await app.inject({ method: "POST", url: "/api/auth/fake-login", headers: { host: "localhost:4000", origin: "http://localhost:8443" }, payload: { email, role: "Teacher" } })
     assert.equal(response.statusCode, 200, response.body)
     const token = response.json().token
     assert.match(token, /^dev-session:[a-f0-9]{64}$/)
     const profile = await app.inject({ method: "GET", url: "/api/me", headers: { authorization: `Bearer ${token}` } })
     assert.equal(profile.statusCode, 200); assert.equal(profile.json().role, "Teacher")
     const roleChange = await app.inject({ method: "POST", url: "/api/auth/fake-login", headers: { host: "localhost:4000" }, payload: { email, role: "Admin" } })
     assert.equal(roleChange.statusCode, 403)
     const remote = await app.inject({ method: "POST", url: "/api/auth/fake-login", headers: { host: "localhost:4000", origin: "https://outside.example" }, payload: { email, role: "Teacher" } })
     assert.equal(remote.statusCode, 403)
     const real = await h.user(); await real.call("GET", "/api/me")
     const impersonate = await app.inject({ method: "POST", url: "/api/auth/fake-login", headers: { host: "localhost:4000" }, payload: { email: real.email, role: "Student" } })
     assert.equal(impersonate.statusCode, 403)
     h.ctx.config.DEV_FAKE_LOGIN = false
     assert.equal((await app.inject({ method: "GET", url: "/api/me", headers: { authorization: `Bearer ${token}` } })).statusCode, 401)
   } finally { Object.assign(h.ctx.config, old); await app.close(); await h.ctx.db.delete(users).where(eq(users.email, email)) }
 })
