import { useState, useEffect, useMemo, useCallback } from "react"
import { Icon } from "../../components/Icon"
import type {
  QuizData,
  AssessmentQuestion,
  AssessmentAttempt,
} from "./studentTypes"
import {
  quizQuestionBanks,
  initialQuizAttempts,
} from "./studentMockData"

interface QuizzesPageProps {
  quizzes: QuizData[]
  onCompleteQuiz: (
    id: string,
    scoreStr: string,
    pct: number,
    attemptData?: AssessmentAttempt,
  ) => void
  onToast: (msg: string) => void
  quizAttempts?: Record<string, AssessmentAttempt>
}

type ViewMode = "list" | "taking" | "review" | "locked"

export function QuizzesPage({
  quizzes,
  onCompleteQuiz,
  onToast,
  quizAttempts = {},
}: QuizzesPageProps) {
  // Combine prop attempts with initial defaults
  const allAttempts = useMemo(() => {
    return { ...initialQuizAttempts, ...quizAttempts }
  }, [quizAttempts])

  // Navigation & View state
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null)
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"All" | "Active" | "Upcoming" | "Completed">("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingSyllabusQuiz, setViewingSyllabusQuiz] = useState<QuizData | null>(null)

  // Taking state
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [secondsLeft, setSecondsLeft] = useState<number>(0)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [submittedAttempt, setSubmittedAttempt] = useState<AssessmentAttempt | null>(null)
  const [takingStartTime, setTakingStartTime] = useState<number>(0)

  // Review filter
  const [reviewFilter, setReviewFilter] = useState<"All" | "Correct" | "Incorrect" | "Unanswered">("All")

  // Helper to sync route with browser URL history
  const updateUrlHistory = useCallback((mode: ViewMode, qId?: string, attId?: string) => {
    if (typeof window === "undefined") return
    try {
      const url = new URL(window.location.href)
      url.searchParams.set("page", "quizzes")
      if (mode === "list") {
        url.searchParams.delete("view")
        url.searchParams.delete("quizId")
        url.searchParams.delete("attemptId")
      } else if (mode === "taking") {
        url.searchParams.set("view", "take")
        if (qId) url.searchParams.set("quizId", qId)
        url.searchParams.delete("attemptId")
      } else if (mode === "review") {
        url.searchParams.set("view", "review")
        if (qId) url.searchParams.set("quizId", qId)
        if (attId) url.searchParams.set("attemptId", attId)
      } else if (mode === "locked") {
        url.searchParams.set("view", "locked")
        if (qId) url.searchParams.set("quizId", qId)
        url.searchParams.delete("attemptId")
      }
      window.history.pushState(null, "", url.toString())
    } catch {
      // ignore
    }
  }, [])

  // Parse URL on mount or browser popstate
  const syncFromUrl = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      const params = new URLSearchParams(window.location.search)
      const viewParam = params.get("view")
      const qIdParam = params.get("quizId")
      const attIdParam = params.get("attemptId")

      if (viewParam === "take" && qIdParam) {
        const target = quizzes.find((q) => q.id === qIdParam)
        if (target) {
          if (target.status === "Upcoming") {
            setSelectedQuizId(target.id)
            setViewMode("locked")
          } else {
            setSelectedQuizId(target.id)
            setViewMode("taking")
            setCurrentQIndex(0)
            setSelectedAnswers({})
            setSubmittedAttempt(null)
            setSecondsLeft(target.durationMinutes * 60)
            setTakingStartTime(Date.now())
          }
        }
      } else if (viewParam === "review" && qIdParam) {
        setSelectedQuizId(qIdParam)
        setActiveAttemptId(attIdParam || null)
        setViewMode("review")
      } else if (viewParam === "locked" && qIdParam) {
        setSelectedQuizId(qIdParam)
        setViewMode("locked")
      } else {
        setViewMode("list")
        setSelectedQuizId(null)
        setActiveAttemptId(null)
      }
    } catch {
      // ignore
    }
  }, [quizzes])

  useEffect(() => {
    syncFromUrl()
    const handlePopState = () => syncFromUrl()
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [syncFromUrl])

  // Active quiz object resolution
  const activeQuiz = useMemo(() => {
    if (!selectedQuizId) return null
    return quizzes.find((q) => q.id === selectedQuizId) || null
  }, [quizzes, selectedQuizId])

  // Questions for active quiz
  const activeQuestions: AssessmentQuestion[] = useMemo(() => {
    if (!activeQuiz) return []
    if (activeQuiz.questions && activeQuiz.questions.length > 0) {
      return activeQuiz.questions
    }
    return quizQuestionBanks[activeQuiz.id] || []
  }, [activeQuiz])

  // Active review attempt resolution
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
      // search by quizId in allAttempts
      const found = Object.values(allAttempts).find((a) => a.quizId === activeQuiz.id)
      if (found) return found
    }
    return null
  }, [submittedAttempt, activeAttemptId, allAttempts, activeQuiz])

  // Timer countdown for taking mode
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

  // Handle auto-submit if time runs out
  const handleAutoSubmitOnTimeExpiry = () => {
    if (!activeQuiz || activeQuestions.length === 0) return
    onToast("Assessment time has elapsed. Submitting your responses automatically...")
    executeSubmission()
  }

  // Start Assessment Click Handler
  const handleStartAssessment = (quiz: QuizData) => {
    // 1. Prevent starting upcoming assessment before permitted start time
    if (quiz.status === "Upcoming") {
      setSelectedQuizId(quiz.id)
      setViewMode("locked")
      updateUrlHistory("locked", quiz.id)
      return
    }

    // 2. Open actual assessment-taking page
    setSelectedQuizId(quiz.id)
    setViewMode("taking")
    setCurrentQIndex(0)
    setSelectedAnswers({})
    setSubmittedAttempt(null)
    setIsSubmitModalOpen(false)
    setSecondsLeft(quiz.durationMinutes * 60)
    setTakingStartTime(Date.now())
    updateUrlHistory("taking", quiz.id)
  }

  // Review Answers Click Handler
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
    updateUrlHistory("review", quiz.id, attId || undefined)
  }

  // Navigate back to assessment list
  const handleBackToList = () => {
    setViewMode("list")
    setSelectedQuizId(null)
    setActiveAttemptId(null)
    setSubmittedAttempt(null)
    setIsSubmitModalOpen(false)
    updateUrlHistory("list")
  }

  // Execute Submission
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

    // Save student answers and result through existing backend / store
    onCompleteQuiz(activeQuiz.id, scoreStr, pct, newAttempt)
    onToast(
      isPassed
        ? `Assessment submitted! You passed with ${scoreStr} (${pct}%) 🎉`
        : `Assessment submitted. Scored ${scoreStr} (${pct}%).`,
    )
  }

  // Answer selection handler
  const handleSelectAnswer = (qIndex: number, optIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIndex]: optIndex,
    }))
  }

  // Clear single answer
  const handleClearAnswer = (qIndex: number) => {
    setSelectedAnswers((prev) => {
      const copy = { ...prev }
      delete copy[qIndex]
      return copy
    })
  }

  // Download review report (.txt)
  const handleDownloadReviewTranscript = () => {
    if (!activeQuiz || !activeAttempt) return
    const lines = [
      `=============================================================`,
      ` QUANTUM SCHOOL OF AI - OFFICIAL ASSESSMENT EVALUATION REPORT`,
      `=============================================================`,
      `Course:      ${activeQuiz.course}`,
      `Assessment:  ${activeQuiz.title}`,
      `Candidate:   ${activeAttempt.studentName || "Srimanth"} (ID: ${activeAttempt.studentId})`,
      `Attempt ID:  ${activeAttempt.id} (Attempt #${activeAttempt.attemptNumber})`,
      `Submitted:   ${activeAttempt.submittedAt}`,
      `Time Spent:  ${Math.floor(activeAttempt.timeTakenSeconds / 60)}m ${activeAttempt.timeTakenSeconds % 60}s`,
      `Score:       ${activeAttempt.scoreStr} (${activeAttempt.pct}%)`,
      `Pass Mark:   ${activeQuiz.passingPct}%`,
      `Status:      ${activeAttempt.passed ? "PASSED" : "FAILED / RETAKE REQUIRED"}`,
      `-------------------------------------------------------------`,
      ``,
      `DETAILED ITEM-BY-ITEM BREAKDOWN:`,
      ``,
    ]

    activeQuestions.forEach((q, idx) => {
      const selected = activeAttempt.answers[idx]
      const isCorrect = selected === q.correctAnswer
      const statusStr =
        selected === undefined
          ? "[NOT ANSWERED]"
          : isCorrect
            ? "[CORRECT]"
            : "[INCORRECT]"
      lines.push(`Question ${idx + 1}: ${q.question}`)
      lines.push(`Topic: ${q.topic || "Core Concept"} | Difficulty: ${q.difficulty || "Medium"}`)
      lines.push(`Status: ${statusStr}`)
      q.options.forEach((opt, oIdx) => {
        const isChosen = selected === oIdx
        const isAnswer = q.correctAnswer === oIdx
        let tag = "   "
        if (isChosen && isAnswer) tag = " [✓ Selected & Correct] "
        else if (isChosen && !isAnswer) tag = " [✗ Your Choice]       "
        else if (!isChosen && isAnswer) tag = " [✓ Correct Answer]    "
        lines.push(`  ${String.fromCharCode(65 + oIdx)}. ${opt}${tag}`)
      })
      lines.push(`Explanation: ${q.explanation}`)
      lines.push(``)
    })

    lines.push(`=============================================================`)
    lines.push(`Verified by Quantum LMS Automated Scoring Engine`)
    lines.push(`Timestamp: ${new Date().toISOString()}`)

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Evaluation_${activeQuiz.id}_${activeAttempt.id}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    onToast(`Downloaded official evaluation report (.txt)`)
  }

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  // Filtered quizzes for catalog
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

  // Count answered in taking mode
  const answeredCount = Object.keys(selectedAnswers).length
  const unansweredCount = Math.max(0, activeQuestions.length - answeredCount)

  // =========================================================================
  // VIEW 1: LOCKED / UPCOMING ASSESSMENT NOT PERMITTED
  // =========================================================================
  if (viewMode === "locked" && activeQuiz) {
    return (
      <div className="flex flex-col gap-5">
        <section className="panel p-6 border border-amber-200 bg-amber-50/50 rounded-2xl" aria-label="Locked Assessment">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 text-xl font-bold">
              🔒
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase tracking-wider">
                  Scheduled Evaluation Window
                </span>
                <span className="text-xs text-zinc-500 font-medium">
                  {activeQuiz.course}
                </span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">
                {activeQuiz.title}
              </h3>
              <p className="text-xs text-zinc-700 leading-relaxed max-w-2xl">
                This assessment is scheduled to open on{" "}
                <strong className="text-zinc-900 font-bold">
                  {activeQuiz.availableFrom || activeQuiz.dueDate}
                </strong>
                . In accordance with Quantum School of AI examination regulations, questions and interactive answer submission cannot be accessed before the permitted start time.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 max-w-xl">
                <div className="p-3 bg-white rounded-xl border border-amber-200">
                  <span className="text-[10px] text-zinc-400 block font-semibold">Test Format</span>
                  <strong className="text-zinc-800 text-xs font-bold">{activeQuiz.questionCount} MCQs</strong>
                </div>
                <div className="p-3 bg-white rounded-xl border border-amber-200">
                  <span className="text-[10px] text-zinc-400 block font-semibold">Allocated Time</span>
                  <strong className="text-zinc-800 text-xs font-bold">{activeQuiz.durationMinutes} Minutes</strong>
                </div>
                <div className="p-3 bg-white rounded-xl border border-amber-200">
                  <span className="text-[10px] text-zinc-400 block font-semibold">Pass Criterion</span>
                  <strong className="text-zinc-800 text-xs font-bold">{activeQuiz.passingPct}% Minimum</strong>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-amber-200 my-4">
                <strong className="text-zinc-900 text-xs block mb-2">Curriculum Topics Covered:</strong>
                <ul className="list-disc pl-5 space-y-1 text-zinc-600 text-xs">
                  <li>Vector Space Models: Cosine Similarity, L2 Euclidean Distance & Inner Dot Products</li>
                  <li>HNSW vs IVFFlat Approximate Nearest Neighbor Indexes and Recall Trade-offs</li>
                  <li>Cross-Encoder Re-Ranking latency versus Bi-Encoder Dual Transformers</li>
                  <li>ReAct Pattern: Interleaving Reasoning, Tool Parameter Validation, and Observations</li>
                  <li>Memory footprint of CPython PyObject headers and Hash Table Collision Resolution</li>
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleBackToList}
                  className="px-5 py-2 rounded-full border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-white transition-all cursor-pointer"
                >
                  ← Return to Assessments List
                </button>
                <button
                  onClick={() => {
                    onToast(`Downloaded official examination syllabus for ${activeQuiz.title} (.pdf)`)
                  }}
                  className="px-5 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-all cursor-pointer shadow-sm"
                >
                  Download Study Guide PDF
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  // =========================================================================
  // VIEW 2: DEDICATED READ-ONLY ANSWER REVIEW VIEW
  // =========================================================================
  if (viewMode === "review") {
    if (!activeQuiz) {
      return (
        <section className="panel p-8 text-center" aria-label="Assessment Error">
          <h3 className="font-bold text-base text-zinc-900 mb-2">Assessment Not Found</h3>
          <p className="text-xs text-zinc-500 mb-4">The requested assessment ID could not be loaded.</p>
          <button
            onClick={handleBackToList}
            className="px-5 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800"
          >
            ← Return to Assessments
          </button>
        </section>
      )
    }

    if (!activeAttempt) {
      return (
        <section className="panel p-8 text-center" aria-label="Attempt Error">
          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-3 font-bold text-xl">
            📝
          </div>
          <h3 className="font-bold text-base text-zinc-900 mb-2">No Past Attempt Found</h3>
          <p className="text-xs text-zinc-500 mb-4 max-w-md mx-auto">
            You haven't submitted this assessment yet. Please start the assessment from the catalog to submit your answers and generate an evaluation record.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleBackToList}
              className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              ← Back to Assessments
            </button>
            {activeQuiz.status === "Active" && (
              <button
                onClick={() => handleStartAssessment(activeQuiz)}
                className="px-5 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 cursor-pointer shadow-sm"
              >
                Start Assessment Now
              </button>
            )}
          </div>
        </section>
      )
    }

    // Review filtering
    const questionsToDisplay = activeQuestions.filter((q, idx) => {
      const selected = activeAttempt.answers[idx]
      const isCorrect = selected === q.correctAnswer
      const isUnanswered = selected === undefined
      if (reviewFilter === "Correct") return isCorrect
      if (reviewFilter === "Incorrect") return !isCorrect && !isUnanswered
      if (reviewFilter === "Unanswered") return isUnanswered
      return true
    })

    let correctCount = 0
    let incorrectCount = 0
    let unansweredCountRev = 0
    activeQuestions.forEach((q, idx) => {
      const s = activeAttempt.answers[idx]
      if (s === q.correctAnswer) correctCount++
      else if (s === undefined) unansweredCountRev++
      else incorrectCount++
    })

    return (
      <div className="flex flex-col gap-5">
        {/* Top Header & Breadcrumb */}
        <section className="panel" aria-label="Review Header">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={handleBackToList}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                >
                  ← All Assessments
                </button>
                <span className="text-zinc-300">/</span>
                <span className="text-xs font-bold text-zinc-500">{activeQuiz.course}</span>
                <span className="text-zinc-300">/</span>
                <span className="text-xs font-bold text-zinc-800 truncate max-w-xs">{activeQuiz.title}</span>
              </div>
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <span>Assessment Answer Review</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                  Attempt #{activeAttempt.attemptNumber} · Read-Only
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadReviewTranscript}
                className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                title="Download study evaluation report (.txt)"
              >
                <Icon name="document" size={13} />
                <span>Export Report (.txt)</span>
              </button>
              <button
                onClick={handleBackToList}
                className="px-4 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 cursor-pointer shadow-sm"
              >
                Return to Assessments
              </button>
            </div>
          </div>

          {/* Performance Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-400 block font-semibold">Final Score</span>
              <strong className="text-zinc-900 text-base font-black">
                {activeAttempt.scoreStr} ({activeAttempt.pct}%)
              </strong>
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-400 block font-semibold">Evaluation Result</span>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black mt-0.5 ${
                  activeAttempt.passed
                    ? "bg-[#E7FF9C] text-[#385000] border border-[#AEEB00]"
                    : "bg-rose-100 text-rose-800 border border-rose-200"
                }`}
              >
                {activeAttempt.passed ? "✓ PASSED" : "✗ NEEDS RETAKE"}
              </span>
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-400 block font-semibold">Passing Threshold</span>
              <strong className="text-zinc-800 text-xs font-bold">
                {activeQuiz.passingPct}% Required
              </strong>
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-400 block font-semibold">Recorded Submission</span>
              <span className="text-zinc-700 text-xs font-semibold block truncate">
                {activeAttempt.submittedAt}
              </span>
            </div>
          </div>
        </section>

        {/* Filter and Quick Jump Palette */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="filter-pills">
            {(
              [
                { key: "All", label: `All Questions (${activeQuestions.length})` },
                { key: "Correct", label: `Correct (${correctCount})` },
                { key: "Incorrect", label: `Incorrect (${incorrectCount})` },
                ...(unansweredCountRev > 0
                  ? [{ key: "Unanswered" as const, label: `Unanswered (${unansweredCountRev})` }]
                  : []),
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setReviewFilter(tab.key)}
                className={`filter-pill ${reviewFilter === tab.key ? "active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Correct</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block ml-2" />
            <span>Incorrect</span>
            <span className="w-2 h-2 rounded-full bg-zinc-300 inline-block ml-2" />
            <span>Unanswered</span>
          </div>
        </div>

        {/* Question Cards List */}
        <div className="flex flex-col gap-4">
          {questionsToDisplay.map((q) => {
            const originalIndex = activeQuestions.findIndex((item) => item.id === q.id)
            const selectedOptIndex = activeAttempt.answers[originalIndex]
            const isCorrect = selectedOptIndex === q.correctAnswer
            const isUnanswered = selectedOptIndex === undefined

            return (
              <div
                key={q.id}
                id={`q-review-${originalIndex}`}
                className={`panel p-5 border transition-all ${
                  isCorrect
                    ? "border-emerald-200 bg-white"
                    : isUnanswered
                      ? "border-zinc-200 bg-zinc-50/50"
                      : "border-rose-200 bg-white"
                }`}
              >
                {/* Question Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold flex items-center justify-center">
                      {originalIndex + 1}
                    </span>
                    <span className="text-xs font-bold text-zinc-500">
                      Topic: <strong className="text-zinc-800">{q.topic || "Core Knowledge"}</strong>
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
                      isCorrect
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : isUnanswered
                          ? "bg-zinc-100 text-zinc-600 border border-zinc-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {isCorrect ? "✓ Correct (+1 Mark)" : isUnanswered ? "○ Not Answered (0 Marks)" : "✗ Incorrect (0 Marks)"}
                  </span>
                </div>

                {/* Prompt */}
                <h4 className="font-bold text-sm text-zinc-900 mb-4 leading-relaxed">
                  {q.question}
                </h4>

                {/* Options List (Read-Only) */}
                <div className="flex flex-col gap-2.5 mb-4">
                  {q.options.map((opt, optIdx) => {
                    const isStudentChoice = selectedOptIndex === optIdx
                    const isCorrectAnswer = q.correctAnswer === optIdx

                    let styleClasses = "border-zinc-200 bg-zinc-50/50 text-zinc-700"
                    let badge = null

                    if (isStudentChoice && isCorrectAnswer) {
                      styleClasses = "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold shadow-xs"
                      badge = (
                        <span className="ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                          Your Answer (Correct)
                        </span>
                      )
                    } else if (isStudentChoice && !isCorrectAnswer) {
                      styleClasses = "border-rose-400 bg-rose-50/80 text-rose-950 font-bold shadow-xs"
                      badge = (
                        <span className="ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                          Your Answer (Incorrect)
                        </span>
                      )
                    } else if (!isStudentChoice && isCorrectAnswer) {
                      styleClasses = "border-emerald-400 bg-emerald-50/40 text-emerald-900 font-semibold"
                      badge = (
                        <span className="ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Correct Answer
                        </span>
                      )
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-3.5 rounded-xl border text-xs flex items-center gap-3 transition-colors ${styleClasses}`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${
                            isStudentChoice && isCorrectAnswer
                              ? "bg-emerald-600 text-white"
                              : isStudentChoice && !isCorrectAnswer
                                ? "bg-rose-600 text-white"
                                : isCorrectAnswer
                                  ? "bg-emerald-600 text-white"
                                  : "bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="leading-snug">{opt}</span>
                        {badge}
                      </div>
                    )
                  })}
                </div>

                {/* Concept Explanation Box */}
                <div className="p-4 rounded-xl bg-[#F0EDFF] border border-[#D8CFFF] text-xs">
                  <div className="flex items-center gap-1.5 text-[#5F2BC0] font-bold mb-1">
                    <Icon name="sparkles" size={13} />
                    <span>Concept Explanation & Rationale:</span>
                  </div>
                  <p className="text-[#33295A] leading-relaxed">
                    {q.explanation}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom Bar */}
        <div className="flex justify-between items-center pt-2 pb-6">
          <button
            onClick={handleBackToList}
            className="px-5 py-2.5 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer shadow-xs"
          >
            ← Back to Assessments List
          </button>
          <button
            onClick={handleDownloadReviewTranscript}
            className="px-6 py-2.5 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 cursor-pointer shadow-sm"
          >
            Download Evaluation Transcript (.txt)
          </button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // VIEW 3: DEDICATED FULL-PAGE ASSESSMENT TAKING INTERFACE
  // =========================================================================
  if (viewMode === "taking" && activeQuiz) {
    // If submission is complete, show the Result Summary View
    if (submittedAttempt) {
      return (
        <div className="flex flex-col gap-5">
          <section className="panel p-8 text-center max-w-2xl mx-auto" aria-label="Assessment Results">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-black ${
                submittedAttempt.passed
                  ? "bg-[#E7FF9C] text-[#385000] border-2 border-[#AEEB00] shadow-md"
                  : "bg-rose-100 text-rose-700 border-2 border-rose-200"
              }`}
            >
              {submittedAttempt.passed ? "✓" : "!"}
            </div>

            <h2 className="text-2xl font-black text-zinc-900 mb-1">
              {submittedAttempt.passed ? "Assessment Passed!" : "Assessment Completed"}
            </h2>
            <p className="text-xs text-zinc-500 mb-6">
              {activeQuiz.course} • {activeQuiz.title}
            </p>

            {/* Score Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-left mb-6">
              <div>
                <span className="text-[10px] text-zinc-400 block font-semibold">Your Score</span>
                <strong className="text-zinc-900 text-lg font-black">{submittedAttempt.scoreStr}</strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block font-semibold">Percentage</span>
                <strong
                  className={`text-lg font-black ${
                    submittedAttempt.passed ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {submittedAttempt.pct}%
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block font-semibold">Pass Threshold</span>
                <strong className="text-zinc-800 text-xs font-bold block mt-1">{activeQuiz.passingPct}% Required</strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block font-semibold">Time Elapsed</span>
                <strong className="text-zinc-800 text-xs font-bold block mt-1">
                  {Math.floor(submittedAttempt.timeTakenSeconds / 60)}m {submittedAttempt.timeTakenSeconds % 60}s
                </strong>
              </div>
            </div>

            <p className="text-xs text-zinc-600 mb-6 leading-relaxed bg-purple-50/60 p-3 rounded-xl border border-purple-100 text-left">
              {submittedAttempt.feedback}
            </p>

            {/* Direct Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => handleReviewAssessment(activeQuiz, submittedAttempt.id)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 cursor-pointer shadow-sm transition-all"
              >
                Review Submitted Answers →
              </button>
              <button
                onClick={handleBackToList}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                Back to Assessments List
              </button>
            </div>
          </section>
        </div>
      )
    }

    const currentQuestion = activeQuestions[currentQIndex]

    if (!currentQuestion) {
      return (
        <section className="panel p-8 text-center" aria-label="Question Error">
          <h3 className="font-bold text-base text-zinc-900 mb-2">No Questions Found</h3>
          <p className="text-xs text-zinc-500 mb-4">No active questions were configured for this assessment.</p>
          <button
            onClick={handleBackToList}
            className="px-5 py-2 rounded-full bg-purple-700 text-white text-xs font-bold"
          >
            ← Return to Assessments
          </button>
        </section>
      )
    }

    return (
      <div className="flex flex-col gap-4">
        {/* Top Sticky Test Bar */}
        <section className="panel p-4" aria-label="Taking Assessment Header">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => {
                    if (answeredCount > 0) {
                      if (window.confirm("You have answers recorded. Exiting will cancel this session. Are you sure you wish to exit?")) {
                        handleBackToList()
                      }
                    } else {
                      handleBackToList()
                    }
                  }}
                  className="text-xs font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer"
                >
                  ← Exit Assessment
                </button>
                <span className="text-zinc-300">/</span>
                <span className="text-xs font-bold text-zinc-500">{activeQuiz.course}</span>
              </div>
              <h2 className="text-lg font-bold text-zinc-900 truncate">{activeQuiz.title}</h2>
            </div>

            {/* Timer and Submit Action */}
            <div className="flex items-center gap-3">
              <div
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                  secondsLeft <= 120
                    ? "bg-rose-100 text-rose-700 border border-rose-300 animate-pulse"
                    : "bg-purple-100 text-purple-800 border border-purple-200"
                }`}
              >
                <Icon name="clock" size={13} />
                <span>{formatTime(secondsLeft)} Remaining</span>
              </div>

              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-5 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 cursor-pointer shadow-sm transition-all"
              >
                Submit Assessment
              </button>
            </div>
          </div>

          {/* Quick Stats & Progress Bar */}
          <div className="pt-3">
            <div className="flex justify-between items-center text-xs text-zinc-600 mb-2 font-semibold">
              <span>
                Question <strong className="text-zinc-900">{currentQIndex + 1}</strong> of {activeQuestions.length}
              </span>
              <span className="text-purple-700 font-bold">
                {answeredCount} Answered · {unansweredCount} Left
              </span>
            </div>

            <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden mb-3">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentQIndex + 1) / activeQuestions.length) * 100}%`,
                }}
              />
            </div>

            {/* Numbered Question Navigator Palette */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {activeQuestions.map((_, idx) => {
                const isCurrent = currentQIndex === idx
                const isAnswered = selectedAnswers[idx] !== undefined

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQIndex(idx)}
                    className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                      isCurrent
                        ? "bg-purple-700 text-white ring-2 ring-purple-300 ring-offset-1"
                        : isAnswered
                          ? "bg-purple-100 text-purple-800 hover:bg-purple-200"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                    title={`Jump to Question ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Main Question Card */}
        <section className="panel p-6" aria-label="Current Question">
          <div className="flex justify-between items-center mb-3">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F0EDFF] text-[#5F2BC0]">
              {currentQuestion.topic || "Core Concept"}
            </span>
            <span className="text-[11px] font-semibold text-zinc-400">
              Pass Mark: {activeQuiz.passingPct}%
            </span>
          </div>

          <h3 className="font-bold text-base text-zinc-900 leading-relaxed mb-6">
            {currentQuestion.question}
          </h3>

          {/* Options List */}
          <div className="flex flex-col gap-3 mb-6">
            {currentQuestion.options.map((opt, optIdx) => {
              const isSelected = selectedAnswers[currentQIndex] === optIdx

              return (
                <label
                  key={optIdx}
                  onClick={() => handleSelectAnswer(currentQIndex, optIdx)}
                  className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? "border-purple-600 bg-purple-50/90 text-purple-950 shadow-xs ring-1 ring-purple-600"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800"
                  }`}
                >
                  <input
                    type="radio"
                    name={`quiz-q-${currentQIndex}`}
                    checked={isSelected}
                    onChange={() => handleSelectAnswer(currentQIndex, optIdx)}
                    className="accent-purple-700 w-4 h-4 cursor-pointer"
                  />
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${
                      isSelected ? "bg-purple-700 text-white" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="leading-relaxed">{opt}</span>
                </label>
              )
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
            <div className="flex items-center gap-2">
              <button
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ← Previous
              </button>

              {selectedAnswers[currentQIndex] !== undefined && (
                <button
                  onClick={() => handleClearAnswer(currentQIndex)}
                  className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {currentQIndex < activeQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentQIndex((prev) => prev + 1)}
                className="px-5 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer"
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-6 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 cursor-pointer shadow-sm"
              >
                Review & Submit Assessment
              </button>
            )}
          </div>
        </section>

        {/* Submit Confirmation Modal */}
        {isSubmitModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsSubmitModalOpen(false)}
          >
            <div
              className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
                <h3 className="font-bold text-base text-zinc-900">
                  Submit Assessment Confirmation
                </h3>
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>

              <p className="text-xs text-zinc-600 mb-4">
                Are you ready to submit your assessment responses for <strong>{activeQuiz.title}</strong>? Once submitted, your answers will be automatically graded and recorded.
              </p>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs flex justify-between items-center mb-4">
                <div>
                  <span className="text-[10px] text-zinc-400 block font-semibold">Answered</span>
                  <strong className="text-purple-700 font-bold">{answeredCount} of {activeQuestions.length}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block font-semibold">Unanswered</span>
                  <strong className={unansweredCount > 0 ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                    {unansweredCount} Questions
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block font-semibold">Time Remaining</span>
                  <strong className="text-zinc-800 font-bold">{formatTime(secondsLeft)}</strong>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 mb-4">
                  ⚠️ <strong>Notice:</strong> You have {unansweredCount} unanswered question(s). Unanswered questions will receive 0 marks.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Keep Working
                </button>
                <button
                  onClick={executeSubmission}
                  className="px-5 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 cursor-pointer shadow-sm"
                >
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // =========================================================================
  // VIEW 4: DEFAULT CATALOG LIST VIEW (Preserves Noorly Design & Card Layout)
  // =========================================================================
  return (
    <div className="flex flex-col gap-5">
      {/* Header Panel */}
      <section className="panel" aria-label="Quizzes Header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title">Quizzes & Online Assessments</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                Continuous Evaluation
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Timed multiple-choice evaluations, conceptual quizzes, and midterm assessments.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search filter input */}
            <div className="search-box">
              <Icon name="search" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assessments..."
                className="text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-zinc-400 hover:text-zinc-600 font-bold"
                >
                  ×
                </button>
              )}
            </div>

            <div className="filter-pills">
              {(["All", "Active", "Upcoming", "Completed"] as const).map(
                (tab) => {
                  const count =
                    tab === "All"
                      ? quizzes.length
                      : quizzes.filter((q) => q.status === tab).length
                  return (
                    <button
                      key={tab}
                      className={`filter-pill ${filter === tab ? "active" : ""}`}
                      onClick={() => setFilter(tab)}
                    >
                      {tab} ({count})
                    </button>
                  )
                },
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quizzes List or Dedicated Blueprint Detail View */}
      {viewingSyllabusQuiz ? (
        <div className="panel p-6 border border-zinc-100 animate-in fade-in space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <button
              onClick={() => setViewingSyllabusQuiz(null)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-200 text-xs font-bold text-purple-700 hover:bg-purple-50 transition-colors w-fit cursor-pointer"
            >
              <span>←</span>
              Back to Quizzes List
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onToast(`Downloaded official examination syllabus for ${viewingSyllabusQuiz.title} (.pdf)`)
                }}
                className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Download Study Guide PDF
              </button>
              {viewingSyllabusQuiz.status === "Active" ? (
                <button
                  onClick={() => {
                    const q = viewingSyllabusQuiz
                    setViewingSyllabusQuiz(null)
                    handleStartAssessment(q)
                  }}
                  className="px-4 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors shadow-sm cursor-pointer"
                >
                  Start Assessment
                </button>
              ) : viewingSyllabusQuiz.status === "Completed" ? (
                <button
                  onClick={() => {
                    const q = viewingSyllabusQuiz
                    setViewingSyllabusQuiz(null)
                    handleReviewAssessment(q)
                  }}
                  className="px-4 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors shadow-sm cursor-pointer"
                >
                  Review Answers
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wider">
                Assessment Blueprint • {viewingSyllabusQuiz.course}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  viewingSyllabusQuiz.status === "Active"
                    ? "bg-purple-100 text-purple-700 animate-pulse"
                    : viewingSyllabusQuiz.status === "Completed"
                      ? "bg-[#E7FF9C] text-[#385000] border border-[#AEEB00]"
                      : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {viewingSyllabusQuiz.status}
              </span>
            </div>
            <h3 className="font-bold text-xl text-zinc-900 mb-2">
              {viewingSyllabusQuiz.title}
            </h3>
            <p className="text-xs text-zinc-600 mb-6">
              Review syllabus coverage, examination format, and pass thresholds before starting the test.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-100 text-center mb-6">
              <div className="p-3 bg-white rounded-xl border border-purple-50">
                <span className="text-[11px] text-zinc-400 block font-semibold mb-1">Test Format</span>
                <strong className="text-zinc-900 text-base">{viewingSyllabusQuiz.questionCount} MCQs</strong>
              </div>
              <div className="p-3 bg-white rounded-xl border border-purple-50">
                <span className="text-[11px] text-zinc-400 block font-semibold mb-1">Allocated Time</span>
                <strong className="text-purple-700 text-base">{viewingSyllabusQuiz.durationMinutes} Minutes</strong>
              </div>
              <div className="p-3 bg-white rounded-xl border border-purple-50">
                <span className="text-[11px] text-zinc-400 block font-semibold mb-1">Pass Threshold</span>
                <strong className="text-emerald-700 text-base">{viewingSyllabusQuiz.passingPct}%</strong>
              </div>
            </div>

            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 mb-6">
              <strong className="text-zinc-900 text-sm block mb-3">Curriculum Topics Covered:</strong>
              <ul className="list-disc pl-5 space-y-2 text-zinc-600 text-xs">
                <li>Vector Space Models: Cosine Similarity, L2 Euclidean Distance & Inner Dot Products</li>
                <li>HNSW vs IVFFlat Approximate Nearest Neighbor Indexes and Recall Trade-offs</li>
                <li>Cross-Encoder Re-Ranking latency versus Bi-Encoder Dual Transformers</li>
                <li>ReAct Pattern: Interleaving Reasoning, Tool Parameter Validation, and Observations</li>
                <li>Memory footprint of CPython PyObject headers and Hash Table Collision Resolution</li>
              </ul>
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-zinc-600">
              <span>Official Scheduled Examination Date:</span>
              <strong className="text-purple-800 font-bold text-sm">{viewingSyllabusQuiz.availableFrom || viewingSyllabusQuiz.dueDate}</strong>
            </div>
          </div>
        </div>
      ) : (
        /* Quizzes Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="panel p-5 flex flex-col justify-between hover:shadow-md transition-shadow border border-zinc-100"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                    {quiz.course}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      quiz.status === "Active"
                        ? "bg-purple-100 text-purple-700 animate-pulse"
                        : quiz.status === "Completed"
                          ? "bg-[#E7FF9C] text-[#385000] border border-[#AEEB00]"
                          : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {quiz.status === "Active"
                      ? "⚡ Active · Due Soon"
                      : quiz.status === "Completed"
                        ? "✓ Completed"
                        : "Upcoming"}
                  </span>
                </div>

                <h4 className="font-bold text-base text-zinc-900 mb-2">
                  {quiz.title}
                </h4>

                <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs mb-4">
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-semibold">
                      Duration
                    </span>
                    <strong className="text-zinc-800">
                      {quiz.durationMinutes} Mins
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-semibold">
                      Questions
                    </span>
                    <strong className="text-zinc-800">
                      {quiz.questionCount} MCQs
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-semibold">
                      Pass Mark
                    </span>
                    <strong className="text-zinc-800">{quiz.passingPct}%</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <span className="text-xs text-zinc-400">
                  {quiz.status === "Completed" ? (
                    <span className="font-bold text-[#385000]">
                      Scored: {quiz.score} ({quiz.pct}%)
                    </span>
                  ) : (
                    <span>
                      Deadline:{" "}
                      <strong className="text-zinc-700">{quiz.dueDate}</strong>
                    </span>
                  )}
                </span>

                {quiz.status === "Active" ? (
                  <button
                    onClick={() => handleStartAssessment(quiz)}
                    className="px-4 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-all cursor-pointer shadow-sm"
                  >
                    Start Assessment
                  </button>
                ) : quiz.status === "Completed" ? (
                  <button
                    onClick={() => handleReviewAssessment(quiz)}
                    className="px-3.5 py-1.5 rounded-full border border-purple-200 text-xs font-bold text-purple-700 hover:bg-purple-50 transition-all cursor-pointer shadow-xs"
                  >
                    Review Answers
                  </button>
                ) : (
                  <button
                    onClick={() => setViewingSyllabusQuiz(quiz)}
                    className="px-3.5 py-1.5 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-all cursor-pointer"
                  >
                    View Blueprint
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredQuizzes.length === 0 && (
            <div className="col-span-full panel p-8 text-center">
              <p className="text-xs text-zinc-500">No assessments match your active filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
