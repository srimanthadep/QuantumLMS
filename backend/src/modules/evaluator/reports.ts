import { sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import type { AppContext } from "../../context.js"
import { me } from "../../http.js"
import { addDays, localDay } from "../../lib/time.js"
import { letterGrade, rubricsFor, scaled, type Scores } from "./grading.js"

const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"] as const

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}
const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)

/**
 * Marking reports for the assignments the evaluator marks: the evaluator's own pace, and per assignment the score
 * spread, letter grades and how students did on each rubric criterion. Finished work counts (evaluated or released,
 * plus grades given before rubric scoring).
 */
export async function reportRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db } = ctx
  const tz = ctx.config.CAMPUS_TZ

  app.get("/api/evaluator/reports", async (req) => {
    const u = me(req)
    const [rowsRes, requestsRes] = await Promise.all([
      db.execute(sql`
        select s.id, s.assignment_id, s.submitted_at, s.status as submission_status, s.score as released_score,
               a.title, a.max_marks, a.due_at, c.code as course_code,
               e.status, e.scores, e.total, e.evaluator_id, eu.full_name as evaluator_name, e.evaluated_at, e.released_at
        from lms.assignment_submissions s
        join lms.evaluator_assignments ea on ea.assignment_id = s.assignment_id and ea.evaluator_id = ${u.id}::uuid
        join lms.assignments a on a.id = s.assignment_id
        join lms.courses c on c.id = a.course_id
        left join lms.evaluations e on e.submission_id = s.id
        left join lms.users eu on eu.id = e.evaluator_id`),
      db.execute(sql`
        select r.status, r.original_score, r.revised_score from lms.reevaluation_requests r
        join lms.assignment_submissions s on s.id = r.submission_id
        join lms.evaluator_assignments ea on ea.assignment_id = s.assignment_id and ea.evaluator_id = ${u.id}::uuid`),
    ])
    const rows = rowsRes.rows as Record<string, any>[]
    const requests = requestsRes.rows as { status: string; original_score: number; revised_score: number | null }[]

    const assignmentIds = [...new Set(rows.map((r) => r.assignment_id as string))]
    const rubricOf = await rubricsFor(db, assignmentIds)

    const finished = (r: Record<string, any>) => r.status === "evaluated" || r.status === "released" || (!r.status && r.submission_status === "Graded")
    const pctOf = (r: Record<string, any>) => {
      const rubric = rubricOf.get(r.assignment_id)
      const score = r.status ? scaled(r.total ?? 0, rubric?.max_points ?? 0, r.max_marks) : (r.released_score ?? 0)
      return Math.round((score * 100) / r.max_marks)
    }

    // The evaluator's own pace over the last 30 campus days.
    const today = localDay(new Date(), tz)
    const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29))
    const mineDone = rows.filter((r) => r.evaluator_id === u.id && r.evaluated_at)
    const perDay = new Map(days.map((d) => [d, 0]))
    for (const r of mineDone) {
      const d = localDay(new Date(r.evaluated_at), tz)
      if (perDay.has(d)) perDay.set(d, (perDay.get(d) ?? 0) + 1)
    }
    const since = Date.now() - 30 * 86_400_000
    const recent = mineDone.filter((r) => new Date(r.evaluated_at).getTime() >= since)
    const turnaround = recent.map((r) => (new Date(r.evaluated_at).getTime() - new Date(r.submitted_at).getTime()) / 3_600_000).filter((h) => h >= 0)

    const assessments = assignmentIds
      .map((id) => {
        const list = rows.filter((r) => r.assignment_id === id)
        const first = list[0]
        const rubric = rubricOf.get(id) ?? null
        const done = list.filter(finished)
        const pcts = done.map(pctOf)
        const distribution = Array.from({ length: 10 }, () => 0)
        for (const p of pcts) distribution[Math.min(9, Math.floor(p / 10))]++
        const grades = Object.fromEntries(GRADES.map((g) => [g, 0])) as Record<string, number>
        for (const p of pcts) grades[letterGrade(p)]++
        const criteria = (rubric?.criteria ?? []).map((c) => {
          const pts = done.map((r) => (r.scores as Scores | null)?.[c.id]?.points).filter((p): p is number => typeof p === "number")
          const avg = pts.length ? pts.reduce((a, b) => a + b, 0) / pts.length : null
          return { id: c.id, title: c.title, max_points: c.max_points, avg_points: avg === null ? null : Math.round(avg * 10) / 10, avg_pct: avg === null ? null : Math.round((avg * 100) / c.max_points), scored: pts.length }
        })
        return {
          id,
          title: first.title as string,
          course_code: first.course_code as string,
          max_marks: first.max_marks as number,
          due_at: first.due_at as Date,
          submissions: list.length,
          finished: done.length,
          released: list.filter((r) => r.status === "released" || (!r.status && r.submission_status === "Graded")).length,
          pending: list.length - done.length,
          avg_pct: mean(pcts),
          median_pct: median(pcts),
          high_pct: pcts.length ? Math.max(...pcts) : null,
          low_pct: pcts.length ? Math.min(...pcts) : null,
          distribution,
          grades,
          criteria,
        }
      })
      .sort((a, b) => new Date(b.due_at).getTime() - new Date(a.due_at).getTime())

    // Who marked what across these assignments.
    type Member = { id: string; name: string; finished: number; pcts: number[] }
    const team = new Map<string, Member>()
    for (const r of rows.filter((x) => x.evaluator_id && (x.status === "evaluated" || x.status === "released"))) {
      const t: Member = team.get(r.evaluator_id) ?? { id: r.evaluator_id, name: r.evaluator_name ?? "Evaluator", finished: 0, pcts: [] }
      t.finished++
      t.pcts.push(pctOf(r))
      team.set(r.evaluator_id, t)
    }

    const changes = requests.filter((r) => r.status === "Revised" && r.revised_score !== null).map((r) => (r.revised_score ?? 0) - r.original_score)
    return {
      me: {
        finished_total: mineDone.length,
        finished_30d: recent.length,
        released_30d: rows.filter((r) => r.evaluator_id === u.id && r.released_at && new Date(r.released_at).getTime() >= since).length,
        avg_turnaround_hours: turnaround.length ? Math.round((turnaround.reduce((a, b) => a + b, 0) / turnaround.length) * 10) / 10 : null,
        by_day: days.map((d) => ({ day: d, count: perDay.get(d) ?? 0 })),
      },
      assessments,
      team: [...team.values()].map((t) => ({ id: t.id, name: t.name, finished: t.finished, avg_pct: mean(t.pcts), you: t.id === u.id })).sort((a, b) => b.finished - a.finished),
      reevaluations: {
        total: requests.length,
        open: requests.filter((r) => r.status === "Pending" || r.status === "In Review").length,
        revised: requests.filter((r) => r.status === "Revised").length,
        upheld: requests.filter((r) => r.status === "Upheld").length,
        avg_change: changes.length ? Math.round((changes.reduce((a, b) => a + b, 0) / changes.length) * 10) / 10 : null,
      },
    }
  })
}
