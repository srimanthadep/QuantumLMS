// Phase 1 gate: replaces hard-coded colours that the contrast audit flagged with
// semantic tokens or bridge utilities. Every replacement must match the expected
// number of times, otherwise nothing is written.
// Usage: node fix-hex-contrast.mjs [--write]
import fs from "node:fs"

const src = "c:/Users/srima/Downloads/QuantumLMS/.worktrees/redesign-premium-ui/frontend/src"
const write = process.argv.includes("--write")

// [file, from, to, expected count]
const EDITS = [
  // Dark-green text on success tint: invisible in dark mode (1.18:1).
  ["pages/student/GradesPage.tsx", "bg-success-soft text-[#253700] border border-[#D2F66A]", "bg-success-soft text-success border border-success/40", 2],
  ["pages/student/GradesPage.tsx", "bg-success-soft text-[#253700]", "bg-success-soft text-success", 1],
  ["pages/student/SupportHelpPage.tsx", "bg-success-soft text-[#253700] border border-[#D2F66A]", "bg-success-soft text-success border border-success/40", 1],
  ["pages/student/SupportHelpPage.tsx", "bg-success-soft text-[#253700] mx-auto", "bg-success-soft text-success mx-auto", 1],
  ["pages/student/SupportHelpPage.tsx", "w-8 h-8 text-[#253700]", "w-8 h-8 text-success", 1],
  ["pages/student/CourseDetailsPage.tsx", "text-xl font-bold text-[#182600] mt-1", "text-xl font-bold text-success mt-1", 1],
  ["pages/support/LiveChatPage.tsx", "bg-[#EBFDCE] text-[#345C00] border border-success/40", "bg-success-soft text-success border border-success/40", 1],
  // Near-black text on the success fill: fine in dark (light fill), 3.1:1 in light (dark fill).
  ["pages/student/SupportHelpPage.tsx", "bg-success text-[#151B00] text-xs font-bold hover:bg-[#9ED500]", "bg-success text-white dark:text-ink-950 text-xs font-bold hover:opacity-90", 2],
  // Dark indigo text and lavender border on the primary tint.
  ["pages/student/CourseDetailsPage.tsx", "bg-primary-soft border border-[#D8CFFF]", "bg-primary-soft border border-primary-border", 1],
  ["pages/student/CourseDetailsPage.tsx", 'className="text-[#33295A] leading-relaxed"', 'className="text-foreground leading-relaxed"', 1],
  ["pages/student/career/ResumeBuilderView.tsx", 'colorClass: "text-[#5c3cd6]"', 'colorClass: "text-primary-text"', 2],
  // Static light tints behind theme text: unreadable in dark mode.
  ["components/StudentHeader.tsx", "rounded-md bg-[#FEF2F0] text-primary-text", "rounded-md bg-primary-soft text-primary-text", 1],
  ["pages/teacher/SettingsPage.tsx", '"bg-[#FFF1EE] text-primary-text"', '"bg-primary-soft text-primary-text"', 1],
  ["components/StudentHeader.tsx", "bg-slate-100 text-[#172033]", "bg-slate-100 text-foreground", 1],
  ["components/StudentHeader.tsx", "bg-teal-50 text-[#0F766E]", "bg-teal-50 text-teal-700", 1],
  ["components/StudentHeader.tsx", "text-[11px] text-[#0F766E] font-medium", "text-[11px] text-teal-700 font-medium", 1],
  ["pages/support/LiveChatPage.tsx", "rounded-full bg-[#F4F3F8] p-1.5", "rounded-full bg-surface-2 p-1.5", 1],
  ["pages/support/SupportAnalyticsPage.tsx", "rounded-full bg-[#F2F4F7] p-0.5", "rounded-full bg-surface-2 p-0.5", 1],
  ["pages/teacher/CalendarPage.tsx", '"bg-[#eff6ff] border-[#bfdbfe] ring-1 ring-blue-200/70"', '"bg-blue-50 border-blue-200 ring-1 ring-blue-200/70"', 1],
  ["pages/teacher/CalendarPage.tsx", '"text-[#1d63ed] font-semibold hover:underline"', '"text-blue-600 font-semibold hover:underline"', 2],
  // Category label colours (dark hex text) -> bridge utilities that adapt to the theme.
  ["pages/support/SupportAnalyticsPage.tsx", 'labelColor: "text-[#BE185D]"', 'labelColor: "text-pink-700"', 1],
  ["pages/support/SupportAnalyticsPage.tsx", 'labelColor: "text-[#5B21B6]"', 'labelColor: "text-violet-800"', 1],
  ["pages/support/SupportAnalyticsPage.tsx", 'labelColor: "text-[#9D174D]"', 'labelColor: "text-pink-800"', 1],
  ["pages/support/SupportAnalyticsPage.tsx", 'labelColor: "text-[#334155]"', 'labelColor: "text-slate-700"', 1],
  ["pages/support/supportTicketsData.ts", "bg-zinc-100 text-[#4B5563] border-[#E5E7EB]", "bg-zinc-100 text-zinc-600 border-zinc-200", 2],
  ["pages/support/supportTicketsData.ts", "bg-[#FEE4E2] text-[#D92D20] border-[#FDA29B]/40", "bg-danger-soft text-danger border-danger/30", 2],
  // Out-of-month calendar days and empty-day copy: 1.5:1 in both themes.
  ["pages/teacher/CalendarPage.tsx", '"text-zinc-300 hover:text-zinc-500 font-normal rounded-md"', '"text-zinc-400 hover:text-zinc-600 font-normal rounded-md"', 1],
  ["pages/teacher/CalendarPage.tsx", "text-[10px] text-zinc-300 text-center pt-8", "text-[10px] text-zinc-400 text-center pt-8", 1],
  // text-black on theme surfaces: black on dark in dark mode.
  ["pages/student/GradesPage.tsx", '<strong className="text-black">', '<strong className="text-foreground">', 1],
  ["pages/student/StudentDashboardPage.tsx", '<strong className="text-black">', '<strong className="text-foreground">', 1],
  ["pages/teacher/AnalyticsPage.tsx", '<strong className="text-black ml-1">', '<strong className="text-foreground ml-1">', 1],
  ["pages/teacher/AnalyticsPage.tsx", '<strong className="text-black font-bold text-xs">', '<strong className="text-foreground font-bold text-xs">', 1],
  ["pages/teacher/AnalyticsPage.tsx", '<span className="text-[11px] font-bold text-black">', '<span className="text-[11px] font-bold text-foreground">', 1],
  ["pages/teacher/AnalyticsPage.tsx", '<h3 className="text-[16px] font-bold text-black leading-snug"', '<h3 className="text-[16px] font-bold text-foreground leading-snug"', 1],
  ["pages/teacher/StudentsPage.tsx", '<h3 className="text-base font-bold text-black">', '<h3 className="text-base font-bold text-foreground">', 1],
]

const pending = new Map()
let problems = 0
for (const [file, from, to, expected] of EDITS) {
  const p = `${src}/${file}`
  const text = pending.get(p) ?? fs.readFileSync(p, "utf8")
  const n = text.split(from).length - 1
  const ok = n === expected
  if (!ok) problems++
  console.log(`${ok ? "ok  " : "FAIL"} ${file.split("/").pop().padEnd(26)} x${n}/${expected}  ${from.slice(0, 60)}`)
  pending.set(p, text.split(from).join(to))
}
if (problems) {
  console.log(`\n${problems} edits did not match; nothing written`)
  process.exit(1)
}
if (write) for (const [p, t] of pending) fs.writeFileSync(p, t)
console.log(`\n${EDITS.length} edits in ${pending.size} files ${write ? "written" : "verified (dry run)"}`)
