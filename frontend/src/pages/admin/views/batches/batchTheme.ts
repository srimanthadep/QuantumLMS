import type { BadgeTone } from "@/components/ui/badge"
import type { AdminBatch, AdminCourse, AdminTeacher } from "@/data/adminStore"
import { themeFor } from "../courses/courseTheme"

export function batchInstructorNames(teachers: AdminTeacher[]): string[] {
  return Array.from(new Set(teachers
    .filter((teacher) => teacher.role === "Lead Instructor" && (teacher.status === "Available" || teacher.status === "Live Now"))
    .map((teacher) => teacher.name.trim())
    .filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

export const BATCH_STATUS_TONE: Record<AdminBatch["status"], BadgeTone> = {
  Active: "success",
  Upcoming: "warning",
  Completed: "info",
  Archived: "neutral",
}
export function batchStatusTone(
  batch: Pick<AdminBatch, "status" | "lifecycle">,
): BadgeTone {
  const tones: Record<string, BadgeTone> = {
    Draft: "neutral",
    Recruiting: "info",
    Ready: "success",
    Scheduled: "info",
    Running: "success",
    Completed: "neutral",
    Cancelled: "danger",
  }
  return (
    (batch.lifecycle && tones[batch.lifecycle]) ||
    BATCH_STATUS_TONE[batch.status]
  )
}
export const BATCH_STATUS_OPTIONS: {
  value: AdminBatch["status"]
  label: string
}[] = [
  { value: "Upcoming", label: "Upcoming" },
  { value: "Active", label: "Active" },
  { value: "Completed", label: "Completed" },
  { value: "Archived", label: "Archived" },
]
export const TIMEZONES = [
  { value: "Asia/Kolkata", label: "IST — Asia/Kolkata (UTC+5:30)" },
  { value: "UTC", label: "UTC — Coordinated Universal Time" },
  { value: "America/New_York", label: "EST — America/New_York" },
  { value: "Europe/London", label: "GMT — Europe/London" },
  { value: "Asia/Singapore", label: "SGT — Asia/Singapore" },
]
export const DELIVERY_MODE_OPTIONS: {
  value: AdminBatch["deliveryMode"]
  label: string
}[] = [
  { value: "Live + Replay", label: "Live Studio + Replay Access" },
  { value: "Replay Only", label: "On-Demand Replay Only" },
  { value: "Self-Paced", label: "Self-Paced Cohort" },
]
export const SHORT_DELIVERY_MODE: Record<AdminBatch["deliveryMode"], string> = {
  "Live + Replay": "Live + Replay",
  "Replay Only": "Replay",
  "Self-Paced": "Self-Paced",
}
export const safeHref = (url?: string | null) =>
  url && /^https?:\/\//i.test(url.trim()) ? url.trim() : null
export function seatUtilization(enrolled: number, max: number): number {
  if (!max || max <= 0) return 0
  return Math.min(100, Math.round((enrolled / max) * 100))
}
export function seatTone(pct: number): "danger" | "warning" | "primary" {
  if (pct >= 100) return "danger"
  if (pct >= 85) return "warning"
  return "primary"
}
const BATCH_GRADIENTS = [
  "from-violet-500 via-indigo-500 to-indigo-700",
  "from-sky-400 via-blue-500 to-blue-700",
  "from-emerald-400 via-teal-500 to-teal-700",
  "from-amber-400 via-orange-500 to-orange-700",
  "from-rose-400 via-pink-500 to-rose-700",
  "from-cyan-400 via-cyan-500 to-cyan-700",
  "from-fuchsia-400 via-purple-500 to-purple-700",
  "from-lime-400 via-green-500 to-emerald-700",
] as const

export function resolveBatchTheme(batch: AdminBatch, courses: AdminCourse[]) {
  const course = courses.find((c) => c.id === batch.courseId)
  // Use the immutable ID so colors stay consistent across sorting, edits and views.
  let hash = 2166136261
  for (const character of batch.id) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  }
  return {
    ...themeFor(course?.category ?? ""),
    category: course?.category ?? "Generative AI",
    gradient: BATCH_GRADIENTS[(hash >>> 0) % BATCH_GRADIENTS.length],
  }
}
/** "₹4,999" or "Free" for a batch's one-time fee. */
export function batchPriceLabel(price: number): string {
  return price > 0 ? `₹${price.toLocaleString("en-IN")}` : "Free"
}
export function formatShortDateRange(
  startDate: string,
  endDate: string,
): string {
  const fmt = (iso: string, year = false) => {
    const dt = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(dt.getTime())) return iso
    return dt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      ...(year ? { year: "numeric" as const } : {}),
    })
  }
  if (!startDate && !endDate) return "Flexible dates"
  if (!startDate) return `Until ${fmt(endDate, true)}`
  if (!endDate) return `From ${fmt(startDate, true)}`
  return `${fmt(startDate, startDate.slice(0, 4) !== endDate.slice(0, 4))} – ${fmt(endDate, true)}`
}
export interface BatchEditableFields {
  name: string
  /** Optional topic label — empty when the batch is not tied to a course. */
  courseId: string
  /** One-time fee in rupees. 0 = free, admitted by the team only. */
  price: number
  instructor: string
  startDate: string
  endDate: string
  schedule: string
  timezone: string
  maxSeats: number
  deliveryMode: AdminBatch["deliveryMode"]
  replayDelayHours: number
  accessExpiryMonths: number
  meetingUrl: string
  notes: string
  status: AdminBatch["status"]
  liveChat: boolean
  doubtClearing: boolean
  aiTutor: boolean
  certificate: boolean
}
export function validateBatchFields(
  fields: BatchEditableFields,
  courses: AdminCourse[],
): {
  error?: string
  selectedCourse?: AdminCourse
  field?: keyof BatchEditableFields
} {
  const selectedCourse = courses.find((c) => c.id === fields.courseId)
  if (fields.name.trim().length < 2) {
    return { error: "Batch name must be at least 2 characters.", field: "name" }
  }
  if (!Number.isInteger(fields.price) || fields.price < 0 || fields.price > 10_000_000) {
    return { error: "Price must be a whole number of rupees, 0 or more.", field: "price" }
  }
  if (fields.instructor.trim().length < 2) {
    return { error: "Lead instructor name is required.", field: "instructor" }
  }
  if (fields.endDate && fields.startDate && fields.endDate < fields.startDate) {
    return {
      error: "End date cannot be earlier than start date.",
      field: "endDate",
    }
  }
  if (
    !Number.isInteger(fields.maxSeats) ||
    fields.maxSeats < 1 ||
    fields.maxSeats > 5000
  ) {
    return {
      error: "Seat limit must be a whole number between 1 and 5,000.",
      field: "maxSeats",
    }
  }
  if (
    !Number.isInteger(fields.accessExpiryMonths) ||
    fields.accessExpiryMonths < 0 ||
    fields.accessExpiryMonths > 120
  ) {
    return {
      error: "Access must be between 0 and 120 months.",
      field: "accessExpiryMonths",
    }
  }
  if (
    !Number.isInteger(fields.replayDelayHours) ||
    fields.replayDelayHours < 0 ||
    fields.replayDelayHours > 168
  ) {
    return {
      error: "Replay delay must be between 0 and 168 hours.",
      field: "replayDelayHours",
    }
  }
  const limits = {
    name: 150,
    instructor: 120,
    schedule: 150,
    notes: 1000,
  } as const
  for (const field of Object.keys(limits) as Array<keyof typeof limits>) {
    if (fields[field].trim().length > limits[field])
      return {
        error: `Please keep ${
          field === "name" ? "the batch name" : field
        } within ${limits[field]} characters.`,
        field,
      }
  }
  if (fields.schedule.trim().length === 1)
    return {
      error:
        "Enter a schedule of at least 2 characters, or leave it blank for flexible scheduling.",
      field: "schedule",
    }
  const cleanUrl = fields.meetingUrl.trim()
  if (cleanUrl) {
    try {
      const url = new URL(cleanUrl)
      if (!["http:", "https:"].includes(url.protocol))
        throw new Error("protocol")
    } catch {
      return {
        error:
          "Enter a valid classroom link beginning with https:// or http://",
        field: "meetingUrl",
      }
    }
  }
  return { selectedCourse }
}
export function toBatchPayload(
  fields: BatchEditableFields,
  selectedCourse?: AdminCourse,
) {
  const cleanInstructor = fields.instructor.trim()
  const cleanMeetingUrl = fields.meetingUrl.trim()
  return {
    name: fields.name.trim(),
    courseId: selectedCourse?.id ?? "",
    courseTitle: selectedCourse?.title ?? "",
    price: Math.max(0, Math.round(Number(fields.price) || 0)),
    instructor: cleanInstructor,
    instructorAvatar:
      cleanInstructor === "Srimanth" ? "/assets/srimanth.png" : "",
    startDate: fields.startDate,
    endDate: fields.endDate,
    schedule: fields.schedule.trim() || "Flexible Schedule",
    timezone: fields.timezone,
    maxSeats: Math.max(1, Number(fields.maxSeats) || 100),
    deliveryMode: fields.deliveryMode,
    replayDelayHours: Math.max(0, Number(fields.replayDelayHours) || 0),
    accessExpiryMonths: Math.max(0, Number(fields.accessExpiryMonths) || 0),
    meetingUrl: cleanMeetingUrl || null,
    features: {
      liveChat: fields.liveChat,
      doubtClearing: fields.doubtClearing,
      aiTutor: fields.aiTutor,
      certificate: fields.certificate,
    },
    status: fields.status,
    notes: fields.notes.trim(),
  }
}

/** Where a batch is in its run, for cards and the batch page: "Starts in 5 days", "Week 3 of 12", "Ended 2 Mar 2026". */
export function batchTimeline(
  batch: Pick<AdminBatch, "startDate" | "endDate" | "status">,
  now: Date = new Date(),
): { label: string; pct: number | null; phase: "unscheduled" | "before" | "running" | "after" } {
  const day = 86_400_000
  const parse = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const start = batch.startDate ? parse(batch.startDate) : null
  const end = batch.endDate ? parse(batch.endDate) : null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!start) return { label: "Dates not set", pct: null, phase: "unscheduled" }
  if (today < start) {
    const days = Math.round((start.getTime() - today.getTime()) / day)
    return { label: days === 1 ? "Starts tomorrow" : `Starts in ${days} days`, pct: 0, phase: "before" }
  }
  if (!end || today <= end) {
    if (!end) return { label: "In progress", pct: null, phase: "running" }
    const total = Math.max(1, end.getTime() - start.getTime())
    const elapsed = today.getTime() - start.getTime()
    const weeks = Math.max(1, Math.ceil((total + day) / (7 * day)))
    const week = Math.min(weeks, Math.floor(elapsed / (7 * day)) + 1)
    if (elapsed === 0) return { label: "Starts today", pct: 0, phase: "running" }
    return { label: `Week ${week} of ${weeks}`, pct: Math.min(100, Math.round((elapsed / total) * 100)), phase: "running" }
  }
  return {
    label: `Ended ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
    pct: 100,
    phase: "after",
  }
}
