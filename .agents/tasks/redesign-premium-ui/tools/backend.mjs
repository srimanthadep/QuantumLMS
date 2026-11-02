// Helpers the browser checks share for talking to the Quantum LMS API and Cognito outside the browser.
// Reads frontend/.env.local (Cognito pool and client) and backend/.env (DATABASE_URL, used only to remove test accounts).
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, "../../../..")

function readEnv(file) {
  try {
    return Object.fromEntries(
      readFileSync(file, "utf8")
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
        .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
    )
  } catch {
    return {}
  }
}

const web = readEnv(path.join(root, "frontend/.env.local"))
const server = readEnv(path.join(root, "backend/.env"))
export const COGNITO_ENDPOINT = (web.VITE_COGNITO_ENDPOINT || `https://cognito-idp.${web.VITE_COGNITO_REGION || "eu-north-1"}.amazonaws.com`).replace(/\/$/, "")
const CLIENT_ID = web.VITE_COGNITO_CLIENT_ID
const POOL_ID = web.VITE_COGNITO_USER_POOL_ID
const emulated = Boolean(web.VITE_COGNITO_ENDPOINT)

export const DEMO_STUDENT = { email: "aarav.mehta@learner.ai", password: "DemoStudent2026" }
export const DEMO_EVALUATOR = { email: "evaluator@quantumschool.ai", password: "DemoEvaluator2026" }

/** One Cognito API call (JSON protocol). Admin calls only work against the local emulator, which doesn't sign requests. */
export async function cognito(action, body) {
  const res = await fetch(`${COGNITO_ENDPOINT}/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": `AWSCognitoIdentityProviderService.${action}` },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Cognito ${action} failed: ${res.status} ${data.__type ?? ""} ${data.message ?? ""}`.trim())
  return data
}

/**
 * An access token for the account. Uses password sign-in (USER_PASSWORD_AUTH), which the local emulator's app client
 * allows; the AWS app client only allows SRP, so these tools are for local development.
 */
export async function signIn({ email, password }) {
  const r = await cognito("InitiateAuth", { AuthFlow: "USER_PASSWORD_AUTH", ClientId: CLIENT_ID, AuthParameters: { USERNAME: email, PASSWORD: password } })
  const token = r.AuthenticationResult?.AccessToken
  if (!token) throw new Error(`sign-in for ${email} needs ${r.ChallengeName ?? "another step"}`)
  return token
}

/** Calls the API through the site (the Vite dev server proxies /api to it). */
export async function api(base, pathname, { method = "GET", token, body } = {}) {
  const res = await fetch(`${base}/api${pathname}`, {
    method,
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { ok: res.ok, status: res.status, data }
}

/** Restores a shared demo account's data (the API also removes the files it uploaded). */
export async function resetDemo(base, account = DEMO_STUDENT, pathname = "/student/demo/reset") {
  const token = await signIn(account)
  const r = await api(base, pathname, { method: "POST", token, body: {} })
  if (!r.ok) throw new Error(`demo reset failed: ${r.status} ${JSON.stringify(r.data)}`)
}

let pool
function db() {
  if (!server.DATABASE_URL) return null
  if (!pool) {
    const require = createRequire(path.join(root, "backend/package.json"))
    const pg = require("pg")
    const url = new URL(server.DATABASE_URL)
    url.searchParams.delete("sslmode")
    pool = new pg.Pool({ connectionString: url.toString(), ssl: server.DATABASE_SSL === "disable" ? false : { rejectUnauthorized: false }, max: 1 })
  }
  return pool
}

/** Removes an account a check created: the Cognito user (emulator only) and its row in lms.users (cascades). */
export async function deleteTestAccount(email) {
  const notes = []
  if (emulated) {
    await cognito("AdminDeleteUser", { UserPoolId: POOL_ID, Username: email }).catch((e) => notes.push(String(e.message ?? e)))
  } else {
    notes.push(`left Cognito user ${email} (delete it in the console)`)
  }
  const p = db()
  if (p) await p.query("delete from lms.users where lower(email) = lower($1)", [email])
  else notes.push(`left the lms.users row for ${email} (no DATABASE_URL in backend/.env)`)
  return notes.length ? notes.join("; ") : null
}

export async function closeDb() {
  await pool?.end()
  pool = undefined
}

export const chromePath = path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright", "chromium-1140", "chrome-win", "chrome.exe")
