// One-time: moves the legacy component CSS out of index.css into styles/legacy.css,
// rewriting hard-coded colours to semantic tokens property by property.
import fs from "node:fs"

const wt = "c:/Users/srima/Downloads/QuantumLMS/.worktrees/redesign-premium-ui/frontend/src"
const src = fs.readFileSync(`${wt}/index.css`, "utf8").replace(/\r\n/g, "\n")
const startIdx = src.indexOf("\n* {\n  box-sizing: border-box;\n}")
if (startIdx < 0) throw new Error("legacy start marker not found")
let legacy = src.slice(startIdx + 1)

function cut(block) {
  if (!legacy.includes(block)) throw new Error("block not found:\n" + block.slice(0, 120))
  legacy = legacy.replace(block, "")
}

// Rules now owned by base.css
cut(`* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0;
}
`)
cut(`/* Universal scrollbar styling: hide visible scrollbar tracks while preserving full mouse, trackpad, touch & keyboard scrolling */
html {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

html::-webkit-scrollbar,
body::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

.teacher-portal-shell,
.teacher-portal-shell *,
.no-scrollbar,
.no-scrollbar * {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.teacher-portal-shell::-webkit-scrollbar,
.teacher-portal-shell *::-webkit-scrollbar,
.no-scrollbar::-webkit-scrollbar,
.no-scrollbar *::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}
`)
cut(`body {
  background-color: var(--bg-custom, #f8fafc);
  color: var(--text-primary, #172033);
  font-family: "Sassoon Sans Std", "Sassoon Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.2s ease;
}

#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

button,
input,
optgroup,
select,
textarea {
  font-family: inherit;
  font-feature-settings: inherit;
}

button {
  cursor: pointer;
}
`)

// Property-aware colour rewrite
const BG = {
  "#fff": "var(--surface)",
  "#ffffff": "var(--surface)",
  "#f8fafc": "var(--background)",
  "#fafafa": "var(--surface-2)",
  "#f4f4f5": "var(--surface-2)",
  "#f1f5f9": "var(--surface-2)",
  "#f8f8fc": "var(--surface-2)",
  "#fbfbfe": "var(--surface-2)",
  "#f0f1f4": "var(--surface-2)",
  "#fff1ee": "var(--primary-soft)",
  "#f4f3ff": "var(--primary-soft)",
  "#ede9fe": "var(--primary-soft)",
}
const FG = {
  "#172033": "var(--foreground)",
  "#111111": "var(--foreground)",
  "#111": "var(--foreground)",
  "#09090b": "var(--foreground)",
  "#18181b": "var(--foreground)",
  "#64748b": "var(--muted-foreground)",
  "#71717a": "var(--muted-foreground)",
  "#52525b": "var(--muted-foreground)",
  "#a1a1aa": "var(--subtle-foreground)",
}
const BORDER = {
  "#e2e8f0": "var(--border)",
  "#e4e4e7": "var(--border)",
  "#f1f5f9": "var(--border)",
  "#f4f4f5": "var(--border)",
  "#cbd5e1": "var(--border-strong)",
  "#d4d4d8": "var(--border-strong)",
}
const ANY = {
  "#f0442e": "var(--primary)",
  "#905feb": "var(--primary)",
  "#7c3aed": "var(--primary)",
  "#635bff": "var(--primary)",
  "#d73823": "var(--primary-hover)",
  "#ff5a24": "var(--primary-hover)",
  "#c8102e": "var(--primary-hover)",
  "#6d28d9": "var(--primary-hover)",
  "#7038c3": "var(--primary-hover)",
}
const rgbaToMix = (r, g, b, a, token) => `color-mix(in srgb, var(${token}) ${Math.round(parseFloat(a) * 100)}%, transparent)`

let changes = 0
function mapValue(prop, value) {
  let v = value
  const p = prop.toLowerCase()
  const table = p.startsWith("background") ? BG : p === "color" || p === "fill" || p === "stroke" ? FG : p.startsWith("border") || p.startsWith("outline") ? BORDER : null
  v = v.replace(/#[0-9a-fA-F]{3,8}\b/g, (hex) => {
    const k = hex.toLowerCase()
    if (ANY[k]) return changes++, ANY[k]
    if (table && table[k]) return changes++, table[k]
    // fills inside gradients / box-shadows using surfaces
    if (p.startsWith("background") && FG[k] === undefined && BG[k]) return changes++, BG[k]
    return hex
  })
  v = v.replace(/rgba\(\s*240\s*,\s*68\s*,\s*46\s*,\s*([\d.]+)\s*\)/g, (_, a) => (changes++, rgbaToMix(240, 68, 46, a, "--primary")))
  v = v.replace(/rgba\(\s*152\s*,\s*96\s*,\s*233\s*,\s*([\d.]+)\s*\)/g, (_, a) => (changes++, rgbaToMix(152, 96, 233, a, "--primary")))
  v = v.replace(/var\(--muted\)/g, () => (changes++, "var(--muted-foreground)"))
  return v
}
legacy = legacy.replace(/(^|[{;\s])([a-z-]+)(\s*:\s*)([^;{}]+)(;)/gm, (m, pre, prop, sep, value, end) => {
  if (prop.startsWith("--")) return m
  return pre + prop + sep + mapValue(prop, value) + end
})
legacy = legacy.replace(/font-family:\s*"Sassoon[^;]+;/gi, () => (changes++, "font-family: var(--font-sans);"))

const header = `/* ==========================================================================
   Legacy component CSS moved out of index.css in Phase 1.
   Hard-coded colours were rewritten to semantic tokens. Portal phases delete
   rules here as their pages move to Tailwind + shared components.
   ========================================================================== */

/* Aliases for legacy variable names still referenced by this file and TSX. */
:root {
  --bg-custom: var(--background);
  --bg-grid-line: transparent;
  --text-primary: var(--foreground);
  --text-secondary: var(--muted-foreground);
  --header-text-color: var(--foreground);
  --header-subtitle-color: var(--muted-foreground);
  --purple: var(--primary);
  --purple-dark: var(--primary-hover);
  --purple-deep: var(--primary-hover);
  --lavender: var(--primary-soft);
  --lavender-bg: var(--primary-soft);
  --lime: var(--success);
  --lime-soft: var(--success-soft);
  --pink-soft: var(--danger-soft);
  --yellow-soft: var(--warning-soft);
  --gray-soft: var(--surface-2);
  --ink: var(--foreground);
  --white: var(--surface);
  --noorly-primary-purple: var(--primary);
  --noorly-purple-hover: var(--primary-hover);
  --noorly-tertiary-lavender: var(--primary-soft);
  --noorly-neutral-ink: var(--foreground);
  --noorly-card-bg: var(--surface);
  --noorly-card-border: var(--border);
  --noorly-radius-card: var(--radius-lg);
  --noorly-radius-pill: 999px;
  --noorly-shadow-soft: var(--shadow-sm);
  --noorly-shadow-hover: var(--shadow-md);
  --app-card-gap: 14px;
  --app-card-gap-metrics: 14px;
  --app-card-margin-bottom: 14px;
}

`
fs.mkdirSync(`${wt}/styles`, { recursive: true })
fs.writeFileSync(`${wt}/styles/legacy.css`, header + legacy.replace(/^\n+/, ""))
console.log(`legacy.css written; ${changes} colour/font rewrites; ${legacy.split("\n").length} lines`)
