import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BellRing, Check, CheckCheck, Download, FileText, Inbox, Sparkles } from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  SegmentedControl,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  type BadgeTone,
} from "@/components/ui"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import type { StudentModuleSubmission } from "@/types"
import { downloadTextFile } from "@/pages/student/studentUtils"
import { useTeacherData } from "@/pages/teacher/teacherStore"
import { firstName } from "@/pages/teacher/teacherUtils"

interface GradingSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `assignmentKey(courseId, moduleId)` of the assignment to grade. */
  assignmentId: string | null
}

type Filter = "todo" | "graded" | "missing" | "all"

const SUBMISSION_TONE: Record<StudentModuleSubmission["status"], BadgeTone> = {
  Submitted: "info",
  Late: "warning",
  Graded: "success",
  Pending: "neutral",
}
const SUBMISSION_LABEL: Record<StudentModuleSubmission["status"], string> = {
  Submitted: "To grade",
  Late: "Late",
  Graded: "Graded",
  Pending: "Missing",
}

const toGrade = (s: StudentModuleSubmission) => s.status === "Submitted" || s.status === "Late"
const missing = (s: StudentModuleSubmission) => s.status === "Pending"

function suggestFeedback(name: string, pct: number): string {
  if (pct >= 90) return `Excellent work, ${name}. Your reasoning is clear and every step is justified. Next, try extending it with one edge case of your own.`
  if (pct >= 75) return `Good job, ${name}. The core idea is right. Tighten the explanation in the middle steps and check your final answer against the rubric.`
  if (pct >= 50) return `${name}, you're on the right track. Revisit the worked example from class, then redo the second half. I'm happy to go through it in office hours.`
  return `${name}, let's work through this together. Book a 10-minute slot in office hours and bring your draft so we can find where it went off track.`
}

/** Grade an assignment's submissions one after another: score, feedback, save and move to the next. */
export default function GradingSheet({ open, onOpenChange, assignmentId }: GradingSheetProps) {
  const { assignments, gradeSubmission, notify } = useTeacherData()
  const assignment = assignmentId ? assignments[assignmentId] : undefined
  const submissions = useMemo(() => assignment?.submissions ?? [], [assignment])
  const max = assignment?.maxMarks ?? 100

  const [filter, setFilter] = useState<Filter>("todo")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [score, setScore] = useState("")
  const [feedback, setFeedback] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [nudged, setNudged] = useState<Set<string>>(new Set())

  // Pick a starting filter and submission each time the sheet opens.
  const openKey = open && assignmentId ? assignmentId : null
  const [openedFor, setOpenedFor] = useState<string | null>(null)
  if (openedFor !== openKey) {
    setOpenedFor(openKey)
    if (openKey) {
      const first = submissions.find(toGrade) ?? submissions[0]
      setFilter(submissions.some(toGrade) ? "todo" : "all")
      setSelectedId(first?.studentId ?? null)
      setNudged(new Set())
    }
  }

  const selected = submissions.find((s) => s.studentId === selectedId) ?? null
  // Load the selected submission's existing grade into the form.
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const loadKey = selected ? `${openKey}:${selected.studentId}:${selected.status}` : null
  if (loadedFor !== loadKey) {
    setLoadedFor(loadKey)
    setScore(selected?.score !== undefined ? String(selected.score) : "")
    setFeedback(selected?.teacherFeedback ?? "")
    setError(null)
  }

  const counts = {
    todo: submissions.filter(toGrade).length,
    graded: submissions.filter((s) => s.status === "Graded").length,
    missing: submissions.filter(missing).length,
  }
  const visible = submissions.filter((s) =>
    filter === "todo" ? toGrade(s) : filter === "graded" ? s.status === "Graded" : filter === "missing" ? missing(s) : true,
  )

  const save = (advance: boolean) => {
    if (!assignment || !assignmentId || !selected) return
    const n = Number(score)
    if (score.trim() === "" || !Number.isFinite(n) || n < 0 || n > max) {
      setError(`Enter a score from 0 to ${max}.`)
      return
    }
    const name = firstName(selected.studentName)
    const text = feedback.trim() || suggestFeedback(name, (n / max) * 100)
    gradeSubmission(assignmentId, selected.studentId, Math.round(n), text)
    notify(`Graded ${selected.studentName}: ${Math.round(n)}/${max}`)
    if (!advance) return
    const order = submissions.filter((s) => toGrade(s) && s.studentId !== selected.studentId)
    const idx = submissions.findIndex((s) => s.studentId === selected.studentId)
    const next = order.find((s) => submissions.indexOf(s) > idx) ?? order[0]
    if (next) setSelectedId(next.studentId)
    else {
      setFilter("graded")
      notify("All submissions are graded")
    }
  }

  const draft = () => {
    if (!selected) return
    setDrafting(true)
    const n = Number(score)
    const pct = score.trim() !== "" && Number.isFinite(n) ? (n / max) * 100 : 80
    setTimeout(() => {
      setFeedback(suggestFeedback(firstName(selected.studentName), pct))
      setDrafting(false)
    }, 650)
  }

  const nudge = (ids: string[]) => {
    setNudged((cur) => new Set([...cur, ...ids]))
    notify(ids.length === 1 ? `Reminder sent to ${submissions.find((s) => s.studentId === ids[0])?.studentName}` : `Reminder sent to ${ids.length} learners`)
  }

  const pending = submissions.filter((s) => missing(s) && !nudged.has(s.studentId))
  const average = assignment?.averageScore !== undefined ? Math.round((assignment.averageScore / max) * 100) : null

  return (
    <Sheet open={open && !!assignment} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-2xl gap-5">
        {assignment && (
          <>
            <SheetHeader>
              <p className="text-caption font-medium uppercase tracking-wider text-primary-text">{assignment.moduleTitle}</p>
              <SheetTitle>{assignment.title}</SheetTitle>
              <SheetDescription>
                {assignment.type} · Due {assignment.dueDate} · {max} marks
              </SheetDescription>
            </SheetHeader>

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "To grade", value: counts.todo, tone: "text-info" },
                { label: "Graded", value: counts.graded, tone: "text-success" },
                { label: "Missing", value: counts.missing, tone: "text-warning" },
                { label: "Average", value: average === null ? "–" : `${average}%`, tone: "text-foreground" },
              ].map((s) => (
                <div key={s.label} className="rounded-md border border-border bg-surface-2/60 px-3 py-2">
                  <dt className="text-[11px] font-medium text-muted-foreground">{s.label}</dt>
                  <dd className={cn("text-lg font-semibold tabular-nums", s.tone)}>{s.value}</dd>
                </div>
              ))}
            </dl>

            <AnimatePresence mode="wait" initial={false}>
              {selected && (
                <motion.section
                  key={selected.studentId}
                  aria-label={`Grade ${selected.studentName}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, transition: transition.fast }}
                  transition={transition.base}
                  className="rounded-lg border border-border bg-surface-2/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={selected.studentAvatar} name={selected.studentName} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{selected.studentName}</p>
                      <p className="truncate text-caption text-muted-foreground">
                        {selected.studentRoll} · {missing(selected) ? "Not submitted yet" : `Submitted ${selected.submittedAt}`}
                      </p>
                    </div>
                    <Badge tone={SUBMISSION_TONE[selected.status]}>{SUBMISSION_LABEL[selected.status]}</Badge>
                  </div>

                  {missing(selected) ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-3">
                      <p className="text-sm text-muted-foreground">Nothing to grade yet. Send a reminder before the due date.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={nudged.has(selected.studentId)}
                        leftIcon={nudged.has(selected.studentId) ? <Check aria-hidden="true" /> : <BellRing aria-hidden="true" />}
                        onClick={() => nudge([selected.studentId])}
                      >
                        {nudged.has(selected.studentId) ? "Reminder sent" : "Send reminder"}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4">
                      {selected.submittedFile && (
                        <button
                          type="button"
                          onClick={() => {
                            const file = selected.submittedFile ?? "submission"
                            downloadTextFile(
                              `${assignment.title}\nLearner: ${selected.studentName} (${selected.studentRoll})\nSubmitted: ${selected.submittedAt}\nFile: ${file}\n`,
                              `${file.replace(/\.[a-z0-9]+$/i, "")}.txt`,
                            )
                          }}
                          className="group flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-border-strong/60"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{selected.submittedFile}</span>
                          <Download className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
                          <span className="sr-only">Download</span>
                        </button>
                      )}
                      <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-end">
                        <Field label={`Score (out of ${max})`} error={error}>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={max}
                            value={score}
                            onChange={(e) => {
                              setScore(e.target.value)
                              setError(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                save(true)
                              }
                            }}
                          />
                        </Field>
                        <div className="flex flex-wrap gap-1.5 pb-0.5" role="group" aria-label="Quick scores">
                          {[100, 90, 80, 70].map((p) => {
                            const v = Math.round((p / 100) * max)
                            const on = score === String(v)
                            return (
                              <button
                                key={p}
                                type="button"
                                aria-pressed={on}
                                onClick={() => {
                                  setScore(String(v))
                                  setError(null)
                                }}
                                className={cn(
                                  "h-8 rounded-md border px-2.5 text-xs font-medium tabular-nums transition-colors",
                                  on ? "border-primary bg-primary-soft text-primary-text" : "border-border bg-surface text-muted-foreground hover:text-foreground",
                                )}
                              >
                                {v}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <Field
                        label="Feedback"
                        aside={
                          <Button size="sm" variant="ghost" loading={drafting} leftIcon={<Sparkles aria-hidden="true" />} onClick={draft}>
                            Suggest feedback
                          </Button>
                        }
                      >
                        <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What went well, and one thing to improve…" />
                      </Field>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" onClick={() => save(false)}>
                          Save
                        </Button>
                        <Button leftIcon={<CheckCheck aria-hidden="true" />} onClick={() => save(true)}>
                          Save and next
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <SegmentedControl
                size="sm"
                aria-label="Filter submissions"
                options={[
                  { value: "todo" as Filter, label: `To grade ${counts.todo}` },
                  { value: "graded" as Filter, label: `Graded ${counts.graded}` },
                  { value: "missing" as Filter, label: `Missing ${counts.missing}` },
                  { value: "all" as Filter, label: "All" },
                ]}
                value={filter}
                onChange={setFilter}
              />
              {filter === "missing" && pending.length > 0 && (
                <Button size="sm" variant="secondary" leftIcon={<BellRing aria-hidden="true" />} onClick={() => nudge(pending.map((s) => s.studentId))}>
                  Remind all {pending.length}
                </Button>
              )}
            </div>

            {visible.length === 0 ? (
              <EmptyState
                size="sm"
                icon={<Inbox aria-hidden="true" />}
                title={filter === "todo" ? "Nothing left to grade" : filter === "missing" ? "Everyone has submitted" : "No submissions here"}
                description={filter === "todo" ? "New submissions appear here as learners hand them in." : undefined}
                action={
                  filter !== "all" ? (
                    <Button size="sm" variant="outline" onClick={() => setFilter("all")}>
                      Show all submissions
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="-mx-2 flex flex-col gap-0.5" aria-label="Submissions">
                {visible.map((s) => {
                  const active = s.studentId === selectedId
                  return (
                    <li key={s.studentId}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(s.studentId)}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "relative flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
                          !active && "hover:bg-surface-2",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="grading-active"
                            transition={spring.snappy}
                            aria-hidden="true"
                            className="absolute inset-0 rounded-md border border-primary-border bg-primary-soft"
                          />
                        )}
                        <Avatar src={s.studentAvatar} name={s.studentName} size="sm" className="relative" />
                        <span className="relative min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{s.studentName}</span>
                          <span className="block truncate text-caption text-muted-foreground">{missing(s) ? "Not submitted" : s.submittedAt}</span>
                        </span>
                        {s.status === "Graded" && typeof s.score === "number" && (
                          <span className="relative text-sm font-semibold tabular-nums text-foreground">
                            {s.score}/{s.maxMarks}
                          </span>
                        )}
                        {nudged.has(s.studentId) ? (
                          <Badge tone="success" className="relative">
                            Reminded
                          </Badge>
                        ) : (
                          <Badge tone={SUBMISSION_TONE[s.status]} className="relative">
                            {SUBMISSION_LABEL[s.status]}
                          </Badge>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
