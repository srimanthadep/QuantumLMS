import { useEffect, useState } from "react"
import { BookOpen, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CustomSelect } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AdminCourse } from "@/data/adminStore"
import { CATEGORIES, STATUSES } from "./courseTheme"

export interface CourseFormValues {
  title: string
  category: AdminCourse["category"]
  instructor: string
  price: number
  capacity: number
  status: AdminCourse["status"]
}

interface CourseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `create` shows the "new course" copy, `edit` pre-fills from `course`. */
  mode: "create" | "edit"
  course?: AdminCourse | null
  instructors: string[]
  onSubmit: (values: CourseFormValues) => void
}

const EMPTY: CourseFormValues = {
  title: "",
  category: "LLM Engineering",
  instructor: "",
  price: 39999,
  capacity: 300,
  status: "Published",
}

const toValues = (c: AdminCourse): CourseFormValues => ({
  title: c.title,
  category: c.category,
  instructor: c.instructor,
  price: c.price,
  capacity: c.capacity,
  status: c.status,
})

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      {children}
    </div>
  )
}

/** One form for both creating a course and quick-editing its catalog details. */
export default function CourseFormDialog({ open, onOpenChange, mode, course, instructors, onSubmit }: CourseFormDialogProps) {
  const [values, setValues] = useState<CourseFormValues>(EMPTY)

  // Reset whenever the dialog opens so stale edits never leak between courses.
  useEffect(() => {
    if (!open) return
    setValues(mode === "edit" && course ? toValues(course) : { ...EMPTY, instructor: instructors[0] ?? "" })
  }, [open, mode, course, instructors])

  const set = <K extends keyof CourseFormValues>(key: K, value: CourseFormValues[K]) => setValues((v) => ({ ...v, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.title.trim() || !values.instructor.trim()) return
    onSubmit({ ...values, title: values.title.trim(), instructor: values.instructor.trim() })
  }

  const Icon = mode === "create" ? BookOpen : Pencil

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-border bg-primary-soft text-primary-text">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>{mode === "create" ? "Add new AI course" : "Edit course details"}</DialogTitle>
              <DialogDescription>
                {mode === "create"
                  ? "Create a course shell, then add chapters and videos in its workspace."
                  : "Update catalog details. Open the course to manage its curriculum."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <FormField label="Course title">
            <Input required autoFocus placeholder="e.g. Multi-Modal Vision & Speech Systems" value={values.title} onChange={(e) => set("title", e.target.value)} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Domain category">
              <CustomSelect value={values.category} onChange={(v) => set("category", v)} options={[...CATEGORIES]} />
            </FormField>
            <FormField label="Lead instructor">
              {mode === "create" ? (
                <CustomSelect value={values.instructor} onChange={(v) => set("instructor", v)} options={instructors} />
              ) : (
                <Input required value={values.instructor} onChange={(e) => set("instructor", e.target.value)} />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Tuition fee (₹)">
              <Input type="number" min={0} value={values.price} onChange={(e) => set("price", Number(e.target.value))} />
            </FormField>
            <FormField label="Seat capacity">
              <Input type="number" min={1} value={values.capacity} onChange={(e) => set("capacity", Number(e.target.value))} />
            </FormField>
            <FormField label="Status">
              <CustomSelect value={values.status} onChange={(v) => set("status", v as AdminCourse["status"])} options={STATUSES} />
            </FormField>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{mode === "create" ? "Create course" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

