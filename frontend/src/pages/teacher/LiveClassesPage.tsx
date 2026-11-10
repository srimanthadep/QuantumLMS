import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { ArrowRight, CalendarPlus, CalendarX2, Clock, Link2, MoreHorizontal, PlayCircle, Radio, RotateCcw, Timer, Users, Video, X } from "lucide-react"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  PageHeader,
  SegmentedControl,
} from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import CourseCover from "@/components/shared/CourseCover"
import DateTile from "@/components/student/DateTile"
import IconTile from "@/components/teacher/IconTile"
import LiveSessionHero from "@/components/teacher/LiveSessionHero"
import ScheduleSessionDialog from "@/components/teacher/ScheduleSessionDialog"
import { cn } from "@/lib/utils"
import { ease, spring } from "@/lib/motion"
import type { LiveSessionItem } from "@/types"
import { copyText } from "@/pages/student/studentUtils"
import { useTeacherData } from "./teacherStore"
import { addDays, courseByCode, courseArt, dayLabel, DEMO_DATE, DEMO_NOW, formatTimeRange, isoDate, monthDay, SESSION_STATUS_TONE, startOfWeek, toDate } from "./teacherUtils"

type Filter = "upcoming" | "past" | "all"

const isUpcoming = (s: LiveSessionItem) => s && (s.status === "Live Now" || s.status === "Upcoming" || s.status === "Scheduled")
const sortKey = (s: LiveSessionItem) => `${s?.scheduledDate || ""} ${s?.startTime || ""}`

/** Run, schedule and review live classes. */
export default function LiveClassesPage() {
  const navigate = useNavigate()
  const { sessions = [], recordings = [], courses = [], published, startSession, updateSession, notify } = useTeacherData()
  const [filter, setFilter] = useState<Filter>("upcoming")
  const [day, setDay] = useState<string | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [editing, setEditing] = useState<LiveSessionItem | null>(null)
  const [cancelling, setCancelling] = useState<LiveSessionItem | null>(null)

  const safeSessions = useMemo(() => (Array.isArray(sessions) ? sessions.filter(Boolean) : []), [sessions])
  const live = safeSessions.find((s) => s.status === "Live Now")
  const next = useMemo(() => safeSessions.filter((s) => s.status === "Upcoming" || s.status === "Scheduled").sort((a, b) => sortKey(a).localeCompare(sortKey(b)))[0], [safeSessions])
  const focus = live ?? next

  const week = useMemo(() => {
    const start = startOfWeek(DEMO_NOW)
    return Array.from({ length: 7 }, (_, i) => {
      const date = isoDate(addDays(start, i))
      const list = safeSessions.filter((s) => (s.scheduledDate || DEMO_DATE) === date && s.status !== "Cancelled")
      return { date, list, minutes: list.reduce((m, s) => m + (s.durationMinutes || 60), 0) }
    })
  }, [safeSessions])
  const weekMax = Math.max(1, ...week.map((d) => d.list.length))
  const weekCount = week.reduce((n, d) => n + d.list.length, 0)
  const weekHours = week.reduce((n, d) => n + d.minutes, 0) / 60

  const counts = {
    upcoming: safeSessions.filter(isUpcoming).length,
    past: safeSessions.filter((s) => !isUpcoming(s)).length,
    all: safeSessions.length,
  }

  const groups = useMemo(() => {
    const list = safeSessions
      .filter((s) => (filter === "upcoming" ? isUpcoming(s) : filter === "past" ? !isUpcoming(s) : true))
      .filter((s) => !day || (s.scheduledDate || DEMO_DATE) === day)
      .sort((a, b) => (filter === "past" ? sortKey(b).localeCompare(sortKey(a)) : sortKey(a).localeCompare(sortKey(b))))
    const map = new Map<string, LiveSessionItem[]>()
    for (const s of list) {
      const d = s.scheduledDate || DEMO_DATE
      map.set(d, [...(map.get(d) ?? []), s])
    }
    return [...map.entries()]
  }, [safeSessions, filter, day])

  const recent = useMemo(
    () =>
      recordings
        .filter((r) => r.status !== "Not Available" && r.sessionDate <= DEMO_DATE)
        .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
        .slice(0, 3),
    [recordings],
  )

  const start = (s: LiveSessionItem) => {
    startSession(s.id)
    notify(`“${s.title}” is live. Learners have been notified.`)
    navigate(`/teacher/live-class/studio/${s.id}`)
  }
  const openFocus = () => {
    if (!focus) return
    if (focus.status === "Live Now") navigate(`/teacher/live-class/studio/${focus.id}`)
    else if (focus.scheduledDate === DEMO_DATE) start(focus)
    else setEditing(focus)
  }

  const menu = (s: LiveSessionItem) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={`More actions for ${s.title}`}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setEditing(s)}>
          <CalendarPlus aria-hidden="true" /> Reschedule
        </DropdownMenuItem>
        {s.meetingUrl && (
          <DropdownMenuItem
            onSelect={async () => {
              await copyText(s.meetingUrl ?? "")
              notify("Join link copied")
            }}
          >
            <Link2 aria-hidden="true" /> Copy join link
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => setCancelling(s)}>
          <CalendarX2 aria-hidden="true" /> Cancel class
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const actions = (s: LiveSessionItem) => {
    if (s.status === "Live Now")
      return (
        <Button size="sm" leftIcon={<Radio aria-hidden="true" />} onClick={() => navigate(`/teacher/live-class/studio/${s.id}`)}>
          Enter studio
        </Button>
      )
    if (s.status === "Cancelled")
      return (
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<RotateCcw aria-hidden="true" />}
          onClick={() => {
            updateSession(s.id, { status: "Upcoming" })
            notify(`Restored “${s.title}”`)
          }}
        >
          Restore
        </Button>
      )
    if (s.status === "Completed") {
      const rec = recordings.find((r) => r.sessionId === s.id)
      return rec && rec.status !== "Not Available" ? (
        <Button size="sm" variant="outline" leftIcon={<PlayCircle aria-hidden="true" />} onClick={() => navigate(`/teacher/recordings/${rec.id}`)}>
          Recording
        </Button>
      ) : (
        <span className="text-caption text-muted-foreground">No recording</span>
      )
    }
    return (
      <>
        {s.scheduledDate === DEMO_DATE ? (
          <Button size="sm" onClick={() => start(s)}>
            Start
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
            Reschedule
          </Button>
        )}
        {menu(s)}
      </>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        title="Live classes"
        description="Launch today's class call and host live interactive video sessions with learners."
      />

      <Stagger className="flex flex-col gap-5" stagger={0.05}>
        {focus && (
          <StaggerItem>
            <LiveSessionHero session={focus} onPrimary={openFocus} primaryLabel={focus.status !== "Live Now" && focus.scheduledDate !== DEMO_DATE ? "Reschedule" : undefined} />
          </StaggerItem>
        )}

        <StaggerItem>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section aria-label="Classes" className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <SegmentedControl
                  aria-label="Show classes"
                  options={[
                    { value: "upcoming" as Filter, label: `Upcoming ${counts.upcoming}` },
                    { value: "past" as Filter, label: `Past ${counts.past}` },
                    { value: "all" as Filter, label: "All" },
                  ]}
                  value={filter}
                  onChange={setFilter}
                />
                <AnimatePresence>
                  {day && (
                    <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring.snappy}>
                      <Button size="sm" variant="secondary" rightIcon={<X aria-hidden="true" />} onClick={() => setDay(null)} aria-label={`Clear day filter, ${dayLabel(day)}`}>
                        {dayLabel(day)}
                      </Button>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {groups.length === 0 ? (
                <EmptyState
                  icon={<Radio aria-hidden="true" />}
                  title={day ? `No class calls on ${dayLabel(day).toLowerCase()}` : "No live class calls"}
                  description="Upcoming live calls will appear when scheduled."
                />
              ) : (
                <div className="flex flex-col gap-5">
                  {groups.map(([date, list]) => (
                    <section key={date} aria-label={dayLabel(date)}>
                      <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-foreground">
                        {dayLabel(date)}
                        <span className="text-caption font-normal text-muted-foreground">
                          {toDate(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                        </span>
                      </h2>
                      <motion.ul layout className="flex flex-col gap-2">
                        <AnimatePresence initial={false}>
                          {list.map((s) => (
                            <motion.li
                              key={s.id}
                              layout
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              transition={spring.soft}
                            >
                              <div
                                className={cn(
                                  "flex flex-wrap items-center gap-4 rounded-lg border bg-surface p-4 shadow-[var(--elev-xs)] transition-[border-color,box-shadow] duration-200 hover:shadow-[var(--elev-md)] sm:flex-nowrap",
                                  s.status === "Live Now" ? "border-danger/40" : "border-border hover:border-border-strong/60",
                                  s.status === "Cancelled" && "opacity-70",
                                )}
                              >
                                <DateTile {...monthDay(s.scheduledDate)} tone={s.status === "Live Now" ? "live" : isUpcoming(s) ? "accent" : "default"} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className={cn("min-w-0 text-sm font-semibold text-foreground", s.status === "Cancelled" && "line-through")}>{s.title}</p>
                                    <Badge tone={SESSION_STATUS_TONE[s.status]} dot={s.status === "Live Now"}>
                                      {s.status}
                                    </Badge>
                                  </div>
                                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                      {formatTimeRange(s.startTime, s.endTime)}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <Video className="h-3.5 w-3.5" aria-hidden="true" />
                                      {s.platform}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                                      {s.enrolledCount ?? 0} learners
                                    </span>
                                    <span className="font-medium text-foreground">{s.courseCode}</span>
                                  </p>
                                  {s.topicsCovered && s.topicsCovered.length > 0 && (
                                    <ul className="mt-2 hidden flex-wrap gap-1.5 md:flex" aria-label="Topics">
                                      {s.topicsCovered.slice(0, 3).map((t) => (
                                        <li key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground">
                                          {t}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">{actions(s)}</div>
                              </div>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </motion.ul>
                    </section>
                  ))}
                </div>
              )}
            </section>

            <aside className="flex flex-col gap-5" aria-label="This week">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5">
                    <IconTile icon={Timer} tone="info" />
                    <CardTitle>Week at a glance</CardTitle>
                  </div>
                  <p className="text-caption text-muted-foreground">Pick a day to filter the list.</p>
                </CardHeader>
                <CardContent>
                  <div className="flex h-28 items-end gap-2" role="group" aria-label="Classes per day this week">
                    {week.map((d, i) => {
                      const active = day === d.date
                      const today = d.date === DEMO_DATE
                      return (
                        <button
                          key={d.date}
                          type="button"
                          aria-pressed={active}
                          aria-label={`${toDate(d.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}: ${d.list.length} classes`}
                          onClick={() => setDay(active ? null : d.date)}
                          className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                        >
                          <span className="text-[11px] font-semibold tabular-nums text-foreground">{d.list.length || ""}</span>
                          <motion.span
                            className={cn(
                              "w-full max-w-[28px] origin-bottom rounded-t-[5px] transition-colors",
                              active ? "bg-primary" : today ? "bg-primary/60" : "bg-primary/25 group-hover:bg-primary/45",
                            )}
                            style={{ height: `${Math.max(6, (d.list.length / weekMax) * 72)}px` }}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ duration: 0.6, ease: ease.out, delay: i * 0.04 }}
                          />
                          <span className={cn("text-[11px]", today ? "font-semibold text-primary-text" : "text-muted-foreground")}>
                            {toDate(d.date).toLocaleDateString("en-GB", { weekday: "narrow" })}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
                    {[
                      { label: "Classes", value: String(weekCount) },
                      { label: "Hours", value: weekHours.toFixed(1) },
                      { label: "Published", value: String(published.size) },
                    ].map((s) => (
                      <div key={s.label}>
                        <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
                        <dd className="text-lg font-semibold tabular-nums text-foreground">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
                  <div className="flex items-center gap-2.5">
                    <IconTile icon={PlayCircle} tone="secondary" />
                    <CardTitle>Recent recordings</CardTitle>
                  </div>
                  <Button size="sm" variant="ghost" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => navigate("/teacher/recordings")}>
                    All
                  </Button>
                </CardHeader>
                <CardContent>
                  <ul className="-mx-2 flex flex-col">
                    {recent.map((r) => {
                      const course = courseByCode(courses, r.courseCode)
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => navigate(`/teacher/recordings/${r.id}`)}
                            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-2"
                          >
                            <CourseCover title={r.title} category={courseArt(course?.id ?? "")} image={course?.thumbnail} showTitle={false} className="aspect-[16/10] w-16 shrink-0 rounded-md" />
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-1 text-sm font-medium text-foreground">{r.title}</span>
                              <span className="block truncate text-caption text-muted-foreground">
                                {dayLabel(r.sessionDate)} · {r.duration}
                              </span>
                            </span>
                            <Badge tone={r.status === "Available" ? (published.has(r.id) ? "success" : "neutral") : r.status === "Processing" ? "info" : "neutral"} size="sm">
                              {r.status === "Available" ? (published.has(r.id) ? "Published" : "Draft") : r.status}
                            </Badge>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            </aside>
          </div>
        </StaggerItem>
      </Stagger>

      <ScheduleSessionDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <ScheduleSessionDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} session={editing} />
      <Dialog open={cancelling !== null} onOpenChange={(o) => !o && setCancelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this class?</DialogTitle>
            <DialogDescription>
              {cancelling ? `“${cancelling.title}” on ${dayLabel(cancelling.scheduledDate).toLowerCase()}. ` : ""}
              Learners get a cancellation notice. You can restore the class later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelling(null)}>
              Keep class
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (cancelling) {
                  updateSession(cancelling.id, { status: "Cancelled" })
                  notify(`Cancelled “${cancelling.title}”. Learners have been told.`)
                }
                setCancelling(null)
              }}
            >
              Cancel class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
