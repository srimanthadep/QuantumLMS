import { createHmac, timingSafeEqual } from "node:crypto"
import { createReadStream } from "node:fs"
import { mkdir, open, readdir, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import type { Storage } from "./storage.js"

/**
 * Development storage on the local disk. Upload and download links are API routes carrying an HMAC-signed,
 * expiring token, so the browser flow is the same as with S3 presigned URLs.
 */
export interface LocalToken {
  op: "put" | "get"
  key: string
  exp: number
  type?: string
  max?: number
  name?: string
}

export function createLocalStorage(opts: { dir: string; secret: string; basePath?: string }) {
  const root = path.resolve(opts.dir)
  const base = opts.basePath ?? "/api/local-files"
  const sign = (t: LocalToken) => {
    const body = Buffer.from(JSON.stringify(t)).toString("base64url")
    const mac = createHmac("sha256", opts.secret).update(body).digest("base64url")
    return `${body}.${mac}`
  }
  const fileFor = (key: string) => {
    const p = path.resolve(root, key)
    if (!p.startsWith(root + path.sep)) throw new Error("invalid storage key")
    return p
  }

  const storage: Storage & {
    verify(token: string): LocalToken | null
    write(key: string, data: Buffer): Promise<void>
    pathOf(key: string): string
  } = {
    async createUpload({ key, contentType, maxBytes }) {
      const exp = Date.now() + 600_000
      const token = sign({ op: "put", key, exp, type: contentType, max: maxBytes })
      return { key, url: `${base}/${token}`, method: "PUT", headers: { "Content-Type": contentType }, expiresAt: new Date(exp).toISOString() }
    },
    async createDownloadUrl(key, o = {}) {
      return `${base}/${sign({ op: "get", key, exp: Date.now() + (o.expiresInSeconds ?? 300) * 1000, name: o.filename })}`
    },
    async head(key) {
      try {
        const s = await stat(fileFor(key))
        return s.isFile() ? { size: s.size } : null
      } catch {
        return null
      }
    },
    async remove(keys) {
      await Promise.all(keys.map((k) => rm(fileFor(k), { force: true })))
    },
    async list(prefix) {
      const dir = fileFor(prefix.replace(/\/+$/, "") + "/x").replace(/[\\/]x$/, "")
      const out: string[] = []
      const walk = async (d: string) => {
        let entries
        try {
          entries = await readdir(d, { withFileTypes: true })
        } catch {
          return
        }
        for (const e of entries) {
          const p = path.join(d, e.name)
          if (e.isDirectory()) await walk(p)
          else out.push(path.relative(root, p).split(path.sep).join("/"))
        }
      }
      await walk(dir)
      return out
    },
    async read(key, maxBytes) {
      let handle
      try {
        handle = await open(fileFor(key), "r")
      } catch {
        return null
      }
      try {
        const { size } = await handle.stat()
        const data = Buffer.alloc(Math.min(size, maxBytes))
        await handle.read(data, 0, data.length, 0)
        return { data, size }
      } finally {
        await handle.close()
      }
    },
    async put(key, data) {
      const p = fileFor(key)
      await mkdir(path.dirname(p), { recursive: true })
      await writeFile(p, data)
    },
    async stream(key, range) {
      const p = fileFor(key)
      let s
      try {
        s = await stat(p)
        if (!s.isFile()) return null
      } catch {
        return null
      }
      const totalSize = s.size
      let start = 0
      let end = totalSize - 1
      let statusCode = 200
      let contentRange: string | undefined = undefined

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const partialStart = parts[0]
        const partialEnd = parts[1]
        start = parseInt(partialStart, 10)
        end = partialEnd ? parseInt(partialEnd, 10) : totalSize - 1
        if (!isNaN(start) && !isNaN(end)) {
          statusCode = 206
          contentRange = `bytes ${start}-${end}/${totalSize}`
        }
      }

      const stream = createReadStream(p, { start, end })
      return {
        stream,
        contentLength: end - start + 1,
        contentRange,
        contentType: "video/mp4",
        acceptRanges: "bytes",
        statusCode,
      }
    },
    verify(token) {
      const [body, mac] = token.split(".")
      if (!body || !mac) return null
      const expected = createHmac("sha256", opts.secret).update(body).digest()
      const given = Buffer.from(mac, "base64url")
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
      try {
        const t = JSON.parse(Buffer.from(body, "base64url").toString()) as LocalToken
        return t.exp > Date.now() ? t : null
      } catch {
        return null
      }
    },
    async write(key, data) {
      const p = fileFor(key)
      await mkdir(path.dirname(p), { recursive: true })
      await writeFile(p, data)
    },
    pathOf: fileFor,
  }
  return storage
}

export type LocalStorage = ReturnType<typeof createLocalStorage>
