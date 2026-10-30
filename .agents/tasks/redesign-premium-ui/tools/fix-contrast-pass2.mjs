// Phase 1 gate, second contrast pass (after audit2). Exact replacements with
// expected counts; nothing is written unless every edit matches.
// Usage: node fix-contrast-pass2.mjs [--write]
import fs from "node:fs"

const fe = "c:/Users/srima/Downloads/QuantumLMS/.worktrees/redesign-premium-ui/frontend/src"
const write = process.argv.includes("--write")
const pending = new Map()
let problems = 0
const read = (p) => pending.get(p) ?? fs.readFileSync(p, "utf8")

function edit(file, from, to, expected) {
  const p = `${fe}/${file}`
  const t = read(p)
  const n = typeof from === "string" ? t.split(from).length - 1 : (t.match(from) || []).length
  const ok = n === expected
  if (!ok) problems++
  console.log(`${ok ? "ok  " : "FAIL"} ${file.split("/").pop().padEnd(24)} x${n}/${expected}  ${String(from).slice(0, 70)}`)
  pending.set(p, typeof from === "string" ? t.split(from).join(to) : t.replace(from, to))
}

// 1. Hue text at 80% alpha drops below AA on its tint; use the full shade.
edit("pages/teacher/AnalyticsPage.tsx", /(?<![\w:-])(text-(?:amber|emerald|purple|blue)-700)\/80(?![\w-])/g, "$1", 15)
edit("pages/student/CourseDetailsPage.tsx", /(?<![\w:-])(text-(?:amber|emerald|purple|blue)-700)\/80(?![\w-])/g, "$1", 5)
// 2. Subject delta colour was a hard-coded dark green/red (3.8:1 on dark).
edit("pages/teacher/AnalyticsPage.tsx", 'style={{ color: delta >= 0 ? "#557c00" : "#d9534f" }}', 'style={{ color: delta >= 0 ? "var(--success)" : "var(--danger)" }}', 1)
// 3. Translucent white text on purple bubbles and a dark header.
edit("pages/support/LiveChatPage.tsx", '"text-[11px] text-white/80 mt-2 flex items-center gap-1.5 justify-end font-medium"', '"text-[11px] text-white mt-2 flex items-center gap-1.5 justify-end font-medium"', 1)
edit("pages/support/TicketDetailPage.tsx", '${isAgent ? "text-white/80" : "text-zinc-400"}', '${isAgent ? "text-white" : "text-zinc-400"}', 1)
edit("pages/support/TicketDetailPage.tsx", '"bg-white/20 text-white border border-white/30 text-[8px]', '"bg-black/20 text-white border border-white/30 text-[8px]', 1)
edit("pages/evaluator/EvaluationWorkspace.tsx", '<span className="text-white/40">', '<span className="text-white/60">', 2)
// 4. legacy.css: light-only pill, black border; status badges over images need an opaque base.
edit("styles/legacy.css", "  border: 1px solid #edf0f5;\n  background: #fdfdfd;\n  font-size: 11px;\n  font-weight: 500;\n  color: #555;", "  border: 1px solid var(--border);\n  background: var(--surface);\n  font-size: 11px;\n  font-weight: 500;\n  color: var(--muted-foreground);", 1)
edit("styles/legacy.css", ".analytics-subject-pill:hover {\n  background: #f4f3fa;", ".analytics-subject-pill:hover {\n  background: var(--surface-2);", 1)
edit("styles/legacy.css", ".analytics-subject-pill.active {\n  background: var(--surface);\n  border-color: #000;", ".analytics-subject-pill.active {\n  background: var(--surface);\n  border-color: var(--foreground);", 1)
const opaque = (t) => `linear-gradient(var(--${t}), var(--${t})), var(--surface)`
edit("styles/legacy.css", ".status.success { background: var(--success-soft) !important;", `.status.success { background: ${opaque("success-soft")} !important;`, 1)
edit("styles/legacy.css", ".status.lavender { background: var(--primary-soft) !important;", `.status.lavender { background: ${opaque("primary-soft")} !important;`, 1)
edit("styles/legacy.css", ".status.warning { background: var(--warning-soft) !important;", `.status.warning { background: ${opaque("warning-soft")} !important;`, 1)
edit("styles/legacy.css", ".status.error { background: var(--danger-soft) !important;", `.status.error { background: ${opaque("danger-soft")} !important;`, 1)
edit("styles/legacy.css", ".status.info { background: var(--info-soft) !important;", `.status.info { background: ${opaque("info-soft")} !important;`, 1)
edit("styles/legacy.css", "  border-radius: 999px;\n  background: var(--success-soft);\n  color: var(--success);\n  white-space: nowrap;", `  border-radius: 999px;\n  background: ${opaque("success-soft")};\n  color: var(--success);\n  white-space: nowrap;`, 1)

if (problems) {
  console.log(`\n${problems} edits did not match; nothing written`)
  process.exit(1)
}
if (write) for (const [p, t] of pending) fs.writeFileSync(p, t)
console.log(`\nall edits matched; ${write ? "written" : "dry run"}`)
