import Fastify, { type FastifyInstance } from "fastify"
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import rateLimit from "@fastify/rate-limit"
import websocket from "@fastify/websocket"
import { gzipSync } from "node:zlib"
import { eq, sql } from "drizzle-orm"
import type { AppContext } from "./context.js"
import { invalidateUserCache } from "./auth/users.js"
import { audit_events, users } from "./db/schema.js"
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
    // Trust only the proxies in front of the API (CloudFront + load balancer in AWS, Vite in development), so a
    // client can't pick its own req.ip with a forged X-Forwarded-For.
    trustProxy: (_address: string, hop: number) => hop < ctx.config.TRUST_PROXY_HOPS,
    bodyLimit: 20 * 1024 * 1024,
    // Signed local upload links carry their token in the path.
    routerOptions: { maxParamLength: 2048 },
  })

  ctx.telemetry={startedAt:Date.now(),latencies:[],requests:0,errors:0}

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
    // Per signed-in user where possible, so a classroom behind one NAT isn't throttled as a single client. Only a
    // verified token counts: an invented Authorization header falls back to the client address instead of
    // opening a fresh bucket on every request. Verified tokens are cached, so this adds no work to the request.
    keyGenerator: async (req) => {
      const auth = req.headers.authorization
      if (auth?.startsWith("Bearer ")) {
        try {
          return `user:${(await ctx.verifyToken(auth.slice(7))).sub}`
        } catch {
          // Not a valid token; limit by address.
        }
      }
      return `ip:${req.ip}`
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
    const metrics=ctx.telemetry!;metrics.requests++;if(reply.statusCode>=500)metrics.errors++;metrics.latencies.push(reply.elapsedTime);if(metrics.latencies.length>1000)metrics.latencies.shift()
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

  // The course catalog sells one self-paced offer per course: free (price 0) to gain learners, or paid to convert them.
  // Live batches are a separate product and are listed by /api/catalog/batches.
  app.get("/api/catalog/courses", async () => ({ courses: (await ctx.db.execute(sql`select c.id,c.code,c.title,c.category,c.image,c.description,c.instructor,c.instructor_role,c.level,c.credits,c.duration,c.rating,c.reviews,c.progress_color,
    o.id as offer_id,o.price,o.currency,(o.price=0) as is_free,
    (select count(*)::int from lms.course_modules m where m.course_id=c.id and m.archived_at is null) as modules_count,
    (select count(*)::int from lms.lessons l where l.course_id=c.id and l.archived_at is null) as lessons_count
    from lms.courses c join lateral (select x.id,x.price,x.currency from lms.course_offers x where x.course_id=c.id and x.mode='self_paced' and x.status='Published' order by x.created_at,x.id limit 1) o on true
    where c.status='Published' and c.deleted_at is null order by c.position,c.title`)).rows }))


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
