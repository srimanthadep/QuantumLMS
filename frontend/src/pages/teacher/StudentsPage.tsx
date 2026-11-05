import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useSearchParams } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  ChevronRight,
  Download,
  GraduationCap,
  Layers,
  Search,
  Send,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  StatCard,
} from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import CourseCover from "@/components/shared/CourseCover"
import StudentDrawer from "@/components/teacher/StudentDrawer"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import type { CourseItem, StudentItem } from "@/types"
import { coverCategory, downloadTextFile } from "@/pages/student/studentUtils"
import { useTeacherData } from "./teacherStore"
import { average, courseArt, STUDENT_STATUS_TONE } from "./teacherUtils"

type StatusFilter = "all" | StudentItem["status"]

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { courses, addStudent, notify } = useTeacherData()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [course, setCourse] = useState(courses[0]?.name ?? "")
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) {
      setName("")
      setEmail("")
      setCourse(courses[0]?.name ?? "")
      setErrors({})
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const next = {
              name: name.trim().split(/\s+/).length < 2 ? "Enter the learner's first and last name." : undefined,
              email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : "Enter a valid email address.",
            }
            setErrors(next)
            if (next.name || next.email) return
            addStudent({ name: name.trim(), email: email.trim(), assignedCourse: course })
            notify(`Invite sent to ${name.trim()}`)
            onOpenChange(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>Invite a learner</DialogTitle>
            <DialogDescription>They get an email with a link to join your class.</DialogDescription>
          </DialogHeader>
          <Field label="Full name" required error={errors.name}>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aria Kapoor" />
          </Field>
          <Field label="Email" required error={errors.email}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@school.org" />
          </Field>
          <Field label="Course">
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.code} · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" leftIcon={<Send aria-hidden="true" />}>
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Modal popup displaying categorized enrolled students for a selected course. */
function CourseStudentsDialog({
  course,
  allStudents,
  open,
  onOpenChange,
  onSelectStudent,
  notify,
}: {
  course: CourseItem | null
  allStudents: StudentItem[]
  open: boolean
  onOpenChange: (o: boolean) => void
  onSelectStudent: (id: string) => void
  notify: (m: string) => void
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [query, setQuery] = useState("")

  if (!course) return null

  const enrolled = allStudents.filter(
    (s) =>
      course.enrolledStudentIds?.includes(s.id) ||
      s.assignedCourse === course.name ||
      s.assignedCourse === course.code ||
      s.courses?.some((c) => c.name === course.name || c.code === course.code),
  )

  const excelling = enrolled.filter((s) => s.status === "Excelling")
  const onTrack = enrolled.filter((s) => s.status === "On Track")
  const needsAttention = enrolled.filter((s) => s.status === "Needs Attention")

  const visible = enrolled.filter((s) => {
    const matchStatus = statusFilter === "all" || s.status === statusFilter
    const q = query.trim().toLowerCase()
    const matchQ = !q || `${s.name} ${s.rollNumber} ${s.tags.join(" ")} ${s.email || ""}`.toLowerCase().includes(q)
    return matchStatus && matchQ
  })

  const exportCourseCsv = () => {
    const rows = [
      ["Name", "Roll", "Course", "Completion", "Average", "Attendance", "Status", "Email"],
      ...visible.map((s) => [s.name, s.rollNumber, course.name, `${s.completion}%`, `${s.average}%`, `${s.attendance}%`, s.status, s.email || ""]),
    ]
    downloadTextFile(
      rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"),
      `${course.code}-students.csv`,
      "text/csv;charset=utf-8",
    )
    notify(`Exported ${visible.length} learners for ${course.code}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden border border-border bg-surface text-foreground shadow-2xl gap-0">
        {/* Header */}
        <div className="shrink-0 border-b border-border bg-surface-2 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-text border border-primary-border">
                <Users className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone="neutral" className="font-mono text-xs">{course.code}</Badge>
                  <DialogTitle className="text-lg font-bold text-foreground truncate">
                    {course.name}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {enrolled.length} enrolled learners · {course.assignedClass || course.term}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={exportCourseCsv}>
                Export CSV
              </Button>
            </div>
          </div>

          {/* Categorization Tabs */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="no-scrollbar overflow-x-auto">
              <SegmentedControl
                size="sm"
                className="[&_button]:whitespace-nowrap"
                aria-label="Filter learners by category"
                options={[
                  { value: "all" as StatusFilter, label: `All · ${enrolled.length}` },
                  { value: "Excelling" as StatusFilter, label: `Excelling · ${excelling.length}` },
                  { value: "On Track" as StatusFilter, label: `On Track · ${onTrack.length}` },
                  { value: "Needs Attention" as StatusFilter, label: `Needs Attention · ${needsAttention.length}` },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
            <Input
              size="sm"
              leading={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or roll number..."
              aria-label="Search course learners"
              wrapperClassName="sm:w-60"
            />
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {visible.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<Search aria-hidden="true" />}
              title="No learners match this category"
              description="Try changing the category filter or searching a different name."
              action={
                <Button size="sm" variant="outline" onClick={() => { setStatusFilter("all"); setQuery("") }}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-2 text-xs font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">Learner</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Completion</th>
                    <th className="px-4 py-3 text-right">Average</th>
                    <th className="px-4 py-3 text-right">Attendance</th>
                    <th className="px-4 py-3 text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={s.image} name={s.name} size="sm" status={s.lastActivity === "Just now" ? "online" : undefined} />
                          <div className="min-w-0">
                            <span className="block truncate font-semibold text-foreground">{s.name}</span>
                            <span className="block text-caption text-muted-foreground font-mono">{s.rollNumber}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={STUDENT_STATUS_TONE[s.status]}>{s.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={s.completion} size="xs" className="w-16" label={`${s.completion}% complete`} />
                          <span className="text-xs tabular-nums text-foreground font-medium">{s.completion}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                        {s.average}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn("text-xs font-medium tabular-nums", s.attendance < 80 ? "text-danger font-semibold" : "text-foreground")}>
                          {s.attendance}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2.5"
                          rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                          onClick={() => onSelectStudent(s.id)}
                        >
                          360 View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Students Page: Displays courses first; clicking any course opens a categorized learners list popup. */
export default function StudentsPage() {
  const { students, courses, notify } = useTeacherData()
  const [params, setParams] = useSearchParams()
  const [courseQuery, setCourseQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const drawerId = params.get("student")

  const openDrawer = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set("student", id)
    else next.delete("student")
    setParams(next, { replace: true })
  }

  // Course categories
  const categories = useMemo(() => {
    const cats = new Set<string>()
    for (const c of courses) {
      cats.add(coverCategory(c.name))
    }
    return ["all", ...Array.from(cats)]
  }, [courses])

  const filteredCourses = useMemo(() => {
    const q = courseQuery.trim().toLowerCase()
    return courses.filter((c) => {
      const cat = coverCategory(c.name)
      const matchCat = selectedCategory === "all" || cat.toLowerCase() === selectedCategory.toLowerCase()
      const matchQ = !q || `${c.name} ${c.code} ${c.description}`.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [courses, selectedCategory, courseQuery])

  const avg = Math.round(average(students.map((s) => s.average)))
  const att = Math.round(average(students.map((s) => s.attendance)))
  const attention = students.filter((s) => s.status === "Needs Attention").length

  const getCourseEnrolled = (c: CourseItem) => {
    return students.filter(
      (s) =>
        c.enrolledStudentIds?.includes(s.id) ||
        s.assignedCourse === c.name ||
        s.assignedCourse === c.code ||
        s.courses?.some((sc) => sc.code === c.code || sc.name === c.name),
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        title="Students by Course"
        description={`${students.length} learners enrolled across ${courses.length} courses. Select a course to open its categorized student list.`}
        actions={
          <Button leftIcon={<UserPlus aria-hidden="true" />} onClick={() => setInviteOpen(true)}>
            Invite learner
          </Button>
        }
      />

      <Stagger className="flex flex-col gap-5" stagger={0.05}>
        <StaggerItem>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard title="Total Courses" value={courses.length} trend="active cohorts" tone="primary" icon={BookOpen} />
            <StatCard title="Total Learners" value={students.length} trend={`${students.filter((s) => s.status === "Excelling").length} excelling`} tone="success" icon={Users} />
            <StatCard title="Class Average" value={`${avg}%`} trend={{ value: "3 pts this month", isPositive: true }} tone="info" icon={GraduationCap} sparkline={[74, 76, 75, 78, 80, 79, 82, avg]} />
            <StatCard
              title="Need Attention"
              value={attention}
              trend="across all courses"
              tone="warning"
              icon={AlertTriangle}
            />
          </div>
        </StaggerItem>

        {/* Filter and Search Bar */}
        <StaggerItem>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              leading={<Search aria-hidden="true" />}
              value={courseQuery}
              onChange={(e) => setCourseQuery(e.target.value)}
              placeholder="Search courses by title or code..."
              aria-label="Search courses"
              wrapperClassName="md:max-w-xs"
            />
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 md:ml-auto">
              <SegmentedControl
                className="[&_button]:whitespace-nowrap"
                aria-label="Filter by category"
                options={categories.map((cat) => ({
                  value: cat,
                  label: cat === "all" ? "All Categories" : cat,
                }))}
                value={selectedCategory}
                onChange={setSelectedCategory}
              />
            </div>
          </div>
        </StaggerItem>

        {/* Course Cards Grid */}
        <StaggerItem>
          {filteredCourses.length === 0 ? (
            <EmptyState
              icon={<Search aria-hidden="true" />}
              title="No courses match"
              description="Try a different course title or category."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setCourseQuery("")
                    setSelectedCategory("all")
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <motion.ul layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {filteredCourses.map((c) => {
                  const enrolled = getCourseEnrolled(c)
                  const courseAvg = enrolled.length ? Math.round(average(enrolled.map((s) => s.average))) : 0
                  const courseAtt = enrolled.length ? Math.round(average(enrolled.map((s) => s.attendance))) : 0
                  const excelling = enrolled.filter((s) => s.status === "Excelling").length
                  const onTrack = enrolled.filter((s) => s.status === "On Track").length
                  const needsAttn = enrolled.filter((s) => s.status === "Needs Attention").length

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
                      <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--elev-xs)] transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-border-strong/60 hover:shadow-[var(--elev-md)]">
                        {/* Course Cover */}
                        <div
                          className="cursor-pointer relative"
                          onClick={() => setSelectedCourse(c)}
                        >
                          <CourseCover
                            title={c.name}
                            category={courseArt(c.id)}
                            image={c.thumbnail}
                            showTitle={false}
                            className="aspect-[16/8]"
                          >
                            <span className="absolute left-3 top-3 z-10 rounded-full border border-white/15 bg-ink-950/70 px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider text-white backdrop-blur-sm">
                              {c.code}
                            </span>
                            <span className="absolute bottom-3 right-3 z-10 rounded-md bg-ink-950/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm flex items-center gap-1">
                              <Users className="h-3 w-3" /> {enrolled.length} learners
                            </span>
                          </CourseCover>
                        </div>

                        {/* Card Content */}
                        <div className="flex flex-1 flex-col gap-3.5 p-4 sm:p-5">
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {coverCategory(c.name)}
                              </span>
                              <span className="text-caption text-muted-foreground">
                                {c.term}
                              </span>
                            </div>
                            <h3 className="mt-1 line-clamp-1 text-base font-bold text-foreground group-hover:text-primary-text transition-colors">
                              {c.name}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {c.description}
                            </p>
                          </div>

                          {/* Quick Stats Grid */}
                          <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-2/70 p-2.5 text-xs">
                            <div>
                              <span className="text-[11px] text-muted-foreground block">Class Avg</span>
                              <span className="font-semibold tabular-nums text-foreground">{courseAvg}%</span>
                            </div>
                            <div>
                              <span className="text-[11px] text-muted-foreground block">Attendance</span>
                              <span className={cn("font-semibold tabular-nums", courseAtt < 80 ? "text-danger" : "text-foreground")}>
                                {courseAtt}%
                              </span>
                            </div>
                          </div>

                          {/* Category breakdown pills */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            {excelling > 0 && <Badge tone="success" size="sm">{excelling} Excelling</Badge>}
                            {onTrack > 0 && <Badge tone="neutral" size="sm">{onTrack} On Track</Badge>}
                            {needsAttn > 0 && <Badge tone="warning" size="sm">{needsAttn} Needs Attention</Badge>}
                          </div>

                          {/* Action Button */}
                          <div className="mt-auto pt-2">
                            <Button
                              className="w-full text-xs"
                              variant="outline"
                              leftIcon={<Users className="h-3.5 w-3.5" />}
                              onClick={() => setSelectedCourse(c)}
                            >
                              Open Students List ({enrolled.length})
                            </Button>
                          </div>
                        </div>
                      </article>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </motion.ul>
          )}
        </StaggerItem>
      </Stagger>

      {/* Pop-up dialog with categorized student list */}
      <CourseStudentsDialog
        course={selectedCourse}
        allStudents={students}
        open={!!selectedCourse}
        onOpenChange={(o) => !o && setSelectedCourse(null)}
        onSelectStudent={(id) => openDrawer(id)}
        notify={notify}
      />

      {/* 360 profile drawer */}
      <StudentDrawer studentId={drawerId} open={!!drawerId} onOpenChange={(o) => !o && openDrawer(null)} />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}
