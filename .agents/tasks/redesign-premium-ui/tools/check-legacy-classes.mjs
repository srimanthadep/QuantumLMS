// Lists legacy.css class names used in a folder's TSX class strings.
// Usage: node check-legacy-classes.mjs <dir> [<dir> ...]
import fs from "node:fs"
import path from "node:path"

const root = path.resolve("../../../../frontend")
const css = fs.readFileSync(path.join(root, "src/styles/legacy.css"), "utf8")
const legacy = new Set([...css.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)].map((m) => m[1]).filter((c) => !/^\d/.test(c)))

const dirs = process.argv.slice(2).map((d) => path.join(root, d))
const files = []
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(tsx|ts)$/.test(e.name)) files.push(p)
  }
}
dirs.forEach(walk)

let hits = 0
for (const f of files) {
  const src = fs.readFileSync(f, "utf8")
  // className="..." and cn("...", "...") string literals
  const strings = [
    ...[...src.matchAll(/className=\{?["'`]([^"'`]+)["'`]/g)].map((m) => m[1]),
    // only the quoted literals inside cn(...), not the variables used as conditions
    ...[...src.matchAll(/cn\(([^)]*)\)/g)].flatMap((m) => [...m[1].matchAll(/["'`]([^"'`]*)["'`]/g)].map((s) => s[1])),
  ]
  const tokens = new Set(strings.flatMap((s) => s.split(/[\s"'`,]+/)).filter(Boolean))
  const found = [...tokens].filter((t) => legacy.has(t))
  if (found.length) {
    hits += found.length
    console.log(path.relative(root, f), found.join(" "))
  }
}
console.log(`${files.length} files checked, ${legacy.size} legacy classes known, ${hits} uses found`)
