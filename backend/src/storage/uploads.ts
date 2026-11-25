import { eq } from "drizzle-orm"
import type { AppContext } from "../context.js"
import { upload_intents } from "../db/schema.js"
import { badRequest, forbidden } from "../errors.js"
import { allowedContentType, BUCKETS, keyOwner, type Bucket } from "./storage.js"

export async function beginUpload(ctx: AppContext, owner: string, input: { key: string; bucket: Bucket; type: string; size: number }) {
  const rule = BUCKETS[input.bucket]
  if (input.size <= 0 || input.size > rule.maxBytes) throw badRequest("File size exceeds the allowed limit.")
  // An allowlist, matched exactly: "text/html; charset=utf-8" or "application/xhtml+xml" can't slip past it.
  const type = allowedContentType(input.bucket, input.type)
  if (!type) throw badRequest(`This file type is not allowed. Upload ${rule.label}.`, "file_type")
  await ctx.db.insert(upload_intents).values({ key: input.key, owner_id: owner, bucket: input.bucket,
    content_type: type, expected_bytes: input.size, max_bytes: rule.maxBytes, expires_at: new Date(Date.now() + 15 * 60_000) })
  return ctx.storage.createUpload({ key: input.key, contentType: type, maxBytes: input.size, expectedBytes: input.size })
}

export async function verifyUpload(ctx: AppContext, owner: string, key: string, bucket: Bucket) {
  const o = keyOwner(key)
  const intent = await ctx.db.query.upload_intents.findFirst({ where: eq(upload_intents.key, key) })
  if (!o || o.owner !== owner || o.bucket !== bucket || !intent || intent.owner_id !== owner) throw forbidden("This upload does not belong to your account.")
  if (intent.state === "quarantined") throw badRequest("This upload failed validation. Upload a valid file.")
  const object = await ctx.storage.head(key)
  if (!object) throw badRequest("The upload has not finished.")
  let valid = object.size === intent.expected_bytes && object.size <= intent.max_bytes
    && object.contentType === intent.content_type
    && (intent.state === "verified" || intent.expires_at.getTime() > Date.now())
  if (bucket === "videos") {
    const sample = await ctx.storage.read(key, 16)
    const data = sample?.data
    const matches = data && (intent.content_type === "video/webm"
      ? data.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
      : ["video/mp4", "video/quicktime"].includes(intent.content_type) && data.subarray(4, 8).toString() === "ftyp")
    valid = valid && Boolean(matches)
  }
  if (bucket === "avatars") {
    const sample = await ctx.storage.read(key, 16)
    const data = sample?.data
    const matches = data && (intent.content_type === "image/png" ? data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : intent.content_type === "image/jpeg" ? data[0] === 255 && data[1] === 216 && data[2] === 255
      : intent.content_type === "image/gif" ? /^GIF8[79]a/.test(data.toString("ascii"))
      : data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP")
    valid = valid && Boolean(matches)
  }
  await ctx.db.update(upload_intents).set({ state: valid ? "verified" : "quarantined" }).where(eq(upload_intents.key, key))
  if (!valid) throw badRequest("Upload size or type does not match. The file has been quarantined.")
  return key
}
