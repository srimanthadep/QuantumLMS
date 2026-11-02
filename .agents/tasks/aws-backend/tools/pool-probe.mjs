// Opens connections through DATABASE_URL one by one until the server refuses, to find the pooler's client limit.
//   node pool-probe.mjs [max]
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../..")
const env = Object.fromEntries(
  readFileSync(path.join(root, "backend/.env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
)
const pg = createRequire(path.join(root, "backend/package.json"))("pg")
const max = Number(process.argv[2] ?? 30)
const clients = []
try {
  for (let i = 1; i <= max; i++) {
    const c = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    try {
      await c.connect()
      await c.query("select 1")
      clients.push(c)
    } catch (e) {
      console.log(`connection ${i} refused: ${e.message}`)
      break
    }
  }
  console.log(`held ${clients.length} connections at once`)
} finally {
  await Promise.all(clients.map((c) => c.end().catch(() => undefined)))
}
