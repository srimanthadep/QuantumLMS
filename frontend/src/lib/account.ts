import { getCurrentUser } from "aws-amplify/auth"
import { api, ApiError } from "@/lib/api"
import { beginTotpSetup, changePassword as cognitoChangePassword, disableTotp, finishTotpSetup, isTotpEnabled } from "@/lib/auth"

/** Account security through Cognito: password, authenticator app and sessions. */

export async function changePassword(_email: string, current: string, next: string) {
  try {
    await cognitoChangePassword(current, next)
  } catch (e) {
    throw new ApiError((e as Error).message)
  }
}

export interface TotpFactor {
  id: string
  friendlyName?: string
  createdAt: string
}

/** Cognito keeps one authenticator per account. */
export async function listTotpFactors(): Promise<TotpFactor[]> {
  return (await isTotpEnabled()) ? [{ id: "totp", friendlyName: "Authenticator app", createdAt: "" }] : []
}

export interface TotpEnrollment {
  factorId: string
  /** SVG data URL to scan with an authenticator app. */
  qrCode: string
  secret: string
}

export async function enrollTotp(): Promise<TotpEnrollment> {
  let account = "account"
  try {
    const u = await getCurrentUser()
    account = u.signInDetails?.loginId ?? u.username
  } catch {
    // keep the generic label
  }
  try {
    const setup = await beginTotpSetup(account)
    return { factorId: "totp", qrCode: setup.qrCode, secret: setup.secret }
  } catch (e) {
    throw new ApiError((e as Error).message)
  }
}

export async function verifyTotp(_factorId: string, code: string) {
  try {
    await finishTotpSetup(code)
  } catch (e) {
    throw new ApiError((e as Error).message)
  }
}

export async function unenrollTotp(_factorId: string) {
  try {
    await disableTotp()
  } catch (e) {
    throw new ApiError((e as Error).message)
  }
}

/**
 * Ends every session of this account, this device included: Cognito revokes the refresh tokens and the API stops
 * accepting the access tokens issued so far. The caller then signs out here.
 */
export async function signOutAllDevices() {
  await api.post("/me/sign-out-everywhere", {}, "Couldn't sign out of all devices. Try again.")
}

/** "Chrome on Windows" from the user agent. */
export function describeDevice(ua = navigator.userAgent): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser"
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "your device"
  return `${browser} on ${os}`
}
