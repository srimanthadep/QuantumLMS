import React, { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  Copy,
  Maximize2,
  Minimize2,
  Sliders,
  HelpCircle,
  Award,
  Zap,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Avatar,
  Progress,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import AnimatedNumber from "@/components/motion/AnimatedNumber"
import { StatusBadge, TypeBadge } from "./components/StatusBadge"
import type {
  StudentSubmission,
  EvaluatorAssessment,
  EvaluationRecord,
  CriterionScore,
  RubricCriterion,
} from "./types"
import type { EvaluatorState } from "./data/evaluatorStorage"

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

const QUICK_TAGS = [
  "Well-structured implementation",
  "Clean code & comments",
  "Handles edge cases thoroughly",
  "Optimal time/space complexity",
  "Good test coverage",
  "Minor syntax inconsistency",
  "Missing exception handling",
  "Consider modularizing helper functions",
]

function computeGradeLetter(pct: number): string {
  if (pct >= 93) return "A+"
  if (pct >= 85) return "A"
  if (pct >= 75) return "B+"
  if (pct >= 65) return "B"
  if (pct >= 50) return "C"
  return "F"
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
    submission.files[0]?.id || (submission.questionAnswers?.length ? "questions" : "overview")
  )
  const [isFullscreenViewer, setIsFullscreenViewer] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [showModelAnswers, setShowModelAnswers] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)

  // Grading form state initialized from draftEvaluation OR finalizedEvaluation OR defaults
  const existingEval = submission.draftEvaluation || submission.finalizedEvaluation

  const [criterionScores, setCriterionScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    if (existingEval?.criterionScores) {
      existingEval.criterionScores.forEach((cs) => {
        initial[cs.criterionId] = cs.awardedMarks
      })
    } else {
      // Default to proficient level or 80% marks
      assessment.rubric?.criteria?.forEach((crit) => {
        const prof = crit.performanceLevels?.find((l) => l.level === "Proficient")
        initial[crit.id] = prof ? prof.points : Math.round(crit.maxMarks * 0.8)
      })
    }
    return initial
  })

  const [criterionFeedbacks, setCriterionFeedbacks] = useState<Record<string, string>>(() => {
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
        } else {
          initial[q.id] = q.maxMarks
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

  // Re-sync if submission changes
  useEffect(() => {
    const nextEval = submission.draftEvaluation || submission.finalizedEvaluation
    const initialCrit: Record<string, number> = {}
    const initialFeed: Record<string, string> = {}

    if (nextEval?.criterionScores) {
      nextEval.criterionScores.forEach((cs) => {
        initialCrit[cs.criterionId] = cs.awardedMarks
        initialFeed[cs.criterionId] = cs.feedback || ""
      })
    } else {
      assessment.rubric?.criteria?.forEach((crit) => {
        const prof = crit.performanceLevels?.find((l) => l.level === "Proficient")
        initialCrit[crit.id] = prof ? prof.points : Math.round(crit.maxMarks * 0.8)
      })
    }
    setCriterionScores(initialCrit)
    setCriterionFeedbacks(initialFeed)

    setOverallFeedback(nextEval?.overallFeedback || "")
    setStrengths(nextEval?.strengths || "")
    setAreasForImprovement(nextEval?.areasForImprovement || "")

    if (submission.files?.[0]) {
      setActiveFileId(submission.files[0].id)
    } else if (submission.questionAnswers?.length) {
      setActiveFileId("questions")
    }
  }, [submission, assessment])

  // Total Marks Calculation
  const totalAwardedMarks = useMemo(() => {
    if (submission.questionAnswers && submission.questionAnswers.length > 0) {
      return Object.values(questionScores).reduce((acc, curr) => acc + (curr || 0), 0)
    }
    return Object.values(criterionScores).reduce((acc, curr) => acc + (curr || 0), 0)
  }, [criterionScores, questionScores, submission.questionAnswers])

  const maxTotalMarks = assessment.maxMarks || 100
  const scorePercentage = Math.round((totalAwardedMarks / Math.max(1, maxTotalMarks)) * 100)
  const gradeLetter = computeGradeLetter(scorePercentage)

  // Selected file
  const activeFile = useMemo(() => {
    return submission.files.find((f) => f.id === activeFileId)
  }, [submission.files, activeFileId])

  // Performance level click handler
  const handleSelectLevel = (criterionId: string, points: number) => {
    setCriterionScores((prev) => ({
      ...prev,
      [criterionId]: points,
    }))
  }

  // Quick feedback tag click handler
  const handleAppendTag = (criterionId: string, tag: string) => {
    setCriterionFeedbacks((prev) => {
      const current = prev[criterionId] || ""
      if (current.includes(tag)) return prev
      return {
        ...prev,
        [criterionId]: current ? `${current}. ${tag}` : tag,
      }
    })
  }

  // Build Evaluation Record
  const buildEvaluationRecord = (status: "Draft" | "Evaluated"): EvaluationRecord => {
    const cScores: CriterionScore[] = (assessment.rubric?.criteria || []).map((crit) => ({
      criterionId: crit.id,
      criterionName: crit.name,
      awardedMarks: criterionScores[crit.id] ?? 0,
      maxMarks: crit.maxMarks,
      feedback: criterionFeedbacks[crit.id] || "",
    }))

    return {
      id: existingEval?.id || `eval-${Date.now()}`,
      submissionId: submission.id,
      assessmentId: assessment.id,
      evaluatorId: state.settings.profile.id,
      evaluatorName: state.settings.profile.name,
      timestamp: new Date().toISOString(),
      status,
      criterionScores: cScores,
      questionScores,
      totalAwardedMarks,
      maxMarks: maxTotalMarks,
      overallFeedback,
      strengths,
      areasForImprovement,
      suggestions: areasForImprovement,
      lastSavedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      completedAt: status === "Evaluated" ? new Date().toISOString() : undefined,
      releaseStatus: status === "Evaluated" ? "Released" : "Draft",
    }
  }

  // Save Draft
  const handleSaveDraftClick = () => {
    const record = buildEvaluationRecord("Draft")
    onSaveDraft(submission.id, record)
    onToast(`Draft saved for ${submission.studentName} (${totalAwardedMarks}/${maxTotalMarks} pts).`)
  }

  // Finalize Evaluation
  const handleSubmitClick = () => {
    const record = buildEvaluationRecord("Evaluated")
    onSubmitEvaluation(submission.id, record)
    onToast(`Evaluation published for ${submission.studentName}! Grade: ${gradeLetter} (${totalAwardedMarks}/${maxTotalMarks})`)
  }

  // AI Feedback Generator
  const handleGenerateAiFeedback = () => {
    setAiGenerating(true)
    setTimeout(() => {
      setAiGenerating(false)
      const autoStrengths = `Demonstrates strong mastery of ${assessment.title}. Code design adheres to clean modular principles, and the core algorithms perform efficiently.`
      const autoImprovement = `Add deeper test assertions for edge cases and include inline typing annotations for production readiness.`
      const autoOverall = `Excellent submission overall! Awarded ${totalAwardedMarks}/${maxTotalMarks} points (${gradeLetter}). Keep up the meticulous engineering standard.`

      setStrengths(autoStrengths)
      setAreasForImprovement(autoImprovement)
      setOverallFeedback(autoOverall)
      onToast("AI feedback drafted based on current rubric criteria!")
    }, 600)
  }

  // Copy code helper
  const handleCopyCode = (codeText?: string) => {
    if (!codeText) return
    navigator.clipboard.writeText(codeText)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
    onToast("Code copied to clipboard.")
  }

  return (
    <div className="space-y-5">
      {/* 1. STUDIO TOP ACTION BAR */}
      <div className="sticky top-14 z-30 flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface/95 p-4 shadow-sm backdrop-blur-md md:flex-row md:items-center md:justify-between">
        {/* Left: Back & Student identity */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToSubmissions}
            className="cursor-pointer font-medium"
            title="Return to Queue"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>Queue</span>
          </Button>

          <div className="h-6 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <Avatar
              src={submission.studentAvatar}
              name={submission.studentName}
              size="md"
              className="ring-1 ring-border"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {submission.studentName}
                </h3>
                <span className="text-[11px] font-mono text-muted-foreground">
                  ({submission.studentRoll})
                </span>
                <StatusBadge status={submission.status} />
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-xs md:max-w-md">
                {assessment.title} · {assessment.course}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Stepper & Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stepper */}
          <div className="flex items-center rounded-lg border border-border bg-surface-2 p-0.5 text-xs mr-2">
            <button
              type="button"
              disabled={!hasPrevSubmission}
              onClick={() => onNavigateSubmission("prev")}
              className={`p-1.5 rounded transition-colors ${
                hasPrevSubmission ? "hover:bg-surface text-foreground cursor-pointer" : "opacity-40 cursor-not-allowed text-muted-foreground"
              }`}
              title="Previous Submission (Keyboard: [ )"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-mono text-[11px] font-semibold text-muted-foreground">
              Navigate
            </span>
            <button
              type="button"
              disabled={!hasNextSubmission}
              onClick={() => onNavigateSubmission("next")}
              className={`p-1.5 rounded transition-colors ${
                hasNextSubmission ? "hover:bg-surface text-foreground cursor-pointer" : "opacity-40 cursor-not-allowed text-muted-foreground"
              }`}
              title="Next Submission (Keyboard: ] )"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraftClick}
            className="cursor-pointer"
          >
            <Save className="h-3.5 w-3.5 text-primary" />
            <span>Save Draft</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmitClick}
            className="cursor-pointer font-bold shadow-xs hover:shadow-md transition-all"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Publish Grade ({totalAwardedMarks} pts)</span>
          </Button>
        </div>
      </div>

      {/* 2. RE-EVALUATION APPEAL NOTICE (IF APPLICABLE) */}
      {submission.reassessmentRequest && (
        <div className="rounded-2xl border border-danger/40 bg-gradient-to-r from-danger-soft/40 via-surface to-surface p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-danger-soft p-2.5 text-danger shrink-0">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-bold text-danger">
                  Student Formal Grade Appeal & Reassessment Request
                </h4>
                <Badge tone="danger" size="sm">
                  Requested on {submission.reassessmentRequest.requestDate}
                </Badge>
                <span className="text-xs font-semibold text-muted-foreground">
                  Original Score: {submission.reassessmentRequest.originalMarks} / {submission.reassessmentRequest.maxMarks}
                </span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed bg-surface/80 p-3 rounded-xl border border-danger/20 mt-1">
                <strong className="text-danger font-semibold">Student Reason:</strong> "{submission.reassessmentRequest.reason}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN SPLIT STUDIO LAYOUT (Left: Viewer, Right: Rubric Engine) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN (7 cols): Multi-File Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border/80 shadow-xs overflow-hidden">
            {/* Viewer Header / Tab bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-border bg-surface-2/60 px-4 py-2.5 gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {submission.files?.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setActiveFileId(file.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeFileId === file.id
                        ? "bg-surface text-primary shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface/60"
                    }`}
                  >
                    {file.type === "code" ? (
                      <Code className="h-3.5 w-3.5" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    <span>{file.name}</span>
                  </button>
                ))}

                {submission.questionAnswers && submission.questionAnswers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFileId("questions")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeFileId === "questions"
                        ? "bg-surface text-primary shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface/60"
                    }`}
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Questions ({submission.questionAnswers.length})</span>
                  </button>
                )}
              </div>

              {/* Viewer Tools */}
              <div className="flex items-center gap-1.5">
                {activeFile?.content && (
                  <button
                    type="button"
                    onClick={() => handleCopyCode(activeFile.content)}
                    className="p-1.5 rounded-md hover:bg-surface text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Copy Code"
                  >
                    {copiedCode ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}

                {activeFile?.url && (
                  <a
                    href={activeFile.url}
                    download
                    className="p-1.5 rounded-md hover:bg-surface text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Download File"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Viewer Content Body */}
            <CardContent className="p-0">
              {activeFileId === "questions" && submission.questionAnswers ? (
                /* Question-by-question view */
                <div className="divide-y divide-border/60 max-h-[640px] overflow-y-auto p-4 space-y-4">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-bold text-foreground">
                      Subjective Exam Questions & Student Answers
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowModelAnswers((v) => !v)}
                      className="text-xs text-primary font-semibold cursor-pointer"
                    >
                      {showModelAnswers ? "Hide Model Answers" : "Show Model Answers"}
                    </Button>
                  </div>

                  {submission.questionAnswers.map((q, idx) => (
                    <div key={q.id} className="pt-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-bold text-foreground">
                          Question {idx + 1} ({q.maxMarks} marks):
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground font-semibold">Award:</span>
                          <input
                            type="number"
                            min={0}
                            max={q.maxMarks}
                            value={questionScores[q.id] ?? q.maxMarks}
                            onChange={(e) => {
                              const val = Math.min(q.maxMarks, Math.max(0, Number(e.target.value) || 0))
                              setQuestionScores((prev) => ({ ...prev, [q.id]: val }))
                            }}
                            className="w-16 h-7 rounded-md border border-border bg-surface px-2 text-center text-xs font-bold text-foreground"
                          />
                          <span className="text-xs text-muted-foreground">/ {q.maxMarks}</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground bg-surface-2/40 p-2.5 rounded-lg border border-border/40 font-medium">
                        {q.questionText}
                      </p>

                      <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Student Response:
                        </span>
                        <p className="text-xs text-foreground font-mono leading-relaxed whitespace-pre-wrap">
                          {q.studentAnswer}
                        </p>
                      </div>

                      {showModelAnswers && q.correctAnswer && (
                        <div className="p-3 rounded-xl bg-success-soft/30 border border-success/30 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-success block">
                            Instructor Model Answer:
                          </span>
                          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                            {q.correctAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : activeFile?.type === "code" && activeFile.content ? (
                /* Code File Viewer with Line Numbers */
                <div className="relative max-h-[640px] overflow-y-auto bg-surface-2/80 font-mono text-xs">
                  <pre className="p-4 leading-relaxed text-foreground whitespace-pre-wrap select-text">
                    <code>{activeFile.content}</code>
                  </pre>
                </div>
              ) : (
                /* Document or PDF fallback */
                <div className="p-10 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-primary-soft text-primary flex items-center justify-center mx-auto">
                    <FileText className="h-7 w-7" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">
                    {activeFile?.name || "Student Document"}
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {activeFile?.size || "Formatted PDF"} · Ready for rubric evaluation.
                  </p>
                  {activeFile?.url && (
                    <Button variant="outline" size="sm" asChild className="cursor-pointer">
                      <a href={activeFile.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        <span>Open Document in Full Viewer</span>
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>

            {/* Links footer if repo exists */}
            {(submission.projectRepoUrl || submission.projectDemoUrl) && (
              <div className="flex flex-wrap items-center justify-between border-t border-border bg-surface-2/40 px-4 py-2.5 text-xs">
                <span className="text-muted-foreground font-semibold">Project Repositories:</span>
                <div className="flex items-center gap-2">
                  {submission.projectRepoUrl && (
                    <a
                      href={submission.projectRepoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary-text hover:text-primary font-semibold"
                    >
                      <Code className="h-3.5 w-3.5" />
                      <span>GitHub Repository</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {submission.projectDemoUrl && (
                    <a
                      href={submission.projectDemoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-success hover:text-success/80 font-semibold ml-2"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Live Production Deployment</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN (5 cols): Interactive Rubric Scoring Engine */}
        <div className="lg:col-span-5 space-y-5">
          {/* A. Live Score Summary Card with ProgressRing */}
          <Card className="border-border/80 shadow-xs bg-gradient-to-b from-surface to-surface-2/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Awarded Total
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-foreground tracking-tight">
                      <AnimatedNumber value={totalAwardedMarks} />
                    </span>
                    <span className="text-sm text-muted-foreground font-semibold">
                      / {maxTotalMarks} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge tone={scorePercentage >= 75 ? "success" : "warning"} className="font-bold">
                      Grade: {gradeLetter} ({scorePercentage}%)
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {scorePercentage >= 50 ? "Passing Grade" : "Needs Review"}
                    </span>
                  </div>
                </div>

                <ProgressRing
                  value={scorePercentage}
                  size={84}
                  thickness={8}
                  tone={scorePercentage >= 80 ? "success" : scorePercentage >= 60 ? "primary" : "warning"}
                  showValue={false}
                >
                  <div className="text-center">
                    <span className="text-lg font-black text-foreground">
                      <AnimatedNumber value={scorePercentage} />%
                    </span>
                  </div>
                </ProgressRing>
              </div>
            </CardContent>
          </Card>

          {/* B. Rubric Criteria Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                Official Evaluation Rubric
              </h3>
              <span className="text-xs text-muted-foreground">
                {assessment.rubric?.criteria?.length || 0} criteria
              </span>
            </div>

            {assessment.rubric?.criteria?.map((crit, idx) => {
              const currentScore = criterionScores[crit.id] ?? 0
              return (
                <Card key={crit.id} className="border-border/80 shadow-xs">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">
                            {idx + 1}
                          </span>
                          <CardTitle className="text-sm font-bold text-foreground">
                            {crit.name}
                          </CardTitle>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {crit.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-foreground">
                          {currentScore}
                        </span>
                        <span className="text-xs text-muted-foreground font-semibold">
                          {" "}/ {crit.maxMarks}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-1">
                    {/* Clickable Performance Levels */}
                    {crit.performanceLevels && crit.performanceLevels.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {crit.performanceLevels.map((lvl) => {
                          const isSelected = currentScore === lvl.points
                          return (
                            <button
                              key={lvl.level}
                              type="button"
                              onClick={() => handleSelectLevel(crit.id, lvl.points)}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? "border-primary bg-primary-soft text-primary-text font-bold shadow-xs scale-102"
                                  : "border-border bg-surface hover:bg-surface-2 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span className="text-[10px] uppercase font-bold tracking-wider">
                                {lvl.level}
                              </span>
                              <span className="text-xs font-black mt-0.5">
                                {lvl.points} pts
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Granular Slider for Fine-tuning */}
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-[11px] font-semibold text-muted-foreground w-12">
                        Fine-tune:
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={crit.maxMarks}
                        step={1}
                        value={currentScore}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          setCriterionScores((prev) => ({ ...prev, [crit.id]: val }))
                        }}
                        className="flex-1 h-1.5 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <span className="text-xs font-mono font-bold text-foreground w-8 text-right">
                        {currentScore}
                      </span>
                    </div>

                    {/* Quick Feedback Chips */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Quick Comments (click to append):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_TAGS.slice(idx * 2, idx * 2 + 3).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAppendTag(crit.id, tag)}
                            className="px-2 py-0.5 rounded-full border border-border bg-surface-2/60 text-[10px] font-medium text-foreground hover:bg-primary-soft hover:text-primary-text hover:border-primary-border transition-colors cursor-pointer"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Criterion Feedback Field */}
                    <textarea
                      rows={2}
                      value={criterionFeedbacks[crit.id] || ""}
                      onChange={(e) => {
                        const val = e.target.value
                        setCriterionFeedbacks((prev) => ({ ...prev, [crit.id]: val }))
                      }}
                      placeholder={`Constructive remarks for ${crit.name}...`}
                      className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* C. Overall Feedback & AI Draft Generator */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-foreground">
                Overall Comprehensive Feedback
              </CardTitle>

              <Button
                variant="outline"
                size="sm"
                disabled={aiGenerating}
                onClick={handleGenerateAiFeedback}
                className="text-xs text-primary font-semibold cursor-pointer"
              >
                <Sparkles className={`h-3.5 w-3.5 mr-1 ${aiGenerating ? "animate-spin" : ""}`} />
                <span>{aiGenerating ? "Synthesizing..." : "AI Feedback Assistant"}</span>
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Key Strengths
                </label>
                <textarea
                  rows={2}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="Highlight core competencies and commendable engineering execution..."
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Areas for Growth & Improvement
                </label>
                <textarea
                  rows={2}
                  value={areasForImprovement}
                  onChange={(e) => setAreasForImprovement(e.target.value)}
                  placeholder="Constructive recommendations, architecture refinements, testing gaps..."
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Final Evaluator Summary
                </label>
                <textarea
                  rows={2}
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  placeholder="Closing encouragement and official grade comments..."
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Grade will be released immediately to student portal.
                </span>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSubmitClick}
                  className="cursor-pointer font-bold shadow-xs hover:shadow-md transition-all"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>Submit & Release ({totalAwardedMarks} pts)</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default EvaluationWorkspace
