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

  // Navigation items specific to role - exactly matches teacher navigation styling
  const navigation: { icon: IconName; label: string }[] =
    role === "Super Admin"
      ? [
          { icon: "server", label: "System Health" },
          { icon: "layers", label: "Campuses" },
          { icon: "key", label: "Access Control" },
          { icon: "shield", label: "Audit Logs" },
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
    <aside className="sidebar" aria-label="Administrator sidebar">
      {/* Brand Logo - identical to teacher sidebar */}
      <div className="logo" aria-label="Quantum School of AI">
        <img
          src="/logo.png"
          alt="Quantum School of AI"
          className="logo-img"
        />
      </div>

      {/* Profile Block - uses standard .teacher class with 61px rounded avatar, strong name, and muted role */}
      <div
        className="teacher relative"
        style={{ cursor: "pointer" }}
        onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
        title="Click to switch role perspective"
      >
        <img
          src={currentUser.avatar || (role === "Super Admin" ? "/assets/srimanth.png" : "/assets/student-1.png")}
          alt={currentUser.name}
        />
        <strong>{currentUser.name}</strong>
        <span className="flex items-center justify-center gap-1">
          <span>{role === "Super Admin" ? "Super Admin" : "School Admin"}</span>
          <span className="text-[9px] text-purple-600 font-bold">▾</span>
        </span>

        {showRoleSwitcher && (
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
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between hover:bg-zinc-100 cursor-pointer ${
                role === "Super Admin" ? "bg-red-50 text-red-800 font-bold" : "text-zinc-700"
              }`}
            >
              <span>⚡ Super Admin</span>
              {role === "Super Admin" && <span className="text-red-600">✓</span>}
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Admin")
                setShowRoleSwitcher(false)
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between hover:bg-zinc-100 cursor-pointer ${
                role === "Admin" ? "bg-purple-50 text-purple-800 font-bold" : "text-zinc-700"
              }`}
            >
              <span>🏫 School Admin</span>
              {role === "Admin" && <span className="text-purple-600">✓</span>}
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchRole("Teacher")
                setShowRoleSwitcher(false)
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
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 cursor-pointer"
            >
              <span>🎒 Student</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation List - uses standard .sidebar nav and .nav-item identical to teacher sidebar */}
      <nav aria-label="Administrator navigation">
        {navigation.map((item) => {
          const isActive = activeTab === item.label
          return (
            <button
              key={item.label}
              className={isActive ? "nav-item active" : "nav-item"}
              onClick={() => setActiveTab(item.label)}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Logout Button - identical to teacher sidebar .logout-btn */}
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
