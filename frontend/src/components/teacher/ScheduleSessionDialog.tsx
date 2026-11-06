import { useEffect, useState } from "react"
import { CalendarPlus, Video } from "lucide-react"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  DatePicker,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui"
import type { LiveSessionItem } from "@/types"
import { useTeacherData } from "@/pages/teacher/teacherStore"
import { DEMO_DATE, dayLabel, formatTimeRange, minutesOf } from "@/pages/teacher/teacherUtils"

interface ScheduleSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Prefill the course (e.g. from a course workspace). */
  defaultCourseId?: string
  /** Edit an existing session instead of creating one. */
  session?: LiveSessionItem | null
}

const PLATFORM_OPTIONS: { value: LiveSessionItem["platform"]; label: string; icon: React.ReactNode }[] = [
  {
    value: "Quantum Classroom",
    label: "Quantum Classroom",
    icon: <Video className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />,
  },
  {
    value: "Zoom",
    label: "Zoom",
    icon: (
      <svg className="h-4 w-4 text-[#2D8CFF] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M4.5 7.5A2.5 2.5 0 0 1 7 5h7a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5H7a2.5 2.5 0 0 1-2.5-2.5v-9zm12.75 2.41 3.42-2.28A1 1 0 0 1 22 8.46v7.08a1 1 0 0 1-1.33.83l-3.42-2.28V9.91z" />
      </svg>
    ),
  },
  {
    value: "Google Meet",
    label: "Google Meet",
    icon: (
      <svg className="h-4 w-4 text-[#00AC47] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
      </svg>
    ),
  },
]

/** Create or reschedule a live class. New classes show up in Live classes and on the calendar. */
export default function ScheduleSessionDialog({ open, onOpenChange, defaultCourseId, session }: ScheduleSessionDialogProps) {
  const { courses, scheduleSession, updateSession, notify } = useTeacherData()
  const [title, setTitle] = useState("")
  const [courseId, setCourseId] = useState("")
  const [date, setDate] = useState(DEMO_DATE)
  const [start, setStart] = useState("16:00")
  const [end, setEnd] = useState("17:00")
  const [platform, setPlatform] = useState<LiveSessionItem["platform"]>("Quantum Classroom")
  const [meetingUrl, setMeetingUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<{ title?: string; time?: string }>({})

  useEffect(() => {
    if (!open) return
    setTitle(session?.title ?? "")
    setCourseId(session?.courseId ?? defaultCourseId ?? courses[0]?.id ?? "")
    setDate(session?.scheduledDate ?? DEMO_DATE)
    setStart(session?.startTime ?? "16:00")
    setEnd(session?.endTime ?? "17:00")
    setPlatform(session?.platform ?? "Quantum Classroom")
    setMeetingUrl(session?.platform !== "Quantum Classroom" ? session?.meetingUrl ?? "" : "")
    setNotes(session?.classNotes ?? "")
    setErrors({})
  }, [open, session, defaultCourseId, courses])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = {
      title: title.trim().length < 4 ? "Give the class a title of at least 4 characters." : undefined,
      time: minutesOf(end) <= minutesOf(start) ? "The class must end after it starts." : undefined,
    }
    setErrors(next)
    if (next.title || next.time) return
    if (session) {
      updateSession(session.id, {
        title: title.trim(),
        courseId,
        scheduledDate: date,
        startTime: start,
        endTime: end,
        durationMinutes: minutesOf(end) - minutesOf(start),
        platform,
        meetingUrl:
          platform === "Quantum Classroom"
            ? `https://classroom.quantumschool.ai/live/${session.id}`
            : meetingUrl.trim() || undefined,
        classNotes: notes.trim() || undefined,
      })
      notify(`Rescheduled “${title.trim()}” to ${dayLabel(date).toLowerCase()}, ${formatTimeRange(start, end)}`)
    } else {
      const s = scheduleSession({
        title: title.trim(),
        courseId,
        scheduledDate: date,
        startTime: start,
        endTime: end,
        platform,
        meetingUrl: platform !== "Quantum Classroom" ? meetingUrl.trim() || undefined : undefined,
        classNotes: notes.trim() || undefined,
      })
      notify(`Scheduled “${s.title}” for ${dayLabel(date).toLowerCase()}, ${formatTimeRange(start, end)}`)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{session ? "Reschedule class" : "Schedule a live class"}</DialogTitle>
            <DialogDescription>Learners in the course get a calendar invite and a reminder 15 minutes before.</DialogDescription>
          </DialogHeader>
          <Field label="Title" required error={errors.title}>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Decision trees: pruning and depth" />
          </Field>
          <Field label="Course">
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date">
              <DatePicker value={date} onChange={setDate} />
            </Field>
            <Field label="Starts">
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Ends" error={errors.time}>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>

          {/* Platform Selector */}
          <div className="grid gap-2">
            <span className="text-sm font-medium text-foreground">Platform</span>
            <SegmentedControl
              aria-label="Platform"
              size="lg"
              options={PLATFORM_OPTIONS}
              value={platform}
              onChange={setPlatform}
              block
            />
            {platform !== "Quantum Classroom" && (
              <Field label={platform === "Zoom" ? "Zoom Meeting Link" : "Google Meet Link"} hint="Learners will receive this invite link in their timetable">
                <Input
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder={platform === "Zoom" ? "https://zoom.us/j/1234567890" : "https://meet.google.com/abc-defg-hij"}
                />
              </Field>
            )}
          </div>

          <Field label="Notes for learners" hint="Optional. Shown on the class card and in the invite.">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What to prepare, links to open before class…" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" leftIcon={<CalendarPlus aria-hidden="true" />}>
              {session ? "Save changes" : "Schedule class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
