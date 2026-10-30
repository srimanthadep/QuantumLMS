import { useEffect, useMemo, useState } from "react"
import { Send } from "lucide-react"
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Label,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui"
import { useTeacherData } from "@/pages/teacher/teacherStore"
import { average } from "@/pages/teacher/teacherUtils"

interface SendReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Student id to address the report to a single family. */
  studentId?: string
}

const TYPES = ["Weekly Digest", "Individual Alert", "Subject Focus", "Term Summary"] as const
const SECTIONS = ["Attendance", "Scores", "Course progress", "Teacher notes"] as const

/** Compose a progress report for one family or the whole cohort, now or on Monday. */
export default function SendReportDialog({ open, onOpenChange, studentId }: SendReportDialogProps) {
  const { students, addReport, notify } = useTeacherData()
  const [target, setTarget] = useState("all")
  const [type, setType] = useState<(typeof TYPES)[number]>("Weekly Digest")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [sections, setSections] = useState<Set<string>>(new Set(SECTIONS))
  const [when, setWhen] = useState<"now" | "monday">("now")
  const [error, setError] = useState<string | null>(null)

  const student = students.find((s) => s.id === target)
  const defaultTitle = useMemo(
    () => (student ? `Progress check-in · ${student.name}` : `${type} · Week of 19 Oct`),
    [student, type],
  )

  useEffect(() => {
    if (!open) return
    setTarget(studentId ?? "all")
    setType(studentId ? "Individual Alert" : "Weekly Digest")
    setTitle("")
    setMessage("")
    setSections(new Set(SECTIONS))
    setWhen("now")
    setError(null)
  }, [open, studentId])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (sections.size === 0) {
      setError("Include at least one section.")
      return
    }
    const finalTitle = title.trim() || defaultTitle
    const cohortAvg = Math.round(average(students.map((s) => s.average)))
    const cohortAtt = Math.round(average(students.map((s) => s.attendance)))
    addReport({
      title: finalTitle,
      meta: when === "now" ? "Sent just now" : "Scheduled Mon 26 Oct",
      date: when === "now" ? "Oct 22, 2026" : "Oct 26, 2026",
      type,
      recipients: student ? `${student.parentName || "Parent"} (${student.name})` : `All parents (${students.length})`,
      readRate: 0,
      status: when === "now" ? "Sent" : "Scheduled",
      tone: when === "now" ? "green" : "yellow",
      summary: {
        avgScore: student?.average ?? cohortAvg,
        attendance: student?.attendance ?? cohortAtt,
        readCount: when === "now" ? "Delivered just now" : "Queued for Monday 8:00 AM",
        topGain: student ? `${student.completion}% course completion` : "Cohort summary",
        notes: message.trim() || `Includes ${[...sections].join(", ").toLowerCase()}.`,
      },
    })
    notify(when === "now" ? `Report “${finalTitle}” sent` : `Report “${finalTitle}” scheduled for Monday`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Send a progress report</DialogTitle>
            <DialogDescription>Families get it in the learner portal and by email.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Recipients">
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All families ({students.length})</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Report type">
              <Select value={type} onValueChange={(v) => setType(v as (typeof TYPES)[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Title" hint="Leave blank to use the suggested title.">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={defaultTitle} />
          </Field>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium text-foreground">Include</legend>
            <div className="grid grid-cols-2 gap-2">
              {SECTIONS.map((s) => {
                const id = `report-section-${s.replace(/\s+/g, "-").toLowerCase()}`
                return (
                  <div key={s} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                    <Checkbox
                      id={id}
                      checked={sections.has(s)}
                      onCheckedChange={(v) => {
                        setError(null)
                        setSections((cur) => {
                          const n = new Set(cur)
                          if (v) n.add(s)
                          else n.delete(s)
                          return n
                        })
                      }}
                    />
                    <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                      {s}
                    </Label>
                  </div>
                )
              })}
            </div>
            {error && (
              <p role="alert" className="text-caption font-medium text-danger">
                {error}
              </p>
            )}
          </fieldset>
          <Field label="Personal note" hint="Optional">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="A sentence or two about wins and next steps…" />
          </Field>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-foreground">Delivery</span>
            <SegmentedControl
              aria-label="Delivery"
              options={[
                { value: "now" as const, label: "Send now" },
                { value: "monday" as const, label: "Monday 8:00 AM" },
              ]}
              value={when}
              onChange={setWhen}
              block
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" leftIcon={<Send aria-hidden="true" />}>
              {when === "now" ? "Send report" : "Schedule report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
