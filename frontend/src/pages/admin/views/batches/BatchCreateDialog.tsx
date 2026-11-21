import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bot,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Gift,
  Layers,
  Lightbulb,
  Minus,
  MessageSquare,
  PlayCircle,
  Plus,
  Sparkles,
  Ticket,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react"
import CourseCover from "@/components/shared/CourseCover"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { CustomSelect } from "@/components/ui/select"
import type { AdminBatch, AdminCourse } from "@/data/adminStore"
import { transition } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { createBatchFields } from "./BatchFormFields"
import {
  batchPriceLabel,
  formatShortDateRange,
  TIMEZONES,
  toBatchPayload,
  validateBatchFields,
  type BatchEditableFields,
} from "./batchTheme"
import type { BatchFormValues } from "./BatchFormDialog"

interface BatchCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courses: AdminCourse[]
  instructors?: string[]
  onSubmit: (values: BatchFormValues) => Promise<void> | void
}

const STEPS = [
  { id: "basics", label: "Basics", hint: "Name, teacher and price" },
  { id: "schedule", label: "Schedule", hint: "Dates, seats and format" },
  { id: "experience", label: "Experience", hint: "What learners get" },
] as const

const PRICE_PRESETS = [999, 2999, 4999, 9999]
const SEAT_PRESETS = [30, 50, 100, 250]
const DURATIONS = [
  { label: "4 weeks", days: 28 },
  { label: "8 weeks", days: 56 },
  { label: "12 weeks", days: 84 },
  { label: "6 months", days: 182 },
]
const SCHEDULE_PRESETS = [
  "Mon, Wed, Fri · 7:30 PM - 9:30 PM",
  "Weekdays · 8:00 PM - 9:00 PM",
  "Sat, Sun · 10:00 AM - 1:00 PM",
]
const ACCESS_OPTIONS = [
  { label: "6 months", value: 6 },
  { label: "12 months", value: 12 },
  { label: "24 months", value: 24 },
  { label: "Lifetime", value: 0 },
]
const REPLAY_OPTIONS = [
  { label: "Instant", value: 0 },
  { label: "2 hours", value: 2 },
  { label: "24 hours", value: 24 },
  { label: "48 hours", value: 48 },
]
const DELIVERY: { value: AdminBatch["deliveryMode"]; label: string; description: string; icon: LucideIcon }[] = [
  { value: "Live + Replay", label: "Live + replay", description: "Live classes, recordings after", icon: Video },
  { value: "Replay Only", label: "Replay only", description: "Recorded sessions on demand", icon: PlayCircle },
  { value: "Self-Paced", label: "Self-paced", description: "Learn on their own time", icon: BookOpen },
]
const PERKS: { key: "liveChat" | "doubtClearing" | "aiTutor" | "certificate"; label: string; description: string; icon: LucideIcon }[] = [
  { key: "liveChat", label: "Live chat", description: "Chat during live classes", icon: MessageSquare },
  { key: "doubtClearing", label: "Doubt support", description: "Ask and get answers", icon: Sparkles },
  { key: "aiTutor", label: "AI tutor · Clover", description: "On-demand guidance", icon: Bot },
  { key: "certificate", label: "Certificate", description: "On course completion", icon: Award },
]

const addDaysIso = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const diffDays = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)

function Field({ label, hint, htmlFor, optional, children, className }: { label: string; hint?: ReactNode; htmlFor?: string; optional?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline gap-1.5 text-xs font-semibold text-foreground">
        {label}
        {optional && <span className="text-[11px] font-normal text-subtle-foreground">Optional</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-subtle-foreground">{hint}</p>}
    </div>
  )
}

/** Small selectable pill used for quick presets. */
function Chip({ active, onClick, children, disabled }: { active?: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={Boolean(active)}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25",
        active ? "border-primary bg-primary-soft text-primary-text" : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

/** Large selectable tile (single choice). */
function Tile({ active, onClick, icon: Icon, title, description, disabled }: { active: boolean; onClick: () => void; icon: LucideIcon; title: string; description: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 rounded-lg border p-3.5 pr-9 text-left sm:flex-col sm:items-start sm:gap-2 sm:pr-3.5 transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25",
        active ? "border-primary bg-primary-soft shadow-[var(--elev-xs)]" : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground")}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{description}</span>
      </span>
      {active && (
        <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden="true">
          <Check className="h-2.5 w-2.5" />
        </span>
      )}
    </button>
  )
}

/** Toggle tile (multi choice). */
function PerkTile({ on, onToggle, icon: Icon, label, description }: { on: boolean; onToggle: () => void; icon: LucideIcon; label: string; description: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "relative flex items-start gap-3 rounded-lg border p-3 text-left transition-[border-color,background-color] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25",
        on ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", on ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground")}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{description}</span>
      </span>
      <span
        className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border", on ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface")}
        aria-hidden="true"
      >
        {on && <Check className="h-3 w-3" />}
      </span>
    </button>
  )
}

/** Live preview of the batch tile, mirroring what the batch list will show. */
function Preview({ fields, topic, creatingStep }: { fields: BatchEditableFields; topic?: AdminCourse; creatingStep: number }) {
  const seats = Math.max(0, Number(fields.maxSeats) || 0)
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--elev-sm)]" aria-label="Batch preview">
      <CourseCover title={fields.name || "Your batch"} category={topic?.category} showTitle={false} className="aspect-[16/7]">
        <span className="absolute left-3 top-3 z-10 max-w-[80%] truncate rounded-full border border-white/15 bg-ink-950/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
          {batchPriceLabel(fields.price)}
          {topic ? ` · ${topic.title}` : ""}
        </span>
      </CourseCover>
      <div className="space-y-3 p-4">
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-semibold", fields.name.trim() ? "text-foreground" : "text-subtle-foreground")}>{fields.name.trim() || "Your batch name"}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{fields.instructor || "Lead instructor not chosen"}</p>
        </div>
        <dl className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
            <dt className="sr-only">Dates</dt>
            <dd className={cn(creatingStep < 1 && "text-subtle-foreground")}>{formatShortDateRange(fields.startDate, fields.endDate)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
            <dt className="sr-only">Schedule</dt>
            <dd className="truncate">{fields.schedule.trim() || "Flexible schedule"}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
            <dt className="sr-only">Seats</dt>
            <dd className="tabular-nums">{seats} seats</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default function BatchCreateDialog({ open, onOpenChange, courses, instructors = [], onSubmit }: BatchCreateDialogProps) {
  const suggestions = useMemo(() => Array.from(new Set(instructors.map((n) => n.trim()).filter(Boolean))), [instructors])
  const initial = () => {
    const f = createBatchFields(null, courses)
    f.instructor = suggestions.length === 1 ? suggestions[0] : ""
    return f
  }
  const [fields, setFields] = useState<BatchEditableFields>(initial)
  const [priceMode, setPriceMode] = useState<"paid" | "free">("paid")
  const [priceDraft, setPriceDraft] = useState("4999")
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const patch = (p: Partial<BatchEditableFields>) => setFields((prev) => ({ ...prev, ...p }))

  useEffect(() => {
    if (!open) return
    const f = initial()
    setFields(f)
    setPriceMode("paid")
    setPriceDraft(String(f.price))
    setStep(0)
    setError(null)
    setSaving(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open && step === 0) {
      const t = window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 60)
      return () => window.clearTimeout(t)
    }
  }, [open, step])

  const topic = courses.find((c) => c.id === fields.courseId)
  const go = (next: number) => {
    setStep(next)
    setError(null)
    bodyRef.current?.scrollTo({ top: 0 })
  }

  const choosePrice = (mode: "paid" | "free") => {
    setPriceMode(mode)
    if (mode === "free") patch({ price: 0 })
    else {
      const n = Number(priceDraft)
      patch({ price: n > 0 ? n : 4999 })
      if (!(n > 0)) setPriceDraft("4999")
    }
  }
  const setPaid = (n: number) => {
    setPriceDraft(n > 0 ? String(n) : "")
    patch({ price: n })
  }

  const changeStart = (startDate: string) => {
    if (startDate && fields.startDate && fields.endDate) {
      const span = diffDays(fields.startDate, fields.endDate)
      patch({ startDate, endDate: span >= 0 ? addDaysIso(startDate, span) : fields.endDate })
    } else patch({ startDate })
  }

  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (fields.name.trim().length < 2) return "Give your batch a name of at least 2 characters."
      if (!fields.instructor.trim()) return "Choose a lead instructor."
      if (priceMode === "paid" && !(fields.price > 0)) return "Enter a price above ₹0, or choose Free."
    }
    if (index === 1) {
      if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) return "The end date can't be before the start date."
      if (!Number.isInteger(fields.maxSeats) || fields.maxSeats < 1 || fields.maxSeats > 5000) return "Seats must be a whole number between 1 and 5,000."
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    const problem = validateStep(step)
    if (problem) return setError(problem)
    if (step < STEPS.length - 1) return go(step + 1)
    const { error: validationError, selectedCourse } = validateBatchFields(fields, courses)
    if (validationError) return setError(validationError)
    setError(null)
    setSaving(true)
    try {
      await onSubmit(toBatchPayload(fields, selectedCourse))
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the batch. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const last = step === STEPS.length - 1
  const durationActive = (days: number) => Boolean(fields.startDate && fields.endDate) && fields.endDate === addDaysIso(fields.startDate, days)

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="flex h-[min(720px,calc(100dvh-1.5rem))] max-w-4xl flex-row gap-0 overflow-hidden bg-surface p-0">
        {/* Left rail: preview + progress */}
        <aside className="hidden w-[300px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-surface-2 p-6 lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary-border bg-primary-soft text-primary-text">
              <Layers className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">New batch</p>
              <p className="text-[11px] text-muted-foreground">Preview updates as you type</p>
            </div>
          </div>
          <Preview fields={fields} topic={topic} creatingStep={step} />
          <ol aria-label="Setup progress" className="space-y-1">
            {STEPS.map((s, i) => {
              const done = step > i
              const current = step === i
              return (
                <li key={s.id} aria-current={current ? "step" : undefined}>
                  <button
                    type="button"
                    disabled={saving || i > step}
                    onClick={() => i < step && go(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors disabled:cursor-default",
                      i < step && "hover:bg-surface",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums",
                        current ? "border-primary bg-primary text-primary-foreground" : done ? "border-primary-border bg-primary-soft text-primary-text" : "border-border bg-surface text-subtle-foreground",
                      )}
                    >
                      {done ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-xs font-semibold", current || done ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                      <span className="block truncate text-[11px] text-subtle-foreground">{s.hint}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </aside>

        {/* Right: form */}
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-border px-5 pb-4 pt-5 sm:px-8 sm:pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-text">
              Step {step + 1} of {STEPS.length}
            </p>
            <DialogTitle className="mt-1">{step === 0 ? "Create a batch" : STEPS[step].label}</DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              {step === 0 && "Start with the basics. You can change everything later."}
              {step === 1 && "Set the dates, seats and how learners will attend."}
              {step === 2 && "Choose what's included, then create your batch."}
            </DialogDescription>
            <div className="mt-4 flex gap-1.5 lg:hidden" aria-hidden="true">
              {STEPS.map((s, i) => (
                <span key={s.id} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-border")} />
              ))}
            </div>
          </header>

          <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto bg-background px-5 py-6 sm:px-8">
            {error && (
              <div role="alert" className="mb-5 rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-xs text-danger">
                {error}
              </div>
            )}
            <fieldset disabled={saving} className="min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={transition.fast}
                  className="space-y-6"
                >
                  {step === 0 && (
                    <>
                      <Field label="Batch name" htmlFor="bc-name">
                        <Input
                          ref={nameRef}
                          id="bc-name"
                          maxLength={150}
                          placeholder="e.g. GenAI Engineering Cohort 15"
                          value={fields.name}
                          onChange={(e) => patch({ name: e.target.value })}
                          className="h-11 text-[15px]"
                        />
                      </Field>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field
                          label="Lead instructor"
                          htmlFor="bc-instructor"
                          hint={!suggestions.length ? "Add an active teacher from Teachers first." : undefined}
                        >
                          <CustomSelect
                            id="bc-instructor"
                            aria-label="Lead instructor"
                            placeholder={suggestions.length ? "Select a teacher" : "No teachers available"}
                            value={fields.instructor}
                            options={suggestions.map((n) => ({ value: n, label: n }))}
                            onChange={(instructor) => patch({ instructor })}
                            disabled={!suggestions.length}
                          />
                        </Field>
                        <Field label="Topic" htmlFor="bc-topic" optional hint="A label only. Courses are sold separately.">
                          <CustomSelect
                            id="bc-topic"
                            aria-label="Topic"
                            placeholder="No topic"
                            value={fields.courseId}
                            onChange={(courseId) => patch({ courseId })}
                            options={[{ value: "", label: "No topic" }, ...courses.map((c) => ({ value: c.id, label: c.title }))]}
                          />
                        </Field>
                      </div>
                      <div className="space-y-2.5">
                        <p id="bc-price-label" className="text-xs font-semibold text-foreground">
                          How do learners join?
                        </p>
                        <div role="radiogroup" aria-labelledby="bc-price-label" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Tile active={priceMode === "paid"} onClick={() => choosePrice("paid")} icon={Ticket} title="Paid" description="Learners pay once at checkout to join." />
                          <Tile active={priceMode === "free"} onClick={() => choosePrice("free")} icon={Gift} title="Free" description="No checkout. Your team adds learners." />
                        </div>
                        {priceMode === "paid" && (
                          <div className="rounded-lg border border-border bg-surface p-3.5">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="relative w-36">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden="true">
                                  ₹
                                </span>
                                <Input
                                  id="bc-price"
                                  inputMode="numeric"
                                  placeholder="e.g. 4999"
                                  aria-label="Batch price in rupees"
                                  value={priceDraft}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, "").replace(/^0+(\d)/, "$1").slice(0, 8)
                                    setPriceDraft(digits)
                                    patch({ price: digits ? Number(digits) : 0 })
                                  }}
                                  className="pl-7 tabular-nums"
                                />
                              </div>
                              <div role="radiogroup" aria-label="Quick prices" className="flex flex-wrap gap-1.5">
                                {PRICE_PRESETS.map((p) => (
                                  <Chip key={p} active={fields.price === p} onClick={() => setPaid(p)}>
                                    ₹{p.toLocaleString("en-IN")}
                                  </Chip>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Field label="Start date" htmlFor="bc-start">
                            <DatePicker id="bc-start" aria-label="Start date" value={fields.startDate} onChange={changeStart} placeholder="Select start date" />
                          </Field>
                          <Field label="End date" htmlFor="bc-end">
                            <DatePicker id="bc-end" aria-label="End date" value={fields.endDate} onChange={(endDate) => patch({ endDate })} placeholder="Select end date" min={fields.startDate || undefined} />
                          </Field>
                        </div>
                        <div role="radiogroup" aria-label="Batch length" className="flex flex-wrap items-center gap-1.5">
                          <span className="mr-1 text-[11px] text-subtle-foreground">Length</span>
                          {DURATIONS.map((d) => (
                            <Chip key={d.days} active={durationActive(d.days)} disabled={!fields.startDate} onClick={() => patch({ endDate: addDaysIso(fields.startDate, d.days) })}>
                              {d.label}
                            </Chip>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <p id="bc-delivery-label" className="text-xs font-semibold text-foreground">
                          Format
                        </p>
                        <div role="radiogroup" aria-labelledby="bc-delivery-label" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {DELIVERY.map((d) => (
                            <Tile key={d.value} active={fields.deliveryMode === d.value} onClick={() => patch({ deliveryMode: d.value })} icon={d.icon} title={d.label} description={d.description} />
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Seats" htmlFor="bc-seats" hint="Registration closes when the batch is full.">
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="icon" aria-label="Fewer seats" onClick={() => patch({ maxSeats: Math.max(1, (Number(fields.maxSeats) || 1) - 5) })}>
                              <Minus aria-hidden="true" />
                            </Button>
                            <Input
                              id="bc-seats"
                              type="number"
                              min={1}
                              max={5000}
                              step={1}
                              placeholder="e.g. 100"
                              value={fields.maxSeats}
                              onChange={(e) => patch({ maxSeats: e.target.value === "" ? Number.NaN : Number(e.target.value) })}
                              className="text-center tabular-nums"
                            />
                            <Button type="button" variant="outline" size="icon" aria-label="More seats" onClick={() => patch({ maxSeats: Math.min(5000, (Number(fields.maxSeats) || 0) + 5) })}>
                              <Plus aria-hidden="true" />
                            </Button>
                          </div>
                          <div role="radiogroup" aria-label="Quick seat counts" className="flex flex-wrap gap-1.5 pt-1">
                            {SEAT_PRESETS.map((n) => (
                              <Chip key={n} active={fields.maxSeats === n} onClick={() => patch({ maxSeats: n })}>
                                {n}
                              </Chip>
                            ))}
                          </div>
                        </Field>
                        <Field label="Timezone" htmlFor="bc-tz">
                          <CustomSelect id="bc-tz" aria-label="Timezone" value={fields.timezone} onChange={(timezone) => patch({ timezone })} options={TIMEZONES} />
                        </Field>
                      </div>

                      <Field label="Class timings" htmlFor="bc-schedule" hint="Shown to learners on the batch page. You'll set exact class dates from Live sessions.">
                        <Input id="bc-schedule" maxLength={150} placeholder="Mon, Wed, Fri · 7:30 PM - 9:30 PM" value={fields.schedule} onChange={(e) => patch({ schedule: e.target.value })} />
                        <div role="radiogroup" aria-label="Timing suggestions" className="flex flex-wrap gap-1.5 pt-1">
                          {SCHEDULE_PRESETS.map((s) => (
                            <Chip key={s} active={fields.schedule === s} onClick={() => patch({ schedule: s })}>
                              {s}
                            </Chip>
                          ))}
                        </div>
                      </Field>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold text-foreground">Included with this batch</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {PERKS.map((p) => (
                            <PerkTile key={p.key} on={fields[p.key]} onToggle={() => patch({ [p.key]: !fields[p.key] })} icon={p.icon} label={p.label} description={p.description} />
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Access length" hint="How long learners keep access after joining.">
                          <div role="radiogroup" aria-label="Access length" className="flex flex-wrap gap-1.5">
                            {ACCESS_OPTIONS.map((o) => (
                              <Chip key={o.value} active={fields.accessExpiryMonths === o.value} onClick={() => patch({ accessExpiryMonths: o.value })}>
                                {o.label}
                              </Chip>
                            ))}
                          </div>
                        </Field>
                        <Field label="Replays appear after" hint="Delay before a class recording is published.">
                          <div role="radiogroup" aria-label="Replay delay" className="flex flex-wrap gap-1.5">
                            {REPLAY_OPTIONS.map((o) => (
                              <Chip key={o.value} active={fields.replayDelayHours === o.value} onClick={() => patch({ replayDelayHours: o.value })}>
                                {o.label}
                              </Chip>
                            ))}
                          </div>
                        </Field>
                      </div>

                      <Field label="Internal notes" htmlFor="bc-notes" optional>
                        <textarea
                          id="bc-notes"
                          rows={3}
                          maxLength={1000}
                          placeholder="Kickoff reminders, prerequisites, capstone dates…"
                          value={fields.notes}
                          onChange={(e) => patch({ notes: e.target.value })}
                          className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground shadow-[var(--elev-xs)] placeholder:text-subtle-foreground hover:border-subtle-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20"
                        />
                        <p className="text-right text-[11px] tabular-nums text-subtle-foreground">{fields.notes.length} / 1,000</p>
                      </Field>

                      <div className="flex items-start gap-3 rounded-lg border border-primary-border bg-primary-soft p-3.5">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />
                        <p className="text-xs leading-relaxed text-foreground">
                          Your batch is created as a <span className="font-semibold">draft</span>. Next, add your teaching team, schedule classes and open registration from the batch page.
                        </p>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </fieldset>
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-5 py-4 sm:px-8">
            {step > 0 ? (
              <Button type="button" variant="ghost" disabled={saving} onClick={() => go(step - 1)} leftIcon={<ArrowLeft />}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
            <Button type="submit" loading={saving} rightIcon={last ? undefined : <ArrowRight />}>
              {last ? "Create batch" : "Continue"}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}
