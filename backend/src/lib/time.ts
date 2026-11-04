/**
 * Campus-local dates and times (timetables, class slots and seeded history are campus-local). Pure Intl, no
 * dependencies; correct across DST for zones that have it.
 */
export interface LocalParts {
  y: number
  m: number
  d: number
  hh: number
  mm: number
  /** ISO weekday, 1 = Monday ... 7 = Sunday. */
  isoDow: number
}

const fmtCache = new Map<string, Intl.DateTimeFormat>()
function formatter(tz: string) {
  let f = fmtCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" })
    fmtCache.set(tz, f)
  }
  return f
}
const DOW: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }

export function localParts(at: Date, tz: string): LocalParts {
  const p = Object.fromEntries(formatter(tz).formatToParts(at).map((x) => [x.type, x.value]))
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), hh: Number(p.hour) % 24, mm: Number(p.minute), isoDow: DOW[p.weekday] ?? 1 }
}

/** Minutes the zone is ahead of UTC at that instant. */
function offsetMinutes(at: Date, tz: string): number {
  const p = Object.fromEntries(formatter(tz).formatToParts(at).map((x) => [x.type, x.value]))
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second))
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000)
}

/** The instant of a campus-local calendar date and wall time. */
export function localToInstant(isoDay: string, hhmm: string, tz: string): Date {
  const [y, m, d] = isoDay.split("-").map(Number)
  const [hh, mm] = hhmm.split(":").map(Number)
  const wall = Date.UTC(y, m - 1, d, hh || 0, mm || 0)
  let guess = wall - offsetMinutes(new Date(wall), tz) * 60_000
  guess = wall - offsetMinutes(new Date(guess), tz) * 60_000
  return new Date(guess)
}

export const pad = (n: number) => String(n).padStart(2, "0")

/** Campus-local calendar date of an instant, "YYYY-MM-DD". */
export function localDay(at: Date, tz: string): string {
  const p = localParts(at, tz)
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}

/** "YYYY-MM-DD" shifted by whole days (calendar arithmetic, no time zone involved). */
export function addDays(isoDay: string, n: number): string {
  const [y, m, d] = isoDay.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

/** ISO weekday of a calendar date, 1 = Monday. */
export function isoDow(isoDay: string): number {
  const [y, m, d] = isoDay.split("-").map(Number)
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** "Oct 22, 9:00 AM" in campus time, for messages. */
export function fmtLocal(at: Date, tz: string): string {
  const p = localParts(at, tz)
  const h12 = p.hh % 12 === 0 ? 12 : p.hh % 12
  return `${MONTHS[p.m - 1]} ${p.d}, ${h12}:${pad(p.mm)} ${p.hh < 12 ? "AM" : "PM"}`
}

/** "Oct 22" in campus time. */
export function fmtMonthDay(at: Date, tz: string): string {
  const p = localParts(at, tz)
  return `${MONTHS[p.m - 1]} ${p.d}`
}

/** "Fri, Oct 24" for a calendar date. */
export function fmtWeekdayDate(isoDay: string): string {
  const [, m, d] = isoDay.split("-").map(Number)
  return `${DAYS[isoDow(isoDay) - 1]}, ${MONTHS[m - 1]} ${d}`
}

/** "Nov 2026" for a calendar date. */
export function fmtMonthYear(isoDay: string): string {
  const [y, m] = isoDay.split("-").map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

/** "05:00 PM" <-> minutes since midnight. */
export function slotMinutes(slot: string): number | null {
  const m = /^(0[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/.exec(slot)
  if (!m) return null
  return ((Number(m[1]) % 12) + (m[3] === "PM" ? 12 : 0)) * 60 + Number(m[2])
}
export function slotLabel(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  return `${pad(h % 12 === 0 ? 12 : h % 12)}:${pad(minutes % 60)} ${h < 12 ? "AM" : "PM"}`
}
export const hhmm = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
