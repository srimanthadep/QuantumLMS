// Verifies frontend/design.md against the code: every CSS variable it names
// exists, colour/accent table values match tokens.css, type and radius
// utilities exist, and motion token values match src/lib/motion.ts.
import fs from "node:fs"
import { fileURLToPath } from "node:url"

// Checks this repo's frontend folder; pass another frontend folder as the first argument to check it instead.
const fe = process.argv[2] ?? fileURLToPath(new URL("../../../../frontend", import.meta.url))
const doc = fs.readFileSync(`${fe}/design.md`, "utf8")
const tokens = fs.readFileSync(`${fe}/src/styles/tokens.css`, "utf8")
const indexCss = fs.readFileSync(`${fe}/src/index.css`, "utf8")
const legacyCss = fs.readFileSync(`${fe}/src/styles/legacy.css`, "utf8")
const motion = fs.readFileSync(`${fe}/src/lib/motion.ts`, "utf8")

let failures = 0
let checks = 0
const ok = (cond, msg) => {
  checks++
  if (!cond) {
    failures++
    console.log(`FAIL ${msg}`)
  }
}

// Parse a CSS block's custom properties.
function block(css, selectorRe) {
  const m = css.match(selectorRe)
  if (!m) return {}
  const start = m.index + m[0].length
  let depth = 1
  let i = start
  while (depth && i < css.length) {
    if (css[i] === "{") depth++
    else if (css[i] === "}") depth--
    i++
  }
  const body = css.slice(start, i - 1)
  const out = {}
  for (const d of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].trim().toLowerCase()
  return out
}
const light = block(tokens, /:root\s*\{/)
const dark = block(tokens, /\n\.dark\s*\{/)
const accent = (name, isDark) => block(tokens, new RegExp(`\\n${isDark ? "\\.dark" : ""}\\[data-accent="${name}"\\]\\s*\\{`))

// 1. Every --variable named in the doc is defined somewhere.
const defined = new Set([...tokens.matchAll(/(--[\w-]+)\s*:/g), ...indexCss.matchAll(/(--[\w-]+)\s*:/g), ...legacyCss.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
const named = new Set([...doc.matchAll(/`(--[\w-]+?)(\*|…)?`/g)].filter((m) => !m[2]).map((m) => m[1]))
for (const n of [...doc.matchAll(/\(`(--[\w-]+)`/g)].map((m) => m[1])) named.add(n)
for (const v of named) ok(defined.has(v), `variable ${v} named in design.md is not defined`)
ok(/--noorly-[\w-]+\s*:/.test(legacyCss), "legacy --noorly-* aliases missing")

// 2. Colour table: token exists in both themes and hex values match.
const hex = (s) => (s.match(/#[0-9a-f]{3,8}/i) || [""])[0].toLowerCase()
const colourSection = doc.split("## Colour tokens")[1].split("### Accents")[0]
for (const row of colourSection.split("\n").filter((l) => l.startsWith("| `"))) {
  const cells = row.split("|").slice(1, -1).map((c) => c.trim())
  // "(+`-soft`)" suffixes are checked separately below.
  const names = [...cells[0].matchAll(/`([\w-]+)`/g)].map((m) => m[1]).filter((n) => !n.startsWith("-"))
  const lightVals = cells[1].split(" / ")
  const darkVals = cells[2].split(" / ")
  names.forEach((name, i) => {
    ok(`--${name}` in light, `--${name} missing on :root`)
    ok(`--${name}` in dark, `--${name} missing on .dark`)
    const lv = hex(lightVals[i] ?? "")
    const dv = hex(darkVals[i] ?? "")
    if (lv) ok(light[`--${name}`] === lv, `light --${name}: doc ${lv}, tokens ${light[`--${name}`]}`)
    if (dv) ok(dark[`--${name}`] === dv, `dark --${name}: doc ${dv}, tokens ${dark[`--${name}`]}`)
  })
}
// "(+-soft)" rows imply a -soft token.
for (const m of colourSection.matchAll(/`([\w-]+)` \(\+`-soft`\)/g)) {
  ok(`--${m[1]}-soft` in light && `--${m[1]}-soft` in dark, `--${m[1]}-soft missing`)
}

// 3. Accent table.
const accentSection = doc.split("### Accents")[1].split("### Contrast")[0]
for (const row of accentSection.split("\n").filter((l) => l.startsWith("| `"))) {
  const cells = row.split("|").slice(1, -1).map((c) => c.trim())
  const id = cells[0].match(/`(\w+)`/)[1]
  const [solid, lt, dt] = cells.slice(1, 4).map(hex)
  if (id === "violet") {
    ok(light["--primary"] === solid && dark["--primary"] === solid, `violet solid ${solid}`)
    ok(light["--primary-text"] === lt, `violet light text ${lt}`)
    ok(dark["--primary-text"] === dt, `violet dark text ${dt}`)
  } else {
    const a = accent(id, false)
    const ad = accent(id, true)
    ok(a["--primary"] === solid, `${id} solid: doc ${solid}, tokens ${a["--primary"]}`)
    ok(a["--primary-text"] === lt, `${id} light text: doc ${lt}, tokens ${a["--primary-text"]}`)
    ok(ad["--primary-text"] === dt, `${id} dark text: doc ${dt}, tokens ${ad["--primary-text"]}`)
  }
}

// 4. Type scale utilities and values.
for (const m of doc.matchAll(/\| `text-([\w-]+)` \| (\d+) \/ (\d+)/g)) {
  const [, name, size, lh] = m
  ok(new RegExp(`--text-${name}:\\s*${size}px`).test(indexCss), `--text-${name} size ${size}px`)
  ok(new RegExp(`--text-${name}--line-height:\\s*${lh}px`).test(indexCss), `--text-${name} line-height ${lh}px`)
}

// 5. Radii.
for (const m of doc.matchAll(/\| `rounded-(\w+)` \| (\d+) px/g)) {
  ok(light[`--radius-${m[1]}`] === `${m[2]}px`, `--radius-${m[1]}: doc ${m[2]}px, tokens ${light[`--radius-${m[1]}`]}`)
}
ok(light["--radius-2xl"] === "24px" && light["--radius-3xl"] === "28px", "radius 2xl/3xl 24/28")

// 6. Shell sizes.
for (const [v, px] of [["--shell-sidebar-w", 248], ["--shell-rail-w", 68], ["--shell-topbar-h", 56]]) {
  ok(light[v] === `${px}px`, `${v} = ${px}px`)
}

// 7. Motion tokens.
ok(/fast:\s*0\.15/.test(motion) && /base:\s*0\.22/.test(motion) && /slow:\s*0\.32/.test(motion), "durations 0.15/0.22/0.32")
ok(motion.includes("out: [0.22, 1, 0.36, 1]"), "ease.out")
ok(motion.includes("inOut: [0.65, 0, 0.35, 1]"), "ease.inOut")
ok(/snappy:[^}]*stiffness: 500, damping: 34/.test(motion), "spring.snappy 500/34")
ok(/soft:[^}]*stiffness: 260, damping: 30/.test(motion), "spring.soft 260/30")
ok(/staggerContainer\(stagger = 0\.04, delayChildren = 0\)/.test(motion), "staggerContainer defaults")
ok(/y: 8/.test(motion) && /scale: 0\.96/.test(motion), "fadeUp y 8, scaleIn 0.96")

console.log(`${checks - failures}/${checks} design.md checks passed (${named.size} CSS variables named)`)
process.exit(failures ? 1 : 0)
