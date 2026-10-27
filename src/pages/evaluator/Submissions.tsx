import React, { useState, useMemo } from "react"
import {
  Search,
  Filter,
  FileText,
  User,
  ArrowRight,
  ExternalLink,
  Edit3,
  Eye,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react"
import type { EvaluatorState } from "./data/evaluatorStorage"
import type { StudentSubmission, EvaluationStatus } from "./types"
import { StatusBadge, TypeBadge } from "./components/StatusBadge"

interface SubmissionsProps {
  state: EvaluatorState
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenWorkspace: (submission: StudentSubmission) => void
  initialAssessmentFilter?: string
}

export function Submissions({
  state,
  searchQuery,
  setSearchQuery,
  onOpenWorkspace,
  initialAssessmentFilter,
}: SubmissionsProps) {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(
    initialAssessmentFilter || "All"
  )
  const [selectedStatus, setSelectedStatus] = useState<string>("All")
  const [selectedCourse, setSelectedCourse] = useState<string>("All")

  // Distinct courses
  const courses = useMemo(() => {
    const list = Array.from(new Set(state.assessments.map((a) => a.course)))
    return list
  }, [state.assessments])

  // All unique statuses represented
  const statuses: EvaluationStatus[] = [
    "Submitted",
    "In Progress",
    "Draft Saved",
    "Evaluated",
    "Resubmitted",
    "Reassessment Requested",
    "Reassessment In Progress",
    "Overdue",
    "Returned for Correction",
  ]

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return state.submissions.filter((sub) => {
      // 1. Text Search (Student Name, Roll, Assessment Title)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const mStudent = sub.studentName.toLowerCase().includes(q)
        const mRoll = sub.studentRoll.toLowerCase().includes(q)
        const mTitle = sub.assessmentTitle.toLowerCase().includes(q)
        const mCourse = sub.course.toLowerCase().includes(q)
        if (!mStudent && !mRoll && !mTitle && !mCourse) return false
      }

      // 2. Assessment filter
      if (
        selectedAssessmentId !== "All" &&
        sub.assessmentId !== selectedAssessmentId
      ) {
        return false
      }

      // 3. Course filter
      if (selectedCourse !== "All" && sub.course !== selectedCourse) {
        return false
      }

      // 4. Status filter
      if (selectedStatus !== "All" && sub.status !== selectedStatus) {
        return false
      }

      return true
    })
  }, [
    state.submissions,
    searchQuery,
    selectedAssessmentId,
    selectedCourse,
    selectedStatus,
  ])

  return (
    <div className="evaluator-submissions space-y-5">
      {/* Search and Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Assessment Filter */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-1.5 min-w-[180px]">
            <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <select
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              className="bg-transparent font-medium text-zinc-800 focus:outline-none cursor-pointer text-xs w-full truncate"
            >
              <option value="All">All Assessments</option>
              {state.assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-1.5">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="bg-transparent font-medium text-zinc-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="All">All Courses</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-1.5">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-medium text-zinc-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="All">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Count Indicator */}
        <div className="text-xs font-semibold text-zinc-500 shrink-0">
          Showing <span className="text-purple-700 font-bold">{filteredSubmissions.length}</span> of {state.submissions.length} submissions
        </div>
      </div>

      {/* Submissions Data Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-3">Roll No</th>
                <th className="py-3.5 px-3">Assessment</th>
                <th className="py-3.5 px-3">Course</th>
                <th className="py-3.5 px-3">Submitted</th>
                <th className="py-3.5 px-3 text-center">Version</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3 text-center">Marks</th>
                <th className="py-3.5 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500">
                    <p className="font-semibold text-zinc-700">No submissions found</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Try clearing filters or search queries.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const subDate = new Date(sub.submissionDate)
                  const isEvaluated = sub.status === "Evaluated"
                  const isDraft = sub.status === "Draft Saved"

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                      onClick={() => onOpenWorkspace(sub)}
                    >
                      {/* Student Name & Avatar */}
                      <td className="py-3.5 px-4 font-bold text-zinc-900 group-hover:text-purple-700">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={sub.studentAvatar}
                            alt={sub.studentName}
                            className="w-7 h-7 rounded-full object-cover border border-zinc-200"
                          />
                          <span>{sub.studentName}</span>
                        </div>
                      </td>

                      {/* Student Roll */}
                      <td className="py-3.5 px-3 text-zinc-500 font-mono text-[11px]">
                        {sub.studentRoll}
                      </td>

                      {/* Assessment Title */}
                      <td className="py-3.5 px-3 font-semibold text-zinc-800 max-w-[180px] truncate">
                        {sub.assessmentTitle}
                      </td>

                      {/* Course */}
                      <td className="py-3.5 px-3 text-zinc-500 max-w-[140px] truncate">
                        {sub.course}
                      </td>

                      {/* Submission Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-zinc-600">
                        {subDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Version */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-mono">
                          {sub.version}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <StatusBadge status={sub.status} />
                      </td>

                      {/* Marks (if finalized) */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {isEvaluated && sub.finalMarks !== undefined ? (
                          <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                            {sub.finalMarks}/{sub.maxMarks}
                          </span>
                        ) : isDraft && sub.draftEvaluation ? (
                          <span className="text-[11px] text-purple-600 font-semibold italic">
                            Draft ({sub.draftEvaluation.totalAwardedMarks}/{sub.maxMarks})
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-bold">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 pr-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenWorkspace(sub)
                          }}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer ${
                            isDraft
                              ? "bg-purple-100 text-purple-800 hover:bg-purple-200"
                              : isEvaluated
                              ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                              : "bg-purple-600 text-white hover:bg-purple-700 shadow-xs"
                          }`}
                        >
                          {isDraft ? (
                            <>
                              <Edit3 className="w-3 h-3" />
                              <span>Resume Draft</span>
                            </>
                          ) : isEvaluated ? (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>View Evaluation</span>
                            </>
                          ) : (
                            <>
                              <span>Grade</span>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
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

export default Submissions
