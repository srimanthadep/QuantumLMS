import { useState, useMemo } from "react"
import type { LiveAttendanceRecord, AttendanceStatus, LiveSessionItem } from "../types"
import { Icon } from "./Icon"

interface AttendanceSectionProps {
  sessions: LiveSessionItem[]
  activeSessionId?: string
  records: LiveAttendanceRecord[]
  onToast?: (msg: string) => void
  isStudioMode?: boolean
}

export default function AttendanceSection({
  sessions,
  activeSessionId,
  records,
  onToast,
  isStudioMode = false,
}: AttendanceSectionProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    return activeSessionId || (sessions[0]?.id ?? "ls-1")
  })

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [sortBy, setSortBy] = useState<string>("name-asc")

  // Selected Student for Detail Modal
  const [detailStudent, setDetailStudent] = useState<LiveAttendanceRecord | null>(null)

  // Current session object
  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || sessions[0]
  }, [sessions, selectedSessionId])

  // Filter records for selected session
  const sessionRecords = useMemo(() => {
    return records.filter((r) => isStudioMode || r.sessionId === selectedSessionId)
  }, [records, selectedSessionId, isStudioMode])

  // Summary Metrics calculated dynamically from session dataset
  const metrics = useMemo(() => {
    const total = sessionRecords.length
    const present = sessionRecords.filter((r) => r.status === "Present").length
    const late = sessionRecords.filter((r) => r.status === "Late").length
    const absent = sessionRecords.filter((r) => r.status === "Absent").length
    const leftEarly = sessionRecords.filter((r) => r.status === "Left Early").length
    const attendedCount = present + late + leftEarly
    const attendancePercentage = total > 0 ? Math.round((attendedCount / total) * 100) : 0

    return { total, present, late, absent, leftEarly, attendancePercentage }
  }, [sessionRecords])

  // Filtered and Sorted Table Records
  const displayedRecords = useMemo(() => {
    return sessionRecords
      .filter((rec) => {
        if (statusFilter !== "All" && rec.status !== statusFilter) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          return (
            rec.studentName.toLowerCase().includes(q) ||
            rec.studentRoll.toLowerCase().includes(q) ||
            rec.email.toLowerCase().includes(q) ||
            (rec.notes && rec.notes.toLowerCase().includes(q))
          )
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === "name-asc") return a.studentName.localeCompare(b.studentName)
        if (sortBy === "name-desc") return b.studentName.localeCompare(a.studentName)
        if (sortBy === "duration-desc") return b.durationMinutes - a.durationMinutes
        if (sortBy === "duration-asc") return a.durationMinutes - b.durationMinutes
        if (sortBy === "status") return a.status.localeCompare(b.status)
        return 0
      })
  }, [sessionRecords, statusFilter, searchQuery, sortBy])

  const isFiltered = statusFilter !== "All" || searchQuery.trim().length > 0 || sortBy !== "name-asc"

  const handleResetFilters = () => {
    setStatusFilter("All")
    setSearchQuery("")
    setSortBy("name-asc")
  }

  // Export to CSV client-side generator
  const handleExportCsv = () => {
    if (displayedRecords.length === 0) {
      onToast?.("No records available to export.")
      return
    }

    const headers = ["Student Name", "Student ID", "Email", "Status", "Join Time", "Leave Time", "Duration", "Device", "Notes"]
    const rows = displayedRecords.map((r) => [
      `"${r.studentName}"`,
      `"${r.studentRoll}"`,
      `"${r.email}"`,
      `"${r.status}"`,
      `"${r.joinTime}"`,
      `"${r.leaveTime}"`,
      `"${r.durationFormatted}"`,
      `"${r.deviceUsed || "N/A"}"`,
      `"${(r.notes || "").replace(/"/g, '""')}"`,
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Attendance_${currentSession?.courseCode || "LiveClass"}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    onToast?.(`Downloaded attendance CSV (${displayedRecords.length} records).`)
  }

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "Present":
        return "bg-emerald-50 text-emerald-800 border-emerald-200"
      case "Late":
        return "bg-amber-50 text-amber-800 border-amber-200"
      case "Left Early":
        return "bg-purple-50 text-purple-800 border-purple-200"
      case "Absent":
        return "bg-rose-50 text-rose-800 border-rose-200"
    }
  }

  return (
    <div className={`space-y-4 ${isStudioMode ? "text-white" : "text-zinc-900"}`}>
      {/* 1. Header & Session Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`text-base font-bold ${isStudioMode ? "text-white" : "text-zinc-900"}`}>
              Live Class Attendance
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
              {metrics.total} Enrolled Students
            </span>
            <span className="text-[10px] text-zinc-400 font-semibold bg-gray-100 px-2 py-0.5 rounded-full">
              Simulated Attendance Roster
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isStudioMode ? "text-zinc-400" : "text-zinc-500"}`}>
            Track student join times, departure timestamps, durations, and export attendance rosters.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isStudioMode && (
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="roster-select text-xs font-semibold"
              aria-label="Select session for attendance"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.courseCode}: {s.title}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 h-8.5 rounded-xl border border-gray-200 hover:border-purple-300 bg-white hover:bg-purple-50/50 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Export displayed attendance table to CSV"
          >
            <Icon name="download" size={14} />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Attendance Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Enrolled */}
        <div
          className={`p-3.5 rounded-2xl border ${
            isStudioMode ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-150 shadow-xs"
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
            Total Enrolled
          </span>
          <span className={`text-xl sm:text-2xl font-black ${isStudioMode ? "text-white" : "text-zinc-900"}`}>
            {metrics.total}
          </span>
          <span className="text-[10.5px] text-zinc-500 block mt-0.5">Cohort Roster</span>
        </div>

        {/* Present */}
        <div
          className={`p-3.5 rounded-2xl border ${
            isStudioMode ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-150 shadow-xs"
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 block mb-1">
            Present
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600">
            {metrics.present}
          </span>
          <span className="text-[10.5px] text-zinc-500 block mt-0.5">On time (100% duration)</span>
        </div>

        {/* Late */}
        <div
          className={`p-3.5 rounded-2xl border ${
            isStudioMode ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-150 shadow-xs"
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 block mb-1">
            Late Arrival
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-600">
            {metrics.late}
          </span>
          <span className="text-[10.5px] text-zinc-500 block mt-0.5">&gt;10 mins late</span>
        </div>

        {/* Absent */}
        <div
          className={`p-3.5 rounded-2xl border ${
            isStudioMode ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-150 shadow-xs"
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 block mb-1">
            Absent
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-600">
            {metrics.absent}
          </span>
          <span className="text-[10.5px] text-zinc-500 block mt-0.5">Excused absence</span>
        </div>

        {/* Attendance Percentage */}
        <div
          className={`p-3.5 rounded-2xl border col-span-2 sm:col-span-1 ${
            isStudioMode ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-150 shadow-xs"
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700 block mb-1">
            Attendance Rate
          </span>
          <span className="text-xl sm:text-2xl font-black text-purple-700">
            {metrics.attendancePercentage}%
          </span>
          <span className="text-[10.5px] text-zinc-500 block mt-0.5">
            {metrics.present + metrics.late + metrics.leftEarly} of {metrics.total} attended
          </span>
        </div>
      </div>

      {/* 3. Search, Filter & Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Status Filter Pills */}
        <div className="filter-pills flex-wrap" role="tablist" aria-label="Filter attendance by status">
          <button
            className={`filter-pill ${statusFilter === "All" ? "active" : ""}`}
            onClick={() => setStatusFilter("All")}
            aria-selected={statusFilter === "All"}
          >
            All Students ({sessionRecords.length})
          </button>
          <button
            className={`filter-pill ${statusFilter === "Present" ? "active" : ""}`}
            onClick={() => setStatusFilter("Present")}
            aria-selected={statusFilter === "Present"}
          >
            Present ({metrics.present})
          </button>
          <button
            className={`filter-pill ${statusFilter === "Late" ? "active" : ""}`}
            onClick={() => setStatusFilter("Late")}
            aria-selected={statusFilter === "Late"}
          >
            Late ({metrics.late})
          </button>
          <button
            className={`filter-pill ${statusFilter === "Left Early" ? "active" : ""}`}
            onClick={() => setStatusFilter("Left Early")}
            aria-selected={statusFilter === "Left Early"}
          >
            Left Early ({metrics.leftEarly})
          </button>
          <button
            className={`filter-pill ${statusFilter === "Absent" ? "active" : ""}`}
            onClick={() => setStatusFilter("Absent")}
            aria-selected={statusFilter === "Absent"}
          >
            Absent ({metrics.absent})
          </button>
        </div>

        {/* Search, Sort and Clear */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="search-box !h-8.5 !min-w-[180px] max-w-xs">
            <Icon name="search" size={13} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or ID..."
              className="text-xs"
              aria-label="Search attendance"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-zinc-400 hover:text-zinc-700 px-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="roster-select text-xs"
            aria-label="Sort attendance table"
          >
            <option value="name-asc">Sort: Name (A-Z)</option>
            <option value="name-desc">Sort: Name (Z-A)</option>
            <option value="duration-desc">Sort: Duration (High to Low)</option>
            <option value="duration-asc">Sort: Duration (Low to High)</option>
            <option value="status">Sort: Status</option>
          </select>

          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="clear-filters-btn cursor-pointer"
              aria-label="Clear attendance filters"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* 4. Attendance Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-150 bg-white shadow-xs">
        {displayedRecords.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            No student records match your selected filter or search criteria.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-zinc-500 font-bold text-[10.5px] uppercase tracking-wider">
                <th className="py-3 px-3.5">Student</th>
                <th className="py-3 px-3">Student ID</th>
                <th className="py-3 px-3">Join Time</th>
                <th className="py-3 px-3">Leave Time</th>
                <th className="py-3 px-3">Duration Attended</th>
                <th className="py-3 px-3">Attendance Status</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedRecords.map((st) => (
                <tr
                  key={st.id}
                  className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                  onClick={() => setDetailStudent(st)}
                >
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={st.studentAvatar || "/assets/student-1.png"}
                        alt={st.studentName}
                        className="w-7 h-7 rounded-lg object-cover border border-gray-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <strong className="block text-xs text-zinc-900 group-hover:text-purple-700 transition-colors truncate">
                          {st.studentName}
                        </strong>
                        <span className="text-[10px] text-zinc-400 truncate block">
                          {st.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-3 font-mono text-zinc-600 text-[11px]">
                    {st.studentRoll}
                  </td>

                  <td className="py-2.5 px-3 font-mono text-zinc-700">
                    {st.joinTime}
                  </td>

                  <td className="py-2.5 px-3 font-mono text-zinc-700">
                    {st.leaveTime}
                  </td>

                  <td className="py-2.5 px-3 font-semibold text-zinc-800">
                    {st.durationFormatted}
                  </td>

                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(st.status)}`}>
                      {st.status}
                    </span>
                  </td>

                  <td className="py-2.5 px-3.5 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDetailStudent(st)
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="p-3 bg-gray-50 border-t border-gray-150 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Showing <strong>{displayedRecords.length}</strong> of <strong>{sessionRecords.length}</strong> students
          </span>
          <span className="text-[11px] text-zinc-400">
            Attendance recorded during live broadcast · Quantum LMS
          </span>
        </div>
      </div>

      {/* 5. Student Attendance Details Modal */}
      {detailStudent && (
        <div
          className="modal-overlay z-50"
          role="dialog"
          aria-modal="true"
          aria-label={`Attendance details for ${detailStudent.studentName}`}
        >
          <div
            className="modal-content text-zinc-900"
            style={{ maxWidth: "500px", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-150">
              <div className="flex items-center gap-2.5">
                <img
                  src={detailStudent.studentAvatar || "/assets/student-1.png"}
                  alt={detailStudent.studentName}
                  className="w-10 h-10 rounded-xl object-cover border border-purple-200"
                />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    {detailStudent.studentName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="font-mono font-bold text-purple-700">{detailStudent.studentRoll}</span>
                    <span>·</span>
                    <span>{detailStudent.email}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailStudent(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-zinc-600 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Attendance Details Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-150">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block mb-0.5">
                  Attendance Status
                </span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border mt-0.5 ${getStatusBadge(detailStudent.status)}`}>
                  {detailStudent.status}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-150">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block mb-0.5">
                  Duration Attended
                </span>
                <strong className="text-sm text-zinc-900 block mt-0.5">
                  {detailStudent.durationFormatted} ({detailStudent.durationMinutes} minutes)
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-150">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block mb-0.5">
                  Join Timestamp
                </span>
                <span className="font-mono text-zinc-800 text-xs font-semibold block mt-0.5">
                  {detailStudent.joinTime}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-150">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block mb-0.5">
                  Leave Timestamp
                </span>
                <span className="font-mono text-zinc-800 text-xs font-semibold block mt-0.5">
                  {detailStudent.leaveTime}
                </span>
              </div>
            </div>

            {/* Device & Engagement */}
            <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-150 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Connected Device / Browser:</span>
                <span className="font-semibold text-zinc-800">{detailStudent.deviceUsed || "Desktop (Chrome)"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">In-Session Hand Raises:</span>
                <span className="font-semibold text-purple-700">{detailStudent.handRaisesCount ?? 1} times</span>
              </div>
            </div>

            {/* Attendance Notes */}
            {detailStudent.notes && (
              <div className="mt-3 p-3 rounded-xl bg-purple-50/50 border border-purple-200 text-xs">
                <span className="text-purple-900 font-bold block mb-1">
                  Teacher & System Notes:
                </span>
                <p className="text-purple-800/90 leading-relaxed">
                  {detailStudent.notes}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-150">
              <span className="text-[11px] text-zinc-400">
                Verified attendance log · Autumn Term 2026
              </span>
              <button
                type="button"
                onClick={() => setDetailStudent(null)}
                className="px-4 h-8.5 rounded-xl btn-primary text-xs font-bold cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
