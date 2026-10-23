import React, { useState, useRef } from "react"
import { Link } from "react-router-dom"
import type { MetricItem } from "@/types"
import { Icon } from "@/components/Icon"
import { MetricCard } from "@/components/MetricCard"
import { getAllSupportTickets, SupportTicket } from "./supportTicketsData"

export const SupportDashboard: React.FC<{ onOpenAiModal?: () => void }> = ({ onOpenAiModal }) => {
  const [agentPresence, setAgentPresence] = useState<"online" | "away" | "busy">("online")
  const [tickets] = useState<SupportTicket[]>(getAllSupportTickets())
  const queueListRef = useRef<HTMLDivElement>(null)

  const scrollQueue = (direction: "up" | "down") => {
    if (queueListRef.current) {
      const step = 200
      queueListRef.current.scrollBy({
        top: direction === "down" ? step : -step,
        behavior: "smooth",
      })
    }
  }

  const [selectedCard, setSelectedCard] = useState<"open" | "pending" | "resolved" | null>(null)

  const openCount = tickets.filter((t) => t.status === "open").length
  const pendingCount = tickets.filter((t) => t.status === "pending").length
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length

  const filteredTickets = tickets.filter((tkt) => {
    if (!selectedCard) return true
    return tkt.status === selectedCard
  })

  // 4 Canonical Folder-Tab Metric Cards matching Teacher & Admin
  const kpis: MetricItem[] = [
    {
      icon: "mail",
      label: "Active Tickets",
      value: `${openCount}`,
      trend: `${pendingCount} Pending Review`,
      tone: "lavender",
    },
    {
      icon: "fire",
      label: "Avg First Reply",
      value: "1.8m",
      trend: "98.7% SLA Met",
      tone: "lime",
    },
    {
      icon: "star",
      label: "CSAT Satisfaction",
      value: "4.92 / 5",
      trend: "342 Reviews",
      tone: "yellow",
    },
    {
      icon: "message-circle",
      label: "Live Chat Desk",
      value: "6 Active",
      trend: "3 in Queue",
      tone: "pink",
    },
  ]

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 h-full">
      {/* 1. Metric Cards Grid - identical 132px folder tabs and 8px gap */}
      <div className="metrics-grid shrink-0">
        {kpis.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* 2. Operations Strip / Agent Status Bar */}
      <div className="panel px-4 py-2 shrink-0 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-900 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${agentPresence === "online"
                ? "bg-emerald-500 animate-pulse"
                : agentPresence === "busy"
                  ? "bg-rose-500"
                  : "bg-amber-500"
                }`}
            />
            <span>Omnichannel Dispatcher</span>
          </span>
          <span className="text-zinc-300">|</span>
          <span className="text-[11px] text-zinc-500 font-medium">
            24 Total Tickets · 3 Urgent SLAs · Level 2 Escalations Active
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Agent Presence Toggles */}
          <div className="flex items-center rounded-full border border-zinc-200 p-0.5 bg-zinc-50 text-xs">
            {(["online", "away", "busy"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setAgentPresence(st)}
                className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${agentPresence === st
                  ? st === "online"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : st === "busy"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-amber-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
                  }`}
              >
                {st}
              </button>
            ))}
          </div>

          <Link to="/support/live-chat">
            <button className="px-3.5 h-8 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <Icon name="message-circle" size={14} />
              <span>Launch Live Desk →</span>
            </button>
          </Link>
        </div>
      </div>

      {/* 3. Main Content Grid - standard 8px gap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0">
        {/* Left Column: Priority Tickets Queue (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-2 h-full min-h-0">
          <div className="panel p-4 sm:p-5 bg-white flex flex-col h-full min-h-0">
            {/* Card Header matching Teacher & Admin */}
            <div className="card-header">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="card-title">Active Support Queue</h3>
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 text-[10px] font-bold shadow-2xs"
                    title="Support Tickets Queue is scrollable"
                  >
                    <span className="text-[11px] text-[#905FEB]">↕</span>
                    <span>Scroll Queue</span>
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Urgent tickets, cohort transfer inquiries, and mentor triage requests
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => scrollQueue("up")}
                    className="w-7 h-7 rounded-lg border border-[#E5DEFF] bg-[#FAF9FF] hover:bg-[#F0EDFF] flex items-center justify-center text-[#7042D2] text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                    title="Scroll Up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => scrollQueue("down")}
                    className="w-7 h-7 rounded-lg border border-[#E5DEFF] bg-[#FAF9FF] hover:bg-[#F0EDFF] flex items-center justify-center text-[#7042D2] text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                    title="Scroll Down"
                  >
                    ▼
                  </button>
                </div>
                <Link to="/support/inbox">
                  <span className="text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors">
                    View All Tickets →
                  </span>
                </Link>
              </div>
            </div>

            {/* Scrollable Ticket List with Visible Custom Scrollbar */}
            <div
              ref={queueListRef}
              className="flex-1 min-h-0 overflow-y-auto divide-y divide-zinc-100 pr-2 mt-2 support-queue-scrollbar"
            >
              {filteredTickets.map((tkt) => (
                <div
                  key={tkt.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-purple-50/30 px-2 rounded-xl transition-colors"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {tkt.ticketNumber}
                      </span>
                      <span className="text-xs text-zinc-400">•</span>
                      <strong className="text-xs font-bold text-zinc-900">
                        {tkt.studentName}
                      </strong>
                      {tkt.priority === "high" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          High Priority
                        </span>
                      )}
                      {tkt.status === "open" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Open
                        </span>
                      )}
                      {tkt.status === "pending" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          Pending Admin
                        </span>
                      )}
                      {tkt.status === "resolved" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Resolved
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-zinc-900 truncate">
                      {tkt.subject}
                    </h4>
                    <p className="text-[11px] text-zinc-500 truncate">
                      Batch: {tkt.studentBatch} · Assigned: {tkt.assignedAgent}
                    </p>
                  </div>

                  <Link to={`/support/ticket/${tkt.id}`}>
                    <button className="px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-purple-100 text-zinc-800 hover:text-purple-900 text-xs font-bold transition-colors cursor-pointer shrink-0">
                      Open Ticket →
                    </button>
                  </Link>
                </div>
              ))}
            </div>

            {/* Queue Footer */}
            <div className="pt-3 mt-auto border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Showing {filteredTickets.length} tickets in active queue</span>
              {selectedCard && (
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-purple-700 font-bold hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Fast Operational Hub & Telemetry (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-2 h-full min-h-0">
          {/* Quick SLA Radar Panel */}
          <div className="panel p-4 sm:p-5 bg-white flex flex-col justify-between flex-1 min-h-0">
            <div>
              <div className="card-header !mb-0">
                <h3 className="card-title text-sm">SLA Escalation Radar</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="space-y-2 mt-2">
                <div className="p-2.5 sm:p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                  <div className="flex justify-between items-center text-xs font-bold text-purple-950">
                    <span>First Response SLA</span>
                    <span>98.7%</span>
                  </div>
                  <div className="w-full bg-purple-200/50 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div className="bg-purple-600 h-1.5 rounded-full w-[98%]" />
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-950">
                    <span>Batch Transfer Approvals</span>
                    <span>4 Pending</span>
                  </div>
                  <div className="w-full bg-amber-200/50 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div className="bg-amber-500 h-1.5 rounded-full w-[70%]" />
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-950">
                    <span>Resolved Within 24h</span>
                    <span>94.2%</span>
                  </div>
                  <div className="w-full bg-emerald-200/50 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full w-[94%]" />
                  </div>
                </div>
              </div>
            </div>

            <Link to="/support/sla-escalations" className="block pt-2 mt-auto">
              <button className="w-full h-8 rounded-full border border-purple-300 text-purple-800 hover:bg-purple-50 text-xs font-bold transition-colors cursor-pointer">
                View SLA Escalations →
              </button>
            </Link>
          </div>

          {/* Student 360 Fast Inspection Panel */}
          <div className="panel p-4 sm:p-5 bg-white flex flex-col justify-between flex-1 min-h-0">
            <div>
              <div className="card-header !mb-0">
                <h3 className="card-title text-sm">Student 360 Telemetry</h3>
                <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded">
                  Live Sync
                </span>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed mt-2">
                Instant access to student course progress, attendance health, assignment submission history, and risk factor diagnostics.
              </p>
            </div>

            <Link to="/support/student-360" className="pt-2 mt-auto">
              <button className="w-full h-8 rounded-full bg-black text-white hover:bg-zinc-800 text-xs font-bold transition-colors cursor-pointer">
                Open Student 360 →
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
