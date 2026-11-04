/**
 * Uploaded files (submissions, ticket attachments, profile photos). Keys look like "<bucket>/<user id>/<folder>/<name>".
 * Browsers upload straight to the returned URL with PUT, then send the key to the API, which checks the object
 * before referencing it. Downloads use short-lived URLs.
 */
export const BUCKETS = {
  submissions: { maxBytes: 50 * 1024 * 1024, types: null },
  "ticket-attachments": { maxBytes: 10 * 1024 * 1024, types: null },
  avatars: { maxBytes: 2 * 1024 * 1024, types: ["image/png", "image/jpeg", "image/webp", "image/gif"] },
  videos: { maxBytes: 5 * 1024 * 1024 * 1024, types: null },
} as const
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
  createUpload(input: { key: string; contentType: string; maxBytes: number }): Promise<UploadTarget>
  createDownloadUrl(key: string, opts?: { filename?: string; expiresInSeconds?: number }): Promise<string>
  head(key: string): Promise<StoredObject | null>
  remove(keys: string[]): Promise<void>
  /** Lists every key under a prefix (cleanup after a demo reset). */
  list(prefix: string): Promise<string[]>
  /** The first maxBytes of an object and its full size, or null when it doesn't exist (inline file previews). */
  read(key: string, maxBytes: number): Promise<{ data: Buffer; size: number } | null>
  /** Writes an object from the server (seeded demo files). Uploads from browsers use createUpload. */
  put(key: string, data: Buffer, contentType: string): Promise<void>
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
  return `${bucket}/${ownerId}/${dir}/${now.toString(36)}-${name}`
}

export function keyOwner(key: string): { bucket: string; owner: string } | null {
  const [bucket, owner, ...rest] = key.split("/")
  if (!bucket || !owner || rest.length < 2 || key.includes("..")) return null
  return { bucket, owner }
}
