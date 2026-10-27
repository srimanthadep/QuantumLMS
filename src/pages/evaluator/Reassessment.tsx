import React, { useState } from "react"
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Eye,
  FileText,
  ShieldCheck,
  Scale,
} from "lucide-react"
import type { EvaluatorState } from "./data/evaluatorStorage"
import { resolveReassessment } from "./data/evaluatorStorage"
import type { ReassessmentRequest, StudentSubmission } from "./types"

interface ReassessmentProps {
  state: EvaluatorState
  onUpdateState: (newState: EvaluatorState) => void
  onOpenWorkspaceForSubmission: (submission: StudentSubmission) => void
  onToast: (msg: string) => void
}

export function Reassessment({
  state,
  onUpdateState,
  onOpenWorkspaceForSubmission,
  onToast,
}: ReassessmentProps) {
  const [selectedRequest, setSelectedRequest] =
    useState<ReassessmentRequest | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false)

  // Reassessment resolution form
  const [revisedMarksInput, setRevisedMarksInput] = useState<string>("")
  const [findingsInput, setFindingsInput] = useState<string>("")
  const [evaluatorNotes, setEvaluatorNotes] = useState<string>("")

  // Collect all reassessment requests from submissions
  const requests = state.submissions
    .map((s) => s.reassessmentRequest)
    .filter((r): r is ReassessmentRequest => r !== undefined)

  const handleOpenReview = (req: ReassessmentRequest) => {
    setSelectedRequest(req)
    setRevisedMarksInput(req.revisedMarks ? req.revisedMarks.toString() : req.originalMarks.toString())
    setFindingsInput(req.findings || "")
    setEvaluatorNotes(req.evaluatorNotes || "")
    setIsReviewModalOpen(true)
  }

  const handleResolve = (decision: "Revised" | "Upheld") => {
    if (!selectedRequest) return

    const parsedMarks = parseFloat(revisedMarksInput)
    if (decision === "Revised" && (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > selectedRequest.maxMarks)) {
      onToast(`Please enter a valid revised score between 0 and ${selectedRequest.maxMarks}.`)
      return
    }

    if (!findingsInput.trim()) {
      onToast("Please provide detailed findings explaining the decision.")
      return
    }

    const nextState = resolveReassessment(
      state,
      selectedRequest.id,
      decision,
      decision === "Revised" ? parsedMarks : undefined,
      findingsInput,
      evaluatorNotes
    )

    onUpdateState(nextState)
    setIsReviewModalOpen(false)
    onToast(
      decision === "Revised"
        ? `Reassessment appeal resolved: Marks revised to ${parsedMarks}/${selectedRequest.maxMarks}.`
        : `Reassessment appeal reviewed: Original score of ${selectedRequest.originalMarks} upheld.`
    )
  }

  const findSubmissionForRequest = (req: ReassessmentRequest) => {
    return state.submissions.find((s) => s.id === req.submissionId)
  }

  return (
    <div className="evaluator-reassessment space-y-5">
      {/* Policy Banner */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-700" />
            <h2 className="text-base font-bold text-zinc-900">
              Student Reassessment Appeals Review
            </h2>
          </div>
          <p className="text-xs text-zinc-500 max-w-2xl">
            Under Quantum LMS academic governance rules, students may lodge formal reassessment appeals regarding contested rubric criteria. Review the student's grounds, compare against the marking scheme, and record formal findings. Original evaluation scores are preserved in the permanent audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200">
            {requests.filter((r) => r.status === "Pending").length} Pending Appeals
          </span>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-3">Assessment</th>
                <th className="py-3.5 px-3">Course</th>
                <th className="py-3.5 px-3 text-center">Original Score</th>
                <th className="py-3.5 px-3">Appeal Date</th>
                <th className="py-3.5 px-3 max-w-[240px]">Student's Grounds</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <p className="font-semibold text-zinc-700">No active reassessment requests</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Student appeals will appear here when submitted.
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const reqDate = new Date(req.requestDate)
                  const isResolved = req.status === "Resolved" || req.status === "Upheld"

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-purple-50/30 transition-colors"
                    >
                      {/* Student */}
                      <td className="py-3.5 px-4 font-bold text-zinc-900">
                        <div>{req.studentName}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {req.studentRoll}
                        </div>
                      </td>

                      {/* Assessment */}
                      <td className="py-3.5 px-3 font-semibold text-zinc-800 max-w-[160px] truncate">
                        {req.assessmentTitle}
                      </td>

                      {/* Course */}
                      <td className="py-3.5 px-3 text-zinc-500 max-w-[130px] truncate">
                        {req.course}
                      </td>

                      {/* Original Marks */}
                      <td className="py-3.5 px-3 text-center font-bold text-zinc-700">
                        {req.originalMarks}/{req.maxMarks}
                        {req.revisedMarks !== undefined && req.status === "Resolved" && (
                          <div className="text-[10px] text-emerald-700 font-bold">
                            Revised: {req.revisedMarks}
                          </div>
                        )}
                      </td>

                      {/* Request Date */}
                      <td className="py-3.5 px-3 text-zinc-600 whitespace-nowrap">
                        {reqDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Reason snippet */}
                      <td className="py-3.5 px-3 text-zinc-600 max-w-[240px] truncate" title={req.reason}>
                        {req.reason}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {req.status === "Pending" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                            Pending Review
                          </span>
                        ) : req.status === "Resolved" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Marks Revised
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                            Original Upheld
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 pr-4 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(req)}
                          className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{isResolved ? "Audit Findings" : "Review Appeal"}</span>
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

      {/* Reassessment Review & Decision Modal */}
      {isReviewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-purple-600" />
                  <span>Reassessment Appeal Review</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  {selectedRequest.studentName} ({selectedRequest.studentRoll}) · {selectedRequest.assessmentTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-100 space-y-2">
                <span className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">
                  Original Evaluation Record
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-zinc-600">Assigned Score:</span>
                  <span className="font-bold text-zinc-900 text-sm">
                    {selectedRequest.originalMarks} / {selectedRequest.maxMarks}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 italic bg-white p-2 rounded-lg border border-zinc-100">
                  "{selectedRequest.originalFeedback}"
                </div>
              </div>

              <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-100 space-y-2">
                <span className="font-bold text-rose-700 uppercase tracking-wider text-[10px]">
                  Student's Appeal Grounds
                </span>
                <div className="text-xs text-rose-950 font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-rose-100">
                  "{selectedRequest.reason}"
                </div>
              </div>
            </div>

            {/* Quick Link to original submission */}
            {(() => {
              const sub = findSubmissionForRequest(selectedRequest)
              if (sub) {
                return (
                  <div className="bg-purple-50 p-3 rounded-xl flex items-center justify-between text-xs text-purple-900">
                    <span>Revisit full submitted files, code, and rubric in workspace:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsReviewModalOpen(false)
                        onOpenWorkspaceForSubmission(sub)
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Open Workspace</span>
                    </button>
                  </div>
                )
              }
              return null
            })()}

            {/* Evaluator Reassessment Decision Section */}
            <div className="space-y-4 pt-2 border-t border-zinc-100 text-xs">
              <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                Evaluator Finding & Determination
              </h4>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700">
                  Proposed Revised Marks (if applicable)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={selectedRequest.maxMarks}
                    value={revisedMarksInput}
                    onChange={(e) => setRevisedMarksInput(e.target.value)}
                    className="w-24 px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <span className="text-zinc-400 font-semibold">
                    / {selectedRequest.maxMarks} Marks
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700">
                  Formal Findings & Rubric Rationale <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={findingsInput}
                  onChange={(e) => setFindingsInput(e.target.value)}
                  placeholder="Explain why the score was revised or upheld with reference to specific rubric criteria..."
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700">
                  Internal Exam Board Notes (Optional)
                </label>
                <input
                  type="text"
                  value={evaluatorNotes}
                  onChange={(e) => setEvaluatorNotes(e.target.value)}
                  placeholder="Confidential notes for department chair / exam registrar..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-zinc-200 font-bold text-zinc-700 hover:bg-zinc-100 text-xs transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResolve("Upheld")}
                  className="py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Uphold Original Score</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve("Revised")}
                  className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Revise & Submit Recommendation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reassessment
