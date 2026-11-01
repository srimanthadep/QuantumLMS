import { useCallback, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  Lock,
  MessageSquare,
  Presentation,
  Send,
  Sparkles,
  Star,
  ThumbsUp,
  Timer,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
} from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import CourseCover from "@/components/shared/CourseCover"
import AssignmentSubmitDialog from "@/components/student/AssignmentSubmitDialog"
import QuizRunner from "@/components/student/QuizRunner"
import type { AssignmentData, CourseItem, LessonItem, QuizData, ResourceMaterial, StudentNavPage } from "./studentTypes"
import { downloadCourseMaterialsZip, downloadSingleMaterial } from "./materialUtils"
import { coverCategory, relTime } from "./studentUtils"
import { parseMinutes } from "./course/courseData"
import LessonPlayer from "./course/LessonPlayer"
import CurriculumList from "./course/CurriculumList"
import { useStudentData, useStudentResource } from "./data/StudentDataProvider"
import { askQuestion, deleteQuestion, loadMaterials, loadQandA, setQuestionVote, type QandAData } from "./data/course"
import type { SubmissionInput } from "./data/actions"

interface CourseDetailsPageProps {
  selectedCourseId: string
  courses: CourseItem[]
  onSelectCourse: (id: string) => void
  onBackToCourses: () => void
  onNavigate?: (page: StudentNavPage, courseId?: string) => void
  onToast: (msg: string) => void
  onOpenAiModal: () => void
  onEnrollCourse?: (course: CourseItem) => Promise<void> | void
  assignments?: AssignmentData[]
  onSubmitAssignment?: (id: string, input: SubmissionInput) => Promise<void>
  quizzes?: QuizData[]
}

const INSTRUCTOR_AVATAR: Record<string, string> = {
  Srimanth: "/assets/srimanth.png",
  "Dr. Elena Vance": "/assets/teacher-female.png",
}

export default function CourseDetailsPage(props: CourseDetailsPageProps) {
  const course = props.courses.find((c) => c.id === props.selectedCourseId) ?? props.courses[0]
  if (!course) {
    return (
      <EmptyState
        icon={<BookOpen aria-hidden="true" />}
        title="Course not found"
        description="It may have been removed from your enrollments."
        action={<Button onClick={props.onBackToCourses}>Back to My Courses</Button>}
      />
    )
  }
  return course.status === "Catalog" ? <CatalogView {...props} course={course} /> : <CourseView key={course.id} {...props} course={course} />
}

function CatalogView({ course, onBackToCourses, onEnrollCourse }: CourseDetailsPageProps & { course: CourseItem }) {
  const { view } = useStudentData()
  const modules = view.curriculum[course.id] ?? []
  const [enrolling, setEnrolling] = useState(false)
  const enroll = async () => {
    setEnrolling(true)
    try {
      await onEnrollCourse?.(course)
    } finally {
      setEnrolling(false)
    }
  }
  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={[{ label: "My Courses", onClick: onBackToCourses }, { label: course.title }]}
        eyebrow="Catalog"
        title={course.title}
        description={`${course.instructor} · ${course.instructorRole}`}
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <CourseCover title={course.title} category={coverCategory(course.category)} image={course.image} showTitle={false} hoverZoom={false} className="aspect-[21/9]" />
          <CardContent className="grid gap-5 pt-5">
            <p className="text-sm leading-6 text-muted-foreground">{course.description}</p>
            <Facts course={course} />
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" loading={enrolling} onClick={() => void enroll()}>
                Enroll and start learning
              </Button>
              <span className="flex items-center gap-1 text-caption text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                <span className="font-medium text-foreground">{course.rating}</span> from {course.reviews} learners
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Course content</CardTitle>
            <Badge tone="neutral">
              <Lock className="h-3 w-3" aria-hidden="true" /> Enroll to unlock
            </Badge>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <CurriculumList modules={modules} activeLessonId={null} completed={new Set()} unlocked={new Set()} onSelect={() => undefined} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CourseView({
  course,
  courses,
  onSelectCourse,
  onBackToCourses,
  onToast,
  onOpenAiModal,
  assignments = [],
  onSubmitAssignment,
  quizzes = [],
}: CourseDetailsPageProps & { course: CourseItem }) {
  const { user } = useSession()
  const data = useStudentData()
  const modules = useMemo(() => data.view.curriculum[course.id] ?? [], [data.view.curriculum, course.id])
  const flat = useMemo(() => modules.flatMap((m, mi) => m.lessons.map((lesson) => ({ lesson, moduleIndex: mi }))), [modules])
  const completed = data.view.completed

  const [activeId, setActiveId] = useState<string>(
    () =>
      (flat.find((f) => f.lesson.status === "In Progress") ?? flat.find((f) => f.lesson.status !== "Locked" && f.lesson.status !== "Completed") ?? flat[0])
        ?.lesson.id ?? "",
  )
  const [tab, setTab] = useState("overview")
  const [submitTarget, setSubmitTarget] = useState<AssignmentData | null>(null)
  const [quizTarget, setQuizTarget] = useState<QuizData | null>(null)
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null)
  const materials = useStudentResource(`materials:${course.id}`, () => loadMaterials(course.id), 300_000)

  // A lesson opens when it was never locked, is done, or follows a completed lesson.
  const unlocked = useMemo(() => {
    const s = new Set<string>()
    flat.forEach((f, i) => {
      if (f.lesson.status !== "Locked" || completed.has(f.lesson.id) || (i > 0 && completed.has(flat[i - 1].lesson.id))) s.add(f.lesson.id)
    })
    return s
  }, [flat, completed])

  const activeIndex = Math.max(0, flat.findIndex((f) => f.lesson.id === activeId))
  const active = flat[activeIndex]
  const prev = flat[activeIndex - 1]
  const next = flat[activeIndex + 1]
  const isDone = active ? completed.has(active.lesson.id) : false
  const doneHere = flat.filter((f) => completed.has(f.lesson.id)).length
  const pct = flat.length ? Math.round((doneHere / flat.length) * 100) : 0
  const minutesLeft = flat.filter((f) => !completed.has(f.lesson.id)).reduce((s, f) => s + parseMinutes(f.lesson.duration), 0)

  const courseAssignments = assignments.filter((a) => a.courseId === course.id)
  const courseQuizzes = quizzes.filter((q) => q.courseId === course.id)
  const materialList = materials.data ?? []
  const enrolled = courses.filter((c) => c.status !== "Catalog")

  const { setLessonComplete } = data
  const completeLesson = useCallback(
    (id: string) => {
      if (completed.has(id)) return
      setLessonComplete(id, true)
        .then((r) => {
          if (r.certificate) onToast(`Course complete! Your certificate "${r.certificate.title}" is ready.`)
          else onToast(r.completed === r.total ? "Course complete. Nice work!" : "Lesson complete. Nice work!")
        })
        .catch((e: Error) => onToast(`Couldn't save your progress: ${e.message}`))
    },
    [completed, setLessonComplete, onToast],
  )
  const toggleDone = () => {
    if (!active) return
    if (isDone) setLessonComplete(active.lesson.id, false).catch((e: Error) => onToast(`Couldn't save your progress: ${e.message}`))
    else completeLesson(active.lesson.id)
  }
  const select = (lesson: LessonItem) => {
    setActiveId(lesson.id)
    document.getElementById("main")?.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={[{ label: "My Courses", onClick: onBackToCourses }, { label: course.title }]}
        eyebrow={`${course.category} · ${course.level}`}
        title={course.title}
        description={`${course.instructor} · ${course.instructorRole}`}
        actions={
          enrolled.length > 1 ? (
            <Select value={course.id} onValueChange={onSelectCourse}>
              <SelectTrigger aria-label="Switch course" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {enrolled.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {active && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={transition.base}>
              <LessonPlayer
                lesson={active.lesson}
                moduleTitle={modules[active.moduleIndex]?.title ?? ""}
                poster={course.image}
                completed={isDone}
                onComplete={() => completeLesson(active.lesson.id)}
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-caption text-muted-foreground">
                    Lesson {activeIndex + 1} of {flat.length} · {active.lesson.duration}
                  </p>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.h2
                      key={active.lesson.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={transition.fast}
                      className="truncate text-lg font-semibold text-foreground"
                    >
                      {active.lesson.title}
                    </motion.h2>
                  </AnimatePresence>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="ghost" size="sm" aria-label="Explain this lesson with AI" leftIcon={<Sparkles aria-hidden="true" />} onClick={onOpenAiModal}>
                    <span className="hidden sm:inline">Explain this lesson</span>
                  </Button>
                  <Button variant="outline" size="icon-sm" aria-label="Previous lesson" disabled={!prev} onClick={() => prev && select(prev.lesson)}>
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant={isDone ? "secondary" : "primary"}
                    aria-pressed={isDone}
                    leftIcon={isDone ? <CheckCircle2 className="text-success" aria-hidden="true" /> : <Check aria-hidden="true" />}
                    onClick={toggleDone}
                  >
                    {isDone ? "Completed" : "Mark complete"}
                  </Button>
                  <Tooltip content="Complete this lesson to unlock the next one" disabled={!next || unlocked.has(next.lesson.id)}>
                    <span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Next lesson"
                        disabled={!next || !unlocked.has(next.lesson.id)}
                        onClick={() => next && select(next.lesson)}
                      >
                        <ChevronRight aria-hidden="true" />
                      </Button>
                    </span>
                  </Tooltip>
                </div>
              </div>
            </motion.div>
          )}

          <Tabs value={tab} onValueChange={setTab} variant="underline">
            <TabsList aria-label="Course sections" className="w-full justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="materials">
                Materials <span className="tabular-nums text-subtle-foreground">{materials.data ? materialList.length : ""}</span>
              </TabsTrigger>
              <TabsTrigger value="assessments">
                Assessments <span className="tabular-nums text-subtle-foreground">{courseAssignments.length + courseQuizzes.length}</span>
              </TabsTrigger>
              <TabsTrigger value="qa">Q&amp;A</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-5">
              <Overview course={course} modules={modules.map((m) => ({ title: m.title, done: m.lessons.every((l) => completed.has(l.id)) }))} />
            </TabsContent>
            <TabsContent value="materials" className="mt-5">
              {materials.error ? (
                <EmptyState
                  size="sm"
                  icon={<AlertTriangle aria-hidden="true" />}
                  title="Materials didn't load"
                  description={materials.error.message}
                  action={
                    <Button size="sm" variant="secondary" onClick={() => void materials.reload()}>
                      Try again
                    </Button>
                  }
                />
              ) : materials.loading ? (
                <div className="grid gap-2" role="status" aria-label="Loading materials">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : (
                <Materials materials={materialList} courseTitle={course.title} onToast={onToast} />
              )}
            </TabsContent>
            <TabsContent value="assessments" className="mt-5">
              <Assessments
                assignments={courseAssignments}
                quizzes={courseQuizzes}
                onSubmit={setSubmitTarget}
                onStartQuiz={(q) => {
                  setReviewAttemptId(null)
                  setQuizTarget(q)
                }}
                onReviewQuiz={(q) => {
                  if (!q.latestAttemptId) {
                    onToast("No saved attempt to review yet.")
                    return
                  }
                  setReviewAttemptId(q.latestAttemptId)
                  setQuizTarget(q)
                }}
              />
            </TabsContent>
            <TabsContent value="qa" className="mt-5">
              <QandA course={course} userName={user.name} userAvatar={user.avatar} onToast={onToast} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-0 xl:max-h-[calc(100dvh-var(--shell-topbar-h)-3rem)] xl:self-start">
          <Card>
            <CardContent className="flex items-center gap-4 pt-5">
              <ProgressRing value={pct} size={72} thickness={7} tone={pct === 100 ? "success" : "primary"} label="Course progress">
                <span className="text-sm font-semibold tabular-nums text-foreground">{pct}%</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Your progress</p>
                <p className="text-caption text-muted-foreground">
                  {doneHere} of {flat.length} lessons · {minutesLeft >= 60 ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m` : `${minutesLeft}m`} left
                </p>
                <Badge tone="warning" className="mt-2 max-w-full">
                  <Timer className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{course.nextMilestone}</span>
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle>Course content</CardTitle>
              <span className="text-caption text-muted-foreground">
                {modules.length} modules · {flat.length} lessons
              </span>
            </CardHeader>
            <div className="min-h-0 overflow-y-auto border-t border-border px-2 py-2">
              <CurriculumList modules={modules} activeLessonId={activeId} completed={completed} unlocked={unlocked} onSelect={select} />
            </div>
          </Card>
        </aside>
      </div>

      <AssignmentSubmitDialog
        assignment={submitTarget}
        onClose={() => setSubmitTarget(null)}
        onSubmit={async (id, input) => {
          await onSubmitAssignment?.(id, input)
        }}
      />
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

function Facts({ course }: { course: CourseItem }) {
  const facts = [
    { icon: Clock, label: "Duration", value: course.duration },
    { icon: Layers, label: "Modules", value: String(course.totalModules) },
    { icon: GraduationCap, label: "Level", value: course.level },
    { icon: BookOpen, label: "Credits", value: String(course.credits) },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {facts.map((f) => (
        <div key={f.label} className="rounded-md border border-border bg-surface-2 p-3">
          <f.icon className="h-4 w-4 text-primary-text" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-foreground">{f.value}</p>
          <p className="text-caption text-muted-foreground">{f.label}</p>
        </div>
      ))}
    </div>
  )
}

function Overview({ course, modules }: { course: CourseItem; modules: { title: string; done: boolean }[] }) {
  return (
    <div className="grid gap-5">
      <p className="text-sm leading-6 text-muted-foreground">{course.description}</p>
      <Facts course={course} />
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">What you'll cover</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {modules.map((m) => (
            <li key={m.title} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", m.done ? "text-success" : "text-subtle-foreground")} aria-hidden="true" />
              <span className={m.done ? "text-foreground" : "text-muted-foreground"}>{m.title}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-border p-4">
        <Avatar src={INSTRUCTOR_AVATAR[course.instructor]} name={course.instructor} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{course.instructor}</p>
          <p className="truncate text-caption text-muted-foreground">{course.instructorRole}</p>
        </div>
        <span className="flex items-center gap-1 text-caption text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
          <span className="font-medium text-foreground">{course.rating}</span>
        </span>
      </div>
    </div>
  )
}

const MATERIAL_ICON: Record<ResourceMaterial["type"], { icon: typeof FileText; tile: string }> = {
  PDF: { icon: FileText, tile: "bg-danger-soft text-danger ring-danger/20" },
  "Code Notebook": { icon: FileCode2, tile: "bg-primary-soft text-primary-text ring-primary-border" },
  Dataset: { icon: FileSpreadsheet, tile: "bg-success-soft text-success ring-success/20" },
  Slides: { icon: Presentation, tile: "bg-warning-soft text-warning ring-warning/20" },
}

function Materials({ materials, courseTitle, onToast }: { materials: ResourceMaterial[]; courseTitle: string; onToast: (m: string) => void }) {
  if (materials.length === 0) {
    return <EmptyState size="sm" icon={<FileText aria-hidden="true" />} title="No materials yet" description="Your instructor hasn't shared files for this course." />
  }
  const available = materials.filter((m) => m.isAvailable !== false).length
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-muted-foreground">
          {materials.length} files · {available} available
        </p>
        <Button variant="outline" size="sm" leftIcon={<Download aria-hidden="true" />} onClick={() => downloadCourseMaterialsZip(materials, courseTitle, onToast)}>
          Download all (.zip)
        </Button>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {materials.map((m, i) => {
          const { icon: Icon, tile } = MATERIAL_ICON[m.type]
          const missing = m.isAvailable === false
          return (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition.base, delay: i * 0.04 }}
              className="group flex items-center gap-3 p-4 transition-colors hover:bg-surface-2"
            >
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md ring-1 ring-inset", tile)}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
                <p className="truncate text-caption text-muted-foreground">
                  {m.type} · {m.size} · {m.date}
                </p>
              </div>
              {missing && (
                <Tooltip content={m.errorMessage ?? "This file is unavailable"}>
                  <span tabIndex={0} className="rounded-full">
                    <Badge tone="danger">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Unavailable
                    </Badge>
                  </span>
                </Tooltip>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Download ${m.title}`}
                onClick={() => downloadSingleMaterial(m, courseTitle, onToast)}
                className="transition-transform group-hover:-translate-y-px"
              >
                <Download aria-hidden="true" />
              </Button>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}

const ASSIGNMENT_TONE = { Pending: "warning", Submitted: "info", Graded: "success" } as const

function Assessments({
  assignments,
  quizzes,
  onSubmit,
  onStartQuiz,
  onReviewQuiz,
}: {
  assignments: AssignmentData[]
  quizzes: QuizData[]
  onSubmit: (a: AssignmentData) => void
  onStartQuiz: (q: QuizData) => void
  onReviewQuiz: (q: QuizData) => void
}) {
  if (assignments.length + quizzes.length === 0) {
    return <EmptyState size="sm" icon={<ClipboardList aria-hidden="true" />} title="No assessments for this course" description="Assignments and quizzes will appear here when they're published." />
  }
  return (
    <div className="grid gap-6">
      {assignments.length > 0 && (
        <section aria-label="Assignments" className="grid gap-2">
          <h3 className="text-caption font-medium uppercase tracking-wider text-subtle-foreground">Assignments</h3>
          {assignments.map((a) => (
            <div key={a.id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={ASSIGNMENT_TONE[a.status]}>{a.status}</Badge>
                  {a.priority === "High" && a.status === "Pending" && <Badge tone="danger">High priority</Badge>}
                </div>
                <p className="mt-1.5 text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-caption text-muted-foreground">
                  {a.status === "Graded" ? `Graded · ${a.grade} (${a.score}/${a.maxMarks})` : a.status === "Submitted" ? `Submitted ${a.submissionDate}` : `Due ${a.dueDate} · ${a.maxMarks} marks`}
                </p>
              </div>
              {a.status === "Pending" ? (
                <Button variant="secondary" size="sm" onClick={() => onSubmit(a)}>
                  Submit work
                </Button>
              ) : a.status === "Submitted" ? (
                <Button variant="ghost" size="sm" onClick={() => onSubmit(a)}>
                  Resubmit
                </Button>
              ) : (
                <ProgressRing value={a.score ?? 0} size={44} thickness={4} tone="success" label={`${a.title} score`}>
                  <span className="text-[10px] font-semibold tabular-nums text-foreground">{a.score}</span>
                </ProgressRing>
              )}
            </div>
          ))}
        </section>
      )}
      {quizzes.length > 0 && (
        <section aria-label="Quizzes" className="grid gap-2">
          <h3 className="text-caption font-medium uppercase tracking-wider text-subtle-foreground">Quizzes</h3>
          {quizzes.map((q) => {
            const attemptsLeft = (q.maxAttempts ?? 1) - (q.attemptsUsed ?? 0)
            return (
              <div key={q.id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Badge tone={q.status === "Completed" ? "success" : q.status === "Active" ? "primary" : "neutral"}>{q.status}</Badge>
                  <p className="mt-1.5 text-sm font-medium text-foreground">{q.title}</p>
                  <p className="text-caption text-muted-foreground">
                    {q.questionCount} questions · {q.durationMinutes} min · pass {q.passingPct}%{q.score ? ` · scored ${q.score}` : ""}
                  </p>
                </div>
                {q.status === "Completed" ? (
                  <Button variant="ghost" size="sm" onClick={() => onReviewQuiz(q)}>
                    Review answers
                  </Button>
                ) : q.status === "Active" && attemptsLeft > 0 ? (
                  <Button variant="secondary" size="sm" onClick={() => onStartQuiz(q)}>
                    Start quiz
                  </Button>
                ) : (
                  <Badge tone="neutral">Opens {q.availableFrom ?? q.dueDate}</Badge>
                )}
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}

interface QuestionView {
  id: string
  author: string
  avatar?: string
  time: string
  text: string
  votes: number
  voted: boolean
  mine: boolean
  answer?: { author: string; text: string }
}

function QandA({ course, userName, userAvatar, onToast }: { course: CourseItem; userName: string; userAvatar?: string; onToast: (m: string) => void }) {
  const { uid, now } = useStudentData()
  const qa = useStudentResource<QandAData>(`qa:${course.id}`, () => loadQandA(course.id), 60_000)
  const [draft, setDraft] = useState("")
  const [posting, setPosting] = useState(false)

  const questions = useMemo<QuestionView[]>(() => {
    const voted = new Set(qa.data?.voted ?? [])
    return (qa.data?.questions ?? []).map((q) => ({
      id: q.id,
      author: q.author_name,
      avatar: q.author_avatar ?? undefined,
      time: relTime(q.created_at, now),
      text: q.body,
      votes: q.base_votes + q.vote_count,
      voted: voted.has(q.id),
      mine: q.author_id === uid,
      answer: q.answer_text ? { author: q.answer_author ?? course.instructor, text: q.answer_text } : undefined,
    }))
  }, [qa.data, uid, now, course.instructor])

  const post = async () => {
    const text = draft.trim()
    if (!text || posting) return
    setPosting(true)
    try {
      const row = await askQuestion(course.id, text)
      qa.mutate((d) => ({ ...d, questions: [row, ...d.questions] }))
      setDraft("")
      onToast("Question posted to the course board")
    } catch (e) {
      onToast(`Couldn't post your question: ${(e as Error).message}`)
    } finally {
      setPosting(false)
    }
  }
  const applyVote = (id: string, on: boolean) =>
    qa.mutate((d) => ({
      questions: d.questions.map((q) => (q.id === id ? { ...q, vote_count: Math.max(0, q.vote_count + (on ? 1 : -1)) } : q)),
      voted: on ? [...d.voted.filter((v) => v !== id), id] : d.voted.filter((v) => v !== id),
    }))
  const vote = (q: QuestionView) => {
    const on = !q.voted
    applyVote(q.id, on)
    setQuestionVote(q.id, on).catch((e: Error) => {
      applyVote(q.id, !on)
      onToast(`Couldn't save your vote: ${e.message}`)
    })
  }
  const remove = async (id: string) => {
    try {
      await deleteQuestion(id)
      qa.mutate((d) => ({ ...d, questions: d.questions.filter((q) => q.id !== id) }))
      onToast("Question removed")
    } catch (e) {
      onToast(`Couldn't remove the question: ${(e as Error).message}`)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex gap-3 rounded-lg border border-border bg-surface p-4">
        <Avatar src={userAvatar} name={userName} size="sm" />
        <div className="flex-1">
          <Textarea
            aria-label="Ask a question"
            placeholder="Ask your instructor or classmates about this course…"
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void post()
            }}
            className="min-h-[72px]"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-caption text-subtle-foreground">Ctrl + Enter to post</span>
            <Button size="sm" variant="secondary" leftIcon={<Send aria-hidden="true" />} disabled={!draft.trim()} loading={posting} onClick={() => void post()}>
              Post question
            </Button>
          </div>
        </div>
      </div>
      {qa.error && (
        <EmptyState
          size="sm"
          icon={<AlertTriangle aria-hidden="true" />}
          title="Questions didn't load"
          description={qa.error.message}
          action={
            <Button size="sm" variant="secondary" onClick={() => void qa.reload()}>
              Try again
            </Button>
          }
        />
      )}
      {qa.loading && (
        <div className="grid gap-3" role="status" aria-label="Loading questions">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}
      {qa.data && questions.length === 0 && (
        <EmptyState size="sm" icon={<MessageSquare aria-hidden="true" />} title="No questions yet" description="Ask the first one. Your instructor and classmates will see it here." />
      )}
      <motion.ul layout className="grid gap-3">
        <AnimatePresence initial={false}>
          {questions.map((q) => (
            <motion.li
              key={q.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={transition.base}
              className="flex gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <Avatar src={q.avatar} name={q.author} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
                  <span className="font-semibold text-foreground">{q.author}</span>
                  <span className="text-caption text-subtle-foreground">· {q.time}</span>
                  {q.mine && !q.answer && (
                    <button type="button" onClick={() => void remove(q.id)} className="text-caption font-medium text-muted-foreground underline-offset-2 hover:text-danger hover:underline">
                      Delete
                    </button>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{q.text}</p>
                {q.answer && (
                  <div className="mt-3 rounded-md border-l-2 border-primary bg-surface-2 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-caption font-semibold text-primary-text">
                      <MessageSquare className="h-3 w-3" aria-hidden="true" /> {q.answer.author} · Instructor
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{q.answer.text}</p>
                  </div>
                )}
              </div>
              <motion.button
                type="button"
                onClick={() => vote(q)}
                aria-pressed={!!q.voted}
                aria-label={`Upvote, ${q.votes} votes`}
                whileTap={{ scale: 0.9 }}
                transition={spring.snappy}
                className={cn(
                  "flex h-fit shrink-0 flex-col items-center gap-0.5 rounded-md border px-2.5 py-1.5 text-caption font-semibold transition-colors",
                  q.voted ? "border-primary-border bg-primary-soft text-primary-text" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <ThumbsUp className={cn("h-3.5 w-3.5", q.voted && "fill-current")} aria-hidden="true" />
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={q.votes}
                    initial={{ y: 6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -6, opacity: 0 }}
                    transition={transition.fast}
                    className="tabular-nums"
                  >
                    {q.votes}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  )
}
