// Applies pending migrations from backend/drizzle (each in its own transaction, recorded in lms.__drizzle_migrations).
//   npm run db:migrate           (locally, reads backend/.env)
//   node dist/db/migrate.js      (in the container, before the server starts)
import { fileURLToPath } from "node:url"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { loadConfig } from "../config.js"
import { createDb, createPool } from "./client.js"

const config = loadConfig({ ...process.env, COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || "-", COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || "-", UPLOAD_SIGNING_SECRET: process.env.UPLOAD_SIGNING_SECRET || "migrations-only-secret" })
const pool = createPool({ ...config, DATABASE_POOL_MAX: 1 })
const folder = fileURLToPath(new URL("../../drizzle", import.meta.url))
const started = Date.now()
try {
  await migrate(createDb(pool), { migrationsFolder: folder, migrationsSchema: "lms", migrationsTable: "__drizzle_migrations" })
  const { rows } = await pool.query<{ n: string }>("select count(*)::text as n from lms.__drizzle_migrations")
  console.log(`migrations up to date (${rows[0].n} applied) in ${Date.now() - started} ms`)
} finally {
  await pool.end()
}
