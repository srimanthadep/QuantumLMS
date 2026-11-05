import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Bell,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileCheck2,
  GitBranch,
  ListChecks,
  MessageSquareQuote,
  Search,
  Send,
  Target,
  Trophy,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  SegmentedControl,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import AssignmentSubmitDialog from "@/components/student/AssignmentSubmitDialog"
import DateTile from "@/components/student/DateTile"
import EvaluationDialog from "@/components/student/EvaluationDialog"
import QuizRunner from "@/components/student/QuizRunner"
import type { AssignmentData, QuizData } from "./studentTypes"
import { daysUntil, dueLabel, splitDate } from "./studentUtils"
import type { SubmissionInput } from "./data/actions"
import { useReminders } from "./data/hooks"
import { useStudentData } from "./data/StudentDataProvider"

interface AssessmentsPageProps {
  assignments: AssignmentData[]
  onSubmitAssignment: (id: string, input: SubmissionInput) => Promise<void>
  quizzes: QuizData[]
  onToast: (msg: string) => void
  initialTab?: "assignments" | "quizzes"
}

/** "Submitted" covers work waiting for an evaluator and work an evaluator has started (Under Review). */
type AssignmentFilter = "All" | "Pending" | "Submitted" | "Graded"
const STATUS_TONE = { Pending: "warning", Submitted: "info", "Under Review": "warning", Graded: "success" } as const
const inFilter = (a: AssignmentData, f: AssignmentFilter) => f === "All" || a.status === f || (f === "Submitted" && a.status === "Under Review")
const REEVALUATION_BADGE = {
  Pending: { tone: "info", label: "Re-evaluation requested" },
  "In Review": { tone: "warning", label: "Re-evaluation in review" },
  Revised: { tone: "success", label: "Score revised" },
  Upheld: { tone: "neutral", label: "Score upheld" },
} as const

export default function AssessmentsPage({ assignments, onSubmitAssignment, quizzes, onToast, initialTab = "assignments" }: AssessmentsPageProps) {
  const { requestReevaluation } = useStudentData()
  const [tab, setTab] = useState(initialTab)
  const [submitTarget, setSubmitTarget] = useState<AssignmentData | null>(null)
  const [evaluationTarget, setEvaluationTarget] = useState<AssignmentData | null>(null)
  const [quizTarget, setQuizTarget] = useState<QuizData | null>(null)
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const stats = useMemo(() => {
    const graded = assignments
      .filter((a) => a.status === "Graded" && typeof a.score === "number")
      .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""))
    const doneQuizzes = quizzes.filter((q) => q.status === "Completed" && q.latestAttemptId)
    return {
      pending: assignments.filter((a) => a.status === "Pending").length,
      submitted: assignments.filter((a) => inFilter(a, "Submitted")).length,
      avg: graded.length ? Math.round(graded.reduce((s, a) => s + ((a.score ?? 0) / a.maxMarks) * 100, 0) / graded.length) : 0,
      gradedScores: graded.map((a) => Math.round(((a.score ?? 0) / a.maxMarks) * 100)),
      passed: doneQuizzes.filter((q) => (q.pct ?? 0) >= q.passingPct).length,
      doneQuizzes: doneQuizzes.length,
      openQuizzes: quizzes.filter((q) => q.status === "Active").length,
    }
  }, [assignments, quizzes])

  const deadlines = useMemo(() => {
    const now = Date.now()
    const items = [
      ...assignments.filter((a) => a.status === "Pending").map((a) => ({ id: a.id, title: a.title, course: a.course, due: a.dueDate, at: a.dueAt ?? "", kind: "assignment" as const })),
      ...quizzes
        .filter((q) => q.status === "Active" || q.status === "Upcoming")
        .map((q) => ({ id: q.id, title: q.title, course: q.course, due: q.dueDate, at: q.dueAt ?? "", kind: "quiz" as const })),
    ]
    // Overdue work first, then what's due soonest.
    return items.sort((a, b) => a.at.localeCompare(b.at)).filter((d) => d.kind === "assignment" || Date.parse(d.at) >= now)
  }, [assignments, quizzes])

  const latestFeedback = assignments.filter((a) => a.status === "Graded" && a.feedback).sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))[0]

  const startQuiz = (q: QuizData) => {
    setReviewAttemptId(null)
    setQuizTarget(q)
  }
  const reviewQuiz = (q: QuizData) => {
    if (!q.latestAttemptId) {
      onToast("No saved attempt to review yet.")
      return
    }
    setReviewAttemptId(q.latestAttemptId)
    setQuizTarget(q)
  }
  const openDeadline = (d: (typeof deadlines)[number]) => {
    if (d.kind === "assignment") {
      setTab("assignments")
      setExpandedId(d.id)
      setTimeout(() => {
        const el = document.getElementById(`assignment-${d.id}`)
        el?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 60)
    } else {
      const q = quizzes.find((x) => x.id === d.id)
      if (!q) return
      setTab("quizzes")
      if (q.status === "Active") startQuiz(q)
      else onToast(`${q.title} opens ${q.availableFrom ?? q.dueDate}`)
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="Coursework" title="Assessments" description="Submit assignments, take timed quizzes and review your feedback." />

      <Stagger className="flex flex-col gap-5" stagger={0.06}>
        <StaggerItem>
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <StatCard title="To submit" value={String(stats.pending)} trend={deadlines[0] ? dueLabel(deadlines[0].due) : "Nothing due"} tone="warning" icon={ClipboardList} onClick={() => setTab("assignments")} />
            </StaggerItem>
            <StaggerItem>
              <StatCard title="Awaiting grade" value={String(stats.submitted)} trend="With evaluators" tone="info" icon={Send} onClick={() => setTab("assignments")} />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                title="Average score"
                value={stats.gradedScores.length ? `${stats.avg}%` : "–"}
                trend={stats.gradedScores.length ? { value: `Across ${stats.gradedScores.length} graded`, isPositive: true } : "Nothing graded yet"}
                tone="success"
                icon={Trophy}
                sparkline={stats.gradedScores.length > 1 ? stats.gradedScores : undefined}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                title="Quizzes passed"
                value={`${stats.passed}/${stats.doneQuizzes}`}
                trend={stats.openQuizzes ? `${stats.openQuizzes} open now` : "None open"}
                tone="primary"
                icon={ListChecks}
                onClick={() => setTab("quizzes")}
              />
            </StaggerItem>
          </Stagger>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="min-w-0">
              <TabsList aria-label="Assessment type">
                <TabsTrigger value="assignments">
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  Assignments <span className="tabular-nums text-subtle-foreground">{assignments.length}</span>
                </TabsTrigger>
                <TabsTrigger value="quizzes">
                  <ListChecks className="h-4 w-4" aria-hidden="true" />
                  Quizzes <span className="tabular-nums text-subtle-foreground">{quizzes.length}</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="assignments" className="mt-5">
                <Assignments
                  assignments={assignments}
                  onSubmit={setSubmitTarget}
                  onView={setEvaluationTarget}
                  expandedId={expandedId}
                  onToggleExpand={setExpandedId}
                />
              </TabsContent>
              <TabsContent value="quizzes" className="mt-5">
                <Quizzes quizzes={quizzes} onStart={startQuiz} onReview={reviewQuiz} onToast={onToast} />
              </TabsContent>
            </Tabs>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Upcoming deadlines</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 px-3">
                  {deadlines.length === 0 && <p className="px-2 text-sm text-muted-foreground">You're all caught up.</p>}
                  {deadlines.map((d) => {
                    const { month, day } = splitDate(d.due)
                    const n = daysUntil(d.due)
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => openDeadline(d)}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
                      >
                        <DateTile month={month} day={day} size="sm" tone={n !== null && n <= 2 ? "accent" : "default"} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{d.title}</span>
                          <span className="block truncate text-caption text-muted-foreground">
                            {d.kind === "quiz" ? "Quiz" : "Assignment"} · {d.course}
                          </span>
                        </span>
                        <Badge tone={n !== null && n <= 2 ? "warning" : "neutral"} size="sm" className="shrink-0">
                          {dueLabel(d.due).replace(/^Due /, "")}
                        </Badge>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
              {latestFeedback && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquareQuote className="h-4 w-4 text-primary-text" aria-hidden="true" />
                      Latest feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <blockquote className="border-l-2 border-primary pl-3 text-sm leading-6 text-foreground">{latestFeedback.feedback}</blockquote>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-caption text-muted-foreground">{latestFeedback.title}</p>
                      <Badge tone="success" className="shrink-0">
                        {latestFeedback.grade} · {latestFeedback.score}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </StaggerItem>
      </Stagger>

      <AssignmentSubmitDialog assignment={submitTarget} onClose={() => setSubmitTarget(null)} onSubmit={onSubmitAssignment} />
      <EvaluationDialog assignment={evaluationTarget} onClose={() => setEvaluationTarget(null)} onRequest={requestReevaluation} onToast={onToast} />
      <QuizRunner
        quiz={quizTarget}
        reviewAttemptId={reviewAttemptId}
        onClose={() => {
          setQuizTarget(null)
          setReviewAttemptId(null)
        }}
      />
    </div>
  )
}

/* ------------------------------ Assignments ------------------------------ */

function Assignments({
  assignments,
  onSubmit,
  onView,
  expandedId,
  onToggleExpand,
}: {
  assignments: AssignmentData[]
  onSubmit: (a: AssignmentData) => void
  onView: (a: AssignmentData) => void
  expandedId?: string | null
  onToggleExpand?: (id: string | null) => void
}) {
  const [filter, setFilter] = useState<AssignmentFilter>("All")
  const [query, setQuery] = useState("")
  const [localExpanded, setLocalExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (expandedId) {
      const target = assignments.find((a) => a.id === expandedId)
      if (target && !inFilter(target, filter)) {
        setFilter("All")
      }
    }
  }, [expandedId, assignments, filter])

  const activeExpanded = expandedId !== undefined ? expandedId : localExpanded
  const toggleExpanded = (id: string) => {
    const next = activeExpanded === id ? null : id
    if (onToggleExpand) onToggleExpand(next)
    else setLocalExpanded(next)
  }

  const counts = (s: AssignmentFilter) => assignments.filter((a) => inFilter(a, s)).length
  const list = assignments.filter((a) => inFilter(a, filter) && (!query.trim() || `${a.title} ${a.course}`.toLowerCase().includes(query.trim().toLowerCase())))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar overflow-x-auto">
          <SegmentedControl
            size="sm"
            aria-label="Filter assignments"
            options={(["All", "Pending", "Submitted", "Graded"] as const).map((s) => ({ value: s as AssignmentFilter, label: `${s} · ${counts(s)}` }))}
            value={filter}
            onChange={setFilter}
          />
        </div>
        <Input
          aria-label="Search assignments"
          placeholder="Search assignments"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leading={<Search aria-hidden="true" />}
          trailing={
            query ? (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="flex rounded p-0.5 hover:text-foreground">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null
          }
          wrapperClassName="sm:w-64"
        />
      </div>

      {list.length === 0 ? (
        <EmptyState size="sm" icon={<ClipboardList aria-hidden="true" />} title="No assignments here" description="Try another filter." />
      ) : (
        <motion.ul layout className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map((a) => {
              const { month, day } = splitDate(a.dueDate)
              const n = daysUntil(a.dueDate)
              const urgent = a.status === "Pending" && n !== null && n <= 2
              const isOpen = activeExpanded === a.id
              return (
                <motion.li
                  key={a.id}
                  id={`assignment-${a.id}`}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98, transition: transition.fast }}
                  transition={transition.base}
                  className={cn(
                    "overflow-hidden rounded-lg border bg-surface transition-[border-color,box-shadow] duration-200 hover:shadow-[var(--elev-md)]",
                    urgent ? "border-warning/40" : "border-border hover:border-border-strong/60",
                  )}
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <DateTile month={month} day={day} tone={urgent ? "accent" : "default"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={STATUS_TONE[a.status]}>{a.status === "Under Review" ? "Under review" : a.status}</Badge>
                        {a.status === "Pending" && <Badge tone={urgent ? "warning" : "neutral"}>{dueLabel(a.dueDate)}</Badge>}
                        {a.priority === "High" && a.status === "Pending" && <Badge tone="danger">High priority</Badge>}
                        {a.reevaluation && <Badge tone={REEVALUATION_BADGE[a.reevaluation.status].tone}>{REEVALUATION_BADGE[a.reevaluation.status].label}</Badge>}
                      </div>
                      <h3 className="mt-2 text-[15px] font-semibold leading-6 text-foreground">{a.title}</h3>
                      <p className="text-caption text-muted-foreground">
                        {a.course} · {a.maxMarks} marks
                        {a.submissionDate ? ` · submitted ${a.submissionDate}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {a.status === "Graded" && (
                        <ProgressRing value={a.score ?? 0} size={46} thickness={4} tone="success" label={`Score ${a.score}%`}>
                          <span className="text-[11px] font-semibold tabular-nums text-foreground">{a.grade}</span>
                        </ProgressRing>
                      )}
                      {a.status === "Pending" ? (
                        <Button size="sm" leftIcon={<Send aria-hidden="true" />} onClick={() => onSubmit(a)}>
                          Submit work
                        </Button>
                      ) : a.status === "Submitted" ? (
                        <Button variant="outline" size="sm" onClick={() => onSubmit(a)}>
                          Resubmit
                        </Button>
                      ) : a.status === "Graded" ? (
                        <Button variant="outline" size="sm" onClick={() => onView(a)}>
                          View evaluation
                        </Button>
                      ) : (
                        <span className="hidden text-caption text-muted-foreground sm:inline">An evaluator is marking this</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? "Hide details" : "Show details"}
                        onClick={() => toggleExpanded(a.id)}
                      >
                        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={transition.base} className="flex">
                          <ChevronDown aria-hidden="true" />
                        </motion.span>
                      </Button>
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, transition: transition.fast }}
                        transition={transition.base}
                        className="grid gap-3 border-t border-border bg-surface-2/60 px-4 py-4 text-sm sm:pl-20"
                      >
                        <p className="leading-6 text-muted-foreground">{a.description}</p>
                        {a.repoUrl && (
                          <p className="flex items-center gap-2 text-caption text-muted-foreground">
                            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="truncate font-mono">{a.repoUrl}</span>
                          </p>
                        )}
                        {a.uploadedFileName && (
                          <p className="flex items-center gap-2 text-caption text-muted-foreground">
                            <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {a.uploadedFileName}
                          </p>
                        )}
                        {a.feedback && (
                          <div className="rounded-md border border-success/30 bg-success-soft p-3">
                            <p className="text-caption font-semibold text-success">
                              Evaluator feedback · {a.score}/{a.maxMarks}
                            </p>
                            <p className="mt-1 leading-6 text-foreground">{a.feedback}</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  )
}

/* -------------------------------- Quizzes -------------------------------- */

function Quizzes({
  quizzes,
  onStart,
  onReview,
  onToast,
}: {
  quizzes: QuizData[]
  onStart: (q: QuizData) => void
  onReview: (q: QuizData) => void
  onToast: (m: string) => void
}) {
  const reminders = useReminders()
  const order = { Active: 0, Upcoming: 1, Completed: 2, Closed: 3 }
  const sorted = [...quizzes].sort((a, b) => order[a.status] - order[b.status] || (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))

  if (sorted.length === 0) return <EmptyState size="sm" icon={<ListChecks aria-hidden="true" />} title="No quizzes yet" description="Quizzes appear here when instructors publish them." />

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {sorted.map((q, i) => {
        const used = q.attemptsUsed ?? 0
        const max = q.maxAttempts ?? 1
        const passed = q.status === "Completed" && (q.pct ?? 0) >= q.passingPct
        const reminded = reminders.has("quiz", q.id)
        const toggleReminder = () =>
          reminders
            .toggle("quiz", q.id)
            .then((on) => on && onToast(`We'll remind you when ${q.title} opens`))
            .catch((e: Error) => onToast(`Couldn't save the reminder: ${e.message}`))
        return (
          <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...transition.base, delay: i * 0.05 }}>
            <Card
              variant={q.status === "Active" ? "glow" : "default"}
              className="flex h-full flex-col p-5 transition-[border-color,box-shadow] duration-200 hover:shadow-[var(--elev-md)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {q.status === "Active" ? (
                      <Badge tone="primary" dot>
                        Open now
                      </Badge>
                    ) : q.status === "Upcoming" ? (
                      <Badge tone="neutral">Upcoming</Badge>
                    ) : q.status === "Closed" ? (
                      <Badge tone="neutral">Closed</Badge>
                    ) : (
                      <Badge tone={passed ? "success" : "danger"}>{passed ? "Passed" : "Not passed"}</Badge>
                    )}
                    <Badge tone="neutral">{q.status === "Upcoming" && q.availableFrom ? `Opens ${q.availableFrom.split(",")[0]}` : q.status === "Closed" ? `Closed ${q.dueDate}` : dueLabel(q.dueDate)}</Badge>
                    {q.openAttemptId && <Badge tone="warning">In progress</Badge>}
                  </div>
                  <h3 className="mt-2 text-[15px] font-semibold leading-6 text-foreground">{q.title}</h3>
                  <p className="text-caption text-muted-foreground">{q.course}</p>
                </div>
                {q.status === "Completed" && (
                  <ProgressRing value={q.pct ?? 0} size={56} thickness={5} tone={passed ? "success" : "danger"} label={`Score ${q.pct}%`}>
                    <span className="text-xs font-semibold tabular-nums text-foreground">{q.pct}%</span>
                  </ProgressRing>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { icon: ListChecks, value: `${q.questionCount}`, label: "questions" },
                  { icon: Clock, value: `${q.durationMinutes}m`, label: "time limit" },
                  { icon: Target, value: `${q.passingPct}%`, label: "to pass" },
                ].map((s) => (
                  <div key={s.label} className="rounded-md bg-surface-2 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-foreground">
                      <s.icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      {s.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <span className="flex gap-1" aria-hidden="true">
                    {Array.from({ length: max }, (_, k) => (
                      <span key={k} className={cn("h-1.5 w-4 rounded-full", k < used ? "bg-primary" : "bg-surface-2 ring-1 ring-inset ring-border")} />
                    ))}
                  </span>
                  {used}/{max} attempt{max > 1 ? "s" : ""}
                </span>
                {q.status === "Completed" && q.latestAttemptId ? (
                  <Button variant="outline" size="sm" leftIcon={<CheckCircle2 aria-hidden="true" />} onClick={() => onReview(q)}>
                    Review answers
                  </Button>
                ) : q.status === "Active" && (q.openAttemptId || used < max) ? (
                  <Button size="sm" onClick={() => onStart(q)}>
                    {q.openAttemptId ? "Resume quiz" : "Start quiz"}
                  </Button>
                ) : q.status === "Upcoming" ? (
                  <motion.div whileTap={{ scale: 0.95 }} transition={spring.snappy}>
                    <Button
                      variant={reminded ? "secondary" : "outline"}
                      size="sm"
                      aria-pressed={reminded}
                      disabled={!reminders.ready}
                      leftIcon={reminded ? <BellRing className="text-primary-text" aria-hidden="true" /> : <Bell aria-hidden="true" />}
                      onClick={() => void toggleReminder()}
                    >
                      {reminded ? "Reminder on" : "Remind me"}
                    </Button>
                  </motion.div>
                ) : (
                  <span className="text-caption text-muted-foreground">{q.status === "Closed" ? "Missed" : "No attempts left"}</span>
                )}
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
