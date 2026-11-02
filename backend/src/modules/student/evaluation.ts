import { and, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import { assignment_submissions, assignments, evaluations, reevaluation_requests, users } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../../errors.js"
import { me, parse } from "../../http.js"
import { rubricFor, type Scores } from "../evaluator/grading.js"
import { notify } from "./notify.js"

/** Students can ask for a re-evaluation this many days after a grade is released. */
export const REEVALUATION_WINDOW_DAYS = 14
const WINDOW_MS = REEVALUATION_WINDOW_DAYS * 86_400_000

const requestView = (r: typeof reevaluation_requests.$inferSelect) => ({
  id: r.id,
  status: r.status,
  reason: r.reason,
  created_at: r.created_at,
  original_score: r.original_score,
  revised_score: r.revised_score,
  resolution: r.resolution,
  resolved_at: r.resolved_at,
})

/** The student's side of evaluation: the rubric breakdown of released grades, and re-evaluation requests. */
export async function evaluationRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db } = ctx

  app.get<{ Params: { id: string } }>("/api/student/assignments/:id/evaluation", async (req) => {
    const s = me(req)
    const [sub] = await db
      .select()
      .from(assignment_submissions)
      .where(and(eq(assignment_submissions.student_id, s.id), eq(assignment_submissions.assignment_id, req.params.id)))
      .limit(1)
    if (!sub || sub.status !== "Graded") throw notFound("This assignment hasn't been graded yet.")
    const [[a], [ev], rubric, [request]] = await Promise.all([
      db.select().from(assignments).where(eq(assignments.id, sub.assignment_id)).limit(1),
      db.select({ e: evaluations, name: users.full_name }).from(evaluations).leftJoin(users, eq(users.id, evaluations.evaluator_id)).where(eq(evaluations.submission_id, sub.id)).limit(1),
      rubricFor(db, sub.assignment_id),
      db.select().from(reevaluation_requests).where(eq(reevaluation_requests.submission_id, sub.id)).limit(1),
    ])
    const closesAt = sub.graded_at ? new Date(sub.graded_at.getTime() + WINDOW_MS) : null
    const released = ev?.e.status === "released"
    return {
      assignment_id: sub.assignment_id,
      score: sub.score,
      grade: sub.grade,
      max_marks: a?.max_marks ?? 100,
      feedback: sub.feedback,
      graded_at: sub.graded_at,
      evaluator_name: released ? (ev?.name ?? null) : null,
      rubric: rubric ? { title: rubric.title, criteria: rubric.criteria.map((c) => ({ id: c.id, title: c.title, description: c.description, max_points: c.max_points })) } : null,
      // Comments and points per criterion; null for grades given before rubric scoring.
      scores: released ? (ev.e.scores as Scores) : null,
      reevaluation: request ? requestView(request) : null,
      reevaluation_closes_at: closesAt,
      can_request: !request && sub.score !== null && !!closesAt && closesAt.getTime() > Date.now(),
    }
  })

  app.post<{ Params: { id: string } }>("/api/student/assignments/:id/reevaluation", async (req) => {
    const s = me(req)
    const b = parse(
      z.object({
        reason: z.string().trim().min(20, "Say what you'd like checked again in a sentence or two.").max(1000, "Keep the reason under 1,000 characters."),
      }),
      req.body,
    )
    return db.transaction(async (tx) => {
      const res = await tx.execute(sql`
        select id, status, score, graded_at from lms.assignment_submissions
        where student_id = ${s.id}::uuid and assignment_id = ${req.params.id} for update`)
      const sub = res.rows[0] as { id: string; status: string; score: number | null; graded_at: Date | null } | undefined
      if (!sub) throw notFound("You haven't submitted this assignment.")
      if (sub.status !== "Graded" || sub.score === null) throw badRequest("You can ask for a re-evaluation once the grade is released.", "not_graded")
      const [existing] = await tx.select({ id: reevaluation_requests.id }).from(reevaluation_requests).where(eq(reevaluation_requests.submission_id, sub.id)).limit(1)
      if (existing) throw conflict("You've already asked for a re-evaluation of this assignment.", "duplicate")
      if (!sub.graded_at || Date.now() - new Date(sub.graded_at).getTime() > WINDOW_MS) {
        throw badRequest(`Re-evaluation requests close ${REEVALUATION_WINDOW_DAYS} days after a grade is released.`, "closed")
      }
      const [row] = await tx.insert(reevaluation_requests).values({ submission_id: sub.id, student_id: s.id, reason: b.reason, original_score: sub.score }).returning()
      const [a] = await tx.select({ title: assignments.title }).from(assignments).where(eq(assignments.id, req.params.id)).limit(1)
      await notify(tx, s.id, "assessment", "Re-evaluation requested", `An evaluator will look at ${a?.title ?? "your assignment"} again. We'll let you know the outcome.`, "assessments")
      return requestView(row)
    })
  })
}
