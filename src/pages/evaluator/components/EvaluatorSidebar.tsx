import React, { useState } from "react"
import {
  LayoutDashboard,
  ClipboardCheck,
  BookOpenCheck,
  FileText,
  RotateCcw,
  CheckCircle2,
  BarChart3,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
  Sparkles,
} from "lucide-react"
import type { UserRole, CurrentUser } from "../../../types"
import type { EvaluatorProfile } from "../types"

export type EvaluatorTab =
  | "Dashboard"
  | "My Evaluations"
  | "Assessments"
  | "Submissions"
  | "Reassessment"
  | "Results & Feedback"
  | "Reports"
  | "Notifications"
  | "Settings"

interface EvaluatorSidebarProps {
  activeTab: EvaluatorTab
  setActiveTab: (tab: EvaluatorTab) => void
  profile: EvaluatorProfile
  pendingCount?: number
  reassessmentCount?: number
  unreadNotifsCount?: number
  onLogout: () => void
  onSwitchRole?: (role: UserRole) => void
  currentUser?: CurrentUser
  onOpenAiModal?: () => void
}

export function EvaluatorSidebar({
  activeTab,
  setActiveTab,
  profile,
  pendingCount = 0,
  reassessmentCount = 0,
  unreadNotifsCount = 0,
  onLogout,
  onSwitchRole,
  currentUser,
  onOpenAiModal,
}: EvaluatorSidebarProps) {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)

  const navigationItems: {
    id: EvaluatorTab
    label: string
    icon: React.ReactNode
    badge?: number
    badgeColor?: string
  }[] = [
    {
      id: "Dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: "My Evaluations",
      label: "My Evaluations",
      icon: <ClipboardCheck className="w-4 h-4 shrink-0" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: "bg-purple-100 text-purple-700",
    },
    {
      id: "Assessments",
      label: "Assessments",
      icon: <BookOpenCheck className="w-4 h-4 shrink-0" />,
    },
    {
      id: "Submissions",
      label: "Submissions",
      icon: <FileText className="w-4 h-4 shrink-0" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      id: "Reassessment",
      label: "Reassessment",
      icon: <RotateCcw className="w-4 h-4 shrink-0" />,
      badge: reassessmentCount > 0 ? reassessmentCount : undefined,
      badgeColor: "bg-rose-100 text-rose-700 font-bold animate-pulse",
    },
    {
      id: "Results & Feedback",
      label: "Results & Feedback",
      icon: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    },
    {
      id: "Reports",
      label: "Reports",
      icon: <BarChart3 className="w-4 h-4 shrink-0" />,
    },
    {
      id: "Notifications",
      label: "Notifications",
      icon: <Bell className="w-4 h-4 shrink-0" />,
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined,
      badgeColor: "bg-amber-100 text-amber-700 font-bold",
    },
    {
      id: "Settings",
      label: "Settings",
      icon: <SettingsIcon className="w-4 h-4 shrink-0" />,
    },
  ]

  return (
    <aside
      className="sidebar evaluator-sidebar flex flex-col justify-between h-full max-h-full box-border min-h-0 select-none"
      aria-label="Evaluator Portal Navigation"
    >
      {/* Brand Logo */}
      <div
        className="logo cursor-pointer shrink-0"
        onClick={() => setActiveTab("Dashboard")}
        aria-label="Quantum LMS Evaluator"
      >
        <img src="/logo.png" alt="Quantum School of AI" className="logo-img" />
      </div>

      {/* Evaluator Profile Card with Role Switcher */}
      <div
        className="teacher relative cursor-pointer hover:opacity-95 transition-opacity shrink-0"
        onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
        title="Click to switch role perspective"
      >
        <img
          src={profile.avatar || "/assets/srimanth.png"}
          alt={profile.name}
          className="w-12 h-12 rounded-full object-cover border-2 border-purple-200"
        />
        <strong className="text-sm font-bold text-zinc-900 truncate block max-w-[140px]">
          {profile.name}
        </strong>
        <span className="flex items-center justify-center gap-1 text-[11px] font-medium text-purple-700">
          <span>{profile.role}</span>
          <ChevronDown className="w-3 h-3 text-purple-600 shrink-0" />
        </span>

        {/* Role Switcher Menu */}
        {showRoleSwitcher && onSwitchRole && (
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-52 bg-white border border-zinc-200 rounded-2xl shadow-2xl z-50 p-2 flex flex-col gap-1 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
              Switch Perspective
            </div>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Teacher")
                setShowRoleSwitcher(false)
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <span>👨‍🏫 Teacher Portal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Student")
                setShowRoleSwitcher(false)
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <span>🎒 Student Portal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Admin")
                setShowRoleSwitcher(false)
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <span>🏫 School Admin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Super Admin")
                setShowRoleSwitcher(false)
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <span>⚡ Super Admin</span>
            </button>
            <div className="border-t border-zinc-100 my-1"></div>
            <div className="w-full px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between bg-purple-50 text-purple-800">
              <span>⚖️ Combined Evaluator</span>
              <span className="text-purple-600 font-bold">✓ Active</span>
            </div>
          </div>
        )}
      </div>

      {/* 9 Navigation List Items */}
      <nav
        className="flex-1 min-h-0 overflow-y-auto no-scrollbar py-2 flex flex-col gap-1"
        aria-label="Evaluator main navigation"
      >
        {navigationItems.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={isActive ? "nav-item active" : "nav-item"}
              title={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "10px 14px",
                borderRadius: "14px",
                fontSize: "13px",
                fontWeight: isActive ? 700 : 500,
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={isActive ? "text-purple-700" : "text-zinc-500"}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 font-bold ${
                    item.badgeColor || "bg-zinc-200 text-zinc-700"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Sidebar Footer Actions */}
      <div className="evaluator-sidebar-footer shrink-0 mt-auto pt-2 flex flex-col gap-2">
        {onOpenAiModal && (
          <button
            type="button"
            onClick={onOpenAiModal}
            className="w-full py-2 px-3 rounded-xl bg-purple-100/70 hover:bg-purple-200/80 text-purple-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-purple-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-700" />
            <span>AI Rubric Assistant</span>
          </button>
        )}

        {/* Logout Button */}
        <button
          className="logout-btn w-full"
          onClick={onLogout}
          aria-label="Log Out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  )
}

export default EvaluatorSidebar
