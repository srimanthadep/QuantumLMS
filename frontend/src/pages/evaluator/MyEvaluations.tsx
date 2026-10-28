import React, { useState, useMemo } from "react"
import {
  Search,
  Filter,
  ArrowUpDown,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
} from "lucide-react"
import type { EvaluatorState } from "./data/evaluatorStorage"
import type { EvaluatorAssessment, AssessmentType } from "./types"
import { TypeBadge } from "./components/StatusBadge"

interface MyEvaluationsProps {
  state: EvaluatorState
  searchQuery: string
  setSearchQuery: (query: string) => void
  onSelectAssessment: (assessment: EvaluatorAssessment) => void
  onOpenSubmissionsForAssessment: (assessmentId: string) => void
}

type TabFilter = "All" | "Pending" | "In Progress" | "Completed" | "Overdue"

export function MyEvaluations({
  state,
  searchQuery,
  setSearchQuery,
  onSelectAssessment,
  onOpenSubmissionsForAssessment,
}: MyEvaluationsProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>("All")
  const [selectedType, setSelectedType] = useState<string>("All")
  const [sortBy, setSortBy] = useState<"deadline" | "progress" | "name">("deadline")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Filtered assessments
  const filteredAssessments = useMemo(() => {
    return state.assessments.filter((a) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = a.title.toLowerCase().includes(q)
        const matchesCourse = a.course.toLowerCase().includes(q)
        const matchesCode = a.code.toLowerCase().includes(q)
        if (!matchesName && !matchesCourse && !matchesCode) return false
      }

      // 2. Type Filter
      if (selectedType !== "All" && a.type !== selectedType) {
        return false
      }

      // 3. Tab Filter
      const isCompleted = a.pendingCount === 0
      const isOverdue =
        new Date(a.deadline).getTime() < Date.now() && a.pendingCount > 0
      const isInProgress = a.evaluatedCount > 0 && a.pendingCount > 0
      const isPending = a.pendingCount > 0

      if (activeTab === "Pending" && !isPending) return false
      if (activeTab === "In Progress" && !isInProgress) return false
      if (activeTab === "Completed" && !isCompleted) return false
      if (activeTab === "Overdue" && !isOverdue) return false

      return true
    })
  }, [state.assessments, searchQuery, selectedType, activeTab])

  // Sorted assessments
  const sortedAssessments = useMemo(() => {
    return [...filteredAssessments].sort((a, b) => {
      if (sortBy === "deadline") {
        const tA = new Date(a.deadline).getTime()
        const tB = new Date(b.deadline).getTime()
        return sortOrder === "asc" ? tA - tB : tB - tA
      }
      if (sortBy === "progress") {
        const progA = a.submissionCount > 0 ? a.evaluatedCount / a.submissionCount : 0
        const progB = b.submissionCount > 0 ? b.evaluatedCount / b.submissionCount : 0
        return sortOrder === "asc" ? progA - progB : progB - progA
      }
      if (sortBy === "name") {
        return sortOrder === "asc"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      }
      return 0
    })
  }, [filteredAssessments, sortBy, sortOrder])

  // Counts for each tab
  const tabCounts = useMemo(() => {
    const all = state.assessments.length
    const pending = state.assessments.filter((a) => a.pendingCount > 0).length
    const inProgress = state.assessments.filter(
      (a) => a.evaluatedCount > 0 && a.pendingCount > 0
    ).length
    const completed = state.assessments.filter((a) => a.pendingCount === 0).length
    const overdue = state.assessments.filter(
      (a) => new Date(a.deadline).getTime() < Date.now() && a.pendingCount > 0
    ).length
    return { all, pending, inProgress, completed, overdue }
  }, [state.assessments])

  // Distinct assessment types
  const assessmentTypes: AssessmentType[] = [
    "Assignment",
    "Quiz",
    "Test",
    "Midterm Examination",
    "Final Examination",
    "Project",
    "Practical Examination",
    "Lab Assessment",
    "Presentation",
    "Viva Assessment",
  ]

  return (
    <div className="evaluator-my-evaluations space-y-5">
      {/* Top Controls: Filter Tabs & Sorting */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {(["All", "Pending", "In Progress", "Completed", "Overdue"] as TabFilter[]).map(
            (tab) => {
              const isActive = activeTab === tab
              const count =
                tab === "All"
                  ? tabCounts.all
                  : tab === "Pending"
                  ? tabCounts.pending
                  : tab === "In Progress"
                  ? tabCounts.inProgress
                  : tab === "Completed"
                  ? tabCounts.completed
                  : tabCounts.overdue

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            }
          )}
        </div>

        {/* Right Filters: Type Dropdown & Sort */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Assessment Type filter */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200/80 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent font-medium text-zinc-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="All">All Types</option>
              {assessmentTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200/80 rounded-xl px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-medium text-zinc-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="deadline">Sort by Deadline</option>
              <option value="progress">Sort by Progress</option>
              <option value="name">Sort by Name</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="font-bold text-purple-700 hover:text-purple-900 cursor-pointer px-1"
              title="Toggle sort direction"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>

      {/* Evaluations Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Assessment Name</th>
                <th className="py-3.5 px-3">Course</th>
                <th className="py-3.5 px-3">Type</th>
                <th className="py-3.5 px-3 text-center">Assigned</th>
                <th className="py-3.5 px-3 text-center">Evaluated</th>
                <th className="py-3.5 px-3 text-center">Pending</th>
                <th className="py-3.5 px-3">Evaluation Progress</th>
                <th className="py-3.5 px-3">Deadline</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
              {sortedAssessments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-500">
                    <p className="font-semibold text-zinc-700">No assessments found</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Try adjusting your search query or active filter tabs.
                    </p>
                  </td>
                </tr>
              ) : (
                sortedAssessments.map((asm) => {
                  const deadlineDate = new Date(asm.deadline)
                  const isCompleted = asm.pendingCount === 0
                  const isOverdue =
                    deadlineDate.getTime() < Date.now() && asm.pendingCount > 0
                  const progressPct =
                    asm.submissionCount > 0
                      ? Math.round((asm.evaluatedCount / asm.submissionCount) * 100)
                      : 0

                  return (
                    <tr
                      key={asm.id}
                      className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                      onClick={() => onSelectAssessment(asm)}
                    >
                      {/* Name & Code */}
                      <td className="py-3.5 px-4 font-bold text-zinc-900 group-hover:text-purple-700 max-w-[200px]">
                        <div>{asm.title}</div>
                        <div className="text-[10px] text-zinc-400 font-normal">
                          {asm.code} · Max: {asm.maxMarks} marks
                        </div>
                      </td>

                      {/* Course */}
                      <td className="py-3.5 px-3 text-zinc-600 max-w-[140px] truncate">
                        {asm.course}
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-3">
                        <TypeBadge type={asm.type} />
                      </td>

                      {/* Assigned Students */}
                      <td className="py-3.5 px-3 text-center font-semibold text-zinc-600">
                        {asm.assignedStudentsCount}
                      </td>

                      {/* Evaluated Count */}
                      <td className="py-3.5 px-3 text-center font-bold text-emerald-700">
                        {asm.evaluatedCount}
                      </td>

                      {/* Pending Count */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            asm.pendingCount > 0
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {asm.pendingCount}
                        </span>
                      </td>

                      {/* Progress Bar */}
                      <td className="py-3.5 px-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-purple-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-zinc-500 shrink-0">
                            {progressPct}%
                          </span>
                        </div>
                      </td>

                      {/* Deadline */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isOverdue
                              ? "text-rose-600"
                              : "text-zinc-600"
                          }`}
                        >
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>
                            {deadlineDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isCompleted ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Completed
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending ({asm.pendingCount})
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 pr-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenSubmissionsForAssessment(asm.id)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Submissions</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default MyEvaluations
