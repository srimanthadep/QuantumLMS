import { Amplify } from "aws-amplify"
import {
  confirmResetPassword,
  confirmSignIn,
  confirmSignUp,
  fetchAuthSession,
  fetchMFAPreference,
  getCurrentUser,
  resendSignUpCode,
  resetPassword,
  setUpTOTP,
  signIn,
  signOut,
  signUp,
  updateMFAPreference,
  updatePassword,
  verifyTOTPSetup,
} from "aws-amplify/auth"
import { renderSVG } from "uqr"

/**
 * Sign-in with Amazon Cognito (AWS Sydney / ap-southeast-2).
 */
const env = import.meta.env
const userPoolId = env.VITE_COGNITO_USER_POOL_ID as string | undefined
const userPoolClientId = env.VITE_COGNITO_CLIENT_ID as string | undefined

export const isAuthConfigured = Boolean(userPoolId && userPoolClientId)
if (isAuthConfigured) {
  Amplify.configure({ Auth: { Cognito: { userPoolId: userPoolId!, userPoolClientId: userPoolClientId!, loginWith: { email: true } } } })
}

/** The user pool's password policy */
export const PASSWORD_RULE = "Use at least 8 characters with uppercase, lowercase, a number, and a symbol (e.g. !@#$)."
export const meetsPasswordPolicy = (pw: string) =>
  pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)

/** Error with a message that is safe to show. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthError"
  }
}

/** Cognito exception -> a sentence for the person signing in. */
export function authMessage(e: unknown, fallback = "Sign-in failed. Try again."): string {
  const name = (e as { name?: string })?.name ?? ""
  const raw = (e as { message?: string })?.message ?? ""
  if (e instanceof AuthError) return e.message
  if (/NetworkError|Failed to fetch|Network error/i.test(name + raw)) return "Can't reach the sign-in service. Check your connection and try again."
  switch (name) {
    case "NotAuthorizedException":
      return /attempts exceeded/i.test(raw) ? "Too many attempts. Wait a few minutes and try again." : "That email and password don't match an account."
    case "UserNotFoundException":
      return "That email and password don't match an account."
    case "UsernameExistsException":
      return "An account with this email already exists. Sign in instead."
    case "InvalidPasswordException":
      return PASSWORD_RULE
    case "CodeMismatchException":
      return "That code didn't work. Check it and try again."
    case "ExpiredCodeException":
      return "That code expired. Ask for a new one."
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Too many attempts. Wait a few minutes and try again."
    case "EnableSoftwareTokenMFAException":
      return "That code didn't work. Enter the current 6-digit code."
    case "UserNotConfirmedException":
      return "Confirm your email first. We sent you a code."
    default:
      return raw && raw.length < 200 ? raw : fallback
  }
}

export type SignInResult = "done" | "mfa" | "confirm-email" | "new-password"

/** Signs in. Resolves to the next step when Cognito needs something more than the password. */
export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  if (!isAuthConfigured) throw new AuthError("Sign-in isn't configured on this server yet.")
  // A previous account may still be signed in on this device.
  await signOut().catch(() => undefined)
  try {
    const res = await signIn({ username: email.trim().toLowerCase(), password })
    if (res.isSignedIn) return "done"
    const step = res.nextStep.signInStep
    if (step === "CONFIRM_SIGN_IN_WITH_TOTP_CODE") return "mfa"
    if (step === "CONFIRM_SIGN_UP") return "confirm-email"
    if (step === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") return "new-password"
    throw new AuthError("This account needs a sign-in step this app doesn't support yet. Contact support.")
  } catch (e) {
    throw new AuthError(authMessage(e))
  }
}

/** Completes a sign-in that asked for an authenticator code (or a new password). */
export async function confirmSignInStep(response: string): Promise<SignInResult> {
  try {
    const res = await confirmSignIn({ challengeResponse: response.replace(/\s+/g, "") })
    if (res.isSignedIn) return "done"
    if (res.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_TOTP_CODE") return "mfa"
    throw new AuthError("Sign-in couldn't be completed. Start again.")
  } catch (e) {
    throw new AuthError(authMessage(e, "That code didn't work. Enter the current 6-digit code."))
  }
}

/** Creates an account. Cognito emails a code that confirmEmail() checks. */
export async function signUpWithEmail(fullName: string, email: string, password: string): Promise<"confirm-email" | "done"> {
  if (!isAuthConfigured) throw new AuthError("Sign-up isn't configured on this server yet.")
  try {
    const res = await signUp({ username: email.trim().toLowerCase(), password, options: { userAttributes: { email: email.trim().toLowerCase(), name: fullName.trim() } } })
    return res.nextStep.signUpStep === "CONFIRM_SIGN_UP" ? "confirm-email" : "done"
  } catch (e) {
    throw new AuthError(authMessage(e, "The account couldn't be created. Try again."))
  }
}

export async function confirmEmail(email: string, code: string) {
  try {
    await confirmSignUp({ username: email.trim().toLowerCase(), confirmationCode: code.replace(/\s+/g, "") })
  } catch (e) {
    throw new AuthError(authMessage(e, "That code didn't work."))
  }
}

export async function resendEmailCode(email: string) {
  try {
    await resendSignUpCode({ username: email.trim().toLowerCase() })
  } catch (e) {
    throw new AuthError(authMessage(e, "A new code couldn't be sent."))
  }
}

export async function startPasswordReset(email: string) {
  try {
    await resetPassword({ username: email.trim().toLowerCase() })
  } catch (e) {
    throw new AuthError(authMessage(e, "The reset code couldn't be sent."))
  }
}

export async function finishPasswordReset(email: string, code: string, newPassword: string) {
  try {
    await confirmResetPassword({ username: email.trim().toLowerCase(), confirmationCode: code.replace(/\s+/g, ""), newPassword })
  } catch (e) {
    throw new AuthError(authMessage(e, "The password couldn't be reset."))
  }
}

/** The signed-in user's Cognito id, or null. */
export async function currentUserId(): Promise<string | null> {
  return (await currentSignIn())?.userId ?? null
}

/** Who is signed in to Cognito on this device: id and the email they signed in with. */
export async function currentSignIn(): Promise<{ userId: string; email: string } | null> {
  // 1. Check local session storage from in-app login
  if (typeof window !== "undefined") {
    const rawUser = localStorage.getItem("quantum_current_user")
    const isAuth = localStorage.getItem("quantum_auth_session") === "true"
    if (isAuth && rawUser) {
      try {
        const u = JSON.parse(rawUser)
        if (u.email) {
          return { userId: u.id || u.sub || u.email, email: u.email.toLowerCase() }
        }
      } catch {}
    }
  }

  // 2. Check backend session
  try {
    const res = await fetch("/api/auth/status").then((r) => (r.ok ? r.json() : null))
    if (res?.authenticated && res.user) {
      return { userId: res.user.id || res.user.email, email: res.user.email.toLowerCase() }
    }
  } catch {}

  // 3. Fallback to Amplify
  if (!isAuthConfigured) return null
  try {
    const u = await getCurrentUser()
    return { userId: u.userId, email: (u.signInDetails?.loginId ?? u.username).toLowerCase() }
  } catch {
    return null
  }
}

let cachedAccessToken: string | null = null

export function setStoredAccessToken(token: string | null) {
  cachedAccessToken = token
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("qlms_access_token", token)
    } else {
      localStorage.removeItem("qlms_access_token")
    }
  }
}

/** A fresh access token for API calls (Amplify refreshes it when it's about to expire), or null when signed out. */
export async function accessToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("qlms_access_token")
    if (stored) return stored
  }
  if (!isAuthConfigured) return null
  try {
    const session = await fetchAuthSession()
    const token = session.tokens?.accessToken?.toString()
    if (token) {
      setStoredAccessToken(token)
      return token
    }
  } catch {
    // Session fetch error
  }
  return cachedAccessToken
}

/** Ends the session on this device. ("Sign out of all devices" goes through the API, which revokes every session.) */
export async function signOutHere() {
  setStoredAccessToken(null)
  await signOut().catch(() => undefined)
  await fetch("/api/auth/signout", { method: "POST" }).catch(() => undefined)
}

export async function changePassword(current: string, next: string) {
  try {
    await updatePassword({ oldPassword: current, newPassword: next })
  } catch (e) {
    const name = (e as { name?: string }).name
    throw new AuthError(name === "NotAuthorizedException" ? "Your current password is incorrect." : authMessage(e, "The password couldn't be changed."))
  }
}

/* ------------------------------ Authenticator app ------------------------------ */

export async function isTotpEnabled(): Promise<boolean> {
  try {
    const pref = await fetchMFAPreference()
    return (pref.enabled ?? []).includes("TOTP")
  } catch {
    return false
  }
}

export interface TotpSetup {
  /** SVG data URL to scan with an authenticator app. */
  qrCode: string
  secret: string
}

export async function beginTotpSetup(accountName: string): Promise<TotpSetup> {
  try {
    const details = await setUpTOTP()
    const uri = details.getSetupUri("Quantum School of AI", accountName).toString()
    return { qrCode: `data:image/svg+xml;utf8,${encodeURIComponent(renderSVG(uri, { border: 1 }))}`, secret: details.sharedSecret }
  } catch (e) {
    throw new AuthError(authMessage(e, "Two-factor authentication couldn't be set up."))
  }
}

export async function finishTotpSetup(code: string) {
  try {
    await verifyTOTPSetup({ code: code.replace(/\s+/g, "") })
    await updateMFAPreference({ totp: "PREFERRED" })
  } catch (e) {
    throw new AuthError(authMessage(e, "That code didn't work. Enter the current 6-digit code."))
  }
}

export async function disableTotp() {
  try {
    await updateMFAPreference({ totp: "DISABLED" })
  } catch (e) {
    throw new AuthError(authMessage(e, "Two-factor authentication couldn't be turned off."))
  }
}
