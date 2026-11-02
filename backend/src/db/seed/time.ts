import { addDays, localDay, localToInstant } from "../../lib/time.js"

export interface Duration {
  minutes?: number
  hours?: number
  days?: number
}

/** Date helpers the seed rows are written with. Everything is relative to the anchor (usually "now"). */
export interface SeedTime {
  anchor: Date
  /** Campus-local date of the anchor, "YYYY-MM-DD". */
  today: string
  /** Campus-local wall time on the anchor's date shifted by dayOffset days. */
  at(dayOffset: number, hhmm: string): Date
  /** Keeps a seeded "past" moment from landing after the anchor: min(t, anchor - 5 minutes). */
  past(t: Date): Date
  ago(d: Duration): Date
  later(d: Duration): Date
  /** Campus-local calendar date shifted by dayOffset days. */
  day(dayOffset: number): string
  minus(t: Date, d: Duration): Date
}

const ms = (d: Duration) => ((d.days ?? 0) * 1440 + (d.hours ?? 0) * 60 + (d.minutes ?? 0)) * 60_000

export function seedTime(anchor: Date, tz: string): SeedTime {
  const today = localDay(anchor, tz)
  const cap = anchor.getTime() - 5 * 60_000
  return {
    anchor,
    today,
    at: (offset, hhmm) => localToInstant(addDays(today, offset), hhmm, tz),
    past: (t) => new Date(Math.min(t.getTime(), cap)),
    ago: (d) => new Date(anchor.getTime() - ms(d)),
    later: (d) => new Date(anchor.getTime() + ms(d)),
    day: (offset) => addDays(today, offset),
    minus: (t, d) => new Date(t.getTime() - ms(d)),
  }
}
