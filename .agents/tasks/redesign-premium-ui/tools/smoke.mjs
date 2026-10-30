// Smoke-test harness: loads each route, captures screenshots and console/page errors.
// Usage: node smoke.mjs --base http://localhost:8543 --groups a,b --out <dir>
//        [--viewports desktop,mobile] [--themes dark,light] [--reduced-motion]
//        [--tab-through] [--open-nav] [--back-forward] [--only name1,name2]
import { chromium } from "playwright-core"
import fs from "node:fs"
import path from "node:path"
import { groups as allGroups, demoUsers } from "./routes.mjs"

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return def
  const v = process.argv[i + 1]
  return v && !v.startsWith("--") ? v : true
}

const base = arg("base", "http://localhost:8543")
const groupNames = String(arg("groups", "student")).split(",")
const out = path.resolve(String(arg("out", "../shots/tmp")))
const viewports = String(arg("viewports", "desktop,mobile")).split(",")
const themes = String(arg("themes", "dark,light")).split(",")
const reducedMotion = !!arg("reduced-motion", false)
const tabThrough = !!arg("tab-through", false)
const openNav = !!arg("open-nav", false)
const backForward = !!arg("back-forward", false)
const only = arg("only", null)
const onlySet = only ? new Set(String(only).split(",")) : null
const shots = arg("no-shots", false) ? false : true

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
}

fs.mkdirSync(out, { recursive: true })
// Fail fast when the dev server is down, instead of reporting every page as broken.
try {
  const res = await fetch(base + "/auth", { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
} catch (e) {
  console.error(`dev server not reachable at ${base}: ${e.message}`)
  process.exit(2)
}
const exe = path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1140", "chrome-win", "chrome.exe")
const browser = await chromium.launch({
  executablePath: exe,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
})

const report = []
let errorCount = 0

for (const g of groupNames) {
  const routes = allGroups[g]
  if (!routes) {
    console.error(`Unknown group ${g}`)
    continue
  }
  for (const route of routes) {
    if (onlySet && !onlySet.has(route.name)) continue
    for (const vp of viewports) {
      for (const theme of themes) {
        const context = await browser.newContext({
          viewport: VIEWPORTS[vp],
          deviceScaleFactor: 1,
          reducedMotion: reducedMotion ? "reduce" : "no-preference",
          isMobile: vp === "mobile",
          hasTouch: vp === "mobile",
        })
        const user = route.role ? demoUsers[route.role] : null
        await context.addInitScript(
          ({ user, theme }) => {
            try {
              if (sessionStorage.getItem("__smoke_seeded")) return
              sessionStorage.setItem("__smoke_seeded", "1")
              localStorage.setItem("app_theme_mode", theme)
              if (user) {
                localStorage.setItem("quantum_auth_session", "true")
                localStorage.setItem("quantum_user_role", user.role)
                localStorage.setItem("quantum_current_user", JSON.stringify(user))
              } else {
                localStorage.setItem("quantum_auth_session", "false")
              }
            } catch {}
          },
          { user, theme },
        )
        const page = await context.newPage()
        const errors = []
        page.on("console", (msg) => {
          if (msg.type() === "error") errors.push({ type: "console", text: msg.text() })
        })
        page.on("pageerror", (err) => errors.push({ type: "pageerror", text: String(err?.stack || err) }))
        page.on("requestfailed", (req) => {
          if (req.url().startsWith(base)) errors.push({ type: "requestfailed", text: `${req.url()} ${req.failure()?.errorText}` })
        })
        page.on("response", (res) => {
          if (res.url().startsWith(base) && res.status() >= 400) errors.push({ type: "http", text: `${res.status()} ${res.url()}` })
        })
        const file = `${g}-${route.name}-${vp}-${theme}`
        page.setDefaultTimeout(20000)
        // Hard per-page budget so one stuck page cannot stall the whole run.
        const watchdog = setTimeout(() => {
          errors.push({ type: "timeout", text: "page exceeded 90 s budget" })
          context.close().catch(() => {})
        }, 90000)
        try {
          await page.goto(base + route.path, { waitUntil: "networkidle", timeout: 30000 })
          await page.waitForTimeout(700)
          // Scroll the window and inner scroll containers so whileInView reveals fire before capture.
          // Bounded: content that grows while scrolling (infinite lists, reveals) must not hang the run.
          await page.evaluate(async () => {
            const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
            const deadline = performance.now() + 8000
            const scrollers = [document.scrollingElement, ...[...document.querySelectorAll("*")].filter((el) => {
              const s = getComputedStyle(el)
              return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 20
            })].slice(0, 12)
            for (const el of scrollers) {
              if (!el) continue
              const limit = el.scrollHeight
              let steps = 0
              for (let y = 0; y <= limit && steps < 60 && performance.now() < deadline; y += Math.max(300, el.clientHeight * 0.8), steps++) {
                el.scrollTop = y
                await sleep(60)
              }
              el.scrollTop = 0
            }
          })
          await page.waitForTimeout(900)
          if (shots) await page.screenshot({ path: path.join(out, `${file}.png`), fullPage: true })
          if (openNav && vp === "mobile") {
            const btn = page.locator('[aria-label="Open navigation"]').first()
            if (await btn.count()) {
              await btn.click()
              await page.waitForTimeout(500)
              await page.screenshot({ path: path.join(out, `${file}-nav.png`) })
              await page.keyboard.press("Escape")
            } else {
              errors.push({ type: "check", text: "Open navigation button not found" })
            }
          }
          if (tabThrough) {
            for (let i = 0; i < 15; i++) await page.keyboard.press("Tab")
            await page.waitForTimeout(200)
            await page.screenshot({ path: path.join(out, `${file}-tab.png`) })
          }
          if (backForward) {
            const before = page.url()
            await page.goBack({ waitUntil: "networkidle" }).catch(() => {})
            await page.goForward({ waitUntil: "networkidle" }).catch(() => {})
            await page.waitForTimeout(400)
            if (page.url() !== before) errors.push({ type: "check", text: `back/forward landed on ${page.url()}` })
          }
        } catch (e) {
          errors.push({ type: "navigation", text: String(e) })
        }
        clearTimeout(watchdog)
        // Errors from closing a timed-out page are noise, not page errors.
        const filtered = errors.filter((e) => !/Download the React DevTools/.test(e.text) && !(e.type === "navigation" && errors.some((x) => x.type === "timeout")))
        errorCount += filtered.length
        report.push({ group: g, route: route.name, path: route.path, viewport: vp, theme, errors: filtered })
        console.log(`${filtered.length ? "FAIL" : "ok  "} ${file}${filtered.length ? `  (${filtered.length} errors)` : ""}`)
        for (const e of filtered.slice(0, 3)) console.log(`      ${e.type}: ${e.text.slice(0, 300)}`)
        // Save progress after every page so an interrupted run still leaves a report.
        fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2))
        await context.close().catch(() => {})
      }
    }
  }
}

await browser.close()
fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2))
console.log(`\n${report.length} pages, ${errorCount} errors. Report: ${path.join(out, "report.json")}`)
process.exit(errorCount ? 1 : 0)
