// Writes frontend/.env.local with the project URL and publishable key (the browser-safe key; access is enforced by RLS).
// .env* files are git-ignored.
//   SUPABASE_ACCESS_TOKEN=... node backend/scripts/frontend-env.mjs
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { apiKeys, PROJECT_URL } from "./lib.mjs"

const OUT = fileURLToPath(new URL("../../frontend/.env.local", import.meta.url))
const { publishable, anon } = await apiKeys()
const key = publishable ?? anon
if (!key) throw new Error("The project has no publishable or anon key")
writeFileSync(OUT, `VITE_SUPABASE_URL=${PROJECT_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${key}\n`)
console.log(`wrote ${OUT}`)
