import { useState, useMemo, useEffect } from "react"
import type {
  LiveSessionItem,
  MetricItem,
  CourseItem,
  AIMonitoringData,
  SessionRecordingItem,
  TeachingSuggestionItem,
  LiveAttendanceRecord,
} from "../types"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"
import { MetricCard } from "../components/MetricCard"
import {
  initialLiveSessions,
  initialAIMonitoringData,
  initialRecordings,
  initialTeachingSuggestions,
  initialAttendanceRecords,
} from "../data/mockData"
import AIMonitoringSection from "../components/AIMonitoringSection"
import RecordingsSuggestionsSection from "../components/RecordingsSuggestionsSection"
import AttendanceSection from "../components/AttendanceSection"

export function LiveClassHeader({
  searchQuery,
  setSearchQuery,
  onOpenAiModal,
  hexColor,
  onChangeHexColor,
  liveCount,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenAiModal?: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  liveCount: number
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting flex items-center gap-2.5">
          <span>Live Class</span>
          {liveCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              {liveCount} LIVE NOW
            </span>
          )}
        </div>
        <div className="subtitle">
          View your scheduled live sessions and join your classes · Autumn Term 2026
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search classes, courses, topics..."
            aria-label="Search live classes"
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
        {onOpenAiModal && (
          <button
            className="ask-ai"
            onClick={onOpenAiModal}
            aria-label="Ask AI assistant about live classes"
          >
            <span>✦</span>
            Ask AI
          </button>
        )}
      </div>
    </header>
  )
}

function LiveClassDetailsModal({
  isOpen,
  onClose,
  session,
  onJoinClass,
}: {
  isOpen: boolean
  onClose: () => void
  session: LiveSessionItem | null
  onJoinClass: (session: LiveSessionItem) => void
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

  if (!isOpen || !session) return null

  const isValidUrl =
    session.meetingUrl &&
    (session.meetingUrl.startsWith("http://") || session.meetingUrl.startsWith("https://"))

  const isValidRecording =
    session.recordingUrl &&
    (session.recordingUrl.startsWith("http://") || session.recordingUrl.startsWith("https://"))

  const getPlatformBadge = (platform: LiveSessionItem["platform"]) => {
    switch (platform) {
      case "Zoom":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "Google Meet":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "Quantum Classroom":
        return "bg-purple-50 text-purple-700 border-purple-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Live session details for ${session.title}`}
    >
      <div
        className="modal-content"
        style={{ maxWidth: "640px", maxHeight: "90vh", padding: "24px 26px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation & Close */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                session.status === "Live Now"
                  ? "bg-rose-100 text-rose-800 border-rose-200 animate-pulse"
                  : session.status === "Upcoming"
                  ? "bg-purple-100 text-purple-800 border-purple-200"
                  : "bg-gray-100 text-gray-700 border-gray-200"
              }`}
            >
              {session.status === "Live Now" ? "● Live Now" : session.status}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${getPlatformBadge(
                session.platform
              )}`}
            >
              {session.platform}
            </span>
            <span className="text-[10px] font-semibold text-zinc-400 bg-gray-100 px-2 py-0.5 rounded-full">
              Admin Scheduled · Read Only
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer font-bold text-sm"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Title and Course Info */}
        <div className="mt-4">
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug">
            {session.title}
          </h3>

          <div className="mt-2 text-xs text-zinc-500 flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10.5px]">
              {session.courseCode}
            </span>
            <span className="font-semibold text-zinc-800">{session.courseName}</span>
            {session.batchName && (
              <>
                <span className="text-zinc-300">·</span>
                <span className="text-zinc-600">{session.batchName}</span>
              </>
            )}
          </div>
        </div>

        {/* Schedule & Platform Details Grid */}
        <div className="mt-4 p-3.5 rounded-xl bg-gray-50 border border-gray-150 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-zinc-400 block text-[10.5px] uppercase font-bold tracking-wider mb-0.5">
              Date & Time
            </span>
            <strong className="text-zinc-800 block">
              {session.scheduledDate} · {session.startTime} – {session.endTime}
            </strong>
            <span className="text-zinc-500 text-[11px] block mt-0.5">
              Duration: {session.durationMinutes} minutes
            </span>
          </div>

          <div>
            <span className="text-zinc-400 block text-[10.5px] uppercase font-bold tracking-wider mb-0.5">
              Teacher / Host
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <img
                src={session.instructorAvatar || "/assets/srimanth.png"}
                alt={session.instructorName}
                className="w-5 h-5 rounded-full object-cover"
              />
              <strong className="text-zinc-800">{session.instructorName}</strong>
              <span className="text-[10px] text-zinc-400 font-normal">
                ({session.enrolledCount || 24} enrolled)
              </span>
            </div>
          </div>
        </div>

        {/* Topics Covered */}
        {session.topicsCovered && session.topicsCovered.length > 0 && (
          <div className="mt-4">
            <span className="text-zinc-400 block text-[10.5px] uppercase font-bold tracking-wider mb-1.5">
              Key Topics Covered
            </span>
            <div className="flex flex-wrap gap-1.5">
              {session.topicsCovered.map((topic, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs bg-purple-50 text-purple-900 border border-purple-100 font-medium"
                >
                  ✓ {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Class Notes */}
        {session.classNotes && (
          <div className="mt-4 p-3.5 rounded-xl bg-white border border-gray-200">
            <span className="text-zinc-400 block text-[10.5px] uppercase font-bold tracking-wider mb-1">
              Class Notes & Instructions
            </span>
            <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
              {session.classNotes}
            </p>
          </div>
        )}

        {/* In-App Live Studio Information */}
        <div className="mt-4 p-3 rounded-xl bg-purple-50/70 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-purple-900 block text-[10.5px] uppercase font-bold tracking-wider mb-0.5">
              Quantum LMS In-App Studio Route
            </span>
            <span className="text-purple-700 font-mono text-[11px] truncate max-w-sm block">
              /teacher/live-class/studio/{session.id}
            </span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              Built-in video classroom · No external redirects
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isValidRecording && (
              <a
                href={session.recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 h-8 rounded-lg border border-purple-200 text-purple-700 bg-white hover:bg-purple-50 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <span>▶ Recording ↗</span>
              </a>
            )}

            {session.status !== "Completed" && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onJoinClass(session)
                }}
                className="px-4 h-8 rounded-lg btn-primary text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span>Enter Live Studio →</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-gray-100">
          <span className="text-[11px] text-zinc-400">
            Academic live schedules are managed by Quantum LMS Admin.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-8 rounded-lg text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}

export function LiveClassPage({
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  courses,
  onToast,
  onEnterStudio,
  sessions: propSessions,
  reviewSessionId,
  onClearReviewSessionId,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenAiModal?: () => void
  courses: CourseItem[]
  onToast?: (msg: string) => void
  onEnterStudio?: (session: LiveSessionItem) => void
  sessions?: LiveSessionItem[]
  reviewSessionId?: string | null
  onClearReviewSessionId?: () => void
}) {
  // Local persistence for live sessions fallback
  const [internalSessions] = useState<LiveSessionItem[]>(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_live_sessions_v1")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length >= 8 && parsed[0]?.title) {
          return parsed
        }
      }
    } catch {
      // ignore
    }
    return initialLiveSessions
  })

  const sessions = propSessions || internalSessions

  // Active Navigation View Mode: "schedule" | "monitoring" | "recordings" | "attendance"
  const [viewMode, setViewMode] = useState<
    "schedule" | "monitoring" | "recordings" | "attendance"
  >(() => {
    if (reviewSessionId) return "recordings"
    if (typeof window !== "undefined") {
      const p = window.location.pathname.toLowerCase()
      if (p.includes("/review/") || p.includes("/recordings/")) return "recordings"
    }
    return "schedule"
  })

  // Synchronize viewMode when reviewSessionId changes (e.g. redirected after Live Studio)
  useEffect(() => {
    if (reviewSessionId) {
      setViewMode("recordings")
    }
  }, [reviewSessionId])

  // AI Live Monitoring state
  const [monitoringData] = useState<AIMonitoringData>(initialAIMonitoringData)

  // Recordings and Suggestions state
  const [recordings] = useState<SessionRecordingItem[]>(initialRecordings)
  const [suggestions] = useState<TeachingSuggestionItem[]>(initialTeachingSuggestions)

  // Attendance state
  const [attendanceRecords] = useState<LiveAttendanceRecord[]>(initialAttendanceRecords)

  // Selected session for modal
  const [selectedSession, setSelectedSession] = useState<LiveSessionItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [courseFilter, setCourseFilter] = useState<string>("All")
  const [platformFilter, setPlatformFilter] = useState<string>("All")
  const [sortBy, setSortBy] = useState<string>("time-asc")

  // Join Class / Enter Studio Action Handler
  const handleJoinClass = (session: LiveSessionItem) => {
    if (onEnterStudio) {
      onEnterStudio(session)
    } else {
      onToast?.(`Entering In-App Studio: "${session.title}"`)
    }
  }

  // Calculate live, upcoming, completed counts
  const summaryCounts = useMemo(() => {
    const liveNow = sessions.filter((s) => s.status === "Live Now").length
    const upcoming = sessions.filter((s) => s.status === "Upcoming").length
    const completed = sessions.filter((s) => s.status === "Completed").length
    return { liveNow, upcoming, completed, total: sessions.length }
  }, [sessions])

  // Summary Metrics Cards Data
  const metrics: MetricItem[] = useMemo(() => {
    return [
      {
        icon: "video",
        label: "Live Now",
        value: String(summaryCounts.liveNow),
        trend: summaryCounts.liveNow > 0 ? "Session in progress" : "No active session",
        tone: summaryCounts.liveNow > 0 ? "pink" : "lavender",
      },
      {
        icon: "calendar",
        label: "Upcoming Sessions",
        value: String(summaryCounts.upcoming),
        trend: "Scheduled this term",
        tone: "yellow",
      },
      {
        icon: "play",
        label: "Completed Classes",
        value: String(summaryCounts.completed),
        trend: "Recordings & notes ready",
        tone: "lime",
      },
    ]
  }, [summaryCounts])

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return sessions
      .filter((s) => {
        if (statusFilter !== "All" && s.status !== statusFilter) return false
        if (courseFilter !== "All" && s.courseName !== courseFilter) return false
        if (platformFilter !== "All" && s.platform !== platformFilter) return false
        if (!q) return true
        return (
          (s.title ?? "").toLowerCase().includes(q) ||
          (s.courseName ?? "").toLowerCase().includes(q) ||
          (s.courseCode ?? "").toLowerCase().includes(q) ||
          (s.platform ?? "").toLowerCase().includes(q) ||
          (s.topicsCovered && s.topicsCovered.some((t) => t.toLowerCase().includes(q))) ||
          (s.classNotes && s.classNotes.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => {
        if (sortBy === "time-asc") {
          return a.scheduledDate.localeCompare(b.scheduledDate) || a.startTime.localeCompare(b.startTime)
        }
        if (sortBy === "time-desc") {
          return b.scheduledDate.localeCompare(a.scheduledDate) || b.startTime.localeCompare(a.startTime)
        }
        return a.title.localeCompare(b.title)
      })
  }, [sessions, searchQuery, statusFilter, courseFilter, platformFilter, sortBy])

  // Split into Live Now, Upcoming, and Completed for layout sections
  const liveNowList = useMemo(() => {
    return filteredSessions.filter((s) => s.status === "Live Now")
  }, [filteredSessions])

  const upcomingList = useMemo(() => {
    return filteredSessions.filter((s) => s.status === "Upcoming")
  }, [filteredSessions])

  const completedList = useMemo(() => {
    return filteredSessions.filter((s) => s.status === "Completed")
  }, [filteredSessions])

  const isFiltered =
    statusFilter !== "All" ||
    courseFilter !== "All" ||
    platformFilter !== "All" ||
    searchQuery.trim().length > 0 ||
    sortBy !== "time-asc"

  const handleResetFilters = () => {
    setStatusFilter("All")
    setCourseFilter("All")
    setPlatformFilter("All")
    setSortBy("time-asc")
    setSearchQuery("")
  }

  const handleOpenDetails = (s: LiveSessionItem) => {
    setSelectedSession(s)
    setIsModalOpen(true)
  }

  const getPlatformChipClass = (platform: LiveSessionItem["platform"]) => {
    switch (platform) {
      case "Zoom":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "Google Meet":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "Quantum Classroom":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-zinc-800 border-gray-200"
    }
  }

  return (
    <>
      <LiveClassHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAiModal={onOpenAiModal}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
        liveCount={summaryCounts.liveNow}
      />

      {/* 3 Summary Cards */}
      <div className="metrics-grid">
        {metrics.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* 4 Feature Tabs Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-xs rounded-2xl border border-gray-150 shadow-xs overflow-x-auto mt-2" role="tablist" aria-label="Live Class features navigation">
        <button
          type="button"
          onClick={() => {
            setViewMode("schedule")
            onClearReviewSessionId?.()
            window.history.pushState(null, "", "/teacher/live-class")
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            viewMode === "schedule"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-zinc-600 hover:text-purple-700 hover:bg-purple-50/50"
          }`}
          aria-selected={viewMode === "schedule"}
        >
          <Icon name="video" size={14} />
          <span>Live Schedule</span>
          {summaryCounts.liveNow > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setViewMode("monitoring")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            viewMode === "monitoring"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-zinc-600 hover:text-purple-700 hover:bg-purple-50/50"
          }`}
          aria-selected={viewMode === "monitoring"}
        >
          <Icon name="sparkles" size={14} />
          <span>AI Live Monitoring</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-bold ${viewMode === "monitoring" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
            92% Score
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode("recordings")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            viewMode === "recordings"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-zinc-600 hover:text-purple-700 hover:bg-purple-50/50"
          }`}
          aria-selected={viewMode === "recordings"}
        >
          <Icon name="play" size={14} />
          <span>Lecture Recording & AI Review</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-bold ${viewMode === "recordings" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"}`}>
            {recordings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode("attendance")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            viewMode === "attendance"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-zinc-600 hover:text-purple-700 hover:bg-purple-50/50"
          }`}
          aria-selected={viewMode === "attendance"}
        >
          <Icon name="users" size={14} />
          <span>Attendance</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-bold ${viewMode === "attendance" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"}`}>
            92% Rate
          </span>
        </button>
      </div>

      {/* Main Content Area Based on viewMode */}
      {viewMode === "schedule" && (
        <section className="panel p-5 mt-2 bg-white rounded-2xl border border-zinc-150" aria-label="Live Sessions Dashboard">
        {/* Top Header & Status Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="card-title text-base">Live Academic Sessions</h3>
            <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
              Showing {filteredSessions.length} of {sessions.length} scheduled live broadcasts
            </div>
          </div>

          <div className="filter-pills" role="tablist" aria-label="Filter sessions by status">
            <button
              className={`filter-pill ${statusFilter === "All" ? "active" : ""}`}
              onClick={() => setStatusFilter("All")}
              aria-selected={statusFilter === "All"}
            >
              All ({summaryCounts.total})
            </button>
            <button
              className={`filter-pill ${statusFilter === "Live Now" ? "active" : ""}`}
              onClick={() => setStatusFilter("Live Now")}
              aria-selected={statusFilter === "Live Now"}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block mr-1"></span>
              Live Now ({summaryCounts.liveNow})
            </button>
            <button
              className={`filter-pill ${statusFilter === "Upcoming" ? "active" : ""}`}
              onClick={() => setStatusFilter("Upcoming")}
              aria-selected={statusFilter === "Upcoming"}
            >
              Upcoming ({summaryCounts.upcoming})
            </button>
            <button
              className={`filter-pill ${statusFilter === "Completed" ? "active" : ""}`}
              onClick={() => setStatusFilter("Completed")}
              aria-selected={statusFilter === "Completed"}
            >
              Completed ({summaryCounts.completed})
            </button>
          </div>
        </div>

        {/* Secondary Standardized Dropdowns Filter Row */}
        <div className="roster-filter-row" aria-label="Live class filters and sorting controls">
          {/* Course Filter */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="roster-select"
            aria-label="Filter by course"
          >
            <option value="All">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="roster-select"
            aria-label="Filter by meeting platform"
          >
            <option value="All">All Platforms</option>
            <option value="Zoom">Zoom</option>
            <option value="Google Meet">Google Meet</option>
            <option value="Quantum Classroom">Quantum Classroom</option>
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="roster-select"
            aria-label="Sort sessions"
          >
            <option value="time-asc">Sort: Earliest Schedule</option>
            <option value="time-desc">Sort: Latest Schedule</option>
            <option value="title">Sort: Class Title (A-Z)</option>
          </select>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="clear-filters-btn cursor-pointer"
              title="Reset all active filters and search"
              aria-label="Reset all filters and search"
            >
              <span>✕ Reset Filters</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        {filteredSessions.length === 0 ? (
          <div className="roster-empty-state mt-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 grid place-items-center mb-1">
              <Icon name="video" size={20} />
            </div>
            <strong className="text-sm text-zinc-800">No matching live sessions found</strong>
            <p className="text-xs text-zinc-500 max-w-sm">
              No live classes match your search query or selected filter criteria.
            </p>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 h-8 rounded-full btn-primary text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Reset All Filters & Search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Section 1: LIVE NOW */}
            {(statusFilter === "All" || statusFilter === "Live Now") && (
              <div aria-label="Currently Live Classes">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    <span>Live Now ({liveNowList.length})</span>
                  </h4>
                  {liveNowList.length > 0 && (
                    <span className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                      Broadcast Active
                    </span>
                  )}
                </div>

                {liveNowList.length === 0 ? (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-150 text-center text-xs text-zinc-500">
                    No live sessions currently in progress. Check upcoming classes below.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {liveNowList.map((session) => (
                      <div
                        key={session.id}
                        className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50/90 via-white to-pink-50/70 border-2 border-purple-300 shadow-sm relative overflow-hidden"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-500 text-white animate-pulse">
                                ● LIVE NOW
                              </span>
                              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">
                                {session.courseCode}
                              </span>
                              <span className="text-xs font-semibold text-zinc-700">
                                {session.courseName}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPlatformChipClass(
                                  session.platform
                                )}`}
                              >
                                {session.platform}
                              </span>
                            </div>

                            <h4 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug">
                              {session.title}
                            </h4>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                              <span className="font-semibold text-purple-900">
                                🕒 {session.startTime} – {session.endTime} ({session.durationMinutes} min)
                              </span>
                              <span>·</span>
                              <span>Instructor: {session.instructorName}</span>
                              <span>·</span>
                              <span>{session.enrolledCount || 24} Students Enrolled</span>
                            </div>

                            {session.topicsCovered && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {session.topicsCovered.map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded text-[11px] bg-white border border-purple-100 text-zinc-700"
                                  >
                                    ✓ {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex sm:flex-row lg:flex-col items-center sm:justify-start lg:justify-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleJoinClass(session)}
                              className="px-5 h-10 rounded-xl btn-primary text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                              aria-label={`Enter live studio for ${session.title}`}
                            >
                              <span>Enter Live Studio →</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(session)}
                              className="px-4 h-10 rounded-xl text-xs font-medium text-zinc-700 bg-white hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section 2: UPCOMING LIVE CLASSES */}
            {(statusFilter === "All" || statusFilter === "Upcoming") && upcomingList.length > 0 && (
              <div aria-label="Upcoming Scheduled Live Classes">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon name="calendar" size={14} />
                    <span>Upcoming Live Classes ({upcomingList.length})</span>
                  </h4>
                  <span className="text-[11px] text-zinc-400">Chronological schedule</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {upcomingList.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 rounded-xl bg-white hover:bg-purple-50/20 border border-gray-150 transition-all shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">
                              {session.courseCode}
                            </span>
                            <span
                              className={`px-2 py-0.2 rounded-full text-[9.5px] font-bold border ${getPlatformChipClass(
                                session.platform
                              )}`}
                            >
                              {session.platform}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                            {session.scheduledDate}
                          </span>
                        </div>

                        <h5 className="text-sm font-bold text-zinc-900 mb-1.5 line-clamp-1">
                          {session.title}
                        </h5>

                        <div className="text-xs text-zinc-500 mb-2.5 flex items-center gap-2">
                          <span>
                            ⏰ {session.startTime} – {session.endTime}
                          </span>
                          <span>·</span>
                          <span>{session.durationMinutes} min</span>
                          <span>·</span>
                          <span className="truncate">{session.courseName}</span>
                        </div>

                        {session.topicsCovered && (
                          <div className="text-[11px] text-zinc-600 line-clamp-1 mb-3">
                            <strong>Topics:</strong> {session.topicsCovered.join(", ")}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(session)}
                          className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
                        >
                          View Details →
                        </button>

                        <button
                          type="button"
                          onClick={() => handleJoinClass(session)}
                          className="px-3.5 h-8 rounded-lg btn-primary text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                          aria-label={`Start live studio for ${session.title}`}
                        >
                          <span>Start Class →</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 3: COMPLETED CLASSES & RECORDINGS */}
            {(statusFilter === "All" || statusFilter === "Completed") && completedList.length > 0 && (
              <div aria-label="Completed Live Classes and Recordings">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon name="play" size={14} />
                    <span>Completed Classes & Recordings ({completedList.length})</span>
                  </h4>
                  <span className="text-[11px] text-zinc-400">Archived sessions & materials</span>
                </div>

                <div className="space-y-2.5">
                  {completedList.map((session) => (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100/70 border border-gray-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="status green text-[10px]">Completed</span>
                          <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold text-[9.5px]">
                            {session.courseCode}
                          </span>
                          <span className="text-zinc-500 font-medium">
                            {session.scheduledDate} · {session.startTime} – {session.endTime}
                          </span>
                        </div>
                        <h5 className="text-xs sm:text-sm font-bold text-zinc-900">
                          {session.title}
                        </h5>
                        <p className="text-[11px] text-zinc-500 line-clamp-1">
                          {session.classNotes || session.courseName}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {session.recordingUrl && (
                          <a
                            href={session.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 h-8 rounded-lg border border-purple-200 text-purple-700 bg-white hover:bg-purple-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <span>Watch Recording ↗</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(session)}
                          className="px-3 h-8 rounded-lg bg-white border border-gray-200 text-zinc-700 hover:bg-gray-100 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Notes & Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      )}

      {/* VIEW 2: AI LIVE MONITORING */}
      {viewMode === "monitoring" && (
        <section
          className="panel p-5 mt-2 bg-white rounded-2xl border border-zinc-150"
          aria-label="AI Live Monitoring Section"
        >
          <AIMonitoringSection
            monitoringData={monitoringData}
            onToast={onToast}
          />
        </section>
      )}

      {/* VIEW 3: LECTURE RECORDING & AI INTELLIGENCE REVIEW */}
      {viewMode === "recordings" && (
        <section
          className="panel p-5 mt-2 bg-white rounded-2xl border border-zinc-150"
          aria-label="Lecture Recording & AI Intelligence Review Section"
        >
          <RecordingsSuggestionsSection
            recordings={recordings}
            suggestions={suggestions}
            initialSelectedId={reviewSessionId || undefined}
            onToast={onToast}
            onSelectSession={(sId) => {
              window.history.pushState(null, "", `/teacher/live-class/review/${sId}`)
            }}
          />
        </section>
      )}

      {/* VIEW 4: ATTENDANCE */}
      {viewMode === "attendance" && (
        <section
          className="panel p-5 mt-2 bg-white rounded-2xl border border-zinc-150"
          aria-label="Live Class Attendance Section"
        >
          <AttendanceSection
            sessions={sessions}
            records={attendanceRecords}
            onToast={onToast}
          />
        </section>
      )}

      {/* Details Popup Modal */}
      <LiveClassDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        session={selectedSession}
        onJoinClass={handleJoinClass}
      />
    </>
  )
}
