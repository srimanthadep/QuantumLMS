import React from "react"
import {
  BookOpenCheck,
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  FileText,
  Calendar,
} from "lucide-react"
import type { EvaluatorState } from "./data/evaluatorStorage"
import { getDashboardMetrics } from "./data/evaluatorStorage"
import { StatusBadge, TypeBadge } from "./components/StatusBadge"
import type { EvaluatorTab } from "./components/EvaluatorSidebar"
import type { StudentSubmission, EvaluatorAssessment } from "./types"

interface DashboardProps {
  state: EvaluatorState
  onNavigateTab: (tab: EvaluatorTab, context?: any) => void
  onOpenWorkspace: (submission: StudentSubmission) => void
}

export function Dashboard({
  state,
  onNavigateTab,
  onOpenWorkspace,
}: DashboardProps) {
  const {
    totalAssigned,
    pendingEvaluations,
    completedEvaluations,
    upcomingDeadlinesCount,
  } = getDashboardMetrics(state)

  const completionRate =
    totalAssigned > 0
      ? Math.round(
          (completedEvaluations /
            Math.max(1, completedEvaluations + pendingEvaluations)) *
            100
        )
      : 0

  // Pending assessments list
  const pendingAssessments = state.assessments
    .filter((a) => a.pendingCount > 0)
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    )

  // Upcoming deadlines
  const upcomingDeadlines = state.assessments
    .filter((a) => a.pendingCount > 0)
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    )
    .slice(0, 4)

  // Find next submission to grade
  const handleContinueNextPending = () => {
    // Prioritize draft saved first, then submitted
    const draft = state.submissions.find((s) => s.status === "Draft Saved")
    if (draft) {
      onOpenWorkspace(draft)
      return
    }
    const nextSubmitted = state.submissions.find(
      (s) => s.status === "Submitted" || s.status === "In Progress"
    )
    if (nextSubmitted) {
      onOpenWorkspace(nextSubmitted)
      return
    }
    onNavigateTab("Submissions")
  }

  const handleOpenAssessmentSubmissions = (assessment: EvaluatorAssessment) => {
    onNavigateTab("Submissions", { assessmentId: assessment.id })
  }

  return (
    <div className="evaluator-dashboard space-y-6">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assigned Assessments */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Assigned Assessments
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <BookOpenCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {totalAssigned}
            </span>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              4 Active Courses
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Assigned by Institution Exam Board & Admin
          </p>
        </div>

        {/* Card 2: Pending Evaluations */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Pending Evaluations
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {pendingEvaluations}
            </span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Awaiting Grading
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 mt-2">
            <span>Requires rubric scoring</span>
            <button
              onClick={handleContinueNextPending}
              className="text-purple-600 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
            >
              Grade Now →
            </button>
          </div>
        </div>

        {/* Card 3: Completed Evaluations */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Completed Evaluations
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {completedEvaluations}
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {completionRate}% Progress
            </span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Card 4: Upcoming Deadlines */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Upcoming Deadlines
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {upcomingDeadlinesCount}
            </span>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              Due &lt; 7 Days
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Next: {new Date(upcomingDeadlines[0]?.deadline || "").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={handleContinueNextPending}
          className="p-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl shadow-xs hover:shadow-md hover:scale-[1.01] transition-all flex items-center justify-between text-left cursor-pointer group"
        >
          <div>
            <div className="text-xs font-medium text-white/80">Active Task</div>
            <div className="text-sm font-bold">Resume Grading</div>
          </div>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab("Assessments")}
          className="p-3.5 bg-white border border-zinc-200/80 text-zinc-800 rounded-2xl shadow-xs hover:bg-zinc-50 transition-colors flex items-center justify-between text-left cursor-pointer"
        >
          <div>
            <div className="text-xs text-zinc-500 font-medium">Assigned Work</div>
            <div className="text-sm font-bold">View Assessments</div>
          </div>
          <BookOpenCheck className="w-4 h-4 text-purple-600" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab("Reassessment")}
          className="p-3.5 bg-white border border-zinc-200/80 text-zinc-800 rounded-2xl shadow-xs hover:bg-zinc-50 transition-colors flex items-center justify-between text-left cursor-pointer"
        >
          <div>
            <div className="text-xs text-zinc-500 font-medium">Student Appeals</div>
            <div className="text-sm font-bold flex items-center gap-1.5">
              <span>Reassessments</span>
              {state.submissions.filter((s) => s.status === "Reassessment Requested").length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
          </div>
          <RotateCcw className="w-4 h-4 text-rose-600" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab("Results & Feedback")}
          className="p-3.5 bg-white border border-zinc-200/80 text-zinc-800 rounded-2xl shadow-xs hover:bg-zinc-50 transition-colors flex items-center justify-between text-left cursor-pointer"
        >
          <div>
            <div className="text-xs text-zinc-500 font-medium">Audit & History</div>
            <div className="text-sm font-bold">Completed Marks</div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </button>
      </div>

      {/* Main Grid: Pending Evaluations Table & Upcoming Deadlines Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pending Evaluations Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Pending Evaluations by Assessment
              </h2>
              <p className="text-xs text-zinc-500">
                Click an assessment to view submissions or jump into grading
              </p>
            </div>
            <button
              onClick={() => onNavigateTab("My Evaluations")}
              className="text-xs font-bold text-purple-700 hover:text-purple-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View All Evaluations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pr-3">Assessment Name</th>
                  <th className="pb-3 px-3">Course</th>
                  <th className="pb-3 px-3">Type</th>
                  <th className="pb-3 px-3 text-center">Pending</th>
                  <th className="pb-3 px-3">Deadline</th>
                  <th className="pb-3 pl-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                {pendingAssessments.slice(0, 5).map((asm) => {
                  const deadlineDate = new Date(asm.deadline)
                  const isUrgent =
                    (deadlineDate.getTime() - Date.now()) / (1000 * 3600 * 24) < 2

                  return (
                    <tr
                      key={asm.id}
                      className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                      onClick={() => handleOpenAssessmentSubmissions(asm)}
                    >
                      <td className="py-3 pr-3 font-bold text-zinc-900 group-hover:text-purple-700">
                        {asm.title}
                      </td>
                      <td className="py-3 px-3 text-zinc-600 truncate max-w-[150px]">
                        {asm.course}
                      </td>
                      <td className="py-3 px-3">
                        <TypeBadge type={asm.type} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 text-[11px]">
                          {asm.pendingCount}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isUrgent ? "text-rose-600" : "text-zinc-600"
                          }`}
                        >
                          {isUrgent && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                          {deadlineDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenAssessmentSubmissions(asm)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Evaluate</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Upcoming Deadlines & Recent Activity */}
        <div className="space-y-6">
          {/* Upcoming Deadlines Widget */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Upcoming Deadlines</span>
              </h3>
              <span className="text-[11px] font-bold text-zinc-400">Timeline</span>
            </div>

            <div className="space-y-3">
              {upcomingDeadlines.map((asm) => {
                const deadline = new Date(asm.deadline)
                const diffDays = Math.ceil(
                  (deadline.getTime() - Date.now()) / (1000 * 3600 * 24)
                )
                let badgeStatus = "On Track"
                let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200"

                if (diffDays <= 1) {
                  badgeStatus = "Urgent (<24h)"
                  badgeClass = "bg-rose-50 text-rose-700 border-rose-200 font-bold"
                } else if (diffDays <= 3) {
                  badgeStatus = "Approaching"
                  badgeClass = "bg-amber-50 text-amber-700 border-amber-200"
                }

                return (
                  <div
                    key={asm.id}
                    className="p-3 rounded-xl border border-zinc-100 hover:border-purple-200 hover:bg-purple-50/20 transition-all flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-zinc-900 truncate">
                        {asm.title}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {asm.pendingCount} outstanding · Due {deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeClass}`}>
                        {badgeStatus}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Recent Activity</span>
              </h3>
              <span className="text-[11px] font-semibold text-zinc-400">Live Log</span>
            </div>

            <div className="space-y-3">
              {state.activities.slice(0, 4).map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-800 leading-tight">
                      {act.title}
                    </p>
                    <p className="text-[11px] text-zinc-500 leading-snug truncate">
                      {act.description}
                    </p>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(act.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
