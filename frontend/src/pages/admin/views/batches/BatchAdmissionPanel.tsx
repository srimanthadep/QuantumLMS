import { useCallback, useEffect, useState } from "react"
import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  CircleSlash,
  GitMerge,
  ReceiptText,
  RefreshCw,
  Rocket,
  RotateCcw,
  Save,
  ShieldAlert,
  Timer,
  Users,
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DateTimePicker } from "@/components/ui/date-picker"
import Field from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { CustomSelect } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import ConfirmDialog, { type ConfirmRequest } from "../shared/ConfirmDialog"
import { formatINR } from "../courses/courseTheme"
import { deviceTimezone, InlineAlert, SectionCard, StickySaveBar, TabHeader, toLocalInput } from "./parts"

type Teacher = { id: string; name: string; role: string; disabled_at: string | null; provisioning_state: string }
type Admission = {
  batch: {
    lifecycle: string
    offer_id: string | null
    course_id?: string | null
    minimum_paid_registrations: number | null
    max_seats: number
    starts_at: string | null
    ends_at: string | null
    registration_deadline: string | null
    allow_late_join: boolean
    timezone: string
  }
  teachers: { id: string }[]
  paid: number
  available: number
  price: number
}
type Draft = { selected: string[]; minimum: number | ""; starts: string; ends: string; deadline: string; late: boolean }

interface BatchAdmissionPanelProps {
  batchId: string
  onSaved?: () => Promise<unknown>
  onDirtyChange?: (dirty: boolean) => void
  onBusyChange?: (busy: boolean) => void
  onOpenSessions: () => void
}

const STAGES = ["Draft", "Recruiting", "Ready", "Scheduled", "Running", "Completed"]
const STAGE_HELP: Record<string, string> = {
  Draft: "Set the price, dates and team, then open registration.",
  Recruiting: "Registration is open. Mark ready once enough learners have paid.",
  Ready: "Enough registrations. Schedule the classes next.",
  Scheduled: "Classes are planned. Start the batch on day one.",
  Running: "Classes are under way. Complete the batch when it ends.",
  Completed: "This batch has finished.",
}
const TRANSITIONS: Record<string, string[]> = { Draft: ["Recruiting"], Recruiting: ["Ready"], Ready: ["Scheduled", "Recruiting"], Scheduled: ["Running", "Recruiting"], Running: ["Completed"] }
const TRANSITION_LABEL: Record<string, string> = { Recruiting: "Open registration", Ready: "Mark ready to launch", Scheduled: "Mark as scheduled", Running: "Start batch", Completed: "Complete batch" }
const EMPTY: Draft = { selected: [], minimum: "", starts: "", ends: "", deadline: "", late: false }

/** Admissions & team: stage, registration offer, enrollment rules, teachers and exceptions. Same endpoints as before. */
export default function BatchAdmissionPanel({ batchId, onSaved, onDirtyChange, onBusyChange, onOpenSessions }: BatchAdmissionPanelProps) {
  const [data, setData] = useState<Admission | null>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [savedDraft, setSavedDraft] = useState<Draft>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [targets, setTargets] = useState<{ id: string; name: string }[]>([])
  const [target, setTarget] = useState("")
  const [showExceptions, setShowExceptions] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft)
  const patch = (changes: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...changes }))
    setMessage("")
  }

  const load = useCallback(
    async (resetDraft = true) => {
      const [admission, faculty, batches] = await Promise.all([
        api.get<Admission>(`/admin/batches/${batchId}/admission`, { bypassCache: true }),
        api.get<{ teachers: Teacher[] }>("/admin/teachers", { bypassCache: true }),
        api.get<{ batches: { id: string; name: string }[] }>("/admin/batches", { bypassCache: true }),
      ])
      setData(admission)
      setTeachers(faculty.teachers.filter((t) => t.role === "Teacher" && !t.disabled_at && t.provisioning_state === "active"))
      setTargets(batches.batches.filter((b) => b.id !== batchId))
      if (resetDraft) {
        const defaultMin = admission.batch.minimum_paid_registrations ?? Math.ceil(admission.batch.max_seats * 0.6)
        const next: Draft = {
          selected: admission.teachers.map((t) => t.id).sort(),
          minimum: admission.price > 0 && defaultMin > 0 ? defaultMin : "",
          starts: toLocalInput(admission.batch.starts_at),
          ends: toLocalInput(admission.batch.ends_at),
          deadline: toLocalInput(admission.batch.registration_deadline),
          late: admission.batch.allow_late_join,
        }
        setDraft(next)
        setSavedDraft(next)
      }
    },
    [batchId],
  )
  useEffect(() => {
    void load().catch((e) => setError(e.message))
  }, [load])
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange])
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange])

  async function perform(action: () => Promise<unknown>, success: string, resetDraft = false) {
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await action()
      await load(resetDraft)
      await onSaved?.()
      setMessage(success)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save changes")
      return false
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    perform(
      () =>
        api.patch(`/admin/batches/${batchId}/admission`, {
          minimum_paid_registrations: draft.minimum === "" ? 0 : draft.minimum,
          teacher_ids: draft.selected,
          allow_late_join: draft.late,
          ...(draft.starts ? { starts_at: new Date(draft.starts).toISOString() } : {}),
          ...(draft.ends ? { ends_at: new Date(draft.ends).toISOString() } : {}),
          ...(draft.deadline ? { registration_deadline: new Date(draft.deadline).toISOString() } : {}),
        }),
      "Admissions and teaching team saved",
      true,
    )

  const askCancelBatch = () =>
    setConfirm({
      title: "Cancel this batch?",
      description: "Registration access is revoked for this batch. Paid learners need refunds; their other purchases stay active.",
      confirmLabel: "Cancel batch",
      onConfirm: () => perform(() => api.post(`/admin/batches/${batchId}/underfilled`, { action: "cancel" }), "Batch cancelled"),
    })

  if (!data) {
    return (
      <div className="space-y-5">
        <TabHeader title="Admissions & team" description="Registration, dates, teachers and the batch's launch stage." />
        {error ? (
          <InlineAlert
            tone="danger"
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setError("")
                  void load().catch((e) => setError(e.message))
                }}
              >
                Try again
              </Button>
            }
          >
            {error}
          </InlineAlert>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]" role="status" aria-label="Loading admissions">
            <div className="space-y-5">
              <Skeleton className="h-48" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-80" />
          </div>
        )}
      </div>
    )
  }

  const lifecycle = data.batch.lifecycle
  const stageIndex = STAGES.indexOf(lifecycle)
  const next = TRANSITIONS[lifecycle] ?? []
  const isPaid = data.price > 0
  const minimum = typeof savedDraft.minimum === "number" ? savedDraft.minimum : 0
  const draftMin = typeof draft.minimum === "number" ? draft.minimum : 0
  const paidPct = minimum > 0 ? Math.min(100, Math.round((data.paid / minimum) * 100)) : data.paid > 0 ? 100 : 0
  const teacherById = new Map(teachers.map((t) => [t.id, t]))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
      className="space-y-5"
    >
      <TabHeader title="Admissions & team" description="Registration, dates, teachers and the batch's launch stage.">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Reload admissions" disabled={busy} onClick={() => void load(!dirty).catch((e) => setError(e.message))}>
          <RefreshCw aria-hidden="true" />
        </Button>
      </TabHeader>

      {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      {message && <InlineAlert tone="success">{message}</InlineAlert>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          {/* Price */}
          <SectionCard icon={ReceiptText} title="How learners join" description={isPaid ? "Learners pay once at checkout to take a seat." : "This batch is free. Your team adds learners directly."}>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-2/60 px-3 py-2.5">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-foreground">{isPaid ? `${formatINR(data.price)} one-time` : "Free · by invitation"}</p>
                <p className="text-caption text-muted-foreground">
                  {isPaid
                    ? lifecycle === "Draft"
                      ? "Checkout opens when you open registration."
                      : lifecycle === "Recruiting"
                        ? "Checkout is open to learners now."
                        : "Seats are filled in this stage."
                    : "Add learners from Learners. There is no checkout for free batches."}
                </p>
              </div>
              <Badge tone={isPaid ? "primary" : "neutral"} size="sm">
                {isPaid ? "Paid" : "Free"}
              </Badge>
            </div>
            <p className="mt-3 text-caption text-muted-foreground">Change the price in Settings. It is locked once the batch is running.</p>
          </SectionCard>

          {/* Target & dates */}
          <SectionCard icon={CalendarClock} title="Enrollment target and dates" description={`Times use your device timezone (${deviceTimezone()}). Class times are set in Live sessions.`}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {isPaid && (
                <Field
                  label="Minimum paid registrations"
                  hint={data.batch.max_seats ? `${Math.round((draftMin / data.batch.max_seats) * 100) || 0}% of ${data.batch.max_seats} seats` : undefined}
                >
                  <Input
                    type="number"
                    min={0}
                    max={data.batch.max_seats}
                    placeholder="e.g. 30"
                    value={draft.minimum}
                    onChange={(e) => patch({ minimum: e.target.value === "" ? "" : Number(e.target.value) })}
                  />
                </Field>
              )}
              <Field label="Registration deadline" hint="Defaults to 3 days before the start.">
                <DateTimePicker value={draft.deadline} onChange={(deadline) => patch({ deadline })} placeholder="Select registration deadline" />
              </Field>
              <Field label="Batch starts">
                <DateTimePicker value={draft.starts} onChange={(starts) => patch({ starts })} placeholder="Select start date & time" />
              </Field>
              <Field label="Batch ends">
                <DateTimePicker value={draft.ends} min={draft.starts || undefined} onChange={(ends) => patch({ ends })} placeholder="Select end date & time" />
              </Field>
            </div>
            <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
              <span>
                <span className="block text-sm font-medium text-foreground">Allow late joining</span>
                <span className="block text-caption text-muted-foreground">Learners can still register after the batch starts.</span>
              </span>
              <Switch aria-label="Allow late joining" checked={draft.late} onCheckedChange={(v) => patch({ late: v })} />
            </label>
          </SectionCard>

          {/* Teaching team */}
          <SectionCard
            icon={Users}
            title="Teaching team"
            description="Teachers who deliver classes. The lead instructor is set in Settings."
            actions={
              <Badge tone="primary" size="sm">
                {draft.selected.length} selected
              </Badge>
            }
          >
            {teachers.length ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {teachers.map((t) => {
                  const on = draft.selected.includes(t.id)
                  return (
                    <label
                      key={t.id}
                      className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors", on ? "border-primary-border bg-primary-soft/60" : "border-border hover:bg-surface-2")}
                    >
                      <Checkbox
                        aria-label={t.name}
                        checked={on}
                        onCheckedChange={(checked) => patch({ selected: checked ? [...draft.selected, t.id].sort() : draft.selected.filter((id) => id !== t.id) })}
                      />
                      <Avatar name={t.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{t.name}</span>
                        <span className="block text-caption text-muted-foreground">Teacher</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border-strong p-5 text-center text-sm text-muted-foreground">No active teachers yet. Add one from Teachers first.</p>
            )}
          </SectionCard>

          {/* Exceptions */}
          <SectionCard
            icon={ShieldAlert}
            title="Exceptions"
            description="Extend registration, refund, merge or cancel an under-filled batch."
            actions={
              <Button type="button" variant="ghost" size="sm" aria-expanded={showExceptions} onClick={() => setShowExceptions((v) => !v)} rightIcon={<ChevronDown className={cn("transition-transform", showExceptions && "rotate-180")} aria-hidden="true" />}>
                {showExceptions ? "Hide" : "Show"}
              </Button>
            }
          >
            {showExceptions && (
              <div className="space-y-4">
                {dirty && <InlineAlert tone="warning">Save your changes before using these actions.</InlineAlert>}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start"
                    leftIcon={<Timer aria-hidden="true" />}
                    disabled={dirty || !draft.deadline}
                    onClick={() =>
                      void perform(() => api.post(`/admin/batches/${batchId}/underfilled`, { action: "extend", deadline: new Date(draft.deadline).toISOString() }), "Registration extended")
                    }
                  >
                    Extend to saved deadline
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start"
                    leftIcon={<RotateCcw aria-hidden="true" />}
                    disabled={dirty}
                    onClick={() => void perform(() => api.post(`/admin/batches/${batchId}/underfilled`, { action: "refund" }), "Refunds requested")}
                  >
                    Request refunds
                  </Button>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Merge into" className="min-w-[200px] flex-1">
                    <CustomSelect
                      value={target}
                      placeholder={targets.length ? "Choose a batch" : "No other batches"}
                      disabled={!targets.length}
                      onChange={setTarget}
                      options={targets.map((b) => ({ value: b.id, label: b.name }))}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="outline"
                    leftIcon={<GitMerge aria-hidden="true" />}
                    disabled={dirty || !target}
                    onClick={() => void perform(() => api.post(`/admin/batches/${batchId}/underfilled`, { action: "merge", target_batch_id: target }), "Batches merged")}
                  >
                    Merge
                  </Button>
                </div>
                <p className="text-caption text-muted-foreground">A merge keeps registration history. Cancelling requires paid learners to be refunded.</p>
                <div className="flex justify-end border-t border-border pt-4">
                  <Button type="button" variant="outline" className="border-danger/30 text-danger hover:bg-danger-soft hover:text-danger" disabled={dirty} leftIcon={<CircleSlash aria-hidden="true" />} onClick={askCancelBatch}>
                    Cancel batch
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>
        </fieldset>

        {/* Stage rail */}
        <div className="min-w-0 space-y-5 xl:sticky xl:top-4 xl:self-start">
          <SectionCard icon={Rocket} title="Launch stage" description={STAGE_HELP[lifecycle] ?? `This batch is ${lifecycle.toLowerCase()}.`}>
            <ol className="space-y-0" aria-label="Batch stages">
              {STAGES.map((stage, i) => {
                const done = stageIndex >= 0 && i < stageIndex
                const current = i === stageIndex
                return (
                  <li key={stage} aria-current={current ? "step" : undefined} className="relative flex items-center gap-3 py-1.5">
                    {i < STAGES.length - 1 && <span className={cn("absolute left-[13px] top-[30px] h-[calc(100%-18px)] w-0.5", done ? "bg-primary" : "bg-border")} aria-hidden="true" />}
                    <span
                      className={cn(
                        "relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        done && "bg-primary text-primary-foreground",
                        current && "bg-surface text-primary-text ring-2 ring-primary",
                        !done && !current && "border border-border bg-surface text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                    </span>
                    <span className={cn("text-sm", current ? "font-semibold text-foreground" : done ? "text-muted-foreground" : "text-subtle-foreground")}>{stage}</span>
                    {current && (
                      <Badge tone="primary" size="sm" className="ml-auto">
                        Now
                      </Badge>
                    )}
                  </li>
                )
              })}
            </ol>

            <div className="mt-4 rounded-md bg-surface-2 p-3">
              <div className="mb-1.5 flex items-center justify-between text-caption">
                <span className="text-muted-foreground">Paid registrations</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {data.paid} / {minimum || "—"}
                </span>
              </div>
              <Progress value={paidPct} size="sm" tone={paidPct >= 100 ? "success" : "primary"} label="Paid registrations toward the minimum" />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {data.available} {data.available === 1 ? "seat" : "seats"} still available
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {dirty && <p className="text-caption text-warning">Save your changes before moving the stage.</p>}
              {next.length ? (
                next.map((state, i) => (
                  <Button
                    key={state}
                    type="button"
                    block
                    variant={i === 0 ? "primary" : "outline"}
                    disabled={dirty || busy}
                    rightIcon={<ArrowRight aria-hidden="true" />}
                    onClick={() => void perform(() => api.post(`/admin/batches/${batchId}/transition`, { state }), `Batch is now ${state}`)}
                  >
                    {state === "Recruiting" && lifecycle !== "Draft" ? "Reopen registration" : TRANSITION_LABEL[state]}
                  </Button>
                ))
              ) : (
                <p className="text-caption text-muted-foreground">No further stages.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Plan the classes"
            description="Pick recurring days, times and meeting links."
            actions={
              <Button type="button" size="sm" variant="outline" rightIcon={<ArrowRight aria-hidden="true" />} onClick={onOpenSessions}>
                Live sessions
              </Button>
            }
          />

          {draft.selected.length > 0 && (
            <SectionCard title="Assigned team">
              <ul className="space-y-2">
                {draft.selected.map((id) => (
                  <li key={id} className="flex items-center gap-2 text-sm text-foreground">
                    <Avatar name={teacherById.get(id)?.name ?? "?"} size="xs" />
                    <span className="truncate">{teacherById.get(id)?.name ?? "Unavailable teacher"}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>

      {dirty && (
        <StickySaveBar message="Admissions have unsaved changes">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              setDraft(savedDraft)
              setError("")
              setMessage("")
            }}
          >
            Discard
          </Button>
          <Button type="submit" size="sm" loading={busy} leftIcon={<Save aria-hidden="true" />}>
            Save admissions
          </Button>
        </StickySaveBar>
      )}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </form>
  )
}
