import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useSearchParams } from "react-router-dom"
import { AlertTriangle, CalendarCheck2, Download, GraduationCap, LayoutGrid, List, Search, Send, Sparkles, UserPlus, Users } from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  DataTable,
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
import SendReportDialog from "@/components/teacher/SendReportDialog"
import StudentDrawer from "@/components/teacher/StudentDrawer"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"
import type { StudentItem } from "@/types"
import { downloadTextFile } from "@/pages/student/studentUtils"
import { useTeacherData } from "./teacherStore"
import { average, STUDENT_STATUS_TONE } from "./teacherUtils"

type StatusFilter = "all" | StudentItem["status"]
type View = "table" | "grid"

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

/** The class roster: filter, sort and open any learner's full profile. */
export default function StudentsPage() {
  const { students, courses, notify } = useTeacherData()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [course, setCourse] = useState("all")
  const [view, setView] = useState<View>("table")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const drawerId = params.get("student")

  const openDrawer = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set("student", id)
    else next.delete("student")
    setParams(next, { replace: true })
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter(
      (s) =>
        (status === "all" || s.status === status) &&
        (course === "all" || s.assignedCourse === course || s.courses?.some((c) => c.name === course)) &&
        (!q || `${s.name} ${s.rollNumber} ${s.tags.join(" ")} ${s.assignedCourse ?? ""}`.toLowerCase().includes(q)),
    )
  }, [students, query, status, course])

  const count = (f: StatusFilter) => (f === "all" ? students.length : students.filter((s) => s.status === f).length)
  const avg = Math.round(average(students.map((s) => s.average)))
  const att = Math.round(average(students.map((s) => s.attendance)))
  const attention = count("Needs Attention")

  const exportCsv = () => {
    const rows = [
      ["Name", "Roll", "Course", "Completion", "Average", "Attendance", "Status", "Parent", "Parent email"],
      ...visible.map((s) => [s.name, s.rollNumber, s.assignedCourse ?? "", `${s.completion}%`, `${s.average}%`, `${s.attendance}%`, s.status, s.parentName, s.parentEmail]),
    ]
    downloadTextFile(rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"), "class-roster.csv", "text/csv;charset=utf-8")
    notify(`Exported ${visible.length} learners`)
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        title="Students"
        description={`${students.length} learners across ${courses.length} courses. Open anyone to see their progress, activity and family contact.`}
        actions={
          <>
            <Button variant="outline" leftIcon={<Send aria-hidden="true" />} onClick={() => setReportOpen(true)}>
              Send report
            </Button>
            <Button leftIcon={<UserPlus aria-hidden="true" />} onClick={() => setInviteOpen(true)}>
              Invite learner
            </Button>
          </>
        }
      />

      <Stagger className="flex flex-col gap-5" stagger={0.05}>
        <StaggerItem>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard title="Learners" value={students.length} trend={`${count("Excelling")} excelling`} tone="primary" icon={Users} onClick={() => setStatus("all")} />
            <StatCard title="Class average" value={`${avg}%`} trend={{ value: "3 pts this month", isPositive: true }} tone="success" icon={GraduationCap} sparkline={[74, 76, 75, 78, 80, 79, 82, avg]} />
            <StatCard title="Attendance" value={`${att}%`} trend="term to date" tone="info" icon={CalendarCheck2} sparkline={[92, 94, 93, 95, 96, 94, att]} />
            <StatCard
              title="Need attention"
              value={attention}
              trend="below target"
              tone="warning"
              icon={AlertTriangle}
              onClick={() => setStatus(status === "Needs Attention" ? "all" : "Needs Attention")}
              isActive={status === "Needs Attention"}
            />
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              leading={<Search aria-hidden="true" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, roll number or tag"
              aria-label="Search learners"
              wrapperClassName="lg:max-w-xs"
            />
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <SegmentedControl
                className="[&_button]:whitespace-nowrap"
                aria-label="Filter by status"
                options={[
                  { value: "all" as StatusFilter, label: `All ${count("all")}` },
                  { value: "Excelling" as StatusFilter, label: `Excelling ${count("Excelling")}` },
                  { value: "On Track" as StatusFilter, label: `On track ${count("On Track")}` },
                  { value: "Needs Attention" as StatusFilter, label: `Needs attention ${count("Needs Attention")}` },
                ]}
                value={status}
                onChange={setStatus}
              />
            </div>
            <div className="flex items-center gap-2 lg:ml-auto">
              <Select value={course} onValueChange={setCourse}>
                <SelectTrigger className="w-full sm:w-56" aria-label="Filter by course">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">All courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" aria-label="Export roster as CSV" onClick={exportCsv}>
                <Download aria-hidden="true" />
              </Button>
              <SegmentedControl
                aria-label="Layout"
                options={[
                  { value: "table" as View, label: <span className="sr-only">Table</span>, icon: <List className="h-4 w-4" aria-hidden="true" /> },
                  { value: "grid" as View, label: <span className="sr-only">Cards</span>, icon: <LayoutGrid className="h-4 w-4" aria-hidden="true" /> },
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
              title="No learners match"
              description="Try a different name, status or course."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("")
                    setStatus("all")
                    setCourse("all")
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : view === "table" ? (
            <DataTable
              caption="Learners"
              data={visible}
              rowKey={(s) => s.id}
              onRowClick={(s) => openDrawer(s.id)}
              isRowActive={(s) => s.id === drawerId}
              initialSort={{ id: "name", dir: "asc" }}
              columns={[
                {
                  id: "name",
                  header: "Learner",
                  sortValue: (s) => s.name,
                  cell: (s) => (
                    <span className="flex items-center gap-3">
                      <Avatar src={s.image} name={s.name} size="sm" status={s.lastActivity === "Just now" ? "online" : undefined} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{s.name}</span>
                        <span className="block text-caption text-muted-foreground">{s.rollNumber}</span>
                      </span>
                    </span>
                  ),
                },
                { id: "course", header: "Main course", hideOnMobile: true, sortValue: (s) => s.assignedCourse ?? "", cell: (s) => <span className="line-clamp-1 text-muted-foreground">{s.assignedCourse}</span> },
                {
                  id: "completion",
                  header: "Completion",
                  sortValue: (s) => s.completion,
                  cell: (s) => (
                    <span className="flex items-center gap-2">
                      <Progress value={s.completion} size="xs" className="w-20" label={`${s.completion}% complete`} />
                      <span className="tabular-nums">{s.completion}%</span>
                    </span>
                  ),
                },
                { id: "average", header: "Average", align: "right", sortValue: (s) => s.average, cell: (s) => <span className="font-medium tabular-nums">{s.average}%</span> },
                {
                  id: "attendance",
                  header: "Attendance",
                  align: "right",
                  sortValue: (s) => s.attendance,
                  cell: (s) => <span className={cn("tabular-nums", s.attendance < 80 && "font-medium text-danger")}>{s.attendance}%</span>,
                },
                { id: "status", header: "Status", sortValue: (s) => s.status, cell: (s) => <Badge tone={STUDENT_STATUS_TONE[s.status]}>{s.status}</Badge> },
                { id: "active", header: "Last active", hideOnMobile: true, cell: (s) => <span className="whitespace-nowrap text-caption text-muted-foreground">{s.lastActivity}</span> },
              ]}
              mobileCard={(s) => (
                <div className="flex items-center gap-3">
                  <Avatar src={s.image} name={s.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                      <Badge tone={STUDENT_STATUS_TONE[s.status]}>{s.status}</Badge>
                    </div>
                    <p className="truncate text-caption text-muted-foreground">
                      Avg {s.average}% · Attendance {s.attendance}% · {s.lastActivity}
                    </p>
                    <Progress value={s.completion} size="xs" className="mt-2" label={`${s.completion}% complete`} />
                  </div>
                </div>
              )}
            />
          ) : (
            <motion.ul layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <AnimatePresence initial={false}>
                {visible.map((s) => (
                  <motion.li key={s.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={spring.soft} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => openDrawer(s.id)}
                      className="group flex h-full w-full flex-col gap-4 rounded-lg border border-border bg-surface p-4 text-left shadow-[var(--elev-xs)] transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-border-strong/60 hover:shadow-[var(--elev-md)]"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={s.image} name={s.name} size="lg" status={s.lastActivity === "Just now" ? "online" : undefined} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary-text">{s.name}</p>
                          <p className="truncate text-caption text-muted-foreground">
                            {s.rollNumber} · grade {s.grade ?? "–"}
                          </p>
                        </div>
                        <ProgressRing value={s.completion} size={48} thickness={5} tone={s.status === "Needs Attention" ? "warning" : "primary"} label={`${s.completion}% complete`} />
                      </div>
                      <dl className="grid grid-cols-2 gap-2 rounded-md bg-surface-2/70 px-3 py-2">
                        <div>
                          <dt className="text-[11px] text-muted-foreground">Average</dt>
                          <dd className="text-sm font-semibold tabular-nums text-foreground">{s.average}%</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-muted-foreground">Attendance</dt>
                          <dd className={cn("text-sm font-semibold tabular-nums", s.attendance < 80 ? "text-danger" : "text-foreground")}>{s.attendance}%</dd>
                        </div>
                      </dl>
                      <div className="mt-auto flex flex-wrap items-center gap-1.5">
                        <Badge tone={STUDENT_STATUS_TONE[s.status]}>{s.status}</Badge>
                        {s.tags.slice(0, 2).map((t) => (
                          <Badge key={t} tone="neutral">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </StaggerItem>

        {attention > 0 && status !== "Needs Attention" && (
          <StaggerItem>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/25 bg-warning-soft px-4 py-3">
              <Sparkles className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-sm text-foreground">
                {attention} {attention === 1 ? "learner needs" : "learners need"} attention this week. A quick check-in with their family usually helps.
              </p>
              <Button size="sm" variant="secondary" onClick={() => setStatus("Needs Attention")}>
                Show them
              </Button>
            </div>
          </StaggerItem>
        )}
      </Stagger>

      <StudentDrawer studentId={drawerId} open={!!drawerId} onOpenChange={(o) => !o && openDrawer(null)} />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <SendReportDialog open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  )
}
