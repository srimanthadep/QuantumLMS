import type pg from "pg"

export type SslMode = "require" | "verify" | "disable"

/** require: encrypted without certificate checks; verify: encrypted and checked against the CA; disable: plain. */
export function sslOptions(mode: SslMode, ca?: string): pg.PoolConfig["ssl"] {
  if (mode === "disable") return false
  if (mode === "verify") return { rejectUnauthorized: true, ca }
  return { rejectUnauthorized: false }
}

/** The connection string without sslmode, so the ssl option decides how TLS is used. */
export function withoutSslMode(url: string): string {
  const u = new URL(url)
  u.searchParams.delete("sslmode")
  return u.toString()
}
