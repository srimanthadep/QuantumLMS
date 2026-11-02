import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose"
import { ROLES, type Role } from "../db/schema.js"
import { unauthorized } from "../errors.js"

/** What the API needs from a verified Cognito access token. */
export interface TokenClaims {
  sub: string
  username: string
  groups: string[]
  /** When Cognito issued the token, in seconds. Compared with the account's sessions_revoked_at. */
  issuedAt: number
  /** The raw token, used to read the user's attributes from Cognito the first time they're seen. */
  token: string
}

export type VerifyToken = (token: string) => Promise<TokenClaims>

/** Cognito group -> app role, highest privilege first. A user with no group is a student. */
export const GROUP_ROLES: [string, Role][] = [
  ["super-admins", "Super Admin"],
  ["admins", "Admin"],
  ["support", "Support"],
  ["evaluators", "Evaluator"],
  ["teachers", "Teacher"],
  ["students", "Student"],
]
export const ROLE_GROUP = Object.fromEntries(GROUP_ROLES.map(([g, r]) => [r, g])) as Record<Role, string>

export function roleFromGroups(groups: string[]): Role {
  for (const [group, role] of GROUP_ROLES) if (groups.includes(group)) return role
  return "Student"
}
export const isRole = (r: string): r is Role => (ROLES as readonly string[]).includes(r)

/**
 * Verifies Cognito access tokens: signature against the user pool's JWKS, issuer, expiry, token_use=access and the
 * app client id. `keys` is injectable so tests can sign tokens with a local key.
 */
export function createTokenVerifier(opts: { issuer: string; jwksUri: string; clientId: string; keys?: JWTVerifyGetKey }): VerifyToken {
  const keys = opts.keys ?? createRemoteJWKSet(new URL(opts.jwksUri), { cooldownDuration: 30_000, cacheMaxAge: 10 * 60_000 })
  return async (token) => {
    let payload
    try {
      ;({ payload } = await jwtVerify(token, keys, { issuer: opts.issuer, clockTolerance: 5 }))
    } catch {
      throw unauthorized("Your session expired. Sign in again.")
    }
    if (payload.token_use !== "access" || payload.client_id !== opts.clientId || typeof payload.sub !== "string") {
      throw unauthorized("Your session expired. Sign in again.")
    }
    const groups = Array.isArray(payload["cognito:groups"]) ? (payload["cognito:groups"] as unknown[]).filter((g): g is string => typeof g === "string") : []
    return { sub: payload.sub, username: String(payload.username ?? payload.sub), groups, issuedAt: typeof payload.iat === "number" ? payload.iat : 0, token }
  }
}
