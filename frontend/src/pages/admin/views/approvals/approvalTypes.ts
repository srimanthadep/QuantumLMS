import type { BadgeTone } from "@/components/ui/badge"

export type ApprovalState = "Pending" | "Approved" | "Rejected" | "Withdrawn" | "Superseded"

/** One row of GET /admin/approvals: the request plus the recording, class, batch and teacher it is about. */
export interface ApprovalItem {
  id: string
  kind: string
  state: ApprovalState
  note: string
  decision_note: string
  recording_id: string
  target_version: number
  created_at: string
  decided_at: string | null
  requested_by_id: string | null
  requested_by_name: string | null
  requested_by_email: string | null
  requested_by_avatar: string | null
  decided_by_name: string | null
  recording_title: string | null
  recording_summary: string | null
  recording_status: string | null
  recording_version: number | null
  release_at: string | null
  expires_at: string | null
  session_id: string | null
  session_title: string | null
  session_starts_at: string | null
  session_timezone: string | null
  batch_id: string | null
  batch_name: string | null
  replay_enabled: boolean | null
  course_id: string | null
  course_title: string | null
  processing_state: string | null
  duration_seconds: number | null
  chapter_count: number
}

export interface ApprovalList {
  approvals: ApprovalItem[]
  counts: Record<ApprovalState, number>
}

export const STATE_META: Record<ApprovalState, { label: string; tone: BadgeTone }> = {
  Pending: { label: "Waiting", tone: "warning" },
  Approved: { label: "Approved", tone: "success" },
  Rejected: { label: "Declined", tone: "danger" },
  Withdrawn: { label: "Withdrawn", tone: "neutral" },
  Superseded: { label: "Replaced", tone: "neutral" },
}

export const teacherName = (a: ApprovalItem) => a.requested_by_name || a.requested_by_email || "A teacher"
export const recordingTitle = (a: ApprovalItem) => a.recording_title || "Removed recording"

export function minutes(seconds: number | null | undefined) {
  if (!seconds) return null
  const m = Math.max(1, Math.round(seconds / 60))
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim() : `${m} min`
}

/** "just now", "12 min ago", "3 h ago", "2 days ago", then a date. */
export function timeAgo(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return ""
  const diff = Math.max(0, now - new Date(iso).getTime())
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} ${d === 1 ? "day" : "days"} ago`
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

/** Compact wait length for the "oldest request" stat: "45 min", "5 h", "3 days". */
export function waitLength(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "—"
  const min = Math.floor(Math.max(0, now - new Date(iso).getTime()) / 60_000)
  if (min < 60) return `${Math.max(1, min)} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.floor(h / 24)
  return `${d} ${d === 1 ? "day" : "days"}`
}

export const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : ""

export const dateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : ""
