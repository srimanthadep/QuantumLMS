import { createClient, type PostgrestError } from "@supabase/supabase-js"
import type { Database } from "./database.types"

/**
 * The Supabase client for the student portal. The publishable key is browser-safe: every table has row-level
 * security and writes with server-side rules go through SQL functions (see backend/README.md).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const isSupabaseConfigured = Boolean(url && key)

export const supabase = createClient<Database>(url || "https://unconfigured.supabase.co", key || "unconfigured", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Not prefixed "quantum": "Reset demo data" clears those keys and must keep the sign-in.
    storageKey: "sb-quantum-lms-auth",
  },
})

export type { Json, Tables } from "./database.types"

/** The shared demo student. Switching to the Student role signs this account in. */
export const DEMO_STUDENT = { email: "aarav.mehta@learner.ai", password: "demo-student" } as const

export const isDemoStudentEmail = (email?: string | null) => (email ?? "").trim().toLowerCase() === DEMO_STUDENT.email

/** Error with a message that is safe to show to the student. */
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

const FRIENDLY: Record<string, string> = {
  "42501": "You don't have permission to do that.",
  "23505": "That already exists.",
  PGRST301: "Your session expired. Sign in again.",
  PGRST303: "Your session expired. Sign in again.",
}

/** Turns a PostgREST error into an ApiError. Messages raised by our SQL functions are already written for students. */
export function toApiError(error: PostgrestError | { message: string; code?: string } | null | undefined, fallback = "Something went wrong. Try again."): ApiError {
  if (!error) return new ApiError(fallback)
  const code = "code" in error ? error.code : undefined
  const raw = error.message ?? ""
  if (/failed to fetch|network|load failed/i.test(raw)) return new ApiError("Can't reach the server. Check your connection and try again.", code)
  // Errors raised with a custom SQLSTATE (P0001, 22023, PT404 …) carry a student-facing message.
  if (code && (/^P0|^PT|^22/.test(code) || code === "42501") && raw && !/permission denied for|row-level security|invalid input syntax/i.test(raw)) return new ApiError(raw, code)
  return new ApiError((code && FRIENDLY[code]) || fallback, code)
}

/** Unwraps a Supabase response, throwing an ApiError on failure. */
export function unwrap<R extends { data: unknown; error: PostgrestError | null }>(res: R, fallback?: string): NonNullable<R["data"]> {
  if (res.error) throw toApiError(res.error, fallback)
  return res.data as NonNullable<R["data"]>
}
