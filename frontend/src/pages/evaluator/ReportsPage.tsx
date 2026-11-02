import { useMemo, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { CheckCircle2, Clock, Download, FileBarChart2, RotateCcw, Send, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { ease } from "@/lib/motion"
import { Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, StatCard } from "@/components/ui"
import { useToast } from "@/components/ui/toast"
import AreaChart from "@/components/charts/AreaChart"
import BarChart from "@/components/charts/BarChart"
import AnimatedNumber from "@/components/motion/AnimatedNumber"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import { useEvaluatorResource } from "./data/EvaluatorDataProvider"
import { loadReports } from "./data/api"
import { pctTone, shortTitle } from "./data/derive"
import type { AssessmentReport, Reports } from "./data/types"

const BINS = ["0–9", "10–19", "20–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80–89", "90–100"]
const GRADE_ORDER = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"]

function hours(h: number | null) {
  if (h === null) return "–"
  return h >= 48 ? `${(h / 24).toFixed(1)} days` : `${Math.round(h)} h`
}

export default function ReportsPage() {
  const reports = useEvaluatorResource("reports", loadReports, 60_000)
  const toast = useToast()
  const [chosen, setChosen] = useState<string | null>(null)

  if (!reports.data) {
    if (reports.error) {
      return (
        <EmptyState
          icon={<FileBarChart2 aria-hidden="true" />}
          title="Reports didn't load"
          description={reports.error.message}
          action={
            <Button size="sm" variant="outline" onClick={() => void reports.reload()}>
              Try again
            </Button>
          }
        />
      )
    }
    return (
      <div className="space-y-5" role="status" aria-label="Loading reports">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  const r = reports.data
  const current = r.assessments.find((a) => a.id === chosen) ?? r.assessments.find((a) => a.finished > 0) ?? r.assessments[0]
  const download = () => {
    const blob = new Blob([toCsv(r)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `marking-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Report downloaded")
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Evaluation desk"
        title="Reports"
        description="How marking is going on the assessments you mark, and where students lose marks."
        actions={
          <Button variant="secondary" leftIcon={<Download aria-hidden="true" />} onClick={download}>
            Export CSV
          </Button>
        }
      />
      <Stagger className="flex flex-col gap-5" stagger={0.06}>
        <StaggerItem>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Finished, 30 days" value={String(r.me.finished_30d)} trend={`${r.me.finished_total} in total`} tone="primary" icon={CheckCircle2} sparkline={r.me.by_day.slice(-14).map((d) => d.count)} />
            <StatCard title="Average turnaround" value={hours(r.me.avg_turnaround_hours)} trend="Submission to finished evaluation" tone="info" icon={Clock} />
            <StatCard title="Released, 30 days" value={String(r.me.released_30d)} trend="Results students can see" tone="success" icon={Send} />
            <StatCard title="Re-evaluations" value={String(r.reevaluations.total)} trend={`${r.reevaluations.revised} revised · ${r.reevaluations.upheld} upheld · ${r.reevaluations.open} open`} tone="warning" icon={RotateCcw} />
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Your pace</CardTitle>
                <p className="text-caption text-muted-foreground">Evaluations you finished per day, last 30 days</p>
              </CardHeader>
              <CardContent>
                <AreaChart
                  labels={r.me.by_day.map((d) => new Date(`${d.day}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }))}
                  series={[{ name: "Finished", values: r.me.by_day.map((d) => d.count) }]}
                  height={210}
                  label="Evaluations finished per day"
                  formatValue={(v) => String(Math.round(v))}
                  tickEvery={7}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Team</CardTitle>
                <p className="text-caption text-muted-foreground">Finished evaluations on these assessments</p>
              </CardHeader>
              <CardContent className="grid gap-3">
                {r.team.length === 0 && <p className="text-sm text-muted-foreground">No finished evaluations yet.</p>}
                {r.team.map((t) => {
                  const max = Math.max(1, ...r.team.map((x) => x.finished))
                  return (
                    <div key={t.id} className="grid gap-1.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={t.name} size="xs" />
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {t.name}
                          {t.you && <span className="text-muted-foreground"> (you)</span>}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{t.finished}</span>
                      </div>
                      <Bar value={t.finished / max} tone={t.you ? "primary" : "neutral"} />
                      <p className="text-caption text-muted-foreground">Average score given {t.avg_pct ?? "–"}%</p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        <StaggerItem>
          {current ? (
            <AssessmentSection report={current} all={r.assessments} onChoose={setChosen} />
          ) : (
            <EmptyState icon={<FileBarChart2 aria-hidden="true" />} title="No assessments to report on" description="Reports fill in as you finish evaluations." />
          )}
        </StaggerItem>
      </Stagger>
    </div>
  )
}

function AssessmentSection({ report: a, all, onChoose }: { report: AssessmentReport; all: AssessmentReport[]; onChoose: (id: string) => void }) {
  const weakest = useMemo(() => [...a.criteria].filter((c) => c.avg_pct !== null).sort((x, y) => (x.avg_pct ?? 0) - (y.avg_pct ?? 0))[0], [a])
  const medianBin = a.median_pct === null ? -1 : Math.min(9, Math.floor(a.median_pct / 10))
  const grades = GRADE_ORDER.filter((g) => a.grades[g])
  const maxGrade = Math.max(1, ...grades.map((g) => a.grades[g]))
  return (
    <section aria-labelledby="by-assessment" className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="by-assessment" className="text-h3 font-semibold text-foreground">
          By assessment
        </h2>
        <Select value={a.id} onValueChange={onChoose}>
          <SelectTrigger aria-label="Assessment" className="sm:w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {all.map((x) => (
              <SelectItem key={x.id} value={x.id}>
                {x.course_code} · {shortTitle(x.title)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: ease.out }} className="grid gap-4">
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 pt-5 sm:grid-cols-5">
            <Metric label="Submissions" value={a.submissions} />
            <Metric label="Finished" value={a.finished} suffix={` / ${a.submissions}`} />
            <Metric label="Average" value={a.avg_pct} suffix="%" tone={a.avg_pct === null ? undefined : pctTone(a.avg_pct)} />
            <Metric label="Median" value={a.median_pct} suffix="%" />
            <div>
              <p className="text-caption text-muted-foreground">Range</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{a.low_pct === null ? "–" : `${a.low_pct}–${a.high_pct}%`}</p>
            </div>
          </CardContent>
        </Card>

        {a.finished === 0 ? (
          <EmptyState size="sm" icon={<FileBarChart2 aria-hidden="true" />} title="Nothing finished yet" description="The score spread and criteria averages appear once evaluations are finished." />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Score spread</CardTitle>
                  <p className="text-caption text-muted-foreground">Finished evaluations per 10-point band; the median's band is highlighted</p>
                </CardHeader>
                <CardContent>
                  <BarChart data={a.distribution.map((n, i) => ({ label: BINS[i], value: n, highlight: i === medianBin }))} height={180} label="Score distribution" formatValue={(v) => `${v} ${v === 1 ? "student" : "students"}`} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Grades</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2.5">
                  {grades.map((g) => (
                    <div key={g} className="grid grid-cols-[2.5rem_minmax(0,1fr)_2rem] items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">{g}</span>
                      <Bar value={a.grades[g] / maxGrade} tone={g.startsWith("A") ? "success" : g.startsWith("B") ? "primary" : "warning"} />
                      <span className="text-right text-sm tabular-nums text-muted-foreground">{a.grades[g]}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 pb-2">
                <div>
                  <CardTitle>Criteria</CardTitle>
                  <p className="text-caption text-muted-foreground">Average points on each rubric criterion</p>
                </div>
                {weakest && (
                  <p className="flex max-w-md items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-caption leading-5 text-foreground">
                    <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
                    Students lose the most marks on {weakest.title.toLowerCase()} ({weakest.avg_pct}% on average). Worth a word with the instructor.
                  </p>
                )}
              </CardHeader>
              <CardContent className="grid gap-4">
                {a.criteria.map((c) => (
                  <div key={c.id} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{c.title}</span>
                        {weakest?.id === c.id && (
                          <Badge tone="warning" size="sm">
                            Most marks lost
                          </Badge>
                        )}
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{c.avg_points ?? "–"}</span> / {c.max_points} · {c.avg_pct ?? "–"}%
                      </span>
                    </div>
                    <Bar value={(c.avg_pct ?? 0) / 100} tone={c.avg_pct === null ? "neutral" : pctTone(c.avg_pct) === "success" ? "success" : pctTone(c.avg_pct) === "warning" ? "warning" : "danger"} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>
    </section>
  )
}

function Metric({ label, value, suffix = "", tone }: { label: string; value: number | null; suffix?: string; tone?: "success" | "warning" | "danger" }) {
  return (
    <div>
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold tabular-nums", tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-foreground")}>
        {value === null ? "–" : <AnimatedNumber value={value} suffix={suffix} />}
      </p>
    </div>
  )
}

const BAR_TONE = { primary: "bg-primary", success: "bg-success", warning: "bg-warning", danger: "bg-danger", neutral: "bg-border-strong" } as const

/** A thin horizontal bar that fills once with scaleX when it scrolls into view (and follows later changes). */
function Bar({ value, tone }: { value: number; tone: keyof typeof BAR_TONE }) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, margin: "-20px" })
  return (
    <div ref={ref} className="h-1.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-border" aria-hidden="true">
      <motion.div
        className={cn("h-full w-full origin-left rounded-full", BAR_TONE[tone])}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: seen ? Math.max(0, Math.min(1, value)) : 0 }}
        transition={{ duration: 0.7, ease: ease.out }}
      />
    </div>
  )
}

const csvCell = (v: string | number | null) => {
  const s = v === null ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(r: Reports): string {
  const rows: (string | number | null)[][] = [["Assessment", "Course", "Submissions", "Finished", "Released", "Waiting", "Average %", "Median %", "Highest %", "Lowest %"]]
  for (const a of r.assessments) rows.push([a.title, a.course_code, a.submissions, a.finished, a.released, a.pending, a.avg_pct, a.median_pct, a.high_pct, a.low_pct])
  rows.push([], ["Assessment", "Criterion", "Max points", "Average points", "Average %", "Scored"])
  for (const a of r.assessments) for (const c of a.criteria) rows.push([a.title, c.title, c.max_points, c.avg_points, c.avg_pct, c.scored])
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
}
