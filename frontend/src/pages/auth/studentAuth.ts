import type { LoginInput } from "@/app/session"
import { api, ApiError, type StudentProfile } from "@/lib/api"
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

/** Student accounts sign in with Amazon Cognito; the portals that still run on demo data keep the demo sign-in. */

export type StudentStep = LoginInput | "mfa" | "confirm"

function ensureConfigured() {
  if (!isAuthConfigured) throw new ApiError("Student sign-in isn't configured on this server yet.")
}
const asApi = (e: unknown) => (e instanceof AuthError ? new ApiError(e.message) : (e as Error))

/** The portal session for the signed-in student (the API creates the profile on the first call). */
async function loginFor(): Promise<LoginInput> {
  try {
    const p = await api.get<StudentProfile>("/student/profile", "Your student profile couldn't be loaded. Try again.")
    return { id: p.id, name: p.full_name, role: "Student", email: p.email, avatar: p.avatar_url ?? undefined, title: p.headline }
  } catch (e) {
    await signOutHere()
    throw e
  }
}

/** Signs in; resolves to "mfa" when an authenticator code is needed, or "confirm" when the email isn't confirmed. */
export async function studentSignIn(email: string, password: string): Promise<StudentStep> {
  ensureConfigured()
  try {
    const step = await signInWithEmail(email, password)
    if (step === "mfa") return "mfa"
    if (step === "confirm-email") {
      await resendEmailCode(email).catch(() => undefined)
      return "confirm"
    }
    if (step === "new-password") throw new ApiError("This account needs a new password. Use \"Forgot password\" to set one.")
    return loginFor()
  } catch (e) {
    throw asApi(e)
  }
}

/** Creates the account; Cognito emails a code that studentConfirmEmail checks. */
export async function studentSignUp(fullName: string, email: string, password: string): Promise<StudentStep> {
  ensureConfigured()
  if (fullName.trim().length < 2) throw new ApiError("Enter your full name.")
  if (!meetsPasswordPolicy(password)) throw new ApiError(PASSWORD_RULE)
  try {
    const step = await signUpWithEmail(fullName, email, password)
    if (step === "confirm-email") return "confirm"
    return studentSignIn(email, password)
  } catch (e) {
    throw asApi(e)
  }
}

/** Confirms the emailed code, then signs in with the password from the sign-up form. */
export async function studentConfirmEmail(email: string, code: string, password: string): Promise<StudentStep> {
  try {
    await confirmEmail(email, code)
  } catch (e) {
    throw asApi(e)
  }
  return studentSignIn(email, password)
}

export async function studentResendCode(email: string) {
  try {
    await resendEmailCode(email)
  } catch (e) {
    throw asApi(e)
  }
}

/** Completes a sign-in that needs the authenticator code. */
export async function studentVerifyCode(code: string): Promise<LoginInput> {
  try {
    const step = await confirmSignInStep(code)
    if (step !== "done") throw new ApiError("That code didn't work. Enter the current 6-digit code.")
    return loginFor()
  } catch (e) {
    throw asApi(e)
  }
}

export async function studentForgotPassword(email: string) {
  ensureConfigured()
  try {
    await startPasswordReset(email)
  } catch (e) {
    throw asApi(e)
  }
}

export async function studentResetPassword(email: string, code: string, newPassword: string) {
  if (!meetsPasswordPolicy(newPassword)) throw new ApiError(PASSWORD_RULE)
  try {
    await finishPasswordReset(email, code, newPassword)
  } catch (e) {
    throw asApi(e)
  }
}

export async function cancelStudentSignIn() {
  await signOutHere()
}
