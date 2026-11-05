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

/** 1500 -> "25m 00s" or 3720 -> "1h 02m 00s". */
export function formatDuration(totalSeconds: number): string {
  const total = Math.floor(Math.max(0, Number.isFinite(totalSeconds) ? totalSeconds : 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
  }
  return `${m}m ${String(s).padStart(2, "0")}s`
}

/** 75 -> "01:15" or 3675 -> "1:01:15". Floored integer seconds without raw decimals. */
export function formatClock(totalSeconds: number, forceHours = false): string {
  const total = Math.floor(Math.max(0, Number.isFinite(totalSeconds) ? totalSeconds : 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const sStr = String(s).padStart(2, "0")
  const mStr = String(m).padStart(2, "0")
  if (h > 0 || forceHours) {
    return `${h}:${mStr}:${sStr}`
  }
  return `${mStr}:${sStr}`
}

/** "Oct 22, 2026" -> { month: "Oct", day: "22" }. Falls back to the raw string. */
export function splitDate(date: string): { month: string; day: string } {
  const m = /^([A-Za-z]{3})[a-z]*\s+(\d{1,2})/.exec(date.trim())
  return m ? { month: m[1], day: m[2] } : { month: "", day: date }
}

/** Timestamp in the style used across the portal: "Oct 21, 2026 · 18:05". */
export function stamp(d: Date | string = new Date()): string {
  const x = typeof d === "string" ? new Date(d) : d
  const date = x.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
  const time = x.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  return `${date} · ${time}`
}

/** The campus time zone (backend setting app_private.settings.timezone). Timetable times are campus times. */
export const CAMPUS_TZ = "Asia/Kolkata"

const campusFormat = new Intl.DateTimeFormat("en-US", { timeZone: CAMPUS_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short" })
const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

/** The campus wall clock at an instant: year, month (0-11), day, weekday (Monday = 0), minutes after midnight. */
export function campusParts(t: number = Date.now()) {
  const p = Object.fromEntries(campusFormat.formatToParts(new Date(t)).map((x) => [x.type, x.value]))
  return { y: Number(p.year), m: Number(p.month) - 1, d: Number(p.day), dow: WEEKDAY_INDEX[p.weekday] ?? 0, min: (Number(p.hour) % 24) * 60 + Number(p.minute) }
}

/** The instant of a campus wall-clock time (day overflow is fine: d + 7 rolls into the next week). */
export function campusTime(y: number, m: number, d: number, minutes: number): Date {
  const guess = Date.UTC(y, m, d, 0, minutes)
  const p = campusParts(guess)
  const offset = Date.UTC(p.y, p.m, p.d, 0, p.min) - guess
  return new Date(guess - offset)
}

/** Local midnight of the day. */
export function startOfDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** "2026-11-04" for the local day (the format of SQL dates and <input type="date">). */
export function isoDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** A SQL date ("2026-11-04") as local midnight. */
export function fromIsoDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** "Oct 22, 2026". */
export function fmtDate(iso: string | Date): string {
  const d = typeof iso === "string" ? (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? fromIsoDay(iso) : new Date(iso)) : iso
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
}

/** "Oct 22, 2026, 09:00 AM". */
export function fmtDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  return `${fmtDate(d)}, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
}

/** "09:00 AM". */
export function fmtTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

/** "Just now", "12 min ago", "3 hours ago", "Yesterday", "4 days ago", then the date. */
export function relTime(iso: string | Date, now = Date.now()): string {
  const t = (typeof iso === "string" ? new Date(iso) : iso).getTime()
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 60) return "Just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86_400) {
    const h = Math.floor(s / 3600)
    return `${h} hour${h === 1 ? "" : "s"} ago`
  }
  const days = Math.round((startOfDay(new Date(now)).getTime() - startOfDay(new Date(t)).getTime()) / 86_400_000)
  if (days <= 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return fmtDate(new Date(t))
}

/** Parses an ISO timestamp, "Oct 22, 2026" or "Nov 02, 2026, 09:00 AM"; returns null when unparseable. */
export function parseDate(s: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return fromIsoDay(s)
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const m = /([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/.exec(s)
  if (!m) return null
  const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(m[1].toLowerCase())
  return month < 0 ? null : new Date(Number(m[3]), month, Number(m[2]))
}

/** Whole calendar days from today to the date (negative when past). */
export function daysUntil(s: string): number | null {
  const d = parseDate(s)
  return d ? Math.round((startOfDay(d).getTime() - startOfDay().getTime()) / 86_400_000) : null
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
