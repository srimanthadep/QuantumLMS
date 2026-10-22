import React, { useState, useEffect } from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom"
import {
  LayoutDashboard,
  Inbox,
  MessageSquare,
  BookOpen,
  Clock,
  Users,
  BarChart3,
  UserCheck,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  X,
  ExternalLink,
} from "lucide-react"
import { NotificationProvider } from "@/context/NotificationContext"
import { HexColorField } from "@/components/HexColorField"
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

export interface SupportPortalProps {
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
  icon: React.ComponentType<{ className?: string; size?: number }>
  badge?: string | number
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", path: "/support/dashboard", icon: LayoutDashboard },
  { key: "inbox", label: "Tickets Inbox", path: "/support/inbox", icon: Inbox },
  { key: "live-chat", label: "Live Chat", path: "/support/live-chat", icon: MessageSquare },
  { key: "knowledge-base", label: "Knowledge Base", path: "/support/knowledge-base", icon: BookOpen },
  { key: "sla-escalations", label: "SLA & Escalations", path: "/support/sla-escalations", icon: Clock },
  { key: "agents", label: "Support Agents", path: "/support/agents", icon: Users },
  { key: "analytics", label: "Analytics", path: "/support/analytics", icon: BarChart3 },
  { key: "student-360", label: "Student 360", path: "/support/student-360", icon: UserCheck },
  { key: "settings", label: "Settings", path: "/support/settings", icon: Settings },
]

function SupportSidebar({
  onSwitchToTeacher,
  onSwitchToStudent,
  onLogout,
  onOpenAiModal,
  onCloseDrawer,
}: {
  onSwitchToTeacher?: () => void
  onSwitchToStudent?: () => void
  onLogout?: () => void
  onOpenAiModal?: () => void
  onCloseDrawer?: () => void
}) {
  const location = useLocation()
  const currentPath = location.pathname.toLowerCase()

  const isItemActive = (item: NavItem) => {
    if (item.key === "dashboard" && (currentPath === "/support" || currentPath === "/support/" || currentPath === "/support/dashboard")) {
      return true
    }
    if (item.key === "inbox" && (currentPath.startsWith("/support/inbox") || currentPath.startsWith("/support/tickets"))) {
      return true
    }
    return currentPath.startsWith(item.path)
  }

  return (
    <aside className="sidebar student-sidebar-shared h-full max-h-full overflow-y-auto flex flex-col [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-purple-200" aria-label="Support Navigation">
      {/* Brand Logo */}
      <div className="logo" aria-label="Quantum School of AI">
        <Link to="/support/dashboard" onClick={onCloseDrawer}>
          <img src="/logo.png" alt="Quantum School of AI" className="logo-img" />
        </Link>
      </div>

      {/* Support Specialist Profile */}
      <div className="teacher">
        <div className="relative">
          <img src="/assets/srimanth.png" alt="Srimanth" className="w-10 h-10 rounded-full object-cover border border-purple-200" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
        </div>
        <strong>Srimanth</strong>
        <span>Support Operations</span>
      </div>

      {/* Support Navigation List */}
      <nav className="student-shared-nav" aria-label="Support main navigation">
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(item)
          const IconComponent = item.icon
          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={onCloseDrawer}
              className={active ? "nav-item active flex items-center justify-between" : "nav-item flex items-center justify-between"}
              title={item.label}
            >
              <div className="flex items-center gap-2 min-w-0">
                <IconComponent size={16} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? "bg-[#905FEB] text-white" : "bg-[#F0EDFF] text-[#7042D2]"}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Sidebar Bottom Actions */}
      <div className="student-sidebar-actions mt-auto pt-3 border-t border-purple-200/50">
        {/* Ask AI Pill Button */}
        {onOpenAiModal && (
          <button
            className="student-action-ai-btn"
            onClick={onOpenAiModal}
            aria-label="Support AI Co-pilot"
          >
            <Sparkles size={14} className="text-purple-600 animate-pulse" />
            <span>Support AI</span>
          </button>
        )}

        {/* Switch to Teacher Portal */}
        <a
          href="http://localhost:8443/teacher"
          className="student-action-switch-btn flex items-center justify-center"
          onClick={(e) => {
            e.preventDefault()
            try {
              localStorage.setItem("quantum_user_role", "Teacher")
            } catch { }
            if (onSwitchToTeacher) {
              onSwitchToTeacher()
            }
            window.location.href = "http://localhost:8443/teacher"
          }}
          title="Switch to Teacher Workspace"
        >
          <span>👨‍🏫 Teacher Portal</span>
        </a>

        {/* Switch to Student Portal */}
        {onSwitchToStudent && (
          <button
            className="student-action-switch-btn"
            onClick={onSwitchToStudent}
            title="Switch to Student Portal"
          >
            <span>🎓 Student Portal</span>
          </button>
        )}

        {/* Log Out Button */}
        {onLogout && (
          <button
            className="student-action-logout-btn"
            onClick={onLogout}
            aria-label="Log Out"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        )}
      </div>
    </aside>
  )
}

function SupportLayout({
  children,
  onSwitchToTeacher,
  onSwitchToStudent,
  onLogout,
  onOpenAiModal,
  hexColor,
  onChangeHexColor,
  isLightBg,
}: SupportPortalProps & { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div
      className="dashboard-shell student-dashboard-shell lg:h-screen lg:max-h-screen lg:overflow-hidden support-portal-root"
      style={{
        backgroundColor: hexColor || "var(--bg-custom, #905FEB)",
        backgroundImage: isLightBg
          ? "linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px)"
          : "linear-gradient(rgba(255, 255, 255, 0.19) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.19) 1px, transparent 1px)",
      }}
    >
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:h-full lg:max-h-full lg:overflow-hidden">
        <SupportSidebar
          onSwitchToTeacher={onSwitchToTeacher}
          onSwitchToStudent={onSwitchToStudent}
          onLogout={onLogout}
          onOpenAiModal={onOpenAiModal}
        />
      </div>

      {/* Mobile Header Bar */}
      <div className="lg:hidden col-span-full flex items-center justify-between p-3 bg-white/95 backdrop-blur-md rounded-2xl border border-[#E5DEFF] shadow-xs mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-[#F0EDFF] text-[#7042D2] hover:bg-[#E2DBFC] transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <img src="/logo.png" alt="Quantum Logo" className="h-6 w-auto" />
          <span className="text-xs font-bold text-[#7042D2] bg-[#F0EDFF] px-2.5 py-0.5 rounded-full border border-[#905FEB]/20">
            Support
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onChangeHexColor && (
            <div className="scale-90">
              <HexColorField
                hexColor={hexColor || "#905FEB"}
                onChangeHex={onChangeHexColor}
              />
            </div>
          )}
          <img
            src="/assets/srimanth.png"
            alt="Srimanth"
            className="w-8 h-8 rounded-full border-2 border-[#905FEB]/40 object-cover"
          />
        </div>
      </div>

      {/* Mobile Slide-out Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-[#FAF9FF] p-4 flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DEFF]">
              <span className="font-bold text-sm text-[#111111]">Support Workspace</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-zinc-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto mt-2">
              <SupportSidebar
                onSwitchToTeacher={onSwitchToTeacher}
                onSwitchToStudent={onSwitchToStudent}
                onLogout={onLogout}
                onOpenAiModal={onOpenAiModal}
                onCloseDrawer={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Support Content Viewport */}
      <main className="dashboard-content lg:h-full lg:max-h-full lg:overflow-hidden flex flex-col min-h-0">
        {/* Top Control Bar for Desktop - Aligned to Right Side */}
        <div className="hidden lg:flex items-center justify-end mb-2.5 px-2 py-0.5 shrink-0">
          {onChangeHexColor && (
            <div className="scale-95">
              <HexColorField
                hexColor={hexColor || "#905FEB"}
                onChangeHex={onChangeHexColor}
              />
            </div>
          )}
        </div>

        {/* Viewport Content */}
        <div className="support-view-container flex-1 min-h-0 flex flex-col lg:overflow-hidden pb-1">
          <style>{`
            @media (width >= 40rem) {
              .support-view-container .sm\\:p-6,
              .support-page-font .sm\\:p-6 {
                padding: calc(var(--spacing) * 2);
              }
            }
          `}</style>
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
            <Route path="/support" element={<SupportDashboard />} />
            <Route path="/support/dashboard" element={<SupportDashboard />} />
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
