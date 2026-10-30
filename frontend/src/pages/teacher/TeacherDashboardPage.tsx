import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpen,
  CalendarPlus,
  Check,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Lightbulb,
  LineChart,
  MessageCircleQuestion,
  Send,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import { Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Progress, SegmentedControl, StatCard } from "@/components/ui"
import AreaChart from "@/components/charts/AreaChart"
import ProgressRing from "@/components/charts/ProgressRing"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import CourseCover from "@/components/shared/CourseCover"
import GradingSheet from "@/components/teacher/GradingSheet"
import IconTile, { type IconTone } from "@/components/teacher/IconTile"
import LiveSessionHero from "@/components/teacher/LiveSessionHero"
import ScheduleSessionDialog from "@/components/teacher/ScheduleSessionDialog"
import SendReportDialog from "@/components/teacher/SendReportDialog"
import StudentDrawer from "@/components/teacher/StudentDrawer"
import { initialAnalyticsMetrics } from "@/data/mockData"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import type { StudentItem } from "@/types"
import { useTeacherData } from "./teacherStore"
import {
  addDays,
  average,
  courseArt,
  DEMO_DATE,
  DEMO_NOW,
  DOUBT_PRIORITY_TONE,
  EVENT_STYLE,
  firstName,
  formatTime,
  greeting,
  minutesOf,
  relativeTo,
  startOfWeek,
  toDate,
} from "./teacherUtils"

type Range = "week" | "term"

const PULSE: Record<Range, { labels: string[]; attendance: number[]; average: number[] }> = {
  week: { labels: ["Mon", "Tue", "Wed", "Thu"], attendance: [96, 95, 97, 96], average: [80, 82, 81, 84] },
  term: {
    labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"],
    attendance: [92, 94, 93, 95, 96, 94, 97, 96],
    average: [74, 76, 75, 78, 80, 79, 82, 84],
  },
}

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 } as const
const NOW_MIN = DEMO_NOW.getHours() * 60 + DEMO_NOW.getMinutes()
const NOW_LABEL = formatTime(`${DEMO_NOW.getHours()}:${DEMO_NOW.getMinutes()}`)

interface AgendaItem {
  id: string
  title: string
  start: string
  end: string
  meta: string
  kind: "session" | "event"
  tone: string
  live: boolean
  state: "done" | "now" | "next"
}

function reasonsFor(s: StudentItem): { label: string; tone: "danger" | "warning" | "info" }[] {
  const out: { label: string; tone: "danger" | "warning" | "info" }[] = []
  if (s.attendance < 85) out.push({ label: `Attendance ${s.attendance}%`, tone: "danger" })
  if (s.average < 72) out.push({ label: `Average ${s.average}%`, tone: "warning" })
  if ((s.pendingAssignments ?? 0) >= 2) out.push({ label: `${s.pendingAssignments} pending`, tone: "info" })
  return out
}

function SectionCard({
  title,
  icon,
  tone = "primary",
  action,
  children,
  className,
}: {
  title: string
  icon: LucideIcon
  tone?: IconTone
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn("flex min-w-0 flex-col", className)}>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <IconTile icon={icon} tone={tone} />
          <CardTitle className="truncate">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">{children}</CardContent>
    </Card>
  )
}

/** Teaching command center: the live class, today's agenda and the work waiting on the teacher. */
export default function TeacherDashboardPage() {
  const navigate = useNavigate()
  const { teacherName, sessions, events, doubts, students, courses, assignments, suggestions, monitoring, dismissSuggestion, startSession, notify } = useTeacherData()
  const [range, setRange] = useState<Range>("term")
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [gradingKey, setGradingKey] = useState<string | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [nudged, setNudged] = useState<Set<string>>(new Set())
  const [showAllInsights, setShowAllInsights] = useState(false)

  const live = sessions.find((s) => s.status === "Live Now")
  const next = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "Upcoming" || s.status === "Scheduled")
        .sort((a, b) => `${a.scheduledDate} ${a.startTime}`.localeCompare(`${b.scheduledDate} ${b.startTime}`))[0],
    [sessions],
  )
  const focus = live ?? next

  const openDoubts = useMemo(
    () =>
      doubts
        .filter((d) => d.status !== "Resolved")
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]),
    [doubts],
  )
  const queue = useMemo(
    () =>
      Object.entries(assignments)
        .map(([key, a]) => {
          const subs = a.submissions ?? []
          return {
            key,
            a,
            course: courses.find((c) => c.id === a.courseId),
            todo: subs.filter((s) => s.status === "Submitted" || s.status === "Late").length,
            missing: subs.filter((s) => s.status === "Pending").length,
            graded: subs.filter((s) => s.status === "Graded").length,
            total: subs.length,
          }
        })
        .filter((q) => q.todo > 0)
        .sort((x, y) => y.todo - x.todo),
    [assignments, courses],
  )
  const toGrade = queue.reduce((s, q) => s + q.todo, 0)
  const watchlist = useMemo(
    () =>
      students
        .map((s) => ({ s, reasons: reasonsFor(s) }))
        .filter((x) => x.s.status === "Needs Attention" || x.reasons.length > 0)
        .sort((a, b) => b.reasons.length - a.reasons.length || a.s.average - b.s.average)
        .slice(0, 4),
    [students],
  )

  const agenda = useMemo<AgendaItem[]>(() => {
    const state = (start: string, end: string): AgendaItem["state"] => {
      const a = minutesOf(start)
      const b = Math.max(a + 1, minutesOf(end))
      return NOW_MIN >= b ? "done" : NOW_MIN >= a ? "now" : "next"
    }
    const fromSessions: AgendaItem[] = sessions
      .filter((s) => s.scheduledDate === DEMO_DATE && s.status !== "Cancelled")
      .map((s) => ({
        id: s.id,
        title: s.title,
        start: s.startTime,
        end: s.endTime,
        meta: `${s.courseCode} · ${s.platform}`,
        kind: "session",
        tone: "bg-primary",
        live: s.status === "Live Now",
        state: s.status === "Live Now" ? "now" : s.status === "Completed" ? "done" : state(s.startTime, s.endTime),
      }))
    const fromEvents: AgendaItem[] = events
      .filter((e) => e.startDate === DEMO_DATE)
      .map((e) => ({
        id: e.id,
        title: e.title,
        start: e.startTime,
        end: e.endTime,
        meta: e.location ?? e.category,
        kind: "event",
        tone: EVENT_STYLE[e.category].dot,
        live: false,
        state: state(e.startTime, e.endTime),
      }))
    return [...fromSessions, ...fromEvents].sort((a, b) => minutesOf(a.start) - minutesOf(b.start))
  }, [sessions, events])
  const nowIndex = agenda.findIndex((i) => i.state !== "done")

  const termStats = useMemo(() => {
    const lessons = courses.flatMap((c) => c.modules.flatMap((m) => m.lessons))
    const weekStart = startOfWeek(DEMO_NOW)
    const weekEnd = addDays(weekStart, 7)
    const graded = Object.values(assignments).filter((a) => typeof a.averageScore === "number")
    return {
      lessons: lessons.length,
      delivered: lessons.filter((l) => l.completed).length,
      weekClasses: sessions.filter((s) => {
        const d = toDate(s.scheduledDate)
        return s.status !== "Cancelled" && d >= weekStart && d < weekEnd
      }).length,
      scorePct: Math.round(average(graded.map((a) => ((a.averageScore ?? 0) / a.maxMarks) * 100))),
    }
  }, [courses, sessions, assignments])

  const avgAttendance = Math.round(average(students.map((s) => s.attendance)))
  const classAverage = Math.round(average(students.map((s) => s.average)))
  const mastery = initialAnalyticsMetrics[0]
  const highDoubts = openDoubts.filter((d) => d.priority === "High").length
  const pulse = PULSE[range]
  const today = DEMO_NOW.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })

  const openFocus = () => {
    if (!focus) return navigate("/teacher/live-class")
    if (focus.status === "Live Now") return navigate(`/teacher/live-class/studio/${focus.id}`)
    if (focus.scheduledDate === DEMO_DATE) {
      startSession(focus.id)
      notify(`“${focus.title}” is live. Learners have been notified.`)
      return navigate(`/teacher/live-class/studio/${focus.id}`)
    }
    navigate("/teacher/live-class")
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        eyebrow={today}
        title={`${greeting()}, ${firstName(teacherName)}`}
        description={`${agenda.filter((a) => a.state !== "done").length} things on today's agenda, ${openDoubts.length} open doubts and ${toGrade} submissions to grade.`}
        actions={
          <>
            <Button variant="outline" leftIcon={<Send aria-hidden="true" />} onClick={() => setReportOpen(true)}>
              Send report
            </Button>
            <Button variant="outline" leftIcon={<CalendarPlus aria-hidden="true" />} onClick={() => setScheduleOpen(true)}>
              Schedule class
            </Button>
          </>
        }
      />

      <Stagger className="flex flex-col gap-5" stagger={0.055}>
        {focus && (
          <StaggerItem>
            <LiveSessionHero session={focus} onPrimary={openFocus} />
          </StaggerItem>
        )}

        <StaggerItem>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key numbers">
            <StatCard
              title="Learners"
              value={students.length}
              trend={`${avgAttendance}% attendance`}
              tone="primary"
              icon={Users}
              sparkline={PULSE.term.attendance}
              onClick={() => navigate("/teacher/students")}
            />
            <StatCard
              title="Class mastery"
              value={mastery.value}
              trend={{ value: mastery.trend.replace(/^\+/, ""), isPositive: true }}
              tone="success"
              icon={LineChart}
              sparkline={[72, 74, 77, 79, 81, 83, 84.2]}
              onClick={() => navigate("/teacher/analytics")}
            />
            <StatCard
              title="Open doubts"
              value={openDoubts.length}
              trend={`${highDoubts} high priority`}
              tone="danger"
              icon={MessageCircleQuestion}
              sparkline={[3, 5, 4, 6, openDoubts.length]}
              onClick={() => navigate("/teacher/doubts")}
            />
            <StatCard
              title="To grade"
              value={toGrade}
              trend={`Across ${queue.length} assignments`}
              tone="warning"
              icon={ClipboardCheck}
              sparkline={[12, 10, 11, 9, toGrade]}
              onClick={() => queue[0] && setGradingKey(queue[0].key)}
            />
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <IconTile icon={BarChart3} />
                    <CardTitle>Class pulse</CardTitle>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Attendance and average score across all your courses.</p>
                </div>
                <SegmentedControl
                  size="sm"
                  aria-label="Class pulse range"
                  options={[
                    { value: "week" as Range, label: "This week" },
                    { value: "term" as Range, label: "Term" },
                  ]}
                  value={range}
                  onChange={setRange}
                />
              </CardHeader>
              <CardContent>
                <dl className="mb-5 grid grid-cols-3 gap-3">
                  {[
                    { label: "Attendance", value: `${pulse.attendance.at(-1)}%`, detail: range === "week" ? "today" : "this week", dot: "bg-primary-text" },
                    { label: "Class average", value: `${classAverage}%`, detail: "all learners", dot: "bg-secondary-text" },
                    { label: "Live engagement", value: String(monitoring.engagementScore), detail: monitoring.participationTrend.toLowerCase(), dot: "bg-success" },
                  ].map((s) => (
                    <div key={s.label} className="min-w-0">
                      <dt className="flex items-center gap-1.5 truncate text-caption text-muted-foreground">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} aria-hidden="true" />
                        {s.label}
                      </dt>
                      <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{s.value}</dd>
                      <dd className="truncate text-caption text-muted-foreground">{s.detail}</dd>
                    </div>
                  ))}
                </dl>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={range}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6, transition: transition.fast }}
                    transition={transition.base}
                  >
                    <AreaChart
                      labels={pulse.labels}
                      series={[
                        { name: "Attendance", values: pulse.attendance, color: "var(--primary-text)" },
                        { name: "Class average", values: pulse.average, color: "var(--secondary-text)" },
                      ]}
                      height={220}
                      yMin={60}
                      yMax={100}
                      formatValue={(v) => `${Math.round(v)}%`}
                      label={`Attendance and class average, ${range === "week" ? "this week" : "this term"}`}
                    />
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>

            <SectionCard
              title="Today"
              icon={Clock}
              tone="info"
              action={
                <Button size="sm" variant="ghost" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => navigate("/teacher/calendar")}>
                  Calendar
                </Button>
              }
            >
              {agenda.length === 0 ? (
                <EmptyState size="sm" icon={<CalendarPlus aria-hidden="true" />} title="Nothing scheduled today" action={<Button size="sm" onClick={() => setScheduleOpen(true)}>Schedule a class</Button>} />
              ) : (
                <ol className="relative flex flex-col" aria-label="Today's agenda">
                  {agenda.map((item, i) => (
                    <li key={item.id}>
                      {i === nowIndex && (
                        <div className="relative flex items-center gap-2 py-1.5">
                          <span className="h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
                          <span className="h-px flex-1 bg-danger/40" aria-hidden="true" />
                          <span className="text-[11px] font-semibold tabular-nums text-danger">Now · {NOW_LABEL}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          item.kind === "session"
                            ? navigate(item.live ? `/teacher/live-class/studio/${item.id}` : "/teacher/live-class")
                            : navigate("/teacher/calendar")
                        }
                        className={cn(
                          "group relative flex w-full gap-3 rounded-md py-2 pl-0 pr-2 text-left transition-colors hover:bg-surface-2",
                          item.state === "done" && "opacity-70",
                        )}
                      >
                        <span className="relative flex w-2 shrink-0 justify-center pt-1.5" aria-hidden="true">
                          {i < agenda.length - 1 && <span className="absolute left-1/2 top-4 h-[calc(100%+4px)] w-px -translate-x-1/2 bg-border" />}
                          <span className="relative flex h-2 w-2">
                            {item.state === "now" && <span className={cn("absolute inset-0 animate-[q-pulse-ring_1.4s_ease-out_infinite] rounded-full", item.live ? "bg-danger" : item.tone)} />}
                            <span className={cn("relative h-2 w-2 rounded-full", item.state === "done" ? "bg-border-strong" : item.live ? "bg-danger" : item.tone)} />
                          </span>
                        </span>
                        <span className="w-16 shrink-0 pt-0.5 text-caption font-medium tabular-nums text-muted-foreground">{formatTime(item.start)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
                            {item.live && (
                              <Badge tone="live" size="sm">
                                Live
                              </Badge>
                            )}
                          </span>
                          <span className="block truncate text-caption text-muted-foreground">{item.meta}</span>
                        </span>
                        {item.state === "done" && <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Done" />}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              {next && next.scheduledDate !== DEMO_DATE && (
                <p className="mt-3 border-t border-border pt-3 text-caption text-muted-foreground">
                  Next class {relativeTo(next.scheduledDate, next.startTime)}: <span className="font-medium text-foreground">{next.title}</span>
                </p>
              )}
            </SectionCard>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <SectionCard
              title="Doubts to answer"
              icon={MessageCircleQuestion}
              tone="danger"
              action={
                <Button size="sm" variant="ghost" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => navigate("/teacher/doubts")}>
                  Inbox
                </Button>
              }
            >
              {openDoubts.length === 0 ? (
                <EmptyState size="sm" icon={<Check aria-hidden="true" />} title="Inbox zero" description="Every question has an answer." />
              ) : (
                <ul className="-mx-2 flex flex-col">
                  {openDoubts.slice(0, 4).map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/teacher/doubts?doubt=${d.id}`)}
                        className="group flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
                      >
                        <Avatar src={d.studentAvatar} name={d.studentName} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-sm font-medium text-foreground">{d.questionTitle}</span>
                          <span className="block truncate text-caption text-muted-foreground">
                            {firstName(d.studentName)} · {d.courseCode} · {d.submittedAt}
                          </span>
                        </span>
                        <Badge tone={DOUBT_PRIORITY_TONE[d.priority]}>{d.priority}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Grading queue" icon={ClipboardCheck} tone="warning" action={<Badge tone="warning">{toGrade} waiting</Badge>}>
              {queue.length === 0 ? (
                <EmptyState size="sm" icon={<Check aria-hidden="true" />} title="All graded" description="New submissions show up here." />
              ) : (
                <ul className="-mx-2 flex flex-col">
                  {queue.slice(0, 4).map((q) => (
                    <li key={q.key} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-2">
                      <ProgressRing value={(q.graded / Math.max(1, q.total)) * 100} size={40} thickness={4} tone="success" label={`${q.graded} of ${q.total} graded`}>
                        <span className="text-[10px] font-semibold tabular-nums text-foreground">
                          {q.graded}/{q.total}
                        </span>
                      </ProgressRing>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-foreground">{q.a.title.replace(/^(Module \d+ (Assignment|Assessment|Capstone)|Python Lab \d+): /, "")}</p>
                        <p className="truncate text-caption text-muted-foreground">
                          {q.course?.code ?? q.a.courseId} · Due {q.a.dueDate}
                        </p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setGradingKey(q.key)}>
                        Grade {q.todo}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="Check in with"
              icon={BellRing}
              tone="info"
              action={
                <Button size="sm" variant="ghost" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => navigate("/teacher/students")}>
                  Students
                </Button>
              }
            >
              <ul className="-mx-2 flex flex-col">
                {watchlist.map(({ s, reasons }) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-surface-2">
                    <button type="button" onClick={() => setDrawerId(s.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <Avatar src={s.image} name={s.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{s.name}</span>
                        <span className="mt-0.5 flex flex-wrap gap-1">
                          {(reasons.length ? reasons : [{ label: s.status, tone: "warning" as const }]).map((r) => (
                            <Badge key={r.label} tone={r.tone} size="sm">
                              {r.label}
                            </Badge>
                          ))}
                        </span>
                      </span>
                    </button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={nudged.has(s.id) ? `Nudged ${s.name}` : `Nudge ${s.name}`}
                      disabled={nudged.has(s.id)}
                      onClick={() => {
                        setNudged((cur) => new Set(cur).add(s.id))
                        notify(`Nudge sent to ${firstName(s.name)} and ${s.parentName}`)
                      }}
                    >
                      {nudged.has(s.id) ? <Check className="text-success" aria-hidden="true" /> : <BellRing aria-hidden="true" />}
                    </Button>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
            <SectionCard
              title="Course pulse"
              icon={BookOpen}
              action={
                <Button size="sm" variant="ghost" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => navigate("/teacher/courses")}>
                  All courses
                </Button>
              }
            >
              <ul className="-mx-2 flex flex-col">
                {courses.map((c) => {
                  const upcoming = sessions
                    .filter((s) => s.courseId === c.id && (s.status === "Upcoming" || s.status === "Live Now"))
                    .sort((a, b) => `${a.scheduledDate}${a.startTime}`.localeCompare(`${b.scheduledDate}${b.startTime}`))[0]
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/teacher/courses/${c.id}`)}
                        className="group grid w-full grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-surface-2 sm:grid-cols-[64px_minmax(0,1fr)_160px]"
                      >
                        <CourseCover title={c.name} category={courseArt(c.id)} image={c.thumbnail} showTitle={false} className="aspect-[16/10] rounded-md" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
                          <span className="block truncate text-caption text-muted-foreground">
                            {c.code} · {c.enrolledStudentsCount} learners
                            {upcoming ? ` · ${upcoming.status === "Live Now" ? "live now" : `next ${relativeTo(upcoming.scheduledDate, upcoming.startTime)}`}` : ""}
                          </span>
                        </span>
                        <span className="col-span-2 flex items-center gap-2 sm:col-span-1">
                          <Progress value={c.progress} size="sm" label={`${c.name} ${c.progress}% delivered`} />
                          <span className="w-9 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">{c.progress}%</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-auto pt-4">
                <dl className="grid grid-cols-3 gap-3 border-t border-border pt-4">
                  {[
                    { label: "Lessons delivered", value: `${termStats.delivered}/${termStats.lessons}` },
                    { label: "Classes this week", value: String(termStats.weekClasses) },
                    { label: "Assignment average", value: `${termStats.scorePct}%` },
                  ].map((s) => (
                    <div key={s.label} className="min-w-0">
                      <dt className="truncate text-caption text-muted-foreground">{s.label}</dt>
                      <dd className="text-lg font-semibold tabular-nums text-foreground">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </SectionCard>

            <SectionCard title="Teaching insights" icon={Lightbulb} tone="secondary" action={<Badge tone="primary">{suggestions.length} new</Badge>}>
              {suggestions.length === 0 ? (
                <EmptyState size="sm" icon={<Sparkles aria-hidden="true" />} title="You're all caught up" description="New insights arrive after each class." />
              ) : (
                <ul className="flex flex-col gap-3">
                  <AnimatePresence initial={false}>
                    {suggestions.slice(0, showAllInsights ? suggestions.length : 2).map((s) => (
                      <motion.li
                        key={s.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24, transition: transition.fast }}
                        transition={spring.soft}
                        className="rounded-md border border-border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Badge tone={s.priority === "High" ? "danger" : s.priority === "Medium" ? "warning" : "neutral"} size="sm">
                            {s.priority}
                          </Badge>
                          <span className="truncate text-caption text-muted-foreground">
                            {s.category} · {s.courseCode}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-foreground">{s.title}</p>
                        <p className="mt-1 line-clamp-2 text-caption leading-5 text-muted-foreground">{s.explanation}</p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<Check aria-hidden="true" />}
                            onClick={() => {
                              dismissSuggestion(s.id)
                              notify(`Added to your plan: ${s.recommendedAction ?? s.title}`)
                            }}
                          >
                            Add to plan
                          </Button>
                          <Button size="sm" variant="ghost" leftIcon={<X aria-hidden="true" />} onClick={() => dismissSuggestion(s.id)}>
                            Dismiss
                          </Button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                  {suggestions.length > 2 && (
                    <li>
                      <Button size="sm" variant="ghost" block aria-expanded={showAllInsights} onClick={() => setShowAllInsights((v) => !v)}>
                        {showAllInsights ? "Show fewer" : `Show ${suggestions.length - 2} more`}
                      </Button>
                    </li>
                  )}
                </ul>
              )}
            </SectionCard>
          </div>
        </StaggerItem>
      </Stagger>

      <ScheduleSessionDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <SendReportDialog open={reportOpen} onOpenChange={setReportOpen} />
      <GradingSheet open={gradingKey !== null} onOpenChange={(o) => !o && setGradingKey(null)} assignmentId={gradingKey} />
      <StudentDrawer studentId={drawerId} open={drawerId !== null} onOpenChange={(o) => !o && setDrawerId(null)} />
    </div>
  )
}
