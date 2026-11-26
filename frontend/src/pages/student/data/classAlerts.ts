/** The fields of a timetable row that decide whether a class needs an alert. */
export interface AlertSession {
  id: string
  title: string
  batch_name: string
  starts_at: string
  ends_at: string
  timezone: string
  status: "Scheduled" | "Live" | "Ended" | "Cancelled"
  join_before_minutes: number
}

export type ClassAlertPhase = "soon" | "started"

export interface ClassAlert {
  /** Stable per class, phase and start time, so a rescheduled class alerts again. */
  key: string
  phase: ClassAlertPhase
  session: AlertSession
  /** Whole minutes until the start ("soon" only). */
  minutes: number
}

/** How far ahead of the start a class counts as "about to start": when joining opens, kept between 5 and 30 minutes. */
export function soonWindowMinutes(session: Pick<AlertSession, "join_before_minutes">): number {
  const minutes = Number(session.join_before_minutes)
  return Math.min(30, Math.max(5, Number.isFinite(minutes) && minutes > 0 ? minutes : 15))
}

/** Some timetable rows carry database-style times ("2026-11-25 11:31:00+00") that Safari won't parse as they are. */
export function parseTime(value: string): number {
  const direct = Date.parse(value)
  if (Number.isFinite(direct)) return direct
  return Date.parse(value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"))
}

/** Classes that are about to start or have started. Cancelled and ended classes never alert. */
export function classAlerts(sessions: AlertSession[], now: number): ClassAlert[] {
  const alerts: ClassAlert[] = []
  for (const session of sessions) {
    if (session.status === "Cancelled" || session.status === "Ended") continue
    const start = parseTime(session.starts_at)
    const end = parseTime(session.ends_at)
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue
    if (session.status === "Live" || (now >= start && now < end)) {
      alerts.push({ key: `${session.id}:started:${session.starts_at}`, phase: "started", session, minutes: 0 })
    } else if (now < start && start - now <= soonWindowMinutes(session) * 60_000) {
      alerts.push({ key: `${session.id}:soon:${session.starts_at}`, phase: "soon", session, minutes: Math.max(1, Math.ceil((start - now) / 60_000)) })
    }
  }
  return alerts.sort((a, b) => parseTime(a.session.starts_at) - parseTime(b.session.starts_at))
}

/** "10:00 AM GMT+5:30" in the class's own timezone. */
export function classTimeLabel(iso: string, timezone: string): string {
  try {
    return new Date(parseTime(iso)).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: timezone, timeZoneName: "short" })
  } catch {
    return new Date(parseTime(iso)).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  }
}

/** Whether the server lets the learner join yet: the "soon" window can open before joining does (e.g. join_before_minutes 0). */
function joinOpen(alert: ClassAlert): boolean {
  const before = Number(alert.session.join_before_minutes)
  return Number.isFinite(before) && alert.minutes <= before
}

/** The words for one alert's toast. */
export function classAlertCopy(alert: ClassAlert): { title: string; message: string; description: string; live: boolean } {
  const { session } = alert
  const time = classTimeLabel(session.starts_at, session.timezone)
  if (alert.phase === "soon") {
    return {
      title: "Class starting soon",
      message: `${session.title} starts in ${alert.minutes === 1 ? "1 minute" : `${alert.minutes} minutes`}`,
      description: joinOpen(alert) ? `${session.batch_name} · ${time} · Joining is open` : `${session.batch_name} · ${time}`,
      live: false,
    }
  }
  const live = session.status === "Live"
  return {
    title: live ? "Your class is live" : "Your class has started",
    message: live ? `${session.title} is live now` : `${session.title} started at ${time}`,
    description: `${session.batch_name} · You can join from your timetable`,
    live,
  }
}

const STORE_PREFIX = "quantum_class_alerts:"
const KEEP_MS = 3 * 86_400_000

/** Which alerts this browser already showed, so a refresh or a second tab doesn't repeat them. */
export function seenAlerts(uid: string, now = Date.now()): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_PREFIX + uid) ?? "{}") as Record<string, number>
    return Object.fromEntries(Object.entries(raw).filter(([, at]) => typeof at === "number" && now - at < KEEP_MS))
  } catch {
    return {}
  }
}

export function rememberAlert(uid: string, key: string, now = Date.now()) {
  try {
    localStorage.setItem(STORE_PREFIX + uid, JSON.stringify({ ...seenAlerts(uid, now), [key]: now }))
  } catch {
    // Storage unavailable: the alert may show again after a refresh, which is harmless.
  }
}
