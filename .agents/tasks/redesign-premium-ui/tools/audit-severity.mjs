// Severity split of audit contrast findings, plus distinct near-invisible elements.
import fs from "node:fs"
const files = process.argv.slice(2)
const rows = files.flatMap((f) => JSON.parse(fs.readFileSync(f, "utf8")))
const all = rows.flatMap((p) => (p.contrast || []).map((c) => ({ ...c, page: p.name.replace(/-(desktop|mobile)-(dark|light)$/, ""), theme: p.theme, vp: p.viewport })))
const bucket = (r) => (r < 2 ? "<2 (near-invisible)" : r < 3 ? "2-3 (hard to read)" : "3-4.5 (below AA)")
const table = {}
for (const c of all) {
  const k = `${c.theme} ${bucket(c.ratio)}`
  table[k] = (table[k] || 0) + 1
}
console.log("Findings by theme and severity:")
for (const k of Object.keys(table).sort()) console.log(`  ${k.padEnd(28)} ${table[k]}`)

const LIMIT = Number(process.env.LIMIT || 3)
console.log(`\nDistinct elements below ${LIMIT}:1 (deduplicated across viewports):`)
const seen = new Map()
for (const c of all.filter((c) => c.ratio < LIMIT)) {
  const k = `${c.theme}|${c.page}|${c.el}|${c.fg}|${c.bg}`
  const e = seen.get(k) || { ...c, n: 0, texts: new Set() }
  e.n++
  e.texts.add(c.text.slice(0, 28))
  seen.set(k, e)
}
const list = [...seen.values()].sort((a, b) => a.ratio - b.ratio)
for (const e of list.slice(0, Number(process.env.TOP || 60))) {
  console.log(`${String(e.ratio).padEnd(5)} ${e.theme.padEnd(5)} ${e.page.padEnd(26)} x${String(e.n).padEnd(3)} ${e.fg} on ${e.bg}  "${[...e.texts].slice(0, 2).join('", "')}"\n      ${e.el}`)
}
console.log(`\n${list.length} distinct element groups below ${LIMIT}:1`)
