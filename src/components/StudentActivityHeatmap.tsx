import React, { useState, useMemo } from "react"
import type { StudentItem, StudentDayActivity } from "../types"
import { getStudentActivityHeatmap } from "../data/studentActivityData"
import { Icon } from "./Icon"

const DAY_LABELS = [
  { label: "Sun", show: false },
  { label: "Mon", show: true },
  { label: "Tue", show: false },
  { label: "Wed", show: true },
  { label: "Thu", show: false },
  { label: "Fri", show: true },
  { label: "Sat", show: false },
]

export function StudentActivityHeatmap({ student }: { student: StudentItem }) {
  const summary = useMemo(() => getStudentActivityHeatmap(student), [student])
  
  // Flatten all days to easily find selected day
  const allDays = useMemo(() => {
    return summary.weeks.flatMap((w) => w.days)
  }, [summary])

  // Default selected day to the most recent active day or today
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const active = allDays.filter((d) => d.count > 0)
    return active.length > 0 ? active[active.length - 1].date : allDays[allDays.length - 1]?.date || "2026-10-22"
  })

  // Hovered day for tooltips
  const [hoveredDay, setHoveredDay] = useState<StudentDayActivity | null>(null)

  // Find currently selected day
  const currentSelectedDay = useMemo(() => {
    return allDays.find((d) => d.date === selectedDate) || null
  }, [allDays, selectedDate])

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return ""
    try {
      const parts = dateStr.split("-")
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  // Cell color classes corresponding to activity levels
  const getCellColorClass = (level: number) => {
    switch (level) {
      case 1:
        return "bg-purple-200 border-purple-300 hover:ring-2 hover:ring-purple-400"
      case 2:
        return "bg-purple-400 border-purple-500 hover:ring-2 hover:ring-purple-500"
      case 3:
        return "bg-purple-600 border-purple-700 hover:ring-2 hover:ring-purple-600"
      case 4:
        return "bg-purple-900 border-purple-950 hover:ring-2 hover:ring-purple-900"
      case 0:
      default:
        return "bg-zinc-100/90 border-zinc-200/80 hover:ring-2 hover:ring-zinc-300"
    }
  }

  return (
    <div className="mt-3.5 p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-150 shadow-xs">
      {/* Header with Title and Demo Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
              <Icon name="activity" size={14} />
              <span>Learning Activity Heatmap</span>
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
              12-Week Rolling Window
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Daily engagement across video lessons, course materials, lab worksheets, quizzes, and assignment submissions.
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
            Simulated Demo Analytics
          </span>
        </div>
      </div>

      {/* 4 Summary Metric Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5">
        <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-center">
          <span className="text-[9.5px] font-semibold text-purple-900 uppercase tracking-wide">
            Active Days
          </span>
          <strong className="block text-base font-bold text-purple-950 mt-0.5">
            {summary.totalActiveDays} <span className="text-[10px] text-purple-600 font-normal">/ 84</span>
          </strong>
          <span className="text-[9px] text-purple-700">
            {Math.round((summary.totalActiveDays / 84) * 100)}% Consistency
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-lime-50/60 border border-lime-100 text-center">
          <span className="text-[9.5px] font-semibold text-lime-900 uppercase tracking-wide">
            Recorded Activities
          </span>
          <strong className="block text-base font-bold text-lime-950 mt-0.5">
            {summary.totalActivities}
          </strong>
          <span className="text-[9px] text-lime-700">Total Learning Events</span>
        </div>

        <div className="p-2.5 rounded-xl bg-yellow-50/60 border border-yellow-100 text-center">
          <span className="text-[9.5px] font-semibold text-yellow-900 uppercase tracking-wide">
            Current Streak
          </span>
          <strong className="block text-base font-bold text-yellow-950 mt-0.5">
            {summary.currentStreakDays} {summary.currentStreakDays === 1 ? "Day" : "Days"}
          </strong>
          <span className="text-[9px] text-yellow-700">
            Peak: {summary.longestStreakDays} days
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
          <span className="text-[9.5px] font-semibold text-zinc-600 uppercase tracking-wide">
            Last Active Date
          </span>
          <strong className="block text-xs font-bold text-zinc-800 mt-1 truncate">
            {formatDateDisplay(summary.mostRecentDate)}
          </strong>
          <span className="text-[9px] text-zinc-500">Latest Sync</span>
        </div>
      </div>

      {/* Heatmap Grid Container */}
      <div className="p-3 bg-zinc-50/70 rounded-xl border border-zinc-200 overflow-x-auto">
        <div className="min-w-[460px]">
          {/* Month Labels Header */}
          <div className="flex text-[10px] font-semibold text-zinc-500 mb-1 pl-7">
            {summary.weeks.map((week, idx) => (
              <div key={idx} className="w-[30px] shrink-0 text-left">
                {week.monthLabel ? (
                  <span className="font-bold text-zinc-700">{week.monthLabel}</span>
                ) : null}
              </div>
            ))}
          </div>

          {/* Grid Rows (7 rows, one for each day of week) */}
          <div className="flex">
            {/* Day of Week Labels (Left Column) */}
            <div className="flex flex-col gap-1 w-7 shrink-0 text-[9px] font-semibold text-zinc-400 justify-between py-0.5">
              {DAY_LABELS.map((d, i) => (
                <div key={i} className="h-3 flex items-center leading-none">
                  {d.show ? d.label : ""}
                </div>
              ))}
            </div>

            {/* Weeks Columns (12 columns) */}
            <div className="flex gap-1 flex-1">
              {summary.weeks.map((week) => (
                <div key={week.weekIndex} className="flex flex-col gap-1 shrink-0 w-[26px]">
                  {week.days.map((day) => {
                    const isSelected = selectedDate === day.date
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => setSelectedDate(day.date)}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`h-3 w-full rounded-[3px] border transition-all cursor-pointer relative ${getCellColorClass(
                          day.level
                        )} ${isSelected ? "ring-2 ring-purple-900 ring-offset-1 z-10 scale-105" : ""}`}
                        title={`${formatDateDisplay(day.date)}: ${day.count} activities`}
                        aria-label={`${formatDateDisplay(day.date)}: ${day.count} activities`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend and Hover Hint */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-200/80 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1.5 text-zinc-600">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-600" />
              {hoveredDay ? (
                <span>
                  <strong className="text-zinc-900">{formatDateDisplay(hoveredDay.date)}</strong>:{" "}
                  {hoveredDay.count} {hoveredDay.count === 1 ? "activity" : "activities"}
                </span>
              ) : (
                <span>Click or hover on any cell to inspect daily events</span>
              )}
            </span>

            {/* 5-tier Legend */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9.5px] text-zinc-400">No Activity</span>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-zinc-100 border border-zinc-200" title="0 activities" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-purple-200 border border-purple-300" title="1-2 activities" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-purple-400 border border-purple-500" title="3-4 activities" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-purple-600 border border-purple-700" title="5-6 activities" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-purple-900 border border-purple-950" title="7+ activities" />
              </div>
              <span className="text-[9.5px] text-zinc-700 font-semibold">High Activity</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Day Activity Details Panel */}
      <div className="mt-3 p-3 rounded-xl bg-purple-50/40 border border-purple-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-900">
              {currentSelectedDay ? formatDateDisplay(currentSelectedDay.date) : "Selected Date"}
            </span>
            {currentSelectedDay && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                currentSelectedDay.count > 0 ? "bg-purple-100 text-purple-800" : "bg-zinc-200 text-zinc-600"
              }`}>
                {currentSelectedDay.count} {currentSelectedDay.count === 1 ? "Event Recorded" : "Events Recorded"}
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-400">
            {currentSelectedDay?.date === "2026-10-22" ? "Today" : "Historical Record"}
          </span>
        </div>

        {/* List of activities for the selected date */}
        {currentSelectedDay && currentSelectedDay.events.length > 0 ? (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {currentSelectedDay.events.map((ev) => (
              <div
                key={ev.id}
                className="p-2 rounded-lg bg-white border border-purple-100 flex items-start justify-between gap-2 text-xs hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded-md grid place-items-center text-[10px] shrink-0 mt-0.5 ${
                    ev.type === "assignment_submitted"
                      ? "bg-emerald-100 text-emerald-800"
                      : ev.type === "quiz_attempted"
                      ? "bg-amber-100 text-amber-800"
                      : ev.type === "video_watched"
                      ? "bg-sky-100 text-sky-800"
                      : ev.type === "material_opened"
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-purple-100 text-purple-800"
                  }`}>
                    {ev.type === "assignment_submitted" ? "📝" :
                     ev.type === "quiz_attempted" ? "⚡" :
                     ev.type === "video_watched" ? "▶" :
                     ev.type === "material_opened" ? "📄" : "✓"}
                  </span>
                  <div className="min-w-0">
                    <strong className="block text-zinc-900 truncate text-[11px] font-semibold">
                      {ev.title}
                    </strong>
                    {ev.detail && (
                      <span className="block text-[10px] text-zinc-500 leading-tight">
                        {ev.detail}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                    {ev.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center bg-white/70 rounded-lg border border-purple-100/60 text-xs text-zinc-500">
            <span className="text-zinc-400 block mb-0.5">☕ No learning activity recorded on this day.</span>
            <span className="text-[10px] text-zinc-400">
              The student had no logged video streams, quizzes, or assignment submissions on this calendar date.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
