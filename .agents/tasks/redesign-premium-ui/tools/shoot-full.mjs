// Full-length screenshots of routed pages. The app scrolls inside <main>, so this unclips it first.
// Usage: node shoot-full.mjs --base http://localhost:8443 --group teacher --only a,b --viewport desktop --theme dark --out <dir>
import { chromium } from "playwright-core"
import fs from "node:fs"
import path from "node:path"
import { groups, demoUsers } from "./routes.mjs"

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return def
  const v = process.argv[i + 1]
  return v && !v.startsWith("--") ? v : true
}

const base = arg("base", "http://localhost:8443")
const group = String(arg("group", "teacher"))
const only = arg("only", null)
const onlySet = only ? new Set(String(only).split(",")) : null
const vp = String(arg("viewport", "desktop"))
const theme = String(arg("theme", "dark"))
const out = path.resolve(String(arg("out", "../shots/full")))
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } }

fs.mkdirSync(out, { recursive: true })
const exe = path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1140", "chrome-win", "chrome.exe")
const browser = await chromium.launch({ executablePath: exe })

for (const route of groups[group]) {
  if (onlySet && !onlySet.has(route.name)) continue
  const context = await browser.newContext({ viewport: VIEWPORTS[vp], deviceScaleFactor: 1, isMobile: vp === "mobile", hasTouch: vp === "mobile" })
  const user = demoUsers[route.role]
  await context.addInitScript(
    ({ user, theme }) => {
      if (sessionStorage.getItem("__seeded")) return
      sessionStorage.setItem("__seeded", "1")
      localStorage.setItem("app_theme_mode", theme)
      localStorage.setItem("quantum_auth_session", "true")
      localStorage.setItem("quantum_user_role", user.role)
      localStorage.setItem("quantum_current_user", JSON.stringify(user))
    },
    { user, theme },
  )
  const page = await context.newPage()
  await page.goto(base + route.path, { waitUntil: "networkidle", timeout: 30000 })
  await page.waitForTimeout(600)
  await page.evaluate(async () => {
    const main = document.getElementById("main")
    if (!main) return
    for (let y = 0; y <= main.scrollHeight; y += 400) {
      main.scrollTop = y
      await new Promise((r) => setTimeout(r, 50))
    }
    main.scrollTop = 0
  })
  await page.addStyleTag({ content: ".h-dvh{height:auto!important;overflow:visible!important}#main{overflow:visible!important}" })
  await page.waitForTimeout(900)
  const file = path.join(out, `full-${route.name}-${vp}-${theme}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log("saved", path.basename(file))
  await context.close()
}
await browser.close()
