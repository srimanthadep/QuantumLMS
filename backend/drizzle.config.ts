import { defineConfig } from "drizzle-kit"

// `npm run db:generate` writes a migration for schema changes; `npm run db:migrate` applies pending ones.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["lms"],
  migrations: { schema: "lms", table: "__drizzle_migrations" },
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
})
