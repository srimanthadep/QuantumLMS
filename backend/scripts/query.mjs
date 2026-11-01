// Runs one SQL string as the database owner and prints the rows, one JSON object per line.
//   SUPABASE_ACCESS_TOKEN=... node backend/scripts/query.mjs "select count(*) from public.courses"
//   SUPABASE_ACCESS_TOKEN=... node backend/scripts/query.mjs --file path/to/query.sql
import { readFileSync } from "node:fs"
import { sql } from "./lib.mjs"

const i = process.argv.indexOf("--file")
const query = i > 0 ? readFileSync(process.argv[i + 1], "utf8") : process.argv.slice(2).join(" ")
if (!query.trim()) {
  console.error("Pass the SQL to run, or --file <path>.")
  process.exit(2)
}
try {
  const rows = await sql(query)
  for (const r of rows ?? []) console.log(JSON.stringify(r))
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
