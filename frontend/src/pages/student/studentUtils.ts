import type { CourseCategoryName } from "@/components/shared/CourseCover"

/** Maps the course `category` labels used in seed data onto CourseCover art categories. */
const COVER_CATEGORY: Record<string, CourseCategoryName> = {
  "Advanced AI": "Generative AI",
  "Core Python": "Python for AI",
  "Machine Learning": "Machine Learning",
  "Autonomous Systems": "Agentic Systems",
  "LLM Systems": "Prompt Engineering",
  "Computer Vision": "Computer Vision",
  Robotics: "MLOps",
}

export function coverCategory(category: string): CourseCategoryName {
  return COVER_CATEGORY[category] ?? "Generative AI"
}

/** Downloads a text payload as a file. */
export function downloadTextFile(content: string, filename: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Copies text to the clipboard; resolves false when the API is unavailable. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** 1500 -> "25m 00s". */
export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.max(0, totalSeconds % 60)
  return `${m}m ${String(s).padStart(2, "0")}s`
}

/** 75 -> "01:15". */
export function formatClock(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60)
  const s = Math.max(0, totalSeconds) % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

/** "Oct 22, 2026" -> { month: "Oct", day: "22" }. Falls back to the raw string. */
export function splitDate(date: string): { month: string; day: string } {
  const m = /^([A-Za-z]{3})[a-z]*\s+(\d{1,2})/.exec(date.trim())
  return m ? { month: m[1], day: m[2] } : { month: "", day: date }
}

/** Timestamp in the style used by seed data: "Oct 21, 2026 · 18:05". */
export function stamp(d = new Date()): string {
  const date = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  return `${date} · ${time}`
}

/** "Today" in the seed data's timeline (the live class and deadlines are written around Oct 21, 2026). */
export const DEMO_TODAY = new Date(2026, 9, 21)

/** Parses "Oct 22, 2026" or "Nov 02, 2026, 09:00 AM"; returns null when unparseable. */
export function parseDate(s: string): Date | null {
  const m = /([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/.exec(s)
  if (!m) return null
  const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(m[1].toLowerCase())
  return month < 0 ? null : new Date(Number(m[3]), month, Number(m[2]))
}

/** Whole days from DEMO_TODAY to the date (negative when past). */
export function daysUntil(s: string): number | null {
  const d = parseDate(s)
  return d ? Math.round((d.getTime() - DEMO_TODAY.getTime()) / 86_400_000) : null
}

/** "Due today", "Due tomorrow", "Due in 5 days", "3 days overdue". */
export function dueLabel(s: string): string {
  const n = daysUntil(s)
  if (n === null) return `Due ${s}`
  if (n === 0) return "Due today"
  if (n === 1) return "Due tomorrow"
  if (n > 1) return `Due in ${n} days`
  return `${-n} day${n === -1 ? "" : "s"} overdue`
}
