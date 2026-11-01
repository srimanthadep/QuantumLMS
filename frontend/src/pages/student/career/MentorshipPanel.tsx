import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CalendarCheck, CalendarPlus, CalendarX, Clock, Mail, MapPin, Phone, Send, Video } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"
import {
  Avatar,
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
  EmptyState,
  Field,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui"
import CopyButton from "@/components/student/CopyButton"
import type { MentorProfile } from "../studentTypes"
import { campusParts, campusTime, downloadTextFile, fromIsoDay } from "../studentUtils"
import { bookMeeting, cancelMeeting, requestMentor, toMentorProfile, withdrawMentorRequest, type CareerData, type MeetingRow } from "../data/career"

interface MentorshipPanelProps {
  data: CareerData
  /** The student's assigned mentor (profiles.mentor_id). */
  mentorId: string | null
  onChange: (fn: (d: CareerData) => CareerData) => void
  onToast: (msg: string) => void
}

const SLOTS = ["04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM"]
const TOPICS = ["Thesis advising", "Career guidance", "Project review", "Course doubts", "Internship applications"]
const AVAIL_TONE = { "Available Now": "success", "In Lecture": "warning", Away: "neutral" } as const

const slotMinutes = (slot: string) => {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(slot)
  return m ? ((Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + Number(m[2]) : 0
}

/** Start and end of a meeting as instants (slots are campus times). */
function meetingWindow(m: Pick<MeetingRow, "meeting_date" | "slot" | "ends_slot">) {
  const [y, mo, d] = m.meeting_date.split("-").map(Number)
  return { start: campusTime(y, mo - 1, d, slotMinutes(m.slot)), end: campusTime(y, mo - 1, d, slotMinutes(m.ends_slot)) }
}

/** The assigned mentor's next scheduled meeting that hasn't ended. */
export function upcomingMeeting(data: CareerData, mentorId: string | null, now = Date.now()): MeetingRow | undefined {
  const id = mentorId ?? data.mentors[0]?.id
  return data.meetings.find((m) => m.mentor_id === id && m.status === "Scheduled" && meetingWindow(m).end.getTime() > now)
}

/** The next n campus weekdays after today, as "YYYY-MM-DD". */
function nextWeekdays(n: number): string[] {
  const c = campusParts()
  const out: string[] = []
  for (let i = 1; out.length < n && i < 21; i++) {
    const d = new Date(Date.UTC(c.y, c.m, c.d + i))
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export default function MentorshipPanel({ data, mentorId, onChange, onToast }: MentorshipPanelProps) {
  const row = data.mentors.find((m) => m.id === mentorId) ?? data.mentors[0]
  const mentor = row ? toMentorProfile(row) : null
  const others = data.mentors.filter((m) => m.id !== row?.id).map(toMentorProfile)
  const meeting = upcomingMeeting(data, row?.id ?? null)
  const days = useMemo(() => nextWeekdays(6), [])
  const [booking, setBooking] = useState(false)
  const [day, setDay] = useState(0)
  const [slot, setSlot] = useState(SLOTS[2])
  const [topic, setTopic] = useState(TOPICS[0])
  const [agenda, setAgenda] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!mentor || !row) {
    return <EmptyState icon={<CalendarPlus aria-hidden="true" />} title="No mentor assigned yet" description="Academic Affairs assigns mentors at the start of term." />
  }

  const openBooking = () => {
    if (meeting) {
      const i = days.indexOf(meeting.meeting_date)
      setDay(i >= 0 ? i : 0)
      setSlot(SLOTS.includes(meeting.slot) ? meeting.slot : SLOTS[2])
      setTopic(TOPICS.includes(meeting.topic) ? meeting.topic : TOPICS[0])
      setAgenda(meeting.agenda ?? "")
    }
    setError(null)
    setBooking(true)
  }

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const saved = await bookMeeting(mentor.id, days[day], slot, topic, agenda)
      onChange((d) => ({ ...d, meetings: [...d.meetings.filter((m) => m.mentor_id !== saved.mentor_id), saved] }))
      setBooking(false)
      onToast(`Booked ${topic.toLowerCase()} with ${mentor.name}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const cancel = async () => {
    if (!meeting) return
    try {
      await cancelMeeting(mentor.id)
      onChange((d) => ({ ...d, meetings: d.meetings.map((m) => (m.id === meeting.id ? { ...m, status: "Cancelled" } : m)) }))
      onToast("Session cancelled")
    } catch (err) {
      onToast(`Couldn't cancel the session: ${(err as Error).message}`)
    }
  }

  const join = () => {
    if (!meeting) return
    const { start, end } = meetingWindow(meeting)
    const now = Date.now()
    if (meeting.zoom_url && now >= start.getTime() - 10 * 60_000 && now <= end.getTime()) window.open(meeting.zoom_url, "_blank", "noopener,noreferrer")
    else onToast(`The meeting link opens 10 minutes before the start, at ${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`)
  }

  const exportIcs = () => {
    if (!meeting) return
    const { start, end } = meetingWindow(meeting)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
    downloadTextFile(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Quantum School of AI//Mentoring//EN",
        "BEGIN:VEVENT",
        `UID:${meeting.id}@quantumschool.ai`,
        `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${meeting.topic} with ${mentor.name}`,
        `DESCRIPTION:${(meeting.agenda ?? "").replace(/\r?\n/g, " ")} ${meeting.zoom_url ?? ""}`.trim(),
        `LOCATION:${meeting.zoom_url ?? "Online"}`,
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n"),
      "Mentor_Meeting.ics",
      "text/calendar;charset=utf-8",
    )
    onToast("Meeting added. Import the .ics file into your calendar.")
  }

  const toggleRequest = async (m: MentorProfile) => {
    const on = !data.requested.includes(m.id)
    try {
      if (on) await requestMentor(m.id)
      else await withdrawMentorRequest(m.id)
      onChange((d) => ({ ...d, requested: on ? [...d.requested, m.id] : d.requested.filter((x) => x !== m.id) }))
      onToast(on ? `Request sent to ${m.name}` : `Request to ${m.name} withdrawn`)
    } catch (err) {
      onToast(`Couldn't update the request: ${(err as Error).message}`)
    }
  }

  const meetingDate = meeting ? fromIsoDay(meeting.meeting_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : ""

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardContent className="grid gap-5 pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar src={mentor.avatar} name={mentor.name} size="xl" status={mentor.availabilityStatus === "Available Now" ? "online" : "away"} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-h3 text-foreground">{mentor.name}</h3>
                <Badge tone={AVAIL_TONE[mentor.availabilityStatus]} dot>
                  {mentor.availabilityStatus}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{mentor.title}</p>
              <p className="text-caption text-subtle-foreground">{mentor.department}</p>
            </div>
            <Button leftIcon={<CalendarPlus aria-hidden="true" />} onClick={openBooking}>
              {meeting ? "Reschedule" : "Book a session"}
            </Button>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{mentor.bio}</p>
          <div className="flex flex-wrap gap-1.5">
            {mentor.specializations.map((s) => (
              <Badge key={s} tone="primary">
                {s}
              </Badge>
            ))}
          </div>
          <dl className="grid gap-3 rounded-lg border border-border bg-surface-2 p-4 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-caption text-muted-foreground">Office hours</dt>
                <dd className="text-foreground">{mentor.officeHours}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-caption text-muted-foreground">Office</dt>
                <dd className="text-foreground">{mentor.office}</dd>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <dd className="min-w-0 flex-1 truncate text-foreground">
                <a href={`mailto:${mentor.email}`} className="hover:underline">
                  {mentor.email}
                </a>
              </dd>
              <CopyButton text={mentor.email} size="icon-sm" onCopied={() => onToast("Email copied")} />
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <dd className="text-foreground">{mentor.phone}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={meeting ? `${meeting.meeting_date}-${meeting.slot}` : "none"} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={spring.soft}>
            <Card variant={meeting ? "glow" : "default"}>
              <CardHeader className="pb-3">
                <p className="text-caption font-medium uppercase tracking-wider text-primary-text">Next 1:1</p>
                <CardTitle className="text-lg">{meeting ? meeting.topic : "Nothing booked yet"}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {meeting ? (
                  <>
                    <p className="flex items-center gap-2 text-sm text-foreground">
                      <CalendarCheck className="h-4 w-4 text-primary-text" aria-hidden="true" />
                      {meetingDate}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      {meeting.slot} – {meeting.ends_slot} IST
                    </p>
                    {meeting.agenda && <p className="rounded-md bg-surface-2 px-3 py-2 text-sm leading-6 text-muted-foreground">{meeting.agenda}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <Button leftIcon={<Video aria-hidden="true" />} onClick={join}>
                        Join
                      </Button>
                      <Button variant="outline" onClick={exportIcs}>
                        Add to calendar
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" size="sm" onClick={openBooking}>
                        Reschedule
                      </Button>
                      <Button variant="ghost" size="sm" leftIcon={<CalendarX aria-hidden="true" />} onClick={() => void cancel()}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button leftIcon={<CalendarPlus aria-hidden="true" />} onClick={openBooking}>
                    Book a session
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {others.map((m) => (
          <SecondaryMentor key={m.id} mentor={m} requested={data.requested.includes(m.id)} onRequest={() => void toggleRequest(m)} />
        ))}
      </div>

      <Dialog open={booking} onOpenChange={(o) => !saving && setBooking(o)}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={confirm} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>
                {meeting ? "Reschedule" : "Book"} a session with {mentor.name}
              </DialogTitle>
              <DialogDescription>45-minute video call (times in IST). You'll get a reminder 15 minutes before.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <span className="text-sm font-medium text-foreground" id="book-day">
                Day
              </span>
              <div role="radiogroup" aria-labelledby="book-day" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {days.map((d, i) => {
                  const date = fromIsoDay(d)
                  return (
                    <ChoiceChip key={d} active={day === i} onClick={() => setDay(i)} group="day">
                      <span className="text-[10px] font-semibold uppercase tracking-wider">{date.toLocaleDateString("en-US", { weekday: "short" })}</span>
                      <span className="text-base font-semibold tabular-nums">{date.getDate()}</span>
                    </ChoiceChip>
                  )
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium text-foreground" id="book-time">
                Time
              </span>
              <div role="radiogroup" aria-labelledby="book-time" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {SLOTS.map((s) => (
                  <ChoiceChip key={s} active={slot === s} onClick={() => setSlot(s)} group="slot">
                    <span className="text-caption font-semibold tabular-nums">{s}</span>
                  </ChoiceChip>
                ))}
              </div>
            </div>
            <Field label="Topic">
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Agenda" hint="Optional. Helps your mentor prepare." error={error}>
              <Textarea value={agenda} maxLength={2000} onChange={(e) => setAgenda(e.target.value)} placeholder="What would you like to cover?" />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setBooking(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" leftIcon={<CalendarCheck aria-hidden="true" />} loading={saving}>
                Confirm booking
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChoiceChip({ active, onClick, group, children }: { active: boolean; onClick: () => void; group: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-md border px-2 py-2 transition-colors",
        active ? "border-primary text-foreground" : "border-border text-muted-foreground hover:border-border-strong/60 hover:text-foreground",
      )}
    >
      {active && <motion.span layoutId={`booking-${group}`} transition={spring.snappy} aria-hidden="true" className="absolute inset-0 rounded-md bg-primary-soft" />}
      <span className="relative flex flex-col items-center">{children}</span>
    </button>
  )
}

function SecondaryMentor({ mentor, requested, onRequest }: { mentor: MentorProfile; requested: boolean; onRequest: () => void }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Also available</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={mentor.avatar} name={mentor.name} size="lg" status={mentor.availabilityStatus === "Available Now" ? "online" : "away"} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{mentor.name}</p>
            <p className="truncate text-caption text-muted-foreground">{mentor.title}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {mentor.specializations.slice(0, 3).map((s) => (
            <Badge key={s} tone="neutral">
              {s}
            </Badge>
          ))}
        </div>
        <p className="text-caption text-muted-foreground">{mentor.officeHours}</p>
        <Button variant={requested ? "secondary" : "outline"} aria-pressed={requested} leftIcon={<Send aria-hidden="true" />} onClick={onRequest}>
          {requested ? "Request sent · withdraw" : "Request mentorship"}
        </Button>
      </CardContent>
    </Card>
  )
}

