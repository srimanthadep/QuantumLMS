// Shared helpers for the backend scripts. Uses the Supabase Management API with a personal access token from the
// environment (SUPABASE_ACCESS_TOKEN); nothing secret is stored in the repo.
export const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "yydvlrfsjmpwqthsmzyp"
export const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}`

function token() {
  const t = process.env.SUPABASE_ACCESS_TOKEN
  if (!t) {
    console.error("Set SUPABASE_ACCESS_TOKEN to a Supabase personal access token (supabase.com/dashboard/account/tokens).")
    process.exit(2)
  }
  return t
}

export async function management(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${data?.message ?? text}`)
  return data
}

/** Runs SQL as the database owner. A multi-statement string runs in one transaction. */
export const sql = (query) => management("/database/query", { method: "POST", body: { query } })

/** The project's API keys (publishable/secret and the legacy anon/service_role JWTs). */
export async function apiKeys() {
  const keys = await management("/api-keys?reveal=true")
  const find = (pred) => keys.find(pred)?.api_key
  return {
    publishable: find((k) => k.type === "publishable"),
    secret: find((k) => k.type === "secret"),
    anon: find((k) => k.name === "anon"),
    serviceRole: find((k) => k.name === "service_role"),
  }
}

export const literal = (s) => `'${String(s).replace(/'/g, "''")}'`
