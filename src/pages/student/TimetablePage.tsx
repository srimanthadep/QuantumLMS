import { useState } from "react"
import { Icon } from "../../components/Icon"
import type { TimetableSlot } from "./studentTypes"
import { timetableSchedule } from "./studentMockData"

interface TimetablePageProps {
  onToast: (msg: string) => void
}

export function TimetablePage({ onToast }: TimetablePageProps) {
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

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner with Actions */}
      <section className="panel" aria-label="Timetable Controls">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title">Class Timetable & Schedule</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                Fall Semester 2026
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Weekly lecture schedule, laboratory hours, live broadcasts, and
              office sessions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const timetableText =
                  "===========================================================\n" +
                  "           QUANTUM SCHOOL OF AI - CLASS TIMETABLE          \n" +
                  "===========================================================\n" +
                  "Semester: Fall 2026 | Student: Srimanth (QS-2024-8821)\n\n" +
                  timetableSchedule
                    .map((s) => `[${s.day}] ${s.time} | ${s.courseCode}: ${s.courseName} | Instructor: ${s.instructor} | Room: ${s.room} (${s.isOnline ? "Virtual" : "Campus"})`)
                    .join("\n") +
                  "\n===========================================================\n"
                const blob = new Blob([timetableText], { type: "text/plain;charset=utf-8;" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = "Quantum_Timetable_Fall_2026.txt"
                a.click()
                URL.revokeObjectURL(url)
                onToast("Class timetable schedule downloaded successfully! 📅")
              }}
              className="px-3.5 py-1.5 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="document" size={13} />
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => {
                const icsContent =
                  "BEGIN:VCALENDAR\n" +
                  "VERSION:2.0\n" +
                  "PRODID:-//Quantum School of AI//Student Portal//EN\n" +
                  timetableSchedule
                    .map(
                      (s, i) =>
                        `BEGIN:VEVENT\n` +
                        `UID:quantum-${s.id}-${i}@quantumschool.ai\n` +
                        `SUMMARY:${s.courseCode} - ${s.courseName}\n` +
                        `DESCRIPTION:Instructor: ${s.instructor}. Room: ${s.room}\n` +
                        `LOCATION:${s.room}\n` +
                        `STATUS:CONFIRMED\n` +
                        `END:VEVENT\n`,
                    )
                    .join("") +
                  "END:VCALENDAR\n"
                const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8;" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = "Quantum_Lectures_Fall_2026.ics"
                a.click()
                URL.revokeObjectURL(url)
                onToast("Timetable iCal (.ics) exported and synced successfully! 📲")
              }}
              className="px-4 py-1.5 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Icon name="calendar" size={13} />
              <span>Sync Calendar (.ics)</span>
            </button>
          </div>
        </div>

        {/* Day Filter Pills */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-zinc-100 overflow-x-auto pb-1 sm:pb-0">
          {([
            "All",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ] as const).map((day) => {
            const isToday = day === "Tuesday"
            const isActive = selectedDay === day
            return (
              <button
                key={day}
                className={`filter-pill ${isActive ? "active" : ""}`}
                onClick={() => setSelectedDay(day)}
              >
                {day === "All" ? "Full Week" : day} {isToday ? "(Today)" : ""}
              </button>
            )
          })}
        </div>
      </section>

      {/* Today's Active / Live Class Bar */}
      <section className="panel p-5 bg-white border border-zinc-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F0EDFF] flex items-center justify-center text-[#905FEB] border border-purple-200/80">
              <Icon name="radio" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6330BD]">
                  Featured Live Lecture · Today
                </span>
              </div>
              <h4 className="text-lg font-black text-[#2E075F] mt-0.5">
                Building AI Agents with LangChain & LangGraph
              </h4>
              <p className="text-xs text-[#514B68] font-medium">
                Instructor: Srimanth • 06:00 PM - 07:30 PM • Broadcast Studio &
                Virtual Room
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onToast(
                  "Launching live classroom stream for 'Building AI Agents'...",
                )
              }
              className="px-5 py-2.5 rounded-full bg-white text-purple-900 text-xs font-black hover:bg-purple-50 transition-all shadow-md cursor-pointer flex items-center gap-2 border border-purple-100"
            >
              <span>▶ Join Live Stream</span>
            </button>
            <button
              onClick={() =>
                onToast("Class link and materials copied to clipboard!")
              }
              className="px-3.5 py-2.5 rounded-full border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-all cursor-pointer"
            >
              Copy Link
            </button>
          </div>
        </div>
      </section>

      {/* Timetable Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSlots.map((slot) => {
          const isToday = slot.day === "Tuesday"
          return (
            <div
              key={slot.id}
              onClick={() => setActiveSlot(slot)}
              className={`panel p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all border ${
                slot.status === "Live Now"
                  ? "border-purple-400 bg-purple-50/30"
                  : isToday
                    ? "border-zinc-200 bg-white"
                    : "border-zinc-100 bg-white"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                    {slot.day}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      slot.status === "Live Now"
                        ? "bg-emerald-100 text-emerald-700 animate-pulse"
                        : slot.status === "Upcoming"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {slot.status}
                  </span>
                </div>

                <div className="text-xs font-bold text-purple-700 mb-1 flex items-center gap-1.5">
                  <Icon name="clock" size={12} />
                  <span>{slot.time}</span>
                </div>

                <h4 className="font-bold text-sm text-zinc-900 leading-snug">
                  {slot.courseName}
                </h4>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Code:{" "}
                  <strong className="text-zinc-700">{slot.courseCode}</strong> •
                  Instructor: {slot.instructor}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                <span className="text-zinc-500 flex items-center gap-1">
                  <span>📍</span>
                  <span>{slot.room}</span>
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (slot.status === "Live Now" || slot.isOnline) {
                      onToast(
                        `Connecting to ${slot.courseName} virtual room...`,
                      )
                    } else {
                      setActiveSlot(slot)
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    slot.status === "Live Now"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {slot.status === "Live Now" ? "Join" : "Details"}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Class Details Modal */}
      {activeSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setActiveSlot(null)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  {activeSlot.courseCode} • Class Details
                </span>
                <h3 className="font-bold text-lg text-zinc-900">
                  {activeSlot.courseName}
                </h3>
              </div>
              <button
                onClick={() => setActiveSlot(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs mb-6">
              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 flex justify-between items-center">
                <span className="text-zinc-600">Scheduled Time:</span>
                <strong className="text-purple-800">
                  {activeSlot.day}, {activeSlot.time}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex justify-between items-center">
                <span className="text-zinc-600">Location / Platform:</span>
                <strong className="text-zinc-900">
                  {activeSlot.room} (
                  {activeSlot.isOnline ? "Virtual Stream" : "On Campus"})
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex justify-between items-center">
                <span className="text-zinc-600">Instructor:</span>
                <strong className="text-zinc-900">
                  {activeSlot.instructor} (Office Hours: Wed 5:00 PM)
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <strong className="text-zinc-900 block mb-1">
                  Pre-reading Material:
                </strong>
                <p className="text-zinc-600">
                  Please review the Module 4 RAG Architecture slides and
                  complete Coding Lab 3 before entering the session.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActiveSlot(null)}
                className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onToast(
                    `Launching classroom session for "${activeSlot.courseName}"...`,
                  )
                  setActiveSlot(null)
                }}
                className="px-5 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 cursor-pointer shadow-sm"
              >
                Enter Virtual Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
