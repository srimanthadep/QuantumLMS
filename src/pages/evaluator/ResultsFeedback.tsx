import React, { useState } from "react"
import {
  CheckCircle2,
  Lock,
  Eye,
  FileText,
  Clock,
  Sparkles,
  Download,
  AlertCircle,
  RotateCcw,
  Check,
} from "lucide-react"
import type { EvaluatorState } from "./data/evaluatorStorage"
import type { StudentSubmission } from "./types"
import { StatusBadge, ReleaseBadge, TypeBadge } from "./components/StatusBadge"

interface ResultsFeedbackProps {
  state: EvaluatorState
  onOpenWorkspace: (sub: StudentSubmission) => void
  onToast: (msg: string) => void
}

export function ResultsFeedback({
  state,
  onOpenWorkspace,
  onToast,
}: ResultsFeedbackProps) {
  const [selectedSubmission, setSelectedSubmission] =
    useState<StudentSubmission | null>(null)
  const [filterReleaseStatus, setFilterReleaseStatus] = useState<string>("All")

  // Filter completed or evaluated submissions
  const evaluatedSubmissions = state.submissions.filter((s) => {
    if (filterReleaseStatus !== "All" && s.releaseStatus !== filterReleaseStatus) {
      return false
    }
    return true
  })

  const handleExportCSV = () => {
    const headers = [
      "Student Name",
      "Roll No",
      "Assessment Title",
      "Course",
      "Awarded Marks",
      "Max Marks",
      "Evaluation Status",
      "Release Status",
    ]
    const rows = evaluatedSubmissions.map((s) => [
      `"${s.studentName}"`,
      `"${s.studentRoll}"`,
      `"${s.assessmentTitle}"`,
      `"${s.course}"`,
      s.finalMarks ?? s.draftEvaluation?.totalAwardedMarks ?? 0,
      s.maxMarks,
      `"${s.status}"`,
      `"${s.releaseStatus}"`,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Evaluator_Results_Audit_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    onToast("Audit log CSV exported successfully!")
  }

  return (
    <div className="evaluator-results-feedback space-y-5">
      {/* Institutional Release Governance Notice */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-amber-900">
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Institutional Grade Publication Rule:</strong> Evaluators award marks and record detailed rubric criteria. Official grade publishing to the Student Portal requires formal approval from the Institutional Exam Board and Administration.
          </span>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Release Filter:
          </span>
          {(["All", "Awaiting Release", "Released", "Draft", "Reassessed"] as const).map(
            (status) => {
              const isActive = filterReleaseStatus === status
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterReleaseStatus(status)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {status}
                </button>
              )
            }
          )}
        </div>

        <div className="text-xs text-zinc-500 font-medium">
          Showing {evaluatedSubmissions.length} evaluation records
        </div>
      </div>

      {/* Results & Feedback Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-3">Assessment</th>
                <th className="py-3.5 px-3">Course</th>
                <th className="py-3.5 px-3 text-center">Score</th>
                <th className="py-3.5 px-3 text-center">Evaluation Status</th>
                <th className="py-3.5 px-3 text-center">Release Status</th>
                <th className="py-3.5 px-3">Feedback Summary</th>
                <th className="py-3.5 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
              {evaluatedSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    No matching evaluation records found.
                  </td>
                </tr>
              ) : (
                evaluatedSubmissions.map((sub) => {
                  const evalRecord = sub.finalizedEvaluation || sub.draftEvaluation
                  const marks = sub.finalMarks ?? evalRecord?.totalAwardedMarks

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                      onClick={() => setSelectedSubmission(sub)}
                    >
                      {/* Student */}
                      <td className="py-3.5 px-4 font-bold text-zinc-900 group-hover:text-purple-700">
                        <div>{sub.studentName}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {sub.studentRoll}
                        </div>
                      </td>

                      {/* Assessment */}
                      <td className="py-3.5 px-3 font-semibold text-zinc-800 max-w-[160px] truncate">
                        {sub.assessmentTitle}
                      </td>

                      {/* Course */}
                      <td className="py-3.5 px-3 text-zinc-500 max-w-[130px] truncate">
                        {sub.course}
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-3 text-center">
                        {marks !== undefined ? (
                          <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 text-[11px]">
                            {marks} / {sub.maxMarks}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Evaluation Status */}
                      <td className="py-3.5 px-3 text-center">
                        <StatusBadge status={sub.status} />
                      </td>

                      {/* Release Status */}
                      <td className="py-3.5 px-3 text-center">
                        <ReleaseBadge status={sub.releaseStatus} />
                      </td>

                      {/* Feedback Summary */}
                      <td className="py-3.5 px-3 text-zinc-500 max-w-[200px] truncate">
                        {evalRecord?.overallFeedback || "No feedback recorded yet."}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 pr-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenWorkspace(sub)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
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

      {/* Selected Submission Details Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Evaluation & Feedback Breakdown
                </h3>
                <p className="text-xs text-zinc-500">
                  {selectedSubmission.studentName} ({selectedSubmission.studentRoll})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Score Summary Card */}
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-purple-700 font-medium">Final Awarded Score</div>
                <div className="text-2xl font-black text-purple-900">
                  {selectedSubmission.finalMarks ?? selectedSubmission.draftEvaluation?.totalAwardedMarks ?? 0} / {selectedSubmission.maxMarks}
                </div>
              </div>
              <div className="text-right">
                <ReleaseBadge status={selectedSubmission.releaseStatus} />
                <div className="text-[10px] text-zinc-400 mt-1">
                  Evaluated by Dr. Alistair Vance
                </div>
              </div>
            </div>

            {/* Criteria Breakdown */}
            {selectedSubmission.finalizedEvaluation?.criterionScores && (
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                  Rubric Criteria Breakdown
                </h4>
                <div className="space-y-1.5">
                  {selectedSubmission.finalizedEvaluation.criterionScores.map((cs) => (
                    <div
                      key={cs.criterionId}
                      className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-zinc-800">{cs.criterionName}</div>
                        {cs.feedback && (
                          <div className="text-[11px] text-zinc-500 italic mt-0.5">
                            "{cs.feedback}"
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-zinc-800 text-xs shrink-0">
                        {cs.awardedMarks} / {cs.maxMarks}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Feedback */}
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                Overall Feedback
              </h4>
              <p className="text-zinc-600 bg-zinc-50 p-3 rounded-xl border border-zinc-100 leading-relaxed">
                {selectedSubmission.finalizedEvaluation?.overallFeedback ||
                  selectedSubmission.draftEvaluation?.overallFeedback ||
                  "No feedback recorded."}
              </p>
            </div>

            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="py-2 px-4 rounded-xl border border-zinc-200 font-bold text-zinc-700 hover:bg-zinc-100 text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const sub = selectedSubmission
                  setSelectedSubmission(null)
                  onOpenWorkspace(sub)
                }}
                className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open in Workspace</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResultsFeedback
