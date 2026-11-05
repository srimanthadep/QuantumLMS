import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  BookOpen,
  Brain,
  CalendarClock,
  Download,
  FileText,
  Gauge,
  Mail,
  PieChart,
  Repeat,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  PageHeader,
  Progress,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  StatCard,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type BadgeTone,
} from "@/components/ui"
import AreaChart from "@/components/charts/AreaChart"
import BarChart from "@/components/charts/BarChart"
import DonutChart from "@/components/charts/DonutChart"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import IconTile, { type IconTone } from "@/components/teacher/IconTile"
import SendReportDialog from "@/components/teacher/SendReportDialog"
import { initialAnalyticsMetrics } from "@/data/mockData"
import { cn } from "@/lib/utils"
import { ease, transition } from "@/lib/motion"
import type { ReportItem, StudentItem } from "@/types"
import { downloadTextFile } from "@/pages/student/studentUtils"
import { useTeacherData } from "./teacherStore"
import { average, firstName } from "./teacherUtils"

type Range = "week" | "month" | "term"

const TREND: Record<Range, { labels: string[]; average: number[]; mastery: number[] }> = {
  week: { labels: ["Mon", "Tue", "Wed", "Thu"], average: [80, 82, 81, 84], mastery: [82, 83, 83.5, 84.2] },
  month: { labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"], average: [76, 78, 81, 84], mastery: [79, 81, 83, 84.2] },
  term: {
    labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"],
    average: [74, 76, 75, 78, 80, 79, 82, 84],
    mastery: [70, 72, 74, 77, 79, 81, 83, 84.2],
  },
}

const METRIC_ICON = [Target, Zap, Gauge, Brain]
const METRIC_TONE = ["primary", "success", "warning", "info"] as const
const METRIC_SPARK = [
  [70, 72, 74, 77, 79, 81, 83, 84.2],
  [1, 1.1, 1.1, 1.2, 1.3, 1.3, 1.4],
  [82, 84, 83, 85, 86, 88],
  [81, 84, 86, 88, 90, 93],
]

const REPORT_TONE: Record<ReportItem["status"], BadgeTone> = { Sent: "success", "In Progress": "info", Scheduled: "warning" }

const SUBJECT_KEY: Record<string, keyof StudentItem["subjects"]> = {
  "GenAI & LLMs": "english",
  "Deep Learning": "math",
  "MLOps & Infra": "science",
  "Agentic Systems": "art",
}

function risk(s: StudentItem): string[] {
  const out: string[] = []
  if (s.attendance < 85) out.push(`Attendance ${s.attendance}%`)
  if (s.average < 72) out.push(`Average ${s.average}%`)
  if ((s.pendingAssignments ?? 0) >= 2) out.push(`${s.pendingAssignments} assignments pending`)
  const weakest = Object.entries(s.subjects).sort((a, b) => a[1] - b[1])[0]
  if (weakest && weakest[1] < 66) out.push(`${weakest[0][0].toUpperCase()}${weakest[0].slice(1)} ${weakest[1]}%`)
  return out
}

interface ChartCardProps {
  title: string
  icon: LucideIcon
  tone?: IconTone
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

function ChartCard({ title, icon, tone, description, action, children, className }: ChartCardProps) {
  return (
    <Card className={cn("min-w-0 overflow-hidden", className)}>
      <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <IconTile icon={icon} tone={tone} />
            <CardTitle>{title}</CardTitle>
          </div>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** How the class is doing, where it's slipping, and the reports families receive. */
export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { students, courses, assignments, doubts, reports, notify } = useTeacherData()
  const [range, setRange] = useState<Range>("term")
  const [reportOpen, setReportOpen] = useState(false)
  const [reportFor, setReportFor] = useState<string | undefined>(undefined)
  const [preview, setPreview] = useState<ReportItem | null>(null)
  const [schedules, setSchedules] = useState({ weekly: true, alerts: true, term: false })

  const tab = params.get("tab") === "reports" ? "reports" : "insights"
  const courseParam = params.get("course")
  const course = courses.find((c) => c.id === courseParam)
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const cohort = useMemo(
    () => (course ? students.filter((s) => course.enrolledStudentIds.includes(s.id) || s.courses?.some((c) => c.code === course.code)) : students),
    [students, course],
  )
  const trend = TREND[range]

  const subjects = useMemo(
    () =>
      (["math", "science", "english", "art"] as const).map((k) => ({
        label: { math: "Deep Learning", science: "MLOps & Infra", english: "GenAI & LLMs", art: "Agentic Systems" }[k],
        value: Math.round(average(cohort.map((s) => s.subjects[k]))),
      })),
    [cohort],
  )
  const weakest = [...subjects].sort((a, b) => a.value - b.value)[0]

  const mix = [
    { label: "Excelling", value: cohort.filter((s) => s.status === "Excelling").length, color: "var(--success)" },
    { label: "On track", value: cohort.filter((s) => s.status === "On Track").length, color: "var(--primary)" },
    { label: "Needs attention", value: cohort.filter((s) => s.status === "Needs Attention").length, color: "var(--warning)" },
  ]

  const results = useMemo(
    () =>
      Object.values(assignments)
        .filter((a) => (!course || a.courseId === course.id) && typeof a.averageScore === "number")
        .map((a) => ({
          id: a.id,
          title: a.title.replace(/^(Module \d+ (Assignment|Assessment|Capstone)|Python Lab \d+): /, ""),
          module: a.moduleTitle,
          code: courses.find((c) => c.id === a.courseId)?.code ?? a.courseId,
          pct: Math.round(((a.averageScore ?? 0) / a.maxMarks) * 100),
          submitted: a.submissionsCount,
          total: a.totalEnrolled,
        })),
    [assignments, course, courses],
  )

  const rows = useMemo(
    () =>
      (course ? [course] : courses).map((c) => {
        const enrolled = students.filter((s) => c.enrolledStudentIds.includes(s.id))
        const graded = Object.values(assignments).filter((a) => a.courseId === c.id && typeof a.averageScore === "number")
        return {
          c,
          attendance: enrolled.length ? Math.round(average(enrolled.map((s) => s.attendance))) : null,
          score: graded.length ? Math.round(average(graded.map((a) => ((a.averageScore ?? 0) / a.maxMarks) * 100))) : null,
          doubts: doubts.filter((d) => d.courseId === c.id && d.status !== "Resolved").length,
        }
      }),
    [course, courses, students, assignments, doubts],
  )

  const atRisk = useMemo(
    () =>
      cohort
        .map((s) => ({ s, reasons: risk(s) }))
        .filter((x) => x.reasons.length > 0)
        .sort((a, b) => b.reasons.length - a.reasons.length || a.s.average - b.s.average),
    [cohort],
  )

  const sent = reports.filter((r) => r.status === "Sent")
  const readRate = Math.round(average(sent.map((r) => r.readRate)))

  const exportCsv = () => {
    const lines = [
      ["Learner", "Roll", "Course", "Completion", "Average", "Attendance", "GenAI & LLMs", "Deep Learning", "MLOps & Infra", "Agentic Systems", "Status"],
      ...cohort.map((s) => [s.name, s.rollNumber, s.assignedCourse ?? "", s.completion, s.average, s.attendance, s.subjects.math, s.subjects.science, s.subjects.english, s.subjects.art, s.status]),
    ]
    downloadTextFile(lines.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n"), `${course?.code ?? "all-courses"}-analytics.csv`, "text/csv;charset=utf-8")
    notify(`Exported analytics for ${cohort.length} learners`)
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        title="Analytics"
        description={course ? `${course.name} · ${cohort.length} learners` : `All courses · ${students.length} learners`}
        actions={
          <>
            <Button variant="outline" leftIcon={<Download aria-hidden="true" />} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button
              leftIcon={<Send aria-hidden="true" />}
              onClick={() => {
                setReportFor(undefined)
                setReportOpen(true)
              }}
            >
              Send report
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={(t) => setParam("tab", t === "insights" ? null : t)} variant="underline">
        <TabsList aria-label="Analytics sections" className="mb-1 w-full justify-start">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="reports">
            Reports <span className="tabular-nums text-muted-foreground">{reports.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <Stagger className="flex flex-col gap-5" stagger={0.05}>
            <StaggerItem>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select value={course?.id ?? "all"} onValueChange={(v) => setParam("course", v === "all" ? null : v)}>
                  <SelectTrigger className="w-full sm:w-72" aria-label="Course">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All courses</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} · {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <SegmentedControl
                  className="sm:ml-auto"
                  aria-label="Time range"
                  options={[
                    { value: "week" as Range, label: "Week" },
                    { value: "month" as Range, label: "Month" },
                    { value: "term" as Range, label: "Term" },
                  ]}
                  value={range}
                  onChange={setRange}
                />
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {initialAnalyticsMetrics.map((m, i) => (
                  <StatCard
                    key={m.label}
                    title={m.label}
                    value={m.value}
                    trend={/^\+/.test(m.trend) ? { value: m.trend.replace(/^\+/, ""), isPositive: true } : m.trend}
                    tone={METRIC_TONE[i]}
                    icon={METRIC_ICON[i]}
                    sparkline={METRIC_SPARK[i]}
                  />
                ))}
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.75fr)]">
                <ChartCard title="Performance trend" icon={TrendingUp} description="Average score against concept mastery.">
                  <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-caption text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary-text" aria-hidden="true" /> Average score
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-secondary-text" aria-hidden="true" /> Mastery
                    </span>
                    <span className="ml-auto font-medium text-success">
                      +{Math.round((trend.average.at(-1) ?? 0) - (trend.average[0] ?? 0))} pts over the {range}
                    </span>
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={range} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: transition.fast }} transition={transition.base}>
                      <AreaChart
                        labels={trend.labels}
                        series={[
                          { name: "Average score", values: trend.average, color: "var(--primary-text)" },
                          { name: "Mastery", values: trend.mastery, color: "var(--secondary-text)" },
                        ]}
                        height={300}
                        yMin={60}
                        yMax={100}
                        formatValue={(v) => `${Math.round(v)}%`}
                        label={`Average score and mastery, ${range}`}
                      />
                    </motion.div>
                  </AnimatePresence>
                  <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
                    {[
                      { label: "Average now", value: `${trend.average.at(-1) ?? 0}%`, detail: `from ${trend.average[0] ?? 0}%` },
                      { label: "Mastery now", value: `${trend.mastery.at(-1) ?? 0}%`, detail: `from ${trend.mastery[0] ?? 0}%` },
                      {
                        label: "Best gain",
                        value: `+${Math.max(0, ...trend.average.slice(1).map((v, i) => Math.round(v - trend.average[i])))} pts`,
                        detail: `in one ${range === "week" ? "day" : "week"}`,
                      },
                      { label: "Graded work", value: String(results.length), detail: "assignments" },
                    ].map((s) => (
                      <div key={s.label} className="min-w-0">
                        <dt className="truncate text-caption text-muted-foreground">{s.label}</dt>
                        <dd className="text-lg font-semibold tabular-nums text-foreground">{s.value}</dd>
                        <dd className="truncate text-[11px] text-muted-foreground">{s.detail}</dd>
                      </div>
                    ))}
                  </dl>
                </ChartCard>

                <ChartCard title="Learner mix" icon={PieChart} tone="success" description="Where each learner stands right now.">
                  <DonutChart
                    data={mix}
                    size={148}
                    thickness={18}
                    center={
                      <>
                        <span className="text-2xl font-semibold tabular-nums text-foreground">{cohort.length}</span>
                        <span className="text-[11px] text-muted-foreground">learners</span>
                      </>
                    }
                  />
                  {[
                    { label: "Top of the class", list: [...cohort].sort((a, b) => b.average - a.average).slice(0, 3) },
                    { label: "Needs attention", list: cohort.filter((s) => s.status === "Needs Attention") },
                  ].map(
                    (group) =>
                      group.list.length > 0 && (
                        <div key={group.label} className="mt-5 border-t border-border pt-4">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">{group.label}</p>
                          <ul className="flex flex-col gap-1">
                            {group.list.map((s) => (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/teacher/students?student=${s.id}`)}
                                  className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
                                >
                                  <Avatar src={s.image} name={s.name} size="xs" />
                                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{s.name}</span>
                                  <span className="text-caption tabular-nums text-muted-foreground">{s.average}%</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ),
                  )}
                </ChartCard>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ChartCard
                  title="Subject strengths"
                  icon={BarChart3}
                  tone="info"
                  description={weakest ? `${weakest.label} is the lowest at ${weakest.value}%. Worth a revision warm-up.` : undefined}
                >
                  <BarChart data={subjects.map((s) => ({ ...s, highlight: s.label === weakest?.label }))} height={250} formatValue={(v) => `${v}%`} label="Average score by subject" />
                  <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
                    {subjects.map((s) => {
                      const low = s.label === weakest?.label
                      const below = cohort.filter((x) => x.subjects[SUBJECT_KEY[s.label]] < 70).length
                      return (
                        <div key={s.label} className={cn("rounded-md px-3 py-2", low ? "bg-warning-soft" : "bg-surface-2/60")}>
                          <dt className="text-caption text-muted-foreground">{s.label}</dt>
                          <dd className={cn("text-lg font-semibold tabular-nums", low ? "text-warning" : "text-foreground")}>{s.value}%</dd>
                          <dd className="text-[11px] text-muted-foreground">{below ? `${below} below 70%` : "everyone 70%+"}</dd>
                        </div>
                      )
                    })}
                  </dl>
                </ChartCard>

                <ChartCard title="Assignment results" icon={FileText} tone="warning" description="Average score on each graded assignment.">
                  {results.length === 0 ? (
                    <EmptyState size="sm" icon={<FileText aria-hidden="true" />} title="No graded work yet" />
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {results.map((r, i) => (
                        <li key={r.id}>
                          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate text-foreground">
                              <span className="text-caption text-muted-foreground">{r.code} · </span>
                              {r.title}
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums text-foreground">{r.pct}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-border">
                            <motion.div
                              className={cn("h-full w-full origin-left rounded-full", r.pct >= 90 ? "bg-success" : r.pct >= 75 ? "bg-primary" : "bg-warning")}
                              initial={{ scaleX: 0 }}
                              whileInView={{ scaleX: r.pct / 100 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.7, ease: ease.out, delay: i * 0.05 }}
                            />
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {r.submitted}/{r.total} submitted
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </ChartCard>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.75fr)]">
                <ChartCard title="Course comparison" icon={BookOpen}>
                  <DataTable
                    caption="Course comparison"
                    data={rows}
                    rowKey={(r) => r.c.id}
                    onRowClick={(r) => navigate(`/teacher/courses/${r.c.id}`)}
                    columns={[
                      {
                        id: "course",
                        header: "Course",
                        sortValue: (r) => r.c.name,
                        cell: (r) => (
                          <span className="block min-w-0">
                            <span className="block truncate font-medium text-foreground">{r.c.name}</span>
                            <span className="block text-caption text-muted-foreground">
                              {r.c.code} · {r.c.enrolledStudentsCount} learners
                            </span>
                          </span>
                        ),
                      },
                      {
                        id: "delivered",
                        header: "Delivered",
                        sortValue: (r) => r.c.progress,
                        cell: (r) => (
                          <span className="flex items-center gap-2">
                            <Progress value={r.c.progress} size="xs" className="w-16" label={`${r.c.progress}% delivered`} />
                            <span className="tabular-nums">{r.c.progress}%</span>
                          </span>
                        ),
                      },
                      { id: "score", header: "Score", align: "right", sortValue: (r) => r.score ?? -1, cell: (r) => <span className="tabular-nums">{r.score === null ? "–" : `${r.score}%`}</span> },
                      { id: "attendance", header: "Attendance", align: "right", hideOnMobile: true, sortValue: (r) => r.attendance ?? -1, cell: (r) => <span className="tabular-nums">{r.attendance === null ? "–" : `${r.attendance}%`}</span> },
                      {
                        id: "doubts",
                        header: "Open doubts",
                        align: "right",
                        hideOnMobile: true,
                        sortValue: (r) => r.doubts,
                        cell: (r) => (r.doubts ? <Badge tone="warning">{r.doubts}</Badge> : <span className="text-muted-foreground">0</span>),
                      },
                    ]}
                    mobileCard={(r) => (
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.c.name}</p>
                        <p className="text-caption text-muted-foreground">
                          {r.c.code} · {r.c.progress}% delivered · score {r.score === null ? "–" : `${r.score}%`}
                        </p>
                      </div>
                    )}
                  />
                </ChartCard>

                <ChartCard title="At-risk learners" icon={AlertTriangle} tone="danger" action={<Badge tone="danger">{atRisk.length}</Badge>}>
                  {atRisk.length === 0 ? (
                    <EmptyState size="sm" icon={<Sparkles aria-hidden="true" />} title="Nobody at risk" description="Everyone is above target." />
                  ) : (
                    <ul className="-mx-2 flex flex-col">
                      {atRisk.slice(0, 5).map(({ s, reasons }) => (
                        <li key={s.id} className="flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-2">
                          <Avatar src={s.image} name={s.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <button type="button" onClick={() => navigate(`/teacher/students?student=${s.id}`)} className="truncate text-left text-sm font-medium text-foreground hover:text-primary-text">
                              {s.name}
                            </button>
                            <p className="text-caption leading-5 text-muted-foreground">{reasons.join(" · ")}</p>
                          </div>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Send ${firstName(s.name)} a nudge`}
                            onClick={() => {
                              notify(`Nudge sent to ${firstName(s.name)}`)
                            }}
                          >
                            <BellRing aria-hidden="true" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </ChartCard>
              </div>
            </StaggerItem>
          </Stagger>
        </TabsContent>

        <TabsContent value="reports">
          <Stagger className="flex flex-col gap-5" stagger={0.05}>
            <StaggerItem>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard title="Reports sent" value={sent.length} trend="this term" tone="success" icon={Mail} />
                <StatCard title="Read by families" value={`${readRate}%`} trend={{ value: "4% vs last term", isPositive: true }} tone="primary" icon={TrendingUp} sparkline={[88, 90, 91, 92, 96, readRate]} />
                <StatCard title="Scheduled" value={reports.filter((r) => r.status === "Scheduled").length} trend="next: Mon 8:00 AM" tone="warning" icon={CalendarClock} />
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.75fr)]">
                <Card className="overflow-hidden">
                  <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
                    <div className="flex items-center gap-2.5">
                      <IconTile icon={FileText} />
                      <CardTitle>Report archive</CardTitle>
                    </div>
                  </CardHeader>
                  <ul className="divide-y divide-border border-t border-border">
                    <AnimatePresence initial={false}>
                      {reports.map((r) => (
                        <motion.li key={r.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={transition.base}>
                          <button type="button" onClick={() => setPreview(r)} className="flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-2 sm:flex-nowrap">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">{r.title}</span>
                              <span className="block truncate text-caption text-muted-foreground">
                                {r.type} · {r.recipients} · {r.date}
                              </span>
                            </span>
                            <span className="flex w-36 shrink-0 items-center gap-2">
                              <Progress value={r.readRate} size="xs" tone="success" label={`${r.readRate}% read`} />
                              <span className="w-9 text-right text-caption tabular-nums text-muted-foreground">{r.readRate}%</span>
                            </span>
                            <Badge tone={REPORT_TONE[r.status]}>{r.status}</Badge>
                          </button>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2.5">
                      <IconTile icon={Repeat} tone="info" />
                      <CardTitle>Automatic reports</CardTitle>
                    </div>
                    <p className="text-caption text-muted-foreground">Changes apply straight away.</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="flex flex-col gap-4">
                      {(
                        [
                          { key: "weekly", title: "Weekly digest", detail: "Mondays at 8:00 AM to every family" },
                          { key: "alerts", title: "Attendance alerts", detail: "When a learner misses two classes in a row" },
                          { key: "term", title: "Term summary", detail: "Last Friday of term, with grades and notes" },
                        ] as const
                      ).map((s) => (
                        <li key={s.key} className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <label htmlFor={`schedule-${s.key}`} className="cursor-pointer text-sm font-medium text-foreground">
                              {s.title}
                            </label>
                            <p className="text-caption text-muted-foreground">{s.detail}</p>
                          </div>
                          <Switch
                            id={`schedule-${s.key}`}
                            checked={schedules[s.key]}
                            onCheckedChange={(v) => {
                              setSchedules((cur) => ({ ...cur, [s.key]: v }))
                              notify(`${s.title} ${v ? "turned on" : "turned off"}`)
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </StaggerItem>
          </Stagger>
        </TabsContent>
      </Tabs>

      <Sheet open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <SheetContent side="right" className="max-w-lg">
          {preview && (
            <>
              <SheetHeader>
                <p className="text-caption font-medium uppercase tracking-wider text-primary-text">{preview.type}</p>
                <SheetTitle>{preview.title}</SheetTitle>
                <SheetDescription>
                  {preview.recipients} · {preview.date}
                </SheetDescription>
              </SheetHeader>
              <div className="flex items-center gap-2">
                <Badge tone={REPORT_TONE[preview.status]} dot>
                  {preview.status}
                </Badge>
                <span className="text-caption text-muted-foreground">{preview.meta}</span>
              </div>
              {preview.summary ? (
                <>
                  <dl className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Average score", value: `${preview.summary.avgScore}%` },
                      { label: "Attendance", value: `${preview.summary.attendance}%` },
                      { label: "Opened", value: preview.summary.readCount },
                      { label: "Highlight", value: preview.summary.topGain },
                    ].map((m) => (
                      <div key={m.label} className="rounded-md border border-border bg-surface-2/60 p-3">
                        <dt className="text-[11px] text-muted-foreground">{m.label}</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-foreground">{m.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-sm leading-6 text-foreground">{preview.summary.notes}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">This report has no summary.</p>
              )}
              <div className="mt-auto flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  leftIcon={<Download aria-hidden="true" />}
                  onClick={() =>
                    downloadTextFile(
                      [preview.title, `${preview.type} · ${preview.date}`, `To: ${preview.recipients}`, "", preview.summary ? `Average score ${preview.summary.avgScore}% · Attendance ${preview.summary.attendance}%` : "", preview.summary?.notes ?? ""].join("\n"),
                      `${preview.id}-report.txt`,
                    )
                  }
                >
                  Download
                </Button>
                <Button leftIcon={<Send aria-hidden="true" />} onClick={() => notify(`“${preview.title}” sent again`)}>
                  Resend
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <SendReportDialog open={reportOpen} onOpenChange={setReportOpen} studentId={reportFor} />
    </div>
  )
}
