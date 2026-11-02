import type { FastifyReply, FastifyRequest } from "fastify"
import { z, type ZodType } from "zod"
import type { AuthUser } from "./auth/users.js"
import type { Role } from "./db/schema.js"
import { badRequest, forbidden, unauthorized } from "./errors.js"
import type { AppContext } from "./context.js"

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser
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
    if (!token) throw unauthorized()
    const claims = await ctx.verifyToken(token)
    req.user = await ctx.resolveUser(claims)
    if (roles && !roles.includes(req.user.role)) throw forbidden("Your account doesn't have access to this area.")
  }
}

/** The signed-in user (routes registered behind authenticate). */
export function me(req: FastifyRequest): AuthUser {
  if (!req.user) throw unauthorized()
  return req.user
}
