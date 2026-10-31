// Verifies that every portal renders in the configured web font (Google Sans) and that Inter is gone.
// Usage: node check-font.mjs --base http://localhost:8443
import { chromium } from "playwright-core"
import path from "node:path"
import { demoUsers } from "./routes.mjs"

const argv = process.argv
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`)
  return i === -1 ? d : argv[i + 1]
}
const base = arg("base", "http://localhost:8443")
const FAMILY = "Google Sans"

const pages = [
  { path: "/auth", role: null },
  { path: "/student", role: "Student" },
  { path: "/teacher", role: "Teacher" },
  { path: "/teacher/live-class/studio/ls-1", role: "Teacher" },
  { path: "/evaluator/dashboard", role: "Evaluator" },
  { path: "/support", role: "Support" },
  { path: "/admin", role: "Admin" },
  { path: "/super-admin", role: "Super Admin" },
]

const exe = path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1140", "chrome-win", "chrome.exe")
const browser = await chromium.launch({ executablePath: exe })
let failed = 0

for (const p of pages) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const user = p.role ? demoUsers[p.role] : null
  await context.addInitScript((user) => {
    if (sessionStorage.getItem("__seeded")) return
    sessionStorage.setItem("__seeded", "1")
    localStorage.setItem("app_theme_mode", "dark")
    localStorage.setItem("quantum_auth_session", user ? "true" : "false")
    if (user) {
      localStorage.setItem("quantum_user_role", user.role)
      localStorage.setItem("quantum_current_user", JSON.stringify(user))
    }
  }, user)
  const page = await context.newPage()
  const fontFiles = []
  page.on("response", (r) => {
    const u = r.url()
    if (/\.(woff2?|ttf|otf)(\?|$)/.test(u) || u.includes("fonts.gstatic.com")) fontFiles.push({ url: u, status: r.status() })
  })
  await page.goto(base + p.path, { waitUntil: "networkidle", timeout: 30000 })
  // Some legacy dashboards have no visible h1, so wait for the main content area instead.
  await page.locator("#main, main, #root > *").first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(500)
  const info = await page.evaluate(async (family) => {
    await document.fonts.ready
    const sample = "Quantum School of AI 0123456789"
    const ctx = document.createElement("canvas").getContext("2d")
    const width = (font) => {
      ctx.font = font
      return ctx.measureText(sample).width
    }
    const faces = [...document.fonts].filter((f) => f.family.replace(/["']/g, "") === family)
    const pick = (sel) => {
      const el = document.querySelector(sel)
      return el ? getComputedStyle(el).fontFamily : null
    }
    // Tabular figures: "1111" and "8888" are the same width only when tnum works.
    const span = document.createElement("span")
    span.style.cssText = `font-family:"${family}";font-size:20px;font-variant-numeric:tabular-nums;position:absolute;visibility:hidden`
    document.body.appendChild(span)
    span.textContent = "1111"
    const ones = span.getBoundingClientRect().width
    span.textContent = "8888"
    const eights = span.getBoundingClientRect().width
    span.remove()
    return {
      body: pick("body"),
      h1: pick("h1") ?? pick("h2") ?? pick("#main"),
      button: pick("button"),
      input: pick("input") ?? "(no input on page)",
      loadedFaces: faces.filter((f) => f.status === "loaded").length,
      totalFaces: faces.length,
      // Rendering differs from the serif fallback only if the web font is really used.
      rendersWebFont: Math.abs(width(`16px "${family}", serif`) - width("16px serif")) > 1,
      tabular: Math.abs(ones - eights) < 0.5,
    }
  }, FAMILY)
  const inter = fontFiles.filter((f) => /inter/i.test(f.url))
  const gstatic = fontFiles.filter((f) => f.url.includes("fonts.gstatic.com"))
  const okFamily = [info.body, info.h1, info.button].every((f) => f && f.startsWith(`"${FAMILY}"`))
  const ok = okFamily && info.loadedFaces > 0 && info.rendersWebFont && inter.length === 0 && gstatic.every((f) => f.status === 200)
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "FAIL"} ${p.path}`)
  console.log(`     h1: ${info.h1}`)
  console.log(`     faces loaded ${info.loadedFaces}/${info.totalFaces}, renders web font: ${info.rendersWebFont}, tabular figures: ${info.tabular}`)
  console.log(`     font files: ${gstatic.length} from fonts.gstatic.com (${[...new Set(gstatic.map((f) => f.status))].join(",") || "none"}), Inter files: ${inter.length}`)
  await context.close()
}
await browser.close()
console.log(`${pages.length - failed}/${pages.length} pages use ${FAMILY}`)
process.exit(failed ? 1 : 0)
