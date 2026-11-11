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
  Skeleton,
} from "@/components/ui"
import AreaChart, { type AreaSeries } from "@/components/charts/AreaChart"
import BarChart from "@/components/charts/BarChart"
import DonutChart from "@/components/charts/DonutChart"
import ProgressRing from "@/components/charts/ProgressRing"
import Sparkline from "@/components/charts/Sparkline"
import AnimatedNumber from "@/components/motion/AnimatedNumber"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import Reveal from "@/components/motion/Reveal"
import CourseCover from "@/components/shared/CourseCover"
import DateTile from "@/components/student/DateTile"
import RecentPlacementsCard from "@/components/student/RecentPlacementsCard"
import PlacementStories from "@/components/student/PlacementStories"
import SwingingLanyardBadge from "@/components/ui/SwingingLanyardBadge"
import type { AssignmentData, CourseItem, QuizData, StudentNavPage, TimetableSlot } from "./studentTypes"
import { coverCategory, dueLabel } from "./studentUtils"
import { useStudentData } from "./data/StudentDataProvider"
import { useActivity, useAttendance, useReminders, useTimetable } from "./data/hooks"
import { upcomingSlots } from "./data/schedule"
import { bestStudyWindow, studyAnalytics, studyStreak } from "./data/insights"

interface StudentDashboardProps {
  onNavigate: (page: StudentNavPage, courseId?: string) => void
  onToast: (msg: string) => void
  courses: CourseItem[]
  assignments: AssignmentData[]
  quizzes: QuizData[]
}

type TimeRange = "Week" | "Month"
type MetricTone = "primary" | "success" | "warning" | "info"

const METRIC_TONE: Record<MetricTone, { tile: string; line: string; text: string }> = {
  primary: { tile: "bg-primary-soft text-primary-text ring-primary-border", line: "var(--primary-text)", text: "text-primary-text" },
  success: { tile: "bg-success-soft text-success ring-success/20", line: "var(--success)", text: "text-success" },
  warning: { tile: "bg-warning-soft text-warning ring-warning/20", line: "var(--warning)", text: "text-warning" },
  info: { tile: "bg-info-soft text-info ring-info/20", line: "var(--info)", text: "text-info" },
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

function dateForSlot(slot: TimetableSlot): { month: string; day: string } {
  const date = slot.nextStart ?? new Date()
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }),
    day: String(date.getDate()),
  }
}

/** Ids of priority items the student ticked off (kept in profile.ui_state). */
function doneIds(uiState: unknown): string[] {
  const v = uiState && typeof uiState === "object" && !Array.isArray(uiState) ? (uiState as Record<string, unknown>).dashboard_done : undefined
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
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
  badgeText,
  badgeTone = "neutral",
  icon: Icon,
  tone,
  sparkline,
  onClick,
}: {
  label: string
  value: string
  detail: string
  badgeText?: string
  badgeTone?: "success" | "warning" | "info" | "neutral"
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
      className="group relative flex min-h-[142px] w-full flex-col justify-between overflow-hidden rounded-[14px] border border-border/80 bg-surface p-4 sm:p-5 text-left shadow-[var(--elev-xs)] transition-[border-color,box-shadow] duration-200 hover:border-border-strong/70 hover:shadow-[var(--elev-md)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-muted-foreground">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset", style.tile)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <div className="my-1">
        <p className="truncate text-[30px] font-bold leading-none tracking-tight text-foreground">{value}</p>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
        <p className={cn("truncate text-xs font-medium", style.text)}>{detail}</p>
        {badgeText && (
          <Badge
            size="sm"
            tone={badgeTone}
            className="text-[10px] px-1.5 py-0 h-4.5 shrink-0 font-medium"
          >
            {badgeText}
          </Badge>
        )}
        {sparkline && (
          <Sparkline
            data={sparkline}
            stroke={style.line}
            className="h-6 w-16 shrink-0 opacity-80 transition-transform duration-300 group-hover:scale-105"
          />
        )}
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

export default function StudentDashboardPage({ onNavigate, onToast, courses, assignments, quizzes }: StudentDashboardProps) {
  const { user } = useSession()
  const data = useStudentData()
  const firstName = user.name.split(" ")[0]
  const today = new Date(data.now).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
  const [range, setRange] = useState<TimeRange>("Week")
  const completed = useMemo(() => new Set(doneIds(data.profile.ui_state)), [data.profile.ui_state])
  const reminders = useReminders()
  const timetable = useTimetable()
  const attendanceRes = useAttendance()
  const activity = useActivity()
  const attendance = attendanceRes.data
  const attendancePct = attendance?.overallPercentage ?? 0
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
  const activityRows = useMemo(() => activity.data ?? [], [activity.data])
  const chart = useMemo(() => studyAnalytics(activityRows, range, data.now), [activityRows, range, data.now])
  const week = useMemo(() => studyAnalytics(activityRows, "Week", data.now), [activityRows, data.now])
  const streak = useMemo(() => studyStreak(activityRows, data.now), [activityRows, data.now])
  const studyWindow = useMemo(() => bestStudyWindow(Object.values(data.raw.progress)), [data.raw.progress])
  const currentLessonId = activeCourseId ? data.view.curriculum[activeCourseId]?.flatMap((m) => m.lessons).find((l) => l.status === "In Progress")?.id : undefined
  const focusReminder = (data.profile.ui_state as Record<string, unknown> | null)?.focus_reminder === true
  const overdue = assignments.filter((a) => a.status === "Pending" && a.dueAt && Date.parse(a.dueAt) < data.now).length

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
    const lesson = activeCourse && activeCourse.status === "In Progress"
      ? [
          {
            id: `lesson-${currentLessonId ?? activeCourse.id}`,
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
  }, [assignments, quizzes, activeCourse, currentLessonId])

  const upcoming = useMemo(() => upcomingSlots(timetable.week?.slots ?? [], 3), [timetable.week])
  const liveSession = upcoming.find(isLive) ?? upcoming[0]
  const completedItems = priorityItems.filter((item) => completed.has(item.id)).length
  const nextPriority = priorityItems.find((p) => !completed.has(p.id))
  const focusScore = Math.min(98, Math.round(metrics.averageProgress * 0.45 + attendancePct * 0.35 + Math.max(0, 100 - (priorityItems.length - completedItems) * 8) * 0.2))
  const pace = week.total >= (week.target * Math.min(7, new Date(data.now).getDay() || 7)) / 7
  const completedModules = metrics.modulesComplete
  const activeModules = inProgress.length
  const remainingModules = Math.max(0, metrics.modulesTotal - completedModules - activeModules)
  const activitySeries: AreaSeries[] = [
    { name: "Focused study", values: chart.focus, color: "#F97316" },
    { name: "Daily goal", values: chart.goal, color: "#0EA5E9", dashed: true },
  ]

  const openCourse = (course: CourseItem) => {
    setActiveCourseId(course.id)
    onNavigate("Course Details", course.id)
  }
  const saveUiState = (patch: Record<string, unknown>) => {
    const current = (data.profile.ui_state && typeof data.profile.ui_state === "object" && !Array.isArray(data.profile.ui_state) ? data.profile.ui_state : {}) as Record<string, unknown>
    return data.updateProfile({ ui_state: { ...current, ...patch } as never })
  }
  const togglePriority = (item: PriorityItem) => {
    const done = !completed.has(item.id)
    // Only ids still in the queue are kept, so the list can't grow without bound.
    const next = priorityItems.map((p) => p.id).filter((id) => (id === item.id ? done : completed.has(id)))
    saveUiState({ dashboard_done: next })
      .then(() => done && onToast(`Completed: ${item.title}`))
      .catch((e: Error) => onToast(`Couldn't save: ${e.message}`))
  }
  const toggleReminder = (slot: TimetableSlot) => {
    reminders
      .toggle("slot", slot.id)
      .then((on) => on && onToast(`Reminder set for ${slot.courseName}, 15 minutes before it starts`))
      .catch((e: Error) => onToast(`Couldn't save the reminder: ${e.message}`))
  }
  const toggleFocusReminder = () => {
    const on = !focusReminder
    saveUiState({ focus_reminder: on })
      .then(() => onToast(on ? `A focus-session reminder is set for ${studyWindow?.start ?? "7 PM"}` : "Focus reminder turned off"))
      .catch((e: Error) => onToast(`Couldn't save: ${e.message}`))
  }

  return (
    <div className="relative flex w-full min-w-0 flex-col">
      {/* Interactive Swinging Lanyard Badge hanging from the top border line on the left, unclipped across full width */}
      <div className="hidden lg:block pointer-events-none absolute -left-3 xl:-left-4 -right-3 xl:-right-4 -top-5 sm:-top-5 lg:-top-6 z-20 h-[500px] xl:h-[520px]">
        <SwingingLanyardBadge
          size={188}
          ropeLength={27}
          anchorX={92}
          anchorY={0}
          strapSpread={105}
          stretch={350}
          strapColor="var(--primary)"
          image={{
            src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
            alt: firstName,
          }}
          name={user?.name || firstName}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description="Your learning command center for the day ahead."
        className="relative z-10 lg:pl-[164px] xl:pl-[176px]"
        actions={
          <Button variant="outline" leftIcon={<CalendarDays aria-hidden="true" />} onClick={() => onNavigate("Schedule")}>
            View schedule
          </Button>
        }
      />

      <Stagger className="flex flex-col gap-5" stagger={0.055}>
        {/* The dashboard's one focal surface: the active learning command center on the right, clearing the lanyard on the left. */}
        <StaggerItem>
          <div className="lg:pl-[164px] xl:pl-[176px]">
            <section
              className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F17] shadow-xl [contain:paint] transform-gpu"
              aria-label="Learning command center"
            >
              {activeCourse && (
                <img
                  src={activeCourse.image}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-full object-cover opacity-[0.14] [mask-image:linear-gradient(90deg,transparent_10%,black_65%)] lg:w-2/3"
                />
              )}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/20 via-[#0B0F17]/90 to-[#0B0F17]" />
              <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 -z-10 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />

              <div className="p-5 sm:p-6 lg:p-7">
                {/* Top Tagline */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Badge tone="live" dot className="shrink-0 border-white/15 bg-white/10 text-white text-[11px] px-2.5 py-0.5">
                      Learning Live
                    </Badge>
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                      Your Next Lesson
                    </span>
                    <span className="hidden xl:inline truncate text-xs text-white/40">· Continue where you left off</span>
                  </div>
                  <div className="shrink-0 text-xs text-white/60 font-mono">
                    {today}
                  </div>
                </div>

                {/* Main Command Center Grid */}
                <div className="grid gap-4 xl:gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(235px,0.8fr)] xl:grid-cols-[minmax(0,1.25fr)_minmax(255px,0.85fr)] items-center">
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl xl:text-2xl font-bold tracking-tight text-white line-clamp-1">
                      {activeCourse ? (activeCourse.lastWatched || activeCourse.title) : "Choose a course to begin"}
                    </h2>
                    {activeCourse && (
                      <p className="mt-1 text-xs sm:text-sm text-white/80 line-clamp-1">
                        {activeCourse.title} · Module {activeCourse.completedModules + 1 || 1} · {activeCourse.completedModules} of {activeCourse.totalModules} modules completed
                      </p>
                    )}

                    {/* Connected Course Progress Bar */}
                    <div className="mt-3.5 max-w-md">
                      <div className="flex items-center justify-between text-xs font-medium text-white/90 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-primary" />
                          {activeCourse?.nextMilestone ?? "Course progress"}
                        </span>
                        <span className="font-mono font-semibold text-white">{activeCourse?.progress ?? 0}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: (activeCourse?.progress ?? 0) / 100 }}
                          style={{ originX: 0 }}
                          transition={{ duration: 0.9, ease: ease.out, delay: 0.2 }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      <Button
                        variant="primary"
                        size="default"
                        leftIcon={<Play className="fill-current h-4 w-4" aria-hidden="true" />}
                        onClick={() => activeCourse && openCourse(activeCourse)}
                        className="font-semibold px-4 shadow-sm"
                      >
                        Resume learning
                      </Button>
                      <Button
                        variant="secondary"
                        size="default"
                        leftIcon={<Sparkles className="h-4 w-4 text-warning" aria-hidden="true" />}
                        onClick={() => onNavigate("My Notes")}
                        className="border-white/15 bg-white/10 text-white hover:bg-white/20 active:scale-[0.98] text-xs font-medium"
                      >
                        Open study notes
                      </Button>
                    </div>
                  </div>

                  {/* Integrated Compact 4-Stat Strip */}
                  <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-white/10 bg-black/40 p-2.5 xl:p-3">
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-white text-lg font-bold tabular-nums">{focusScore}</span>
                        <span className="text-[10px] font-bold text-success uppercase">Focus</span>
                      </div>
                      <p className="text-[11px] text-white/70 mt-1 font-medium whitespace-nowrap">Focus score</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-white text-lg font-bold tabular-nums">{streak} {streak === 1 ? "day" : "days"}</span>
                        <Flame className="h-4 w-4 shrink-0 text-warning fill-current" />
                      </div>
                      <p className="text-[11px] text-white/70 mt-1 font-medium whitespace-nowrap">Learning streak</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-white text-lg font-bold tabular-nums">{week.total}h</span>
                        <Clock className="h-4 w-4 shrink-0 text-sky-400" />
                      </div>
                      <p className="text-[11px] text-white/70 mt-1 font-medium whitespace-nowrap">This week</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-white text-lg font-bold tabular-nums">{priorityItems.length - completedItems}</span>
                        <ListTodo className="h-4 w-4 shrink-0 text-amber-400" />
                      </div>
                      <p className="text-[11px] text-white/70 mt-1 font-medium whitespace-nowrap">Priority tasks</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </StaggerItem>

        {/* Signals & Placements Overview Grid */}
        <StaggerItem>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px] items-start">
            {/* Left Column: Standardized KPI Cards in a balanced 2x2 Grid */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 min-w-0" aria-label="Learning signals">
              <MetricTile
                label="Learning momentum"
                value={`${chart.total}h`}
                detail={chart.change}
                badgeText={chart.total >= chart.previous ? "On track" : "Needs attention"}
                badgeTone={chart.total >= chart.previous ? "success" : "warning"}
                icon={Activity}
                tone={chart.total >= chart.previous ? "primary" : "warning"}
                sparkline={chart.focus}
                onClick={() => document.getElementById("learning-analytics")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              />
              <MetricTile
                label="Course mastery"
                value={`${metrics.averageProgress}%`}
                detail={`${metrics.modulesComplete}/${metrics.modulesTotal} modules completed`}
                badgeText="On track"
                badgeTone="success"
                icon={GraduationCap}
                tone="success"
                sparkline={enrolled.map((course) => course.progress)}
                onClick={() => onNavigate("My Courses")}
              />
              <MetricTile
                label="Attendance pulse"
                value={attendance ? `${attendance.overallPercentage}%` : "–"}
                detail={attendance ? (attendance.totalClasses ? `${attendance.attendedClasses} of ${attendance.totalClasses - attendance.excusedClasses} classes attended` : "No classes recorded yet") : "Loading…"}
                badgeText={attendance && attendance.overallPercentage >= 85 ? "Excellent" : "Regular"}
                badgeTone={attendance && attendance.overallPercentage >= 85 ? "info" : "neutral"}
                icon={CheckCircle2}
                tone="info"
                sparkline={attendance && attendance.subjects.length > 1 ? attendance.subjects.map((s) => s.percentage) : undefined}
                onClick={() => onNavigate("Attendance")}
              />
              <MetricTile
                label="Priority queue"
                value={`${priorityItems.length - completedItems} ${priorityItems.length - completedItems === 1 ? "task" : "tasks"}`}
                detail={nextPriority ? (nextPriority.kind === "lesson" ? nextPriority.due : dueLabel(nextPriority.due)) : "All clear"}
                badgeText={priorityItems.length - completedItems > 0 ? "Pending" : "Cleared"}
                badgeTone={priorityItems.length - completedItems > 0 ? "warning" : "success"}
                icon={ListTodo}
                tone={priorityItems.length - completedItems > 0 ? "warning" : "success"}
                onClick={() => document.getElementById("priority-queue")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              />
            </div>

            {/* Right Column: Recent Placements Marquee Block */}
            <div className="min-w-0">
              <RecentPlacementsCard onNavigate={onNavigate} maxItems={5} />
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div id="learning-analytics" className="grid scroll-mt-5 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
            <Card className="min-w-0 overflow-hidden rounded-[14px] border border-border">
              <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold">Learning momentum</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Focused study time compared with your daily target.</p>
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
                    <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <ChartLabel icon={Clock} label="Focused study" value={`${chart.total}h`} detail={range === "Week" ? "last 7 days" : "last 4 weeks"} tone="primary" />
                      <ChartLabel icon={Target} label="Goal completion" value={`${Math.round((chart.total / chart.target) * 100)}%`} detail={`of ${chart.target}h target`} tone="success" />
                      <ChartLabel icon={Zap} label="Best session" value={`${chart.best.hours}h`} detail={chart.best.hours ? chart.best.label : "none yet"} tone="info" />
                    </div>
                    <AreaChart
                      labels={chart.labels}
                      series={activitySeries}
                      height={220}
                      yMin={0}
                      yMax={chart.yMax}
                      formatValue={(value) => `${value}h`}
                      label={`${range} focused study time and learning goals`}
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" /> Focused study
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-[#0EA5E9]" aria-hidden="true" /> Daily goal
                  </span>
                  <span className={cn("ml-auto font-semibold text-xs", chart.total >= chart.previous ? "text-success" : "text-amber-500")}>
                    {chart.change}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[14px] border border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold">Mastery map</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Your course portfolio at a glance.</p>
                  </div>
                  <Badge tone={overdue ? "warning" : "success"}>{overdue ? `${overdue} overdue` : "On track"}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <DonutChart
                  size={128}
                  thickness={14}
                  data={[
                    { label: "Complete", value: completedModules, color: "var(--success)" },
                    { label: "In progress", value: activeModules, color: "var(--primary)" },
                    { label: "To unlock", value: remainingModules, color: "var(--border-strong)" },
                  ].filter((segment) => segment.value > 0)}
                  center={
                    <>
                      <span className="text-2xl font-bold tabular-nums text-foreground">{metrics.averageProgress}%</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">mastery</span>
                    </>
                  }
                  formatValue={(value) => `${value} modules`}
                />
                <div className="mt-4 grid gap-2 border-t border-border/60 pt-3">
                  {enrolled.slice(0, 3).map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => openCourse(course)}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-surface-2/40 px-3 py-2 text-left transition-all hover:bg-surface-2 hover:border-border"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary font-bold text-xs">
                          <BookOpen className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="block truncate text-xs font-semibold text-foreground">{course.title}</span>
                            <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                              {course.progress >= 100 ? "100%" : `${course.progress}%`}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-border">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${course.progress}%` }} />
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 shrink-0">
                        {course.progress >= 100 ? "Certificate" : "Resume"} <ChevronRight className="h-3 w-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)]">
            {/* Course Trajectory (Responsive Smart Grid) */}
            <Card className="overflow-hidden rounded-[14px] border border-border">
              <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold">Continue learning</CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {inProgress.length} Active
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Pick up right where you left off in your cohort curriculum.</p>
                </div>
                <Button variant="link" size="sm" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onNavigate("My Courses")}>
                  View all courses
                </Button>
              </CardHeader>
              <CardContent>
                {inProgress.length === 1 ? (
                  /* Single Course Smart Horizontal Card - Eliminates Empty Space */
                  <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/5 via-surface-2/40 to-surface-2/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="relative h-18 w-28 shrink-0 overflow-hidden rounded-lg bg-ink-950 border border-border shadow-xs">
                        <img src={inProgress[0].image} alt="" className="h-full w-full object-cover opacity-85" />
                        <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          {inProgress[0].category}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge tone="primary" size="sm">Active Cohort</Badge>
                          <span className="text-xs font-semibold text-primary">{inProgress[0].progress}% completed</span>
                        </div>
                        <h3 className="text-base font-bold text-foreground mt-1 truncate">{inProgress[0].title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          Next lesson: <span className="font-semibold text-foreground">{inProgress[0].lastWatched}</span>
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-2 flex-1 max-w-xs overflow-hidden rounded-full bg-border">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${inProgress[0].progress}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {inProgress[0].completedModules} / {inProgress[0].totalModules} modules
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="default"
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                      onClick={() => openCourse(inProgress[0])}
                      className="shrink-0 font-semibold shadow-sm"
                    >
                      Resume course
                    </Button>
                  </div>
                ) : inProgress.length > 1 ? (
                  /* Multi-Course Balanced Grid */
                  <div className={cn("grid grid-cols-1 gap-3", inProgress.length === 2 ? "sm:grid-cols-2" : "md:grid-cols-3")}>
                    {inProgress.slice(0, 3).map((course, index) => (
                      <motion.button
                        key={course.id}
                        type="button"
                        onClick={() => openCourse(course)}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.985 }}
                        transition={spring.snappy}
                        className={cn(
                          "group relative isolate overflow-hidden rounded-xl border p-4 text-left transition-all",
                          course.id === activeCourse?.id
                            ? "border-primary/40 bg-primary-soft/50 ring-1 ring-primary/20"
                            : "border-border bg-surface-2/40 hover:border-border-strong/60 hover:bg-surface-2",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone={course.id === activeCourse?.id ? "primary" : "neutral"} size="sm">
                            {index === 0 ? "Now" : "Up next"}
                          </Badge>
                          <span className="text-caption font-semibold tabular-nums text-primary-text">{course.progress}%</span>
                        </div>
                        <h3 className="mt-2.5 line-clamp-1 text-sm font-bold text-foreground">{course.title}</h3>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{course.lastWatched}</p>
                        <Progress value={course.progress} tone={course.id === activeCourse?.id ? "primary" : "info"} size="xs" className="mt-3.5" label={`${course.title} progress`} />
                        <div className="mt-2.5 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{course.completedModules}/{course.totalModules} modules</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-primary">
                            Resume <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    size="sm"
                    icon={<BookOpen aria-hidden="true" />}
                    title="Start your first course"
                    description="Choose a program from the catalog to build your learning plan."
                    action={<Button size="sm" onClick={() => onNavigate("My Courses")}>Explore programs</Button>}
                  />
                )}
              </CardContent>
            </Card>

            {/* Action Center (Upgraded Priority Queue) */}
            <Card id="priority-queue" className="scroll-mt-5 rounded-[14px] border border-border">
              <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold">Your action center</CardTitle>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-soft px-1.5 text-[11px] font-bold text-warning">
                      {priorityItems.length - completedItems}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Immediate milestones, live sessions, and submissions.</p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 px-3">
                {priorityItems.length ? (
                  priorityItems.map((item) => {
                    const done = completed.has(item.id)
                    const details = item.due.includes("Continue") ? item.due : dueLabel(item.due)
                    const ItemIcon = item.kind === "quiz" ? Trophy : item.kind === "lesson" ? Play : ListTodo
                    return (
                      <div
                        key={item.id}
                        className="group flex items-center gap-2.5 rounded-lg border border-border/40 bg-surface px-3 py-2.5 transition-colors hover:bg-surface-2"
                      >
                        <motion.button
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          aria-label={`Mark ${item.title} ${done ? "incomplete" : "complete"}`}
                          onClick={() => togglePriority(item)}
                          whileTap={{ scale: 0.82 }}
                          transition={spring.snappy}
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                            done ? "border-success bg-success text-white" : "border-border-strong bg-surface text-subtle-foreground hover:border-primary",
                          )}
                        >
                          <AnimatePresence initial={false}>
                            {done && (
                              <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={spring.snappy} className="flex">
                                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                        <button
                          type="button"
                          onClick={() => onNavigate(item.route, item.kind === "lesson" ? activeCourse?.id : undefined)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className={cn("block truncate text-xs font-semibold transition-colors", done ? "text-muted-foreground line-through" : "text-foreground group-hover:text-primary")}>{item.title}</span>
                          <span className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground mt-0.5">
                            <ItemIcon className={cn("h-3 w-3 shrink-0", METRIC_TONE[item.tone].text)} aria-hidden="true" />
                            {item.detail}
                          </span>
                        </button>
                        <Badge tone={done ? "success" : item.tone === "warning" ? "warning" : "neutral"} size="sm" className="shrink-0 text-[10px]">
                          {done ? "Done" : details.replace(/^Due /, "")}
                        </Badge>
                      </div>
                    )
                  })
                ) : (
                  <EmptyState size="sm" icon={<CheckCircle2 aria-hidden="true" />} title="You're all clear" description="No pending actions right now." />
                )}
                <Button variant="link" size="sm" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onNavigate("Assessments")} className="mt-1 self-start text-xs">
                  Review all assessments
                </Button>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        {/* Placement Stories Reel */}
        <StaggerItem>
          <PlacementStories onNavigate={onNavigate} />
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
                  <Badge tone={streak ? "success" : "neutral"}>
                    <Flame className="h-3 w-3" aria-hidden="true" /> {streak ? `${streak}-day streak` : "Start a streak today"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={range} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: transition.fast }} transition={transition.base}>
                      <BarChart data={chart.bars} height={172} colorScheme="score" formatValue={(value) => `${value}%`} label={`${range} learning rhythm score`} />
                    </motion.div>
                  </AnimatePresence>
                  <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                      {studyWindow ? `Your strongest study window is ${studyWindow.label}.` : "Complete a few lessons to find your best study window."}
                    </span>
                    <Button variant={focusReminder ? "secondary" : "ghost"} size="sm" aria-pressed={focusReminder} onClick={toggleFocusReminder}>
                      {focusReminder ? "Focus reminder on" : "Set focus reminder"}
                    </Button>
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
                  {timetable.loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-[62px]" />)}
                  {timetable.error && <p className="text-sm text-muted-foreground">Your timetable didn't load. {timetable.error.message}</p>}
                  {timetable.week && upcoming.length === 0 && <p className="text-sm text-muted-foreground">No classes scheduled.</p>}
                  {upcoming.map((slot, index) => {
                    const live = isLive(slot)
                    const date = dateForSlot(slot)
                    const reminded = reminders.has("slot", slot.id)
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
                          <Button size="sm" leftIcon={<Radio aria-hidden="true" />} onClick={() => onNavigate("Live Class")}>
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
