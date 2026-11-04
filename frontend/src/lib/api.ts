import { accessToken } from "./auth"

/**
 * The Quantum LMS API. Requests go to /api on the same origin: Vite proxies it to the API in development, and
 * CloudFront routes it to the API service in AWS. VITE_API_URL points elsewhere when needed.
 */
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "") + "/api"

export type { Json, StudentProfile, Tables } from "./api.types"

/** The shared demo accounts behind the quick-launch buttons. */
export const DEMO_STUDENT = { email: "niharika@lms.com", password: "123456" } as const
export const DEMO_EVALUATOR = { email: "eval@lms.com", password: "123456" } as const
export const DEMO_SUPPORT = { email: "maheshwar@lms.com", password: "123456" } as const
export const DEMO_ADMIN = { email: "admin@lms.com", password: "123456" } as const
export const DEMO_SUPER_ADMIN = { email: "superadmin@lms.com", password: "123456" } as const
export const DEMO_TEACHER = { email: "shanmuk@lms.com", password: "123456" } as const
export const isDemoStudentEmail = (email?: string | null) => (email ?? "").trim().toLowerCase() === DEMO_STUDENT.email
export const isDemoEvaluatorEmail = (email?: string | null) => (email ?? "").trim().toLowerCase() === DEMO_EVALUATOR.email
export const isDemoSupportEmail = (email?: string | null) => (email ?? "").trim().toLowerCase() === DEMO_SUPPORT.email
export const isDemoAdminEmail = (email?: string | null) => (email ?? "").trim().toLowerCase() === DEMO_ADMIN.email
export const isDemoSuperAdminEmail = (email?: string | null) => (email ?? "").trim().toLowerCase() === DEMO_SUPER_ADMIN.email
export const isDemoTeacherEmail = (email?: string | null) => (email ?? "").trim().toLowerCase() === DEMO_TEACHER.email

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

export async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  fallbackOrOpts?: string | RequestOptions,
): Promise<T> {
  const options: RequestOptions =
    typeof fallbackOrOpts === "string" ? { fallback: fallbackOrOpts } : (fallbackOrOpts ?? {})
  const fallback = options.fallback

  // Check in-memory and persistent browser storage cache for GET requests
  if (method === "GET" && !options.bypassCache) {
    const cached = memoryCache.get(path)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T
    }
    const sessionCached = readStorageCache<T>(path)
    if (sessionCached) {
      memoryCache.set(path, { data: sessionCached, expiresAt: Date.now() + (options.ttl ?? 30_000) })
      return sessionCached
    }
  }

  const token = await accessToken()
  let res: Response
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    }

    // Attach conditional ETag header if available in browser cache
    if (method === "GET" && etagCache.has(path)) {
      headers["If-None-Match"] = etagCache.get(path)!
    }

    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", "network")
  }

  // 304 Not Modified: Reuse cached data and extend TTL
  if (res.status === 304) {
    const cached = memoryCache.get(path)?.data ?? readStorageCache<T>(path)
    if (cached) {
      const ttl = options.ttl ?? 30_000
      memoryCache.set(path, {
        data: cached,
        etag: etagCache.get(path),
        expiresAt: Date.now() + ttl,
      })
      writeStorageCache(path, cached, ttl)
      return cached as T
    }
  }

  if (res.status === 204) {
    invalidateCacheForMutation(method, path)
    return undefined as T
  }

  const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null
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
    if (etag) etagCache.set(path, etag)

    const ttl = options.ttl ?? 30_000
    if (ttl > 0) {
      memoryCache.set(path, {
        data,
        etag: etag ?? undefined,
        expiresAt: Date.now() + ttl,
      })
      writeStorageCache(path, data, ttl)
    }
  } else {
    // Automatically purge stale cached entries on mutations
    invalidateCacheForMutation(method, path)
  }

  return data as T
}

export const api = {
  get: <T>(path: string, fallbackOrOpts?: string | RequestOptions) =>
    request<T>("GET", path, undefined, fallbackOrOpts),
  post: <T>(path: string, body?: unknown, fallback?: string) =>
    request<T>("POST", path, body ?? {}, fallback),
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
  return target.key
}

/** A short-lived link to one of the student's files. */
export async function fileUrl(key: string, name?: string): Promise<string> {
  const q = new URLSearchParams({ key, ...(name ? { name } : {}) })
  return (await api.get<{ url: string }>(`/student/files?${q}`, "The file couldn't be opened.")).url
}
