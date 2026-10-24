import { useState, useMemo, useEffect } from "react"
import type { CalendarEventItem, CourseItem } from "../types"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"
import { initialCalendarEvents } from "../data/mockData"

type CalendarViewMode = "month" | "week" | "day" | "agenda"

// Date helpers
function formatDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function CalendarHeader({
  searchQuery,
  setSearchQuery,
  onOpenAiModal,
  hexColor,
  onChangeHexColor,
  onOpenCreateReminder,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenAiModal?: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenCreateReminder: () => void
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>Calendar</span>
        </div>
        <div className="subtitle">
          Academic schedule, lectures, assignment deadlines, and personal reminders
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, courses, or rooms..."
            aria-label="Search calendar events"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1 cursor-pointer"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <HexColorField hexColor={hexColor} onChangeHex={onChangeHexColor} />
        <button
          onClick={onOpenCreateReminder}
          className="h-9 px-3.5 rounded-full btn-primary text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          aria-label="Add personal reminder"
        >
          <span>+ Add Reminder</span>
        </button>
        {onOpenAiModal && (
          <button
            className="ask-ai"
            onClick={onOpenAiModal}
            aria-label="Ask AI assistant about schedule"
          >
            <span>✦</span>
            Ask AI
          </button>
        )}
      </div>
    </header>
  )
}

function EventDetailsModal({
  isOpen,
  onClose,
  event,
  onDeleteEvent,
}: {
  isOpen: boolean
  onClose: () => void
  event: CalendarEventItem | null
  onDeleteEvent?: (id: string) => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.body.style.overflow = "auto"
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !event) return null

  const getCategoryBadgeClass = (category: CalendarEventItem["category"]) => {
    switch (category) {
      case "Class":
        return "bg-purple-100 text-purple-900 border-purple-200"
      case "Deadline":
        return "bg-rose-100 text-rose-900 border-rose-200"
      case "Quiz":
        return "bg-amber-100 text-amber-900 border-amber-200"
      case "Meeting":
        return "bg-lime-100 text-lime-900 border-lime-200"
      case "Office Hours":
        return "bg-teal-100 text-teal-900 border-teal-200"
      case "Reminder":
        return "bg-indigo-100 text-indigo-900 border-indigo-200"
      default:
        return "bg-gray-100 text-zinc-800 border-gray-200"
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Event details: ${event.title}`}
    >
      <div
        className="modal-content"
        style={{ maxWidth: "560px", padding: "24px 26px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${getCategoryBadgeClass(
                event.category
              )}`}
            >
              {event.category}
            </span>
            {event.isReadOnly ? (
              <span className="text-[10px] font-semibold text-zinc-400 bg-gray-100 px-2 py-0.5 rounded-full">
                Admin Managed · Read Only
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                Personal Reminder
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer font-bold text-sm"
            aria-label="Close event details"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug">
            {event.title}
          </h3>

          <div className="mt-3 p-3.5 rounded-xl bg-gray-50 border border-gray-150 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-zinc-700">
              <Icon name="calendar" size={14} />
              <span>
                <strong>Date:</strong> {event.startDate}
              </span>
              <span>·</span>
              <span>
                <strong>Time:</strong> {event.startTime} – {event.endTime}
              </span>
            </div>

            {event.courseName && (
              <div className="flex items-center gap-2 text-zinc-700">
                <Icon name="book" size={14} />
                <span>
                  <strong>Course:</strong> {event.courseName}
                </span>
              </div>
            )}

            {event.location && (
              <div className="flex items-center gap-2 text-zinc-700">
                <Icon name="compass" size={14} />
                <span>
                  <strong>Location:</strong> {event.location}
                </span>
              </div>
            )}
          </div>

          {event.description && (
            <div className="mt-3.5">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Description & Notes
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed bg-white p-3 rounded-xl border border-gray-150">
                {event.description}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2.5 mt-5 pt-3 border-t border-gray-100">
          {!event.isReadOnly && onDeleteEvent ? (
            <button
              type="button"
              onClick={() => {
                onDeleteEvent(event.id)
                onClose()
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
            >
              Delete Reminder
            </button>
          ) : (
            <span className="text-[11px] text-zinc-400">
              Official school timetable event
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 h-9 rounded-xl btn-primary text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateReminderModal({
  isOpen,
  onClose,
  courses,
  onSaveReminder,
  defaultDate,
}: {
  isOpen: boolean
  onClose: () => void
  courses: CourseItem[]
  onSaveReminder: (newEvent: Omit<CalendarEventItem, "id" | "isReadOnly">) => void
  defaultDate: string
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState("10:00")
  const [endTime, setEndTime] = useState("11:00")
  const [category, setCategory] = useState<CalendarEventItem["category"]>("Reminder")
  const [courseName, setCourseName] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle("")
      setDescription("")
      setStartDate(defaultDate)
      setStartTime("10:00")
      setEndTime("11:00")
      setCategory("Reminder")
      setCourseName("")
      setErrorMessage(null)
    }
  }, [isOpen, defaultDate])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalTitle = title.trim() || "Academic Reminder"
    const finalDate = startDate || defaultDate || "2026-10-22"
    const finalStart = startTime || "10:00"
    let finalEnd = endTime || "11:00"
    if (finalEnd <= finalStart) {
      const [h, m] = finalStart.split(":").map(Number)
      finalEnd = `${String(((h || 10) + 1) % 24).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`
    }

    onSaveReminder({
      title: finalTitle,
      description: description.trim(),
      startDate: finalDate,
      startTime: finalStart,
      endTime: finalEnd,
      category,
      courseName: courseName || undefined,
      location: "Personal Schedule / Teacher Desk",
      status: "Scheduled",
    })
    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create personal reminder or calendar event"
    >
      <div
        className="modal-content"
        style={{ maxWidth: "520px", padding: "24px 26px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-zinc-900">
            Create Personal Reminder / Event
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer font-bold text-sm"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-1.5">
              <span>⚠</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Prepare Lab Samples, Office Hours..."
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-300 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CalendarEventItem["category"])}
                className="form-select-standard"
              >
                <option value="Reminder">Personal Reminder</option>
                <option value="Office Hours">Office Hours</option>
                <option value="Meeting">Meeting / Sync</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Optional Course Association
              </label>
              <select
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="form-select-standard"
              >
                <option value="">None / General</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-gray-200 focus:border-purple-400 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-gray-200 focus:border-purple-400 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-gray-200 focus:border-purple-400 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add optional notes, agenda, or materials to prepare..."
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:border-purple-400 outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-9 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 h-9 rounded-xl btn-primary text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Save Reminder
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CalendarPage({
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  courses,
  onToast,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenAiModal?: () => void
  courses: CourseItem[]
  onToast?: (msg: string) => void
}) {
  // Calendar Events State with localStorage persistence
  const [events, setEvents] = useState<CalendarEventItem[]>(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_calendar_v2") || localStorage.getItem("quantum_teacher_calendar_events")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length >= 10 && parsed[0]?.title) {
          return parsed
        }
      }
    } catch {
      // ignore
    }
    try {
      localStorage.setItem("quantum_teacher_calendar_v2", JSON.stringify(initialCalendarEvents))
      localStorage.removeItem("quantum_teacher_calendar_events")
    } catch {
      // ignore
    }
    return initialCalendarEvents
  })

  // Calendar View Mode: month | week | day | agenda
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month")

  // Current anchor date (defaults to Oct 22, 2026 to match academic term)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 9, 22))

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [selectedCourse, setSelectedCourse] = useState<string>("All")

  // Modals State
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Save events helper
  const saveEvents = (updated: CalendarEventItem[]) => {
    setEvents(updated)
    try {
      localStorage.setItem("quantum_teacher_calendar_v2", JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  const handleCreateReminder = (newEvent: Omit<CalendarEventItem, "id" | "isReadOnly">) => {
    const item: CalendarEventItem = {
      ...newEvent,
      id: `ev-custom-${Date.now()}`,
      isReadOnly: false,
    }
    const updated = [item, ...events]
    saveEvents(updated)
    onToast?.(`Reminder "${item.title}" added to your calendar!`)
  }

  const handleDeleteEvent = (id: string) => {
    const updated = events.filter((e) => e.id !== id)
    saveEvents(updated)
    onToast?.("Personal reminder removed.")
  }

  // Navigation handlers
  const handleToday = () => {
    setCurrentDate(new Date(2026, 9, 22))
  }

  const handlePrev = () => {
    const next = new Date(currentDate)
    if (viewMode === "month") {
      next.setMonth(next.getMonth() - 1)
    } else if (viewMode === "week") {
      next.setDate(next.getDate() - 7)
    } else {
      next.setDate(next.getDate() - 1)
    }
    setCurrentDate(next)
  }

  const handleNext = () => {
    const next = new Date(currentDate)
    if (viewMode === "month") {
      next.setMonth(next.getMonth() + 1)
    } else if (viewMode === "week") {
      next.setDate(next.getDate() + 7)
    } else {
      next.setDate(next.getDate() + 1)
    }
    setCurrentDate(next)
  }

  // Format header title dynamically
  const headerDateTitle = useMemo(() => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    const year = currentDate.getFullYear()
    const month = months[currentDate.getMonth()]

    if (viewMode === "month") {
      return `${month} ${year}`
    }
    if (viewMode === "day") {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      return `${days[currentDate.getDay()]}, ${month} ${currentDate.getDate()}, ${year}`
    }
    if (viewMode === "week") {
      const curr = new Date(currentDate)
      const first = curr.getDate() - curr.getDay()
      const start = new Date(curr.setDate(first))
      const end = new Date(curr.setDate(first + 6))
      return `${months[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${months[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${year}`
    }
    return `Academic Agenda · ${month} ${year}`
  }, [currentDate, viewMode])

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return events.filter((e) => {
      if (selectedCategory !== "All" && e.category !== selectedCategory) return false
      if (selectedCourse !== "All" && e.courseName !== selectedCourse) return false
      if (!q) return true
      return (
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.courseName && e.courseName.toLowerCase().includes(q)) ||
        (e.location && e.location.toLowerCase().includes(q))
      )
    })
  }, [events, searchQuery, selectedCategory, selectedCourse])

  // Events map for quick day lookup: YYYY-MM-DD -> CalendarEventItem[]
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>()
    for (const ev of filteredEvents) {
      const list = map.get(ev.startDate) || []
      list.push(ev)
      map.set(ev.startDate, list)
    }
    return map
  }, [filteredEvents])

  // Upcoming events list (next 5 chronological)
  const upcomingEvents = useMemo(() => {
    return [...filteredEvents]
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime))
      .slice(0, 5)
  }, [filteredEvents])

  const getEventBadgeClass = (category: CalendarEventItem["category"]) => {
    switch (category) {
      case "Class":
        return "bg-purple-100 text-purple-900 border-purple-200"
      case "Deadline":
        return "bg-rose-100 text-rose-900 border-rose-200"
      case "Quiz":
        return "bg-amber-100 text-amber-900 border-amber-200"
      case "Meeting":
        return "bg-lime-100 text-lime-900 border-lime-200"
      case "Office Hours":
        return "bg-teal-100 text-teal-900 border-teal-200"
      case "Reminder":
        return "bg-indigo-100 text-indigo-900 border-indigo-200"
      default:
        return "bg-gray-100 text-zinc-800 border-gray-200"
    }
  }

  const handleOpenEvent = (ev: CalendarEventItem) => {
    setSelectedEvent(ev)
    setIsDetailsModalOpen(true)
  }

  const handleSelectDateAndJump = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number)
    setCurrentDate(new Date(y, m - 1, d))
  }

  // Month Grid Calculation
  const monthGridDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const totalDays = getDaysInMonth(year, month)
    const firstDayIndex = getFirstDayOfWeek(year, month)

    const prevMonthDays = getDaysInMonth(year, month - 1)
    const cells = []

    // Leading days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i
      const prevDate = new Date(year, month - 1, dayNum)
      cells.push({
        dateStr: formatDateString(prevDate),
        dayNum,
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const thisDate = new Date(year, month, d)
      cells.push({
        dateStr: formatDateString(thisDate),
        dayNum: d,
        isCurrentMonth: true,
      })
    }

    // Trailing days to fill 35 or 42 cells
    const remaining = (7 - (cells.length % 7)) % 7
    for (let t = 1; t <= remaining; t++) {
      const nextDate = new Date(year, month + 1, t)
      cells.push({
        dateStr: formatDateString(nextDate),
        dayNum: t,
        isCurrentMonth: false,
      })
    }

    return cells
  }, [currentDate])

  // Week Grid Calculation
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate)
    const first = curr.getDate() - curr.getDay()
    const days = []
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for (let i = 0; i < 7; i++) {
      const d = new Date(curr.getFullYear(), curr.getMonth(), first + i)
      days.push({
        dayName: dayNames[i],
        dayNum: d.getDate(),
        dateStr: formatDateString(d),
      })
    }
    return days
  }, [currentDate])

  const todayStr = "2026-10-22"

  return (
    <>
      <CalendarHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAiModal={onOpenAiModal}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
        onOpenCreateReminder={() => setIsCreateModalOpen(true)}
      />

      {/* Main Calendar Panel */}
      <div className="panel p-4 sm:p-5" aria-label="Academic Calendar Workspace">
        {/* Google Calendar Style Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-gray-150">
          {/* Navigation Controls: Today, Prev, Next, Month Heading */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleToday}
              className="px-3.5 h-8 rounded-lg border border-gray-300 text-xs font-bold text-zinc-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Return to today"
            >
              Today
            </button>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={handlePrev}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-zinc-700 transition-colors cursor-pointer"
                aria-label="Previous time period"
              >
                <Icon name="chevron-left" size={16} />
              </button>
              <button
                onClick={handleNext}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-zinc-700 transition-colors cursor-pointer border-l border-gray-200"
                aria-label="Next time period"
              >
                <Icon name="chevron-right" size={16} />
              </button>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 pl-1.5">
              {headerDateTitle}
            </h3>
          </div>

          {/* View Switcher: Month, Week, Day, Agenda */}
          <div className="flex items-center gap-2.5 flex-wrap justify-between lg:justify-end">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="roster-select"
              aria-label="Filter events by category"
            >
              <option value="All">All Categories</option>
              <option value="Class">Classes & Labs</option>
              <option value="Deadline">Deadlines</option>
              <option value="Quiz">Quizzes & Exams</option>
              <option value="Meeting">Meetings</option>
              <option value="Office Hours">Office Hours</option>
              <option value="Reminder">Personal Reminders</option>
            </select>

            {/* Course Filter */}
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="roster-select"
              aria-label="Filter events by course"
            >
              <option value="All">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.code}
                </option>
              ))}
            </select>

            {/* View Selector Buttons */}
            <div className="inline-flex items-center p-1 rounded-xl bg-gray-100 border border-gray-200" role="group">
              {(["month", "week", "day", "agenda"] as CalendarViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${viewMode === mode
                      ? "bg-white text-purple-700 shadow-xs border border-gray-200"
                      : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  aria-pressed={viewMode === mode}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Body: Dynamic Views */}
        <div className="mt-4">
          {/* VIEW 1: MONTH VIEW */}
          {viewMode === "month" && (
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: "720px" }}>
                {/* Weekday Headings */}
                <div className="grid grid-cols-7 border-b border-gray-200 text-center text-xs font-bold text-zinc-500 pb-2">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 auto-rows-fr border-l border-t border-gray-200 bg-white">
                  {monthGridDays.map((cell) => {
                    const dayEvents = eventsByDate.get(cell.dateStr) || []
                    const isToday = cell.dateStr === todayStr
                    return (
                      <div
                        key={cell.dateStr}
                        onClick={() => {
                          handleSelectDateAndJump(cell.dateStr)
                        }}
                        className={`min-h-[96px] sm:min-h-[110px] p-1.5 border-r border-b border-gray-200 transition-colors flex flex-col justify-between ${cell.isCurrentMonth ? "bg-white" : "bg-gray-50/60 text-zinc-400"
                          } hover:bg-purple-50/20 cursor-pointer`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${isToday
                                ? "bg-purple-600 text-white shadow-xs"
                                : cell.isCurrentMonth
                                  ? "text-zinc-800"
                                  : "text-zinc-400"
                              }`}
                          >
                            {cell.dayNum}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-[10px] font-semibold text-zinc-400">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>

                        {/* Events list for this day */}
                        <div className="space-y-1 mt-1 flex-1">
                          {dayEvents.slice(0, 2).map((ev) => (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenEvent(ev)
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10.5px] font-medium border truncate transition-opacity hover:opacity-80 cursor-pointer ${getEventBadgeClass(
                                ev.category
                              )}`}
                              title={`${ev.startTime} ${ev.title}`}
                            >
                              <strong className="mr-1">{ev.startTime}</strong>
                              <span>{ev.title}</span>
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectDateAndJump(cell.dateStr)
                                setViewMode("day")
                              }}
                              className="text-[10px] font-bold text-purple-700 hover:underline px-1 cursor-pointer"
                            >
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: WEEK VIEW */}
          {viewMode === "week" && (
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: "760px" }}>
                {/* 7 Day Headers */}
                <div className="grid grid-cols-7 border-b border-gray-200 pb-2 text-center">
                  {weekDays.map((d) => {
                    const isToday = d.dateStr === todayStr
                    return (
                      <div
                        key={d.dateStr}
                        onClick={() => {
                          handleSelectDateAndJump(d.dateStr)
                        }}
                        className="cursor-pointer"
                      >
                        <span className="block text-[11px] font-bold text-zinc-400 uppercase">
                          {d.dayName}
                        </span>
                        <span
                          className={`inline-block mt-0.5 text-sm font-bold w-7 h-7 rounded-full leading-7 ${isToday ? "bg-purple-600 text-white" : "text-zinc-800"
                            }`}
                        >
                          {d.dayNum}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* 7 Columns Container */}
                <div className="grid grid-cols-7 border-l border-gray-200 min-h-[380px] bg-white">
                  {weekDays.map((d) => {
                    const dayEvents = eventsByDate.get(d.dateStr) || []
                    return (
                      <div
                        key={d.dateStr}
                        className="p-2 border-r border-b border-gray-200 space-y-2 bg-gray-50/20 hover:bg-purple-50/20 transition-colors"
                      >
                        {dayEvents.length === 0 ? (
                          <div className="text-[10px] text-zinc-300 text-center pt-8">
                            No events
                          </div>
                        ) : (
                          dayEvents.map((ev) => (
                            <div
                              key={ev.id}
                              onClick={() => handleOpenEvent(ev)}
                              className={`p-2 rounded-xl text-xs border cursor-pointer hover:shadow-xs transition-all ${getEventBadgeClass(
                                ev.category
                              )}`}
                            >
                              <div className="text-[10px] font-bold opacity-80">
                                {ev.startTime} – {ev.endTime}
                              </div>
                              <strong className="block font-bold text-zinc-900 mt-0.5 leading-snug line-clamp-2">
                                {ev.title}
                              </strong>
                              {ev.courseName && (
                                <span className="text-[10px] block opacity-75 truncate mt-0.5">
                                  {ev.courseName}
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: DAY VIEW */}
          {viewMode === "day" && (
            <div className="max-w-2xl mx-auto space-y-3">
              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 flex items-center justify-between">
                <div>
                  <strong className="text-sm font-bold text-purple-950">
                    Schedule for {formatDateString(currentDate)}
                  </strong>
                  <span className="block text-xs text-purple-700">
                    {(eventsByDate.get(formatDateString(currentDate)) || []).length} scheduled events
                  </span>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3 h-8 rounded-lg btn-primary text-xs font-bold cursor-pointer"
                >
                  + Add Event
                </button>
              </div>

              {(eventsByDate.get(formatDateString(currentDate)) || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 bg-gray-50 rounded-xl border border-gray-200">
                  No scheduled academic sessions or reminders for this date.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(eventsByDate.get(formatDateString(currentDate)) || []).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => handleOpenEvent(ev)}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:shadow-xs transition-all ${getEventBadgeClass(
                        ev.category
                      )}`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider">
                            {ev.category}
                          </span>
                          <span className="text-zinc-400">·</span>
                          <span className="text-xs font-semibold">
                            {ev.startTime} – {ev.endTime}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-900 leading-snug">
                          {ev.title}
                        </h4>
                        {ev.description && (
                          <p className="text-xs text-zinc-600 line-clamp-1">
                            {ev.description}
                          </p>
                        )}
                        {ev.location && (
                          <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                            <span>📍</span>
                            <span>{ev.location}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="view-details-btn self-end sm:self-center shrink-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEvent(ev)
                        }}
                      >
                        <span>View Details →</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: AGENDA VIEW */}
          {viewMode === "agenda" && (
            <div className="max-w-3xl mx-auto space-y-4">
              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 bg-gray-50 rounded-xl border border-gray-200">
                  No events match your search or filter criteria.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => handleOpenEvent(ev)}
                      className="p-3.5 sm:p-4 rounded-xl bg-gray-50 hover:bg-purple-50/40 border border-gray-200 hover:border-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-14 sm:w-16 text-center shrink-0 py-1 rounded-lg bg-white border border-gray-200">
                          <span className="block text-[10px] font-bold text-zinc-400 uppercase">
                            {new Date(ev.startDate).toLocaleDateString("en-US", { month: "short" })}
                          </span>
                          <span className="block text-base font-bold text-zinc-800">
                            {new Date(ev.startDate).getDate()}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${getEventBadgeClass(
                                ev.category
                              )}`}
                            >
                              {ev.category}
                            </span>
                            <span className="text-[11px] font-semibold text-zinc-600">
                              {ev.startTime} – {ev.endTime}
                            </span>
                            {ev.courseName && (
                              <span className="text-[11px] text-purple-700 font-medium truncate">
                                · {ev.courseName}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-purple-700 transition-colors leading-snug">
                            {ev.title}
                          </h4>
                          {ev.location && (
                            <span className="text-[11px] text-zinc-500 block mt-0.5 truncate">
                              📍 {ev.location}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="view-details-btn self-end sm:self-center shrink-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEvent(ev)
                        }}
                      >
                        <span>Details →</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events Bottom Panel */}
      <div className="panel p-5 mt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="card-title text-sm sm:text-base">
              Upcoming Schedule & Reminders
            </h4>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Next scheduled academic lectures, assessment deadlines, and office hours
            </p>
          </div>
          <button
            onClick={() => setViewMode("agenda")}
            className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
          >
            View Full Agenda →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {upcomingEvents.map((ev) => (
            <div
              key={ev.id}
              onClick={() => {
                handleSelectDateAndJump(ev.startDate)
                handleOpenEvent(ev)
              }}
              className="p-3 rounded-xl bg-gray-50 hover:bg-purple-50/50 border border-gray-150 hover:border-purple-300 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${getEventBadgeClass(
                      ev.category
                    )}`}
                  >
                    {ev.category}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-semibold">
                    {ev.startDate}
                  </span>
                </div>
                <strong className="block text-xs font-bold text-zinc-800 line-clamp-1 mt-1">
                  {ev.title}
                </strong>
                <span className="text-[10.5px] text-zinc-500 block truncate mt-0.5">
                  ⏱ {ev.startTime} – {ev.endTime}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event Details Popup Modal */}
      <EventDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        event={selectedEvent}
        onDeleteEvent={handleDeleteEvent}
      />

      {/* Create Reminder Modal */}
      <CreateReminderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        courses={courses}
        onSaveReminder={handleCreateReminder}
        defaultDate={formatDateString(currentDate)}
      />
    </>
  )
}
