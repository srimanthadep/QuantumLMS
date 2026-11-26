import { useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CalendarClock, ChevronLeft, ChevronRight, Flag, Plus } from "lucide-react"
import { Badge, Button, Card, EmptyState, Popover, PopoverTrigger, SegmentedControl } from "@/components/ui"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import type { CalendarEventItem } from "@/types"
import { addDays, dayLabel, EVENT_STYLE, formatTime, formatTimeRange, isoDate, minutesOf, startOfWeek, toDate } from "@/pages/teacher/teacherUtils"

export type CalendarView = "week" | "month" | "agenda"
export type CalendarCategory = CalendarEventItem["category"]

const HOUR_PX = 56
const DEFAULT_DAY_START = 8
const DEFAULT_DAY_END = 18

/** Which view, week and filters a calendar shows. Held by the page so it can react to them (e.g. a "New event" button). */
export function useCalendarState(now: Date) {
  const [view, setView] = useState<CalendarView>("week")
  const [cursor, setCursor] = useState<Date>(now)
  const [day, setDay] = useState(isoDate(now))
  const [hidden, setHidden] = useState<Set<CalendarCategory>>(new Set())
  return { view, setView, cursor, setCursor, day, setDay, hidden, setHidden }
}
export type CalendarState = ReturnType<typeof useCalendarState>

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

interface CalendarBoardProps {
  state: CalendarState
  /** "Now", for the today highlight and the current-time line. */
  now: Date
  events: CalendarEventItem[]
  /** Event types offered as filters. */
  categories: CalendarCategory[]
  /** The popover body for an event (a PopoverContent). */
  renderDetails: (event: CalendarEventItem) => ReactNode
  /** Marks an event as happening right now. */
  isLive?: (event: CalendarEventItem) => boolean
  /** Makes the week's day headers add buttons. Leave out for a read-only calendar. */
  onAddOnDay?: (date: string) => void
  /** Shown in the empty agenda. */
  emptyAction?: ReactNode
}

/** Week, month and agenda views of one calendar, with type filters. Shared by the teacher and student portals. */
export default function CalendarBoard({ state, now, events, categories, renderDetails, isLive, onAddOnDay, emptyAction }: CalendarBoardProps) {
  const { view, setView, cursor, setCursor, day, setDay, hidden, setHidden } = state
  const today = isoDate(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const shown = useMemo(() => events.filter((e) => !hidden.has(e.category)), [events, hidden])
  const onDate = (date: string) => shown.filter((e) => e.startDate === date).sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime))

  const weekStart = startOfWeek(cursor)
  const weekDays = Array.from({ length: 7 }, (_, i) => isoDate(addDays(weekStart, i)))
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(monthStart)
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const agendaDays = Array.from({ length: 14 }, (_, i) => isoDate(addDays(cursor, i))).filter((d) => onDate(d).length > 0)

  // The day grid is 8am to 6pm, stretched when this week has earlier or later events (evening classes).
  const weekEvents = weekDays.flatMap(onDate)
  const dayStart = Math.max(0, Math.min(DEFAULT_DAY_START, ...weekEvents.map((e) => Math.floor(minutesOf(e.startTime) / 60))))
  const dayEnd = Math.min(24, Math.max(DEFAULT_DAY_END, ...weekEvents.map((e) => Math.ceil(Math.max(minutesOf(e.endTime), minutesOf(e.startTime) + 30) / 60))))

  const step = (dir: -1 | 1) => {
    if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1))
    else {
      const next = addDays(cursor, dir * 7)
      setCursor(next)
      setDay(isoDate(startOfWeek(next)))
    }
  }
  const goToday = () => {
    setCursor(now)
    setDay(today)
  }

  const label =
    view === "month"
      ? cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : view === "agenda"
        ? `Next two weeks from ${cursor.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
        : `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${addDays(weekStart, 6).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`

  const dayColumn = (date: string, idx: number) => {
    const list = onDate(date)
    const layout = layoutDay(list)
    const isToday = date === today
    return (
      <div key={date} className={cn("relative border-l border-border", isToday && "bg-primary-soft/40")} style={{ height: (dayEnd - dayStart) * HOUR_PX }}>
        {Array.from({ length: dayEnd - dayStart }, (_, h) => (
          <div key={h} className="absolute inset-x-0 border-t border-dashed border-border/70" style={{ top: h * HOUR_PX }} aria-hidden="true" />
        ))}
        {list.map((e, i) => {
          const s = Math.max(dayStart * 60, minutesOf(e.startTime))
          const end = Math.min(dayEnd * 60, Math.max(s + 30, minutesOf(e.endTime)))
          const pos = layout.get(e.id) ?? { col: 0, cols: 1 }
          const top = ((s - dayStart * 60) / 60) * HOUR_PX
          const height = Math.max(26, ((end - s) / 60) * HOUR_PX - 2)
          const deadline = e.startTime === e.endTime
          const live = Boolean(isLive?.(e))
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
              {renderDetails(e)}
            </Popover>
          )
        })}
        {isToday && nowMin >= dayStart * 60 && nowMin <= dayEnd * 60 && (
          <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: ((nowMin - dayStart * 60) / 60) * HOUR_PX }} aria-hidden="true">
            <span className="-ml-1 h-2 w-2 rounded-full bg-danger" />
            <span className="h-px flex-1 bg-danger" />
          </div>
        )}
      </div>
    )
  }

  const hourGutter = (
    <div className="relative" style={{ height: (dayEnd - dayStart) * HOUR_PX }} aria-hidden="true">
      {Array.from({ length: dayEnd - dayStart }, (_, h) => (
        <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-subtle-foreground" style={{ top: h * HOUR_PX }}>
          {h === 0 ? "" : formatTime(`${dayStart + h}:00`).replace(":00", "")}
        </span>
      ))}
    </div>
  )

  const openWeekOf = (date: Date) => {
    setCursor(date)
    setDay(isoDate(date))
    setView("week")
  }

  return (
    <>
      <div>
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
                { value: "week" as CalendarView, label: "Week" },
                { value: "month" as CalendarView, label: "Month" },
                { value: "agenda" as CalendarView, label: "Agenda" },
              ]}
              value={view}
              onChange={setView}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Show event types">
          {categories.map((c) => {
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
                {c === "Class" ? "Classes" : c === "Event" ? "Events" : c}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${view}-${view === "month" ? cursor.getMonth() : isoDate(weekStart)}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: transition.fast }} transition={transition.base}>
            {view === "week" && (
              <Card className="overflow-hidden">
                <div className="hidden md:block">
                  <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-border">
                    <span />
                    {weekDays.map((d) => {
                      const date = toDate(d)
                      const isToday = d === today
                      const header = (
                        <>
                          <span className={cn("block text-[11px] font-medium uppercase tracking-wider", isToday ? "text-primary-text" : "text-muted-foreground")}>
                            {date.toLocaleDateString("en-GB", { weekday: "short" })}
                          </span>
                          <span className="mt-0.5 flex items-center justify-between">
                            <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums", isToday ? "bg-primary text-primary-foreground" : "text-foreground")}>
                              {date.getDate()}
                            </span>
                            {onAddOnDay && <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />}
                          </span>
                        </>
                      )
                      return onAddOnDay ? (
                        <button
                          key={d}
                          type="button"
                          onClick={() => onAddOnDay(d)}
                          className="group border-l border-border px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
                          aria-label={`Add an event on ${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`}
                        >
                          {header}
                        </button>
                      ) : (
                        <div key={d} className="border-l border-border px-2 py-2.5 text-left">
                          {header}
                        </div>
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
                    const isToday = d === today
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
                            isToday ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground hover:bg-surface-2" : "text-subtle-foreground hover:bg-surface-2",
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
                                {renderDetails(e)}
                              </Popover>
                            </li>
                          ))}
                          {list.length > 3 && (
                            <li>
                              <button type="button" onClick={() => openWeekOf(date)} className="px-1 text-[11px] font-medium text-primary-text hover:underline">
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
                <EmptyState icon={<CalendarClock aria-hidden="true" />} title="A quiet two weeks" description="Nothing is scheduled in this window." action={emptyAction} />
              ) : (
                <div className="flex flex-col gap-4">
                  {agendaDays.map((d) => (
                    <section key={d} aria-label={dayLabel(d, now)}>
                      <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-foreground">
                        {dayLabel(d, now)}
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
                            {renderDetails(e)}
                          </Popover>
                        ))}
                      </Card>
                    </section>
                  ))}
                </div>
              ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}
