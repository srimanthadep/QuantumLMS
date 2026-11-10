import { CalendarClock, CirclePlay, GraduationCap, Layers, type LucideIcon } from "lucide-react"

export type ApprovalCategory = "class_schedule" | "curriculum_item" | "video_recording" | "publish_grade"
export type ApprovalStatus = "Pending" | "Approved" | "Revision Requested"

export interface ApprovalRecord {
  id: string
  category: ApprovalCategory
  title: string
  courseName: string
  courseCode: string
  moduleName?: string
  instructor: string
  submittedAt: string
  status: ApprovalStatus
  /** Reviewer comment saved with the decision. */
  reviewNote?: string
  /** When the decision was made (ISO). */
  decidedAt?: string
  details: {
    type?: string
    date?: string
    time?: string
    duration?: string
    marks?: number
    passingMarks?: number
    timeLimit?: string
    submissionsGraded?: number
    averageScore?: number
    chaptersCount?: number
    fileSize?: string
    notes?: string
  }
}

export interface CategoryMeta {
  label: string
  short: string
  icon: LucideIcon
  /** Soft tile: background, text and ring. */
  tile: string
  /** Solid accent used for the left rail and dots. */
  accent: string
  checklist: string[]
}

export const CATEGORY_META: Record<ApprovalCategory, CategoryMeta> = {
  class_schedule: {
    label: "Class schedule",
    short: "Schedules",
    icon: CalendarClock,
    tile: "bg-info-soft text-info ring-info/20",
    accent: "bg-info",
    checklist: ["No clash with the existing timetable", "Room or studio is available", "Learners get at least 48 hours notice"],
  },
  curriculum_item: {
    label: "Assignment & material",
    short: "Curriculum",
    icon: Layers,
    tile: "bg-primary-soft text-primary-text ring-primary-border",
    accent: "bg-primary",
    checklist: ["Matches the module outcomes", "Marking scheme or answer key attached", "No licensing or plagiarism concerns"],
  },
  video_recording: {
    label: "Class recording",
    short: "Recordings",
    icon: CirclePlay,
    tile: "bg-warning-soft text-warning ring-warning/20",
    accent: "bg-warning",
    checklist: ["Audio and video quality checked", "Chapters and transcript look right", "No private information on screen"],
  },
  publish_grade: {
    label: "Grade release",
    short: "Grades",
    icon: GraduationCap,
    tile: "bg-success-soft text-success ring-success/20",
    accent: "bg-success",
    checklist: ["Every submission is graded", "Score distribution looks reasonable", "Feedback written for low scores"],
  },
}

export const CATEGORIES = Object.keys(CATEGORY_META) as ApprovalCategory[]

export const STATUS_META: Record<ApprovalStatus, { label: string; tone: "warning" | "success" | "danger" }> = {
  Pending: { label: "Awaiting review", tone: "warning" },
  Approved: { label: "Approved", tone: "success" },
  "Revision Requested": { label: "Changes requested", tone: "danger" },
}

export const STORAGE_KEY = "admin:teacher_approvals"

export const SEED_APPROVALS: ApprovalRecord[] = []

export function loadApprovals(): ApprovalRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item: any) =>
        !item.id?.startsWith("appr-sched-") &&
        !item.id?.startsWith("appr-curr-") &&
        !item.id?.startsWith("appr-rec-") &&
        !item.id?.startsWith("appr-grade-"),
    )
  } catch {
    return []
  }
}

export function formatClassDate(date?: string, time?: string): string {
  if (!date) return "Date not specified"
  try {
    const d = new Date(date)
    const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    return time ? `${formatted} · ${time}` : formatted
  } catch {
    return date
  }
}

export function formatDecidedAt(decidedAt?: string): string {
  if (!decidedAt) return ""
  try {
    const d = new Date(decidedAt)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  } catch {
    return decidedAt
  }
}

