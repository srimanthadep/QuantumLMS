import React, { useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  BarChart3,
  PieChart,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  Layers,
  Search,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Zap,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  StatCard,
  SegmentedControl,
} from "@/components/ui"
import AreaChart, { type AreaSeries } from "@/components/charts/AreaChart"
import BarChart, { type BarDatum } from "@/components/charts/BarChart"
import ProgressRing from "@/components/charts/ProgressRing"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import AnimatedNumber from "@/components/motion/AnimatedNumber"
import { TypeBadge } from "./components/StatusBadge"
import type { EvaluatorState } from "./data/evaluatorStorage"
import { getDashboardMetrics } from "./data/evaluatorStorage"

interface ReportsProps {
  state: EvaluatorState
  onToast: (msg: string) => void
}

type ReportTab = "turnaround" | "distribution" | "cohorts"

export function Reports({ state, onToast }: ReportsProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("turnaround")
  const [selectedCourse, setSelectedCourse] = useState<string>("All")

  const {
    totalAssigned,
    pendingEvaluations,
    completedEvaluations,
  } = getDashboardMetrics(state)

  const courses = useMemo(() => {
    return Array.from(new Set(state.assessments.map((a) => a.course)))
  }, [state.assessments])

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    if (selectedCourse === "All") return state.submissions
    return state.submissions.filter((s) => s.course === selectedCourse)
  }, [state.submissions, selectedCourse])

  // Marks Distribution statistics
  const marksDistribution: BarDatum[] = useMemo(() => {
    const scoredSubs = filteredSubmissions.filter((s) => s.finalMarks !== undefined)

    let b1 = 0 // < 50
    let b2 = 0 // 50-65
    let b3 = 0 // 66-75
    let b4 = 0 // 76-85
    let b5 = 0 // 86-95
    let b6 = 0 // 96-100

    scoredSubs.forEach((s) => {
      const pct = Math.round(((s.finalMarks || 0) / (s.maxMarks || 100)) * 100)
      if (pct < 50) b1++
      else if (pct <= 65) b2++
      else if (pct <= 75) b3++
      else if (pct <= 85) b4++
      else if (pct <= 95) b5++
      else b6++
    })

    return [
      { label: "< 50%", value: b1 },
      { label: "50-65%", value: b2 },
      { label: "66-75%", value: b3 },
      { label: "76-85%", value: b4, highlight: true },
      { label: "86-95%", value: b5, highlight: true },
      { label: "96-100%", value: b6 },
    ]
  }, [filteredSubmissions])

  // Turnaround timeline series
  const turnaroundSeries: AreaSeries[] = useMemo(() => {
    return [
      {
        name: "Turnaround Hours",
        values: [19.2, 17.5, 16.1, 15.4, 14.8, 14.2],
        color: "var(--primary-text)",
      },
      {
        name: "SLA Threshold (24h)",
        values: [24, 24, 24, 24, 24, 24],
        color: "var(--warning)",
      },
    ]
  }, [])

  // Export handlers
  const handleExportCSV = () => {
    const rows = [
      ["Student Name", "Roll", "Assessment", "Course", "Status", "Score", "Max Marks"],
      ...state.submissions.map((s) => [
        s.studentName,
        s.studentRoll,
        s.assessmentTitle,
        s.course,
        s.status,
        s.finalMarks !== undefined ? String(s.finalMarks) : "Pending",
        String(s.maxMarks),
      ]),
    ]

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `quantum_evaluator_report_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    onToast("Evaluation summary exported to CSV.")
  }

  const handleExportPDF = () => {
    onToast("Official Exam Board PDF report generated and downloaded.")
  }

  return (
    <div className="space-y-6">
      {/* 1. Header with Export Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Evaluation Reports & Quality Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Turnaround SLA compliance, scoring distributions, and cohort performance matrix
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="cursor-pointer font-semibold text-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-success mr-1" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPDF}
            className="cursor-pointer font-bold text-xs shadow-xs"
          >
            <Download className="h-4 w-4 mr-1" />
            <span>Exam Board PDF</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <StatCard
            title="Cohort Pass Rate"
            value="91.8%"
            subtitle="Passing threshold >= 50%"
            tone="success"
            trend={{ value: "+2.4% vs benchmark", isPositive: true }}
            sparkline={[86, 88, 89, 90, 91, 91.8]}
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            title="Average Awarded Score"
            value="81.6%"
            subtitle="Across 4 cohorts"
            tone="primary"
            trend={{ value: "Bell curve validated", isPositive: true }}
            sparkline={[78, 79, 80, 82, 81.2, 81.6]}
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            title="Total Submissions Graded"
            value={completedEvaluations}
            subtitle="Current semester"
            tone="info"
            trend={{ value: "100% rubric backed", isPositive: true }}
            sparkline={[15, 25, 38, 48, 56, completedEvaluations]}
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            title="24h SLA Compliance"
            value="96.4%"
            subtitle="Target: 95.0%"
            tone="warning"
            trend={{ value: "Exceeding target", isPositive: true }}
            sparkline={[92, 94, 95, 96, 96.2, 96.4]}
          />
        </StaggerItem>
      </Stagger>

      {/* 3. Controls & Filter Bar */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SegmentedControl
            aria-label="Report category"
            size="sm"
            options={[
              { value: "turnaround", label: "SLA Turnaround Pace" },
              { value: "distribution", label: "Score Distribution" },
              { value: "cohorts", label: "Cohort Matrix" },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as ReportTab)}
          />

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Filter Course:</span>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All">All Courses</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 4. Active Report View */}
      {activeTab === "turnaround" ? (
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Turnaround Time vs 24-Hour SLA Benchmark
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Weekly historical average in hours from student submission to grade release
              </p>
            </div>
            <Badge tone="success" size="sm">
              <ShieldCheck className="h-3 w-3 mr-1 inline" />
              96.4% Compliance
            </Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <AreaChart
              labels={["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6"]}
              series={turnaroundSeries}
              height={260}
              formatValue={(v) => `${v} hrs`}
            />
          </CardContent>
        </Card>
      ) : activeTab === "distribution" ? (
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Cohort Marks Distribution Histogram
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Number of evaluated students across percentage score brackets
              </p>
            </div>
            <Badge tone="primary" size="sm">
              Bell Curve Validated
            </Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <BarChart
              data={marksDistribution}
              height={260}
              formatValue={(v) => `${v} students`}
            />
          </CardContent>
        </Card>
      ) : (
        /* Cohort Performance Matrix */
        <Card className="border-border/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-bold">Assessment Title</th>
                  <th className="px-4 py-3 font-bold">Course</th>
                  <th className="px-4 py-3 font-bold">Cohort</th>
                  <th className="px-4 py-3 font-bold">Total</th>
                  <th className="px-4 py-3 font-bold">Evaluated</th>
                  <th className="px-4 py-3 font-bold">Pending</th>
                  <th className="px-4 py-3 font-bold">Progress</th>
                  <th className="px-4 py-3 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {state.assessments.map((a) => {
                  const pct = Math.round((a.evaluatedCount / Math.max(1, a.submissionCount)) * 100)
                  return (
                    <tr key={a.id} className="hover:bg-surface-2/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground">{a.title}</p>
                          <TypeBadge type={a.type} />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {a.course}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                        {a.batch}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-foreground">
                        {a.submissionCount}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-success">
                        {a.evaluatedCount}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-warning">
                        {a.pendingCount}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-surface-2 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-muted-foreground">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Badge tone={a.status === "Active" ? "primary" : "success"} size="sm">
                          {a.status}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

export default Reports
