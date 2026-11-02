import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  FileCode2,
  GitBranch,
  Info,
  Lock,
  MessageSquareQuote,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import { Avatar, Badge, Button, Card, CardContent, EmptyState, Field, Kbd, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, Tooltip } from "@/components/ui"
import { useToast } from "@/components/ui/toast"
import ProgressRing from "@/components/charts/ProgressRing"
import CodeViewer from "@/components/evaluator/CodeViewer"
import RubricScorer from "@/components/evaluator/RubricScorer"
import ScoreDial from "@/components/evaluator/ScoreDial"
import StatePill from "@/components/evaluator/StatePill"
import { mutate } from "@/lib/resource"
import { useEvaluator, useEvaluatorResource } from "./data/EvaluatorDataProvider"
import { discardDraft, fileLink, finishEvaluation, loadFilePreview, loadWorkspace, releaseEvaluations, reopenEvaluation, saveDraft } from "./data/api"
import { dateTime, dueLabel, letterGrade, relTime, shortDate } from "./data/derive"
import type { EvaluationDraft, QueueItem, Scores, Workspace } from "./data/types"

type SaveState = { status: "idle" } | { status: "saving" } | { status: "saved"; at: number } | { status: "error"; message: string }

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

/** /evaluator/queue/next opens the first submission to mark. */
export default function WorkspacePage() {
  const { submissionId } = useParams()
  const { toMark } = useEvaluator()
  if (submissionId === "next") return <Navigate to={toMark[0] ? `/evaluator/queue/${toMark[0].id}` : "/evaluator/queue"} replace />
  if (!submissionId) return <Navigate to="/evaluator/queue" replace />
  return <Workspace key={submissionId} id={submissionId} />
}

function Workspace({ id }: { id: string }) {
  const { uid, queue, toMark, profile, reload, patchItem, now } = useEvaluator()
  const navigate = useNavigate()
  const toast = useToast()
  const resource = useEvaluatorResource(`submission:${id}`, () => loadWorkspace(id), 15_000)
  const ws = resource.data

  // Prev / next within the work to mark (or the whole queue for finished work).
  const nav = useMemo(() => {
    const pool: QueueItem[] = toMark.some((i) => i.id === id) ? toMark : queue.items
    const at = pool.findIndex((i) => i.id === id)
    return { pool, at, prev: at > 0 ? pool[at - 1] : null, next: at >= 0 && at < pool.length - 1 ? pool[at + 1] : null, label: pool === toMark ? "to mark" : "in the queue" }
  }, [toMark, queue.items, id])
  const go = useCallback((item: QueueItem | null) => item && navigate(`/evaluator/queue/${item.id}`), [navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("[role=dialog]")) return
      if (e.key === "[") go(nav.prev)
      if (e.key === "]") go(nav.next)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, nav])

  if (resource.error && !ws) {
    return (
      <EmptyState
        icon={<CircleAlert aria-hidden="true" />}
        title={resource.error.status === 404 ? "This submission isn't in your queue" : "The submission didn't load"}
        description={resource.error.status === 404 ? "It may belong to an assessment you don't mark, or it was removed." : resource.error.message}
        action={
          <div className="flex gap-2">
            {resource.error.status !== 404 && (
              <Button size="sm" variant="outline" onClick={() => void resource.reload()}>
                Try again
              </Button>
            )}
            <Button size="sm" onClick={() => navigate("/evaluator/queue")}>
              Back to the queue
            </Button>
          </div>
        }
      />
    )
  }
  if (!ws) return <WorkspaceSkeleton />

  const setWorkspace = (fn: (w: Workspace) => Workspace) => mutate<Workspace>(`${uid}:ev:submission:${id}`, fn)
  const afterFinish = () => {
    reload()
    const upcoming = toMark.filter((i) => i.id !== id)
    if (profile.preferences.auto_advance && upcoming.length) {
      const after = nav.pool === toMark && nav.next ? nav.next : upcoming[0]
      navigate(`/evaluator/queue/${after.id}`)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Header ws={ws} nav={nav} onGo={go} now={now} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(400px,480px)]">
        <SubmissionPanel ws={ws} now={now} />
        <RubricPanel
          ws={ws}
          onWorkspace={setWorkspace}
          onQueue={(patch) => patchItem(id, patch)}
          onFinished={(released, w) => {
            toast.success(released ? `Released to ${w.student.name}.` : "Marked as evaluated. Release it from the queue when you're ready.")
            afterFinish()
          }}
          onChanged={reload}
          showLevels={profile.preferences.show_levels}
        />
      </div>
    </div>
  )
}

function Header({ ws, nav, onGo, now }: { ws: Workspace; nav: { prev: QueueItem | null; next: QueueItem | null; at: number; pool: QueueItem[]; label: string }; onGo: (i: QueueItem | null) => void; now: number }) {
  const s = ws.submission
  const due = dueLabel(ws.assignment.due_at, now)
  return (
    <motion.header initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={transition.base} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-caption text-muted-foreground">
          <Link to="/evaluator/queue" className="inline-flex items-center gap-1 rounded hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Queue
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate" aria-current="page">
            {ws.student.name}
          </span>
        </nav>
        {nav.at >= 0 && (
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden text-caption tabular-nums text-muted-foreground sm:inline">
              {nav.at + 1} of {nav.pool.length} {nav.label}
            </span>
            <Tooltip content={<span className="flex items-center gap-1.5">Previous <Kbd>[</Kbd></span>}>
              <Button variant="outline" size="icon-sm" aria-label="Previous submission" disabled={!nav.prev} onClick={() => onGo(nav.prev)}>
                <ChevronLeft aria-hidden="true" />
              </Button>
            </Tooltip>
            <Tooltip content={<span className="flex items-center gap-1.5">Next <Kbd>]</Kbd></span>}>
              <Button variant="outline" size="icon-sm" aria-label="Next submission" disabled={!nav.next} onClick={() => onGo(nav.next)}>
                <ChevronRight aria-hidden="true" />
              </Button>
            </Tooltip>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={ws.student.name} src={ws.student.avatar_url} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="primary">{ws.assignment.course_code}</Badge>
            {s.late && <Badge tone="danger">Submitted late</Badge>}
            <Badge tone={due.closed ? "neutral" : due.urgent ? "warning" : "neutral"}>{due.label}</Badge>
          </div>
          <h1 className="mt-1.5 text-[22px] font-semibold leading-7 tracking-tight text-foreground sm:text-h2">{ws.assignment.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{ws.student.name}</span>
            {ws.student.roll_number ? ` · ${ws.student.roll_number}` : ""} · submitted {relTime(s.submitted_at, now)} ({dateTime(s.submitted_at)})
          </p>
        </div>
      </div>
    </motion.header>
  )
}

/* ------------------------------------------------------------------ Submission ------------------------------------------------------------------ */

function SubmissionPanel({ ws, now }: { ws: Workspace; now: number }) {
  const [tab, setTab] = useState("submission")
  return (
    <section aria-label="Submission" className="min-w-0">
      <Tabs value={tab} onValueChange={setTab} variant="underline">
        <TabsList aria-label="Submission details">
          <TabsTrigger value="submission">Submission</TabsTrigger>
          <TabsTrigger value="student">Student</TabsTrigger>
        </TabsList>
        <TabsContent value="submission" className="grid gap-4">
          <SubmissionFiles ws={ws} />
          <Card>
            <CardContent className="grid gap-4 pt-5">
              <p className="text-caption font-medium text-muted-foreground">The brief</p>
              <p className="-mt-2 text-sm leading-6 text-foreground">{ws.assignment.description}</p>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Fact label="Course" value={`${ws.assignment.course_code} · ${ws.assignment.course_title}`} />
                <Fact label="Due" value={dateTime(ws.assignment.due_at)} />
                <Fact label="Marks" value={String(ws.assignment.max_marks)} />
              </dl>
              {ws.rubric?.guidance && (
                <div className="rounded-md border border-info/30 bg-info-soft p-3">
                  <p className="text-caption font-semibold text-info">How to mark this assessment</p>
                  <p className="mt-1 text-sm leading-6 text-foreground">{ws.rubric.guidance}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="student">
          <Card>
            <CardContent className="grid gap-5 pt-5">
              <div className="flex items-center gap-4">
                <Avatar name={ws.student.name} src={ws.student.avatar_url} size="lg" />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">{ws.student.name}</p>
                  <p className="text-caption text-muted-foreground">{[ws.student.roll_number, ws.student.program].filter(Boolean).join(" · ")}</p>
                  {ws.student.batch && <p className="text-caption text-muted-foreground">{ws.student.batch}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-md border border-border bg-surface-2/60 p-4">
                {ws.student.average_pct !== null ? (
                  <ProgressRing value={ws.student.average_pct} size={56} thickness={5} tone={ws.student.average_pct >= 70 ? "success" : "warning"} label="Average on graded work" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-caption text-muted-foreground ring-1 ring-border">–</span>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{ws.student.graded_count ? `Averages ${ws.student.average_pct}% on ${ws.student.graded_count} other graded ${ws.student.graded_count === 1 ? "assignment" : "assignments"}` : "No other graded work yet"}</p>
                  <p className="text-caption text-muted-foreground">Mark against the rubric, not the average. It's here for context only.</p>
                </div>
              </div>
              {ws.reevaluation && (
                <div className="rounded-md border border-warning/30 bg-warning-soft p-3">
                  <p className="text-caption font-semibold text-warning">Re-evaluation {ws.reevaluation.status.toLowerCase()} · asked {relTime(ws.reevaluation.created_at, now)}</p>
                  <p className="mt-1 text-sm leading-6 text-foreground">{ws.reevaluation.reason}</p>
                  <Link to={`/evaluator/reevaluations?request=${ws.reevaluation.id}`} className="mt-2 inline-flex text-caption font-medium text-primary-text hover:underline">
                    Open the request
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

function SubmissionFiles({ ws }: { ws: Workspace }) {
  const s = ws.submission
  const toast = useToast()
  const [opening, setOpening] = useState(false)
  const preview = useEvaluatorResource(s.file?.language ? `file:${s.id}` : null, () => loadFilePreview(s.id), 300_000)
  const open = async () => {
    setOpening(true)
    try {
      window.open(await fileLink(s.id), "_blank", "noopener,noreferrer")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setOpening(false)
    }
  }
  return (
    <div className="grid gap-4">
      {s.repo_url && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-foreground ring-1 ring-inset ring-border">
              <GitBranch className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-caption text-muted-foreground">Repository</p>
              <p className="truncate font-mono text-[13px] text-foreground">{s.repo_url.replace(/^https:\/\/(www\.)?/, "")}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href={s.repo_url} target="_blank" rel="noopener noreferrer">
                Open <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
      {s.comments && (
        <Card>
          <CardContent className="pt-5">
            <p className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
              <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden="true" /> Notes from the student
            </p>
            <blockquote className="mt-2 border-l-2 border-primary pl-3 text-sm leading-6 text-foreground">{s.comments}</blockquote>
          </CardContent>
        </Card>
      )}
      {s.file ? (
        <Card>
          <CardContent className="grid gap-3 pt-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-text ring-1 ring-inset ring-primary-border">
                <FileCode2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{s.file.name}</p>
                <p className="text-caption text-muted-foreground">{[s.file.size, s.file.language].filter(Boolean).join(" · ")}</p>
              </div>
              <Button variant="outline" size="sm" loading={opening} onClick={() => void open()}>
                Open file <ExternalLink aria-hidden="true" />
              </Button>
            </div>
            {s.file.language &&
              (preview.data ? (
                <CodeViewer preview={preview.data} />
              ) : preview.error ? (
                <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">{preview.error.message}</p>
              ) : (
                <div className="grid gap-2 rounded-md border border-border p-4" role="status" aria-label="Loading the file">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} className={cn("h-3", i % 3 === 2 ? "w-2/5" : i % 2 ? "w-4/5" : "w-3/5")} />
                  ))}
                </div>
              ))}
          </CardContent>
        </Card>
      ) : (
        !s.repo_url && <EmptyState size="sm" icon={<FileCode2 aria-hidden="true" />} title="Nothing attached" description="This submission has no repository link or file." />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------- Rubric ------------------------------------------------------------------- */

const AUTOSAVE_MS = 1200

function RubricPanel({
  ws,
  onWorkspace,
  onQueue,
  onFinished,
  onChanged,
  showLevels,
}: {
  ws: Workspace
  onWorkspace: (fn: (w: Workspace) => Workspace) => void
  onQueue: (patch: Partial<QueueItem>) => void
  onFinished: (released: boolean, ws: Workspace) => void
  onChanged: () => void
  showLevels: boolean
}) {
  const toast = useToast()
  const e = ws.evaluation
  const rubric = ws.rubric
  const legacyGraded = !e && ws.submission.status === "Graded"
  const claimedByOther = !!e && e.status === "draft" && !e.mine && !!e.evaluator_id
  const editable = !!rubric && !legacyGraded && !claimedByOther && (!e || e.status === "draft")

  const [draft, setDraft] = useState<EvaluationDraft>(() => ({ scores: e?.scores ?? {}, feedback: e?.feedback ?? "", private_note: e?.private_note ?? "" }))
  const [dirty, setDirty] = useState(false)
  const [save, setSave] = useState<SaveState>(e ? { status: "saved", at: Date.parse(e.updated_at) } : { status: "idle" })
  const [busy, setBusy] = useState<null | "finish" | "release" | "reopen" | "discard">(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [guidance, setGuidance] = useState(false)
  const latest = useRef(draft)
  latest.current = draft
  const seq = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inflight = useRef<Promise<void> | null>(null)

  // On wide screens the panel sticks beside the submission and scrolls on its own. It always ends at the bottom
  // of the viewport, so the score and the actions stay visible before and after it sticks.
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = panelRef.current
    const main = document.getElementById("main")
    if (!el || !main) return
    let frame = 0
    const fit = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (window.innerWidth < 1024) {
          el.style.maxHeight = ""
          return
        }
        el.style.maxHeight = `${Math.max(360, window.innerHeight - Math.max(0, el.getBoundingClientRect().top) - 16)}px`
      })
    }
    fit()
    main.addEventListener("scroll", fit, { passive: true })
    window.addEventListener("resize", fit)
    return () => {
      cancelAnimationFrame(frame)
      main.removeEventListener("scroll", fit)
      window.removeEventListener("resize", fit)
    }
  }, [])

  const scored = rubric ? rubric.criteria.filter((c) => typeof draft.scores[c.id]?.points === "number").length : 0
  const total = rubric ? rubric.criteria.reduce((s, c) => s + (draft.scores[c.id]?.points ?? 0), 0) : 0
  const score = rubric ? Math.round((total / Math.max(1, rubric.max_points)) * ws.assignment.max_marks) : 0

  // Saves go out one at a time, in order, so a slow save can't land after a newer one. A queued save that a newer
  // one has replaced is skipped before it's sent.
  const persist = useCallback(() => {
    clearTimeout(timer.current)
    const mine = ++seq.current
    setSave({ status: "saving" })
    const run = (inflight.current ?? Promise.resolve()).then(async () => {
      if (mine !== seq.current) return
      try {
        const saved = await saveDraft(ws.submission.id, latest.current)
        if (mine !== seq.current) return
        setDirty(false)
        setSave({ status: "saved", at: Date.now() })
        onWorkspace((w) => ({ ...w, evaluation: saved, submission: { ...w.submission, status: "Under Review" } }))
        onQueue({ state: "draft", mine: true, evaluator_id: saved.evaluator_id, evaluator_name: saved.evaluator_name, score: Math.round((saved.total / Math.max(1, rubric?.max_points ?? 1)) * ws.assignment.max_marks), evaluation_updated_at: saved.updated_at })
      } catch (err) {
        if (mine !== seq.current) return
        setSave({ status: "error", message: (err as Error).message })
      }
    })
    inflight.current = run
    return run
  }, [ws.submission.id, ws.assignment.max_marks, rubric?.max_points, onWorkspace, onQueue])

  /** Cancels the pending autosave and waits for saves already on their way, before finishing or discarding. */
  const stopSaving = async () => {
    clearTimeout(timer.current)
    await inflight.current
  }

  // Autosave a moment after the last change (not while finishing or discarding); flush when leaving the page.
  useEffect(() => {
    if (!dirty || !editable || busy) return
    timer.current = setTimeout(() => void persist(), AUTOSAVE_MS)
    return () => clearTimeout(timer.current)
  }, [draft, dirty, editable, busy, persist])
  const pending = useRef({ dirty, editable, persist })
  pending.current = { dirty, editable, persist }
  useEffect(() => () => void (pending.current.dirty && pending.current.editable && pending.current.persist()), [])

  const change = (fn: (d: EvaluationDraft) => EvaluationDraft) => {
    setDraft((d) => fn(d))
    setDirty(true)
    setHighlight(null)
  }
  const setScore = (criterionId: string, entry: Scores[string]) => change((d) => ({ ...d, scores: { ...d.scores, [criterionId]: entry } }))

  const finish = async (release: boolean) => {
    if (!rubric) return
    const missing = rubric.criteria.find((c) => typeof draft.scores[c.id]?.points !== "number")
    if (missing) {
      setHighlight(missing.id)
      toast.error(`Score "${missing.title}" before finishing.`)
      return
    }
    if (draft.feedback.trim().length < 20) {
      setFeedbackError("Write at least a sentence of feedback for the student.")
      document.getElementById("evaluation-feedback")?.focus()
      return
    }
    setBusy(release ? "release" : "finish")
    try {
      await stopSaving()
      const r = await finishEvaluation(ws.submission.id, latest.current, release)
      setDirty(false)
      const finalScore = Math.round((r.evaluation.total / Math.max(1, rubric.max_points)) * ws.assignment.max_marks)
      const grade = letterGrade((finalScore * 100) / ws.assignment.max_marks)
      const next: Workspace = {
        ...ws,
        evaluation: r.evaluation,
        submission: { ...ws.submission, status: r.released ? "Graded" : "Under Review", score: r.released ? finalScore : ws.submission.score, grade: r.released ? grade : ws.submission.grade },
      }
      onWorkspace(() => next)
      onQueue({ state: r.released ? "released" : "evaluated", mine: true, score: finalScore, grade, evaluated_at: r.evaluation.evaluated_at, released_at: r.evaluation.released_at })
      onFinished(r.released, next)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const reopen = async () => {
    setBusy("reopen")
    try {
      const ev = await reopenEvaluation(ws.submission.id)
      onWorkspace((w) => ({ ...w, evaluation: ev }))
      onQueue({ state: "draft", evaluated_at: null })
      setDraft({ scores: ev.scores, feedback: ev.feedback, private_note: ev.private_note })
      onChanged()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const releaseNow = async () => {
    setBusy("release")
    try {
      await releaseEvaluations([ws.submission.id])
      const at = new Date().toISOString()
      onWorkspace((w) => ({ ...w, evaluation: w.evaluation ? { ...w.evaluation, status: "released", released_at: at } : null, submission: { ...w.submission, status: "Graded", score, grade: letterGrade((score * 100) / ws.assignment.max_marks), graded_at: at } }))
      onQueue({ state: "released", released_at: at })
      toast.success(`Released to ${ws.student.name}.`)
      onChanged()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const discard = async () => {
    setBusy("discard")
    try {
      await stopSaving()
      await discardDraft(ws.submission.id)
      setDraft({ scores: {}, feedback: "", private_note: "" })
      setDirty(false)
      setSave({ status: "idle" })
      onWorkspace((w) => ({ ...w, evaluation: null, submission: { ...w.submission, status: "Submitted" } }))
      onQueue({ state: "pending", mine: false, evaluator_id: null, evaluator_name: null, score: null })
      toast.show("Draft discarded. The submission is back in the queue.")
      onChanged()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  // Cmd/Ctrl + Enter finishes from anywhere in the rubric.
  const finishRef = useRef(finish)
  finishRef.current = finish
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter" && editable && !busy) {
        ev.preventDefault()
        void finishRef.current(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [editable, busy])

  // Criterion comments the feedback doesn't contain yet, as "Criterion: comment" lines.
  const newCommentLines = rubric
    ? rubric.criteria
        .map((c) => {
          const comment = draft.scores[c.id]?.comment?.trim()
          return comment && !draft.feedback.includes(comment) ? `${c.title}: ${comment}` : null
        })
        .filter((l): l is string => !!l)
    : []
  const commentDraft = () => {
    if (!newCommentLines.length) return
    change((d) => ({ ...d, feedback: [d.feedback.trim(), ...newCommentLines].filter(Boolean).join("\n") }))
  }
  const hasComments = newCommentLines.length > 0

  if (!rubric) {
    return (
      <aside aria-label="Rubric">
        <EmptyState icon={<Info aria-hidden="true" />} title="This assessment has no rubric yet" description="Rubric scoring opens once the assessment's rubric is published." />
      </aside>
    )
  }

  return (
    <aside aria-label="Rubric" className="lg:sticky lg:top-4 lg:self-start">
      <div ref={panelRef} className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--elev-xs)]">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-caption text-muted-foreground">Rubric · {rubric.version}</p>
            <h2 className="truncate text-[15px] font-semibold text-foreground">{rubric.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatePill item={{ state: e?.status === "evaluated" ? "evaluated" : e?.status === "released" || legacyGraded ? "released" : e ? "draft" : "pending", mine: !!e?.mine || !e, evaluator_name: e?.evaluator_name ?? null, score: null, max_marks: ws.assignment.max_marks, grade: null }} />
            {rubric.guidance && (
              <Tooltip content="How to mark this assessment">
                <Button variant="ghost" size="icon-sm" aria-label="How to mark this assessment" aria-expanded={guidance} onClick={() => setGuidance((g) => !g)}>
                  <Info aria-hidden="true" />
                </Button>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence initial={false}>
            {guidance && rubric.guidance && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: transition.fast }} transition={transition.base} className="mb-4 rounded-md border border-info/30 bg-info-soft p-3 text-sm leading-6 text-foreground">
                {rubric.guidance}
              </motion.p>
            )}
          </AnimatePresence>

          <StatusBanner ws={ws} claimedByOther={claimedByOther} legacyGraded={legacyGraded} />

          <RubricScorer criteria={rubric.criteria} scores={draft.scores} onChange={editable ? setScore : undefined} showLevels={showLevels} highlight={highlight} />

          <div className="mt-4 grid gap-4">
            {editable ? (
              <>
                <Field
                  id="evaluation-feedback"
                  label="Feedback for the student"
                  hint={`${draft.feedback.length}/4000 · Shared when you release`}
                  error={feedbackError}
                  aside={
                    hasComments && (
                      <Button variant="link" size="sm" className="h-auto text-caption" leftIcon={<Sparkles aria-hidden="true" />} onClick={commentDraft}>
                        Add my comments
                      </Button>
                    )
                  }
                >
                  <Textarea
                    rows={5}
                    maxLength={4000}
                    value={draft.feedback}
                    onChange={(ev) => {
                      setFeedbackError(null)
                      change((d) => ({ ...d, feedback: ev.target.value }))
                    }}
                    placeholder="What went well, what to improve, and how."
                  />
                </Field>
                <Field label="Private note" hint="Only you can see this.">
                  <Textarea rows={2} maxLength={2000} value={draft.private_note} onChange={(ev) => change((d) => ({ ...d, private_note: ev.target.value }))} placeholder="Reminders for yourself, e.g. re-run the eval notebook." className="min-h-[60px]" />
                </Field>
              </>
            ) : (
              (e?.feedback || ws.submission.score !== null) && (
                <div className="rounded-md border border-border bg-surface-2/60 p-3">
                  <p className="text-caption font-semibold text-muted-foreground">Feedback for the student</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-foreground">{e?.feedback || "No feedback recorded."}</p>
                  {e?.mine && e.private_note && <p className="mt-2 border-t border-border pt-2 text-caption text-muted-foreground">Private note: {e.private_note}</p>}
                </div>
              )
            )}
          </div>
        </div>

        <div className="border-t border-border bg-surface-2/60 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {legacyGraded ? (
              <p className="text-sm text-foreground">
                Graded {ws.submission.score}/{ws.assignment.max_marks} ({ws.submission.grade}) before rubric scoring
              </p>
            ) : (
              <ScoreDial total={total} rubricMax={rubric.max_points} maxMarks={ws.assignment.max_marks} scored={scored} criteria={rubric.criteria.length} />
            )}
            {editable && <SaveStatus save={save} dirty={dirty} onRetry={() => void persist()} />}
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {editable && (
              <>
                {e?.mine && (
                  <Button variant="ghost" size="sm" leftIcon={<Trash2 aria-hidden="true" />} loading={busy === "discard"} disabled={!!busy} onClick={() => void discard()}>
                    Discard
                  </Button>
                )}
                <Tooltip content={<span className="flex items-center gap-1.5">Finish <Kbd>Ctrl</Kbd><Kbd>Enter</Kbd></span>}>
                  <Button variant="secondary" size="sm" loading={busy === "finish"} disabled={!!busy} onClick={() => void finish(false)}>
                    Finish
                  </Button>
                </Tooltip>
                <Button size="sm" leftIcon={<Send aria-hidden="true" />} loading={busy === "release"} disabled={!!busy} onClick={() => void finish(true)}>
                  Finish & release
                </Button>
              </>
            )}
            {e?.status === "evaluated" && e.mine && (
              <>
                <Button variant="outline" size="sm" leftIcon={<RotateCcw aria-hidden="true" />} loading={busy === "reopen"} disabled={!!busy} onClick={() => void reopen()}>
                  Reopen
                </Button>
                <Button size="sm" leftIcon={<Send aria-hidden="true" />} loading={busy === "release"} disabled={!!busy} onClick={() => void releaseNow()}>
                  Release to student
                </Button>
              </>
            )}
            {(e?.status === "released" || legacyGraded) && ws.reevaluation && (
              <Button asChild variant="outline" size="sm">
                <Link to={`/evaluator/reevaluations?request=${ws.reevaluation.id}`}>Open the re-evaluation request</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

function StatusBanner({ ws, claimedByOther, legacyGraded }: { ws: Workspace; claimedByOther: boolean; legacyGraded: boolean }) {
  const e = ws.evaluation
  const banner = claimedByOther
    ? { tone: "neutral", icon: Lock, text: `${e?.evaluator_name ?? "Another evaluator"} is marking this submission. You can read it, but only they can change it.` }
    : e?.status === "evaluated" && !e.mine
      ? { tone: "neutral", icon: Lock, text: `${e.evaluator_name ?? "Another evaluator"} finished this evaluation. It's waiting for them to release it.` }
      : e?.status === "evaluated"
        ? { tone: "primary", icon: CalendarClock, text: `Finished ${relTime(e.evaluated_at)}. The student sees nothing until you release it.` }
        : e?.status === "released"
          ? { tone: "success", icon: Send, text: `Released ${e.released_at ? shortDate(e.released_at) : ""}${e.evaluator_name ? ` by ${e.evaluator_name}` : ""}. Changes go through a re-evaluation request.` }
          : legacyGraded
            ? { tone: "success", icon: Send, text: "This grade was given before rubric scoring. Changes go through a re-evaluation request." }
            : null
  if (!banner) return null
  const Icon = banner.icon
  return (
    <div className={cn("mb-4 flex items-start gap-2.5 rounded-md border p-3 text-sm leading-6", banner.tone === "success" ? "border-success/30 bg-success-soft" : banner.tone === "primary" ? "border-primary-border bg-primary-soft" : "border-border bg-surface-2")}>
      <Icon className={cn("mt-1 h-4 w-4 shrink-0", banner.tone === "success" ? "text-success" : banner.tone === "primary" ? "text-primary-text" : "text-muted-foreground")} aria-hidden="true" />
      <p className="text-foreground">{banner.text}</p>
    </div>
  )
}

function SaveStatus({ save, dirty, onRetry }: { save: SaveState; dirty: boolean; onRetry: () => void }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])
  const text =
    save.status === "saving" ? "Saving…" : save.status === "error" ? "Not saved" : dirty ? "Unsaved changes" : save.status === "saved" ? `Saved ${relTime(new Date(save.at).toISOString())}` : "Changes save automatically"
  return (
    <p className="flex items-center gap-2 text-caption text-muted-foreground" role="status" aria-live="polite">
      <span className={cn("h-1.5 w-1.5 rounded-full", save.status === "error" ? "bg-danger" : save.status === "saving" || dirty ? "bg-warning" : "bg-success")} aria-hidden="true" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={text} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={transition.fast}>
          {text}
        </motion.span>
      </AnimatePresence>
      {save.status === "error" && (
        <button type="button" onClick={onRetry} className="font-medium text-primary-text hover:underline" title={save.message}>
          Retry
        </button>
      )}
    </p>
  )
}

function WorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Loading the submission">
      <Skeleton className="h-4 w-40" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(400px,480px)]">
        <Skeleton className="h-[420px]" />
        <Skeleton className="h-[560px]" />
      </div>
    </div>
  )
}
