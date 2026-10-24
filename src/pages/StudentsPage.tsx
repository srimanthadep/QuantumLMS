import { useState, useMemo, useEffect } from "react"
import type { MetricItem, StudentItem } from "../types"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"
import { MetricCard } from "../components/MetricCard"
import { StudentActivityHeatmap } from "../components/StudentActivityHeatmap"

export function getStudentGrade(average: number): string {
  if (average >= 95) return "A+"
  if (average >= 88) return "A"
  if (average >= 80) return "A-"
  if (average >= 75) return "B+"
  if (average >= 70) return "B"
  if (average >= 65) return "C+"
  if (average >= 60) return "C"
  if (average >= 50) return "D+"
  return "D"
}

export function StudentsHeader({
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
          <span>My Students</span>
        </div>
        <div className="subtitle">
          Year 4 · Maple & Oak Classes · {totalCount} assigned students
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, ID, or course..."
            aria-label="Search students by name, ID, or course"
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
            aria-label="Ask AI assistant about students"
          >
            <span>✦</span>
            Ask AI
          </button>
        )}
      </div>
    </header>
  )
}

function StudentDetailsModal({
  isOpen,
  onClose,
  student,
  onOpenReportModal,
}: {
  isOpen: boolean
  onClose: () => void
  student: StudentItem | null
  onOpenReportModal: (studentName: string) => void
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

  if (!isOpen || !student) return null

  const attendanceStatus =
    (student.attendance ?? 0) >= 95
      ? "Excellent - High Attendance"
      : (student.attendance ?? 0) >= 90
        ? "Good - Regular Attendance"
        : "Needs Attention - Below 90%"

  const modulesCompleted =
    student.modulesCompleted ??
    Math.round(((student.completion ?? 75) / 100) * 12)
  const totalModules = student.totalModules ?? 12
  const studentGrade = student.grade || getStudentGrade(student.average ?? 0)

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Student details for ${student.name}`}
    >
      <div
        className="modal-content student-details-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation & Close */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
          >
            <span>←</span>
            <span>Back to Student List</span>
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
            aria-label="Close details modal"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Student Profile Banner */}
        <div className="flex items-center gap-3.5 mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-pink-50 border border-purple-100">
          <img
            src={student.image || "/assets/student-1.png"}
            alt={student.name}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0"
            onError={(e) => {
              ; (e.target as HTMLImageElement).src = "/assets/student-1.png"
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-black">{student.name}</h3>
              <span
                className={`status ${student.status === "Excelling"
                  ? "purple"
                  : student.status === "On Track"
                    ? "green"
                    : "yellow"
                  }`}
              >
                {student.status}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                Grade {studentGrade}
              </span>
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Roll No: <strong className="text-zinc-800">{student.rollNumber}</strong> ·{" "}
              {student.assignedClass || "Year 4 – Maple Class"}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {student.email ||
                `${student.name.toLowerCase().replace(/\s+/g, ".")}@quantumschool.ai`}
            </div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 mt-3.5">
          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-center">
            <span className="text-[10px] font-semibold text-purple-900 uppercase">
              Attendance
            </span>
            <strong className="block text-lg font-bold text-purple-950 mt-0.5">
              {student.attendance ?? 0}%
            </strong>
            <span className="text-[9.5px] text-purple-800">Term 1 Rate</span>
          </div>

          <div className="p-3 rounded-xl bg-lime-50/70 border border-lime-100 text-center">
            <span className="text-[10px] font-semibold text-lime-900 uppercase">
              Academic Avg
            </span>
            <strong className="block text-lg font-bold text-lime-950 mt-0.5">
              {student.average ?? 0}%
            </strong>
            <span className="text-[9.5px] text-lime-800">Overall Mastery</span>
          </div>

          <div className="p-3 rounded-xl bg-yellow-50/70 border border-yellow-100 text-center">
            <span className="text-[10px] font-semibold text-yellow-900 uppercase">
              Modules
            </span>
            <strong className="block text-lg font-bold text-yellow-950 mt-0.5">
              {modulesCompleted}/{totalModules}
            </strong>
            <span className="text-[9.5px] text-yellow-800">Units Cleared</span>
          </div>
        </div>

        {/* Individual Student Activity Heatmap (12-Week Rolling Matrix) */}
        <StudentActivityHeatmap student={student} />

        {/* Subject Breakdown */}
        <div className="mt-3.5 p-3.5 rounded-2xl bg-white border border-gray-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-900">
              Subject Mastery Breakdown
            </span>
            <span className="text-[10.5px] font-medium text-zinc-500">
              Year 4 Curriculum
            </span>
          </div>

          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">English Language & Reading</span>
              <strong className="text-zinc-800">
                {student.subjects?.english ?? 0}%
              </strong>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full"
                style={{ width: `${student.subjects?.english ?? 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <span className="text-zinc-600">Mathematics & Fractions</span>
              <strong className="text-zinc-800">
                {student.subjects?.math ?? 0}%
              </strong>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-lime-500 rounded-full"
                style={{ width: `${student.subjects?.math ?? 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <span className="text-zinc-600">Science & STEM Experiments</span>
              <strong className="text-zinc-800">
                {student.subjects?.science ?? 0}%
              </strong>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full"
                style={{ width: `${student.subjects?.science ?? 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <span className="text-zinc-600">Art, Design & Visual Thinking</span>
              <strong className="text-zinc-800">
                {student.subjects?.art ?? 0}%
              </strong>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-pink-400 rounded-full"
                style={{ width: `${student.subjects?.art ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Course-Specific Information */}
        <div className="mt-3.5 p-3.5 rounded-2xl bg-white border border-gray-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-900">
              Enrolled Courses & Academic Modules
            </span>
            <span className="text-[10.5px] font-medium text-zinc-500">
              Teacher: Srimanth
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {(
              student.courses || [
                {
                  name: "Year 4 Elementary STEM & AI",
                  code: "QAI-Y401",
                  progress: student.completion ?? 76,
                },
              ]
            ).map((c) => (
              <div
                key={c.code}
                className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                      {c.code}
                    </span>
                    <strong className="text-zinc-800 truncate text-[11.5px]">
                      {c.name}
                    </strong>
                  </div>
                  <div className="w-40 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${c.progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-purple-700">
                    {c.progress}%
                  </span>
                  <span className="block text-[9.5px] text-zinc-400">
                    Completion
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Summary & Behavioral Tags */}
        <div className="mt-3.5 p-3.5 rounded-2xl bg-white border border-gray-150">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-zinc-900">
              Attendance Log Status
            </span>
            <span className="text-[11px] font-semibold text-purple-800">
              {attendanceStatus}
            </span>
          </div>
          <div className="text-[11.5px] text-zinc-600 mb-2.5">
            Recorded {student.attendance ?? 0}% attendance rate across term
            sessions.
          </div>

          <div className="text-xs font-bold text-zinc-900 mb-1.5">
            Strengths & Behavioral Tags
          </div>
          <div className="tag-list">
            {(student.tags || []).map((tag) => (
              <span key={tag} className="tag-chip">
                ✦ {tag}
              </span>
            ))}
          </div>

          {student.teacherNotes && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px] text-purple-950 leading-relaxed">
              <strong>Teacher Observation:</strong> {student.teacherNotes}
            </div>
          )}

          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-zinc-500">
            <span>
              Parent Contact:{" "}
              <strong className="text-zinc-800">{student.parentName}</strong>
            </span>
            <span className="text-purple-700">{student.parentEmail}</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Back to List
          </button>
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenReportModal(student.name)
            }}
            className="px-5 h-9 rounded-xl btn-primary text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>Send Parent Report</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function StudentRosterCard({
  students,
  selectedStudentId,
  onSelectStudent,
  onViewDetails,
  searchQuery,
  setSearchQuery,
}: {
  students: StudentItem[]
  selectedStudentId: string
  onSelectStudent: (student: StudentItem) => void
  onViewDetails: (student: StudentItem) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
}) {
  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [classFilter, setClassFilter] = useState<string>("All")
  const [attendanceFilter, setAttendanceFilter] = useState<string>("All")
  const [progressFilter, setProgressFilter] = useState<string>("All")
  const [sortBy, setSortBy] = useState<string>("name-asc")

  // Counts based on active search & class
  const counts = useMemo(() => {
    return {
      all: students.length,
      excelling: students.filter((s) => s.status === "Excelling").length,
      onTrack: students.filter((s) => s.status === "On Track").length,
      attention: students.filter((s) => s.status === "Needs Attention").length,
    }
  }, [students])

  // Filter and sort students
  const displayedStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return students
      .filter((s) => {
        // Search query across name, rollNumber, email, course, and tags
        if (q) {
          const course = (s.assignedCourse || s.courses?.[0]?.name || "").toLowerCase()
          const email = (s.email || "").toLowerCase()
          const matches =
            s.name.toLowerCase().includes(q) ||
            s.rollNumber.toLowerCase().includes(q) ||
            email.includes(q) ||
            course.includes(q) ||
            s.tags.some((t) => t.toLowerCase().includes(q))
          if (!matches) return false
        }

        // Status filter
        if (statusFilter !== "All" && s.status !== statusFilter) return false

        // Class filter
        if (
          classFilter !== "All" &&
          (s.assignedClass || "Year 4 – Maple Class") !== classFilter
        )
          return false

        // Attendance filter
        if (attendanceFilter === "high" && (s.attendance ?? 0) < 95) return false
        if (
          attendanceFilter === "regular" &&
          ((s.attendance ?? 0) < 90 || (s.attendance ?? 0) >= 95)
        )
          return false
        if (attendanceFilter === "attention" && (s.attendance ?? 0) >= 90)
          return false

        // Progress/Academic filter
        if (progressFilter === "high" && (s.average ?? s.completion ?? 0) < 90)
          return false
        if (
          progressFilter === "onTrack" &&
          ((s.average ?? s.completion ?? 0) < 75 ||
            (s.average ?? s.completion ?? 0) >= 90)
        )
          return false
        if (
          progressFilter === "inProgress" &&
          (s.average ?? s.completion ?? 0) >= 75
        )
          return false

        return true
      })
      .sort((a, b) => {
        if (sortBy === "name-asc") return a.name.localeCompare(b.name)
        if (sortBy === "name-desc") return b.name.localeCompare(a.name)
        if (sortBy === "attendance-desc")
          return (b.attendance ?? 0) - (a.attendance ?? 0)
        if (sortBy === "attendance-asc")
          return (a.attendance ?? 0) - (b.attendance ?? 0)
        if (sortBy === "progress-desc")
          return (b.average ?? 0) - (a.average ?? 0)
        if (sortBy === "progress-asc")
          return (a.average ?? 0) - (b.average ?? 0)
        if (sortBy === "score-desc")
          return (b.average ?? 0) - (a.average ?? 0)
        return 0
      })
  }, [
    students,
    searchQuery,
    statusFilter,
    classFilter,
    attendanceFilter,
    progressFilter,
    sortBy,
  ])

  const isFiltered =
    statusFilter !== "All" ||
    classFilter !== "All" ||
    attendanceFilter !== "All" ||
    progressFilter !== "All" ||
    searchQuery.trim().length > 0 ||
    sortBy !== "name-asc"

  const handleResetFilters = () => {
    setStatusFilter("All")
    setClassFilter("All")
    setAttendanceFilter("All")
    setProgressFilter("All")
    setSortBy("name-asc")
    setSearchQuery("")
  }

  return (
    <section
      className="roster-card panel w-full bg-white"
      aria-label="Assigned Students Roster"
    >
      {/* Top Header & Status Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="card-title text-base">Assigned Students</div>
          <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
            Showing {displayedStudents.length} of {students.length} students
            assigned to your teaching cohorts
          </div>
        </div>

        <div
          className="filter-pills"
          role="tablist"
          aria-label="Filter by student status"
        >
          <button
            className={`filter-pill ${statusFilter === "All" ? "active" : ""}`}
            onClick={() => setStatusFilter("All")}
            aria-selected={statusFilter === "All"}
          >
            All Students ({counts.all})
          </button>
          <button
            className={`filter-pill ${statusFilter === "Excelling" ? "active" : ""
              }`}
            onClick={() => setStatusFilter("Excelling")}
            aria-selected={statusFilter === "Excelling"}
          >
            Excelling ({counts.excelling})
          </button>
          <button
            className={`filter-pill ${statusFilter === "On Track" ? "active" : ""
              }`}
            onClick={() => setStatusFilter("On Track")}
            aria-selected={statusFilter === "On Track"}
          >
            On Track ({counts.onTrack})
          </button>
          <button
            className={`filter-pill ${statusFilter === "Needs Attention" ? "active" : ""
              }`}
            onClick={() => setStatusFilter("Needs Attention")}
            aria-selected={statusFilter === "Needs Attention"}
          >
            Needs Attention ({counts.attention})
          </button>
        </div>
      </div>

      {/* Secondary Filter & Sort Controls Row */}
      <div className="roster-filter-row" aria-label="Student roster controls">
        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="roster-select"
          aria-label="Filter by assigned class"
        >
          <option value="All">All Classes</option>
          <option value="Year 4 – Maple Class">Year 4 – Maple Class</option>
          <option value="Year 4 – Oak Class">Year 4 – Oak Class</option>
        </select>

        {/* Attendance Filter */}
        <select
          value={attendanceFilter}
          onChange={(e) => setAttendanceFilter(e.target.value)}
          className="roster-select"
          aria-label="Filter by attendance status"
        >
          <option value="All">All Attendance</option>
          <option value="high">High Attendance (≥95%)</option>
          <option value="regular">Regular Attendance (90–94%)</option>
          <option value="attention">Needs Attention (&lt;90%)</option>
        </select>

        {/* Progress Filter */}
        <select
          value={progressFilter}
          onChange={(e) => setProgressFilter(e.target.value)}
          className="roster-select"
          aria-label="Filter by academic performance"
        >
          <option value="All">All Performance</option>
          <option value="high">High Performance (≥90%)</option>
          <option value="onTrack">On Track (75–89%)</option>
          <option value="inProgress">Needs Review (&lt;75%)</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="roster-select"
          aria-label="Sort students by"
        >
          <option value="name-asc">Sort: Name (A → Z)</option>
          <option value="name-desc">Sort: Name (Z → A)</option>
          <option value="attendance-desc">Sort: Attendance (High → Low)</option>
          <option value="attendance-asc">Sort: Attendance (Low → High)</option>
          <option value="progress-desc">Sort: Academic Score (High → Low)</option>
          <option value="progress-asc">Sort: Academic Score (Low → High)</option>
        </select>

        {/* Clear Filters Button */}
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

      {/* Roster Table (7 Columns in requested order) */}
      <div className="roster-table-container">
        <div className="roster-table-inner">
          <div className="roster-table-head">
            <span>Student</span>
            <span>Assigned Course & Batch</span>
            <span>Attendance</span>
            <span>Academic Performance</span>
            <span>Assignments</span>
            <span>Last Activity</span>
            <span>Action</span>
          </div>

          {displayedStudents.length === 0 ? (
            <div className="roster-empty-state">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 grid place-items-center mb-1">
                <Icon name="users" size={20} />
              </div>
              <strong className="text-sm text-zinc-800">
                No matching students found
              </strong>
              <p className="text-xs text-zinc-500 max-w-sm">
                {students.length === 0
                  ? "There are currently no students assigned to this teacher roster."
                  : "No students matched your search query or active filter settings."}
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
              {displayedStudents.map((student) => {
                const isSelected = student.id === selectedStudentId
                const courseName =
                  student.assignedCourse ||
                  student.courses?.[0]?.name ||
                  "Year 4 Elementary STEM & AI"
                const batchName =
                  student.batch || "Cohort 4 (Live + Interactive Lab)"
                const deliveryFormat =
                  student.deliveryFormat || "Live + Lab"
                const grade =
                  student.grade || getStudentGrade(student.average ?? 0)
                const pendingCount =
                  student.pendingAssignments ??
                  (student.status === "Needs Attention" ? 3 : 1)
                const completedTasks =
                  student.completedTasks ?? (pendingCount > 0 ? 7 : 10)
                const totalTasks = student.totalTasks ?? 10
                const email =
                  student.email ||
                  `${student.name.toLowerCase().replace(/\s+/g, ".")}@quantumschool.ai`

                return (
                  <div
                    key={student.id}
                    className={`roster-row ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      onSelectStudent(student)
                      onViewDetails(student)
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        onSelectStudent(student)
                        onViewDetails(student)
                      }
                    }}
                    aria-label={`Student ${student.name}, ID ${student.rollNumber}`}
                  >
                    {/* 1. Student */}
                    <div className="flex items-center gap-2.5 min-w-0 pr-1">
                      <img
                        src={student.image || "/assets/student-1.png"}
                        alt={student.name}
                        className="w-8 h-8 rounded-full object-cover border border-purple-200 shrink-0"
                        onError={(e) => {
                          ; (e.target as HTMLImageElement).src =
                            "/assets/student-1.png"
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <strong className="block text-xs font-bold text-zinc-900 truncate">
                          {student.name}
                        </strong>
                        <div className="flex items-center gap-1.5 text-[10.5px] text-zinc-500 font-mono">
                          <span>{student.rollNumber}</span>
                          <span className="text-zinc-300 font-sans">·</span>
                          <span className="truncate text-zinc-400 font-sans">
                            {email}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Assigned Course & Batch */}
                    <div className="min-w-0 pr-1">
                      <strong
                        className="block text-xs font-semibold text-zinc-900 truncate"
                        title={courseName}
                      >
                        {courseName}
                      </strong>
                      <div className="flex items-center gap-1.5 text-[10.5px] text-zinc-500 mt-0.5 truncate">
                        <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-medium text-[9.5px]">
                          {batchName}
                        </span>
                        {deliveryFormat && (
                          <span className="text-zinc-400 text-[10px] hidden xl:inline truncate">
                            ({deliveryFormat})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3. Attendance */}
                    <div className="pr-1">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <strong className="text-xs font-bold text-zinc-800">
                          {student.attendance ?? 0}%
                        </strong>
                        <span
                          className={`text-[9.5px] font-semibold ${(student.attendance ?? 0) >= 95
                            ? "text-emerald-700"
                            : (student.attendance ?? 0) >= 90
                              ? "text-purple-700"
                              : "text-amber-700"
                            }`}
                        >
                          {(student.attendance ?? 0) >= 95
                            ? "High"
                            : (student.attendance ?? 0) >= 90
                              ? "Good"
                              : "Low"}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${(student.attendance ?? 0) >= 95
                            ? "bg-emerald-500"
                            : (student.attendance ?? 0) >= 90
                              ? "bg-purple-600"
                              : "bg-amber-500"
                            }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, student.attendance ?? 0)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* 4. Academic Performance */}
                    <div className="flex items-center gap-2 pr-1">
                      <strong className="text-xs font-bold text-zinc-900">
                        {student.average ?? 0}%
                      </strong>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${grade.startsWith("A")
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : grade.startsWith("B")
                            ? "bg-lime-100 text-lime-900 border border-lime-200"
                            : grade.startsWith("C")
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                      >
                        {grade}
                      </span>
                    </div>

                    {/* 5. Assignments */}
                    <div className="pr-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pendingCount > 0
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                            }`}
                        >
                          {pendingCount > 0
                            ? `${pendingCount} Pending`
                            : "All Done"}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-medium">
                          {completedTasks}/{totalTasks} Tasks
                        </span>
                      </div>
                    </div>

                    {/* 6. Last Activity */}
                    <div className="text-[11px] text-zinc-600 flex items-center gap-1.5 pr-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">
                        {student.lastActivity || "Today"}
                      </span>
                    </div>

                    {/* 7. Action */}
                    <div>
                      <button
                        type="button"
                        className="view-details-btn cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectStudent(student)
                          onViewDetails(student)
                        }}
                        aria-label={`View profile for ${student.name}`}
                      >
                        <span>View Profile →</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default function StudentsPage({
  metrics,
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  students,
  selectedStudentId,
  setSelectedStudentId,
  selectedStudent,
  onOpenReportModal,
}: {
  metrics: MetricItem[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenAddStudent?: () => void
  onOpenAiModal?: () => void
  students: StudentItem[]
  selectedStudentId: string
  setSelectedStudentId: (id: string) => void
  selectedStudent: StudentItem
  activeFilter?: string
  setActiveFilter?: (filter: string) => void
  onOpenReportModal: (studentName: string) => void
  onOpenNewAssignment?: () => void
}) {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [modalStudent, setModalStudent] = useState<StudentItem | null>(null)

  const handleOpenDetails = (student: StudentItem) => {
    setModalStudent(student)
    setSelectedStudentId(student.id)
    setIsDetailsModalOpen(true)
  }

  return (
    <>
      <StudentsHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAiModal={onOpenAiModal}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
        totalCount={students.length}
      />

      {/* Metrics Grid (4 folder tab status cards for Students) */}
      <div className="metrics-grid">
        {metrics.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* Full-width Content Layout: Student Spotlight and Grade Distribution removed so the student list reclaims the full available page area */}
      <StudentRosterCard
        students={students}
        selectedStudentId={selectedStudentId}
        onSelectStudent={(s) => setSelectedStudentId(s.id)}
        onViewDetails={handleOpenDetails}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Comprehensive Student Details Modal / Popup */}
      <StudentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        student={modalStudent || selectedStudent}
        onOpenReportModal={onOpenReportModal}
      />
    </>
  )
}
