import { Award, Bot, MessageSquare, Sparkles } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { CustomSelect } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import BatchPriceField from "./BatchPriceField"
import type { AdminBatch, AdminCourse } from "@/data/adminStore"
import {
  DELIVERY_MODE_OPTIONS,
  TIMEZONES,
  type BatchEditableFields,
} from "./batchTheme"

const offsetDate = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000)
  return d.toISOString().slice(0, 10)
}

export function createBatchFields(
  batch: AdminBatch | null | undefined,
  _courses: AdminCourse[],
  fallbackInstructor = "",
): BatchEditableFields {
  if (batch) {
    return {
      name: batch.name,
      courseId: batch.courseId || "",
      price: batch.price ?? 0,
      instructor: batch.instructor || fallbackInstructor,
      status: batch.status,
      startDate: batch.startDate || "",
      endDate: batch.endDate || "",
      schedule: batch.schedule || "Flexible schedule",
      timezone: batch.timezone || "Asia/Kolkata",
      maxSeats: batch.maxSeats || 100,
      deliveryMode: batch.deliveryMode || "Live + Replay",
      replayDelayHours: batch.replayDelayHours ?? 2,
      accessExpiryMonths: batch.accessExpiryMonths ?? 12,
      meetingUrl: batch.meetingUrl || "",
      notes: batch.notes || "",
      liveChat: batch.features?.liveChat ?? true,
      doubtClearing: batch.features?.doubtClearing ?? true,
      aiTutor: batch.features?.aiTutor ?? true,
      certificate: batch.features?.certificate ?? true,
    }
  }
  return {
    name: "",
    courseId: "",
    price: 4999,
    instructor: fallbackInstructor,
    status: "Upcoming",
    startDate: offsetDate(7),
    endDate: offsetDate(97),
    schedule: "Mon, Wed, Fri · 7:30 PM - 9:30 PM",
    timezone: "Asia/Kolkata",
    maxSeats: 100,
    deliveryMode: "Live + Replay",
    replayDelayHours: 2,
    accessExpiryMonths: 12,
    meetingUrl: "",
    notes: "",
    liveChat: true,
    doubtClearing: true,
    aiTutor: true,
    certificate: true,
  }
}

interface BatchFormFieldsProps {
  values: BatchEditableFields
  onChange: (patch: Partial<BatchEditableFields>) => void
  courses: AdminCourse[]
  instructorSuggestions: string[]
  datalistId: string
  variant?: "dialog" | "workspace"
  section?: "details" | "schedule" | "access"
}

const ENTITLEMENTS: {
  key: "liveChat" | "doubtClearing" | "aiTutor" | "certificate"
  label: string
  description: string
  icon: typeof MessageSquare
}[] = [
  {
    key: "liveChat",
    label: "Live chat",
    description: "Let students participate in classroom conversations.",
    icon: MessageSquare,
  },
  {
    key: "doubtClearing",
    label: "Doubt support",
    description: "Give learners access to doubt-clearing support.",
    icon: Sparkles,
  },
  {
    key: "aiTutor",
    label: "AI tutor · Clover",
    description: "Offer on-demand guidance from the AI tutor.",
    icon: Bot,
  },
  {
    key: "certificate",
    label: "Completion certificate",
    description: "Enable certificates for eligible course completions.",
    icon: Award,
  },
]

/** Shared form sections for creating and editing a batch. */
export default function BatchFormFields({
  values,
  onChange,
  courses,
  instructorSuggestions,
  datalistId,
  variant = "dialog",
  section,
}: BatchFormFieldsProps) {
  const isWorkspace = variant === "workspace"
  const instructorNames = Array.from(new Set(instructorSuggestions.map((name) => name.trim()).filter(Boolean)))
  const currentInstructorUnavailable = Boolean(values.instructor) && !instructorNames.includes(values.instructor)
  const instructorOptions = [
    ...(currentInstructorUnavailable ? [{ value: values.instructor, label: `${values.instructor} (current)`, disabled: true }] : []),
    ...instructorNames.map((name) => ({ value: name, label: name })),
  ]
  const cardCls = "space-y-6 rounded-xl border border-border bg-surface p-5 sm:p-6"

  return (
    <div className={isWorkspace ? "space-y-5" : "space-y-4"}>
      {(!section || section === "details") && (
        <section className={cardCls}>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Batch details</h3>
            <p className="text-xs text-muted-foreground">Name the batch, set its price and pick a lead instructor.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor={`${datalistId}-name`} className="text-xs font-semibold text-foreground">
                Batch name
              </label>
              <Input
                required
                maxLength={150}
                placeholder="e.g. GenAI Engineering Cohort 15"
                id={`${datalistId}-name`}
                aria-label="Batch name"
                value={values.name}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${datalistId}-status`} className="text-xs font-semibold text-foreground">
                Status
              </label>
              <p className="rounded-lg bg-surface-2 p-3 text-xs text-muted-foreground">
                {isWorkspace
                  ? "Manage the batch stage in Admissions & team → Launch batch."
                  : "New batches start as drafts. After creating one, open Admissions & team to manage its launch."}
              </p>
            </div>
          </div>
          <BatchPriceField id={`${datalistId}-price`} value={values.price} onChange={(price) => onChange({ price })} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={`${datalistId}-courseId`} className="text-xs font-semibold text-foreground">
                Topic (optional)
              </label>
              <CustomSelect
                id={`${datalistId}-courseId`}
                aria-label="Topic (optional)"
                value={values.courseId}
                onChange={(courseId) => onChange({ courseId })}
                placeholder="No topic"
                options={[{ value: "", label: "No topic" }, ...courses.map((c) => ({ value: c.id, label: c.title }))]}
              />
              <p className="text-[11px] text-subtle-foreground">A label only. Learners buy courses separately.</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${datalistId}-instructor`} className="text-xs font-semibold text-foreground">
                Lead instructor
              </label>
              <CustomSelect
                required
                placeholder={instructorNames.length ? "Select a teacher" : "No teachers available"}
                id={`${datalistId}-instructor`}
                aria-label="Lead instructor"
                value={values.instructor}
                options={instructorOptions}
                onChange={(instructor) => onChange({ instructor })}
                disabled={!instructorNames.length}
              />
              {!instructorNames.length && (
                <p className="text-xs text-muted-foreground">Add an active teacher from Teachers to select a lead instructor.</p>
              )}
            </div>
          </div>
        </section>
      )}
      {(!section || section === "schedule") && (
        <section className={cardCls}>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Schedule & delivery</h3>
            <p className="text-xs text-muted-foreground">Set the pace, make room for learners and choose how they join.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={`${datalistId}-startDate`} className="text-xs font-semibold text-foreground">
                Start date
              </label>
              <DatePicker
                id={`${datalistId}-startDate`}
                aria-label="Start date"
                value={values.startDate}
                onChange={(startDate) => onChange({ startDate })}
                placeholder="Select start date"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${datalistId}-endDate`} className="text-xs font-semibold text-foreground">
                End date
              </label>
              <DatePicker
                id={`${datalistId}-endDate`}
                aria-label="End date"
                value={values.endDate}
                onChange={(endDate) => onChange({ endDate })}
                placeholder="Select end date"
                min={values.startDate || undefined}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={`${datalistId}-schedule`} className="text-xs font-semibold text-foreground">
                Session schedule
              </label>
              <Input
                required
                placeholder="Mon, Wed, Fri · 7:30 PM - 9:30 PM"
                id={`${datalistId}-schedule`}
                aria-label="Session schedule"
                maxLength={150}
                value={values.schedule}
                onChange={(e) => onChange({ schedule: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${datalistId}-timezone`} className="text-xs font-semibold text-foreground">
                Timezone
              </label>
              <CustomSelect
                id={`${datalistId}-timezone`}
                aria-label="Timezone"
                value={values.timezone}
                onChange={(timezone) => onChange({ timezone })}
                options={TIMEZONES}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor={`${datalistId}-deliveryMode`} className="text-xs font-semibold text-foreground">
                Delivery mode
              </label>
              <CustomSelect
                id={`${datalistId}-deliveryMode`}
                aria-label="Delivery mode"
                value={values.deliveryMode}
                onChange={(val) => onChange({ deliveryMode: val as AdminBatch["deliveryMode"] })}
                options={DELIVERY_MODE_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${datalistId}-maxSeats`} className="text-xs font-semibold text-foreground">
                Seat limit
              </label>
              <Input
                type="number"
                required
                step={1}
                min={1}
                max={5000}
                placeholder="e.g. 100"
                id={`${datalistId}-maxSeats`}
                aria-label="Seat limit"
                value={values.maxSeats}
                onChange={(e) => onChange({ maxSeats: e.target.value === "" ? Number.NaN : Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${datalistId}-accessExpiryMonths`} className="text-xs font-semibold text-foreground">
                Access in months
              </label>
              <Input
                type="number"
                required
                step={1}
                min={0}
                max={120}
                placeholder="12"
                id={`${datalistId}-accessExpiryMonths`}
                aria-label="Access in months"
                value={values.accessExpiryMonths}
                onChange={(e) => onChange({ accessExpiryMonths: e.target.value === "" ? Number.NaN : Number(e.target.value) })}
              />
              <p className="text-[11px] text-subtle-foreground">0 means lifetime access.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <p className="text-xs font-semibold text-foreground">Protected meeting links</p>
              <p className="text-xs text-muted-foreground">
                After saving the batch, use Live sessions to choose Zoom or Google Meet, validate links, and schedule dated classes.
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${datalistId}-replayDelayHours`} className="text-xs font-semibold text-foreground">
                Replay delay (hours)
              </label>
              <Input
                type="number"
                required
                step={1}
                min={0}
                max={168}
                placeholder="2"
                id={`${datalistId}-replayDelayHours`}
                aria-label="Replay delay (hours)"
                value={values.replayDelayHours}
                onChange={(e) => onChange({ replayDelayHours: e.target.value === "" ? Number.NaN : Number(e.target.value) })}
              />
            </div>
          </div>
        </section>
      )}
      {(!section || section === "access") && (
        <section className={cardCls}>
          <div className={isWorkspace ? "space-y-3" : "space-y-3 rounded-xl border border-border bg-surface-2 p-3"}>
            <div className={isWorkspace ? "" : "text-xs font-bold uppercase tracking-wider text-foreground"}>
              {isWorkspace ? (
                <>
                  <h3 className="text-sm font-semibold text-foreground">Learner experience</h3>
                  <p className="text-xs text-muted-foreground">Choose the support and resources included with this batch.</p>
                </>
              ) : (
                "Learner experience"
              )}
            </div>
            <div className="divide-y divide-border rounded-xl border border-border text-xs">
              {ENTITLEMENTS.map(({ key, label, description, icon: Icon }) => (
                <label
                  key={key}
                  className={
                    isWorkspace
                      ? "flex cursor-pointer items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-2/50"
                      : "flex cursor-pointer items-center justify-between gap-3 p-3"
                  }
                >
                  <span className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-medium text-foreground">{label}</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{description}</span>
                    </span>
                  </span>
                  <Switch aria-label={label} checked={values[key]} onCheckedChange={(checked) => onChange({ [key]: checked })} />
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${datalistId}-notes`} className="text-xs font-semibold text-foreground">
              Internal notes (optional)
            </label>
            <textarea
              rows={isWorkspace ? 4 : 2}
              maxLength={1000}
              placeholder="Kickoff reminders, prerequisite prep, capstone evaluation dates..."
              id={`${datalistId}-notes`}
              aria-label="Internal notes (optional)"
              value={values.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
            />
            <div className="flex items-center justify-between gap-3 text-[11px] text-subtle-foreground">
              <span>Kickoff reminders, preparation and team notes.</span>
              <span className="tabular-nums">{values.notes.length} / 1,000</span>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
