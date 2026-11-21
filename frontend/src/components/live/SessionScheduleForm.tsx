import { useEffect, useState } from "react"
import { Button, CustomSelect, DatePicker, Input, TimePicker } from "@/components/ui"
import { api } from "@/lib/api"

export type Links = { provider: "zoom_link" | "meet_link"; join_url: string; host_url: string; passcode: string }
type Batch = { id: string; name: string; course_id: string; timezone: string; starts_at: string | null; ends_at: string | null }
type Rule = Links & { id: string; version: number; title: string; teacher_id: string; timezone: string; weekdays: number[]; local_start: string; duration_minutes: number; start_date: string; end_date: string; generation_error: string | null }
export function ScheduleField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label> }
export function ProviderFields({ value, onChange }: { value: Links; onChange: (v: Links) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <ScheduleField label="Meeting provider">
      <CustomSelect
        value={value.provider}
        onChange={(v) => onChange({ provider: v as Links["provider"], join_url: "", host_url: "", passcode: "" })}
        options={[
          { value: "zoom_link", label: "Zoom" },
          { value: "meet_link", label: "Google Meet" },
        ]}
      />
    </ScheduleField>
    <ScheduleField label="Student meeting link"><Input type="url" value={value.join_url} onChange={e => onChange({ ...value, join_url: e.target.value })} placeholder={value.provider === "zoom_link" ? "https://zoom.us/j/123456789" : "https://meet.google.com/abc-defg-hij"} /></ScheduleField>
    {value.provider === "zoom_link" && <><ScheduleField label="Host link (optional)"><Input type="url" value={value.host_url} onChange={e => onChange({ ...value, host_url: e.target.value })} /></ScheduleField><ScheduleField label="Passcode (optional)"><Input value={value.passcode} onChange={e => onChange({ ...value, passcode: e.target.value })} /></ScheduleField></>}
  </div>
}
export default function SessionScheduleForm({ batchId, courseId, onSaved }: { batchId?: string; courseId?: string; onSaved: () => void }) {
  const [batches, setBatches] = useState<Batch[]>([]), [selected, setSelected] = useState(batchId ?? "")
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]), [rules, setRules] = useState<Rule[]>([])
  const [rule, setRule] = useState<Rule | null>(null), [id, setId] = useState<string>(() => crypto.randomUUID())
  const [title, setTitle] = useState(""), [teacher, setTeacher] = useState(""), [timezone, setTimezone] = useState("Asia/Kolkata")
  const [start, setStart] = useState(""), [end, setEnd] = useState(""), [time, setTime] = useState("10:00"), [duration, setDuration] = useState(90)
  const [repeat, setRepeat] = useState(true), [days, setDays] = useState([1, 2, 3])
  const [links, setLinks] = useState<Links>({ provider: "zoom_link", join_url: "", host_url: "", passcode: "" })
  const [preview, setPreview] = useState<{ key: string; rows: { local_date: string; starts_at: string; ends_at: string }[]; future: number } | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("")
  useEffect(() => { let active = true; api.get<{ batches: Batch[] }>("/live/batches", { bypassCache: true }).then(r => {
    if (!active) return; const rows = r.batches.filter(b => !courseId || b.course_id === courseId); setBatches(rows); setSelected(batchId ?? rows[0]?.id ?? "")
  }).catch(e => { if (active) setError(e.message) }); return () => { active = false } }, [batchId, courseId])
  useEffect(() => {
    if (!selected) return
    let active = true; setRule(null); setPreview(null); setId(crypto.randomUUID())
    api.get<Links & { teachers: { id: string; name: string }[]; rules: Rule[] }>(`/live/batches/${selected}/settings`, { bypassCache: true }).then(r => {
      if (!active) return
      setLinks({ provider: r.provider === "meet_link" ? "meet_link" : "zoom_link", join_url: r.join_url ?? "", host_url: r.host_url ?? "", passcode: r.passcode ?? "" }); setTeachers(r.teachers); setTeacher(r.teachers[0]?.id ?? ""); setRules(r.rules)
      const batch = batches.find(b => b.id === selected); setTimezone(batch?.timezone ?? "Asia/Kolkata"); setStart(batch?.starts_at?.slice(0, 10) ?? ""); setEnd(batch?.ends_at?.slice(0, 10) ?? "")
    }).catch(e => { if (active) setError(e.message) }); return () => { active = false }
  }, [selected, batches])
  const payload = { batch_id: selected, title, teacher_id: teacher || undefined, timezone, weekdays: days, local_start: time, duration_minutes: duration, start_date: start, end_date: end, ...links }
  const key = JSON.stringify(payload)
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); setMessage(""); try { await action() } catch (e) { setError(e instanceof Error ? e.message : "Unable to save schedule") } finally { setBusy(false) } }
  function edit(r: Rule) { setRule(r); setId(r.id); setRepeat(true); setTitle(r.title); setTeacher(r.teacher_id); setTimezone(r.timezone); setDays(r.weekdays); setTime(r.local_start); setDuration(r.duration_minutes); setStart(r.start_date); setEnd(r.end_date); setLinks({ provider: r.provider, join_url: r.join_url ?? "", host_url: r.host_url ?? "", passcode: r.passcode ?? "" }); setPreview(null) }
  return <section className="space-y-5 rounded-2xl border border-border bg-surface p-5">
    <div><h3 className="text-lg font-semibold">{rule ? "Edit recurring schedule" : "Schedule classes"}</h3><p className="mt-1 text-sm text-muted-foreground">Choose real dates in the batch timezone. Meeting links are shared with eligible learners only when joining opens.</p></div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}{message && <p role="status" className="text-sm text-success">{message}</p>}
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <ScheduleField label="Batch">
          <CustomSelect
            disabled={Boolean(batchId) || Boolean(rule)}
            value={selected}
            placeholder="Choose an assigned batch"
            onChange={setSelected}
            options={batches.map((b) => ({ value: b.id, label: b.name }))}
          />
        </ScheduleField>
        <ScheduleField label="Session title"><Input value={title} onChange={e => setTitle(e.target.value)} /></ScheduleField>
        <ScheduleField label="Assigned teacher">
          <CustomSelect
            value={teacher}
            placeholder="Choose a teacher"
            onChange={setTeacher}
            options={teachers.map((t) => ({ value: t.id, label: t.name }))}
          />
        </ScheduleField>
        <ScheduleField label="Timezone (IANA)"><Input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="Asia/Kolkata" /></ScheduleField>
      </div>
      <ProviderFields value={links} onChange={setLinks} />
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => void run(async () => { await api.post("/live/validate-link", links); setMessage("Valid link format. Open the host link to check the meeting with its provider.") })}>Test link format</Button><Button type="button" variant="outline" size="sm" disabled={!selected} onClick={() => void run(async () => { await api.put(`/live/batches/${selected}/settings`, links); setMessage("Batch defaults saved for new sessions. Existing sessions keep their links.") })}>Save as batch defaults</Button></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={repeat} disabled={Boolean(rule)} onChange={e => setRepeat(e.target.checked)} />Repeat weekly</label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ScheduleField label={repeat ? "First date" : "Class date"}>
          <DatePicker value={start} onChange={setStart} placeholder={repeat ? "First date" : "Class date"} clearable={false} />
        </ScheduleField>
        {repeat && (
          <ScheduleField label="Last date">
            <DatePicker value={end} min={start || undefined} onChange={setEnd} placeholder="Last date" />
          </ScheduleField>
        )}
        <ScheduleField label="Local start time">
          <TimePicker value={time} onChange={setTime} placeholder="Start time" clearable={false} />
        </ScheduleField>
        <ScheduleField label="Duration (minutes)">
          <Input
            type="number"
            min={1}
            max={720}
            placeholder="90"
            value={duration}
            onChange={(e) => setDuration(e.target.value === "" ? Number.NaN : Number(e.target.value))}
          />
        </ScheduleField>
      </div>
      {repeat && <div className="flex flex-wrap gap-2" aria-label="Weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => <Button type="button" size="sm" key={day} variant={days.includes(i) ? "primary" : "outline"} aria-pressed={days.includes(i)} onClick={() => setDays(days.includes(i) ? days.filter(d => d !== i) : [...days, i])}>{day}</Button>)}</div>}
      {rule && <p className="rounded-lg bg-warning-soft p-3 text-sm">Saving changes future sessions only. Past classes, cancellations, and individually rescheduled classes stay unchanged.</p>}
      {repeat && <Button type="button" variant="outline" disabled={!selected || !Number.isInteger(duration) || duration < 1} onClick={() => void run(async () => { const r = await api.post<{ occurrences: NonNullable<typeof preview>["rows"]; future_count: number }>("/live/rules/preview", payload); setPreview({ key, rows: r.occurrences, future: r.future_count }) })}>Preview dates</Button>}
      {repeat && preview?.key === key && <div className="rounded-xl border border-border p-3"><p className="mb-2 text-sm font-medium">{preview.future} future classes · {preview.rows.length} dates in range</p><div className="max-h-44 overflow-auto text-xs text-muted-foreground">{preview.rows.map(o => <p key={o.local_date} className="py-1">{o.local_date} · {time} {timezone} · UTC {new Date(o.starts_at).toISOString().slice(11, 16)}</p>)}</div><p className="mt-2 text-xs text-muted-foreground">Clock changes: nonexistent times are rejected; repeated times use the earlier instant.</p></div>}
      <Button type="button" disabled={!selected || !teacher || title.trim().length < 3 || !Number.isInteger(duration) || duration < 1 || (repeat && (preview?.key !== key || !preview.future))} onClick={() => void run(async () => {
        if (repeat) { const result = await api.post<{ rule: Rule }>("/live/rules", { ...payload, id, expected_version: rule?.version, apply_to: "future" }); setRule(result.rule); setRules(current => [...current.filter(r => r.id !== result.rule.id), result.rule]); setMessage(result.rule.generation_error ?? "Schedule saved. Future class dates are ready.") }
        else { await api.post("/sessions", { ...payload, id, date: start }); setId(crypto.randomUUID()); setMessage("Class saved.") }
        onSaved()
      })}>{busy ? "Saving…" : rule ? "Save future schedule" : "Save schedule"}</Button>
    </fieldset>
    {rules.length > 0 && <details><summary className="cursor-pointer text-sm font-medium">Existing recurring schedules ({rules.length})</summary><div className="mt-3 space-y-2">{rules.map(r => <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 p-3"><div><p className="text-sm">{r.title} · v{r.version}</p>{r.generation_error && <p className="text-xs text-danger">{r.generation_error}</p>}</div><Button type="button" variant="ghost" size="sm" onClick={() => edit(r)}>Edit future dates</Button></div>)}</div></details>}
  </section>
}
