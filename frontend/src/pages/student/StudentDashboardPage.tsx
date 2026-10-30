import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  ArrowRight,
  Bell,
  BellRing,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  GraduationCap,
  LineChart,
  ListTodo,
  Play,
  Radio,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ease, spring, transition } from "@/lib/motion"
import { useSession } from "@/app/session"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Progress,
  SegmentedControl,
} from "@/components/ui"
import AreaChart, { type AreaSeries } from "@/components/charts/AreaChart"
import BarChart, { type BarDatum } from "@/components/charts/BarChart"
import DonutChart from "@/components/charts/DonutChart"
import ProgressRing from "@/components/charts/ProgressRing"
import Sparkline from "@/components/charts/Sparkline"
import AnimatedNumber from "@/components/motion/AnimatedNumber"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import Reveal from "@/components/motion/Reveal"
import CourseCover from "@/components/shared/CourseCover"
import DateTile from "@/components/student/DateTile"
import type { AssignmentData, CourseItem, QuizData, StudentNavPage, TimetableSlot } from "./studentTypes"
import { attendanceData, initialAssignmentsList, initialQuizzesList, initialStudentCourses, timetableSchedule } from "./studentMockData"
import { coverCategory, DEMO_TODAY, dueLabel } from "./studentUtils"

interface StudentDashboardProps {
  onNavigate: (page: StudentNavPage, courseId?: string) => void
  onToast: (msg: string) => void
  courses?: CourseItem[]
  assignments?: AssignmentData[]
  quizzes?: QuizData[]
}

type TimeRange = "Week" | "Month"
type MetricTone = "primary" | "success" | "warning" | "info"

const METRIC_TONE: Record<MetricTone, { tile: string; line: string; text: string }> = {
  primary: { tile: "bg-primary-soft text-primary-text ring-primary-border", line: "var(--primary-text)", text: "text-primary-text" },
  success: { tile: "bg-success-soft text-success ring-success/20", line: "var(--success)", text: "text-success" },
  warning: { tile: "bg-warning-soft text-warning ring-warning/20", line: "var(--warning)", text: "text-warning" },
  info: { tile: "bg-info-soft text-info ring-info/20", line: "var(--info)", text: "text-info" },
}

const ANALYTICS: Record<TimeRange, { labels: string[]; focus: number[]; goal: number[]; bars: BarDatum[]; total: number; change: string }> = {
  Week: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    focus: [1.2, 2.4, 1.8, 3.6, 2.1, 2.9, 0.8],
    goal: [2, 2, 2, 2, 2, 2, 2],
    bars: [
      { label: "Mon", value: 64 },
      { label: "Tue", value: 88 },
      { label: "Wed", value: 72 },
      { label: "Thu", value: 96, highlight: true },
      { label: "Fri", value: 81 },
      { label: "Sat", value: 90 },
      { label: "Sun", value: 56 },
    ],
    total: 14.8,
    change: "+18% from last week",
  },
  Month: {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    focus: [11.8, 14.2, 13.6, 14.8],
    goal: [12, 12, 12, 12],
    bars: [
      { label: "W1", value: 78 },
      { label: "W2", value: 94 },
      { label: "W3", value: 89 },
      { label: "W4", value: 98, highlight: true },
    ],
    total: 54.4,
    change: "+12% from last month",
  },
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function toHours(duration: string): number {
  const value = Number.parseFloat(duration)
  return Number.isFinite(value) ? value : 0
}

function isLive(slot: TimetableSlot) {
  return slot.status === "Live Now"
}

const WEEKDAYS: TimetableSlot["day"][] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const DEMO_DAY = "Tuesday"

function dateForSlot(slot: TimetableSlot): { month: string; day: string } {
  const date = new Date(DEMO_TODAY)
  const base = WEEKDAYS.indexOf(DEMO_DAY as TimetableSlot["day"])
  const offset = (WEEKDAYS.indexOf(slot.day) - base + WEEKDAYS.length) % WEEKDAYS.length
  date.setDate(date.getDate() + offset)
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }),
    day: String(date.getDate()),
  }
}

interface PriorityItem {
  id: string
  kind: "assignment" | "quiz" | "lesson"
  title: string
  detail: string
  due: string
  route: StudentNavPage
  tone: MetricTone
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  sparkline,
  onClick,
}: {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone: MetricTone
  sparkline?: number[]
  onClick?: () => void
}) {
  const style = METRIC_TONE[tone]
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={spring.snappy}
      className="group relative flex min-h-[132px] w-full flex-col justify-between overflow-hidden rounded-lg border border-border bg-surface p-4 text-left shadow-[var(--elev-xs)] transition-[border-color,box-shadow] duration-200 hover:border-border-strong/70 hover:shadow-[var(--elev-md)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-md ring-1 ring-inset", style.tile)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[28px] font-semibold leading-8 tracking-tight text-foreground">{value}</p>
          <p className={cn("mt-1 truncate text-caption font-medium", style.text)}>{detail}</p>
        </div>
        {sparkline && <Sparkline data={sparkline} stroke={style.line} className="h-9 w-20 shrink-0 opacity-90 transition-transform duration-300 group-hover:scale-105" />}
      </div>
    </motion.button>
  )
}

function ChartLabel({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: string; detail: string; tone: MetricTone }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1 ring-inset", METRIC_TONE[tone].tile)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
        <p className="truncate text-caption text-muted-foreground">{label} · {detail}</p>
      </div>
    </div>
  )
}

export default function StudentDashboardPage({
  onNavigate,
  onToast,
  courses = initialStudentCourses,
  assignments = initialAssignmentsList,
  quizzes = initialQuizzesList,
}: StudentDashboardProps) {
  const { user } = useSession()
  const firstName = user.name.split(" ")[0]
  const today = DEMO_TODAY.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
  const [range, setRange] = useState<TimeRange>("Week")
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [reminders, setReminders] = useState<Set<string>>(new Set())
  const [activeCourseId, setActiveCourseId] = useState<string>(() => courses.find((course) => course.status === "In Progress")?.id ?? courses[0]?.id ?? "")

  const inProgress = useMemo(() => courses.filter((course) => course.status === "In Progress"), [courses])
  const activeCourse = useMemo(
    () => courses.find((course) => course.id === activeCourseId) ?? inProgress[0] ?? courses[0],
    [courses, activeCourseId, inProgress],
  )
  const enrolled = useMemo(() => courses.filter((course) => course.status !== "Catalog"), [courses])
  const metrics = useMemo(() => {
    const modulesComplete = enrolled.reduce((sum, course) => sum + course.completedModules, 0)
    const modulesTotal = enrolled.reduce((sum, course) => sum + course.totalModules, 0)
    const averageProgress = modulesTotal ? Math.round((modulesComplete / modulesTotal) * 100) : 0
    const contentHours = enrolled.reduce((sum, course) => sum + toHours(course.duration), 0)
    return { modulesComplete, modulesTotal, averageProgress, contentHours }
  }, [enrolled])
  const chart = ANALYTICS[range]

  const priorityItems = useMemo<PriorityItem[]>(() => {
    const pendingAssignments = assignments
      .filter((assignment) => assignment.status === "Pending")
      .slice(0, 2)
      .map((assignment) => ({
        id: `assignment-${assignment.id}`,
        kind: "assignment" as const,
        title: assignment.title,
        detail: assignment.course,
        due: assignment.dueDate,
        route: "Assignments" as StudentNavPage,
        tone: assignment.priority === "High" ? ("warning" as const) : ("info" as const),
      }))
    const activeQuizzes = quizzes
      .filter((quiz) => quiz.status === "Active")
      .slice(0, 1)
      .map((quiz) => ({
        id: `quiz-${quiz.id}`,
        kind: "quiz" as const,
        title: quiz.title,
        detail: `${quiz.questionCount} questions · ${quiz.durationMinutes} min`,
        due: quiz.dueDate,
        route: "Quizzes" as StudentNavPage,
        tone: "primary" as const,
      }))
    const lesson = activeCourse
      ? [
          {
            id: `lesson-${activeCourse.id}`,
            kind: "lesson" as const,
            title: activeCourse.lastWatched,
            detail: activeCourse.title,
            due: "Continue today",
            route: "Course Details" as StudentNavPage,
            tone: "success" as const,
          },
        ]
      : []
    return [...pendingAssignments, ...activeQuizzes, ...lesson].slice(0, 4)
  }, [assignments, quizzes, activeCourse])

  const upcoming = useMemo(() => timetableSchedule.filter((slot) => slot.status !== "Completed").slice(0, 3), [])
  const liveSession = upcoming.find(isLive) ?? upcoming[0]
  const completedItems = priorityItems.filter((item) => completed.has(item.id)).length
  const focusScore = Math.min(98, Math.round(metrics.averageProgress * 0.45 + attendanceData.overallPercentage * 0.35 + Math.max(0, 100 - priorityItems.length * 8) * 0.2))
  const completedModules = metrics.modulesComplete
  const activeModules = inProgress.length
  const remainingModules = Math.max(0, metrics.modulesTotal - completedModules - activeModules)
  const activitySeries: AreaSeries[] = [
    { name: "Focused study", values: chart.focus, color: "var(--primary-text)" },
    { name: "Daily goal", values: chart.goal, color: "var(--secondary-text)" },
  ]

  const openCourse = (course: CourseItem) => {
    setActiveCourseId(course.id)
    onNavigate("Course Details", course.id)
  }
  const togglePriority = (item: PriorityItem) => {
    setCompleted((items) => {
      const next = new Set(items)
      if (next.has(item.id)) next.delete(item.id)
      else {
        next.add(item.id)
        onToast(`Completed: ${item.title}`)
      }
      return next
    })
  }
  const toggleReminder = (slot: TimetableSlot) => {
    setReminders((current) => {
      const next = new Set(current)
      if (next.has(slot.id)) next.delete(slot.id)
      else {
        next.add(slot.id)
        onToast(`Reminder set for ${slot.courseName}`)
      }
      return next
    })
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        eyebrow={today}
        title={`${greeting()}, ${firstName}`}
        description="Your learning command center for the day ahead."
        actions={
          <Button variant="outline" leftIcon={<CalendarDays aria-hidden="true" />} onClick={() => onNavigate("Schedule")}>
            View schedule
          </Button>
        }
      />

      <Stagger className="flex flex-col gap-5" stagger={0.055}>
        {/* The dashboard's one focal surface: the active learning command center. */}
        <StaggerItem>
          <section className="relative isolate overflow-hidden rounded-xl border border-white/10 bg-ink-950 shadow-[var(--glow-primary)]" aria-label="Learning command center">
            {activeCourse && (
              <img
                src={activeCourse.image}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-full object-cover opacity-[0.16] [mask-image:linear-gradient(90deg,transparent_10%,black_64%)] lg:w-2/3"
              />
            )}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/35 via-ink-950/80 to-ink-950" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full bg-secondary/25 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />

            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:items-center">
              <div className="min-w-0">
                <Badge tone="live" dot className="border-white/10 bg-white/10 text-white shadow-none dark:text-white">
                  Learning live
                </Badge>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Your next lesson</p>
                <h2 className="mt-1 max-w-2xl text-[30px] font-semibold leading-tight tracking-tight text-white sm:text-h2">
                  {activeCourse ? activeCourse.lastWatched : "Choose a course to begin"}
                </h2>
                {activeCourse && (
                  <p className="mt-2 text-sm text-white/90">
                    {activeCourse.title} · {activeCourse.completedModules} of {activeCourse.totalModules} modules complete
                  </p>
                )}

                <div className="mt-6 max-w-xl">
                  <div className="mb-2 flex items-center justify-between text-caption font-medium text-white">
                    <span>Mastery path</span>
                    <span className="tabular-nums">{activeCourse?.progress ?? 0}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Active course progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={activeCourse?.progress ?? 0}
                    className="h-2 overflow-hidden rounded-full bg-white/20"
                  >
                    <motion.div
                      className="h-full w-full origin-left rounded-full bg-white"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: (activeCourse?.progress ?? 0) / 100 }}
                      transition={{ duration: 0.9, ease: ease.out, delay: 0.2 }}
                    />
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-caption text-white/80">
                    <Target className="h-3.5 w-3.5" aria-hidden="true" />
                    {activeCourse?.nextMilestone ?? "Set a learning goal"}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Button
                    variant="glass"
                    size="lg"
                    leftIcon={<Play className="fill-current" aria-hidden="true" />}
                    onClick={() => activeCourse && openCourse(activeCourse)}
                    className="border-white/20 bg-white text-ink-950 hover:bg-white/90 dark:bg-white dark:text-ink-950 dark:hover:bg-white/90"
                  >
                    Resume learning
                  </Button>
                  <Button variant="glass" size="lg" leftIcon={<Sparkles aria-hidden="true" />} onClick={() => onNavigate("My Notes")}>
                    Open study notes
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-xl border border-white/12 bg-black/20 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <ProgressRing
                      value={focusScore}
                      size={88}
                      thickness={8}
                      tone="success"
                      label="Today's focus score"
                      className="[&_svg>circle:first-child]:stroke-white/15"
                    >
                      <div className="text-center">
                        <AnimatedNumber value={focusScore} className="block text-xl font-semibold text-white" />
                        <span className="text-[10px] uppercase tracking-wider text-white/80">Focus</span>
                      </div>
                    </ProgressRing>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Focus score</p>
                      <p className="mt-0.5 text-caption leading-5 text-white/80">You are ahead of your weekly learning pace.</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-caption font-medium text-success">
                        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> +8 points this week
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/12 bg-black/20 p-3 backdrop-blur-sm">
                  {[
                    { label: "Streak", value: "5", suffix: "days", icon: Flame, tone: "text-warning" },
                    { label: "This week", value: "14.8", suffix: "hours", icon: Clock, tone: "text-secondary" },
                    { label: "Done", value: `${completedItems}/${priorityItems.length || 0}`, suffix: "priorities", icon: CheckCircle2, tone: "text-success" },
                  ].map((stat) => (
                    <div key={stat.label} className="min-w-0 border-r border-white/10 px-2 last:border-r-0">
                      <stat.icon className={cn("h-4 w-4", stat.tone)} aria-hidden="true" />
                      <p className="mt-2 truncate text-base font-semibold tabular-nums text-white">{stat.value}</p>
                      <p className="truncate text-[10px] text-white/75">{stat.label}</p>
                      <p className="truncate text-[10px] text-white/55">{stat.suffix}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </StaggerItem>

        {/* Signals are bespoke dashboard cards, not the old generic KPI row. */}
        <StaggerItem>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Learning signals">
            <MetricTile
              label="Learning momentum"
              value={`${chart.total}h`}
              detail={chart.change}
              icon={Activity}
              tone="primary"
              sparkline={chart.focus}
              onClick={() => document.getElementById("learning-analytics")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
            <MetricTile
              label="Course mastery"
              value={`${metrics.averageProgress}%`}
              detail={`${metrics.modulesComplete}/${metrics.modulesTotal} modules complete`}
              icon={GraduationCap}
              tone="success"
              sparkline={enrolled.map((course) => course.progress)}
              onClick={() => onNavigate("My Courses")}
            />
            <MetricTile
              label="Attendance pulse"
              value={`${attendanceData.overallPercentage}%`}
              detail="Top 5% of your cohort"
              icon={CheckCircle2}
              tone="info"
              sparkline={[89, 91, 92, 94, attendanceData.overallPercentage]}
              onClick={() => onNavigate("Attendance")}
            />
            <MetricTile
              label="Priority queue"
              value={`${priorityItems.length}`}
              detail={priorityItems[0] ? dueLabel(priorityItems[0].due) : "All clear"}
              icon={ListTodo}
              tone="warning"
              sparkline={[5, 4, 4, 3, priorityItems.length]}
              onClick={() => document.getElementById("priority-queue")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
          </div>
        </StaggerItem>

        <StaggerItem>
          <div id="learning-analytics" className="grid scroll-mt-5 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-soft text-primary-text ring-1 ring-inset ring-primary-border">
                      <LineChart className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <CardTitle>Learning momentum</CardTitle>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Focused study time compared with your daily target.</p>
                </div>
                <SegmentedControl
                  size="sm"
                  aria-label="Learning momentum range"
                  options={[
                    { value: "Week" as TimeRange, label: "7 days" },
                    { value: "Month" as TimeRange, label: "4 weeks" },
                  ]}
                  value={range}
                  onChange={setRange}
                />
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={range}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6, transition: transition.fast }}
                    transition={transition.base}
                  >
                    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <ChartLabel icon={Clock} label="Focused study" value={`${chart.total}h`} detail={range === "Week" ? "this week" : "this month"} tone="primary" />
                      <ChartLabel icon={Target} label="Goal completion" value={`${Math.round((chart.total / (range === "Week" ? 14 : 48)) * 100)}%`} detail="of target" tone="success" />
                      <ChartLabel icon={Zap} label="Best session" value={range === "Week" ? "3.6h" : "14.8h"} detail={range === "Week" ? "Thursday" : "Week 4"} tone="info" />
                    </div>
                    <AreaChart
                      labels={chart.labels}
                      series={activitySeries}
                      height={238}
                      yMin={0}
                      yMax={range === "Week" ? 4 : 16}
                      formatValue={(value) => `${value}h`}
                      label={`${range} focused study time and learning goals`}
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-caption text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary-text" aria-hidden="true" /> Focused study
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-secondary-text" aria-hidden="true" /> Daily goal
                  </span>
                  <span className="ml-auto font-medium text-success">On pace for your weekly target</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Mastery map</CardTitle>
                    <p className="mt-1 text-caption text-muted-foreground">Your course portfolio at a glance.</p>
                  </div>
                  <Badge tone="success">On track</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <DonutChart
                  size={138}
                  thickness={15}
                  data={[
                    { label: "Complete", value: completedModules, color: "var(--success)" },
                    { label: "In progress", value: activeModules, color: "var(--primary)" },
                    { label: "To unlock", value: remainingModules, color: "var(--border-strong)" },
                  ].filter((segment) => segment.value > 0)}
                  center={
                    <>
                      <span className="text-2xl font-semibold tabular-nums text-foreground">{metrics.averageProgress}%</span>
                      <span className="text-[10px] uppercase tracking-wider text-subtle-foreground">mastery</span>
                    </>
                  }
                  formatValue={(value) => `${value} modules`}
                />
                <div className="mt-5 grid gap-2 border-t border-border pt-4">
                  {enrolled.slice(0, 3).map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => openCourse(course)}
                      className="group flex items-center gap-3 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-ink-950">
                        <img src={course.image} alt="" aria-hidden="true" className="h-full w-full object-cover opacity-80" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-caption font-medium text-foreground">{course.title}</span>
                        <span className="block h-1 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-border">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${course.progress}%` }} />
                        </span>
                      </span>
                      <span className="text-caption font-semibold tabular-nums text-primary-text">{course.progress}%</span>
                      <ChevronRight className="h-3.5 w-3.5 text-subtle-foreground transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)]">
            <Card className="overflow-hidden">
              <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Course trajectory</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Move through your active courses without losing momentum.</p>
                </div>
                <Button variant="link" size="sm" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onNavigate("My Courses")}>
                  All courses
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {inProgress.length ? (
                    inProgress.slice(0, 3).map((course, index) => (
                      <motion.button
                        key={course.id}
                        type="button"
                        onClick={() => openCourse(course)}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.985 }}
                        transition={spring.snappy}
                        className={cn(
                          "group relative isolate overflow-hidden rounded-lg border p-4 text-left",
                          course.id === activeCourse?.id ? "border-primary-border bg-primary-soft" : "border-border bg-surface-2 hover:border-border-strong/60",
                        )}
                      >
                        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-10">
                          <CourseCover title={course.title} category={coverCategory(course.category)} image={course.image} showTitle={false} hoverZoom={false} />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone={course.id === activeCourse?.id ? "primary" : "neutral"} size="sm">
                            {index === 0 ? "Now" : "Up next"}
                          </Badge>
                          <span className="text-caption font-semibold tabular-nums text-primary-text">{course.progress}%</span>
                        </div>
                        <h3 className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-foreground">{course.title}</h3>
                        <p className="mt-1 line-clamp-1 text-caption text-muted-foreground">{course.lastWatched}</p>
                        <Progress value={course.progress} tone={course.id === activeCourse?.id ? "primary" : "info"} size="xs" className="mt-4" label={`${course.title} progress`} />
                        <div className="mt-3 flex items-center justify-between text-caption">
                          <span className="text-muted-foreground">{course.completedModules}/{course.totalModules} modules</span>
                          <span className="inline-flex items-center gap-1 font-medium text-primary-text">
                            Resume <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                          </span>
                        </div>
                      </motion.button>
                    ))
                  ) : (
                    <div className="md:col-span-3">
                      <EmptyState
                        size="sm"
                        icon={<BookOpen aria-hidden="true" />}
                        title="Start your first course"
                        description="Choose a program from the catalog to build your learning plan."
                        action={<Button size="sm" onClick={() => onNavigate("My Courses")}>Explore programs</Button>}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card id="priority-queue" className="scroll-mt-5">
              <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
                <div>
                  <CardTitle>Priority queue</CardTitle>
                  <p className="mt-1 text-caption text-muted-foreground">Finish these to protect your learning streak.</p>
                </div>
                <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-warning-soft px-2 text-xs font-semibold tabular-nums text-warning">
                  {priorityItems.length - completedItems}
                </span>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 px-3">
                {priorityItems.length ? (
                  priorityItems.map((item) => {
                    const done = completed.has(item.id)
                    const details = item.due.includes("Continue") ? item.due : dueLabel(item.due)
                    const ItemIcon = item.kind === "quiz" ? Trophy : item.kind === "lesson" ? Play : ListTodo
                    return (
                      <div key={item.id} className="group flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-surface-2">
                        <motion.button
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          aria-label={`Mark ${item.title} ${done ? "incomplete" : "complete"}`}
                          onClick={() => togglePriority(item)}
                          whileTap={{ scale: 0.82 }}
                          transition={spring.snappy}
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                            done ? "border-success bg-success text-white dark:text-ink-950" : "border-border-strong bg-surface text-subtle-foreground hover:border-primary",
                          )}
                        >
                          <AnimatePresence initial={false}>
                            {done && (
                              <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={spring.snappy} className="flex">
                                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                        <button
                          type="button"
                          onClick={() => onNavigate(item.route, item.kind === "lesson" ? activeCourse?.id : undefined)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className={cn("block truncate text-sm font-medium transition-colors", done ? "text-muted-foreground line-through" : "text-foreground group-hover:text-primary-text")}>{item.title}</span>
                          <span className="flex items-center gap-1 truncate text-caption text-muted-foreground">
                            <ItemIcon className={cn("h-3 w-3 shrink-0", METRIC_TONE[item.tone].text)} aria-hidden="true" />
                            {item.detail}
                          </span>
                        </button>
                        <Badge tone={done ? "success" : item.tone === "warning" ? "warning" : "neutral"} size="sm" className="shrink-0">
                          {done ? "Done" : details.replace(/^Due /, "")}
                        </Badge>
                      </div>
                    )
                  })
                ) : (
                  <EmptyState size="sm" icon={<CheckCircle2 aria-hidden="true" />} title="You're all clear" description="No pending work right now." />
                )}
                <Button variant="link" size="sm" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onNavigate("Assessments")} className="mt-2 self-start">
                  Review all assessments
                </Button>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Reveal>
              <Card className="h-full">
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Weekly learning rhythm</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Consistency matters more than one long study session.</p>
                  </div>
                  <Badge tone="success">
                    <Flame className="h-3 w-3" aria-hidden="true" /> 5-day streak
                  </Badge>
                </CardHeader>
                <CardContent>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={range} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: transition.fast }} transition={transition.base}>
                      <BarChart data={chart.bars} height={172} formatValue={(value) => `${value}%`} label={`${range} learning rhythm score`} />
                    </motion.div>
                  </AnimatePresence>
                  <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4 text-warning" aria-hidden="true" /> Your strongest study window is 7–9 PM.
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => onToast("A focus-session reminder has been set for 7 PM")}>Set focus reminder</Button>
                  </div>
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={0.06}>
              <Card className="h-full">
                <CardHeader className="flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle>Next on your calendar</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Classes and study commitments coming up.</p>
                  </div>
                  <Button variant="link" size="sm" onClick={() => onNavigate("Schedule")}>Open schedule</Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {upcoming.map((slot, index) => {
                    const live = isLive(slot)
                    const date = dateForSlot(slot)
                    const reminded = reminders.has(slot.id)
                    return (
                      <motion.div
                        key={slot.id}
                        initial={{ opacity: 0, x: 8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ ...transition.base, delay: index * 0.05 }}
                        className={cn("flex items-center gap-3 rounded-lg border p-3", live ? "border-danger/30 bg-danger-soft" : "border-border bg-surface")}
                      >
                        <DateTile month={live ? "Live" : date.month} day={live ? "Now" : date.day} tone={live ? "live" : "default"} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-foreground">{slot.courseName}</p>
                            {live && (
                              <Badge tone="live" dot size="sm">
                                Live
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-caption text-muted-foreground">{slot.time} · {slot.room}</p>
                        </div>
                        {live ? (
                          <Button size="sm" leftIcon={<Radio aria-hidden="true" />} onClick={() => onToast(`Joining ${slot.courseName}…`)}>
                            Join
                          </Button>
                        ) : (
                          <motion.div whileTap={{ scale: 0.92 }} transition={spring.snappy}>
                            <Button
                              variant={reminded ? "secondary" : "outline"}
                              size="icon-sm"
                              aria-label={reminded ? `Remove reminder for ${slot.courseName}` : `Set reminder for ${slot.courseName}`}
                              aria-pressed={reminded}
                              onClick={() => toggleReminder(slot)}
                            >
                              <AnimatePresence mode="wait" initial={false}>
                                <motion.span key={reminded ? "on" : "off"} initial={{ rotate: -20, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 20, opacity: 0 }} transition={transition.fast} className="flex">
                                  {reminded ? <BellRing className="text-primary-text" aria-hidden="true" /> : <Bell aria-hidden="true" />}
                                </motion.span>
                              </AnimatePresence>
                            </Button>
                          </motion.div>
                        )}
                      </motion.div>
                    )
                  })}
                  {liveSession && (
                    <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-3">
                      <span className="flex min-w-0 items-center gap-2 text-caption text-muted-foreground">
                        <Timer className="h-3.5 w-3.5 shrink-0 text-primary-text" aria-hidden="true" />
                        <span className="truncate">Up next: {liveSession.courseName}</span>
                      </span>
                      <Button variant="ghost" size="sm" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onNavigate("Schedule")}>
                        Details
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </StaggerItem>
      </Stagger>
    </div>
  )
}
