import { DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import type { Storage } from "./storage.js"

/** S3 (or S3-compatible) storage. Credentials come from the default chain (the ECS task role in AWS) or explicit access keys (Cloudflare R2). */
export function createS3Storage(opts: {
  bucket: string
  region?: string
  endpoint?: string
  credentials?: { accessKeyId: string; secretAccessKey: string }
}): Storage {
  const client = new S3Client({
    region: opts.region ?? "auto",
    ...(opts.endpoint ? { endpoint: opts.endpoint, forcePathStyle: true } : {}),
    ...(opts.credentials ? { credentials: opts.credentials } : {}),
  })
  const Bucket = opts.bucket
  return {
    async createUpload({ key, contentType }) {
      const expiresIn = 600
      const url = await getSignedUrl(client, new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }), { expiresIn })
      return { key, url, method: "PUT", headers: { "Content-Type": contentType }, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() }
    },
    async createDownloadUrl(key, o = {}) {
      const disposition = o.filename ? `inline; filename="${o.filename.replace(/["\\]/g, "_")}"` : undefined
      return getSignedUrl(client, new GetObjectCommand({ Bucket, Key: key, ResponseContentDisposition: disposition }), { expiresIn: o.expiresInSeconds ?? 300 })
    },
    async head(key) {
      try {
        const r = await client.send(new HeadObjectCommand({ Bucket, Key: key }))
        return { size: Number(r.ContentLength ?? 0), contentType: r.ContentType }
      } catch (e) {
        const status = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        if (status === 404 || (e as Error).name === "NotFound") return null
        throw e
      }
    },
    async remove(keys) {
      for (let i = 0; i < keys.length; i += 1000) {
        const chunk = keys.slice(i, i + 1000)
        if (chunk.length) await client.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }))
      }
    },
    async list(prefix) {
      const keys: string[] = []
      let token: string | undefined
      do {
        const r = await client.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token }))
        for (const o of r.Contents ?? []) if (o.Key) keys.push(o.Key)
        token = r.IsTruncated ? r.NextContinuationToken : undefined
      } while (token)
      return keys
    },
    async read(key, maxBytes) {
      try {
        const r = await client.send(new GetObjectCommand({ Bucket, Key: key, Range: `bytes=0-${Math.max(0, maxBytes - 1)}` }))
        const data = Buffer.from(await r.Body!.transformToByteArray())
        // ContentRange is "bytes 0-1023/52311": the part after the slash is the object's full size.
        const size = Number(/\/(\d+)$/.exec(r.ContentRange ?? "")?.[1] ?? r.ContentLength ?? data.length)
        return { data, size }
      } catch (e) {
        const status = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        if (status === 404 || (e as Error).name === "NoSuchKey") return null
        // An empty object has no byte 0 to range over.
        if (status === 416) return { data: Buffer.alloc(0), size: 0 }
        throw e
      }
    },
    async put(key, data, contentType) {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: data, ContentType: contentType }))
    },
  }
}
