// Opens every student page against the API as the demo student (the portal signs it in through Cognito) and reports
// console errors, failed requests and the rendered heading. Screenshots go to ../shots/<name>.png.
//   node live-smoke.mjs [--base http://localhost:8443] [--only dashboard,grades] [--theme light]
import { mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "../../redesign-premium-ui/tools/node_modules/playwright-core/index.mjs"
import { chromePath, COGNITO_ENDPOINT } from "../../redesign-premium-ui/tools/backend.mjs"

const argv = process.argv
const arg = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d)
const base = arg("base", "http://localhost:8443")
const theme = arg("theme", "dark")
const only = arg("only", "")
const here = path.dirname(fileURLToPath(import.meta.url))
const shots = path.join(here, "..", "shots")
mkdirSync(shots, { recursive: true })

const PAGES = [
  ["dashboard", ""],
  ["my-courses", "my-courses"],
  ["course-details", "course-details"],
  ["schedule", "schedule"],
  ["attendance", "attendance"],
  ["events", "events"],
  ["announcements", "announcements"],
  ["assessments", "assessments"],
  ["quizzes", "quizzes"],
  ["grades", "grades"],
  ["certificates", "certificates"],
  ["notes", "notes"],
  ["community", "community"],
  ["career", "career-hub"],
  ["resume", "resume"],
  ["mentor", "mentor"],
  ["support", "support"],
  ["settings", "settings"],
].filter(([n]) => !only || only.split(",").includes(n))

const student = { id: "u-student", name: "Aarav Mehta", role: "Student", email: "aarav.mehta@learner.ai", title: "Learner · Generative AI Engineering", avatar: "/assets/student-2.png" }
const browser = await chromium.launch({ executablePath: chromePath })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await context.addInitScript(
  ({ user, theme }) => {
    if (sessionStorage.getItem("__seeded")) return
    sessionStorage.setItem("__seeded", "1")
    localStorage.setItem("app_theme_mode", theme)
    localStorage.setItem("quantum_auth_session", "true")
    localStorage.setItem("quantum_user_role", user.role)
    localStorage.setItem("quantum_current_user", JSON.stringify(user))
  },
  { user: student, theme },
)
const page = await context.newPage()
const problems = []
page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 300)}`))
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text().slice(0, 300)}`))
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().startsWith(`${base}/api/`)) problems.push(`http ${r.status()} ${r.request().method()} ${r.url().slice(base.length, base.length + 160)}`)
  if (r.status() >= 400 && r.url().startsWith(COGNITO_ENDPOINT)) problems.push(`cognito ${r.status()} ${r.request().headers()["x-amz-target"] ?? ""}`)
})
page.on("requestfailed", (r) => problems.push(`failed ${r.method()} ${r.url().slice(0, 160)} ${r.failure()?.errorText ?? ""}`))

let bad = 0
for (const [name, slug] of PAGES) {
  problems.length = 0
  const started = Date.now()
  await page.goto(`${base}/student${slug ? `?page=${slug}` : ""}`, { waitUntil: "networkidle" })
  let heading = ""
  try {
    await page.locator("main h1").first().waitFor({ timeout: 15000 })
    heading = (await page.locator("main h1").first().innerText()).trim()
  } catch {
    heading = "(no h1)"
  }
  // Let page-level data load and render.
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(600)
  const skeletons = await page.locator('[role="status"][aria-label^="Loading"]').count()
  const errorStates = await page.getByText(/didn't load|can't connect/i).count()
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false })
  const issues = [...problems]
  if (skeletons) issues.push(`${skeletons} loading placeholder(s) still visible`)
  if (errorStates) issues.push(`${errorStates} error state(s) shown`)
  if (heading === "(no h1)") issues.push("no heading rendered")
  bad += issues.length ? 1 : 0
  console.log(`${issues.length ? "FAIL" : "ok  "} ${name.padEnd(15)} ${String(Date.now() - started).padStart(5)} ms  "${heading}"`)
  issues.slice(0, 6).forEach((p) => console.log(`       ${p}`))
}
await browser.close()
console.log(`${PAGES.length - bad}/${PAGES.length} pages clean`)
process.exit(bad ? 1 : 0)
