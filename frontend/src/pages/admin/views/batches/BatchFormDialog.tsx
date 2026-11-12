import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Check, Layers, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AdminBatch, AdminCourse } from "@/data/adminStore"
import { cn } from "@/lib/utils"
import BatchFormFields, { createBatchFields } from "./BatchFormFields"
import {
  type BatchEditableFields,
  formatShortDateRange,
  toBatchPayload,
  validateBatchFields,
} from "./batchTheme"
export type BatchFormValues = Omit<AdminBatch, "id" | "enrolledSeats" | "waitlistedSeats" | "courseTitle" | "courseCode"> & {
  courseTitle: string
}
interface BatchFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  batch?: AdminBatch | null
  courses: AdminCourse[]
  instructors?: string[]
  onSubmit: (values: BatchFormValues) => Promise<void> | void
}
const STEPS = [
  { id: "details", label: "Batch details" },
  { id: "schedule", label: "Schedule" },
  { id: "access", label: "Learner experience" },
] as const
export default function BatchFormDialog({
  open,
  onOpenChange,
  mode,
  batch,
  courses,
  instructors = [],
  onSubmit,
}: BatchFormDialogProps) {
  const [fields, setFields] = useState<BatchEditableFields>(() =>
    createBatchFields(batch, courses),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)
  const creating = mode === "create"
  const instructorSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          [...instructors, ...courses.map((c) => c.instructor)].filter(Boolean),
        ),
      ),
    [courses, instructors],
  )
  useEffect(() => {
    if (!open) return
    setError(null)
    setStep(0)
    setFields(
      createBatchFields(
        mode === "edit" ? batch : null,
        courses,
        instructorSuggestions[0] || "",
      ),
    )
  }, [open, mode, batch?.id])
  useEffect(() => {
    if (!open || !creating) return
    bodyRef.current
      ?.querySelector<HTMLElement>("input, button, textarea")
      ?.focus({ preventScroll: true })
  }, [open, step, creating])
  const moveToStep = (next: number) => {
    setStep(next)
    setError(null)
    bodyRef.current?.scrollTo({ top: 0 })
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setError(null)
    if (creating && step === 0) {
      if (fields.name.trim().length < 2)
        return setError("Give your batch a name of at least 2 characters.")
      if (!courses.some((c) => c.id === fields.courseId))
        return setError("Choose a course for this batch.")
      if (fields.instructor.trim().length < 2)
        return setError("Add the lead instructor's name.")
      moveToStep(1)
      return
    }
    const { error: validationError, selectedCourse } = validateBatchFields(
      fields,
      courses,
    )
    if (validationError || !selectedCourse) {
      setError(validationError ?? "Please check the batch details.")
      return
    }
    if (creating && step === 1) {
      moveToStep(2)
      return
    }
    setSaving(true)
    try {
      await onSubmit(toBatchPayload(fields, selectedCourse))
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save batch. Please try again.",
      )
    } finally {
      setSaving(false)
    }
  }
  const Icon = creating ? Layers : Pencil
  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="flex max-h-[92dvh] max-w-2xl flex-col gap-0 overflow-hidden bg-surface p-0">
        <header className="shrink-0 border-b border-border px-5 pb-5 pt-6 sm:px-7">
          <div className="flex items-center gap-3 pr-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary-border bg-primary-soft text-primary-text">
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div>
              <DialogTitle>
                {creating ? "Create a batch" : "Edit batch details"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {creating
                  ? "A few details. A great start for your next cohort."
                  : batch?.name}
              </DialogDescription>
            </div>
          </div>
          {creating && (
            <ol
              aria-label="Batch setup progress"
              className="mt-6 flex items-center justify-between gap-2"
            >
              {STEPS.map((item, index) => (
                <li
                  key={item.id}
                  aria-current={step === index ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 text-[11px] sm:text-xs",
                    step === index
                      ? "font-semibold text-foreground"
                      : "text-subtle-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] tabular-nums",
                      step === index
                        ? "border-primary bg-primary text-primary-foreground"
                        : step > index
                          ? "border-primary-border bg-primary-soft text-primary-text"
                          : "border-border bg-surface-2",
                    )}
                  >
                    {step > index ? (
                      <Check className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ol>
          )}
        </header>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div
            ref={bodyRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-background p-5 sm:p-7"
          >
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-xs text-danger"
              >
                {error}
              </div>
            )}
            {creating && step === 2 && (
              <div className="rounded-xl border border-primary-border bg-primary-soft p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-text">
                  Ready for your learners
                </p>
                <p className="mt-1.5 text-sm font-semibold text-foreground">
                  {fields.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {courses.find((c) => c.id === fields.courseId)?.title}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatShortDateRange(fields.startDate, fields.endDate)} ·{" "}
                  {fields.maxSeats} seats · {fields.status}
                </p>
              </div>
            )}
            <fieldset disabled={saving} className="min-w-0">
              <BatchFormFields
                values={fields}
                onChange={(patch) =>
                  setFields((prev) => ({ ...prev, ...patch }))
                }
                courses={courses}
                instructorSuggestions={instructorSuggestions}
                datalistId="batch-dialog-instructors"
                variant="workspace"
                section={creating ? STEPS[step].id : undefined}
              />
            </fieldset>
          </div>
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-5 py-4 sm:px-7">
            {creating && step > 0 ? (
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => moveToStep(step - 1)}
                leftIcon={<ArrowLeft />}
              >
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              loading={saving}
              disabled={!courses.length}
              rightIcon={creating && step < 2 ? <ArrowRight /> : undefined}
            >
              {creating
                ? step < 2
                  ? "Continue"
                  : "Create batch"
                : "Save changes"}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}
