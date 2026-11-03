import type { LoginInput } from "@/app/session"
import type { UserRole } from "@/types"
import { api, ApiError } from "@/lib/api"
import {
  AuthError,
  confirmEmail,
  confirmSignInStep,
  finishPasswordReset,
  isAuthConfigured,
  meetsPasswordPolicy,
  PASSWORD_RULE,
  resendEmailCode,
  signInWithEmail,
  signOutHere,
  signUpWithEmail,
  startPasswordReset,
} from "@/lib/auth"

/**
 * Sign-in with Amazon Cognito for the portals that run on the API (students and evaluators). The portal a person
 * lands in follows their Cognito group, whichever role tab they signed in from. The other portals still run on demo
 * data and keep the demo sign-in.
 */
export const usesAccounts = (role: UserRole) =>
  role === "Student" || role === "Evaluator" || role === "Support" || role === "Admin" || role === "Super Admin"

export type AccountStep = LoginInput | "mfa" | "confirm"

function ensureConfigured() {
  if (!isAuthConfigured) throw new ApiError("Sign-in isn't configured on this server yet.")
}
const asApi = (e: unknown) => (e instanceof AuthError ? new ApiError(e.message) : (e as Error))

/** The portal session for the signed-in account (the API creates the account and its profile on the first call). */
async function loginFor(): Promise<LoginInput> {
  try {
    const me = await api.get<{ id: string; email: string; full_name: string; avatar_url: string | null; role: UserRole }>("/me", "Your account couldn't be loaded. Try again.")
    return { id: me.id, name: me.full_name, role: me.role, email: me.email, avatar: me.avatar_url ?? undefined }
  } catch (e) {
    await signOutHere()
    throw e
  }
}

/** Signs in; resolves to "mfa" when an authenticator code is needed, or "confirm" when the email isn't confirmed. */
export async function accountSignIn(email: string, password: string): Promise<AccountStep> {
  ensureConfigured()
  try {
    const step = await signInWithEmail(email, password)
    if (step === "mfa") return "mfa"
    if (step === "confirm-email") {
      await resendEmailCode(email).catch(() => undefined)
      return "confirm"
    }
    if (step === "new-password") throw new ApiError('This account needs a new password. Use "Forgot password" to set one.')
    return loginFor()
  } catch (e) {
    throw asApi(e)
  }
}

/** Creates a student account; Cognito emails a code that accountConfirmEmail checks. */
export async function studentSignUp(fullName: string, email: string, password: string): Promise<AccountStep> {
  ensureConfigured()
  if (fullName.trim().length < 2) throw new ApiError("Enter your full name.")
  if (!meetsPasswordPolicy(password)) throw new ApiError(PASSWORD_RULE)
  try {
    const step = await signUpWithEmail(fullName, email, password)
    if (step === "confirm-email") return "confirm"
    return accountSignIn(email, password)
  } catch (e) {
    throw asApi(e)
  }
}

/** Confirms the emailed code, then signs in with the password from the sign-up form. */
export async function accountConfirmEmail(email: string, code: string, password: string): Promise<AccountStep> {
  try {
    await confirmEmail(email, code)
  } catch (e) {
    throw asApi(e)
  }
  return accountSignIn(email, password)
}

export async function accountResendCode(email: string) {
  try {
    await resendEmailCode(email)
  } catch (e) {
    throw asApi(e)
  }
}

/** Completes a sign-in that needs the authenticator code. */
export async function accountVerifyCode(code: string): Promise<LoginInput> {
  try {
    const step = await confirmSignInStep(code)
    if (step !== "done") throw new ApiError("That code didn't work. Enter the current 6-digit code.")
    return loginFor()
  } catch (e) {
    throw asApi(e)
  }
}

export async function accountForgotPassword(email: string) {
  ensureConfigured()
  try {
    await startPasswordReset(email)
  } catch (e) {
    throw asApi(e)
  }
}

export async function accountResetPassword(email: string, code: string, newPassword: string) {
  if (!meetsPasswordPolicy(newPassword)) throw new ApiError(PASSWORD_RULE)
  try {
    await finishPasswordReset(email, code, newPassword)
  } catch (e) {
    throw asApi(e)
  }
}

export async function cancelAccountSignIn() {
  await signOutHere()
}
