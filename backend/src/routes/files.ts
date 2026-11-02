import { createReadStream } from "node:fs"
import path from "node:path"
import type { FastifyInstance } from "fastify"
import type { AppContext } from "../context.js"
import { badRequest, notFound } from "../errors.js"
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
    const url = await ctx.storage.createDownloadUrl(key, { expiresInSeconds: 3600 })
    reply.header("Cache-Control", "public, max-age=3000")
    return reply.redirect(url, 302)
  })

  const local = ctx.localStorage
  if (!local) return

  // Development only: the targets of signed local upload and download links.
  app.register(async (scope) => {
    // Every content type arrives as raw bytes here (the default parsers would turn text/plain into a string).
    scope.removeAllContentTypeParsers()
    scope.addContentTypeParser("*", { parseAs: "buffer", bodyLimit: BUCKETS.submissions.maxBytes + 1024 }, (_req, body, done) => done(null, body))
    scope.put<{ Params: { token: string } }>("/api/local-files/:token", async (req, reply) => {
      const t = local.verify(req.params.token)
      if (!t || t.op !== "put") throw badRequest("This upload link expired. Try again.", "expired")
      const body = req.body as Buffer
      if (!Buffer.isBuffer(body)) throw badRequest("Send the file as the request body.")
      if (t.max && body.length > t.max) throw badRequest("That file is too large.", "too_large")
      await local.write(t.key, body)
      return reply.code(200).send({ key: t.key, size: body.length })
    })
  })
  app.get<{ Params: { token: string } }>("/api/local-files/:token", async (req, reply) => {
    const t = local.verify(req.params.token)
    if (!t || t.op !== "get") throw notFound("This link expired.")
    const info = await local.head(t.key)
    if (!info) throw notFound("File not found.")
    const ext = path.extname(t.key).toLowerCase()
    reply.header("Content-Type", TYPES[ext] ?? "application/octet-stream")
    reply.header("Content-Length", String(info.size))
    if (t.name) reply.header("Content-Disposition", `inline; filename="${t.name.replace(/["\\\r\n]/g, "_")}"`)
    return reply.send(createReadStream(local.pathOf(t.key)))
  })
}
