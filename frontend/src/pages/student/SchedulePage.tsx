import LeaveRequests from "@/components/live/LeaveRequests"
import LiveSessionsPanel from "@/components/live/LiveSessionsPanel"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BookOpenCheck, CalendarDays, CalendarPlus, Check, ChevronDown, Clock, MapPin, Megaphone, Mic2, Paperclip, Radio, Sparkles, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import { Badge, Button, Card, EmptyState, PageHeader, SegmentedControl, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"
import DateTile from "@/components/student/DateTile"
import StudentCalendar from "./StudentCalendar"
import type { AnnouncementItem, EventItem, StudentNavPage } from "./studentTypes"
import { downloadTextFile } from "./studentUtils"
import { useStudentResource } from "./data/StudentDataProvider"

import { loadCampusFeed, markAnnouncementsRead, setEventRegistration, type CampusFeed } from "./data/schedule"

export type ScheduleTab = "calendar" | "timetable" | "attendance" | "events" | "announcements"

interface SchedulePageProps {
  onToast: (msg: string) => void
  initialTab?: ScheduleTab
  onNavigate?: (page: StudentNavPage, courseId?: string) => void
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      size="sm"
      icon={<CalendarDays aria-hidden="true" />}
      title="This section didn't load"
      description={message}
      action={
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  )
}

function useCampusFeed() {
  return useStudentResource<CampusFeed>("campus", () => loadCampusFeed(), 120_000)
}

export default function SchedulePage({ onToast, initialTab = "calendar", onNavigate }: SchedulePageProps) {
  const [tab, setTab] = useState<ScheduleTab>(initialTab)
  const feed = useCampusFeed()
  const unread = feed.data?.announcements.filter((a) => !a.isRead).length ?? 0

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Your campus"
        title="Schedule"
        description="Classes, attendance, campus events and announcements in one place."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<Radio className="h-4 w-4 text-danger animate-pulse" />}
              onClick={() => {
                if (onNavigate) onNavigate("Live Class")
                else onToast("Opening Live Class…")
              }}
            >
              Enter Live Class
            </Button>

          </div>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as ScheduleTab)}>
        <TabsList aria-label="Schedule sections">
          <TabsTrigger value="calendar">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="timetable">
            <Clock className="h-4 w-4" aria-hidden="true" />
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
        <TabsContent value="calendar" className="mt-5">
          <StudentCalendar onNavigate={(page, courseId) => onNavigate?.(page, courseId)} onOpenTab={setTab} />
        </TabsContent>
        <TabsContent value="timetable" className="mt-5">
          <LiveSessionsPanel role="Student" />
        </TabsContent>
        <TabsContent value="attendance" className="mt-5">
          <LiveSessionsPanel role="Student" attendanceOnly /><LeaveRequests />
        </TabsContent>
        <TabsContent value="events" className="mt-5">
          <Events onToast={onToast} />
        </TabsContent>
        <TabsContent value="announcements" className="mt-5">
          {feed.error ? (
            <LoadError message={feed.error.message} onRetry={() => void feed.reload()} />
          ) : feed.data ? (
            <Announcements items={feed.data.announcements} onToast={onToast} />
          ) : (
            <SectionSkeleton />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="grid gap-3" role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
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
  const feed = useCampusFeed()
  const [category, setCategory] = useState<Category>("All")
  const now = Date.now()
  // Past events drop off once they end.
  const events = (feed.data?.events ?? []).filter((e) => Date.parse(e.endsAt ?? e.startsAt ?? "") >= now)
  const list = events.filter((e) => category === "All" || e.category === category)
  const featured = list.find((e) => e.isFeatured)
  const rest = list.filter((e) => e !== featured)
  const registered = new Set(events.filter((e) => e.registered).map((e) => e.id))

  const setRegistered = (id: string, on: boolean) =>
    feed.mutate((d) => ({ ...d, events: d.events.map((x) => (x.id === id ? { ...x, registered: on } : x)) }))
  const toggle = (e: EventItem) => {
    const on = !e.registered
    setRegistered(e.id, on)
    setEventRegistration(e.id, on)
      .then(() => onToast(on ? `You're registered for ${e.title}` : `Registration cancelled for ${e.title}`))
      .catch((err: Error) => {
        setRegistered(e.id, !on)
        onToast(`Couldn't update your registration: ${err.message}`)
      })
  }

  if (feed.error) return <LoadError message={feed.error.message} onRetry={() => void feed.reload()} />
  if (!feed.data) return <SectionSkeleton />

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

function Announcements({ items, onToast }: { items: AnnouncementItem[]; onToast: (m: string) => void }) {
  const feed = useCampusFeed()
  const [open, setOpen] = useState<string | null>(items.find((a) => !a.isRead)?.id ?? null)
  const unread = items.filter((a) => !a.isRead).length
  const setRead = (ids: string[], read: boolean) =>
    feed.mutate((d) => ({ ...d, announcements: d.announcements.map((a) => (ids.includes(a.id) ? { ...a, isRead: read } : a)) }))
  const markIds = (ids: string[], done?: string) => {
    setRead(ids, true)
    markAnnouncementsRead(ids)
      .then(() => done && onToast(done))
      .catch((e: Error) => {
        setRead(ids, false)
        onToast(`Couldn't update announcements: ${e.message}`)
      })
  }
  const markRead = (id: string) => markIds([id])
  const setItems = () => markIds(items.filter((a) => !a.isRead).map((a) => a.id), "All announcements marked as read")

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{unread ? `${unread} unread` : "You're all caught up"}</p>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Check aria-hidden="true" />}
          disabled={!unread}
          onClick={setItems}
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
