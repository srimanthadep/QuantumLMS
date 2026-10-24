import { useState } from "react"
import { Icon } from "../../components/Icon"
import { MetricCard } from "../../components/MetricCard"
import type { AttendanceSubject } from "./studentTypes"
import { attendanceData } from "./studentMockData"

interface AttendancePageProps {
  onToast: (msg: string) => void
}

export function AttendancePage({ onToast }: AttendancePageProps) {
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [selectedSubjectLog, setSelectedSubjectLog] = useState<AttendanceSubject | null>(null)
  const [leaveReason, setLeaveReason] = useState("Medical Appointment")
  const [leaveStartDate, setLeaveStartDate] = useState("2026-10-23")
  const [leaveEndDate, setLeaveEndDate] = useState("2026-10-24")
  const [leaveNotes, setLeaveNotes] = useState("")

  const [leaveRequests, setLeaveRequests] = useState([
    {
      id: "LR-104",
      reason: "Medical Appointment / Clinical Consultation",
      startDate: "2026-10-14",
      endDate: "2026-10-14",
      status: "Approved",
      submittedOn: "Oct 12, 2026",
      notes: "Medical consultation slip verified. Attendance recorded as Excused Absence.",
    },
  ])

  const handleExportCsv = () => {
    const csvHeader = "Course Code,Course Name,Total Classes,Attended,Attendance %\n"
    const csvRows = attendanceData.subjects
      .map((s) => `"${s.code}","${s.name}",${s.totalClasses},${s.attended},${s.percentage}%`)
      .join("\n")
    const blob = new Blob([csvHeader + csvRows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "Attendance_Report_October_2026.csv"
    link.click()
    URL.revokeObjectURL(url)
    onToast("Attendance transcript CSV exported successfully!")
  }

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault()
    const newReq = {
      id: `LR-${Math.floor(100 + Math.random() * 900)}`,
      reason: leaveReason,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      status: "Under Review by Dean",
      submittedOn: "Today, Just now",
      notes: leaveNotes.trim() || "No additional remarks.",
    }
    setLeaveRequests((prev) => [newReq, ...prev])
    setIsLeaveModalOpen(false)
    onToast(
      `Leave request ${newReq.id} submitted for ${leaveStartDate} to ${leaveEndDate}!`,
    )
    setLeaveNotes("")
  }

  // Days of October 2026 (1 to 31)
  const calendarDays = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1
    // Weekends (assuming Oct 2026 starts on Thursday, weekends are Oct 3,4, 10,11, 17,18, 24,25, 31)
    const isWeekend = [3, 4, 10, 11, 17, 18, 24, 25, 31].includes(day)
    let status: "Present" | "Late" | "Absent" | "Weekend" | "Future" = "Present"
    if (isWeekend) status = "Weekend"
    else if (day === 8) status = "Late"
    else if (day === 14) status = "Absent"
    else if (day > 21) status = "Future"
    return { day, status }
  })

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner */}
      <section className="panel" aria-label="Attendance Header">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="card-title">Attendance & Regularity Records</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Above 75% Requirement
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Comprehensive semester attendance records, subject-wise criteria,
            and medical leave history.
          </p>
        </div>
      </section>

      {/* 4 Metric Cards */}
      <section className="metrics-grid" aria-label="Attendance Metrics">
        <MetricCard
          item={{
            label: "Overall Attendance",
            value: `${attendanceData.overallPercentage}%`,
            trend: "↗ +1.4% vs last term",
            tone: "lime",
            icon: "check",
          }}
        />
        <MetricCard
          item={{
            label: "Classes Attended",
            value: `${attendanceData.attendedClasses} / ${attendanceData.totalClasses}`,
            trend: "95.8% present rate",
            tone: "lavender",
            icon: "calendar",
          }}
        />
        <MetricCard
          item={{
            label: "Late Arrivals",
            value: `${attendanceData.lateClasses}`,
            trend: "Within grace limits",
            tone: "yellow",
            icon: "clock",
          }}
        />
        <MetricCard
          item={{
            label: "Excused Absences",
            value: `${attendanceData.absentClasses}`,
            trend: "Medical approved",
            tone: "pink",
            icon: "document",
          }}
        />
      </section>

      {/* Subject-Wise Breakdown Table */}
      <section className="panel" aria-label="Subject Wise Attendance">
        <div className="card-header mb-4">
          <div>
            <h3 className="card-title">Subject-Wise Attendance Breakdown</h3>
            <span className="text-xs text-zinc-500">
              Minimum 75% attendance required for semester final exam
              eligibility
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-2">Subject Code & Title</th>
                <th className="pb-3 text-center">Total Sessions</th>
                <th className="pb-3 text-center">Attended</th>
                <th className="pb-3 text-center">Attendance Rate</th>
                <th className="pb-3 text-center">Eligibility Status</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {attendanceData.subjects.map((subj) => (
                <tr
                  key={subj.id}
                  className="hover:bg-zinc-50/70 transition-colors"
                >
                  <td className="py-3 pl-2">
                    <div className="font-bold text-zinc-900">{subj.name}</div>
                    <div className="text-[11px] text-zinc-400">{subj.code}</div>
                  </td>
                  <td className="py-3 text-center font-bold text-zinc-700">
                    {subj.totalClasses}
                  </td>
                  <td className="py-3 text-center font-bold text-purple-700">
                    {subj.attended}
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-2 max-w-[140px] mx-auto">
                      <div className="w-16 bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full bg-emerald-500"
                          style={{ width: `${subj.percentage}%` }}
                        />
                      </div>
                      <span className="font-black text-xs text-zinc-800">
                        {subj.percentage}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ {subj.status}
                    </span>
                  </td>
                  <td className="py-3 text-right pr-2">
                    <button
                      onClick={() => setSelectedSubjectLog(subj)}
                      className="px-3 py-1 rounded-full border border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-bold transition-all cursor-pointer"
                    >
                      View Log
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Monthly Attendance Calendar */}
      <section className="panel" aria-label="Monthly Calendar">
        <div className="card-header mb-4">
          <h3 className="card-title">October 2026 Regularity Calendar</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{" "}
              Present (46)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late
              (1)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent
              (1)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" /> Recess
            </span>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="min-w-[340px] grid grid-cols-7 gap-2 text-center text-xs">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
              <div
                key={dayName}
                className="font-bold text-zinc-400 py-1 text-[11px] uppercase"
              >
                {dayName}
              </div>
            ))}

            {/* Empty spacer for Thursday start (Oct 1 2026 is Thursday = 4 empty cells) */}
            <div />
            <div />
            <div />
            <div />

            {calendarDays.map((item) => {
              const isToday = item.day === 21
              return (
                <div
                  key={item.day}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-between transition-all ${
                    isToday
                      ? "border-purple-600 bg-purple-50 shadow-sm"
                      : item.status === "Present"
                        ? "border-emerald-100 bg-emerald-50/40"
                        : item.status === "Late"
                          ? "border-amber-200 bg-amber-50"
                          : item.status === "Absent"
                            ? "border-rose-200 bg-rose-50"
                            : item.status === "Weekend"
                              ? "border-zinc-100 bg-zinc-50 text-zinc-400"
                              : "border-zinc-100 bg-white"
                  }`}
                >
                  <span
                    className={`font-bold text-xs ${
                      isToday ? "text-purple-700" : "text-zinc-800"
                    }`}
                  >
                    {item.day}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 ${
                      item.status === "Present"
                        ? "bg-emerald-500"
                        : item.status === "Late"
                          ? "bg-amber-500"
                          : item.status === "Absent"
                            ? "bg-rose-500"
                            : "bg-transparent"
                    }`}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Submitted Leave Requests Section */}
      <section className="panel" aria-label="Leave Requests History">
        <div className="card-header mb-4">
          <div>
            <h3 className="card-title">Submitted Leave Requests & Medical Slips ({leaveRequests.length})</h3>
            <span className="text-[11px] text-zinc-500">Official absence excuses tracked by Office of Academic Affairs</span>
          </div>
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="px-3.5 py-1.5 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors cursor-pointer shadow-sm"
          >
            + New Leave Request
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Request ID</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Submitted On</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {leaveRequests.map((req) => (
                <tr key={req.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-purple-700">{req.id}</td>
                  <td className="py-3 px-3 font-bold text-zinc-900">{req.reason}</td>
                  <td className="py-3 px-3 text-zinc-600">{req.startDate} {req.startDate !== req.endDate ? `to ${req.endDate}` : ""}</td>
                  <td className="py-3 px-3 text-zinc-500">{req.submittedOn}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === "Approved"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      {req.status === "Approved" ? "✓ Approved" : "⏳ Under Review"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-zinc-500 text-[11px] max-w-xs truncate">{req.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Leave Request Modal */}
      {isLeaveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsLeaveModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  Academic Affairs · Form
                </span>
                <h3 className="font-bold text-lg text-zinc-900">
                  Request Leave / Absence
                </h3>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <form
              onSubmit={handleSubmitLeave}
              className="flex flex-col gap-3 text-xs"
            >
              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Reason for Absence
                </label>
                <select
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
                >
                  <option value="Medical Appointment">
                    Medical Appointment / Illness
                  </option>
                  <option value="Academic Conference">
                    Academic Conference / Hackathon
                  </option>
                  <option value="Family Emergency">
                    Family / Personal Emergency
                  </option>
                  <option value="Other">Other Permitted Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-zinc-200 bg-white text-zinc-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-zinc-200 bg-white text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Supporting Notes / Medical Slip
                </label>
                <textarea
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  placeholder="Provide supporting details for the attendance coordinator and instructor..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-purple-700 text-white font-bold hover:bg-purple-800 cursor-pointer shadow-sm"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Attendance Log Modal */}
      {selectedSubjectLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedSubjectLog(null)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  {selectedSubjectLog.code} • Attendance Record
                </span>
                <h3 className="font-bold text-lg text-zinc-900">
                  {selectedSubjectLog.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSubjectLog(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs mb-5">
              <div className="grid grid-cols-3 gap-2 p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-center">
                <div>
                  <span className="text-[10px] text-zinc-400 block font-semibold">Total Sessions</span>
                  <strong className="text-zinc-800 text-sm">{selectedSubjectLog.totalClasses}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block font-semibold">Attended</span>
                  <strong className="text-purple-700 text-sm">{selectedSubjectLog.attended}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block font-semibold">Regularity</span>
                  <strong className="text-emerald-700 text-sm">{selectedSubjectLog.percentage}%</strong>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="font-bold text-zinc-700 block mb-2">Recent Session Check-ins:</span>
                <div className="flex flex-col gap-2">
                  {[
                    { date: "Oct 21, 2026", time: "10:00 AM", topic: "Lecture 14 · Embeddings & Vector Indexing", status: "Present" },
                    { date: "Oct 19, 2026", time: "10:00 AM", topic: "Lab 6 · FAISS Retrieval Benchmark", status: "Present" },
                    { date: "Oct 16, 2026", time: "10:00 AM", topic: "Lecture 13 · Cross-Encoder Re-Ranking", status: "Present" },
                    { date: "Oct 14, 2026", time: "10:00 AM", topic: "Lecture 12 · BM25 & Dense Fusion", status: "Late (Grace)" },
                  ].map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-zinc-100 text-[11px]">
                      <div>
                        <strong className="text-zinc-900 block">{s.topic}</strong>
                        <span className="text-zinc-400">{s.date} • {s.time}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        s.status === "Present"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                onClick={() => setSelectedSubjectLog(null)}
                className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onToast(`Exported full session history for ${selectedSubjectLog.name} (.csv)`)
                  setSelectedSubjectLog(null)
                }}
                className="px-5 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 cursor-pointer shadow-sm"
              >
                Export Subject Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
