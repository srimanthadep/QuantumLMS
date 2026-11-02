import type { BadgeTone } from "@/components/ui/badge"
import type { Preferences, QueueItem, QueueState, ReevaluationItem, RequestStatus } from "./types"

/** Display helpers for the evaluator portal. Pure functions over the API rows. */

export const STATE_META: Record<QueueState, { label: string; tone: BadgeTone }> = {
  pending: { label: "To mark", tone: "warning" },
  draft: { label: "Draft", tone: "info" },
  evaluated: { label: "Ready to release", tone: "primary" },
  released: { label: "Released", tone: "success" },
}

export const REQUEST_META: Record<RequestStatus, { label: string; tone: BadgeTone }> = {
  Pending: { label: "Waiting", tone: "warning" },
  "In Review": { label: "In review", tone: "info" },
  Revised: { label: "Revised", tone: "success" },
  Upheld: { label: "Upheld", tone: "neutral" },
}

/** The letter grade students see (same scale as the API). */
export function letterGrade(pct: number): string {
  if (pct >= 90) return "A+"
  if (pct >= 85) return "A"
  if (pct >= 80) return "A-"
  if (pct >= 75) return "B+"
  if (pct >= 70) return "B"
  if (pct >= 65) return "B-"
  if (pct >= 60) return "C+"
  if (pct >= 55) return "C"
  if (pct >= 50) return "D"
  return "F"
}

export const pctTone = (pct: number): "success" | "warning" | "danger" => (pct >= 70 ? "success" : pct >= 50 ? "warning" : "danger")

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** "just now", "12 min ago", "3 h ago", "yesterday", "4 days ago", then "Oct 12". */
export function relTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return ""
  const diff = now - new Date(iso).getTime()
  if (diff < MIN) return "just now"
  if (diff < HOUR) return `${Math.floor(diff / MIN)} min ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h ago`
  if (diff < 2 * DAY) return "yesterday"
  if (diff < 14 * DAY) return `${Math.floor(diff / DAY)} days ago`
  return shortDate(iso)
}

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
export const dateTime = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

/** "Due today", "Due tomorrow", "Due in 5 days", "Closed 6 days ago". */
export function dueLabel(iso: string, now = Date.now()): { label: string; urgent: boolean; closed: boolean } {
  const due = new Date(iso)
  const today = new Date(now)
  const days = Math.round((startOfDay(due) - startOfDay(today)) / DAY)
  if (due.getTime() < now) return { label: days === 0 ? "Closed today" : days === -1 ? "Closed yesterday" : `Closed ${-days} days ago`, urgent: false, closed: true }
  if (days === 0) return { label: "Due today", urgent: true, closed: false }
  if (days === 1) return { label: "Due tomorrow", urgent: true, closed: false }
  return { label: `Due in ${days} days`, urgent: days <= 2, closed: false }
}
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export function greeting(now = new Date()): string {
  const h = now.getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

/** "Project 1: End-to-End RAG Pipeline…" -> "Project 1". */
export function shortTitle(title: string) {
  const head = title.split(":")[0].trim()
  return head.length <= 34 ? head : `${head.slice(0, 32).trimEnd()}…`
}

/** Work the evaluator can do now: nobody has started it, or it's their own draft. */
export const isToMark = (i: QueueItem) => i.state === "pending" || (i.state === "draft" && i.mine)

export type QueueSort = Preferences["queue_sort"]
export const SORT_LABEL: Record<QueueSort, string> = { oldest: "Oldest first", newest: "Newest first", due: "Due date", student: "Student name" }

export function sortItems(items: QueueItem[], sort: QueueSort): QueueItem[] {
  const by = {
    oldest: (a: QueueItem, b: QueueItem) => a.submitted_at.localeCompare(b.submitted_at),
    newest: (a: QueueItem, b: QueueItem) => b.submitted_at.localeCompare(a.submitted_at),
    due: (a: QueueItem, b: QueueItem) => a.due_at.localeCompare(b.due_at) || a.submitted_at.localeCompare(b.submitted_at),
    student: (a: QueueItem, b: QueueItem) => a.student_name.localeCompare(b.student_name) || a.submitted_at.localeCompare(b.submitted_at),
  }[sort]
  // The evaluator's own drafts come first: finishing started work beats opening new work.
  return [...items].sort((a, b) => Number(b.state === "draft" && b.mine) - Number(a.state === "draft" && a.mine) || by(a, b))
}

/** Finished evaluations per day for the last `days` days (local days), oldest first. */
export function finishedByDay(items: QueueItem[], days: number, now = new Date()): { day: string; label: string; count: number }[] {
  const out = Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i))
    return { day: dayKey(d), label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count: 0 }
  })
  const index = new Map(out.map((d, i) => [d.day, i]))
  for (const it of items) {
    if (!it.mine || !it.evaluated_at) continue
    const i = index.get(dayKey(new Date(it.evaluated_at)))
    if (i !== undefined) out[i].count++
  }
  return out
}

export interface ActivityEntry {
  id: string
  at: string
  kind: "submitted" | "finished" | "released" | "request" | "answered"
  title: string
  detail: string
  to: string
}

/** Recent events across the queue and requests, newest first. */
export function activity(items: QueueItem[], requests: ReevaluationItem[], limit = 8): ActivityEntry[] {
  const out: ActivityEntry[] = []
  for (const i of items) {
    out.push({ id: `s-${i.id}`, at: i.submitted_at, kind: "submitted", title: `${i.student_name} submitted`, detail: shortTitle(i.assignment_title), to: `/evaluator/queue/${i.id}` })
    if (i.mine && i.evaluated_at && i.state !== "released") {
      out.push({ id: `f-${i.id}`, at: i.evaluated_at, kind: "finished", title: `You finished ${i.student_name}'s evaluation`, detail: `${shortTitle(i.assignment_title)} · ${i.score}/${i.max_marks}`, to: `/evaluator/queue/${i.id}` })
    }
    if (i.mine && i.released_at && i.state === "released") {
      out.push({ id: `r-${i.id}`, at: i.released_at, kind: "released", title: `Released to ${i.student_name}`, detail: `${shortTitle(i.assignment_title)} · ${i.score}/${i.max_marks} (${i.grade})`, to: `/evaluator/queue/${i.id}` })
    }
  }
  for (const r of requests) {
    out.push({ id: `q-${r.id}`, at: r.created_at, kind: "request", title: `${r.student_name} asked for a re-evaluation`, detail: shortTitle(r.assignment_title), to: `/evaluator/reevaluations?request=${r.id}` })
    if (r.resolved_at) {
      out.push({
        id: `a-${r.id}`,
        at: r.resolved_at,
        kind: "answered",
        title: r.status === "Revised" ? `Score revised for ${r.student_name}` : `Grade upheld for ${r.student_name}`,
        detail: r.status === "Revised" ? `${r.original_score} → ${r.revised_score}` : `${r.original_score}/${r.max_marks}`,
        to: `/evaluator/reevaluations?request=${r.id}`,
      })
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}
