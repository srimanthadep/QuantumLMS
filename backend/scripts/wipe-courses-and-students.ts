import pg from "pg"
import { sslOptions, withoutSslMode, type SslMode } from "../src/db/ssl.js"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("Set DATABASE_URL.")
  process.exit(1)
}

const client = new pg.Client({
  connectionString: withoutSslMode(url),
  ssl: sslOptions((process.env.DATABASE_SSL ?? "require") as SslMode, process.env.DATABASE_CA_CERT),
})

async function run() {
  await client.connect()
  console.log("Connected to database. Starting complete wipe of courses and students...")

  // 1. Delete course-related tables in correct dependency order
  const courseTables = [
    "evaluation_scores",
    "student_evaluations",
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

  for (const table of courseTables) {
    try {
      const res = await client.query(`DELETE FROM lms."${table}"`)
      console.log(`✓ Cleared lms.${table} (${res.rowCount} rows)`)
    } catch (e) {
      console.warn(`! Could not clear lms.${table}:`, (e as Error).message)
    }
  }

  // 2. Clear student activities, records and profiles
  const studentTables = [
    "notifications",
    "resumes",
    "interview_sessions",
    "support_chat_messages",
    "support_tickets",
    "ticket_replies",
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
    "community_posts",
    "post_replies",
    "profiles",
  ]

  for (const table of studentTables) {
    try {
      const res = await client.query(`DELETE FROM lms."${table}"`)
      console.log(`✓ Cleared lms.${table} (${res.rowCount} rows)`)
    } catch (e) {
      console.warn(`! Could not clear lms.${table}:`, (e as Error).message)
    }
  }

  // 3. Clear all student users (keep staff users: Admin, Super Admin, Teacher, Evaluator, Support)
  try {
    const res = await client.query(`DELETE FROM lms.users WHERE role = 'Student'`)
    console.log(`✓ Cleared student rows from lms.users (${res.rowCount} rows)`)
  } catch (e) {
    console.warn(`! Could not clear students from lms.users:`, (e as Error).message)
  }

  // 4. Verify counts
  const coursesCount = await client.query("SELECT count(*) FROM lms.courses")
  const studentsCount = await client.query("SELECT count(*) FROM lms.users WHERE role = 'Student'")
  const usersCount = await client.query("SELECT count(*) FROM lms.users")

  console.log("\n==============================")
  console.log(`FINAL COURSES COUNT: ${coursesCount.rows[0].count}`)
  console.log(`FINAL STUDENTS COUNT: ${studentsCount.rows[0].count}`)
  console.log(`REMAINING STAFF USERS: ${usersCount.rows[0].count}`)
  console.log("==============================\n")

  await client.end()
}

run().catch((e) => {
  console.error("FATAL WIPE ERROR:", e)
  process.exit(1)
})
