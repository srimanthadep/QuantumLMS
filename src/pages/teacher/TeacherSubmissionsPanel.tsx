import { useState, useMemo } from "react"
import { Icon } from "../../components/Icon"
import type {
  ContentSubmissionRecord,
  ContentSubmissionType,
  ContentApprovalStatus,
} from "./teacherContentWorkflowTypes"
import { deleteSubmission } from "./teacherContentWorkflowStorage"

export function TeacherSubmissionsPanel({
  submissions,
  courseId,
  courseName,
  onOpenCreateAssignment,
  onOpenCreateQuiz,
  onOpenUploadMaterial,
  onViewDetails,
  onEditSubmission,
  onToast,
}: {
  submissions: ContentSubmissionRecord[]
  courseId?: string
  courseName?: string
  onOpenCreateAssignment: () => void
  onOpenCreateQuiz: () => void
  onOpenUploadMaterial: () => void
  onViewDetails: (sub: ContentSubmissionRecord) => void
  onEditSubmission: (sub: ContentSubmissionRecord) => void
  onToast?: (msg: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<"all" | ContentSubmissionType>("all")
  const [selectedStatus, setSelectedStatus] = useState<"all" | ContentApprovalStatus>("all")

  // Filter submissions by course (if in course context)
  const courseFiltered = useMemo(() => {
    if (!courseId || courseId === "all") return submissions
    return submissions.filter((s) => s.courseId === courseId)
  }, [submissions, courseId])

  // Count summaries
  const pendingCount = courseFiltered.filter((s) => s.status === "pending_approval").length
  const approvedCount = courseFiltered.filter((s) => s.status === "approved").length
  const changesCount = courseFiltered.filter((s) => s.status === "changes_requested").length
  const rejectedCount = courseFiltered.filter((s) => s.status === "rejected").length
  const draftCount = courseFiltered.filter((s) => s.status === "draft").length

  // Filtered list
  const filteredList = useMemo(() => {
    return courseFiltered.filter((item) => {
      if (selectedType !== "all" && item.type !== selectedType) return false
      if (selectedStatus !== "all" && item.status !== selectedStatus) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(q)
        const matchModule = (item.moduleTitle || "").toLowerCase().includes(q)
        const matchCourse = (item.courseName || "").toLowerCase().includes(q)
        if (!matchTitle && !matchModule && !matchCourse) return false
      }
      return true
    })
  }, [courseFiltered, selectedType, selectedStatus, searchQuery])

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const success = deleteSubmission(id)
    if (success) {
      onToast?.("Draft removed from local storage")
    }
  }

  const getStatusBadge = (status: ContentApprovalStatus) => {
    switch (status) {
      case "approved":
        return {
          label: "Approved",
          className: "bg-emerald-100 text-emerald-800 border-emerald-200",
          dotColor: "bg-emerald-500",
        }
      case "pending_approval":
        return {
          label: "Pending Approval",
          className: "bg-amber-100 text-amber-800 border-amber-200",
          dotColor: "bg-amber-500",
        }
      case "changes_requested":
        return {
          label: "Changes Requested",
          className: "bg-orange-100 text-orange-800 border-orange-200",
          dotColor: "bg-orange-500",
        }
      case "rejected":
        return {
          label: "Rejected",
          className: "bg-red-100 text-red-800 border-red-200",
          dotColor: "bg-red-500",
        }
      case "draft":
      default:
        return {
          label: "Draft",
          className: "bg-zinc-100 text-zinc-700 border-zinc-200",
          dotColor: "bg-zinc-400",
        }
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar with Action Buttons */}
      <div className="panel p-5 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900">
                Course Content Submissions & Approval Workflow
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                {courseFiltered.length} Total
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Create and manage assignments, quizzes, and learning materials. All teacher submissions require School Administration approval before release to students.
            </p>
          </div>

          {/* Creation Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={onOpenCreateAssignment}
              className="px-3.5 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Icon name="plus" size={14} />
              <span>Add Assignment</span>
            </button>

            <button
              type="button"
              onClick={onOpenCreateQuiz}
              className="px-3.5 h-9 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Icon name="sparkles" size={14} />
              <span>Create Quiz</span>
            </button>

            <button
              type="button"
              onClick={onOpenUploadMaterial}
              className="px-3.5 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Icon name="document" size={14} />
              <span>Upload Material</span>
            </button>
          </div>
        </div>

        {/* 2. Status Counter Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-4 pt-4 border-t border-gray-150">
          <div
            onClick={() => setSelectedStatus("pending_approval")}
            className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${selectedStatus === "pending_approval"
                ? "bg-amber-100/70 border-amber-300 ring-2 ring-amber-400/50"
                : "bg-amber-50/60 border-amber-200 hover:bg-amber-100/40"
              }`}
          >
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
              Pending Review
            </span>
            <strong className="text-lg font-bold text-amber-950 mt-0.5 block">
              {pendingCount}
            </strong>
          </div>

          <div
            onClick={() => setSelectedStatus("changes_requested")}
            className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${selectedStatus === "changes_requested"
                ? "bg-orange-100/70 border-orange-300 ring-2 ring-orange-400/50"
                : "bg-orange-50/60 border-orange-200 hover:bg-orange-100/40"
              }`}
          >
            <span className="text-[10px] font-bold text-orange-900 uppercase tracking-wider block">
              Changes Requested
            </span>
            <strong className="text-lg font-bold text-orange-950 mt-0.5 block">
              {changesCount}
            </strong>
          </div>

          <div
            onClick={() => setSelectedStatus("approved")}
            className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${selectedStatus === "approved"
                ? "bg-emerald-100/70 border-emerald-300 ring-2 ring-emerald-400/50"
                : "bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/40"
              }`}
          >
            <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
              Approved
            </span>
            <strong className="text-lg font-bold text-emerald-950 mt-0.5 block">
              {approvedCount}
            </strong>
          </div>

          <div
            onClick={() => setSelectedStatus("rejected")}
            className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${selectedStatus === "rejected"
                ? "bg-red-100/70 border-red-300 ring-2 ring-red-400/50"
                : "bg-red-50/60 border-red-200 hover:bg-red-100/40"
              }`}
          >
            <span className="text-[10px] font-bold text-red-900 uppercase tracking-wider block">
              Rejected
            </span>
            <strong className="text-lg font-bold text-red-950 mt-0.5 block">
              {rejectedCount}
            </strong>
          </div>

          <div
            onClick={() => setSelectedStatus("draft")}
            className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${selectedStatus === "draft"
                ? "bg-zinc-200 border-zinc-400 ring-2 ring-zinc-400/50"
                : "bg-zinc-100 border-zinc-200 hover:bg-zinc-150"
              }`}
          >
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block">
              Drafts
            </span>
            <strong className="text-lg font-bold text-zinc-900 mt-0.5 block">
              {draftCount}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="panel p-4 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="search-box flex-1 max-w-md">
          <Icon name="search" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search submissions by title or module..."
            aria-label="Search content submissions"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Content Type Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-zinc-400 mr-1">Type:</span>
          {(["all", "assignment", "quiz", "material"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${selectedType === t
                  ? "bg-purple-700 text-white shadow-2xs"
                  : "bg-gray-100 text-zinc-600 hover:bg-gray-200"
                }`}
            >
              {t === "all" ? "All Types" : t}
            </button>
          ))}
          {selectedStatus !== "all" && (
            <button
              onClick={() => setSelectedStatus("all")}
              className="text-[11px] font-bold text-purple-600 hover:text-purple-800 underline ml-2 cursor-pointer"
            >
              Clear Status Filter
            </button>
          )}
        </div>
      </div>

      {/* 4. Submissions List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="panel p-8 text-center bg-white">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 grid place-items-center mx-auto mb-3">
              <Icon name="document" size={20} />
            </div>
            <h3 className="text-sm font-bold text-zinc-900">No Content Submissions Found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
              {searchQuery || selectedType !== "all" || selectedStatus !== "all"
                ? "No submissions match your active filter criteria. Try resetting filters."
                : "No learning materials or assignments have been submitted for this course yet."}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={onOpenCreateAssignment}
                className="px-3.5 h-8 rounded-lg btn-primary text-xs font-bold cursor-pointer"
              >
                + New Assignment
              </button>
              <button
                onClick={onOpenCreateQuiz}
                className="px-3.5 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-zinc-800 text-xs font-bold cursor-pointer"
              >
                + Create Quiz
              </button>
            </div>
          </div>
        ) : (
          filteredList.map((item) => {
            const badge = getStatusBadge(item.status)
            const canEdit =
              item.status === "draft" ||
              item.status === "changes_requested" ||
              item.status === "rejected"

            return (
              <div
                key={item.id}
                className="panel p-4 sm:p-5 bg-white hover:border-purple-300 transition-all shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                        {item.type}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badge.className}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                        {badge.label}
                      </span>
                      <span className="text-[10.5px] text-zinc-400 font-mono">
                        v{item.version}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 leading-snug">
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500">
                      <span className="font-semibold text-zinc-700">{item.courseCode}</span>
                      <span>·</span>
                      <span className="truncate max-w-xs">{item.courseName}</span>
                      {item.moduleTitle && (
                        <>
                          <span>›</span>
                          <span className="truncate max-w-xs text-purple-800 font-medium">
                            {item.moduleTitle}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Submission Timestamp & Available Actions */}
                  <div className="flex flex-col sm:items-end justify-between gap-2 shrink-0">
                    <span className="text-[11px] text-zinc-400">
                      {item.submittedAt
                        ? `Submitted ${new Date(item.submittedAt).toLocaleDateString()}`
                        : `Saved draft ${new Date(item.updatedAt).toLocaleDateString()}`}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onViewDetails(item)}
                        className="px-3 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        View Details
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onEditSubmission(item)}
                          className="px-3 h-8 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                        >
                          <span>{item.status === "draft" ? "Edit Draft" : "Edit & Resubmit"}</span>
                          <span>→</span>
                        </button>
                      )}

                      {item.status === "draft" && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(item.id, e)}
                          className="text-zinc-400 hover:text-red-500 p-1.5 text-xs cursor-pointer"
                          title="Delete draft"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prominent Admin Feedback Callout */}
                {item.adminFeedback && (
                  <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 flex items-start gap-2.5">
                    <span className="text-amber-600 font-bold shrink-0 mt-0.5">ℹ</span>
                    <div className="text-xs leading-relaxed flex-1">
                      <strong className="font-bold text-amber-900 block mb-0.5">
                        Administrative Review Note:
                      </strong>
                      {item.adminFeedback}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 5. Institutional Governance Policy Banner */}
      <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 flex items-start gap-2.5 text-xs text-purple-900/90">
        <Icon name="sparkles" size={16} />
        <div className="leading-relaxed">
          <strong className="font-bold text-purple-950 block">
            Academic Approval & Student Visibility Policy
          </strong>
          To uphold curriculum rigor, all quizzes, assignments, and digital resources generated by teachers remain in <em>Pending Approval</em> until verified by School Administration. Approved items are automatically scheduled for enrolled students.
        </div>
      </div>
    </div>
  )
}
