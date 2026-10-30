import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CalendarCheck, CalendarPlus, Clock, Mail, MapPin, Phone, Send, Video } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
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
  Field,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui"
import CopyButton from "@/components/student/CopyButton"
import type { MentorMeetingInfo, MentorProfile } from "../studentTypes"
import { assignedMentorData, secondaryMentorData } from "../studentMockData"
import { downloadTextFile } from "../studentUtils"

interface MentorshipPanelProps {
  meeting: MentorMeetingInfo
  onMeetingChange: (m: MentorMeetingInfo) => void
  onToast: (msg: string) => void
}

const SLOTS = ["04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM"]
const TOPICS = ["Thesis advising", "Career guidance", "Project review", "Course doubts", "Internship applications"]
const AVAIL_TONE = { "Available Now": "success", "In Lecture": "warning", Away: "neutral" } as const

/** "05:30 PM" + 45 -> "06:15 PM". */
function addMinutes(slot: string, minutes: number): string {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(slot)
  if (!m) return slot
  const start = ((Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + Number(m[2])
  const end = (start + minutes) % (24 * 60)
  const h24 = Math.floor(end / 60)
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${String(h12).padStart(2, "0")}:${String(end % 60).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`
}

function nextWeekdays(n: number): Date[] {
  const out: Date[] = []
  const d = new Date()
  while (out.length < n) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(new Date(d))
  }
  return out
}

export default function MentorshipPanel({ meeting, onMeetingChange, onToast }: MentorshipPanelProps) {
  const mentor = assignedMentorData
  const days = useMemo(() => nextWeekdays(6), [])
  const [booking, setBooking] = useState(false)
  const [day, setDay] = useState(0)
  const [slot, setSlot] = useState(SLOTS[2])
  const [topic, setTopic] = useState(TOPICS[0])
  const [agenda, setAgenda] = useState("")
  const [requested, setRequested] = useState(false)

  const confirm = (e: React.FormEvent) => {
    e.preventDefault()
    const d = days[day]
    onMeetingChange({
      status: "Scheduled",
      scheduledDate: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      scheduledTime: `${slot} - ${addMinutes(slot, 45)}`,
      topic,
      agenda: agenda.trim() || undefined,
      zoomUrl: mentor.meeting?.zoomUrl,
    })
    setBooking(false)
    onToast(`Booked ${topic.toLowerCase()} with ${mentor.name}`)
  }

  const exportIcs = () => {
    downloadTextFile(
      ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", `SUMMARY:${meeting.topic ?? "Mentor meeting"} with ${mentor.name}`, `DESCRIPTION:${meeting.agenda ?? ""} ${meeting.zoomUrl ?? ""}`, `LOCATION:${meeting.zoomUrl ?? "Online"}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n"),
      "Mentor_Meeting.ics",
      "text/calendar;charset=utf-8",
    )
    onToast("Meeting added. Import the .ics file into your calendar.")
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardContent className="grid gap-5 pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar src={mentor.avatar} name={mentor.name} size="xl" status="online" />
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
            <Button leftIcon={<CalendarPlus aria-hidden="true" />} onClick={() => setBooking(true)}>
              Book a session
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
              <dd className="min-w-0 flex-1 truncate text-foreground">{mentor.email}</dd>
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
          <motion.div key={`${meeting.scheduledDate}-${meeting.scheduledTime}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={spring.soft}>
            <Card variant={meeting.status === "Scheduled" ? "glow" : "default"}>
              <CardHeader className="pb-3">
                <p className="text-caption font-medium uppercase tracking-wider text-primary-text">Next 1:1</p>
                <CardTitle className="text-lg">{meeting.status === "Scheduled" ? meeting.topic : "Nothing booked yet"}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {meeting.status === "Scheduled" ? (
                  <>
                    <p className="flex items-center gap-2 text-sm text-foreground">
                      <CalendarCheck className="h-4 w-4 text-primary-text" aria-hidden="true" />
                      {meeting.scheduledDate}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      {meeting.scheduledTime}
                    </p>
                    {meeting.agenda && <p className="rounded-md bg-surface-2 px-3 py-2 text-sm leading-6 text-muted-foreground">{meeting.agenda}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <Button leftIcon={<Video aria-hidden="true" />} onClick={() => onToast("The meeting link opens 10 minutes before the start time")}>
                        Join
                      </Button>
                      <Button variant="outline" onClick={exportIcs}>
                        Add to calendar
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setBooking(true)}>
                      Reschedule
                    </Button>
                  </>
                ) : (
                  <Button leftIcon={<CalendarPlus aria-hidden="true" />} onClick={() => setBooking(true)}>
                    Book a session
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <SecondaryMentor
          mentor={secondaryMentorData}
          requested={requested}
          onRequest={() => {
            setRequested(true)
            onToast(`Request sent to ${secondaryMentorData.name}`)
          }}
        />
      </div>

      <Dialog open={booking} onOpenChange={setBooking}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={confirm} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Book a session with {mentor.name}</DialogTitle>
              <DialogDescription>45-minute video call. You'll get a reminder 15 minutes before.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <span className="text-sm font-medium text-foreground" id="book-day">
                Day
              </span>
              <div role="radiogroup" aria-labelledby="book-day" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {days.map((d, i) => (
                  <ChoiceChip key={d.toISOString()} active={day === i} onClick={() => setDay(i)} group="day">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <span className="text-base font-semibold tabular-nums">{d.getDate()}</span>
                  </ChoiceChip>
                ))}
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
            <Field label="Agenda" hint="Optional. Helps your mentor prepare.">
              <Textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="What would you like to cover?" />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setBooking(false)}>
                Cancel
              </Button>
              <Button type="submit" leftIcon={<CalendarCheck aria-hidden="true" />}>
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
          <Avatar src={mentor.avatar} name={mentor.name} size="lg" status="away" />
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
        <Button variant={requested ? "secondary" : "outline"} disabled={requested} leftIcon={<Send aria-hidden="true" />} onClick={onRequest}>
          {requested ? "Request sent" : "Request mentorship"}
        </Button>
      </CardContent>
    </Card>
  )
}
