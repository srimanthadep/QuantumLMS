// Dev-only: re-runs every `create or replace function` block from the migration files against the live project, so
// function bodies can be iterated on before the migrations are committed. Grants are re-applied afterwards.
//   SUPABASE_ACCESS_TOKEN=... node sync-functions.mjs
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { sql } from "../../../../backend/scripts/lib.mjs"

const DIR = fileURLToPath(new URL("../../../../backend/supabase/migrations/", import.meta.url))
const blocks = []
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".sql")).sort()) {
  const lines = readFileSync(DIR + f, "utf8").split("\n")
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("create or replace function")) continue
    const start = i
    while (i < lines.length && !/\$\$;\s*$/.test(lines[i])) i++
    blocks.push(lines.slice(start, i + 1).join("\n"))
  }
}
const grants = readFileSync(DIR + "20261029120100_student_functions.sql", "utf8").match(/revoke execute on all functions[\s\S]*?to anon, authenticated;/)[0]
const seedRevoke = "revoke execute on function app_private.seed_content(timestamptz), app_private.seed_student_demo(uuid) from public, anon, authenticated;"
await sql([...blocks, grants, seedRevoke].join("\n\n"))
console.log(`replaced ${blocks.length} functions`)
