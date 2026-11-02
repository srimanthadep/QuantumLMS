// Seeds (or refreshes) the shared course content with dates relative to now, and re-seeds the demo student when its
// account exists. Safe to run repeatedly.
//   npm run db:seed
import { eq, sql } from "drizzle-orm"
import { loadConfig } from "../../config.js"
import { createDb, createPool } from "../client.js"
import { users } from "../schema.js"
import { seedContent, seedStudentDemo } from "./index.js"

const config = loadConfig({ ...process.env, COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || "-", COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || "-", UPLOAD_SIGNING_SECRET: process.env.UPLOAD_SIGNING_SECRET || "seed-only-secret-value" })
const pool = createPool({ ...config, DATABASE_POOL_MAX: 2 })
const db = createDb(pool)
const started = Date.now()
try {
  const now = new Date()
  await db.transaction((tx) => seedContent(tx, now, config.CAMPUS_TZ))
  console.log(`content seeded (${Date.now() - started} ms)`)
  const [demo] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${config.DEMO_STUDENT_EMAIL.toLowerCase()}`).limit(1)
  if (demo && config.DEMO_MODE) {
    await db.transaction(async (tx) => {
      await tx.update(users).set({ is_demo: true }).where(eq(users.id, demo.id))
      await seedStudentDemo(tx, demo.id, now, config.CAMPUS_TZ)
    })
    console.log(`demo student re-seeded (${Date.now() - started} ms)`)
  } else console.log("demo student not created yet: it is seeded when the account first signs in")
} finally {
  await pool.end()
}
