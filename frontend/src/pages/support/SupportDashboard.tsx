import React, { useState, useRef, useEffect, useCallback } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ChevronsUpDown, RefreshCw, AlertCircle } from "lucide-react"
import type { MetricItem } from "@/types"
import { Icon } from "@/components/Icon"
import { StatCard } from "@/components/ui/StatCard"
import {
  getAllTickets,
  subscribeToTickets,
  type SupportTicket,
} from "@/services/ticketService"

export const SupportDashboard: React.FC<{ onOpenAiModal?: () => void }> = () => {
  const [agentPresence, setAgentPresence] = useState<"online" | "away" | "busy">("online")
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const queueListRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getAllTickets()
      setTickets(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load support tickets from database.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const unsubscribe = subscribeToTickets(() => {
      loadData()
    })
    return () => {
      unsubscribe()
    }
  }, [loadData])

  const scrollQueue = (direction: "up" | "down" = "down") => {
    if (queueListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = queueListRef.current
      if (direction === "down" && scrollTop + clientHeight >= scrollHeight - 15) {
        queueListRef.current.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        const step = 200
        queueListRef.current.scrollBy({
          top: direction === "down" ? step : -step,
          behavior: "smooth",
        })
      }
    }
  }

  const [selectedCard, setSelectedCard] = useState<"open" | "pending" | "resolved" | null>(null)
  const [searchParams] = useSearchParams()
  const searchParam = searchParams.get("search")?.toLowerCase().trim() || ""

  const openCount = tickets.filter(
    (t) => t.status === "Open" || t.status.toLowerCase() === "open"
  ).length
  const pendingCount = tickets.filter(
    (t) =>
      t.status === "In Progress" ||
      t.status.toLowerCase() === "in progress" ||
      t.status.toLowerCase() === "pending"
  ).length
  const resolvedCount = tickets.filter(
    (t) => t.status === "Resolved" || t.status.toLowerCase() === "resolved"
  ).length
  const closedCount = tickets.filter(
    (t) => t.status === "Closed" || t.status.toLowerCase() === "closed"
  ).length
  const urgentCount = tickets.filter(
    (t) =>
      t.priority === "Urgent" ||
      t.priority === "High" ||
      t.priority.toLowerCase() === "urgent" ||
      t.priority.toLowerCase() === "high"
  ).length

  const filteredTickets = tickets.filter((tkt) => {
    if (selectedCard) {
      const s = tkt.status.toLowerCase()
      if (selectedCard === "open" && s !== "open") return false
      if (
        selectedCard === "pending" &&
        s !== "in progress" &&
        s !== "pending"
      )
        return false
      if (selectedCard === "resolved" && s !== "resolved") return false
    }
    if (searchParam) {
      const matches =
        tkt.ticketNumber.toLowerCase().includes(searchParam) ||
        tkt.id.toLowerCase().includes(searchParam) ||
        tkt.subject.toLowerCase().includes(searchParam) ||
        tkt.studentName.toLowerCase().includes(searchParam) ||
        tkt.studentBatch.toLowerCase().includes(searchParam) ||
        (tkt.assignedAgent &&
          tkt.assignedAgent.toLowerCase().includes(searchParam))
      if (!matches) return false
    }
    return true
  })

  // 4 Canonical Metric Cards matching Teacher & Admin
  const kpis: MetricItem[] = [
    {
      icon: "mail",
      label: "Active Tickets",
      value: `${openCount}`,
      trend: `${pendingCount} In Progress`,
      tone: "lavender",
    },
    {
      icon: "fire",
      label: "Resolved Tickets",
      value: `${resolvedCount}`,
      trend: `${closedCount} Closed`,
      tone: "lime",
    },
    {
      icon: "star",
      label: "High & Urgent Priority",
      value: `${urgentCount}`,
      trend: "Database records",
      tone: "yellow",
    },
    {
      icon: "message-circle",
      label: "Live Tickets Desk",
      value: `${tickets.length} Total`,
      trend: `${openCount + pendingCount} Active in Queue`,
      tone: "pink",
    },
  ]

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5 sm:gap-3 h-full overflow-hidden box-border">
      <style>{`
        /* Dedicated vertical scrollbar styles for Active Support Queue */
        .support-queue-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #9333ea #f4f4f5;
          -webkit-overflow-scrolling: touch;
        }
        .support-queue-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .support-queue-scrollbar::-webkit-scrollbar-track {
          background: #f4f4f5;
          border-radius: 9999px;
        }
        .support-queue-scrollbar::-webkit-scrollbar-thumb {
          background: #a855f7;
          border-radius: 9999px;
        }
        .support-queue-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #7e22ce;
        }
      `}</style>

      {/* 1. Metric Cards Grid */}
      <div className="metrics-grid shrink-0">
        {kpis.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </div>

      {/* 2. Operations Strip / Agent Status Bar */}
      <div className="panel px-3.5 py-1.5 shrink-0 flex flex-wrap items-center justify-between gap-2.5 bg-surface box-border">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-zinc-900 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                agentPresence === "online"
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
            {tickets.length} Total Tickets · {urgentCount} Urgent / High SLAs · Level 2 Escalations Active
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
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                  agentPresence === st
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

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 rounded-full border border-zinc-200 text-zinc-600 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <Link to="/support/live-chat">
            <button className="px-3 h-7.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <Icon name="message-circle" size={13} />
              <span>Launch Live Desk →</span>
            </button>
          </Link>
        </div>
      </div>

      {/* 3. Main Content Grid - standard card gap, zero whole-page scroll */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 flex-1 min-h-0 overflow-hidden box-border">
        {/* Left Column: Priority Tickets Queue (8 cols) - contains the independently scrollable queue */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0 overflow-hidden box-border">
          <div
            id="active-support-queue-card"
            className="panel p-3.5 sm:p-4 bg-surface flex flex-col h-full min-h-0 overflow-hidden border border-zinc-200/80 shadow-xs box-border"
          >
            {/* Card Header (shrink-0) */}
            <div className="card-header pb-2 border-b border-zinc-100 shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="card-title text-sm sm:text-base font-bold text-zinc-900">
                    Active Support Queue
                  </h3>
                  {searchParam && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold">
                      <span>Search: &ldquo;{searchParam}&rdquo;</span>
                      <Link
                        to="/support"
                        className="text-purple-600 hover:text-purple-900 cursor-pointer font-bold ml-0.5"
                      >
                        ✕
                      </Link>
                    </span>
                  )}
                  {/* Interactive Scroll Queue Button */}
                  <button
                    type="button"
                    onClick={() => scrollQueue("down")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-soft text-primary-text border border-primary/30 text-[11px] font-bold shadow-2xs hover:bg-purple-100 active:scale-95 cursor-pointer transition-all"
                    title="Click to scroll down queue"
                    aria-label="Scroll Queue down"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5 text-primary-text animate-pulse" />
                    <span>Scroll Queue</span>
                  </button>
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Live Supabase records: Open, In Progress, Resolved and Closed tickets
                </div>
              </div>

              {/* Directional Controls and View All link */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollQueue("up")}
                    className="w-7 h-7 rounded-lg border border-primary-border bg-primary-soft hover:bg-purple-100 flex items-center justify-center text-primary-text text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                    title="Scroll Up"
                    aria-label="Scroll Up Queue"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollQueue("down")}
                    className="w-7 h-7 rounded-lg border border-primary-border bg-primary-soft hover:bg-purple-100 flex items-center justify-center text-primary-text text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                    title="Scroll Down"
                    aria-label="Scroll Down Queue"
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

            {/* Independently Scrollable Ticket List with Visible Vertical Scrollbar */}
            <div
              ref={queueListRef}
              id="active-support-queue-container"
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-zinc-100 pr-2 mt-1.5 support-queue-scrollbar box-border max-h-[380px] sm:max-h-[440px] lg:max-h-full"
              tabIndex={0}
              aria-label="Active Support Queue Tickets"
              style={{
                WebkitOverflowScrolling: "touch",
              }}
            >
              {isLoading && tickets.length === 0 ? (
                <div className="py-16 text-center text-zinc-400 text-sm">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                  Loading tickets from Supabase...
                </div>
              ) : error ? (
                <div className="p-4 my-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={loadData}
                    className="font-bold underline text-xs cursor-pointer hover:text-rose-950"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="py-16 text-center text-zinc-400 text-sm">
                  No tickets found matching the criteria.
                </div>
              ) : (
                filteredTickets.map((tkt) => {
                  const s = tkt.status.toLowerCase()
                  const p = tkt.priority.toLowerCase()

                  return (
                    <div
                      key={tkt.id}
                      id={`ticket-item-${tkt.id}`}
                      className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-purple-50/40 px-2 rounded-xl transition-colors"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            {tkt.ticketNumber}
                          </span>
                          <span className="text-xs text-zinc-400">•</span>
                          <strong className="text-xs font-bold text-zinc-900">
                            {tkt.studentName}
                          </strong>

                          {/* Priority Badge */}
                          {p === "urgent" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              Urgent
                            </span>
                          )}
                          {p === "high" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                              High Priority
                            </span>
                          )}
                          {p === "medium" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                              Medium
                            </span>
                          )}
                          {p === "low" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                              Low
                            </span>
                          )}

                          {/* Status Badge */}
                          {s === "open" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Open
                            </span>
                          )}
                          {(s === "in progress" || s === "pending") && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                              In Progress
                            </span>
                          )}
                          {s === "resolved" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Resolved
                            </span>
                          )}
                          {s === "closed" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                              Closed
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-zinc-900 truncate">
                          {tkt.subject}
                        </h4>
                        <p className="text-[11px] text-zinc-500 truncate">
                          Category: {tkt.category} · Assigned: {tkt.assignedAgent} · {new Date(tkt.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <Link to={`/support/ticket/${tkt.id}`}>
                        <button className="px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-purple-100 text-zinc-800 hover:text-purple-900 text-xs font-bold transition-colors cursor-pointer shrink-0">
                          Open Ticket →
                        </button>
                      </Link>
                    </div>
                  )
                })
              )}
            </div>

            {/* Queue Footer (shrink-0) */}
            <div className="pt-2 mt-auto border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 shrink-0">
              <span>Showing {filteredTickets.length} tickets from database</span>
              {(selectedCard || searchParam) && (
                <div className="flex items-center gap-2">
                  {selectedCard && (
                    <button
                      onClick={() => setSelectedCard(null)}
                      className="text-purple-700 font-bold hover:underline cursor-pointer"
                    >
                      Clear status filter
                    </button>
                  )}
                  {searchParam && (
                    <Link
                      to="/support"
                      className="text-purple-700 font-bold hover:underline cursor-pointer"
                    >
                      Clear search
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Full Extended SLA Escalation Radar & Telemetry Box (4 cols) */}
        <div className="lg:col-span-4 flex flex-col h-full min-h-0 overflow-hidden box-border">
          <div
            id="sla-escalation-radar-card"
            className="panel p-3.5 sm:p-4 bg-surface flex flex-col h-full min-h-0 overflow-hidden border border-zinc-200/80 shadow-xs box-border justify-between"
          >
            {/* Card Header (matching left Active Support Queue header styling) */}
            <div className="card-header pb-2 border-b border-zinc-100 shrink-0 !mb-0">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <h3 className="card-title text-sm sm:text-base font-bold text-zinc-900">
                    SLA Escalation Radar
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Tracking</span>
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 font-medium">Real-time</span>
              </div>
            </div>

            {/* Scrollable / Flexible Metrics & Telemetry Body */}
            <div className="flex-1 min-h-0 overflow-y-auto support-queue-scrollbar py-2.5 space-y-2.5">
              {/* Active In Queue Progress */}
              <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100/80">
                <div className="flex justify-between items-center text-xs font-bold text-purple-950">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    Active In Queue
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-200/60 text-purple-900 text-[11px]">
                    {openCount + pendingCount} tickets
                  </span>
                </div>
                <div className="w-full bg-purple-200/50 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${tickets.length > 0 ? Math.min(100, Math.round(((openCount + pendingCount) / tickets.length) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* High / Urgent Priority Progress */}
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100/80">
                <div className="flex justify-between items-center text-xs font-bold text-amber-950">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    High / Urgent Priority
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-900 text-[11px]">
                    {urgentCount} critical
                  </span>
                </div>
                <div className="w-full bg-amber-200/50 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${tickets.length > 0 ? Math.min(100, Math.round((urgentCount / tickets.length) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Resolved & Closed Progress */}
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100/80">
                <div className="flex justify-between items-center text-xs font-bold text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Resolved & Closed
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-200/60 text-emerald-900 text-[11px]">
                    {resolvedCount + closedCount} done
                  </span>
                </div>
                <div className="w-full bg-emerald-200/50 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${tickets.length > 0 ? Math.min(100, Math.round(((resolvedCount + closedCount) / tickets.length) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Operational SLA Benchmarks */}
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1.5">
                <div className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider flex items-center justify-between">
                  <span>SLA Compliance Target</span>
                  <span className="text-emerald-600 font-bold">100% Target</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="p-1.5 rounded-lg bg-surface border border-zinc-200/50 text-center">
                    <div className="text-[10px] text-zinc-500 font-medium">First Response</div>
                    <div className="text-xs font-bold text-zinc-900 mt-0.5">&lt; 2 hrs</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-surface border border-zinc-200/50 text-center">
                    <div className="text-[10px] text-zinc-500 font-medium">Resolution</div>
                    <div className="text-xs font-bold text-zinc-900 mt-0.5">&lt; 24 hrs</div>
                  </div>
                </div>
              </div>

              {/* Student 360 Telemetry Hub */}
              <div className="p-2.5 rounded-xl bg-cyan-50/50 border border-cyan-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-950 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    Student 360 Telemetry
                  </span>
                  <span className="text-[10px] font-bold text-cyan-800 bg-cyan-100/70 px-1.5 py-0.5 rounded">
                    Live Sync
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed mt-1">
                  Learner course progress, attendance health & assignment diagnostics.
                </p>
              </div>
            </div>

            {/* Actions Footer (shrink-0, fully visible at the bottom of the extended box) */}
            <div className="pt-2.5 mt-auto border-t border-zinc-100 shrink-0 flex flex-col sm:flex-row gap-2">
              <Link to="/support/sla-escalations" className="flex-1">
                <button className="w-full h-8 rounded-full border border-purple-300 text-purple-800 hover:bg-purple-50 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5">
                  <span>View SLA Escalations</span>
                  <span>→</span>
                </button>
              </Link>
              <Link to="/support/student-360" className="flex-1">
                <button className="w-full h-8 rounded-full bg-black text-white hover:bg-ink-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5">
                  <span>Open Student 360</span>
                  <span>→</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupportDashboard
