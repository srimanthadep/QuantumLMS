import { useEffect, useMemo, useState } from "react"
import { CalendarCheck2, CalendarPlus, Link2, Pencil, Repeat, Save, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DatePicker, TimePicker } from "@/components/ui/date-picker"
import Field from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CustomSelect } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import type { Links } from "@/components/live/SessionScheduleForm"
import { api } from "@/lib/api"
import { cn, dayInZone, lastDayInZone } from "@/lib/utils"
import { InlineAlert } from "../parts"
import MeetingLinkFields from "./MeetingLinkFields"

type LiveBatch = { id: string; name: string; course_id: string; timezone: string; starts_at: string | null; ends_at: string | null }
export type ScheduleRule = Links & {
  id: string
  version: number
  title: string
  teacher_id: string
  timezone: string
  weekdays: number[]
  local_start: string
  duration_minutes: number
  start_date: string
  end_date: string
  generation_error: string | null
}
type Preview = { key: string; rows: { local_date: string; starts_at: string; ends_at: string }[]; future: number }

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const EMPTY_LINKS: Links = { provider: "zoom_link", join_url: "", host_url: "", passcode: "" }

interface ScheduleSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchId: string
  onSaved: () => void
}

/** Plan classes for one batch: one-off or weekly, with meeting links, a date preview and existing schedules. */
export default function ScheduleSheet({ open, onOpenChange, batchId, onSaved }: ScheduleSheetProps) {
  const [batch, setBatch] = useState<LiveBatch | null>(null)
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [rules, setRules] = useState<ScheduleRule[]>([])
  const [rule, setRule] = useState<ScheduleRule | null>(null)
  const [id, setId] = useState<string>(() => crypto.randomUUID())
  const [title, setTitle] = useState("")
  const [teacher, setTeacher] = useState("")
  const [timezone, setTimezone] = useState("Asia/Kolkata")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [time, setTime] = useState("10:00")
  const [duration, setDuration] = useState(90)
  const [repeat, setRepeat] = useState(true)
  const [days, setDays] = useState([1, 3, 5])
  const [links, setLinks] = useState<Links>(EMPTY_LINKS)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  // Load the batch's live settings each time the sheet opens.
  useEffect(() => {
    if (!open) return
    let active = true
    setError("")
    setMessage("")
    setPreview(null)
    setRule(null)
    setId(crypto.randomUUID())
    setTitle("")
    Promise.all([
      api.get<{ batches: LiveBatch[] }>("/live/batches", { bypassCache: true }),
      api.get<Links & { teachers: { id: string; name: string }[]; rules: ScheduleRule[] }>(`/live/batches/${batchId}/settings`, { bypassCache: true }),
    ])
      .then(([b, s]) => {
        if (!active) return
        const meta = b.batches.find((x) => x.id === batchId) ?? null
        setBatch(meta)
        setTimezone(meta?.timezone ?? "Asia/Kolkata")
        setStart(dayInZone(meta?.starts_at, meta?.timezone ?? "Asia/Kolkata"))
        setEnd(lastDayInZone(meta?.ends_at, meta?.timezone ?? "Asia/Kolkata"))
        setLinks({ provider: s.provider === "meet_link" ? "meet_link" : "zoom_link", join_url: s.join_url ?? "", host_url: s.host_url ?? "", passcode: s.passcode ?? "" })
        setTeachers(s.teachers)
        setTeacher(s.teachers[0]?.id ?? "")
        setRules(s.rules)
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : "Could not load schedule settings"))
    return () => {
      active = false
    }
  }, [open, batchId])

  const payload = { batch_id: batchId, title, teacher_id: teacher || undefined, timezone, weekdays: days, local_start: time, duration_minutes: duration, start_date: start, end_date: end, ...links }
  const key = JSON.stringify(payload)
  const previewFresh = preview?.key === key

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save the schedule")
    } finally {
      setBusy(false)
    }
  }

  function edit(r: ScheduleRule) {
    setRule(r)
    setId(r.id)
    setRepeat(true)
    setTitle(r.title)
    setTeacher(r.teacher_id)
    setTimezone(r.timezone)
    setDays(r.weekdays)
    setTime(r.local_start)
    setDuration(r.duration_minutes)
    setStart(r.start_date)
    setEnd(r.end_date)
    setLinks({ provider: r.provider, join_url: r.join_url ?? "", host_url: r.host_url ?? "", passcode: r.passcode ?? "" })
    setPreview(null)
    setMessage("")
  }
  function newSchedule() {
    setRule(null)
    setId(crypto.randomUUID())
    setTitle("")
    setPreview(null)
    setStart(dayInZone(batch?.starts_at, timezone))
    setEnd(lastDayInZone(batch?.ends_at, timezone))
  }

  const blockers = useMemo(() => {
    const list: string[] = []
    if (title.trim().length < 3) list.push("a title (3+ characters)")
    if (!teacher) list.push("a teacher")
    if (!start) list.push(repeat ? "a first date" : "a date")
    if (repeat && !days.length) list.push("at least one weekday")
    if (!Number.isInteger(duration) || duration < 1 || duration > 720) list.push("duration (1–720 min)")
    return list
  }, [title, teacher, start, repeat, days, duration])
  const canSave = blockers.length === 0 && (!repeat || (previewFresh && (preview?.future ?? 0) > 0))

  const save = () =>
    run(async () => {
      if (repeat) {
        const result = await api.post<{ rule: ScheduleRule }>("/live/rules", { ...payload, id, expected_version: rule?.version, apply_to: "future" })
        setRule(result.rule)
        setRules((cur) => [...cur.filter((r) => r.id !== result.rule.id), result.rule])
        setMessage(result.rule.generation_error ?? "Schedule saved. Future classes are ready.")
      } else {
        await api.post("/sessions", { ...payload, id, date: start })
        setId(crypto.randomUUID())
        setMessage("Class saved.")
      }
      onSaved()
    })

  const teacherName = (tid: string) => teachers.find((t) => t.id === tid)?.name ?? "Unassigned"

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent side="right" className="w-full max-w-2xl gap-0 p-0 sm:max-w-2xl">
        <div className="flex min-h-full flex-col">
          <div className="border-b border-border px-6 pb-4 pt-6 pr-12">
            <SheetTitle>{rule ? "Edit weekly schedule" : "Schedule classes"}</SheetTitle>
            <SheetDescription className="mt-1">
              {batch?.name ?? "This batch"} · times in {timezone}. Learners get the meeting link only when joining opens.
            </SheetDescription>
          </div>

          <fieldset disabled={busy} className="flex min-w-0 flex-1 flex-col gap-6 px-6 py-5">
            {error && <InlineAlert tone="danger">{error}</InlineAlert>}
            {message && <InlineAlert tone="success">{message}</InlineAlert>}

            {rules.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">Weekly schedules</p>
                  {rule && (
                    <Button type="button" variant="ghost" size="sm" leftIcon={<CalendarPlus aria-hidden="true" />} onClick={newSchedule}>
                      New schedule
                    </Button>
                  )}
                </div>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {rules.map((r) => (
                    <li key={r.id} className={cn("flex items-center gap-3 px-3 py-2.5", rule?.id === r.id && "bg-primary-soft/50")}>
                      <Repeat className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {r.title} <span className="text-caption font-normal text-subtle-foreground">v{r.version}</span>
                        </p>
                        <p className="truncate text-caption text-muted-foreground">
                          {r.weekdays.map((d) => DAYS[d]).join(", ")} · {r.local_start} · {r.duration_minutes} min · {teacherName(r.teacher_id)}
                        </p>
                        {r.generation_error && <p className="text-caption text-danger">{r.generation_error}</p>}
                      </div>
                      <Button type="button" size="sm" variant="ghost" leftIcon={<Pencil aria-hidden="true" />} onClick={() => edit(r)} disabled={rule?.id === r.id}>
                        {rule?.id === r.id ? "Editing" : "Edit"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 1. What */}
            <section className="space-y-3">
              <StepTitle n={1} title="Class details" />
              <Field label="Title" required>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Live class: RAG deep dive" />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Teacher" required>
                  <CustomSelect
                    value={teacher}
                    placeholder={teachers.length ? "Choose a teacher" : "Assign teachers in Admissions first"}
                    disabled={!teachers.length}
                    onChange={setTeacher}
                    options={teachers.map((t) => ({ value: t.id, label: t.name }))}
                  />
                </Field>
                <Field label="Timezone" hint="IANA name, e.g. Asia/Kolkata">
                  <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                </Field>
              </div>
            </section>

            {/* 2. When */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <StepTitle n={2} title="When" />
                <label className="flex items-center gap-2 text-sm text-foreground">
                  Repeat weekly
                  <Switch aria-label="Repeat weekly" checked={repeat} disabled={Boolean(rule)} onCheckedChange={setRepeat} />
                </label>
              </div>
              {repeat && (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Weekdays">
                  {DAYS.map((day, i) => {
                    const on = days.includes(i)
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setDays(on ? days.filter((d) => d !== i) : [...days, i].sort())}
                        className={cn(
                          "h-9 w-12 rounded-md border text-sm font-medium transition-colors",
                          on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                        )}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label={repeat ? "First date" : "Date"}>
                  <DatePicker value={start} onChange={setStart} placeholder={repeat ? "First date" : "Select date"} clearable={false} />
                </Field>
                {repeat && (
                  <Field label="Last date">
                    <DatePicker value={end} min={start || undefined} onChange={setEnd} placeholder="Last date" />
                  </Field>
                )}
                <Field label="Starts at">
                  <TimePicker value={time} onChange={setTime} placeholder="Start time" clearable={false} />
                </Field>
                <Field label="Minutes">
                  <Input
                    type="number"
                    min={1}
                    max={720}
                    placeholder="90"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value === "" ? Number.NaN : Number(e.target.value))}
                  />
                </Field>
              </div>
              {rule && <InlineAlert tone="warning">Saving changes future classes only. Past, cancelled and individually rescheduled classes stay as they are.</InlineAlert>}
            </section>

            {/* 3. Where */}
            <section className="space-y-3">
              <StepTitle n={3} title="Meeting link" />
              <MeetingLinkFields value={links} onChange={setLinks} />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  leftIcon={<ShieldCheck aria-hidden="true" />}
                  onClick={() =>
                    void run(async () => {
                      await api.post("/live/validate-link", links)
                      setMessage("Link format looks valid. Open the host link to check it with the provider.")
                    })
                  }
                >
                  Check link format
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  leftIcon={<Link2 aria-hidden="true" />}
                  onClick={() =>
                    void run(async () => {
                      await api.put(`/live/batches/${batchId}/settings`, links)
                      setMessage("Saved as this batch's default link for new classes. Existing classes keep their links.")
                    })
                  }
                >
                  Save as batch default
                </Button>
              </div>
            </section>

            {/* 4. Preview */}
            {repeat && (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <StepTitle n={4} title="Preview dates" />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    leftIcon={<CalendarCheck2 aria-hidden="true" />}
                    disabled={!start || !days.length}
                    onClick={() =>
                      void run(async () => {
                        const r = await api.post<{ occurrences: Preview["rows"]; future_count: number }>("/live/rules/preview", payload)
                        setPreview({ key, rows: r.occurrences, future: r.future_count })
                      })
                    }
                  >
                    {previewFresh ? "Refresh preview" : "Preview dates"}
                  </Button>
                </div>
                {previewFresh && preview ? (
                  <div className="rounded-lg border border-border">
                    <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2/60 px-3 py-2 text-caption">
                      <span className="font-medium text-foreground">{preview.future} upcoming classes</span>
                      <span className="text-muted-foreground">{preview.rows.length} dates in range</span>
                    </div>
                    <ul className="max-h-48 divide-y divide-border overflow-y-auto text-caption">
                      {preview.rows.map((o) => (
                        <li key={o.local_date} className="flex justify-between gap-3 px-3 py-1.5">
                          <span className="text-foreground">
                            {new Date(`${o.local_date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {time} {timezone}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">On clock-change days, times that don't exist are rejected; repeated times use the earlier one.</p>
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-border-strong px-3 py-3 text-caption text-muted-foreground">
                    {!start || !days.length ? "Pick a first date and weekdays to preview." : preview ? "Details changed. Preview again before saving." : "Preview the dates before saving a weekly schedule."}
                  </p>
                )}
              </section>
            )}
          </fieldset>

          <div className="sticky bottom-0 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4">
            <p className="text-caption text-muted-foreground">
              {blockers.length ? `Still needed: ${blockers.join(", ")}` : repeat ? (rule ? "Updates future classes only" : previewFresh ? "Creates every class in the preview" : "Preview the dates to continue") : "Creates one class"}
              {rule && (
                <Badge tone="warning" size="sm" className="ml-2">
                  Editing v{rule.version}
                </Badge>
              )}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                Close
              </Button>
              <Button type="button" loading={busy} disabled={!canSave} leftIcon={<Save aria-hidden="true" />} onClick={() => void save()}>
                {rule ? "Save future schedule" : repeat ? "Save schedule" : "Save class"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary-text">{n}</span>
      {title}
    </p>
  )
}
