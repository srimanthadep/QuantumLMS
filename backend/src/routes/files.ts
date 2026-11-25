import { createReadStream } from "node:fs"
import path from "node:path"
import type { FastifyInstance } from "fastify"
import type { AppContext } from "../context.js"
import { badRequest, notFound } from "../errors.js"
import { authenticate, me } from "../http.js"
import { authorizeMediaKey, mediaKey, signedMedia } from "../storage/protected.js"
import { eq } from "drizzle-orm"
import { upload_intents } from "../db/schema.js"
import { BUCKETS } from "../storage/storage.js"

const TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8",
  ".py": "text/plain; charset=utf-8", ".ipynb": "application/json", ".zip": "application/zip", ".json": "application/json",
}

export async function fileRoutes(app: FastifyInstance, ctx: AppContext) {
  // Profile photos: a stable path that redirects to a short-lived link, so <img> tags need no token.
  app.get<{ Params: { "*": string } }>("/api/files/avatars/*", async (req, reply) => {
    const key = `avatars/${req.params["*"]}`
    if (key.includes("..") || !(await ctx.storage.head(key))) throw notFound("Photo not found.")
    const intent = await ctx.db.query.upload_intents.findFirst({ where: eq(upload_intents.key, key) })
    if (intent && intent.state !== "verified") throw notFound("Photo not available.")
    const url = await ctx.storage.createDownloadUrl(key, { expiresInSeconds: 300 })
    reply.header("Cache-Control", "public, max-age=3000")
    return reply.redirect(url, 302)
  })

  for (const kind of ["videos", "materials"] as const) {
    app.get<{ Params: { "*": string } }>(`/api/files/${kind}/*`, { preHandler: authenticate(ctx) }, async (req, reply) => {
      const key = mediaKey(req.params["*"], kind)
      if (!key) throw notFound("File not found.")
      const expires = await authorizeMediaKey(ctx, me(req), key, kind)
      const url = await signedMedia(ctx, key, expires ?? 300)
      reply.header("Cache-Control", "private, no-store")
      return req.headers.accept?.includes("application/json") ? { url } : reply.redirect(url, 302)
    })
  }

  const local = ctx.localStorage
  if (!local) return

  // Development only: the targets of signed local upload and download links.
  app.register(async (scope) => {
    // Every content type arrives as raw bytes here (the default parsers would turn text/plain into a string).
    scope.removeAllContentTypeParsers()
    scope.addContentTypeParser("*", (_req, payload, done) => done(null, payload))
    scope.put<{ Params: { token: string } }>("/api/local-files/:token", { bodyLimit: ctx.config.MEDIA_MAX_UPLOAD_BYTES }, async (req, reply) => {
      const token = local.verify(req.params.token)
      if (!token || token.op !== "put") throw badRequest("Upload link expired or invalid")
      const size = Number(req.headers["content-length"])
      if (!Number.isInteger(size) || size <= 0 || size > (token.max ?? 0) || req.headers["content-type"] !== token.type) throw badRequest("Upload size or type does not match")
      await local.putStream!(token.key, req.body as NodeJS.ReadableStream, size, token.type!)
      return reply.code(200).send({ ok: true })
    })
  })

  app.get<{ Params: { token: string } }>("/api/local-files/:token", async (req, reply) => {
    const t = local.verify(req.params.token)
    if (!t || t.op !== "get") throw notFound("This link expired.")
    const info = await local.head(t.key)
    if (!info) throw notFound("File not found.")
    const ext = path.extname(t.key).toLowerCase()
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range)
      const size = info.size
      if (!range || (!range[1] && !range[2]) || (range[1] && Number(range[1]) >= size) || (range[1] && range[2] && Number(range[2]) < Number(range[1]))) return reply.code(416).header("Content-Range", `bytes */${size}`).send()
    }
    reply.header("Content-Type", info.contentType ?? TYPES[ext] ?? "application/octet-stream")
    reply.header("Content-Length", String(info.size))
    // These files are served from the API's own origin. Even if one is rendered as a page, it gets no script,
    // no same-origin access and no type sniffing.
    reply.header("Content-Security-Policy", "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox")
    reply.header("X-Content-Type-Options", "nosniff")
    if (t.name) reply.header("Content-Disposition", `inline; filename="${t.name.replace(/["\\\r\n]/g, "_")}"`)
    if (info.size === 0) return reply.send(Buffer.alloc(0))
    const result = await local.stream!(t.key, req.headers.range)
    if (!result) throw notFound("File not found")
    reply.header("Accept-Ranges", "bytes")
    reply.header("Content-Length", String(result.contentLength))
    if (result.contentRange) reply.header("Content-Range", result.contentRange)
    return reply.code(result.statusCode ?? 200).send(result.stream)
  })
}
