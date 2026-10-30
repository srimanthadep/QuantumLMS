import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Bell,
  BellRing,
  BookOpenCheck,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  CircleCheck,
  Clock,
  Download,
  MapPin,
  Megaphone,
  Mic2,
  Monitor,
  Paperclip,
  PlayCircle,
  Radio,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
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
  EmptyState,
  Field,
  Input,
  PageHeader,
  Progress,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/ui"
import DonutChart from "@/components/charts/DonutChart"
import ProgressRing from "@/components/charts/ProgressRing"
import AnimatedNumber from "@/components/motion/AnimatedNumber"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import DateTile from "@/components/student/DateTile"
import type { AnnouncementItem, EventItem, TimetableSlot } from "./studentTypes"
import { attendanceData, campusEvents, schoolAnnouncements, timetableSchedule } from "./studentMockData"
import { downloadTextFile } from "./studentUtils"

export type ScheduleTab = "timetable" | "attendance" | "events" | "announcements"

interface SchedulePageProps {
  onToast: (msg: string) => void
  initialTab?: ScheduleTab
}

const DAYS: TimetableSlot["day"][] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const TODAY: TimetableSlot["day"] = timetableSchedule.find((s) => s.status === "Live Now")?.day ?? "Monday"

function parseTime(t: string): number {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(t)
  if (!m) return 0
  let h = Number(m[1]) % 12
  if (m[3].toUpperCase() === "PM") h += 12
  return h * 60 + Number(m[2])
}
const slotRange = (s: TimetableSlot) => {
  const [a, b] = s.time.split("-").map((x) => x.trim())
  return { start: a, end: b, minutes: parseTime(b) - parseTime(a) }
}

function toIcs(slots: TimetableSlot[]): string {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const fmt = (d: Date, minutes: number) => {
    const x = new Date(d)
    x.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
    return x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  }
  const events = slots.map((s) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + DAYS.indexOf(s.day))
    const [a, b] = s.time.split("-").map((x) => parseTime(x))
    return [
      "BEGIN:VEVENT",
      `UID:${s.id}@quantumschool.ai`,
      `DTSTAMP:${fmt(now, now.getHours() * 60 + now.getMinutes())}`,
      `DTSTART:${fmt(day, a)}`,
      `DTEND:${fmt(day, b)}`,
      "RRULE:FREQ=WEEKLY;COUNT=12",
      `SUMMARY:${s.courseCode} ${s.courseName}`,
      `LOCATION:${s.room}`,
      `DESCRIPTION:Instructor ${s.instructor}`,
      "END:VEVENT",
    ].join("\r\n")
  })
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Quantum School of AI//Timetable//EN", ...events, "END:VCALENDAR"].join("\r\n")
}

export default function SchedulePage({ onToast, initialTab = "timetable" }: SchedulePageProps) {
  const [tab, setTab] = useState<ScheduleTab>(initialTab)
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(schoolAnnouncements)
  const unread = announcements.filter((a) => !a.isRead).length

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Fall semester 2026"
        title="Schedule"
        description="Classes, attendance, campus events and announcements in one place."
        actions={
          <Button
            variant="outline"
            leftIcon={<Download aria-hidden="true" />}
            onClick={() => {
              downloadTextFile(toIcs(timetableSchedule), "Quantum_Timetable_Fall_2026.ics", "text/calendar;charset=utf-8")
              onToast("Timetable exported. Import the .ics file into your calendar.")
            }}
          >
            Export to calendar
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as ScheduleTab)}>
        <TabsList aria-label="Schedule sections">
          <TabsTrigger value="timetable">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Timetable
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="events">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Events
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <Megaphone className="h-4 w-4" aria-hidden="true" />
            Announcements
            {unread > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">
                {unread}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="timetable" className="mt-5">
          <Timetable onToast={onToast} />
        </TabsContent>
        <TabsContent value="attendance" className="mt-5">
          <Attendance onToast={onToast} />
        </TabsContent>
        <TabsContent value="events" className="mt-5">
          <Events onToast={onToast} />
        </TabsContent>
        <TabsContent value="announcements" className="mt-5">
          <Announcements items={announcements} setItems={setAnnouncements} onToast={onToast} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ------------------------------- Timetable ------------------------------- */

function Timetable({ onToast }: { onToast: (m: string) => void }) {
  const [day, setDay] = useState<TimetableSlot["day"]>(TODAY)
  const [reminders, setReminders] = useState<Set<string>>(new Set())
  const slots = timetableSchedule.filter((s) => s.day === day)
  const live = timetableSchedule.find((s) => s.status === "Live Now")
  const upNext = live ?? timetableSchedule.find((s) => s.status === "Upcoming")

  const week = useMemo(() => {
    const online = timetableSchedule.filter((s) => s.isOnline).length
    const minutes = timetableSchedule.reduce((sum, s) => sum + slotRange(s).minutes, 0)
    return { online, campus: timetableSchedule.length - online, hours: Math.round(minutes / 6) / 10 }
  }, [])

  const toggleReminder = (s: TimetableSlot) =>
    setReminders((r) => {
      const n = new Set(r)
      if (n.has(s.id)) n.delete(s.id)
      else {
        n.add(s.id)
        onToast(`Reminder set for ${s.courseName}, 15 minutes before it starts`)
      }
      return n
    })

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div role="radiogroup" aria-label="Day" className="grid grid-cols-5 gap-2">
          {DAYS.map((d) => {
            const active = d === day
            const count = timetableSchedule.filter((s) => s.day === d).length
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDay(d)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-lg border px-2 py-3 text-center transition-colors",
                  active ? "border-primary-border text-foreground" : "border-border bg-surface text-muted-foreground hover:border-border-strong/60 hover:text-foreground",
                )}
              >
                {active && <motion.span layoutId="timetable-day" transition={spring.snappy} aria-hidden="true" className="absolute inset-0 rounded-lg bg-primary-soft" />}
                <span className="relative text-sm font-semibold">
                  <span className="sm:hidden">{d.slice(0, 3)}</span>
                  <span className="hidden sm:inline">{d}</span>
                </span>
                <span className="relative text-caption tabular-nums">
                  {count} class{count === 1 ? "" : "es"}
                </span>
                {d === TODAY && (
                  <span className="relative mt-1 rounded-full bg-primary px-1.5 text-[9px] font-semibold uppercase tracking-wider text-primary-foreground">Today</span>
                )}
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.ol
            key={day}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: transition.fast }}
            transition={transition.base}
            className="relative flex flex-col gap-3"
            aria-label={`${day} classes`}
          >
            {slots.length === 0 && <EmptyState size="sm" icon={<CalendarDays aria-hidden="true" />} title="No classes" description="Enjoy the free day." />}
            {slots.map((s, i) => {
              const r = slotRange(s)
              const isLive = s.status === "Live Now"
              const isDone = s.status === "Completed"
              const reminded = reminders.has(s.id)
              return (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...transition.base, delay: i * 0.05 }}
                  className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 sm:grid-cols-[84px_minmax(0,1fr)]"
                >
                  <div className="pt-4 text-right">
                    <p className={cn("text-sm font-semibold tabular-nums", isDone ? "text-subtle-foreground" : "text-foreground")}>{r.start}</p>
                    <p className="text-caption tabular-nums text-subtle-foreground">{r.minutes} min</p>
                  </div>
                  <div
                    className={cn(
                      "flex flex-col gap-3 rounded-lg border p-4 transition-[border-color,box-shadow] duration-200 sm:flex-row sm:items-center",
                      isLive ? "border-danger/30 bg-danger-soft shadow-[0_0_0_1px_color-mix(in_srgb,var(--danger)_20%,transparent)]" : "border-border bg-surface hover:border-border-strong/60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral" className="font-mono">
                          {s.courseCode}
                        </Badge>
                        {isLive ? (
                          <Badge tone="live" dot>
                            Live now
                          </Badge>
                        ) : isDone ? (
                          <Badge tone="success">
                            <CircleCheck className="h-3 w-3" aria-hidden="true" /> Completed
                          </Badge>
                        ) : (
                          <Badge tone="info">Upcoming</Badge>
                        )}
                        <Badge tone="neutral">
                          {s.isOnline ? <Monitor className="h-3 w-3" aria-hidden="true" /> : <MapPin className="h-3 w-3" aria-hidden="true" />}
                          {s.isOnline ? "Online" : "On campus"}
                        </Badge>
                      </div>
                      <p className={cn("mt-2 text-[15px] font-semibold", isDone ? "text-muted-foreground" : "text-foreground")}>{s.courseName}</p>
                      <p className="mt-0.5 text-caption text-muted-foreground">
                        {s.instructor} · {s.room} · {r.start} – {r.end}
                      </p>
                    </div>
                    {isLive ? (
                      <Button leftIcon={<Radio aria-hidden="true" />} onClick={() => onToast(`Joining ${s.courseName}…`)}>
                        Join now
                      </Button>
                    ) : isDone ? (
                      <Button variant="ghost" size="sm" leftIcon={<PlayCircle aria-hidden="true" />} onClick={() => onToast(`Opening the recording of ${s.courseName}`)}>
                        Recording
                      </Button>
                    ) : (
                      <motion.div whileTap={{ scale: 0.95 }} transition={spring.snappy}>
                        <Button
                          variant={reminded ? "secondary" : "outline"}
                          size="sm"
                          aria-pressed={reminded}
                          onClick={() => toggleReminder(s)}
                          leftIcon={
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={reminded ? "on" : "off"}
                                initial={{ rotate: -30, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 30, opacity: 0 }}
                                transition={transition.fast}
                                className="flex"
                              >
                                {reminded ? <BellRing className="text-primary-text" aria-hidden="true" /> : <Bell aria-hidden="true" />}
                              </motion.span>
                            </AnimatePresence>
                          }
                        >
                          {reminded ? "Reminder set" : "Remind me"}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </motion.ol>
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-4">
        {upNext && (
          <Card variant={upNext.status === "Live Now" ? "glow" : "default"}>
            <CardHeader className="pb-3">
              <p className="text-caption font-medium uppercase tracking-wider text-primary-text">{upNext.status === "Live Now" ? "Happening now" : "Up next"}</p>
              <CardTitle className="text-lg">{upNext.courseName}</CardTitle>
              <p className="text-caption text-muted-foreground">
                {upNext.day} · {upNext.time}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" aria-hidden="true" /> {upNext.room}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" aria-hidden="true" /> {upNext.instructor}
              </div>
              {upNext.status === "Live Now" && (
                <Button block leftIcon={<Radio aria-hidden="true" />} onClick={() => onToast(`Joining ${upNext.courseName}…`)}>
                  Join live class
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>This week</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              size={120}
              thickness={14}
              data={[
                { label: "On campus", value: week.campus, color: "var(--primary)" },
                { label: "Online", value: week.online, color: "var(--secondary)" },
              ]}
              center={
                <>
                  <span className="text-xl font-semibold tabular-nums text-foreground">{timetableSchedule.length}</span>
                  <span className="text-[10px] uppercase tracking-wider text-subtle-foreground">classes</span>
                </>
              }
              formatValue={(v) => String(v)}
            />
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" aria-hidden="true" /> Contact hours
              </span>
              <AnimatedNumber value={week.hours} decimals={1} suffix=" h" className="font-semibold text-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------- Attendance ------------------------------ */

function Attendance({ onToast }: { onToast: (m: string) => void }) {
  const a = attendanceData
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [course, setCourse] = useState(a.subjects[0]?.code ?? "")
  const [date, setDate] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const submitLeave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || reason.trim().length < 10) {
      setError(!date ? "Pick the date you'll be away." : "Add a short reason (10+ characters).")
      return
    }
    setLeaveOpen(false)
    setDate("")
    setReason("")
    setError(null)
    onToast("Leave request sent to Academic Affairs")
  }

  const stats = [
    { label: "Attended", value: a.attendedClasses, icon: CircleCheck, tile: "bg-success-soft text-success ring-success/20" },
    { label: "Late", value: a.lateClasses, icon: Clock, tile: "bg-warning-soft text-warning ring-warning/20" },
    { label: "Absent", value: a.absentClasses, icon: BookOpenCheck, tile: "bg-danger-soft text-danger ring-danger/20" },
  ]

  return (
    <Stagger className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <StaggerItem>
        <Card className="h-full">
          <CardContent className="flex flex-col items-center gap-5 pt-6 text-center">
            <ProgressRing value={a.overallPercentage} size={148} thickness={12} tone="success" label="Overall attendance">
              <div>
                <AnimatedNumber value={a.overallPercentage} decimals={1} suffix="%" className="block text-3xl font-semibold text-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-subtle-foreground">Overall</span>
              </div>
            </ProgressRing>
            <div>
              <p className="text-sm font-semibold text-foreground">Good standing</p>
              <p className="text-caption text-muted-foreground">
                {a.attendedClasses} of {a.totalClasses} classes · minimum required 75%
              </p>
            </div>
            <div className="grid w-full grid-cols-3 gap-2">
              {stats.map((s) => (
                <div key={s.label} className="rounded-md border border-border bg-surface-2 p-3">
                  <span className={cn("mx-auto flex h-7 w-7 items-center justify-center rounded-md ring-1 ring-inset", s.tile)}>
                    <s.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <AnimatedNumber value={s.value} className="mt-2 block text-lg font-semibold text-foreground" />
                  <span className="text-caption text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" block leftIcon={<CalendarPlus aria-hidden="true" />} onClick={() => setLeaveOpen(true)}>
              Request leave
            </Button>
          </CardContent>
        </Card>
      </StaggerItem>
      <StaggerItem>
        <Card className="h-full">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>By subject</CardTitle>
            <span className="text-caption text-muted-foreground">Threshold 75%</span>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {a.subjects.map((s) => {
              const tone = s.percentage >= 90 ? "success" : s.percentage >= 75 ? "warning" : "danger"
              return (
                <div key={s.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                      <p className="text-caption text-muted-foreground">
                        <span className="font-mono">{s.code}</span> · {s.attended}/{s.totalClasses} classes
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={s.status === "Good Standing" ? "success" : "warning"}>{s.status}</Badge>
                      <span className="w-14 text-right text-sm font-semibold tabular-nums text-foreground">{s.percentage}%</span>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress value={s.percentage} tone={tone} size="sm" label={`${s.name} attendance`} />
                    <span aria-hidden="true" className="absolute -top-1 bottom-[-4px] w-px bg-border-strong" style={{ left: "75%" }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </StaggerItem>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <form onSubmit={submitLeave} className="grid gap-4" noValidate>
            <DialogHeader>
              <DialogTitle>Request leave</DialogTitle>
              <DialogDescription>Approved leave is marked as an excused absence.</DialogDescription>
            </DialogHeader>
            <Field label="Course">
              <Select value={course} onValueChange={setCourse}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {a.subjects.map((s) => (
                    <SelectItem key={s.id} value={s.code}>
                      {s.code} · {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date" required>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Reason" required error={error}>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Medical appointment, conference travel…" />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setLeaveOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Send request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Stagger>
  )
}

/* --------------------------------- Events -------------------------------- */

const CATEGORIES = ["All", "Hackathons", "Guest Lectures", "Workshops", "Academic"] as const
type Category = (typeof CATEGORIES)[number]
const CATEGORY_ICON: Record<EventItem["category"], typeof Sparkles> = {
  Hackathons: Sparkles,
  "Guest Lectures": Mic2,
  Workshops: BookOpenCheck,
  Academic: CalendarDays,
}

function Events({ onToast }: { onToast: (m: string) => void }) {
  const [category, setCategory] = useState<Category>("All")
  const [registered, setRegistered] = useState<Set<string>>(() => new Set(campusEvents.filter((e) => e.registered).map((e) => e.id)))
  const list = campusEvents.filter((e) => category === "All" || e.category === category)
  const featured = list.find((e) => e.isFeatured)
  const rest = list.filter((e) => e !== featured)

  const toggle = (e: EventItem) =>
    setRegistered((r) => {
      const n = new Set(r)
      if (n.has(e.id)) {
        n.delete(e.id)
        onToast(`Registration cancelled for ${e.title}`)
      } else {
        n.add(e.id)
        onToast(`You're registered for ${e.title}`)
      }
      return n
    })

  return (
    <div className="flex flex-col gap-4">
      <div className="no-scrollbar overflow-x-auto">
        <SegmentedControl size="sm" aria-label="Event category" options={CATEGORIES.map((c) => ({ value: c, label: c }))} value={category} onChange={setCategory} />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: transition.fast }}
          transition={transition.base}
          className="flex flex-col gap-4"
        >
          {featured && (
            <Card variant="glow" className="overflow-hidden">
              <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
                <DateTile month={featured.month} day={featured.day} tone="accent" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="primary">Featured</Badge>
                    <Badge tone="neutral">{featured.category}</Badge>
                  </div>
                  <h3 className="mt-2 text-h3 text-foreground">{featured.title}</h3>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{featured.description}</p>
                  <EventMeta e={featured} />
                </div>
                <RegisterButton active={registered.has(featured.id)} onClick={() => toggle(featured)} size="md" />
              </div>
            </Card>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rest.map((e, i) => {
              const Icon = CATEGORY_ICON[e.category]
              return (
                <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...transition.base, delay: i * 0.05 }}>
                  <Card className="flex h-full flex-col p-5 transition-[border-color,box-shadow] duration-200 hover:border-border-strong/60 hover:shadow-[var(--elev-md)]">
                    <div className="flex items-start gap-4">
                      <DateTile month={e.month} day={e.day} />
                      <div className="min-w-0 flex-1">
                        <Badge tone="neutral">
                          <Icon className="h-3 w-3" aria-hidden="true" />
                          {e.category}
                        </Badge>
                        <h3 className="mt-2 text-[15px] font-semibold leading-6 text-foreground">{e.title}</h3>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>
                    <EventMeta e={e} />
                    <div className="mt-auto flex justify-end pt-4">
                      <RegisterButton active={registered.has(e.id)} onClick={() => toggle(e)} />
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
          {list.length === 0 && <EmptyState size="sm" icon={<Sparkles aria-hidden="true" />} title="No events in this category" description="Check back soon." />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function EventMeta({ e }: { e: EventItem }) {
  return (
    <ul className="mt-3 flex flex-col gap-1.5 text-caption text-muted-foreground">
      <li className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {e.date} · {e.time}
      </li>
      <li className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {e.location}
      </li>
      {e.speaker && (
        <li className="flex items-center gap-2">
          <Mic2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {e.speaker}
        </li>
      )}
    </ul>
  )
}

function RegisterButton({ active, onClick, size = "sm" }: { active: boolean; onClick: () => void; size?: "sm" | "md" }) {
  return (
    <Button
      variant={active ? "secondary" : "primary"}
      size={size}
      aria-pressed={active}
      onClick={onClick}
      className="min-w-[124px]"
      leftIcon={
        <AnimatePresence mode="wait" initial={false}>
          {active ? (
            <motion.span key="on" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={spring.snappy} className="flex">
              <Check className="text-success" aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span key="off" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={spring.snappy} className="flex">
              <CalendarPlus aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
      }
    >
      {active ? "Registered" : "Register"}
    </Button>
  )
}

/* ------------------------------ Announcements ---------------------------- */

const ANN_TONE: Record<AnnouncementItem["category"], "danger" | "info" | "warning" | "neutral"> = {
  Urgent: "danger",
  Academic: "info",
  Infrastructure: "warning",
  General: "neutral",
}

function Announcements({
  items,
  setItems,
  onToast,
}: {
  items: AnnouncementItem[]
  setItems: React.Dispatch<React.SetStateAction<AnnouncementItem[]>>
  onToast: (m: string) => void
}) {
  const [open, setOpen] = useState<string | null>(items.find((a) => !a.isRead)?.id ?? null)
  const unread = items.filter((a) => !a.isRead).length
  const markRead = (id: string) => setItems((list) => list.map((a) => (a.id === id ? { ...a, isRead: true } : a)))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{unread ? `${unread} unread` : "You're all caught up"}</p>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Check aria-hidden="true" />}
          disabled={!unread}
          onClick={() => {
            setItems((list) => list.map((a) => ({ ...a, isRead: true })))
            onToast("All announcements marked as read")
          }}
        >
          Mark all as read
        </Button>
      </div>
      <motion.ul layout className="overflow-hidden rounded-lg border border-border bg-surface">
        {items.map((a) => {
          const isOpen = open === a.id
          return (
            <motion.li layout="position" key={a.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  setOpen(isOpen ? null : a.id)
                  if (!a.isRead) markRead(a.id)
                }}
                className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-2"
              >
                <span className="mt-2 flex h-2 w-2 shrink-0 items-center justify-center" aria-hidden="true">
                  <AnimatePresence>
                    {!a.isRead && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring.snappy} className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </AnimatePresence>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={ANN_TONE[a.category]}>{a.category}</Badge>
                    <span className="text-caption text-subtle-foreground">{a.timestamp}</span>
                    {!a.isRead && <span className="sr-only">Unread</span>}
                  </span>
                  <span className={cn("mt-1.5 block text-sm", a.isRead ? "font-medium text-foreground" : "font-semibold text-foreground")}>{a.title}</span>
                  <span className="mt-0.5 block text-caption text-muted-foreground">
                    {a.author} · {a.department}
                  </span>
                </span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={transition.base} className="mt-1 flex text-muted-foreground">
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    layout="position"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: transition.fast }}
                    transition={transition.base}
                    className="px-4 pb-4 pl-9"
                  >
                    <p className="text-sm leading-6 text-muted-foreground">{a.content}</p>
                    {a.attachmentName && (
                      <button
                        type="button"
                        onClick={() => {
                          downloadTextFile(`${a.title}\n\n${a.content}\n\n- ${a.author}, ${a.department}`, a.attachmentName!.replace(/\.pdf$/i, ".txt"))
                          onToast(`Downloaded ${a.attachmentName}`)
                        }}
                        className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-foreground transition-colors hover:border-primary-border"
                      >
                        <Paperclip className="h-4 w-4 text-primary-text" aria-hidden="true" />
                        {a.attachmentName}
                        <span className="text-caption text-muted-foreground">{a.attachmentSize}</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          )
        })}
      </motion.ul>
    </div>
  )
}
