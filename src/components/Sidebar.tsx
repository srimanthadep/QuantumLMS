import { useEffect } from "react"
import type { IconName } from "../types"
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

export function TeacherProfile() {
  return (
    <div className="teacher">
      <img src="/assets/srimanth.png" alt="Srimanth" />
      <strong>Srimanth</strong>
      <span>Teacher</span>
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
}: {
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
}) {
  return (
    <aside className="sidebar" aria-label="Main sidebar">
      <Logo />
      <TeacherProfile />
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
}: {
  isOpen: boolean
  onClose: () => void
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
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
          <TeacherProfile />
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
