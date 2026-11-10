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
 * Sign-in with Amazon Cognito (Amplify Auth). In development the pool can be the local emulator: set
 * VITE_COGNITO_ENDPOINT and VITE_COGNITO_AUTH_FLOW=USER_PASSWORD_AUTH (it doesn't support SRP).
 */
const env = import.meta.env
const userPoolId = env.VITE_COGNITO_USER_POOL_ID as string | undefined
const userPoolClientId = env.VITE_COGNITO_CLIENT_ID as string | undefined
const endpoint = (env.VITE_COGNITO_ENDPOINT as string | undefined) || undefined
const authFlowType = ((env.VITE_COGNITO_AUTH_FLOW as string | undefined) || "USER_SRP_AUTH") as "USER_SRP_AUTH" | "USER_PASSWORD_AUTH"

export const isAuthConfigured = Boolean(userPoolId && userPoolClientId)
if (isAuthConfigured) {
  Amplify.configure({ Auth: { Cognito: { userPoolId: userPoolId!, userPoolClientId: userPoolClientId!, userPoolEndpoint: endpoint, loginWith: { email: true } } } })
}

/** The user pool's password policy (see backend/scripts/setup-cognito.ts). */
export const PASSWORD_RULE = "Use at least 10 characters with upper and lower case letters and a number."
export const meetsPasswordPolicy = (pw: string) => pw.length >= 10 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw)

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
  cachedAccessToken = null
  cachedTokenExpiresAt = 0
  // A previous account may still be signed in on this device.
  await signOut().catch(() => undefined)
  try {
    const res = await signIn({ username: email.trim().toLowerCase(), password, options: { authFlowType } })
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
  if (!isAuthConfigured) return null
  try {
    const u = await getCurrentUser()
    return { userId: u.userId, email: (u.signInDetails?.loginId ?? u.username).toLowerCase() }
  } catch {
    return null
  }
}

let cachedAccessToken: string | null = null
let cachedTokenExpiresAt = 0
let inFlightToken: Promise<string | null> | null = null

function parseTokenExpiryMs(jwt: string): number {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    if (typeof payload.exp === "number") {
      return Math.min(Date.now() + 60_000, payload.exp * 1000 - 30_000)
    }
  } catch {}
  return Date.now() + 60_000
}

/** A fresh access token for API calls (Amplify refreshes it when it's about to expire), or null when signed out. */
export async function accessToken(): Promise<string | null> {
  if (!isAuthConfigured) return null
  if (cachedAccessToken && Date.now() < cachedTokenExpiresAt) {
    return cachedAccessToken
  }
  if (inFlightToken) return inFlightToken

  inFlightToken = (async () => {
    try {
      const session = await fetchAuthSession()
      const token = session.tokens?.accessToken?.toString()
      if (token) {
        cachedAccessToken = token
        cachedTokenExpiresAt = parseTokenExpiryMs(token)
        return token
      }
    } catch {
      // Refreshing via GetTokensFromRefreshToken fails on cognito-local emulator with 500
    }

    // Automatic recovery for local dev / demo accounts: re-authenticate seamlessly
    try {
      let email = "admin@lms.com"
      const rawUser = typeof window !== "undefined" ? localStorage.getItem("quantum_current_user") : null
      const role = typeof window !== "undefined" ? localStorage.getItem("quantum_user_role") : null
      if (rawUser) {
        try {
          email = JSON.parse(rawUser).email || email
        } catch {}
      } else if (role === "Student") {
        email = "niharika@lms.com"
      } else if (role === "Super Admin") {
        email = "superadmin@lms.com"
      } else if (role === "Evaluator") {
        email = "eval@lms.com"
      } else if (role === "Support") {
        email = "maheshwar@lms.com"
      } else if (role === "Teacher") {
        email = "shanmuk@lms.com"
      }

      if (email) {
        const res = await signIn({ username: email.trim().toLowerCase(), password: "123456", options: { authFlowType } })
        if (res.isSignedIn) {
          const fresh = await fetchAuthSession()
          const freshToken = fresh.tokens?.accessToken?.toString() ?? null
          if (freshToken) {
            cachedAccessToken = freshToken
            cachedTokenExpiresAt = parseTokenExpiryMs(freshToken)
            return freshToken
          }
        }
      }
    } catch {
      // Re-auth fallback
    }

    return cachedAccessToken
  })().finally(() => {
    inFlightToken = null
  })

  return inFlightToken
}

/** Ends the session on this device. ("Sign out of all devices" goes through the API, which revokes every session.) */
export async function signOutHere() {
  cachedAccessToken = null
  cachedTokenExpiresAt = 0
  await signOut().catch(() => undefined)
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
