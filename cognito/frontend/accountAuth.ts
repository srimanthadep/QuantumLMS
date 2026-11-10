import type { LoginInput } from "@/app/session"
import type { UserRole } from "@/types"
import { api, ApiError } from "@/lib/api"
import { setStoredAccessToken, signOutHere, meetsPasswordPolicy, PASSWORD_RULE } from "@/lib/auth"

/**
 * Sign-in with Amazon Cognito as the backend for the portals that run on the API.
 */
export const usesAccounts = (role: UserRole) =>
  role === "Student" || role === "Evaluator" || role === "Support" || role === "Admin" || role === "Super Admin"

export type AccountStep = LoginInput | "mfa" | "confirm"

let pendingMfaSession: { session?: string; username?: string } | null = null
let lastSignedUpUsername: string | null = null

/** Signs in via backend SRP against AWS Cognito; resolves to "mfa" when an authenticator code is needed, or "confirm" when unconfirmed. */
export async function accountSignIn(email: string, password: string): Promise<AccountStep> {
  try {
    const res = await api.post<{
      step: "done" | "mfa" | "confirm"
      session?: string
      challengeName?: string
      user?: { id: string; name: string; role: UserRole; email: string; avatar?: string }
      tokens?: { accessToken: string; idToken?: string; refreshToken?: string }
    }>("/auth/signin", { email: email.trim().toLowerCase(), password }, "Sign-in failed. Please check your credentials.")

    if (res.step === "mfa") {
      pendingMfaSession = { session: res.session, username: email.trim().toLowerCase() }
      return "mfa"
    }

    if (res.step === "confirm") {
      return "confirm"
    }

    if (res.step === "done" && res.user) {
      if (res.tokens?.accessToken) {
        setStoredAccessToken(res.tokens.accessToken)
      }
      return {
        id: res.user.id,
        name: res.user.name,
        role: res.user.role,
        email: res.user.email,
        avatar: res.user.avatar,
      }
    }

    throw new ApiError("Sign-in failed. Please check your credentials.")
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError((e as Error).message || "Sign-in failed.")
  }
}

/** Creates a student account directly in AWS Cognito User Pool via backend API. */
export async function studentSignUp(
  fullName: string,
  email: string,
  password: string,
  phone?: string
): Promise<AccountStep> {
  if (fullName.trim().length < 2) throw new ApiError("Enter your full name.")
  if (!meetsPasswordPolicy(password)) throw new ApiError(PASSWORD_RULE)

  try {
    const res = await api.post<{
      step: "confirm" | "done"
      email?: string
      username?: string
      message?: string
      user?: { id: string; name: string; role: UserRole; email: string; avatar?: string }
      tokens?: { accessToken: string }
    }>(
      "/auth/signup",
      {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone?.trim(),
      },
      "Unable to create your account."
    )

    if (res.step === "confirm") {
      if (res.username) {
        lastSignedUpUsername = res.username
      }
      return "confirm"
    }

    if (res.step === "done" && res.user) {
      if (res.tokens?.accessToken) {
        setStoredAccessToken(res.tokens.accessToken)
      }
      return {
        id: res.user.id,
        name: res.user.name,
        role: res.user.role,
        email: res.user.email,
        avatar: res.user.avatar,
      }
    }

    return accountSignIn(email, password)
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError((e as Error).message || "Unable to create your account.")
  }
}

/** Confirms the emailed/SMS code, then immediately signs in with the password. */
export async function accountConfirmEmail(email: string, code: string, password?: string): Promise<AccountStep> {
  try {
    const res = await api.post<{
      step: "done" | "confirmed"
      user?: { id: string; name: string; role: UserRole; email: string; avatar?: string }
      tokens?: { accessToken: string }
    }>(
      "/auth/confirm-code",
      {
        email: email.trim().toLowerCase(),
        username: lastSignedUpUsername || undefined,
        code: code.trim(),
        password,
      },
      "Verification code confirmation failed."
    )

    if (res.step === "done" && res.user) {
      if (res.tokens?.accessToken) {
        setStoredAccessToken(res.tokens.accessToken)
      }
      return {
        id: res.user.id,
        name: res.user.name,
        role: res.user.role,
        email: res.user.email,
        avatar: res.user.avatar,
      }
    }

    if (password) {
      return accountSignIn(email, password)
    }

    return "confirm"
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError((e as Error).message || "Verification code confirmation failed.")
  }
}

export async function accountResendCode(email: string) {
  try {
    await api.post("/auth/resend-code", { email: email.trim().toLowerCase() }, "Unable to resend code.")
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError((e as Error).message || "Unable to resend code.")
  }
}

/** Completes a sign-in that needs the authenticator code. */
export async function accountVerifyCode(code: string): Promise<LoginInput> {
  if (!pendingMfaSession?.session) {
    throw new ApiError("MFA session expired. Please sign in again.")
  }
  try {
    const res = await api.post<{
      step: "done"
      user: { id: string; name: string; role: UserRole; email: string; avatar?: string }
      tokens?: { accessToken: string }
    }>(
      "/auth/mfa-verify",
      {
        code: code.trim(),
        session: pendingMfaSession.session,
        username: pendingMfaSession.username,
      },
      "Invalid MFA code."
    )

    if (res.tokens?.accessToken) {
      setStoredAccessToken(res.tokens.accessToken)
    }
    pendingMfaSession = null
    return {
      id: res.user.id,
      name: res.user.name,
      role: res.user.role,
      email: res.user.email,
      avatar: res.user.avatar,
    }
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError((e as Error).message || "Invalid MFA code.")
  }
}

export async function accountForgotPassword(email: string) {
  try {
    await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() }, "Could not send reset code.")
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError((e as Error).message || "Could not send reset code.")
  }
}

export async function accountResetPassword(email: string, code: string, newPassword: string) {
  if (!meetsPasswordPolicy(newPassword)) throw new ApiError(PASSWORD_RULE)
  try {
    await api.post(
      "/auth/reset-password",
      {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      },
      "Could not update password."
    )
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError((e as Error).message || "Could not update password.")
  }
}

export async function cancelAccountSignIn() {
  pendingMfaSession = null
  await signOutHere()
}
