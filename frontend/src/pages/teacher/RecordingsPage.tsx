import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Clapperboard, Eye, Loader2, Play, PlayCircle, Search, Timer, VideoOff } from "lucide-react"
import { Badge, Button, EmptyState, Input, PageHeader, SegmentedControl, StatCard, Switch } from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import CourseCover from "@/components/shared/CourseCover"
import CopyButton from "@/components/student/CopyButton"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"
import type { SessionRecordingItem } from "@/types"
import { useTeacherData } from "./teacherStore"
import { courseArt, courseByCode, recordedLabel } from "./teacherUtils"

type Filter = "all" | "published" | "draft" | "processing"

const minutes = (d: string) => Number.parseInt(d, 10) || 0

/** Every recorded class: publish to learners, then review chapters, transcript and summary. */
export default function RecordingsPage() {
  const navigate = useNavigate()
  const { recordings, courses, published, reviews, togglePublished, notify } = useTeacherData()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const state = (r: SessionRecordingItem): Exclude<Filter, "all"> | "missing" =>
    r.status === "Processing" ? "processing" : r.status === "Not Available" ? "missing" : published.has(r.id) ? "published" : "draft"

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Newest first; classes that weren't recorded go last.
    return [...recordings]
      .sort((a, b) => Number(a.status === "Not Available") - Number(b.status === "Not Available") || b.sessionDate.localeCompare(a.sessionDate))
      .filter((r) => !q || `${r.title} ${r.courseCode} ${r.courseName}`.toLowerCase().includes(q))
      .filter((r) => filter === "all" || state(r) === filter)
    // `state` reads `published`, which is a dependency.
  }, [recordings, query, filter, published])

  const available = recordings.filter((r) => r.status === "Available")
  const views = recordings.reduce((s, r) => s + (r.viewsCount ?? 0), 0)
  const hours = available.reduce((s, r) => s + minutes(r.duration), 0) / 60
  const processing = recordings.filter((r) => r.status === "Processing").length
  const count = (f: Filter) => (f === "all" ? recordings.length : recordings.filter((r) => state(r) === f).length)

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader title="Recordings" description="Every live class is recorded, transcribed and split into chapters. Review it, then publish it to learners." />

      <Stagger className="flex flex-col gap-5" stagger={0.05}>
        <StaggerItem>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard title="Published" value={published.size} trend={`of ${available.length} ready`} tone="success" icon={PlayCircle} onClick={() => setFilter("published")} />
            <StatCard title="Learner views" value={views} trend={{ value: "12% this week", isPositive: true }} tone="primary" icon={Eye} sparkline={[18, 26, 31, 44, 52, views / 3]} />
            <StatCard title="Hours recorded" value={hours.toFixed(1)} trend="this term" tone="info" icon={Timer} />
            <StatCard title="Processing" value={processing} trend={processing ? "ready in about 10 min" : "nothing queued"} tone="warning" icon={Clapperboard} onClick={() => setFilter("processing")} />
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              leading={<Search aria-hidden="true" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recordings"
              aria-label="Search recordings"
              wrapperClassName="md:max-w-xs"
            />
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 md:ml-auto">
              <SegmentedControl
                className="[&_button]:whitespace-nowrap"
                aria-label="Filter recordings"
                options={[
                  { value: "all" as Filter, label: `All ${count("all")}` },
                  { value: "published" as Filter, label: `Published ${count("published")}` },
                  { value: "draft" as Filter, label: `Drafts ${count("draft")}` },
                  { value: "processing" as Filter, label: `Processing ${count("processing")}` },
                ]}
                value={filter}
                onChange={setFilter}
              />
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          {visible.length === 0 ? (
            <EmptyState
              icon={<Search aria-hidden="true" />}
              title="No recordings here"
              description={query ? `Nothing matches “${query}”.` : "Recordings appear after a live class ends."}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("")
                    setFilter("all")
                  }}
                >
                  Show all recordings
                </Button>
              }
            />
          ) : (
            <motion.ul layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {visible.map((r) => {
                  const course = courseByCode(courses, r.courseCode)
                  const s = state(r)
                  const review = reviews[r.id]
                  const openable = r.status !== "Not Available"
                  return (
                    <motion.li key={r.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={spring.soft} className="min-w-0">
                      <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--elev-xs)] transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-border-strong/60 hover:shadow-[var(--elev-md)]">
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-hidden="true"
                          disabled={!openable}
                          onClick={() => navigate(`/teacher/recordings/${r.id}`)}
                          className="block disabled:cursor-default"
                        >
                          <CourseCover title={r.title} category={courseArt(course?.id ?? "")} image={course?.thumbnail} showTitle={false} className="aspect-video">
                            <span className="absolute inset-0 z-10 flex items-center justify-center">
                              {s === "processing" ? (
                                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-ink-950/70 text-white backdrop-blur-sm">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                </span>
                              ) : s === "missing" ? (
                                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-ink-950/70 text-white/80 backdrop-blur-sm">
                                  <VideoOff className="h-5 w-5" />
                                </span>
                              ) : (
                                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110">
                                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                                </span>
                              )}
                            </span>
                            <span className="absolute bottom-3 right-3 z-10 rounded-md bg-ink-950/75 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">{r.duration}</span>
                            <span className="absolute left-3 top-3 z-10 rounded-full border border-white/15 bg-ink-950/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
                              {r.courseCode}
                            </span>
                            {s === "processing" && (
                              <span className="absolute inset-x-0 bottom-0 z-10 h-1 overflow-hidden bg-white/10" aria-hidden="true">
                                <span className="block h-full w-1/3 animate-[q-shimmer_1.6s_ease-in-out_infinite] bg-white/70" />
                              </span>
                            )}
                          </CourseCover>
                        </button>
                        <div className="flex flex-1 flex-col gap-3 p-4">
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
                              {openable ? (
                                <button type="button" onClick={() => navigate(`/teacher/recordings/${r.id}`)} className="text-left transition-colors hover:text-primary-text">
                                  {r.title}
                                </button>
                              ) : (
                                r.title
                              )}
                            </h3>
                            <p className="mt-1 truncate text-caption text-muted-foreground">
                              {recordedLabel(r.sessionDate)} · {r.viewsCount ?? 0} views{r.fileSize && r.status === "Available" ? ` · ${r.fileSize}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge tone={s === "published" ? "success" : s === "processing" ? "info" : "neutral"} dot={s === "published"}>
                              {s === "published" ? "Published" : s === "draft" ? "Draft" : s === "processing" ? "Processing" : "No recording"}
                            </Badge>
                            {r.videoApprovalStatus && (
                              <Badge tone={r.videoApprovalStatus === "Approved" ? "success" : "warning"}>
                                Video: {r.videoApprovalStatus}
                              </Badge>
                            )}
                            {review && review.chapters.length > 0 && <Badge tone="primary">{review.chapters.length} chapters</Badge>}
                            {review && review.whisperTranscripts.length > 0 && <Badge tone="neutral">Transcript</Badge>}
                          </div>
                          {course && (
                            <div className="pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs h-7"
                                onClick={() => navigate(`/teacher/courses/${course.id}?tab=curriculum`)}
                              >
                                View in Module &amp; Lesson
                              </Button>
                            </div>
                          )}
                          <div className={cn("mt-auto flex items-center gap-2 border-t border-border pt-3", !openable && "justify-between")}>
                            {r.status === "Available" ? (
                              <>
                                <Switch
                                  id={`publish-${r.id}`}
                                  size="sm"
                                  checked={published.has(r.id)}
                                  onCheckedChange={() => {
                                    togglePublished(r.id)
                                    notify(published.has(r.id) ? `“${r.title}” hidden from learners` : `“${r.title}” published to learners`)
                                  }}
                                />
                                <label htmlFor={`publish-${r.id}`} className="cursor-pointer text-caption font-medium text-muted-foreground">
                                  Visible to learners
                                </label>
                                <div className="ml-auto flex items-center gap-1">
                                  {r.recordingUrl && <CopyButton text={r.recordingUrl} size="icon-sm" aria-label="Copy recording link" />}
                                  <Button size="sm" variant="secondary" onClick={() => navigate(`/teacher/recordings/${r.id}`)}>
                                    Review
                                  </Button>
                                </div>
                              </>
                            ) : r.status === "Processing" ? (
                              <>
                                <span className="text-caption text-muted-foreground">Transcribing and chaptering…</span>
                                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => navigate(`/teacher/recordings/${r.id}`)}>
                                  Status
                                </Button>
                              </>
                            ) : (
                              <span className="text-caption text-muted-foreground">This class wasn't recorded.</span>
                            )}
                          </div>
                        </div>
                      </article>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </motion.ul>
          )}
        </StaggerItem>
      </Stagger>
    </div>
  )
}
