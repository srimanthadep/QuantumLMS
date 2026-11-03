import { eq, sql } from "drizzle-orm"
import type { Db } from "../db/client.js"
import { users, type Role } from "../db/schema.js"
import { forbidden, unauthorized } from "../errors.js"
import type { CognitoGateway } from "./cognito.js"
import { roleFromGroups, type TokenClaims } from "./tokens.js"

export interface AuthUser {
  id: string
  sub: string
  username: string
  email: string
  full_name: string
  avatar_url: string | null
  role: Role
  is_demo: boolean
  groups: string[]
  token: string
}

/** Runs once for a new account, inside the transaction that creates it (student profile, evaluator profile …). */
export type Onboard = (tx: Parameters<Parameters<Db["transaction"]>[0]>[0], user: AuthUser) => Promise<void>

const SEEN_EVERY_MS = 5 * 60_000

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? ""
  const words = local.replace(/[._-]+/g, " ").trim()
  return words ? words.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 120) : "Learner"
}

/**
 * The account behind a verified token. First sight creates the row from the user's Cognito attributes and runs the
 * role's onboarding. A seeded or earlier row with the same verified email is linked instead of duplicated.
 */
export async function resolveUser(
  db: Db,
  cognito: CognitoGateway,
  claims: TokenClaims,
  opts: { demoEmails: string[]; onboard: Partial<Record<Role, Onboard>> },
): Promise<AuthUser> {
  const role = roleFromGroups(claims.groups)
  const toAuth = (u: typeof users.$inferSelect): AuthUser => ({
    id: u.id,
    sub: claims.sub,
    username: claims.username,
    email: u.email,
    full_name: u.full_name,
    avatar_url: u.avatar_url,
    role: u.role as Role,
    is_demo: u.is_demo,
    groups: claims.groups,
    token: claims.token,
  })

  const [existing] = await db.select().from(users).where(eq(users.cognito_sub, claims.sub)).limit(1)
  if (existing) {
    // "Sign out of all devices" ends the access tokens Cognito already issued, not only the refresh tokens.
    if (existing.sessions_revoked_at && claims.issuedAt <= Math.floor(existing.sessions_revoked_at.getTime() / 1000)) {
      throw unauthorized("You were signed out. Sign in again.")
    }
    const isDemo = opts.demoEmails.includes(existing.email.toLowerCase())
    const stale = !existing.last_seen_at || Date.now() - existing.last_seen_at.getTime() > SEEN_EVERY_MS
    if (existing.role !== role || existing.is_demo !== isDemo || stale) {
      const [u] = await db
        .update(users)
        .set({ role, is_demo: isDemo, last_seen_at: new Date(), updated_at: existing.role !== role ? new Date() : existing.updated_at })
        .where(eq(users.id, existing.id))
        .returning()
      return toAuth(u)
    }
    return toAuth(existing)
  }

  let attrs
  try {
    attrs = await cognito.getAttributes(claims.token)
  } catch (e) {
    // A revoked token (signed out everywhere) or a deleted user: same as an expired session.
    const name = (e as Error).name
    if (name === "NotAuthorizedException" || name === "UserNotFoundException") throw unauthorized("Your session expired. Sign in again.")
    throw e
  }
  const email = attrs.email.trim().toLowerCase()
  if (!email) throw forbidden("Your account has no email address. Contact support.")
  const isDemo = opts.demoEmails.includes(email)

  return db.transaction(async (tx) => {
    // An existing row for this email (a re-created Cognito user, or a seeded demo account) is linked, not duplicated.
    const [byEmail] = await tx.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1)
    if (byEmail) {
      if (byEmail.cognito_sub && byEmail.cognito_sub !== claims.sub && !isDemo) {
        throw forbidden("This email belongs to another account. Contact support.")
      }
      const [u] = await tx.update(users).set({ cognito_sub: claims.sub, role, last_seen_at: new Date(), updated_at: new Date() }).where(eq(users.id, byEmail.id)).returning()
      return toAuth(u)
    }
    const [u] = await tx
      .insert(users)
      .values({ cognito_sub: claims.sub, email, full_name: (attrs.name ?? "").trim().slice(0, 120) || nameFromEmail(email), avatar_url: null, role, is_demo: isDemo, last_seen_at: new Date() })
      .onConflictDoNothing({ target: users.cognito_sub })
      .returning()
    if (!u) {
      // Another request created the row first.
      const [again] = await tx.select().from(users).where(eq(users.cognito_sub, claims.sub)).limit(1)
      return toAuth(again)
    }
    const auth = toAuth(u)
    await opts.onboard[role]?.(tx, auth)
    return auth
  })
}
