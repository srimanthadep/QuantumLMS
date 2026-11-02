import { api, ApiError, type Tables } from "@/lib/api"
import type { AnnouncementItem, AttendanceSubject, EventItem, TimetableSlot } from "../studentTypes"
import { campusParts, campusTime, fmtDate, isoDay, relTime } from "../studentUtils"

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

const WEEKDAYS: TimetableSlot["day"][] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}
const label = (min: number) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

export type SlotRow = Tables<"timetable_slots">

export async function loadTimetable(): Promise<SlotRow[]> {
  return api.get<SlotRow[]>("/student/timetable")
}

/**
 * The week shown on the timetable: this week on weekdays, next week at the weekend. Each slot gets its status and the
 * start of its next (or current, when live) occurrence, both in this device's clock.
 */
export function timetableWeek(rows: SlotRow[], now = Date.now()): { slots: TimetableSlot[]; today: TimetableSlot["day"] | null; weekStart: Date } {
  const c = campusParts(now)
  // Monday of the campus week (next week's Monday at the weekend).
  const mondayOffset = -c.dow + (c.dow > 4 ? 7 : 0)
  const weekStart = campusTime(c.y, c.m, c.d + mondayOffset, 0)
  const today = c.dow <= 4 ? WEEKDAYS[c.dow] : null
  const at = (dayIndex: number, min: number) => campusTime(c.y, c.m, c.d + mondayOffset + dayIndex, min)
  const slots = rows.map((r) => {
    const day = r.day as TimetableSlot["day"]
    const di = WEEKDAYS.indexOf(day)
    const s = toMin(r.starts)
    const e = toMin(r.ends)
    const start = at(di, s)
    const end = at(di, e)
    const status: TimetableSlot["status"] = now >= start.getTime() && now < end.getTime() ? "Live Now" : now >= end.getTime() ? "Completed" : "Upcoming"
    const nextStart = status === "Completed" ? at(di + 7, s) : start
    return {
      id: r.id,
      day,
      startsMin: s,
      endsMin: e,
      nextStart,
      courseId: r.course_id,
      time: `${label(s)} - ${label(e)}`,
      courseCode: r.course_code,
      courseName: r.title,
      instructor: r.instructor,
      room: r.room,
      status,
      isOnline: r.is_online,
    }
  })
  slots.sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) || (a.startsMin ?? 0) - (b.startsMin ?? 0))
  return { slots, today, weekStart }
}

/** Live and upcoming classes in start order, across the week boundary. */
export function upcomingSlots(slots: TimetableSlot[], count: number): TimetableSlot[] {
  return [...slots].sort((a, b) => (a.nextStart?.getTime() ?? 0) - (b.nextStart?.getTime() ?? 0)).slice(0, count)
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
  const { records: rows, leaves } = await api.get<{ records: Pick<Tables<"attendance_records">, "course_code" | "course_name" | "class_date" | "status">[]; leaves: Tables<"leave_requests">[] }>(
    "/student/attendance",
  )
  const by = new Map<string, { name: string; present: number; late: number; absent: number; excused: number }>()
  for (const r of rows) {
    const s = by.get(r.course_code) ?? { name: r.course_name, present: 0, late: 0, absent: 0, excused: 0 }
    if (r.status === "Present") s.present++
    else if (r.status === "Late") s.late++
    else if (r.status === "Absent") s.absent++
    else s.excused++
    by.set(r.course_code, s)
  }
  const pct = (attended: number, counted: number) => (counted ? Math.round((attended / counted) * 1000) / 10 : 100)
  // Excused absences (approved leave) don't count against attendance.
  const subjects: AttendanceSubject[] = [...by.entries()].map(([code, s]) => {
    const attended = s.present + s.late
    const counted = attended + s.absent
    const percentage = pct(attended, counted)
    return { id: code, code, name: s.name, totalClasses: counted + s.excused, attended, percentage, status: percentage >= 75 ? "Good Standing" : "Needs Attention" }
  })
  const totals = [...by.values()].reduce((t, s) => ({ present: t.present + s.present, late: t.late + s.late, absent: t.absent + s.absent, excused: t.excused + s.excused }), {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
  })
  const attended = totals.present + totals.late
  return {
    overallPercentage: pct(attended, attended + totals.absent),
    totalClasses: attended + totals.absent + totals.excused,
    attendedClasses: attended,
    lateClasses: totals.late,
    absentClasses: totals.absent,
    excusedClasses: totals.excused,
    subjects,
    leaves,
  }
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
