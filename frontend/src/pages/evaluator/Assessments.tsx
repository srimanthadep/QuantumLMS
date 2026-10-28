import React, { useState } from "react"
import {
  BookOpenCheck,
  Lock,
  Layers,
  Calendar,
  CheckCircle2,
  Users,
  FileText,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Info,
} from "lucide-react"
import type { EvaluatorState } from "./data/evaluatorStorage"
import type { EvaluatorAssessment, AssessmentType } from "./types"
import { TypeBadge } from "./components/StatusBadge"

interface AssessmentsProps {
  state: EvaluatorState
  searchQuery: string
  onOpenSubmissionsForAssessment: (assessmentId: string) => void
  selectedAssessmentModal?: EvaluatorAssessment | null
  onCloseAssessmentModal?: () => void
}

export function Assessments({
  state,
  searchQuery,
  onOpenSubmissionsForAssessment,
  selectedAssessmentModal,
  onCloseAssessmentModal,
}: AssessmentsProps) {
  const [selectedAssessment, setSelectedAssessment] =
    useState<EvaluatorAssessment | null>(
      selectedAssessmentModal || state.assessments[0] || null
    )
  const [filterType, setFilterType] = useState<string>("All")

  const filteredAssessments = state.assessments.filter((a) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const mName = a.title.toLowerCase().includes(q)
      const mCourse = a.course.toLowerCase().includes(q)
      const mBatch = a.batch.toLowerCase().includes(q)
      if (!mName && !mCourse && !mBatch) return false
    }
    if (filterType !== "All" && a.type !== filterType) return false
    return true
  })

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
    <div className="evaluator-assessments space-y-5">
      {/* Read-Only Permission Banner */}
      <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-purple-900">
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-purple-700 shrink-0" />
          <span>
            <strong>Official Assessment Registry:</strong> Evaluators can review instructions, marking schemes, and student submissions assigned to them. Official assessment definitions and rubrics are locked by Institution Administration.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-purple-200/80 text-purple-900 text-[11px] font-bold shrink-0">
          Evaluator Scope
        </span>
      </div>

      {/* Filter Tabs by Assessment Type */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setFilterType("All")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
            filterType === "All"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/80"
          }`}
        >
          All Types ({state.assessments.length})
        </button>
        {assessmentTypes.map((type) => {
          const count = state.assessments.filter((a) => a.type === type).length
          if (count === 0) return null
          const isActive = filterType === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                isActive
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/80"
              }`}
            >
              {type} ({count})
            </button>
          )
        })}
      </div>

      {/* Grid: Assessments Cards & Detailed Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Assessment Cards List */}
        <div className="lg:col-span-5 space-y-3">
          {filteredAssessments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-500">
              No assessments matching your criteria.
            </div>
          ) : (
            filteredAssessments.map((asm) => {
              const isSelected = selectedAssessment?.id === asm.id
              const deadline = new Date(asm.deadline)
              const isCompleted = asm.pendingCount === 0

              return (
                <div
                  key={asm.id}
                  onClick={() => setSelectedAssessment(asm)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-purple-50/70 border-purple-400 shadow-sm"
                      : "bg-white border-zinc-200/80 hover:border-purple-200 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <TypeBadge type={asm.type} />
                    <span className="text-[11px] font-bold text-zinc-400">
                      {asm.code}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-900 line-clamp-1 mb-1">
                    {asm.title}
                  </h3>
                  <p className="text-xs text-zinc-500 line-clamp-1 mb-3">
                    {asm.course} · {asm.batch}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-100 text-zinc-600">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{asm.submissionCount} Submissions</span>
                    </span>
                    <span
                      className={`font-bold text-[11px] px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {isCompleted
                        ? "Evaluated"
                        : `${asm.pendingCount} Pending`}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column: Active Assessment Details & Official Rubric */}
        <div className="lg:col-span-7">
          {selectedAssessment ? (
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-6 space-y-6">
              {/* Header */}
              <div className="border-b border-zinc-100 pb-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={selectedAssessment.type} />
                    <span className="text-xs font-bold text-zinc-400">
                      {selectedAssessment.code}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700">
                    Max: {selectedAssessment.maxMarks} Marks
                  </span>
                </div>

                <h2 className="text-xl font-black text-zinc-900 tracking-tight mb-1">
                  {selectedAssessment.title}
                </h2>
                <p className="text-xs text-zinc-500 font-medium">
                  {selectedAssessment.course} · {selectedAssessment.batch}
                </p>
              </div>

              {/* Counts & Status Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 rounded-xl p-3 border border-zinc-200/70 text-center">
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400">
                    Assigned Cohort
                  </div>
                  <div className="text-base font-bold text-zinc-800">
                    {selectedAssessment.assignedStudentsCount}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400">
                    Received
                  </div>
                  <div className="text-base font-bold text-zinc-800">
                    {selectedAssessment.submissionCount}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400">
                    Evaluated
                  </div>
                  <div className="text-base font-bold text-emerald-700">
                    {selectedAssessment.evaluatedCount}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400">
                    Pending
                  </div>
                  <div className="text-base font-bold text-amber-700">
                    {selectedAssessment.pendingCount}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-purple-600" />
                  <span>Description & Evaluation Instructions</span>
                </h4>
                <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-3.5 rounded-xl border border-zinc-100">
                  {selectedAssessment.description}
                </p>
                <div className="mt-2 text-xs text-zinc-600 italic">
                  <strong>Evaluator directive:</strong> {selectedAssessment.instructions}
                </div>
              </div>

              {/* Applicable Marking Scheme / Rubric */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpenCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Applicable Rubric: {selectedAssessment.rubric.name}</span>
                  </h4>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                    {selectedAssessment.rubric.version}
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedAssessment.rubric.criteria.map((criterion, idx) => (
                    <div
                      key={criterion.id}
                      className="p-3.5 rounded-xl border border-zinc-200/90 bg-white space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-800">
                          {idx + 1}. {criterion.name}
                        </span>
                        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                          Max {criterion.maxMarks} Marks
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {criterion.description}
                      </p>

                      {/* Performance Levels */}
                      {criterion.performanceLevels && criterion.performanceLevels.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-100 text-[10px]">
                          {criterion.performanceLevels.map((lvl) => (
                            <div
                              key={lvl.level}
                              className="bg-zinc-50 p-2 rounded-lg border border-zinc-100"
                            >
                              <div className="font-bold text-zinc-700 flex justify-between">
                                <span>{lvl.level}</span>
                                <span className="text-purple-600">{lvl.points} pts</span>
                              </div>
                              <div className="text-zinc-500 line-clamp-2 mt-0.5">
                                {lvl.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button: Open Submissions */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    Deadline:{" "}
                    {new Date(selectedAssessment.deadline).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() =>
                    onOpenSubmissionsForAssessment(selectedAssessment.id)
                  }
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Review Submissions ({selectedAssessment.submissionCount})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-zinc-500">
              Select an assessment from the list to view its official details and rubric.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Assessments
