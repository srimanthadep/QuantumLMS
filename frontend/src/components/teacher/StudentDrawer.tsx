import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  BellRing,
  Check,
  CheckCircle2,
  FileText,
  Flame,
  ListChecks,
  Mail,
  NotebookPen,
  PlayCircle,
  Send,
  Upload,
  type LucideIcon,
} from "lucide-react"
import { Avatar, Badge, Button, Progress, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Textarea } from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import CopyButton from "@/components/student/CopyButton"
import { getStudentActivityHeatmap } from "@/data/studentActivityData"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import type { ActivityEventType, StudentActivitySummary, StudentDayActivity } from "@/types"
import { useTeacherData } from "@/pages/teacher/teacherStore"
import { firstName, STUDENT_STATUS_TONE, toDate } from "@/pages/teacher/teacherUtils"
import SendReportDialog from "./SendReportDialog"

interface StudentDrawerProps {
  studentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SUBJECTS = [
  { key: "math", label: "Maths" },
  { key: "science", label: "Science" },
  { key: "english", label: "English" },
  { key: "art", label: "Art & design" },
] as const

const LEVEL = ["bg-surface-2 ring-1 ring-inset ring-border", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary"]
const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""]

const EVENT_ICON: Record<ActivityEventType, LucideIcon> = {
  lesson_completed: CheckCircle2,
  video_watched: PlayCircle,
  material_opened: FileText,
  assignment_submitted: Upload,
  quiz_attempted: ListChecks,
}

const scoreTone = (v: number) => (v >= 85 ? "success" : v >= 70 ? "primary" : "warning") as "success" | "primary" | "warning"

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">{children}</h3>
}

/** 12-week activity grid. Hovering a day shows its count in the caption below. */
function ActivityGrid({ summary }: { summary: StudentActivitySummary }) {
  const [hover, setHover] = useState<StudentDayActivity | null>(null)
  const columns = summary.weeks.map((w) => {
    const slots: (StudentDayActivity | null)[] = Array(7).fill(null)
    for (const d of w.days) slots[(d.dayOfWeek + 6) % 7] = d
    return { key: w.weekIndex, month: w.monthLabel, slots }
  })
  return (
    <div>
      <div className="flex gap-2">
        <div className="grid grid-rows-7 gap-[3px] pt-4 text-[9px] leading-3 text-subtle-foreground" aria-hidden="true">
          {WEEKDAY_LABELS.map((l, i) => (
            <span key={i} className="h-3">
              {l}
            </span>
          ))}
        </div>
        <div
          role="img"
          aria-label={`${summary.totalActivities} learning activities on ${summary.totalActiveDays} days over the last 12 weeks`}
          className="min-w-0 overflow-x-auto"
          onPointerLeave={() => setHover(null)}
        >
          <div className="flex gap-[3px]">
            {columns.map((c, ci) => (
              <div key={c.key} className="flex flex-col gap-[3px]">
                <span className="h-3 text-[9px] leading-3 text-subtle-foreground" aria-hidden="true">
                  {c.month ?? ""}
                </span>
                {c.slots.map((d, di) => (
                  <motion.span
                    key={di}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...transition.base, delay: ci * 0.025 }}
                    onPointerEnter={() => d && setHover(d)}
                    className={cn(
                      "h-3 w-3 rounded-[3px] transition-transform duration-150",
                      d ? cn(LEVEL[d.level], "hover:scale-125") : "bg-transparent",
                      hover && d && hover.date === d.date && "ring-2 ring-primary ring-offset-1 ring-offset-surface",
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-caption text-muted-foreground" aria-live="polite">
        <span className="min-w-0 truncate">
          {hover
            ? `${toDate(hover.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}: ${hover.count} ${hover.count === 1 ? "activity" : "activities"}`
            : "Hover a day to see its activity"}
        </span>
        <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
          Less
          {LEVEL.map((l, i) => (
            <span key={i} className={cn("h-2.5 w-2.5 rounded-[3px]", l)} />
          ))}
          More
        </span>
      </div>
    </div>
  )
}

/** Learner profile: progress, subjects, activity, notes and family contact, with message, report and nudge actions. */
export default function StudentDrawer({ studentId, open, onOpenChange }: StudentDrawerProps) {
  const { students, updateStudent, notify } = useTeacherData()
  const student = students.find((s) => s.id === studentId) ?? null
  const [notes, setNotes] = useState("")
  const [saved, setSaved] = useState(false)
  const [nudged, setNudged] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportFor, setReportFor] = useState<string | undefined>(undefined)

  // Reset the form whenever the drawer opens for a learner (state adjusted during render, not in an effect).
  const syncKey = open && student ? student.id : null
  const [syncedFor, setSyncedFor] = useState<string | null>(null)
  if (syncedFor !== syncKey) {
    setSyncedFor(syncKey)
    if (student && syncKey) {
      setNotes(student.teacherNotes ?? "")
      setNudged(false)
      setSaved(false)
    }
  }

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 1800)
    return () => clearTimeout(t)
  }, [saved])

  const summary = useMemo(() => (student ? getStudentActivityHeatmap(student) : null), [student])
  const recent = useMemo(() => {
    if (!summary) return []
    return summary.weeks
      .flatMap((w) => w.days)
      .filter((d) => d.events.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .flatMap((d) => d.events.map((e) => ({ ...e, date: d.date })))
      .slice(0, 4)
  }, [summary])

  const name = student ? firstName(student.name) : ""
  const dirty = !!student && notes.trim() !== (student.teacherNotes ?? "").trim()

  return (
    <>
      <Sheet open={open && !!student} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="max-w-xl gap-6 pb-0">
          {student && summary && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <Avatar src={student.image} name={student.name} size="xl" status={student.lastActivity === "Just now" ? "online" : undefined} />
                  <div className="min-w-0">
                    <SheetTitle className="truncate">{student.name}</SheetTitle>
                    <SheetDescription className="truncate">
                      {student.rollNumber} · {student.assignedClass ?? "Year 4"}
                    </SheetDescription>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone={STUDENT_STATUS_TONE[student.status]} dot>
                        {student.status}
                      </Badge>
                      {student.grade && <Badge tone="primary">Grade {student.grade}</Badge>}
                      <span className="text-caption text-muted-foreground">Active {student.lastActivity?.toLowerCase() ?? "recently"}</span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <section aria-label="Progress" className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-surface-2/60 p-4">
                {[
                  { label: "Completion", value: student.completion, tone: "primary" as const },
                  { label: "Average", value: student.average, tone: scoreTone(student.average) === "warning" ? ("warning" as const) : ("success" as const) },
                  { label: "Attendance", value: student.attendance, tone: student.attendance < 80 ? ("danger" as const) : ("success" as const) },
                ].map((r) => (
                  <div key={r.label} className="flex flex-col items-center gap-2 text-center">
                    <ProgressRing value={r.value} size={72} thickness={7} tone={r.tone} label={`${r.label} ${r.value}%`} />
                    <span className="text-caption font-medium text-muted-foreground">{r.label}</span>
                  </div>
                ))}
              </section>

              <section className="space-y-3">
                <SectionLabel>Subjects</SectionLabel>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {SUBJECTS.map((s) => {
                    const v = student.subjects[s.key]
                    return (
                      <li key={s.key}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="text-foreground">{s.label}</span>
                          <span className="font-medium tabular-nums text-foreground">{v}%</span>
                        </div>
                        <Progress value={v} tone={scoreTone(v)} label={`${s.label} ${v}%`} />
                      </li>
                    )
                  })}
                </ul>
              </section>

              {student.courses && student.courses.length > 0 && (
                <section className="space-y-3">
                  <SectionLabel>Courses</SectionLabel>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {student.courses.map((c) => (
                      <li key={c.code} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                          <p className="text-caption text-muted-foreground">{c.code}</p>
                        </div>
                        <div className="w-28 shrink-0">
                          <Progress value={c.progress} size="xs" label={`${c.name} ${c.progress}%`} />
                        </div>
                        <span className="w-9 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">{c.progress}%</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <SectionLabel>Learning activity</SectionLabel>
                  <span className="inline-flex items-center gap-1 text-caption font-medium text-warning">
                    <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                    Best streak {summary.longestStreakDays} days
                  </span>
                </div>
                <ActivityGrid summary={summary} />
                <dl className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Active days", value: summary.totalActiveDays },
                    { label: "Activities", value: summary.totalActivities },
                    { label: "Pending work", value: student.pendingAssignments ?? 0 },
                  ].map((s) => (
                    <div key={s.label} className="rounded-md border border-border px-2 py-2">
                      <dd className="text-base font-semibold tabular-nums text-foreground">{s.value}</dd>
                      <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
                    </div>
                  ))}
                </dl>
                {recent.length > 0 && (
                  <ul className="space-y-2">
                    {recent.map((e) => {
                      const Icon = EVENT_ICON[e.type]
                      return (
                        <li key={e.id} className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-foreground">{e.title}</p>
                            <p className="text-caption text-muted-foreground">
                              {toDate(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {e.timestamp}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <SectionLabel>Teacher notes</SectionLabel>
                  <AnimatePresence>
                    {saved && (
                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={transition.fast}
                        className="inline-flex items-center gap-1 text-caption font-medium text-success"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Saved
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <label htmlFor="student-drawer-notes" className="sr-only">
                  Teacher notes for {student.name}
                </label>
                <Textarea id="student-drawer-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={`What should you remember about ${name}?`} />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!dirty}
                    leftIcon={<NotebookPen aria-hidden="true" />}
                    onClick={() => {
                      updateStudent(student.id, { teacherNotes: notes.trim() })
                      setSaved(true)
                      notify(`Notes saved for ${name}`)
                    }}
                  >
                    Save notes
                  </Button>
                </div>
              </section>

              <section className="space-y-2">
                <SectionLabel>Family contact</SectionLabel>
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Avatar name={student.parentName || "Parent"} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{student.parentName || "Not added yet"}</p>
                    <p className="truncate text-caption text-muted-foreground">{student.parentEmail || "Ask the family to add an email"}</p>
                  </div>
                  {student.parentEmail && <CopyButton text={student.parentEmail} size="icon-sm" aria-label={`Copy ${student.parentName}'s email`} />}
                </div>
              </section>

              <div className="sticky bottom-0 -mx-6 mt-auto flex flex-wrap items-center gap-2 border-t border-border bg-surface/95 px-6 py-3 backdrop-blur">
                <Button
                  leftIcon={<Send aria-hidden="true" />}
                  onClick={() => {
                    setReportFor(student.id)
                    onOpenChange(false)
                    setReportOpen(true)
                  }}
                >
                  Send report
                </Button>
                <Button
                  variant="outline"
                  disabled={nudged}
                  leftIcon={nudged ? <Check aria-hidden="true" /> : <BellRing aria-hidden="true" />}
                  onClick={() => {
                    setNudged(true)
                    notify(`Nudge sent to ${name}${student.parentName ? ` and ${student.parentName}` : ""}`)
                  }}
                >
                  {nudged ? "Nudged" : "Nudge"}
                </Button>
                {student.email && (
                  <Button asChild variant="ghost" className="ml-auto">
                    <a href={`mailto:${student.email}`}>
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      Message
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <SendReportDialog open={reportOpen} onOpenChange={setReportOpen} studentId={reportFor} />
    </>
  )
}
