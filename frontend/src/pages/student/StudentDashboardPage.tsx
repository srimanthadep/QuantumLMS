import { useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Bookmark,
  Calendar,
  ClipboardList,
  Clock,
  FileText,
  Play,
  Radio,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Video,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ease } from "@/lib/motion"
import { useSession } from "@/app/session"
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  SegmentedControl,
  StatCard,
} from "@/components/ui"
import BarChart, { type BarDatum } from "@/components/charts/BarChart"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import Reveal from "@/components/motion/Reveal"
import CourseCover from "@/components/shared/CourseCover"
import type { StudentNavPage, CourseItem, AssignmentData, QuizData } from "./studentTypes"
import CourseCard from "@/components/student/CourseCard"
import CertificateDialog from "@/components/student/CertificateDialog"
import { initialCertificatesList, initialStudentCourses } from "./studentMockData"

const CERTIFICATE = initialCertificatesList.find((c) => c.status === "Earned") ?? initialCertificatesList[0]

interface StudentDashboardProps {
  onNavigate: (page: StudentNavPage, courseId?: string) => void
  onToast: (msg: string) => void
  courses?: CourseItem[]
  assignments?: AssignmentData[]
  quizzes?: QuizData[]
}

type CourseFilter = "All" | "In Progress" | "Completed"
type Timeframe = "This Week" | "Last Week" | "This Month"

/** Enter/Space activation for clickable tiles (same contract as StatCard). */
function tileKeyDown(onClick: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onClick()
    }
  }
}

const INTERACTIVE_TILE =
  "group cursor-pointer overflow-hidden rounded-lg border border-border bg-surface transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-border-strong/60 hover:shadow-[var(--elev-md)] active:translate-y-0"

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

const SCHEDULE = [
  { month: "Oct", day: "21", title: "Building AI Agents", instructor: "Srimanth", time: "06:00 PM - 07:30 PM", live: true },
  { month: "Oct", day: "22", title: "RAG Systems Lab", instructor: "Srimanth", time: "10:00 AM - 11:30 AM", live: false },
  { month: "Oct", day: "23", title: "Neural Networks Lab", instructor: "Srimanth", time: "02:00 PM - 03:30 PM", live: false },
]

interface Task {
  id: string
  title: string
  meta: string
  icon: ReactNode
  tile: string
  badge: string
  badgeTone: "warning" | "info" | "neutral"
  toggleable: boolean
}

const TASKS: Task[] = [
  {
    id: "t1",
    title: "Submit Project 1: RAG Pipeline",
    meta: "Generative AI Masterclass",
    icon: <FileText className="h-4 w-4" aria-hidden="true" />,
    tile: "bg-primary-soft text-primary-text ring-primary-border",
    badge: "Due Oct 22",
    badgeTone: "warning",
    toggleable: true,
  },
  {
    id: "t2",
    title: "Quiz 4: Vector Embeddings",
    meta: "Module 4 · 10 MCQs",
    icon: <Clock className="h-4 w-4" aria-hidden="true" />,
    tile: "bg-warning-soft text-warning ring-warning/20",
    badge: "Due Oct 24",
    badgeTone: "warning",
    toggleable: false,
  },
  {
    id: "t3",
    title: "Peer Review: Agent Architectures",
    meta: "AI Agents Bootcamp",
    icon: <Users className="h-4 w-4" aria-hidden="true" />,
    tile: "bg-info-soft text-info ring-info/20",
    badge: "Pending",
    badgeTone: "info",
    toggleable: true,
  },
  {
    id: "t4",
    title: "Complete Lesson 5",
    meta: "Machine Learning Foundations",
    icon: <Play className="h-4 w-4" aria-hidden="true" />,
    tile: "bg-surface-2 text-muted-foreground ring-border",
    badge: "Not started",
    badgeTone: "neutral",
    toggleable: true,
  },
]

const RECOMMENDED = [
  { id: "rec-1", title: "Prompt Engineering Deep Dive", category: "Prompt Engineering", image: "/assets/rec_prompt.jpg", rating: "4.8", reviews: "2.1k" },
  { id: "rec-2", title: "AI Agents in Practice", category: "Agentic Systems", image: "/assets/student_hero_robot.jpg", rating: "4.9", reviews: "1.8k" },
  { id: "rec-3", title: "Computer Vision with Python", category: "Computer Vision", image: "/assets/rec_cv.jpg", rating: "4.7", reviews: "1.2k" },
]

const CHART: Record<Timeframe, { data: BarDatum[]; stats: [string, string, string] }> = {
  "This Week": {
    data: [
      { label: "Mon", value: 1.5 },
      { label: "Tue", value: 2.6 },
      { label: "Wed", value: 2.0 },
      { label: "Thu", value: 3.4, highlight: true },
      { label: "Fri", value: 1.0 },
      { label: "Sat", value: 2.4 },
      { label: "Sun", value: 1.6 },
    ],
    stats: ["14.5h", "12", "3"],
  },
  "Last Week": {
    data: [
      { label: "Mon", value: 2.2 },
      { label: "Tue", value: 2.8 },
      { label: "Wed", value: 2.4, highlight: true },
      { label: "Thu", value: 1.8 },
      { label: "Fri", value: 3.2 },
      { label: "Sat", value: 1.2 },
      { label: "Sun", value: 2.0 },
    ],
    stats: ["15.6h", "14", "4"],
  },
  "This Month": {
    data: [
      { label: "W1", value: 12 },
      { label: "W2", value: 15 },
      { label: "W3", value: 17, highlight: true },
      { label: "W4", value: 13.6 },
    ],
    stats: ["57.6h", "48", "11"],
  },
}

export default function StudentDashboardPage({
  onNavigate,
  onToast,
  courses = initialStudentCourses,
}: StudentDashboardProps) {
  const { user } = useSession()
  const firstName = user.name.split(" ")[0]
  const todayLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })

  const [courseFilter, setCourseFilter] = useState<CourseFilter>("All")
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [certOpen, setCertOpen] = useState(false)
  const [chartTimeframe, setChartTimeframe] = useState<Timeframe>("This Week")
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({})

  const filteredCourses = useMemo(() => {
    if (courseFilter === "All") return courses
    return courses.filter((c) => c.status === courseFilter)
  }, [courses, courseFilter])

  const filterOptions = useMemo(
    () =>
      (["All", "In Progress", "Completed"] as const).map((f) => ({
        value: f as CourseFilter,
        label: `${f} (${f === "All" ? courses.length : courses.filter((c) => c.status === f).length})`,
      })),
    [courses],
  )

  const activateTask = (task: Task) => {
    if (!task.toggleable) {
      onNavigate("Quizzes")
      return
    }
    const next = !completedTasks[task.id]
    setCompletedTasks((prev) => ({ ...prev, [task.id]: next }))
    if (next) onToast(`Completed task: "${task.title}"!`)
  }


  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        eyebrow={todayLabel}
        title={`${greeting()}, ${firstName}`}
        description="Track your ongoing courses, upcoming live classes, and pending milestones."
      />

      <Stagger className="flex flex-col gap-4" stagger={0.06}>
        {/* Learning metrics */}
        <StaggerItem>
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Student learning metrics">
            <StaggerItem>
              <StatCard
                title="Active Courses"
                value={`${courses.length}`}
                trend={{ value: "+2 this term", isPositive: true }}
                tone="primary"
                icon={BookOpen}
                sparkline={[1, 2, 2, 3, 4]}
                onClick={() => onNavigate("My Courses")}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                title="Attendance Rate"
                value="96.2%"
                trend={{ value: "Top 5% rank", isPositive: true }}
                tone="success"
                icon={BadgeCheck}
                sparkline={[93.5, 94.8, 95.2, 95.9, 96.2]}
                onClick={() => onNavigate("Attendance")}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                title="Pending Tasks"
                value="3 Due"
                trend="2 labs · 1 quiz"
                tone="warning"
                icon={ClipboardList}
                onClick={() => onNavigate("Assignments")}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                title="Current GPA"
                value="3.88 / 4.0"
                trend={{ value: "Dean's List", isPositive: true }}
                tone="info"
                icon={TrendingUp}
                sparkline={[3.62, 3.7, 3.74, 3.81, 3.88]}
                onClick={() => onNavigate("Grades")}
              />
            </StaggerItem>
          </Stagger>
        </StaggerItem>

        {/* Focal hero: continue learning */}
        <StaggerItem>
          <section
            aria-label="Continue learning"
            className="relative overflow-hidden rounded-xl shadow-[var(--glow-primary)]"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-10 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-ink-950/25 blur-3xl" />

            <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Continue learning
                </span>
                <h2 className="mt-3 text-h2 text-white">Generative AI Masterclass</h2>
                <p className="mt-1 text-sm font-medium text-white">Module 4 · RAG Applications</p>
                <p className="mt-0.5 text-caption text-white">Lesson 3 of 8 · 18 min left</p>

                <div className="mt-5 max-w-sm">
                  <div className="flex items-center justify-between text-caption font-medium text-white">
                    <span>Course progress</span>
                    <span className="tabular-nums">64%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={64}
                    aria-label="Generative AI Masterclass progress"
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/25"
                  >
                    <motion.div
                      className="h-full w-full origin-left rounded-full bg-white"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 0.64 }}
                      transition={{ duration: 0.9, ease: ease.out, delay: 0.25 }}
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onToast("Opening Generative AI Masterclass curriculum...")
                      onNavigate("Course Details", "c-1")
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-ink-950 px-5 text-sm font-semibold text-white shadow-[var(--elev-sm)] transition-[transform,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-ink-800 hover:shadow-[var(--elev-md)] active:translate-y-0"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    Continue learning
                  </button>
                  <Button
                    variant="glass"
                    size="icon"
                    aria-label={isBookmarked ? "Remove bookmark" : "Bookmark module"}
                    aria-pressed={isBookmarked}
                    onClick={() => {
                      setIsBookmarked(!isBookmarked)
                      onToast(isBookmarked ? "Removed from bookmarks" : "Bookmarked module for later!")
                    }}
                  >
                    <Bookmark className={isBookmarked ? "fill-current" : ""} aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <img
                src="/assets/robot_transparent.png"
                alt=""
                aria-hidden="true"
                className="hidden w-52 shrink-0 select-none drop-shadow-[0_16px_32px_rgb(0_0_0/0.35)] lg:block xl:w-64"
              />
            </div>
          </section>
        </StaggerItem>

        {/* Main grid */}
        <StaggerItem>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            {/* Left column */}
            <div className="flex min-w-0 flex-col gap-4">
              <Card>
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <CardTitle>My Courses</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <SegmentedControl size="sm" aria-label="Filter courses" options={filterOptions} value={courseFilter} onChange={setCourseFilter} />
                    <Button variant="link" size="sm" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onNavigate("My Courses")}>
                      View all
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredCourses.length === 0 ? (
                    <EmptyState
                      size="sm"
                      icon={<BookOpen aria-hidden="true" />}
                      title="No courses here yet"
                      description="Courses matching this filter will appear here."
                      action={
                        <Button variant="secondary" size="sm" onClick={() => setCourseFilter("All")}>
                          Show all courses
                        </Button>
                      }
                    />
                  ) : (
                    <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {filteredCourses.map((course) => (
                          <CourseCard key={course.id} course={course} onOpen={() => onNavigate("Course Details", course.id)} />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              <Reveal>
                <Card>
                  <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <CardTitle>Recommended Programs</CardTitle>
                    <Button variant="link" size="sm" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onNavigate("My Courses")}>
                      View all
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {RECOMMENDED.map((item) => {
                        const open = () => onNavigate("My Courses")
                        return (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`Preview ${item.title}`}
                            onClick={open}
                            onKeyDown={tileKeyDown(open)}
                            className={INTERACTIVE_TILE}
                          >
                            <CourseCover title={item.title} category={item.category} image={item.image} showTitle={false} />
                            <div className="flex items-center justify-between gap-2 p-4">
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold text-foreground" title={item.title}>
                                  {item.title}
                                </h3>
                                <p className="mt-0.5 flex items-center gap-1 text-caption text-muted-foreground">
                                  <Star className="h-3 w-3 fill-warning text-warning" aria-hidden="true" />
                                  <span className="font-medium tabular-nums text-foreground">{item.rating}</span>({item.reviews})
                                </p>
                              </div>
                              <span
                                aria-hidden="true"
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-200 group-hover:border-primary-border group-hover:text-primary-text"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            </div>

            {/* Right rail */}
            <div className="flex min-w-0 flex-col gap-4">
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <CardTitle>Today's Schedule</CardTitle>
                  <Button variant="link" size="sm" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onNavigate("Timetable")}>
                    Timetable
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {SCHEDULE.map((cls) => (
                    <div
                      key={cls.title}
                      className={cn(
                        "flex items-center gap-3 rounded-md border p-3",
                        cls.live ? "border-danger/30 bg-danger-soft" : "border-border",
                      )}
                    >
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-surface text-center">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-subtle-foreground">{cls.month}</span>
                        <span className="text-sm font-semibold leading-4 tabular-nums text-foreground">{cls.day}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-foreground">{cls.title}</p>
                          {cls.live && (
                            <Badge tone="live" dot size="sm">
                              Live
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-caption text-muted-foreground">
                          {cls.time} · {cls.instructor}
                        </p>
                      </div>
                      {cls.live ? (
                        <Button
                          size="sm"
                          leftIcon={<Radio aria-hidden="true" />}
                          onClick={() => onToast("Connecting to live interactive stream...")}
                        >
                          Join
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Add ${cls.title} to calendar`}
                          onClick={() => onToast(`Added '${cls.title}' to calendar!`)}
                        >
                          <Calendar aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <CardTitle>Your Next Tasks</CardTitle>
                  <Button variant="link" size="sm" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onNavigate("Assignments")}>
                    View all
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col">
                  {TASKS.map((task) => {
                    const done = !!completedTasks[task.id]
                    return (
                      <div
                        key={task.id}
                        role="button"
                        tabIndex={0}
                        aria-label={task.title}
                        aria-pressed={task.toggleable ? done : undefined}
                        onClick={() => activateTask(task)}
                        onKeyDown={tileKeyDown(() => activateTask(task))}
                        className="-mx-2 flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-2"
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
                            done ? "bg-success-soft text-success ring-success/20" : task.tile,
                          )}
                        >
                          {done ? <BadgeCheck className="h-4 w-4" aria-hidden="true" /> : task.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm font-medium", done ? "text-muted-foreground line-through" : "text-foreground")}>
                            {task.title}
                          </p>
                          <p className="truncate text-caption text-muted-foreground">{task.meta}</p>
                        </div>
                        {done ? <Badge tone="success">Done</Badge> : <Badge tone={task.badgeTone}>{task.badge}</Badge>}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Reveal>
                <Card>
                  <CardHeader className="flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CardTitle>Your Mentor</CardTitle>
                      <Badge tone="success" dot>
                        Available now
                      </Badge>
                    </div>
                    <Button variant="link" size="sm" onClick={() => onNavigate("Mentor Details")}>
                      Profile & hours
                    </Button>
                  </CardHeader>
                  <CardContent className="flex items-center gap-3">
                    <Avatar src="/assets/srimanth.png" name="Prof. Srimanth Adep" size="lg" status="online" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">Prof. Srimanth Adep</p>
                      <p className="truncate text-caption text-muted-foreground">Lead Professor · AI Research Fellow</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Video aria-hidden="true" />}
                      onClick={() => {
                        onToast("Opening Mentor Details & 1:1 Meeting...")
                        onNavigate("Mentor Details")
                      }}
                    >
                      1:1 Meeting
                    </Button>
                  </CardContent>
                </Card>
              </Reveal>

              <Reveal>
                <Card>
                  <CardHeader className="flex-row items-center justify-between gap-2">
                    <CardTitle>Earned Credentials</CardTitle>
                    <Button variant="link" size="sm" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onNavigate("Certificates")}>
                      View all
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-text ring-1 ring-inset ring-primary-border">
                        <Award className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{CERTIFICATE.title}</p>
                        <p className="truncate text-caption text-muted-foreground">Verified credential · With distinction</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setCertOpen(true)}>
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>

              <Reveal>
                <Card>
                  <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle>Learning Progress</CardTitle>
                    <SegmentedControl
                      size="sm"
                      aria-label="Chart timeframe"
                      options={[
                        { value: "This Week" as Timeframe, label: "Week" },
                        { value: "Last Week" as Timeframe, label: "Last week" },
                        { value: "This Month" as Timeframe, label: "Month" },
                      ]}
                      value={chartTimeframe}
                      onChange={(tf) => {
                        setChartTimeframe(tf)
                        onToast(`Viewing learning analytics for ${tf}`)
                      }}
                    />
                  </CardHeader>
                  <CardContent>
                    <BarChart data={CHART[chartTimeframe].data} height={150} formatValue={(v) => `${v}h`} label={`Study hours · ${chartTimeframe}`} />
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
                      {[
                        { icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />, tile: "bg-success-soft text-success ring-success/20", value: CHART[chartTimeframe].stats[0], label: "Study time" },
                        { icon: <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />, tile: "bg-primary-soft text-primary-text ring-primary-border", value: CHART[chartTimeframe].stats[1], label: "Lessons" },
                        { icon: <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />, tile: "bg-secondary-soft text-secondary-text ring-transparent", value: CHART[chartTimeframe].stats[2], label: "Quizzes" },
                      ].map((s) => (
                        <div key={s.label} className="flex items-center gap-2">
                          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset", s.tile)}>
                            {s.icon}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold tabular-nums text-foreground">{s.value}</p>
                            <p className="truncate text-[11px] text-subtle-foreground">{s.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            </div>
          </div>
        </StaggerItem>
      </Stagger>

      <CertificateDialog certificate={certOpen ? CERTIFICATE : null} recipient={user.name} onClose={() => setCertOpen(false)} onToast={onToast} />
    </div>
  )
}
