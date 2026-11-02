import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, CheckCircle2, Hand, RotateCcw, Scale } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import { Avatar, Badge, Button, Card, CardContent, EmptyState, Field, PageHeader, SegmentedControl, Sheet, SheetContent, SheetTitle, Skeleton, Textarea } from "@/components/ui"
import { useToast } from "@/components/ui/toast"
import RubricScorer from "@/components/evaluator/RubricScorer"
import ScoreDial from "@/components/evaluator/ScoreDial"
import { mutate } from "@/lib/resource"
import { useEvaluator, useEvaluatorResource } from "./data/EvaluatorDataProvider"
import { loadWorkspace, resolveReevaluation, startReevaluation } from "./data/api"
import { dateTime, letterGrade, REQUEST_META, relTime, shortTitle } from "./data/derive"
import type { ReevaluationItem, Scores } from "./data/types"

type View = "open" | "answered"

export default function ReevaluationsPage() {
  const { requests, now } = useEvaluator()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get("request")
  const selected = requests.find((r) => r.id === selectedId) ?? null
  const isOpen = (r: ReevaluationItem) => r.status === "Pending" || r.status === "In Review"
  const [view, setView] = useState<View>(() => (selected && !isOpen(selected) ? "answered" : "open"))
  const list = useMemo(() => requests.filter((r) => (view === "open" ? isOpen(r) : !isOpen(r))), [requests, view])
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1024px)").matches)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const on = () => setWide(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])

  // On wide screens the first request opens on its own, so the detail pane is never empty.
  const active = selected ?? (wide ? (list[0] ?? null) : null)
  const select = (id: string | null) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (id) next.set("request", id)
        else next.delete("request")
        return next
      },
      { replace: true },
    )

  const open = requests.filter(isOpen).length
  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Evaluation desk"
        title="Re-evaluations"
        description="Students can ask for a released grade to be checked again, once, within 14 days. Take a request, look again, and explain your decision."
      />
      <div className="mb-4">
        <SegmentedControl
          aria-label="Requests"
          size="sm"
          value={view}
          onChange={(v) => {
            setView(v)
            select(null)
          }}
          options={[
            { value: "open", label: `Open · ${open}` },
            { value: "answered", label: `Answered · ${requests.length - open}` },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<RotateCcw aria-hidden="true" />}
          title={view === "open" ? "No open requests" : "No answered requests yet"}
          description={view === "open" ? "When a student asks for a grade to be checked again, the request appears here." : "Requests you or your colleagues answer appear here."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <ul className="grid content-start gap-2" aria-label={view === "open" ? "Open requests" : "Answered requests"}>
            {list.map((r, i) => {
              const on = active?.id === r.id
              const meta = REQUEST_META[r.status]
              return (
                <motion.li key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...transition.base, delay: i * 0.03 }}>
                  <button
                    type="button"
                    onClick={() => select(r.id)}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "relative flex w-full items-start gap-3 rounded-lg border bg-surface p-3 text-left transition-[border-color,box-shadow] duration-200 hover:shadow-[var(--elev-md)]",
                      on ? "border-primary-border" : "border-border hover:border-border-strong/60",
                    )}
                  >
                    {on && <motion.span layoutId="request-active" transition={spring.snappy} className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-primary" aria-hidden="true" />}
                    <Avatar name={r.student_name} src={r.student_avatar} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{r.student_name}</span>
                        <Badge tone={meta.tone} size="sm">
                          {meta.label}
                        </Badge>
                      </span>
                      <span className="block truncate text-caption text-muted-foreground">
                        {r.course_code} · {shortTitle(r.assignment_title)}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2 text-caption">
                        <span className="tabular-nums text-foreground">
                          {r.status === "Revised" ? `${r.original_score} → ${r.revised_score}` : `${r.original_score}/${r.max_marks}`}
                        </span>
                        <span className="text-subtle-foreground">{relTime(r.created_at, now)}</span>
                      </span>
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </ul>

          {wide ? (
            <AnimatePresence mode="wait">
              {active && (
                <motion.div key={active.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, transition: transition.fast }} transition={transition.base} className="min-w-0">
                  <RequestDetail request={active} />
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <Sheet open={!!selected} onOpenChange={(o) => !o && select(null)}>
              <SheetContent side="bottom" className="max-h-[92dvh]">
                <SheetTitle className="sr-only">Re-evaluation request</SheetTitle>
                {selected && <RequestDetail request={selected} />}
              </SheetContent>
            </Sheet>
          )}
        </div>
      )}
    </div>
  )
}

function RequestDetail({ request: r }: { request: ReevaluationItem }) {
  const { uid, now, reload, profile } = useEvaluator()
  const showLevels = profile.preferences.show_levels
  const toast = useToast()
  const ws = useEvaluatorResource(`submission:${r.submission_id}`, () => loadWorkspace(r.submission_id), 15_000)
  const [decision, setDecision] = useState<"uphold" | "revise">("uphold")
  const [scores, setScores] = useState<Scores | null>(null)
  const [resolution, setResolution] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<null | "start" | "send">(null)
  const answered = r.status === "Revised" || r.status === "Upheld"
  const takenByOther = r.status === "In Review" && !r.mine
  const deciding = r.status === "In Review" && r.mine

  const current = ws.data?.evaluation?.scores ?? {}
  const rubric = ws.data?.rubric ?? null
  useEffect(() => {
    if (decision === "revise" && scores === null && ws.data) setScores(ws.data.evaluation?.scores ?? {})
  }, [decision, scores, ws.data])

  const patchRequest = (next: ReevaluationItem) => mutate<ReevaluationItem[]>(`${uid}:ev:requests`, (list) => list.map((x) => (x.id === next.id ? next : x)))

  const take = async () => {
    setBusy("start")
    try {
      patchRequest(await startReevaluation(r.id))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }
  const send = async () => {
    if (resolution.trim().length < 20) {
      setError("Explain the decision to the student in a sentence or two.")
      return
    }
    setBusy("send")
    try {
      const next = await resolveReevaluation(r.id, { decision, resolution: resolution.trim(), scores: decision === "revise" ? (scores ?? {}) : {} })
      patchRequest(next)
      toast.success(decision === "revise" ? `Score revised to ${next.revised_score}. ${r.student_name} has been told why.` : `Grade upheld. ${r.student_name} has been told why.`)
      reload()
      ws.reload()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const revisedTotal = rubric && scores ? rubric.criteria.reduce((s, c) => s + (scores[c.id]?.points ?? 0), 0) : 0
  const scoredCount = rubric && scores ? rubric.criteria.filter((c) => typeof scores[c.id]?.points === "number").length : 0

  return (
    <Card>
      <CardContent className="grid gap-5 pt-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={r.student_name} src={r.student_avatar} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="primary">{r.course_code}</Badge>
              <Badge tone={REQUEST_META[r.status].tone}>{REQUEST_META[r.status].label}</Badge>
            </div>
            <h2 className="mt-1.5 text-h3 font-semibold text-foreground">{r.student_name}</h2>
            <p className="text-sm text-muted-foreground">{r.assignment_title}</p>
          </div>
          <div className="text-right">
            <p className="text-caption text-muted-foreground">Grade on record</p>
            <p className="text-h3 font-semibold tabular-nums text-foreground">
              {r.status === "Revised" ? r.revised_score : r.original_score}
              <span className="text-sm font-medium text-muted-foreground">/{r.max_marks}</span>
            </p>
          </div>
        </div>

        <figure className="rounded-lg border border-border bg-surface-2/60 p-4">
          <figcaption className="text-caption font-medium text-muted-foreground">
            {r.student_name.split(" ")[0]} asked {relTime(r.created_at, now)} · {dateTime(r.created_at)}
          </figcaption>
          <blockquote className="mt-2 border-l-2 border-primary pl-3 text-sm leading-6 text-foreground">{r.reason}</blockquote>
        </figure>

        {answered && (
          <div className={cn("rounded-lg border p-4", r.status === "Revised" ? "border-success/30 bg-success-soft" : "border-border bg-surface-2")}>
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {r.status === "Revised" ? <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" /> : <Scale className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
              {r.status === "Revised" ? `Revised from ${r.original_score} to ${r.revised_score}` : `Upheld at ${r.original_score}/${r.max_marks}`}
            </p>
            {r.resolution && <p className="mt-2 text-sm leading-6 text-foreground">{r.resolution}</p>}
            <p className="mt-2 text-caption text-muted-foreground">
              {r.handled_by_name ? `${r.mine ? "You" : r.handled_by_name}` : "An evaluator"} answered {r.resolved_at ? relTime(r.resolved_at, now) : ""}
            </p>
          </div>
        )}

        {takenByOther && <p className="rounded-md border border-border bg-surface-2 p-3 text-sm text-foreground">{r.handled_by_name ?? "Another evaluator"} is reviewing this request.</p>}

        {r.status === "Pending" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4">
            <p className="text-sm text-muted-foreground">Take the request so the student knows it's being looked at and colleagues don't pick it up too.</p>
            <Button leftIcon={<Hand aria-hidden="true" />} loading={busy === "start"} onClick={() => void take()}>
              Take this request
            </Button>
          </div>
        )}

        <section aria-label="Marking on record" className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">{deciding && decision === "revise" ? "Re-score the rubric" : "Marking on record"}</h3>
            <Button asChild variant="ghost" size="sm" rightIcon={<ArrowRight aria-hidden="true" />}>
              <Link to={`/evaluator/queue/${r.submission_id}`}>Open the submission</Link>
            </Button>
          </div>
          {!ws.data ? (
            <div className="grid gap-2" role="status" aria-label="Loading the marking">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : !rubric ? (
            <p className="text-sm text-muted-foreground">This assessment has no rubric.</p>
          ) : deciding && decision === "revise" ? (
            <RubricScorer criteria={rubric.criteria} scores={scores ?? current} baseline={current} onChange={(id, e) => setScores((s) => ({ ...(s ?? current), [id]: e }))} showLevels={showLevels} />
          ) : Object.keys(current).length ? (
            <RubricScorer criteria={rubric.criteria} scores={current} showLevels={false} />
          ) : (
            <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">Graded before rubric scoring. Revising the score records a rubric evaluation for it.</p>
          )}
        </section>

        {deciding && (
          <section aria-label="Decision" className="grid gap-4 rounded-lg border border-border p-4">
            <SegmentedControl
              aria-label="Decision"
              block
              value={decision}
              onChange={setDecision}
              options={[
                { value: "uphold", label: "Uphold the grade", icon: <Scale className="h-3.5 w-3.5" aria-hidden="true" /> },
                { value: "revise", label: "Revise the score", icon: <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> },
              ]}
            />
            <AnimatePresence initial={false}>
              {decision === "revise" && rubric && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: transition.fast }} transition={transition.base} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-2/60 px-3 py-2">
                  <ScoreDial total={revisedTotal} rubricMax={rubric.max_points} maxMarks={r.max_marks} scored={scoredCount} criteria={rubric.criteria.length} before={r.original_score} />
                  <p className="text-caption text-muted-foreground">
                    New grade {letterGrade(Math.round((revisedTotal / Math.max(1, rubric.max_points)) * 100))}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <Field label="Your answer to the student" hint="Say what you checked and why the grade stands or changes." error={error}>
              <Textarea
                rows={4}
                maxLength={2000}
                value={resolution}
                onChange={(e) => {
                  setError(null)
                  setResolution(e.target.value)
                }}
                placeholder={decision === "revise" ? "You're right that… I've raised … from … to …" : "I re-read … against the rubric. …, so the score stands."}
              />
            </Field>
            <div className="flex justify-end">
              <Button loading={busy === "send"} onClick={() => void send()}>
                {decision === "revise" ? "Revise and tell the student" : "Uphold and tell the student"}
              </Button>
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  )
}
