import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { CalendarClock, CalendarPlus, ChevronLeft, ChevronRight, Clock, Flag, MapPin, PlayCircle, Plus, Radio, Trash2 } from "lucide-react"
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Field,
  Input,
  DatePicker,
  PageHeader,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import ScheduleSessionDialog from "@/components/teacher/ScheduleSessionDialog"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import type { CalendarEventItem } from "@/types"
import { useTeacherData } from "./teacherStore"
import { addDays, dayLabel, DEMO_DATE, DEMO_NOW, EVENT_STYLE, formatTime, formatTimeRange, isoDate, minutesOf, sessionAsEvent, startOfWeek, toDate } from "./teacherUtils"

type View = "week" | "month" | "agenda"
type Category = CalendarEventItem["category"]

const CATEGORIES = Object.keys(EVENT_STYLE) as Category[]
const NEW_CATEGORIES: Category[] = ["Office Hours", "Meeting", "Quiz", "Deadline", "Reminder"]
const DAY_START = 8
const DAY_END = 18
const HOUR_PX = 56
const NOW_MIN = DEMO_NOW.getHours() * 60 + DEMO_NOW.getMinutes()

/** Side-by-side columns for overlapping events in one day. */
function layoutDay(list: CalendarEventItem[]): Map<string, { col: number; cols: number }> {
  const sorted = [...list].sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime) || minutesOf(b.endTime) - minutesOf(a.endTime))
  const placed = new Map<string, { col: number; cols: number }>()
  let cluster: string[] = []
  let clusterEnd = -1
  let colEnds: number[] = []
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((id) => (placed.get(id)?.col ?? 0) + 1))
    for (const id of cluster) placed.set(id, { col: placed.get(id)?.col ?? 0, cols })
    cluster = []
    colEnds = []
  }
  for (const e of sorted) {
    const s = minutesOf(e.startTime)
    const end = Math.max(s + 30, minutesOf(e.endTime))
    if (cluster.length && s >= clusterEnd) flush()
    let col = colEnds.findIndex((x) => x <= s)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(end)
    } else colEnds[col] = end
    placed.set(e.id, { col, cols: 1 })
    cluster.push(e.id)
    clusterEnd = cluster.length === 1 ? end : Math.max(clusterEnd, end)
  }
  if (cluster.length) flush()
  return placed
}

function NewEventDialog({ open, onOpenChange, date }: { open: boolean; onOpenChange: (o: boolean) => void; date: string }) {
  const { courses, addEvent, notify } = useTeacherData()
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<Category>("Office Hours")
  const [day, setDay] = useState(date)
  const [start, setStart] = useState("15:00")
  const [end, setEnd] = useState("16:00")
  const [courseId, setCourseId] = useState("none")
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState<{ title?: string; time?: string }>({})
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) {
      setTitle("")
      setCategory("Office Hours")
      setDay(date)
      setStart("15:00")
      setEnd("16:00")
      setCourseId("none")
      setLocation("")
      setDescription("")
      setErrors({})
    }
  }
  const deadline = category === "Deadline"
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const next = {
              title: title.trim().length < 3 ? "Give the event a title of at least 3 characters." : undefined,
              time: !deadline && minutesOf(end) <= minutesOf(start) ? "The event must end after it starts." : undefined,
            }
            setErrors(next)
            if (next.title || next.time) return
            const course = courses.find((c) => c.id === courseId)
            addEvent({
              title: title.trim(),
              category,
              startDate: day,
              startTime: start,
              endTime: deadline ? start : end,
              courseId: course?.id,
              courseName: course?.name,
              location: location.trim() || undefined,
              description: description.trim() || undefined,
              status: "Scheduled",
            })
            notify(`Added “${title.trim()}” to ${dayLabel(day).toLowerCase()}`)
            onOpenChange(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>New event</DialogTitle>
            <DialogDescription>Office hours, meetings, quizzes, deadlines or a reminder for yourself.</DialogDescription>
          </DialogHeader>
          <Field label="Title" required error={errors.title}>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. LangGraph drop-in office hours" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NEW_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Course">
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No course</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} · {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className={cn("grid gap-4", deadline ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
            <Field label="Date">
              <DatePicker value={day} onChange={setDay} />
            </Field>
            <Field label={deadline ? "Due at" : "Starts"}>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            {!deadline && (
              <Field label="Ends" error={errors.time}>
                <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </Field>
            )}
          </div>
          <Field label="Location" hint="Optional. A room or a link.">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room 4B or a meeting link" />
          </Field>
          <Field label="Notes" hint="Optional">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" leftIcon={<Plus aria-hidden="true" />}>
              Add event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** One school calendar: classes, office hours, deadlines and meetings, by week, month or as an agenda. */
export default function CalendarPage() {
  const navigate = useNavigate()
  const { events, sessions, recordings, deleteEvent, notify } = useTeacherData()
  const [view, setView] = useState<View>("week")
  const [cursor, setCursor] = useState<Date>(DEMO_NOW)
  const [day, setDay] = useState(DEMO_DATE)
  const [hidden, setHidden] = useState<Set<Category>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [createDate, setCreateDate] = useState(DEMO_DATE)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const all = useMemo(() => [...events, ...sessions.filter((s) => s.status !== "Cancelled").map(sessionAsEvent)], [events, sessions])
  const shown = useMemo(() => all.filter((e) => !hidden.has(e.category)), [all, hidden])
  const onDate = (date: string) => shown.filter((e) => e.startDate === date).sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime))

  const weekStart = startOfWeek(cursor)
  const weekDays = Array.from({ length: 7 }, (_, i) => isoDate(addDays(weekStart, i)))
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(monthStart)
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const agendaDays = Array.from({ length: 14 }, (_, i) => isoDate(addDays(cursor, i))).filter((d) => onDate(d).length > 0)

  const step = (dir: -1 | 1) => {
    if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1))
    else {
      const next = addDays(cursor, dir * 7)
      setCursor(next)
      setDay(isoDate(startOfWeek(next)))
    }
  }
  const goToday = () => {
    setCursor(DEMO_NOW)
    setDay(DEMO_DATE)
  }

  const label =
    view === "month"
      ? cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : view === "agenda"
        ? `Next two weeks from ${cursor.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
        : `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${addDays(weekStart, 6).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`

  const details = (e: CalendarEventItem) => {
    const sessionId = e.id.startsWith("session-") ? e.id.slice("session-".length) : null
    const session = sessionId ? sessions.find((s) => s.id === sessionId) : undefined
    const rec = session ? recordings.find((r) => r.sessionId === session.id && r.status !== "Not Available") : undefined
    const style = EVENT_STYLE[e.category]
    return (
      <PopoverContent align="start" className="w-80">
        <div className="flex items-center gap-2">
          <Badge tone={style.tone} dot>
            {session?.status === "Live Now" ? "Live class" : e.category}
          </Badge>
          {e.status === "Completed" && <Badge tone="neutral">Done</Badge>}
        </div>
        <p className="mt-2 text-sm font-semibold text-foreground">{e.title}</p>
        <dl className="mt-3 space-y-1.5 text-caption text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <dd>
              {dayLabel(e.startDate)}, {e.startTime === e.endTime ? `due ${formatTime(e.startTime)}` : formatTimeRange(e.startTime, e.endTime)}
            </dd>
          </div>
          {e.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <dd className="truncate">{e.location}</dd>
            </div>
          )}
          {e.courseName && (
            <div className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <dd className="truncate">{e.courseName}</dd>
            </div>
          )}
        </dl>
        {e.description && <p className="mt-3 line-clamp-4 text-caption leading-5 text-foreground">{e.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {session?.status === "Live Now" && (
            <Button size="sm" leftIcon={<Radio aria-hidden="true" />} onClick={() => navigate(`/teacher/live-class/studio/${session.id}`)}>
              Enter studio
            </Button>
          )}
          {session && (session.status === "Upcoming" || session.status === "Scheduled") && (
            <Button size="sm" variant="secondary" onClick={() => navigate("/teacher/live-class")}>
              Open in live classes
            </Button>
          )}
          {rec && (
            <Button size="sm" variant="secondary" leftIcon={<PlayCircle aria-hidden="true" />} onClick={() => navigate(`/teacher/recordings/${rec.id}`)}>
              Recording
            </Button>
          )}
          {!e.isReadOnly ? (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-danger hover:text-danger"
              leftIcon={<Trash2 aria-hidden="true" />}
              onClick={() => {
                deleteEvent(e.id)
                notify(`Removed “${e.title}”`)
              }}
            >
              Delete
            </Button>
          ) : (
            !session && <span className="text-[11px] text-muted-foreground">From the school calendar</span>
          )}
        </div>
      </PopoverContent>
    )
  }

  const dayColumn = (date: string, idx: number) => {
    const list = onDate(date)
    const layout = layoutDay(list)
    const isToday = date === DEMO_DATE
    return (
      <div key={date} className={cn("relative border-l border-border", isToday && "bg-primary-soft/40")} style={{ height: (DAY_END - DAY_START) * HOUR_PX }}>
        {Array.from({ length: DAY_END - DAY_START }, (_, h) => (
          <div key={h} className="absolute inset-x-0 border-t border-dashed border-border/70" style={{ top: h * HOUR_PX }} aria-hidden="true" />
        ))}
        {list.map((e, i) => {
          const s = Math.max(DAY_START * 60, minutesOf(e.startTime))
          const end = Math.min(DAY_END * 60, Math.max(s + 30, minutesOf(e.endTime)))
          const pos = layout.get(e.id) ?? { col: 0, cols: 1 }
          const top = ((s - DAY_START * 60) / 60) * HOUR_PX
          const height = Math.max(26, ((end - s) / 60) * HOUR_PX - 2)
          const deadline = e.startTime === e.endTime
          const live = e.id.startsWith("session-") && sessions.find((x) => `session-${x.id}` === e.id)?.status === "Live Now"
          return (
            <Popover key={e.id}>
              <PopoverTrigger asChild>
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...transition.base, delay: idx * 0.03 + i * 0.03 }}
                  className={cn(
                    "absolute overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-left shadow-[var(--elev-xs)] transition-shadow hover:z-10 hover:shadow-[var(--elev-md)] focus-visible:z-10",
                    EVENT_STYLE[e.category].block,
                    live && "ring-1 ring-danger",
                    e.status === "Completed" && "opacity-70",
                  )}
                  style={{ top, height: deadline ? 26 : height, left: `calc(${(pos.col / pos.cols) * 100}% + 2px)`, width: `calc(${100 / pos.cols}% - 4px)` }}
                >
                  <span className="flex items-center gap-1 text-[11px] font-semibold leading-4 text-foreground">
                    {deadline && <Flag className="h-3 w-3 shrink-0 text-danger" aria-hidden="true" />}
                    {live && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />}
                    <span className="truncate">{e.title}</span>
                  </span>
                  {!deadline && height > 40 && <span className="block truncate text-[10px] leading-4 text-muted-foreground">{formatTimeRange(e.startTime, e.endTime)}</span>}
                </motion.button>
              </PopoverTrigger>
              {details(e)}
            </Popover>
          )
        })}
        {isToday && NOW_MIN >= DAY_START * 60 && NOW_MIN <= DAY_END * 60 && (
          <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: ((NOW_MIN - DAY_START * 60) / 60) * HOUR_PX }} aria-hidden="true">
            <span className="-ml-1 h-2 w-2 rounded-full bg-danger" />
            <span className="h-px flex-1 bg-danger" />
          </div>
        )}
      </div>
    )
  }

  const hourGutter = (
    <div className="relative" style={{ height: (DAY_END - DAY_START) * HOUR_PX }} aria-hidden="true">
      {Array.from({ length: DAY_END - DAY_START }, (_, h) => (
        <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-subtle-foreground" style={{ top: h * HOUR_PX }}>
          {h === 0 ? "" : formatTime(`${DAY_START + h}:00`).replace(":00", "")}
        </span>
      ))}
    </div>
  )

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        title="Calendar"
        description="Classes, office hours, deadlines and meetings in one place."
        actions={
          <>
            <Button variant="outline" leftIcon={<CalendarPlus aria-hidden="true" />} onClick={() => setScheduleOpen(true)}>
              Schedule class
            </Button>
            <Button
              leftIcon={<Plus aria-hidden="true" />}
              onClick={() => {
                setCreateDate(view === "week" ? day : DEMO_DATE)
                setCreateOpen(true)
              }}
            >
              New event
            </Button>
          </>
        }
      />

      <Stagger className="flex flex-col gap-4" stagger={0.05}>
        <StaggerItem>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" aria-label={view === "month" ? "Previous month" : "Previous week"} onClick={() => step(-1)}>
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button size="icon" variant="outline" aria-label={view === "month" ? "Next month" : "Next week"} onClick={() => step(1)}>
                <ChevronRight aria-hidden="true" />
              </Button>
              <Button variant="ghost" onClick={goToday}>
                Today
              </Button>
            </div>
            <h2 className="min-w-0 text-base font-semibold text-foreground" aria-live="polite">
              {label}
            </h2>
            <div className="ml-auto">
              <SegmentedControl
                aria-label="Calendar view"
                options={[
                  { value: "week" as View, label: "Week" },
                  { value: "month" as View, label: "Month" },
                  { value: "agenda" as View, label: "Agenda" },
                ]}
                value={view}
                onChange={setView}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Show event types">
            {CATEGORIES.map((c) => {
              const on = !hidden.has(c)
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setHidden((cur) => {
                      const n = new Set(cur)
                      if (n.has(c)) n.delete(c)
                      else n.add(c)
                      return n
                    })
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    on ? "border-border bg-surface text-foreground" : "border-dashed border-border text-muted-foreground",
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full transition-opacity", EVENT_STYLE[c].dot, !on && "opacity-30")} aria-hidden="true" />
                  {c === "Class" ? "Classes" : c}
                </button>
              )
            })}
          </div>
        </StaggerItem>

        <StaggerItem>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`${view}-${view === "month" ? cursor.getMonth() : isoDate(weekStart)}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: transition.fast }} transition={transition.base}>
              {view === "week" && (
                <Card className="overflow-hidden">
                  <div className="hidden md:block">
                    <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-border">
                      <span />
                      {weekDays.map((d) => {
                        const date = toDate(d)
                        const today = d === DEMO_DATE
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setCreateDate(d)
                              setCreateOpen(true)
                            }}
                            className="group border-l border-border px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
                            aria-label={`Add an event on ${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`}
                          >
                            <span className={cn("block text-[11px] font-medium uppercase tracking-wider", today ? "text-primary-text" : "text-muted-foreground")}>
                              {date.toLocaleDateString("en-GB", { weekday: "short" })}
                            </span>
                            <span className="mt-0.5 flex items-center justify-between">
                              <span
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                                  today ? "bg-primary text-primary-foreground" : "text-foreground",
                                )}
                              >
                                {date.getDate()}
                              </span>
                              <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <div className="max-h-[640px] overflow-y-auto">
                      <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] pt-2">
                        {hourGutter}
                        {weekDays.map((d, i) => dayColumn(d, i))}
                      </div>
                    </div>
                  </div>

                  <div className="md:hidden">
                    <div className="grid grid-cols-7 gap-1 border-b border-border p-2" role="group" aria-label="Pick a day">
                      {weekDays.map((d) => {
                        const date = toDate(d)
                        const active = d === day
                        const n = onDate(d).length
                        return (
                          <button
                            key={d}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setDay(d)}
                            className={cn("flex flex-col items-center gap-0.5 rounded-md py-1.5 transition-colors", active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-surface-2")}
                          >
                            <span className={cn("text-[10px] font-medium uppercase", active ? "text-primary-foreground" : "text-muted-foreground")}>{date.toLocaleDateString("en-GB", { weekday: "narrow" })}</span>
                            <span className="text-sm font-semibold tabular-nums">{date.getDate()}</span>
                            <span className={cn("h-1 w-1 rounded-full", n ? (active ? "bg-primary-foreground" : "bg-primary") : "bg-transparent")} aria-hidden="true" />
                          </button>
                        )
                      })}
                    </div>
                    <div className="max-h-[560px] overflow-y-auto">
                      <div className="grid grid-cols-[44px_minmax(0,1fr)] pt-2">
                        {hourGutter}
                        {dayColumn(weekDays.includes(day) ? day : weekDays[0], 0)}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {view === "month" && (
                <Card className="overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-border">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <span key={d} className="px-2 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {monthDays.map((date, i) => {
                      const d = isoDate(date)
                      const list = onDate(d)
                      const inMonth = date.getMonth() === cursor.getMonth()
                      const today = d === DEMO_DATE
                      return (
                        <div key={d} className={cn("min-h-[64px] border-b border-l border-border p-1 sm:min-h-[104px] sm:p-1.5", i % 7 === 0 && "border-l-0", !inMonth && "bg-surface-2/50")}>
                          <button
                            type="button"
                            onClick={() => {
                              setCursor(date)
                              setDay(d)
                              setView("week")
                            }}
                            aria-label={`Open the week of ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`}
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full text-caption font-semibold tabular-nums transition-colors",
                              today ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground hover:bg-surface-2" : "text-subtle-foreground hover:bg-surface-2",
                            )}
                          >
                            {date.getDate()}
                          </button>
                          <ul className="mt-1 hidden space-y-0.5 sm:block">
                            {list.slice(0, 3).map((e) => (
                              <li key={e.id}>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button type="button" className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-[11px] text-foreground transition-colors hover:bg-surface-2">
                                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", EVENT_STYLE[e.category].dot)} aria-hidden="true" />
                                      <span className="truncate">{e.title}</span>
                                    </button>
                                  </PopoverTrigger>
                                  {details(e)}
                                </Popover>
                              </li>
                            ))}
                            {list.length > 3 && (
                              <li>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCursor(date)
                                    setDay(d)
                                    setView("week")
                                  }}
                                  className="px-1 text-[11px] font-medium text-primary-text hover:underline"
                                >
                                  +{list.length - 3} more
                                </button>
                              </li>
                            )}
                          </ul>
                          {list.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden" aria-label={`${list.length} events`}>
                              {list.slice(0, 4).map((e) => (
                                <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", EVENT_STYLE[e.category].dot)} />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}

              {view === "agenda" &&
                (agendaDays.length === 0 ? (
                  <EmptyState icon={<CalendarClock aria-hidden="true" />} title="A quiet two weeks" description="Nothing is scheduled in this window." action={<Button onClick={() => setCreateOpen(true)}>New event</Button>} />
                ) : (
                  <div className="flex flex-col gap-4">
                    {agendaDays.map((d) => (
                      <section key={d} aria-label={dayLabel(d)}>
                        <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-foreground">
                          {dayLabel(d)}
                          <span className="text-caption font-normal text-muted-foreground">{toDate(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
                        </h3>
                        <Card className="divide-y divide-border overflow-hidden">
                          {onDate(d).map((e) => (
                            <Popover key={e.id}>
                              <PopoverTrigger asChild>
                                <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2">
                                  <span className="w-20 shrink-0 text-caption font-medium tabular-nums text-muted-foreground">{formatTime(e.startTime)}</span>
                                  <span className={cn("h-8 w-1 shrink-0 rounded-full", EVENT_STYLE[e.category].dot)} aria-hidden="true" />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-foreground">{e.title}</span>
                                    <span className="block truncate text-caption text-muted-foreground">
                                      {e.category}
                                      {e.location ? ` · ${e.location}` : ""}
                                    </span>
                                  </span>
                                  <Badge tone={EVENT_STYLE[e.category].tone} className="hidden sm:inline-flex">
                                    {e.startTime === e.endTime ? "Due" : formatTimeRange(e.startTime, e.endTime)}
                                  </Badge>
                                </button>
                              </PopoverTrigger>
                              {details(e)}
                            </Popover>
                          ))}
                        </Card>
                      </section>
                    ))}
                  </div>
                ))}
            </motion.div>
          </AnimatePresence>
        </StaggerItem>
      </Stagger>

      <NewEventDialog open={createOpen} onOpenChange={setCreateOpen} date={createDate} />
      <ScheduleSessionDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </div>
  )
}
