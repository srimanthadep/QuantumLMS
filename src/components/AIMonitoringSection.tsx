import { useState } from "react"
import type { AIMonitoringData, AIMonitoringSuggestion } from "../types"
import { Icon } from "./Icon"

interface AIMonitoringSectionProps {
  monitoringData: AIMonitoringData
  onDismissSuggestion?: (id: string) => void
  onToast?: (msg: string) => void
  isStudioMode?: boolean
}

export default function AIMonitoringSection({
  monitoringData,
  onDismissSuggestion,
  onToast,
  isStudioMode = false,
}: AIMonitoringSectionProps) {
  const [data, setData] = useState<AIMonitoringData>(monitoringData)
  const [lastRefreshed, setLastRefreshed] = useState<string>("Just now (Live)")
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  const handleRefresh = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    setLastRefreshed(timeStr)
    // Slightly fluctuate engagement score realistically within bounds
    setData((prev) => ({
      ...prev,
      lastUpdated: timeStr,
      engagementScore: Math.min(96, Math.max(88, prev.engagementScore + (Math.random() > 0.5 ? 1 : -1))),
      questionsCount: prev.questionsCount + (Math.random() > 0.7 ? 1 : 0),
    }))
    onToast?.("Refreshed simulated AI monitoring signals.")
  }

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id])
    if (onDismissSuggestion) {
      onDismissSuggestion(id)
    }
    onToast?.("Suggestion dismissed from active insights.")
  }

  const handleRestoreAll = () => {
    setDismissedIds([])
    onToast?.("Restored all AI suggestions.")
  }

  const activeSuggestions = data.suggestions.filter((s) => !dismissedIds.includes(s.id))

  const getPriorityBadge = (p: AIMonitoringSuggestion["priority"]) => {
    switch (p) {
      case "High":
        return "bg-rose-50 text-rose-700 border-rose-200"
      case "Medium":
        return "bg-amber-50 text-amber-800 border-amber-200"
      case "Low":
        return "bg-purple-50 text-purple-700 border-purple-200"
    }
  }

  return (
    <div className={`space-y-4 ${isStudioMode ? "text-white" : "text-zinc-900"}`}>
      {/* 1. Header & Disclosure Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-sm sm:text-base font-bold ${isStudioMode ? "text-white" : "text-zinc-900"}`}>
              AI Live Monitoring
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
              <span>Demo Insights · Simulated Monitoring</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                data.overallStatus === "Optimal"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              Status: {data.overallStatus}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isStudioMode ? "text-zinc-400" : "text-zinc-500"}`}>
            Rule-based interaction signals, participant attentiveness flags, and automated instructional recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-mono ${isStudioMode ? "text-zinc-400" : "text-zinc-500"}`}>
            Updated: {lastRefreshed}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-3 h-8 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Refresh monitoring data"
          >
            <span>↻ Refresh</span>
          </button>
        </div>
      </div>

      {/* Transparent Disclaimer Box */}
      <div
        className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
          isStudioMode
            ? "bg-purple-950/30 border-purple-500/30 text-purple-200"
            : "bg-purple-50/70 border-purple-200 text-purple-900"
        }`}
      >
        <div className="text-purple-600 font-bold shrink-0 mt-0.5">✦</div>
        <div className="leading-relaxed">
          <strong>Privacy & Pedagogical Notice:</strong> Quantum LMS does not use invasive facial recognition, emotion tracking, or webcams surveillance on students. Indicators are generated from rule-based classroom participation, chat engagement rate, and live poll responses.
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Engagement Score */}
        <div
          className={`p-3.5 rounded-2xl border ${
            isStudioMode ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-150 shadow-xs"
          }`}
        >
          <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${isStudioMode ? "text-zinc-400" : "text-zinc-400"}`}>
            Engagement Index
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-purple-700">
              {data.engagementScore}%
            </span>
            <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
              +4.2% pace
            </span>
          </div>
          <span className={`text-[10.5px] block mt-1 ${isStudioMode ? "text-zinc-500" : "text-zinc-500"}`}>
            High student interaction
          </span>
        </div>

        {/* Metric 2: Active Participation */}
        <div
          className={`p-3.5 rounded-2xl border ${
            isStudioMode ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-150 shadow-xs"
          }`}
        >
          <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${isStudioMode ? "text-zinc-400" : "text-zinc-400"}`}>
            Participation
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl sm:text-2xl font-black ${isStudioMode ? "text-white" : "text-zinc-900"}`}>
              {data.activeParticipants}
              <span className="text-xs text-zinc-400 font-normal"> / {data.totalEnrolled}</span>
            </span>
          </div>
          <span className={`text-[10.5px] block mt-1 ${isStudioMode ? "text-zinc-500" : "text-zinc-500"}`}>
            {data.questionsCount} questions asked
          </span>
        </div>

        {/* Metric 3: Progress */}
        <div
          className={`p-3.5 rounded-2xl border ${
            isStudioMode ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-150 shadow-xs"
          }`}
        >
          <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${isStudioMode ? "text-zinc-400" : "text-zinc-400"}`}>
            Lecture Progress
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-purple-700">
              {data.lectureProgressPercent}%
            </span>
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className="bg-purple-600 h-full rounded-full transition-all"
              style={{ width: `${data.lectureProgressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 4: Trend */}
        <div
          className={`p-3.5 rounded-2xl border ${
            isStudioMode ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-150 shadow-xs"
          }`}
        >
          <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${isStudioMode ? "text-zinc-400" : "text-zinc-400"}`}>
            Participation Trend
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-emerald-500 font-bold text-sm">↗</span>
            <span className="text-xs font-bold text-emerald-600">{data.participationTrend}</span>
          </div>
          <span className={`text-[10px] block mt-1 truncate ${isStudioMode ? "text-zinc-500" : "text-zinc-500"}`}>
            Surge during live code demo
          </span>
        </div>
      </div>

      {/* 3. Attention Indicators & Current Segment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Left: Attention Indicators */}
        <div
          className={`p-4 rounded-2xl border ${
            isStudioMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-zinc-150 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isStudioMode ? "text-zinc-300" : "text-zinc-800"}`}>
              <Icon name="bell" size={14} />
              <span>Attention & Interaction Indicators</span>
            </h4>
            <span className="text-[10.5px] font-semibold text-zinc-400">
              {data.attentionFlags.length} signals
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {data.attentionFlags.map((flag) => {
              const isHigh = flag.severity === "High"
              const isMed = flag.severity === "Medium"
              return (
                <div
                  key={flag.id}
                  className={`p-2.5 rounded-xl border flex items-start justify-between gap-2.5 ${
                    isHigh
                      ? "bg-rose-50/70 border-rose-200 text-rose-900"
                      : isMed
                      ? "bg-amber-50/70 border-amber-200 text-amber-900"
                      : "bg-purple-50/50 border-purple-100 text-purple-900"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                          isHigh
                            ? "bg-rose-200 text-rose-800"
                            : isMed
                            ? "bg-amber-200 text-amber-800"
                            : "bg-purple-200 text-purple-800"
                        }`}
                      >
                        {flag.severity} Alert
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {flag.timestamp}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed">{flag.message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Actionable AI Suggestions */}
        <div
          className={`p-4 rounded-2xl border ${
            isStudioMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-zinc-150 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isStudioMode ? "text-zinc-300" : "text-zinc-800"}`}>
              <Icon name="sparkles" size={14} />
              <span>Actionable Teaching Suggestions</span>
            </h4>
            {dismissedIds.length > 0 && (
              <button
                type="button"
                onClick={handleRestoreAll}
                className="text-[10.5px] font-bold text-purple-700 hover:underline cursor-pointer"
              >
                Restore ({dismissedIds.length})
              </button>
            )}
          </div>

          {activeSuggestions.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400 bg-gray-50 rounded-xl">
              All suggestions have been reviewed and dismissed.
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              {activeSuggestions.map((sug) => (
                <div
                  key={sug.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-2.5 ${
                    isStudioMode
                      ? "bg-zinc-800/80 border-zinc-700 text-zinc-200"
                      : "bg-gray-50/80 hover:bg-purple-50/30 border-gray-200 transition-colors"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wide">
                        {sug.category}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getPriorityBadge(sug.priority)}`}>
                        {sug.priority} Priority
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${isStudioMode ? "text-zinc-300" : "text-zinc-700"}`}>
                      {sug.text}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDismiss(sug.id)}
                    className="w-6 h-6 rounded-md bg-gray-200/80 hover:bg-gray-300 text-zinc-600 hover:text-zinc-900 flex items-center justify-center text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                    title="Dismiss suggestion"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
