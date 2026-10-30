// Removes `dark:` palette overrides from legacy pages. The palette bridge already
// inverts zinc/purple/hue utilities in dark mode, so these overrides inverted them a
// second time (e.g. text-zinc-900 dark:text-zinc-100 rendered dark grey on dark).
// Usage: node strip-dark-overrides.mjs [--write]
import fs from "node:fs"

const src = "c:/Users/srima/Downloads/QuantumLMS/.worktrees/redesign-premium-ui/frontend/src/pages/student"
const files = ["AssignmentsPage.tsx", "CommunityPage.tsx", "GradesPage.tsx", "TimetablePage.tsx"]
const PAL = "zinc|slate|gray|neutral|stone|purple|violet|indigo|blue|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|red|rose|pink|fuchsia|ink"
const TOKEN = new RegExp(`(\\s*)(?<![\\w-])dark:((?:hover:|group-hover:|focus:)?)(bg|text|border|ring|divide|from|via|to|fill|stroke|outline|placeholder)-(${PAL})-(\\d{2,3})(\\/\\d+)?(?![\\w/-])`, "g")
const write = process.argv.includes("--write")

let total = 0
for (const f of files) {
  const p = `${src}/${f}`
  const text = fs.readFileSync(p, "utf8")
  const orphans = []
  // Check every class string for a dark: token without a base token of the same utility and state.
  for (const m of text.matchAll(/"[^"\n]*"|`[^`]*`/g)) {
    const s = m[0]
    for (const t of s.matchAll(new RegExp(TOKEN.source, "g"))) {
      const state = t[2]
      const util = t[3]
      const base = new RegExp(`(?<![\\w:-])${state.replace(/:/g, "\\:")}${util}-(?:${PAL}|surface|background|foreground|primary|success|warning|danger|info|border|muted|subtle|white|black|transparent)`)
      if (!base.test(s.replace(new RegExp(TOKEN.source, "g"), ""))) orphans.push(`dark:${state}${util}-${t[4]}-${t[5]}${t[6] || ""}`)
    }
  }
  const count = (text.match(TOKEN) || []).length
  total += count
  console.log(`${f.padEnd(22)} dark: overrides ${String(count).padStart(3)}   without a base class: ${orphans.length ? orphans.join(", ") : "none"}`)
  if (write) fs.writeFileSync(p, text.replace(TOKEN, ""))
}
console.log(`${write ? "removed" : "would remove"} ${total} tokens`)
