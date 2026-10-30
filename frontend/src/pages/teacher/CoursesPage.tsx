import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarPlus,
  GraduationCap,
  LayoutGrid,
  Layers,
  Link2,
  List,
  MoreHorizontal,
  Plus,
  Radio,
  Search,
  Users,
} from "lucide-react"
import {
  Avatar,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Progress,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import CourseCover from "@/components/shared/CourseCover"
import ScheduleSessionDialog from "@/components/teacher/ScheduleSessionDialog"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"
import type { CourseItem, LiveSessionItem, StudentItem } from "@/types"
import { copyText } from "@/pages/student/studentUtils"
import { useTeacherData } from "./teacherStore"
import { average, courseArt, dayLabel, formatTime } from "./teacherUtils"

type View = "grid" | "list"
type Sort = "next" | "progress" | "learners" | "name"

const TERMS = ["Term 1 (2026)", "Term 2 (2026)", "Term 3 (2026)"]

function NewCourseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const { addCourse, notify } = useTeacherData()
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [klass, setKlass] = useState("Year 4 – Maple Class")
  const [term, setTerm] = useState(TERMS[0])
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({})

  const [openedAt, setOpenedAt] = useState(open)
  if (openedAt !== open) {
    setOpenedAt(open)
    if (open) {
      setName("")
      setCode("")
      setKlass("Year 4 – Maple Class")
      setTerm(TERMS[0])
      setDescription("")
      setErrors({})
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = {
      name: name.trim().length < 3 ? "Give the course a name of at least 3 characters." : undefined,
      code: /^[A-Z0-9-]{4,}$/.test(code.trim()) ? undefined : "Use 4 or more capital letters, numbers or dashes, e.g. QAI-DS101.",
    }
    setErrors(next)
    if (next.name || next.code) return
    const course = addCourse({ name: name.trim(), code: code.trim(), assignedClass: klass.trim() || "Year 4", term, description: description.trim() })
    notify(`Created “${course.name}”. Add your first module next.`)
    onOpenChange(false)
    navigate(`/teacher/courses/${course.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Create a course</DialogTitle>
            <DialogDescription>You can add modules, lessons and assignments once it exists.</DialogDescription>
          </DialogHeader>
          <Field label="Course name" required error={errors.name}>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Data Stories with Python" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Course code" required error={errors.code}>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="QAI-DS101" />
            </Field>
            <Field label="Term">
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Class">
            <Input value={klass} onChange={(e) => setKlass(e.target.value)} />
          </Field>
          <Field label="Description" hint="Learners see this on the course page.">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will learners be able to do by the end?" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" leftIcon={<Plus aria-hidden="true" />}>
              Create course
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function nextLabel(s?: LiveSessionItem): string | null {
  if (!s) return null
  if (s.status === "Live Now") return "Live now"
  return `${dayLabel(s.scheduledDate)}, ${formatTime(s.startTime)}`
}

/** Every course the teacher runs, with progress, learners and the next class at a glance. */
export default function CoursesPage() {
  const navigate = useNavigate()
  const { courses, students, sessions, assignments, notify } = useTeacherData()
  const [query, setQuery] = useState("")
  const [view, setView] = useState<View>("grid")
  const [sort, setSort] = useState<Sort>("next")
  const [createOpen, setCreateOpen] = useState(false)
  const [scheduleFor, setScheduleFor] = useState<string | null>(null)

  const nextSession = useMemo(() => {
    const map = new Map<string, LiveSessionItem>()
    for (const s of [...sessions].sort((a, b) => `${a.scheduledDate}${a.startTime}`.localeCompare(`${b.scheduledDate}${b.startTime}`))) {
      if ((s.status === "Upcoming" || s.status === "Live Now" || s.status === "Scheduled") && !map.has(s.courseId)) map.set(s.courseId, s)
    }
    return map
  }, [sessions])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = courses.filter((c) => !q || `${c.name} ${c.code} ${c.assignedClass}`.toLowerCase().includes(q))
    const key = (c: CourseItem) => {
      const s = nextSession.get(c.id)
      return s ? (s.status === "Live Now" ? "0" : `1${s.scheduledDate}${s.startTime}`) : "2"
    }
    return [...list].sort((a, b) =>
      sort === "progress"
        ? b.progress - a.progress
        : sort === "learners"
          ? b.enrolledStudentsCount - a.enrolledStudentsCount
          : sort === "name"
            ? a.name.localeCompare(b.name)
            : key(a).localeCompare(key(b)),
    )
  }, [courses, query, sort, nextSession])

  const lessons = courses.flatMap((c) => c.modules.flatMap((m) => m.lessons))
  const delivered = lessons.filter((l) => l.completed).length
  const learners = courses.reduce((s, c) => s + c.enrolledStudentsCount, 0)
  const scorePct = Math.round(
    average(
      Object.values(assignments)
        .filter((a) => typeof a.averageScore === "number")
        .map((a) => ((a.averageScore ?? 0) / a.maxMarks) * 100),
    ),
  )

  const actions = (c: CourseItem) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={`More actions for ${c.name}`}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setScheduleFor(c.id)}>
          <CalendarPlus aria-hidden="true" /> Schedule a class
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={async () => {
            await copyText(`https://classroom.quantumschool.ai/join/${c.code.toLowerCase()}`)
            notify(`Invite link for ${c.code} copied`)
          }}
        >
          <Link2 aria-hidden="true" /> Copy invite link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate(`/teacher/courses/${c.id}?tab=learners`)}>
          <Users aria-hidden="true" /> View learners
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(`/teacher/analytics?course=${c.id}`)}>
          <BarChart3 aria-hidden="true" /> Course analytics
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const faces = (c: CourseItem) => c.enrolledStudentIds.map((id) => students.find((s) => s.id === id)).filter((s): s is StudentItem => Boolean(s))

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        title="Courses"
        description="Build curriculum, track delivery and jump into any course workspace."
        actions={
          <Button leftIcon={<Plus aria-hidden="true" />} onClick={() => setCreateOpen(true)}>
            New course
          </Button>
        }
      />

      <Stagger className="flex flex-col gap-5" stagger={0.05}>
        <StaggerItem>
          <Card className="grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
            {[
              { icon: BookOpen, label: "Active courses", value: String(courses.filter((c) => c.status === "Active").length), detail: `${courses.reduce((s, c) => s + c.modules.length, 0)} modules` },
              { icon: GraduationCap, label: "Learners", value: String(learners), detail: `${students.length} in your classes` },
              { icon: Layers, label: "Lessons delivered", value: `${delivered}/${lessons.length}`, detail: `${Math.round((delivered / Math.max(1, lessons.length)) * 100)}% of the plan` },
              { icon: BarChart3, label: "Assignment average", value: `${scorePct}%`, detail: "across graded work" },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground" aria-hidden="true">
                  <m.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-caption text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">{m.value}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{m.detail}</p>
                </div>
              </div>
            ))}
          </Card>
        </StaggerItem>

        <StaggerItem>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              leading={<Search aria-hidden="true" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code or class"
              aria-label="Search courses"
              wrapperClassName="sm:max-w-xs"
            />
            <div className="flex items-center gap-2 sm:ml-auto">
              <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                <SelectTrigger className="w-44" aria-label="Sort courses">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="next">Next class first</SelectItem>
                  <SelectItem value="progress">Most delivered</SelectItem>
                  <SelectItem value="learners">Most learners</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                </SelectContent>
              </Select>
              <SegmentedControl
                aria-label="Layout"
                options={[
                  { value: "grid" as View, label: <span className="sr-only">Grid</span>, icon: <LayoutGrid className="h-4 w-4" aria-hidden="true" /> },
                  { value: "list" as View, label: <span className="sr-only">List</span>, icon: <List className="h-4 w-4" aria-hidden="true" /> },
                ]}
                value={view}
                onChange={setView}
              />
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          {visible.length === 0 ? (
            <EmptyState
              icon={<Search aria-hidden="true" />}
              title="No courses match"
              description={`Nothing matches “${query}”.`}
              action={
                <Button variant="outline" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              }
            />
          ) : view === "grid" ? (
            <motion.ul layout className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <AnimatePresence initial={false}>
                {visible.map((c) => {
                  const next = nextSession.get(c.id)
                  const label = nextLabel(next)
                  const people = faces(c)
                  const done = c.modules.flatMap((m) => m.lessons).filter((l) => l.completed).length
                  return (
                    <motion.li
                      key={c.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={spring.soft}
                      className="min-w-0"
                    >
                    <div className="group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--elev-xs)] transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-border-strong/60 hover:shadow-[var(--elev-md)]">
                      <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => navigate(`/teacher/courses/${c.id}`)} className="block">
                        <CourseCover title={c.name} category={courseArt(c.id)} image={c.thumbnail} className="aspect-[16/7]">
                          <span className="absolute left-4 top-4 z-10 rounded-full border border-white/15 bg-ink-950/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
                            {c.code}
                          </span>
                          {label && (
                            <span className="absolute bottom-3 left-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-950/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                              {next?.status === "Live Now" ? (
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="absolute inset-0 animate-[q-pulse-ring_1.4s_ease-out_infinite] rounded-full bg-white" />
                                  <span className="relative h-1.5 w-1.5 rounded-full bg-white" />
                                </span>
                              ) : (
                                <CalendarPlus className="h-3 w-3" aria-hidden="true" />
                              )}
                              {next?.status === "Live Now" ? label : `Next class ${label}`}
                            </span>
                          )}
                          <span className="absolute right-4 top-4 z-10 rounded-full bg-ink-900/80 p-0.5 backdrop-blur-sm">
                            <ProgressRing
                              value={c.progress}
                              size={44}
                              thickness={4}
                              tone="success"
                              label={`${c.progress}% delivered`}
                              className="[&_svg>circle:first-child]:stroke-white/20"
                            >
                              <span className="text-[11px] font-semibold tabular-nums text-white">{c.progress}%</span>
                            </ProgressRing>
                          </span>
                        </CourseCover>
                      </button>
                      <div className="flex flex-1 flex-col gap-4 p-5">
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-semibold leading-6 tracking-tight text-foreground">
                            <button type="button" onClick={() => navigate(`/teacher/courses/${c.id}`)} className="text-left transition-colors hover:text-primary-text">
                              {c.name}
                            </button>
                          </h3>
                          <p className="truncate text-caption text-muted-foreground">
                            {c.assignedClass} · {c.term}
                          </p>
                        </div>
                        <dl className="grid grid-cols-3 gap-2 rounded-md bg-surface-2/70 px-3 py-2.5">
                          {[
                            { label: "Learners", value: c.enrolledStudentsCount },
                            { label: "Modules", value: c.modules.length },
                            { label: "Lessons", value: `${done}/${c.lessonsCount}` },
                          ].map((s) => (
                            <div key={s.label} className="min-w-0">
                              <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
                              <dd className="text-sm font-semibold tabular-nums text-foreground">{s.value}</dd>
                            </div>
                          ))}
                        </dl>
                        <div className="mt-auto flex items-center justify-between gap-3">
                          <div className="flex items-center -space-x-1.5" aria-label={`${c.enrolledStudentsCount} learners`}>
                            {people.slice(0, 4).map((s) => (
                              <Avatar key={s.id} src={s.image} name={s.name} size="xs" className="rounded-full ring-2 ring-surface" />
                            ))}
                            {c.enrolledStudentsCount > 4 && (
                              <span className="relative flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-2 px-1 text-[10px] font-semibold text-muted-foreground ring-2 ring-surface">
                                +{c.enrolledStudentsCount - Math.min(4, people.length)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {actions(c)}
                            <Button size="sm" variant="secondary" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => navigate(`/teacher/courses/${c.id}`)}>
                              Open
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </motion.ul>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {visible.map((c) => {
                    const label = nextLabel(nextSession.get(c.id))
                    const live = nextSession.get(c.id)?.status === "Live Now"
                    return (
                      <motion.li key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring.soft}>
                        <div className="group flex flex-wrap items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2 sm:flex-nowrap">
                          <button type="button" onClick={() => navigate(`/teacher/courses/${c.id}`)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                            <CourseCover title={c.name} category={courseArt(c.id)} image={c.thumbnail} showTitle={false} className="aspect-[16/10] w-24 shrink-0 rounded-md" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">{c.name}</span>
                              <span className="block truncate text-caption text-muted-foreground">
                                {c.code} · {c.enrolledStudentsCount} learners · {c.modules.length} modules
                              </span>
                            </span>
                          </button>
                          <div className="hidden w-40 shrink-0 md:block">
                            <div className="mb-1 flex justify-between text-caption">
                              <span className="text-muted-foreground">Delivered</span>
                              <span className="font-medium tabular-nums text-foreground">{c.progress}%</span>
                            </div>
                            <Progress value={c.progress} size="xs" label={`${c.progress}% delivered`} />
                          </div>
                          <span className={cn("hidden w-40 shrink-0 items-center gap-1.5 text-caption lg:flex", live ? "font-medium text-danger" : "text-muted-foreground")}>
                            {live ? <Radio className="h-3.5 w-3.5" aria-hidden="true" /> : <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />}
                            {label ?? "No class scheduled"}
                          </span>
                          {actions(c)}
                        </div>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>
            </Card>
          )}
        </StaggerItem>
      </Stagger>

      <NewCourseDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ScheduleSessionDialog open={scheduleFor !== null} onOpenChange={(o) => !o && setScheduleFor(null)} defaultCourseId={scheduleFor ?? undefined} />
    </div>
  )
}
