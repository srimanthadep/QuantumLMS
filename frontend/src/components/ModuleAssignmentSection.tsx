import React, { useState } from "react"
import type { ModuleAssignmentItem, StudentModuleSubmission } from "../types"
import { Icon } from "./Icon"

export function ModuleAssignmentSection({
  assignment,
  moduleTitle,
  moduleIndex,
  onToast,
}: {
  assignment: ModuleAssignmentItem | null
  moduleTitle: string
  moduleIndex: number
  onToast?: (msg: string) => void
}) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)

  // Empty state if module has no assignment in existing data
  if (!assignment) {
    return (
      <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gray-50/70 border border-dashed border-gray-200 text-center">
        <div className="w-9 h-9 rounded-full bg-zinc-200/80 text-zinc-500 grid place-items-center mx-auto mb-2">
          <Icon name="document" size={16} />
        </div>
        <h4 className="text-xs font-bold text-zinc-800">
          No assignment available for this module
        </h4>
        <p className="text-[11px] text-zinc-500 max-w-md mx-auto mt-0.5 leading-relaxed">
          No administrative assignment, lab evaluation, or quiz has been published for Module {moduleIndex + 1} ({moduleTitle}) in the current course syllabus.
        </p>
        <span className="inline-block mt-2 text-[10px] text-zinc-400 font-medium">
          Assignments are created and managed exclusively by School Administration.
        </span>
      </div>
    )
  }

  const submissionsCount = assignment.submissionsCount ?? 0
  const totalEnrolled = assignment.totalEnrolled ?? 24
  const submissionPercent = Math.round((submissionsCount / totalEnrolled) * 100)

  return (
    <>
      <div
        className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50/70 via-white to-pink-50/40 border border-purple-200 shadow-xs space-y-3.5"
        aria-label={`Assignment for Module ${moduleIndex + 1}`}
      >
        {/* Header Tag Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-purple-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-6 h-6 rounded-md bg-purple-700 text-white text-[11px] font-bold grid place-items-center shrink-0">
              A
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900">
              Module {moduleIndex + 1} Assignment
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
              {assignment.type}
            </span>
            {assignment.isDemoData && (
              <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                Demo Syllabus Data
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span className="font-semibold text-zinc-700">Due: {assignment.dueDate}</span>
            <span className="text-zinc-300">·</span>
            <span className="font-semibold text-purple-800">Max Marks: {assignment.maxMarks}</span>
          </div>
        </div>

        {/* Assignment Title & Description */}
        <div>
          <h4 className="text-sm sm:text-base font-bold text-zinc-900 leading-snug">
            {assignment.title}
          </h4>
          <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
            {assignment.description}
          </p>
        </div>

        {/* Detailed Instructions Box */}
        {assignment.instructions && (
          <div className="p-3 rounded-xl bg-white border border-purple-100 text-xs">
            <span className="text-[10.5px] font-bold text-purple-950 uppercase tracking-wide block mb-1.5">
              Teacher & Student Instructions
            </span>
            <p className="text-zinc-700 leading-relaxed whitespace-pre-line text-[11.5px]">
              {assignment.instructions}
            </p>
          </div>
        )}

        {/* Supporting Attachments & Submission Stats Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Attachments / Starter Files */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-zinc-500">Starter Assets:</span>
            {assignment.attachments && assignment.attachments.length > 0 ? (
              assignment.attachments.map((att, i) => (
                <a
                  key={i}
                  href={att.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:border-purple-300 text-purple-800 text-[11px] font-medium shadow-2xs transition-colors"
                  title={`Open ${att.name}`}
                >
                  <Icon name="document" size={12} />
                  <span className="truncate max-w-[170px]">{att.name}</span>
                  <span className="text-[9.5px] text-zinc-400 font-mono">({att.size})</span>
                </a>
              ))
            ) : (
              <span className="text-[11px] text-zinc-400 italic">No attachments required</span>
            )}
          </div>

          {/* Submissions Progress & Action */}
          <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-purple-100">
            <div className="text-right">
              <div className="text-[10.5px] text-zinc-500">
                Cohort Submissions: <strong className="text-purple-900 font-bold">{submissionsCount} / {totalEnrolled}</strong> ({submissionPercent}%)
              </div>
              <div className="w-28 bg-purple-100 rounded-full h-1.5 mt-1 overflow-hidden ml-auto">
                <div
                  className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${submissionPercent}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsReviewModalOpen(true)}
              className="px-3.5 h-8 rounded-xl btn-primary text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              aria-label={`Review submissions for ${assignment.title}`}
            >
              <Icon name="check" size={13} />
              <span>Review Submissions ({submissionsCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* READ-ONLY SUBMISSIONS REVIEW MODAL */}
      {isReviewModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsReviewModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Submissions for ${assignment.title}`}
        >
          <div
            className="modal-content student-details-modal max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-150">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                    Module {moduleIndex + 1}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                    Cohort Submission Roster
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-md">
                  {assignment.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            {/* Read-Only Notice */}
            <div className="mt-3 p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-xs text-purple-950 flex items-center justify-between">
              <span>
                <strong>Submission Review:</strong> Read-only student files and grading records.
              </span>
              <span className="text-[10px] font-medium text-purple-700">
                Max Marks: {assignment.maxMarks}
              </span>
            </div>

            {/* Students Submission Table */}
            <div className="mt-3.5 max-h-80 overflow-y-auto space-y-2 pr-1">
              {assignment.submissions && assignment.submissions.length > 0 ? (
                assignment.submissions.map((sub) => (
                  <div
                    key={sub.studentId}
                    className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-150 flex items-center justify-between gap-3 hover:border-purple-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={sub.studentAvatar || "/assets/student-1.png"}
                        alt={sub.studentName}
                        className="w-8 h-8 rounded-lg object-cover border border-gray-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <strong className="block text-xs text-zinc-900 truncate">
                          {sub.studentName}
                        </strong>
                        <span className="text-[10px] text-zinc-400">
                          {sub.studentRoll} · {sub.submittedAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 text-right">
                      {sub.status === "Graded" ? (
                        <div>
                          <span className="text-xs font-bold text-purple-700 block">
                            {sub.score} / {sub.maxMarks}
                          </span>
                          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Graded
                          </span>
                        </div>
                      ) : sub.status === "Submitted" ? (
                        <div>
                          <span className="text-xs font-semibold text-zinc-700 block">
                            Submitted
                          </span>
                          <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Pending Review
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                          Not Submitted
                        </span>
                      )}

                      {sub.submittedFile && (
                        <button
                          type="button"
                          onClick={() => onToast?.(`Viewing submission: ${sub.submittedFile}`)}
                          className="px-2 py-1 rounded-lg bg-white border border-gray-200 hover:border-purple-300 text-purple-700 text-[10.5px] font-medium shadow-2xs transition-colors cursor-pointer"
                          title="View submitted file"
                        >
                          View File
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-zinc-400">
                  No submissions recorded yet for this assignment.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-4 pt-3 border-t border-gray-150 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="px-4 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-zinc-700 transition-colors cursor-pointer"
              >
                Close Submissions
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
