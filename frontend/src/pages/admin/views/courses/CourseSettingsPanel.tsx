import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { RotateCcw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Field from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CustomSelect } from "@/components/ui/select"
import { SegmentedControl } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { AdminCourse } from "@/data/adminStore"
import { CATEGORIES } from "./courseTheme"
import CoursePricingField from "./CoursePricingField"
import { LEVELS, type CourseDetailRecord } from "./courseContent"

export interface CourseSettingsValues {
  title: string
  category: string
  instructor: string
  level: string
  duration: string
  description: string
  price: number
  /** null means unlimited. */
  capacity: number | null
  status: AdminCourse["status"]
}

export function settingsFromRecord(c: CourseDetailRecord): CourseSettingsValues {
  return {
    title: c.title ?? "",
    category: c.category ?? CATEGORIES[0],
    instructor: c.instructor ?? "",
    level: c.level || "Intermediate",
    duration: c.duration ?? "",
    description: c.description ?? "",
    price: Number(c.price) || 0,
    capacity: c.capacity === null || c.capacity === undefined ? null : Number(c.capacity) || null,
    status: c.status ?? "Draft",
  }
}

interface CourseSettingsPanelProps {
  record: CourseDetailRecord
  onSave: (values: CourseSettingsValues) => Promise<boolean>
  onDirtyChange: (dirty: boolean) => void
}

const STATUS_HELP: Record<AdminCourse["status"], string> = {
  Published: "Visible in the catalog. Learners can enroll right away.",
  Draft: "Hidden from learners while you build it.",
  Archived: "Hidden from the catalog. Enrolled learners keep access.",
}

/** Course details form. Unsaved edits survive tab switches; the save bar sticks to the bottom of the page. */
export default function CourseSettingsPanel({ record, onSave, onDirtyChange }: CourseSettingsPanelProps) {
  const initial = useMemo(() => settingsFromRecord(record), [record])
  const [values, setValues] = useState<CourseSettingsValues>(initial)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // A fresh record from the server becomes the new baseline. Fields the admin has not touched
  // follow the server; fields they are editing keep their unsaved value.
  const baseline = useRef(initial)
  useEffect(() => {
    const prev = baseline.current
    if (prev === initial) return
    baseline.current = initial
    setValues((current) => {
      const next = { ...initial }
      for (const k of Object.keys(initial) as (keyof CourseSettingsValues)[]) {
        if (current[k] !== prev[k]) (next as Record<string, unknown>)[k] = current[k]
      }
      return next
    })
  }, [initial])

  const dirty = useMemo(() => (Object.keys(initial) as (keyof CourseSettingsValues)[]).some((k) => initial[k] !== values[k]), [initial, values])
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const errors = {
    title: values.title.trim().length < 3 ? "Use at least 3 characters." : "",
    instructor: !values.instructor.trim() ? "Add the lead instructor." : "",
    price: values.price !== 0 && (!Number.isInteger(values.price) || values.price < 1) ? "Enter a price of at least ₹1, or choose Free." : "",
    capacity: values.capacity !== null && (!Number.isInteger(values.capacity) || values.capacity < 1) ? "Limit must be at least 1." : "",
  }
  const invalid = Object.values(errors).some(Boolean)

  const set = <K extends keyof CourseSettingsValues>(key: K, value: CourseSettingsValues[K]) => setValues((v) => ({ ...v, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (invalid || !dirty) return
    setSaving(true)
    const ok = await onSave({ ...values, title: values.title.trim(), instructor: values.instructor.trim(), duration: values.duration.trim(), description: values.description.trim() })
    setSaving(false)
    if (ok) setSubmitted(false)
  }

  const show = (msg: string) => (submitted ? msg || undefined : undefined)
  const categoryOptions = Array.from(new Set([...CATEGORIES, values.category].filter(Boolean)))

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Catalog details</h3>
              <p className="text-caption text-muted-foreground">What learners see on the course page.</p>
            </div>
            <Field label="Course title" required error={show(errors.title)}>
              <Input value={values.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category">
                <CustomSelect value={values.category} onChange={(v) => set("category", v)} options={categoryOptions} />
              </Field>
              <Field label="Lead instructor" required error={show(errors.instructor)}>
                <Input value={values.instructor} onChange={(e) => set("instructor", e.target.value)} />
              </Field>
            </div>
            <Field label="Overview" hint="Prerequisites, topics covered and what learners will be able to do.">
              <Textarea rows={5} value={values.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </Card>

          <Card className="space-y-4 p-5">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Level, duration and pricing</h3>
              <p className="text-caption text-muted-foreground">Courses are self-paced. Free ones bring in learners and paid ones convert them.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Level">
                <CustomSelect value={values.level} onChange={(v) => set("level", v)} options={[...LEVELS]} />
              </Field>
              <Field label="Duration">
                <Input value={values.duration} onChange={(e) => set("duration", e.target.value)} placeholder="e.g. 12 Weeks" />
              </Field>
            </div>
            <CoursePricingField price={values.price} capacity={values.capacity} priceError={show(errors.price)} capacityError={show(errors.capacity)} onChange={(next) => setValues((v) => ({ ...v, ...next }))} />
          </Card>
        </div>

        <Card className="h-fit space-y-3 p-5">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Visibility</h3>
            <p className="text-caption text-muted-foreground">{STATUS_HELP[values.status]}</p>
          </div>
          <SegmentedControl
            size="sm"
            aria-label="Course status"
            className="w-full [&_button]:flex-1"
            value={values.status}
            onChange={(v) => set("status", v)}
            options={(["Draft", "Published", "Archived"] as AdminCourse["status"][]).map((s) => ({ value: s, label: s }))}
          />
        </Card>
      </div>

      <div
        className={cn(
          "sticky bottom-0 z-20 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6",
          !dirty && "hidden",
        )}
        role="region"
        aria-label="Unsaved changes"
      >
        <p className="text-sm text-muted-foreground">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-warning align-middle" aria-hidden="true" />
          You have unsaved changes
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" leftIcon={<RotateCcw aria-hidden="true" />} onClick={() => { setValues(initial); setSubmitted(false) }} disabled={saving}>
            Discard
          </Button>
          <Button type="submit" size="sm" loading={saving} leftIcon={<Save aria-hidden="true" />}>
            Save changes
          </Button>
        </div>
      </div>
    </form>
  )
}
