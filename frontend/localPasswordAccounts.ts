import { readFileSync } from "node:fs"
import type { Plugin } from "vite"

const MODULE_ID = "virtual:local-password-accounts"
const RESOLVED_ID = `\0${MODULE_ID}`
const ROLES = ["Super Admin", "Admin", "Teacher", "Evaluator", "Support", "Student"] as const
const isLoopback = (hostname: string) => ["localhost", "127.0.0.1", "[::1]"].includes(hostname)

export function allowsSavedAccounts(command: string, preview: boolean, env: Record<string, string>): boolean {
  if (command !== "serve" || preview || !env.VITE_COGNITO_USER_POOL_ID?.startsWith("local_")) return false
  try {
    const endpoint = new URL(env.VITE_COGNITO_ENDPOINT)
    return ["http:", "https:"].includes(endpoint.protocol) && isLoopback(endpoint.hostname)
  } catch { return false }
}

/** Saved passwords are read only by the loopback dev server, never by a build or preview. */
export default function localPasswordAccounts(enabled: boolean, file: string): Plugin {
  return {
    name: "local-password-accounts",
    resolveId(id) { if (id === MODULE_ID) return RESOLVED_ID },
    load(id) {
      if (id !== RESOLVED_ID) return
      if (!enabled) return "export default []"
      try {
        const saved: unknown = JSON.parse(readFileSync(file, "utf8"))
        if (!Array.isArray(saved)) throw new Error("Invalid saved accounts")
        const accounts = ROLES.flatMap(role => {
          const email = `${role.toLowerCase().replace(/ /g, "")}.test@lms.com`
          const account = saved.find(a => a?.role === role && a.email === email && typeof a.password === "string" && a.password.length >= 10)
          return account ? [{ role, email, password: account.password }] : []
        })
        return `export default ${JSON.stringify(accounts)}`
      } catch {
        this.warn("Saved local accounts unavailable. Run backend's cognito:accounts:local script, then restart Vite.")
        return "export default []"
      }
    },
    configureServer(server) {
      if (!enabled) return
      server.middlewares.use((req, res, next) => {
        // Keep the saved credentials private even if a local proxy forwards requests here.
        const peer = req.socket.remoteAddress
        let localHost = false
        let localOrigin = !req.headers.origin
        try {
          localHost = isLoopback(new URL(`http://${req.headers.host}`).hostname)
          if (req.headers.origin) localOrigin = isLoopback(new URL(req.headers.origin).hostname)
        } catch { /* Invalid hosts and origins are refused. */ }
        if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(peer ?? "") || !localHost || !localOrigin) {
          res.statusCode = 403
          res.end("Local development access only")
          return
        }
        if (req.url?.includes("local-password-accounts")) res.setHeader("Cache-Control", "no-store")
        next()
      })
    },
  }
}
