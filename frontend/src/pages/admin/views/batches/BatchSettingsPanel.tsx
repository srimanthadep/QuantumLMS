import { useEffect, useRef, useState, type FormEvent } from "react"
import { Award, Bot, CalendarDays, Layers, MessageSquare, MonitorPlay, RotateCcw, Save, Sparkles, Trash2, UserRound, Users, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import Field from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CustomSelect } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { AdminBatch, AdminCourse } from "@/data/adminStore"
import { cn } from "@/lib/utils"
import { DELIVERY_MODE_OPTIONS, TIMEZONES, type BatchEditableFields } from "./batchTheme"
import BatchPriceField from "./BatchPriceField"
import { InlineAlert, SectionCard, StickySaveBar, TabHeader } from "./parts"

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
  onSave: (event: FormEvent) => void
  onReset: () => void
  onDelete: () => void
}

type SectionId = "details" | "schedule" | "delivery" | "experience" | "danger"
const SECTIONS: { id: SectionId; label: string; icon: LucideIcon; fields: (keyof BatchEditableFields)[] }[] = [
  { id: "details", label: "Basics", icon: Layers, fields: ["name", "price", "courseId", "instructor"] },
  { id: "schedule", label: "Dates & seats", icon: CalendarDays, fields: ["startDate", "endDate", "schedule", "timezone", "maxSeats"] },
  { id: "delivery", label: "Delivery & access", icon: MonitorPlay, fields: ["deliveryMode", "replayDelayHours", "accessExpiryMonths", "meetingUrl"] },
  { id: "experience", label: "Learner perks", icon: Sparkles, fields: ["liveChat", "doubtClearing", "aiTutor", "certificate", "notes"] },
  { id: "danger", label: "Delete batch", icon: Trash2, fields: [] },
]

const PERKS: { key: "liveChat" | "doubtClearing" | "aiTutor" | "certificate"; label: string; description: string; icon: LucideIcon }[] = [
  { key: "liveChat", label: "Live chat", description: "Learners chat during classes.", icon: MessageSquare },
  { key: "doubtClearing", label: "Doubt support", description: "Access to doubt-clearing help.", icon: Users },
  { key: "aiTutor", label: "AI tutor", description: "On-demand guidance from Clover.", icon: Bot },
  { key: "certificate", label: "Certificate", description: "Issued on eligible completion.", icon: Award },
]

const DELIVERY_HINT: Record<AdminBatch["deliveryMode"], string> = {
  "Live + Replay": "Live classes, with recordings afterwards",
  "Replay Only": "Learners watch recordings only",
  "Self-Paced": "Cohort moves through content on its own",
}

const fid = (field: keyof BatchEditableFields) => `batch-settings-${field}`

/** Batch settings as one page: section nav on the left, all fields on the right, and a save bar when something changes. */
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
}: BatchSettingsPanelProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [activeSection, setActiveSection] = useState<SectionId>("details")
  const changed = (f: keyof BatchEditableFields) => values[f] !== savedValues[f]
  const dirty = (Object.keys(values) as (keyof BatchEditableFields)[]).some(changed)
  const sectionDirty = (fields: (keyof BatchEditableFields)[]) => fields.some(changed)

  const instructorNames = Array.from(new Set(instructors.map((n) => n.trim()).filter(Boolean)))
  const currentInstructorMissing = Boolean(values.instructor) && !instructorNames.includes(values.instructor)
  const instructorOptions = [
    ...(currentInstructorMissing ? [{ value: values.instructor, label: `${values.instructor} (current)`, disabled: true }] : []),
    ...instructorNames.map((n) => ({ value: n, label: n })),
  ]

  // Jump to and focus the field that failed validation.
  useEffect(() => {
    if (!error || !errorField) return
    const el = formRef.current?.querySelector<HTMLElement>(`[id="${fid(errorField)}"]`)
    el?.scrollIntoView({ block: "center", behavior: "smooth" })
    el?.focus({ preventScroll: true })
    const section = SECTIONS.find((s) => s.fields.includes(errorField))
    if (section) setActiveSection(section.id)
  }, [error, errorField, errorAttempt])

  // Highlight the section in view.
  useEffect(() => {
    const root = document.getElementById("main")
    const targets = SECTIONS.map((s) => document.getElementById(`settings-${s.id}`)).filter(Boolean) as HTMLElement[]
    if (!targets.length || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setActiveSection(top.target.id.replace("settings-", "") as SectionId)
      },
      { root, rootMargin: "-10% 0px -60% 0px" },
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [])

  const jump = (id: SectionId) => {
    setActiveSection(id)
    document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const errFor = (field: keyof BatchEditableFields) => (error && errorField === field ? error : undefined)
  const seatsBelowEnrolled = Number.isFinite(values.maxSeats) && values.maxSeats < batch.enrolledSeats
  const priceLocked = batch.lifecycle === "Running" || batch.lifecycle === "Completed"

  return (
    <form ref={formRef} onSubmit={onSave} noValidate className="space-y-5">
      <TabHeader title="Settings" description="Details, dates, delivery and perks for this batch. Changes save together." />

      {error && !errorField && <InlineAlert tone="danger">{error}</InlineAlert>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-4 lg:self-start">
          <ul className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:px-0">
            {SECTIONS.map(({ id, label, icon: Icon, fields }) => (
              <li key={id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => jump(id)}
                  aria-current={activeSection === id ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition-colors",
                    activeSection === id ? "bg-primary-soft font-medium text-primary-text" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                    id === "danger" && activeSection !== id && "text-danger/80 hover:text-danger",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  {sectionDirty(fields) && <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-label="unsaved changes" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <fieldset disabled={saving} className="min-w-0 space-y-5">
          <SectionCard id="settings-details" icon={Layers} title="Basics" description="What the batch is called, what it costs and who leads it.">
            <div className="space-y-4">
              <Field label="Batch name" required error={errFor("name")} id={fid("name")}>
                <Input maxLength={150} placeholder="e.g. GenAI Engineering Cohort 15" value={values.name} onChange={(e) => onChange({ name: e.target.value })} />
              </Field>
              <BatchPriceField
                id={fid("price")}
                value={values.price}
                onChange={(price) => onChange({ price })}
                error={errFor("price")}
                lockedReason={priceLocked ? "The price is locked once a batch is running. Learners have already paid it." : undefined}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Topic (optional)" error={errFor("courseId")} id={fid("courseId")} hint="A label only. Learners buy courses separately.">
                  <CustomSelect
                    value={values.courseId}
                    onChange={(courseId) => onChange({ courseId })}
                    placeholder="No topic"
                    options={[{ value: "", label: "No topic" }, ...courses.map((c) => ({ value: c.id, label: c.title }))]}
                  />
                </Field>
                <Field
                  label="Lead instructor"
                  required
                  error={errFor("instructor")}
                  id={fid("instructor")}
                  hint={!instructorNames.length ? "Add an active lead instructor in Teachers first." : "Shown on the batch. The full team is in Admissions & team."}
                >
                  <CustomSelect
                    value={values.instructor}
                    options={instructorOptions}
                    onChange={(instructor) => onChange({ instructor })}
                    placeholder={instructorNames.length ? "Select a teacher" : "No teachers available"}
                    disabled={!instructorNames.length}
                  />
                </Field>
              </div>
              <p className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-caption text-muted-foreground">
                <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                The batch stage (Draft, Recruiting, Running…) is changed in Admissions &amp; team.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="settings-schedule" icon={CalendarDays} title="Dates and seats" description="When the batch runs and how many learners it holds.">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Start date" error={errFor("startDate")} id={fid("startDate")}>
                  <DatePicker value={values.startDate} onChange={(startDate) => onChange({ startDate })} placeholder="Select start date" />
                </Field>
                <Field label="End date" error={errFor("endDate")} id={fid("endDate")}>
                  <DatePicker value={values.endDate} onChange={(endDate) => onChange({ endDate })} placeholder="Select end date" min={values.startDate || undefined} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Class schedule" hint="Shown to learners, e.g. Mon, Wed · 7:30 PM" error={errFor("schedule")} id={fid("schedule")}>
                  <Input maxLength={150} placeholder="Mon, Wed, Fri · 7:30 PM - 9:30 PM" value={values.schedule} onChange={(e) => onChange({ schedule: e.target.value })} />
                </Field>
                <Field label="Timezone" id={fid("timezone")}>
                  <CustomSelect value={values.timezone} onChange={(timezone) => onChange({ timezone })} options={TIMEZONES} />
                </Field>
              </div>
              <Field
                label="Seat limit"
                error={errFor("maxSeats")}
                id={fid("maxSeats")}
                hint={`${batch.enrolledSeats} enrolled now${batch.waitlistedSeats ? `, ${batch.waitlistedSeats} waiting` : ""}`}
                className="sm:max-w-xs"
              >
                <Input type="number" inputMode="numeric" step={1} min={1} max={5000} placeholder="e.g. 100" value={values.maxSeats} onChange={(e) => onChange({ maxSeats: e.target.value === "" ? Number.NaN : Number(e.target.value) })} />
              </Field>
              {seatsBelowEnrolled && <InlineAlert tone="warning">The limit is below the {batch.enrolledSeats} learners already enrolled. They stay enrolled; new learners go to the waitlist.</InlineAlert>}
            </div>
          </SectionCard>

          <SectionCard id="settings-delivery" icon={MonitorPlay} title="Delivery and access" description="How learners attend and how long they keep access.">
            <div className="space-y-4">
              <div role="radiogroup" aria-label="Delivery mode" id={fid("deliveryMode")} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DELIVERY_MODE_OPTIONS.map((opt) => {
                  const on = values.deliveryMode === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => onChange({ deliveryMode: opt.value })}
                      className={cn("rounded-lg border p-3 text-left transition-colors", on ? "border-primary-border bg-primary-soft" : "border-border hover:bg-surface-2")}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{opt.value}</span>
                        <span className={cn("h-3.5 w-3.5 shrink-0 rounded-full border", on ? "border-[4px] border-primary" : "border-border-strong")} aria-hidden="true" />
                      </span>
                      <span className="mt-1 block text-caption text-muted-foreground">{DELIVERY_HINT[opt.value]}</span>
                    </button>
                  )
                })}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Replay delay (hours)" hint="How long after class the recording unlocks." error={errFor("replayDelayHours")} id={fid("replayDelayHours")}>
                  <Input type="number" inputMode="numeric" step={1} min={0} max={168} placeholder="2" value={values.replayDelayHours} onChange={(e) => onChange({ replayDelayHours: e.target.value === "" ? Number.NaN : Number(e.target.value) })} />
                </Field>
                <Field label="Access (months)" hint="0 means lifetime access." error={errFor("accessExpiryMonths")} id={fid("accessExpiryMonths")}>
                  <Input type="number" inputMode="numeric" step={1} min={0} max={120} placeholder="12" value={values.accessExpiryMonths} onChange={(e) => onChange({ accessExpiryMonths: e.target.value === "" ? Number.NaN : Number(e.target.value) })} />
                </Field>
              </div>
              <Field label="Classroom link" hint="Optional fallback link. Per-class Zoom or Meet links are set in Live sessions." error={errFor("meetingUrl")} id={fid("meetingUrl")}>
                <Input type="url" placeholder="https://" value={values.meetingUrl} onChange={(e) => onChange({ meetingUrl: e.target.value })} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard id="settings-experience" icon={Sparkles} title="Learner perks" description="Support and extras included with this batch.">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PERKS.map(({ key, label, description, icon: Icon }) => (
                  <label key={key} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors", values[key] ? "border-primary-border bg-primary-soft/50" : "border-border hover:bg-surface-2")}>
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", values[key] ? "bg-primary-soft text-primary-text" : "bg-surface-2 text-muted-foreground")}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{label}</span>
                      <span className="block text-caption text-muted-foreground">{description}</span>
                    </span>
                    <Switch aria-label={label} checked={values[key]} onCheckedChange={(checked) => onChange({ [key]: checked })} />
                  </label>
                ))}
              </div>
              <Field label="Internal notes" hint={`${values.notes.length} / 1,000 · only admins see these`} error={errFor("notes")} id={fid("notes")}>
                <Textarea rows={4} maxLength={1000} placeholder="Kickoff reminders, prep work, capstone dates…" value={values.notes} onChange={(e) => onChange({ notes: e.target.value })} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            id="settings-danger"
            icon={Trash2}
            title="Delete batch"
            description="Only an empty batch can be deleted. To keep registration history, cancel it in Admissions & team instead."
            className="border-danger/25"
            actions={
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={onDelete} leftIcon={<Trash2 aria-hidden="true" />} className="border-danger/30 text-danger hover:bg-danger-soft hover:text-danger">
                Delete batch
              </Button>
            }
          />
        </fieldset>
      </div>

      {dirty && (
        <StickySaveBar message={error && errorField ? <span className="text-danger">{error}</span> : "You have unsaved changes"}>
          <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={onReset} leftIcon={<RotateCcw aria-hidden="true" />}>
            Discard
          </Button>
          <Button type="submit" size="sm" loading={saving} leftIcon={<Save aria-hidden="true" />}>
            Save changes
          </Button>
        </StickySaveBar>
      )}
    </form>
  )
}
