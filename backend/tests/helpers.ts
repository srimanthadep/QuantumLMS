import { randomUUID } from "node:crypto"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { and, inArray, like, lt } from "drizzle-orm"
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose"
import type { FastifyInstance, InjectOptions } from "fastify"
import { buildApp } from "../src/app.js"
import type { CognitoAttributes, CognitoGateway } from "../src/auth/cognito.js"
import { createTokenVerifier } from "../src/auth/tokens.js"
import { createContext } from "../src/bootstrap.js"
import { loadConfig } from "../src/config.js"
import type { AppContext } from "../src/context.js"
import { users } from "../src/db/schema.js"
import { modules } from "../src/modules.js"

export const TEST_DOMAIN = "test.quantumlms.dev"
const ISSUER = "http://cognito.test/test-pool"
const CLIENT_ID = "test-client"

export interface TestHarness {
  app: FastifyInstance
  ctx: AppContext
  /** Signs a Cognito-style access token. `overrides` lets tests forge bad ones. */
  token(sub: string, groups?: string[], overrides?: Record<string, unknown>): Promise<string>
  /** A new Cognito user known to the fake gateway. `keep` leaves the account in place after the run (the demo student). */
  user(opts?: { name?: string; groups?: string[]; email?: string; keep?: boolean }): Promise<TestUser>
  close(): Promise<void>
}

export interface TestUser {
  sub: string
  email: string
  token: string
  groups: string[]
  call(method: InjectOptions["method"], url: string, payload?: unknown): Promise<{ status: number; body: any }>
}

/** An app wired to the real database, with a local token issuer, a fake Cognito and a temporary upload folder. */
export async function createHarness(): Promise<TestHarness> {
  const { privateKey, publicKey } = await generateKeyPair("RS256")
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: "test-key", alg: "RS256", use: "sig" }
  const keys = createLocalJWKSet({ keys: [jwk] })
  const uploads = mkdtempSync(path.join(tmpdir(), "qlms-test-uploads-"))

  const attributes = new Map<string, CognitoAttributes>()
  const signedOut = new Set<string>()
  const cognito: CognitoGateway = {
    async getAttributes(accessToken) {
      const sub = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString()).sub as string
      const a = attributes.get(sub)
      if (!a || signedOut.has(accessToken)) throw Object.assign(new Error("Access Token has been revoked"), { name: "NotAuthorizedException" })
      return a
    },
    async setPassword() {},
    async disableMfa() {},
    async addToGroup() {},
    async removeFromGroup() {},
    async signOutEverywhere(accessToken) {
      signedOut.add(accessToken)
    },
  }

  const config = loadConfig({
    ...process.env,
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    COGNITO_USER_POOL_ID: "test-pool",
    COGNITO_CLIENT_ID: CLIENT_ID,
    COGNITO_ENDPOINT: "http://cognito.test",
    STORAGE_DRIVER: "local",
    LOCAL_STORAGE_DIR: uploads,
    UPLOAD_SIGNING_SECRET: "test-upload-signing-secret",
    QUIZ_SWEEP_SECONDS: "0",
    // Two test files run at once next to the dev server; Supabase's session pooler allows 15 clients in total.
    DATABASE_POOL_MAX: "4",
  })
  const verifyToken = createTokenVerifier({ issuer: ISSUER, jwksUri: `${ISSUER}/.well-known/jwks.json`, clientId: CLIENT_ID, keys })
  const ctx = createContext(config, { cognito, verifyToken })
  const app = await buildApp(ctx, { logger: false, modules })
  const created: string[] = []
  // Test files run in parallel, each with its own harness: a run tag keeps one file's cleanup off another's users.
  const tag = randomUUID().slice(0, 6)

  const token: TestHarness["token"] = (sub, groups = [], { exp, iat, ...overrides } = {}) =>
    new SignJWT({ token_use: "access", client_id: CLIENT_ID, username: sub, "cognito:groups": groups, scope: "aws.cognito.signin.user.admin", ...overrides })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(ISSUER)
      .setSubject(sub)
      .setIssuedAt(typeof iat === "number" ? iat : undefined)
      .setExpirationTime(typeof exp === "number" ? exp : "15m")
      .sign(privateKey)

  return {
    app,
    ctx,
    token,
    async user(opts = {}) {
      const sub = randomUUID()
      const email = opts.email ?? `t-${tag}-${sub.slice(0, 8)}@${TEST_DOMAIN}`
      attributes.set(sub, { email, name: opts.name ?? "Test Learner" })
      if (!opts.keep) created.push(email)
      const groups = opts.groups ?? []
      const tok = await token(sub, groups)
      return {
        sub,
        email,
        token: tok,
        groups,
        async call(method, url, payload) {
          const res = await app.inject({
            method,
            url,
            headers: { authorization: `Bearer ${tok}`, ...(payload !== undefined ? { "content-type": "application/json" } : {}) },
            payload: payload === undefined ? undefined : JSON.stringify(payload),
          })
          let body: unknown = null
          try {
            body = res.body ? JSON.parse(res.body) : null
          } catch {
            body = res.body
          }
          return { status: res.statusCode, body }
        },
      }
    },
    async close() {
      if (created.length) await ctx.db.delete(users).where(inArray(users.email, created))
      await ctx.db.delete(users).where(like(users.email, `t-${tag}-%@${TEST_DOMAIN}`))
      // Leftovers from runs that crashed before cleaning up.
      await ctx.db.delete(users).where(and(like(users.email, `%@${TEST_DOMAIN}`), lt(users.created_at, new Date(Date.now() - 2 * 3600_000))))
      await app.close()
      await ctx.pool.end()
      rmSync(uploads, { recursive: true, force: true })
    },
  }
}
