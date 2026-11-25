import { randomUUID } from "node:crypto"
/**
 * Uploaded files (submissions, ticket attachments, profile photos). Keys look like "<bucket>/<user id>/<folder>/<name>".
 * Browsers upload straight to the returned URL with PUT, then send the key to the API, which checks the object
 * before referencing it. Downloads use short-lived URLs.
 */
const IMAGES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const
/**
 * Files staff open in the browser. Only types that can't run script when shown inline: no HTML, SVG, XML or
 * JavaScript. Several names per format because browsers and operating systems report them differently.
 */
const DOCUMENTS = [
  ...IMAGES,
  "application/pdf",
  "text/plain", "text/csv", "text/markdown", "text/x-python", "text/x-script.python", "application/x-python-code",
  "application/json", "application/x-ipynb+json",
  "application/zip", "application/x-zip-compressed", "application/x-tar", "application/gzip", "application/x-gzip", "application/x-compressed",
  "application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/octet-stream",
] as const

export const BUCKETS = {
  submissions: { maxBytes: 50 * 1024 * 1024, types: DOCUMENTS, label: "a PDF, notebook, archive, document, image or text file" },
  "ticket-attachments": { maxBytes: 10 * 1024 * 1024, types: DOCUMENTS, label: "a PDF, document, image or text file" },
  avatars: { maxBytes: 2 * 1024 * 1024, types: IMAGES, label: "a PNG, JPG, WebP or GIF image" },
  videos: { maxBytes: 5 * 1024 * 1024 * 1024, types: ["video/mp4", "video/webm", "video/quicktime"], label: "an MP4, WebM or MOV video" },
} as const

/** Lower-cased media type with no parameters, or null when it isn't a plain `type/subtype`. */
export function normalizeContentType(value: string): string | null {
  const type = value.trim().toLowerCase()
  return /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(type) ? type : null
}

export function allowedContentType(bucket: keyof typeof BUCKETS, value: string): string | null {
  const type = normalizeContentType(value)
  return type && (BUCKETS[bucket].types as readonly string[]).includes(type) ? type : null
}
export type Bucket = keyof typeof BUCKETS

export interface UploadTarget {
  key: string
  url: string
  method: "PUT"
  headers: Record<string, string>
  expiresAt: string
}

export interface StoredObject {
  size: number
  contentType?: string
}

export interface Storage {
  createUpload(input: { key: string; contentType: string; maxBytes: number; expectedBytes?: number }): Promise<UploadTarget>
  createDownloadUrl(key: string, opts?: { filename?: string; expiresInSeconds?: number }): Promise<string>
  head(key: string): Promise<StoredObject | null>
  remove(keys: string[]): Promise<void>
  /** Lists every key under a prefix (cleanup after a demo reset). */
  list(prefix: string): Promise<string[]>
  /** The first maxBytes of an object and its full size, or null when it doesn't exist (inline file previews). */
  read(key: string, maxBytes: number): Promise<{ data: Buffer; size: number } | null>
  /** Writes an object from the server (seeded demo files). Uploads from browsers use createUpload. */
  put(key: string, data: Buffer, contentType: string): Promise<void>
  putStream?(key: string, data: NodeJS.ReadableStream, size: number, contentType: string): Promise<void>
  /** Retrieves the full raw byte buffer of an object from storage. */
  getBuffer?(key: string): Promise<Buffer | null>
  /** Streams a file with partial byte range support for video and audio playback. */
  stream?(key: string, range?: string): Promise<{
    stream: NodeJS.ReadableStream
    contentLength?: number
    contentRange?: string
    contentType?: string
    acceptRanges?: string
    statusCode?: number
  } | null>
}

const SAFE = /[^a-zA-Z0-9._-]+/g
/** "<bucket>/<owner>/<folder>/<time>-<name>": the owner prefix is what the API checks before trusting a key. */
export function objectKey(bucket: Bucket, ownerId: string, folder: string, filename: string, now = Date.now()): string {
  const name = filename.replace(SAFE, "_").replace(/^_+|_+$/g, "").slice(-120) || "file"
  const dir = folder.replace(SAFE, "_").slice(0, 60) || "files"
  return `${bucket}/${ownerId}/${dir}/${now.toString(36)}-${randomUUID()}-${name}`
}

export function keyOwner(key: string): { bucket: string; owner: string } | null {
  const [bucket, owner, ...rest] = key.split("/")
  if (!bucket || !owner || rest.length < 2 || key.includes("..")) return null
  return { bucket, owner }
}
