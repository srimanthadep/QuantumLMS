import { useMemo } from "react"
import { CalendarClock, Clock, MapPin } from "lucide-react"
import { Badge, Button, EmptyState, PopoverContent, Skeleton } from "@/components/ui"
import CalendarBoard, { useCalendarState } from "@/components/calendar/CalendarBoard"
import type { CalendarEventItem } from "@/types"
import { dayLabel, EVENT_STYLE, formatTime, formatTimeRange, isoDate } from "@/pages/teacher/teacherUtils"
import { useStudentData, useStudentResource } from "./data/StudentDataProvider"
import { loadCampusFeed, loadTimetable, type CampusFeed, type SlotRow } from "./data/schedule"
import type { StudentNavPage } from "./studentTypes"

const STUDENT_CATEGORIES: CalendarEventItem["category"][] = ["Class", "Deadline", "Quiz", "Event"]
const pad = (n: number) => String(n).padStart(2, "0")
const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const PROVIDER: Record<string, string> = { zoom_link: "Zoom", meet_link: "Google Meet" }

/**
 * A class on this student's own day and clock, like the deadlines, events and the current-time line on the same grid.
 * The batch timezone is in the details.
 */
function classEvent(r: SlotRow): CalendarEventItem {
  const start = new Date(r.starts_at)
  const end = new Date(r.ends_at)
  const startDate = isoDate(start)
  return {
    id: `class-${r.id}`,
    title: r.title,
    description: `${r.batch_name} · ${r.teacher_name ?? "Teacher pending"}`,
    startDate,
    startTime: clock(start),
    endTime: isoDate(end) !== startDate ? "23:59" : clock(end),
    category: "Class",
    courseId: r.course_id,
    courseName: r.batch_name,
    location: `${PROVIDER[r.provider] ?? "Online"} · ${r.timezone}`,
    status: r.status === "Ended" ? "Completed" : "Scheduled",
    isReadOnly: true,
  }
}

/** A due time, as a single point on the day it falls on for this student. */
function dueEvent(id: string, title: string, dueAt: string, category: "Deadline" | "Quiz", extra: Partial<CalendarEventItem>): CalendarEventItem {
  const due = new Date(dueAt)
  return { id, title, startDate: isoDate(due), startTime: clock(due), endTime: clock(due), category, isReadOnly: true, ...extra }
}

interface StudentCalendarProps {
  onNavigate: (page: StudentNavPage, courseId?: string) => void
  /** Switches to another Schedule tab. */
  onOpenTab: (tab: "timetable" | "events") => void
}

/** Classes, assignment and quiz deadlines and campus events in one calendar, by week, month or as an agenda. */
export default function StudentCalendar({ onNavigate, onOpenTab }: StudentCalendarProps) {
  const { view, now: nowMs } = useStudentData()
  const timetable = useStudentResource<SlotRow[]>("timetable", loadTimetable, 15_000)
  const feed = useStudentResource<CampusFeed>("campus", () => loadCampusFeed(), 120_000)
  const now = useMemo(() => new Date(nowMs), [nowMs])
  const state = useCalendarState(now)

  const { events, rows, campus } = useMemo(() => {
    const rows = new Map((timetable.data ?? []).filter((r) => r.status !== "Cancelled").map((r) => [`class-${r.id}`, r]))
    const classes = [...rows.values()].map(classEvent)

    const assignments = view.assignments
      .filter((a) => a.dueAt)
      .map((a) =>
        dueEvent(`assignment-${a.id}`, a.title, a.dueAt!, "Deadline", {
          courseId: a.courseId,
          courseName: a.course,
          description: `Assignment · ${a.maxMarks} marks`,
          status: a.status === "Pending" ? "Pending" : "Completed",
        }),
      )
    const quizzes = view.quizzes
      .filter((q) => q.dueAt)
      .map((q) =>
        dueEvent(`quiz-${q.id}`, q.title, q.dueAt!, "Quiz", {
          courseId: q.courseId,
          courseName: q.course,
          description: `${q.questionCount} questions · ${q.durationMinutes} min · pass at ${q.passingPct}%`,
          status: q.status === "Completed" || q.status === "Closed" ? "Completed" : "Scheduled",
        }),
      )

    const campus = new Map((feed.data?.events ?? []).map((e) => [`event-${e.id}`, e]))
    const campusEvents: CalendarEventItem[] = (feed.data?.events ?? []).flatMap((e) => {
      if (!e.startsAt) return []
      const start = new Date(e.startsAt)
      const end = e.endsAt ? new Date(e.endsAt) : null
      const sameDay = end && isoDate(end) === isoDate(start)
      const startTime = clock(start)
      // One block on the first day. A multi-day event gets an hour there; its date range is in the details.
      const endTime = sameDay && clock(end) > startTime ? clock(end) : clock(new Date(Math.min(start.getTime() + 3_600_000, new Date(start).setHours(23, 59, 0, 0))))
      return [
        {
          id: `event-${e.id}`,
          title: e.title,
          description: e.description,
          startDate: isoDate(start),
          startTime,
          endTime: endTime > startTime ? endTime : startTime,
          category: "Event" as const,
          location: e.location,
          status: end && end.getTime() < nowMs ? ("Completed" as const) : ("Scheduled" as const),
          isReadOnly: true,
        },
      ]
    })
    return { events: [...classes, ...assignments, ...quizzes, ...campusEvents], rows, campus }
  }, [timetable.data, feed.data, view.assignments, view.quizzes, nowMs])

  const details = (e: CalendarEventItem) => {
    const style = EVENT_STYLE[e.category]
    const session = rows.get(e.id)
    const campusEvent = campus.get(e.id)
    const live = session?.status === "Live"
    const due = e.startTime === e.endTime
    return (
      <PopoverContent align="start" className="w-80">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={live ? "live" : style.tone} dot>
            {live ? "Live now" : e.category === "Deadline" ? "Assignment due" : e.category === "Quiz" ? "Quiz closes" : e.category === "Event" ? (campusEvent?.category ?? "Event") : e.category}
          </Badge>
          {e.status === "Completed" && <Badge tone="neutral">{e.category === "Class" || e.category === "Event" ? "Done" : "Finished"}</Badge>}
          {campusEvent?.registered && <Badge tone="success">Registered</Badge>}
        </div>
        <p className="mt-2 text-sm font-semibold text-foreground">{e.title}</p>
        <dl className="mt-3 space-y-1.5 text-caption text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <dd>
              {dayLabel(e.startDate, now)}, {due ? `due ${formatTime(e.startTime)}` : formatTimeRange(e.startTime, e.endTime)}
            </dd>
          </div>
          {campusEvent && (
            <div className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <dd className="truncate">{campusEvent.date}</dd>
            </div>
          )}
          {e.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <dd className="truncate">{e.location}</dd>
            </div>
          )}
          {e.courseName && e.category !== "Class" && (
            <div className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <dd className="truncate">{e.courseName}</dd>
            </div>
          )}
        </dl>
        {e.description && <p className="mt-3 line-clamp-4 text-caption leading-5 text-foreground">{e.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {e.category === "Class" && (
            <Button size="sm" variant={live ? "primary" : "secondary"} onClick={() => onOpenTab("timetable")}>
              {live ? "Join from timetable" : "Open in timetable"}
            </Button>
          )}
          {e.category === "Deadline" && (
            <Button size="sm" variant="secondary" onClick={() => onNavigate("Assignments")}>
              Open assignments
            </Button>
          )}
          {e.category === "Quiz" && (
            <Button size="sm" variant="secondary" onClick={() => onNavigate("Quizzes")}>
              Open quizzes
            </Button>
          )}
          {e.category === "Event" && (
            <Button size="sm" variant="secondary" onClick={() => onOpenTab("events")}>
              {campusEvent?.registered ? "View event" : "View and register"}
            </Button>
          )}
        </div>
      </PopoverContent>
    )
  }

  const loading = !timetable.data && !feed.data && !timetable.error && !feed.error
  if (loading) {
    return (
      <div className="grid gap-3" role="status" aria-label="Loading calendar">
        <Skeleton className="h-10" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (!timetable.data && !feed.data && timetable.error) {
    return (
      <EmptyState
        size="sm"
        icon={<CalendarClock aria-hidden="true" />}
        title="The calendar didn't load"
        description={timetable.error.message}
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void timetable.reload()
              void feed.reload()
            }}
          >
            Try again
          </Button>
        }
      />
    )
  }

  return (
    <CalendarBoard
      state={state}
      now={now}
      events={events}
      categories={STUDENT_CATEGORIES}
      renderDetails={details}
      isLive={(e) => rows.get(e.id)?.status === "Live"}
      emptyAction={
        <Button variant="secondary" onClick={() => onOpenTab("timetable")}>
          Open timetable
        </Button>
      }
    />
  )
}
