import type { DatedSession } from "@/components/live/LiveSessionsPanel"
import { api, ApiError, type Tables } from "@/lib/api"
import type { AnnouncementItem, AttendanceSubject, EventItem, TimetableSlot } from "../studentTypes"
import { fmtDate, isoDay, relTime } from "../studentUtils"

/* -------------------------------- Reminders ------------------------------- */

export type ReminderType = "slot" | "quiz" | "event"
const rkey = (type: ReminderType, id: string) => `${type}:${id}`

export async function loadReminders(): Promise<string[]> {
  const rows = await api.get<{ target_type: string; target_id: string }[]>("/student/reminders")
  return rows.map((r) => rkey(r.target_type as ReminderType, r.target_id))
}

export async function setReminder(type: ReminderType, id: string, on: boolean) {
  await api.put("/student/reminders", { target_type: type, target_id: id, on })
}

export { rkey as reminderKey }

/* -------------------------------- Timetable ------------------------------- */

export type SlotRow = DatedSession & { course_code: string }
export async function loadTimetable(): Promise<SlotRow[]> { return api.get<SlotRow[]>("/student/timetable", { ttl: 15000 }) }
/** Dated occurrences only. Never infer a live state from the clock or repeat a past slot. */
export function timetableWeek(rows: SlotRow[], now = Date.now()): { slots: TimetableSlot[]; today: TimetableSlot["day"] | null; weekStart: Date } {
  const clock = new Date(now), weekStart = new Date(now)
  weekStart.setDate(clock.getDate() - (clock.getDay()+6)%7); weekStart.setHours(0,0,0,0)
  const slots: TimetableSlot[] = rows.filter(r => r.status !== "Cancelled").map(r => {
    const date = new Date(r.starts_at), end = new Date(r.ends_at)
    const format = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: r.timezone, hour: "2-digit", minute: "2-digit" })
    const minutes = (d: Date) => { const [h,m] = format(d).split(":").map(Number); return h*60+m }
    return { id: r.id, day: date.toLocaleDateString("en-GB", { weekday: "long", timeZone: r.timezone }) as TimetableSlot["day"], startsMin: minutes(date), endsMin: minutes(end), nextStart: date,
      courseId: r.course_id, time: `${format(date)} - ${format(end)} (${r.timezone})`, courseCode: r.course_code, courseName: r.title, instructor: r.teacher_name,
      room: r.batch_name, status: r.status === "Live" ? "Live Now" : r.status === "Ended" ? "Completed" : "Upcoming", isOnline: true }
  })
  slots.sort((a,b) => a.nextStart!.getTime()-b.nextStart!.getTime())
  return { slots, today: clock.toLocaleDateString("en-GB", { weekday: "long" }) as TimetableSlot["day"], weekStart }
}
export function upcomingSlots(slots: TimetableSlot[], count: number): TimetableSlot[] {
  return slots.filter(s => s.status === "Live Now" || (s.status === "Upcoming" && (s.nextStart?.getTime() ?? 0)>Date.now())).sort((a,b) => (a.nextStart?.getTime() ?? 0)-(b.nextStart?.getTime() ?? 0)).slice(0,count)
}

/* ------------------------------- Attendance ------------------------------- */

export interface AttendanceData {
  overallPercentage: number
  totalClasses: number
  attendedClasses: number
  lateClasses: number
  absentClasses: number
  excusedClasses: number
  subjects: AttendanceSubject[]
  leaves: Tables<"leave_requests">[]
}

export async function loadAttendance(): Promise<AttendanceData> {
  const { records, leaves } = await api.get<{ records: SlotRow[]; leaves: Tables<"leave_requests">[] }>("/student/attendance", { ttl: 15000 })
  const rows = records.filter(r => r.status === "Ended")
  const by = new Map<string, { code: string; name: string; total: number; clicked: number }>()
  for (const r of rows) { const entry = by.get(r.batch_id) ?? { code: r.course_code, name: r.batch_name, total: 0, clicked: 0 }; entry.total++; if (r.joined_at) entry.clicked++; by.set(r.batch_id,entry) }
  const subjects: AttendanceSubject[] = [...by].map(([id,s]) => ({ id, code: s.code, name: s.name, totalClasses: s.total, attended: s.clicked, percentage: Math.round(s.clicked/s.total*100), status: "Good Standing" }))
  const attended = rows.filter(r => r.joined_at).length
  return { overallPercentage: rows.length ? Math.round(attended/rows.length*100) : 0, totalClasses: rows.length, attendedClasses: attended, lateClasses: 0, absentClasses: rows.length-attended, excusedClasses: 0, subjects, leaves }
}

export async function requestLeave(courseCode: string, date: string, reason: string): Promise<Tables<"leave_requests">> {
  if (date < isoDay()) throw new ApiError("Pick today or a later date.")
  return api.post<Tables<"leave_requests">>("/student/leave-requests", { course_code: courseCode, leave_date: date, reason: reason.trim() }, "Your leave request couldn't be sent.")
}

/* ------------------------- Events and announcements ----------------------- */

export interface CampusFeed {
  events: EventItem[]
  announcements: AnnouncementItem[]
}

function eventDate(start: Date, end: Date | null) {
  const sameDay = !end || start.toDateString() === end.toDateString()
  if (sameDay) return fmtDate(start)
  const md = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "2-digit" })
  return `${md(start)} - ${md(end!)}, ${end!.getFullYear()}`
}

export async function loadCampusFeed(now = Date.now()): Promise<CampusFeed> {
  const feed = await api.get<{ events: Tables<"campus_events">[]; registered: string[]; announcements: Tables<"announcements">[]; read: string[] }>("/student/campus-feed")
  const registered = new Set(feed.registered)
  const read = new Set(feed.read)
  return {
    events: feed.events.map((e) => {
      const start = new Date(e.starts_at)
      const end = e.ends_at ? new Date(e.ends_at) : null
      return {
        id: e.id,
        startsAt: e.starts_at,
        endsAt: e.ends_at ?? undefined,
        title: e.title,
        category: e.category as EventItem["category"],
        date: eventDate(start, end),
        month: start.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
        day: String(start.getDate()).padStart(2, "0"),
        time: e.time_label,
        location: e.location,
        speaker: e.speaker ?? undefined,
        isFeatured: e.is_featured,
        description: e.description,
        registered: registered.has(e.id),
      }
    }),
    announcements: feed.announcements.map((a) => ({
      id: a.id,
      title: a.title,
      author: a.author,
      department: a.department,
      timestamp: relTime(a.published_at, now),
      category: a.category as AnnouncementItem["category"],
      content: a.content,
      attachmentName: a.attachment_name ?? undefined,
      attachmentSize: a.attachment_size ?? undefined,
      isRead: read.has(a.id),
    })),
  }
}

export async function setEventRegistration(eventId: string, on: boolean) {
  await api.put(`/student/events/${encodeURIComponent(eventId)}/registration`, { on })
}

export async function markAnnouncementsRead(ids: string[]) {
  if (!ids.length) return
  await api.post("/student/announcements/read", { ids })
}

/* ----------------------------- Study activity ----------------------------- */

export type ActivityRow = Pick<Tables<"study_activity">, "day" | "minutes" | "lessons">

/** The last 120 days of study time, oldest first. */
export async function loadActivity(): Promise<ActivityRow[]> {
  return api.get<ActivityRow[]>("/student/activity")
}
