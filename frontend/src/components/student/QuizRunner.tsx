import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, CloudCheck, Keyboard, ListChecks, Loader2, RotateCcw, Target, Trophy, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import { Accordion, Badge, Button, Dialog, DialogContent, DialogDescription, DialogTitle, Progress } from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import type { AssessmentAttempt, AssessmentQuestion, QuizData } from "@/pages/student/studentTypes"
import { formatClock, formatDuration } from "@/pages/student/studentUtils"
import { getQuizReview, saveQuizAnswers, startQuiz, submitQuiz, type LiveQuiz, type QuizQuestion, type QuizReview } from "@/pages/student/data/actions"
import { useStudentData } from "@/pages/student/data/StudentDataProvider"

type Phase = "intro" | "loading" | "active" | "submitting" | "result" | "error"

interface QuizRunnerProps {
  /** The dialog is open while a quiz is set. */
  quiz: QuizData | null
  /** Opens straight into the review of this submitted attempt. */
  reviewAttemptId?: string | null
  onClose: () => void
}

const LETTERS = ["A", "B", "C", "D", "E", "F"]
const DIFFICULTY_TONE = { Easy: "success", Medium: "warning", Hard: "danger" } as const

/**
 * Timed quiz flow: intro, one question at a time, then the server-graded review. Questions arrive without answers;
 * answers autosave, the countdown follows the server's deadline, and grading happens on the server.
 */
export default function QuizRunner({ quiz, reviewAttemptId, onClose }: QuizRunnerProps) {
  const { uid, profile, quizStarted, quizSubmitted } = useStudentData()
  // Keep the last quiz around so the dialog can play its exit animation with content.
  const lastQuiz = useRef<QuizData | null>(null)
  if (quiz) lastQuiz.current = quiz
  const shown = quiz ?? lastQuiz.current

  const [phase, setPhase] = useState<Phase>("intro")
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState<LiveQuiz | null>(null)
  const [review, setReview] = useState<QuizReview | null>(null)
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [remaining, setRemaining] = useState(0)
  const [saveState, setSaveState] = useState<"saved" | "saving" | "offline">("saved")
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const answersRef = useRef(answers)
  answersRef.current = answers
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const submitting = useRef(false)

  const openReview = useCallback(
    async (attemptId: string) => {
      setPhase("loading")
      try {
        const r = await getQuizReview(uid, attemptId, profile.full_name)
        setReview(r)
        setPhase("result")
      } catch (e) {
        setError((e as Error).message)
        setPhase("error")
      }
    },
    [uid, profile.full_name],
  )

  useEffect(() => {
    if (!quiz) return
    setIndex(0)
    setDir(1)
    setConfirmSubmit(false)
    setConfirmLeave(false)
    setError(null)
    setLive(null)
    setReview(null)
    setAnswers({})
    setSaveState("saved")
    submitting.current = false
    if (reviewAttemptId) void openReview(reviewAttemptId)
    else setPhase("intro")
    // Re-run only when a different quiz or review opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.id, reviewAttemptId])

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const questions = live?.questions ?? []
  const total = questions.length
  const answeredCount = Object.keys(answers).length

  const begin = async () => {
    if (!shown) return
    setPhase("loading")
    setError(null)
    try {
      const l = await startQuiz(shown.id)
      quizStarted(shown.id, l)
      setLive(l)
      setAnswers(l.answers)
      setIndex(0)
      setRemaining(Math.max(0, Math.ceil((l.deadline - Date.now()) / 1000)))
      setPhase("active")
    } catch (e) {
      setError((e as Error).message)
      setPhase("error")
    }
  }

  const flushSave = useCallback(async () => {
    clearTimeout(saveTimer.current)
    if (!live) return
    setSaveState("saving")
    try {
      await saveQuizAnswers(live.attemptId, answersRef.current)
      setSaveState("saved")
    } catch {
      setSaveState("offline")
    }
  }, [live])

  const submit = useCallback(async () => {
    if (!live || submitting.current) return
    submitting.current = true
    clearTimeout(saveTimer.current)
    setConfirmSubmit(false)
    setPhase("submitting")
    try {
      const r = await submitQuiz(uid, live.attemptId, answersRef.current, profile.full_name)
      quizSubmitted(r)
      setReview(r)
      setPhase("result")
    } catch (e) {
      setError((e as Error).message)
      setPhase("active")
    } finally {
      submitting.current = false
    }
  }, [live, uid, profile.full_name, quizSubmitted])

  // Countdown from the server deadline; submits automatically at zero.
  useEffect(() => {
    if (phase !== "active" || !live) return
    const tick = () => setRemaining(Math.max(0, Math.ceil((live.deadline - Date.now()) / 1000)))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [phase, live])
  useEffect(() => {
    if (phase === "active" && live && remaining <= 0 && !error) void submit()
  }, [phase, live, remaining, submit, error])

  const go = (next: number) => {
    if (next < 0 || next >= total) return
    setDir(next > index ? 1 : -1)
    setIndex(next)
    setConfirmSubmit(false)
  }
  const choose = (option: number) => {
    setAnswers((a) => ({ ...a, [index]: option }))
    setSaveState("saving")
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void flushSave(), 700)
  }

  const requestClose = () => {
    if (phase === "submitting" || phase === "loading") return
    if (phase === "active") setConfirmLeave(true)
    else onClose()
  }
  const leave = () => {
    void flushSave()
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (phase !== "active") return
    const q = questions[index]
    if (!q) return
    const n = Number(e.key)
    if (n >= 1 && n <= q.options.length) {
      e.preventDefault()
      choose(n - 1)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      go(index + 1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      go(index - 1)
    }
  }

  return (
    <Dialog open={!!quiz} onOpenChange={(o) => !o && requestClose()}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl" onKeyDown={onKeyDown}>
        {shown && (
          <>
            {phase === "intro" && <Intro quiz={shown} onCancel={onClose} onStart={() => void begin()} />}

            {(phase === "loading" || phase === "submitting") && (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center" role="status">
                <Loader2 className="h-6 w-6 animate-spin text-primary-text" aria-hidden="true" />
                <DialogTitle className="text-[15px]">{phase === "submitting" ? "Grading your answers…" : shown.title}</DialogTitle>
                <DialogDescription>{phase === "submitting" ? "This takes a moment." : "Loading the quiz…"}</DialogDescription>
              </div>
            )}

            {phase === "error" && (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-danger-soft text-danger ring-1 ring-inset ring-danger/20">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </span>
                <DialogTitle className="text-[15px]">{shown.title}</DialogTitle>
                <DialogDescription className="max-w-md">{error}</DialogDescription>
                <div className="mt-2 flex gap-2">
                  <Button variant="ghost" onClick={onClose}>
                    Close
                  </Button>
                  <Button leftIcon={<RotateCcw aria-hidden="true" />} onClick={() => (reviewAttemptId ? void openReview(reviewAttemptId) : void begin())}>
                    Try again
                  </Button>
                </div>
              </div>
            )}

            {phase === "active" && questions[index] && (
              <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
                <div className="border-b border-border px-6 pb-4 pt-6">
                  <div className="flex items-center justify-between gap-3 pr-8">
                    <div className="min-w-0">
                      <DialogTitle className="truncate text-[15px]">{shown.title}</DialogTitle>
                      <DialogDescription className="flex items-center gap-1.5 text-caption">
                        Question {index + 1} of {total} · {answeredCount} answered
                        <span aria-live="polite" className="inline-flex items-center gap-1 text-subtle-foreground">
                          ·{" "}
                          {saveState === "saving" ? (
                            "Saving…"
                          ) : saveState === "offline" ? (
                            <span className="text-warning">Not saved yet</span>
                          ) : (
                            <>
                              <CloudCheck className="h-3.5 w-3.5" aria-hidden="true" /> Saved
                            </>
                          )}
                        </span>
                      </DialogDescription>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-semibold tabular-nums transition-colors",
                        remaining <= 30
                          ? "border-danger/30 bg-danger-soft text-danger"
                          : remaining <= 120
                            ? "border-warning/30 bg-warning-soft text-warning"
                            : "border-border bg-surface-2 text-foreground",
                      )}
                      role="timer"
                      aria-label={`Time remaining ${formatClock(remaining)}`}
                    >
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatClock(remaining)}
                    </span>
                  </div>
                  <Progress value={(answeredCount / Math.max(1, total)) * 100} size="xs" className="mt-4" label="Questions answered" />
                </div>

                <AnimatePresence initial={false}>
                  {(confirmLeave || error) && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={transition.fast}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/30 bg-warning-soft px-6 py-3"
                      role="alert"
                    >
                      <p className="flex items-center gap-2 text-sm font-medium text-warning">
                        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {error ?? "Leave the quiz? Your answers are saved, but the timer keeps running."}
                      </p>
                      <div className="flex gap-2">
                        {error ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setError(null)
                              void submit()
                            }}
                          >
                            Retry submit
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => setConfirmLeave(false)}>
                              Keep going
                            </Button>
                            <Button size="sm" variant="danger" onClick={leave}>
                              Leave quiz
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                  <AnimatePresence mode="wait" initial={false} custom={dir}>
                    <motion.div
                      key={index}
                      custom={dir}
                      initial={{ opacity: 0, x: 24 * dir }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 * dir, transition: transition.fast }}
                      transition={transition.base}
                    >
                      <QuestionView question={questions[index]} index={index} selected={answers[index]} onChoose={choose} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="border-t border-border px-6 py-4">
                  <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto" aria-label="Jump to question">
                    {questions.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => go(i)}
                        aria-label={`Question ${i + 1}${answers[i] !== undefined ? ", answered" : ""}`}
                        aria-current={i === index ? "step" : undefined}
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums transition-[background-color,color,box-shadow] duration-150",
                          answers[i] !== undefined ? "bg-primary-soft text-primary-text" : "bg-surface-2 text-muted-foreground hover:text-foreground",
                          i === index && "ring-2 ring-primary ring-offset-1 ring-offset-surface-3",
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence initial={false}>
                    {confirmSubmit && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={transition.fast}
                        className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2"
                        role="alert"
                      >
                        <p className="text-sm font-medium text-warning">{total - answeredCount} unanswered. Submit anyway?</p>
                        <Button size="sm" onClick={() => void submit()}>
                          Submit now
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between gap-2">
                    <Button variant="outline" leftIcon={<ArrowLeft aria-hidden="true" />} onClick={() => go(index - 1)} disabled={index === 0}>
                      Previous
                    </Button>
                    <span className="hidden items-center gap-1.5 text-caption text-subtle-foreground sm:flex">
                      <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />1–{questions[index].options.length} to answer · ← → to move
                    </span>
                    {index < total - 1 ? (
                      <Button rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => go(index + 1)}>
                        Next
                      </Button>
                    ) : (
                      <Button leftIcon={<Check aria-hidden="true" />} onClick={() => (answeredCount < total ? setConfirmSubmit(true) : void submit())}>
                        Submit quiz
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {phase === "result" && review && <Result quiz={shown} questions={review.questions} attempt={review.attempt} onClose={onClose} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Intro({ quiz, onStart, onCancel }: { quiz: QuizData; onStart: () => void; onCancel: () => void }) {
  const max = quiz.maxAttempts ?? 1
  const attemptsLeft = Math.max(0, max - (quiz.attemptsUsed ?? 0))
  const resuming = !!quiz.openAttemptId
  const minutesLeft = quiz.openDeadline ? Math.max(0, Math.ceil((Date.parse(quiz.openDeadline) - Date.now()) / 60_000)) : 0
  const stats = [
    { icon: ListChecks, label: "Questions", value: String(quiz.questionCount) },
    { icon: Clock, label: resuming ? "Time left" : "Time limit", value: `${resuming ? minutesLeft : quiz.durationMinutes} min` },
    { icon: Target, label: "Pass mark", value: `${quiz.passingPct}%` },
  ]
  return (
    <div className="p-6">
      <div className="pr-8">
        <Badge tone="primary">{quiz.course}</Badge>
        <DialogTitle className="mt-3 text-h3">{quiz.title}</DialogTitle>
        <DialogDescription className="mt-1">
          {resuming ? "You have an attempt in progress" : `${attemptsLeft} of ${max} attempt${max > 1 ? "s" : ""} left`} · Due {quiz.dueDate}
        </DialogDescription>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition.base, delay: 0.05 + i * 0.05 }}
            className="rounded-lg border border-border bg-surface-2 p-4"
          >
            <s.icon className="h-4 w-4 text-primary-text" aria-hidden="true" />
            <p className="mt-3 text-xl font-semibold tabular-nums text-foreground">{s.value}</p>
            <p className="text-caption text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>
      <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
        {[
          "The timer starts when you begin and the quiz submits itself at zero.",
          "Answers save as you go. If you leave, the timer keeps running until you come back.",
          "Use the number keys to answer and the arrow keys to move.",
        ].map((t) => (
          <li key={t} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>
          Not now
        </Button>
        <Button size="lg" rightIcon={<ArrowRight aria-hidden="true" />} onClick={onStart} disabled={!resuming && attemptsLeft === 0}>
          {resuming ? "Resume quiz" : "Start quiz"}
        </Button>
      </div>
    </div>
  )
}

function QuestionView({
  question,
  index,
  selected,
  onChoose,
}: {
  question: QuizQuestion
  index: number
  selected: number | undefined
  onChoose: (option: number) => void
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {question.topic && <Badge tone="neutral">{question.topic}</Badge>}
        {question.difficulty && <Badge tone={DIFFICULTY_TONE[question.difficulty]}>{question.difficulty}</Badge>}
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-7 text-foreground" id={`q-${index}`}>
        {question.question}
      </h3>
      <div role="radiogroup" aria-labelledby={`q-${index}`} className="mt-5 flex flex-col gap-2">
        {question.options.map((opt, i) => {
          const active = selected === i
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChoose(i)}
              className={cn(
                "relative flex w-full items-start gap-3 rounded-md border p-3.5 text-left text-sm transition-colors duration-150",
                active ? "border-primary text-foreground" : "border-border text-muted-foreground hover:border-border-strong/60 hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`quiz-option-${index}`}
                  transition={spring.snappy}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-md bg-primary-soft"
                />
              )}
              <span
                className={cn(
                  "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground",
                )}
              >
                {LETTERS[i]}
              </span>
              <span className="relative flex-1 leading-6">{opt}</span>
              <AnimatePresence>
                {active && (
                  <motion.span
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={spring.snappy}
                    className="relative mt-0.5 flex text-primary-text"
                  >
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Result({ quiz, questions, attempt, onClose }: { quiz: QuizData; questions: AssessmentQuestion[]; attempt: AssessmentAttempt; onClose: () => void }) {
  const items = useMemo(
    () =>
      questions.map((q, i) => {
        const chosen = attempt.answers[i]
        const correct = chosen === q.correctAnswer
        return {
          id: String(i),
          correct,
          title: (
            <span className="flex items-start gap-2.5">
              {correct ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Correct" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="Incorrect" />
              )}
              <span className="line-clamp-2">
                {i + 1}. {q.question}
              </span>
            </span>
          ),
          content: (
            <div className="space-y-2 pl-6">
              {q.options.map((opt, oi) => {
                const isCorrect = oi === q.correctAnswer
                const isChosen = oi === chosen
                if (!isCorrect && !isChosen) return null
                return (
                  <p
                    key={oi}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm",
                      isCorrect ? "border-success/30 bg-success-soft text-success" : "border-danger/30 bg-danger-soft text-danger",
                    )}
                  >
                    <span className="font-semibold">{isCorrect ? (isChosen ? "Your answer · correct" : "Correct answer") : "Your answer"}:</span> {opt}
                  </p>
                )
              })}
              {chosen === undefined && <p className="text-sm text-warning">Not answered</p>}
              <p className="text-sm leading-6 text-muted-foreground">{q.explanation}</p>
            </div>
          ),
        }
      }),
    [attempt.answers, questions],
  )
  const wrong = items.filter((i) => !i.correct).map((i) => i.id)

  return (
    <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="flex flex-col items-center gap-5 pr-0 text-center sm:flex-row sm:pr-8 sm:text-left">
          <ProgressRing value={attempt.pct} size={112} thickness={9} tone={attempt.passed ? "success" : "danger"} label="Quiz score">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">{attempt.pct}%</p>
              <p className="text-[10px] uppercase tracking-wider text-subtle-foreground">Score</p>
            </div>
          </ProgressRing>
          <div className="min-w-0">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.soft} className="inline-flex">
              <Badge tone={attempt.passed ? "success" : "danger"} className="gap-1">
                {attempt.passed ? <Trophy className="h-3 w-3" aria-hidden="true" /> : <XCircle className="h-3 w-3" aria-hidden="true" />}
                {attempt.passed ? "Passed" : "Below pass mark"}
              </Badge>
            </motion.div>
            <DialogTitle className="mt-2 text-h3">{attempt.passed ? "Nicely done" : "Not quite there yet"}</DialogTitle>
            <DialogDescription className="mt-1">
              {attempt.score} of {attempt.maxScore} correct · {formatDuration(attempt.timeTakenSeconds)} · pass mark {quiz.passingPct}%
            </DialogDescription>
            {attempt.feedback && <p className="mt-2 text-sm text-muted-foreground">{attempt.feedback}</p>}
          </div>
        </div>

        <h4 className="mb-2 mt-8 text-sm font-semibold text-foreground">Review answers</h4>
        <Accordion items={items} multiple defaultOpen={wrong} />
      </div>
      <div className="flex justify-end border-t border-border px-6 py-4">
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  )
}
