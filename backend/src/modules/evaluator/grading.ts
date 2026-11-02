import { and, asc, eq, sql } from "drizzle-orm"
import type { Tx } from "../../db/client.js"
import { assignment_submissions, assignments, evaluations, evaluator_assignments, rubric_criteria, rubrics } from "../../db/schema.js"
import { badRequest, notFound } from "../../errors.js"
import { notify } from "../student/notify.js"

/** One performance level of a criterion, best first in the rubric. */
export interface Level {
  label: string
  points: number
  description: string
}

/** A criterion's score in an evaluation. points is null while a draft hasn't scored it yet. */
export interface ScoreEntry {
  points: number | null
  comment: string
}
export type Scores = Record<string, ScoreEntry>

/** Letter grade for a percentage: the scale students see on graded work. */
export function letterGrade(pct: number): string {
  if (pct >= 90) return "A+"
  if (pct >= 85) return "A"
  if (pct >= 80) return "A-"
  if (pct >= 75) return "B+"
  if (pct >= 70) return "B"
  if (pct >= 65) return "B-"
  if (pct >= 60) return "C+"
  if (pct >= 55) return "C"
  if (pct >= 50) return "D"
  return "F"
}

/** The assignment's rubric with its criteria in order, or null when it has none. */
export async function rubricFor(tx: Tx, assignmentId: string) {
  const [r] = await tx.select().from(rubrics).where(eq(rubrics.assignment_id, assignmentId)).limit(1)
  if (!r) return null
  const rows = await tx.select().from(rubric_criteria).where(eq(rubric_criteria.rubric_id, r.id)).orderBy(asc(rubric_criteria.position))
  const criteria = rows.map((c) => ({ id: c.id, position: c.position, title: c.title, description: c.description, max_points: c.max_points, levels: (c.levels ?? []) as Level[] }))
  return { id: r.id, title: r.title, version: r.version, guidance: r.guidance, criteria, max_points: criteria.reduce((s, c) => s + c.max_points, 0) }
}
export type Rubric = NonNullable<Awaited<ReturnType<typeof rubricFor>>>

/**
 * Scores for the rubric's own criteria only. Points must be whole numbers from 0 to the criterion's maximum.
 * With complete, every criterion must have points (finishing an evaluation or revising a grade).
 */
export function cleanScores(rubric: Rubric, input: Record<string, { points?: number | null; comment?: string | null } | undefined>, complete: boolean) {
  const scores: Scores = {}
  let total = 0
  for (const c of rubric.criteria) {
    const v = input[c.id]
    const points = v?.points ?? null
    const comment = (v?.comment ?? "").trim().slice(0, 1000)
    if (points !== null && (!Number.isInteger(points) || points < 0 || points > c.max_points)) {
      throw badRequest(`Score "${c.title}" from 0 to ${c.max_points}.`, "out_of_range")
    }
    if (complete && points === null) throw badRequest(`Score "${c.title}" before finishing.`, "incomplete")
    if (points === null && !comment) continue
    scores[c.id] = { points, comment }
    total += points ?? 0
  }
  return { scores, total }
}

/** The rubric total on the assignment's scale (rubrics are written to add up to max_marks, but don't have to). */
export function scaled(total: number, rubricMax: number, maxMarks: number): number {
  if (!rubricMax) return 0
  return Math.round((total / rubricMax) * maxMarks)
}

/** Throws 404 unless the evaluator marks this assignment (other assignments' submissions don't exist for them). */
export async function assertAssigned(tx: Tx, evaluatorId: string, assignmentId: string) {
  const [row] = await tx
    .select({ id: evaluator_assignments.assignment_id })
    .from(evaluator_assignments)
    .where(and(eq(evaluator_assignments.evaluator_id, evaluatorId), eq(evaluator_assignments.assignment_id, assignmentId)))
    .limit(1)
  if (!row) throw notFound("Submission not found.")
}

/** The submission row locked for update, after checking the evaluator marks its assignment. */
export async function lockSubmission(tx: Tx, evaluatorId: string, submissionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) throw notFound("Submission not found.")
  const res = await tx.execute(sql`select * from lms.assignment_submissions where id = ${submissionId}::uuid for update`)
  const s = res.rows[0] as (typeof assignment_submissions.$inferSelect & { submitted_at: Date | string }) | undefined
  if (!s) throw notFound("Submission not found.")
  await assertAssigned(tx, evaluatorId, s.assignment_id)
  return { id: s.id, student_id: s.student_id, assignment_id: s.assignment_id, status: s.status, score: s.score }
}

/**
 * Releases a finished evaluation: the student's submission gets the score, letter grade and feedback, and the
 * student is notified. Returns the score, or null when the evaluation isn't ready (not finished, or already out).
 */
export async function releaseEvaluation(tx: Tx, evaluationId: string, now = new Date()) {
  const res = await tx.execute(sql`select * from lms.evaluations where id = ${evaluationId}::uuid for update`)
  const e = res.rows[0] as { id: string; submission_id: string; status: string; total: number; feedback: string } | undefined
  if (!e || e.status !== "evaluated") return null
  const [s] = await tx.select().from(assignment_submissions).where(eq(assignment_submissions.id, e.submission_id)).limit(1)
  if (!s) return null
  const [a] = await tx.select().from(assignments).where(eq(assignments.id, s.assignment_id)).limit(1)
  const rubric = await rubricFor(tx, s.assignment_id)
  if (!a || !rubric) return null
  const score = scaled(e.total, rubric.max_points, a.max_marks)
  const grade = letterGrade((score * 100) / a.max_marks)
  await tx.update(evaluations).set({ status: "released", released_at: now, updated_at: now }).where(eq(evaluations.id, e.id))
  await tx
    .update(assignment_submissions)
    .set({ status: "Graded", score, grade, feedback: e.feedback, graded_at: now })
    .where(eq(assignment_submissions.id, s.id))
  await notify(tx, s.student_id, "grade", "Assignment graded", `${a.title} · ${score}/${a.max_marks} (${grade})`, "assessments")
  return score
}
