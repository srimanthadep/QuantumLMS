import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Award, BookOpen, Download, Eye, GraduationCap, Medal, Percent, ScrollText, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import { useSession } from "@/app/session"
import {
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
  Skeleton,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type DataTableColumn,
} from "@/components/ui"
import AreaChart from "@/components/charts/AreaChart"
import BarChart from "@/components/charts/BarChart"
import DonutChart from "@/components/charts/DonutChart"
import AnimatedNumber from "@/components/motion/AnimatedNumber"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import CertificateDialog from "@/components/student/CertificateDialog"
import CopyButton from "@/components/student/CopyButton"
import type { CertificateItem, GradeItem, StudentNavPage } from "./studentTypes"
import { createStandardPdfBlob, triggerFileDownload } from "./materialUtils"
import { useStudentData, useStudentResource } from "./data/StudentDataProvider"
import { gpaOf, loadGrades, toCertificates, verifyUrl } from "./data/grades"

interface GradesPageProps {
  onToast: (msg: string) => void
  initialView?: "grades" | "certificates"
  onNavigate?: (page: StudentNavPage, courseId?: string) => void
}

type Term = string
const GRADE_TONE: Record<GradeItem["letterGrade"], "success" | "primary" | "info" | "neutral"> = { "A+": "success", A: "primary", "A-": "primary", "B+": "info", B: "neutral" }

export default function GradesPage({ onToast, initialView = "grades", onNavigate }: GradesPageProps) {
  const { user } = useSession()
  const { profile, view } = useStudentData()
  const res = useStudentResource("grades", loadGrades, 120_000)
  const [tab, setTab] = useState(initialView)
  const [pickedTerm, setTerm] = useState<Term | null>(null)
  const [viewing, setViewing] = useState<CertificateItem | null>(null)

  const grades = useMemo(() => res.data?.grades ?? [], [res.data])
  const terms = useMemo(() => [...new Set(grades.map((g) => g.term ?? "Current term"))], [grades])
  const term = pickedTerm ?? terms[0] ?? "All"
  const rows = useMemo(() => grades.filter((g) => term === "All" || g.term === term), [grades, term])
  const totalCredits = rows.reduce((s, g) => s + g.credits, 0)
  const average = rows.length ? Math.round((rows.reduce((s, g) => s + g.totalScore, 0) / rows.length) * 10) / 10 : 0
  const certificates = useMemo(() => toCertificates(res.data?.certificates ?? [], view.courses), [res.data, view.courses])
  const earned = certificates.filter((c) => c.status === "Earned")

  const history = res.data?.gpaHistory ?? []
  const cumulative = history.length ? history[history.length - 1].gpa : Number.parseFloat(profile.gpa) || null
  const firstGpa = history[0]
  const termGpa = gpaOf(term === "All" ? grades.filter((g) => g.term === terms[0]) : rows)
  const honors = cumulative !== null && cumulative >= 3.5
  const gpaMin = history.length ? Math.max(0, Math.floor((Math.min(...history.map((h) => h.gpa)) - 0.2) * 10) / 10) : 0

  const downloadTranscript = () => {
    const blob = createStandardPdfBlob("Academic Transcript", [
      { heading: "Student", lines: [user.name, profile.program, `Roll ${profile.roll_number} · ${profile.batch}`] },
      ...terms.map((t) => ({
        heading: t,
        lines: grades.filter((g) => g.term === t).map((g) => `${g.courseCode}  ${g.courseTitle}  ·  ${g.credits} cr  ·  ${g.totalScore}%  ·  ${g.letterGrade}  ·  ${g.status}`),
      })),
      {
        heading: "Summary",
        lines: [
          `Cumulative GPA ${cumulative !== null ? cumulative.toFixed(2) : "not yet available"}`,
          `Credits completed ${profile.credits_completed} of ${profile.total_credits}`,
          `Standing: ${honors ? "Dean's Honor List" : "Good standing"}`,
          `Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        ],
      },
    ])
    triggerFileDownload(blob, `Quantum_Transcript_${profile.roll_number}.pdf`)
    onToast("Transcript downloaded")
  }

  if (res.error && !res.data) {
    return (
      <div className="flex flex-col">
        <PageHeader eyebrow="Academic record" title="Grades & Certificates" description="Your GPA, gradebook and verifiable credentials." />
        <EmptyState
          icon={<ScrollText aria-hidden="true" />}
          title="Your record didn't load"
          description={res.error.message}
          action={
            <Button variant="secondary" onClick={() => void res.reload()}>
              Try again
            </Button>
          }
        />
      </div>
    )
  }
  if (!res.data) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Loading grades">
        <Skeleton className="h-16 w-1/2" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  const columns: DataTableColumn<GradeItem>[] = [
    {
      id: "course",
      header: "Course",
      sortValue: (g) => g.courseTitle,
      cell: (g) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{g.courseTitle}</p>
          <p className="font-mono text-caption text-muted-foreground">{g.courseCode}</p>
        </div>
      ),
    },
    { id: "credits", header: "Credits", align: "right", sortValue: (g) => g.credits, cell: (g) => <span className="tabular-nums">{g.credits}</span> },
    { id: "midterm", header: "Midterm", align: "right", sortValue: (g) => g.midterm, cell: (g) => <span className="tabular-nums text-muted-foreground">{g.midterm}</span> },
    { id: "assignments", header: "Assignments", align: "right", sortValue: (g) => g.assignments, cell: (g) => <span className="tabular-nums text-muted-foreground">{g.assignments}</span> },
    { id: "final", header: "Final", align: "right", sortValue: (g) => g.finalExam, cell: (g) => <span className="tabular-nums text-muted-foreground">{g.finalExam}</span> },
    {
      id: "score",
      header: "Score",
      sortValue: (g) => g.totalScore,
      width: "150px",
      cell: (g) => (
        <div className="flex items-center gap-2">
          <Progress value={g.totalScore} size="xs" className="w-16" tone={g.totalScore >= 95 ? "success" : "primary"} label={`${g.courseTitle} score`} />
          <span className="font-semibold tabular-nums">{g.totalScore}%</span>
        </div>
      ),
    },
    { id: "grade", header: "Grade", align: "center", sortValue: (g) => g.totalScore, cell: (g) => <Badge tone={GRADE_TONE[g.letterGrade]}>{g.letterGrade}</Badge> },
    {
      id: "status",
      header: "Status",
      cell: (g) => <Badge tone={g.status === "In Progress" ? "info" : "success"}>{g.status === "Passed with Honors" ? "Honors" : g.status}</Badge>,
    },
  ]

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Academic record"
        title="Grades & Certificates"
        description="Your GPA, gradebook and verifiable credentials."
        actions={
          <Button variant="outline" leftIcon={<Download aria-hidden="true" />} onClick={downloadTranscript} disabled={!grades.length}>
            Download transcript
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList aria-label="Record sections">
          <TabsTrigger value="grades">
            <ScrollText className="h-4 w-4" aria-hidden="true" />
            Grades
          </TabsTrigger>
          <TabsTrigger value="certificates">
            <Award className="h-4 w-4" aria-hidden="true" />
            Certificates <span className="tabular-nums text-subtle-foreground">{certificates.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-5">
          <Stagger className="flex flex-col gap-5" stagger={0.06}>
            <StaggerItem>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <Card className="overflow-hidden">
                  <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-caption font-medium text-muted-foreground">Cumulative GPA</p>
                      <p className="mt-1 flex items-baseline gap-1.5">
                        {cumulative !== null ? (
                          <AnimatedNumber value={cumulative} decimals={2} className="text-[44px] font-semibold leading-none tracking-tight text-foreground" />
                        ) : (
                          <span className="text-[44px] font-semibold leading-none tracking-tight text-foreground">–</span>
                        )}
                        <span className="text-lg text-muted-foreground">/ 4.0</span>
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {honors && (
                          <Badge tone="primary">
                            <Medal className="h-3 w-3" aria-hidden="true" /> Dean's Honor List
                          </Badge>
                        )}
                        {history.length > 1 && firstGpa && cumulative !== null && (
                          <Badge tone={cumulative >= firstGpa.gpa ? "success" : "warning"}>
                            <TrendingUp className="h-3 w-3" aria-hidden="true" /> {cumulative >= firstGpa.gpa ? "+" : ""}
                            {(cumulative - firstGpa.gpa).toFixed(2)} since {firstGpa.term}
                          </Badge>
                        )}
                        {cumulative === null && <Badge tone="neutral">Your GPA appears after your first graded term</Badge>}
                      </div>
                    </div>
                    <p className="text-caption text-muted-foreground">{profile.batch}</p>
                  </div>
                  <div className="px-5 pb-4">
                    {history.length > 1 ? (
                      <AreaChart
                        labels={history.map((h) => h.term)}
                        series={[{ name: "GPA", values: history.map((h) => h.gpa) }]}
                        height={150}
                        yMin={gpaMin}
                        yMax={4}
                        formatValue={(v) => v.toFixed(2)}
                        label={`GPA by term, from ${history[0].gpa.toFixed(2)} to ${history[history.length - 1].gpa.toFixed(2)}`}
                      />
                    ) : (
                      <p className="flex h-[150px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                        Your GPA trend builds up term by term.
                      </p>
                    )}
                  </div>
                </Card>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <StatCard
                    title="Term GPA"
                    value={termGpa !== null ? termGpa.toFixed(2) : "–"}
                    trend={termGpa !== null ? `${term === "All" ? terms[0] : term} · credit-weighted` : "No graded courses"}
                    tone="primary"
                    icon={GraduationCap}
                  />
                  <StatCard title="Average score" value={rows.length ? `${average}%` : "–"} trend={`${term === "All" ? "All terms" : term}`} tone="success" icon={Percent} />
                  <Card className="p-4 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-muted-foreground">Degree credits</span>
                      <BookOpen className="h-4 w-4 text-info" aria-hidden="true" />
                    </div>
                    <p className="mt-2 text-[26px] font-semibold leading-8 tracking-tight text-foreground">
                      <AnimatedNumber value={profile.credits_completed} />
                      <span className="text-base font-normal text-muted-foreground"> / {profile.total_credits}</span>
                    </p>
                    <Progress
                      value={profile.total_credits ? (profile.credits_completed / profile.total_credits) * 100 : 0}
                      tone="info"
                      size="sm"
                      className="mt-3"
                      label="Degree credits completed"
                    />
                    <p className="mt-2 text-caption text-muted-foreground">{Math.max(0, profile.total_credits - profile.credits_completed)} credits to graduate</p>
                  </Card>
                </div>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="flex flex-col gap-4">
                <Card className="min-w-0">
                  <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Gradebook</CardTitle>
                      <p className="text-caption text-muted-foreground">
                        {rows.length} courses · {totalCredits} credits
                      </p>
                    </div>
                    {terms.length > 0 && (
                      <SegmentedControl
                        size="sm"
                        aria-label="Term"
                        options={[...terms, "All"].map((t) => ({ value: t as Term, label: t }))}
                        value={term}
                        onChange={setTerm}
                      />
                    )}
                  </CardHeader>
                  <CardContent>
                    {rows.length === 0 && (
                      <EmptyState size="sm" icon={<ScrollText aria-hidden="true" />} title="No grades yet" description="Grades appear here once your instructors publish them." />
                    )}
                    {rows.length > 0 && <DataTable
                      key={term}
                      columns={columns}
                      data={rows}
                      rowKey={(g) => g.id}
                      caption="Gradebook"
                      initialSort={{ id: "score", dir: "desc" }}
                      mobileCard={(g) => (
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{g.courseTitle}</p>
                            <p className="text-caption text-muted-foreground">
                              <span className="font-mono">{g.courseCode}</span> · {g.credits} cr · Mid {g.midterm} · Final {g.finalExam}
                            </p>
                            <Progress value={g.totalScore} size="xs" className="mt-2" label={`${g.courseTitle} score`} />
                          </div>
                          <div className="text-right">
                            <Badge tone={GRADE_TONE[g.letterGrade]}>{g.letterGrade}</Badge>
                            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{g.totalScore}%</p>
                          </div>
                        </div>
                      )}
                    />}
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Score by course</CardTitle>
                      <p className="text-caption text-muted-foreground">Top score highlighted · hover a bar for the value</p>
                    </CardHeader>
                    <CardContent>
                      {rows.length ? (
                        <BarChart
                          key={term}
                          height={180}
                          colorScheme="score"
                          data={rows.map((g) => ({ label: g.courseCode, value: g.totalScore, highlight: g.totalScore === Math.max(...rows.map((r) => r.totalScore)) }))}
                          formatValue={(v) => `${v}%`}
                          label="Total score per course"
                        />
                      ) : (
                        <p className="py-10 text-center text-sm text-muted-foreground">Nothing graded yet.</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Grade distribution</CardTitle>
                      <p className="text-caption text-muted-foreground">{term === "All" ? "All terms" : term}</p>
                    </CardHeader>
                    <CardContent>
                      <DonutChart
                        key={term}
                        size={132}
                        thickness={14}
                        data={(["A+", "A", "A-", "B+", "B"] as const)
                          .map((l, i) => ({
                            label: l,
                            value: rows.filter((g) => g.letterGrade === l).length,
                            color: ["var(--success)", "var(--primary)", "var(--secondary)", "var(--info)", "var(--warning)"][i],
                          }))
                          .filter((d) => d.value > 0)}
                        center={
                          <>
                            <span className="text-xl font-semibold tabular-nums text-foreground">{rows.length}</span>
                            <span className="text-[10px] uppercase tracking-wider text-subtle-foreground">courses</span>
                          </>
                        }
                        formatValue={(v) => `${v} course${v === 1 ? "" : "s"}`}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </StaggerItem>
          </Stagger>
        </TabsContent>

        <TabsContent value="certificates" className="mt-5">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge tone="success">{earned.length} earned</Badge>
            <Badge tone="neutral">{certificates.length - earned.length} in progress</Badge>
          </div>
          {certificates.length === 0 && (
            <EmptyState icon={<Award aria-hidden="true" />} title="No certificates yet" description="Enroll in a course to start working toward its certificate." action={<Button onClick={() => onNavigate?.("My Courses")}>Browse courses</Button>} />
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {certificates.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...transition.base, delay: i * 0.06 }}>
                <CertificateCard
                  cert={c}
                  onView={() => setViewing(c)}
                  onContinue={() => (c.courseId ? onNavigate?.("Course Details", c.courseId) : onNavigate?.("My Courses"))}
                  onCopied={() => onToast("Verification link copied")}
                />
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <CertificateDialog certificate={viewing} recipient={user.name} onClose={() => setViewing(null)} onToast={onToast} />
    </div>
  )
}

function CertificateCard({ cert, onView, onContinue, onCopied }: { cert: CertificateItem; onView: () => void; onContinue: () => void; onCopied: () => void }) {
  const earned = cert.status === "Earned"
  return (
    <Card className={cn("group flex h-full flex-col overflow-hidden transition-[border-color,box-shadow,translate] duration-200", earned && "hover:-translate-y-0.5 hover:border-border-strong/60 hover:shadow-[var(--elev-md)]")}>
      {earned ? (
        <button type="button" onClick={onView} aria-label={`View certificate: ${cert.title}`} className="block text-left">
          <div className="p-px" style={{ backgroundImage: "var(--gradient-primary)" }}>
            <div className="relative flex items-center gap-4 overflow-hidden bg-ink-950 px-5 py-5">
              <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-primary/30 blur-3xl transition-transform duration-500 group-hover:scale-125" />
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-105">
                <Award className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="relative min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">Certificate of completion</p>
                <p className="truncate text-[15px] font-semibold text-white">{cert.title}</p>
                <p className="truncate font-mono text-caption text-white/80">{cert.credentialId}</p>
              </div>
            </div>
          </div>
        </button>
      ) : (
        <div className="flex items-center gap-4 border-b border-border bg-surface-2 px-5 py-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-muted-foreground">
            <Award className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle-foreground">In progress</p>
            <p className="truncate text-[15px] font-semibold text-foreground">{cert.title}</p>
            <Progress value={cert.progress ?? 0} size="xs" className="mt-2" label={`${cert.title} progress`} />
          </div>
          <span className="text-sm font-semibold tabular-nums text-foreground">{cert.progress}%</span>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
          <span>{cert.course}</span>
          <span>{earned ? `Issued ${cert.issueDate}` : cert.issueDate}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cert.skills.map((s) => (
            <Badge key={s} tone="neutral">
              {s}
            </Badge>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-caption text-muted-foreground">{cert.grade}</p>
          {earned ? (
            <div className="flex items-center gap-1">
              <CopyButton text={verifyUrl(cert.credentialId)} onCopied={onCopied} size="icon-sm" />
              <Button variant="secondary" size="sm" leftIcon={<Eye aria-hidden="true" />} onClick={onView}>
                View
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={onContinue}>
              Continue course
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
