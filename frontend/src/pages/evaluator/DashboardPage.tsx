import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2, ChevronRight, ClipboardCheck, Inbox, RotateCcw, Scale, Send, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import { Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, StatCard } from "@/components/ui"
import AreaChart from "@/components/charts/AreaChart"
import ProgressRing from "@/components/charts/ProgressRing"
import AnimatedNumber from "@/components/motion/AnimatedNumber"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import MarkingBar from "@/components/evaluator/MarkingBar"
import { useEvaluator } from "./data/EvaluatorDataProvider"
import { activity, dayKey, dueLabel, finishedByDay, greeting, relTime, shortTitle, type ActivityEntry } from "./data/derive"
import type { AssessmentSummary, QueueItem } from "./data/types"

const DAY = 86_400_000
const ACTIVITY_ICON: Record<ActivityEntry["kind"], typeof Inbox> = { submitted: Inbox, finished: CheckCircle2, released: Send, request: RotateCcw, answered: Scale }

export default function DashboardPage() {
  const { profile, queue, toMark, ready, openRequests, requests, now } = useEvaluator()
  const navigate = useNavigate()
  const today = dayKey(new Date(now))

  const stats = useMemo(() => {
    const mine = queue.items.filter((i) => i.mine)
    const finishedToday = mine.filter((i) => i.evaluated_at && dayKey(new Date(i.evaluated_at)) === today).length
    const releasedWeek = mine.filter((i) => i.released_at && now - Date.parse(i.released_at) < 7 * DAY).length
    const arrivals = Array.from({ length: 7 }, (_, d) => {
      const day = dayKey(new Date(now - (6 - d) * DAY))
      return queue.items.filter((i) => dayKey(new Date(i.submitted_at)) === day).length
    })
    return { finishedToday, releasedWeek, arrivals, late: toMark.filter((i) => i.late).length }
  }, [queue.items, toMark, now, today])

  const pace = useMemo(() => finishedByDay(queue.items, 14, new Date(now)), [queue.items, now])
  const feed = useMemo(() => activity(queue.items, requests, 7), [queue.items, requests])
  const goal = profile.preferences.daily_goal
  const first = profile.full_name.split(" ")[0]
  const summary = [
    toMark.length ? `${toMark.length} ${toMark.length === 1 ? "submission" : "submissions"} to mark` : "Nothing waiting to be marked",
    ready.length ? `${ready.length} ready to release` : null,
    openRequests.length ? `${openRequests.length} re-evaluation ${openRequests.length === 1 ? "request" : "requests"} open` : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow={`Evaluation desk · ${new Date(now).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`}
        title={`${greeting(new Date(now))}, ${first}`}
        description={`${summary.join(", ")}.`}
        actions={
          <>
            {ready.length > 0 && (
              <Button variant="secondary" leftIcon={<Send aria-hidden="true" />} onClick={() => navigate("/evaluator/queue?view=ready")}>
                Release {ready.length}
              </Button>
            )}
            <Button rightIcon={<ArrowRight aria-hidden="true" />} disabled={!toMark.length} onClick={() => toMark[0] && navigate(`/evaluator/queue/${toMark[0].id}`)}>
              {toMark[0]?.state === "draft" ? "Continue marking" : "Start marking"}
            </Button>
          </>
        }
      />

      <Stagger className="flex flex-col gap-5" stagger={0.06}>
        <StaggerItem>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <FocusCard finished={stats.finishedToday} goal={goal} next={toMark.slice(0, 3)} now={now} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard title="To mark" value={String(toMark.length)} trend={stats.late ? `${stats.late} submitted late` : "All on time"} tone="warning" icon={ClipboardCheck} sparkline={stats.arrivals} onClick={() => navigate("/evaluator/queue")} />
              <StatCard title="Ready to release" value={String(ready.length)} trend={ready.length ? "Students can't see these yet" : "Nothing waiting"} tone="primary" icon={Send} onClick={() => navigate("/evaluator/queue?view=ready")} />
              <StatCard title="Re-evaluations" value={String(openRequests.length)} trend={openRequests.length ? "Waiting for an answer" : "None open"} tone="info" icon={RotateCcw} onClick={() => navigate("/evaluator/reevaluations")} />
              <StatCard title="Released this week" value={String(stats.releasedWeek)} trend={`${profile.released_total} released in total`} tone="success" icon={CheckCircle2} sparkline={pace.slice(-7).map((d) => d.count)} onClick={() => navigate("/evaluator/reports")} />
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <section aria-labelledby="assessments-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="assessments-title" className="text-h3 font-semibold text-foreground">
                Assessments
              </h2>
              <Button variant="ghost" size="sm" rightIcon={<ChevronRight aria-hidden="true" />} onClick={() => navigate("/evaluator/queue")}>
                Open the queue
              </Button>
            </div>
            {queue.assessments.length === 0 ? (
              <EmptyState icon={<ClipboardCheck aria-hidden="true" />} title="No assessments assigned yet" description="Your academy admin assigns the assessments you mark. They appear here with their rubrics." />
            ) : (
              <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" inView>
                {[...queue.assessments]
                  .sort((a, b) => b.pending + b.drafts - (a.pending + a.drafts) || a.due_at.localeCompare(b.due_at))
                  .map((a) => (
                    <StaggerItem key={a.id} className="h-full">
                      <AssessmentCard assessment={a} now={now} />
                    </StaggerItem>
                  ))}
              </Stagger>
            )}
          </section>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <Card>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 pb-2">
                <div>
                  <CardTitle>Your marking pace</CardTitle>
                  <p className="text-caption text-muted-foreground">Evaluations you finished each day, last 14 days</p>
                </div>
                <dl className="flex gap-5 text-right">
                  <div>
                    <dt className="text-caption text-muted-foreground">Finished</dt>
                    <dd className="text-lg font-semibold tabular-nums text-foreground">
                      <AnimatedNumber value={pace.reduce((s, d) => s + d.count, 0)} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted-foreground">Best day</dt>
                    <dd className="text-lg font-semibold tabular-nums text-foreground">
                      <AnimatedNumber value={Math.max(0, ...pace.map((d) => d.count))} />
                    </dd>
                  </div>
                </dl>
              </CardHeader>
              <CardContent>
                <AreaChart labels={pace.map((d) => d.label)} series={[{ name: "Finished", values: pace.map((d) => d.count) }]} height={200} label="Evaluations finished per day" formatValue={(v) => String(Math.round(v))} tickEvery={2} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="px-3">
                {feed.length === 0 ? (
                  <p className="px-2 text-sm text-muted-foreground">Nothing yet. Submissions and requests show up here.</p>
                ) : (
                  <ol className="relative grid gap-0.5 before:absolute before:bottom-3 before:left-[22px] before:top-3 before:w-px before:bg-border" aria-label="Recent activity">
                    {feed.map((e, i) => {
                      const Icon = ACTIVITY_ICON[e.kind]
                      return (
                        <motion.li key={e.id} initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ ...transition.base, delay: i * 0.04 }}>
                          <Link to={e.to} className="relative flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-2">
                            <span className={cn("relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface", e.kind === "request" ? "text-warning" : e.kind === "released" ? "text-success" : "text-muted-foreground")}>
                              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">{e.title}</span>
                              <span className="block truncate text-caption text-muted-foreground">{e.detail}</span>
                            </span>
                            <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-subtle-foreground">{relTime(e.at, now)}</span>
                          </Link>
                        </motion.li>
                      )
                    })}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        </StaggerItem>
      </Stagger>
    </div>
  )
}

/** Today's goal and the next submissions to mark. */
function FocusCard({ finished, goal, next, now }: { finished: number; goal: number; next: QueueItem[]; now: number }) {
  const pct = Math.min(100, Math.round((finished / Math.max(1, goal)) * 100))
  const left = Math.max(0, goal - finished)
  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-5 pt-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <ProgressRing value={pct} size={112} thickness={9} tone={pct >= 100 ? "success" : "primary"} label="Today's goal" className="mx-auto sm:mx-0">
          <span className="flex flex-col items-center leading-none">
            <AnimatedNumber value={finished} className="text-2xl font-semibold text-foreground" />
            <span className="mt-1 text-[11px] text-muted-foreground">of {goal}</span>
          </span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-caption font-medium uppercase tracking-wider text-primary-text">
            <Target className="h-3.5 w-3.5" aria-hidden="true" /> Today's goal
          </p>
          <p className="mt-1 text-h3 font-semibold text-foreground">{left === 0 ? "Goal reached. Nice work." : `${left} more to reach today's goal`}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {next.length ? `The oldest submission has waited ${relTime(next[0].submitted_at, now).replace(" ago", "")}.` : "The queue is clear. New submissions will appear here."}
          </p>
        </div>
      </CardContent>
      {next.length > 0 && (
        <div className="border-t border-border px-3 py-3">
          <p className="px-2 pb-1.5 text-caption font-medium text-muted-foreground">Up next</p>
          <ul className="grid gap-0.5">
            {next.map((i) => (
              <li key={i.id}>
                <Link to={`/evaluator/queue/${i.id}`} className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-2">
                  <Avatar name={i.student_name} src={i.student_avatar} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{i.student_name}</span>
                      {i.state === "draft" && (
                        <Badge tone="info" size="sm">
                          Your draft
                        </Badge>
                      )}
                      {i.late && (
                        <Badge tone="danger" size="sm">
                          Late
                        </Badge>
                      )}
                    </span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {i.course_code} · {shortTitle(i.assignment_title)} · {relTime(i.submitted_at, now)}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-subtle-foreground transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function AssessmentCard({ assessment: a, now }: { assessment: AssessmentSummary; now: number }) {
  const due = dueLabel(a.due_at, now)
  const left = a.pending + a.drafts
  return (
    <Link to={`/evaluator/queue?assessment=${a.id}`} className="block h-full rounded-lg" aria-label={`${a.title}: ${left ? `${left} to mark` : "all marked"}`}>
    <Card interactive className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 pt-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="primary">{a.course_code}</Badge>
          <Badge tone={due.urgent ? "warning" : "neutral"}>{due.label}</Badge>
        </div>
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-6 text-foreground">{a.title}</h3>
        <div className="mt-auto">
          <MarkingBar assessment={a} legend />
        </div>
      </CardContent>
      <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3 text-caption">
        <span className={cn("font-medium", left ? "text-foreground" : "text-success")}>{left ? `${left} to mark` : "All marked"}</span>
        <span className="truncate text-muted-foreground">
          {a.submissions} of {a.enrolled} submitted
        </span>
      </div>
    </Card>
    </Link>
  )
}
