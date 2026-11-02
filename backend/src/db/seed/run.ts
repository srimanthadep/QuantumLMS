// Seeds (or refreshes) the shared course content and rubrics with dates relative to now, and re-seeds the demo
// student and the demo evaluator when their accounts exist. Safe to run repeatedly.
//   npm run db:seed
import { eq, sql } from "drizzle-orm"
import { createStorage } from "../../bootstrap.js"
import { loadConfig } from "../../config.js"
import { createDb, createPool } from "../client.js"
import { users } from "../schema.js"
import { seedEvaluatorDemo } from "./evaluator.js"
import { seedContent, seedStudentDemo } from "./index.js"

const config = loadConfig({ ...process.env, COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || "-", COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || "-", UPLOAD_SIGNING_SECRET: process.env.UPLOAD_SIGNING_SECRET || "seed-only-secret-value" })
const pool = createPool({ ...config, DATABASE_POOL_MAX: 2 })
const db = createDb(pool)
const started = Date.now()
const accountId = async (email: string) => (await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`).limit(1))[0]?.id
try {
  const now = new Date()
  await db.transaction((tx) => seedContent(tx, now, config.CAMPUS_TZ))
  console.log(`content seeded (${Date.now() - started} ms)`)

  const student = config.DEMO_MODE ? await accountId(config.DEMO_STUDENT_EMAIL) : undefined
  if (student) {
    await db.transaction(async (tx) => {
      await tx.update(users).set({ is_demo: true }).where(eq(users.id, student))
      await seedStudentDemo(tx, student, now, config.CAMPUS_TZ)
    })
    console.log(`demo student re-seeded (${Date.now() - started} ms)`)
  } else console.log("demo student not created yet: it is seeded when the account first signs in")

  const evaluator = config.DEMO_MODE ? await accountId(config.DEMO_EVALUATOR_EMAIL) : undefined
  if (evaluator) {
    const { storage } = createStorage(config)
    await db.transaction(async (tx) => {
      await tx.update(users).set({ is_demo: true, role: "Evaluator" }).where(eq(users.id, evaluator))
      await seedEvaluatorDemo(tx, { evaluatorId: evaluator, anchor: now, tz: config.CAMPUS_TZ, storage, demoStudentEmail: config.DEMO_STUDENT_EMAIL })
    })
    console.log(`demo evaluator re-seeded (${Date.now() - started} ms)`)
  } else console.log("demo evaluator not created yet: it is seeded when the account first signs in")
} finally {
  await pool.end()
}
