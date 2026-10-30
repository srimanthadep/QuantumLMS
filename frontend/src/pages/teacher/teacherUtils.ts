import type { CourseCategoryName } from "@/components/shared/CourseCover"
import type { BadgeTone } from "@/components/ui"
import type { AttendanceStatus, CalendarEventItem, CourseItem, DoubtItem, LiveAttendanceRecord, LiveSessionItem, StudentItem } from "@/types"

/** "Now" in the teacher demo timeline: Thursday 22 Oct 2026, during the live lab (11:30–13:00). */
export const DEMO_NOW = new Date(2026, 9, 22, 12, 17)
export const DEMO_DATE = "2026-10-22"

const COURSE_ART: Record<string, CourseCategoryName> = {
  c1: "Generative AI",
  c2: "Python for AI",
  c3: "MLOps",
  c4: "Agentic Systems",
}
export const courseArt = (courseId: string): CourseCategoryName => COURSE_ART[courseId] ?? "Generative AI"

/** "2026-10-22" + "11:30" -> local Date. */
export function toDate(iso: string, time = "00:00"): Date {
  const [y, m, d] = iso.split("-").map(Number)
  const [h, min] = time.split(":").map(Number)
  return new Date(y, (m || 1) - 1, d || 1, h || 0, min || 0)
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

export const minutesOf = (t: string): number => {
  const [h, m] = t.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** "14:30" -> "2:30 PM". */
export function formatTime(t: string): string {
  const mins = minutesOf(t)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

export const formatTimeRange = (a: string, b: string) => `${formatTime(a)} – ${formatTime(b)}`

/** "Today", "Tomorrow", "Yesterday", or "Fri, 24 Oct". */
export function dayLabel(iso: string, now = DEMO_NOW): string {
  const diff = Math.round((toDate(iso).getTime() - toDate(isoDate(now)).getTime()) / 86_400_000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff === -1) return "Yesterday"
  return toDate(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

export function monthDay(iso: string): { month: string; day: string } {
  const d = toDate(iso)
  return { month: d.toLocaleDateString("en-US", { month: "short" }), day: String(d.getDate()) }
}

export function greeting(d = DEMO_NOW): string {
  const h = d.getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

/** "in 2h 13m" / "47m ago" relative to DEMO_NOW. */
export function relativeTo(iso: string, time: string, now = DEMO_NOW): string {
  const diff = Math.round((toDate(iso, time).getTime() - now.getTime()) / 60_000)
  const abs = Math.abs(diff)
  const text = abs >= 1440 ? `${Math.round(abs / 1440)}d` : abs >= 60 ? `${Math.floor(abs / 60)}h ${abs % 60}m` : `${abs}m`
  return diff >= 0 ? `in ${text}` : `${text} ago`
}

export const formatClock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

export const average = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)

export const STUDENT_STATUS_TONE: Record<StudentItem["status"], BadgeTone> = {
  Excelling: "success",
  "On Track": "info",
  "Needs Attention": "warning",
}

export const SESSION_STATUS_TONE: Record<LiveSessionItem["status"], BadgeTone> = {
  "Live Now": "live",
  Upcoming: "info",
  Scheduled: "info",
  Completed: "neutral",
  Cancelled: "danger",
}

export const DOUBT_PRIORITY_TONE: Record<DoubtItem["priority"], BadgeTone> = { High: "danger", Medium: "warning", Low: "neutral" }
export const DOUBT_STATUS_TONE: Record<DoubtItem["status"], BadgeTone> = { Pending: "warning", "In Progress": "info", Resolved: "success" }

export const EVENT_STYLE: Record<CalendarEventItem["category"], { block: string; dot: string; tone: BadgeTone }> = {
  Class: { block: "border-l-primary bg-primary-soft", dot: "bg-primary", tone: "primary" },
  "Office Hours": { block: "border-l-secondary bg-secondary-soft", dot: "bg-secondary", tone: "neutral" },
  Deadline: { block: "border-l-danger bg-danger-soft", dot: "bg-danger", tone: "danger" },
  Quiz: { block: "border-l-warning bg-warning-soft", dot: "bg-warning", tone: "warning" },
  Meeting: { block: "border-l-info bg-info-soft", dot: "bg-info", tone: "info" },
  Reminder: { block: "border-l-success bg-success-soft", dot: "bg-success", tone: "success" },
}

/** Live sessions shown as calendar events. */
export function sessionAsEvent(s: LiveSessionItem): CalendarEventItem {
  return {
    id: `session-${s.id}`,
    title: s.title,
    description: s.classNotes,
    startDate: s.scheduledDate,
    startTime: s.startTime,
    endTime: s.endTime,
    category: "Class",
    courseId: s.courseId,
    courseName: s.courseName,
    location: s.platform,
    status: s.status === "Completed" ? "Completed" : "Scheduled",
    isReadOnly: true,
  }
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

export const courseByCode = (courses: CourseItem[], code: string) => courses.find((c) => c.code === code)

/** Minutes from the start of a session to DEMO_NOW, clamped to the session length. */
export function sessionElapsed(s: LiveSessionItem, now = DEMO_NOW): { elapsed: number; total: number; pct: number } {
  const total = Math.max(1, minutesOf(s.endTime) - minutesOf(s.startTime))
  const elapsed = Math.max(0, Math.min(total, Math.round((now.getTime() - toDate(s.scheduledDate, s.startTime).getTime()) / 60_000)))
  return { elapsed, total, pct: elapsed / total }
}

export const ATTENDANCE_TONE: Record<AttendanceStatus, BadgeTone> = {
  Present: "success",
  Late: "warning",
  "Left Early": "info",
  Absent: "danger",
}

export interface RosterEntry {
  id: string
  studentId: string
  name: string
  roll: string
  avatar?: string
  status: AttendanceStatus
  minutes: number
  handRaises: number
  device?: string
  /** Minutes after the class started that the learner joined. */
  joinedAfter: number
  note?: string
}

/** "10:14 AM" -> minutes since midnight. */
function clockMinutes(t: string): number | null {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(t)
  if (!m) return null
  return ((Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + Number(m[2])
}

/** Live roster: attendance records joined with the learner records they belong to (names and photos come from the learner). */
export function buildRoster(records: LiveAttendanceRecord[], students: StudentItem[]): RosterEntry[] {
  const first = Math.min(...records.map((r) => clockMinutes(r.joinTime) ?? Infinity))
  return records.map((r) => {
    const s = students.find((x) => x.id === r.studentId)
    const join = clockMinutes(r.joinTime)
    return {
      id: r.id,
      studentId: r.studentId,
      name: s?.name ?? r.studentName,
      roll: s?.rollNumber ?? r.studentRoll,
      avatar: s?.image || r.studentAvatar,
      status: r.status,
      minutes: r.durationMinutes,
      handRaises: r.handRaisesCount ?? 0,
      device: r.deviceUsed && r.deviceUsed !== "N/A" ? r.deviceUsed : undefined,
      joinedAfter: join === null || !Number.isFinite(first) ? 0 : Math.max(0, join - first),
      note: r.notes,
    }
  })
}

/** Date label for recordings: relative for past days ("Today", "Yesterday"), absolute otherwise. */
export function recordedLabel(iso: string): string {
  return iso > DEMO_DATE ? toDate(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : dayLabel(iso)
}
