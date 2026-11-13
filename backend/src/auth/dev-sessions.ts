import { randomBytes } from "node:crypto"
import type { FastifyRequest } from "fastify"
import type { Config } from "../config.js"
import { forbidden, unauthorized } from "../errors.js"
import { ROLE_GROUP, type TokenClaims } from "./tokens.js"
import type { Role } from "../db/schema.js"

const sessions = new Map<string, { claims: TokenClaims; expires: number }>()
export function devLoginEnabled(config: Config) { return config.NODE_ENV === "development" && config.DEMO_MODE && config.DEV_FAKE_LOGIN }
export function assertLocalLogin(req: FastifyRequest) {
  const loopback = (host: string) => ["localhost", "127.0.0.1", "[::1]"].includes(host)
  const remote = req.raw.socket.remoteAddress
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote ?? "")) throw forbidden("Development login is local only")
  try {
    if (!loopback(new URL(`http://${req.headers.host}`).hostname) || (req.headers.origin && !loopback(new URL(req.headers.origin).hostname))) throw new Error()
  } catch { throw forbidden("Open development login on localhost") }
}
export function issueDevSession(email: string, role: Role, name?: string) {
  const now = Date.now()
  for (const [key, value] of sessions) if (value.expires <= now) sessions.delete(key)
  if (sessions.size >= 100) sessions.delete(sessions.keys().next().value!)
  const token = `dev-session:${randomBytes(32).toString("hex")}`
  const claims: TokenClaims = { sub: `dev:${email}`, username: email, groups: [ROLE_GROUP[role]], issuedAt: Math.floor(now / 1000), token, developmentIdentity: { email, name } }
  sessions.set(token, { claims, expires: now + 4 * 3600000 })
  return { token, claims }
}
export function verifyDevSession(token: string) {
  const session = sessions.get(token)
  if (!session || session.expires <= Date.now()) { sessions.delete(token); throw unauthorized("Development session expired. Sign in again.") }
  return session.claims
}
