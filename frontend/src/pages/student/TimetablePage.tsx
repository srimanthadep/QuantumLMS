import { useState, useMemo } from "react"
import { Icon } from "../../components/Icon"
import type { TimetableSlot, EventItem, AnnouncementItem } from "./studentTypes"
import {
  timetableSchedule,
  campusEvents,
  schoolAnnouncements,
} from "./studentMockData"

interface TimetablePageProps {
  onToast: (msg: string) => void
  initialTab?: "timetable" | "events" | "announcements"
}

export function TimetablePage({
  onToast,
  initialTab = "timetable",
}: TimetablePageProps) {
  const [activeTab, setActiveTab] = useState<"timetable" | "events" | "announcements">(initialTab)

  // Timetable State
  const [selectedDay, setSelectedDay] =
    useState<"All" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday">(
      "All",
    )
  const [activeSlot, setActiveSlot] = useState<TimetableSlot | null>(null)

  const days: ("Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday")[] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ]

  const filteredSlots =
    selectedDay === "All"
      ? timetableSchedule
      : timetableSchedule.filter((s) => s.day === selectedDay)

  // Events State
  const [eventsFilter, setEventsFilter] =
    useState<"All" | "Hackathons" | "Guest Lectures" | "Workshops" | "Academic">(
      "All",
    )
  const [eventsList, setEventsList] = useState<EventItem[]>(campusEvents)

  const handleToggleRsvp = (id: string, title: string) => {
    setEventsList((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const next = !e.registered
          onToast(
            next
              ? `Registered for "${title}"! Calendar invite sent.`
              : `RSVP cancelled for "${title}".`,
          )
          return { ...e, registered: next }
        }
        return e
      }),
    )
  }

  const filteredEvents =
    eventsFilter === "All"
      ? eventsList
      : eventsList.filter((e) => e.category === eventsFilter)

  const featuredEvent = eventsList.find((e) => e.isFeatured)

  // Announcements State
  const [announcements, setAnnouncements] =
    useState<AnnouncementItem[]>(schoolAnnouncements)
  const [annFilter, setAnnFilter] =
    useState<"All" | "Urgent" | "Academic" | "Infrastructure" | "General">(
      "All",
    )
  const [annSearch, setAnnSearch] = useState("")
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    "ann-1": true,
    "ann-2": true,
  })

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const markAllRead = () => {
    setAnnouncements((prev) => prev.map((a) => ({ ...a, isRead: true })))
    onToast("All announcements marked as read!")
  }

  const filteredAnnouncements = useMemo(() => {
    let list = announcements
    if (annFilter !== "All") {
      list = announcements.filter((a) => a.category === annFilter)
    }
    if (!annSearch.trim()) return list
    const q = annSearch.toLowerCase()
    return list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q),
    )
  }, [announcements, annFilter, annSearch])

  return (
    <div className="app-card-stack flex flex-col gap-[var(--app-card-gap,14px)]">
      {/* Top Level Schedule Navigation Hub */}
      <section className="panel" aria-label="Schedule Controls">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title">Schedule & Campus Events</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                Fall Semester 2026
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Unified schedule for live classes, hackathons, and institutional bulletins.
            </p>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full border border-zinc-200/60 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => setActiveTab("timetable")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "timetable"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              Class Timetable
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("events")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "events"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              Campus Events ({eventsList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("announcements")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "announcements"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              Bulletins
            </button>
          </div>
        </div>
      </section>

      {/* VIEW 1: TIMETABLE */}
      {activeTab === "timetable" && (
        <>
          <section className="panel" aria-label="Day Filter Toolbar">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDay("All")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedDay === "All"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  All Days
                </button>
                {days.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDay(d)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      selectedDay === d
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const timetableText =
                    "===========================================================\n" +
                    "           QUANTUM SCHOOL OF AI - CLASS TIMETABLE          \n" +
                    "===========================================================\n" +
                    timetableSchedule
                      .map(
                        (s) =>
                          `[${s.day}] ${s.time} | ${s.courseCode}: ${s.courseName} | Instructor: ${s.instructor} | Room: ${s.room}`
                      )
                      .join("\n")
                  const blob = new Blob([timetableText], {
                    type: "text/plain;charset=utf-8;",
                  })
                  const link = document.createElement("a")
                  link.href = URL.createObjectURL(blob)
                  link.download = "Quantum_Fall_2026_Schedule.txt"
                  link.click()
                  onToast("Schedule exported successfully! 🗓️")
                }}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors shadow-2xs"
              >
                Export iCal / Text
              </button>
            </div>
          </section>

          {/* Timetable Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--app-card-gap,14px)]">
            {filteredSlots.map((slot) => (
              <div
                key={slot.id}
                onClick={() => setActiveSlot(slot)}
                className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs hover:border-purple-300 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                      {slot.day} · {slot.time}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400">
                      {slot.courseCode}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {slot.courseName}
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    Instructor: {slot.instructor}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-500 flex items-center gap-1">
                    📍 {slot.room}
                  </span>
                  <span
                    className={`font-semibold ${
                      slot.isOnline ? "text-emerald-600" : "text-blue-600"
                    }`}
                  >
                    {slot.isOnline ? "Virtual Classroom" : "On Campus"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* VIEW 2: CAMPUS EVENTS */}
      {activeTab === "events" && (
        <>
          {featuredEvent && (
            <div className="panel p-5 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl shadow-sm">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white tracking-wider uppercase">
                Featured Event
              </span>
              <h3 className="text-lg font-black mt-2">{featuredEvent.title}</h3>
              <p className="text-xs text-purple-100 mt-1 max-w-2xl">
                {featuredEvent.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs">
                <span>📅 {featuredEvent.date}</span>
                <span>⏰ {featuredEvent.time}</span>
                <span>📍 {featuredEvent.location}</span>
                <button
                  type="button"
                  onClick={() =>
                    handleToggleRsvp(featuredEvent.id, featuredEvent.title)
                  }
                  className={`ml-auto px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    featuredEvent.registered
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-purple-900 hover:bg-purple-50"
                  }`}
                >
                  {featuredEvent.registered ? "✓ Registered" : "RSVP Now"}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--app-card-gap,14px)]">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {evt.category}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      {evt.date}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {evt.title}
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                    {evt.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">📍 {evt.location}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleRsvp(evt.id, evt.title)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      evt.registered
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                  >
                    {evt.registered ? "✓ Registered" : "RSVP"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* VIEW 3: BULLETINS & ANNOUNCEMENTS */}
      {activeTab === "announcements" && (
        <div className="flex flex-col gap-3">
          <div className="panel p-3 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(["All", "Urgent", "Academic", "Infrastructure", "General"] as const).map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAnnFilter(c)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      annFilter === c
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {c}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-purple-600 font-medium hover:underline shrink-0"
            >
              Mark all as read
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {filteredAnnouncements.map((ann) => (
              <div
                key={ann.id}
                onClick={() => toggleExpand(ann.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  ann.isRead
                    ? "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800/80"
                    : "bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/50 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ann.category === "Urgent"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {ann.category}
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {ann.title}
                    </h4>
                  </div>
                  <span className="text-xs text-zinc-400">{ann.date}</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                  {expandedIds[ann.id] ? ann.content : ann.content.slice(0, 120) + "..."}
                </p>
                <div className="mt-2 text-[11px] text-zinc-400">
                  {ann.author} · {ann.department}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TimetablePage
