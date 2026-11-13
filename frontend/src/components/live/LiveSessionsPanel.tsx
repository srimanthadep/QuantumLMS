import { useCallback, useEffect, useState } from "react"
import { CalendarDays, ExternalLink, RefreshCw, Video } from "lucide-react"
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input } from "@/components/ui"
import { api } from "@/lib/api"
import SessionScheduleForm, { ProviderFields, ScheduleField, type Links } from "./SessionScheduleForm"

export interface DatedSession {
  id: string; batch_id: string; batch_name: string; course_id: string; course_title: string; teacher_name: string; title: string
  starts_at: string; ends_at: string; timezone: string; status: "Scheduled" | "Live" | "Ended" | "Cancelled"; provider: string
  actual_start: string | null; actual_end: string | null; join_before_minutes: number; join_after_minutes: number; joined_at: string | null; join_clicks: number | null
}
const dateLabel = (at: string, timezone?: string) => new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: timezone })
export default function LiveSessionsPanel({ role, batchId, sessionId, attendanceOnly = false }: { role: "Student" | "Teacher" | "Admin"; batchId?: string; sessionId?: string; attendanceOnly?: boolean }) {
  const author = role !== "Student"
  const [sessions, setSessions] = useState<DatedSession[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(""), [message, setMessage] = useState("")
  const [filter, setFilter] = useState("upcoming"), [now, setNow] = useState(Date.now()), [offset, setOffset] = useState(0), [scheduling, setScheduling] = useState(false)
  const [busy, setBusy] = useState<string | null>(null), [selected, setSelected] = useState<DatedSession | null>(null), [operation, setOperation] = useState("attendance")
  const [reason, setReason] = useState(""), [newStart, setNewStart] = useState(""), [newEnd, setNewEnd] = useState(""), [override, setOverride] = useState("Scheduled")
  const [links, setLinks] = useState<Links>({ provider: "zoom_link", join_url: "", host_url: "", passcode: "" })
  const [records, setRecords] = useState<{ student_id: string; name: string; joined_at: string; last_joined_at: string; join_clicks: number }[]>([])
  const [target, setTarget] = useState<{ url: string; passcode?: string | null } | null>(null)
  const reload = useCallback(async () => {
    try {
      const query = new URLSearchParams(); if (batchId) query.set("batch_id", batchId); if (sessionId) query.set("id", sessionId)
      if (!sessionId && filter === "upcoming" && !attendanceOnly) query.set("from", new Date().toISOString())
      const r = await api.get<{ sessions: DatedSession[]; now: string }>(`/sessions?${query}`, { bypassCache: true }); setSessions(r.sessions); setOffset(Date.parse(r.now) - Date.now()); setError("")
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load classes") } finally { setLoading(false) }
  }, [batchId, sessionId, filter, attendanceOnly])
  useEffect(() => { void reload(); const timer = window.setInterval(() => void reload(), 15000); return () => window.clearInterval(timer) }, [reload])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  async function run(id: string, action: () => Promise<void>) { setBusy(id); setError(""); setMessage(""); try { await action(); await reload() } catch (e) { setError(e instanceof Error ? e.message : "Unable to update this class") } finally { setBusy(null) } }
  async function openMeeting(s: DatedSession) {
    const popup = window.open("about:blank", "_blank"); if (popup) popup.opener = null
    setTarget(null)
    await run(s.id, async () => {
      try { const r = await api.post<{ url: string; passcode?: string | null }>(`/sessions/${s.id}/${author ? "host" : "join"}`, {}); setTarget(r); if (popup) popup.location.replace(r.url); setMessage(author ? "Host link opened." : "Join click recorded. Presence in the external meeting is not verified.") }
      catch (e) { popup?.close(); throw e }
    })
  }
  async function openDetails(s: DatedSession, action: string) {
    await run(s.id, async () => {
      setReason(""); setOperation(action); setRecords([])
      if (action === "attendance") { const r = await api.get<{ records: typeof records }>(`/sessions/${s.id}/attendance`, { bypassCache: true }); setRecords(r.records) }
      if (action === "settings") { const r = await api.get<{ session: Links }>(`/sessions/${s.id}/settings`, { bypassCache: true }); setLinks({ provider: r.session.provider, join_url: r.session.join_url ?? "", host_url: r.session.host_url ?? "", passcode: r.session.passcode ?? "" }) }
      const local = (v: string) => { const d = new Date(v); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
      setNewStart(local(s.starts_at)); setNewEnd(local(s.ends_at)); setOverride(s.status); setSelected(s)
    })
  }
  return <section className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{attendanceOnly ? "Session attendance" : sessionId ? "Live class" : "Live sessions"}</h2><p className="mt-1 text-sm text-muted-foreground">{attendanceOnly ? "Join clicks are recorded per session. They do not verify presence in Zoom or Google Meet." : "Saved class dates, displayed in each batch’s timezone."}</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => void reload()} leftIcon={<RefreshCw />}>Refresh</Button>{author && <Button type="button" size="sm" onClick={() => setScheduling(!scheduling)} leftIcon={<CalendarDays />}>{scheduling ? "Close scheduler" : "Schedule classes"}</Button>}</div></div>
    {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}{message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    {target && <div className="rounded-xl border border-border bg-surface p-3 text-sm"><a className="font-medium text-primary-text underline" href={target.url} target="_blank" rel="noopener noreferrer">Open {author ? "host" : "meeting"} link</a>{target.passcode && <span className="ml-3">Passcode: {target.passcode}</span>}</div>}
    {scheduling && author && <SessionScheduleForm batchId={batchId} onSaved={() => void reload()} />}
    {!sessionId && !attendanceOnly && <div className="flex gap-2">{["upcoming", "all"].map(value => <Button type="button" size="sm" key={value} variant={filter === value ? "secondary" : "ghost"} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "upcoming" ? "Upcoming" : "All sessions"}</Button>)}</div>}
    {loading ? <p role="status" className="p-6 text-sm text-muted-foreground">Loading classes…</p> : !sessions.length ? <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No sessions available for this view. {author ? "Assign a teacher, set batch dates, and create a schedule to get started." : "Your confirmed batch’s classes will appear after its schedule is saved."}</div> : <div className="space-y-3">{sessions.map(s => {
      const clock = now + offset, open = Date.parse(s.starts_at) - s.join_before_minutes * 60000, close = Date.parse(s.ends_at) + s.join_after_minutes * 60000
      const eligible = ["Scheduled", "Live"].includes(s.status), joinOpen = eligible && clock >= open && clock <= close
      const remaining = Math.max(0, Math.ceil((open - clock) / 60000))
      return <article key={s.id} className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.status === "Live" ? "bg-success-soft text-success" : s.status === "Cancelled" ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted-foreground"}`}>{s.status}</span><span className="text-xs text-muted-foreground">{s.provider === "meet_link" ? "Google Meet" : s.provider === "zoom_link" ? "Zoom" : "Provider unavailable"}</span></div><h3 className="font-semibold">{s.title}</h3><p className="mt-1 text-sm text-muted-foreground">{s.batch_name} · {s.teacher_name ?? "Teacher pending"}</p><p className="mt-3 text-sm">{dateLabel(s.starts_at, s.timezone)} – {new Date(s.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: s.timezone })}</p><p className="mt-1 text-xs text-muted-foreground">{s.timezone}</p>
        {!author && !attendanceOnly && <p className="mt-3 text-xs text-muted-foreground">{!eligible ? "This class has ended or was cancelled." : clock > close ? "The join window has closed." : clock < open ? `Joining opens in ${remaining >= 1440 ? `${Math.floor(remaining / 1440)} days` : remaining >= 60 ? `${Math.floor(remaining / 60)}h ${remaining % 60}m` : `${remaining} minutes`}.` : `Joining is open until ${dateLabel(new Date(close).toISOString(), s.timezone)}.`}</p>}
        {s.joined_at && <p className="mt-2 text-xs text-muted-foreground">First join click: {dateLabel(s.joined_at, s.timezone)} · {s.join_clicks} click(s)</p>}
      </div><div className="flex max-w-md flex-wrap justify-end gap-2">
        {!attendanceOnly && <Button type="button" size="sm" disabled={Boolean(busy) || (author ? s.status === "Cancelled" : !joinOpen)} onClick={() => void openMeeting(s)} leftIcon={author ? <ExternalLink /> : <Video />}>{author ? "Open host link" : "Join class"}</Button>}
        {author && s.status === "Scheduled" && <Button type="button" size="sm" variant="outline" disabled={Boolean(busy) || clock < open || clock > Date.parse(s.ends_at)} onClick={() => void run(s.id, async () => { await api.post(`/sessions/${s.id}/action`, { action: "start" }); setMessage("Class marked Live on the server.") })}>Start class</Button>}
        {author && s.status === "Live" && <Button type="button" size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void run(s.id, async () => { await api.post(`/sessions/${s.id}/action`, { action: "end" }); setMessage("Class ended. Upload the recording when it is ready.") })}>End class</Button>}
        <Button type="button" size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void openDetails(s, "attendance")}>Join records</Button>
        {author && eligible && <Button type="button" size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void openDetails(s, "settings")}>Meeting settings</Button>}
        {author && s.status === "Scheduled" && clock < Date.parse(s.starts_at) && <><Button type="button" size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void openDetails(s, "reschedule")}>Reschedule</Button><Button type="button" size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void openDetails(s, "cancel")}>Cancel</Button></>}
        {role === "Admin" && <Button type="button" size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void openDetails(s, "override")}>Override status</Button>}
      </div></div></article>
    })}</div>}
    <Dialog open={Boolean(selected)} onOpenChange={v => { if (!v) setSelected(null) }}><DialogContent><DialogHeader><DialogTitle>{operation === "attendance" ? "Join-click records" : operation === "settings" ? "Meeting settings" : `${operation[0].toUpperCase()}${operation.slice(1)} class`}</DialogTitle><DialogDescription>{selected?.title}</DialogDescription></DialogHeader>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {operation === "attendance" ? <div className="space-y-3"><p className="text-sm text-muted-foreground">These records count link clicks, not verified presence in the external meeting.</p>{records.length ? records.map(r => <div key={r.student_id} className="border-b border-border py-2 text-sm"><p className="font-medium">{r.name}</p><p className="text-muted-foreground">{dateLabel(r.joined_at)} · {r.join_clicks} click(s)</p></div>) : <p className="text-sm">No join clicks recorded.</p>}</div> : <div className="space-y-4">
        {operation === "settings" ? <><ProviderFields value={links} onChange={setLinks} /><Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => void run(selected!.id, async () => { await api.post("/live/validate-link", links); setMessage("Link format is valid.") })}>Test link format</Button>{message && <p role="status" className="text-sm">{message}</p>}</> : <>
          {operation === "reschedule" && <><p className="text-xs text-muted-foreground">Enter times in your device timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. The batch bounds still apply.</p><ScheduleField label="New start"><Input type="datetime-local" value={newStart} onChange={e => setNewStart(e.target.value)} /></ScheduleField><ScheduleField label="New end"><Input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} /></ScheduleField></>}
          {operation === "override" && <ScheduleField label="Status"><select className="rounded-lg border border-border bg-surface p-2" value={override} onChange={e => setOverride(e.target.value)}>{["Scheduled", "Live", "Ended", "Cancelled"].map(v => <option key={v}>{v}</option>)}</select></ScheduleField>}
          <ScheduleField label="Reason"><Input value={reason} onChange={e => setReason(e.target.value)} /></ScheduleField>
        </>}
        <Button type="button" disabled={Boolean(busy) || (operation !== "settings" && !reason.trim())} onClick={() => void run(selected!.id, async () => {
          if (operation === "settings") await api.patch(`/sessions/${selected!.id}/settings`, links)
          else await api.post(`/sessions/${selected!.id}/action`, { action: operation, reason, status: override, ...(operation === "reschedule" ? { starts_at: new Date(newStart).toISOString(), ends_at: new Date(newEnd).toISOString() } : {}) })
          setSelected(null); setMessage("Class updated.")
        })}>{busy ? "Saving…" : "Save change"}</Button>
      </div>}
    </DialogContent></Dialog>
  </section>
}
