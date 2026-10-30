// Minimal Markdown structure lint: balanced code fences, consistent table
// column counts, balanced inline backticks, and in-page anchors that resolve.
import fs from "node:fs"

const file = process.argv[2]
const text = fs.readFileSync(file, "utf8")
const lines = text.split(/\r?\n/)
const FENCE = "`".repeat(3)
let problems = 0
let inFence = false
let fences = 0
let prevCols = -1

lines.forEach((line, i) => {
  if (line.trimStart().startsWith(FENCE)) {
    fences++
    inFence = !inFence
    prevCols = -1
    return
  }
  if (inFence) return
  const s = line.trim()
  if (s.startsWith("|") && s.endsWith("|")) {
    // Ignore pipes inside inline code when counting columns.
    const cols = s.replace(/`[^`]*`/g, "x").split("|").length
    if (prevCols !== -1 && cols !== prevCols) {
      console.log(`table column mismatch at line ${i + 1}: ${cols} vs ${prevCols}`)
      problems++
    }
    prevCols = cols
  } else {
    prevCols = -1
  }
  const ticks = (line.match(/`/g) || []).length
  if (ticks % 2) {
    console.log(`odd number of backticks at line ${i + 1}`)
    problems++
  }
})

const slug = (h) => h.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-")
const headings = lines.filter((l) => /^#{1,6} /.test(l)).map((l) => slug(l.replace(/^#+ /, "")))
for (const m of text.matchAll(/\]\(#([\w-]+)\)/g)) {
  if (!headings.includes(m[1])) {
    console.log(`broken anchor #${m[1]}`)
    problems++
  }
}

console.log(`${lines.length} lines, ${fences} fences (balanced: ${fences % 2 === 0}), ${headings.length} headings, ${problems} problems`)
process.exit(problems || fences % 2 ? 1 : 0)
