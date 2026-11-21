import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Copy,
  ExternalLink,
  Clapperboard,
  ClipboardList,
  Settings2,
  Users,
  Video,
} from "lucide-react"
import { getCourseCoverArt } from "@/components/shared/CourseCover"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AdminBatch, useAdminStore } from "@/data/adminStore"
import { cn } from "@/lib/utils"
import { NavItem } from "../courses/WorkspaceParts"
import { createBatchFields } from "./BatchFormFields"
import BatchRosterPanel from "./BatchRosterPanel"
import BatchSettingsPanel from "./BatchSettingsPanel"
import BatchAdmissionPanel from "./BatchAdmissionPanel"
import LiveSessionsPanel from "@/components/live/LiveSessionsPanel"
import RecordingLibrary from "@/components/live/RecordingLibrary"
import {
  type BatchEditableFields,
  SHORT_DELIVERY_MODE,
  formatShortDateRange,
  resolveBatchTheme,
  safeHref,
  toBatchPayload,
  validateBatchFields,
} from "./batchTheme"
export type BatchWorkspaceTab = "roster" | "admissions" | "sessions" | "recordings" | "settings"
const WORKSPACE_SECTIONS = [
  { value: "roster", label: "Learners", icon: Users },
  { value: "admissions", label: "Admissions & team", icon: ClipboardList },
  { value: "sessions", label: "Live sessions", icon: Video },
  { value: "recordings", label: "Recordings", icon: Clapperboard },
  { value: "settings", label: "Batch settings", icon: Settings2 },
] as const
interface BatchWorkspaceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: AdminBatch | null
  initialTab?: BatchWorkspaceTab
  store: ReturnType<typeof useAdminStore>
  instructors: string[]
  onDuplicate: (batch: AdminBatch) => Promise<void> | void
  onRequestDelete: (batch: AdminBatch) => void
  onToast?: (msg: string) => void
}
/** Each batch task has its own destination; visited panels retain local drafts. */
export default function BatchWorkspaceModal({
  open,
  onOpenChange,
  batch,
  initialTab = "roster",
  store,
  instructors,
  onDuplicate,
  onRequestDelete,
  onToast,
}: BatchWorkspaceModalProps) {
  const { batches, courses, updateBatch } = store
  const [tab, setTab] = useState<BatchWorkspaceTab>(initialTab)
  const [visited, setVisited] = useState<BatchWorkspaceTab[]>([initialTab])
  const [admissionDirty, setAdmissionDirty] = useState(false)
  const [admissionBusy, setAdmissionBusy] = useState(false)
  const navigateTo = (next: BatchWorkspaceTab) => {
    setVisited((previous) => previous.includes(next) ? previous : [...previous, next])
    setTab(next)
  }
  const contentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
  }, [tab])
  const [liveSnapshot, setLiveSnapshot] = useState<{
    batch: AdminBatch
    count: number
  } | null>(null)
  const [fields, setFields] = useState<BatchEditableFields>(() =>
    createBatchFields(batch, courses),
  )
  const [savedFields, setSavedFields] = useState<BatchEditableFields>(() =>
    createBatchFields(batch, courses),
  )
  const [enrollmentBusy, setEnrollmentBusy] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [settingsErrorField, setSettingsErrorField] =
    useState<keyof BatchEditableFields | null>(null)
  const [settingsErrorAttempt, setSettingsErrorAttempt] = useState(0)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const currentBatch = useMemo(() => {
    if (!batch) return null
    const fresh = batches.find((b) => b.id === batch.id) ?? batch
    if (liveSnapshot && liveSnapshot.batch.id === fresh.id) {
      return {
        ...fresh,
        enrolledSeats: liveSnapshot.batch.enrolledSeats,
        waitlistedSeats: liveSnapshot.batch.waitlistedSeats,
      }
    }
    return fresh
  }, [batch, batches, liveSnapshot])
  const instructorSuggestions = useMemo(() => {
    const names = new Set<string>(instructors)
    return Array.from(names)
  }, [instructors])
  useEffect(() => {
    if (!open || !batch) return
    setTab(initialTab)
    setVisited([initialTab])
    setAdmissionDirty(false)
    setAdmissionBusy(false)
    setLiveSnapshot(null)
    setSettingsError(null)
    const initialFields = createBatchFields(
      batch,
      courses,
      instructorSuggestions[0] || "",
    )
    setFields(initialFields)
    setSavedFields(initialFields)
    setSettingsErrorField(null)
    setConfirmClose(false)
  }, [open, batch?.id, initialTab])
  const handleRosterLoaded = useCallback(
    (loadedBatch: AdminBatch, count: number) => {
      setLiveSnapshot({ batch: loadedBatch, count })
    },
    [],
  )
  const patchFields = (patch: Partial<BatchEditableFields>) => {
    setFields((prev) => ({ ...prev, ...patch }))
    setSettingsError(null)
    setSettingsErrorField(null)
  }
  const dirtySettings = Object.keys(fields).some(
    (key) =>
      fields[(key as keyof BatchEditableFields)] !==
      savedFields[(key as keyof BatchEditableFields)],
  )
  const requestClose = () => {
    if (savingSettings || enrollmentBusy || admissionBusy) return
    if (dirtySettings || admissionDirty) setConfirmClose(true)
    else onOpenChange(false)
  }
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBatch || savingSettings) return
    setSettingsError(null)
    setSettingsErrorField(null)
    setSettingsErrorAttempt((value) => value + 1)
    const { error, selectedCourse, field } = validateBatchFields(
      fields,
      courses,
    )
    if (error || !selectedCourse) {
      setSettingsError(error ?? "Please verify all cohort fields.")
      setSettingsErrorField(field ?? null)
      return
    }
    setSavingSettings(true)
    try {
      // Admission actions can change the stage while a settings draft is open.
      const payload = toBatchPayload({ ...fields, status: currentBatch.status }, selectedCourse)
      const updated = await updateBatch(currentBatch.id, payload)
      const saved = createBatchFields(
        updated ?? { ...currentBatch, ...payload },
        courses,
        instructorSuggestions[0],
      )
      setFields(saved)
      setSavedFields(saved)
      onToast?.(`Saved settings for "${payload.name}"`)
    } catch (err) {
      setSettingsError(
        err instanceof Error ? err.message : "Could not save cohort settings.",
      )
    } finally {
      setSavingSettings(false)
    }
  }
  const handleCloneClick = async () => {
    if (!currentBatch) return
    setDuplicating(true)
    try {
      await onDuplicate(currentBatch)
    } finally {
      setDuplicating(false)
    }
  }
  if (!currentBatch) return null
  const theme = resolveBatchTheme(currentBatch, courses)
  const coverArt = getCourseCoverArt(theme.category)
  const ThemeIcon = coverArt.icon
  const seatPct = Math.min(100, currentBatch.maxSeats > 0 ? Math.round((currentBatch.enrolledSeats / currentBatch.maxSeats) * 100) : 0)
  const meetingHref = safeHref(currentBatch.meetingUrl)
  const navBusy = savingSettings || enrollmentBusy || admissionBusy
  const rosterBadgeCount =
    liveSnapshot?.batch.id === currentBatch.id
      ? liveSnapshot.count
      : currentBatch.enrolledSeats + (currentBatch.waitlistedSeats ?? 0)
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}
    >
      <DialogContent
        hideClose
        containerClassName="p-0 sm:p-0"
        className="flex h-dvh w-screen max-h-dvh max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 text-foreground shadow-none sm:rounded-none"
      >
        <header
          className="relative isolate shrink-0 overflow-hidden bg-ink-950 px-5 pb-5 pt-3 text-white sm:px-7"
          style={{ background: coverArt.background }}
        >
          <svg className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.14]" aria-hidden="true">
            <defs>
              <pattern id="batch-workspace-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#batch-workspace-grid)" />
          </svg>
          <ThemeIcon className="pointer-events-none absolute -right-6 -top-8 -z-10 h-56 w-56 rotate-[-10deg] text-white/[0.06]" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/50 to-transparent" aria-hidden="true" />
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={savingSettings || enrollmentBusy || admissionBusy}
              onClick={requestClose}
              aria-label="Close workspace"
              className="flex items-center gap-2 rounded-md py-1 text-xs font-medium text-white/80 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              All batches
            </button>
            <div className="flex items-center gap-2">
              {meetingHref && (
                <Button asChild variant="outline" size="sm" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  <a
                    href={meetingHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    Open classroom
                  </a>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={duplicating}
                disabled={savingSettings || enrollmentBusy || admissionBusy}
                onClick={handleCloneClick}
                leftIcon={<Copy />}
                className="text-white/80 hover:bg-white/15 hover:text-white"
              >
                Duplicate
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3.5">
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/12 text-white ring-1 ring-white/15 backdrop-blur-md sm:flex">
                <ThemeIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-[11px] font-medium text-white/75">
                  {currentBatch.courseTitle}
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <DialogTitle className="text-xl font-semibold leading-tight text-white sm:text-2xl">
                    {currentBatch.name}
                  </DialogTitle>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-0.5 text-xs font-medium text-white ring-1 ring-white/15 backdrop-blur-md">
                    <span className={cn("h-1.5 w-1.5 rounded-full", currentBatch.status === "Active" ? "bg-emerald-300" : "bg-white")} aria-hidden="true" />
                    {currentBatch.lifecycle ?? currentBatch.status}
                  </span>
                </div>
                <DialogDescription className="sr-only">
                  Manage learners, admissions, live sessions, recordings and settings for this batch.
                </DialogDescription>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/80">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatShortDateRange(
                      currentBatch.startDate,
                      currentBatch.endDate,
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {currentBatch.schedule}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {currentBatch.instructor}
                  </span>
                </div>
              </div>
            </div>

            <dl className="hidden shrink-0 items-center gap-2 md:flex">
              {[
                { label: "Enrolled", value: `${currentBatch.enrolledSeats}/${currentBatch.maxSeats}` },
                { label: "Waitlist", value: String(currentBatch.waitlistedSeats ?? 0) },
                { label: "Delivery", value: SHORT_DELIVERY_MODE[currentBatch.deliveryMode] },
              ].map((s) => (
                <div key={s.label} className="min-w-[84px] rounded-lg border border-white/12 bg-white/10 px-3 py-1.5 text-center backdrop-blur-md">
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-white/70">{s.label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums leading-tight text-white">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Desktop & tablet sidebar: same item, indicator and spacing as the app shell sidebar. */}
          <aside className="hidden w-[var(--shell-sidebar-w)] shrink-0 flex-col overflow-y-auto border-r border-border bg-surface p-3 md:flex">
            <nav aria-label="Batch workspace sections">
              <ul className="flex flex-col gap-0.5">
                {WORKSPACE_SECTIONS.map(({ value, label, icon }) => (
                  <li key={value}>
                    <NavItem
                      icon={icon}
                      label={label}
                      layoutId="batch-workspace-nav"
                      disabled={navBusy}
                      active={tab === value}
                      dirty={(value === "settings" && dirtySettings) || (value === "admissions" && admissionDirty)}
                      count={value === "roster" ? rosterBadgeCount : undefined}
                      onClick={() => navigateTo(value)}
                    />
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mx-2 my-3 h-px bg-border" role="separator" />

            <div className="space-y-3 rounded-xl border border-border bg-surface-2/50 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">Batch snapshot</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Seats</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {currentBatch.enrolledSeats} / {currentBatch.maxSeats}
                  </span>
                </div>
                <Progress value={seatPct} size="sm" tone={seatPct >= 100 ? "danger" : seatPct >= 85 ? "warning" : "primary"} label={`${seatPct}% of seats filled`} />
              </div>
              <dl className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Waitlist</dt>
                  <dd className={cn("font-semibold tabular-nums", (currentBatch.waitlistedSeats ?? 0) > 0 ? "text-warning" : "text-foreground")}>
                    {currentBatch.waitlistedSeats ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Delivery</dt>
                  <dd className="font-semibold text-foreground">{SHORT_DELIVERY_MODE[currentBatch.deliveryMode]}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Stage</dt>
                  <dd className="font-semibold text-foreground">{currentBatch.lifecycle ?? currentBatch.status}</dd>
                </div>
              </dl>
              <p className="truncate border-t border-border pt-3 text-[11px] font-mono tabular-nums text-subtle-foreground" title={currentBatch.id}>
                ID · {currentBatch.id}
              </p>
            </div>
          </aside>

          {/* Mobile section pills */}
          <nav aria-label="Batch workspace sections" className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-2 md:hidden">
            {WORKSPACE_SECTIONS.map(({ value, label, icon }) => (
              <NavItem
                key={value}
                pill
                icon={icon}
                label={label}
                disabled={navBusy}
                active={tab === value}
                dirty={(value === "settings" && dirtySettings) || (value === "admissions" && admissionDirty)}
                count={value === "roster" ? rosterBadgeCount : undefined}
                onClick={() => navigateTo(value)}
              />
            ))}
          </nav>
        <div ref={contentRef} className={cn("min-h-0 min-w-0 flex-1", tab === "settings" || tab === "admissions" ? "overflow-hidden" : "overflow-y-auto p-4 sm:p-7")}>
          <div id="batch-workspace-roster" hidden={tab !== "roster"}>
            <BatchRosterPanel
              batch={currentBatch}
              allBatches={batches}
              store={store}
              onToast={onToast}
              onRosterLoaded={handleRosterLoaded}
              onBusyChange={setEnrollmentBusy}
            />
          </div>
          {visited.includes("admissions") && <div id="batch-workspace-admissions" hidden={tab !== "admissions"} className="h-full">
            <BatchAdmissionPanel key={currentBatch.id} batchId={currentBatch.id} onSaved={store.refreshOperations} onDirtyChange={setAdmissionDirty} onBusyChange={setAdmissionBusy} onOpenSessions={() => navigateTo("sessions")} />
          </div>}
          {visited.includes("sessions") && <div id="batch-workspace-sessions" hidden={tab !== "sessions"} className="mx-auto max-w-5xl">
            <LiveSessionsPanel role="Admin" batchId={currentBatch.id} />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">Before scheduling, set the registration target and assign your teaching team.</p>
              <Button type="button" size="sm" variant="outline" onClick={() => navigateTo("admissions")}>Manage admissions & team</Button>
            </div>
          </div>}
          {visited.includes("recordings") && <div id="batch-workspace-recordings" hidden={tab !== "recordings"} className="mx-auto max-w-5xl">
            <RecordingLibrary role="Admin" batchId={currentBatch.id} />
          </div>}
          <div id="batch-workspace-settings" hidden={tab !== "settings"} className="h-full">
            <BatchSettingsPanel
              batch={currentBatch}
              values={fields}
              savedValues={savedFields}
              courses={courses}
              instructors={instructorSuggestions}
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
              onDelete={() => onRequestDelete(currentBatch)}
            />
          </div>
        </div>
        </div>
        <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
          <DialogContent className="max-w-md">
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              Your {dirtySettings && admissionDirty ? "settings and admission changes" : admissionDirty ? "admission changes" : "batch settings"} haven't been saved. Keep editing, or discard
              your changes to return to all batches.
            </DialogDescription>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmClose(false)
                  navigateTo(admissionDirty ? "admissions" : "settings")
                }}
              >
                Keep editing
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmClose(false)
                  onOpenChange(false)
                }}
              >
                Discard & close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
