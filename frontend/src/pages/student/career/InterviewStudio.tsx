import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Clock, History, Lightbulb, Mic, Play, RotateCcw, SkipForward, Target, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import {
  Accordion,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import type { InterviewType } from "../studentTypes"
import { formatClock, formatDuration } from "../studentUtils"
import { LEVELS, PRACTICE_TYPES, QUESTION_BANK, ROLES, countConcepts, scoreAnswer, type InterviewResponse, type InterviewSessionResult } from "./careerData"

interface InterviewStudioProps {
  history: InterviewSessionResult[]
  onSaveSession: (s: InterviewSessionResult) => void
  onToast: (msg: string) => void
}

type View = { kind: "setup" } | { kind: "session" } | { kind: "result"; session: InterviewSessionResult }

const scoreTone = (s: number) => (s >= 75 ? "success" : s >= 50 ? "warning" : "danger") as "success" | "warning" | "danger"

export default function InterviewStudio({ history, onSaveSession, onToast }: InterviewStudioProps) {
  const [view, setView] = useState<View>({ kind: "setup" })
  const [role, setRole] = useState<string>(ROLES[0])
  const [type, setType] = useState<InterviewType>("Technical")
  const [level, setLevel] = useState<string>(LEVELS[0])
  const [count, setCount] = useState<"3" | "5">("3")

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [hint, setHint] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const questions = useMemo(() => QUESTION_BANK[type].slice(0, Number(count)), [type, count])

  useEffect(() => {
    if (view.kind !== "session") return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [view.kind])

  const start = () => {
    setAnswers(questions.map(() => ""))
    setIndex(0)
    setHint(false)
    setElapsed(0)
    setView({ kind: "session" })
  }

  const finish = (final: string[]) => {
    const responses: InterviewResponse[] = questions.map((q, i) => ({
      questionId: q.id,
      question: q.question,
      answer: final[i] ?? "",
      sampleAnswer: q.sampleAnswer,
      ...scoreAnswer(q, final[i] ?? ""),
    }))
    const session: InterviewSessionResult = {
      id: `iv-${Date.now()}`,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      role,
      type,
      level,
      score: Math.round(responses.reduce((s, r) => s + r.score, 0) / Math.max(1, responses.length)),
      durationSeconds: elapsed,
      responses,
    }
    onSaveSession(session)
    setView({ kind: "result", session })
    onToast(`Interview scored ${session.score}%`)
  }

  const next = () => {
    if (index < questions.length - 1) {
      setIndex(index + 1)
      setHint(false)
    } else finish(answers)
  }

  if (view.kind === "session") {
    const q = questions[index]
    const answer = answers[index] ?? ""
    const words = answer.trim().split(/\s+/).filter(Boolean).length
    const covered = countConcepts(q, answer)
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-caption text-muted-foreground">
              {role} · {type} · {level}
            </p>
            <p className="text-sm font-semibold text-foreground">
              Question {index + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1" aria-hidden="true">
              {questions.map((_, i) => (
                <span key={i} className={cn("h-1.5 w-8 rounded-full transition-colors duration-300", i < index ? "bg-primary" : i === index ? "bg-primary/50" : "bg-surface-2 ring-1 ring-inset ring-border")} />
              ))}
            </div>
            <Badge tone="neutral" className="tabular-nums" role="timer" aria-label={`Elapsed ${formatClock(elapsed)}`}>
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatClock(elapsed)}
            </Badge>
          </div>
        </div>
        <div className="p-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20, transition: transition.fast }} transition={transition.base}>
              <Badge tone="primary">{q.category}</Badge>
              <h3 className="mt-3 text-lg font-semibold leading-7 text-foreground">{q.question}</h3>
              <button type="button" onClick={() => setHint((h) => !h)} aria-expanded={hint} className="mt-3 inline-flex items-center gap-1.5 text-caption font-medium text-primary-text hover:underline">
                <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                {hint ? "Hide hint" : "Show a hint"}
              </button>
              <AnimatePresence initial={false}>
                {hint && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: transition.fast }}
                    transition={transition.fast}
                    className="mt-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-foreground"
                  >
                    {q.tip}
                  </motion.p>
                )}
              </AnimatePresence>
              <Field label="Your answer" className="mt-5" hint="Answer as you would out loud. Structure and specifics both count.">
                <Textarea
                  autoFocus
                  value={answer}
                  onChange={(e) => setAnswers((a) => a.map((v, i) => (i === index ? e.target.value : v)))}
                  placeholder="Start with the big picture, then go into detail…"
                  className="min-h-[180px]"
                />
              </Field>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-caption text-muted-foreground">
                <span className="tabular-nums">{words} words</span>
                <span className="flex items-center gap-2">
                  Key concepts covered
                  <span className="flex gap-1" aria-label={`${covered} of ${q.expectedConcepts.length} key concepts`}>
                    {q.expectedConcepts.map((_, i) => (
                      <motion.span
                        key={i}
                        animate={{ scale: i < covered ? 1 : 0.75 }}
                        transition={transition.fast}
                        className={cn("h-2 w-2 rounded-full transition-colors duration-200", i < covered ? "bg-success" : "bg-surface-2 ring-1 ring-inset ring-border-strong/40")}
                      />
                    ))}
                  </span>
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={() => setView({ kind: "setup" })}>
            Quit
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" leftIcon={<SkipForward aria-hidden="true" />} onClick={next}>
              Skip
            </Button>
            <Button rightIcon={<ArrowRight aria-hidden="true" />} onClick={next} disabled={!answer.trim()}>
              {index < questions.length - 1 ? "Next question" : "Finish and score"}
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (view.kind === "result") {
    return <SessionResult session={view.session} onBack={() => setView({ kind: "setup" })} onRetry={start} />
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Practice a mock interview</CardTitle>
          <p className="text-sm text-muted-foreground">Answer real interview questions and get instant feedback on the concepts you covered.</p>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Target role">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Experience">
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-foreground" id="iv-type">
              Interview type
            </span>
            <div className="no-scrollbar overflow-x-auto">
              <SegmentedControl aria-label="Interview type" options={PRACTICE_TYPES.map((t) => ({ value: t, label: t }))} value={type} onChange={setType} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-foreground">Length</span>
            <SegmentedControl
              aria-label="Number of questions"
              options={[
                { value: "3" as const, label: "Quick · 3 questions" },
                { value: "5" as const, label: "Full · up to 5", disabled: QUESTION_BANK[type].length < 4 },
              ]}
              value={QUESTION_BANK[type].length < 4 ? "3" : count}
              onChange={setCount}
            />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mic className="h-4 w-4 text-primary-text" aria-hidden="true" />
              {questions.length} {type.toLowerCase()} questions · about {questions.length * 4} minutes
            </p>
            <Button size="lg" leftIcon={<Play aria-hidden="true" />} onClick={start}>
              Start interview
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Past sessions
          </CardTitle>
          <span className="text-caption text-muted-foreground">{history.length}</span>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 px-3">
          {history.length === 0 && <EmptyState size="sm" icon={<History aria-hidden="true" />} title="No sessions yet" description="Your scored interviews appear here." />}
          {history.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => (h.responses.length ? setView({ kind: "result", session: h }) : onToast("Detailed answers are only kept for sessions taken on this device."))}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
            >
              <ProgressRing value={h.score} size={40} thickness={4} tone={scoreTone(h.score)} label={`Score ${h.score}%`}>
                <span className="text-[10px] font-semibold tabular-nums text-foreground">{h.score}</span>
              </ProgressRing>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {h.type} · {h.role}
                </span>
                <span className="block text-caption text-muted-foreground">
                  {h.date} · {formatDuration(h.durationSeconds)}
                </span>
              </span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function SessionResult({ session, onBack, onRetry }: { session: InterviewSessionResult; onBack: () => void; onRetry: () => void }) {
  return (
    <div className="grid gap-5">
      <Card>
        <CardContent className="flex flex-col items-center gap-5 pt-5 text-center sm:flex-row sm:text-left">
          <ProgressRing value={session.score} size={112} thickness={9} tone={scoreTone(session.score)} label="Interview score">
            <span className="text-2xl font-semibold tabular-nums text-foreground">{session.score}%</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <Badge tone={scoreTone(session.score)}>
              <Trophy className="h-3 w-3" aria-hidden="true" />
              {session.score >= 75 ? "Interview ready" : session.score >= 50 ? "Getting there" : "Keep practising"}
            </Badge>
            <h3 className="mt-2 text-h3 text-foreground">
              {session.type} interview · {session.role}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.responses.length} questions · {formatDuration(session.durationSeconds)} · {session.date}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onBack}>
              Done
            </Button>
            <Button variant="secondary" leftIcon={<RotateCcw aria-hidden="true" />} onClick={onRetry}>
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
      <Accordion
        multiple
        defaultOpen={session.responses.filter((r) => r.score < 75).map((r) => r.questionId)}
        items={session.responses.map((r, i) => ({
          id: r.questionId,
          title: (
            <span className="flex items-start gap-3">
              <Badge tone={scoreTone(r.score)} className="mt-0.5 shrink-0 tabular-nums">
                {r.score}%
              </Badge>
              <span className="line-clamp-2">
                {i + 1}. {r.question}
              </span>
            </span>
          ),
          content: (
            <div className="grid gap-4 pt-1">
              <div>
                <p className="mb-1 text-caption font-medium uppercase tracking-wider text-subtle-foreground">Your answer</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{r.answer || "Skipped"}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.found.map((c) => (
                  <Badge key={c} tone="success">
                    <Target className="h-3 w-3" aria-hidden="true" /> {c}
                  </Badge>
                ))}
                {r.missed.map((c) => (
                  <Badge key={c} tone="warning">
                    Missing: {c}
                  </Badge>
                ))}
              </div>
              <div className="rounded-md border-l-2 border-primary bg-surface-2 px-3 py-2">
                <p className="text-caption font-semibold text-primary-text">Strong answer</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{r.sampleAnswer}</p>
              </div>
            </div>
          ),
        }))}
      />
    </div>
  )
}
