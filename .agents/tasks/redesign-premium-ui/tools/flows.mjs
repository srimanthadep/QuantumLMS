// Scripted end-to-end flows. Later phases add flows to the `flows` map.
// Usage: node flows.mjs --base http://localhost:8443 --flows name1,name2 --out <dir>
import { chromium } from "playwright-core"
import fs from "node:fs"
import path from "node:path"

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return def
  const v = process.argv[i + 1]
  return v && !v.startsWith("--") ? v : true
}

export const flows = {}

// ---------------------------------------------------------------------------
// Phase 1, item 9: app shell behaviour
// ---------------------------------------------------------------------------
import { demoUsers } from "./routes.mjs"

async function seed(page, role, theme = "dark") {
  await page.addInitScript(
    ({ user, theme }) => {
      try {
        if (sessionStorage.getItem("__flow_seeded")) return
        sessionStorage.setItem("__flow_seeded", "1")
        localStorage.clear()
        localStorage.setItem("app_theme_mode", theme)
        localStorage.setItem("quantum_auth_session", "true")
        localStorage.setItem("quantum_user_role", user.role)
        localStorage.setItem("quantum_current_user", JSON.stringify(user))
      } catch {}
    },
    { user: demoUsers[role], theme },
  )
}
function expect(cond, msg) {
  if (!cond) throw new Error(msg)
}
const desktopNav = (page) => page.locator('aside nav[aria-label="Primary"]')
// First line only: nav items can carry a count badge (Doubts shows the open doubts).
const activeLabel = async (page) => (await desktopNav(page).locator('[aria-current="page"]').first().innerText()).trim().split("\n")[0].trim()

// ⌘K / Ctrl+K opens the palette; Enter on a result navigates and closes it.
flows["shell-palette"] = async ({ page, base, out }) => {
  await seed(page, "Teacher")
  await page.goto(base + "/teacher", { waitUntil: "networkidle" })
  await page.keyboard.press("Control+K")
  const input = page.locator('[role="combobox"][aria-label="Search commands"]')
  await input.waitFor({ state: "visible", timeout: 3000 })
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(out, "shell-palette-open.png") })
  await input.fill("doubts")
  await page.keyboard.press("Enter")
  await page.waitForURL(/\/teacher\/doubts$/, { timeout: 5000 })
  await input.waitFor({ state: "hidden", timeout: 3000 })
  // The portal derives its active tab from the URL in an effect, so allow a few frames.
  await desktopNav(page).locator('[aria-current="page"]', { hasText: "Doubts" }).waitFor({ timeout: 2000 }).catch(() => {})
  const label = await activeLabel(page)
  expect(label === "Doubts", `active nav after palette is "${label}"`)
}

// The active pill glides between items (sampled every animation frame) instead of jumping.
flows["shell-nav-indicator"] = async ({ page, base }) => {
  await seed(page, "Student")
  await page.goto(base + "/student", { waitUntil: "networkidle" })
  await page.waitForTimeout(300)
  const ys = await page.evaluate(async () => {
    const nav = document.querySelector('aside nav[aria-label="Primary"]')
    const btn = [...nav.querySelectorAll("button")].find((b) => b.textContent.trim() === "Schedule")
    const pillY = () => nav.querySelector('[aria-current="page"] > span[aria-hidden="true"]')?.getBoundingClientRect().y ?? null
    const samples = [pillY()]
    btn.click()
    const t0 = performance.now()
    while (performance.now() - t0 < 700) {
      await new Promise((r) => requestAnimationFrame(r))
      samples.push(pillY())
    }
    return samples
  })
  const start = ys[0]
  const end = ys[ys.length - 1]
  expect(start !== null && end !== null, "indicator not found")
  expect(end > start + 20, `indicator did not move: ${start} -> ${end}`)
  const between = ys.filter((y) => y !== null && y > start + 1 && y < end - 1)
  expect(between.length >= 3, `indicator jumped instead of animating (${between.length} in-between frames)`)
  const label = await activeLabel(page)
  expect(label === "Schedule", `active item is "${label}"`)
}

// Collapse to the 68px rail, persist across reload, show rail tooltips, expand again.
flows["shell-collapse"] = async ({ page, base, out }) => {
  await seed(page, "Evaluator")
  await page.goto(base + "/evaluator/dashboard", { waitUntil: "networkidle" })
  const aside = page.locator("aside").first()
  const w0 = Math.round((await aside.boundingBox()).width)
  await aside.getByRole("button", { name: "Collapse sidebar" }).click()
  await page.waitForTimeout(400)
  const w1 = Math.round((await aside.boundingBox()).width)
  expect(w0 === 248 && w1 === 68, `sidebar widths ${w0} -> ${w1}`)
  await page.reload({ waitUntil: "networkidle" })
  const w2 = Math.round((await page.locator("aside").first().boundingBox()).width)
  expect(w2 === 68, `collapsed state not persisted (${w2}px after reload)`)
  await page.locator("aside").first().getByRole("button", { name: "Queue", exact: true }).hover()
  await page.waitForTimeout(600)
  expect((await page.getByRole("tooltip").count()) > 0, "rail tooltip did not appear")
  await page.screenshot({ path: path.join(out, "shell-collapsed-tooltip.png") })
  await page.locator("aside").first().getByRole("button", { name: "Expand sidebar" }).click()
  await page.waitForTimeout(400)
  const w3 = Math.round((await page.locator("aside").first().boundingBox()).width)
  expect(w3 === 248, `expand failed (${w3}px)`)
}

// Phone: theme picker is reachable in the top bar; the drawer navigates and closes.
flows["shell-mobile"] = async ({ page, base, out }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page, "Support", "dark")
  await page.goto(base + "/support", { waitUntil: "networkidle" })
  const themeBtn = page.locator("header").first().getByRole("button", { name: "Theme and accent" })
  expect(await themeBtn.isVisible(), "theme picker is not visible on a 390px screen")
  await themeBtn.click()
  await page.getByRole("radio", { name: "Light" }).click()
  await page.waitForTimeout(300)
  expect(!(await page.evaluate(() => document.documentElement.classList.contains("dark"))), "light mode did not apply")
  await page.getByRole("radio", { name: "Emerald" }).click()
  expect((await page.evaluate(() => document.documentElement.dataset.accent)) === "emerald", "accent did not apply")
  await page.screenshot({ path: path.join(out, "shell-mobile-theme.png") })
  await page.keyboard.press("Escape")
  await page.locator('[aria-label="Open navigation"]').click()
  const drawer = page.getByRole("dialog", { name: "Navigation" })
  await drawer.waitFor({ state: "visible", timeout: 3000 })
  await drawer.getByRole("button", { name: "Inbox", exact: true }).click()
  await page.waitForURL(/\/support\/inbox$/, { timeout: 5000 })
  await drawer.waitFor({ state: "hidden", timeout: 3000 })
}

// User menu > Switch role > Admin lands on the admin portal with its own nav.
flows["shell-role-switch"] = async ({ page, base }) => {
  await seed(page, "Student")
  await page.goto(base + "/student", { waitUntil: "networkidle" })
  await page.getByRole("button", { name: /^Account menu for/ }).click()
  await page.getByRole("menuitem", { name: "Switch role" }).hover()
  await page.getByRole("menuitemradio", { name: "Admin", exact: true }).click()
  await page.waitForURL(/\/admin$/, { timeout: 5000 })
  await page.waitForTimeout(300)
  const label = await activeLabel(page)
  expect(label === "Overview", `admin active nav is "${label}"`)
}

// The floating Clover button opens the assistant; a suggestion streams a role-aware reply.
flows["shell-ai"] = async ({ page, base }) => {
  await seed(page, "Teacher")
  await page.goto(base + "/teacher", { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Open Clover assistant", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Clover" })
  await dialog.waitFor({ state: "visible", timeout: 3000 })
  await dialog.getByRole("button", { name: /Draft chapter titles/ }).click()
  await dialog.getByText(/Suggested chapters/).waitFor({ timeout: 6000 })
}

// First Tab reaches the skip link; Enter moves focus to <main id="main">.
flows["shell-skip-link"] = async ({ page, base }) => {
  await seed(page, "Admin")
  await page.goto(base + "/admin", { waitUntil: "networkidle" })
  await page.keyboard.press("Tab")
  const cls = await page.evaluate(() => document.activeElement?.className || "")
  expect(String(cls).includes("skip-link"), `first Tab focused "${cls}"`)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  const id = await page.evaluate(() => document.activeElement?.id)
  expect(id === "main", `skip link moved focus to "${id}"`)
}

const base = arg("base", "http://localhost:8443")
const names = String(arg("flows", "")).split(",").filter(Boolean)
const out = path.resolve(String(arg("out", "../shots/flows")))

if (names.length) {
  fs.mkdirSync(out, { recursive: true })
  const exe = path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1140", "chrome-win", "chrome.exe")
  const browser = await chromium.launch({ executablePath: exe })
  let failed = 0
  for (const n of names) {
    const fn = flows[n]
    if (!fn) {
      console.error(`Unknown flow ${n}`)
      failed++
      continue
    }
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on("pageerror", (e) => errors.push(String(e)))
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    try {
      await fn({ page, base, out })
    } catch (e) {
      errors.push(String(e))
    }
    console.log(`${errors.length ? "FAIL" : "ok  "} ${n}`)
    errors.forEach((e) => console.log("   ", e.slice(0, 300)))
    failed += errors.length ? 1 : 0
    await context.close()
  }
  await browser.close()
  process.exit(failed ? 1 : 0)
}
