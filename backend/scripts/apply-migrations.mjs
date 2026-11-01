// Applies backend/supabase/migrations/*.sql that the project hasn't run yet, in file-name order. Each file runs in one
// transaction together with its row in supabase_migrations.schema_migrations (the Supabase CLI's history table, so
// `supabase migration list` and `supabase db push` agree with this script).
//
//   SUPABASE_ACCESS_TOKEN=... node backend/scripts/apply-migrations.mjs [--status]
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { literal, PROJECT_REF, sql } from "./lib.mjs"

const DIR = fileURLToPath(new URL("../supabase/migrations/", import.meta.url))
const files = readdirSync(DIR).filter((f) => /^\d{14}_.+\.sql$/.test(f)).sort()

await sql(`
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
`)
const applied = new Set((await sql("select version from supabase_migrations.schema_migrations")).map((r) => r.version))

console.log(`Project ${PROJECT_REF}: ${applied.size} migration(s) applied, ${files.length} in the repo.`)
for (const file of files) {
  const version = file.slice(0, 14)
  const name = file.slice(15, -4)
  if (applied.has(version)) {
    console.log(`  = ${file}`)
    continue
  }
  if (process.argv.includes("--status")) {
    console.log(`  ! ${file} (pending)`)
    continue
  }
  const body = readFileSync(DIR + file, "utf8")
  const started = Date.now()
  try {
    await sql(`${body}\n;\ninsert into supabase_migrations.schema_migrations (version, name) values (${literal(version)}, ${literal(name)});`)
  } catch (e) {
    console.error(`  x ${file}\n${e.message}`)
    process.exit(1)
  }
  console.log(`  + ${file} (${Date.now() - started} ms)`)
}
