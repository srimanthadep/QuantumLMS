import RecordingLibrary from "@/components/live/RecordingLibrary"
import LiveSessionsPanel from "@/components/live/LiveSessionsPanel"
import BatchAdmissionPanel from "./BatchAdmissionPanel"
import { useEffect, useRef } from "react"
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Layers,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AdminBatch, AdminCourse } from "@/data/adminStore"
import { cn } from "@/lib/utils"
import BatchFormFields from "./BatchFormFields"
import {
  type BatchEditableFields,
} from "./batchTheme"

interface BatchSettingsPanelProps {
  batch: AdminBatch
  values: BatchEditableFields
  savedValues: BatchEditableFields
  courses: AdminCourse[]
  instructors: string[]
  saving: boolean
  error: string | null
  errorField: keyof BatchEditableFields | null
  errorAttempt: number
  onChange: (patch: Partial<BatchEditableFields>) => void
  onSave: (event: React.FormEvent) => void
  onReset: () => void
  onDelete: () => void
  onAdmissionSaved?: () => Promise<unknown>
}

const SECTIONS = [
  {
    id: "details",
    label: "Batch details",
    hint: "Course, instructor & status",
    icon: Layers,
    fields: ["name", "courseId", "instructor", "status"],
  },
  {
    id: "schedule",
    label: "Schedule & delivery",
    hint: "Dates, classroom & capacity",
    icon: CalendarDays,
    fields: [
      "startDate",
      "endDate",
      "schedule",
      "timezone",
      "maxSeats",
      "deliveryMode",
      "meetingUrl",
      "replayDelayHours",
      "accessExpiryMonths",
    ],
  },
  {
    id: "access",
    label: "Learner experience",
    hint: "Support, access & notes",
    icon: ShieldCheck,
    fields: ["liveChat", "doubtClearing", "aiTutor", "certificate", "notes"],
  },
] as const

export default function BatchSettingsPanel({
  batch,
  values,
  savedValues,
  courses,
  instructors,
  saving,
  error,
  errorField,
  errorAttempt,
  onChange,
  onSave,
  onReset,
  onDelete,
  onAdmissionSaved,
}: BatchSettingsPanelProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const dirty = Object.keys(values).some((key) =>
    values[key as keyof BatchEditableFields] !== savedValues[key as keyof BatchEditableFields],
  )
  const sectionDirty = (fields: ReadonlyArray<keyof BatchEditableFields>) =>
    fields.some((key) => values[key] !== savedValues[key])

  useEffect(() => {
    if (!error || !errorField) return
    const input = formRef.current?.querySelector<HTMLElement>(`[id="batch-settings-${errorField}"]`)
    input?.focus()
    input?.scrollIntoView({ block: "center" })
  }, [error, errorField, errorAttempt])

  return (
    <form ref={formRef} onSubmit={onSave} noValidate className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-7 sm:py-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-text">Manage your cohort</p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Batch settings</h2>
              <p className="mt-2 text-sm text-muted-foreground">Fine-tune the essentials, plan your sessions and shape the learner experience.</p>
            </div>
            <span role="status" className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs", dirty ? "border-warning/25 bg-warning-soft text-warning" : "border-border bg-surface text-muted-foreground")}>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {saving ? "Saving changes…" : dirty ? "Unsaved changes" : "All changes saved"}
            </span>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" />{batch.courseTitle}</span>
            <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" aria-hidden="true" />{batch.enrolledSeats} / {batch.maxSeats} seats filled</span>
            <span>{batch.instructor}</span>
          </div>

          <nav aria-label="Settings sections" className="mb-7 grid grid-cols-3 gap-2 sm:gap-3">
            {SECTIONS.map(({ id, label, icon: Icon, fields }, index) => (
              <button key={id} type="button" onClick={() => formRef.current?.querySelector(`[data-settings-section="${id}"]`)?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}
                className="group relative flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-left transition-colors hover:border-primary-border hover:bg-primary-soft sm:flex-row sm:items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground group-hover:text-primary-text"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <span className="text-xs font-medium text-foreground"><span className="mb-0.5 hidden text-[10px] text-subtle-foreground sm:block">0{index + 1}</span>{label}</span>
                {sectionDirty(fields) && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-warning" aria-label="Contains unsaved changes" />}
              </button>
            ))}
          </nav>

          {error && <div role="alert" className="mb-5 rounded-xl border border-danger/25 bg-danger-soft p-4 text-sm text-danger">{error}</div>}

          <fieldset disabled={saving} className="min-w-0 space-y-6" aria-label="Batch settings fields">
            {SECTIONS.map(({ id }) => (
              <div key={id} data-settings-section={id} className="scroll-mt-6">
                <BatchFormFields values={values} onChange={onChange} courses={courses} instructorSuggestions={instructors} datalistId="batch-settings" variant="workspace" section={id} />
                {id === "schedule" && values.maxSeats < batch.enrolledSeats && (
                  <p role="status" className="mt-3 rounded-lg border border-warning/20 bg-warning-soft p-3 text-xs text-warning">The seat limit is below the current enrollment of {batch.enrolledSeats}. Existing students will remain enrolled.</p>
                )}
              </div>
            ))}
          </fieldset>

          <BatchAdmissionPanel batchId={batch.id} courseId={batch.courseId} name={batch.name} onSaved={onAdmissionSaved} />

          <div className="mt-8"><LiveSessionsPanel role="Admin" batchId={batch.id} /></div>
          <div className="mt-8"><RecordingLibrary role="Admin" batchId={batch.id} /></div>

          <details className="mt-8 rounded-xl border border-border bg-surface">
            <summary className="cursor-pointer px-5 py-4 text-xs font-medium text-muted-foreground">Advanced actions</summary>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-5">
              <div><p className="text-sm font-medium text-foreground">Delete this batch</p><p className="mt-1 text-xs text-muted-foreground">Only an empty batch can be deleted. Use cancellation to retain registration history.</p></div>
              <Button type="button" size="sm" variant="outline" disabled={saving} onClick={onDelete} leftIcon={<Trash2 />} className="border-danger/25 text-danger hover:bg-danger-soft">Delete batch</Button>
            </div>
          </details>
        </div>
      </div>

      <footer className="shrink-0 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7 sm:py-4">
          <p className="text-xs text-muted-foreground">{dirty ? "You have changes ready to save." : "Changes apply only after you save."}</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" disabled={saving || !dirty} onClick={onReset} leftIcon={<RotateCcw />}>Discard changes</Button>
            <Button type="submit" loading={saving} disabled={!dirty} leftIcon={<Save />}>Save changes</Button>
          </div>
        </div>
      </footer>
    </form>
  )
}
