import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, Clock, MessageSquareQuote, RotateCcw, Scale, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { ease, transition } from "@/lib/motion"
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, EmptyState, Field, Textarea } from "@/components/ui"
import { Skeleton } from "@/components/ui/skeleton"
import ProgressRing from "@/components/charts/ProgressRing"
import type { AssignmentData } from "@/pages/student/studentTypes"
import { loadEvaluation, type StudentEvaluation, type StudentRequest } from "@/pages/student/data/evaluation"

interface EvaluationDialogProps {
  assignment: AssignmentData | null
  onClose: () => void
  /** Sends a re-evaluation request; rejects with a message to show. */
  onRequest: (assignmentId: string, reason: string) => Promise<StudentRequest>
  onToast: (msg: string) => void
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

/** A graded assignment: score, rubric breakdown with the evaluator's comments, feedback and re-evaluation. */
export default function EvaluationDialog({ assignment, onClose, onRequest, onToast }: EvaluationDialogProps) {
  const last = useRef<AssignmentData | null>(null)
  if (assignment) last.current = assignment
  const shown = assignment ?? last.current

  const [data, setData] = useState<StudentEvaluation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!assignment) return
    let live = true
    setData(null)
    setError(null)
    loadEvaluation(assignment.id).then(
      (d) => live && setData(d),
      (e: Error) => live && setError(e.message),
    )
    return () => {
      live = false
    }
  }, [assignment, attempt])

  const pct = data?.score !== null && data?.score !== undefined ? Math.round((data.score * 100) / data.max_marks) : 0

  return (
    <Dialog open={!!assignment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {shown && (
          <div className="grid gap-5">
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="primary">{shown.course}</Badge>
                <Badge tone="success">Graded</Badge>
              </div>
              <DialogTitle className="mt-1">{shown.title}</DialogTitle>
              <DialogDescription>
                {data?.evaluator_name ? `Evaluated by ${data.evaluator_name}` : "Your evaluation"}
                {data?.graded_at ? ` · ${shortDate(data.graded_at)}` : ""}
              </DialogDescription>
            </DialogHeader>

            {error ? (
              <EmptyState
                size="sm"
                icon={<Search aria-hidden="true" />}
                title="The evaluation didn't load"
                description={error}
                action={
                  <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
                    Try again
                  </Button>
                }
              />
            ) : !data ? (
              <div className="grid gap-3" role="status" aria-label="Loading the evaluation">
                <Skeleton className="h-20" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-2/60 p-4">
                  <ProgressRing value={pct} size={64} thickness={6} tone={pct >= 70 ? "success" : pct >= 50 ? "warning" : "danger"} label={`Score ${pct}%`}>
                    <span className="text-sm font-semibold text-foreground">{data.grade}</span>
                  </ProgressRing>
                  <div className="min-w-0">
                    <p className="text-h3 font-semibold tabular-nums text-foreground">
                      {data.score}
                      <span className="text-base font-medium text-muted-foreground"> / {data.max_marks}</span>
                    </p>
                    <p className="truncate text-caption text-muted-foreground">{data.rubric ? data.rubric.title : "Graded before rubric scoring"}</p>
                  </div>
                </div>

                {data.rubric && data.scores && (
                  <section aria-labelledby="breakdown-title" className="grid gap-2">
                    <h3 id="breakdown-title" className="text-sm font-semibold text-foreground">
                      Rubric breakdown
                    </h3>
                    <ul className="grid gap-2">
                      {data.rubric.criteria.map((c, i) => {
                        const s = data.scores?.[c.id]
                        const points = s?.points ?? 0
                        return (
                          <motion.li
                            key={c.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...transition.base, delay: 0.05 * i }}
                            className="rounded-md border border-border bg-surface p-3"
                          >
                            <div className="flex items-baseline justify-between gap-3">
                              <p className="min-w-0 text-sm font-medium text-foreground">{c.title}</p>
                              <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                                {points}
                                <span className="font-normal text-muted-foreground">/{c.max_points}</span>
                              </p>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                              <motion.div
                                className="h-full rounded-full bg-primary"
                                style={{ originX: 0, width: "100%" }}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: points / c.max_points }}
                                transition={{ duration: 0.7, ease: ease.out, delay: 0.1 + 0.05 * i }}
                              />
                            </div>
                            {s?.comment && <p className="mt-2 text-caption leading-5 text-muted-foreground">{s.comment}</p>}
                          </motion.li>
                        )
                      })}
                    </ul>
                  </section>
                )}

                {data.feedback && (
                  <section aria-label="Feedback" className="rounded-md border border-success/30 bg-success-soft p-3">
                    <p className="flex items-center gap-1.5 text-caption font-semibold text-success">
                      <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden="true" /> Feedback
                    </p>
                    <p className="mt-1 text-sm leading-6 text-foreground">{data.feedback}</p>
                  </section>
                )}

                <Reevaluation data={data} assignmentId={shown.id} onRequest={onRequest} onSent={(r) => setData((d) => (d ? { ...d, reevaluation: r, can_request: false } : d))} onToast={onToast} />
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Reevaluation({
  data,
  assignmentId,
  onRequest,
  onSent,
  onToast,
}: {
  data: StudentEvaluation
  assignmentId: string
  onRequest: EvaluationDialogProps["onRequest"]
  onSent: (r: StudentRequest) => void
  onToast: (m: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const r = data.reevaluation

  if (r) {
    const tone = r.status === "Revised" ? "success" : r.status === "Upheld" ? "neutral" : r.status === "In Review" ? "warning" : "info"
    const Icon = r.status === "Revised" ? CheckCircle2 : r.status === "Upheld" ? Scale : Clock
    const title =
      r.status === "Pending"
        ? "Waiting for an evaluator"
        : r.status === "In Review"
          ? "An evaluator is reviewing your request"
          : r.status === "Revised"
            ? `Score revised: ${r.original_score} → ${r.revised_score}`
            : `Score unchanged: ${r.original_score}`
    return (
      <section aria-labelledby="reeval-title" className="rounded-lg border border-border p-4">
        <div className="flex items-start gap-3">
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", tone === "success" ? "bg-success-soft text-success" : tone === "warning" ? "bg-warning-soft text-warning" : tone === "info" ? "bg-info-soft text-info" : "bg-surface-2 text-muted-foreground")}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="reeval-title" className="text-sm font-semibold text-foreground">
                {title}
              </h3>
              <Badge tone={tone} size="sm">
                Re-evaluation · {r.status}
              </Badge>
            </div>
            <p className="mt-1 text-caption text-muted-foreground">
              Asked {shortDate(r.created_at)}
              {r.resolved_at ? ` · answered ${shortDate(r.resolved_at)}` : ". Your score stays as it is until an evaluator decides."}
            </p>
            {r.resolution && <blockquote className="mt-3 border-l-2 border-primary pl-3 text-sm leading-6 text-foreground">{r.resolution}</blockquote>}
          </div>
        </div>
      </section>
    )
  }

  if (!data.can_request) {
    return data.reevaluation_closes_at ? (
      <p className="text-caption text-muted-foreground">Re-evaluation requests for this grade closed on {shortDate(data.reevaluation_closes_at)}.</p>
    ) : null
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (reason.trim().length < 20) {
      setError("Say what you'd like checked again in a sentence or two.")
      return
    }
    setSending(true)
    setError(null)
    try {
      const sent = await onRequest(assignmentId, reason.trim())
      onSent(sent)
      onToast("Re-evaluation requested. We'll let you know the outcome.")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <section aria-label="Re-evaluation" className="rounded-lg border border-dashed border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Think something was missed?</p>
          <p className="text-caption text-muted-foreground">
            You can ask for one re-evaluation until {data.reevaluation_closes_at ? shortDate(data.reevaluation_closes_at) : "the window closes"}.
          </p>
        </div>
        {!open && (
          <Button size="sm" variant="outline" leftIcon={<RotateCcw aria-hidden="true" />} onClick={() => setOpen(true)}>
            Request re-evaluation
          </Button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            onSubmit={send}
            noValidate
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: transition.fast }}
            transition={transition.base}
            className="mt-4 grid gap-3"
          >
            <Field label="What should be checked again?" hint="Point to the criterion and the part of your work it missed." error={error}>
              <Textarea rows={4} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: the tool-use criterion missed the retry wrapper in agent.py, line 48." />
            </Field>
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption tabular-nums text-subtle-foreground">{reason.length} / 1000</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={sending}>
                  Send request
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  )
}
