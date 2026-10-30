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

const PLATFORMS: LiveSessionItem["platform"][] = ["Quantum Classroom", "Zoom", "Google Meet"]

/** Create or reschedule a live class. New classes show up in Live classes and on the calendar. */
export default function ScheduleSessionDialog({ open, onOpenChange, defaultCourseId, session }: ScheduleSessionDialogProps) {
  const { courses, scheduleSession, updateSession, notify } = useTeacherData()
  const [title, setTitle] = useState("")
  const [courseId, setCourseId] = useState("")
  const [date, setDate] = useState(DEMO_DATE)
  const [start, setStart] = useState("16:00")
  const [end, setEnd] = useState("17:00")
  const [platform, setPlatform] = useState<LiveSessionItem["platform"]>("Quantum Classroom")
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
        classNotes: notes.trim() || undefined,
      })
      notify(`Rescheduled “${title.trim()}” to ${dayLabel(date).toLowerCase()}, ${formatTimeRange(start, end)}`)
    } else {
      const s = scheduleSession({ title: title.trim(), courseId, scheduledDate: date, startTime: start, endTime: end, platform, classNotes: notes.trim() || undefined })
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
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Starts">
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Ends" error={errors.time}>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-foreground">Platform</span>
            <SegmentedControl aria-label="Platform" options={PLATFORMS.map((p) => ({ value: p, label: p, icon: p === "Quantum Classroom" ? <Video className="h-3.5 w-3.5" aria-hidden="true" /> : undefined }))} value={platform} onChange={setPlatform} block />
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
