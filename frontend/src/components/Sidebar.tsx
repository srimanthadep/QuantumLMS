import React, { useState, useEffect } from "react"
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  FileCheck2,
  Award,
  Users,
  Briefcase,
  HelpCircle,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  BarChart3,
  Layers,
  Key,
  ShieldCheck,
  Cpu,
  Server,
  Inbox,
  MessageCircle,
  FileText,
  Clock,
  Home,
  TrendingUp,
} from "lucide-react"
import type { IconName, CurrentUser, UserRole } from "../types"
import { Icon } from "./Icon"

export interface NavItemConfig {
  id: string
  label: string
  icon: any
  badge?: number | string
  badgeColor?: string
  onClick?: () => void
}

export interface NavGroupConfig {
  label?: string
  items: NavItemConfig[]
}

export interface AppSidebarProps {
  role?: UserRole | "Student" | "Teacher" | "Admin" | "Super Admin" | "Evaluator" | "Support"
  activeItem?: string
  activeTab?: string // backward compatibility
  onNavigate?: (id: any) => void
  setActiveTab?: (id: any) => void // backward compatibility
  currentUser?: CurrentUser
  onSwitchRole?: (role: UserRole) => void
  onLogout?: () => void
  onOpenAiModal?: () => void
  groups?: NavGroupConfig[]
  navItems?: NavItemConfig[]
  profile?: any
  pendingCount?: number
  reassessmentCount?: number
  unreadNotifsCount?: number
  collapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
}

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={`logo flex items-center ${collapsed ? "justify-center p-2" : "gap-3 px-4 py-3"}`} aria-label="Quantum School of AI">
      <img
        src="/assets/logo.png"
        alt="Quantum School of AI"
        className={`${collapsed ? "w-8 h-8 object-contain" : "h-7 w-auto object-contain"}`}
      />
      {!collapsed && (
        <div className="flex flex-col text-left leading-none">
          <span className="font-extrabold text-sm tracking-tight text-zinc-900">Quantum</span>
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">School of AI</span>
        </div>
      )}
    </div>
  )
}

export function TeacherProfile({
  currentUser,
  onSwitchRole,
  collapsed,
  onNavigateProfile,
}: {
  currentUser?: CurrentUser
  onSwitchRole?: (role: UserRole) => void
  collapsed?: boolean
  onNavigateProfile?: () => void
}) {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const displayName = currentUser?.name || "Srimanth"
  const avatar = currentUser?.avatar || "/assets/srimanth.png"
  const roleName = currentUser?.role || "Teacher"

  if (collapsed) {
    return (
      <div className="relative flex justify-center py-2">
        <button
          type="button"
          onClick={() => (onSwitchRole ? setShowRoleSwitcher(!showRoleSwitcher) : onNavigateProfile?.())}
          title={`${displayName} (${roleName}) - Switch perspective`}
          className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-200 hover:ring-2 hover:ring-[#F0442E]/40 transition-all cursor-pointer"
        >
          <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
        </button>

        {showRoleSwitcher && onSwitchRole && (
          <div
            className="absolute left-full top-0 ml-2 w-48 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-1 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <RoleSwitcherMenu currentRole={roleName as UserRole} onSelectRole={(r) => { onSwitchRole(r); setShowRoleSwitcher(false); }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="relative mx-3 my-2 p-2 rounded-2xl bg-zinc-50/80 border border-zinc-200/60 hover:bg-zinc-100/80 transition-colors"
      style={{ cursor: onSwitchRole || onNavigateProfile ? "pointer" : "default" }}
      onClick={() => {
        if (onSwitchRole) {
          setShowRoleSwitcher(!showRoleSwitcher)
        } else if (onNavigateProfile) {
          onNavigateProfile()
        }
      }}
      title={onSwitchRole ? "Click to switch role perspective" : onNavigateProfile ? "View Profile" : undefined}
    >
      <div className="flex items-center gap-2.5">
        <img src={avatar} alt={displayName} className="w-9 h-9 rounded-xl object-cover border border-[#F0442E]/30" />
        <div className="flex-1 min-w-0 text-left">
          <strong className="block text-xs font-bold text-zinc-900 truncate leading-tight">{displayName}</strong>
          <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1">
            <span>{roleName}</span>
            {onSwitchRole && <span className="text-[9px] text-[#F0442E] font-bold">▾</span>}
          </span>
        </div>
      </div>

      {showRoleSwitcher && onSwitchRole && (
        <div
          className="absolute left-0 right-0 top-full mt-2 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-1 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <RoleSwitcherMenu currentRole={roleName as UserRole} onSelectRole={(r) => { onSwitchRole(r); setShowRoleSwitcher(false); }} />
        </div>
      )}
    </div>
  )
}

function RoleSwitcherMenu({
  currentRole,
  onSelectRole,
}: {
  currentRole: UserRole
  onSelectRole: (role: UserRole) => void
}) {
  const roles: { role: UserRole; label: string; icon: string }[] = [
    { role: "Super Admin", label: "Super Admin", icon: "⚡" },
    { role: "Admin", label: "School Admin", icon: "🏫" },
    { role: "Teacher", label: "Teacher", icon: "🎓" },
    { role: "Student", label: "Student", icon: "🎒" },
    { role: "Evaluator", label: "Evaluator Portal", icon: "⚖️" },
    { role: "Support", label: "Support Desk", icon: "🎧" },
  ]

  return (
    <>
      <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
        Switch Perspective
      </div>
      {roles.map((r) => {
        const isSelected = currentRole === r.role
        return (
          <button
            key={r.role}
            type="button"
            onClick={() => onSelectRole(r.role)}
            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
              isSelected
                ? "bg-[#FEF2F0] text-[#F0442E] font-bold"
                : "text-zinc-700 hover:bg-zinc-100 font-medium"
            }`}
          >
            <span>{r.icon} {r.label}</span>
            {isSelected && <span className="text-[#F0442E] font-bold">✓</span>}
          </button>
        )
      })}
    </>
  )
}

export function AppSidebar({
  role = "Teacher",
  activeItem,
  activeTab,
  onNavigate,
  setActiveTab,
  currentUser,
  onSwitchRole,
  onLogout = () => {},
  onOpenAiModal,
  groups,
  navItems,
  profile,
  pendingCount = 0,
  reassessmentCount = 0,
  unreadNotifsCount = 0,
  collapsed: controlledCollapsed,
  onToggleCollapse,
  className = "",
}: AppSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed))

  const currentActive = activeItem || activeTab || "Dashboard"
  const handleSelect = (id: string) => {
    if (onNavigate) onNavigate(id)
    if (setActiveTab) setActiveTab(id)
  }

  // Determine role
  const resolvedRole = (currentUser?.role || role) as string

  // Build role-specific navigation items if not explicitly provided
  const resolvedNavItems = React.useMemo<NavItemConfig[]>(() => {
    if (navItems && navItems.length > 0) return navItems

    if (resolvedRole === "Student") {
      return [
        { id: "Dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
        { id: "My Courses", label: "My Courses", icon: <BookOpen size={18} /> },
        { id: "Schedule", label: "Schedule", icon: <Calendar size={18} /> },
        { id: "Assessments", label: "Assessments", icon: <FileCheck2 size={18} /> },
        { id: "Grades & Certificates", label: "Grades & Certificates", icon: <Award size={18} /> },
        { id: "Community", label: "Community", icon: <Users size={18} /> },
        { id: "Career Hub", label: "Career Hub", icon: <Briefcase size={18} /> },
      ]
    }

    if (resolvedRole === "Super Admin") {
      return [
        { id: "System Health", label: "System Health", icon: <Server size={18} /> },
        { id: "Campuses", label: "Campuses", icon: <Layers size={18} /> },
        { id: "Access Control", label: "Access Control", icon: <Key size={18} /> },
        { id: "Audit Logs", label: "Audit Logs", icon: <ShieldCheck size={18} /> },
        { id: "AI Engine", label: "AI Engine", icon: <Cpu size={18} /> },
        { id: "Faculty & Staff", label: "Faculty & Staff", icon: <Users size={18} /> },
        { id: "School Pulse", label: "School Pulse", icon: <BarChart3 size={18} /> },
      ]
    }

    if (resolvedRole === "Admin") {
      return [
        { id: "Overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
        { id: "Faculty Directory", label: "Faculty Directory", icon: <Users size={18} /> },
        { id: "Student Roster", label: "Student Roster", icon: <BookOpen size={18} /> },
        { id: "Class Schedules", label: "Class Schedules", icon: <Calendar size={18} /> },
        { id: "School Reports", label: "School Reports", icon: <BarChart3 size={18} /> },
        { id: "School Settings", label: "School Settings", icon: <Settings size={18} /> },
      ]
    }

    if (resolvedRole === "Evaluator") {
      return [
        { id: "Dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
        {
          id: "Submissions",
          label: "Submissions",
          icon: <FileText size={18} />,
          badge: pendingCount > 0 ? pendingCount : undefined,
          badgeColor: "bg-amber-100 text-amber-800",
        },
        { id: "Reports", label: "Reports", icon: <BarChart3 size={18} /> },
        { id: "Settings", label: "Settings", icon: <Settings size={18} /> },
      ]
    }

    if (resolvedRole === "Support") {
      return [
        { id: "Dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
        { id: "Tickets Inbox", label: "Tickets Inbox", icon: <Inbox size={18} /> },
        { id: "Live Chat", label: "Live Chat", icon: <MessageCircle size={18} /> },
        { id: "Knowledge Base", label: "Knowledge Base", icon: <BookOpen size={18} /> },
        { id: "Support Agents", label: "Support Agents", icon: <Users size={18} /> },
        { id: "Analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
        { id: "Settings", label: "Settings", icon: <Settings size={18} /> },
      ]
    }

    // Default: Teacher
    return [
      { id: "Dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
      { id: "My Courses", label: "My Courses", icon: <BookOpen size={18} /> },
      { id: "My Students", label: "My Students", icon: <Users size={18} /> },
      { id: "Doubts", label: "Doubts", icon: <MessageCircle size={18} /> },
      { id: "Calendar", label: "Calendar", icon: <Calendar size={18} /> },
      { id: "Analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
    ]
  }, [resolvedRole, navItems, pendingCount])

  // Footer utility items (Settings & Support)
  const utilityItems = React.useMemo<NavItemConfig[]>(() => {
    if (resolvedRole === "Student") {
      return [
        { id: "Support & Help", label: "Support", icon: <HelpCircle size={18} /> },
        { id: "Settings", label: "Settings", icon: <Settings size={18} /> },
      ]
    }
    if (resolvedRole === "Teacher") {
      return [
        { id: "Help & Support", label: "Help & Support", icon: <HelpCircle size={18} /> },
        { id: "Settings", label: "Settings", icon: <Settings size={18} /> },
      ]
    }
    return []
  }, [resolvedRole])

  const isItemActive = (id: string, label: string) => {
    if (currentActive === id || currentActive === label) return true
    if (id === "Dashboard" && (currentActive === "Home" || currentActive === "Class")) return true
    if (id === "Schedule" && currentActive === "Timetable") return true
    if (id === "Assessments" && (currentActive === "Assignments" || currentActive === "Quizzes")) return true
    if (id === "Grades & Certificates" && (currentActive === "Grades" || currentActive === "Certificates")) return true
    if (id === "Community" && (currentActive === "Communication" || currentActive === "Discussions")) return true
    if (id === "Career Hub" && (currentActive === "Mock Interview" || currentActive === "Resume Building" || currentActive === "Mentor Details")) return true
    if (id === "Settings" && currentActive === "Profile") return true
    if ((id === "Support & Help" || id === "Help & Support") && (currentActive === "Support" || currentActive === "Help" || currentActive === "Help Center")) return true
    return false
  }

  const effectiveUser: CurrentUser = currentUser || (() => {
    try {
      const saved = localStorage.getItem("quantum_current_user")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.name) return parsed
      }
    } catch {
      // ignore
    }
    return {
      name: resolvedRole === "Student" ? "Leo Thompson" : resolvedRole === "Evaluator" ? profile?.name || "Dr. Alistair Vance" : "Srimanth",
      role: (resolvedRole as UserRole) || "Teacher",
      avatar: resolvedRole === "Student" ? "/assets/student-2.png" : "/assets/srimanth.png",
    }
  })()

  return (
    <aside
      className={`sidebar-shell flex flex-col justify-between h-full max-h-full bg-white border-r border-zinc-200/80 transition-all duration-200 select-none ${
        isCollapsed ? "w-[64px]" : "w-[240px]"
      } ${className}`}
      aria-label={`${resolvedRole} Navigation`}
    >
      {/* Top Header: Logo + Collapse Toggle */}
      <div className="shrink-0 flex items-center justify-between border-b border-zinc-100">
        <Logo collapsed={isCollapsed} />
        <button
          type="button"
          onClick={toggleCollapse}
          className="p-1.5 mr-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          title={isCollapsed ? "Expand sidebar (240px)" : "Collapse sidebar (64px)"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* User Identity Profile Card */}
      <div className="shrink-0">
        <TeacherProfile
          currentUser={effectiveUser}
          onSwitchRole={onSwitchRole}
          collapsed={isCollapsed}
          onNavigateProfile={() => handleSelect(resolvedRole === "Student" ? "Settings" : "Profile")}
        />
      </div>

      {/* Main Navigation Item Stack */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-2 flex flex-col gap-1" aria-label="Main menu">
        {resolvedNavItems.map((item) => {
          const active = isItemActive(item.id, item.label)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.onClick) item.onClick()
                handleSelect(item.id)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${
                isCollapsed ? "justify-center px-0" : ""
              } ${
                active
                  ? "bg-[#FEF2F0] text-[#F0442E] font-semibold"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 font-medium"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={`shrink-0 ${active ? "text-[#F0442E]" : "text-zinc-500"}`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {!isCollapsed && item.badge !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || "bg-[#FEF2F0] text-[#F0442E]"}`}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}

        {/* Optional separator if utility items exist */}
        {utilityItems.length > 0 && !isCollapsed && (
          <div className="my-2 border-t border-zinc-100" />
        )}

        {/* Utility Items (Settings / Support) */}
        {utilityItems.map((item) => {
          const active = isItemActive(item.id, item.label)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.onClick) item.onClick()
                handleSelect(item.id)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${
                isCollapsed ? "justify-center px-0" : ""
              } ${
                active
                  ? "bg-[#FEF2F0] text-[#F0442E] font-semibold"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 font-medium"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={`shrink-0 ${active ? "text-[#F0442E]" : "text-zinc-500"}`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer Actions: Ask AI & Logout */}
      <div className="shrink-0 p-2 border-t border-zinc-100 flex flex-col gap-1.5">
        {onOpenAiModal && (
          <button
            type="button"
            onClick={onOpenAiModal}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isCollapsed
                ? "bg-[#172033] text-white"
                : "bg-teal-50 text-[#0F766E] hover:bg-teal-100/80 border border-teal-600/20 shadow-2xs"
            }`}
            title="Ask AI Copilot"
          >
            <Sparkles size={15} />
            {!isCollapsed && <span>Ask AI Tutor</span>}
          </button>
        )}

        <button
          type="button"
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50/70 transition-colors cursor-pointer ${
            isCollapsed ? "justify-center px-0" : ""
          }`}
          title="Log Out"
        >
          <LogOut size={16} />
          {!isCollapsed && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  )
}

// Backward-compatible named exports
export { AppSidebar as StudentSidebar }
export { AppSidebar as AdminSidebar }
export { AppSidebar as EvaluatorSidebar }

// Legacy teacher desktop & mobile drawer components
export function NavigationList({
  activeTab,
  setActiveTab,
  onItemClick,
}: {
  activeTab: string
  setActiveTab: (tab: string) => void
  onItemClick?: () => void
}) {
  const navigation = [
    { icon: "home" as IconName, label: "Dashboard" },
    { icon: "book" as IconName, label: "My Courses" },
    { icon: "users" as IconName, label: "My Students" },
    { icon: "message-circle" as IconName, label: "Doubts" },
    { icon: "calendar" as IconName, label: "Calendar" },
    { icon: "analytics" as IconName, label: "Analytics" },
    { icon: "settings" as IconName, label: "Settings" },
    { icon: "help" as IconName, label: "Help & Support" },
  ]

  return (
    <nav aria-label="Dashboard navigation">
      {navigation.map((item) => {
        const isActive =
          activeTab === item.label ||
          (item.label === "Dashboard" && activeTab === "Class") ||
          (item.label === "My Students" && activeTab === "Students") ||
          (item.label === "Help & Support" && (activeTab === "Support" || activeTab === "Help"))
        return (
          <button
            key={item.label}
            className={isActive ? "nav-item active" : "nav-item"}
            onClick={() => {
              setActiveTab(item.label)
              onItemClick?.()
            }}
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function DesktopSidebar({
  activeTab,
  setActiveTab,
  onLogout,
  currentUser,
  onSwitchRole,
}: {
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
  currentUser?: CurrentUser
  onSwitchRole?: (role: UserRole) => void
}) {
  return (
    <aside className="sidebar" aria-label="Main sidebar">
      <Logo />
      <TeacherProfile currentUser={currentUser} onSwitchRole={onSwitchRole} />
      <NavigationList activeTab={activeTab} setActiveTab={setActiveTab} />
      <button
        className="logout-btn"
        onClick={onLogout}
        aria-label="Log out"
      >
        <Icon name="logout" size={15} />
        <span>Log Out</span>
      </button>
    </aside>
  )
}

export function MobileDrawer({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onLogout,
  currentUser,
  onSwitchRole,
}: {
  isOpen: boolean
  onClose: () => void
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
  hexColor?: string
  onChangeHexColor?: (color: string) => void
  currentUser?: CurrentUser
  onSwitchRole?: (role: UserRole) => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.body.style.overflow = "auto"
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div
        className="drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
      >
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-purple-200/50">
            <Logo />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors text-zinc-700"
              aria-label="Close menu"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          <TeacherProfile
            currentUser={currentUser}
            onSwitchRole={(r) => {
              onClose()
              onSwitchRole?.(r)
            }}
          />
          <div className="mt-4">
            <NavigationList
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onItemClick={onClose}
            />
          </div>
        </div>
        <button
          className="logout-btn"
          onClick={() => {
            onClose()
            onLogout()
          }}
          aria-label="Log out"
        >
          <Icon name="logout" size={15} />
          <span>Log Out</span>
        </button>
      </div>
    </>
  )
}

export function MobileTopBar({
  onOpenDrawer,
  onOpenNewAssignment,
}: {
  onOpenDrawer: () => void
  onOpenNewAssignment: () => void
}) {
  return (
    <div className="mobile-top-bar">
      <div className="flex items-center gap-3">
        <button
          className="mobile-nav-btn"
          onClick={onOpenDrawer}
          aria-label="Open navigation menu"
        >
          <Icon name="menu" size={20} />
        </button>
        <Logo />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenNewAssignment}
          className="h-8 px-3 rounded-full btn-primary text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
        >
          <span>+New Assignment</span>
        </button>
        <img
          src="/assets/srimanth.png"
          alt="Srimanth"
          className="w-8 h-8 rounded-full object-cover border border-purple-300"
        />
      </div>
    </div>
  )
}

export default AppSidebar
