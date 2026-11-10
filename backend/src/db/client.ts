import pg from "pg"
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "./schema.js"
import { sslOptions, withoutSslMode } from "./ssl.js"
import type { Config } from "../config.js"

// DATE columns stay "YYYY-MM-DD" strings: parsing them into Date objects would shift them by the server's time zone.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v)

export type Db = NodePgDatabase<typeof schema>
/** A database handle or an open transaction: helpers accept either. */
export type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0]

export function createPool(config: Pick<Config, "DATABASE_URL" | "DATABASE_SSL" | "databaseCa" | "DATABASE_POOL_MAX">): pg.Pool {
  const pool = new pg.Pool({
    connectionString: withoutSslMode(config.DATABASE_URL),
    ssl: sslOptions(config.DATABASE_SSL, config.databaseCa),
    max: config.DATABASE_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    application_name: "quantum-lms-api",
  })

  // Prevent idle connection drops or pool resets from crashing the Node.js process
  pool.on("error", (err) => {
    console.warn("[pg:pool] Unexpected error on idle client (auto-reconnecting):", err?.message || err)
  })

  return pool
}

export function createDb(pool: pg.Pool): Db {
  return drizzle(pool, { schema })
}
