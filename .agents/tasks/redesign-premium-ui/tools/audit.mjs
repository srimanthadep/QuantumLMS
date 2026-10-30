// Visual audit: text contrast (WCAG AA), horizontal overflow on phones, and
// light panels left inside dark mode. Complements smoke.mjs screenshots.
// Usage: node audit.mjs --base http://localhost:8543 --groups a,b [--viewports desktop,mobile]
//        [--themes dark,light] [--only name1,name2] --out <dir>
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
const viewports = String(arg("viewports", "desktop,mobile")).split(",")
const themes = String(arg("themes", "dark,light")).split(",")
const only = arg("only", null)
const onlySet = only ? new Set(String(only).split(",")) : null
const out = path.resolve(String(arg("out", "../shots/audit")))
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } }

fs.mkdirSync(out, { recursive: true })
const exe = path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1140", "chrome-win", "chrome.exe")
const browser = await chromium.launch({ executablePath: exe })

// Runs inside the page.
function auditPage(theme) {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  const cache = new Map()
  // Parse any CSS colour (rgb, oklch, color-mix results...) to sRGB bytes + alpha.
  function rgba(css) {
    if (cache.has(css)) return cache.get(css)
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = "#000"
    ctx.fillStyle = css
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    const v = [d[0], d[1], d[2], d[3] / 255]
    cache.set(css, v)
    return v
  }
  const lum = ([r, g, b]) => {
    const f = (v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
    return (x + 0.05) / (y + 0.05)
  }
  const over = (top, bottom) => {
    const a = top[3]
    return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1)
  }
  const pageBg = rgba(getComputedStyle(document.body).backgroundColor)[3] > 0 ? rgba(getComputedStyle(document.body).backgroundColor) : theme === "dark" ? [9, 9, 11, 1] : [250, 250, 250, 1]

  // Effective background: composite ancestor backgrounds; bail out on images/gradients.
  function background(el) {
    const layers = []
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n)
      if (s.backgroundImage && s.backgroundImage !== "none") return { unknown: true }
      const c = rgba(s.backgroundColor)
      if (c[3] > 0) {
        layers.push(c)
        if (c[3] >= 0.999) break
      }
    }
    let colour = pageBg
    for (let i = layers.length - 1; i >= 0; i--) colour = over(layers[i], colour)
    return { colour }
  }
  function visible(el) {
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) return false
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n)
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) < 0.15) return false
      if (s.clipPath && s.clipPath !== "none") return false
    }
    if (el.closest("[aria-hidden='true'], .sr-only")) return false
    return true
  }
  function describe(el) {
    const parts = []
    for (let n = el; n && n.nodeType === 1 && parts.length < 4; n = n.parentElement) {
      let p = n.tagName.toLowerCase()
      const cls = [...n.classList].filter((c) => !c.includes(":") && !c.includes("[")).slice(0, 2).join(".")
      if (cls) p += "." + cls
      parts.unshift(p)
    }
    return parts.join(" > ")
  }

  const contrast = []
  let checked = 0
  let skipped = 0
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const seen = new Set()
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const text = t.textContent.replace(/\s+/g, " ").trim()
    if (text.length < 2) continue
    // Colour emoji ignore the CSS colour, so text contrast does not apply to them.
    if (/^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u200d|\ufe0f|\s)+$/u.test(text)) continue
    const el = t.parentElement
    if (!el || seen.has(el)) continue
    seen.add(el)
    if (["SCRIPT", "STYLE", "NOSCRIPT", "OPTION"].includes(el.tagName)) continue
    if (!visible(el)) continue
    const s = getComputedStyle(el)
    const fg = rgba(s.color)
    if (fg[3] < 0.05) continue
    const bg = background(el)
    if (bg.unknown) {
      skipped++
      continue
    }
    checked++
    const fgSolid = over(fg, bg.colour)
    const r = ratio(fgSolid, bg.colour)
    const size = parseFloat(s.fontSize)
    const weight = Number(s.fontWeight) || 400
    const large = size >= 24 || (size >= 18.66 && weight >= 700)
    const min = large ? 3 : 4.5
    if (r < min) {
      contrast.push({
        ratio: Math.round(r * 100) / 100,
        min,
        text: text.slice(0, 60),
        el: describe(el),
        fg: `rgb(${fgSolid.slice(0, 3).map(Math.round).join(",")})`,
        bg: `rgb(${bg.colour.slice(0, 3).map(Math.round).join(",")})`,
        size,
      })
    }
  }

  // Horizontal overflow: page-level scroll, or elements running past the viewport.
  const vw = document.documentElement.clientWidth
  const overflow = []
  const pageScrollX = document.documentElement.scrollWidth > vw + 1
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.right <= vw + 2 || r.left >= vw) continue
    // Ignore content inside horizontal scrollers or clipping containers (carousels, tables).
    let clipped = false
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n)
      if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) {
        const pr = n.getBoundingClientRect()
        if (pr.right <= vw + 2) {
          clipped = true
          break
        }
      }
    }
    if (clipped || !visible(el)) continue
    overflow.push({ el: describe(el), right: Math.round(r.right), width: Math.round(r.width) })
  }
  // Keep the outermost offenders only.
  const outer = overflow.filter((o, i) => !overflow.some((p, j) => j < i && o.el.startsWith(p.el)))

  // Light panels inside dark mode.
  const lightPanels = []
  if (theme === "dark") {
    for (const el of document.querySelectorAll("main *")) {
      const r = el.getBoundingClientRect()
      if (r.width * r.height < 30000 || !visible(el)) continue
      const c = rgba(getComputedStyle(el).backgroundColor)
      if (c[3] > 0.9 && lum(c) > 0.6) lightPanels.push({ el: describe(el), size: `${Math.round(r.width)}x${Math.round(r.height)}`, bg: `rgb(${c.slice(0, 3).join(",")})` })
    }
  }
  return { checked, skipped, contrast, pageScrollX, overflow: outer.slice(0, 10), lightPanels: lightPanels.slice(0, 10) }
}

const report = []
for (const g of groupNames) {
  for (const route of allGroups[g] || []) {
    if (onlySet && !onlySet.has(route.name)) continue
    for (const vp of viewports) {
      for (const theme of themes) {
        const context = await browser.newContext({ viewport: VIEWPORTS[vp], isMobile: vp === "mobile", hasTouch: vp === "mobile", reducedMotion: "reduce" })
        const user = route.role ? demoUsers[route.role] : null
        await context.addInitScript(
          ({ user, theme }) => {
            try {
              if (sessionStorage.getItem("__audit_seeded")) return
              sessionStorage.setItem("__audit_seeded", "1")
              localStorage.setItem("app_theme_mode", theme)
              if (user) {
                localStorage.setItem("quantum_auth_session", "true")
                localStorage.setItem("quantum_user_role", user.role)
                localStorage.setItem("quantum_current_user", JSON.stringify(user))
              } else localStorage.setItem("quantum_auth_session", "false")
            } catch {}
          },
          { user, theme },
        )
        const page = await context.newPage()
        let result
        try {
          await page.goto(base + route.path, { waitUntil: "networkidle", timeout: 30000 })
          await page.waitForTimeout(600)
          result = await page.evaluate(auditPage, theme)
        } catch (e) {
          result = { error: String(e) }
        }
        const name = `${g}-${route.name}-${vp}-${theme}`
        report.push({ name, group: g, route: route.name, viewport: vp, theme, ...result })
        const c = result.contrast?.length ?? "?"
        console.log(`${name.padEnd(44)} contrast ${String(c).padStart(3)}  overflow ${result.pageScrollX ? "PAGE " : ""}${result.overflow?.length ?? "?"}  light-panels ${result.lightPanels?.length ?? 0}  (checked ${result.checked ?? 0}, skipped ${result.skipped ?? 0})`)
        await context.close()
      }
    }
  }
}
await browser.close()
fs.writeFileSync(path.join(out, "audit.json"), JSON.stringify(report, null, 2))
const totals = report.reduce((a, r) => ({ contrast: a.contrast + (r.contrast?.length || 0), overflowPages: a.overflowPages + (r.pageScrollX || r.overflow?.length ? 1 : 0), light: a.light + (r.lightPanels?.length || 0) }), { contrast: 0, overflowPages: 0, light: 0 })
// A page that failed to load has no findings, so it must never count as clean.
const failed = report.filter((r) => r.error).length
console.log(`\n${report.length} pages (${failed} failed to load): ${totals.contrast} low-contrast text elements, ${totals.overflowPages} pages with horizontal overflow, ${totals.light} light panels in dark mode`)
process.exit(failed || totals.contrast || totals.overflowPages || totals.light ? 1 : 0)
