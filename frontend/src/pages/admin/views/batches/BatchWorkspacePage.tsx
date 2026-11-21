import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAdminBase } from "../shared/useAdminBase"
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Globe2,
  Hourglass,
  Link2,
  MonitorPlay,
  MoreHorizontal,
  RotateCcw,
  SearchX,
  Trash2,
  Users,
  Wallet,
  Video,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import EmptyState from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CourseCover from "@/components/shared/CourseCover"
import type { DatedSession } from "@/components/live/LiveSessionsPanel"
import type { AdminBatch, useAdminStore } from "@/data/adminStore"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import ConfirmDialog, { type ConfirmRequest } from "../shared/ConfirmDialog"
import { useTabParam } from "../shared/useTabParam"
import BatchAdmissionPanel from "./BatchAdmissionPanel"
import { createBatchFields } from "./BatchFormFields"
import BatchRosterPanel from "./BatchRosterPanel"
import BatchSettingsPanel from "./BatchSettingsPanel"
import BatchSessionsPanel from "./sessions/BatchSessionsPanel"
import BatchRecordingsPanel from "./recordings/BatchRecordingsPanel"
import {
  batchInstructorNames,
  batchStatusTone,
  batchTimeline,
  formatShortDateRange,
  resolveBatchTheme,
  safeHref,
  seatTone,
  seatUtilization,
  SHORT_DELIVERY_MODE,
  toBatchPayload,
  validateBatchFields,
  type BatchEditableFields,
} from "./batchTheme"

interface BatchWorkspacePageProps {
  store: ReturnType<typeof useAdminStore>
  onToast?: (msg: string) => void
}

const TABS = ["overview", "learners", "admissions", "sessions", "recordings", "settings"] as const
type TabId = (typeof TABS)[number]

/** Full-page batch workspace at /admin/batches/:batchId. */
export default function BatchWorkspacePage({ store, onToast }: BatchWorkspacePageProps) {
  const { batchId = "" } = useParams()
  const navigate = useNavigate()
  const base = useAdminBase()
  const { batches, courses, teachers, updateBatch, duplicateBatch, deleteBatch, refreshOperations } = store

  const [tab, setTabRaw] = useTabParam(TABS, "overview")
  const [visited, setVisited] = useState<Set<TabId>>(() => new Set([tab]))
  const setTab = useCallback(
    (next: string) => {
      setVisited((prev) => (prev.has(next as TabId) ? prev : new Set(prev).add(next as TabId)))
      setTabRaw(next)
    },
    [setTabRaw],
  )
  useEffect(() => {
    setVisited((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)))
  }, [tab])

  // If the batch isn't in the store yet, refresh once before declaring it missing.
  const storeBatch = batches.find((b) => b.id === batchId) ?? null
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    if (storeBatch || checked) return
    let cancelled = false
    refreshOperations()
      .catch(() => {})
      .finally(() => !cancelled && setChecked(true))
    return () => {
      cancelled = true
    }
  }, [storeBatch, checked, refreshOperations])

  // Live seat counts reported by the roster override the cached list numbers.
  const [liveSnapshot, setLiveSnapshot] = useState<{ batch: AdminBatch; count: number } | null>(null)
  const batch = useMemo(() => {
    if (!storeBatch) return null
    if (liveSnapshot && liveSnapshot.batch.id === storeBatch.id) {
      return { ...storeBatch, enrolledSeats: liveSnapshot.batch.enrolledSeats, waitlistedSeats: liveSnapshot.batch.waitlistedSeats }
    }
    return storeBatch
  }, [storeBatch, liveSnapshot])
  const handleRosterLoaded = useCallback((loaded: AdminBatch, count: number) => setLiveSnapshot({ batch: loaded, count }), [])

  const instructors = useMemo(() => batchInstructorNames(teachers), [teachers])

  // ---- Settings draft (ported from the old workspace modal) ----
  const [fields, setFields] = useState<BatchEditableFields>(() => createBatchFields(storeBatch, courses))
  const [savedFields, setSavedFields] = useState<BatchEditableFields>(() => createBatchFields(storeBatch, courses))
  const [initializedFor, setInitializedFor] = useState<string | null>(storeBatch?.id ?? null)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [settingsErrorField, setSettingsErrorField] = useState<keyof BatchEditableFields | null>(null)
  const [settingsErrorAttempt, setSettingsErrorAttempt] = useState(0)
  const [savingSettings, setSavingSettings] = useState(false)
  const [admissionDirty, setAdmissionDirty] = useState(false)
  const [admissionBusy, setAdmissionBusy] = useState(false)
  const [enrollmentBusy, setEnrollmentBusy] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [recordingFocus, setRecordingFocus] = useState<string | null>(null)
  const clearRecordingFocus = useCallback(() => setRecordingFocus(null), [])

  useEffect(() => {
    if (!storeBatch || initializedFor === storeBatch.id) return
    const initial = createBatchFields(storeBatch, courses, instructors[0] || "")
    setFields(initial)
    setSavedFields(initial)
    setInitializedFor(storeBatch.id)
    setLiveSnapshot(null)
    setSettingsError(null)
    setSettingsErrorField(null)
    setAdmissionDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeBatch?.id])

  const settingsDirty = (Object.keys(fields) as (keyof BatchEditableFields)[]).some((k) => fields[k] !== savedFields[k])
  const anyDirty = settingsDirty || admissionDirty
  const busy = savingSettings || enrollmentBusy || admissionBusy

  useEffect(() => {
    if (!anyDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [anyDirty])

  const leaveTo = useCallback(
    (path: string) => {
      if (!anyDirty) return navigate(path)
      setConfirm({
        title: "Leave without saving?",
        description: `Your ${settingsDirty && admissionDirty ? "settings and admission" : admissionDirty ? "admission" : "settings"} changes haven't been saved.`,
        confirmLabel: "Discard and leave",
        onConfirm: () => navigate(path),
      })
    },
    [anyDirty, settingsDirty, admissionDirty, navigate],
  )

  const patchFields = (patch: Partial<BatchEditableFields>) => {
    setFields((prev) => ({ ...prev, ...patch }))
    setSettingsError(null)
    setSettingsErrorField(null)
  }

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault()
    if (!batch || savingSettings) return
    setSettingsError(null)
    setSettingsErrorField(null)
    setSettingsErrorAttempt((v) => v + 1)
    const { error, selectedCourse, field } = validateBatchFields(fields, courses)
    if (error) {
      setSettingsError(error)
      setSettingsErrorField(field ?? null)
      return
    }
    setSavingSettings(true)
    try {
      // Admission actions can change the stage while a settings draft is open.
      const payload = toBatchPayload({ ...fields, status: batch.status }, selectedCourse)
      const updated = await updateBatch(batch.id, payload)
      const saved = createBatchFields(updated ?? { ...batch, ...payload }, courses, instructors[0])
      setFields(saved)
      setSavedFields(saved)
      onToast?.(`Saved "${payload.name}"`)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Could not save batch settings.")
    } finally {
      setSavingSettings(false)
    }
  }

  const handleDuplicate = async () => {
    if (!batch) return
    setDuplicating(true)
    try {
      const copy = await duplicateBatch(batch.id)
      if (copy) {
        onToast?.(`Created "${copy.name}". You're now editing the copy.`)
        leaveTo(`${base}/batches/${copy.id}?tab=settings`)
      } else onToast?.("Could not duplicate the batch.")
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Could not duplicate the batch.")
    } finally {
      setDuplicating(false)
    }
  }

  const handleToggleArchive = async () => {
    if (!batch) return
    const next: AdminBatch["status"] = batch.status === "Archived" ? "Upcoming" : "Archived"
    try {
      await updateBatch(batch.id, { status: next })
      onToast?.(next === "Archived" ? `Archived "${batch.name}"` : `Restored "${batch.name}" to Upcoming`)
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Could not update the batch.")
    }
  }

  const askDelete = () => {
    if (!batch) return
    setConfirm({
      title: `Delete "${batch.name}"?`,
      description: "This permanently deletes the batch and its roster. Course enrollments and submitted work stay in the course.",
      confirmLabel: "Delete batch",
      onConfirm: async () => {
        try {
          await deleteBatch(batch.id)
          onToast?.(`Deleted "${batch.name}"`)
          setFields(savedFields)
          setAdmissionDirty(false)
          navigate(`${base}/batches`)
        } catch (err) {
          onToast?.(err instanceof Error ? err.message : "Could not delete the batch.")
          return false
        }
      },
    })
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      onToast?.("Link copied")
    } catch {
      onToast?.("Could not copy the link")
    }
  }

  if (!batch) {
    if (!checked) {
      return (
        <div className="space-y-4" role="status" aria-label="Loading batch">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-10 w-full max-w-xl" />
        </div>
      )
    }
    return (
      <div className="flex flex-col">
        <PageHeader breadcrumb={[{ label: "Batches", onClick: () => navigate(`${base}/batches`) }, { label: "Not found" }]} title="Batch not found" />
        <EmptyState
          icon={<SearchX aria-hidden="true" />}
          title="This batch doesn't exist"
          description="It may have been deleted. Check the link or go back to all batches."
          action={
            <Button variant="outline" leftIcon={<ArrowLeft aria-hidden="true" />} onClick={() => navigate(`${base}/batches`)}>
              All batches
            </Button>
          }
        />
      </div>
    )
  }

  const theme = resolveBatchTheme(batch, courses)
  const seatPct = seatUtilization(batch.enrolledSeats, batch.maxSeats)
  const timeline = batchTimeline(batch)
  const meetingHref = safeHref(batch.meetingUrl)
  const learnerCount = liveSnapshot?.batch.id === batch.id ? liveSnapshot.count : batch.enrolledSeats + (batch.waitlistedSeats ?? 0)
  const isArchived = batch.status === "Archived"
  const courseExists = courses.some((c) => c.id === batch.courseId)

  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={[{ label: "Batches", onClick: () => leaveTo(`${base}/batches`) }, { label: batch.name }]}
        eyebrow={batch.courseTitle ? (batch.courseCode ? `${batch.courseTitle} · ${batch.courseCode}` : batch.courseTitle) : "Live batch"}
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="min-w-0 break-words">{batch.name}</span>
            <Badge tone={batchStatusTone(batch)} dot>
              {batch.lifecycle ?? batch.status}
            </Badge>
          </span>
        }
        description={[formatShortDateRange(batch.startDate, batch.endDate), batch.schedule, batch.instructor].filter(Boolean).join(" · ")}
        actions={
          <>
            <Button variant="outline" leftIcon={<ArrowLeft aria-hidden="true" />} onClick={() => leaveTo(`${base}/batches`)} className="hidden sm:inline-flex">
              All batches
            </Button>
            {meetingHref && (
              <Button asChild variant="outline">
                <a href={meetingHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" />
                  Open classroom
                </a>
              </Button>
            )}
            <Button variant="outline" leftIcon={<Copy aria-hidden="true" />} loading={duplicating} disabled={busy} onClick={() => void handleDuplicate()}>
              Duplicate
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More batch actions">
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => void copyLink()}>
                  <Link2 className="h-4 w-4" aria-hidden="true" /> Copy page link
                </DropdownMenuItem>
                {courseExists && (
                  <DropdownMenuItem onSelect={() => leaveTo(`${base}/courses/${batch.courseId}`)}>
                    <BookOpen className="h-4 w-4" aria-hidden="true" /> Open course
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => void handleToggleArchive()} disabled={busy}>
                  {isArchived ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
                  {isArchived ? "Restore batch" : "Archive batch"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={askDelete} disabled={busy}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete batch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Summary strip */}
      <Card className="mb-5 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <CourseCover title={batch.name} category={theme.category} showTitle={false} hoverZoom={false} className="hidden md:block md:aspect-auto md:h-full md:min-h-[140px]" />
          <dl className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
            <Stat icon={Users} label="Seats" value={`${batch.enrolledSeats} / ${batch.maxSeats}`}>
              <div className="mt-2">
                <Progress value={seatPct} size="xs" tone={seatTone(seatPct)} label="Seats filled" />
                <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                  {seatPct}% full · {Math.max(0, batch.maxSeats - batch.enrolledSeats)} left
                </p>
              </div>
            </Stat>
            <Stat icon={Clock3} label="Waitlist" value={String(batch.waitlistedSeats ?? 0)} hint={(batch.waitlistedSeats ?? 0) > 0 ? "Waiting for a seat" : "Nobody waiting"} tone={(batch.waitlistedSeats ?? 0) > 0 ? "warning" : undefined} />
            <Stat icon={Hourglass} label="Progress" value={timeline.label}>
              {timeline.pct !== null && (
                <div className="mt-2">
                  <Progress value={timeline.pct} size="xs" tone={timeline.phase === "after" ? "info" : "success"} label="Batch timeline" />
                </div>
              )}
            </Stat>
            <Stat icon={MonitorPlay} label="Delivery" value={SHORT_DELIVERY_MODE[batch.deliveryMode]} hint={batch.timezone} />
          </dl>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab} variant="underline">
        <TabsList aria-label="Batch sections" className="w-full justify-start">
          <TabsTrigger value="overview" disabled={busy}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="learners" disabled={busy}>
            Learners <span className="tabular-nums text-subtle-foreground">{learnerCount}</span>
          </TabsTrigger>
          <TabsTrigger value="admissions" disabled={busy}>
            Admissions &amp; team
            {admissionDirty && <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-label="unsaved changes" />}
          </TabsTrigger>
          <TabsTrigger value="sessions" disabled={busy}>
            Live sessions
          </TabsTrigger>
          <TabsTrigger value="recordings" disabled={busy}>
            Recordings
          </TabsTrigger>
          <TabsTrigger value="settings" disabled={busy}>
            Settings
            {settingsDirty && <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-label="unsaved changes" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <BatchOverview batch={batch} onGo={setTab} />
        </TabsContent>

        {/* These stay mounted once opened so drafts, filters and live counts survive switching tabs. */}
        <TabsContent value="learners" forceMount className="mt-5 data-[state=inactive]:hidden">
          <BatchRosterPanel batch={batch} allBatches={batches} store={store} onToast={onToast} onRosterLoaded={handleRosterLoaded} onBusyChange={setEnrollmentBusy} />
        </TabsContent>
        <TabsContent value="admissions" forceMount className="mt-5 data-[state=inactive]:hidden">
          {visited.has("admissions") && (
            <BatchAdmissionPanel
              key={batch.id}
              batchId={batch.id}
              onSaved={refreshOperations}
              onDirtyChange={setAdmissionDirty}
              onBusyChange={setAdmissionBusy}
              onOpenSessions={() => setTab("sessions")}
            />
          )}
        </TabsContent>
        <TabsContent value="sessions" forceMount className="mt-5 data-[state=inactive]:hidden">
          {visited.has("sessions") && (
            <BatchSessionsPanel
              batchId={batch.id}
              onManageRecording={(sessionId) => {
                setRecordingFocus(sessionId)
                setTab("recordings")
              }}
            />
          )}
        </TabsContent>
        <TabsContent value="recordings" forceMount className="mt-5 data-[state=inactive]:hidden">
          {visited.has("recordings") && <BatchRecordingsPanel batchId={batch.id} focusSessionId={recordingFocus} onFocusHandled={clearRecordingFocus} />}
        </TabsContent>
        <TabsContent value="settings" forceMount className="mt-5 data-[state=inactive]:hidden">
          <BatchSettingsPanel
            batch={batch}
            values={fields}
            savedValues={savedFields}
            courses={courses}
            instructors={instructors}
            saving={savingSettings}
            error={settingsError}
            errorField={settingsErrorField}
            errorAttempt={settingsErrorAttempt}
            onChange={patchFields}
            onSave={handleSaveSettings}
            onReset={() => {
              setFields(savedFields)
              setSettingsError(null)
              setSettingsErrorField(null)
            }}
            onDelete={askDelete}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  children,
}: {
  icon: typeof Users
  label: string
  value: string
  hint?: string
  tone?: "warning"
  children?: ReactNode
}) {
  return (
    <div className="min-w-0 bg-surface p-4">
      <dt className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className={cn("mt-1 truncate text-lg font-semibold tabular-nums tracking-tight text-foreground", tone === "warning" && "text-warning")} title={value}>
        {value}
      </dd>
      {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview: stage, launch checklist, next classes and key details.

type Admission = {
  batch: { lifecycle: string; offer_id: string | null; minimum_paid_registrations: number | null; max_seats: number; registration_deadline: string | null }
  teachers: { id: string }[]
  paid: number
  available: number
}
type Offer = { id: string; status: string; price: number; title: string }

const STAGES = ["Draft", "Recruiting", "Ready", "Scheduled", "Running", "Completed"]

function BatchOverview({ batch, onGo }: { batch: AdminBatch; onGo: (tab: TabId) => void }) {
  const [admission, setAdmission] = useState<Admission | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [sessions, setSessions] = useState<DatedSession[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    setError("")
    Promise.allSettled([
      api.get<Admission>(`/admin/batches/${batch.id}/admission`, { bypassCache: true }),
      api.get<{ offers: Offer[] }>("/admin/offers", { bypassCache: true }),
      api.get<{ sessions: DatedSession[] }>(`/sessions?${new URLSearchParams({ batch_id: batch.id, from: new Date().toISOString() })}`, { bypassCache: true }),
    ]).then(([a, o, s]) => {
      if (cancelled) return
      if (a.status === "fulfilled") setAdmission(a.value)
      if (o.status === "fulfilled") setOffers(o.value.offers ?? [])
      setSessions(s.status === "fulfilled" ? (s.value.sessions ?? []) : [])
      const failed = [a, o, s].find((r) => r.status === "rejected") as PromiseRejectedResult | undefined
      if (failed) setError(failed.reason instanceof Error ? failed.reason.message : "Some batch details could not load.")
    })
    return () => {
      cancelled = true
    }
  }, [batch.id])

  const lifecycle = admission?.batch.lifecycle ?? batch.lifecycle ?? ""
  const stageIndex = STAGES.indexOf(lifecycle)
  const offer = offers.find((o) => o.id === admission?.batch.offer_id)
  const minimum = admission?.batch.minimum_paid_registrations ?? null
  const upcoming = (sessions ?? []).filter((s) => s.status !== "Cancelled").slice(0, 4)

  const steps = admission
    ? [
        { label: "Link a live offer", detail: offer ? `${offer.title}` : "Learners register and pay through it", done: Boolean(offer), tab: "admissions" as TabId },
        { label: "Publish the offer", detail: offer ? `Currently ${offer.status.toLowerCase()}` : "Choose an offer first", done: offer?.status === "Published", tab: "admissions" as TabId },
        { label: "Assign the teaching team", detail: admission.teachers.length ? `${admission.teachers.length} teacher${admission.teachers.length === 1 ? "" : "s"} assigned` : "No teachers yet", done: admission.teachers.length > 0, tab: "admissions" as TabId },
        { label: "Schedule live classes", detail: sessions?.length ? `${sessions.length} upcoming` : "No upcoming classes", done: Boolean(sessions?.length), tab: "sessions" as TabId },
        {
          label: "Reach the minimum registrations",
          detail: minimum !== null ? `${admission.paid} of ${minimum} paid` : `${admission.paid} paid so far`,
          done: minimum !== null ? admission.paid >= minimum : false,
          tab: "learners" as TabId,
        },
      ]
    : []
  const doneCount = steps.filter((s) => s.done).length

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-5">
        {error && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Stage</h3>
              <p className="text-caption text-muted-foreground">Move the batch forward from Admissions &amp; team.</p>
            </div>
            <Button size="sm" variant="outline" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onGo("admissions")}>
              Manage launch
            </Button>
          </div>
          {!admission && !error ? (
            <Skeleton className="h-10 w-full" />
          ) : stageIndex < 0 ? (
            <p className="text-sm text-muted-foreground">{lifecycle ? `This batch is ${lifecycle.toLowerCase()}.` : "Stage unavailable."}</p>
          ) : (
            <ol className="grid grid-cols-3 gap-y-4 sm:grid-cols-6" aria-label="Batch stages">
              {STAGES.map((stage, i) => {
                const done = i < stageIndex
                const current = i === stageIndex
                return (
                  <li key={stage} aria-current={current ? "step" : undefined} className="relative flex flex-col items-center gap-1.5 text-center">
                    {i > 0 && <span className={cn("absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2", i === 3 && "hidden sm:block", i <= stageIndex ? "bg-primary" : "bg-border")} aria-hidden="true" />}
                    <span
                      className={cn(
                        "relative z-[1] flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                        done && "bg-primary text-primary-foreground",
                        current && "bg-surface text-primary-text ring-2 ring-primary",
                        !done && !current && "border border-border bg-surface text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                    </span>
                    <span className={cn("text-[11px]", current ? "font-semibold text-foreground" : "text-muted-foreground")}>{stage}</span>
                  </li>
                )
              })}
            </ol>
          )}
          {admission && (
            <div className="mt-5 grid grid-cols-3 divide-x divide-border rounded-md bg-surface-2 py-3 text-center">
              {[
                { label: "Paid registrations", value: admission.paid },
                { label: "Needed to start", value: minimum ?? "Not set" },
                { label: "Seats available", value: admission.available },
              ].map((m) => (
                <div key={m.label} className="px-2">
                  <p className="text-lg font-semibold tabular-nums text-foreground">{m.value}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Launch checklist</h3>
              <p className="text-caption text-muted-foreground">{admission ? (doneCount === steps.length ? "Ready to run." : `${steps.length - doneCount} left to do`) : "Checking…"}</p>
            </div>
            {admission && (
              <div className="flex w-40 items-center gap-2">
                <Progress value={(doneCount / steps.length) * 100} size="sm" tone={doneCount === steps.length ? "success" : "primary"} label="Checklist progress" />
                <span className="text-caption font-semibold tabular-nums text-foreground">
                  {doneCount}/{steps.length}
                </span>
              </div>
            )}
          </div>
          {!admission ? (
            <div className="space-y-2 border-t border-border p-5">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-2/3" />
            </div>
          ) : (
            <ol className="divide-y divide-border border-t border-border">
              {steps.map((s, i) => (
                <li key={s.label} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", s.done ? "bg-success-soft text-success" : "border border-dashed border-border-strong text-muted-foreground")}
                    aria-hidden="true"
                  >
                    {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", s.done ? "text-muted-foreground" : "text-foreground")}>
                      {s.label}
                      <span className="sr-only">{s.done ? " (done)" : " (to do)"}</span>
                    </p>
                    <p className="truncate text-caption text-muted-foreground">{s.detail}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0 text-primary-text hover:text-primary-text" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onGo(s.tab)}>
                    {s.done ? "View" : "Set up"}
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <div className="flex items-center justify-between gap-3 p-5 pb-3">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Next classes</h3>
              <p className="text-caption text-muted-foreground">Upcoming live sessions</p>
            </div>
            <Button size="sm" variant="ghost" className="text-primary-text hover:text-primary-text" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onGo("sessions")}>
              All
            </Button>
          </div>
          {sessions === null ? (
            <div className="space-y-2 border-t border-border p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="flex flex-col items-start gap-3 border-t border-border px-5 py-5">
              <p className="text-sm text-muted-foreground">No classes scheduled yet.</p>
              <Button size="sm" variant="outline" leftIcon={<Video aria-hidden="true" />} onClick={() => onGo("sessions")}>
                Schedule classes
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {upcoming.map((s) => {
                const d = new Date(s.starts_at)
                return (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md bg-surface-2 text-center" aria-hidden="true">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{d.toLocaleDateString(undefined, { month: "short" })}</span>
                      <span className="text-sm font-semibold tabular-nums leading-none text-foreground">{d.getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                      <p className="truncate text-caption text-muted-foreground">
                        {d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })} · {s.teacher_name}
                      </p>
                    </div>
                    {s.status === "Live" && (
                      <Badge tone="live" size="sm" dot>
                        Live
                      </Badge>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-semibold text-foreground">Details</h3>
          <dl className="space-y-2.5 text-sm">
            <Detail icon={Wallet} label="Price" value={batch.price > 0 ? `₹${batch.price.toLocaleString("en-IN")} one-time` : "Free · by invitation"} />
            <Detail icon={BookOpen} label="Topic" value={batch.courseTitle || "None"} />
            <Detail icon={Users} label="Lead instructor" value={batch.instructor || "Not assigned"} />
            <Detail icon={CalendarDays} label="Dates" value={formatShortDateRange(batch.startDate, batch.endDate)} />
            <Detail icon={Clock3} label="Schedule" value={batch.schedule || "Not set"} />
            <Detail icon={Globe2} label="Timezone" value={batch.timezone} />
            <Detail icon={MonitorPlay} label="Replays" value={batch.deliveryMode === "Self-Paced" ? "Self-paced" : `${batch.replayDelayHours}h after class`} />
            <Detail icon={Hourglass} label="Access" value={`${batch.accessExpiryMonths} months`} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
            {(
              [
                ["liveChat", "Live chat"],
                ["doubtClearing", "Doubt clearing"],
                ["aiTutor", "AI tutor"],
                ["certificate", "Certificate"],
              ] as const
            ).map(([key, label]) => (
              <Badge key={key} tone={batch.features?.[key] ? "primary" : "neutral"} size="sm" className={cn(!batch.features?.[key] && "line-through opacity-70")}>
                {label}
              </Badge>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="mt-3 -ml-2" onClick={() => onGo("settings")}>
            Edit settings
          </Button>
        </Card>
      </div>
    </div>
  )
}

function Detail({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right font-medium text-foreground" title={value}>
        {value}
      </dd>
    </div>
  )
}
