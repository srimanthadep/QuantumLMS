import Fastify, { type FastifyInstance } from "fastify"
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import rateLimit from "@fastify/rate-limit"
import websocket from "@fastify/websocket"
import { createHash } from "node:crypto"
import { gzipSync } from "node:zlib"
import { eq, sql } from "drizzle-orm"
import type { AppContext } from "./context.js"
import { invalidateUserCache } from "./auth/users.js"
import { audit_events, courses, users } from "./db/schema.js"
import { AppError, forbidden, fromPgError } from "./errors.js"
import { authenticate, me } from "./http.js"
import { fileRoutes } from "./routes/files.js"
import { wsRoutes } from "./ws.js"

export interface AppOptions {
  logger?: boolean
  /** Route modules, each registered with the shared context. */
  modules?: ((app: FastifyInstance, ctx: AppContext) => Promise<void>)[]
}

export async function buildApp(ctx: AppContext, opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger === false ? false : { level: ctx.config.LOG_LEVEL, redact: ["req.headers.authorization", "req.headers.sec-websocket-protocol"] },
    trustProxy: true,
    bodyLimit: 20 * 1024 * 1024,
    // Signed local upload links carry their token in the path.
    routerOptions: { maxParamLength: 2048 },
  })

  // Legacy small material uploads only; video uploads go directly to storage
  app.addContentTypeParser(
    [
      "application/octet-stream",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-matroska",
      "audio/wav",
      "audio/webm",
      "audio/mpeg",
    ],
    { parseAs: "buffer", bodyLimit: 20 * 1024 * 1024 },
    (_req, body, done) => {
      done(null, body)
    }
  )

  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } })
  await app.register(cors, { origin: ctx.config.corsOrigins, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], maxAge: 600 })
  await app.register(websocket, { options: { maxPayload: 10 * 1024 * 1024 } })
  await app.register(rateLimit, {
    max: ctx.config.NODE_ENV === "test" ? 10_000 : 600,
    timeWindow: "1 minute",
    // Per signed-in user where possible, so a classroom behind one NAT isn't throttled as a single client.
    keyGenerator: (req) => {
      const auth = req.headers.authorization
      return auth ? createHash("sha256").update(auth).digest("base64url").slice(0, 24) : req.ip
    },
  })

  // HTTP Browser Caching, Conditional Request Revalidation (ETag / If-None-Match) & Gzip Compression
  app.addHook("onSend", async (req, reply, payload) => {
    reply.header("Cache-Control", "private, no-store")
    if (req.method !== "GET" || typeof payload !== "string") return payload

    reply.header("Cache-Control", "private, no-store")

    // Compress JSON payloads > 1 KB when the client supports gzip
    if (payload.length > 1024 && !reply.getHeader("content-encoding")) {
      const acceptEncoding = req.headers["accept-encoding"]
      if (typeof acceptEncoding === "string" && /\bgzip\b/i.test(acceptEncoding)) {
        reply.header("Content-Encoding", "gzip")
        reply.header("Vary", "Accept-Encoding")
        return gzipSync(Buffer.from(payload))
      }
    }

    return payload
  })

  app.addHook("onResponse", async (req, reply) => {
    if (!req.user || ["GET", "HEAD", "OPTIONS"].includes(req.method)) return
    await ctx.db.insert(audit_events).values({ actor_id: req.user.id, actor_role: req.user.role,
      action: `${req.method} ${req.routeOptions.url ?? "unknown"}`, target: req.url.split("?")[0].slice(0, 500),
      outcome: `HTTP ${reply.statusCode}` }).catch((err) => req.log.error({ err }, "audit event write failed"))
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

  app.get("/api/catalog/courses", async () => ({ courses: await ctx.db.select({ id: courses.id, code: courses.code, title: courses.title,
    category: courses.category, image: courses.image, description: courses.description, instructor: courses.instructor,
    level: courses.level, duration: courses.duration, price: courses.price }).from(courses).where(eq(courses.status, "Published")) }))

  app.get("/api/me", { preHandler: authenticate(ctx) }, async (req) => {
    const u = me(req)
    return { id: u.id, email: u.email, full_name: u.full_name, avatar_url: u.avatar_url, role: u.role, is_demo: u.is_demo }
  })

  /** Ends every session of the account, this one included: Cognito revokes the refresh tokens, the API the access tokens. */
  app.post("/api/me/sign-out-everywhere", { preHandler: authenticate(ctx) }, async (req, reply) => {
    const u = me(req)
    if (u.is_demo) throw forbidden("The shared demo account can't sign out other people. Create your own account to try this.")
    try {
      await ctx.cognito.signOutEverywhere(u.token)
    } catch (err) {
      req.log.warn({ err }, "Cognito global sign-out failed")
      throw new AppError(502, "upstream_error", "Couldn't sign out of all devices. Try again.")
    }
    await ctx.db.update(users).set({ sessions_revoked_at: new Date(), updated_at: new Date() }).where(eq(users.id, u.id))
    invalidateUserCache(u.id)
    invalidateUserCache(u.sub)
    return reply.code(204).send()
  })

  await fileRoutes(app, ctx)
  await wsRoutes(app, ctx)
  for (const register of opts.modules ?? []) await register(app, ctx)
  return app
}
