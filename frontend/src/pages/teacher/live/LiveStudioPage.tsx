import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  BarChart3,
  Check,
  Circle,
  Hand,
  Lightbulb,
  ListChecks,
  Megaphone,
  MessageCircleQuestion,
  Mic,
  MicOff,
  MonitorUp,
  Pause,
  PhoneOff,
  Pin,
  PinOff,
  PlayCircle,
  Radio,
  Send,
  Signal,
  Sparkles,
  ThumbsUp,
  TriangleAlert,
  Users,
  Video,
  VideoOff,
  X,
  type LucideIcon,
} from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
} from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import CopyButton from "@/components/student/CopyButton"
import IconTile from "@/components/teacher/IconTile"
import { cn } from "@/lib/utils"
import { ease, spring, transition } from "@/lib/motion"
import type { AIMonitoringSuggestion, AttendanceStatus, StudentItem } from "@/types"
import { useTeacherData } from "../teacherStore"
import { ATTENDANCE_TONE, buildRoster, DEMO_DATE, firstName, formatClock, formatTimeRange, sessionElapsed, type RosterEntry } from "../teacherUtils"

interface LiveQuestion {
  id: string
  studentId: string
  text: string
  votes: number
  answered: boolean
  at: string
}

/** Questions asked in chat during the demo class (ls-1). */
const SEED_QUESTIONS: LiveQuestion[] = [
  { id: "q1", studentId: "s3", text: "If two features give the same information gain, which one does the tree pick?", votes: 6, answered: false, at: "12:09" },
  { id: "q2", studentId: "s12", text: "Why did accuracy drop when we made the tree deeper?", votes: 5, answered: false, at: "12:12" },
  { id: "q3", studentId: "s8", text: "Can one node split into more than two branches?", votes: 4, answered: false, at: "12:14" },
  { id: "q4", studentId: "s6", text: "Is Gini impurity faster to compute than entropy?", votes: 3, answered: true, at: "11:58" },
  { id: "q5", studentId: "s10", text: "Will today's notebook be shared after class?", votes: 2, answered: true, at: "11:51" },
  { id: "q6", studentId: "s5", text: "Can we build the tree by hand instead of with scikit-learn?", votes: 2, answered: true, at: "11:46" },
  { id: "q7", studentId: "s1", text: "What does “samples = 50” mean on a leaf?", votes: 4, answered: true, at: "11:42" },
  { id: "q8", studentId: "s14", text: "Could petal colour be a feature too?", votes: 1, answered: true, at: "11:38" },
]

const POLL = {
  question: "Which split criterion would you pick for the Iris data?",
  options: ["Gini impurity", "Entropy", "Not sure yet"],
}
/** Deterministic vote order so the poll fills the same way every time. */
const VOTE_ORDER = [0, 1, 0, 0, 2, 0, 1, 0, 1, 0, 0, 2, 1, 0, 0, 1, 0, 2, 0, 1, 0, 0, 1, 0]

type RosterFilter = "all" | AttendanceStatus

/** Ticking class clock. Isolated so the rest of the studio doesn't re-render every second. */
function LiveClock({ baseSeconds, running }: { baseSeconds: number; running: boolean }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [running])
  return <span className="tabular-nums">{formatClock(baseSeconds + tick)}</span>
}

function StageControl({
  label,
  icon: Icon,
  offIcon: OffIcon,
  on,
  onToggle,
}: {
  label: string
  icon: LucideIcon
  offIcon?: LucideIcon
  on: boolean
  onToggle: () => void
}) {
  const Shown = !on && OffIcon ? OffIcon : Icon
  return (
    <Tooltip content={label}>
      <motion.button
        type="button"
        aria-label={label}
        aria-pressed={on}
        onClick={onToggle}
        whileTap={{ scale: 0.92 }}
        transition={spring.snappy}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
          on ? "border-white/10 bg-white/10 text-white hover:bg-white/20" : "border-transparent bg-danger text-ink-950 hover:opacity-90",
        )}
      >
        <Shown className="h-5 w-5" aria-hidden="true" />
      </motion.button>
    </Tooltip>
  )
}

/** The decision tree being taught, drawn node by node on the shared screen. */
function TreeSlide({ title }: { title: string }) {
  const nodes = [
    { x: 300, y: 46, label: "Petal length < 2.45 cm?", w: 190, tone: "fill-white/10 stroke-white/30" },
    { x: 150, y: 150, label: "Setosa · 50", w: 120, tone: "fill-success/20 stroke-success/60" },
    { x: 450, y: 150, label: "Petal width < 1.75 cm?", w: 190, tone: "fill-white/10 stroke-white/30" },
    { x: 360, y: 250, label: "Versicolor · 49", w: 140, tone: "fill-secondary/20 stroke-secondary/60" },
    { x: 540, y: 250, label: "Virginica · 45", w: 130, tone: "fill-primary/25 stroke-primary/70" },
  ]
  const edges: [number, number, string][] = [
    [0, 1, "yes"],
    [0, 2, "no"],
    [2, 3, "yes"],
    [2, 4, "no"],
  ]
  return (
    <div className="absolute inset-0 flex flex-col p-5 sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Shared screen · Slide 21</p>
      <p className="mt-1 max-w-xl text-base font-semibold leading-snug text-white sm:text-xl">{title}</p>
      <svg viewBox="0 0 640 290" className="mt-auto h-auto w-full max-w-3xl self-center" role="img" aria-label="Decision tree splitting Iris flowers by petal length, then petal width">
        {edges.map(([a, b, label], i) => (
          <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.35 + i * 0.15 }}>
            <line x1={nodes[a].x} y1={nodes[a].y + 16} x2={nodes[b].x} y2={nodes[b].y - 16} className="stroke-white/35" strokeWidth={1.5} />
            <text x={(nodes[a].x + nodes[b].x) / 2 + (b % 2 ? -14 : 14)} y={(nodes[a].y + nodes[b].y) / 2} className="fill-white/70 text-[11px]" textAnchor="middle">
              {label}
            </text>
          </motion.g>
        ))}
        {nodes.map((n, i) => (
          <motion.g
            key={n.label}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: ease.out, delay: 0.15 + i * 0.12 }}
          >
            <rect x={n.x - n.w / 2} y={n.y - 16} width={n.w} height={32} rx={8} className={n.tone} strokeWidth={1} />
            <text x={n.x} y={n.y + 4} textAnchor="middle" className="fill-white text-[12px] font-medium">
              {n.label}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  )
}

/** Live teaching studio: stage with controls, roster, Q&A, a quick poll and live insights. */
export default function LiveStudioPage() {
  const { sessionId = "" } = useParams()
  const navigate = useNavigate()
  const { sessions, courses, students, attendance, monitoring, recordings, teacherName, teacherAvatar, startSession, endSession, notify } = useTeacherData()
  const session = sessions.find((s) => s.id === sessionId)
  const live = session?.status === "Live Now"

  const roster = useMemo<RosterEntry[]>(() => {
    if (!session) return []
    const records = attendance.filter((a) => a.sessionId === session.id)
    if (records.length) return buildRoster(records, students)
    const course = courses.find((c) => c.id === session.courseId)
    return (course?.enrolledStudentIds ?? [])
      .map((id) => students.find((s) => s.id === id))
      .filter((s): s is StudentItem => Boolean(s))
      .map((s) => ({ id: `r-${s.id}`, studentId: s.id, name: s.name, roll: s.rollNumber, avatar: s.image, status: "Present" as const, minutes: 0, handRaises: 0, joinedAfter: 0 }))
  }, [session, attendance, students, courses])
  const nameOf = (id: string) => roster.find((r) => r.studentId === id)?.name ?? students.find((s) => s.id === id)?.name ?? "Learner"
  const avatarOf = (id: string) => roster.find((r) => r.studentId === id)?.avatar ?? students.find((s) => s.id === id)?.image

  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(true)
  const [sharing, setSharing] = useState(true)
  const [recording, setRecording] = useState(true)
  const [tab, setTab] = useState("people")
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>("all")
  const [hands, setHands] = useState<string[]>(() =>
    buildRoster(
      attendance.filter((a) => a.sessionId === session?.id),
      students,
    )
      .filter((r) => r.status === "Present" && r.handRaises > 0)
      .sort((a, b) => b.handRaises - a.handRaises)
      .slice(0, 3)
      .map((r) => r.studentId),
  )
  const [questions, setQuestions] = useState<LiveQuestion[]>(() => (session?.id === "ls-1" ? SEED_QUESTIONS : []))
  const [pinned, setPinned] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [topicsDone, setTopicsDone] = useState<Set<string>>(() => new Set((session?.topicsCovered ?? []).slice(0, Math.round((session?.topicsCovered?.length ?? 0) * 0.5))))
  const [poll, setPoll] = useState<{ state: "idle" | "running" | "ended"; votes: number[] }>({ state: "idle", votes: [0, 0, 0] })
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [endOpen, setEndOpen] = useState(false)
  const [publishWhenReady, setPublishWhenReady] = useState(true)
  const [sendSummary, setSendSummary] = useState(true)

  const present = roster.filter((r) => r.status === "Present" || r.status === "Late").length
  const voteTarget = Math.max(1, present)
  const votesCast = poll.votes.reduce((a, b) => a + b, 0)

  useEffect(() => {
    if (poll.state !== "running") return
    const t = setInterval(() => {
      setPoll((p) => {
        const total = p.votes.reduce((a, b) => a + b, 0)
        if (total >= voteTarget) return p
        const votes = [...p.votes]
        votes[VOTE_ORDER[total % VOTE_ORDER.length]] += 1
        return { ...p, votes }
      })
    }, 320)
    return () => clearInterval(t)
  }, [poll.state, voteTarget])

  if (!session) {
    return (
      <div className="flex w-full flex-col">
        <PageHeader title="Class not found" breadcrumb={[{ label: "Live classes", onClick: () => navigate("/teacher/live-class") }, { label: "Not found" }]} />
        <EmptyState
          icon={<Radio aria-hidden="true" />}
          title="We couldn't find this class"
          description="It may have been cancelled or the link is out of date."
          action={
            <Button leftIcon={<ArrowLeft aria-hidden="true" />} onClick={() => navigate("/teacher/live-class")}>
              Back to live classes
            </Button>
          }
        />
      </div>
    )
  }

  const crumbs = [{ label: "Live classes", onClick: () => navigate("/teacher/live-class") }, { label: session.title }]

  if (!live) {
    const rec = recordings.find((r) => r.sessionId === session.id)
    const ended = session.status === "Completed"
    return (
      <div className="flex w-full flex-col">
        <PageHeader breadcrumb={crumbs} eyebrow={session.courseCode} title={session.title} description={`${formatTimeRange(session.startTime, session.endTime)} · ${session.platform}`} />
        <EmptyState
          icon={ended ? <PlayCircle aria-hidden="true" /> : <Radio aria-hidden="true" />}
          title={ended ? "This class has ended" : session.status === "Cancelled" ? "This class was cancelled" : "This class hasn't started"}
          description={ended ? "The recording, transcript and chapters are in Recordings." : "Start it when you're ready. Everyone enrolled gets a notification."}
          action={
            ended ? (
              rec ? (
                <Button leftIcon={<PlayCircle aria-hidden="true" />} onClick={() => navigate(`/teacher/recordings/${rec.id}`)}>
                  Review recording
                </Button>
              ) : undefined
            ) : session.status !== "Cancelled" ? (
              <Button
                leftIcon={<Radio aria-hidden="true" />}
                onClick={() => {
                  startSession(session.id)
                  notify(`“${session.title}” is live. Learners have been notified.`)
                }}
              >
                {session.scheduledDate === DEMO_DATE ? "Start class" : "Start early"}
              </Button>
            ) : undefined
          }
        />
      </div>
    )
  }

  const { elapsed, total, pct } = sessionElapsed(session)
  const topics = session.topicsCovered ?? []
  const counts: Record<RosterFilter, number> = {
    all: roster.length,
    Present: roster.filter((r) => r.status === "Present").length,
    Late: roster.filter((r) => r.status === "Late").length,
    "Left Early": roster.filter((r) => r.status === "Left Early").length,
    Absent: roster.filter((r) => r.status === "Absent").length,
  }
  const shownRoster = roster.filter((r) => rosterFilter === "all" || r.status === rosterFilter)
  const openQuestions = questions.filter((q) => !q.answered).length
  const pinnedQ = questions.find((q) => q.id === pinned)
  const suggestions = monitoring.suggestions.filter((s) => !dismissed.has(s.id))
  const filmstrip = roster.filter((r) => r.status !== "Absent" && r.status !== "Left Early").slice(0, 5)

  const lowerHand = (id: string, call: boolean) => {
    setHands((h) => h.filter((x) => x !== id))
    if (call) notify(`${firstName(nameOf(id))} can speak now`)
  }
  const applySuggestion = (s: AIMonitoringSuggestion) => {
    setDismissed((d) => new Set(d).add(s.id))
    if (s.category === "Engagement") {
      setPoll({ state: "running", votes: [0, 0, 0] })
      notify("Checkpoint poll launched")
    } else notify("Noted for this class")
  }
  const post = () => {
    if (!announcement.trim()) return
    notify("Announcement posted to the class chat")
    setAnnouncement("")
  }
  const finish = () => {
    const recId = endSession(session.id)
    setEndOpen(false)
    notify(`Class ended. The recording is processing${publishWhenReady ? " and will publish when ready" : ""}.`)
    navigate(`/teacher/recordings/${recId}`)
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        breadcrumb={crumbs}
        eyebrow={`${session.courseCode}${session.batchName ? ` · ${session.batchName}` : ""}`}
        title={session.title}
        description={`${formatTimeRange(session.startTime, session.endTime)} · ${session.platform} · ${present} of ${roster.length} learners in the room`}
        actions={
          <>
            {session.meetingUrl && <CopyButton variant="outline" size="md" text={session.meetingUrl} label="Copy join link" copiedLabel="Link copied" />}
            <Button variant="danger" leftIcon={<PhoneOff aria-hidden="true" />} onClick={() => setEndOpen(true)}>
              End class
            </Button>
          </>
        }
      />

      <Stagger className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]" stagger={0.06}>
        <StaggerItem className="flex min-w-0 flex-col gap-5">
          <section aria-label="Stage" className="relative isolate overflow-hidden rounded-xl border border-white/10 bg-ink-950 shadow-[var(--glow-primary)]">
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-0 -z-10 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />

            <div className="flex flex-wrap items-center gap-2 px-4 pt-4 sm:px-5">
              <AnimatePresence initial={false} mode="wait">
                {recording ? (
                  <motion.span
                    key="rec"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={transition.fast}
                    className="inline-flex items-center gap-2 rounded-full bg-danger px-2.5 py-1 text-caption font-semibold text-ink-950"
                  >
                    <span className="relative flex h-2 w-2" aria-hidden="true">
                      <span className="absolute inset-0 animate-[q-pulse-ring_1.4s_ease-out_infinite] rounded-full bg-ink-950" />
                      <span className="relative h-2 w-2 rounded-full bg-ink-950" />
                    </span>
                    REC <LiveClock baseSeconds={elapsed * 60} running={recording} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="paused"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={transition.fast}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-caption font-semibold text-white"
                  >
                    <Pause className="h-3 w-3" aria-hidden="true" /> Recording paused
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-caption font-medium text-white">
                <Users className="h-3.5 w-3.5" aria-hidden="true" /> {present} watching
              </span>
              {hands.length > 0 && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setTab("people")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/15 px-2.5 py-1 text-caption font-semibold text-warning transition-colors hover:bg-warning/25"
                >
                  <Hand className="h-3.5 w-3.5" aria-hidden="true" /> {hands.length} {hands.length === 1 ? "hand" : "hands"} up
                </motion.button>
              )}
              <span className="ml-auto inline-flex items-center gap-1.5 text-caption text-white/80">
                <Signal className="h-3.5 w-3.5 text-success" aria-hidden="true" /> Stable connection
              </span>
            </div>

            <div className="relative mx-4 mt-4 aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-ink-900 to-black sm:mx-5 sm:aspect-video">
              <AnimatePresence mode="wait" initial={false}>
                {sharing ? (
                  <motion.div key="share" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition.base}>
                    <TreeSlide title={monitoring.currentSegmentTitle} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="cam"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition.base}
                  >
                    {cam ? (
                      <Avatar src={teacherAvatar} name={teacherName} size="xl" className="h-28 w-28 [&_img]:ring-white/20" />
                    ) : (
                      <span className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-white">
                        <VideoOff className="h-8 w-8" aria-hidden="true" />
                      </span>
                    )}
                    <p className="text-sm font-medium text-white">{teacherName}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {pinnedQ && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={spring.soft}
                    className="absolute inset-x-3 top-3 flex items-start gap-3 rounded-lg border border-white/15 bg-ink-900/90 p-3 backdrop-blur-sm sm:inset-x-auto sm:left-3 sm:max-w-md"
                  >
                    <Avatar src={avatarOf(pinnedQ.studentId)} name={nameOf(pinnedQ.studentId)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">{firstName(nameOf(pinnedQ.studentId))} asks</p>
                      <p className="text-sm text-white">{pinnedQ.text}</p>
                    </div>
                    <button type="button" onClick={() => setPinned(null)} aria-label="Unpin question" className="rounded p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ul className="no-scrollbar mx-4 mt-3 flex gap-2 overflow-x-auto sm:mx-5" aria-label="On camera">
              <li className="relative flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-2 py-2.5">
                {cam ? (
                  <Avatar src={teacherAvatar} name={teacherName} size="md" className="[&_img]:ring-white/15" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
                    <VideoOff className="h-4 w-4" aria-label="Camera off" />
                  </span>
                )}
                <span className="flex w-full items-center justify-center gap-1 truncate text-center text-[11px] font-medium text-white">
                  {!mic && <MicOff className="h-3 w-3 shrink-0 text-danger" aria-label="Muted" />}
                  You
                </span>
              </li>
              {filmstrip.map((r, i) => (
                <li key={r.id} className="relative flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-2.5">
                  <span className="relative">
                    {i === 0 && (
                      <motion.span
                        aria-hidden="true"
                        className="absolute -inset-1 rounded-full ring-2 ring-success"
                        animate={{ opacity: [0.35, 1, 0.35] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                    <Avatar src={r.avatar} name={r.name} size="md" className="[&_img]:ring-white/15" />
                  </span>
                  <span className="w-full truncate text-center text-[11px] text-white/90">{firstName(r.name)}</span>
                  {i === 0 && <span className="sr-only">Speaking</span>}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 border-t border-white/10 px-4 py-4 sm:gap-3">
              <StageControl label={mic ? "Mute microphone" : "Unmute microphone"} icon={Mic} offIcon={MicOff} on={mic} onToggle={() => setMic((v) => !v)} />
              <StageControl label={cam ? "Turn camera off" : "Turn camera on"} icon={Video} offIcon={VideoOff} on={cam} onToggle={() => setCam((v) => !v)} />
              <StageControl label={sharing ? "Stop sharing screen" : "Share screen"} icon={MonitorUp} on={sharing} onToggle={() => setSharing((v) => !v)} />
              <StageControl
                label={recording ? "Pause recording" : "Resume recording"}
                icon={Circle}
                offIcon={Pause}
                on={recording}
                onToggle={() => {
                  setRecording((v) => !v)
                  notify(recording ? "Recording paused" : "Recording resumed")
                }}
              />
              <Tooltip content="End class for everyone">
                <motion.button
                  type="button"
                  onClick={() => setEndOpen(true)}
                  whileTap={{ scale: 0.95 }}
                  transition={spring.snappy}
                  className="ml-1 inline-flex h-11 items-center gap-2 rounded-full bg-danger px-5 text-sm font-semibold text-ink-950 transition-opacity hover:opacity-90"
                >
                  <PhoneOff className="h-4 w-4" aria-hidden="true" /> End
                </motion.button>
              </Tooltip>
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <IconTile icon={ListChecks} tone="success" />
                    <CardTitle>Lesson plan</CardTitle>
                  </div>
                  <span className="text-caption tabular-nums text-muted-foreground">
                    {elapsed}/{total} min
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-border">
                  <motion.div className="h-full w-full origin-left rounded-full bg-success" initial={{ scaleX: 0 }} animate={{ scaleX: pct }} transition={{ duration: 0.9, ease: ease.out }} />
                </div>
                {topics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No topics planned for this class.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {topics.map((t) => {
                      const id = `topic-${t.replace(/\W+/g, "-").toLowerCase()}`
                      const done = topicsDone.has(t)
                      return (
                        <li key={t} className="flex items-center gap-2.5">
                          <Checkbox
                            id={id}
                            checked={done}
                            onCheckedChange={(v) =>
                              setTopicsDone((cur) => {
                                const n = new Set(cur)
                                if (v) n.add(t)
                                else n.delete(t)
                                return n
                              })
                            }
                          />
                          <Label htmlFor={id} className={cn("cursor-pointer text-sm font-normal transition-colors", done ? "text-muted-foreground line-through" : "text-foreground")}>
                            {t}
                          </Label>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <IconTile icon={BarChart3} tone="primary" />
                    <CardTitle>Quick poll</CardTitle>
                  </div>
                  {poll.state === "running" && (
                    <Badge tone="live" dot>
                      Live
                    </Badge>
                  )}
                  {poll.state === "ended" && <Badge tone="success">Closed</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-foreground">{POLL.question}</p>
                <ul className="mt-3 flex flex-col gap-2.5" aria-live="polite">
                  {POLL.options.map((o, i) => {
                    const share = votesCast ? poll.votes[i] / votesCast : 0
                    const lead = poll.state !== "idle" && votesCast > 0 && poll.votes[i] === Math.max(...poll.votes)
                    return (
                      <li key={o}>
                        <div className="mb-1 flex items-center justify-between text-caption">
                          <span className={cn("font-medium", lead ? "text-foreground" : "text-muted-foreground")}>{o}</span>
                          <span className="tabular-nums text-muted-foreground">{poll.state === "idle" ? "–" : `${poll.votes[i]} · ${Math.round(share * 100)}%`}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-border">
                          <motion.div
                            className={cn("h-full w-full origin-left rounded-full", lead ? "bg-primary" : "bg-primary/40")}
                            initial={false}
                            animate={{ scaleX: share }}
                            transition={spring.soft}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-caption tabular-nums text-muted-foreground">
                    {poll.state === "idle" ? `${present} learners can vote` : `${votesCast} of ${voteTarget} voted`}
                  </span>
                  {poll.state === "running" ? (
                    <Button size="sm" variant="secondary" onClick={() => setPoll((p) => ({ ...p, state: "ended" }))}>
                      Close poll
                    </Button>
                  ) : poll.state === "ended" ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setPoll({ state: "idle", votes: [0, 0, 0] })}>
                        Reset
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => notify("Poll results shared with the class")}>
                        Share results
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" leftIcon={<BarChart3 aria-hidden="true" />} onClick={() => setPoll({ state: "running", votes: [0, 0, 0] })}>
                      Launch poll
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        <StaggerItem className="min-w-0">
          <Card className="flex flex-col xl:sticky xl:top-0">
            <Tabs value={tab} onValueChange={setTab} variant="underline" className="flex min-h-0 flex-col">
              <div className="px-4 pt-2">
                <TabsList aria-label="Studio panels" className="w-full justify-start">
                  <TabsTrigger value="people">
                    People <span className="tabular-nums text-muted-foreground">{present}</span>
                  </TabsTrigger>
                  <TabsTrigger value="qa">
                    Q&amp;A
                    {openQuestions > 0 && (
                      <Badge tone="primary" size="sm">
                        {openQuestions}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="people" className="mt-0 p-4">
                <AnimatePresence initial={false}>
                  {hands.length > 0 && (
                    <motion.section
                      key="hands"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={transition.base}
                      aria-label="Raised hands"
                      className="mb-4 rounded-lg border border-warning/30 bg-warning-soft p-3"
                    >
                      <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold text-warning">
                        <Hand className="h-3.5 w-3.5" aria-hidden="true" /> Raised hands
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        <AnimatePresence initial={false}>
                          {hands.map((id, i) => (
                            <motion.li
                              key={id}
                              layout
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 12 }}
                              transition={spring.soft}
                              className="flex items-center gap-2"
                            >
                              <span className="w-4 text-caption font-semibold tabular-nums text-warning">{i + 1}</span>
                              <Avatar src={avatarOf(id)} name={nameOf(id)} size="xs" />
                              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{nameOf(id)}</span>
                              <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => lowerHand(id, true)}>
                                Call on
                              </Button>
                              <Button size="icon-sm" variant="ghost" className="h-7 w-7" aria-label={`Lower ${nameOf(id)}'s hand`} onClick={() => lowerHand(id, false)}>
                                <X aria-hidden="true" />
                              </Button>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    </motion.section>
                  )}
                </AnimatePresence>

                <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter roster">
                  {(["all", "Present", "Late", "Left Early", "Absent"] as RosterFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={rosterFilter === f}
                      onClick={() => setRosterFilter(f)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        rosterFilter === f ? "border-primary bg-primary-soft text-primary-text" : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {f === "all" ? "All" : f} <span className="tabular-nums">{counts[f]}</span>
                    </button>
                  ))}
                </div>

                <ul className="-mx-2 flex max-h-[440px] flex-col overflow-y-auto" aria-label="Roster">
                  {shownRoster.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-2">
                      <Avatar src={r.avatar} name={r.name} size="sm" status={r.status === "Present" || r.status === "Late" ? "online" : "offline"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                        <p className="truncate text-caption text-muted-foreground">
                          {r.status === "Absent"
                            ? "Hasn't joined"
                            : r.status === "Late"
                              ? `Joined ${r.joinedAfter} min late`
                              : r.status === "Left Early"
                                ? `Left after ${r.minutes} min`
                                : r.device ?? "In class"}
                        </p>
                      </div>
                      {hands.includes(r.studentId) && <Hand className="h-4 w-4 shrink-0 text-warning" aria-label="Hand raised" />}
                      <Badge tone={ATTENDANCE_TONE[r.status]} size="sm">
                        {r.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="qa" className="mt-0 p-4">
                <form
                  className="mb-4 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    post()
                  }}
                >
                  <label htmlFor="studio-announcement" className="sr-only">
                    Message the class
                  </label>
                  <Input id="studio-announcement" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} placeholder="Message the class…" leading={<Megaphone aria-hidden="true" />} />
                  <Button type="submit" size="icon" aria-label="Send to class" disabled={!announcement.trim()}>
                    <Send aria-hidden="true" />
                  </Button>
                </form>
                {questions.length === 0 ? (
                  <EmptyState size="sm" icon={<MessageCircleQuestion aria-hidden="true" />} title="No questions yet" description="Questions from the chat appear here." />
                ) : (
                  <motion.ul layout className="flex flex-col gap-2">
                    {[...questions]
                      .sort((a, b) => Number(a.answered) - Number(b.answered) || b.votes - a.votes)
                      .map((q) => (
                        <motion.li
                          key={q.id}
                          layout
                          transition={spring.soft}
                          className={cn("rounded-lg border p-3", q.answered ? "border-border bg-surface-2/50" : "border-border bg-surface", pinned === q.id && "border-primary-border bg-primary-soft")}
                        >
                          <div className="flex items-start gap-2.5">
                            <Avatar src={avatarOf(q.studentId)} name={nameOf(q.studentId)} size="xs" className="mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-caption text-muted-foreground">
                                <span className="font-medium text-foreground">{nameOf(q.studentId)}</span> · {q.at}
                              </p>
                              <p className={cn("mt-0.5 text-sm", q.answered ? "text-muted-foreground" : "text-foreground")}>{q.text}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              leftIcon={<ThumbsUp aria-hidden="true" />}
                              aria-label={`Upvote, ${q.votes} votes`}
                              onClick={() => setQuestions((list) => list.map((x) => (x.id === q.id ? { ...x, votes: x.votes + 1 } : x)))}
                            >
                              {q.votes}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              leftIcon={pinned === q.id ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                              onClick={() => setPinned(pinned === q.id ? null : q.id)}
                            >
                              {pinned === q.id ? "Unpin" : "Pin to stage"}
                            </Button>
                            <Button
                              size="sm"
                              variant={q.answered ? "ghost" : "secondary"}
                              className="ml-auto h-7 px-2"
                              leftIcon={<Check aria-hidden="true" />}
                              onClick={() => {
                                setQuestions((list) => list.map((x) => (x.id === q.id ? { ...x, answered: !x.answered } : x)))
                                if (pinned === q.id && !q.answered) setPinned(null)
                              }}
                            >
                              {q.answered ? "Answered" : "Mark answered"}
                            </Button>
                          </div>
                        </motion.li>
                      ))}
                  </motion.ul>
                )}
              </TabsContent>

              <TabsContent value="insights" className="mt-0 space-y-4 p-4">
                <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-2/60 p-3">
                  <ProgressRing value={monitoring.engagementScore} size={72} thickness={7} tone="success" label={`Engagement ${monitoring.engagementScore}`}>
                    <span className="text-base font-semibold tabular-nums text-foreground">{monitoring.engagementScore}</span>
                  </ProgressRing>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Engagement {monitoring.overallStatus.toLowerCase()}</p>
                    <p className="text-caption text-muted-foreground">
                      {present}/{roster.length} in the room · participation {monitoring.participationTrend.toLowerCase()}
                    </p>
                    <p className="mt-1 text-caption text-muted-foreground">Updated {monitoring.lastUpdated.toLowerCase()}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-caption">
                    <span className="text-muted-foreground">Lecture coverage</span>
                    <span className="font-medium tabular-nums text-foreground">{monitoring.lectureProgressPercent}%</span>
                  </div>
                  <Progress value={monitoring.lectureProgressPercent} tone="info" label="Lecture coverage" />
                  <p className="mt-1.5 text-caption text-muted-foreground">Now: {monitoring.currentSegmentTitle}</p>
                </div>

                <section aria-label="Suggestions" className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Suggestions
                  </h3>
                  {suggestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing to suggest right now.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      <AnimatePresence initial={false}>
                        {suggestions.map((s) => (
                          <motion.li
                            key={s.id}
                            layout
                            exit={{ opacity: 0, x: 16, transition: transition.fast }}
                            transition={spring.soft}
                            className="rounded-lg border border-border p-3"
                          >
                            <div className="flex items-center gap-2">
                              <Badge tone={s.priority === "High" ? "danger" : s.priority === "Medium" ? "warning" : "neutral"} size="sm">
                                {s.category}
                              </Badge>
                            </div>
                            <p className="mt-1.5 text-sm text-foreground">{s.text}</p>
                            <div className="mt-2 flex gap-1.5">
                              <Button size="sm" variant="secondary" className="h-7 px-2" leftIcon={<Lightbulb aria-hidden="true" />} onClick={() => applySuggestion(s)}>
                                {s.category === "Engagement" ? "Launch poll" : "Got it"}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setDismissed((d) => new Set(d).add(s.id))}>
                                Dismiss
                              </Button>
                            </div>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </section>

                <section aria-label="Moments" className="space-y-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">Moments</h3>
                  <ol className="relative ml-1.5 border-l border-border pl-4">
                    {monitoring.attentionFlags.map((f) => (
                      <li key={f.id} className="relative pb-3 last:pb-0">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute -left-[21px] top-1 flex h-2.5 w-2.5 rounded-full ring-2 ring-surface",
                            f.severity === "High" ? "bg-danger" : f.severity === "Medium" ? "bg-warning" : "bg-info",
                          )}
                        />
                        <p className="text-caption tabular-nums text-muted-foreground">{f.timestamp}</p>
                        <p className="text-sm text-foreground">
                          {f.severity !== "Low" && <TriangleAlert className="mr-1 inline h-3.5 w-3.5 text-warning" aria-label="Attention" />}
                          {f.message}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              </TabsContent>
            </Tabs>
          </Card>
        </StaggerItem>
      </Stagger>

      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End the class for everyone?</DialogTitle>
            <DialogDescription>Learners leave the room and the recording starts processing.</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-3 gap-2">
            {[
              { label: "Duration", value: `${elapsed} min` },
              { label: "Attended", value: `${present}/${roster.length}` },
              { label: "Questions", value: String(questions.length) },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-border bg-surface-2/60 px-3 py-2">
                <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
                <dd className="text-base font-semibold tabular-nums text-foreground">{s.value}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-2.5">
            <div className="flex items-center gap-2.5">
              <Checkbox id="end-publish" checked={publishWhenReady} onCheckedChange={setPublishWhenReady} />
              <Label htmlFor="end-publish" className="cursor-pointer text-sm font-normal">
                Publish the recording to learners when it's ready
              </Label>
            </div>
            <div className="flex items-center gap-2.5">
              <Checkbox id="end-summary" checked={sendSummary} onCheckedChange={setSendSummary} />
              <Label htmlFor="end-summary" className="cursor-pointer text-sm font-normal">
                Email learners the class summary
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEndOpen(false)}>
              Keep teaching
            </Button>
            <Button variant="danger" leftIcon={<PhoneOff aria-hidden="true" />} onClick={finish}>
              End class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
