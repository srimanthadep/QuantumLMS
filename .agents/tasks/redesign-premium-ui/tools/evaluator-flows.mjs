// End-to-end checks for the evaluator portal against the Quantum LMS API, signed in through Cognito.
// Each flow starts from a freshly reset demo evaluator (and demo student), acts through the UI, then checks the
// result after a reload, through the API, or from the student's side.
// Needs the API (`npm run dev` in backend/), the Cognito emulator and the site (`npm run dev` in frontend/).
// Usage: node evaluator-flows.mjs [--base http://localhost:8443] [--flows a,b]
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright-core"
import { api, chromePath, COGNITO_ENDPOINT, DEMO_EVALUATOR, DEMO_STUDENT, resetDemo, signIn } from "./backend.mjs"
import { demoUsers } from "./routes.mjs"

const argv = process.argv
const arg = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d)
const base = arg("base", "http://localhost:8443")
const here = path.dirname(fileURLToPath(import.meta.url))

const resetAll = async () => {
  await resetDemo(base, DEMO_EVALUATOR, "/evaluator/demo/reset")
  await resetDemo(base, DEMO_STUDENT, "/student/demo/reset")
}
const evaluatorApi = async (pathname) => {
  const r = await api(base, pathname, { token: await signIn(DEMO_EVALUATOR) })
  if (!r.ok) throw new Error(`GET ${pathname} -> ${r.status}`)
  return r.data
}

async function open(context, user) {
  const page = await context.newPage()
  await page.addInitScript(
    ({ user }) => {
      if (sessionStorage.getItem("__seeded")) return
      sessionStorage.setItem("__seeded", "1")
      localStorage.clear()
      localStorage.setItem("app_theme_mode", "dark")
      localStorage.setItem("quantum_auth_session", "true")
      localStorage.setItem("quantum_user_role", user.role)
      localStorage.setItem("quantum_current_user", JSON.stringify(user))
    },
    { user },
  )
  return page
}
const expect = (c, m) => {
  if (!c) throw new Error(m)
}
const settle = async (page) => {
  await page.waitForLoadState("networkidle")
  await page.locator('[role="status"][aria-label^="Loading"]').first().waitFor({ state: "detached", timeout: 20000 }).catch(() => {})
}
const go = async (page, url) => {
  await page.goto(`${base}${url}`, { waitUntil: "networkidle" })
  await page.locator("main h1").first().waitFor({ timeout: 30000 })
  await settle(page)
}
const h1 = async (page) => (await page.locator("main h1").first().innerText()).trim()
const criteria = (page) => page.locator('ol[aria-label="Rubric criteria"] > li')

const flows = {
  async nav({ evaluator: page }) {
    await go(page, "/evaluator/dashboard")
    expect(/Meera$/.test(await h1(page)), `dashboard greets "${await h1(page)}"`)
    const nav = page.locator('aside nav[aria-label="Primary"]')
    for (const [item, title] of [["Queue", "Queue"], ["Re-evaluations", "Re-evaluations"], ["Reports", "Reports"], ["Settings", "Settings"], ["Dashboard", /Meera$/]]) {
      // Items with work waiting carry a count badge, which is part of their name ("Queue 9").
      const name = new RegExp(`^${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s*\\d+)?$`)
      await nav.getByRole("button", { name }).first().click()
      await page.locator("main h1", { hasText: title }).first().waitFor({ timeout: 10000 })
      expect((await nav.locator('[aria-current="page"]').innerText()).startsWith(item), `${item} isn't marked as the current page`)
    }
  },

  async gradeAndRelease({ evaluator: page, student }) {
    await go(page, "/evaluator/queue?assessment=asg-3")
    await page.getByRole("link", { name: /Aarav Mehta/ }).first().click()
    await page.locator("main h1", { hasText: "Data Analysis" }).waitFor({ timeout: 20000 })
    await settle(page)
    const cards = criteria(page)
    expect((await cards.count()) === 4, `expected 4 criteria, saw ${await cards.count()}`)
    for (let i = 0; i < 4; i++) await cards.nth(i).getByRole("button", { name: /^Proficient/ }).click()
    // Finishing without feedback is refused with a field error.
    await page.getByRole("button", { name: "Finish & release" }).click()
    await page.getByText("Write at least a sentence of feedback for the student.").waitFor({ timeout: 5000 })
    await page.getByLabel("Feedback for the student").fill("Solid cleaning and sensible features. Interpret the correlations next time: say what they mean for length of stay.")
    await page.getByRole("button", { name: "Finish & release" }).click()
    await page.getByText("Released to Aarav Mehta.").waitFor({ timeout: 15000 })
    const q = await evaluatorApi("/evaluator/queue")
    const row = q.items.find((i) => i.student_name === "Aarav Mehta" && i.assignment_id === "asg-3")
    expect(row?.state === "released" && row.score === 80 && row.grade === "A-", `Aarav's asg-3 is ${JSON.stringify(row && [row.state, row.score, row.grade])}`)
    // The student sees the grade and the rubric breakdown.
    await go(student, "/student?page=assessments")
    const card = student.locator("li", { hasText: "Data Analysis & Feature Engineering" }).first()
    await card.getByRole("button", { name: "View evaluation" }).click()
    const dialog = student.getByRole("dialog")
    await dialog.getByText("Rubric breakdown").waitFor({ timeout: 15000 })
    await dialog.getByText("Evaluated by Meera Nair", { exact: false }).waitFor({ timeout: 5000 })
    expect((await dialog.locator("li").count()) >= 4, "breakdown shows fewer than 4 criteria")
  },

  async autosaveAndDiscard({ evaluator: page }) {
    await go(page, "/evaluator/queue")
    await page.getByRole("link", { name: /Priya Sharma/ }).first().click()
    await page.locator("main h1", { hasText: "Project 1" }).waitFor({ timeout: 20000 })
    await settle(page)
    await criteria(page).first().getByRole("button", { name: /^Developing/ }).click()
    await page.getByText(/^Saved /).waitFor({ timeout: 15000 })
    await page.reload({ waitUntil: "networkidle" })
    await page.locator("main h1", { hasText: "Project 1" }).waitFor({ timeout: 20000 })
    await settle(page)
    const value = await criteria(page).first().getByRole("spinbutton").inputValue()
    expect(value === "17", `draft points after reload: "${value}"`)
    await page.getByRole("button", { name: "Discard" }).click()
    await page.getByText("Draft discarded. The submission is back in the queue.").waitFor({ timeout: 10000 })
    const q = await evaluatorApi("/evaluator/queue")
    const row = q.items.find((i) => i.student_name === "Priya Sharma" && i.assignment_id === "asg-1")
    expect(row?.state === "pending", `Priya's asg-1 is ${row?.state}`)
  },

  async releaseFromQueue({ evaluator: page }) {
    await go(page, "/evaluator/queue?view=ready")
    const before = await page.locator('ul[aria-label="Submissions"] > li').count()
    expect(before === 3, `ready to release: ${before}`)
    await page.getByRole("checkbox").first().click()
    await page.getByRole("button", { name: "Release 1" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Release result" }).click()
    await page.getByText(/^Released to /).waitFor({ timeout: 15000 })
    await page.reload({ waitUntil: "networkidle" })
    await settle(page)
    await page.waitForFunction(() => document.querySelectorAll('ul[aria-label="Submissions"] > li').length === 2, null, { timeout: 15000 })
  },

  async revise({ evaluator: page }) {
    await go(page, "/evaluator/reevaluations")
    await page.getByRole("button", { name: /Rohit Verma/ }).first().click()
    // The detail pane swaps with an exit animation: act only once Rohit's request is the one on screen.
    await page.waitForFunction(() => {
      const names = [...document.querySelectorAll("main h2")].map((h) => h.textContent)
      return names.length === 1 && names[0] === "Rohit Verma"
    }, null, { timeout: 10000 })
    await page.getByRole("button", { name: "Take this request" }).click()
    await page.getByRole("radio", { name: /Revise the score/ }).click()
    const tool = criteria(page).filter({ hasText: "Tool use and validation" })
    for (let i = 0; i < 4; i++) await tool.getByRole("button", { name: /One point more/ }).click()
    await tool.getByText("was 18 · +4").waitFor({ timeout: 5000 })
    await page.getByLabel("Your answer to the student").fill("You're right: tools/retry.py retries every tool call with backoff, which the logs confirm. Tool use goes from 18 to 22.")
    await page.getByRole("button", { name: "Revise and tell the student" }).click()
    await page.getByText(/Score revised to 76/).waitFor({ timeout: 15000 })
    const list = await evaluatorApi("/evaluator/reevaluations")
    const r = list.find((x) => x.student_name === "Rohit Verma")
    expect(r?.status === "Revised" && r.revised_score === 76, `Rohit's request: ${JSON.stringify(r && [r.status, r.revised_score])}`)
  },

  async studentRequest({ evaluator: page, student }) {
    await go(student, "/student?page=assessments")
    const card = student.locator("li", { hasText: "Autonomous Agent Tool Calling" }).first()
    await card.getByRole("button", { name: "View evaluation" }).click()
    const dialog = student.getByRole("dialog")
    await dialog.getByText("Rubric breakdown").waitFor({ timeout: 15000 })
    await dialog.getByRole("button", { name: "Request re-evaluation" }).click()
    await dialog.getByLabel("What should be checked again?").fill("The safety criterion missed the cost limit setting in config.yaml, which caps each run at two dollars.")
    await dialog.getByRole("button", { name: "Send request" }).click()
    await dialog.getByText("Waiting for an evaluator").waitFor({ timeout: 10000 })
    await go(page, "/evaluator/reevaluations")
    await page.getByRole("button", { name: /Aarav Mehta/ }).first().waitFor({ timeout: 10000 })
  },

  async reports({ evaluator: page }) {
    await go(page, "/evaluator/reports")
    await page.getByRole("combobox", { name: "Assessment" }).click()
    await page.getByRole("option", { name: /AG-501/ }).click()
    await page.getByText("Most marks lost").first().waitFor({ timeout: 10000 })
    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 10000 }), page.getByRole("button", { name: "Export CSV" }).click()])
    expect(/marking-report-.*\.csv$/.test(download.suggestedFilename()), `download named ${download.suggestedFilename()}`)
  },

  async settings({ evaluator: page }) {
    await go(page, "/evaluator/settings")
    await page.getByRole("tab", { name: "Marking" }).click()
    await page.getByRole("button", { name: "Raise the daily goal" }).click()
    await page.getByRole("button", { name: "Raise the daily goal" }).click()
    await page.getByText("Daily goal set to 10").waitFor({ timeout: 10000 })
    await go(page, "/evaluator/dashboard")
    await page.getByText("of 10").first().waitFor({ timeout: 10000 })
  },
}

const names = (arg("flows", "") || Object.keys(flows).join(",")).split(",").filter(Boolean)
const browser = await chromium.launch({ executablePath: chromePath })
const apiPrefix = `${base}/api/`
let failed = 0
for (const n of names) {
  const errors = []
  const watch = (page, who) => {
    page.on("pageerror", (e) => errors.push(`${who}: ${String(e)}`))
    page.on("console", (m) => m.type() === "error" && errors.push(`${who}: ${m.text()}`))
    page.on("response", (r) => {
      const url = r.url()
      if (r.status() >= 400 && url.startsWith(apiPrefix)) errors.push(`${who}: HTTP ${r.status()} ${r.request().method()} ${url.slice(base.length, base.length + 120)}`)
      if (r.status() >= 400 && url.startsWith(COGNITO_ENDPOINT)) errors.push(`${who}: Cognito HTTP ${r.status()}`)
    })
  }
  const evaluatorContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
  const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const evaluator = await open(evaluatorContext, demoUsers.Evaluator)
  const student = await open(studentContext, demoUsers.Student)
  watch(evaluator, "evaluator")
  watch(student, "student")
  try {
    await resetAll()
    await flows[n]({ evaluator, student })
  } catch (e) {
    errors.push(String(e).split("\n")[0])
    await evaluator.screenshot({ path: path.join(here, `../shots/evaluator-fail-${n}.png`) }).catch(() => {})
  }
  console.log(`${errors.length ? "FAIL" : "ok  "} ${n}`)
  errors.slice(0, 4).forEach((e) => console.log("    ", e.slice(0, 300)))
  failed += errors.length ? 1 : 0
  await evaluatorContext.close()
  await studentContext.close()
}
await browser.close()
await resetAll().catch((e) => console.log("final demo reset failed:", String(e)))
console.log(`${names.length - failed}/${names.length} flows passed`)
process.exit(failed ? 1 : 0)
