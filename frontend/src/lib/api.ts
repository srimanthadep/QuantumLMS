import { accessToken } from "./auth"

/**
 * The Quantum LMS API. Requests go to /api on the same origin: Vite proxies it to the API in development, and
 * CloudFront routes it to the API service in AWS. VITE_API_URL points elsewhere when needed.
 */
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "") + "/api"

export type { Json, StudentProfile, Tables } from "./api.types"

/** The shared demo accounts behind the quick-launch buttons. */
export const DEMO_STUDENT = { email: "aarav.mehta@learner.ai", password: "DemoStudent2026" } as const
export const DEMO_EVALUATOR = { email: "evaluator@quantumschool.ai", password: "DemoEvaluator2026" } as const
export const DEMO_SUPPORT = { email: "support@quantumschool.ai", password: "DemoSupport2026" } as const
export const isDemoStudentEmail = (email?: string | null) => (email ?? "").trim().toLowerCase() === DEMO_STUDENT.email
export const isDemoEvaluatorEmail = (email?: string | null) => (email ?? "").trim().toLowerCase() === DEMO_EVALUATOR.email
export const isDemoSupportEmail = (email?: string | null) => (email ?? "").trim().toLowerCase() === DEMO_SUPPORT.email

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

export async function request<T>(method: Method, path: string, body?: unknown, fallback?: string): Promise<T> {
  const token = await accessToken()
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", "network")
  }
  if (res.status === 204) return undefined as T
  const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null
  if (!res.ok) {
    const message = data?.error?.message
    if (res.status === 401) throw new ApiError(message ?? "Your session expired. Sign in again.", "unauthorized", 401)
    throw new ApiError(res.status >= 500 ? (fallback ?? message ?? "Something went wrong on our side. Try again.") : (message ?? fallback ?? "That didn't work. Try again."), data?.error?.code, res.status)
  }
  return data as T
}

export const api = {
  get: <T>(path: string, fallback?: string) => request<T>("GET", path, undefined, fallback),
  post: <T>(path: string, body?: unknown, fallback?: string) => request<T>("POST", path, body ?? {}, fallback),
  put: <T>(path: string, body?: unknown, fallback?: string) => request<T>("PUT", path, body ?? {}, fallback),
  patch: <T>(path: string, body?: unknown, fallback?: string) => request<T>("PATCH", path, body ?? {}, fallback),
  del: <T = void>(path: string, fallback?: string) => request<T>("DELETE", path, undefined, fallback),
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
