// One-time colour codemod (plan item 5). Rewrites arbitrary hex colour classes
// and bg-white to semantic tokens across frontend/src. Prints per-file counts.
// Usage: node codemod-colors.mjs [--dry]
import fs from "node:fs"
import path from "node:path"

const root = "c:/Users/srima/Downloads/QuantumLMS/.worktrees/redesign-premium-ui/frontend/src"
const dry = process.argv.includes("--dry")

const HEX = {}
const set = (list, token) => list.forEach((h) => (HEX[h.toLowerCase()] = token))
set(["#905FEB", "#7E4BDC", "#7D4BD8", "#5B4FE9", "#4F46E5", "#F0442E"], "primary")
set(["#7042D2", "#5F2BC0"], "primary-hover")
set(["#F0EDFF", "#FAF9FF", "#F0E7FF"], "primary-soft")
set(["#E5DEFF", "#D8C2FF"], "primary-border")
set(["#111111", "#171526"], "foreground")
set(["#514B68"], "muted-foreground")
set(["#AEEB00", "#3B6600", "#385000"], "success")
set(["#E7FF9C", "#EAFCC7"], "success-soft")
set(["#B45309"], "warning")
set(["#FFF3E0"], "warning-soft")
set(["#F3F4F6", "#F1F0F3"], "zinc-100")

const UTIL = "bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|from|via|to|fill|stroke|outline|divide|decoration|shadow"
const hexRe = new RegExp(`(?<![\\w-])((?:[\\w-]+:|\\[[^\\]]+\\]:)*)(${UTIL})-\\[(#[0-9a-fA-F]{3,8})\\](\\/\\d+)?(?![\\w-])`, "g")
const bgWhiteRe = /(?<![\w-])((?:[\w-]+:)*)bg-white(?:\/(\d+))?(?![\w\-[/])/g
const darkNeutralRe = /(?<![\w-])((?:[\w-]+:)*)(bg|from|via|to)-(zinc|slate|gray|neutral|stone)-(800|900|950)(\/\d+)?(?![\w-])/g
const studioZincRe = /(?<![\w-])((?:[\w-]+:)*)([a-z]+(?:-[a-z]+)*)-zinc-(\d{2,3})(?![\w])/g

function mapHex(util, token) {
  if (token === "foreground" && (util === "bg" || util === "from" || util === "via" || util === "to")) return "ink-900"
  if ((token === "primary" || token === "primary-hover") && util === "text") return "primary-text"
  return token
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(p)
  }
  return out
}

let total = 0
const rows = []
for (const file of walk(root)) {
  let src = fs.readFileSync(file, "utf8")
  let n = 0
  const isStudio = file.replace(/\\/g, "/").endsWith("pages/teacher/LiveStudioPage.tsx")
  src = src.replace(hexRe, (m, variants, util, hex, op) => {
    const token = HEX[hex.toLowerCase()]
    if (!token) return m
    n++
    return `${variants}${util}-${mapHex(util, token)}${op || ""}`
  })
  src = src.replace(bgWhiteRe, (m, variants, op) => {
    if (op !== undefined && Number(op) < 50) return m
    n++
    return `${variants}bg-surface${op !== undefined ? "/" + op : ""}`
  })
  if (isStudio) {
    src = src.replace(studioZincRe, (m, variants, util) => {
      n++
      return m.replace("-zinc-", "-ink-")
    })
  } else {
    src = src.replace(darkNeutralRe, (m, variants, util, _scale, shade, op) => {
      n++
      return `${variants}${util}-ink-${shade}${op || ""}`
    })
  }
  if (n) {
    rows.push([n, path.relative(root, file)])
    total += n
    if (!dry) fs.writeFileSync(file, src)
  }
}
rows.sort((a, b) => b[0] - a[0]).forEach(([n, f]) => console.log(String(n).padStart(5), f))
console.log(`\n${total} replacements in ${rows.length} files${dry ? " (dry run)" : ""}`)
