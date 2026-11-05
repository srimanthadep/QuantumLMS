import { pgSchema, foreignKey, unique, check, uuid, text, integer, jsonb, boolean, timestamp, index, time, uniqueIndex, numeric, bigint, date, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

/**
 * The whole data model: tables, constraints and indexes only. Every rule that needs code lives in the API.
 * Property names match the column names (snake_case), so rows reach the browser in the shape the pages expect.
 */

/** Every table lives in this schema. Supabase exposes "public" to its browser API, so nothing goes there. */
export const lms = pgSchema("lms")

export const ROLES = ["Student", "Teacher", "Evaluator", "Support", "Admin", "Super Admin"] as const
export type Role = (typeof ROLES)[number]

export const roll_number_seq = lms.sequence("roll_number_seq", { startWith: 100 })
export const ticket_number_seq = lms.sequence("ticket_number_seq", { startWith: 92146 })

/**
 * Every account. Cognito owns sign-in: cognito_sub links a Cognito user to its row, and is null for seeded demo
 * learners, who can't sign in. The role follows the user's Cognito groups at each sign-in.
 * sessions_revoked_at is set by "sign out of all devices": access tokens issued at or before it are refused.
 */
export const users = lms.table("users", {
  id: uuid().primaryKey().defaultRandom().notNull(),
  cognito_sub: text(),
  email: text().notNull(),
  full_name: text().notNull(),
  avatar_url: text(),
  role: text().default("Student").notNull(),
  is_demo: boolean().default(false).notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
  last_seen_at: timestamp({ withTimezone: true, mode: "date" }),
  sessions_revoked_at: timestamp({ withTimezone: true, mode: "date" }),
}, (table) => [
  unique("users_cognito_sub_key").on(table.cognito_sub),
  uniqueIndex("users_email_key").using("btree", sql`lower(${table.email})`),
  check("users_role_check", sql`role = ANY (ARRAY['Student'::text, 'Teacher'::text, 'Evaluator'::text, 'Support'::text, 'Admin'::text, 'Super Admin'::text])`),
  check("users_full_name_check", sql`(char_length(full_name) >= 1) AND (char_length(full_name) <= 120)`),
  check("users_avatar_url_check", sql`(avatar_url IS NULL) OR (avatar_url ~ '^(https://|/assets/|/api/files/)'::text)`),
]);

/** Runtime state that must survive restarts, such as the demo calendar anchor. */
export const app_state = lms.table("app_state", {
  key: text().primaryKey().notNull(),
  value: jsonb().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

/** Student details, one row per student user. Name, email and photo are on users. */
export const profiles = lms.table("profiles", {
  id: uuid().primaryKey().notNull(),
  headline: text().default('Learner').notNull(),
  roll_number: text().notNull(),
  phone: text().default("").notNull(),
  location: text().default("").notNull(),
  bio: text().default("").notNull(),
  program: text().default('Bachelor of Science in Artificial Intelligence').notNull(),
  batch: text().default('Class of 2027 · AI Engineering Cohort').notNull(),
  department: text().default('School of Computing & Machine Intelligence').notNull(),
  gpa: text().default('–').notNull(),
  credits_completed: integer().default(0).notNull(),
  total_credits: integer().default(60).notNull(),
  campus_address: text().default("").notNull(),
  emergency_contact: text().default("").notNull(),
  notification_prefs: jsonb().default({}).notNull(),
  quiet_hours: text().default('22-07').notNull(),
  ui_state: jsonb().default({}).notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.id],
      foreignColumns: [users.id],
      name: "profiles_id_fkey"
    }).onDelete("cascade"),
  unique("profiles_roll_number_key").on(table.roll_number),
  check("profiles_bio_check", sql`char_length(bio) <= 200`),
  check("profiles_location_check", sql`char_length(location) <= 120`),
  check("profiles_notification_prefs_check", sql`jsonb_typeof(notification_prefs) = 'object'::text`),
  check("profiles_phone_check", sql`char_length(phone) <= 40`),
  check("profiles_quiet_hours_check", sql`quiet_hours ~ '^(off|[0-9]{2}-[0-9]{2})$'::text`),
  check("profiles_ui_state_check", sql`(jsonb_typeof(ui_state) = 'object'::text) AND (pg_column_size(ui_state) < 8192)`),
]);

export const courses = lms.table("courses", {
  id: text().primaryKey().notNull(),
  code: text().notNull(),
  title: text().notNull(),
  category: text().notNull(),
  image: text().default("").notNull(),
  instructor: text().notNull(),
  instructor_role: text().default("").notNull(),
  description: text().default("").notNull(),
  level: text().notNull(),
  credits: integer().default(0).notNull(),
  duration: text().default("").notNull(),
  rating: text().default("").notNull(),
  reviews: text().default("").notNull(),
  progress_color: text().default("").notNull(),
  certificate_title: text(),
  certificate_skills: text().array().default(sql`'{}'::text[]`).notNull(),
  is_starter: boolean().default(false).notNull(),
  position: integer().default(0).notNull(),
}, (table) => [
  unique("courses_code_key").on(table.code),
  check("courses_credits_check", sql`credits >= 0`),
  check("courses_level_check", sql`level = ANY (ARRAY['Beginner'::text, 'Intermediate'::text, 'Advanced'::text])`),
]);

export const course_modules = lms.table("course_modules", {
  id: text().primaryKey().notNull(),
  course_id: text().notNull(),
  position: integer().notNull(),
  title: text().notNull(),
  duration: text().default("").notNull(),
}, (table) => [
  foreignKey({
      columns: [table.course_id],
      foreignColumns: [courses.id],
      name: "course_modules_course_id_fkey"
    }).onDelete("cascade"),
  unique("course_modules_course_id_position_key").on(table.course_id, table.position),
]);

export const lessons = lms.table("lessons", {
  id: text().primaryKey().notNull(),
  module_id: text().notNull(),
  course_id: text().notNull(),
  position: integer().notNull(),
  title: text().notNull(),
  duration: text().default("").notNull(),
  minutes: integer().default(0).notNull(),
  type: text().notNull(),
  summary: text().default("").notNull(),
  video_url: text(),
  video_qualities: jsonb().default({}),
}, (table) => [
  index("lessons_module_idx").using("btree", table.module_id),
  foreignKey({
      columns: [table.course_id],
      foreignColumns: [courses.id],
      name: "lessons_course_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.module_id],
      foreignColumns: [course_modules.id],
      name: "lessons_module_id_fkey"
    }).onDelete("cascade"),
  unique("lessons_course_id_position_key").on(table.course_id, table.position),
  check("lessons_minutes_check", sql`minutes >= 0`),
  check("lessons_type_check", sql`type = ANY (ARRAY['video'::text, 'reading'::text, 'lab'::text])`),
]);

export const course_materials = lms.table("course_materials", {
  id: text().primaryKey().notNull(),
  course_id: text().notNull(),
  position: integer().default(0).notNull(),
  title: text().notNull(),
  type: text().notNull(),
  size: text().default("").notNull(),
  published_at: timestamp({ withTimezone: true, mode: "date" }),
  description: text().default("").notNull(),
  file_name: text(),
  url: text(),
  drive_url: text(),
  drive_id: text(),
  is_available: boolean().default(true).notNull(),
  error_message: text(),
  content: text(),
  mime_type: text(),
}, (table) => [
  index("course_materials_course_idx").using("btree", table.course_id, table.position),
  foreignKey({
      columns: [table.course_id],
      foreignColumns: [courses.id],
      name: "course_materials_course_id_fkey"
    }).onDelete("cascade"),
  check("course_materials_type_check", sql`type = ANY (ARRAY['PDF'::text, 'Code Notebook'::text, 'Dataset'::text, 'Slides'::text])`),
]);

export const assignments = lms.table("assignments", {
  id: text().primaryKey().notNull(),
  course_id: text().notNull(),
  title: text().notNull(),
  description: text().default("").notNull(),
  max_marks: integer().default(100).notNull(),
  priority: text().default('Normal').notNull(),
  due_at: timestamp({ withTimezone: true, mode: "date" }).notNull(),
}, (table) => [
  index("assignments_course_idx").using("btree", table.course_id),
  foreignKey({
      columns: [table.course_id],
      foreignColumns: [courses.id],
      name: "assignments_course_id_fkey"
    }).onDelete("cascade"),
  check("assignments_max_marks_check", sql`max_marks > 0`),
  check("assignments_priority_check", sql`priority = ANY (ARRAY['High'::text, 'Medium'::text, 'Normal'::text])`),
]);

export const quizzes = lms.table("quizzes", {
  id: text().primaryKey().notNull(),
  course_id: text().notNull(),
  title: text().notNull(),
  duration_minutes: integer().notNull(),
  passing_pct: integer().notNull(),
  max_attempts: integer().default(1).notNull(),
  question_count: integer().default(0).notNull(),
  available_from: timestamp({ withTimezone: true, mode: "date" }),
  due_at: timestamp({ withTimezone: true, mode: "date" }).notNull(),
}, (table) => [
  index("quizzes_course_idx").using("btree", table.course_id),
  foreignKey({
      columns: [table.course_id],
      foreignColumns: [courses.id],
      name: "quizzes_course_id_fkey"
    }).onDelete("cascade"),
  check("quizzes_duration_minutes_check", sql`duration_minutes > 0`),
  check("quizzes_max_attempts_check", sql`max_attempts > 0`),
  check("quizzes_passing_pct_check", sql`(passing_pct >= 0) AND (passing_pct <= 100)`),
]);

export const timetable_slots = lms.table("timetable_slots", {
  id: text().primaryKey().notNull(),
  day: text().notNull(),
  starts: time().notNull(),
  ends: time().notNull(),
  course_code: text().notNull(),
  course_id: text(),
  title: text().notNull(),
  instructor: text().notNull(),
  room: text().notNull(),
  is_online: boolean().default(false).notNull(),
}, (table) => [
  foreignKey({
      columns: [table.course_id],
      foreignColumns: [courses.id],
      name: "timetable_slots_course_id_fkey"
    }).onDelete("set null"),
  check("timetable_slots_check", sql`ends > starts`),
  check("timetable_slots_day_check", sql`day = ANY (ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text])`),
]);

export const campus_events = lms.table("campus_events", {
  id: text().primaryKey().notNull(),
  title: text().notNull(),
  category: text().notNull(),
  starts_at: timestamp({ withTimezone: true, mode: "date" }).notNull(),
  ends_at: timestamp({ withTimezone: true, mode: "date" }),
  time_label: text().default("").notNull(),
  location: text().default("").notNull(),
  speaker: text(),
  is_featured: boolean().default(false).notNull(),
  description: text().default("").notNull(),
}, (table) => [
  check("campus_events_category_check", sql`category = ANY (ARRAY['Hackathons'::text, 'Guest Lectures'::text, 'Workshops'::text, 'Academic'::text])`),
]);

export const announcements = lms.table("announcements", {
  id: text().primaryKey().notNull(),
  title: text().notNull(),
  author: text().notNull(),
  department: text().default("").notNull(),
  category: text().notNull(),
  content: text().notNull(),
  attachment_name: text(),
  attachment_size: text(),
  published_at: timestamp({ withTimezone: true, mode: "date" }).notNull(),
}, (table) => [
  check("announcements_category_check", sql`category = ANY (ARRAY['Urgent'::text, 'Academic'::text, 'Infrastructure'::text, 'General'::text])`),
]);

export const faqs = lms.table("faqs", {
  id: text().primaryKey().notNull(),
  category: text().notNull(),
  question: text().notNull(),
  answer: text().notNull(),
  link_target: text(),
  link_label: text(),
  position: integer().default(0).notNull(),
}, (table) => [
]);

export const study_squads = lms.table("study_squads", {
  id: text().primaryKey().notNull(),
  name: text().notNull(),
  base_members: integer().default(0).notNull(),
  member_count: integer().default(0).notNull(),
  next_session: text().default("").notNull(),
  position: integer().default(0).notNull(),
}, (table) => [
  check("study_squads_base_members_check", sql`base_members >= 0`),
  check("study_squads_member_count_check", sql`member_count >= 0`),
]);

export const assignment_submissions = lms.table("assignment_submissions", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  student_id: uuid().notNull(),
  assignment_id: text().notNull(),
  status: text().default('Submitted').notNull(),
  repo_url: text(),
  comments: text(),
  file_path: text(),
  file_name: text(),
  file_size: text(),
  submitted_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
  score: integer(),
  grade: text(),
  feedback: text(),
  graded_at: timestamp({ withTimezone: true, mode: "date" }),
}, (table) => [
  foreignKey({
      columns: [table.assignment_id],
      foreignColumns: [assignments.id],
      name: "assignment_submissions_assignment_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "assignment_submissions_student_id_fkey"
    }).onDelete("cascade"),
  unique("assignment_submissions_student_id_assignment_id_key").on(table.student_id, table.assignment_id),
  check("assignment_submissions_comments_check", sql`char_length(comments) <= 4000`),
  check("assignment_submissions_score_check", sql`score >= 0`),
  // Submitted -> Under Review (an evaluator started) -> Graded (the evaluation was released).
  check("assignment_submissions_status_check", sql`status = ANY (ARRAY['Submitted'::text, 'Under Review'::text, 'Graded'::text])`),
]);

export const quiz_attempts = lms.table("quiz_attempts", {
  id: text().default(sql`('att-' || replace(gen_random_uuid()::text, '-', ''))`).primaryKey().notNull(),
  student_id: uuid().notNull(),
  quiz_id: text().notNull(),
  attempt_number: integer().notNull(),
  started_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
  deadline_at: timestamp({ withTimezone: true, mode: "date" }).notNull(),
  submitted_at: timestamp({ withTimezone: true, mode: "date" }),
  time_taken_seconds: integer(),
  answers: jsonb().default({}).notNull(),
  score: integer(),
  max_score: integer(),
  pct: integer(),
  passed: boolean(),
  feedback: text(),
}, (table) => [
  uniqueIndex("quiz_attempts_one_open_idx").using("btree", table.student_id, table.quiz_id).where(sql`(submitted_at IS NULL)`),
  index("quiz_attempts_open_deadline_idx").using("btree", table.deadline_at).where(sql`(submitted_at IS NULL)`),
  foreignKey({
      columns: [table.quiz_id],
      foreignColumns: [quizzes.id],
      name: "quiz_attempts_quiz_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "quiz_attempts_student_id_fkey"
    }).onDelete("cascade"),
  unique("quiz_attempts_student_id_quiz_id_attempt_number_key").on(table.student_id, table.quiz_id, table.attempt_number),
  check("quiz_attempts_answers_check", sql`jsonb_typeof(answers) = 'object'::text`),
  check("quiz_attempts_attempt_number_check", sql`attempt_number > 0`),
  check("quiz_attempts_check", sql`((submitted_at IS NULL) AND (score IS NULL) AND (pct IS NULL) AND (passed IS NULL)) OR ((submitted_at IS NOT NULL) AND (score IS NOT NULL) AND (max_score IS NOT NULL) AND (pct IS NOT NULL) AND (passed IS NOT NULL) AND (time_taken_seconds IS NOT NULL))`),
  check("quiz_attempts_max_score_check", sql`max_score > 0`),
  check("quiz_attempts_pct_check", sql`(pct >= 0) AND (pct <= 100)`),
  check("quiz_attempts_score_check", sql`score >= 0`),
  check("quiz_attempts_time_taken_seconds_check", sql`time_taken_seconds > 0`),
]);

export const grades = lms.table("grades", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  student_id: uuid().notNull(),
  course_code: text().notNull(),
  course_title: text().notNull(),
  credits: integer().notNull(),
  midterm: numeric({ precision: 5, scale: 1, mode: "number" }).notNull(),
  assignments: numeric({ precision: 5, scale: 1, mode: "number" }).notNull(),
  final_exam: numeric({ precision: 5, scale: 1, mode: "number" }).notNull(),
  total_score: numeric({ precision: 5, scale: 1, mode: "number" }).notNull(),
  letter_grade: text().notNull(),
  status: text().notNull(),
  term: text().notNull(),
  position: integer().default(0).notNull(),
}, (table) => [
  index("grades_student_idx").using("btree", table.student_id),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "grades_student_id_fkey"
    }).onDelete("cascade"),
  check("grades_letter_grade_check", sql`letter_grade = ANY (ARRAY['A+'::text, 'A'::text, 'A-'::text, 'B+'::text, 'B'::text])`),
  check("grades_status_check", sql`status = ANY (ARRAY['Passed with Honors'::text, 'Passed'::text, 'In Progress'::text])`),
]);

export const certificates = lms.table("certificates", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  student_id: uuid().notNull(),
  course_id: text(),
  title: text().notNull(),
  course_title: text().notNull(),
  issued_at: timestamp({ withTimezone: true, mode: "date" }),
  expected_label: text(),
  credential_id: text(),
  grade: text(),
  skills: text().array().default(sql`'{}'::text[]`).notNull(),
  status: text().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.course_id],
      foreignColumns: [courses.id],
      name: "certificates_course_id_fkey"
    }).onDelete("set null"),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "certificates_student_id_fkey"
    }).onDelete("cascade"),
  unique("certificates_student_id_course_id_key").on(table.student_id, table.course_id),
  unique("certificates_credential_id_key").on(table.credential_id),
  check("certificates_check", sql`(status = 'In Progress'::text) OR ((issued_at IS NOT NULL) AND (credential_id IS NOT NULL) AND (grade IS NOT NULL))`),
  check("certificates_status_check", sql`status = ANY (ARRAY['Earned'::text, 'In Progress'::text])`),
]);

export const attendance_records = lms.table("attendance_records", {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  student_id: uuid().notNull(),
  course_code: text().notNull(),
  course_name: text().notNull(),
  class_date: date().notNull(),
  status: text().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "attendance_records_student_id_fkey"
    }).onDelete("cascade"),
  unique("attendance_records_student_id_course_code_class_date_key").on(table.student_id, table.course_code, table.class_date),
  check("attendance_records_status_check", sql`status = ANY (ARRAY['Present'::text, 'Late'::text, 'Absent'::text, 'Excused'::text])`),
]);

export const leave_requests = lms.table("leave_requests", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  student_id: uuid().notNull(),
  course_code: text().notNull(),
  leave_date: date().notNull(),
  reason: text().notNull(),
  status: text().default('Pending').notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "leave_requests_student_id_fkey"
    }).onDelete("cascade"),
  check("leave_requests_course_code_check", sql`(char_length(course_code) >= 2) AND (char_length(course_code) <= 20)`),
  check("leave_requests_reason_check", sql`(char_length(TRIM(BOTH FROM reason)) >= 10) AND (char_length(TRIM(BOTH FROM reason)) <= 1000)`),
  check("leave_requests_status_check", sql`status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Declined'::text])`),
]);

export const notes = lms.table("notes", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  student_id: uuid().notNull(),
  title: text().notNull(),
  course: text().default("").notNull(),
  content: text().default("").notNull(),
  snippet: text(),
  tags: text().array().default(sql`'{}'::text[]`).notNull(),
  pinned: boolean().default(false).notNull(),
  lesson: text(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("notes_student_idx").using("btree", table.student_id, table.updated_at.desc()),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "notes_student_id_fkey"
    }).onDelete("cascade"),
  check("notes_content_check", sql`char_length(content) <= 20000`),
  check("notes_course_check", sql`char_length(course) <= 200`),
  check("notes_lesson_check", sql`char_length(lesson) <= 200`),
  check("notes_snippet_check", sql`char_length(snippet) <= 20000`),
  check("notes_tags_check", sql`cardinality(tags) <= 20`),
  check("notes_title_check", sql`(char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 200)`),
]);

export const support_tickets = lms.table("support_tickets", {
  id: text().primaryKey().notNull(),
  student_id: uuid().notNull(),
  category: text().notNull(),
  subject: text().notNull(),
  description: text().notNull(),
  priority: text().notNull(),
  status: text().default('Open').notNull(),
  attachment_name: text(),
  attachment_size: text(),
  attachment_path: text(),
  resolution_notes: text(),
  last_update_by: text(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("support_tickets_student_idx").using("btree", table.student_id, table.created_at.desc()),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "support_tickets_student_id_fkey"
    }).onDelete("cascade"),
  check("support_tickets_category_check", sql`(char_length(category) >= 2) AND (char_length(category) <= 80)`),
  check("support_tickets_description_check", sql`(char_length(TRIM(BOTH FROM description)) >= 20) AND (char_length(TRIM(BOTH FROM description)) <= 5000)`),
  check("support_tickets_priority_check", sql`priority = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text, 'Urgent'::text])`),
  check("support_tickets_status_check", sql`status = ANY (ARRAY['Open'::text, 'In Progress'::text, 'Resolved'::text, 'Closed'::text])`),
  check("support_tickets_subject_check", sql`(char_length(TRIM(BOTH FROM subject)) >= 8) AND (char_length(TRIM(BOTH FROM subject)) <= 200)`),
]);

export const ticket_replies = lms.table("ticket_replies", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  ticket_id: text().notNull(),
  author_id: uuid(),
  author_name: text().notNull(),
  author_role: text().notNull(),
  author_avatar: text(),
  content: text().notNull(),
  attachment_name: text(),
  attachment_path: text(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("ticket_replies_ticket_idx").using("btree", table.ticket_id, table.created_at),
  foreignKey({
      columns: [table.author_id],
      foreignColumns: [profiles.id],
      name: "ticket_replies_author_id_fkey"
    }).onDelete("set null"),
  foreignKey({
      columns: [table.ticket_id],
      foreignColumns: [support_tickets.id],
      name: "ticket_replies_ticket_id_fkey"
    }).onDelete("cascade"),
  check("ticket_replies_author_role_check", sql`author_role = ANY (ARRAY['Student'::text, 'Support Team'::text, 'Faculty'::text, 'System'::text])`),
  check("ticket_replies_content_check", sql`(char_length(TRIM(BOTH FROM content)) >= 1) AND (char_length(TRIM(BOTH FROM content)) <= 5000)`),
]);

export const support_chat_messages = lms.table("support_chat_messages", {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  student_id: uuid().notNull(),
  sender: text().notNull(),
  body: text().notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("support_chat_student_idx").using("btree", table.student_id, table.created_at),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "support_chat_messages_student_id_fkey"
    }).onDelete("cascade"),
  check("support_chat_messages_body_check", sql`(char_length(TRIM(BOTH FROM body)) >= 1) AND (char_length(TRIM(BOTH FROM body)) <= 2000)`),
  check("support_chat_messages_sender_check", sql`sender = ANY (ARRAY['student'::text, 'agent'::text])`),
]);

export const interview_sessions = lms.table("interview_sessions", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  student_id: uuid().notNull(),
  role: text().notNull(),
  type: text().notNull(),
  level: text().notNull(),
  score: integer().notNull(),
  duration_seconds: integer().notNull(),
  responses: jsonb().default([]).notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("interview_sessions_student_idx").using("btree", table.student_id, table.created_at.desc()),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "interview_sessions_student_id_fkey"
    }).onDelete("cascade"),
  check("interview_sessions_duration_seconds_check", sql`duration_seconds >= 0`),
  check("interview_sessions_level_check", sql`(char_length(level) >= 2) AND (char_length(level) <= 40)`),
  check("interview_sessions_responses_check", sql`(jsonb_typeof(responses) = 'array'::text) AND (pg_column_size(responses) < 65536)`),
  check("interview_sessions_role_check", sql`(char_length(role) >= 2) AND (char_length(role) <= 80)`),
  check("interview_sessions_score_check", sql`(score >= 0) AND (score <= 100)`),
  check("interview_sessions_type_check", sql`type = ANY (ARRAY['Technical'::text, 'HR'::text, 'Behavioral'::text, 'Coding'::text, 'Aptitude'::text])`),
]);

export const resumes = lms.table("resumes", {
  student_id: uuid().primaryKey().notNull(),
  data: jsonb().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "resumes_student_id_fkey"
    }).onDelete("cascade"),
  check("resumes_data_check", sql`(jsonb_typeof(data) = 'object'::text) AND (pg_column_size(data) < 65536)`),
]);

export const notifications = lms.table("notifications", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  student_id: uuid().notNull(),
  kind: text().notNull(),
  title: text().notNull(),
  message: text().default("").notNull(),
  link: text(),
  read_at: timestamp({ withTimezone: true, mode: "date" }),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("notifications_student_idx").using("btree", table.student_id, table.created_at.desc()),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "notifications_student_id_fkey"
    }).onDelete("cascade"),
  check("notifications_kind_check", sql`kind = ANY (ARRAY['class'::text, 'doubt'::text, 'grade'::text, 'system'::text, 'payment'::text, 'assessment'::text])`),
]);

export const community_posts = lms.table("community_posts", {
  id: text().default(sql`gen_random_uuid()::text`).primaryKey().notNull(),
  author_id: uuid(),
  author_name: text().default("").notNull(),
  author_avatar: text(),
  author_badge: text().default('Student').notNull(),
  channel: text().notNull(),
  title: text().notNull(),
  content: text().default("").notNull(),
  base_likes: integer().default(0).notNull(),
  base_replies: integer().default(0).notNull(),
  like_count: integer().default(0).notNull(),
  reply_count: integer().default(0).notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("community_posts_created_idx").using("btree", table.created_at.desc()),
  foreignKey({
      columns: [table.author_id],
      foreignColumns: [profiles.id],
      name: "community_posts_author_id_fkey"
    }).onDelete("cascade"),
  check("community_posts_base_likes_check", sql`base_likes >= 0`),
  check("community_posts_base_replies_check", sql`base_replies >= 0`),
  check("community_posts_channel_check", sql`channel = ANY (ARRAY['Hackathons'::text, 'Research & Labs'::text, 'Study Groups'::text, 'General'::text, 'Career'::text])`),
  check("community_posts_content_check", sql`char_length(content) <= 5000`),
  check("community_posts_like_count_check", sql`like_count >= 0`),
  check("community_posts_reply_count_check", sql`reply_count >= 0`),
  check("community_posts_title_check", sql`(char_length(TRIM(BOTH FROM title)) >= 6) AND (char_length(TRIM(BOTH FROM title)) <= 160)`),
]);

export const post_replies = lms.table("post_replies", {
  id: text().default(sql`gen_random_uuid()::text`).primaryKey().notNull(),
  post_id: text().notNull(),
  author_id: uuid(),
  author_name: text().default("").notNull(),
  author_avatar: text(),
  body: text().notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("post_replies_post_idx").using("btree", table.post_id, table.created_at),
  foreignKey({
      columns: [table.author_id],
      foreignColumns: [profiles.id],
      name: "post_replies_author_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.post_id],
      foreignColumns: [community_posts.id],
      name: "post_replies_post_id_fkey"
    }).onDelete("cascade"),
  check("post_replies_body_check", sql`(char_length(TRIM(BOTH FROM body)) >= 1) AND (char_length(TRIM(BOTH FROM body)) <= 2000)`),
]);

export const course_questions = lms.table("course_questions", {
  id: text().default(sql`gen_random_uuid()::text`).primaryKey().notNull(),
  course_id: text().notNull(),
  author_id: uuid(),
  author_name: text().default("").notNull(),
  author_avatar: text(),
  body: text().notNull(),
  base_votes: integer().default(0).notNull(),
  vote_count: integer().default(0).notNull(),
  answer_author: text(),
  answer_text: text(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("course_questions_course_idx").using("btree", table.course_id, table.created_at.desc()),
  foreignKey({
      columns: [table.author_id],
      foreignColumns: [profiles.id],
      name: "course_questions_author_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.course_id],
      foreignColumns: [courses.id],
      name: "course_questions_course_id_fkey"
    }).onDelete("cascade"),
  check("course_questions_base_votes_check", sql`base_votes >= 0`),
  check("course_questions_body_check", sql`(char_length(TRIM(BOTH FROM body)) >= 1) AND (char_length(TRIM(BOTH FROM body)) <= 2000)`),
  check("course_questions_vote_count_check", sql`vote_count >= 0`),
]);

export const enrollments = lms.table("enrollments", {
  student_id: uuid().notNull(),
  course_id: text().notNull(),
  enrolled_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.course_id],
      foreignColumns: [courses.id],
      name: "enrollments_course_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "enrollments_student_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.student_id, table.course_id], name: "enrollments_pkey"}),
]);

export const event_registrations = lms.table("event_registrations", {
  student_id: uuid().notNull(),
  event_id: text().notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.event_id],
      foreignColumns: [campus_events.id],
      name: "event_registrations_event_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "event_registrations_student_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.student_id, table.event_id], name: "event_registrations_pkey"}),
]);

export const announcement_reads = lms.table("announcement_reads", {
  student_id: uuid().notNull(),
  announcement_id: text().notNull(),
  read_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.announcement_id],
      foreignColumns: [announcements.id],
      name: "announcement_reads_announcement_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "announcement_reads_student_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.student_id, table.announcement_id], name: "announcement_reads_pkey"}),
]);

export const post_likes = lms.table("post_likes", {
  post_id: text().notNull(),
  student_id: uuid().notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.post_id],
      foreignColumns: [community_posts.id],
      name: "post_likes_post_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "post_likes_student_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.post_id, table.student_id], name: "post_likes_pkey"}),
]);

export const post_saves = lms.table("post_saves", {
  post_id: text().notNull(),
  student_id: uuid().notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.post_id],
      foreignColumns: [community_posts.id],
      name: "post_saves_post_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "post_saves_student_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.post_id, table.student_id], name: "post_saves_pkey"}),
]);

export const squad_members = lms.table("squad_members", {
  squad_id: text().notNull(),
  student_id: uuid().notNull(),
  joined_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.squad_id],
      foreignColumns: [study_squads.id],
      name: "squad_members_squad_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "squad_members_student_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.squad_id, table.student_id], name: "squad_members_pkey"}),
]);

export const course_question_votes = lms.table("course_question_votes", {
  question_id: text().notNull(),
  student_id: uuid().notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.question_id],
      foreignColumns: [course_questions.id],
      name: "course_question_votes_question_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "course_question_votes_student_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.question_id, table.student_id], name: "course_question_votes_pkey"}),
]);

export const lesson_progress = lms.table("lesson_progress", {
  student_id: uuid().notNull(),
  lesson_id: text().notNull(),
  course_id: text().notNull(),
  completed_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("lesson_progress_course_idx").using("btree", table.student_id, table.course_id),
  foreignKey({
      columns: [table.course_id],
      foreignColumns: [courses.id],
      name: "lesson_progress_course_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.lesson_id],
      foreignColumns: [lessons.id],
      name: "lesson_progress_lesson_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "lesson_progress_student_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.student_id, table.lesson_id], name: "lesson_progress_pkey"}),
]);

export const study_activity = lms.table("study_activity", {
  student_id: uuid().notNull(),
  day: date().notNull(),
  minutes: integer().default(0).notNull(),
  lessons: integer().default(0).notNull(),
}, (table) => [
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "study_activity_student_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.student_id, table.day], name: "study_activity_pkey"}),
  check("study_activity_lessons_check", sql`lessons >= 0`),
  check("study_activity_minutes_check", sql`minutes >= 0`),
]);

export const gpa_history = lms.table("gpa_history", {
  student_id: uuid().notNull(),
  position: integer().notNull(),
  term: text().notNull(),
  gpa: numeric({ precision: 3, scale: 2, mode: "number" }).notNull(),
}, (table) => [
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "gpa_history_student_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.student_id, table.position], name: "gpa_history_pkey"}),
  check("gpa_history_gpa_check", sql`(gpa >= (0)::numeric) AND (gpa <= (4)::numeric)`),
]);

export const reminders = lms.table("reminders", {
  student_id: uuid().notNull(),
  target_type: text().notNull(),
  target_id: text().notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "reminders_student_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.student_id, table.target_type, table.target_id], name: "reminders_pkey"}),
  check("reminders_target_id_check", sql`char_length(target_id) <= 64`),
  check("reminders_target_type_check", sql`target_type = ANY (ARRAY['slot'::text, 'quiz'::text, 'event'::text])`),
]);

export const faq_votes = lms.table("faq_votes", {
  student_id: uuid().notNull(),
  faq_id: text().notNull(),
  vote: text().notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.faq_id],
      foreignColumns: [faqs.id],
      name: "faq_votes_faq_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "faq_votes_student_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.student_id, table.faq_id], name: "faq_votes_pkey"}),
  check("faq_votes_vote_check", sql`vote = ANY (ARRAY['up'::text, 'down'::text])`),
]);

export const quiz_questions = lms.table("quiz_questions", {
  quiz_id: text().notNull(),
  position: integer().notNull(),
  question: text().notNull(),
  options: text().array().notNull(),
  correct_index: integer().notNull(),
  explanation: text().default("").notNull(),
  topic: text(),
  difficulty: text(),
}, (table) => [
  foreignKey({
      columns: [table.quiz_id],
      foreignColumns: [quizzes.id],
      name: "quiz_questions_quiz_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.quiz_id, table.position], name: "quiz_questions_pkey"}),
  check("quiz_questions_check", sql`(correct_index >= 0) AND (correct_index < cardinality(options))`),
  check("quiz_questions_difficulty_check", sql`difficulty = ANY (ARRAY['Easy'::text, 'Medium'::text, 'Hard'::text])`),
  check("quiz_questions_options_check", sql`(cardinality(options) >= 2) AND (cardinality(options) <= 6)`),
  check("quiz_questions_position_check", sql`"position" > 0`),
]);

/* ------------------------------------------------------------------------------------------------------------------
 * Evaluation: evaluators score assignment submissions against a rubric, release the results to students, and answer
 * students' re-evaluation requests.
 * ---------------------------------------------------------------------------------------------------------------- */

/** Evaluator details, one row per evaluator (name, email and photo are on users). */
export const evaluator_profiles = lms.table("evaluator_profiles", {
  id: uuid().primaryKey().notNull(),
  title: text().default('Evaluator').notNull(),
  department: text().default("").notNull(),
  specializations: text().array().default(sql`'{}'::text[]`).notNull(),
  /** Portal settings: queue sort, auto-advance, rubric level details, daily goal. */
  preferences: jsonb().default({}).notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  foreignKey({
      columns: [table.id],
      foreignColumns: [users.id],
      name: "evaluator_profiles_id_fkey"
    }).onDelete("cascade"),
  check("evaluator_profiles_title_check", sql`(char_length(title) >= 1) AND (char_length(title) <= 120)`),
  check("evaluator_profiles_department_check", sql`char_length(department) <= 160`),
  check("evaluator_profiles_specializations_check", sql`cardinality(specializations) <= 12`),
  check("evaluator_profiles_preferences_check", sql`(jsonb_typeof(preferences) = 'object'::text) AND (pg_column_size(preferences) < 4096)`),
]);

/** The official marking rubric of an assignment. Its criteria add up to the assignment's max_marks. */
export const rubrics = lms.table("rubrics", {
  id: text().primaryKey().notNull(),
  assignment_id: text().notNull(),
  title: text().notNull(),
  version: text().default('v1').notNull(),
  /** How to mark: what to run or read first, common deductions. */
  guidance: text().default("").notNull(),
}, (table) => [
  foreignKey({
      columns: [table.assignment_id],
      foreignColumns: [assignments.id],
      name: "rubrics_assignment_id_fkey"
    }).onDelete("cascade"),
  unique("rubrics_assignment_id_key").on(table.assignment_id),
]);

export const rubric_criteria = lms.table("rubric_criteria", {
  id: text().primaryKey().notNull(),
  rubric_id: text().notNull(),
  position: integer().notNull(),
  title: text().notNull(),
  description: text().default("").notNull(),
  max_points: integer().notNull(),
  /** Performance levels, best first: [{ "label": "Exemplary", "points": 30, "description": "…" }]. */
  levels: jsonb().default([]).notNull(),
}, (table) => [
  foreignKey({
      columns: [table.rubric_id],
      foreignColumns: [rubrics.id],
      name: "rubric_criteria_rubric_id_fkey"
    }).onDelete("cascade"),
  unique("rubric_criteria_rubric_id_position_key").on(table.rubric_id, table.position),
  check("rubric_criteria_max_points_check", sql`(max_points > 0) AND (max_points <= 1000)`),
  check("rubric_criteria_levels_check", sql`jsonb_typeof(levels) = 'array'::text`),
]);

/** Which assignments an evaluator marks. */
export const evaluator_assignments = lms.table("evaluator_assignments", {
  evaluator_id: uuid().notNull(),
  assignment_id: text().notNull(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("evaluator_assignments_assignment_idx").using("btree", table.assignment_id),
  foreignKey({
      columns: [table.evaluator_id],
      foreignColumns: [users.id],
      name: "evaluator_assignments_evaluator_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.assignment_id],
      foreignColumns: [assignments.id],
      name: "evaluator_assignments_assignment_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.evaluator_id, table.assignment_id], name: "evaluator_assignments_pkey"}),
]);

/**
 * The marking of one submission. draft: being scored, owned by the evaluator who started it; evaluated: scored and
 * waiting for release; released: the student sees the score. scores = { "<criterion id>": { "points": 24, "comment": "…" } }.
 */
export const evaluations = lms.table("evaluations", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  submission_id: uuid().notNull(),
  evaluator_id: uuid(),
  status: text().default('draft').notNull(),
  scores: jsonb().default({}).notNull(),
  /** Sum of the criterion points (rubric scale). */
  total: integer().default(0).notNull(),
  /** Shared with the student on release. */
  feedback: text().default("").notNull(),
  /** Only the evaluator who wrote it sees it. */
  private_note: text().default("").notNull(),
  started_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
  evaluated_at: timestamp({ withTimezone: true, mode: "date" }),
  released_at: timestamp({ withTimezone: true, mode: "date" }),
}, (table) => [
  index("evaluations_evaluator_idx").using("btree", table.evaluator_id, table.status),
  foreignKey({
      columns: [table.submission_id],
      foreignColumns: [assignment_submissions.id],
      name: "evaluations_submission_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.evaluator_id],
      foreignColumns: [users.id],
      name: "evaluations_evaluator_id_fkey"
    }).onDelete("set null"),
  unique("evaluations_submission_id_key").on(table.submission_id),
  check("evaluations_status_check", sql`status = ANY (ARRAY['draft'::text, 'evaluated'::text, 'released'::text])`),
  check("evaluations_scores_check", sql`(jsonb_typeof(scores) = 'object'::text) AND (pg_column_size(scores) < 32768)`),
  check("evaluations_total_check", sql`total >= 0`),
  check("evaluations_feedback_check", sql`char_length(feedback) <= 4000`),
  check("evaluations_private_note_check", sql`char_length(private_note) <= 2000`),
  check("evaluations_check", sql`((status = 'draft'::text) OR (evaluated_at IS NOT NULL)) AND ((status <> 'released'::text) OR (released_at IS NOT NULL))`),
]);

/** A student's request to have a released grade looked at again. One per submission. */
export const reevaluation_requests = lms.table("reevaluation_requests", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  submission_id: uuid().notNull(),
  student_id: uuid().notNull(),
  reason: text().notNull(),
  status: text().default('Pending').notNull(),
  original_score: integer().notNull(),
  revised_score: integer(),
  /** The evaluator's answer to the student. */
  resolution: text(),
  handled_by: uuid(),
  created_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "date" }).defaultNow().notNull(),
  resolved_at: timestamp({ withTimezone: true, mode: "date" }),
}, (table) => [
  index("reevaluation_requests_status_idx").using("btree", table.status, table.created_at),
  index("reevaluation_requests_student_idx").using("btree", table.student_id),
  foreignKey({
      columns: [table.submission_id],
      foreignColumns: [assignment_submissions.id],
      name: "reevaluation_requests_submission_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.student_id],
      foreignColumns: [profiles.id],
      name: "reevaluation_requests_student_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.handled_by],
      foreignColumns: [users.id],
      name: "reevaluation_requests_handled_by_fkey"
    }).onDelete("set null"),
  unique("reevaluation_requests_submission_id_key").on(table.submission_id),
  check("reevaluation_requests_status_check", sql`status = ANY (ARRAY['Pending'::text, 'In Review'::text, 'Revised'::text, 'Upheld'::text])`),
  check("reevaluation_requests_reason_check", sql`(char_length(reason) >= 20) AND (char_length(reason) <= 1000)`),
  check("reevaluation_requests_resolution_check", sql`char_length(resolution) <= 2000`),
  check("reevaluation_requests_scores_check", sql`(original_score >= 0) AND ((revised_score IS NULL) OR (revised_score >= 0))`),
  check("reevaluation_requests_check", sql`((status = ANY (ARRAY['Pending'::text, 'In Review'::text])) AND (resolved_at IS NULL) AND (revised_score IS NULL)) OR ((status = 'Upheld'::text) AND (resolved_at IS NOT NULL) AND (resolution IS NOT NULL) AND (revised_score IS NULL)) OR ((status = 'Revised'::text) AND (resolved_at IS NOT NULL) AND (resolution IS NOT NULL) AND (revised_score IS NOT NULL))`),
]);
