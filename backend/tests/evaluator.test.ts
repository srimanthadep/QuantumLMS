// Evaluator API against the real database: who can see what, the draft -> evaluated -> released lifecycle, claims
// between evaluators, and re-evaluation requests from the student's side to the evaluator's decision.
import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { and, eq } from "drizzle-orm"
import { evaluator_assignments } from "../src/db/schema.js"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"

let h: TestHarness
let student: TestUser
let e1: TestUser
let e2: TestUser
before(async () => {
  h = await createHarness()
  student = await h.user({ name: "Eval Test Student" })
  e1 = await h.user({ name: "Evaluator One", groups: ["evaluators"] })
  e2 = await h.user({ name: "Evaluator Two", groups: ["evaluators"] })
})
after(async () => {
  await h.close()
})

/** The rubric criteria of an assignment, through the workspace of one of its submissions. */
async function workspace(u: TestUser, submissionId: string) {
  const r = await u.call("GET", `/api/evaluator/submissions/${submissionId}`)
  assert.equal(r.status, 200, JSON.stringify(r.body))
  return r.body
}
const full = (criteria: { id: string; max_points: number }[], pick: (max: number, i: number) => number) =>
  Object.fromEntries(criteria.map((c, i) => [c.id, { points: pick(c.max_points, i), comment: i === 0 ? "Clear structure." : "" }]))

let submissionId = ""
let criteria: { id: string; max_points: number; title: string }[] = []

describe("access", () => {
  test("students can't use the evaluator API", async () => {
    assert.equal((await student.call("GET", "/api/evaluator/queue")).status, 403)
  })

  test("a new evaluator gets a profile and every assignment that has a rubric", async () => {
    const p = await e1.call("GET", "/api/evaluator/profile")
    assert.equal(p.status, 200, JSON.stringify(p.body))
    assert.equal(p.body.title, "Evaluator")
    assert.deepEqual(p.body.assigned.map((a: { id: string }) => a.id).sort(), ["asg-1", "asg-2", "asg-3", "asg-4", "asg-5"])
    assert.equal(p.body.preferences.daily_goal, 8)
  })

  test("a student's submission shows up in the queue of evaluators assigned to it, and nowhere else", async () => {
    const sub = await student.call("POST", "/api/student/assignments/asg-1/submission", { repo_url: "https://github.com/eval-test/rag-pipeline", comments: "Evaluation notebook in /evals." })
    assert.equal(sub.status, 200, JSON.stringify(sub.body))
    submissionId = sub.body.id
    const q = await e1.call("GET", "/api/evaluator/queue")
    const item = q.body.items.find((i: { id: string }) => i.id === submissionId)
    assert.equal(item?.state, "pending")
    assert.equal(item.student_name, "Eval Test Student")
    // An evaluator who doesn't mark asg-1 can't see or open it.
    const outsider = await h.user({ groups: ["evaluators"] })
    await outsider.call("GET", "/api/evaluator/profile")
    const me = await outsider.call("GET", "/api/me")
    await h.ctx.db.delete(evaluator_assignments).where(and(eq(evaluator_assignments.evaluator_id, me.body.id), eq(evaluator_assignments.assignment_id, "asg-1")))
    assert.ok(!(await outsider.call("GET", "/api/evaluator/queue")).body.items.some((i: { id: string }) => i.id === submissionId))
    assert.equal((await outsider.call("GET", `/api/evaluator/submissions/${submissionId}`)).status, 404)
    assert.equal((await outsider.call("PUT", `/api/evaluator/submissions/${submissionId}/evaluation`, { scores: {} })).status, 404)
  })
})

describe("evaluation lifecycle", () => {
  test("the first draft claims the submission and puts it under review for the student", async () => {
    const ws = await workspace(e1, submissionId)
    criteria = ws.rubric.criteria
    assert.equal(criteria.length, 4)
    assert.equal(ws.rubric.max_points, 100)
    const draft = await e1.call("PUT", `/api/evaluator/submissions/${submissionId}/evaluation`, {
      scores: { [criteria[0].id]: { points: 24, comment: "Recall is measured." }, [criteria[1].id]: { points: null, comment: "Check citations." } },
      private_note: "Run the eval notebook again.",
    })
    assert.equal(draft.status, 200, JSON.stringify(draft.body))
    assert.equal(draft.body.status, "draft")
    assert.equal(draft.body.total, 24)
    const core = await student.call("GET", "/api/student/core")
    assert.equal(core.body.submissions.find((s: { assignment_id: string }) => s.assignment_id === "asg-1").status, "Under Review")
    // The student can't change work that's being marked.
    const resubmit = await student.call("POST", "/api/student/assignments/asg-1/submission", { repo_url: "https://github.com/eval-test/rag-pipeline-v2" })
    assert.equal(resubmit.status, 400)
    assert.equal(resubmit.body.error.code, "under_review")
  })

  test("another evaluator can't take over a draft, and doesn't see its private note", async () => {
    const r = await e2.call("PUT", `/api/evaluator/submissions/${submissionId}/evaluation`, { scores: {} })
    assert.equal(r.status, 409)
    assert.match(r.body.error.message, /Evaluator One is evaluating/)
    const ws = await workspace(e2, submissionId)
    assert.equal(ws.evaluation.mine, false)
    assert.equal(ws.evaluation.private_note, "")
    assert.equal((await workspace(e1, submissionId)).evaluation.private_note, "Run the eval notebook again.")
  })

  test("finishing needs every criterion scored within range and some feedback", async () => {
    const url = `/api/evaluator/submissions/${submissionId}/evaluation/finish`
    const partial = await e1.call("POST", url, { scores: { [criteria[0].id]: { points: 24 } }, feedback: "Good retrieval, see the notes on citations." })
    assert.equal(partial.status, 400)
    assert.equal(partial.body.error.code, "incomplete")
    const tooHigh = await e1.call("POST", url, { scores: full(criteria, (max, i) => (i === 0 ? max + 1 : max)), feedback: "Good retrieval, see the notes on citations." })
    assert.equal(tooHigh.status, 400)
    assert.equal(tooHigh.body.error.code, "out_of_range")
    const terse = await e1.call("POST", url, { scores: full(criteria, (max) => max - 2), feedback: "Fine." })
    assert.equal(terse.status, 400)
    assert.equal(terse.body.error.code, "feedback")
    const ok = await e1.call("POST", url, { scores: full(criteria, (max) => max - 4), feedback: "Retrieval is measured and the citations are mostly right. Tighten the README." })
    assert.equal(ok.status, 200, JSON.stringify(ok.body))
    assert.equal(ok.body.evaluation.status, "evaluated")
    assert.equal(ok.body.evaluation.total, 84)
    assert.equal(ok.body.released, false)
  })

  test("a finished evaluation is locked until it's reopened", async () => {
    const locked = await e1.call("PUT", `/api/evaluator/submissions/${submissionId}/evaluation`, { scores: {} })
    assert.equal(locked.status, 409)
    assert.equal(locked.body.error.code, "finished")
    const reopened = await e1.call("POST", `/api/evaluator/submissions/${submissionId}/evaluation/reopen`)
    assert.equal(reopened.body.status, "draft")
    const again = await e1.call("POST", `/api/evaluator/submissions/${submissionId}/evaluation/finish`, {
      scores: full(criteria, (max) => max - 3),
      feedback: "Retrieval is measured and the citations are mostly right. Tighten the README.",
    })
    assert.equal(again.body.evaluation.total, 88)
    // The student still sees it as under review: nothing is released yet.
    const core = await student.call("GET", "/api/student/core")
    const row = core.body.submissions.find((s: { assignment_id: string }) => s.assignment_id === "asg-1")
    assert.equal(row.status, "Under Review")
    assert.equal(row.score, null)
  })

  test("releasing gives the student the score, grade, feedback and rubric breakdown", async () => {
    const r = await e1.call("POST", "/api/evaluator/release", { submission_ids: [submissionId] })
    assert.deepEqual(r.body, { released: 1, skipped: 0 })
    const core = await student.call("GET", "/api/student/core")
    const row = core.body.submissions.find((s: { assignment_id: string }) => s.assignment_id === "asg-1")
    assert.deepEqual([row.status, row.score, row.grade], ["Graded", 88, "A"])
    assert.match(row.feedback, /Tighten the README/)
    const notes = await student.call("GET", "/api/student/notifications")
    assert.ok(notes.body.some((n: { title: string; message: string }) => n.title === "Assignment graded" && /88\/100/.test(n.message)))
    const breakdown = await student.call("GET", "/api/student/assignments/asg-1/evaluation")
    assert.equal(breakdown.status, 200, JSON.stringify(breakdown.body))
    assert.equal(breakdown.body.evaluator_name, "Evaluator One")
    assert.equal(breakdown.body.scores[criteria[0].id].comment, "Clear structure.")
    assert.equal(breakdown.body.can_request, true)
    // Released grades can't be edited directly.
    const edit = await e1.call("POST", `/api/evaluator/submissions/${submissionId}/evaluation/reopen`)
    assert.equal(edit.status, 409)
    assert.equal(edit.body.error.code, "released")
  })
})

describe("re-evaluation requests", () => {
  let requestId = ""

  test("students ask once, with a reason", async () => {
    const url = "/api/student/assignments/asg-1/reevaluation"
    assert.equal((await student.call("POST", url, { reason: "Please check." })).status, 400)
    const r = await student.call("POST", url, { reason: "The citations criterion missed the source list printed after every answer." })
    assert.equal(r.status, 200, JSON.stringify(r.body))
    assert.deepEqual([r.body.status, r.body.original_score], ["Pending", 88])
    requestId = r.body.id
    assert.equal((await student.call("POST", url, { reason: "Asking a second time about the same assignment." })).status, 409)
    // Work that isn't graded can't be appealed.
    assert.equal((await student.call("POST", "/api/student/assignments/asg-2/reevaluation", { reason: "This one hasn't even been submitted yet." })).status, 404)
  })

  test("the evaluator who takes a request owns it", async () => {
    const list = await e2.call("GET", "/api/evaluator/reevaluations")
    assert.ok(list.body.some((r: { id: string; status: string }) => r.id === requestId && r.status === "Pending"))
    const started = await e2.call("POST", `/api/evaluator/reevaluations/${requestId}/start`)
    assert.equal(started.body.status, "In Review")
    assert.equal(started.body.mine, true)
    const other = await e1.call("POST", `/api/evaluator/reevaluations/${requestId}/resolve`, { decision: "uphold", resolution: "The score stands after a second look." })
    assert.equal(other.status, 409)
    assert.match(other.body.error.message, /Evaluator Two is reviewing/)
  })

  test("revising re-scores the rubric and updates the student's grade", async () => {
    const url = `/api/evaluator/reevaluations/${requestId}/resolve`
    const same = await e2.call("POST", url, { decision: "revise", resolution: "Re-checked every criterion against the rubric.", scores: full(criteria, (max) => max - 3) })
    assert.equal(same.status, 400)
    assert.equal(same.body.error.code, "unchanged")
    const revised = await e2.call("POST", url, { decision: "revise", resolution: "The source list counts as citations, so citations go up two points.", scores: full(criteria, (max, i) => (i === 1 ? max - 1 : max - 3)) })
    assert.equal(revised.status, 200, JSON.stringify(revised.body))
    assert.deepEqual([revised.body.status, revised.body.revised_score], ["Revised", 90])
    const core = await student.call("GET", "/api/student/core")
    const row = core.body.submissions.find((s: { assignment_id: string }) => s.assignment_id === "asg-1")
    assert.deepEqual([row.score, row.grade], [90, "A+"])
    assert.equal(core.body.reevaluations.find((r: { id: string }) => r.id === requestId).status, "Revised")
    const notes = await student.call("GET", "/api/student/notifications")
    assert.ok(notes.body.some((n: { title: string; message: string }) => n.title === "Score revised" && /88 → 90/.test(n.message)))
    // Answered requests are closed.
    assert.equal((await e2.call("POST", url, { decision: "uphold", resolution: "Trying to answer the same request twice." })).status, 409)
  })
})

describe("drafts and files", () => {
  test("discarding a draft puts the submission back in the queue", async () => {
    const other = await h.user({ name: "Eval Test Student Two" })
    const sub = await other.call("POST", "/api/student/assignments/asg-2/submission", { repo_url: "https://github.com/eval-test/numpy-mlp" })
    assert.equal(sub.status, 200, JSON.stringify(sub.body))
    assert.equal((await e1.call("PUT", `/api/evaluator/submissions/${sub.body.id}/evaluation`, { scores: {} })).status, 200)
    assert.equal((await e2.call("DELETE", `/api/evaluator/submissions/${sub.body.id}/evaluation`)).status, 409)
    assert.equal((await e1.call("DELETE", `/api/evaluator/submissions/${sub.body.id}/evaluation`)).status, 204)
    const item = (await e2.call("GET", "/api/evaluator/queue")).body.items.find((i: { id: string }) => i.id === sub.body.id)
    assert.deepEqual([item.state, item.evaluator_id], ["pending", null])
    const core = await other.call("GET", "/api/student/core")
    assert.equal(core.body.submissions.find((s: { assignment_id: string }) => s.assignment_id === "asg-2").status, "Submitted")
  })

  test("evaluators read submitted code inline", async () => {
    const other = await h.user({ name: "Eval Test Student Three" })
    const code = "def forward(x):\n    return x @ W1\n"
    const target = await other.call("POST", "/api/student/uploads", { bucket: "submissions", folder: "asg-2", filename: "mlp.py", content_type: "text/x-python", size: Buffer.byteLength(code) })
    assert.equal(target.status, 200, JSON.stringify(target.body))
    const put = await h.app.inject({ method: "PUT", url: target.body.url, headers: { "content-type": "text/x-python" }, payload: Buffer.from(code) })
    assert.equal(put.statusCode, 200, put.body)
    const sub = await other.call("POST", "/api/student/assignments/asg-2/submission", { file_key: target.body.key, file_name: "mlp.py", file_size: "1 KB" })
    assert.equal(sub.status, 200, JSON.stringify(sub.body))
    const ws = await workspace(e1, sub.body.id)
    assert.deepEqual([ws.submission.file.name, ws.submission.file.language], ["mlp.py", "python"])
    const preview = await e1.call("GET", `/api/evaluator/submissions/${sub.body.id}/file/preview`)
    assert.equal(preview.status, 200, JSON.stringify(preview.body))
    assert.equal(preview.body.text, code)
    assert.equal(preview.body.truncated, false)
    const link = await e1.call("GET", `/api/evaluator/submissions/${sub.body.id}/file`)
    assert.match(link.body.url, /^\/api\/local-files\//)
  })

  test("only the shared demo evaluator can reset demo data, and the reset restores its marking history", async () => {
    assert.equal((await e1.call("POST", "/api/evaluator/demo/reset")).status, 403)
    const demo = await h.user({ email: h.ctx.config.DEMO_EVALUATOR_EMAIL, name: "Eval", groups: ["evaluators"], keep: true })
    // Work the demo account starts on a real student's submission goes back to the queue on reset.
    const other = await h.user({ name: "Eval Test Student Four" })
    const sub = await other.call("POST", "/api/student/assignments/asg-1/submission", { repo_url: "https://github.com/eval-test/rag-four" })
    assert.equal(sub.status, 200, JSON.stringify(sub.body))
    assert.equal((await demo.call("PUT", `/api/evaluator/submissions/${sub.body.id}/evaluation`, { scores: {} })).status, 200)
    assert.equal((await demo.call("POST", "/api/evaluator/demo/reset")).status, 204)

    const q = await demo.call("GET", "/api/evaluator/queue")
    const theirs = q.body.items.find((i: { id: string }) => i.id === sub.body.id)
    assert.deepEqual([theirs.state, theirs.evaluator_id], ["pending", null])
    const seeded = q.body.items.filter((i: { roll_number: string | null }) => /^QAI-2026-0[1-3]\d$/.test(i.roll_number ?? ""))
    const count = (s: string) => seeded.filter((i: { state: string }) => i.state === s).length
    assert.deepEqual([seeded.length, count("pending"), count("draft"), count("evaluated"), count("released")], [20, 7, 2, 3, 8])
    assert.equal(seeded.filter((i: { state: string; mine: boolean }) => i.state === "draft" && !i.mine).length, 1, "one draft belongs to the colleague")
    const requests = (await demo.call("GET", "/api/evaluator/reevaluations")).body.filter((r: { roll_number: string | null }) => /^QAI-2026-0[1-3]\d$/.test(r.roll_number ?? ""))
    assert.deepEqual(requests.map((r: { status: string }) => r.status).sort(), ["Pending", "Pending", "Revised", "Upheld"])
    const profile = await demo.call("GET", "/api/evaluator/profile")
    assert.deepEqual([profile.body.full_name, profile.body.title, profile.body.is_demo], ["Eval", "Assessment Lead", true])
  })

  test("evaluators update their own settings", async () => {
    const bad = await e1.call("PATCH", "/api/evaluator/profile", { preferences: { daily_goal: 0 } })
    assert.equal(bad.status, 400)
    const ok = await e1.call("PATCH", "/api/evaluator/profile", { title: "Senior Evaluator", specializations: ["RAG", "RAG", "Agents"], preferences: { daily_goal: 12, queue_sort: "due" } })
    assert.equal(ok.status, 200, JSON.stringify(ok.body))
    assert.deepEqual([ok.body.title, ok.body.specializations, ok.body.preferences.daily_goal, ok.body.preferences.queue_sort, ok.body.preferences.auto_advance], ["Senior Evaluator", ["RAG", "Agents"], 12, "due", true])
  })
})
