import { eq, sql } from "drizzle-orm"
import type { PgColumn, PgTable } from "drizzle-orm/pg-core"
import type { Tx } from "../client.js"
import * as t from "../schema.js"
import { gradeAttempt } from "../../modules/student/quizzes.js"
import { contentRows, demoRows } from "./data.js"
import { seedTime } from "./time.js"

/** Inserts rows, or updates every given column when the key exists. Property names are column names. */
async function upsert<T extends PgTable>(tx: Tx, table: T, rows: T["$inferInsert"][], target: PgColumn | PgColumn[]) {
  if (!rows.length) return
  const keys = new Set((Array.isArray(target) ? target : [target]).map((c) => c.name))
  const cols = Object.keys(rows[0] as object).filter((c) => !keys.has(c))
  const set = Object.fromEntries(cols.map((c) => [c, sql.raw(`excluded."${c}"`)]))
  for (let i = 0; i < rows.length; i += 200) {
    await tx.insert(table).values(rows.slice(i, i + 200)).onConflictDoUpdate({ target, set } as never)
  }
}

/** Community, Q&A and squad counters, recomputed from the join tables (the API keeps them current afterwards). */
export async function recountCounters(tx: Tx) {
  await tx.execute(sql`update lms.community_posts p set like_count = (select count(*) from lms.post_likes l where l.post_id = p.id), reply_count = (select count(*) from lms.post_replies r where r.post_id = p.id)`)
  await tx.execute(sql`update lms.course_questions q set vote_count = (select count(*) from lms.course_question_votes v where v.question_id = q.id)`)
  await tx.execute(sql`update lms.study_squads s set member_count = (select count(*) from lms.squad_members m where m.squad_id = s.id)`)
}

/** Shared course content with dates relative to the anchor. Safe to re-run: rows are upserted by id. */
export async function seedContent(tx: Tx, anchor: Date, tz: string) {
  const r = contentRows(seedTime(anchor, tz))
  await upsert(tx, t.mentors, r.mentors, t.mentors.id)
  await upsert(tx, t.courses, r.courses, t.courses.id)
  await upsert(tx, t.course_modules, r.course_modules, t.course_modules.id)
  await upsert(tx, t.lessons, r.lessons, t.lessons.id)
  await upsert(tx, t.course_materials, r.course_materials, t.course_materials.id)
  await upsert(tx, t.assignments, r.assignments, t.assignments.id)
  await upsert(tx, t.quizzes, r.quizzes, t.quizzes.id)
  await upsert(tx, t.quiz_questions, r.quiz_questions, [t.quiz_questions.quiz_id, t.quiz_questions.position])
  await upsert(tx, t.timetable_slots, r.timetable_slots, t.timetable_slots.id)
  await upsert(tx, t.campus_events, r.campus_events, t.campus_events.id)
  await upsert(tx, t.announcements, r.announcements, t.announcements.id)
  await upsert(tx, t.faqs, r.faqs, t.faqs.id)
  await upsert(tx, t.study_squads, r.study_squads, t.study_squads.id)
  await upsert(tx, t.community_posts, r.community_posts, t.community_posts.id)
  await upsert(tx, t.post_replies, r.post_replies, t.post_replies.id)
  await upsert(tx, t.course_questions, r.course_questions, t.course_questions.id)
  await tx.insert(t.app_state).values({ key: "demo_anchor", value: anchor.toISOString() }).onConflictDoUpdate({ target: t.app_state.key, set: { value: anchor.toISOString(), updated_at: new Date() } })
  await recountCounters(tx)
}

/** Every row a student owns (used before re-seeding the demo student). Profile and account stay. */
export async function clearStudent(tx: Tx, id: string) {
  const owned = [
    t.notifications, t.mentor_requests, t.mentor_meetings, t.resumes, t.interview_sessions, t.support_chat_messages,
    t.support_tickets, t.faq_votes, t.notes, t.announcement_reads, t.event_registrations, t.reminders, t.leave_requests,
    t.attendance_records, t.certificates, t.gpa_history, t.grades, t.quiz_attempts, t.assignment_submissions,
    t.study_activity, t.lesson_progress, t.post_likes, t.post_saves, t.squad_members, t.course_question_votes, t.enrollments,
  ] as const
  for (const table of owned) await tx.delete(table).where(eq((table as unknown as { student_id: PgColumn }).student_id, id))
  await tx.delete(t.community_posts).where(eq(t.community_posts.author_id, id))
  await tx.delete(t.post_replies).where(eq(t.post_replies.author_id, id))
  await tx.delete(t.course_questions).where(eq(t.course_questions.author_id, id))
}

/** Opens an In Progress certificate for each enrolled course that awards one. */
export async function openCertificates(tx: Tx, studentId: string, courseIds: string[]) {
  if (!courseIds.length) return
  await tx.execute(sql`
    insert into lms.certificates (student_id, course_id, title, course_title, skills, status)
    select ${studentId}::uuid, c.id, c.certificate_title, c.title, c.certificate_skills, 'In Progress'
    from lms.courses c where c.id = any(${sql.param(courseIds)}::text[]) and c.certificate_title is not null
    on conflict (student_id, course_id) do nothing`)
}

/** Restores the demo student's history with dates relative to the anchor. */
export async function seedStudentDemo(tx: Tx, studentId: string, anchor: Date, tz: string) {
  const time = seedTime(anchor, tz)
  const d = time.today
  const local = (dayExpr: ReturnType<typeof sql>, hhmm: string) => sql`((${dayExpr}) + ${hhmm}::time) at time zone ${tz}`
  const cap = new Date(anchor.getTime() - 5 * 60_000)

  await clearStudent(tx, studentId)
  await tx.update(t.users).set({ full_name: "Aarav Mehta", avatar_url: "/assets/student-2.png", is_demo: true, updated_at: new Date() }).where(eq(t.users.id, studentId))
  await tx
    .insert(t.profiles)
    .values({ id: studentId, roll_number: "QAI-2026-042" })
    .onConflictDoNothing({ target: t.profiles.id })
  await tx
    .update(t.profiles)
    .set({
      headline: "Learner · Generative AI Engineering",
      roll_number: "QAI-2026-042",
      phone: "+91 98765 43210",
      location: "Bengaluru, India",
      bio: "AI engineering student building retrieval-augmented and multi-agent systems.",
      program: "Bachelor of Science in Artificial Intelligence",
      batch: "Class of 2027 · Year 4",
      department: "School of Computing & Machine Intelligence",
      gpa: "3.88 / 4.00",
      credits_completed: 42,
      total_credits: 60,
      campus_address: "402 Quantum Hall, Maple Avenue Campus",
      emergency_contact: "Ananya Sharma (+1 555-902-1144)",
      mentor_id: "mentor-1",
      notification_prefs: {},
      quiet_hours: "22-07",
      ui_state: {},
      updated_at: new Date(),
    })
    .where(eq(t.profiles.id, studentId))

  const qz1 = await tx.query.quizzes.findFirst({ where: eq(t.quizzes.id, "qz-1") })
  const quizOpen = qz1
    ? `Due ${new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(qz1.due_at)} · ${qz1.question_count} questions, ${qz1.duration_minutes} minutes`
    : "A new quiz is open."
  const r = demoRows(time, studentId, quizOpen)

  await tx.insert(t.enrollments).values(
    [
      { course_id: "c-1", days: 70 },
      { course_id: "c-2", days: 63 },
      { course_id: "c-3", days: 56 },
      { course_id: "c-4", days: 49 },
    ].map((e) => ({ student_id: studentId, course_id: e.course_id, enrolled_at: time.ago({ days: e.days }) })),
  )
  await openCertificates(tx, studentId, ["c-1", "c-2", "c-3", "c-4"])

  // Completed lessons in course order; the last one per course is the most recent study session.
  const progress: [string[], number, number][] = [
    [["l-1-1", "l-1-2", "l-1-3", "l-1-4", "l-2-1", "l-2-2", "l-2-3", "l-2-4", "l-3-1", "l-3-2", "l-3-3", "l-3-4", "l-4-1", "l-4-2", "l-4-3", "l-4-4", "l-5-1", "l-5-2"], 1, 2],
    [["c-2-m1-l1", "c-2-m1-l2", "c-2-m1-l3", "c-2-m2-l1", "c-2-m2-l2", "c-2-m2-l3", "c-2-m3-l1", "c-2-m3-l2", "c-2-m3-l3"], 2, 3],
    [["c-3-m1-l1", "c-3-m1-l2", "c-3-m1-l3", "c-3-m2-l1", "c-3-m2-l2"], 3, 4],
    [["c-4-m1-l1", "c-4-m1-l2", "c-4-m1-l3", "c-4-m2-l1", "c-4-m2-l2", "c-4-m2-l3", "c-4-m3-l1", "c-4-m3-l2", "c-4-m3-l3", "c-4-m4-l1", "c-4-m4-l2", "c-4-m4-l3", "c-4-m5-l1", "c-4-m5-l2", "c-4-m5-l3", "c-4-m6-l1", "c-4-m6-l2", "c-4-m6-l3", "c-4-m7-l1", "c-4-m7-l2", "c-4-m7-l3", "c-4-m8-l1", "c-4-m8-l2", "c-4-m8-l3"], 10, 2],
  ]
  for (const [ids, base, step] of progress) {
    await tx.execute(sql`
      insert into lms.lesson_progress (student_id, lesson_id, course_id, completed_at)
      select ${studentId}::uuid, l.id, l.course_id,
        least(${local(sql`${d}::date - ${base}::int - (${ids.length}::int - x.n)::int * ${step}::int`, "19:30")}, ${cap}::timestamptz)
      from unnest(${sql.param(ids)}::text[]) with ordinality as x(id, n) join lms.lessons l on l.id = x.id`)
  }

  // 120 days of study minutes with a 12-day streak up to yesterday.
  await tx.execute(sql`
    insert into lms.study_activity (student_id, day, minutes, lessons)
    select ${studentId}::uuid, s.day, s.minutes, greatest(1, round(s.minutes / 45.0))::int from (
      select ${d}::date - g as day,
        case
          when g <= 12 then 40 + abs(hashtext('streak' || g)) % 95
          when extract(isodow from ${d}::date - g) in (6, 7) and abs(hashtext('weekend' || g)) % 3 > 0 then 0
          when abs(hashtext('rest' || g)) % 7 = 0 then 0
          else 25 + abs(hashtext('study' || g)) % 125
        end as minutes
      from generate_series(1, 120) g
    ) s where s.minutes > 0`)

  await tx.insert(t.assignment_submissions).values(r.assignment_submissions)
  await tx.insert(t.quiz_attempts).values(r.quiz_attempts)
  // Past attempts are graded by the same code that grades live submissions.
  await gradeAttempt(tx, "att-qz-3", { notify: false, now: anchor })
  await tx.update(t.quiz_attempts).set({ feedback: "Outstanding comprehension of CPython memory layout, object allocation, and dictionary hash tables. Review question 7 on GIL multi-threading behavior." }).where(eq(t.quiz_attempts.id, "att-qz-3"))
  await gradeAttempt(tx, "att-qz-4", { notify: false, now: anchor })
  await tx.update(t.quiz_attempts).set({ feedback: "Flawless score! Exceptional grasp of ReAct reasoning loops, JSON schema tool parameter definitions, and agent error recovery mechanisms." }).where(eq(t.quiz_attempts.id, "att-qz-4"))

  await tx.insert(t.grades).values(r.grades)
  await tx.insert(t.gpa_history).values(r.gpa_history)

  // Certificates: mark the earned ones and label when the others are expected.
  await tx.execute(sql`update lms.certificates set status = 'Earned', issued_at = ${time.past(time.at(-3, "10:00"))}, credential_id = 'QAI-88392-PY', grade = 'Grade: A+ (With Distinction)' where student_id = ${studentId}::uuid and course_id = 'c-2'`)
  await tx.execute(sql`update lms.certificates set status = 'Earned', issued_at = ${time.past(time.at(-11, "10:00"))}, credential_id = 'QAI-77401-AG', grade = 'Grade: A+ (Honors)' where student_id = ${studentId}::uuid and course_id = 'c-4'`)
  await tx.execute(sql`update lms.certificates set expected_label = 'Expected ' || to_char(${d}::date + 30, 'Mon YYYY') where student_id = ${studentId}::uuid and course_id = 'c-1'`)
  await tx.execute(sql`update lms.certificates set expected_label = 'Expected ' || to_char(${d}::date + 60, 'Mon YYYY') where student_id = ${studentId}::uuid and course_id = 'c-3'`)

  // Attendance for the most recent classes of each course.
  const attendance: [string, string, number[], number, string | null, number | null][] = [
    ["AI-401", "Generative AI Masterclass", [1, 3, 4], 14, "Late", 7],
    ["PY-201", "Python for AI", [1, 2, 4], 12, null, null],
    ["ML-301", "Machine Learning Foundations", [1, 2, 3], 12, "Absent", 5],
    ["AG-501", "AI Agents Bootcamp", [2], 10, "Excused", 2],
  ]
  for (const [code, name, days, count, special, at] of attendance) {
    await tx.execute(sql`
      insert into lms.attendance_records (student_id, course_code, course_name, class_date, status)
      select ${studentId}::uuid, ${code}, ${name}, c.day, case when c.n = ${at ?? -1} then ${special ?? "Present"} else 'Present' end
      from (select g::date as day, row_number() over (order by g desc) as n
            from generate_series(${d}::date - 120, ${d}::date - 1, interval '1 day') g where extract(isodow from g) = any(${sql.param(days)}::int[])) c
      where c.n <= ${count}`)
  }
  await tx.execute(sql`
    insert into lms.leave_requests (student_id, course_code, leave_date, reason, status, created_at)
    select ${studentId}::uuid, 'AG-501', a.class_date, 'Medical leave: fever. Clinic slip shared with Academic Affairs (ticket TKT-71204).', 'Approved',
      (a.class_date + time '20:00') at time zone ${tz}
    from lms.attendance_records a where a.student_id = ${studentId}::uuid and a.status = 'Excused' limit 1`)

  await tx.insert(t.event_registrations).values(r.event_registrations)
  await tx.insert(t.announcement_reads).values(r.announcement_reads)
  await tx.insert(t.notes).values(r.notes)
  await tx.insert(t.support_tickets).values(r.support_tickets)
  await tx.insert(t.ticket_replies).values(r.ticket_replies)
  await tx.insert(t.interview_sessions).values(r.interview_sessions)

  // The scheduled mentor meeting falls on the first Friday after tomorrow.
  await tx.execute(sql`
    insert into lms.mentor_meetings (student_id, mentor_id, meeting_date, slot, ends_slot, topic, agenda, zoom_url, status, created_at)
    values (${studentId}::uuid, 'mentor-1', (${d}::date + 2) + ((5 - extract(isodow from ${d}::date + 2)::int + 7) % 7), '05:00 PM', '05:45 PM',
      'Senior Thesis Advising & RAG Architecture Review', 'Review Year 4 capstone evaluation milestones, multi-agent cognitive graph benchmarks, and conference submission draft.',
      'https://zoom.us/j/98421038592?pwd=QAI-QuantumMentor-2026', 'Scheduled', ${time.ago({ days: 2 })})`)

  await tx.insert(t.post_likes).values({ student_id: studentId, post_id: "cp-2" })
  await tx.insert(t.squad_members).values(r.squad_members)
  await tx.insert(t.notifications).values(r.notifications)
  await recountCounters(tx)
}
