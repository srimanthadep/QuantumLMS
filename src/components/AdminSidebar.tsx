import { useState } from "react"
import type { IconName, UserRole, CurrentUser } from "../types"
import { Icon } from "./Icon"

export function AdminSidebar({
  activeTab,
  setActiveTab,
  role,
  currentUser,
  onSwitchRole,
  onLogout,
}: {
  activeTab: string
  setActiveTab: (tab: string) => void
  role: "Super Admin" | "Admin"
  currentUser: CurrentUser
  onSwitchRole: (targetRole: UserRole) => void
  onLogout: () => void
}) {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)

  // Navigation items specific to role
  const navigation: { icon: IconName; label: string; badge?: string }[] =
    role === "Super Admin"
      ? [
          { icon: "server", label: "System Health", badge: "Live" },
          { icon: "layers", label: "Campuses" },
          { icon: "key", label: "Access Control" },
          { icon: "shield", label: "Audit Logs", badge: "Sec" },
          { icon: "cpu", label: "AI Engine" },
          { icon: "users", label: "Faculty & Staff" },
          { icon: "analytics", label: "School Pulse" },
        ]
      : [
          { icon: "home", label: "Overview" },
          { icon: "users", label: "Faculty Directory" },
          { icon: "book", label: "Student Roster" },
          { icon: "calendar", label: "Class Schedules" },
          { icon: "reports", label: "School Reports" },
          { icon: "settings", label: "School Settings" },
        ]

  return (
    <aside className="sidebar admin-sidebar" aria-label="Administrator sidebar">
      {/* Brand Logo */}
      <div className="logo" aria-label="Quantum School of AI">
        <img
          src="/logo.png"
          alt="Quantum School of AI"
          className="logo-img"
        />
      </div>

      {/* Admin Profile Box */}
      <div className="admin-profile-card">
        <div className="relative">
          <img
            src={currentUser.avatar || (role === "Super Admin" ? "/assets/srimanth.png" : "/assets/student-1.png")}
            alt={currentUser.name}
            className="w-11 h-11 rounded-2xl object-cover border-2 border-white shadow-sm"
          />
          <span
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
              role === "Super Admin" ? "bg-red-500" : "bg-purple-600"
            }`}
            title="Active Session"
          />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <strong className="text-xs font-bold text-zinc-900 truncate block">
              {currentUser.name}
            </strong>
          </div>
          <span className="text-[10px] text-zinc-500 font-semibold truncate block">
            {currentUser.title || (role === "Super Admin" ? "Root Administrator" : "Academic Director")}
          </span>
          <div className="mt-1 flex items-center gap-1">
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                role === "Super Admin"
                  ? "bg-red-100 text-red-700 border border-red-200"
                  : "bg-purple-100 text-purple-700 border border-purple-200"
              }`}
            >
              {role === "Super Admin" ? "⚡ Super Admin" : "🏫 School Admin"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Role Simulator Switcher Button */}
      <div className="relative mb-2">
        <button
          type="button"
          onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/80 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span>🔄</span>
            <span>Switch Role View</span>
          </div>
          <span className="text-[10px] text-purple-600">▾</span>
        </button>

        {showRoleSwitcher && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 p-1.5 flex flex-col gap-1">
            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
              Switch Active Perspective
            </div>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Super Admin")
                setShowRoleSwitcher(false)
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between hover:bg-zinc-100 ${
                role === "Super Admin" ? "bg-red-50 text-red-800 font-bold" : "text-zinc-700"
              }`}
            >
              <span>⚡ Super Admin Console</span>
              {role === "Super Admin" && <span className="text-red-600">✓</span>}
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Admin")
                setShowRoleSwitcher(false)
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between hover:bg-zinc-100 ${
                role === "Admin" ? "bg-purple-50 text-purple-800 font-bold" : "text-zinc-700"
              }`}
            >
              <span>🏫 School Admin Portal</span>
              {role === "Admin" && <span className="text-purple-600">✓</span>}
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Teacher")
                setShowRoleSwitcher(false)
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100"
            >
              <span>🎓 Teacher Workspace</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Student")
                setShowRoleSwitcher(false)
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100"
            >
              <span>🎒 Student Portal</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav aria-label="Administrator navigation" className="flex-1 flex flex-col gap-1">
        {navigation.map((item) => {
          const isActive = activeTab === item.label
          return (
            <button
              key={item.label}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(item.label)}
            >
              <Icon name={item.icon} size={18} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase bg-emerald-500/15 text-emerald-700">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Security Status Box */}
      <div className="mb-3 p-2.5 rounded-xl bg-white/70 border border-purple-100/60 shadow-xs text-left">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-700">
          <Icon name="shield" size={12} />
          <span>Encrypted Session</span>
        </div>
        <div className="text-[9px] text-zinc-500 mt-0.5">
          TLS 1.3 · IP 192.168.1.104
        </div>
      </div>

      {/* Logout Button */}
      <button
        className="logout-btn"
        onClick={onLogout}
        aria-label="Log out of administrator account"
      >
        <Icon name="logout" size={15} />
        <span>Log Out</span>
      </button>
    </aside>
  )
}
