import path from "node:path"
import { and, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AuthUser } from "../../auth/users.js"
import type { AppContext } from "../../context.js"
import type { Tx } from "../../db/client.js"
import { assignment_submissions, evaluations, users } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../../errors.js"
import { me, parse } from "../../http.js"
import { assertAssigned, cleanScores, letterGrade, lockSubmission, releaseEvaluation, rubricFor, scaled, type Scores } from "./grading.js"

export type QueueState = "pending" | "draft" | "evaluated" | "released"

/** Text files the workspace shows inline (by extension). Everything else is opened or downloaded. */
const PREVIEW: Record<string, string> = {
  ".py": "python", ".ipynb": "notebook", ".md": "markdown", ".txt": "text", ".json": "json", ".csv": "csv", ".js": "javascript",
  ".ts": "typescript", ".tsx": "typescript", ".jsx": "javascript", ".java": "java", ".c": "c", ".cpp": "cpp", ".go": "go",
  ".rs": "rust", ".sql": "sql", ".yaml": "yaml", ".yml": "yaml", ".r": "r", ".sh": "shell", ".tex": "latex", ".html": "html",
}
const PREVIEW_BYTES = 200 * 1024
export const previewLanguage = (name: string | null | undefined) => (name ? (PREVIEW[path.extname(name).toLowerCase()] ?? null) : null)

const scoreInput = z.record(
  z.string().max(80),
  z.object({
    points: z.number().int("Use whole points.").min(0).max(1000).nullable().default(null),
    comment: z.string().max(1000, "Keep each criterion comment under 1,000 characters.").default(""),
  }),
)
export const evaluationInput = z.object({
  scores: scoreInput.default({}),
  feedback: z.string().max(4000, "Keep the feedback under 4,000 characters.").default(""),
  private_note: z.string().max(2000, "Keep the private note under 2,000 characters.").default(""),
})
const finishInput = evaluationInput.extend({ release: z.boolean().default(false) })

/** Every submission to the assignments the evaluator marks, oldest first, with its evaluation state. */
export async function loadQueue(db: Tx, user: AuthUser) {
  const rows = (
    await db.execute(sql`
      select s.id, s.assignment_id, s.submitted_at, s.status as submission_status, s.repo_url, s.file_name, s.score as released_score,
             s.grade as released_grade, s.graded_at,
             a.title as assignment_title, a.due_at, a.max_marks, c.code as course_code, c.title as course_title,
             s.student_id, u.full_name as student_name, u.avatar_url as student_avatar, p.roll_number,
             e.id as evaluation_id, e.status as evaluation_status, e.evaluator_id, eu.full_name as evaluator_name, e.total,
             e.updated_at as evaluation_updated_at, e.evaluated_at, e.released_at,
             r.status as reevaluation_status,
             (select sum(rc.max_points) from lms.rubrics rb join lms.rubric_criteria rc on rc.rubric_id = rb.id where rb.assignment_id = a.id)::int as rubric_max
      from lms.assignment_submissions s
      join lms.evaluator_assignments ea on ea.assignment_id = s.assignment_id and ea.evaluator_id = ${user.id}::uuid
      join lms.assignments a on a.id = s.assignment_id
      join lms.courses c on c.id = a.course_id
      join lms.users u on u.id = s.student_id
      left join lms.profiles p on p.id = s.student_id
      left join lms.evaluations e on e.submission_id = s.id
      left join lms.users eu on eu.id = e.evaluator_id
      left join lms.reevaluation_requests r on r.submission_id = s.id
      order by s.submitted_at asc
      limit 2000`)
  ).rows as Record<string, any>[]

  return rows.map((r) => {
    const state: QueueState = r.evaluation_status ?? (r.submission_status === "Graded" ? "released" : "pending")
    const score = state === "released" ? (r.released_score ?? null) : r.evaluation_id ? scaled(r.total ?? 0, r.rubric_max ?? 0, r.max_marks) : null
    return {
      id: r.id as string,
      assignment_id: r.assignment_id as string,
      assignment_title: r.assignment_title as string,
      course_code: r.course_code as string,
      course_title: r.course_title as string,
      due_at: r.due_at as Date,
      max_marks: r.max_marks as number,
      student_id: r.student_id as string,
      student_name: r.student_name as string,
      student_avatar: (r.student_avatar ?? null) as string | null,
      roll_number: (r.roll_number ?? null) as string | null,
      submitted_at: r.submitted_at as Date,
      late: new Date(r.submitted_at).getTime() > new Date(r.due_at).getTime(),
      repo_url: (r.repo_url ?? null) as string | null,
      file_name: (r.file_name ?? null) as string | null,
      state,
      evaluator_id: (r.evaluator_id ?? null) as string | null,
      evaluator_name: (r.evaluator_name ?? null) as string | null,
      mine: r.evaluator_id === user.id,
      score: score as number | null,
      grade: state === "released" ? ((r.released_grade ?? null) as string | null) : state === "evaluated" && score !== null ? letterGrade((score * 100) / r.max_marks) : null,
      evaluation_updated_at: (r.evaluation_updated_at ?? null) as Date | null,
      evaluated_at: (r.evaluated_at ?? (state === "released" ? r.graded_at : null) ?? null) as Date | null,
      released_at: (r.released_at ?? (state === "released" ? r.graded_at : null) ?? null) as Date | null,
      reevaluation_status: (r.reevaluation_status ?? null) as string | null,
    }
  })
}
export type QueueItem = Awaited<ReturnType<typeof loadQueue>>[number]

/** The assignments the evaluator marks, with rubric details and how far marking has got. */
async function loadAssessments(db: Tx, user: AuthUser, items: QueueItem[]) {
  const rows = (
    await db.execute(sql`
      select a.id, a.title, a.description, a.due_at, a.max_marks, c.code as course_code, c.title as course_title,
             rb.title as rubric_title, (select count(*) from lms.rubric_criteria rc where rc.rubric_id = rb.id)::int as criteria_count,
             (select count(*) from lms.enrollments en where en.course_id = a.course_id)::int as enrolled
      from lms.evaluator_assignments ea
      join lms.assignments a on a.id = ea.assignment_id
      join lms.courses c on c.id = a.course_id
      left join lms.rubrics rb on rb.assignment_id = a.id
      where ea.evaluator_id = ${user.id}::uuid
      order by a.due_at asc`)
  ).rows as Record<string, any>[]
  return rows.map((a) => {
    const mine = items.filter((i) => i.assignment_id === a.id)
    const count = (s: QueueState) => mine.filter((i) => i.state === s).length
    return {
      id: a.id as string,
      title: a.title as string,
      description: a.description as string,
      due_at: a.due_at as Date,
      max_marks: a.max_marks as number,
      course_code: a.course_code as string,
      course_title: a.course_title as string,
      rubric_title: (a.rubric_title ?? null) as string | null,
      criteria_count: a.criteria_count as number,
      enrolled: a.enrolled as number,
      submissions: mine.length,
      pending: count("pending"),
      drafts: count("draft"),
      evaluated: count("evaluated"),
      released: count("released"),
    }
  })
}

function evaluationView(e: typeof evaluations.$inferSelect, evaluatorName: string | null, user: AuthUser) {
  const mine = e.evaluator_id === user.id
  return {
    id: e.id,
    status: e.status as "draft" | "evaluated" | "released",
    scores: e.scores as Scores,
    total: e.total,
    feedback: e.feedback,
    private_note: mine ? e.private_note : "",
    evaluator_id: e.evaluator_id,
    evaluator_name: evaluatorName,
    mine,
    started_at: e.started_at,
    updated_at: e.updated_at,
    evaluated_at: e.evaluated_at,
    released_at: e.released_at,
  }
}

async function evaluationOf(tx: Tx, submissionId: string) {
  const [row] = await tx
    .select({ e: evaluations, name: users.full_name })
    .from(evaluations)
    .leftJoin(users, eq(users.id, evaluations.evaluator_id))
    .where(eq(evaluations.submission_id, submissionId))
    .limit(1)
  return row ?? null
}

/** Refuses changes to an evaluation the caller can't edit, with a reason they can act on. */
function assertEditable(row: { e: typeof evaluations.$inferSelect; name: string | null } | null, user: AuthUser, submissionStatus: string) {
  if (!row) {
    if (submissionStatus === "Graded") throw conflict("This submission was graded already. Changes go through a re-evaluation request.", "released")
    return
  }
  const { e, name } = row
  if (e.status === "released") throw conflict("This grade is released. Changes go through a re-evaluation request.", "released")
  if (e.evaluator_id && e.evaluator_id !== user.id) throw conflict(`${name ?? "Another evaluator"} is evaluating this submission.`, "claimed")
  if (e.status === "evaluated") throw conflict("This evaluation is finished. Reopen it to make changes.", "finished")
}

export async function queueRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db } = ctx

  app.get("/api/evaluator/queue", async (req) => {
    const u = me(req)
    const items = await loadQueue(db, u)
    return { items, assessments: await loadAssessments(db, u, items) }
  })

  app.get<{ Params: { id: string } }>("/api/evaluator/submissions/:id", async (req) => {
    const u = me(req)
    const id = req.params.id
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Submission not found.")
    const row = (
      await db.execute(sql`
        select s.*, a.title as assignment_title, a.description as assignment_description, a.due_at, a.max_marks,
               c.code as course_code, c.title as course_title,
               u.full_name as student_name, u.avatar_url as student_avatar, p.roll_number, p.program, p.batch
        from lms.assignment_submissions s
        join lms.assignments a on a.id = s.assignment_id
        join lms.courses c on c.id = a.course_id
        join lms.users u on u.id = s.student_id
        left join lms.profiles p on p.id = s.student_id
        where s.id = ${id}::uuid`)
    ).rows[0] as Record<string, any> | undefined
    if (!row) throw notFound("Submission not found.")
    await assertAssigned(db, u.id, row.assignment_id)

    const [rubric, ev, history, request] = await Promise.all([
      rubricFor(db, row.assignment_id),
      evaluationOf(db, id),
      db.execute(sql`
        select count(*)::int as graded, round(avg(s.score * 100.0 / a.max_marks))::int as avg_pct
        from lms.assignment_submissions s join lms.assignments a on a.id = s.assignment_id
        where s.student_id = ${row.student_id}::uuid and s.status = 'Graded' and s.id <> ${id}::uuid`),
      db.execute(sql`
        select r.*, hu.full_name as handled_by_name from lms.reevaluation_requests r
        left join lms.users hu on hu.id = r.handled_by where r.submission_id = ${id}::uuid`),
    ])
    const stats = history.rows[0] as { graded: number; avg_pct: number | null }
    const r = request.rows[0] as Record<string, any> | undefined
    return {
      submission: {
        id: row.id as string,
        status: row.status as string,
        submitted_at: row.submitted_at as Date,
        late: new Date(row.submitted_at).getTime() > new Date(row.due_at).getTime(),
        repo_url: (row.repo_url ?? null) as string | null,
        comments: (row.comments ?? null) as string | null,
        file: row.file_path ? { name: (row.file_name as string | null) ?? path.basename(row.file_path), size: (row.file_size ?? null) as string | null, language: previewLanguage(row.file_name ?? row.file_path) } : null,
        score: (row.score ?? null) as number | null,
        grade: (row.grade ?? null) as string | null,
        graded_at: (row.graded_at ?? null) as Date | null,
      },
      student: {
        id: row.student_id as string,
        name: row.student_name as string,
        avatar_url: (row.student_avatar ?? null) as string | null,
        roll_number: (row.roll_number ?? null) as string | null,
        program: (row.program ?? null) as string | null,
        batch: (row.batch ?? null) as string | null,
        graded_count: stats?.graded ?? 0,
        average_pct: stats?.avg_pct ?? null,
      },
      assignment: {
        id: row.assignment_id as string,
        title: row.assignment_title as string,
        description: row.assignment_description as string,
        due_at: row.due_at as Date,
        max_marks: row.max_marks as number,
        course_code: row.course_code as string,
        course_title: row.course_title as string,
      },
      rubric,
      evaluation: ev ? evaluationView(ev.e, ev.name, u) : null,
      reevaluation: r
        ? {
            id: r.id as string,
            status: r.status as string,
            reason: r.reason as string,
            created_at: r.created_at as Date,
            original_score: r.original_score as number,
            revised_score: (r.revised_score ?? null) as number | null,
            resolution: (r.resolution ?? null) as string | null,
            handled_by: (r.handled_by ?? null) as string | null,
            handled_by_name: (r.handled_by_name ?? null) as string | null,
            mine: r.handled_by === u.id,
            resolved_at: (r.resolved_at ?? null) as Date | null,
          }
        : null,
    }
  })

  /** A short-lived link to the submitted file. */
  app.get<{ Params: { id: string } }>("/api/evaluator/submissions/:id/file", async (req) => {
    const u = me(req)
    const s = await submissionFile(db, u, req.params.id)
    return { url: await ctx.storage.createDownloadUrl(s.key, { filename: s.name, expiresInSeconds: 600 }) }
  })

  /** The submitted file's text for the inline viewer (code, notebooks, notes), up to 200 KB. */
  app.get<{ Params: { id: string } }>("/api/evaluator/submissions/:id/file/preview", async (req) => {
    const u = me(req)
    const s = await submissionFile(db, u, req.params.id)
    const language = previewLanguage(s.name)
    if (!language) throw badRequest("This file type can't be previewed. Open it instead.", "no_preview")
    const file = await ctx.storage.read(s.key, PREVIEW_BYTES)
    if (!file) throw notFound("The file is no longer available.")
    return { name: s.name, language, size: file.size, truncated: file.size > file.data.length, text: file.data.toString("utf8") }
  })

  /** Saves a draft. The first save claims the submission for the caller and marks it under review for the student. */
  app.put<{ Params: { id: string } }>("/api/evaluator/submissions/:id/evaluation", async (req) => {
    const u = me(req)
    const b = parse(evaluationInput, req.body)
    return db.transaction(async (tx) => {
      const s = await lockSubmission(tx, u.id, req.params.id)
      const rubric = await rubricFor(tx, s.assignment_id)
      if (!rubric) throw badRequest("This assignment has no rubric yet.", "no_rubric")
      const current = await evaluationOf(tx, s.id)
      assertEditable(current, u, s.status)
      const { scores, total } = cleanScores(rubric, b.scores, false)
      const now = new Date()
      const values = { scores, total, feedback: b.feedback.trim(), private_note: b.private_note.trim(), evaluator_id: u.id, updated_at: now }
      const [e] = current
        ? await tx.update(evaluations).set(values).where(eq(evaluations.id, current.e.id)).returning()
        : await tx.insert(evaluations).values({ ...values, submission_id: s.id, status: "draft", started_at: now }).returning()
      if (s.status === "Submitted") await tx.update(assignment_submissions).set({ status: "Under Review" }).where(eq(assignment_submissions.id, s.id))
      return evaluationView(e, u.full_name, u)
    })
  })

  /** Finishes the evaluation (every criterion scored, feedback written), and releases it at once when asked. */
  app.post<{ Params: { id: string } }>("/api/evaluator/submissions/:id/evaluation/finish", async (req) => {
    const u = me(req)
    const b = parse(finishInput, req.body)
    return db.transaction(async (tx) => {
      const s = await lockSubmission(tx, u.id, req.params.id)
      const rubric = await rubricFor(tx, s.assignment_id)
      if (!rubric) throw badRequest("This assignment has no rubric yet.", "no_rubric")
      const current = await evaluationOf(tx, s.id)
      assertEditable(current, u, s.status)
      const { scores, total } = cleanScores(rubric, b.scores, true)
      const feedback = b.feedback.trim()
      if (feedback.length < 20) throw badRequest("Write at least a sentence of feedback for the student.", "feedback")
      const now = new Date()
      const values = { scores, total, feedback, private_note: b.private_note.trim(), evaluator_id: u.id, status: "evaluated", evaluated_at: now, updated_at: now }
      const [e] = current
        ? await tx.update(evaluations).set(values).where(eq(evaluations.id, current.e.id)).returning()
        : await tx.insert(evaluations).values({ ...values, submission_id: s.id, started_at: now }).returning()
      if (s.status === "Submitted") await tx.update(assignment_submissions).set({ status: "Under Review" }).where(eq(assignment_submissions.id, s.id))
      const released = b.release ? (await releaseEvaluation(tx, e.id, now)) !== null : false
      const [after] = await tx.select().from(evaluations).where(eq(evaluations.id, e.id)).limit(1)
      return { evaluation: evaluationView(after, u.full_name, u), released }
    })
  })

  /** Back to draft, before release. */
  app.post<{ Params: { id: string } }>("/api/evaluator/submissions/:id/evaluation/reopen", async (req) => {
    const u = me(req)
    return db.transaction(async (tx) => {
      const s = await lockSubmission(tx, u.id, req.params.id)
      const current = await evaluationOf(tx, s.id)
      if (!current) throw notFound("There's no evaluation to reopen.")
      if (current.e.status === "released") throw conflict("This grade is released. Changes go through a re-evaluation request.", "released")
      if (current.e.evaluator_id !== u.id) throw conflict(`${current.name ?? "Another evaluator"} owns this evaluation.`, "claimed")
      if (current.e.status === "draft") return evaluationView(current.e, current.name, u)
      const [e] = await tx.update(evaluations).set({ status: "draft", evaluated_at: null, updated_at: new Date() }).where(eq(evaluations.id, current.e.id)).returning()
      return evaluationView(e, u.full_name, u)
    })
  })

  /** Drops the caller's draft, so the submission goes back to the queue. */
  app.delete<{ Params: { id: string } }>("/api/evaluator/submissions/:id/evaluation", async (req, reply) => {
    const u = me(req)
    await db.transaction(async (tx) => {
      const s = await lockSubmission(tx, u.id, req.params.id)
      const current = await evaluationOf(tx, s.id)
      if (!current) return
      if (current.e.evaluator_id !== u.id) throw conflict(`${current.name ?? "Another evaluator"} owns this evaluation.`, "claimed")
      if (current.e.status !== "draft") throw conflict("Only drafts can be discarded. Reopen the evaluation first.", "finished")
      await tx.delete(evaluations).where(eq(evaluations.id, current.e.id))
      if (s.status === "Under Review") await tx.update(assignment_submissions).set({ status: "Submitted" }).where(eq(assignment_submissions.id, s.id))
    })
    return reply.code(204).send()
  })

  /** Releases the caller's finished evaluations to their students. */
  app.post("/api/evaluator/release", async (req) => {
    const u = me(req)
    const b = parse(z.object({ submission_ids: z.array(z.string().uuid()).min(1, "Choose at least one evaluation to release.").max(200) }), req.body)
    return db.transaction(async (tx) => {
      let released = 0
      const now = new Date()
      for (const id of [...new Set(b.submission_ids)]) {
        const s = await lockSubmission(tx, u.id, id).catch(() => null)
        if (!s) continue
        const [e] = await tx.select().from(evaluations).where(and(eq(evaluations.submission_id, s.id), eq(evaluations.evaluator_id, u.id))).limit(1)
        if (e && (await releaseEvaluation(tx, e.id, now)) !== null) released++
      }
      return { released, skipped: b.submission_ids.length - released }
    })
  })
}

async function submissionFile(db: Tx, u: AuthUser, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Submission not found.")
  const [s] = await db.select().from(assignment_submissions).where(eq(assignment_submissions.id, id)).limit(1)
  if (!s) throw notFound("Submission not found.")
  await assertAssigned(db, u.id, s.assignment_id)
  if (!s.file_path) throw notFound("This submission has no file.")
  return { key: s.file_path, name: s.file_name ?? path.basename(s.file_path) }
}
