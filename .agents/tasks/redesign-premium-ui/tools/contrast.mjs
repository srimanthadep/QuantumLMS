// Asserts WCAG AA contrast for the semantic tokens in tokens.css.
// Usage: node contrast.mjs [path/to/tokens.css] [--json]
import fs from "node:fs"
import { fileURLToPath } from "node:url"

const file =
  process.argv[2] && !process.argv[2].startsWith("--")
    ? process.argv[2]
    : fileURLToPath(new URL("../../../../frontend/src/styles/tokens.css", import.meta.url))
const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")

const blocks = {}
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sel = m[1].trim()
  const vars = {}
  for (const d of m[2].matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,8})\s*;/gi)) vars[d[1]] = d[2].toLowerCase()
  blocks[sel] = { ...(blocks[sel] || {}), ...vars }
}

function lum(hex) {
  let h = hex.slice(1)
  if (h.length === 3) h = [...h].map((c) => c + c).join("")
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const accents = ["violet", "blue", "emerald", "amber"]
const results = []
let failed = 0
function check(theme, accent, fg, bg, vars, min) {
  const a = vars[fg]
  const b = vars[bg]
  if (!a || !b) {
    results.push({ theme, accent, fg, bg, ratio: null, min, pass: false, note: "missing" })
    failed++
    return
  }
  const r = ratio(a, b)
  const pass = r >= min
  if (!pass) failed++
  results.push({ theme, accent, fg, bg, fgHex: a, bgHex: b, ratio: Math.round(r * 100) / 100, min, pass })
}

for (const theme of ["light", "dark"]) {
  for (const accent of accents) {
    const vars = {
      ...blocks[":root"],
      ...(theme === "dark" ? blocks[".dark"] : {}),
      ...(accent !== "violet" ? blocks[`[data-accent="${accent}"]`] || {} : {}),
      ...(accent !== "violet" && theme === "dark" ? blocks[`.dark[data-accent="${accent}"]`] || {} : {}),
    }
    const texts = accent === "violet" ? ["foreground", "muted-foreground", "subtle-foreground", "primary-text", "secondary-text", "success", "warning", "danger", "info"] : ["primary-text"]
    for (const fg of texts) for (const bg of ["background", "surface", "surface-2"]) check(theme, accent, fg, bg, vars, 4.5)
    check(theme, accent, "primary-foreground", "primary", vars, 4.5)
    // Buttons keep white text on hover, so the hover fill must pass too.
    check(theme, accent, "primary-foreground", "primary-hover", vars, 4.5)
    check(theme, accent, "ring", "surface", vars, 3)
    if (accent === "violet") check(theme, accent, "border-strong", "surface", vars, 3)
  }
}

if (process.argv.includes("--json")) console.log(JSON.stringify(results, null, 2))
else
  for (const r of results)
    console.log(`${r.pass ? "ok  " : "FAIL"} ${r.theme.padEnd(5)} ${r.accent.padEnd(7)} ${r.fg.padEnd(18)} on ${r.bg.padEnd(10)} ${String(r.ratio).padStart(6)} (min ${r.min})${r.note ? " " + r.note : ""}`)
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
