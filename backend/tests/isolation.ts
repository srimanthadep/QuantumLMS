import { timingSafeEqual } from "node:crypto"
import type pg from "pg"

/** Test helpers must never fall back to the application's DATABASE_URL. */
export function testDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.TEST_DATABASE_URL
  if (!value || !env.TEST_RUN_ID) throw new Error("Use npm test: a disposable test database and TEST_RUN_ID are required.")
  const url = new URL(value)
  if (!["postgres:", "postgresql:"].includes(url.protocol)
    || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || !/^\/quantumlms_test_[a-f0-9]{24}$/.test(url.pathname)) {
    throw new Error("Tests require a uniquely named quantumlms_test_* database on loopback.")
  }
  return value
}

export async function assertTestDatabase(pool: pg.Pool, nonce = process.env.TEST_RUN_ID): Promise<void> {
  if (!nonce) throw new Error("Missing test run identity.")
  const result = await pool.query<{ nonce: string }>("select nonce from public.quantumlms_test_guard")
  const expected = Buffer.from(nonce)
  const actual = Buffer.from(result.rows[0]?.nonce ?? "")
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Test database ownership check failed.")
}
