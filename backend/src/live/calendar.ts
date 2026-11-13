import { badRequest } from "../errors.js"

export interface RuleInput { timezone: string; weekdays: number[]; local_start: string; duration_minutes: number; start_date: string; end_date: string }
export function validTimezone(zone: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: zone }).format(0) } catch { throw badRequest("Choose a valid IANA timezone") }
  return zone
}
function localParts(instant: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(instant)
  const get = (key: string) => Number(parts.find(p => p.type === key)?.value)
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"))
}
/** Resolve wall time without depending on the machine timezone. Reject DST gaps; choose the earlier instant for overlaps. */
export function localInstant(day: string, time: string, zone: string) {
  validTimezone(zone)
  const naive = Date.parse(`${day}T${time}:00Z`)
  if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0, 10) !== day || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw badRequest("Choose a valid local date and time")
  const offsets = new Set([-36,-12,0,12,36].map(hours => { const at = naive+hours*3600000; return localParts(at, zone)-at }))
  const matches = [...offsets].map(offset => naive-offset).filter(at => localParts(at, zone) === naive).sort((a,b) => a-b)
  if (!matches.length) throw badRequest(`${day} ${time} does not exist in ${zone} because of a clock change. Choose another time.`)
  return { instant: new Date(matches[0]), ambiguous: matches.length > 1 }
}
export function occurrences(rule: RuleInput, bounds: { starts_at: Date | null; ends_at: Date | null }) {
  if (!bounds.starts_at || !bounds.ends_at) throw badRequest("Set the batch start and end before creating a schedule")
  validTimezone(rule.timezone)
  const start = Date.parse(`${rule.start_date}T00:00:00Z`), end = Date.parse(`${rule.end_date}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || new Date(start).toISOString().slice(0,10) !== rule.start_date || new Date(end).toISOString().slice(0,10) !== rule.end_date || end < start || end-start > 3*366*86400000) throw badRequest("Choose a valid schedule date range of up to three years")
  if (!rule.weekdays.length || rule.weekdays.some(d => !Number.isInteger(d) || d<0 || d>6)) throw badRequest("Choose at least one weekday (Sunday through Saturday)")
  if (!Number.isInteger(rule.duration_minutes) || rule.duration_minutes<1 || rule.duration_minutes>720) throw badRequest("Class duration must be between 1 and 720 minutes")
  const results: { local_date: string; starts_at: Date; ends_at: Date; ambiguous: boolean }[] = []
  for (let at=start;at<=end;at+=86400000) {
    if (!rule.weekdays.includes(new Date(at).getUTCDay())) continue
    const day = new Date(at).toISOString().slice(0,10), resolved = localInstant(day, rule.local_start, rule.timezone)
    const finish = new Date(resolved.instant.getTime()+rule.duration_minutes*60000)
    if (resolved.instant < bounds.starts_at || finish > bounds.ends_at) throw badRequest(`The class on ${day} falls outside the batch's start/end. Adjust the schedule or batch bounds.`)
    results.push({ local_date: day, starts_at: resolved.instant, ends_at: finish, ambiguous: resolved.ambiguous })
  }
  if (!results.length) throw badRequest("This date range contains no selected weekdays")
  return results
}
