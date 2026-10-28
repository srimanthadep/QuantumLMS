import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { Icon } from "../../components/Icon"
import type {
  AssignmentData,
  QuizData,
  AssessmentQuestion,
  AssessmentAttempt,
} from "./studentTypes"
import {
  quizQuestionBanks,
  initialQuizAttempts,
  initialQuizzesList,
} from "./studentMockData"

interface AssignmentsPageProps {
  assignments: AssignmentData[]
  onSubmitAssignment: (id: string, repoUrl: string, comments: string) => void
  onToast: (msg: string) => void
  initialTab?: "assignments" | "quizzes"
  quizzes?: QuizData[]
  onCompleteQuiz?: (
    id: string,
    scoreStr: string,
    pct: number,
    attemptData?: AssessmentAttempt
  ) => void
  quizAttempts?: Record<string, AssessmentAttempt>
}

type QuizViewMode = "list" | "taking" | "review" | "locked"

// ============================================================================
// QUIZZES SECTION (Embedded Quiz Engine)
// ============================================================================
function QuizzesSection({
  quizzes = initialQuizzesList,
  onCompleteQuiz = () => {},
  onToast,
  quizAttempts = {},
}: {
  quizzes?: QuizData[]
  onCompleteQuiz?: (
    id: string,
    scoreStr: string,
    pct: number,
    attemptData?: AssessmentAttempt
  ) => void
  onToast: (msg: string) => void
  quizAttempts?: Record<string, AssessmentAttempt>
}) {
  const allAttempts = useMemo(() => {
    return { ...initialQuizAttempts, ...quizAttempts }
  }, [quizAttempts])

  const [viewMode, setViewMode] = useState<QuizViewMode>("list")
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null)
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"All" | "Active" | "Upcoming" | "Completed">("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingSyllabusQuiz, setViewingSyllabusQuiz] = useState<QuizData | null>(null)

  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [secondsLeft, setSecondsLeft] = useState<number>(0)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [submittedAttempt, setSubmittedAttempt] = useState<AssessmentAttempt | null>(null)
  const [takingStartTime, setTakingStartTime] = useState<number>(0)
  const [reviewFilter, setReviewFilter] = useState<"All" | "Correct" | "Incorrect" | "Unanswered">("All")

  const activeQuiz = useMemo(() => {
    if (!selectedQuizId) return null
    return quizzes.find((q) => q.id === selectedQuizId) || null
  }, [quizzes, selectedQuizId])

  const activeQuestions: AssessmentQuestion[] = useMemo(() => {
    if (!activeQuiz) return []
    if (activeQuiz.questions && activeQuiz.questions.length > 0) {
      return activeQuiz.questions
    }
    return quizQuestionBanks[activeQuiz.id] || []
  }, [activeQuiz])

  const activeAttempt: AssessmentAttempt | null = useMemo(() => {
    if (submittedAttempt) return submittedAttempt
    if (activeAttemptId && allAttempts[activeAttemptId]) {
      return allAttempts[activeAttemptId]
    }
    if (activeQuiz) {
      if (activeQuiz.latestAttemptId && allAttempts[activeQuiz.latestAttemptId]) {
        return allAttempts[activeQuiz.latestAttemptId]
      }
      if (allAttempts[activeQuiz.id]) {
        return allAttempts[activeQuiz.id]
      }
      const found = Object.values(allAttempts).find((a) => a.quizId === activeQuiz.id)
      if (found) return found
    }
    return null
  }, [submittedAttempt, activeAttemptId, allAttempts, activeQuiz])

  useEffect(() => {
    if (viewMode !== "taking" || submittedAttempt || secondsLeft <= 0) return

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleAutoSubmitOnTimeExpiry()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [viewMode, submittedAttempt, secondsLeft])

  const handleAutoSubmitOnTimeExpiry = () => {
    if (!activeQuiz || activeQuestions.length === 0) return
    onToast("Assessment time has elapsed. Submitting your responses automatically...")
    executeSubmission()
  }

  const handleStartAssessment = (quiz: QuizData) => {
    if (quiz.status === "Upcoming") {
      setSelectedQuizId(quiz.id)
      setViewMode("locked")
      return
    }

    setSelectedQuizId(quiz.id)
    setViewMode("taking")
    setCurrentQIndex(0)
    setSelectedAnswers({})
    setSubmittedAttempt(null)
    setIsSubmitModalOpen(false)
    setSecondsLeft(quiz.durationMinutes * 60)
    setTakingStartTime(Date.now())
  }

  const handleReviewAssessment = (quiz: QuizData, attemptIdOverride?: string) => {
    setSelectedQuizId(quiz.id)
    const attId =
      attemptIdOverride ||
      quiz.latestAttemptId ||
      Object.values(allAttempts).find((a) => a.quizId === quiz.id)?.id ||
      null
    setActiveAttemptId(attId)
    setReviewFilter("All")
    setViewMode("review")
  }

  const handleBackToList = () => {
    setViewMode("list")
    setSelectedQuizId(null)
    setActiveAttemptId(null)
    setSubmittedAttempt(null)
    setIsSubmitModalOpen(false)
  }

  const executeSubmission = () => {
    if (!activeQuiz || activeQuestions.length === 0) return

    let correctCount = 0
    activeQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        correctCount++
      }
    })

    const totalQuestions = activeQuestions.length
    const pct = Math.round((correctCount / totalQuestions) * 100)
    const scoreStr = `${correctCount}/${totalQuestions}`
    const isPassed = pct >= activeQuiz.passingPct
    const timeUsedSeconds = Math.max(1, Math.round((Date.now() - takingStartTime) / 1000))

    const newAttempt: AssessmentAttempt = {
      id: `att-${activeQuiz.id}-${Date.now()}`,
      quizId: activeQuiz.id,
      studentId: "std-srimanth",
      studentName: "Srimanth",
      attemptNumber: (activeQuiz.attemptsUsed || 0) + 1,
      startedAt: new Date(takingStartTime).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + " · " + new Date(takingStartTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      submittedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + " · " + new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      timeTakenSeconds: timeUsedSeconds,
      answers: { ...selectedAnswers },
      score: correctCount,
      maxScore: totalQuestions,
      scoreStr,
      pct,
      passed: isPassed,
      feedback: isPassed
        ? `Exemplary performance! You scored ${scoreStr} (${pct}%), satisfying the Quantum School of AI ${activeQuiz.passingPct}% threshold.`
        : `Assessment completed. You scored ${scoreStr} (${pct}%). Pass requirement is ${activeQuiz.passingPct}%. Review your answers to strengthen weak areas.`,
    }

    setSubmittedAttempt(newAttempt)
    setIsSubmitModalOpen(false)
    onCompleteQuiz(activeQuiz.id, scoreStr, pct, newAttempt)
    onToast(
      isPassed
        ? `Assessment submitted! You passed with ${scoreStr} (${pct}%) 🎉`
        : `Assessment submitted. Scored ${scoreStr} (${pct}%).`
    )
  }

  const handleSelectAnswer = (qIndex: number, optIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIndex]: optIndex,
    }))
  }

  const handleClearAnswer = (qIndex: number) => {
    setSelectedAnswers((prev) => {
      const copy = { ...prev }
      delete copy[qIndex]
      return copy
    })
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      if (filter !== "All" && q.status !== filter) return false
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        return (
          q.title.toLowerCase().includes(query) ||
          q.course.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [quizzes, filter, searchQuery])

  const answeredCount = Object.keys(selectedAnswers).length
  const unansweredCount = Math.max(0, activeQuestions.length - answeredCount)

  // VIEW 1: LOCKED
  if (viewMode === "locked" && activeQuiz) {
    return (
      <section className="panel p-6 border border-amber-200 bg-amber-50/50 rounded-2xl">
        <h3 className="text-xl font-bold text-zinc-900 mb-2">{activeQuiz.title}</h3>
        <p className="text-xs text-zinc-700 leading-relaxed mb-4">
          This evaluation opens on {activeQuiz.availableFrom || activeQuiz.dueDate}.
        </p>
        <button
          onClick={handleBackToList}
          className="px-4 py-2 rounded-full border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-white"
        >
          ← Return to Assessments
        </button>
      </section>
    )
  }

  // VIEW 2: REVIEW
  if (viewMode === "review" && activeQuiz && activeAttempt) {
    return (
      <div className="flex flex-col gap-4">
        <div className="panel p-4 bg-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-zinc-900">{activeQuiz.title} · Review</h3>
            <span className="text-xs text-zinc-500">Scored: {activeAttempt.scoreStr} ({activeAttempt.pct}%)</span>
          </div>
          <button
            onClick={handleBackToList}
            className="px-4 py-2 rounded-full bg-purple-700 text-white text-xs font-bold"
          >
            ← Return to Quizzes
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {activeQuestions.map((q, idx) => {
            const selected = activeAttempt.answers[idx]
            const isCorrect = selected === q.correctAnswer
            return (
              <div key={q.id} className={`panel p-4 border rounded-2xl ${isCorrect ? "border-emerald-200" : "border-rose-200"}`}>
                <h4 className="font-bold text-sm text-zinc-900 mb-2">{idx + 1}. {q.question}</h4>
                <div className="flex flex-col gap-1.5 text-xs mb-3">
                  {q.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className={`p-2.5 rounded-xl border ${
                        oIdx === q.correctAnswer
                          ? "bg-emerald-50 border-emerald-400 font-bold"
                          : oIdx === selected
                          ? "bg-rose-50 border-rose-400"
                          : "border-zinc-200"
                      }`}
                    >
                      {String.fromCharCode(65 + oIdx)}. {opt}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-600 bg-purple-50 p-3 rounded-xl">{q.explanation}</p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // VIEW 3: TAKING
  if (viewMode === "taking" && activeQuiz) {
    if (submittedAttempt) {
      return (
        <section className="panel p-8 text-center max-w-xl mx-auto">
          <div className="text-3xl mb-2">{submittedAttempt.passed ? "🎉" : "📋"}</div>
          <h3 className="text-xl font-bold mb-1">
            {submittedAttempt.passed ? "Assessment Passed!" : "Assessment Completed"}
          </h3>
          <p className="text-sm font-bold text-purple-700 mb-4">
            Score: {submittedAttempt.scoreStr} ({submittedAttempt.pct}%)
          </p>
          <button
            onClick={handleBackToList}
            className="px-5 py-2 rounded-full bg-purple-700 text-white text-xs font-bold"
          >
            Back to Assessments List
          </button>
        </section>
      )
    }

    const currentQuestion = activeQuestions[currentQIndex]
    if (!currentQuestion) return null

    return (
      <div className="flex flex-col gap-4">
        <section className="panel p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-zinc-900">{activeQuiz.title}</h3>
            <span className="text-xs text-zinc-500">Question {currentQIndex + 1} of {activeQuestions.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800">
              ⏱ {formatTime(secondsLeft)}
            </span>
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-1.5 rounded-full bg-purple-700 text-white text-xs font-bold"
            >
              Submit Test
            </button>
          </div>
        </section>

        <section className="panel p-6">
          <h4 className="font-bold text-sm text-zinc-900 mb-4">{currentQuestion.question}</h4>
          <div className="flex flex-col gap-2.5 mb-6">
            {currentQuestion.options.map((opt, optIdx) => {
              const isSelected = selectedAnswers[currentQIndex] === optIdx
              return (
                <label
                  key={optIdx}
                  onClick={() => handleSelectAnswer(currentQIndex, optIdx)}
                  className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-3 cursor-pointer ${
                    isSelected ? "border-purple-600 bg-purple-50 text-purple-950" : "border-zinc-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${currentQIndex}`}
                    checked={isSelected}
                    onChange={() => handleSelectAnswer(currentQIndex, optIdx)}
                    className="accent-purple-700"
                  />
                  <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                </label>
              )
            })}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
            <button
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold disabled:opacity-40"
            >
              ← Previous
            </button>
            {currentQIndex < activeQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentQIndex((prev) => prev + 1)}
                className="px-5 py-2 rounded-full bg-black text-white text-xs font-bold"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-6 py-2 rounded-full bg-purple-700 text-white text-xs font-bold"
              >
                Finish & Submit
              </button>
            )}
          </div>
        </section>

        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full">
              <h3 className="font-bold text-base text-zinc-900 mb-2">Submit Assessment?</h3>
              <p className="text-xs text-zinc-600 mb-4">
                You answered {answeredCount} of {activeQuestions.length} questions. Confirm submission?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={executeSubmission}
                  className="px-5 py-2 rounded-full bg-purple-700 text-white text-xs font-bold"
                >
                  Confirm Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // VIEW 4: LIST
  return (
    <div className="flex flex-col gap-4">
      <div className="panel p-3 bg-white border border-zinc-150 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(["All", "Active", "Upcoming", "Completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                filter === tab ? "bg-purple-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--app-card-gap,14px)]">
        {filteredQuizzes.map((quiz) => (
          <div key={quiz.id} className="panel p-5 flex flex-col justify-between border border-zinc-100 rounded-2xl">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                  {quiz.course}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    quiz.status === "Active"
                      ? "bg-purple-100 text-purple-700 animate-pulse"
                      : quiz.status === "Completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {quiz.status}
                </span>
              </div>
              <h4 className="font-bold text-base text-zinc-900 mb-2">{quiz.title}</h4>
              <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 rounded-xl text-xs mb-4">
                <div>
                  <span className="text-[10px] text-zinc-400 block font-semibold">Duration</span>
                  <strong>{quiz.durationMinutes} Mins</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block font-semibold">Questions</span>
                  <strong>{quiz.questionCount} MCQs</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block font-semibold">Pass Mark</span>
                  <strong>{quiz.passingPct}%</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
              <span className="text-xs text-zinc-400">
                {quiz.status === "Completed" ? (
                  <span className="font-bold text-emerald-700">Scored: {quiz.score} ({quiz.pct}%)</span>
                ) : (
                  <span>Due: <strong>{quiz.dueDate}</strong></span>
                )}
              </span>
              {quiz.status === "Active" ? (
                <button
                  onClick={() => handleStartAssessment(quiz)}
                  className="px-4 py-1.5 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800"
                >
                  Start Test
                </button>
              ) : quiz.status === "Completed" ? (
                <button
                  onClick={() => handleReviewAssessment(quiz)}
                  className="px-3.5 py-1.5 rounded-full border border-purple-200 text-xs font-bold text-purple-700 hover:bg-purple-50"
                >
                  Review
                </button>
              ) : (
                <span className="text-xs text-zinc-400 font-medium">Scheduled</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN ASSIGNMENTS & ASSESSMENTS PAGE
// ============================================================================
export function AssignmentsPage({
  assignments,
  onSubmitAssignment,
  onToast,
  initialTab = "assignments",
  quizzes = initialQuizzesList,
  onCompleteQuiz,
  quizAttempts,
}: AssignmentsPageProps) {
  const [mainTab, setMainTab] = useState<"assignments" | "quizzes">(initialTab)
  const [filter, setFilter] = useState<"All" | "Pending" | "Submitted" | "Graded">("All")
  const [search, setSearch] = useState("")

  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null)
  const [isResubmitting, setIsResubmitting] = useState(false)

  const [repoUrl, setRepoUrl] = useState("")
  const [comments, setComments] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const activeAssignment = useMemo(() => {
    if (!activeAssignmentId) return null
    return assignments.find((a) => a.id === activeAssignmentId) || null
  }, [assignments, activeAssignmentId])

  const filtered = useMemo(() => {
    let list = assignments
    if (filter !== "All") {
      list = assignments.filter((a) => a.status === filter)
    }
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) || a.course.toLowerCase().includes(q)
    )
  }, [assignments, filter, search])

  const handleOpenAssignment = (item: AssignmentData, forceSubmitMode = false) => {
    setActiveAssignmentId(item.id)
    setIsResubmitting(forceSubmitMode)
    setRepoUrl(item.repoUrl || "")
    setComments(item.comments || "")
    setUploadedFileName(item.uploadedFileName || null)
    setSelectedFile(null)
    setSubmissionError(null)
  }

  const handleBackToList = () => {
    setActiveAssignmentId(null)
    setIsResubmitting(false)
    setRepoUrl("")
    setComments("")
    setSelectedFile(null)
    setUploadedFileName(null)
    setSubmissionError(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2)
      if (file.size > 50 * 1024 * 1024) {
        setSubmissionError("File size exceeds institutional limit (50 MB).")
        onToast("File is too large. Max size is 50 MB.")
        return
      }
      setSelectedFile(file)
      setUploadedFileName(`${file.name} (${sizeMb} MB)`)
      setSubmissionError(null)
      onToast(`Attached ${file.name} (${sizeMb} MB)`)
    }
  }

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAssignment) return

    if (!uploadedFileName && !repoUrl.trim()) {
      setSubmissionError("Please provide either an uploaded solution archive or a GitHub repository URL.")
      onToast("Please provide a solution file or repository link.")
      return
    }

    if (
      repoUrl.trim() &&
      !repoUrl.trim().startsWith("http://") &&
      !repoUrl.trim().startsWith("https://")
    ) {
      setSubmissionError("Please enter a valid URL starting with https:// or http://")
      onToast("Invalid repository URL format.")
      return
    }

    setSubmissionError(null)
    onSubmitAssignment(activeAssignment.id, repoUrl.trim(), comments.trim())
    onToast(`Submitted "${activeAssignment.title}" successfully! 🚀`)
    setIsResubmitting(false)
  }

  return (
    <div className="app-card-stack flex flex-col gap-[var(--app-card-gap,14px)]">
      {/* Detail View for active assignment */}
      {activeAssignment ? (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="panel p-4 bg-white border border-zinc-100 shadow-xs rounded-3xl flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackToList}
              className="px-4 py-1.5 rounded-full bg-zinc-100 hover:bg-[#F0EDFF] text-zinc-700 text-xs font-bold cursor-pointer"
            >
              ← Back to Assessments List
            </button>
            <span className="text-xs font-bold text-zinc-500">{activeAssignment.course}</span>
          </div>

          <section className="panel p-6 bg-white border border-zinc-100 rounded-3xl">
            <h2 className="text-xl font-black text-zinc-900 mb-2">{activeAssignment.title}</h2>
            <p className="text-xs text-zinc-600 mb-4">{activeAssignment.description}</p>
            <form onSubmit={handleConfirmSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">GitHub / Code URL</label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs"
                />
              </div>
              {submissionError && <p className="text-xs text-rose-600 font-bold">{submissionError}</p>}
              <button
                type="submit"
                className="self-end px-5 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800"
              >
                Submit Assignment Solution
              </button>
            </form>
          </section>
        </div>
      ) : (
        /* Top Navigation Hub */
        <div className="flex flex-col gap-[var(--app-card-gap,14px)]">
          <section className="panel" aria-label="Assessments Header">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="card-title">Assessments & Evaluations</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                    Academic Year 2026
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Complete laboratory assignments, project milestones, and timed quizzes.
                </p>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full border border-zinc-200/60 dark:border-zinc-700/60">
                <button
                  type="button"
                  onClick={() => setMainTab("assignments")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    mainTab === "assignments"
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  Assignments ({assignments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMainTab("quizzes")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    mainTab === "quizzes"
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  Quizzes & Tests ({quizzes.length})
                </button>
              </div>
            </div>
          </section>

          {/* TAB 1: ASSIGNMENTS */}
          {mainTab === "assignments" && (
            <div className="flex flex-col gap-4">
              <div className="panel p-3 bg-white border border-zinc-150 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {(["All", "Pending", "Submitted", "Graded"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilter(tab)}
                      className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                        filter === tab ? "bg-purple-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--app-card-gap,14px)]">
                {filtered.map((item) => (
                  <div key={item.id} className="panel p-5 flex flex-col justify-between border border-zinc-100 rounded-2xl">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                          {item.course}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700">
                          {item.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-zinc-900 mb-2">{item.title}</h4>
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-4">{item.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                      <span className="text-xs text-zinc-400">Due: <strong>{item.dueDate}</strong></span>
                      <button
                        onClick={() => handleOpenAssignment(item)}
                        className="px-4 py-1.5 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800"
                      >
                        Open Workspace
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: QUIZZES */}
          {mainTab === "quizzes" && (
            <QuizzesSection
              quizzes={quizzes}
              onCompleteQuiz={onCompleteQuiz}
              onToast={onToast}
              quizAttempts={quizAttempts}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default AssignmentsPage
