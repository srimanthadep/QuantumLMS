// Second pass over styles/legacy.css: text colours (color: only) that the first pass missed.
import fs from "node:fs"
const file = "c:/Users/srima/Downloads/QuantumLMS/.worktrees/redesign-premium-ui/frontend/src/styles/legacy.css"
const raw = fs.readFileSync(file, "utf8")
const FG = ["#000", "#000000", "#0f172a", "#18122c", "#1e293b", "#111827", "#26174a", "#43247c"]
const MUTED = ["#3f3f46", "#334155", "#475569", "#55525f", "#666373", "#717579", "#726f81", "#7a748e", "#6b7280"]
const SUBTLE = ["#9491a1"]
let n = 0
const out = raw.replace(/(^|[;{\s])color(\s*:\s*)(#[0-9a-f]{3,6})(\s*(?:!important)?\s*;)/gim, (m, pre, sep, hex, end) => {
  const k = hex.toLowerCase()
  const token = FG.includes(k) ? "var(--foreground)" : MUTED.includes(k) ? "var(--muted-foreground)" : SUBTLE.includes(k) ? "var(--subtle-foreground)" : null
  if (!token) return m
  n++
  return `${pre}color${sep}${token}${end}`
})
fs.writeFileSync(file, out)
console.log(`${n} text colours rewritten`)
