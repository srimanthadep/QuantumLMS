import pg from "pg"
import { sslOptions, withoutSslMode, type SslMode } from "../src/db/ssl.js"
import { confirmDestructiveRun } from "./destructive-guard.js"

const url = process.env.DATABASE_URL
confirmDestructiveRun({ script: "wipe-courses-and-students", databaseUrl: url })

const client = new pg.Client({
  connectionString: withoutSslMode(url!),
  ssl: sslOptions((process.env.DATABASE_SSL ?? "verify") as SslMode, process.env.DATABASE_CA_CERT),
})

// Children before parents. Tables that don't exist in this database are skipped.
const courseTables = [
  "assignment_submissions",
  "assignments",
  "quiz_attempts",
  "quiz_questions",
  "quizzes",
  "course_materials",
  "lesson_progress",
  "lessons",
  "course_modules",
  "course_question_votes",
  "course_questions",
  "timetable_slots",
  "certificates",
  "enrollments",
  "courses",
]

const studentTables = [
  "notifications",
  "resumes",
  "interview_sessions",
  "support_chat_messages",
  "ticket_replies",
  "placement_support_requests",
  "support_tickets",
  "faq_votes",
  "notes",
  "announcement_reads",
  "event_registrations",
  "reminders",
  "leave_requests",
  "attendance_records",
  "gpa_history",
  "grades",
  "study_activity",
  "post_likes",
  "post_saves",
  "squad_members",
  "post_replies",
  "community_posts",
  "profiles",
]

async function run() {
  await client.connect()
  console.log("Connected. Wiping courses and students in one transaction; any error rolls everything back.")
  await client.query("begin")
  try {
    for (const table of [...courseTables, ...studentTables]) {
      const exists = await client.query("select to_regclass($1) as t", [`lms."${table}"`])
      if (!exists.rows[0].t) {
        console.log(`- Skipped lms.${table} (not in this database)`)
        continue
      }
      const res = await client.query(`DELETE FROM lms."${table}"`)
      console.log(`✓ Cleared lms.${table} (${res.rowCount} rows)`)
    }
    // Keep staff users: Admin, Super Admin, Teacher, Evaluator, Support.
    const res = await client.query(`DELETE FROM lms.users WHERE role = 'Student'`)
    console.log(`✓ Cleared student rows from lms.users (${res.rowCount} rows)`)
    await client.query("commit")
  } catch (e) {
    await client.query("rollback")
    throw new Error(`Nothing was deleted; the wipe was rolled back. ${(e as Error).message}`)
  }

  const coursesCount = await client.query("SELECT count(*) FROM lms.courses")
  const studentsCount = await client.query("SELECT count(*) FROM lms.users WHERE role = 'Student'")
  const usersCount = await client.query("SELECT count(*) FROM lms.users")

  console.log("\n==============================")
  console.log(`FINAL COURSES COUNT: ${coursesCount.rows[0].count}`)
  console.log(`FINAL STUDENTS COUNT: ${studentsCount.rows[0].count}`)
  console.log(`REMAINING STAFF USERS: ${usersCount.rows[0].count}`)
  console.log("==============================\n")
}

run()
  .catch((e) => {
    console.error("FATAL WIPE ERROR:", e)
    process.exitCode = 1
  })
  .finally(() => client.end())
