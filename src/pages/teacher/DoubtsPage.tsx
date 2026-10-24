import { useState, useMemo, useEffect } from "react"
import type { DoubtItem, DoubtResponse, MetricItem, CourseItem, StudentItem } from "../../types"
import { Icon } from "../../components/Icon"
import { HexColorField } from "../../components/HexColorField"
import { MetricCard } from "../../components/MetricCard"
import { initialDoubts } from "../../data/mockData"

export function DoubtsHeader({
  searchQuery,
  setSearchQuery,
  onOpenAiModal,
  hexColor,
  onChangeHexColor,
  totalCount,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenAiModal?: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  totalCount: number
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>Doubts</span>
        </div>
        <div className="subtitle">
          Review student questions and help them move forward · {totalCount} total inquiries
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, question, or course..."
            aria-label="Search doubts by student, question, or course"
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
            aria-label="Ask AI assistant about student doubts"
          >
            <span>✦</span>
            Ask AI
          </button>
        )}
      </div>
    </header>
  )
}

function DoubtDetailsModal({
  isOpen,
  onClose,
  doubt,
  onSendResponse,
  onUpdateStatus,
}: {
  isOpen: boolean
  onClose: () => void
  doubt: DoubtItem | null
  onSendResponse: (doubtId: string, responseText: string, newStatus?: DoubtItem["status"]) => void
  onUpdateStatus: (doubtId: string, newStatus: DoubtItem["status"]) => void
}) {
  const [responseText, setResponseText] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
      setResponseText("")
      setErrorMessage(null)
    }
    return () => {
      document.body.style.overflow = "auto"
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !doubt) return null

  const handleSend = (targetStatus?: DoubtItem["status"]) => {
    const trimmed = responseText.trim()
    if (!trimmed) {
      setErrorMessage("Please enter a response before sending.")
      return
    }
    onSendResponse(doubt.id, trimmed, targetStatus)
    setResponseText("")
    setErrorMessage(null)
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Doubt details from ${doubt.studentName}`}
    >
      <div
        className="modal-content"
        style={{ maxWidth: "680px", maxHeight: "90vh", padding: "24px 26px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation & Close */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
          >
            <span>←</span>
            <span>Back to Doubts List</span>
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer font-bold text-sm"
            aria-label="Close doubt details"
          >
            ✕
          </button>
        </div>

        {/* Student & Course Context Header */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-pink-50 border border-purple-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={doubt.studentAvatar || "/assets/student-1.png"}
                alt={doubt.studentName}
                className="w-12 h-12 rounded-xl object-cover border border-purple-200 shrink-0"
                onError={(e) => {
                  ; (e.target as HTMLImageElement).src = "/assets/student-1.png"
                }}
              />
              <div>
                <h3 className="text-base font-bold text-zinc-900 leading-snug">
                  {doubt.studentName}
                </h3>
                <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono">{doubt.studentRoll || "#Y4-000"}</span>
                  <span>·</span>
                  <span>Submitted {doubt.submittedAt || "Recently"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${doubt.priority === "High"
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : doubt.priority === "Low"
                      ? "bg-zinc-100 text-zinc-700 border border-zinc-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}
              >
                {doubt.priority || "Medium"} Priority
              </span>
              <span
                className={`status ${doubt.status === "Resolved"
                    ? "green"
                    : doubt.status === "In Progress"
                      ? "purple"
                      : "yellow"
                  }`}
              >
                {doubt.status || "Pending"}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-purple-100/70 text-xs text-zinc-600 flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">
              {doubt.courseCode || "QAI"}
            </span>
            <span className="font-semibold text-zinc-800">{doubt.courseName || "Assigned Course"}</span>
            {doubt.moduleName && (
              <>
                <span className="text-zinc-300">›</span>
                <span className="text-zinc-600">{doubt.moduleName}</span>
              </>
            )}
            {doubt.lessonName && (
              <>
                <span className="text-zinc-300">›</span>
                <span className="text-purple-700 font-medium truncate max-w-xs">{doubt.lessonName}</span>
              </>
            )}
          </div>
        </div>

        {/* Question Details Box */}
        <div className="mt-4 p-4 rounded-2xl bg-white border border-gray-150">
          <div className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
            Student Question
          </div>
          <h4 className="text-sm sm:text-base font-bold text-zinc-900 leading-snug">
            {doubt.questionTitle || "Student Inquiry"}
          </h4>
          <p className="text-xs sm:text-sm text-zinc-700 mt-2 leading-relaxed whitespace-pre-wrap">
            {doubt.questionText || "No additional text provided."}
          </p>
        </div>

        {/* Conversation / Response History */}
        {(() => {
          const responsesList = Array.isArray(doubt.responses) ? doubt.responses : []
          return (
            <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-150">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <Icon name="message-circle" size={14} />
                  <span>Response History ({responsesList.length})</span>
                </h5>
                <span className="text-[10.5px] text-zinc-400 font-medium">
                  Teacher & Student Messages
                </span>
              </div>

              {responsesList.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400 bg-white rounded-xl border border-gray-100">
                  No responses recorded yet. Type your answer below to assist {doubt.studentName}.
                </div>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {responsesList.map((resp) => (
                    <div
                      key={resp.id}
                      className={`p-3 rounded-xl text-xs border ${resp.authorRole === "Teacher"
                          ? "bg-purple-50/80 border-purple-200 ml-4"
                          : "bg-white border-gray-200 mr-4"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={resp.authorAvatar || (resp.authorRole === "Teacher" ? "/assets/srimanth.png" : "/assets/student-1.png")}
                            alt={resp.author}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <strong className="text-zinc-900 font-bold">{resp.author}</strong>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${resp.authorRole === "Teacher"
                                ? "bg-purple-200 text-purple-900"
                                : "bg-gray-100 text-zinc-700"
                              }`}
                          >
                            {resp.authorRole}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400">{resp.createdAt}</span>
                      </div>
                      <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap pl-6">
                        {resp.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* Teacher Reply Text Area */}
        <div className="mt-4 p-4 rounded-2xl bg-white border border-gray-150">
          <label htmlFor="doubt-reply" className="block text-xs font-bold text-zinc-900 mb-1.5">
            Your Teacher Response
          </label>
          <textarea
            id="doubt-reply"
            rows={3}
            value={responseText}
            onChange={(e) => {
              setResponseText(e.target.value)
              if (errorMessage) setErrorMessage(null)
            }}
            placeholder="Type comprehensive explanation, code hint, or study recommendation..."
            className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-300 outline-none resize-none"
          />
          {errorMessage && (
            <div className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
              <span>⚠</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-100">
            {/* Status Quick Actions */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 font-medium">Quick Status:</span>
              {doubt.status !== "In Progress" && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(doubt.id, "In Progress")}
                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 cursor-pointer transition-colors"
                >
                  Mark In Progress
                </button>
              )}
              {doubt.status !== "Resolved" ? (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(doubt.id, "Resolved")}
                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 cursor-pointer transition-colors"
                >
                  Mark Resolved
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(doubt.id, "Pending")}
                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 cursor-pointer transition-colors"
                >
                  Reopen Doubt
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => handleSend("In Progress")}
                className="px-4 h-9 rounded-xl btn-secondary text-xs font-bold transition-colors cursor-pointer"
              >
                Send & Keep In Progress
              </button>
              <button
                type="button"
                onClick={() => handleSend("Resolved")}
                className="px-4 h-9 rounded-xl btn-primary text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Send & Mark Resolved
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DoubtsPage({
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  courses,
  students,
  onToast,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenAiModal?: () => void
  courses: CourseItem[]
  students: StudentItem[]
  onToast?: (msg: string) => void
}) {
  // Local persistence for doubts state
  const [doubts, setDoubts] = useState<DoubtItem[]>(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_doubts_v2") || localStorage.getItem("quantum_teacher_doubts")
      if (saved) {
        const parsed = JSON.parse(saved)
        // Verify schema validity: must have at least 8 items, valid questionTitle, and responses array
        if (Array.isArray(parsed) && parsed.length >= 8 && parsed[0]?.questionTitle) {
          return parsed.map((d: any) => ({
            ...d,
            responses: Array.isArray(d.responses) ? d.responses : [],
            priority: d.priority || "Medium",
            status: d.status || "Pending",
          }))
        }
      }
    } catch {
      // ignore
    }
    try {
      localStorage.setItem("quantum_teacher_doubts_v2", JSON.stringify(initialDoubts))
      localStorage.removeItem("quantum_teacher_doubts")
    } catch {
      // ignore
    }
    return initialDoubts
  })

  // Selected Doubt Modal
  const [selectedDoubt, setSelectedDoubt] = useState<DoubtItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [courseFilter, setCourseFilter] = useState<string>("All")
  const [priorityFilter, setPriorityFilter] = useState<string>("All")
  const [sortBy, setSortBy] = useState<string>("date-desc")

  // Sync with localStorage
  const saveDoubts = (updated: DoubtItem[]) => {
    setDoubts(updated)
    try {
      localStorage.setItem("quantum_teacher_doubts_v2", JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  // Handle Response submission
  const handleSendResponse = (doubtId: string, responseText: string, newStatus?: DoubtItem["status"]) => {
    const updated = doubts.map((d) => {
      if (d.id !== doubtId) return d
      const newResponse: DoubtResponse = {
        id: `dr-${Date.now()}`,
        author: "Srimanth",
        authorRole: "Teacher",
        authorAvatar: "/assets/srimanth.png",
        text: responseText,
        createdAt: "Just now",
      }
      return {
        ...d,
        status: newStatus || (d.status === "Pending" ? "In Progress" : d.status),
        responses: [...d.responses, newResponse],
      }
    })
    saveDoubts(updated)
    const targetDoubt = updated.find((d) => d.id === doubtId)
    if (targetDoubt) {
      setSelectedDoubt(targetDoubt)
      onToast?.(`Response dispatched to ${targetDoubt.studentName}!`)
    }
  }

  // Handle Status Update
  const handleUpdateStatus = (doubtId: string, newStatus: DoubtItem["status"]) => {
    const updated = doubts.map((d) => {
      if (d.id !== doubtId) return d
      return { ...d, status: newStatus }
    })
    saveDoubts(updated)
    const targetDoubt = updated.find((d) => d.id === doubtId)
    if (targetDoubt) {
      setSelectedDoubt(targetDoubt)
      onToast?.(`Doubt status updated to "${newStatus}".`)
    }
  }

  // Summary counts
  const summaryCounts = useMemo(() => {
    const total = doubts.length
    const pending = doubts.filter((d) => d.status === "Pending").length
    const inProgress = doubts.filter((d) => d.status === "In Progress").length
    const resolved = doubts.filter((d) => d.status === "Resolved").length
    return { total, pending, inProgress, resolved }
  }, [doubts])

  // Metric cards config
  const metrics: MetricItem[] = useMemo(() => {
    return [
      {
        icon: "message-circle",
        label: "Total Doubts",
        value: `${summaryCounts.total}`,
        trend: "Cohort questions",
        tone: "lavender",
      },
      {
        icon: "clock",
        label: "Pending Response",
        value: `${summaryCounts.pending}`,
        trend: summaryCounts.pending > 0 ? "Awaiting teacher" : "All cleared",
        tone: "yellow",
      },
      {
        icon: "trend",
        label: "In Progress",
        value: `${summaryCounts.inProgress}`,
        trend: "Active discussion",
        tone: "pink",
      },
      {
        icon: "check",
        label: "Resolved",
        value: `${summaryCounts.resolved}`,
        trend: `${Math.round((summaryCounts.resolved / (summaryCounts.total || 1)) * 100)}% resolution rate`,
        tone: "lime",
      },
    ]
  }, [summaryCounts])

  // Filtered and Sorted Doubts
  const displayedDoubts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return doubts
      .filter((d) => {
        if (statusFilter !== "All" && d.status !== statusFilter) return false
        if (courseFilter !== "All" && d.courseName !== courseFilter) return false
        if (priorityFilter !== "All" && d.priority !== priorityFilter) return false
        if (!q) return true
        return (
          (d.studentName ?? "").toLowerCase().includes(q) ||
          (d.studentRoll ?? "").toLowerCase().includes(q) ||
          (d.questionTitle ?? "").toLowerCase().includes(q) ||
          (d.questionText ?? "").toLowerCase().includes(q) ||
          (d.courseName ?? "").toLowerCase().includes(q) ||
          ((d.moduleName ?? "").toLowerCase().includes(q))
        )
      })
      .sort((a, b) => {
        if (sortBy === "priority-desc") {
          const rank = { High: 3, Medium: 2, Low: 1 }
          return rank[b.priority] - rank[a.priority]
        }
        if (sortBy === "status") {
          const rank = { Pending: 3, "In Progress": 2, Resolved: 1 }
          return rank[b.status] - rank[a.status]
        }
        if (sortBy === "date-asc") {
          return a.id.localeCompare(b.id)
        }
        return b.id.localeCompare(a.id)
      })
  }, [doubts, searchQuery, statusFilter, courseFilter, priorityFilter, sortBy])

  const isFiltered =
    statusFilter !== "All" ||
    courseFilter !== "All" ||
    priorityFilter !== "All" ||
    searchQuery.trim().length > 0 ||
    sortBy !== "date-desc"

  const handleResetFilters = () => {
    setStatusFilter("All")
    setCourseFilter("All")
    setPriorityFilter("All")
    setSortBy("date-desc")
    setSearchQuery("")
  }

  const handleOpenDoubt = (d: DoubtItem) => {
    setSelectedDoubt(d)
    setIsModalOpen(true)
  }

  return (
    <>
      <DoubtsHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAiModal={onOpenAiModal}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
        totalCount={doubts.length}
      />

      {/* 4 Summary Cards */}
      <div className="metrics-grid">
        {metrics.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* Doubts Main Panel */}
      <section className="panel p-5" aria-label="Student Doubts Roster">
        {/* Top Header & Status Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="card-title text-base">Student Doubts</h3>
            <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
              Showing {displayedDoubts.length} of {doubts.length} student questions across your courses
            </div>
          </div>

          <div className="filter-pills" role="tablist" aria-label="Filter doubts by status">
            <button
              className={`filter-pill ${statusFilter === "All" ? "active" : ""}`}
              onClick={() => setStatusFilter("All")}
              aria-selected={statusFilter === "All"}
            >
              All ({summaryCounts.total})
            </button>
            <button
              className={`filter-pill ${statusFilter === "Pending" ? "active" : ""}`}
              onClick={() => setStatusFilter("Pending")}
              aria-selected={statusFilter === "Pending"}
            >
              Pending ({summaryCounts.pending})
            </button>
            <button
              className={`filter-pill ${statusFilter === "In Progress" ? "active" : ""}`}
              onClick={() => setStatusFilter("In Progress")}
              aria-selected={statusFilter === "In Progress"}
            >
              In Progress ({summaryCounts.inProgress})
            </button>
            <button
              className={`filter-pill ${statusFilter === "Resolved" ? "active" : ""}`}
              onClick={() => setStatusFilter("Resolved")}
              aria-selected={statusFilter === "Resolved"}
            >
              Resolved ({summaryCounts.resolved})
            </button>
          </div>
        </div>

        {/* Secondary Filter & Sort Controls Row */}
        <div className="roster-filter-row" aria-label="Doubts filters and sorting controls">
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

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="roster-select"
            aria-label="Filter by priority"
          >
            <option value="All">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="roster-select"
            aria-label="Sort doubts by"
          >
            <option value="date-desc">Sort: Newest First</option>
            <option value="date-asc">Sort: Oldest First</option>
            <option value="priority-desc">Sort: Priority (High → Low)</option>
            <option value="status">Sort: Status (Pending First)</option>
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

        {/* Doubts Table */}
        <div className="roster-table-container mt-3">
          <div className="roster-table-inner" style={{ minWidth: "980px" }}>
            <div
              className="roster-table-head"
              style={{
                gridTemplateColumns: "minmax(180px, 1.8fr) minmax(240px, 2.5fr) minmax(180px, 1.8fr) 110px 95px 105px 100px",
              }}
            >
              <span>Student</span>
              <span>Question / Subject</span>
              <span>Course</span>
              <span>Submitted</span>
              <span>Priority</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {displayedDoubts.length === 0 ? (
              <div className="roster-empty-state">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 grid place-items-center mb-1">
                  <Icon name="message-circle" size={20} />
                </div>
                <strong className="text-sm text-zinc-800">No matching doubts found</strong>
                <p className="text-xs text-zinc-500 max-w-sm">
                  {doubts.length === 0
                    ? "There are currently no student inquiries in your queue."
                    : "No doubts match your search query or filter selection."}
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
              <div className="roster-list">
                {displayedDoubts.map((doubt) => (
                  <div
                    key={doubt.id}
                    className="roster-row hover:bg-purple-50/40"
                    style={{
                      gridTemplateColumns: "minmax(180px, 1.8fr) minmax(240px, 2.5fr) minmax(180px, 1.8fr) 110px 95px 105px 100px",
                    }}
                    onClick={() => handleOpenDoubt(doubt)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleOpenDoubt(doubt)
                    }}
                    aria-label={`Doubt: ${doubt.questionTitle}`}
                  >
                    {/* 1. Student */}
                    <div className="flex items-center gap-2.5 min-w-0 pr-1">
                      <img
                        src={doubt.studentAvatar || "/assets/student-1.png"}
                        alt={doubt.studentName}
                        className="w-8 h-8 rounded-full object-cover border border-purple-200 shrink-0"
                        onError={(e) => {
                          ; (e.target as HTMLImageElement).src = "/assets/student-1.png"
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <strong className="block text-xs font-bold text-zinc-900 truncate">
                          {doubt.studentName}
                        </strong>
                        <span className="text-[10.5px] text-zinc-500 font-mono">
                          {doubt.studentRoll}
                        </span>
                      </div>
                    </div>

                    {/* 2. Question / Subject */}
                    <div className="min-w-0 pr-2">
                      <strong className="block text-xs font-bold text-zinc-900 group-hover:text-purple-700 transition-colors truncate">
                        {doubt.questionTitle}
                      </strong>
                      <p className="text-[11px] text-zinc-500 truncate leading-snug">
                        {doubt.questionText}
                      </p>
                      {doubt.moduleName && (
                        <span className="text-[9.5px] text-purple-700 font-medium truncate block mt-0.5">
                          {doubt.moduleName}
                        </span>
                      )}
                    </div>

                    {/* 3. Course */}
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-purple-100 text-purple-800">
                          {doubt.courseCode}
                        </span>
                      </div>
                      <span className="block text-xs font-semibold text-zinc-800 truncate" title={doubt.courseName}>
                        {doubt.courseName}
                      </span>
                    </div>

                    {/* 4. Date Submitted */}
                    <div className="text-[11px] text-zinc-600 pr-1">
                      {doubt.submittedAt}
                    </div>

                    {/* 5. Priority */}
                    <div className="pr-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${doubt.priority === "High"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : doubt.priority === "Medium"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                          }`}
                      >
                        {doubt.priority}
                      </span>
                    </div>

                    {/* 6. Status */}
                    <div className="pr-1">
                      <span
                        className={`status ${doubt.status === "Resolved"
                            ? "green"
                            : doubt.status === "In Progress"
                              ? "purple"
                              : "yellow"
                          }`}
                      >
                        {doubt.status}
                      </span>
                    </div>

                    {/* 7. Action */}
                    <div>
                      <button
                        type="button"
                        className="view-details-btn cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDoubt(doubt)
                        }}
                        aria-label={`View doubt from ${doubt.studentName}`}
                      >
                        <span>Respond →</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Doubt Details & Reply Popup Modal */}
      <DoubtDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        doubt={selectedDoubt}
        onSendResponse={handleSendResponse}
        onUpdateStatus={handleUpdateStatus}
      />
    </>
  )
}
