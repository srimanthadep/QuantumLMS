// Minimal Supabase REST client for the integration tests: Auth, PostgREST and Storage over fetch, no dependencies.
import { apiKeys, PROJECT_URL } from "../scripts/lib.mjs"

let keysPromise
/** URL and keys from SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY, else from the Management API. */
export async function config() {
  if (process.env.SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SECRET_KEY) {
    return { url: process.env.SUPABASE_URL || PROJECT_URL, publishable: process.env.SUPABASE_PUBLISHABLE_KEY, admin: process.env.SUPABASE_SECRET_KEY }
  }
  keysPromise ??= apiKeys()
  const k = await keysPromise
  return { url: process.env.SUPABASE_URL || PROJECT_URL, publishable: k.publishable ?? k.anon, admin: k.serviceRole ?? k.secret }
}

export class Client {
  constructor(cfg, token = null) {
    this.cfg = cfg
    this.token = token
    this.user = null
  }

  async request(path, { method = "GET", body, headers = {}, raw = false } = {}) {
    const res = await fetch(`${this.cfg.url}${path}`, {
      method,
      headers: {
        apikey: this.cfg.publishable,
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(raw ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
    })
    const text = await res.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }
    return { status: res.status, ok: res.ok, data, error: res.ok ? null : data }
  }

  async signUp(email, password, meta = {}) {
    const r = await this.request("/auth/v1/signup", { method: "POST", body: { email, password, data: meta } })
    if (!r.ok || !r.data?.access_token) throw new Error(`sign-up failed: ${r.status} ${JSON.stringify(r.data)}`)
    this.token = r.data.access_token
    this.user = r.data.user
    return this
  }

  async signIn(email, password) {
    const r = await this.request("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } })
    if (!r.ok) throw new Error(`sign-in failed: ${r.status} ${JSON.stringify(r.data)}`)
    this.token = r.data.access_token
    this.user = r.data.user
    return this
  }

  select(table, query = "select=*") {
    return this.request(`/rest/v1/${table}?${query}`)
  }
  insert(table, row) {
    return this.request(`/rest/v1/${table}`, { method: "POST", body: row, headers: { Prefer: "return=representation" } })
  }
  update(table, filter, patch) {
    return this.request(`/rest/v1/${table}?${filter}`, { method: "PATCH", body: patch, headers: { Prefer: "return=representation" } })
  }
  remove(table, filter) {
    return this.request(`/rest/v1/${table}?${filter}`, { method: "DELETE", headers: { Prefer: "return=representation" } })
  }
  rpc(fn, args = {}) {
    return this.request(`/rest/v1/rpc/${fn}`, { method: "POST", body: args })
  }
  upload(bucket, path, content, type = "text/plain") {
    return this.request(`/storage/v1/object/${bucket}/${path}`, { method: "POST", body: content, raw: true, headers: { "Content-Type": type } })
  }
}

/** Deletes an auth user (cascades to the profile and everything the student owns). */
export async function deleteUser(cfg, id) {
  const res = await fetch(`${cfg.url}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: { apikey: cfg.admin, Authorization: `Bearer ${cfg.admin}` } })
  if (!res.ok) throw new Error(`deleting ${id} failed: ${res.status} ${await res.text()}`)
}

/** Removes every object under `prefix` (a "<user id>/" folder) with the admin key. Returns how many were deleted. */
export async function emptyFolder(cfg, bucket, prefix) {
  const headers = { apikey: cfg.admin, Authorization: `Bearer ${cfg.admin}`, "Content-Type": "application/json" }
  const files = []
  const walk = async (dir) => {
    const res = await fetch(`${cfg.url}/storage/v1/object/list/${bucket}`, { method: "POST", headers, body: JSON.stringify({ prefix: dir, limit: 1000 }) })
    if (!res.ok) return
    for (const item of await res.json()) {
      const full = `${dir}${item.name}`
      if (item.id) files.push(full)
      else await walk(`${full}/`)
    }
  }
  await walk(prefix.endsWith("/") ? prefix : `${prefix}/`)
  if (files.length) await fetch(`${cfg.url}/storage/v1/object/${bucket}`, { method: "DELETE", headers, body: JSON.stringify({ prefixes: files }) })
  return files.length
}
