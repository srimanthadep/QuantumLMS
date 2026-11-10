import type { FastifyReply, FastifyRequest } from "fastify"
import { z, type ZodType } from "zod"
import { sql } from "drizzle-orm"
import type { AuthUser } from "./auth/users.js"
import { users, type Role } from "./db/schema.js"
import { badRequest, forbidden, unauthorized } from "./errors.js"
import type { AppContext } from "./context.js"

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser
  }
}

const demoUserCache = new Map<string, { row: typeof users.$inferSelect; expiresAt: number }>()

async function getDemoUser(ctx: AppContext, email: string): Promise<typeof users.$inferSelect | undefined> {
  const key = email.toLowerCase()
  const now = Date.now()
  const cached = demoUserCache.get(key)
  if (cached && now < cached.expiresAt) return cached.row
  const [row] = await ctx.db.select().from(users).where(sql`lower(${users.email}) = ${key}`).limit(1)
  if (row) {
    demoUserCache.set(key, { row, expiresAt: now + 60_000 })
  }
  return row
}

function toDemoAuthUser(u: typeof users.$inferSelect, token = "demo-token"): AuthUser {
  return {
    id: u.id,
    sub: u.cognito_sub || u.id,
    username: u.email,
    email: u.email,
    full_name: u.full_name,
    avatar_url: u.avatar_url,
    role: u.role as Role,
    is_demo: true,
    groups: [u.role.toLowerCase()],
    token,
  }
}

/** Validates input with zod and turns the first problem into a readable 400. */
export function parse<T extends ZodType>(schema: T, value: unknown): z.infer<T> {
  const r = schema.safeParse(value)
  if (r.success) return r.data
  const issue = r.error.issues[0]
  const field = issue?.path.join(".")
  throw badRequest(issue?.message && !/^Invalid input/.test(issue.message) ? issue.message : `Check ${field || "the request"} and try again.`)
}

/** preHandler: requires a valid Cognito access token, and optionally one of the given roles. */
export function authenticate(ctx: AppContext, roles?: Role[]) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    const header = req.headers.authorization ?? ""
    const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]
    if (!token) {
      if (ctx.config.DEMO_MODE) {
        const fallbackEmail = roles?.includes("Admin") || roles?.includes("Super Admin")
          ? ctx.config.DEMO_ADMIN_EMAIL
          : roles?.includes("Evaluator")
          ? ctx.config.DEMO_EVALUATOR_EMAIL
          : ctx.config.DEMO_STUDENT_EMAIL
        const demoUser = await getDemoUser(ctx, fallbackEmail)
        if (demoUser) {
          req.user = toDemoAuthUser(demoUser)
          return
        }
      }
      throw unauthorized()
    }
    try {
      const claims = await ctx.verifyToken(token)
      req.user = await ctx.resolveUser(claims)
    } catch (err) {
      if (ctx.config.DEMO_MODE) {
        const fallbackEmail = roles?.includes("Admin") || roles?.includes("Super Admin")
          ? ctx.config.DEMO_ADMIN_EMAIL
          : ctx.config.DEMO_STUDENT_EMAIL
        const demoUser = await getDemoUser(ctx, fallbackEmail)
        if (demoUser) {
          req.user = toDemoAuthUser(demoUser, token)
          return
        }
      }
      throw err
    }
    if (roles && !roles.includes(req.user.role)) {
      if (ctx.config.DEMO_MODE) {
        return
      }
      throw forbidden("Your account doesn't have access to this area.")
    }
  }
}

/** The signed-in user (routes registered behind authenticate). */
export function me(req: FastifyRequest): AuthUser {
  if (!req.user) throw unauthorized()
  return req.user
}
