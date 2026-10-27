import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle,
  AlertCircle,
  FileText,
  Code,
  FileCode,
  Download,
  ExternalLink,
  BookOpen,
  Info,
  Clock,
  User,
  Sparkles,
  Lock,
  RotateCcw,
  Check,
  X,
  File,
} from "lucide-react"
import type {
  StudentSubmission,
  EvaluatorAssessment,
  EvaluationRecord,
  CriterionScore,
  RubricCriterion,
} from "./types"
import type { EvaluatorState } from "./data/evaluatorStorage"
import {
  saveSubmissionDraft,
  finalizeEvaluation,
} from "./data/evaluatorStorage"
import { StatusBadge, TypeBadge } from "./components/StatusBadge"

interface EvaluationWorkspaceProps {
  submission: StudentSubmission
  assessment: EvaluatorAssessment
  state: EvaluatorState
  onSaveDraft: (subId: string, evaluation: EvaluationRecord) => void
  onSubmitEvaluation: (subId: string, evaluation: EvaluationRecord) => void
  onBackToSubmissions: () => void
  onNavigateSubmission: (direction: "prev" | "next") => void
  hasPrevSubmission: boolean
  hasNextSubmission: boolean
  onToast: (msg: string) => void
}

export function EvaluationWorkspace({
  submission,
  assessment,
  state,
  onSaveDraft,
  onSubmitEvaluation,
  onBackToSubmissions,
  onNavigateSubmission,
  hasPrevSubmission,
  hasNextSubmission,
  onToast,
}: EvaluationWorkspaceProps) {
  // Center Viewer File Tab
  const [activeFileId, setActiveFileId] = useState<string>(
    submission.files[0]?.id || "questions"
  )

  // Grading form state initialized from draftEvaluation OR finalizedEvaluation OR defaults
  const existingEval = submission.draftEvaluation || submission.finalizedEvaluation

  const [criterionScores, setCriterionScores] = useState<Record<string, number>>(
    () => {
      const initial: Record<string, number> = {}
      if (existingEval?.criterionScores) {
        existingEval.criterionScores.forEach((cs) => {
          initial[cs.criterionId] = cs.awardedMarks
        })
      }
      return initial
    }
  )

  const [criterionFeedbacks, setCriterionFeedbacks] = useState<
    Record<string, string>
  >(() => {
    const initial: Record<string, string> = {}
    if (existingEval?.criterionScores) {
      existingEval.criterionScores.forEach((cs) => {
        initial[cs.criterionId] = cs.feedback || ""
      })
    }
    return initial
  })

  // Subjective Question-level scores for Quizzes / Midterm Exams
  const [questionScores, setQuestionScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    if (existingEval?.questionScores) {
      return existingEval.questionScores
    }
    if (submission.questionAnswers) {
      submission.questionAnswers.forEach((q) => {
        if (q.awardedMarks !== undefined) {
          initial[q.id] = q.awardedMarks
        }
      })
    }
    return initial
  })

  const [overallFeedback, setOverallFeedback] = useState<string>(
    existingEval?.overallFeedback || ""
  )
  const [strengths, setStrengths] = useState<string>(
    existingEval?.strengths || ""
  )
  const [areasForImprovement, setAreasForImprovement] = useState<string>(
    existingEval?.areasForImprovement || ""
  )
  const [suggestions, setSuggestions] = useState<string>(
    existingEval?.suggestions || ""
  )

  // Dirty state tracking to prevent accidental data loss
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false)
  const [pendingNavigationAction, setPendingNavigationAction] = useState<
    (() => void) | null
  >(null)

  // Final submission confirmation dialog
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(
    existingEval?.lastSavedAt || null
  )

  // Sync state when submission changes
  useEffect(() => {
    const current = submission.draftEvaluation || submission.finalizedEvaluation
    const initialScores: Record<string, number> = {}
    const initialFb: Record<string, string> = {}
    if (current?.criterionScores) {
      current.criterionScores.forEach((cs) => {
        initialScores[cs.criterionId] = cs.awardedMarks
        initialFb[cs.criterionId] = cs.feedback || ""
      })
    }
    setCriterionScores(initialScores)
    setCriterionFeedbacks(initialFb)

    const initialQ: Record<string, number> = {}
    if (current?.questionScores) {
      Object.assign(initialQ, current.questionScores)
    } else if (submission.questionAnswers) {
      submission.questionAnswers.forEach((q) => {
        if (q.awardedMarks !== undefined) {
          initialQ[q.id] = q.awardedMarks
        }
      })
    }
    setQuestionScores(initialQ)

    setOverallFeedback(current?.overallFeedback || "")
    setStrengths(current?.strengths || "")
    setAreasForImprovement(current?.areasForImprovement || "")
    setSuggestions(current?.suggestions || "")
    setLastSavedTimestamp(current?.lastSavedAt || null)
    setActiveFileId(submission.files[0]?.id || "questions")
    setIsDirty(false)
    setValidationErrors([])
  }, [submission.id])

  // Calculate Running Total
  const { totalMarksAwarded, maxPossibleMarks, percentageScore, letterGrade } =
    useMemo(() => {
      let total = 0
      const isQuizOrExamWithQuestions =
        submission.questionAnswers && submission.questionAnswers.length > 0

      if (isQuizOrExamWithQuestions) {
        // Sum question scores
        submission.questionAnswers?.forEach((q) => {
          total += questionScores[q.id] || 0
        })
      } else {
        // Sum rubric criteria
        assessment.rubric.criteria.forEach((c) => {
          total += criterionScores[c.id] || 0
        })
      }

      const max = assessment.maxMarks
      const pct = max > 0 ? Math.round((total / max) * 100) : 0

      let grade = "F"
      if (pct >= 90) grade = "A+"
      else if (pct >= 85) grade = "A"
      else if (pct >= 80) grade = "A-"
      else if (pct >= 75) grade = "B+"
      else if (pct >= 70) grade = "B"
      else if (pct >= 60) grade = "C"
      else if (pct >= 50) grade = "D"

      return {
        totalMarksAwarded: total,
        maxPossibleMarks: max,
        percentageScore: pct,
        letterGrade: grade,
      }
    }, [
      criterionScores,
      questionScores,
      assessment,
      submission.questionAnswers,
    ])

  // Handle score change with validation
  const handleCriterionScoreChange = (criterionId: string, val: string, maxMarks: number) => {
    setIsDirty(true)
    const num = parseFloat(val)
    if (isNaN(num)) {
      setCriterionScores((prev) => {
        const next = { ...prev }
        delete next[criterionId]
        return next
      })
      return
    }
    // Cap between 0 and maxMarks
    const clamped = Math.max(0, Math.min(maxMarks, num))
    setCriterionScores((prev) => ({ ...prev, [criterionId]: clamped }))
  }

  const handleQuestionScoreChange = (qId: string, val: string, maxMarks: number) => {
    setIsDirty(true)
    const num = parseFloat(val)
    if (isNaN(num)) {
      setQuestionScores((prev) => {
        const next = { ...prev }
        delete next[qId]
        return next
      })
      return
    }
    const clamped = Math.max(0, Math.min(maxMarks, num))
    setQuestionScores((prev) => ({ ...prev, [qId]: clamped }))
  }

  // Construct Evaluation Record
  const buildEvaluationRecord = (status: "Draft" | "Evaluated"): EvaluationRecord => {
    const scoresArray: CriterionScore[] = assessment.rubric.criteria.map((c) => ({
      criterionId: c.id,
      criterionName: c.name,
      awardedMarks: criterionScores[c.id] || 0,
      maxMarks: c.maxMarks,
      feedback: criterionFeedbacks[c.id] || "",
    }))

    return {
      id: `eval-${submission.id}-${Date.now()}`,
      submissionId: submission.id,
      assessmentId: assessment.id,
      evaluatorId: "eval-01",
      evaluatorName: "Dr. Alistair Vance",
      timestamp: new Date().toISOString(),
      status,
      criterionScores: scoresArray,
      questionScores,
      totalAwardedMarks: totalMarksAwarded,
      maxMarks: maxPossibleMarks,
      overallFeedback,
      strengths,
      areasForImprovement,
      suggestions,
      lastSavedAt: new Date().toISOString(),
      releaseStatus: "Awaiting Release",
    }
  }

  // Save Draft Action
  const handleSaveDraft = () => {
    const draftRecord = buildEvaluationRecord("Draft")
    onSaveDraft(submission.id, draftRecord)
    setIsDirty(false)
    setLastSavedTimestamp(new Date().toLocaleTimeString())
    onToast(`Draft saved for ${submission.studentName}! Total: ${totalMarksAwarded}/${maxPossibleMarks}`)
  }

  // Validate before submission
  const validateForSubmission = (): boolean => {
    const errors: string[] = []

    const hasQuestions = submission.questionAnswers && submission.questionAnswers.length > 0

    if (hasQuestions) {
      submission.questionAnswers?.forEach((q) => {
        if (questionScores[q.id] === undefined) {
          errors.push(`Question #${q.questionNumber} requires awarded marks.`)
        }
      })
    } else {
      assessment.rubric.criteria.forEach((c) => {
        if (criterionScores[c.id] === undefined) {
          errors.push(`Criterion "${c.name}" must be scored before final submission.`)
        }
      })
    }

    if (totalMarksAwarded < 0) {
      errors.push("Total marks cannot be negative.")
    }
    if (totalMarksAwarded > maxPossibleMarks) {
      errors.push(`Total marks (${totalMarksAwarded}) exceed maximum of ${maxPossibleMarks}.`)
    }

    if (!overallFeedback.trim()) {
      errors.push("Overall feedback must be provided before final evaluation.")
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleOpenConfirmSubmit = () => {
    if (validateForSubmission()) {
      setShowConfirmModal(true)
    } else {
      onToast("Please correct the validation errors before submitting.")
    }
  }

  const handleConfirmFinalSubmit = () => {
    const finalRecord = buildEvaluationRecord("Evaluated")
    onSubmitEvaluation(submission.id, finalRecord)
    setIsDirty(false)
    setShowConfirmModal(false)
    onToast(`Evaluation finalized for ${submission.studentName} (${totalMarksAwarded}/${maxPossibleMarks} - Grade ${letterGrade}). Result queued for Admin release.`)
  }

  // Safe navigation with dirty warning
  const requestNavigation = (action: () => void) => {
    if (isDirty) {
      setPendingNavigationAction(() => action)
      setShowUnsavedModal(true)
    } else {
      action()
    }
  }

  // Active file for viewer
  const activeFile = submission.files.find((f) => f.id === activeFileId)

  return (
    <div className="evaluator-workspace flex flex-col h-[calc(100vh-140px)] min-h-[640px] bg-white rounded-3xl border border-zinc-200/90 shadow-lg overflow-hidden">
      {/* Workspace Top Toolbar */}
      <div className="workspace-header bg-zinc-900 text-white px-5 py-3 flex items-center justify-between gap-4 shrink-0 flex-wrap">
        {/* Left: Back & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => requestNavigation(onBackToSubmissions)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Return to Submissions list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/70 truncate max-w-[180px]">
                {assessment.title}
              </span>
              <span className="text-white/40">/</span>
              <span className="text-xs font-bold text-purple-300">
                {submission.studentName} ({submission.studentRoll})
              </span>
            </div>
            <div className="text-[11px] text-white/50 flex items-center gap-2">
              <span>Version: {submission.version}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">
                Status: {submission.status}
              </span>
              {lastSavedTimestamp && (
                <>
                  <span>•</span>
                  <span className="text-white/40">
                    Saved: {lastSavedTimestamp}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Running Marks Badge */}
        <div className="flex items-center gap-3 bg-white/10 px-4 py-1.5 rounded-2xl border border-white/10">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-white/60 tracking-wider">
              Awarded Total
            </div>
            <div className="text-lg font-black text-white leading-tight">
              {totalMarksAwarded}{" "}
              <span className="text-xs font-medium text-white/60">
                / {maxPossibleMarks}
              </span>
            </div>
          </div>
          <div className="h-6 w-px bg-white/20" />
          <div className="text-center px-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-200 border border-purple-400/40">
              Grade {letterGrade} ({percentageScore}%)
            </span>
          </div>
        </div>

        {/* Right: Prev/Next Submission & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Navigation Between Submissions */}
          <div className="flex items-center bg-white/10 rounded-xl p-0.5 mr-2">
            <button
              type="button"
              disabled={!hasPrevSubmission}
              onClick={() => requestNavigation(() => onNavigateSubmission("prev"))}
              className="p-1.5 rounded-lg text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
              title="Previous Submission (Alt + Left)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-white/50 px-1 font-mono">NAV</span>
            <button
              type="button"
              disabled={!hasNextSubmission}
              onClick={() => requestNavigation(() => onNavigateSubmission("next"))}
              className="p-1.5 rounded-lg text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
              title="Next Submission (Alt + Right)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Save Draft */}
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs inline-flex items-center gap-1.5 border border-white/20 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          {/* Submit Final Evaluation */}
          <button
            type="button"
            onClick={handleOpenConfirmSubmit}
            className="px-4 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Submit Evaluation</span>
          </button>
        </div>
      </div>

      {/* 3-Section Workspace Body */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-zinc-200 overflow-hidden">
        {/* ========================================================
            SECTION 1 (LEFT): SUBMISSION INFORMATION (3 Cols)
            ======================================================== */}
        <div className="md:col-span-3 h-full overflow-y-auto no-scrollbar p-4 bg-zinc-50/50 space-y-4 text-xs">
          {/* Student Profile Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={submission.studentAvatar}
                alt={submission.studentName}
                className="w-10 h-10 rounded-full object-cover border border-zinc-200"
              />
              <div className="min-w-0">
                <div className="font-bold text-zinc-900 text-sm truncate">
                  {submission.studentName}
                </div>
                <div className="text-zinc-500 text-[11px] font-mono">
                  Roll: {submission.studentRoll}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] pt-2 border-t border-zinc-100 text-zinc-600">
              <div className="flex justify-between">
                <span className="text-zinc-400">Course:</span>
                <span className="font-semibold text-zinc-800 truncate max-w-[140px]">
                  {submission.courseCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Submitted:</span>
                <span className="font-semibold text-zinc-800">
                  {new Date(submission.submissionDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Attempts:</span>
                <span className="font-semibold text-zinc-800">
                  Attempt #{submission.previousAttemptsCount ? submission.previousAttemptsCount + 1 : 1}
                </span>
              </div>
              {submission.projectRepoUrl && (
                <div className="pt-2">
                  <a
                    href={submission.projectRepoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-1.5 px-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold inline-flex items-center justify-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View GitHub Repository</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Assessment Instructions Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
            <h4 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <Info className="w-3.5 h-3.5 text-purple-600" />
              <span>Assessment Directive</span>
            </h4>
            <p className="text-zinc-600 leading-relaxed text-[11px]">
              {assessment.instructions}
            </p>
          </div>

          {/* Submitted Files List */}
          <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2.5">
            <h4 className="font-bold text-zinc-900 text-xs flex items-center justify-between">
              <span>Submitted Artifacts</span>
              <span className="text-[10px] text-zinc-400 font-normal">
                {submission.files.length} files
              </span>
            </h4>

            {/* Questions Tab (if exam/quiz) */}
            {submission.questionAnswers && submission.questionAnswers.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveFileId("questions")}
                className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  activeFileId === "questions"
                    ? "bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-xs"
                    : "bg-zinc-50 border-zinc-200/70 hover:bg-zinc-100 text-zinc-700 font-medium"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">Question Responses</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">
                  {submission.questionAnswers.length} Qs
                </span>
              </button>
            )}

            {/* File Items */}
            {submission.files.map((file) => {
              const isActive = activeFileId === file.id
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setActiveFileId(file.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? "bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-xs"
                      : "bg-zinc-50 border-zinc-200/70 hover:bg-zinc-100 text-zinc-700 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {file.type === "code" ? (
                      <Code className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    )}
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 shrink-0">
                    {file.size}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Reassessment History Banner (if contested) */}
          {submission.reassessmentRequest && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-[11px] text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Reassessment Request Active</span>
              </div>
              <p className="leading-snug text-rose-800">
                Student contesting original grade of {submission.reassessmentRequest.originalMarks}/{submission.maxMarks}.
              </p>
              <div className="text-[10px] italic pt-1 text-rose-700">
                "{submission.reassessmentRequest.reason}"
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            SECTION 2 (CENTER): SUBMISSION VIEWER (5 Cols)
            ======================================================== */}
        <div className="md:col-span-5 h-full flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
          {/* Viewer Tab Bar */}
          <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 font-mono text-zinc-300 truncate">
              {activeFileId === "questions" ? (
                <>
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Question_Responses.json</span>
                </>
              ) : activeFile?.type === "code" ? (
                <>
                  <Code className="w-3.5 h-3.5 text-blue-400" />
                  <span>{activeFile?.name}</span>
                  <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                    {activeFile?.language}
                  </span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span>{activeFile?.name}</span>
                  <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                    PDF Document
                  </span>
                </>
              )}
            </div>

            <div className="text-[11px] text-zinc-400">
              Interactive Preview Mode
            </div>
          </div>

          {/* Viewer Content Canvas */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 font-mono text-xs select-text">
            {activeFileId === "questions" && submission.questionAnswers ? (
              /* Question by Question Answer Viewer */
              <div className="space-y-6 font-sans">
                {submission.questionAnswers.map((qa) => (
                  <div
                    key={qa.id}
                    className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-400">
                        Question #{qa.questionNumber} ({qa.questionType.replace("_", " ")})
                      </span>
                      <span className="font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                        Max {qa.maxMarks} Marks
                      </span>
                    </div>

                    <div className="text-zinc-200 text-xs font-semibold leading-relaxed">
                      {qa.questionText}
                    </div>

                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Student Answer:
                      </div>
                      <div className="text-xs text-emerald-300 font-mono whitespace-pre-wrap leading-relaxed">
                        {qa.studentAnswer}
                      </div>
                    </div>

                    {qa.correctAnswer && (
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <span className="font-bold text-zinc-500">Official Key:</span>
                        <span className="text-zinc-300">{qa.correctAnswer}</span>
                      </div>
                    )}

                    {/* Question score input right in viewer */}
                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                      <span className="text-xs text-zinc-400">
                        Awarded Marks:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={qa.maxMarks}
                          value={questionScores[qa.id] ?? ""}
                          onChange={(e) =>
                            handleQuestionScoreChange(qa.id, e.target.value, qa.maxMarks)
                          }
                          className="w-16 px-2 py-1 text-center bg-zinc-800 text-white font-bold rounded-lg border border-zinc-700 text-xs focus:ring-1 focus:ring-purple-400 focus:outline-none"
                        />
                        <span className="text-xs text-zinc-500">/ {qa.maxMarks}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeFile?.type === "code" ? (
              /* Code Viewer with simulated syntax lines */
              <div className="space-y-0.5 text-zinc-300 text-xs leading-5">
                {activeFile.content ? (
                  activeFile.content.split("\n").map((line, idx) => (
                    <div key={idx} className="flex hover:bg-zinc-900/60 px-1 rounded">
                      <span className="w-10 text-zinc-600 select-none shrink-0 text-right pr-4 font-mono text-[11px]">
                        {idx + 1}
                      </span>
                      <span className="whitespace-pre overflow-x-auto text-zinc-200">
                        {line}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-zinc-500 py-10 text-center">
                    Empty file or no content available.
                  </div>
                )}
              </div>
            ) : activeFile?.type === "pdf" ? (
              /* PDF Simulation Viewer */
              <div className="space-y-4 font-sans text-zinc-200">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-inner space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs text-zinc-400">
                    <span>Document Viewer: {activeFile.name}</span>
                    <span>Pages: 1 of {activeFile.pageCount || 1}</span>
                  </div>
                  <div className="text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap font-sans">
                    {activeFile.content}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-zinc-500 font-sans">
                <File className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Preview format not supported for this file type.</p>
                <p className="text-xs text-zinc-600 mt-1">
                  File name: {activeFile?.name || "No file selected"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            SECTION 3 (RIGHT): GRADING PANEL (4 Cols)
            ======================================================== */}
        <div className="md:col-span-4 h-full overflow-y-auto no-scrollbar p-5 bg-white space-y-5 text-xs">
          {/* Panel Header */}
          <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">
                Official Grading Panel
              </h3>
              <p className="text-[11px] text-zinc-400">
                Scoring based on {assessment.rubric.name}
              </p>
            </div>
            <div className="text-right">
              <span className="font-black text-purple-700 text-sm">
                {totalMarksAwarded}/{maxPossibleMarks}
              </span>
            </div>
          </div>

          {/* Validation Errors Notice (if any) */}
          {validationErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
              <div className="font-bold text-red-800 flex items-center gap-1.5 text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <span>Required Validation Checklist:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-red-700 space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Rubric Criteria Inputs */}
          <div className="space-y-4">
            <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px] text-zinc-400">
              Criteria Evaluation
            </h4>

            {assessment.rubric.criteria.map((criterion, idx) => {
              const currentScore = criterionScores[criterion.id] ?? ""
              const hasScore = criterionScores[criterion.id] !== undefined
              const isExceeded = (criterionScores[criterion.id] || 0) > criterion.maxMarks

              return (
                <div
                  key={criterion.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                    hasScore
                      ? "bg-purple-50/20 border-purple-200"
                      : "bg-zinc-50/60 border-zinc-200/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-900 text-xs">
                        {idx + 1}. {criterion.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 line-clamp-1">
                        {criterion.description}
                      </div>
                    </div>

                    {/* Numeric Score Input */}
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={criterion.maxMarks}
                        value={currentScore}
                        onChange={(e) =>
                          handleCriterionScoreChange(
                            criterion.id,
                            e.target.value,
                            criterion.maxMarks
                          )
                        }
                        placeholder="0"
                        className={`w-14 px-2 py-1 text-center font-bold rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 ${
                          isExceeded
                            ? "bg-red-50 text-red-700 border-red-300"
                            : "bg-white text-zinc-900 border-zinc-300"
                        }`}
                      />
                      <span className="text-[11px] font-semibold text-zinc-400">
                        / {criterion.maxMarks}
                      </span>
                    </div>
                  </div>

                  {/* Performance Levels Quick Buttons */}
                  {criterion.performanceLevels && (
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      {criterion.performanceLevels.map((lvl) => (
                        <button
                          key={lvl.level}
                          type="button"
                          onClick={() =>
                            handleCriterionScoreChange(
                              criterion.id,
                              lvl.points.toString(),
                              criterion.maxMarks
                            )
                          }
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                            criterionScores[criterion.id] === lvl.points
                              ? "bg-purple-600 text-white"
                              : "bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200"
                          }`}
                          title={lvl.description}
                        >
                          {lvl.level} ({lvl.points}p)
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Criterion-specific Feedback Input */}
                  <input
                    type="text"
                    value={criterionFeedbacks[criterion.id] || ""}
                    onChange={(e) => {
                      setIsDirty(true)
                      setCriterionFeedbacks((prev) => ({
                        ...prev,
                        [criterion.id]: e.target.value,
                      }))
                    }}
                    placeholder={`Notes for ${criterion.name}...`}
                    className="w-full text-[11px] px-2.5 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                </div>
              )
            })}
          </div>

          {/* Qualitative Feedback Section */}
          <div className="space-y-3 pt-3 border-t border-zinc-100">
            <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px] text-zinc-400">
              Evaluator Feedback
            </h4>

            {/* Overall Feedback */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 flex items-center gap-1">
                <span>Overall Feedback</span>
                <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={overallFeedback}
                onChange={(e) => {
                  setIsDirty(true)
                  setOverallFeedback(e.target.value)
                }}
                placeholder="Detailed qualitative feedback synthesizing the student's submission..."
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {/* Strengths */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-emerald-800">
                Key Strengths
              </label>
              <input
                type="text"
                value={strengths}
                onChange={(e) => {
                  setIsDirty(true)
                  setStrengths(e.target.value)
                }}
                placeholder="e.g. Robust concurrency safety, clear diagrams..."
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            </div>

            {/* Areas for Improvement */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-amber-800">
                Areas for Improvement
              </label>
              <input
                type="text"
                value={areasForImprovement}
                onChange={(e) => {
                  setIsDirty(true)
                  setAreasForImprovement(e.target.value)
                }}
                placeholder="e.g. Expand automated unit test coverage..."
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            </div>

            {/* Suggestions */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-blue-800">
                Actionable Next Steps & Suggestions
              </label>
              <input
                type="text"
                value={suggestions}
                onChange={(e) => {
                  setIsDirty(true)
                  setSuggestions(e.target.value)
                }}
                placeholder="e.g. Recommend studying Raft log compaction RFC..."
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            </div>
          </div>

          {/* Action Buttons at bottom of panel */}
          <div className="pt-4 border-t border-zinc-100 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex-1 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              onClick={handleOpenConfirmSubmit}
              className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Finalize & Submit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-zinc-900">
                Confirm Evaluation Submission
              </h3>
              <p className="text-xs text-zinc-500">
                You are about to submit the finalized evaluation for:
              </p>
              <div className="font-bold text-zinc-800 text-sm pt-1">
                {submission.studentName} ({submission.studentRoll})
              </div>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Assessment:</span>
                <span className="font-semibold text-zinc-800">{assessment.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Marks Awarded:</span>
                <span className="font-bold text-purple-700">
                  {totalMarksAwarded} / {maxPossibleMarks} ({percentageScore}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Letter Grade:</span>
                <span className="font-bold text-zinc-800">{letterGrade}</span>
              </div>
              <div className="text-[11px] text-zinc-400 italic pt-1 border-t border-zinc-200">
                Institutional Rule: Finalized evaluations are placed in "Awaiting Release" state for Exam Board / Admin verification before student publication.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 font-bold text-zinc-700 hover:bg-zinc-100 text-xs transition-colors cursor-pointer"
              >
                Back to Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmFinalSubmit}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 font-bold text-white text-xs shadow-xs transition-colors cursor-pointer"
              >
                Confirm Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Guard Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-zinc-900">
                You Have Unsaved Changes
              </h3>
              <p className="text-xs text-zinc-500">
                You have modified criteria marks or feedback that have not been saved as a draft.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleSaveDraft()
                  setShowUnsavedModal(false)
                  if (pendingNavigationAction) pendingNavigationAction()
                }}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 font-bold text-white text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft & Proceed</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDirty(false)
                  setShowUnsavedModal(false)
                  if (pendingNavigationAction) pendingNavigationAction()
                }}
                className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 font-bold text-zinc-700 text-xs transition-colors cursor-pointer"
              >
                Discard Changes & Leave
              </button>
              <button
                type="button"
                onClick={() => setShowUnsavedModal(false)}
                className="w-full py-2 rounded-xl text-zinc-400 hover:text-zinc-600 text-xs transition-colors cursor-pointer font-semibold"
              >
                Keep Grading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EvaluationWorkspace
