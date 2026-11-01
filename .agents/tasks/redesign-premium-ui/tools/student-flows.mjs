// End-to-end checks for the student portal against the live Supabase backend.
// Each flow starts from a freshly reset demo student, acts through the UI, then reloads to prove the change persisted.
// Usage: node student-flows.mjs --base http://localhost:8443 [--flows a,b]
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY from frontend/.env.local. The signup flow deletes its test
// account afterwards when SUPABASE_ACCESS_TOKEN is set (otherwise it reports the leftover account).
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright-core"
import { demoUsers } from "./routes.mjs"

const argv = process.argv
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`)
  return i === -1 ? d : argv[i + 1]
}
const base = arg("base", "http://localhost:8443")
const here = path.dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(path.join(here, "../../../../frontend/.env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
)
const SB_URL = env.VITE_SUPABASE_URL
const SB_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY
const DEMO = { email: "aarav.mehta@learner.ai", password: "demo-student" }

async function sb(pathname, { method = "GET", body, token } = {}) {
  const res = await fetch(`${SB_URL}${pathname}`, {
    method,
    headers: { apikey: SB_KEY, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null }
}

/** Restores the shared demo student's data so every flow starts from the same state. */
async function resetDemo() {
  const auth = await sb("/auth/v1/token?grant_type=password", { method: "POST", body: DEMO })
  if (!auth.ok) throw new Error(`demo sign-in failed: ${auth.status}`)
  const r = await sb("/rest/v1/rpc/reset_my_demo_data", { method: "POST", body: {}, token: auth.data.access_token })
  if (!r.ok) throw new Error(`demo reset failed: ${r.status} ${JSON.stringify(r.data)}`)
}

async function seed(page, user = demoUsers.Student, theme = "dark") {
  await page.addInitScript(
    ({ user, theme }) => {
      if (sessionStorage.getItem("__seeded")) return
      sessionStorage.setItem("__seeded", "1")
      localStorage.clear()
      localStorage.setItem("app_theme_mode", theme)
      if (user) {
        localStorage.setItem("quantum_auth_session", "true")
        localStorage.setItem("quantum_user_role", user.role)
        localStorage.setItem("quantum_current_user", JSON.stringify(user))
      }
    },
    { user, theme },
  )
}
const expect = (c, m) => {
  if (!c) throw new Error(m)
}
const settle = async (page) => {
  await page.waitForLoadState("networkidle")
  await page.locator('[role="status"][aria-label^="Loading"]').first().waitFor({ state: "detached", timeout: 15000 }).catch(() => {})
}
const go = async (page, slug) => {
  await page.goto(`${base}/student${slug ? `?page=${slug}` : ""}`, { waitUntil: "networkidle" })
  await page.locator("main h1").first().waitFor({ timeout: 20000 })
  await settle(page)
}
const reload = async (page) => {
  await page.reload({ waitUntil: "networkidle" })
  await page.locator("main h1").first().waitFor({ timeout: 20000 })
  await settle(page)
}
const h1 = async (page) => (await page.locator("main h1").first().innerText()).trim()

const flows = {
  async nav(page) {
    await go(page, "")
    expect((await h1(page)).endsWith("Aarav"), `dashboard greets "${await h1(page)}"`)
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
      await page.locator("main h1", { hasText: title }).first().waitFor({ timeout: 8000 })
      expect((await h1(page)) === title, `after clicking ${item}, h1 is "${await h1(page)}"`)
    }
  },

  async quiz(page) {
    await go(page, "quizzes")
    await page.getByRole("tab", { name: /Quizzes/ }).click()
    expect((await page.getByRole("button", { name: "Review answers" }).count()) === 2, "expected 2 completed quizzes")
    await page.getByRole("button", { name: "Start quiz" }).first().click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Start quiz" }).click()
    await dialog.getByRole("timer").waitFor({ timeout: 10000 })
    for (let i = 0; i < 10; i++) {
      await dialog.getByRole("radio").first().click()
      const next = dialog.getByRole("button", { name: "Next", exact: true })
      if (await next.isVisible()) await next.click()
      else await dialog.getByRole("button", { name: "Submit quiz" }).click()
    }
    await dialog.getByText("Review answers").waitFor({ timeout: 15000 })
    const verdict = await dialog.getByText(/^(Passed|Below pass mark)$/).first().innerText()
    expect(!!verdict, "no pass/fail result")
    // The review shows the correct answers, which only the server knows.
    expect((await dialog.getByText(/Correct answer|Your answer · correct/).count()) > 0, "review shows no correct answers")
    await dialog.getByRole("button", { name: "Done" }).click()
    await dialog.waitFor({ state: "hidden" })
    await reload(page)
    await page.getByRole("tab", { name: /Quizzes/ }).click()
    expect((await page.getByRole("button", { name: "Review answers" }).count()) === 3, "graded attempt did not persist")
    await page.getByRole("button", { name: "Review answers" }).first().click()
    await page.getByRole("dialog").getByText("Review answers").waitFor({ timeout: 10000 })
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
    await dialog.locator('input[type="file"]').setInputFiles({ name: "rag_pipeline.py", mimeType: "text/x-python", buffer: Buffer.from("print('retrieve, rerank, generate')\n") })
    await dialog.getByText("rag_pipeline.py").waitFor({ timeout: 3000 })
    await dialog.getByRole("button", { name: "Submit work" }).click()
    await dialog.waitFor({ state: "hidden", timeout: 15000 })
    await reload(page)
    const after = await page.getByRole("button", { name: "Resubmit" }).count()
    expect(after === before + 1, `Resubmit buttons ${before} -> ${after} after reload`)
    const card = page.locator("li", { hasText: "Project 1: End-to-End RAG Pipeline" }).first()
    await card.getByRole("button", { name: "Show details" }).click()
    await card.getByText(/rag_pipeline\.py/).waitFor({ timeout: 3000 })
    await card.getByText("https://github.com/aarav/rag-pipeline").waitFor({ timeout: 3000 })
  },

  async notes(page) {
    await go(page, "notes")
    await page.getByRole("button", { name: "New note" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Create note" }).click()
    await dialog.getByText("Give the note a title.").waitFor({ timeout: 3000 })
    await dialog.getByLabel(/Title/).fill("Flow test: attention heads")
    await dialog.getByRole("button", { name: "Create note" }).click()
    await page.getByRole("heading", { name: "Flow test: attention heads" }).waitFor({ timeout: 8000 })
    await reload(page)
    await page.getByRole("heading", { name: "Flow test: attention heads" }).waitFor({ timeout: 8000 })
    const card = page.locator("article", { hasText: "Flow test: attention heads" })
    await card.hover()
    await card.getByRole("button", { name: "Delete note" }).click()
    await page.getByRole("heading", { name: "Flow test: attention heads" }).waitFor({ state: "detached", timeout: 8000 })
    await reload(page)
    expect((await page.getByRole("heading", { name: "Flow test: attention heads" }).count()) === 0, "deleted note came back")
  },

  async community(page) {
    await go(page, "community")
    await page.getByRole("button", { name: "New post" }).click()
    await page.getByLabel(/Title/).fill("Flow test: who is joining the hackathon?")
    await page.getByRole("button", { name: "Publish" }).click()
    await page.getByRole("heading", { name: "Flow test: who is joining the hackathon?" }).waitFor({ timeout: 8000 })
    const post = () => page.locator("article", { hasText: "Flow test: who is joining the hackathon?" })
    await post().getByRole("button", { name: /^Like, 0 likes/ }).click()
    await post().getByRole("button", { name: /^Unlike, 1 likes/ }).waitFor({ timeout: 5000 })
    await post().getByRole("button", { name: /repl/ }).click()
    await post().getByLabel("Write a reply").fill("Count me in for the agents track.")
    await post().getByRole("button", { name: "Send reply" }).click()
    await post().getByText("Count me in for the agents track.").waitFor({ timeout: 5000 })
    await reload(page)
    await post().getByRole("button", { name: /^Unlike, 1 likes/ }).waitFor({ timeout: 8000 })
    await post().getByRole("button", { name: /1 reply/ }).waitFor({ timeout: 3000 })
  },

  async course(page) {
    await go(page, "course-details&course=c-1")
    const ring = page.getByRole("progressbar", { name: "Course progress" })
    const before = Number(await ring.getAttribute("aria-valuenow"))
    await page.getByRole("button", { name: "Mark complete" }).click()
    await page.getByRole("button", { name: "Completed" }).first().waitFor({ timeout: 5000 })
    const after = Number(await ring.getAttribute("aria-valuenow"))
    expect(after > before, `course progress ${before} -> ${after}`)
    await page.getByRole("tab", { name: /Q&A/ }).click()
    await page.getByLabel("Ask a question").fill("Flow test question about chunk overlap?")
    await page.getByRole("button", { name: "Post question" }).click()
    await page.getByText("Flow test question about chunk overlap?").waitFor({ timeout: 5000 })
    await page.waitForTimeout(500)
    await reload(page)
    const persisted = Number(await page.getByRole("progressbar", { name: "Course progress" }).getAttribute("aria-valuenow"))
    expect(persisted === after, `progress after reload ${persisted}, expected ${after}`)
    await page.getByRole("tab", { name: /Q&A/ }).click()
    await page.getByText("Flow test question about chunk overlap?").waitFor({ timeout: 8000 })
  },

  async enroll(page) {
    await go(page, "my-courses")
    await page.getByRole("tab", { name: /Explore/ }).click()
    await page.getByRole("button", { name: "Enroll", exact: true }).first().click()
    await page.getByRole("dialog").getByRole("button", { name: "Enroll and start" }).click()
    await page.locator("main h1", { hasText: "Prompt Engineering Deep Dive" }).waitFor({ timeout: 10000 })
    expect((await page.getByRole("navigation", { name: "Breadcrumb" }).innerText()).includes("My Courses"), "breadcrumb missing")
    await reload(page)
    await page.locator("main h1", { hasText: "Prompt Engineering Deep Dive" }).waitFor({ timeout: 10000 })
    await page.getByRole("button", { name: "Mark complete" }).waitFor({ timeout: 5000 })
  },

  async interview(page) {
    await go(page, "career-hub")
    const sessions = await page.locator("text=/Technical · |Behavioral · /").count()
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
    await page.waitForTimeout(1500)
    await reload(page)
    const now = await page.locator("text=/Technical · |Behavioral · /").count()
    expect(now === sessions + 1, `past sessions ${sessions} -> ${now} after reload`)
  },

  async resume(page) {
    await go(page, "resume")
    await page.getByRole("tab", { name: "Resume" }).click()
    const headline = page.getByLabel("Headline")
    await headline.fill("AI Engineer · Flow test headline")
    await page.getByText("All changes saved to your account.").waitFor({ timeout: 10000 })
    await reload(page)
    await page.getByRole("tab", { name: "Resume" }).click()
    expect((await page.getByLabel("Headline").inputValue()) === "AI Engineer · Flow test headline", "resume edit did not persist")
  },

  async mentor(page) {
    await go(page, "career-hub")
    await page.getByRole("tab", { name: "Mentorship" }).click()
    await page.getByRole("button", { name: "Reschedule" }).first().click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("radio").nth(1).click()
    await dialog.getByRole("radio", { name: /04:30 PM/ }).click()
    await dialog.getByRole("button", { name: "Confirm booking" }).click()
    await dialog.waitFor({ state: "hidden", timeout: 10000 })
    await page.getByText(/04:30 PM – 05:15 PM/).waitFor({ timeout: 5000 })
    await reload(page)
    await page.getByRole("tab", { name: "Mentorship" }).click()
    await page.getByText(/04:30 PM – 05:15 PM/).waitFor({ timeout: 8000 })
    await page.getByRole("button", { name: "Request mentorship" }).click()
    await page.getByRole("button", { name: /Request sent/ }).waitFor({ timeout: 5000 })
  },

  async schedule(page) {
    await go(page, "events")
    await page.getByRole("tab", { name: "Events" }).click()
    const register = page.getByRole("button", { name: "Register", exact: true }).first()
    await register.click()
    await page.waitForTimeout(800)
    const registered = await page.getByRole("button", { name: "Registered" }).count()
    await reload(page)
    await page.getByRole("tab", { name: "Events" }).click()
    expect((await page.getByRole("button", { name: "Registered" }).count()) === registered, "event registration did not persist")
    await page.getByRole("tab", { name: /Announcements/ }).click()
    await page.getByRole("button", { name: "Mark all as read" }).click()
    await page.getByText("You're all caught up").waitFor({ timeout: 5000 })
    await page.getByRole("tab", { name: "Attendance" }).click()
    await page.getByRole("button", { name: "Request leave" }).click()
    const dialog = page.getByRole("dialog")
    const d = new Date(Date.now() + 3 * 86_400_000)
    await dialog.locator('input[type="date"]').fill(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
    await dialog.getByLabel(/Reason/).fill("Flow test: attending a conference talk")
    await dialog.getByRole("button", { name: "Send request" }).click()
    await dialog.waitFor({ state: "hidden", timeout: 8000 })
    await reload(page)
    await page.getByRole("tab", { name: "Attendance" }).click()
    await page.getByText("Pending").first().waitFor({ timeout: 5000 })
    await page.getByRole("tab", { name: /Announcements/ }).click()
    await page.getByText("You're all caught up").waitFor({ timeout: 5000 })
  },

  async ticket(page) {
    await go(page, "support")
    await page.getByRole("button", { name: "New ticket" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel(/Subject/).fill("Flow test: cannot open lab notebook")
    await dialog.getByLabel(/Description/).fill("The Lab 4 notebook shows a 404 when I open it from course materials.")
    await dialog.getByRole("button", { name: "Submit ticket" }).click()
    await page.getByText("Flow test: cannot open lab notebook").waitFor({ timeout: 10000 })
    await page.getByText("Flow test: cannot open lab notebook").click()
    const sheet = page.getByRole("dialog")
    await sheet.getByLabel("Reply to support").fill("Adding a screenshot shortly.")
    await sheet.getByRole("button", { name: "Send reply" }).click()
    await sheet.getByText("Adding a screenshot shortly.").waitFor({ timeout: 5000 })
    await reload(page)
    await page.getByRole("tab", { name: /My tickets/ }).click()
    await page.getByText("Flow test: cannot open lab notebook").click()
    await page.getByRole("dialog").getByText("Adding a screenshot shortly.").waitFor({ timeout: 8000 })
  },

  async chat(page) {
    await go(page, "support")
    await page.getByRole("button", { name: "Start chat" }).click()
    const sheet = page.getByRole("dialog")
    await sheet.getByLabel("Message", { exact: true }).fill("My GPU quota ran out during a benchmark")
    await sheet.getByRole("button", { name: "Send message" }).click()
    await sheet.getByText(/raise a priority request with DevOps/).waitFor({ timeout: 10000 })
    await reload(page)
    await page.getByRole("button", { name: "Start chat" }).click()
    await page.getByRole("dialog").getByText("My GPU quota ran out during a benchmark").waitFor({ timeout: 8000 })
  },

  async settings(page) {
    await go(page, "settings")
    await page.getByLabel("Bio").fill("Flow test bio: building RAG systems.")
    await page.getByRole("button", { name: "Save changes" }).click()
    await page.getByRole("button", { name: "Saved" }).waitFor({ timeout: 8000 })
    await page.getByRole("tab", { name: "Notifications" }).click()
    const digest = page.getByRole("switch", { name: /Weekly progress digest/ })
    await digest.click()
    await page.waitForFunction(() => document.querySelector('[id="pref-digest"]')?.getAttribute("aria-checked") === "false")
    await page.waitForTimeout(800)
    await reload(page)
    expect((await page.getByLabel("Bio").inputValue()) === "Flow test bio: building RAG systems.", "bio did not persist")
    await page.getByRole("tab", { name: "Notifications" }).click()
    expect((await page.getByRole("switch", { name: /Weekly progress digest/ }).getAttribute("aria-checked")) === "false", "digest preference did not persist")
    await page.getByRole("tab", { name: "Appearance" }).click()
    await page.getByRole("radio", { name: "Light" }).click()
    await page.waitForFunction(() => !document.documentElement.classList.contains("dark"))
    await page.getByRole("tab", { name: "Security" }).click()
    // The shared demo account can't change its password; the form says so and stays disabled.
    await page.getByText(/shared demo account/).waitFor({ timeout: 3000 })
    expect(await page.getByLabel("New password", { exact: true }).isDisabled(), "demo password form should be disabled")
  },

  async signup(page) {
    const email = `flow-${Date.now().toString(36)}@example.com`
    await page.goto(`${base}/auth`, { waitUntil: "networkidle" })
    await page.getByTitle("Student Portal").click()
    await page.getByRole("button", { name: "Create Account" }).click()
    await page.getByPlaceholder("e.g. Marcus Sterling").fill("Flow Tester")
    await page.getByPlaceholder("name@quantum-lms.edu").fill(email)
    await page.getByPlaceholder("Enter your password").fill("flow-pass-123")
    await page.getByRole("button", { name: /Create Student Account/ }).click()
    await page.locator("main h1", { hasText: /Flow$/ }).waitFor({ timeout: 20000 })
    await settle(page)
    // A new student starts with the starter courses and no history.
    await page.goto(`${base}/student?page=my-courses`, { waitUntil: "networkidle" })
    await page.locator("main h1", { hasText: "My Courses" }).waitFor({ timeout: 15000 })
    await settle(page)
    const enrolled = await page.getByRole("tab", { name: /Enrolled/ }).innerText()
    expect(/4/.test(enrolled), `new student enrolled tab says "${enrolled}"`)
    page.__cleanupEmail = email
  },
}

let adminKeyPromise
/** The project's service key, fetched with SUPABASE_ACCESS_TOKEN; null when the token isn't set. */
function adminKey() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token) return Promise.resolve(null)
  adminKeyPromise ??= (async () => {
    const ref = new URL(SB_URL).hostname.split(".")[0]
    const keys = await (await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${token}` } })).json()
    return keys.find((k) => k.name === "service_role")?.api_key ?? keys.find((k) => k.type === "secret")?.api_key
  })()
  return adminKeyPromise
}

async function deleteUserByEmail(email) {
  const admin = await adminKey()
  if (!admin) return `left test account ${email} (set SUPABASE_ACCESS_TOKEN to clean up)`
  const list = await (await fetch(`${SB_URL}/auth/v1/admin/users?per_page=200`, { headers: { apikey: admin, Authorization: `Bearer ${admin}` } })).json()
  const user = (list.users ?? []).find((u) => u.email === email)
  if (!user) return `test account ${email} not found`
  const res = await fetch(`${SB_URL}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: { apikey: admin, Authorization: `Bearer ${admin}` } })
  return res.ok ? null : `deleting ${email} failed: ${res.status}`
}

/**
 * The demo reset restores database rows only, so files the flows uploaded (submissions, attachments, avatars) would
 * pile up in the demo student's storage folders. Removes them after the final reset.
 */
async function emptyDemoStorage() {
  const admin = await adminKey()
  if (!admin) return "left the demo student's uploaded files (set SUPABASE_ACCESS_TOKEN to clean up)"
  const auth = await sb("/auth/v1/token?grant_type=password", { method: "POST", body: DEMO })
  if (!auth.ok) return `demo sign-in failed: ${auth.status}`
  const headers = { apikey: admin, Authorization: `Bearer ${admin}`, "Content-Type": "application/json" }
  let removed = 0
  for (const bucket of ["submissions", "ticket-attachments", "avatars"]) {
    const files = []
    const walk = async (dir) => {
      const res = await fetch(`${SB_URL}/storage/v1/object/list/${bucket}`, { method: "POST", headers, body: JSON.stringify({ prefix: dir, limit: 1000 }) })
      if (!res.ok) return
      for (const item of await res.json()) {
        if (item.id) files.push(`${dir}${item.name}`)
        else await walk(`${dir}${item.name}/`)
      }
    }
    await walk(`${auth.data.user.id}/`)
    if (!files.length) continue
    const res = await fetch(`${SB_URL}/storage/v1/object/${bucket}`, { method: "DELETE", headers, body: JSON.stringify({ prefixes: files }) })
    if (!res.ok) return `removing the demo's files from ${bucket} failed: ${res.status}`
    removed += files.length
  }
  return removed ? `removed ${removed} file(s) the flows uploaded for the demo student` : null
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
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().startsWith(SB_URL)) errors.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().slice(SB_URL.length, SB_URL.length + 120)}`)
  })
  try {
    await resetDemo()
    await seed(page, n === "signup" ? null : demoUsers.Student)
    await flows[n](page)
  } catch (e) {
    errors.push(String(e).split("\n")[0])
    await page.screenshot({ path: path.join(here, `../shots/flow-fail-${n}.png`) }).catch(() => {})
  }
  if (page.__cleanupEmail) {
    const note = await deleteUserByEmail(page.__cleanupEmail).catch((e) => String(e))
    if (note) console.log("    ", note)
  }
  console.log(`${errors.length ? "FAIL" : "ok  "} ${n}`)
  errors.slice(0, 4).forEach((e) => console.log("    ", e.slice(0, 300)))
  failed += errors.length ? 1 : 0
  await context.close()
}
await browser.close()
await resetDemo().catch((e) => console.log("final demo reset failed:", String(e)))
const storageNote = await emptyDemoStorage().catch((e) => String(e))
if (storageNote) console.log(storageNote)
console.log(`${names.length - failed}/${names.length} flows passed`)
process.exit(failed ? 1 : 0)
