// Finds elements by visible text on a route and prints their classes,
// computed colour, inline style and the matching CSS rules for `color`.
// Usage: node probe.mjs --role Teacher --path /teacher/live-class --theme dark --text "Welcome to the live,Notice:"
import { chromium } from "playwright-core"
import path from "node:path"
import { demoUsers } from "./routes.mjs"

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return def
  const v = process.argv[i + 1]
  return v && !v.startsWith("--") ? v : true
}
const role = arg("role", "Student")
const route = arg("path", "/student")
const theme = arg("theme", "dark")
const texts = String(arg("text", "")).split(",").filter(Boolean)

const exe = path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1140", "chrome-win", "chrome.exe")
const browser = await chromium.launch({ executablePath: exe })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await context.addInitScript(
  ({ user, theme }) => {
    localStorage.setItem("app_theme_mode", theme)
    localStorage.setItem("quantum_auth_session", "true")
    localStorage.setItem("quantum_user_role", user.role)
    localStorage.setItem("quantum_current_user", JSON.stringify(user))
  },
  { user: demoUsers[role], theme },
)
const page = await context.newPage()
await page.goto("http://localhost:8543" + route, { waitUntil: "networkidle" })
await page.waitForTimeout(600)
const res = await page.evaluate((texts) => {
  const out = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const s = t.textContent.trim()
    const hit = texts.find((x) => s.startsWith(x))
    if (!hit) continue
    const chain = []
    for (let n = t.parentElement; n && chain.length < 4; n = n.parentElement) {
      const cs = getComputedStyle(n)
      chain.push({ tag: n.tagName.toLowerCase(), cls: n.className && n.className.baseVal === undefined ? n.className : "", color: cs.color, bg: cs.backgroundColor, style: n.getAttribute("style") || "" })
    }
    // CSS rules that set color on the text's own element.
    const el = t.parentElement
    const rules = []
    for (const sheet of document.styleSheets) {
      let list
      try {
        list = sheet.cssRules
      } catch {
        continue
      }
      const visit = (rs, media) => {
        for (const r of rs) {
          if (r.cssRules && !r.selectorText) visit(r.cssRules, r.conditionText || media)
          else if (r.selectorText && r.style && r.style.color) {
            try {
              if (el.matches(r.selectorText)) rules.push(`${media ? "@" + media + " " : ""}${r.selectorText} { color: ${r.style.color}${r.style.getPropertyPriority("color") ? " !important" : ""} }`)
            } catch {}
          }
        }
      }
      visit(list, "")
    }
    out.push({ text: s.slice(0, 50), chain, rules: rules.slice(-6) })
    if (out.length > 6) break
  }
  return out
}, texts)
console.log(JSON.stringify(res, null, 2))
await browser.close()
