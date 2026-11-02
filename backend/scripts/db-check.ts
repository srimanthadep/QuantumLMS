// Connects with DATABASE_URL and prints the server, the schemas this app owns and their table counts.
//   npm run db:check
import pg from "pg"
import { sslOptions, withoutSslMode, type SslMode } from "../src/db/ssl.js"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("Set DATABASE_URL (see backend/.env.example).")
  process.exit(2)
}
const client = new pg.Client({
  connectionString: withoutSslMode(url),
  ssl: sslOptions((process.env.DATABASE_SSL ?? "require") as SslMode, process.env.DATABASE_CA_CERT),
})
const started = Date.now()
await client.connect()
const { rows: [info] } = await client.query<{ version: string; user: string; db: string; tls: boolean }>(
  `select version(), current_user as user, current_database() as db, coalesce((select ssl from pg_stat_ssl where pid = pg_backend_pid()), false) as tls`,
)
console.log(`connected in ${Date.now() - started} ms as ${info.user} to ${info.db} (TLS: ${info.tls})`)
console.log(info.version.split(",")[0])
const { rows } = await client.query<{ schema: string; tables: string }>(
  `select n.nspname as schema, count(c.oid)::text as tables
   from pg_namespace n left join pg_class c on c.relnamespace = n.oid and c.relkind = 'r'
   where n.nspname in ('lms', 'public', 'app_private') group by 1 order by 1`,
)
for (const r of rows) console.log(`  schema ${r.schema}: ${r.tables} tables`)
await client.end()
