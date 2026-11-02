import Fastify, { type FastifyInstance } from "fastify"
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import rateLimit from "@fastify/rate-limit"
import { createHash } from "node:crypto"
import { sql } from "drizzle-orm"
import type { AppContext } from "./context.js"
import { AppError, fromPgError } from "./errors.js"
import { authenticate, me } from "./http.js"
import { fileRoutes } from "./routes/files.js"

export interface AppOptions {
  logger?: boolean
  /** Route modules, each registered with the shared context. */
  modules?: ((app: FastifyInstance, ctx: AppContext) => Promise<void>)[]
}

export async function buildApp(ctx: AppContext, opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger === false ? false : { level: ctx.config.LOG_LEVEL, redact: ["req.headers.authorization"] },
    trustProxy: true,
    bodyLimit: 1024 * 1024,
    // Signed local upload links carry their token in the path.
    routerOptions: { maxParamLength: 2048 },
  })

  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } })
  await app.register(cors, { origin: ctx.config.corsOrigins, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], maxAge: 600 })
  await app.register(rateLimit, {
    max: ctx.config.NODE_ENV === "test" ? 10_000 : 600,
    timeWindow: "1 minute",
    // Per signed-in user where possible, so a classroom behind one NAT isn't throttled as a single client.
    keyGenerator: (req) => {
      const auth = req.headers.authorization
      return auth ? createHash("sha256").update(auth).digest("base64url").slice(0, 24) : req.ip
    },
  })

  app.setErrorHandler((err, req, reply) => {
    const known = err instanceof AppError ? err : fromPgError(err)
    if (known) return reply.code(known.status).send({ error: { code: known.code, message: known.message } })
    const status = (err as { statusCode?: number }).statusCode
    if (status && status >= 400 && status < 500) {
      const message = status === 429 ? "Too many requests. Wait a moment and try again." : status === 413 ? "That's too large." : "That request isn't valid."
      return reply.code(status).send({ error: { code: status === 429 ? "rate_limited" : "bad_request", message } })
    }
    req.log.error({ err }, "unhandled error")
    return reply.code(500).send({ error: { code: "server_error", message: "Something went wrong on our side. Try again." } })
  })
  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: { code: "not_found", message: "Not found." } }))

  app.get("/api/health", async () => {
    await ctx.db.execute(sql`select 1`)
    return { ok: true, time: new Date().toISOString() }
  })

  app.get("/api/me", { preHandler: authenticate(ctx) }, async (req) => {
    const u = me(req)
    return { id: u.id, email: u.email, full_name: u.full_name, avatar_url: u.avatar_url, role: u.role, is_demo: u.is_demo }
  })

  await fileRoutes(app, ctx)
  for (const register of opts.modules ?? []) await register(app, ctx)
  return app
}
