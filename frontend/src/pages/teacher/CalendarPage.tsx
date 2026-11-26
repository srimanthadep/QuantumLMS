import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarClock, CalendarPlus, Clock, MapPin, PlayCircle, Radio } from "lucide-react"
import { Badge, Button, PageHeader, PopoverContent } from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import CalendarBoard, { useCalendarState } from "@/components/calendar/CalendarBoard"
import ScheduleSessionDialog from "@/components/teacher/ScheduleSessionDialog"
import type { CalendarEventItem } from "@/types"
import { useTeacherData } from "./teacherStore"
import { dayLabel, EVENT_STYLE, formatTime, formatTimeRange, sessionAsEvent } from "./teacherUtils"

type Category = CalendarEventItem["category"]

/** Teachers don't see campus events here; those are on the student calendar. */
const TEACHER_CATEGORIES: Category[] = ["Class", "Office Hours", "Deadline", "Quiz", "Meeting", "Reminder"]

/** One school calendar: classes, office hours, deadlines and meetings, by week, month or as an agenda. */
export default function CalendarPage() {
  const navigate = useNavigate()
  const { events, sessions, recordings } = useTeacherData()
  // Ticks every minute so the today column and the current-time line keep up.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(tick)
  }, [])
  const state = useCalendarState(now)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const all = useMemo(() => [...events, ...sessions.filter((s) => s.status !== "Cancelled").map(sessionAsEvent)], [events, sessions])

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
              {dayLabel(e.startDate, now)}, {e.startTime === e.endTime ? `due ${formatTime(e.startTime)}` : formatTimeRange(e.startTime, e.endTime)}
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
          {!session && <span className="text-[11px] text-muted-foreground">From the school calendar</span>}
        </div>
      </PopoverContent>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        title="Calendar"
        description="Classes, office hours, deadlines and meetings in one place."
        actions={
          <Button variant="outline" leftIcon={<CalendarPlus aria-hidden="true" />} onClick={() => setScheduleOpen(true)}>
            Schedule class
          </Button>
        }
      />

      <Stagger className="flex flex-col gap-4" stagger={0.05}>
        <StaggerItem>
          <CalendarBoard
            state={state}
            now={now}
            events={all}
            categories={TEACHER_CATEGORIES}
            renderDetails={details}
            isLive={(e) => e.id.startsWith("session-") && sessions.find((x) => `session-${x.id}` === e.id)?.status === "Live Now"}
            emptyAction={<Button onClick={() => setScheduleOpen(true)}>Schedule class</Button>}
          />
        </StaggerItem>
      </Stagger>

      <ScheduleSessionDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </div>
  )
}
