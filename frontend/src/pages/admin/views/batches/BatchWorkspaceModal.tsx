import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Copy,
  ExternalLink,
  Settings2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AdminBatch, useAdminStore } from "@/data/adminStore"
import { cn } from "@/lib/utils"
import { createBatchFields } from "./BatchFormFields"
import BatchRosterPanel from "./BatchRosterPanel"
import BatchSettingsPanel from "./BatchSettingsPanel"
import {
  type BatchEditableFields,
  SHORT_DELIVERY_MODE,
  formatShortDateRange,
  resolveBatchTheme,
  safeHref,
  toBatchPayload,
  validateBatchFields,
} from "./batchTheme"
export type BatchWorkspaceTab = "roster" | "settings"
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
/** Focused batch workspace with a shared header and learner/settings navigation. */
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
    courses.forEach((c) => {
      if (c.instructor?.trim()) names.add(c.instructor.trim())
    })
    return Array.from(names)
  }, [courses, instructors])
  useEffect(() => {
    if (!open || !batch) return
    setTab(initialTab)
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
    if (savingSettings || enrollmentBusy) return
    if (dirtySettings) setConfirmClose(true)
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
      const payload = toBatchPayload(fields, selectedCourse)
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
  const ThemeIcon = theme.icon
  const meetingHref = safeHref(currentBatch.meetingUrl)
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
        <header className={cn("relative isolate shrink-0 overflow-hidden bg-gradient-to-r px-4 pb-4 pt-1.5 text-white sm:px-7 sm:pt-2", theme.gradient)}>
          <ThemeIcon className="pointer-events-none absolute -right-6 -top-8 -z-10 h-56 w-56 rotate-[-10deg] text-white/10" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/25 to-transparent" aria-hidden="true" />
          <div className="mb-1 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={savingSettings || enrollmentBusy}
              onClick={requestClose}
              aria-label="Close workspace"
              className="flex items-center gap-2 rounded-md py-1 text-xs font-medium text-white/80 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              All batches
            </button>
            <div className="flex items-center gap-2">
              {meetingHref && (
                <Button asChild variant="outline" size="sm" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
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
                disabled={savingSettings || enrollmentBusy}
                onClick={handleCloneClick}
                leftIcon={<Copy />}
                className="text-white/80 hover:bg-white/15 hover:text-white"
              >
                Duplicate
              </Button>
            </div>
          </div>
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white sm:flex">
              <ThemeIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[11px] font-medium text-white/75">
                {currentBatch.courseTitle}
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <DialogTitle className="text-lg leading-tight text-white sm:text-xl">
                  {currentBatch.name}
                </DialogTitle>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white"><span className={cn("h-1.5 w-1.5 rounded-full", currentBatch.status === "Active" ? "bg-emerald-300" : "bg-white")} aria-hidden="true" />
                  {currentBatch.lifecycle ?? currentBatch.status}
                </span>
              </div>
              <DialogDescription className="sr-only">
                Manage learners, schedule and settings for this batch.
              </DialogDescription>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/80">
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
                <span className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] text-white">
                  {SHORT_DELIVERY_MODE[currentBatch.deliveryMode]}
                </span>
              </div>
            </div>
          </div>

        </header>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="shrink-0 overflow-x-auto border-b border-border bg-surface p-3 md:w-[var(--shell-sidebar-w)] md:overflow-y-auto md:border-b-0 md:border-r">
            <p className="mb-3 hidden px-3 text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground md:block">Batch workspace</p>
          <nav
            aria-label="Batch workspace sections"
            className="flex gap-1 md:flex-col"
          >
            {([
              { value: "roster", label: "Learners", icon: Users },
              { value: "settings", label: "Batch settings", icon: Settings2 },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                disabled={savingSettings || enrollmentBusy}
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors md:w-full",
                  tab === value
                    ? "bg-primary-soft text-primary-text"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
                {value === "roster" && (
                  <span className="ml-auto rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] tabular-nums">
                    {rosterBadgeCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
            <div className="mx-2 mt-5 hidden rounded-xl border border-border bg-surface-2/50 p-3.5 md:block">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">Enrollment</p>
              <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">{currentBatch.enrolledSeats} <span className="text-xs font-normal text-muted-foreground">/ {currentBatch.maxSeats} seats</span></p>
              <p className="mt-1 text-xs text-muted-foreground">{currentBatch.waitlistedSeats ?? 0} on the waitlist</p>
            </div>
          </aside>
        <div ref={contentRef} className={cn("min-h-0 min-w-0 flex-1", tab === "settings" ? "overflow-hidden" : "overflow-y-auto p-4 sm:p-7")}>
          <div hidden={tab !== "roster"}>
            <BatchRosterPanel
              batch={currentBatch}
              allBatches={batches}
              store={store}
              onToast={onToast}
              onRosterLoaded={handleRosterLoaded}
              onBusyChange={setEnrollmentBusy}
            />
          </div>
          <div hidden={tab !== "settings"} className="h-full">
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
              onAdmissionSaved={store.refreshOperations}
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
              Your batch settings haven't been saved. Keep editing, or discard
              your changes to return to all batches.
            </DialogDescription>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmClose(false)
                  setTab("settings")
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
