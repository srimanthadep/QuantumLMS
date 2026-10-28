import React, { useState, useMemo } from "react"
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
} from "lucide-react"
import type { EvaluatorState } from "./data/evaluatorStorage"
import { getDashboardMetrics } from "./data/evaluatorStorage"
import { TypeBadge } from "./components/StatusBadge"

interface ReportsProps {
  state: EvaluatorState
  onToast: (msg: string) => void
}

export function Reports({ state, onToast }: ReportsProps) {
  const [reportTab, setReportTab] = useState<
    "progress" | "assessment_summary" | "marks_distribution" | "workload"
  >("progress")
  const [courseFilter, setCourseFilter] = useState<string>("All")

  const {
    totalAssigned,
    pendingEvaluations,
    completedEvaluations,
    upcomingDeadlinesCount,
  } = getDashboardMetrics(state)

  const completionPct =
    totalAssigned > 0
      ? Math.round(
          (completedEvaluations /
            Math.max(1, completedEvaluations + pendingEvaluations)) *
            100
        )
      : 0

  // Filtered assessments by course
  const filteredAssessments = useMemo(() => {
    if (courseFilter === "All") return state.assessments
    return state.assessments.filter((a) => a.course === courseFilter)
  }, [state.assessments, courseFilter])

  // Distinct courses
  const courses = useMemo(() => {
    return Array.from(new Set(state.assessments.map((a) => a.course)))
  }, [state.assessments])

  // Marks Distribution statistics
  const marksDistribution = useMemo(() => {
    const scoredSubs = state.submissions.filter(
      (s) => s.finalMarks !== undefined
    )

    if (scoredSubs.length === 0) {
      return {
        avg: 0,
        median: 0,
        highest: 0,
        lowest: 0,
        ranges: { "90-100%": 0, "80-89%": 0, "70-79%": 0, "< 70%": 0 },
      }
    }

    let sum = 0
    let highest = 0
    let lowest = 1000
    const percentages: number[] = []
    const ranges = { "90-100%": 0, "80-89%": 0, "70-79%": 0, "< 70%": 0 }

    scoredSubs.forEach((s) => {
      const marks = s.finalMarks!
      sum += marks
      if (marks > highest) highest = marks
      if (marks < lowest) lowest = marks

      const pct = Math.round((marks / s.maxMarks) * 100)
      percentages.push(pct)

      if (pct >= 90) ranges["90-100%"]++
      else if (pct >= 80) ranges["80-89%"]++
      else if (pct >= 70) ranges["70-79%"]++
      else ranges["< 70%"]++
    })

    percentages.sort((a, b) => a - b)
    const mid = Math.floor(percentages.length / 2)
    const median =
      percentages.length % 2 !== 0
        ? percentages[mid]
        : Math.round((percentages[mid - 1] + percentages[mid]) / 2)

    return {
      avg: Math.round(sum / scoredSubs.length),
      median,
      highest,
      lowest: lowest === 1000 ? 0 : lowest,
      ranges,
      totalScored: scoredSubs.length,
    }
  }, [state.submissions])

  // Workload by Assessment Type
  const workloadByType = useMemo(() => {
    const map: Record<string, { total: number; pending: number; evaluated: number }> = {}

    state.assessments.forEach((a) => {
      if (!map[a.type]) {
        map[a.type] = { total: 0, pending: 0, evaluated: 0 }
      }
      map[a.type].total += a.submissionCount
      map[a.type].pending += a.pendingCount
      map[a.type].evaluated += a.evaluatedCount
    })

    return Object.entries(map).map(([type, stats]) => ({
      type,
      ...stats,
    }))
  }, [state.assessments])

  const handleExportCSV = () => {
    let headers: string[] = []
    let rows: (string | number)[][] = []
    let filename = `Evaluator_Report_${reportTab}_${Date.now()}.csv`

    if (reportTab === "assessment_summary") {
      headers = ["Assessment Title", "Course", "Type", "Assigned", "Evaluated", "Pending", "Deadline"]
      rows = filteredAssessments.map((a) => [
        `"${a.title}"`,
        `"${a.course}"`,
        `"${a.type}"`,
        a.submissionCount,
        a.evaluatedCount,
        a.pendingCount,
        `"${a.deadline}"`,
      ])
    } else {
      headers = ["Assessment Type", "Total Submissions", "Evaluated", "Pending"]
      rows = workloadByType.map((w) => [
        `"${w.type}"`,
        w.total,
        w.evaluated,
        w.pending,
      ])
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    onToast(`Exported ${reportTab} CSV successfully!`)
  }

  return (
    <div className="evaluator-reports space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Report Sub-Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setReportTab("progress")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportTab === "progress"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Evaluation Progress
          </button>
          <button
            type="button"
            onClick={() => setReportTab("assessment_summary")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportTab === "assessment_summary"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Assessment Summary
          </button>
          <button
            type="button"
            onClick={() => setReportTab("marks_distribution")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportTab === "marks_distribution"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Marks Distribution
          </button>
          <button
            type="button"
            onClick={() => setReportTab("workload")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportTab === "workload"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Workload Analytics
          </button>
        </div>

        {/* Right side: Course Filter & CSV Export */}
        <div className="flex items-center gap-2">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 bg-zinc-50 focus:outline-none"
          >
            <option value="All">All Courses</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Evaluation Progress */}
      {reportTab === "progress" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Overall Completion Rate
              </span>
              <div className="text-3xl font-black text-purple-700 mt-2">
                {completionPct}%
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {completedEvaluations} evaluated of {completedEvaluations + pendingEvaluations} total assigned submissions
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Pending Workload
              </span>
              <div className="text-3xl font-black text-amber-700 mt-2">
                {pendingEvaluations}
              </div>
              <p className="text-xs text-zinc-500 mt-3">
                Submissions awaiting rubric criterion evaluation
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Upcoming Deadlines
              </span>
              <div className="text-3xl font-black text-rose-700 mt-2">
                {upcomingDeadlinesCount}
              </div>
              <p className="text-xs text-zinc-500 mt-3">
                Assessments with deadlines due in next 7 days
              </p>
            </div>
          </div>

          {/* Progress Breakdown per assessment */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-5">
            <h3 className="text-sm font-bold text-zinc-900 mb-4">
              Evaluation Progress by Assessment
            </h3>
            <div className="space-y-4">
              {filteredAssessments.map((asm) => {
                const pct =
                  asm.submissionCount > 0
                    ? Math.round((asm.evaluatedCount / asm.submissionCount) * 100)
                    : 0

                return (
                  <div key={asm.id} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-800">{asm.title}</span>
                      <span className="font-semibold text-zinc-500">
                        {asm.evaluatedCount} / {asm.submissionCount} Evaluated ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Assessment Summary */}
      {reportTab === "assessment_summary" && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Assessment Title</th>
                  <th className="py-3.5 px-3">Course</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3 text-center">Submissions</th>
                  <th className="py-3.5 px-3 text-center">Evaluated</th>
                  <th className="py-3.5 px-3 text-center">Pending</th>
                  <th className="py-3.5 pr-4 text-right">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                {filteredAssessments.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-50/60">
                    <td className="py-3.5 px-4 font-bold text-zinc-900">{a.title}</td>
                    <td className="py-3.5 px-3 text-zinc-600">{a.course}</td>
                    <td className="py-3.5 px-3">
                      <TypeBadge type={a.type} />
                    </td>
                    <td className="py-3.5 px-3 text-center">{a.submissionCount}</td>
                    <td className="py-3.5 px-3 text-center font-bold text-emerald-700">
                      {a.evaluatedCount}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-amber-700">
                      {a.pendingCount}
                    </td>
                    <td className="py-3.5 pr-4 text-right text-zinc-600">
                      {new Date(a.deadline).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Marks Distribution */}
      {reportTab === "marks_distribution" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Average Score</span>
              <div className="text-2xl font-black text-purple-700 mt-1">
                {marksDistribution.avg} Marks
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Median Score</span>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                {marksDistribution.median}%
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Highest Score</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {marksDistribution.highest}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Evaluations Analyzed</span>
              <div className="text-2xl font-black text-zinc-800 mt-1">
                {marksDistribution.totalScored || 0}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-5">
            <h3 className="text-sm font-bold text-zinc-900 mb-4">
              Grade Distribution Brackets
            </h3>
            <div className="space-y-3">
              {Object.entries(marksDistribution.ranges).map(([bracket, count]) => {
                const total = marksDistribution.totalScored || 1
                const pct = Math.round((count / total) * 100)

                return (
                  <div key={bracket} className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-zinc-700">{bracket}</span>
                      <span className="text-purple-700">
                        {count} students ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Workload Summary */}
      {reportTab === "workload" && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-5">
          <h3 className="text-sm font-bold text-zinc-900 mb-4">
            Pending Workload by Assessment Modality
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 font-semibold uppercase text-[10px]">
                  <th className="py-2.5">Assessment Type</th>
                  <th className="py-2.5 text-center">Total Assigned</th>
                  <th className="py-2.5 text-center">Evaluated</th>
                  <th className="py-2.5 text-center">Pending Workload</th>
                  <th className="py-2.5 text-right">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                {workloadByType.map((w) => {
                  const pct = w.total > 0 ? Math.round((w.evaluated / w.total) * 100) : 0
                  return (
                    <tr key={w.type} className="hover:bg-zinc-50">
                      <td className="py-3 font-bold text-zinc-900">
                        <TypeBadge type={w.type} />
                      </td>
                      <td className="py-3 text-center">{w.total}</td>
                      <td className="py-3 text-center font-bold text-emerald-700">
                        {w.evaluated}
                      </td>
                      <td className="py-3 text-center font-bold text-amber-700">
                        {w.pending}
                      </td>
                      <td className="py-3 text-right font-bold text-purple-700">
                        {pct}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports
