import React, { useState, useEffect, useRef } from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom"
import type { UserRole, CurrentUser, IconName } from "@/types"
import { Icon } from "@/components/Icon"
import { HexColorField } from "@/components/HexColorField"
import { NotificationProvider } from "@/context/NotificationContext"
import "./supportTheme.css"

// Import all Support sub-pages
import { SupportDashboard } from "./SupportDashboard"
import { TicketsInboxPage } from "./TicketsInboxPage"
import { TicketDetailPage } from "./TicketDetailPage"
import { LiveChatPage } from "./LiveChatPage"
import { KnowledgeBasePage } from "./KnowledgeBasePage"
import { SlaEscalationsPage } from "./SlaEscalationsPage"
import { SupportAgentsPage } from "./SupportAgentsPage"
import { SupportAnalyticsPage } from "./SupportAnalyticsPage"
import { Student360Page } from "./Student360Page"
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

export interface SupportPortalProps {
  currentUser?: CurrentUser
  onSwitchRole?: (role: UserRole) => void
  onOpenAiModal?: () => void
  onSwitchToTeacher?: () => void
  onSwitchToStudent?: () => void
  onLogout?: () => void
  onToast?: (msg: string) => void
  hexColor?: string
  onChangeHexColor?: (c: string) => void
  isLightBg?: boolean
}

type SupportTab =
  | "dashboard"
  | "inbox"
  | "live-chat"
  | "knowledge-base"
  | "sla-escalations"
  | "agents"
  | "analytics"
  | "student-360"
  | "settings"

interface NavItem {
  key: SupportTab
  label: string
  path: string
  icon: IconName
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", path: "/support/dashboard", icon: "home" },
  { key: "inbox", label: "Tickets Inbox", path: "/support/inbox", icon: "mail" },
  { key: "live-chat", label: "Live Chat", path: "/support/live-chat", icon: "message-circle" },
  { key: "knowledge-base", label: "Knowledge Base", path: "/support/knowledge-base", icon: "book" },
  { key: "sla-escalations", label: "SLA & Escalations", path: "/support/sla-escalations", icon: "fire" },
  { key: "agents", label: "Support Agents", path: "/support/agents", icon: "users" },
  { key: "analytics", label: "Analytics", path: "/support/analytics", icon: "analytics" },
  { key: "student-360", label: "Student 360", path: "/support/student-360", icon: "compass" },
  { key: "settings", label: "Settings", path: "/support/settings", icon: "settings" },
]

function SupportSidebar({
  currentUser,
  onSwitchRole,
  onLogout,
  onCloseDrawer,
}: {
  currentUser?: CurrentUser
  onSwitchRole?: (role: UserRole) => void
  onLogout?: () => void
  onCloseDrawer?: () => void
}) {
  const location = useLocation()
  const currentPath = location.pathname.toLowerCase()
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)

  const isItemActive = (item: NavItem) => {
    if (
      item.key === "dashboard" &&
      (currentPath === "/support" ||
        currentPath === "/support/" ||
        currentPath === "/support/dashboard")
    ) {
      return true
    }
    if (
      item.key === "inbox" &&
      (currentPath.startsWith("/support/inbox") || currentPath.startsWith("/support/tickets"))
    ) {
      return true
    }
    return currentPath.startsWith(item.path)
  }

  const userDisplayName = currentUser?.name || "Alex Rivera"
  const userAvatar = currentUser?.avatar || "/assets/student-3.png"

  return (
    <aside className="sidebar" aria-label="Support sidebar">
      {/* Brand Logo - identical to teacher and admin sidebar */}
      <div className="logo" aria-label="Quantum School of AI">
        <Link to="/support/dashboard" onClick={onCloseDrawer}>
          <img src="/logo.png" alt="Quantum School of AI" className="logo-img" />
        </Link>
      </div>

      {/* Support User Profile Block - matches canonical .teacher layout */}
      <div
        className="teacher relative"
        style={{ cursor: "pointer" }}
        onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
        title="Click to switch perspective"
      >
        <img src={userAvatar} alt={userDisplayName} />
        <strong>{userDisplayName}</strong>
        <span className="flex items-center justify-center gap-1">
          <span>Support Desk</span>
          <span className="text-[9px] text-purple-600 font-bold">▾</span>
        </span>

        {/* Interactive Role Switcher Popup */}
        {showRoleSwitcher && onSwitchRole && (
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-1 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
              Switch Perspective
            </div>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Super Admin")
                setShowRoleSwitcher(false)
                onCloseDrawer?.()
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 cursor-pointer"
            >
              <span>⚡ Super Admin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Admin")
                setShowRoleSwitcher(false)
                onCloseDrawer?.()
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 cursor-pointer"
            >
              <span>🏫 School Admin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Teacher")
                setShowRoleSwitcher(false)
                onCloseDrawer?.()
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 cursor-pointer"
            >
              <span>🎓 Teacher</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Student")
                setShowRoleSwitcher(false)
                onCloseDrawer?.()
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 cursor-pointer"
            >
              <span>🎒 Student</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Support")
                setShowRoleSwitcher(false)
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between bg-cyan-50 text-cyan-800 cursor-pointer"
            >
              <span>🎧 Support Desk</span>
              <span className="text-cyan-600 font-bold">✓</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation List - matches teacher and admin navigation styles */}
      <nav aria-label="Support navigation">
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(item)
          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={onCloseDrawer}
              className={active ? "nav-item active" : "nav-item"}
              title={item.label}
            >
              <Icon name={item.icon} size={18} />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout Button - identical to teacher and admin sidebar */}
      {onLogout && (
        <button
          className="logout-btn"
          onClick={() => {
            onCloseDrawer?.()
            onLogout()
          }}
          aria-label="Log Out"
        >
          <Icon name="logout" size={15} />
          <span>Log Out</span>
        </button>
      )}
    </aside>
  )
}

function SupportLayout({
  children,
  currentUser,
  onSwitchRole,
  onSwitchToTeacher,
  onSwitchToStudent,
  onLogout,
  onOpenAiModal,
  hexColor,
  onChangeHexColor,
  isLightBg,
}: SupportPortalProps & { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
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

  return (
    <div
      className="dashboard-shell support-portal-root"
      style={{
        backgroundColor: hexColor || "var(--bg-custom, #9860e9)",
        backgroundImage: isLightBg
          ? "linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px)"
          : "linear-gradient(rgba(255, 255, 255, 0.19) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.19) 1px, transparent 1px)",
      }}
    >
      {/* Desktop Persistent Sidebar */}
      <SupportSidebar
        currentUser={currentUser}
        onSwitchRole={onSwitchRole}
        onLogout={onLogout}
      />

      {/* Mobile Top Header */}
      <div className="mobile-top-bar col-span-full">
        <div className="flex items-center gap-3">
          <button
            className="mobile-nav-btn"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <Icon name="menu" size={20} />
          </button>
          <div className="logo">
            <img src="/logo.png" alt="Quantum School of AI" className="logo-img" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onChangeHexColor && (
            <div className="scale-90">
              <HexColorField
                hexColor={hexColor || "#9860e9"}
                onChangeHex={onChangeHexColor}
              />
            </div>
          )}
          <img
            src={currentUser?.avatar || "/assets/student-3.png"}
            alt={currentUser?.name || "Support"}
            className="w-8 h-8 rounded-full object-cover border border-purple-300"
          />
        </div>
      </div>

      {/* Mobile Slide-out Drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="drawer-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            className="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Support Navigation drawer"
          >
            <div className="flex items-center justify-between pb-2 border-b border-purple-200/50">
              <div className="logo">
                <img src="/logo.png" alt="Quantum School of AI" className="logo-img" />
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors text-zinc-700"
                aria-label="Close menu"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="mt-2">
              <SupportSidebar
                currentUser={currentUser}
                onSwitchRole={onSwitchRole}
                onLogout={onLogout}
                onCloseDrawer={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </div>
        </>
      )}

      {/* Main Support Content Viewport */}
      <main className="dashboard-content">
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
                className="search-box !w-[160px] sm:!w-[210px] focus-within:!w-[260px] md:focus-within:!w-[300px] transition-all duration-200 border border-transparent focus-within:border-[#905FEB]/50 focus-within:shadow-md relative"
              >
                <button
                  type="submit"
                  className="text-zinc-500 hover:text-[#7042D2] transition-colors cursor-pointer shrink-0 p-0.5 rounded-full hover:bg-purple-50 flex items-center justify-center"
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
                  className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] max-h-[440px] bg-white border border-[#E5DEFF] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 text-left support-page-font"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Dropdown Header */}
                  <div className="px-3.5 py-2.5 bg-[#FAF9FF] border-b border-[#F0EDFF] flex items-center justify-between text-xs">
                    <span className="font-extrabold text-[#111111]">
                      Search Results for &ldquo;{headerSearchQuery}&rdquo;
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0EDFF] text-[#7042D2]">
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
                              className="p-2 rounded-xl hover:bg-[#F0EDFF]/50 border border-transparent hover:border-[#E5DEFF] transition-all cursor-pointer flex flex-col gap-1 group"
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
                              <p className="text-xs font-bold text-zinc-900 line-clamp-1 group-hover:text-[#7042D2]">
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
                              className="p-2 rounded-xl hover:bg-[#F0EDFF]/50 border border-transparent hover:border-[#E5DEFF] transition-all cursor-pointer flex items-center justify-between gap-2 group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-[#F0EDFF] text-[#7042D2] font-bold text-[10px] flex items-center justify-center shrink-0 border border-[#E5DEFF]">
                                  {st.avatar}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-bold text-zinc-900 truncate group-hover:text-[#7042D2]">
                                    {st.name}
                                  </h5>
                                  <p className="text-[10px] text-zinc-500 truncate">
                                    {st.email} · {st.batch}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-[#7042D2] px-2 py-0.5 rounded-full bg-[#F0EDFF] shrink-0">
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
                  <div className="p-2 bg-[#FAF9FF] border-t border-[#F0EDFF] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-zinc-500">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 font-mono text-[10px]">Enter ↵</kbd> to search
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSearchSubmit()}
                      className="text-xs font-bold text-[#7042D2] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>Open in Inbox</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Role Switcher Pill */}
            {onSwitchRole && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="px-3 h-[35px] rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-cyan-700 transition-colors cursor-pointer whitespace-nowrap"
                  aria-label="Switch active role view"
                >
                  <span>🎧 Support Desk</span>
                  <span className="text-[10px] text-cyan-200">▾</span>
                </button>

                {showRoleDropdown && (
                  <div
                    className="absolute right-0 top-full mt-2 w-48 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-1 text-left"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
                      Switch Role View
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchRole("Teacher")
                        setShowRoleDropdown(false)
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                    >
                      <span>🎓 Teacher Portal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchRole("Student")
                        setShowRoleDropdown(false)
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                    >
                      <span>🎒 Student Portal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchRole("Admin")
                        setShowRoleDropdown(false)
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                    >
                      <span>🏫 School Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchRole("Super Admin")
                        setShowRoleDropdown(false)
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                    >
                      <span>⚡ Super Admin</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Hex Color Field */}
            {onChangeHexColor && (
              <HexColorField
                hexColor={hexColor || "#9860e9"}
                onChangeHex={onChangeHexColor}
              />
            )}

            {/* Ask AI Pill */}
            {onOpenAiModal && (
              <button
                type="button"
                className="ask-ai cursor-pointer"
                onClick={onOpenAiModal}
                aria-label="Ask Support AI"
              >
                <span>✦</span>
                Ask AI
              </button>
            )}
          </div>
        </header>

        {/* Viewport Content - standard 8px gap */}
        <div className="support-view-container flex-1 min-h-0 flex flex-col gap-2 pb-0 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}

export function SupportPortal(props: SupportPortalProps) {
  return (
    <NotificationProvider>
      <BrowserRouter>
        <SupportLayout {...props}>
          <Routes>
            <Route path="/support" element={<SupportDashboard onOpenAiModal={props.onOpenAiModal} />} />
            <Route path="/support/dashboard" element={<SupportDashboard onOpenAiModal={props.onOpenAiModal} />} />
            <Route path="/support/inbox" element={<TicketsInboxPage />} />
            <Route path="/support/tickets" element={<TicketsInboxPage />} />
            <Route path="/support/ticket/:ticketId" element={<TicketDetailPage />} />
            <Route path="/support/tickets/:ticketId" element={<TicketDetailPage />} />
            <Route path="/support/live-chat" element={<LiveChatPage />} />
            <Route path="/support/knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="/support/sla-escalations" element={<SlaEscalationsPage />} />
            <Route path="/support/agents" element={<SupportAgentsPage />} />
            <Route path="/support/analytics" element={<SupportAnalyticsPage />} />
            <Route path="/support/student-360" element={<Student360Page />} />
            <Route path="/support/settings" element={<SupportSettingsPage />} />
            <Route path="*" element={<Navigate to="/support" replace />} />
          </Routes>
        </SupportLayout>
      </BrowserRouter>
    </NotificationProvider>
  )
}

export default SupportPortal
