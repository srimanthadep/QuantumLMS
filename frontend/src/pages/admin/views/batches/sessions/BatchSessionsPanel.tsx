import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CalendarX2,
  Clapperboard,
  ExternalLink,
  History,
  Link2,
  MoreHorizontal,
  MousePointerClick,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  Square,
  Video,
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DateTimePicker } from "@/components/ui/date-picker"
import Field from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CustomSelect } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SegmentedControl } from "@/components/ui/tabs"
import type { DatedSession } from "@/components/live/LiveSessionsPanel"
import type { Links } from "@/components/live/SessionScheduleForm"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { deviceTimezone, EmptyBlock, InlineAlert, MiniStat, TabHeader, toLocalInput } from "../parts"
import MeetingLinkFields from "./MeetingLinkFields"
import ScheduleSheet from "./ScheduleSheet"

type View = "upcoming" | "past" | "all"
type Operation = "attendance" | "settings" | "reschedule" | "cancel" | "override"
type JoinRecord = { student_id: string; name: string; joined_at: string; last_joined_at: string; join_clicks: number }

const STATUS_TONE: Record<DatedSession["status"], BadgeTone> = { Scheduled: "info", Live: "live", Ended: "neutral", Cancelled: "danger" }
const PROVIDER: Record<string, string> = { zoom_link: "Zoom", meet_link: "Google Meet" }
const OP_TITLE: Record<Operation, string> = { attendance: "Join records", settings: "Meeting link", reschedule: "Reschedule class", cancel: "Cancel class", override: "Override status" }

const timeLabel = (iso: string, tz?: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: tz })
const dayKey = (iso: string, tz?: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: tz })
function dayHeading(iso: string, tz?: string) {
  const key = dayKey(iso, tz)
  const today = dayKey(new Date().toISOString(), tz)
  const tomorrow = dayKey(new Date(Date.now() + 86_400_000).toISOString(), tz)
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString(), tz)
  const label = new Date(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", timeZone: tz })
  if (key === today) return `Today · ${label}`
  if (key === tomorrow) return `Tomorrow · ${label}`
  if (key === yesterday) return `Yesterday · ${label}`
  return label
}
function countdown(ms: number) {
  const m = Math.max(0, Math.ceil(ms / 60000))
  if (m >= 1440) return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${m}m`
}

interface BatchSessionsPanelProps {
  batchId: string
  /** Opens the Recordings tab with this ended class selected. */
  onManageRecording?: (sessionId: string) => void
}

/** Live sessions tab for one batch: next class, an agenda grouped by day, and every class action. */
export default function BatchSessionsPanel({ batchId, onManageRecording }: BatchSessionsPanelProps) {
  const [sessions, setSessions] = useState<DatedSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [view, setView] = useState<View>("upcoming")
  const [now, setNow] = useState(Date.now())
  const [offset, setOffset] = useState(0)
  const [scheduling, setScheduling] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [hostLink, setHostLink] = useState<{ url: string; passcode?: string | null } | null>(null)

  // Action dialog
  const [selected, setSelected] = useState<DatedSession | null>(null)
  const [operation, setOperation] = useState<Operation>("attendance")
  const [reason, setReason] = useState("")
  const [newStart, setNewStart] = useState("")
  const [newEnd, setNewEnd] = useState("")
  const [override, setOverride] = useState("Scheduled")
  const [links, setLinks] = useState<Links>({ provider: "zoom_link", join_url: "", host_url: "", passcode: "" })
  const [records, setRecords] = useState<JoinRecord[]>([])
  const [dialogError, setDialogError] = useState("")
  const [dialogNote, setDialogNote] = useState("")

  const reload = useCallback(async () => {
    try {
      const r = await api.get<{ sessions: DatedSession[]; now: string }>(`/sessions?${new URLSearchParams({ batch_id: batchId })}`, { bypassCache: true })
      setSessions(r.sessions)
      setOffset(Date.parse(r.now) - Date.now())
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load classes")
    } finally {
      setLoading(false)
    }
  }, [batchId])
  useEffect(() => {
    void reload()
    const t = window.setInterval(() => void reload(), 15000)
    return () => window.clearInterval(t)
  }, [reload])
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const clock = now + offset

  const groups = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    const isUpcoming = (s: DatedSession) => (s.status === "Scheduled" || s.status === "Live") && Date.parse(s.ends_at) + s.join_after_minutes * 60000 >= clock
    const upcoming = sorted.filter(isUpcoming)
    const past = sorted.filter((s) => !isUpcoming(s)).reverse()
    return { upcoming, past, all: sorted }
  }, [sessions, clock])

  const live = groups.upcoming.find((s) => s.status === "Live")
  const nextClass = live ?? groups.upcoming[0]
  const endedCount = sessions.filter((s) => s.status === "Ended").length
  const cancelledCount = sessions.filter((s) => s.status === "Cancelled").length
  const list = groups[view]

  const byDay = useMemo(() => {
    const map = new Map<string, DatedSession[]>()
    for (const s of list) {
      const k = dayKey(s.starts_at, s.timezone)
      map.set(k, [...(map.get(k) ?? []), s])
    }
    return Array.from(map.values())
  }, [list])

  async function run(id: string, action: () => Promise<void>, inDialog = false) {
    setBusy(id)
    if (inDialog) setDialogError("")
    else setError("")
    setMessage("")
    try {
      await action()
      await reload()
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to update this class"
      if (inDialog) setDialogError(msg)
      else setError(msg)
      return false
    } finally {
      setBusy(null)
    }
  }

  async function openHost(s: DatedSession) {
    const popup = window.open("about:blank", "_blank")
    if (popup) popup.opener = null
    setHostLink(null)
    await run(s.id, async () => {
      try {
        const r = await api.post<{ url: string; passcode?: string | null }>(`/sessions/${s.id}/host`, {})
        setHostLink(r)
        if (popup) popup.location.replace(r.url)
        setMessage("Host link opened in a new tab.")
      } catch (e) {
        popup?.close()
        throw e
      }
    })
  }

  async function openDialog(s: DatedSession, op: Operation) {
    setDialogError("")
    setDialogNote("")
    setReason("")
    setRecords([])
    setOperation(op)
    setNewStart(toLocalInput(s.starts_at))
    setNewEnd(toLocalInput(s.ends_at))
    setOverride(s.status)
    setSelected(s)
    if (op === "attendance" || op === "settings") {
      await run(
        s.id,
        async () => {
          if (op === "attendance") {
            const r = await api.get<{ records: JoinRecord[] }>(`/sessions/${s.id}/attendance`, { bypassCache: true })
            setRecords(r.records)
          } else {
            const r = await api.get<{ session: Links }>(`/sessions/${s.id}/settings`, { bypassCache: true })
            setLinks({ provider: r.session.provider, join_url: r.session.join_url ?? "", host_url: r.session.host_url ?? "", passcode: r.session.passcode ?? "" })
          }
        },
        true,
      )
    }
  }

  const submitDialog = () =>
    selected &&
    run(
      selected.id,
      async () => {
        if (operation === "settings") await api.patch(`/sessions/${selected.id}/settings`, links)
        else
          await api.post(`/sessions/${selected.id}/action`, {
            action: operation,
            reason,
            status: override,
            ...(operation === "reschedule" ? { starts_at: new Date(newStart).toISOString(), ends_at: new Date(newEnd).toISOString() } : {}),
          })
        setSelected(null)
        setMessage("Class updated.")
      },
      true,
    )

  return (
    <div className="space-y-5">
      <TabHeader title="Live sessions" description="Every class for this batch, shown in the batch's timezone.">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Reload classes" onClick={() => void reload()}>
          <RefreshCw aria-hidden="true" />
        </Button>
        <Button type="button" size="sm" leftIcon={<CalendarPlus aria-hidden="true" />} onClick={() => setScheduling(true)}>
          Schedule classes
        </Button>
      </TabHeader>

      {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      {message && <InlineAlert tone="success">{message}</InlineAlert>}
      {hostLink && (
        <InlineAlert tone="info">
          <a className="font-medium underline" href={hostLink.url} target="_blank" rel="noopener noreferrer">
            Open the host link again
          </a>
          {hostLink.passcode && <span className="ml-2">Passcode: {hostLink.passcode}</span>}
        </InlineAlert>
      )}

      {/* Next class hero + counts */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] [&>*:first-child]:col-span-3 lg:[&>*:first-child]:col-span-1">
        {loading ? (
          <Skeleton className="h-[116px]" />
        ) : nextClass ? (
          <Card className={cn("flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center", live && "border-success/40")}>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-caption font-medium uppercase tracking-wider text-muted-foreground">
                {live ? (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-success" aria-hidden="true" /> Live now
                  </>
                ) : (
                  <>Next class · in {countdown(Date.parse(nextClass.starts_at) - clock)}</>
                )}
              </p>
              <p className="mt-1 truncate text-[15px] font-semibold text-foreground">{nextClass.title}</p>
              <p className="truncate text-caption text-muted-foreground">
                {dayHeading(nextClass.starts_at, nextClass.timezone)} · {timeLabel(nextClass.starts_at, nextClass.timezone)} · {nextClass.teacher_name ?? "Teacher pending"}
              </p>
            </div>
            <Button size="sm" className="shrink-0" leftIcon={<ExternalLink aria-hidden="true" />} loading={busy === nextClass.id} disabled={Boolean(busy)} onClick={() => void openHost(nextClass)}>
              Open host link
            </Button>
          </Card>
        ) : (
          <Card className="flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">No upcoming classes</p>
              <p className="text-caption text-muted-foreground">Schedule classes to fill the calendar.</p>
            </div>
          </Card>
        )}
        <MiniStat icon={CalendarClock} label="Upcoming" value={groups.upcoming.length} tone="info" active={view === "upcoming"} onClick={() => setView("upcoming")} />
        <MiniStat icon={History} label="Held" value={endedCount} tone="success" hint={cancelledCount ? `${cancelledCount} cancelled` : undefined} active={view === "past"} onClick={() => setView("past")} />
        <MiniStat icon={CalendarDays} label="Total" value={sessions.length} tone="neutral" active={view === "all"} onClick={() => setView("all")} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <SegmentedControl
            size="sm"
            aria-label="Which classes"
            value={view}
            onChange={setView}
            options={[
              { value: "upcoming" as View, label: `Upcoming ${groups.upcoming.length}` },
              { value: "past" as View, label: `Past ${groups.past.length}` },
              { value: "all" as View, label: `All ${groups.all.length}` },
            ]}
          />
          <p className="text-caption text-muted-foreground">Join clicks are counted when learners open the link; presence in the meeting isn't verified.</p>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : list.length === 0 ? (
          <div className="p-4">
            <EmptyBlock
              icon={Video}
              title={view === "past" ? "No past classes yet" : "No classes scheduled"}
              description="Assign a teacher in Admissions & team, then schedule weekly classes or a single session."
            >
              {view !== "past" && (
                <Button size="sm" leftIcon={<CalendarPlus aria-hidden="true" />} onClick={() => setScheduling(true)}>
                  Schedule classes
                </Button>
              )}
            </EmptyBlock>
          </div>
        ) : (
          <div>
            {byDay.map((day) => (
              <section key={day[0].id} aria-label={dayHeading(day[0].starts_at, day[0].timezone)}>
                <h3 className="sticky top-0 z-[1] border-b border-border bg-surface-2/90 px-4 py-1.5 text-caption font-semibold text-muted-foreground backdrop-blur">
                  {dayHeading(day[0].starts_at, day[0].timezone)}
                </h3>
                <ul className="divide-y divide-border">
                  {day.map((s) => {
                    const open = Date.parse(s.starts_at) - s.join_before_minutes * 60000
                    const eligible = s.status === "Scheduled" || s.status === "Live"
                    const canStart = s.status === "Scheduled" && clock >= open && clock <= Date.parse(s.ends_at)
                    const beforeStart = s.status === "Scheduled" && clock < Date.parse(s.starts_at)
                    const rowBusy = busy === s.id
                    return (
                      <li key={s.id} className={cn("flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center", s.status === "Cancelled" && "opacity-70")}>
                        <div className="flex w-full min-w-0 items-start gap-3 sm:items-center">
                          <div className="w-[72px] shrink-0 text-sm tabular-nums">
                            <p className="font-semibold text-foreground">{timeLabel(s.starts_at, s.timezone)}</p>
                            <p className="text-caption text-muted-foreground">{timeLabel(s.ends_at, s.timezone)}</p>
                          </div>
                          <span className={cn("hidden h-10 w-1 shrink-0 rounded-full sm:block", s.status === "Live" ? "bg-success" : s.status === "Cancelled" ? "bg-danger/50" : s.status === "Ended" ? "bg-border-strong" : "bg-info")} aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <p className={cn("truncate text-sm font-medium text-foreground", s.status === "Cancelled" && "line-through")}>{s.title}</p>
                            <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Avatar name={s.teacher_name || "?"} size="xs" />
                                {s.teacher_name ?? "Teacher pending"}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{PROVIDER[s.provider] ?? "No provider"}</span>
                              {s.join_clicks != null && s.status === "Ended" && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{s.join_clicks} join clicks</span>
                                </>
                              )}
                            </p>
                          </div>
                          <Badge tone={STATUS_TONE[s.status]} dot className="shrink-0">
                            {s.status}
                          </Badge>
                        </div>
                        <div className="flex shrink-0 items-center justify-end gap-1.5 pl-[84px] sm:pl-0">
                          {s.status === "Live" && (
                            <Button size="sm" variant="outline" leftIcon={<Square aria-hidden="true" />} disabled={Boolean(busy)} onClick={() => void run(s.id, async () => { await api.post(`/sessions/${s.id}/action`, { action: "end" }); setMessage("Class ended. Upload the recording when it's ready.") })}>
                              End class
                            </Button>
                          )}
                          {canStart && (
                            <Button size="sm" variant="outline" leftIcon={<Play aria-hidden="true" />} disabled={Boolean(busy)} onClick={() => void run(s.id, async () => { await api.post(`/sessions/${s.id}/action`, { action: "start" }); setMessage("Class marked Live.") })}>
                              Start class
                            </Button>
                          )}
                          {s.status === "Ended" && onManageRecording && (
                            <Button size="sm" variant="outline" leftIcon={<Clapperboard aria-hidden="true" />} onClick={() => onManageRecording(s.id)}>
                              Recording
                            </Button>
                          )}
                          {eligible && (
                            <Button size="sm" variant={s.status === "Live" ? "primary" : "ghost"} leftIcon={<ExternalLink aria-hidden="true" />} loading={rowBusy} disabled={Boolean(busy)} onClick={() => void openHost(s)}>
                              Host
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon-sm" variant="ghost" aria-label={`More actions for ${s.title}`} disabled={Boolean(busy)}>
                                <MoreHorizontal aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onSelect={() => void openDialog(s, "attendance")}>
                                <MousePointerClick className="h-4 w-4" aria-hidden="true" /> Join records
                              </DropdownMenuItem>
                              {eligible && (
                                <DropdownMenuItem onSelect={() => void openDialog(s, "settings")}>
                                  <Link2 className="h-4 w-4" aria-hidden="true" /> Meeting link
                                </DropdownMenuItem>
                              )}
                              {beforeStart && (
                                <DropdownMenuItem onSelect={() => void openDialog(s, "reschedule")}>
                                  <CalendarClock className="h-4 w-4" aria-hidden="true" /> Reschedule
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onSelect={() => void openDialog(s, "override")}>
                                <Radio className="h-4 w-4" aria-hidden="true" /> Override status
                              </DropdownMenuItem>
                              {beforeStart && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem destructive onSelect={() => void openDialog(s, "cancel")}>
                                    <CalendarX2 className="h-4 w-4" aria-hidden="true" /> Cancel class
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>

      <ScheduleSheet open={scheduling} onOpenChange={setScheduling} batchId={batchId} onSaved={() => void reload()} />

      <Dialog open={Boolean(selected)} onOpenChange={(v) => !v && !busy && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{OP_TITLE[operation]}</DialogTitle>
            <DialogDescription>
              {selected?.title}
              {selected && ` · ${dayHeading(selected.starts_at, selected.timezone)}, ${timeLabel(selected.starts_at, selected.timezone)}`}
            </DialogDescription>
          </DialogHeader>
          {dialogError && <InlineAlert tone="danger">{dialogError}</InlineAlert>}
          {dialogNote && <InlineAlert tone="success">{dialogNote}</InlineAlert>}

          {operation === "attendance" ? (
            <div className="space-y-3">
              <p className="text-caption text-muted-foreground">Link clicks, not verified presence in the meeting.</p>
              {busy ? (
                <Skeleton className="h-24" />
              ) : records.length ? (
                <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
                  {records.map((r) => (
                    <li key={r.student_id} className="flex items-center gap-3 px-3 py-2">
                      <Avatar name={r.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                        <p className="text-caption text-muted-foreground">First click {new Date(r.joined_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                      </div>
                      <Badge tone="neutral" size="sm">
                        {r.join_clicks} {r.join_clicks === 1 ? "click" : "clicks"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-dashed border-border-strong p-5 text-center text-sm text-muted-foreground">No join clicks recorded for this class.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {operation === "settings" && (
                <>
                  <MeetingLinkFields value={links} onChange={setLinks} />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    leftIcon={<ShieldCheck aria-hidden="true" />}
                    disabled={Boolean(busy)}
                    onClick={() =>
                      selected &&
                      void run(
                        selected.id,
                        async () => {
                          await api.post("/live/validate-link", links)
                          setDialogNote("Link format looks valid.")
                        },
                        true,
                      )
                    }
                  >
                    Check link format
                  </Button>
                </>
              )}
              {operation === "reschedule" && (
                <>
                  <p className="text-caption text-muted-foreground">Times in your device timezone ({deviceTimezone()}). The batch dates still apply.</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="New start">
                      <DateTimePicker value={newStart} onChange={setNewStart} placeholder="Select start date & time" />
                    </Field>
                    <Field label="New end">
                      <DateTimePicker value={newEnd} min={newStart || undefined} onChange={setNewEnd} placeholder="Select end date & time" />
                    </Field>
                  </div>
                </>
              )}
              {operation === "override" && (
                <Field label="Status">
                  <CustomSelect value={override} onChange={setOverride} options={["Scheduled", "Live", "Ended", "Cancelled"]} />
                </Field>
              )}
              {operation !== "settings" && (
                <Field label="Reason" required hint="Saved in the class history.">
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={operation === "cancel" ? "e.g. Instructor unavailable" : "Why this change?"} />
                </Field>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setSelected(null)} disabled={Boolean(busy)}>
              {operation === "attendance" ? "Close" : "Cancel"}
            </Button>
            {operation !== "attendance" && (
              <Button
                variant={operation === "cancel" ? "danger" : "primary"}
                loading={Boolean(busy)}
                disabled={operation !== "settings" && !reason.trim()}
                onClick={() => void submitDialog()}
              >
                {operation === "cancel" ? "Cancel class" : operation === "reschedule" ? "Reschedule" : "Save change"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
