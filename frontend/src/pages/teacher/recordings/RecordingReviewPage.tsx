import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Download,
  EyeOff,
  Loader2,
  Pause,
  PencilLine,
  Play,
  PlayCircle,
  Search,
  Sparkles,
  Upload,
  VideoOff,
} from "lucide-react"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import CourseCover from "@/components/shared/CourseCover"
import CopyButton from "@/components/student/CopyButton"
import IconTile from "@/components/teacher/IconTile"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import type { RecordingChapterItem, WhisperTranscriptEntry } from "@/types"
import { downloadTextFile } from "@/pages/student/studentUtils"
import { useTeacherData } from "../teacherStore"
import { courseArt, courseByCode, formatClock, recordedLabel } from "../teacherUtils"

const PIPELINE = [
  { label: "Recording uploaded", detail: "Saved from the live room" },
  { label: "Transcoding video", detail: "1080p and 480p versions" },
  { label: "Transcribing audio", detail: "Speaker-labelled transcript" },
  { label: "Finding chapters", detail: "Split at topic changes" },
  { label: "Writing the summary", detail: "Key takeaways for learners" },
]

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const parts = text.split(new RegExp(`(${escapeRegExp(query.trim())})`, "ig"))
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="rounded-sm bg-warning-soft px-0.5 text-foreground">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

/** Review a recorded class before learners see it: player with chapters, searchable transcript and an editable summary. */
export default function RecordingReviewPage() {
  const { recordingId = "" } = useParams()
  const navigate = useNavigate()
  const { recordings, reviews, courses, published, togglePublished, requestRecordingPublish, updateSummary, notify } = useTeacherData()
  const recording = recordings.find((r) => r.id === recordingId)
  const review = reviews[recordingId]
  const course = recording ? courseByCode(courses, recording.courseCode) : undefined

  const videoRef = useRef<HTMLVideoElement>(null)
  const lineRefs = useRef(new Map<string, HTMLLIElement>())
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState("")
  const [follow, setFollow] = useState(true)
  const [tab, setTab] = useState("chapters")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const transcript: WhisperTranscriptEntry[] = useMemo(() => review?.whisperTranscripts ?? [], [review])
  const chapters: RecordingChapterItem[] = useMemo(() => review?.chapters ?? [], [review])
  /** Length of the lecture timeline. The sample video is mapped onto it proportionally. */
  const length = useMemo(() => {
    const last = Math.max(0, ...transcript.map((t) => t.seconds), ...chapters.map((c) => c.seconds))
    return last > 0 ? last + 90 : (Number.parseInt(recording?.duration ?? "60", 10) || 60) * 60
  }, [transcript, chapters, recording])

  const activeChapter = [...chapters].reverse().find((c) => c.seconds <= time) ?? chapters[0]
  const activeLine = [...transcript].reverse().find((t) => t.seconds <= time)

  // Simulated playback when the sample video can't load (offline, or no codec).
  useEffect(() => {
    if (!failed || !playing) return
    const t = setInterval(() => setTime((s) => Math.min(length, s + 4)), 250)
    return () => clearInterval(t)
  }, [failed, playing, length])
  if (failed && playing && time >= length) setPlaying(false)

  useEffect(() => {
    if (!follow || tab !== "transcript" || !activeLine) return
    lineRefs.current.get(activeLine.id)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [activeLine, follow, tab])

  const seek = (seconds: number, play = true) => {
    setTime(seconds)
    const v = videoRef.current
    if (!failed && v && Number.isFinite(v.duration) && v.duration > 0) {
      v.currentTime = (seconds / length) * v.duration
      if (play) void v.play().catch(() => setPlaying(false))
    } else if (play) setPlaying(true)
  }

  if (!recording) {
    return (
      <div className="flex w-full flex-col">
        <PageHeader title="Recording not found" breadcrumb={[{ label: "Recordings", onClick: () => navigate("/teacher/recordings") }, { label: "Not found" }]} />
        <EmptyState
          icon={<VideoOff aria-hidden="true" />}
          title="We couldn't find this recording"
          action={
            <Button leftIcon={<ArrowLeft aria-hidden="true" />} onClick={() => navigate("/teacher/recordings")}>
              Back to recordings
            </Button>
          }
        />
      </div>
    )
  }

  const crumbs = [{ label: "Recordings", onClick: () => navigate("/teacher/recordings") }, { label: recording.title }]
  const isPublished = published.has(recording.id)
  const header = (actions?: React.ReactNode) => (
    <PageHeader
      breadcrumb={crumbs}
      eyebrow={`${recording.courseCode} · ${recordedLabel(recording.sessionDate)}`}
      title={recording.title}
      description={`${recording.duration} · ${recording.viewsCount ?? 0} learner views${recording.fileSize && recording.status === "Available" ? ` · ${recording.fileSize}` : ""}`}
      actions={actions}
    />
  )

  if (recording.status !== "Available") {
    const processing = recording.status === "Processing"
    return (
      <div className="flex w-full min-w-0 flex-col">
        {header()}
        {processing ? (
          <Stagger className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <StaggerItem>
              <div className="relative isolate overflow-hidden rounded-xl border border-white/10 bg-ink-950">
                <CourseCover title={recording.title} category={courseArt(course?.id ?? "")} image={course?.thumbnail} showTitle={false} hoverZoom={false} className="opacity-40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur">
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                  </span>
                  <p className="text-lg font-semibold text-white">Processing your recording</p>
                  <p className="max-w-sm text-sm text-white/85">It's usually ready about 10 minutes after class. We'll notify you when chapters and the transcript are done.</p>
                </div>
                <span className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-white/10" aria-hidden="true">
                  <span className="block h-full w-1/3 animate-[q-shimmer_1.6s_ease-in-out_infinite] bg-white/70" />
                </span>
              </div>
            </StaggerItem>
            <StaggerItem>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="flex flex-col gap-3" aria-label="Processing steps">
                    {PIPELINE.map((step, i) => {
                      const state = i === 0 ? "done" : i === 1 ? "active" : "todo"
                      return (
                        <li key={step.label} className="flex items-start gap-3">
                          {state === "done" ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-label="Done" />
                          ) : state === "active" ? (
                            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-info" aria-label="In progress" />
                          ) : (
                            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-border-strong" aria-label="Waiting" />
                          )}
                          <div>
                            <p className={cn("text-sm font-medium", state === "todo" ? "text-muted-foreground" : "text-foreground")}>{step.label}</p>
                            <p className="text-caption text-muted-foreground">{step.detail}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </CardContent>
              </Card>
            </StaggerItem>
          </Stagger>
        ) : (
          <EmptyState
            icon={<VideoOff aria-hidden="true" />}
            title="This class wasn't recorded"
            description="Recording was off for this session, so there's no video, transcript or chapters."
            action={
              <Button variant="outline" leftIcon={<ArrowLeft aria-hidden="true" />} onClick={() => navigate("/teacher/recordings")}>
                Back to recordings
              </Button>
            }
          />
        )}
      </div>
    )
  }

  const summaryText = review?.executiveSummary.text ?? ""
  const matches = query.trim() ? transcript.filter((t) => `${t.speaker} ${t.text}`.toLowerCase().includes(query.trim().toLowerCase())) : transcript
  const progress = Math.min(1, time / length)

  return (
    <div className="flex w-full min-w-0 flex-col">
      {header(
        <>
          {course && (
            <Button
              variant="outline"
              onClick={() => navigate(`/teacher/courses/${course.id}?tab=curriculum`)}
            >
              View in Module &amp; Lesson
            </Button>
          )}
          <Button
            variant="outline"
            leftIcon={<Download aria-hidden="true" />}
            disabled={transcript.length === 0}
            onClick={() => {
              downloadTextFile(
                [`${recording.title}`, `${recording.courseCode} · ${recording.sessionDate}`, "", ...transcript.map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`)].join("\n"),
                `${recording.id}-transcript.txt`,
              )
              notify("Transcript downloaded")
            }}
          >
            Transcript
          </Button>
          {recording.videoApprovalStatus === "Pending Approval" ? (
            <Badge tone="warning" className="px-3 py-1.5 text-xs">
              Pending Admin Video Approval
            </Badge>
          ) : recording.videoApprovalStatus === "Approved" ? (
            <div className="flex items-center gap-2">
              <Badge tone="success" className="px-3 py-1.5 text-xs">
                Video Approved
              </Badge>
              <Button
                variant={isPublished ? "outline" : "primary"}
                leftIcon={isPublished ? <EyeOff aria-hidden="true" /> : <Upload aria-hidden="true" />}
                onClick={() => {
                  togglePublished(recording.id)
                  notify(isPublished ? "Recording hidden from learners" : "Recording published to learners")
                }}
              >
                {isPublished ? "Unpublish" : "Publish to learners"}
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              leftIcon={<Upload aria-hidden="true" />}
              onClick={() => requestRecordingPublish(recording.id)}
            >
              Submit for Admin Video Approval
            </Button>
          )}
        </>,
      )}

      <Stagger className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]" stagger={0.06}>
        <StaggerItem className="flex min-w-0 flex-col gap-5">
          <section aria-label="Player" className="overflow-hidden rounded-xl border border-white/10 bg-ink-950 shadow-[var(--glow-primary)]">
            <div className="relative aspect-video bg-black">
              {review?.videoUrl && !failed ? (
                <video
                  ref={videoRef}
                  src={review.videoUrl}
                  controls
                  preload="metadata"
                  className="h-full w-full"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onError={() => setFailed(true)}
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget
                    if (Number.isFinite(v.duration) && v.duration > 0) setTime((v.currentTime / v.duration) * length)
                  }}
                />
              ) : (
                <div className="absolute inset-0">
                  <CourseCover title={recording.title} category={courseArt(course?.id ?? "")} image={course?.thumbnail} showTitle={false} hoverZoom={false} className="h-full opacity-50" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <motion.button
                      type="button"
                      onClick={() => setPlaying((p) => !p)}
                      whileTap={{ scale: 0.94 }}
                      transition={spring.snappy}
                      aria-label={playing ? "Pause preview" : "Play preview"}
                      className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-transform hover:scale-105"
                    >
                      {playing ? <Pause className="h-6 w-6" aria-hidden="true" /> : <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden="true" />}
                    </motion.button>
                    <p className="max-w-sm text-sm text-white/85">The video preview isn't available here. Chapters and the transcript still follow along.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 pb-4 pt-3 sm:px-5">
              <div className="flex items-center justify-between gap-3 text-caption text-white/85">
                <span className="truncate font-medium text-white">{activeChapter?.title ?? "Full lecture"}</span>
                <span className="shrink-0 tabular-nums">
                  {formatClock(time)} / {formatClock(length)}
                </span>
              </div>
              <div className="relative mt-2">
                <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="group" aria-label="Chapters">
                  {(chapters.length ? chapters : [{ id: "all", seconds: 0, title: "Full lecture", timestamp: "00:00", description: "" }]).map((c, i, all) => {
                    const end = all[i + 1]?.seconds ?? length
                    const isActive = activeChapter?.id === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => seek(c.seconds)}
                        aria-label={`Jump to ${c.title}, ${c.timestamp}`}
                        style={{ flexGrow: Math.max(1, end - c.seconds) }}
                        className={cn("h-full min-w-1 basis-0 transition-colors", isActive ? "bg-white/40" : "bg-white/15 hover:bg-white/30")}
                      />
                    )
                  })}
                </div>
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" aria-hidden="true">
                  <div className="h-full w-full origin-left bg-primary" style={{ transform: `scaleX(${progress})` }} />
                </div>
              </div>
            </div>
          </section>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
              <div className="flex items-center gap-2.5">
                <IconTile icon={Sparkles} tone="secondary" />
                <div>
                  <CardTitle>Class summary</CardTitle>
                  {review && (
                    <p className="text-caption text-muted-foreground">
                      {review.executiveSummary.status} · {review.executiveSummary.lastUpdated}
                    </p>
                  )}
                </div>
              </div>
              {!editing && review && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<PencilLine aria-hidden="true" />}
                  onClick={() => {
                    setDraft(summaryText)
                    setEditing(true)
                  }}
                >
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence mode="wait" initial={false}>
                {editing ? (
                  <motion.form
                    key="edit"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4, transition: transition.fast }}
                    transition={transition.base}
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      updateSummary(recording.id, draft.trim())
                      setEditing(false)
                      notify("Summary updated")
                    }}
                  >
                    <label htmlFor="summary-edit" className="sr-only">
                      Class summary
                    </label>
                    <Textarea id="summary-edit" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[160px]" autoFocus />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" leftIcon={<Check aria-hidden="true" />} disabled={!draft.trim()}>
                        Save summary
                      </Button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.p key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition.fast} className="text-sm leading-6 text-foreground">
                    {summaryText || "No summary yet."}
                  </motion.p>
                )}
              </AnimatePresence>
              {recording.keyTakeaways && recording.keyTakeaways.length > 0 && (
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">Key takeaways</h3>
                  <ul className="grid gap-2 sm:grid-cols-3">
                    {recording.keyTakeaways.map((k) => (
                      <li key={k} className="flex gap-2 rounded-md border border-border bg-surface-2/60 p-3 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                        {k}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Badge tone={isPublished ? "success" : "neutral"} dot={isPublished}>
                  {isPublished ? "Visible to learners" : "Draft · only you can see it"}
                </Badge>
                {recording.recordingUrl && <CopyButton text={recording.recordingUrl} label="Copy link" className="ml-auto" />}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem className="min-w-0">
          <Card className="flex flex-col xl:sticky xl:top-0">
            <Tabs value={tab} onValueChange={setTab} variant="underline">
              <div className="px-4 pt-2">
                <TabsList aria-label="Recording panels" className="w-full justify-start">
                  <TabsTrigger value="chapters">
                    Chapters <span className="tabular-nums text-muted-foreground">{chapters.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="transcript">
                    Transcript <span className="tabular-nums text-muted-foreground">{transcript.length}</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="chapters" className="mt-0 p-3">
                {chapters.length === 0 ? (
                  <EmptyState size="sm" icon={<PlayCircle aria-hidden="true" />} title="No chapters yet" />
                ) : (
                  <ol className="flex flex-col gap-0.5">
                    {chapters.map((c) => {
                      const active = activeChapter?.id === c.id
                      return (
                        <li key={c.id}>
                          <button type="button" onClick={() => seek(c.seconds)} aria-current={active ? "true" : undefined} className={cn("relative flex w-full gap-3 rounded-md p-2.5 text-left", !active && "hover:bg-surface-2")}>
                            {active && <motion.span layoutId="review-chapter" transition={spring.snappy} aria-hidden="true" className="absolute inset-0 rounded-md border border-primary-border bg-primary-soft" />}
                            <span className={cn("relative mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums", active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground")}>{c.timestamp}</span>
                            <span className="relative min-w-0">
                              <span className="block text-sm font-medium text-foreground">{c.title}</span>
                              <span className="mt-0.5 block text-caption leading-5 text-muted-foreground">{c.description}</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </TabsContent>

              <TabsContent value="transcript" className="mt-0 p-3">
                <div className="mb-3 flex items-center gap-3 px-1">
                  <Input leading={<Search aria-hidden="true" />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the transcript" aria-label="Search the transcript" />
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch id="follow-along" size="sm" checked={follow} onCheckedChange={setFollow} />
                    <label htmlFor="follow-along" className="cursor-pointer text-caption font-medium text-muted-foreground">
                      Follow
                    </label>
                  </div>
                </div>
                {matches.length === 0 ? (
                  <EmptyState size="sm" icon={<Search aria-hidden="true" />} title="No matches" description={`Nothing in the transcript matches “${query}”.`} />
                ) : (
                  <ol className="flex max-h-[560px] flex-col gap-0.5 overflow-y-auto pr-1">
                    {matches.map((t) => {
                      const active = activeLine?.id === t.id
                      return (
                        <li
                          key={t.id}
                          ref={(el) => {
                            if (el) lineRefs.current.set(t.id, el)
                            else lineRefs.current.delete(t.id)
                          }}
                        >
                          <button type="button" onClick={() => seek(t.seconds)} className={cn("flex w-full gap-3 rounded-md p-2.5 text-left transition-colors", active ? "bg-primary-soft" : "hover:bg-surface-2")}>
                            <span className="mt-0.5 shrink-0 font-mono text-[11px] tabular-nums text-primary-text">{t.timestamp}</span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5 text-caption font-medium text-foreground">
                                {t.speaker}
                                {t.speakerRole === "Student" && (
                                  <Badge tone="info" size="sm">
                                    Learner
                                  </Badge>
                                )}
                              </span>
                              <span className="mt-0.5 block text-sm leading-6 text-muted-foreground">
                                <Highlight text={t.text} query={query} />
                              </span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </StaggerItem>
      </Stagger>
    </div>
  )
}
