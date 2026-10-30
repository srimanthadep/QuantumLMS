// End-to-end interaction checks for the redesigned teacher portal.
// Usage: node teacher-flows.mjs --base http://localhost:8443 [--flows a,b]
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
    { user: demoUsers.Teacher, theme },
  )
}
const expect = (c, m) => {
  if (!c) throw new Error(m)
}
const go = async (page, p = "") => {
  await page.goto(`${base}/teacher${p}`, { waitUntil: "networkidle" })
  await page.locator("main h1").first().waitFor()
}
const h1 = async (page) => (await page.locator("main h1").first().innerText()).trim()
const toast = (page, text) => page.getByText(text).first().waitFor({ timeout: 5000 })

const flows = {
  async nav(page) {
    await go(page)
    expect((await h1(page)).startsWith("Good afternoon"), `dashboard h1 is "${await h1(page)}"`)
    const nav = page.locator('aside nav[aria-label="Primary"]')
    const expected = [
      ["Courses", "Courses"],
      ["Live Classes", "Live classes"],
      ["Recordings", "Recordings"],
      ["Students", "Students"],
      ["Doubts", "Doubts"],
      ["Calendar", "Calendar"],
      ["Analytics", "Analytics"],
      ["Support", "Help & support"],
      ["Settings", "Settings"],
      ["Dashboard", "Good afternoon, Srimanth"],
    ]
    for (const [item, title] of expected) {
      await nav.getByRole("button", { name: item }).first().click()
      await page.locator("main h1", { hasText: title }).first().waitFor({ timeout: 5000 })
      const current = await nav.locator('[aria-current="page"]').innerText()
      expect(current.startsWith(item), `after clicking ${item}, active nav is "${current}"`)
    }
  },

  async grading(page) {
    await go(page)
    await page.getByRole("button", { name: "Grade 4" }).click()
    const sheet = page.getByRole("dialog")
    await sheet.getByText("Mars Mission Comprehension").first().waitFor()
    const todo = sheet.locator("dl > div").first()
    expect((await todo.innerText()).includes("4"), "sheet does not start with 4 to grade")
    await sheet.getByLabel(/Score \(out of 40\)/).fill("50")
    await sheet.getByRole("button", { name: "Save and next" }).click()
    await sheet.getByText("Enter a score from 0 to 40.").waitFor({ timeout: 3000 })
    await sheet.getByLabel(/Score \(out of 40\)/).fill("36")
    await sheet.getByRole("button", { name: "Suggest feedback" }).click()
    await page.waitForFunction(() => (document.querySelector('[role="dialog"] textarea') ?? { value: "" }).value.length > 20)
    await sheet.getByRole("button", { name: "Save and next" }).click()
    await toast(page, /Graded .*: 36\/40/)
    await page.waitForTimeout(300)
    expect((await todo.innerText()).includes("3"), `to-grade count did not drop: ${await todo.innerText()}`)
  },

  async doubt(page) {
    await go(page, "/doubts?doubt=d8")
    await page.getByRole("heading", { name: /Connecting 75% to 3\/4/ }).waitFor()
    await page.getByRole("button", { name: "Suggest reply" }).click()
    await page.waitForFunction(() => (document.getElementById("doubt-reply") ?? { value: "" }).value.includes("75%"))
    await page.getByRole("button", { name: "Send and resolve" }).click()
    await toast(page, /marked it resolved/)
    const badge = page.locator('aside nav[aria-label="Primary"]').getByRole("button", { name: /Doubts/ })
    await page.waitForFunction(() => /Doubts\s*4/.test(document.querySelector('aside nav[aria-label="Primary"]')?.textContent ?? ""))
    expect((await badge.innerText()).includes("4"), "doubts badge did not drop to 4")
  },

  async studio(page) {
    await go(page, "/live-class/studio/ls-1")
    await page.getByText("22 watching").waitFor()
    await page.getByRole("button", { name: "Launch poll" }).click()
    await page.getByText("22 of 22 voted").waitFor({ timeout: 15000 })
    await page.getByRole("button", { name: "Close poll" }).click()
    await page.getByText("Closed", { exact: true }).waitFor()
    await page.getByRole("button", { name: "Lower Liam Brooks's hand" }).click()
    await page.getByText("2 hands up").waitFor()
    await page.getByRole("tab", { name: /Q&A/ }).click()
    await page.getByRole("button", { name: "Pin to stage" }).first().click()
    await page.getByText(/asks$/).first().waitFor()
    await page.getByRole("button", { name: "Mute microphone" }).click()
    expect((await page.getByRole("button", { name: "Unmute microphone" }).getAttribute("aria-pressed")) === "false", "mic toggle did not switch")
  },

  async endClass(page) {
    await go(page, "/live-class")
    await page.getByRole("button", { name: "Start", exact: true }).first().click()
    await page.waitForURL(/\/teacher\/live-class\/studio\/ls-2$/)
    await page.locator("main h1", { hasText: "Python Computational Thinking" }).waitFor()
    await page.getByRole("button", { name: "End class" }).first().click()
    const dialog = page.getByRole("dialog")
    await dialog.getByText("End the class for everyone?").waitFor()
    await dialog.getByRole("button", { name: "End class" }).click()
    await page.waitForURL(/\/teacher\/recordings\/rec-ls-2$/)
    await page.getByText("Processing your recording").waitFor()
  },

  async course(page) {
    await go(page, "/courses/c1")
    const panel = page.locator("#module-m3-panel")
    await panel.waitFor()
    await panel.getByRole("checkbox", { name: /as delivered/ }).first().click()
    await page.getByText("3/3 lessons delivered · 4 materials").waitFor({ timeout: 3000 })
    await panel.getByPlaceholder("Lesson title").fill("Flow test lesson")
    await panel.getByRole("button", { name: "Add lesson" }).click()
    await panel.getByText("Flow test lesson").waitFor()
    await page.getByRole("button", { name: "Move Fractions & Mathematical Problem Solving up" }).click()
    await page.waitForTimeout(500)
    const first = await page.locator('button[aria-controls^="module-"]').first().innerText()
    expect(first.includes("Fractions"), `first module after move is "${first.split("\n")[0]}"`)
    await page.getByRole("tab", { name: /Assignments/ }).click()
    await page.waitForURL(/tab=assignments/)
    await page.getByRole("button", { name: /^Grade \d/ }).first().waitFor()
  },

  async recordings(page) {
    await go(page, "/recordings")
    await page.locator("#publish-rec-1").click()
    await toast(page, /hidden from learners/)
    await page.getByRole("radio", { name: /Drafts 1/ }).click()
    await page.getByText("Foundations of Biological Systems").first().waitFor()
    await page.getByRole("button", { name: "Review", exact: true }).first().click()
    await page.waitForURL(/\/teacher\/recordings\/rec-1$/)
    await page.getByRole("button", { name: "Publish to learners" }).click()
    await toast(page, /published to learners/)
    await page.getByRole("tab", { name: /Transcript/ }).click()
    await page.getByLabel("Search the transcript").fill("chlorophyll")
    expect((await page.locator("mark").count()) > 0, "transcript search highlights nothing")
  },

  async calendar(page) {
    await go(page, "/calendar")
    await page.getByRole("button", { name: "New event" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Add event" }).click()
    await dialog.getByText(/at least 3 characters/).waitFor()
    await dialog.getByLabel("Title").fill("Flow test office hours")
    await dialog.getByRole("button", { name: "Add event" }).click()
    await dialog.waitFor({ state: "hidden" })
    const block = page.getByRole("button", { name: /Flow test office hours/ }).first()
    await block.click()
    await page.getByRole("button", { name: "Delete" }).click()
    await toast(page, /Removed “Flow test office hours”/)
    await page.getByRole("radio", { name: "Month" }).click()
    await page.getByText("October 2026").waitFor()
    await page.getByRole("radio", { name: "Agenda" }).click()
    await page.getByText(/Next two weeks/).waitFor()
  },

  async students(page) {
    await go(page, "/students")
    await page.getByRole("row", { name: /Liam Brooks/ }).click()
    await page.waitForURL(/student=s3/)
    const sheet = page.getByRole("dialog")
    await sheet.getByRole("heading", { name: "Liam Brooks" }).waitFor()
    await sheet.getByLabel("Teacher notes for Liam Brooks").fill("Flow test note: fractions practice twice a week.")
    await sheet.getByRole("button", { name: "Save notes" }).click()
    await toast(page, /Notes saved for Liam/)
    await page.keyboard.press("Escape")
    await page.waitForURL((u) => !u.search.includes("student="))
    await page.getByRole("radio", { name: /Needs attention 2/ }).click()
    expect((await page.locator("tbody tr").count()) === 2, "needs-attention filter does not show 2 rows")
  },

  async settings(page) {
    await go(page, "/settings")
    const section = page.locator('nav[aria-label="Settings sections"]')
    await section.getByRole("button", { name: "Notifications" }).click()
    const late = page.getByRole("switch", { name: "Late joins" })
    expect((await late.getAttribute("aria-checked")) === "false", "late joins should start off")
    await late.click()
    await page.reload({ waitUntil: "networkidle" })
    await section.getByRole("button", { name: "Notifications" }).click()
    expect((await page.getByRole("switch", { name: "Late joins" }).getAttribute("aria-checked")) === "true", "late joins did not persist")
    await section.getByRole("button", { name: "Profile" }).click()
    await page.getByLabel("Display name").fill("Srimanth A.")
    await page.getByRole("button", { name: "Save profile" }).click()
    await toast(page, "Profile saved")
  },

  async redirects(page) {
    await page.goto(`${base}/teacher/reports`, { waitUntil: "networkidle" })
    await page.waitForURL(/\/teacher\/analytics\?tab=reports$/)
    await page.getByText("Report archive").waitFor()
    await page.goto(`${base}/teacher/live-class/review/ls-6`, { waitUntil: "networkidle" })
    await page.waitForURL(/\/teacher\/recordings\/rec-1$/)
    await page.goto(`${base}/teacher/nope`, { waitUntil: "networkidle" })
    await page.waitForURL(/\/teacher$/)
  },

  async mobileDoubts(page) {
    await go(page)
    await page.getByRole("button", { name: "Open navigation" }).click()
    await page.getByRole("dialog").getByRole("button", { name: /Doubts/ }).click()
    await page.locator("main h1", { hasText: "Doubts" }).waitFor()
    expect(!(await page.getByRole("button", { name: "Back to questions" }).isVisible()), "thread should be hidden until a question is picked")
    await page.getByRole("button", { name: /Ava Patel/ }).first().click()
    await page.getByRole("heading", { name: /TypeError/ }).waitFor()
    expect(!(await page.getByPlaceholder("Search questions").isVisible()), "list should hide while a thread is open")
    await page.getByRole("button", { name: "Back to questions" }).click()
    await page.getByPlaceholder("Search questions").waitFor()
  },

  async bell(page) {
    await go(page)
    await page.getByRole("button", { name: /^Notifications, \d+ unread$/ }).click()
    await page.getByRole("button", { name: /Your class is live/ }).click()
    await page.waitForURL(/\/teacher\/live-class\/studio\/ls-1$/)
  },
}

const names = (arg("flows", "") || Object.keys(flows).join(",")).split(",").filter(Boolean)
const exe = path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1140", "chrome-win", "chrome.exe")
const browser = await chromium.launch({ executablePath: exe })
let failed = 0
for (const n of names) {
  const mobile = n.startsWith("mobile")
  const context = await browser.newContext(
    mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } },
  )
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (e) => errors.push(String(e)))
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()))
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
