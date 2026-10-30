// End-to-end interaction checks for the redesigned student portal.
// Usage: node student-flows.mjs --base http://localhost:8443 [--flows a,b]
import { chromium } from "playwright-core"
import path from "node:path"
import { demoUsers } from "./routes.mjs"

const argv = process.argv
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`)
  return i === -1 ? d : argv[i + 1]
}
const base = arg("base", "http://localhost:8443")

async function seed(page, theme = "dark") {
  await page.addInitScript(
    ({ user, theme }) => {
      if (sessionStorage.getItem("__seeded")) return
      sessionStorage.setItem("__seeded", "1")
      localStorage.clear()
      localStorage.setItem("app_theme_mode", theme)
      localStorage.setItem("quantum_auth_session", "true")
      localStorage.setItem("quantum_user_role", user.role)
      localStorage.setItem("quantum_current_user", JSON.stringify(user))
    },
    { user: demoUsers.Student, theme },
  )
}
const expect = (c, m) => {
  if (!c) throw new Error(m)
}
const go = async (page, slug) => {
  await page.goto(`${base}/student${slug ? `?page=${slug}` : ""}`, { waitUntil: "networkidle" })
  await page.locator("h1").first().waitFor()
}
const h1 = async (page) => (await page.locator("main h1").first().innerText()).trim()

const flows = {
  async nav(page) {
    await go(page, "")
    const nav = page.locator('aside nav[aria-label="Primary"]')
    const expected = [
      ["My Courses", "My Courses"],
      ["Schedule", "Schedule"],
      ["Assessments", "Assessments"],
      ["Grades & Certificates", "Grades & Certificates"],
      ["Notes", "Notes"],
      ["Community", "Community"],
      ["Career Hub", "Career Hub"],
      ["Support", "Support"],
      ["Settings", "Settings"],
    ]
    for (const [item, title] of expected) {
      await nav.getByRole("button", { name: item, exact: true }).or(nav.getByRole("link", { name: item, exact: true })).first().click()
      await page.locator("main h1", { hasText: title }).first().waitFor({ timeout: 5000 })
      expect((await h1(page)) === title, `after clicking ${item}, h1 is "${await h1(page)}"`)
    }
  },

  async quiz(page) {
    await go(page, "assessments")
    await page.getByRole("tab", { name: /Quizzes/ }).click()
    await page.getByRole("button", { name: "Start quiz" }).first().click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Start quiz" }).click()
    for (let i = 0; i < 10; i++) {
      await dialog.getByRole("radio").first().click()
      const next = dialog.getByRole("button", { name: "Next", exact: true })
      if (await next.isVisible()) await next.click()
      else await dialog.getByRole("button", { name: "Submit quiz" }).click()
    }
    await dialog.getByText("Review answers").waitFor({ timeout: 5000 })
    const passed = await dialog.getByText(/Passed|Below pass mark/).first().innerText()
    expect(!!passed, "no pass/fail result")
    await dialog.getByRole("button", { name: "Done" }).click()
    await dialog.waitFor({ state: "hidden" })
    expect((await page.getByRole("button", { name: "Review answers" }).count()) >= 3, "completed quiz did not switch to Review answers")
  },

  async assignment(page) {
    await go(page, "assessments")
    const before = await page.getByRole("button", { name: "Resubmit" }).count()
    await page.getByRole("button", { name: "Submit work" }).first().click()
    const dialog = page.getByRole("dialog")
    await dialog.getByPlaceholder("https://github.com/you/project").fill("not-a-url")
    await dialog.getByRole("button", { name: "Submit work" }).click()
    await dialog.getByText(/Use a GitHub link/).waitFor({ timeout: 3000 })
    await dialog.getByPlaceholder("https://github.com/you/project").fill("https://github.com/aarav/rag-pipeline")
    await dialog.getByRole("button", { name: "Submit work" }).click()
    await dialog.waitFor({ state: "hidden", timeout: 5000 })
    await page.waitForTimeout(400)
    const after = await page.getByRole("button", { name: "Resubmit" }).count()
    expect(after === before + 1, `Resubmit buttons ${before} -> ${after}`)
  },

  async notes(page) {
    await go(page, "notes")
    await page.getByRole("button", { name: "New note" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Create note" }).click()
    await dialog.getByText("Give the note a title.").waitFor({ timeout: 3000 })
    await dialog.getByLabel(/Title/).fill("Flow test: attention heads")
    await dialog.getByRole("button", { name: "Create note" }).click()
    await page.getByRole("heading", { name: "Flow test: attention heads" }).waitFor({ timeout: 5000 })
    await page.reload({ waitUntil: "networkidle" })
    await page.getByRole("heading", { name: "Flow test: attention heads" }).waitFor({ timeout: 5000 })
  },

  async community(page) {
    await go(page, "community")
    await page.getByRole("button", { name: "New post" }).click()
    await page.getByLabel(/Title/).fill("Flow test: who is joining the hackathon?")
    await page.getByRole("button", { name: "Publish" }).click()
    await page.getByRole("heading", { name: "Flow test: who is joining the hackathon?" }).waitFor({ timeout: 5000 })
    const like = page.locator("article").first().getByRole("button", { name: /^Like, 0 likes/ })
    await like.click()
    await page.locator("article").first().getByRole("button", { name: /^Unlike, 1 likes/ }).waitFor({ timeout: 3000 })
  },

  async course(page) {
    await go(page, "course-details")
    const ring = page.getByRole("progressbar", { name: "Course progress" })
    const before = Number(await ring.getAttribute("aria-valuenow"))
    await page.getByRole("button", { name: "Mark complete" }).click()
    await page.waitForTimeout(300)
    const after = Number(await ring.getAttribute("aria-valuenow"))
    expect(after > before, `course progress ${before} -> ${after}`)
    await page.getByRole("button", { name: "Next lesson" }).click()
    await page.getByRole("tab", { name: /Q&A/ }).click()
    await page.getByLabel("Ask a question").fill("Flow test question about chunk overlap?")
    await page.getByRole("button", { name: "Post question" }).click()
    await page.getByText("Flow test question about chunk overlap?").waitFor({ timeout: 3000 })
  },

  async enroll(page) {
    await go(page, "my-courses")
    await page.getByRole("tab", { name: /Explore/ }).click()
    await page.getByRole("button", { name: "Enroll", exact: true }).first().click()
    await page.getByRole("dialog").getByRole("button", { name: "Enroll and start" }).click()
    await page.locator("main h1", { hasText: "Prompt Engineering Deep Dive" }).waitFor({ timeout: 5000 })
    expect((await page.getByRole("navigation", { name: "Breadcrumb" }).innerText()).includes("My Courses"), "breadcrumb missing")
  },

  async interview(page) {
    await go(page, "career-hub")
    await page.getByRole("button", { name: "Start interview" }).click()
    const answer =
      "I would chunk documents, create embedding vectors, store them in a vector index, use retrieval with a rerank step, build a grounded prompt and run evaluation to catch hallucination."
    for (let i = 0; i < 3; i++) {
      await page.getByText(`Question ${i + 1} of 3`).waitFor({ timeout: 5000 })
      await page.waitForTimeout(350) // let the previous question finish its exit transition
      await page.getByLabel("Your answer").fill(answer)
      const finish = page.getByRole("button", { name: "Finish and score" })
      if (await finish.isVisible()) await finish.click()
      else await page.getByRole("button", { name: "Next question" }).click()
    }
    await page.getByRole("button", { name: "Try again" }).waitFor({ timeout: 5000 })
  },

  async ticket(page) {
    await go(page, "support")
    await page.getByRole("button", { name: "New ticket" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel(/Subject/).fill("Flow test: cannot open lab notebook")
    await dialog.getByLabel(/Description/).fill("The Lab 4 notebook shows a 404 when I open it from course materials.")
    await dialog.getByRole("button", { name: "Submit ticket" }).click()
    await page.getByText("Flow test: cannot open lab notebook").waitFor({ timeout: 5000 })
    await page.getByText("Flow test: cannot open lab notebook").click()
    const sheet = page.getByRole("dialog")
    await sheet.getByLabel("Reply to support").fill("Adding a screenshot shortly.")
    await sheet.getByRole("button", { name: "Send reply" }).click()
    await sheet.getByText("Adding a screenshot shortly.").waitFor({ timeout: 3000 })
  },

  async settings(page) {
    await go(page, "settings")
    await page.getByRole("tab", { name: "Appearance" }).click()
    await page.getByRole("radio", { name: "Light" }).click()
    await page.waitForFunction(() => !document.documentElement.classList.contains("dark"))
    await page.getByRole("tab", { name: "Security" }).click()
    await page.getByLabel("New password", { exact: true }).fill("abc")
    await page.getByText("Weak password").waitFor({ timeout: 3000 })
    await page.getByLabel("New password", { exact: true }).fill("Str0ng!Passw0rd")
    await page.getByText("Strong password").waitFor({ timeout: 3000 })
  },
}

const names = (arg("flows", "") || Object.keys(flows).join(",")).split(",").filter(Boolean)
const exe = path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1140", "chrome-win", "chrome.exe")
const browser = await chromium.launch({ executablePath: exe })
let failed = 0
for (const n of names) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (e) => errors.push(String(e)))
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
  await seed(page)
  try {
    await flows[n](page)
  } catch (e) {
    errors.push(String(e).split("\n")[0])
    await page.screenshot({ path: `../shots/flow-fail-${n}.png` }).catch(() => {})
  }
  console.log(`${errors.length ? "FAIL" : "ok  "} ${n}`)
  errors.slice(0, 3).forEach((e) => console.log("    ", e.slice(0, 300)))
  failed += errors.length ? 1 : 0
  await context.close()
}
await browser.close()
console.log(`${names.length - failed}/${names.length} flows passed`)
process.exit(failed ? 1 : 0)
