// Phase 1 gate: contrast fixes in styles/legacy.css.
//  1. `color:` declarations that use the solid accent (or its hover) -> --primary-text.
//     The solid accent is a fill colour; as text it fails on dark surfaces (3.4:1).
//  2. .status badge colours -> semantic soft/text token pairs (hard-coded light
//     tints were unreadable in dark mode, and #d97706 on #fef3c7 was 2.86:1 in light).
//  3. .quadrant-velocity-badge -> success tokens.
// Usage: node fix-legacy-contrast.mjs [--write]
import fs from "node:fs"

const file = "c:/Users/srima/Downloads/QuantumLMS/.worktrees/redesign-premium-ui/frontend/src/styles/legacy.css"
let css = fs.readFileSync(file, "utf8")
const write = process.argv.includes("--write")
const counts = {}
const bump = (k, n = 1) => (counts[k] = (counts[k] || 0) + n)

// 1. Accent used as text colour. Only the `color` property (not background-color/border-color).
css = css.replace(/(^|[;{\s])color:(\s*)var\(--(primary|primary-hover|purple|purple-dark|purple-deep|noorly-primary-purple|noorly-purple-hover)\)/gm, (m, pre, sp, v) => {
  bump(`color var(--${v}) -> var(--primary-text)`)
  return `${pre}color:${sp}var(--primary-text)`
})

// 2. Status badges.
const STATUS = [
  [/\.status\.success \{ background: #ccfbf1 !important; color: #0f766e !important; \}/, ".status.success { background: var(--success-soft) !important; color: var(--success) !important; }"],
  [/\.status\.lavender \{ background: var\(--primary-soft\) !important; color: var\(--primary(?:-text)?\) !important; \}/, ".status.lavender { background: var(--primary-soft) !important; color: var(--primary-text) !important; }"],
  [/\.status\.warning \{ background: #fef3c7 !important; color: #d97706 !important; \}/, ".status.warning { background: var(--warning-soft) !important; color: var(--warning) !important; }"],
  [/\.status\.error \{ background: #fee2e2 !important; color: #dc2626 !important; \}/, ".status.error { background: var(--danger-soft) !important; color: var(--danger) !important; }"],
  [/\.status\.info \{ background: #e0f2fe !important; color: #0284c7 !important; \}/, ".status.info { background: var(--info-soft) !important; color: var(--info) !important; }"],
]
for (const [re, rep] of STATUS) {
  if (re.test(css)) {
    css = css.replace(re, rep)
    bump(".status rules rewritten")
  } else bump(".status rules NOT FOUND")
}

// 3. Velocity badge.
const vel = /(\.quadrant-velocity-badge\s*\{[^}]*?)background:\s*rgba\(168,\s*237,\s*0,\s*0\.2\);([^}]*?)color:\s*#557c00;/
if (vel.test(css)) {
  css = css.replace(vel, "$1background: var(--success-soft);$2color: var(--success);")
  bump(".quadrant-velocity-badge rewritten")
} else bump(".quadrant-velocity-badge NOT FOUND")

for (const [k, n] of Object.entries(counts)) console.log(`${String(n).padStart(3)}  ${k}`)
if (write) fs.writeFileSync(file, css)
console.log(write ? "written" : "dry run")
