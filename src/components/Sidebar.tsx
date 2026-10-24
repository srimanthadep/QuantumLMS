import { useState, useEffect } from "react"
import type { IconName, CurrentUser, UserRole } from "../types"
import { Icon } from "./Icon"
import { HexColorField } from "./HexColorField"

export function Logo() {
  return (
    <div className="logo" aria-label="Quantum School of AI">
      <img
        src="/logo.png"
        alt="Quantum School of AI"
        className="logo-img"
      />
    </div>
  )
}

export function TeacherProfile({
  currentUser,
  onSwitchRole,
}: {
  currentUser?: CurrentUser
  onSwitchRole?: (role: UserRole) => void
}) {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const displayName = currentUser?.name || "Srimanth"
  const avatar = currentUser?.avatar || "/assets/srimanth.png"
  const roleName = currentUser?.role || "Teacher"

  return (
    <div
      className="teacher relative"
      style={{ cursor: onSwitchRole ? "pointer" : "default" }}
      onClick={() => onSwitchRole && setShowRoleSwitcher(!showRoleSwitcher)}
      title={onSwitchRole ? "Click to switch role perspective" : undefined}
    >
      <img src={avatar} alt={displayName} />
      <strong>{displayName}</strong>
      <span className="flex items-center justify-center gap-1">
        <span>{roleName}</span>
        {onSwitchRole && <span className="text-[9px] text-purple-600 font-bold">▾</span>}
      </span>

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
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between bg-purple-50 text-purple-800 cursor-pointer"
          >
            <span>🎓 Teacher</span>
            <span className="text-purple-600 font-bold">✓</span>
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
          <button
            type="button"
            onClick={() => {
              onSwitchRole("Support")
              setShowRoleSwitcher(false)
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 cursor-pointer"
          >
            <span>🎧 Support Desk</span>
          </button>
        </div>
      )}
    </div>
  )
}

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
    { icon: "video" as IconName, label: "Live Class" },
    { icon: "analytics" as IconName, label: "Analytics" },
    { icon: "settings" as IconName, label: "Settings" },
  ]

  return (
    <nav aria-label="Dashboard navigation">
      {navigation.map((item) => {
        const isActive =
          activeTab === item.label ||
          (item.label === "Dashboard" && activeTab === "Class") ||
          (item.label === "My Students" && activeTab === "Students")
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
  hexColor,
  onChangeHexColor,
  currentUser,
  onSwitchRole,
}: {
  isOpen: boolean
  onClose: () => void
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
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
          <div className="mt-4 pt-4 border-t border-purple-200/50">
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">
              Background Color
            </div>
            <HexColorField
              hexColor={hexColor}
              onChangeHex={onChangeHexColor}
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
