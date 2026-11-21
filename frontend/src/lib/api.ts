import { assertCurrentSession, onSessionReset, sessionGeneration } from "./sessionBoundary"
import { accessToken } from "./auth"

/**
 * The Quantum LMS API. Requests go to /api on the same origin: Vite proxies it to the API in development, and
 * CloudFront routes it to the API service in AWS. VITE_API_URL points elsewhere when needed.
 */
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "") + "/api"

export type { Json, StudentProfile, Tables } from "./api.types"

/** Legacy seeded profiles may expose the reset-data action, but never supply login credentials. */
export const isDemoStudentEmail = (email?: string | null) => import.meta.env.DEV && email?.trim().toLowerCase() === "niharika@lms.com"
export const isDemoEvaluatorEmail = (email?: string | null) => import.meta.env.DEV && email?.trim().toLowerCase() === "eval@lms.com"

/** Error with a message that is safe to show. */
export class ApiError extends Error {
  readonly code?: string
  readonly status?: number
  constructor(message: string, code?: string, status?: number) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.status = status
  }
}

/** Any thrown value -> an ApiError with a readable message. */
export function toApiError(e: unknown, fallback = "Something went wrong. Try again."): ApiError {
  if (e instanceof ApiError) return e
  const msg = (e as { message?: string })?.message ?? ""
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return new ApiError("Can't reach the server. Check your connection and try again.")
  return new ApiError(msg && (e as { name?: string })?.name === "AuthError" ? msg : fallback)
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface RequestOptions {
  /** Time in ms to cache GET response (default: 30000ms = 30s). Pass 0 to bypass. */
  ttl?: number
  /** Skip cache check and force network revalidation */
  bypassCache?: boolean
  fallback?: string
}

interface CacheEntry {
  data: unknown
  etag?: string
  expiresAt: number
}

// In-memory response cache: path -> CacheEntry
const memoryCache = new Map<string, CacheEntry>()
// ETag cache: path -> ETag string
const etagCache = new Map<string, string>()
// In-flight GET request deduplication: path -> Promise<unknown>
const inFlightGet = new Map<string, Promise<unknown>>()

const STORAGE_PREFIX = "qlms_cache_"

function readStorageCache<T>(path: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + path)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (Date.now() < entry.expiresAt) return entry.data as T
    sessionStorage.removeItem(STORAGE_PREFIX + path)
  } catch {
    // Ignore storage quota / incognito errors
  }
  return null
}

function writeStorageCache(path: string, data: unknown, ttl: number) {
  if (typeof window === "undefined" || ttl <= 0) return
  try {
    sessionStorage.setItem(
      STORAGE_PREFIX + path,
      JSON.stringify({ data, expiresAt: Date.now() + ttl }),
    )
  } catch {
    // Ignore storage quota limits
  }
}

function clearStorageCache(pathPrefix?: string) {
  if (typeof window === "undefined") return
  try {
    if (!pathPrefix) {
      const keysToRemove: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i)
        if (k && k.startsWith(STORAGE_PREFIX)) keysToRemove.push(k)
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k))
      return
    }
    const fullPrefix = STORAGE_PREFIX + pathPrefix
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && (k.startsWith(fullPrefix) || k.includes(pathPrefix))) keysToRemove.push(k)
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    // Ignore
  }
}

/**
 * Invalidate cached responses for matching paths or prefixes across memory and storage.
 */
export function invalidateCache(pathPrefix?: string) {
  clearStorageCache(pathPrefix)
  if (!pathPrefix) {
    memoryCache.clear()
    etagCache.clear()
    return
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(pathPrefix) || key.includes(pathPrefix)) {
      memoryCache.delete(key)
      etagCache.delete(key)
    }
  }
}

function invalidateCacheForMutation(method: Method, path: string) {
  if (method === "GET") return
  const segments = path.split("/").filter(Boolean)
  if (segments.length >= 2) {
    invalidateCache(`/${segments[0]}/${segments[1]}`)
  } else {
    invalidateCache(path)
  }
}

let verifiedSession: { token: string; id: string } | null = null
onSessionReset(() => {
  verifiedSession = null
  invalidateCache()
  inFlightGet.clear()
})

async function verifiedIdentity(token: string | null, generation: number): Promise<string> {
  if (!token) throw new ApiError("Sign in to continue.", "unauthorized", 401)
  if (verifiedSession?.token === token) return verifiedSession.id
  const response = await fetch(`${BASE}/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
  assertCurrentSession(generation)
  if (!response.ok) throw new ApiError("Your session expired. Sign in again.", "unauthorized", 401)
  const user = await response.json() as { id?: string }
  assertCurrentSession(generation)
  if (!user.id) throw new ApiError("Your account could not be verified.")
  if (verifiedSession?.id !== user.id) { invalidateCache(); inFlightGet.clear() }
  verifiedSession = { token, id: user.id }
  return user.id
}

export async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  fallbackOrOpts?: string | RequestOptions,
): Promise<T> {
  const options: RequestOptions =
    typeof fallbackOrOpts === "string" ? { fallback: fallbackOrOpts } : (fallbackOrOpts ?? {})
  const fallback = options.fallback

  const generation = sessionGeneration()
  const token = await accessToken()
  assertCurrentSession(generation)
  const identity = path.startsWith("/verify/") || path.startsWith("/catalog/") ? "public" : await verifiedIdentity(token, generation)
  const key = `${identity}:${path}`
  assertCurrentSession(generation)

  // Check in-memory and persistent browser storage cache for GET requests
  if (method === "GET" && !options.bypassCache) {
    const cached = memoryCache.get(key)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T
    }
    const sessionCached = readStorageCache<T>(key)
    if (sessionCached) {
      memoryCache.set(key, { data: sessionCached, expiresAt: Date.now() + (options.ttl ?? 30_000) })
      return sessionCached
    }
    const inflight = inFlightGet.get(key)
    if (inflight) {
      return inflight as Promise<T>
    }
  }

  const exec = async (): Promise<T> => {
    let res: Response
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      }

      // Attach conditional ETag header if available in browser cache
      if (method === "GET" && etagCache.has(key)) {
        headers["If-None-Match"] = etagCache.get(key)!
      }

      res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch {
      throw new ApiError("Can't reach the server. Check your connection and try again.", "network")
    }

    assertCurrentSession(generation)

    // 304 Not Modified: Reuse cached data and extend TTL
    if (res.status === 304) {
      const cached = memoryCache.get(key)?.data ?? readStorageCache<T>(key)
      if (cached) {
        const ttl = options.ttl ?? 30_000
        memoryCache.set(key, {
          data: cached,
          etag: etagCache.get(key),
          expiresAt: Date.now() + ttl,
        })
        writeStorageCache(key, cached, ttl)
        return cached as T
      }
    }

    if (res.status === 204) {
      invalidateCacheForMutation(method, path)
      return undefined as T
    }

    const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null
    assertCurrentSession(generation)
    if (!res.ok) {
      const message = data?.error?.message
      if (res.status === 401) throw new ApiError(message ?? "Your session expired. Sign in again.", "unauthorized", 401)
      throw new ApiError(
        res.status >= 500
          ? (fallback ?? message ?? "Something went wrong on our side. Try again.")
          : (message ?? fallback ?? "That didn't work. Try again."),
        data?.error?.code,
        res.status,
      )
    }

    // Store in browser cache on successful GET
    if (method === "GET") {
      const etag = res.headers.get("etag")
      if (etag) etagCache.set(key, etag)

      const ttl = options.ttl ?? 30_000
      if (ttl > 0) {
        memoryCache.set(key, {
          data,
          etag: etag ?? undefined,
          expiresAt: Date.now() + ttl,
        })
        writeStorageCache(key, data, ttl)
      }
    } else {
      // Automatically purge stale cached entries on mutations
      invalidateCacheForMutation(method, path)
    }

    return data as T
  }

  if (method === "GET") {
    const p = exec().finally(() => {
      inFlightGet.delete(key)
    })
    inFlightGet.set(key, p)
    return p
  }

  return exec()
}

export const api = {
  get: <T>(path: string, fallbackOrOpts?: string | RequestOptions) =>
    request<T>("GET", path, undefined, fallbackOrOpts),
  post: <T>(path: string, body?: unknown, fallback?: string) =>
    request<T>("POST", path, body ?? {}, fallback),
  postBuffer: async <T>(
    path: string,
    body: BodyInit,
    opts?: { headers?: Record<string, string>; fallback?: string },
  ): Promise<T> => {
    const token = await accessToken()
    let res: Response
    try {
      res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(opts?.headers ?? {}),
        },
        body,
      })
    } catch {
      throw new ApiError("Can't reach the server. Check your connection and try again.", "network")
    }
    const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null
    if (!res.ok) {
      const message = data?.error?.message
      throw new ApiError(message ?? opts?.fallback ?? "Upload failed. Try again.", data?.error?.code, res.status)
    }
    invalidateCacheForMutation("POST", path)
    return data as T
  },
  put: <T>(path: string, body?: unknown, fallback?: string) =>
    request<T>("PUT", path, body ?? {}, fallback),
  patch: <T>(path: string, body?: unknown, fallback?: string) =>
    request<T>("PATCH", path, body ?? {}, fallback),
  del: <T = void>(path: string, fallback?: string) =>
    request<T>("DELETE", path, undefined, fallback),
  delete: <T = void>(path: string, fallback?: string) =>
    request<T>("DELETE", path, undefined, fallback),
  cache: {
    invalidate: invalidateCache,
    clear: () => invalidateCache(),
    stats: () => ({ cachedEntries: memoryCache.size, etagEntries: etagCache.size }),
  },
}

export type UploadBucket = "submissions" | "ticket-attachments" | "avatars"

/** Uploads a file straight to storage (S3 in AWS) and returns its key, to send with the form that references it. */
export async function uploadFile(bucket: UploadBucket, folder: string, file: File): Promise<string> {
  const target = await api.post<{ key: string; url: string; method: "PUT"; headers: Record<string, string> }>("/student/uploads", {
    bucket,
    folder,
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    size: file.size,
  })
  let res: Response
  try {
    res = await fetch(target.url, { method: target.method, headers: target.headers, body: file })
  } catch {
    throw new ApiError("The upload didn't finish. Check your connection and try again.")
  }
  if (!res.ok) throw new ApiError(res.status === 413 || res.status === 400 ? "That file is too large." : "The upload failed. Try again.")
  await api.post("/student/uploads/finalize", { key: target.key, bucket })
  return target.key
}

/** A short-lived link to one of the student's files. */
export async function fileUrl(key: string, name?: string): Promise<string> {
  const q = new URLSearchParams({ key, ...(name ? { name } : {}) })
  return (await api.get<{ url: string }>(`/student/files?${q}`, "The file couldn't be opened.")).url
}
