import { and, asc, count, desc, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import type { Tx } from "../../db/client.js"
import {
  assignment_submissions, assignments, certificates, course_materials, course_modules, course_question_votes, course_questions,
  courses, enrollments, grades, lesson_progress, lessons, profiles, quiz_attempts, quizzes, study_activity, users,
} from "../../db/schema.js"
import { openCertificates } from "../../db/seed/index.js"
import { badRequest, forbidden, notFound } from "../../errors.js"
import { me, parse } from "../../http.js"
import { localDay } from "../../lib/time.js"
import { notify } from "./notify.js"
import { finalizeExpired } from "./quizzes.js"
import { ownObject, studentProfile, trimmed } from "./shared.js"
import { broadcastToChannel } from "../../ws.js"

/** Issues the course certificate once every lesson is complete. Returns it when newly earned. */
async function issueCertificate(tx: Tx, studentId: string, courseId: string) {
  const c = await tx.query.courses.findFirst({ where: eq(courses.id, courseId) })
  if (!c?.certificate_title) return null
  const earned = await tx.query.certificates.findFirst({ where: and(eq(certificates.student_id, studentId), eq(certificates.course_id, courseId), eq(certificates.status, "Earned")) })
  if (earned) return null
  const [g] = await tx.select({ letter: grades.letter_grade }).from(grades).where(and(eq(grades.student_id, studentId), eq(grades.course_code, c.code))).orderBy(asc(grades.position)).limit(1)
  const grade = g ? `Grade: ${g.letter}${g.letter === "A+" ? " (Honors)" : ""}` : "Completed"
  // Random, so credentials can't be enumerated through the public verification page.
  const credential = `QAI-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}-${c.code.split("-")[0].toUpperCase()}`
  const values = { student_id: studentId, course_id: c.id, title: c.certificate_title, course_title: c.title, skills: c.certificate_skills, status: "Earned", issued_at: new Date(), credential_id: credential, grade }
  const [cert] = await tx
    .insert(certificates)
    .values(values)
    .onConflictDoUpdate({ target: [certificates.student_id, certificates.course_id], set: { status: "Earned", issued_at: values.issued_at, credential_id: credential, grade, title: values.title, course_title: values.course_title, skills: values.skills } })
    .returning()
  await notify(tx, studentId, "grade", "Certificate earned", `You completed ${c.title}. "${c.certificate_title}" is ready to share.`, "certificates", "grades")
  return cert
}

export async function courseRoutes(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db

  // Everything most pages share, in one round trip.
  app.get("/api/student/core", async (req) => {
    const s = me(req)
    await finalizeExpired(db, s.id)
    const [profile, courseRows, modules, lessonRows, enrolled, progress, assignmentRows, submissions, quizRows, attempts, requests] = await Promise.all([
      studentProfile(db, s.id),
      db.select().from(courses).orderBy(asc(courses.position)),
      db.select().from(course_modules).orderBy(asc(course_modules.course_id), asc(course_modules.position)),
      db
        .select({
          id: lessons.id,
          module_id: lessons.module_id,
          course_id: lessons.course_id,
          position: lessons.position,
          title: lessons.title,
          duration: lessons.duration,
          minutes: lessons.minutes,
          type: lessons.type,
          summary: lessons.summary,
          video_url: lessons.video_url,
        })
        .from(lessons)
        .orderBy(asc(lessons.course_id), asc(lessons.position)),
      db.select({ course_id: enrollments.course_id, enrolled_at: enrollments.enrolled_at }).from(enrollments).where(eq(enrollments.student_id, s.id)),
      db.select({ lesson_id: lesson_progress.lesson_id, completed_at: lesson_progress.completed_at }).from(lesson_progress).where(eq(lesson_progress.student_id, s.id)),
      db.select().from(assignments).orderBy(asc(assignments.due_at)),
      db.select().from(assignment_submissions).where(eq(assignment_submissions.student_id, s.id)),
      db.select().from(quizzes).orderBy(asc(quizzes.due_at)),
      db.select().from(quiz_attempts).where(eq(quiz_attempts.student_id, s.id)).orderBy(asc(quiz_attempts.started_at)),
      db.execute(sql`
        select r.id, s.assignment_id, r.status, r.original_score, r.revised_score, r.created_at, r.resolved_at
        from lms.reevaluation_requests r join lms.assignment_submissions s on s.id = r.submission_id
        where r.student_id = ${s.id}::uuid`),
    ])
    const reevaluations = requests.rows
    return { profile, courses: courseRows, modules, lessons: lessonRows, enrollments: enrolled, progress, assignments: assignmentRows, submissions, quizzes: quizRows, attempts, reevaluations }
  })

  app.get("/api/student/profile", async (req) => studentProfile(db, me(req).id))

  const profilePatch = z
    .object({
      full_name: z.string().trim().min(1, "Enter your name.").max(120).optional(),
      phone: z.string().trim().max(40).optional(),
      location: z.string().trim().max(120).optional(),
      bio: z.string().trim().max(200, "Keep the bio under 200 characters.").optional(),
      avatar_url: z.string().max(400).nullable().optional(),
      notification_prefs: z.record(z.string(), z.unknown()).optional(),
      quiet_hours: z.string().regex(/^(off|[0-9]{2}-[0-9]{2})$/).optional(),
      ui_state: z.record(z.string(), z.unknown()).optional(),
    })
    .strict()

  app.patch("/api/student/profile", async (req) => {
    const s = me(req)
    const p = parse(profilePatch, req.body)
    if (p.avatar_url) {
      const own = p.avatar_url.startsWith(`/api/files/avatars/${s.id}/`)
      if (!own && !/^\/assets\/[\w.-]+$/.test(p.avatar_url)) throw badRequest("Upload the photo again.")
      if (own) await ownObject(ctx, s, "avatars", p.avatar_url.replace(/^\/api\/files\//, ""))
    }
    if (p.ui_state && JSON.stringify(p.ui_state).length > 8000) throw badRequest("That's too much to save.")
    return db.transaction(async (tx) => {
      const account: Partial<typeof users.$inferInsert> = {}
      if (p.full_name !== undefined) account.full_name = p.full_name
      if (p.avatar_url !== undefined) account.avatar_url = p.avatar_url
      if (Object.keys(account).length) await tx.update(users).set({ ...account, updated_at: new Date() }).where(eq(users.id, s.id))
      const { full_name: _n, avatar_url: _a, ...details } = p
      if (Object.keys(details).length) await tx.update(profiles).set({ ...details, updated_at: new Date() }).where(eq(profiles.id, s.id))
      return studentProfile(tx, s.id)
    })
  })

  app.post("/api/student/enrollments", async (req) => {
    const s = me(req)
    const { course_id } = parse(z.object({ course_id: z.string().min(1).max(64) }), req.body)
    return db.transaction(async (tx) => {
      const c = await tx.query.courses.findFirst({ where: eq(courses.id, course_id) })
      if (!c) throw notFound("Course not found.")
      const [row] = await tx.insert(enrollments).values({ student_id: s.id, course_id }).onConflictDoNothing().returning({ enrolled_at: enrollments.enrolled_at })
      if (row) await openCertificates(tx, s.id, [course_id])
      const enrolledAt = row?.enrolled_at ?? (await tx.query.enrollments.findFirst({ where: and(eq(enrollments.student_id, s.id), eq(enrollments.course_id, course_id)) }))!.enrolled_at
      return { enrolled_at: enrolledAt }
    })
  })

  // Marks a lesson complete (or not), logs study time for today and issues the certificate when the course is done.
  app.post<{ Params: { id: string } }>("/api/student/lessons/:id/complete", async (req) => {
    const s = me(req)
    const { done } = parse(z.object({ done: z.boolean().default(true) }), req.body ?? {})
    const tz = ctx.config.CAMPUS_TZ
    return db.transaction(async (tx) => {
      const l = await tx.query.lessons.findFirst({ where: eq(lessons.id, req.params.id) })
      if (!l) throw notFound("Lesson not found.")
      const enrolled = await tx.query.enrollments.findFirst({ where: and(eq(enrollments.student_id, s.id), eq(enrollments.course_id, l.course_id)) })
      if (!enrolled) throw forbidden("Enroll in the course to track your progress.")
      const today = localDay(new Date(), tz)
      if (done) {
        const [added] = await tx.insert(lesson_progress).values({ student_id: s.id, lesson_id: l.id, course_id: l.course_id }).onConflictDoNothing().returning()
        if (added) {
          await tx
            .insert(study_activity)
            .values({ student_id: s.id, day: today, minutes: l.minutes, lessons: 1 })
            .onConflictDoUpdate({ target: [study_activity.student_id, study_activity.day], set: { minutes: sql`${study_activity.minutes} + ${l.minutes}`, lessons: sql`${study_activity.lessons} + 1` } })
        }
      } else {
        const [removed] = await tx.delete(lesson_progress).where(and(eq(lesson_progress.student_id, s.id), eq(lesson_progress.lesson_id, l.id))).returning()
        // Undoing a lesson completed today takes its minutes back off today's total.
        if (removed && localDay(removed.completed_at, tz) === today) {
          await tx
            .update(study_activity)
            .set({ minutes: sql`greatest(0, ${study_activity.minutes} - ${l.minutes})`, lessons: sql`greatest(0, ${study_activity.lessons} - 1)` })
            .where(and(eq(study_activity.student_id, s.id), eq(study_activity.day, today)))
        }
      }
      const [{ total }] = await tx.select({ total: count() }).from(lessons).where(eq(lessons.course_id, l.course_id))
      const [{ completed }] = await tx.select({ completed: count() }).from(lesson_progress).where(and(eq(lesson_progress.student_id, s.id), eq(lesson_progress.course_id, l.course_id)))
      const certificate = total > 0 && completed === total ? await issueCertificate(tx, s.id, l.course_id) : null
      return { course_id: l.course_id, completed, total, certificate }
    })
  })

  const submission = z.object({
    repo_url: z.string().max(400).nullish(),
    comments: z.string().max(4000, "Keep notes for the evaluator under 4,000 characters.").nullish(),
    file_key: z.string().max(400).nullish(),
    file_name: z.string().max(400).nullish(),
    file_size: z.string().max(40).nullish(),
  })

  app.post<{ Params: { id: string } }>("/api/student/assignments/:id/submission", async (req) => {
    const s = me(req)
    const b = parse(submission, req.body)
    const repo = trimmed(b.repo_url)
    const comments = trimmed(b.comments)
    if (repo && !/^https:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s]+/.test(repo)) throw badRequest("Use a GitHub link like https://github.com/you/project")
    const fileKey = await ownObject(ctx, s, "submissions", b.file_key)
    return db.transaction(async (tx) => {
      const a = await tx.query.assignments.findFirst({ where: eq(assignments.id, req.params.id) })
      if (!a) throw notFound("Assignment not found.")
      const enrolled = await tx.query.enrollments.findFirst({ where: and(eq(enrollments.student_id, s.id), eq(enrollments.course_id, a.course_id)) })
      if (!enrolled) throw forbidden("Enroll in the course to submit this assignment.")
      const prev = await tx.query.assignment_submissions.findFirst({ where: and(eq(assignment_submissions.student_id, s.id), eq(assignment_submissions.assignment_id, a.id)) })
      if (prev?.status === "Graded") throw badRequest("This assignment has already been graded.", "graded")
      if (prev?.status === "Under Review") throw badRequest("An evaluator is reviewing this submission, so it can't be changed now.", "under_review")
      if (!repo && !fileKey && !prev?.file_path) throw badRequest("Add a repository link or attach a file.")
      const now = new Date()
      const fileName = fileKey ? (b.file_name ?? "").slice(0, 200) || null : null
      const fileSize = fileKey ? (b.file_size ?? "").slice(0, 40) || null : null
      // A resubmission replaces the link and notes; the earlier file stays unless a new one is attached.
      const [row] = await tx
        .insert(assignment_submissions)
        .values({ student_id: s.id, assignment_id: a.id, repo_url: repo, comments, file_path: fileKey, file_name: fileName, file_size: fileSize, submitted_at: now })
        .onConflictDoUpdate({
          target: [assignment_submissions.student_id, assignment_submissions.assignment_id],
          set: {
            repo_url: repo,
            comments,
            file_path: fileKey ?? sql`${assignment_submissions.file_path}`,
            file_name: fileKey ? fileName : sql`${assignment_submissions.file_name}`,
            file_size: fileKey ? fileSize : sql`${assignment_submissions.file_size}`,
            status: "Submitted",
            submitted_at: now,
          },
        })
        .returning()
      await notify(tx, s.id, "assessment", "Submission received", `${a.title} was submitted for evaluation.`, "assessments")
      broadcastToChannel("evaluators", "new-submission", {
        assignmentId: a.id,
        assignmentTitle: a.title,
        studentId: s.id,
        submittedAt: now,
      })
      broadcastToChannel("notifications", "submission", {
        title: "Assignment Submitted",
        message: `${s.full_name} submitted ${a.title}`,
      })
      return row
    })
  })

  app.get<{ Params: { id: string } }>("/api/student/courses/:id/materials", async (req) =>
    db.select().from(course_materials).where(eq(course_materials.course_id, req.params.id)).orderBy(asc(course_materials.position)),
  )

  /* -------------------------------- Course Q&A -------------------------------- */

  app.get<{ Params: { id: string } }>("/api/student/courses/:id/questions", async (req) => {
    const s = me(req)
    const [questions, votes] = await Promise.all([
      db.select().from(course_questions).where(eq(course_questions.course_id, req.params.id)).orderBy(desc(course_questions.created_at)),
      db
        .select({ question_id: course_question_votes.question_id })
        .from(course_question_votes)
        .innerJoin(course_questions, eq(course_questions.id, course_question_votes.question_id))
        .where(and(eq(course_question_votes.student_id, s.id), eq(course_questions.course_id, req.params.id))),
    ])
    return { questions, voted: votes.map((v) => v.question_id) }
  })

  app.post<{ Params: { id: string } }>("/api/student/courses/:id/questions", async (req) => {
    const s = me(req)
    const { body } = parse(z.object({ body: z.string().trim().min(1, "Write your question.").max(2000) }), req.body)
    const c = await db.query.courses.findFirst({ where: eq(courses.id, req.params.id) })
    if (!c) throw notFound("Course not found.")
    const [row] = await db.insert(course_questions).values({ course_id: c.id, body, author_id: s.id, author_name: s.full_name, author_avatar: s.avatar_url }).returning()
    return row
  })

  app.put<{ Params: { id: string } }>("/api/student/questions/:id/vote", async (req) => {
    const s = me(req)
    const { on } = parse(z.object({ on: z.boolean() }), req.body)
    return db.transaction(async (tx) => {
      const q = await tx.query.course_questions.findFirst({ where: eq(course_questions.id, req.params.id) })
      if (!q) throw notFound("Question not found.")
      if (on) {
        const [added] = await tx.insert(course_question_votes).values({ question_id: q.id, student_id: s.id }).onConflictDoNothing().returning()
        if (added) await tx.update(course_questions).set({ vote_count: sql`${course_questions.vote_count} + 1` }).where(eq(course_questions.id, q.id))
      } else {
        const [removed] = await tx.delete(course_question_votes).where(and(eq(course_question_votes.question_id, q.id), eq(course_question_votes.student_id, s.id))).returning()
        if (removed) await tx.update(course_questions).set({ vote_count: sql`greatest(0, ${course_questions.vote_count} - 1)` }).where(eq(course_questions.id, q.id))
      }
      return { on }
    })
  })

  app.delete<{ Params: { id: string } }>("/api/student/questions/:id", async (req, reply) => {
    const s = me(req)
    const [gone] = await db.delete(course_questions).where(and(eq(course_questions.id, req.params.id), eq(course_questions.author_id, s.id))).returning({ id: course_questions.id })
    if (!gone) throw notFound("Question not found.")
    return reply.code(204).send()
  })
}
