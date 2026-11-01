import { isoDay, startOfDay } from "../studentUtils"
import type { ActivityRow } from "./schedule"

/** Daily study goal in minutes (2 hours). */
export const DAILY_GOAL_MIN = 120

export interface StudyAnalytics {
  labels: string[]
  /** Hours per bucket. */
  focus: number[]
  goal: number[]
  /** Share of the goal reached per bucket (0-100). */
  bars: { label: string; value: number; highlight?: boolean }[]
  /** Hours in the range. */
  total: number
  /** Hours in the range before it. */
  previous: number
  /** "+18% from last week". */
  change: string
  best: { hours: number; label: string }
  /** Target hours for the range. */
  target: number
  yMax: number
}

const round1 = (n: number) => Math.round(n * 10) / 10
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

function changeLabel(cur: number, prev: number, period: string) {
  if (!prev) return cur ? `Up from nothing ${period}` : `No study logged ${period}`
  const pct = Math.round(((cur - prev) / prev) * 100)
  return pct === 0 ? `Same as ${period}` : `${pct > 0 ? "+" : ""}${pct}% from ${period}`
}

export function studyAnalytics(rows: ActivityRow[], range: "Week" | "Month", now = Date.now()): StudyAnalytics {
  const byDay = new Map(rows.map((r) => [r.day, r.minutes]))
  const today = startOfDay(new Date(now))
  const minutesOn = (d: Date) => byDay.get(isoDay(d)) ?? 0
  const sumDays = (from: number, to: number) => {
    let s = 0
    for (let i = from; i <= to; i++) s += minutesOn(addDays(today, i))
    return s
  }

  if (range === "Week") {
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
    const mins = days.map(minutesOn)
    const hours = mins.map((m) => round1(m / 60))
    const bestIdx = mins.reduce((b, m, i) => (m > mins[b] ? i : b), 0)
    const total = round1(mins.reduce((s, m) => s + m, 0) / 60)
    const previous = round1(sumDays(-13, -7) / 60)
    return {
      labels: days.map((d) => d.toLocaleDateString("en-US", { weekday: "short" })),
      focus: hours,
      goal: days.map(() => DAILY_GOAL_MIN / 60),
      bars: days.map((d, i) => ({ label: d.toLocaleDateString("en-US", { weekday: "short" }), value: Math.min(100, Math.round((mins[i] / DAILY_GOAL_MIN) * 100)), highlight: i === bestIdx && mins[i] > 0 })),
      total,
      previous,
      change: changeLabel(total, previous, "last week"),
      best: { hours: hours[bestIdx], label: days[bestIdx].toLocaleDateString("en-US", { weekday: "long" }) },
      target: (DAILY_GOAL_MIN / 60) * 7,
      yMax: Math.max(4, Math.ceil(Math.max(...hours))),
    }
  }

  const weeks = Array.from({ length: 4 }, (_, k) => {
    const start = -27 + k * 7
    return { start: addDays(today, start), minutes: sumDays(start, start + 6) }
  })
  const hours = weeks.map((w) => round1(w.minutes / 60))
  const bestIdx = hours.reduce((b, h, i) => (h > hours[b] ? i : b), 0)
  const weekGoal = (DAILY_GOAL_MIN / 60) * 7
  const total = round1(hours.reduce((s, h) => s + h, 0))
  const previous = round1(sumDays(-55, -28) / 60)
  const label = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return {
    labels: weeks.map((w) => label(w.start)),
    focus: hours,
    goal: weeks.map(() => weekGoal),
    bars: weeks.map((w, i) => ({ label: label(w.start), value: Math.min(100, Math.round((hours[i] / weekGoal) * 100)), highlight: i === bestIdx && hours[i] > 0 })),
    total,
    previous,
    change: changeLabel(total, previous, "the 4 weeks before"),
    best: { hours: hours[bestIdx], label: `Week of ${label(weeks[bestIdx].start)}` },
    target: weekGoal * 4,
    yMax: Math.max(16, Math.ceil(Math.max(...hours))),
  }
}

/** Consecutive days with study time, ending today (or yesterday when today has none yet). */
export function studyStreak(rows: ActivityRow[], now = Date.now()): number {
  const active = new Set(rows.filter((r) => r.minutes > 0).map((r) => r.day))
  let d = startOfDay(new Date(now))
  if (!active.has(isoDay(d))) d = addDays(d, -1)
  let n = 0
  while (active.has(isoDay(d))) {
    n++
    d = addDays(d, -1)
  }
  return n
}

/**
 * The two-hour window in which the student completes most lessons: label "7–9 PM", start "7 PM".
 * Null with too little history.
 */
export function bestStudyWindow(completedAt: string[]): { label: string; start: string } | null {
  if (completedAt.length < 3) return null
  const hours = new Array(24).fill(0) as number[]
  for (const t of completedAt) hours[new Date(t).getHours()]++
  let best = 0
  for (let h = 0; h < 24; h++) if (hours[h] + hours[(h + 1) % 24] > hours[best] + hours[(best + 1) % 24]) best = h
  const fmt = (h: number) => `${((h + 11) % 12) + 1}`
  const end = (best + 2) % 24
  const ampm = (h: number) => (h < 12 ? "AM" : "PM")
  return {
    label: ampm(best) === ampm(end) ? `${fmt(best)}–${fmt(end)} ${ampm(end)}` : `${fmt(best)} ${ampm(best)}–${fmt(end)} ${ampm(end)}`,
    start: `${fmt(best)} ${ampm(best)}`,
  }
}
