import type { LoginInput } from "@/app/session"
import { ApiError, isSupabaseConfigured, supabase } from "@/lib/supabase"
import { listTotpFactors, needsSecondFactor, verifyTotp } from "@/pages/student/data/account"

/** Student accounts sign in with Supabase Auth; the other roles keep the demo sign-in. */

function ensureConfigured() {
  if (!isSupabaseConfigured) throw new ApiError("Student sign-in isn't configured on this server yet.")
}

async function loginFor(uid: string): Promise<LoginInput> {
  const { data, error } = await supabase.from("profiles").select("full_name, email, avatar_url, headline").eq("id", uid).single()
  if (error || !data) throw new ApiError("Your student profile couldn't be loaded. Try again.")
  return { id: uid, name: data.full_name, role: "Student", email: data.email, avatar: data.avatar_url ?? undefined, title: data.headline }
}

/** Signs in; resolves to "mfa" when the account needs an authenticator code next. */
export async function studentSignIn(email: string, password: string): Promise<LoginInput | "mfa"> {
  ensureConfigured()
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error || !data.user) {
    if (/invalid login credentials/i.test(error?.message ?? "")) throw new ApiError("That email and password don't match a student account.")
    if (/fetch|network/i.test(error?.message ?? "")) throw new ApiError("Can't reach the server. Check your connection and try again.")
    throw new ApiError(error?.message ?? "Sign-in failed. Try again.")
  }
  if (await needsSecondFactor()) return "mfa"
  return loginFor(data.user.id)
}

export async function studentSignUp(fullName: string, email: string, password: string): Promise<LoginInput> {
  ensureConfigured()
  if (fullName.trim().length < 2) throw new ApiError("Enter your full name.")
  if (password.length < 8) throw new ApiError("Use a password with at least 8 characters.")
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } })
  if (error) {
    if (/already registered|already exists/i.test(error.message)) throw new ApiError("An account with this email already exists. Sign in instead.")
    throw new ApiError(error.message)
  }
  if (!data.session || !data.user) throw new ApiError("Check your inbox to confirm your email, then sign in.")
  return loginFor(data.user.id)
}

/** Completes a sign-in that needs the authenticator code. */
export async function studentVerifyCode(code: string): Promise<LoginInput> {
  const [factor] = await listTotpFactors()
  if (!factor) throw new ApiError("No authenticator is set up for this account.")
  await verifyTotp(factor.id, code)
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new ApiError("Your sign-in expired. Start again.")
  return loginFor(data.user.id)
}

export async function cancelStudentSignIn() {
  await supabase.auth.signOut().catch(() => undefined)
}
