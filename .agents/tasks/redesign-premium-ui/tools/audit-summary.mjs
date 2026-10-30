// Groups audit.json contrast findings by likely root cause.
import fs from "node:fs"
const files = process.argv.slice(2)
const rows = files.flatMap((f) => JSON.parse(fs.readFileSync(f, "utf8")))

const findings = rows.flatMap((p) => (p.contrast || []).map((c) => ({ ...c, page: p.name, theme: p.theme, group: p.group })))
console.log(`pages ${rows.length}, findings ${findings.length}`)

// Source class: Tailwind palette text utility on the element, else legacy class name.
const PALETTE = /\btext-(zinc|slate|gray|neutral|stone|purple|violet|indigo|blue|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|red|rose|pink|fuchsia)-(\d{2,3})\b/
function source(c) {
  const last = c.el.split(" > ").pop()
  const m = last.match(PALETTE)
  if (m) return `tw text-${m[1]}-${m[2]}`
  const cls = last.split(".").slice(1)
  const legacy = cls.find((x) => !/^(text|bg|font|px|py|p|m|mx|my|flex|items|gap|rounded|border|w|h|min|max|leading|tracking|uppercase|truncate|shrink|relative|absolute|inline|block|grid|cursor|transition|hover|shadow|justify|self|overflow|whitespace|line|order|z|top|left|right|bottom|opacity|select|pointer|sr|not|group|peer|space|col|row|aspect|object|origin|scale|translate|rotate|underline|italic|tabular|antialiased|ring|outline|fill|stroke|decoration|break|align)(-|$)/.test(x))
  return legacy ? `css .${legacy}` : `other <${last.split(".")[0]}>`
}

const bySource = new Map()
for (const c of findings) {
  const k = `${c.theme.padEnd(5)} ${source(c)}`
  const e = bySource.get(k) || { n: 0, pages: new Set(), worst: 99, sample: "" }
  e.n++
  e.pages.add(c.page.replace(/-(desktop|mobile)-(dark|light)$/, ""))
  if (c.ratio < e.worst) {
    e.worst = c.ratio
    e.sample = `${c.fg} on ${c.bg} '${c.text}'`
  }
  bySource.set(k, e)
}
const sorted = [...bySource.entries()].sort((a, b) => b[1].n - a[1].n)
let tw = 0
let css = 0
let other = 0
for (const [k, e] of sorted) {
  if (k.includes(" tw ")) tw += e.n
  else if (k.includes(" css ")) css += e.n
  else other += e.n
}
console.log(`by source: tailwind palette utilities ${tw}, legacy CSS classes ${css}, other ${other}\n`)
for (const [k, e] of sorted.slice(0, Number(process.env.TOP || 45))) {
  console.log(`${String(e.n).padStart(4)}  ${k.padEnd(40)} worst ${String(e.worst).padEnd(5)} pages ${String(e.pages.size).padStart(2)}  ${e.sample.slice(0, 80)}`)
}

// Colour pairs (fg on bg) independent of source.
const byPair = new Map()
for (const c of findings) {
  const k = `${c.theme.padEnd(5)} ${c.fg} on ${c.bg}`
  byPair.set(k, (byPair.get(k) || 0) + 1)
}
console.log("\nTop colour pairs:")
for (const [k, n] of [...byPair.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`${String(n).padStart(4)}  ${k}`)
