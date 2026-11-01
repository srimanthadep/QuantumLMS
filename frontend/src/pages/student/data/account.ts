import { ApiError, supabase } from "@/lib/supabase"

/** Checks the current password by signing in with it, then sets the new one. */
export async function changePassword(email: string, current: string, next: string) {
  const check = await supabase.auth.signInWithPassword({ email, password: current })
  if (check.error) throw new ApiError("Your current password is incorrect.")
  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) throw new ApiError(/same/i.test(error.message) ? "Choose a password you haven't used here before." : error.message)
}

export interface TotpFactor {
  id: string
  friendlyName?: string
  createdAt: string
}

export async function listTotpFactors(): Promise<TotpFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw new ApiError(error.message)
  return data.totp.map((f) => ({ id: f.id, friendlyName: f.friendly_name ?? undefined, createdAt: f.created_at }))
}

export interface TotpEnrollment {
  factorId: string
  /** SVG data URL to scan with an authenticator app. */
  qrCode: string
  secret: string
}

export async function enrollTotp(): Promise<TotpEnrollment> {
  // Clear half-finished enrollments first; the server rejects a second unverified factor with the same name.
  const { data: listed } = await supabase.auth.mfa.listFactors()
  for (const f of listed?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id })
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` })
  if (error) throw new ApiError(/demo account/i.test(error.message) || /database error/i.test(error.message) ? "The shared demo account can't turn on two-factor authentication." : error.message)
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

export async function verifyTotp(factorId: string, code: string) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s+/g, "") })
  if (error) throw new ApiError(/invalid|expired/i.test(error.message) ? "That code didn't work. Enter the current 6-digit code." : error.message)
}

export async function unenrollTotp(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw new ApiError(/aal2/i.test(error.message) ? "Sign in again with your authenticator code, then turn it off." : error.message)
}

/** True when the account has a verified second factor that this session hasn't passed yet. */
export async function needsSecondFactor(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) return false
  return data.nextLevel === "aal2" && data.currentLevel !== "aal2"
}

export async function signOutOtherDevices() {
  const { error } = await supabase.auth.signOut({ scope: "others" })
  if (error) throw new ApiError(error.message)
}

/** "Chrome on Windows" from the user agent. */
export function describeDevice(ua = navigator.userAgent): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser"
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "your device"
  return `${browser} on ${os}`
}
