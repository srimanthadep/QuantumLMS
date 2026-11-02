import { eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AuthUser } from "../../auth/users.js"
import type { AppContext } from "../../context.js"
import type { Tx } from "../../db/client.js"
import { assignment_submissions, assignments, evaluations, reevaluation_requests } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../../errors.js"
import { me, parse } from "../../http.js"
import { notify } from "../student/notify.js"
import { assertAssigned, cleanScores, letterGrade, rubricFor, scaled } from "./grading.js"
import { evaluationInput } from "./queue.js"

/** Re-evaluation requests on the assignments the evaluator marks, newest first. */
export async function loadReevaluations(db: Tx, user: AuthUser) {
  const rows = (
    await db.execute(sql`
      select r.id, r.status, r.reason, r.created_at, r.updated_at, r.resolved_at, r.original_score, r.revised_score, r.resolution,
             r.handled_by, hu.full_name as handled_by_name, r.submission_id,
             s.assignment_id, a.title as assignment_title, a.max_marks, c.code as course_code,
             s.student_id, u.full_name as student_name, u.avatar_url as student_avatar, p.roll_number, s.graded_at
      from lms.reevaluation_requests r
      join lms.assignment_submissions s on s.id = r.submission_id
      join lms.evaluator_assignments ea on ea.assignment_id = s.assignment_id and ea.evaluator_id = ${user.id}::uuid
      join lms.assignments a on a.id = s.assignment_id
      join lms.courses c on c.id = a.course_id
      join lms.users u on u.id = s.student_id
      left join lms.profiles p on p.id = s.student_id
      left join lms.users hu on hu.id = r.handled_by
      order by case when r.status in ('Pending', 'In Review') then 0 else 1 end, r.created_at desc`)
  ).rows as Record<string, any>[]
  return rows.map((r) => ({
    id: r.id as string,
    status: r.status as "Pending" | "In Review" | "Revised" | "Upheld",
    reason: r.reason as string,
    created_at: r.created_at as Date,
    updated_at: r.updated_at as Date,
    resolved_at: (r.resolved_at ?? null) as Date | null,
    original_score: r.original_score as number,
    revised_score: (r.revised_score ?? null) as number | null,
    resolution: (r.resolution ?? null) as string | null,
    handled_by: (r.handled_by ?? null) as string | null,
    handled_by_name: (r.handled_by_name ?? null) as string | null,
    mine: r.handled_by === user.id,
    submission_id: r.submission_id as string,
    assignment_id: r.assignment_id as string,
    assignment_title: r.assignment_title as string,
    max_marks: r.max_marks as number,
    course_code: r.course_code as string,
    student_id: r.student_id as string,
    student_name: r.student_name as string,
    student_avatar: (r.student_avatar ?? null) as string | null,
    roll_number: (r.roll_number ?? null) as string | null,
    graded_at: (r.graded_at ?? null) as Date | null,
  }))
}

/** The request locked for update, after checking the evaluator marks its assignment. */
async function lockRequest(tx: Tx, user: AuthUser, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Request not found.")
  const res = await tx.execute(sql`
    select r.*, s.assignment_id, s.student_id as owner_id from lms.reevaluation_requests r
    join lms.assignment_submissions s on s.id = r.submission_id
    where r.id = ${id}::uuid for update of r`)
  const r = res.rows[0] as { id: string; status: string; handled_by: string | null; submission_id: string; assignment_id: string; student_id: string; original_score: number } | undefined
  if (!r) throw notFound("Request not found.")
  await assertAssigned(tx, user.id, r.assignment_id)
  if (r.status === "Revised" || r.status === "Upheld") throw conflict("This request has been answered already.", "resolved")
  if (r.status === "In Review" && r.handled_by && r.handled_by !== user.id) {
    const [{ name }] = (await tx.execute(sql`select full_name as name from lms.users where id = ${r.handled_by}::uuid`)).rows as { name: string }[]
    throw conflict(`${name ?? "Another evaluator"} is reviewing this request.`, "claimed")
  }
  return r
}

const resolveInput = z.object({
  decision: z.enum(["revise", "uphold"]),
  resolution: z.string().trim().min(20, "Explain the decision to the student in a sentence or two.").max(2000, "Keep the explanation under 2,000 characters."),
  scores: evaluationInput.shape.scores,
})

export async function reevaluationRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db } = ctx

  app.get("/api/evaluator/reevaluations", async (req) => loadReevaluations(db, me(req)))

  /** Takes the request: the student sees it's being reviewed, and other evaluators see who has it. */
  app.post<{ Params: { id: string } }>("/api/evaluator/reevaluations/:id/start", async (req) => {
    const u = me(req)
    await db.transaction(async (tx) => {
      const r = await lockRequest(tx, u, req.params.id)
      if (r.status === "In Review") return
      await tx.update(reevaluation_requests).set({ status: "In Review", handled_by: u.id, updated_at: new Date() }).where(eq(reevaluation_requests.id, r.id))
    })
    return (await loadReevaluations(db, u)).find((r) => r.id === req.params.id)
  })

  /**
   * Answers the request. uphold keeps the grade; revise re-scores the rubric, and the student's score, grade and the
   * evaluation change to the new total. Either way the student is told why.
   */
  app.post<{ Params: { id: string } }>("/api/evaluator/reevaluations/:id/resolve", async (req) => {
    const u = me(req)
    const b = parse(resolveInput, req.body)
    await db.transaction(async (tx) => {
      const r = await lockRequest(tx, u, req.params.id)
      const [s] = await tx.select().from(assignment_submissions).where(eq(assignment_submissions.id, r.submission_id)).limit(1)
      const [a] = s ? await tx.select().from(assignments).where(eq(assignments.id, s.assignment_id)).limit(1) : []
      if (!s || !a) throw notFound("The submission no longer exists.")
      const now = new Date()
      if (b.decision === "uphold") {
        await tx
          .update(reevaluation_requests)
          .set({ status: "Upheld", resolution: b.resolution, handled_by: u.id, resolved_at: now, updated_at: now })
          .where(eq(reevaluation_requests.id, r.id))
        await notify(tx, s.student_id, "grade", "Re-evaluation answered", `Your score of ${r.original_score}/${a.max_marks} on ${a.title} stands. ${b.resolution}`.slice(0, 600), "assessments")
        return
      }
      const rubric = await rubricFor(tx, s.assignment_id)
      if (!rubric) throw badRequest("This assignment has no rubric to re-score.", "no_rubric")
      const { scores, total } = cleanScores(rubric, b.scores, true)
      const score = scaled(total, rubric.max_points, a.max_marks)
      if (score === r.original_score) throw badRequest("The new score matches the original. Uphold the grade instead.", "unchanged")
      const grade = letterGrade((score * 100) / a.max_marks)
      const [ev] = await tx.select().from(evaluations).where(eq(evaluations.submission_id, s.id)).limit(1)
      if (ev) {
        await tx.update(evaluations).set({ scores, total, updated_at: now }).where(eq(evaluations.id, ev.id))
      } else {
        // Graded before rubric scoring: the re-score becomes the evaluation on record.
        await tx.insert(evaluations).values({ submission_id: s.id, evaluator_id: u.id, status: "released", scores, total, feedback: s.feedback ?? "", started_at: now, updated_at: now, evaluated_at: now, released_at: now })
      }
      await tx.update(assignment_submissions).set({ score, grade, graded_at: now }).where(eq(assignment_submissions.id, s.id))
      await tx
        .update(reevaluation_requests)
        .set({ status: "Revised", revised_score: score, resolution: b.resolution, handled_by: u.id, resolved_at: now, updated_at: now })
        .where(eq(reevaluation_requests.id, r.id))
      await notify(tx, s.student_id, "grade", "Score revised", `${a.title}: ${r.original_score} → ${score}/${a.max_marks} (${grade}). ${b.resolution}`.slice(0, 600), "assessments")
    })
    return (await loadReevaluations(db, u)).find((r) => r.id === req.params.id)
  })
}
