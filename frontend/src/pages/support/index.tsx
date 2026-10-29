import React, { useState, useEffect, useRef } from "react"
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom"
import type { CurrentUser } from "@/types"
import { Icon } from "@/components/Icon"
import AppShell from "@/components/shell/AppShell"

// Import all Support sub-pages
import { SupportDashboard } from "./SupportDashboard"
import { TicketsInboxPage } from "./TicketsInboxPage"
import { TicketDetailPage } from "./TicketDetailPage"
import { LiveChatPage } from "./LiveChatPage"
import { KnowledgeBasePage } from "./KnowledgeBasePage"
import { SupportAgentsPage } from "./SupportAgentsPage"
import { SupportAnalyticsPage } from "./SupportAnalyticsPage"
import { SupportSettingsPage } from "./SupportSettingsPage"
import { getAllSupportTickets, SupportTicket } from "./supportTicketsData"

const LEARNERS_SEARCH_INDEX = [
  { id: "usr-student-1", name: "Arjun Mehta", email: "arjun.m@learner.ai", avatar: "AM", batch: "Cohort 7 (Live + Replay)", course: "Full-Stack AI & LLM Systems Engineering" },
  { id: "usr-student-2", name: "Pooja Hegde", email: "pooja.h@example.com", avatar: "PH", batch: "Agentic Systems Bootcamp", course: "Autonomous Multi-Agent Architectures" },
  { id: "usr-student-3", name: "Rohan Sharma", email: "rohan.s@learner.ai", avatar: "RS", batch: "Cohort 7 (Evening)", course: "Full-Stack AI & LLM Systems Engineering" },
  { id: "usr-student-4", name: "Priya Patel", email: "priya.p@ai.edu", avatar: "PP", batch: "Weekend FastTrack", course: "AI Evaluation Appeals" },
  { id: "usr-student-5", name: "Simran Kaur", email: "simran.k@example.com", avatar: "SK", batch: "Cohort 8 (Replay Only)", course: "Full-Stack AI & LLM Systems Engineering" },
  { id: "usr-student-6", name: "Aditya Verma", email: "aditya.v@learner.ai", avatar: "AV", batch: "Cohort 6", course: "Advanced ML Pipelines & LLMOps" },
]

/** Role switching, sign-out and theme now live in the app shell. */
export interface SupportPortalProps {
  currentUser?: CurrentUser
  onOpenAiModal?: () => void
  onToast?: (msg: string) => void
}

function SupportLayout({ children, currentUser }: SupportPortalProps & { children: React.ReactNode }) {
  const [headerSearchQuery, setHeaderSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const allTickets = useRef<SupportTicket[]>(getAllSupportTickets()).current
  const cleanSearchQuery = headerSearchQuery.trim().toLowerCase()

  const matchingTickets = cleanSearchQuery
    ? allTickets.filter(
        (t) =>
          t.ticketNumber.toLowerCase().includes(cleanSearchQuery) ||
          t.subject.toLowerCase().includes(cleanSearchQuery) ||
          t.studentName.toLowerCase().includes(cleanSearchQuery) ||
          t.studentEmail.toLowerCase().includes(cleanSearchQuery) ||
          t.studentBatch.toLowerCase().includes(cleanSearchQuery) ||
          (t.assignedAgent && t.assignedAgent.toLowerCase().includes(cleanSearchQuery))
      ).slice(0, 5)
    : []

  const matchingStudents = cleanSearchQuery
    ? LEARNERS_SEARCH_INDEX.filter(
        (s) =>
          s.name.toLowerCase().includes(cleanSearchQuery) ||
          s.email.toLowerCase().includes(cleanSearchQuery) ||
          s.batch.toLowerCase().includes(cleanSearchQuery) ||
          s.course.toLowerCase().includes(cleanSearchQuery)
      ).slice(0, 3)
    : []

  const totalResults = matchingTickets.length + matchingStudents.length

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const q = headerSearchQuery.trim()
    if (!q) return

    // If query matches a ticket directly
    const exactTicket = allTickets.find(
      (t) =>
        t.id.toLowerCase() === q.toLowerCase() ||
        t.ticketNumber.toLowerCase() === q.toLowerCase() ||
        t.ticketNumber.toLowerCase().replace("#", "") === q.toLowerCase()
    )
    if (exactTicket) {
      navigate(`/support/ticket/${exactTicket.id}`)
      setIsSearchOpen(false)
      return
    }

    // Navigate to tickets inbox with search query
    navigate(`/support/inbox?search=${encodeURIComponent(q)}`)
    setIsSearchOpen(false)
  }

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Lock window and document scroll while in Support Portal on desktop
  useEffect(() => {
    const applyScrollLock = () => {
      if (typeof window !== "undefined" && window.innerWidth > 960) {
        document.documentElement.style.overflow = "hidden"
        document.body.style.overflow = "hidden"
        document.body.style.height = "100vh"
      } else {
        document.documentElement.style.overflow = ""
        document.body.style.overflow = ""
        document.body.style.height = ""
      }
    }

    applyScrollLock()
    window.addEventListener("resize", applyScrollLock)
    return () => {
      window.removeEventListener("resize", applyScrollLock)
      document.documentElement.style.overflow = ""
      document.body.style.overflow = ""
      document.body.style.height = ""
    }
  }, [])

  // Reset scroll to top on navigation
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const userFirstName = (currentUser?.name || "Alex").split(" ")[0]

  const path = location.pathname.toLowerCase()
  const activeNav = /\/support\/(inbox|tickets?)/.test(path)
    ? "inbox"
    : (["live-chat", "knowledge-base", "agents", "analytics", "settings"].find((id) => path.startsWith(`/support/${id}`)) ?? "dashboard")

  return (
    <AppShell role="Support" activeId={activeNav} onNavigate={(id) => navigate(id === "dashboard" ? "/support" : `/support/${id}`)}>
      <div className="dashboard-content support-portal-root min-w-0">
        {/* Canonical Dashboard Header - perfectly aligned with Teacher & Admin */}
        <header className="dashboard-header">
          <div className="min-w-fit flex-shrink-0">
            <div className="greeting whitespace-nowrap">
              <span>Good morning, {userFirstName}</span>
              <span className="wave-emoji" role="img" aria-label="waving hand">
                👋
              </span>
            </div>
            <div className="subtitle whitespace-nowrap">
              24 active student tickets · 3 live chats waiting · 98.7% SLA resolution
            </div>
          </div>

          <div className="header-actions flex-shrink-0">
            {/* Search Box with Interactive Button & Live Results Dropdown */}
            <div ref={searchContainerRef} className="relative">
              <form
                onSubmit={handleSearchSubmit}
                className="search-box !w-[160px] sm:!w-[210px] focus-within:!w-[260px] md:focus-within:!w-[300px] transition-all duration-200 border border-transparent focus-within:border-primary/50 focus-within:shadow-md relative"
              >
                <button
                  type="submit"
                  className="text-zinc-500 hover:text-primary-text transition-colors cursor-pointer shrink-0 p-0.5 rounded-full hover:bg-purple-50 flex items-center justify-center"
                  title="Click to search tickets & students (Enter)"
                  aria-label="Search"
                >
                  <Icon name="search" size={15} />
                </button>
                <input
                  type="text"
                  value={headerSearchQuery}
                  onChange={(e) => {
                    setHeaderSearchQuery(e.target.value)
                    setIsSearchOpen(true)
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsSearchOpen(false)
                    }
                  }}
                  placeholder="Search tickets, students..."
                  aria-label="Search support desk"
                />
                {headerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderSearchQuery("")
                      setIsSearchOpen(false)
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1 cursor-pointer shrink-0"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </form>

              {/* Live Search Results Dropdown */}
              {isSearchOpen && cleanSearchQuery && (
                <div
                  className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] max-h-[440px] bg-surface border border-primary-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 text-left support-page-font"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Dropdown Header */}
                  <div className="px-3.5 py-2.5 bg-primary-soft border-b border-primary-soft flex items-center justify-between text-xs">
                    <span className="font-extrabold text-foreground">
                      Search Results for &ldquo;{headerSearchQuery}&rdquo;
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-soft text-primary-text">
                      {totalResults} {totalResults === 1 ? "match" : "matches"}
                    </span>
                  </div>

                  {/* Scrollable Results Body */}
                  <div className="overflow-y-auto p-2 space-y-3 max-h-[340px] support-queue-scrollbar">
                    {/* Matching Tickets */}
                    {matchingTickets.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                          Tickets ({matchingTickets.length})
                        </div>
                        <div className="space-y-1">
                          {matchingTickets.map((tkt) => (
                            <div
                              key={tkt.id}
                              onClick={() => {
                                navigate(`/support/ticket/${tkt.id}`)
                                setIsSearchOpen(false)
                              }}
                              className="p-2 rounded-xl hover:bg-primary-soft/50 border border-transparent hover:border-primary-border transition-all cursor-pointer flex flex-col gap-1 group"
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 group-hover:bg-purple-200">
                                  {tkt.ticketNumber}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0 rounded-full ${
                                      tkt.priority === "high"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {tkt.priority}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0 rounded-full ${
                                      tkt.status === "open"
                                        ? "bg-rose-100 text-rose-800"
                                        : tkt.status === "pending"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-emerald-100 text-emerald-800"
                                    }`}
                                  >
                                    {tkt.status}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs font-bold text-zinc-900 line-clamp-1 group-hover:text-primary-text">
                                {tkt.subject}
                              </p>
                              <p className="text-[11px] text-zinc-500 truncate">
                                {tkt.studentName} · {tkt.studentBatch}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Students */}
                    {matchingStudents.length > 0 && (
                      <div className={matchingTickets.length > 0 ? "pt-2 border-t border-zinc-100" : ""}>
                        <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                          Students ({matchingStudents.length})
                        </div>
                        <div className="space-y-1">
                          {matchingStudents.map((st) => (
                            <div
                              key={st.id}
                              onClick={() => {
                                navigate(`/support/student-360`)
                                setIsSearchOpen(false)
                              }}
                              className="p-2 rounded-xl hover:bg-primary-soft/50 border border-transparent hover:border-primary-border transition-all cursor-pointer flex items-center justify-between gap-2 group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-primary-soft text-primary-text font-bold text-[10px] flex items-center justify-center shrink-0 border border-primary-border">
                                  {st.avatar}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-bold text-zinc-900 truncate group-hover:text-primary-text">
                                    {st.name}
                                  </h5>
                                  <p className="text-[10px] text-zinc-500 truncate">
                                    {st.email} · {st.batch}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-primary-text px-2 py-0.5 rounded-full bg-primary-soft shrink-0">
                                Student 360° →
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Results */}
                    {totalResults === 0 && (
                      <div className="py-6 text-center text-zinc-400 space-y-1">
                        <p className="text-xs font-bold text-zinc-700">
                          No matching tickets or students
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          Try searching by ticket ID (e.g. &ldquo;#TKT-1081&rdquo;), student name, or topic.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dropdown Footer Actions */}
                  <div className="p-2 bg-primary-soft border-t border-primary-soft flex items-center justify-between text-xs">
                    <span className="text-[11px] text-zinc-500">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 font-mono text-[10px]">Enter ↵</kbd> to search
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSearchSubmit()}
                      className="text-xs font-bold text-primary-text hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>Open in Inbox</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Viewport Content - standard card gap */}
        <div className="support-view-container flex-1 min-h-0 flex flex-col gap-[var(--app-card-gap,14px)] pb-0 overflow-hidden">
          {children}
        </div>
      </div>
    </AppShell>
  )
}

/** Mounted by AppRoutes under /support/*; route paths are relative to it. */
export function SupportPortal(props: SupportPortalProps) {
  return (
    <SupportLayout {...props}>
      <Routes>
        <Route index element={<SupportDashboard onOpenAiModal={props.onOpenAiModal} />} />
        <Route path="dashboard" element={<SupportDashboard onOpenAiModal={props.onOpenAiModal} />} />
        <Route path="inbox" element={<TicketsInboxPage />} />
        <Route path="tickets" element={<TicketsInboxPage />} />
        <Route path="ticket/:ticketId" element={<TicketDetailPage />} />
        <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
        <Route path="live-chat" element={<LiveChatPage />} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="sla-escalations" element={<Navigate to="/support/inbox?filter=escalated" replace />} />
        <Route path="agents" element={<SupportAgentsPage />} />
        <Route path="analytics" element={<SupportAnalyticsPage />} />
        <Route path="student-360" element={<Navigate to="/support/inbox" replace />} />
        <Route path="settings" element={<SupportSettingsPage />} />
        <Route path="*" element={<Navigate to="/support" replace />} />
      </Routes>
    </SupportLayout>
  )
}export default SupportPortal
