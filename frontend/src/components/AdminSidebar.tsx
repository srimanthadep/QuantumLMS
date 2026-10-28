import { useState } from "react"
import type { IconName, UserRole, CurrentUser } from "../types"
import { Icon } from "./Icon"

export type AdminNavPage = string

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
      <div className="logo" aria-label="Quantum School of AI">
        <img src="/logo.png" alt="Quantum School of AI" className="logo-img" />
      </div>

      <div
        className="teacher relative"
        style={{ cursor: "pointer" }}
        onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
        title="Click to switch role perspective"
      >
        <img
          src={
            currentUser.avatar ||
            (role === "Super Admin" ? "/assets/srimanth.png" : "/assets/student-1.png")
          }
          alt={currentUser.name}
        />
        <strong>{currentUser.name}</strong>
        <span className="flex items-center justify-center gap-1">
          <span>{role === "Super Admin" ? "Super Admin" : "School Admin"}</span>
          <span className="text-[10px] text-[#F0442E] font-bold">▾</span>
        </span>

        {showRoleSwitcher && (
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">
              Switch Perspective
            </div>
            {(
              [
                { role: "Super Admin", label: "Super Admin" },
                { role: "Admin", label: "School Admin" },
                { role: "Teacher", label: "Teacher" },
                { role: "Student", label: "Student" },
                { role: "Evaluator", label: "Evaluator Portal" },
                { role: "Support", label: "Support Desk" },
              ] as { role: UserRole; label: string }[]
            ).map((item) => (
              <button
                key={item.role}
                type="button"
                onClick={() => {
                  onSwitchRole(item.role)
                  setShowRoleSwitcher(false)
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  role === item.role
                    ? "bg-[#FEF2F0] text-[#F0442E] font-bold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{item.label}</span>
                {role === item.role && <span className="text-[#F0442E]">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

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

      <button className="logout-btn" onClick={onLogout} aria-label="Log out">
        <Icon name="logout" size={15} />
        <span>Log Out</span>
      </button>
    </aside>
  )
}

export default AdminSidebar
