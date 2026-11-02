// Signs in as the demo evaluator through Cognito and reads every evaluator endpoint, printing a summary of each.
// Read-only. Needs the API (`npm run dev` in backend/), the Cognito emulator and the site (for the /api proxy).
//   node evaluator-api-smoke.mjs [--base http://localhost:8443]
import { api, DEMO_EVALUATOR, signIn } from "../../redesign-premium-ui/tools/backend.mjs"

const argv = process.argv
const base = argv.includes("--base") ? argv[argv.indexOf("--base") + 1] : "http://localhost:8443"
const token = await signIn(DEMO_EVALUATOR)
let failed = 0
const get = async (path) => {
  const started = Date.now()
  const r = await api(base, path, { token })
  const ms = Date.now() - started
  if (!r.ok) {
    failed++
    console.log(`FAIL ${path} -> ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`)
    return null
  }
  console.log(`ok   ${path} (${ms} ms)`)
  return r.data
}

const profile = await get("/evaluator/profile")
if (profile) console.log(`     ${profile.full_name} · ${profile.title} · ${profile.assigned.length} assignments · ${profile.finished_total} finished`)
const queue = await get("/evaluator/queue")
if (queue) {
  const by = (s) => queue.items.filter((i) => i.state === s).length
  console.log(`     ${queue.items.length} submissions: ${by("pending")} pending, ${by("draft")} drafts, ${by("evaluated")} evaluated, ${by("released")} released`)
  for (const a of queue.assessments) console.log(`     ${a.course_code} ${a.title.slice(0, 48).padEnd(48)} ${a.submissions} in, ${a.pending} to mark, rubric: ${a.rubric_title ?? "none"}`)
}
const requests = await get("/evaluator/reevaluations")
if (requests) console.log(`     ${requests.length} requests: ${requests.map((r) => r.status).join(", ")}`)
const reports = await get("/evaluator/reports")
if (reports) console.log(`     me: ${reports.me.finished_total} finished, turnaround ${reports.me.avg_turnaround_hours} h; team: ${reports.team.map((t) => `${t.name} ${t.finished}`).join(", ")}`)
const withFile = queue?.items.find((i) => i.file_name)
const draft = queue?.items.find((i) => i.state === "draft" && i.mine)
for (const item of [withFile, draft].filter(Boolean)) {
  const ws = await get(`/evaluator/submissions/${item.id}`)
  if (ws) console.log(`     ${ws.student.name} · ${ws.assignment.title.slice(0, 40)} · rubric ${ws.rubric?.criteria.length ?? 0} criteria · evaluation ${ws.evaluation?.status ?? "none"}`)
  if (ws?.submission.file?.language) {
    const preview = await get(`/evaluator/submissions/${item.id}/file/preview`)
    if (preview) console.log(`     preview ${preview.name} (${preview.language}, ${preview.size} bytes): ${preview.text.split("\n")[0].slice(0, 70)}`)
  }
}
process.exit(failed ? 1 : 0)
