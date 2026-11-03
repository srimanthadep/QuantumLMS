import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle,
  Users,
  Award,
} from "lucide-react"
import AreaChart from "@/components/charts/AreaChart"
import BarChart from "@/components/charts/BarChart"
import type { useAdminStore } from "@/data/adminStore"

interface ReportsViewProps {
  store: ReturnType<typeof useAdminStore>
  onToast: (msg: string) => void
}

export default function ReportsView({ store, onToast }: ReportsViewProps) {
  const { courses, orders, students } = store
  const [reportRange, setReportRange] = useState("Last 6 Months")

  // Chart data
  const revenueTrend = [
    { label: "Jun 26", value: 12.4 },
    { label: "Jul 26", value: 14.8 },
    { label: "Aug 26", value: 13.9 },
    { label: "Sep 26", value: 16.5 },
    { label: "Oct 26", value: 18.2 },
    { label: "Nov 26", value: 24.3 },
  ]

  const courseCompletionData = courses.map((c) => ({
    label: c.title.split(" ")[0] + " " + (c.title.split(" ")[1] || ""),
    value: c.completionRate,
  }))

  const handleExportCsv = () => {
    // Generate CSV content
    const headers = ["Order Number,Learner Name,Email,Course,Amount,Payment Method,Date,Status\n"]
    const rows = orders.map(
      (o) =>
        `"${o.orderNumber}","${o.studentName}","${o.studentEmail}","${o.courseTitle}",${o.amount},"${o.method}","${o.date}","${o.status}"`
    )
    const csvContent = headers.concat(rows).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `quantumlms-operations-report-${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    onToast("Operations data exported successfully as CSV")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Long-term revenue trends, course completion metrics, learner retention, and CSV exports
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            className="h-9 rounded-md border border-border bg-surface px-3 text-xs text-foreground focus:outline-none"
            value={reportRange}
            onChange={(e) => setReportRange(e.target.value)}
          >
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 6 Months">Last 6 Months</option>
            <option value="Year to Date">Year to Date (2026)</option>
          </select>

          <Button onClick={handleExportCsv} className="gap-1.5">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Trajectory */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Tuition Revenue Growth</h2>
              <p className="text-xs text-muted-foreground">Monthly gross receipts in Lakhs (₹)</p>
            </div>
            <Badge variant="outline" className="text-success font-semibold">
              +18.4% MoM
            </Badge>
          </div>

          <div className="h-64 w-full pt-2">
            <AreaChart
              labels={revenueTrend.map((r) => r.label)}
              series={[{ name: "Revenue Trend", values: revenueTrend.map((r) => r.value) }]}
              formatValue={(v) => `₹${v}L`}
              height={240}
            />
          </div>
        </div>

        {/* Completion Rates by Course */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Course Completion Rates</h2>
              <p className="text-xs text-muted-foreground">Percentage of students finishing all modules</p>
            </div>
            <Badge variant="outline" className="text-primary-text font-semibold">
              Avg: 84.6%
            </Badge>
          </div>

          <div className="h-64 w-full pt-2">
            <BarChart
              data={courseCompletionData}
              formatValue={(v) => `${v}%`}
              height={240}
            />
          </div>
        </div>
      </div>

      {/* Insights Row */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-foreground">Key Operational Insights</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-xs">
          <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Users className="h-4 w-4 text-primary-text" />
              High Cohort Stickiness
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Live studio attendance averages 94% across all 4 cohorts, with Friday night sessions seeing peak engagement.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <TrendingUp className="h-4 w-4 text-success" />
              Enterprise Upsell Surge
            </div>
            <p className="text-muted-foreground leading-relaxed">
              3 corporate partners added 140 seats to GenAI Engineering, expanding average deal size by 32%.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Award className="h-4 w-4 text-warning" />
              Certificate Pass Rate
            </div>
            <p className="text-muted-foreground leading-relaxed">
              91% of learners who submit final rubric capstones achieve passing score on first evaluation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
