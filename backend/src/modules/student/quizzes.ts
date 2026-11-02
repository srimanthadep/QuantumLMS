import { and, asc, eq, isNull, lt, sql } from "drizzle-orm"
import type { FastifyBaseLogger, FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import type { Db, Tx } from "../../db/client.js"
import { enrollments, quiz_attempts, quiz_questions, quizzes } from "../../db/schema.js"
import { badRequest, forbidden, notFound } from "../../errors.js"
import { me, parse } from "../../http.js"
import { fmtLocal } from "../../lib/time.js"
import { notify } from "./notify.js"

/** Final submits within this window after the deadline still count (network latency, the last click). */
export const GRACE_MS = 30_000

type Attempt = typeof quiz_attempts.$inferSelect

const answersSchema = z.record(z.string(), z.unknown())

/** Keeps only answers for real questions with an option index in range. Keys are "0".."n-1". */
async function cleanAnswers(tx: Tx, quizId: string, answers: unknown): Promise<Record<string, number>> {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return {}
  const qs = await tx.select({ position: quiz_questions.position, options: quiz_questions.options }).from(quiz_questions).where(eq(quiz_questions.quiz_id, quizId))
  const sizes = new Map(qs.map((q) => [String(q.position - 1), q.options.length]))
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(answers as Record<string, unknown>)) {
    const size = sizes.get(k)
    if (size !== undefined && typeof v === "number" && Number.isInteger(v) && v >= 0 && v < size) out[k] = v
  }
  return out
}

/** Grades an open attempt in place: score, percentage, pass/fail and feedback. No-op once graded. */
export async function gradeAttempt(tx: Tx, attemptId: string, opts: { notify?: boolean; now?: Date } = {}) {
  const res = await tx.execute(sql`select * from lms.quiz_attempts where id = ${attemptId} for update`)
  const a = res.rows[0] as Record<string, unknown> | undefined
  if (!a || a.submitted_at) return
  const q = await tx.query.quizzes.findFirst({ where: eq(quizzes.id, String(a.quiz_id)) })
  if (!q) return
  const qs = await tx.select({ position: quiz_questions.position, correct: quiz_questions.correct_index }).from(quiz_questions).where(eq(quiz_questions.quiz_id, q.id))
  const answers = (a.answers ?? {}) as Record<string, number>
  const score = qs.filter((x) => answers[String(x.position - 1)] === x.correct).length
  const max = Math.max(qs.length, 1)
  const pct = Math.round((score * 100) / max)
  const now = opts.now ?? new Date()
  const deadline = new Date(a.deadline_at as string | Date)
  const started = new Date(a.started_at as string | Date)
  const end = now < deadline ? now : deadline
  const passed = pct >= q.passing_pct
  await tx
    .update(quiz_attempts)
    .set({
      submitted_at: end,
      time_taken_seconds: Math.max(1, Math.ceil((end.getTime() - started.getTime()) / 1000)),
      score,
      max_score: max,
      pct,
      passed,
      feedback: passed
        ? "Strong work. Review the explanations below to lock in the concepts you missed."
        : `You need ${q.passing_pct}% to pass. Revisit the module material, then review each explanation below.`,
    })
    .where(eq(quiz_attempts.id, attemptId))
  if (opts.notify !== false) {
    await notify(tx, String(a.student_id), "assessment", "Quiz graded", `${q.title} · ${score}/${max} (${pct}%)`, "quizzes", "grades")
  }
}

/** Grades open attempts whose deadline (plus grace) has passed, each in its own (sub)transaction. Returns how many. */
export async function finalizeExpired(db: Tx, studentId?: string): Promise<number> {
  const cutoff = new Date(Date.now() - GRACE_MS)
  const open = await db
    .select({ id: quiz_attempts.id })
    .from(quiz_attempts)
    .where(and(isNull(quiz_attempts.submitted_at), lt(quiz_attempts.deadline_at, cutoff), studentId ? eq(quiz_attempts.student_id, studentId) : undefined))
  // Inside a transaction this opens a savepoint, so one attempt that can't be graded doesn't undo the others.
  for (const { id } of open) await (db as Db).transaction((tx) => gradeAttempt(tx, id))
  return open.length
}

/**
 * Background sweep for attempts that ran out while the student was away. One instance at a time: the transaction-
 * scoped advisory lock works through any connection pooler (Supabase session or transaction mode, RDS Proxy).
 */
export function startQuizSweep(ctx: AppContext, log: FastifyBaseLogger): () => void {
  const seconds = ctx.config.QUIZ_SWEEP_SECONDS
  if (!seconds) return () => undefined
  const run = async () => {
    try {
      const n = await ctx.db.transaction(async (tx) => {
        const lock = await tx.execute(sql`select pg_try_advisory_xact_lock(7419001) as ok`)
        if (!(lock.rows[0] as { ok?: boolean } | undefined)?.ok) return 0
        return finalizeExpired(tx)
      })
      if (n) log.info({ graded: n }, "graded expired quiz attempts")
    } catch (err) {
      log.warn({ err }, "quiz sweep failed")
    }
  }
  const timer = setInterval(() => void run(), seconds * 1000)
  timer.unref()
  return () => clearInterval(timer)
}

async function questionsFor(tx: Tx, quizId: string, withAnswers: boolean) {
  const rows = await tx.select().from(quiz_questions).where(eq(quiz_questions.quiz_id, quizId)).orderBy(asc(quiz_questions.position))
  return rows.map((q) => ({
    position: q.position,
    question: q.question,
    options: q.options,
    topic: q.topic,
    difficulty: q.difficulty,
    ...(withAnswers ? { correct_index: q.correct_index, explanation: q.explanation } : {}),
  }))
}

/** Questions (never answers) plus the attempt's id, deadline and saved answers. */
async function attemptPayload(tx: Tx, a: Attempt) {
  return {
    attempt_id: a.id,
    attempt_number: a.attempt_number,
    started_at: a.started_at,
    deadline_at: a.deadline_at,
    // The client runs its countdown from server_now so a skewed device clock can't shorten or stretch the quiz.
    server_now: new Date(),
    answers: a.answers,
    questions: await questionsFor(tx, a.quiz_id, false),
  }
}

async function ownAttempt(tx: Tx, studentId: string, attemptId: string, lock = false): Promise<Attempt> {
  const rows = lock
    ? ((await tx.execute(sql`select * from lms.quiz_attempts where id = ${attemptId} and student_id = ${studentId}::uuid for update`)).rows as unknown as Attempt[])
    : await tx.select().from(quiz_attempts).where(and(eq(quiz_attempts.id, attemptId), eq(quiz_attempts.student_id, studentId))).limit(1)
  const a = rows[0]
  if (!a) throw notFound("Quiz attempt not found.")
  return { ...a, deadline_at: new Date(a.deadline_at), started_at: new Date(a.started_at), submitted_at: a.submitted_at ? new Date(a.submitted_at) : null }
}

async function review(tx: Tx, studentId: string, attemptId: string) {
  const a = await ownAttempt(tx, studentId, attemptId)
  if (!a.submitted_at) throw badRequest("Submit the quiz to see the answers.")
  const { student_id: _omit, ...attempt } = a
  return { attempt, questions: await questionsFor(tx, a.quiz_id, true) }
}

export async function quizRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/api/student/quiz-attempts", async (req) => {
    const s = me(req)
    await finalizeExpired(ctx.db, s.id)
    const rows = await ctx.db.select().from(quiz_attempts).where(eq(quiz_attempts.student_id, s.id)).orderBy(asc(quiz_attempts.started_at))
    return rows.map(({ student_id: _s, ...r }) => r)
  })

  app.post<{ Params: { id: string } }>("/api/student/quizzes/:id/start", async (req) => {
    const s = me(req)
    await finalizeExpired(ctx.db, s.id)
    return ctx.db.transaction(async (tx) => {
      const q = await tx.query.quizzes.findFirst({ where: eq(quizzes.id, req.params.id) })
      if (!q) throw notFound("Quiz not found.")
      const enrolled = await tx.query.enrollments.findFirst({ where: and(eq(enrollments.student_id, s.id), eq(enrollments.course_id, q.course_id)) })
      if (!enrolled) throw forbidden("Enroll in the course to take this quiz.")
      // Serialise starts per student and quiz, so a double click can't open two attempts.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${s.id} || ':' || ${q.id}))`)
      const [open] = await tx.select().from(quiz_attempts).where(and(eq(quiz_attempts.student_id, s.id), eq(quiz_attempts.quiz_id, q.id), isNull(quiz_attempts.submitted_at))).limit(1)
      if (open) return attemptPayload(tx, open)
      const now = new Date()
      const tz = ctx.config.CAMPUS_TZ
      if (q.available_from && now < q.available_from) throw badRequest(`This quiz opens on ${fmtLocal(q.available_from, tz)}.`, "not_open")
      if (now > q.due_at) throw badRequest(`This quiz closed on ${fmtLocal(q.due_at, tz)}.`, "closed")
      const [{ used }] = await tx.select({ used: sql<number>`count(*)::int` }).from(quiz_attempts).where(and(eq(quiz_attempts.student_id, s.id), eq(quiz_attempts.quiz_id, q.id)))
      if (used >= q.max_attempts) throw badRequest(`You have used all ${q.max_attempts} attempt(s) for this quiz.`, "no_attempts")
      const deadline = new Date(Math.min(now.getTime() + q.duration_minutes * 60_000, q.due_at.getTime()))
      const [a] = await tx.insert(quiz_attempts).values({ student_id: s.id, quiz_id: q.id, attempt_number: used + 1, started_at: now, deadline_at: deadline }).returning()
      return attemptPayload(tx, a)
    })
  })

  // Autosave while the timer runs. Ignored once the attempt is graded or past its deadline.
  app.put<{ Params: { id: string } }>("/api/student/quiz-attempts/:id/answers", async (req, reply) => {
    const s = me(req)
    const { answers } = parse(z.object({ answers: answersSchema }), req.body)
    await ctx.db.transaction(async (tx) => {
      const a = await ownAttempt(tx, s.id, req.params.id, true)
      if (!a.submitted_at && Date.now() <= a.deadline_at.getTime() + GRACE_MS) {
        await tx.update(quiz_attempts).set({ answers: await cleanAnswers(tx, a.quiz_id, answers) }).where(eq(quiz_attempts.id, a.id))
      }
    })
    return reply.code(204).send()
  })

  // Final submit. Answers sent within the grace period replace the autosaved ones; later ones are ignored.
  app.post<{ Params: { id: string } }>("/api/student/quiz-attempts/:id/submit", async (req) => {
    const s = me(req)
    const { answers } = parse(z.object({ answers: answersSchema.nullish() }), req.body ?? {})
    return ctx.db.transaction(async (tx) => {
      const a = await ownAttempt(tx, s.id, req.params.id, true)
      if (!a.submitted_at) {
        if (answers && Date.now() <= a.deadline_at.getTime() + GRACE_MS) {
          await tx.update(quiz_attempts).set({ answers: await cleanAnswers(tx, a.quiz_id, answers) }).where(eq(quiz_attempts.id, a.id))
        }
        await gradeAttempt(tx, a.id)
      }
      return review(tx, s.id, a.id)
    })
  })

  app.get<{ Params: { id: string } }>("/api/student/quiz-attempts/:id/review", async (req) => {
    const s = me(req)
    return ctx.db.transaction((tx) => review(tx, s.id, req.params.id))
  })
}
