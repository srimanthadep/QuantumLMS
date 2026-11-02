// Generates frontend/src/styles/palette-bridge.css (plan D4).
// Overrides Tailwind colour scales with theme-aware variables so legacy
// zinc/purple/lime/hue utilities stay coherent in dark mode.
//
// Phase 1 gate additions (contrast audit):
//  - light neutral 400/500 darkened to AA text shades
//  - dark hue 500/600 fall back to 400 when 500 fails on surface-2
//  - "dark islands": deliberately dark panels (bg-ink-*, bg-black) keep the
//    light-theme palette in dark mode, which is what their content was designed for
//  - utility-level fixes in @layer utilities: hue text 400-600 in light mode,
//    coloured fills that carry white text, accent (purple) fills and hovers
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { toRgb, contrast } from "./colormath.mjs"

// The frontend folder of this repo (this file is in .agents/tasks/redesign-premium-ui/tools).
const fe = fileURLToPath(new URL("../../../../frontend", import.meta.url))
const theme = fs.readFileSync(path.join(fe, "node_modules/tailwindcss/theme.css"), "utf8")
const outFile = path.join(fe, "src/styles/palette-bridge.css")
const srcDir = path.join(fe, "src")

const shades = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"]
const tw = {}
for (const m of theme.matchAll(/--color-([a-z]+)-(\d+):\s*([^;]+);/g)) {
  ;(tw[m[1]] ||= {})[m[2]] = m[3].trim()
}

const neutrals = ["zinc", "slate", "gray", "neutral", "stone", "mauve", "olive", "mist", "taupe"]
const special = ["purple", "lime"]
const hues = Object.keys(tw).filter((h) => !neutrals.includes(h) && !special.includes(h))

const WHITE = [255, 255, 255]
const LIGHT_BG = [250, 250, 250]
const DARK_SURFACE_2 = [24, 24, 27]

// Light neutral ramp = Tailwind zinc, except 400/500, which legacy pages use for
// secondary text: darkened to the subtle-foreground shade (5.26:1 on white) and a
// 6.3:1 step so they pass AA on white, lavender and surface-2.
const neutralLight = Object.fromEntries(shades.map((s) => [s, tw.zinc[s]]))
neutralLight["400"] = "#6b6b76"
neutralLight["500"] = "#5f5f69"

// One neutral ramp for dark mode: inverted and aligned with the dark surface tokens.
const neutralDark = {
  50: "#18181b",
  100: "#202024",
  200: "#26262b",
  300: "#34343a",
  400: "#8a8a93",
  500: "#a1a1aa",
  600: "#b4b4bc",
  700: "#d4d4d8",
  800: "#e4e4e7",
  900: "#ededef",
  950: "#fafafa",
}

// Hue rule for dark mode. 500-600 map to hue-500 (filled badges keep their tone),
// or to hue-400 when hue-500 is too dark to read on surface-2 (indigo, violet).
function hueDark(h, s) {
  const c = tw[h]
  const mix = (p) => `color-mix(in oklab, ${c["500"]} ${p}%, var(--surface))`
  switch (s) {
    case "50": return mix(10)
    case "100": return mix(16)
    case "200": return mix(26)
    case "300": return mix(40)
    case "400": return c["400"]
    case "500":
    case "600": return contrast(toRgb(c["500"]), DARK_SURFACE_2) >= 4.5 ? c["500"] : c["400"]
    case "700": return c["300"]
    case "800": return c["200"]
    case "900": return c["100"]
    case "950": return c["50"]
  }
}

// Token-driven ramps (follow the accent): purple -> primary, lime -> success.
function tokenRampLight(solid, hover) {
  return {
    50: `color-mix(in oklab, var(${solid}) 6%, white)`,
    100: `color-mix(in oklab, var(${solid}) 12%, white)`,
    200: `color-mix(in oklab, var(${solid}) 22%, white)`,
    300: `color-mix(in oklab, var(${solid}) 40%, white)`,
    400: `color-mix(in oklab, var(${solid}) 70%, white)`,
    500: `var(${solid})`,
    600: `var(${solid})`,
    700: `var(${hover})`,
    800: `color-mix(in oklab, var(${solid}) 72%, black)`,
    900: `color-mix(in oklab, var(${solid}) 56%, black)`,
    950: `color-mix(in oklab, var(${solid}) 40%, black)`,
  }
}
function tokenRampDark(solid, text) {
  return {
    50: `color-mix(in oklab, var(${solid}) 10%, var(--surface))`,
    100: `color-mix(in oklab, var(${solid}) 16%, var(--surface))`,
    200: `color-mix(in oklab, var(${solid}) 26%, var(--surface))`,
    300: `color-mix(in oklab, var(${solid}) 40%, var(--surface))`,
    400: `var(${text})`,
    500: `color-mix(in oklab, var(${solid}) 55%, var(${text}))`,
    600: `color-mix(in oklab, var(${solid}) 55%, var(${text}))`,
    700: `var(${text})`,
    800: `color-mix(in oklab, var(${text}) 70%, white)`,
    900: `color-mix(in oklab, var(${text}) 50%, white)`,
    950: `color-mix(in oklab, var(${text}) 30%, white)`,
  }
}

// --- variable values per theme ---------------------------------------------
const lightVars = []
const darkVars = []
for (const s of shades) lightVars.push([`--p-n-${s}`, neutralLight[s]])
const pl = tokenRampLight("--primary", "--primary-hover")
for (const s of shades) lightVars.push([`--p-purple-${s}`, pl[s]])
const sl = tokenRampLight("--success", "--success")
for (const s of shades) lightVars.push([`--p-lime-${s}`, sl[s]])
for (const h of hues) for (const s of shades) lightVars.push([`--p-${h}-${s}`, tw[h][s]])

for (const s of shades) darkVars.push([`--p-n-${s}`, neutralDark[s]])
const pd = tokenRampDark("--primary", "--primary-text")
for (const s of shades) darkVars.push([`--p-purple-${s}`, pd[s]])
const sd = tokenRampDark("--success", "--success")
for (const s of shades) darkVars.push([`--p-lime-${s}`, sd[s]])
for (const h of hues) for (const s of shades) darkVars.push([`--p-${h}-${s}`, hueDark(h, s)])

// --- dark islands: scan the source for opaque dark panel classes --------------
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : /\.(tsx|ts)$/.test(e.name) ? [p] : []
  })
}
const islandTokens = new Set()
for (const f of walk(srcDir)) {
  const t = fs.readFileSync(f, "utf8")
  for (const m of t.matchAll(/(?<![\w:/-])((?:bg|from)-ink-(?:700|800|900|950)(?:\/\d+)?|bg-black)(?![\w/-])/g)) islandTokens.add(m[1])
}
const islandList = [...islandTokens].sort().map((t) => `[class~="${t}"]`)
const islandSel = islandList.join(", ")
// Light surfaces nested inside an island go back to the page theme's palette.
const surfaceTokens = ["bg-surface", "bg-surface-2", "bg-surface-3", "bg-background", "bg-card", "bg-popover", "bg-white", "bg-zinc-50", "bg-zinc-100", "bg-slate-50", "bg-gray-50"]
const surfaceSel = surfaceTokens.map((t) => `[class~="${t}"]`).join(", ")
// Every colour value is declared once, as a constant: --pl-* (light) on :root and
// --pd-* (dark) on .dark. The active palette --p-* and the island blocks only point at
// those constants with var(). Repeating the raw oklch()/color-mix() values per block
// made the CSS minifier emit legacy-browser fallbacks for each copy (~115 kB).
const constName = (k, which) => k.replace(/^--p-/, `--p${which}-`)
const lightConst = lightVars.map(([k, v]) => [constName(k, "l"), v])
const darkConst = darkVars.map(([k, v]) => [constName(k, "d"), v])
const useLight = lightVars.map(([k]) => [k, `var(${constName(k, "l")})`])
const useDark = darkVars.map(([k]) => [k, `var(${constName(k, "d")})`])
// Islands are dark in both themes: light-theme palette, but with Tailwind's original
// zinc-400/500, which read well on dark (the darkened light shades are for white pages).
// lime-500/600/700 are the success colour itself. Inside islands they point at the
// island's (dark) --success so success text stays bright on dark panels in both
// themes. Plain var() has no colour-mix, so it adds no minifier fallbacks.
const LIME_SOLID = ["--p-lime-500", "--p-lime-600", "--p-lime-700"].map((k) => [k, "var(--success)"])
const islandUse = useLight.map(([k, v]) =>
  k === "--p-n-400" ? [k, tw.zinc["400"]] : k === "--p-n-500" ? [k, tw.zinc["500"]] : LIME_SOLID.some(([l]) => l === k) ? [k, "var(--success)"] : [k, v],
)
// Excludes islands and everything inside them.
const notInIsland = `:not(:where(${islandSel}), :where(${islandSel}) *)`

// Semantic text tokens inside islands use their dark-theme values in both themes
// (text-success, text-primary-text, text-muted-foreground... on a dark panel).
const tokensCss = fs.readFileSync(path.join(fe, "src/styles/tokens.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "")
const block = (sel) => {
  const m = tokensCss.match(new RegExp(`(?:^|\\n)${sel.replace(/[.[\]"=]/g, "\\$&")}\\s*\\{([^}]*)\\}`))
  return Object.fromEntries([...(m ? m[1] : "").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()]))
}
const lightTokens = block(":root")
const darkTokens = block(".dark")
const TEXT_TOKENS = ["--foreground", "--muted-foreground", "--subtle-foreground", "--primary-text", "--secondary-text", "--success", "--warning", "--danger", "--info"]
const islandText = TEXT_TOKENS.map((k) => [k, darkTokens[k]])
const pageLightText = TEXT_TOKENS.map((k) => [k, lightTokens[k]])
// Accent-specific dark primary-text values, so islands follow the chosen accent.
const accentIslandRules = ["blue", "emerald", "amber"].map((a) => {
  const v = block(`.dark[data-accent="${a}"]`)["--primary-text"]
  return `:where([data-accent="${a}"]) :where(${islandSel}) { --primary-text: ${v}; }`
})
for (const [k, v] of [...islandText, ...pageLightText]) if (!v) throw new Error(`token ${k} not found in tokens.css`)

// --- utility-level fixes ------------------------------------------------------
const esc = (cls) => cls.replace(/[:/]/g, (c) => `\\${c}`)
const firstPassing = (h, from, test) => {
  for (const s of shades.slice(shades.indexOf(from))) if (test(toRgb(tw[h][s]))) return s
  return "900"
}
const utilRules = []
// 1. Light mode: hue text 400-600 -> the lightest shade that reads on white, #fafafa and the hue-50 tint.
for (const h of hues) {
  const tint = toRgb(tw[h]["50"])
  const target = firstPassing(h, "600", (c) => contrast(c, WHITE) >= 4.5 && contrast(c, LIGHT_BG) >= 4.5 && contrast(c, tint) >= 4.5)
  const sel = ["400", "500", "600"].filter((s) => Number(s) < Number(target)).map((s) => `.text-${h}-${s}`)
  // Not on islands (dark panels keep their bright text) and not on svg icons.
  if (sel.length) utilRules.push(`  :where(:root:not(.dark)) :is(${sel.join(", ")}):where(${notInIsland}):not(svg) { color: var(--color-${h}-${target}); }`)
}
// 2. Both themes: coloured 500/600 fills that carry white text -> a static shade that keeps white at AA.
//    Hovers on those buttons -> one step darker, also static, so hover feedback survives.
for (const h of hues) {
  const fill = firstPassing(h, "600", (c) => contrast(c, WHITE) >= 4.5)
  const hover = shades[Math.min(shades.indexOf(fill) + 1, shades.length - 1)]
  utilRules.push(`  :is(.bg-${h}-500, .bg-${h}-600):where(.text-white) { background-color: ${tw[h][fill]}; }`)
  utilRules.push(`  :is(.${esc(`hover:bg-${h}-600`)}, .${esc(`hover:bg-${h}-700`)}, .${esc(`hover:bg-${h}-800`)}):where(.text-white):hover { background-color: ${tw[h][hover]}; }`)
}
// 3. Dark mode accent fills: purple-500/600 is the solid accent, 700 its hover, as in light mode.
utilRules.push(`  :where(.dark) :is(.bg-purple-500, .bg-purple-600) { background-color: var(--primary); }`)
utilRules.push(`  :where(.dark) .bg-purple-700 { background-color: var(--primary-hover); }`)
utilRules.push(`  :where(.dark) :is(.${esc("hover:bg-purple-600")}, .${esc("hover:bg-purple-700")}, .${esc("hover:bg-purple-800")}):hover { background-color: var(--primary-hover); }`)

// --- output ---------------------------------------------------------------------
const decl = (vars) => vars.map(([k, v]) => `  ${k}: ${v};`).join("\n")
const lines = []
lines.push("/* GENERATED by .agents/tasks/redesign-premium-ui/tools/gen-palette-bridge.mjs. Do not edit by hand. */")
lines.push("/* Legacy colour bridge (design.md > Legacy bridge). Portal phases replace these utilities with semantic tokens. */")
lines.push("")
lines.push("@theme inline {")
for (const h of [...neutrals, ...special, ...hues]) for (const s of shades) lines.push(`  --color-${h}-${s}: var(--p-${neutrals.includes(h) ? "n" : h}-${s});`)
// ink-*: static, non-inverting zinc ramp for deliberately dark panels (studio, player, hero).
for (const s of shades) lines.push(`  --color-ink-${s}: ${tw.zinc[s]};`)
lines.push("}")
lines.push("")
lines.push("/* Light constants (--pl-*) and the active palette. */")
lines.push(":root {")
lines.push(decl(lightConst))
lines.push(decl(useLight))
lines.push("}")
lines.push("")
lines.push("/* Dark constants (--pd-*) and the active palette. */")
lines.push(".dark {")
lines.push(decl(darkConst))
lines.push(decl(useDark))
lines.push("}")
lines.push("")
lines.push("/* Dark islands: panels that are dark in both themes (studio, code blocks, player,")
lines.push("   inverted buttons) keep the light-theme palette their content was designed against. */")
lines.push(`:where(\n  ${islandList.join(",\n  ")}\n) {`)
lines.push(decl(islandUse))
lines.push(decl(islandText))
lines.push("}")
lines.push(...accentIslandRules)
lines.push("/* Light surfaces nested in an island follow the page theme again. In light mode only")
lines.push("   zinc-400/500 and the text tokens differ from the island values. */")
lines.push(`:where(:root:not(.dark)) :where(${islandSel}) :where(${surfaceSel}) {`)
lines.push(decl([["--p-n-400", "var(--pl-n-400)"], ["--p-n-500", "var(--pl-n-500)"]]))
lines.push(decl(pageLightText))
// Re-resolve against the surface's (light) --success.
lines.push(decl(LIME_SOLID))
lines.push("}")
lines.push(...["blue", "emerald", "amber"].map((a) => `:where(:root:not(.dark)[data-accent="${a}"]) :where(${islandSel}) :where(${surfaceSel}) { --primary-text: ${block(`[data-accent="${a}"]`)["--primary-text"]}; }`))
lines.push(`.dark :where(${islandSel}) :where(${surfaceSel}) {`)
lines.push(decl(useDark))
lines.push("}")
lines.push("")
lines.push("/* Utility-level contrast fixes. Same specificity as Tailwind's utilities and later in")
lines.push("   the utilities layer, so they win over the base utility but not over hover:/state variants. */")
lines.push("@layer utilities {")
lines.push(...utilRules)
lines.push("}")
lines.push("")

fs.writeFileSync(outFile, lines.join("\n"))
console.log(`wrote ${outFile}: ${lines.length} lines`)
console.log(`dark islands (${islandTokens.size}): ${[...islandTokens].sort().join(" ")}`)
console.log(`utility rules: ${utilRules.length}`)
