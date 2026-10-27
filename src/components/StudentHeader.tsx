import { useState, useEffect, useRef } from "react"
import { Icon } from "./Icon"
import { HexColorField } from "./HexColorField"
import type { StudentNavPage } from "../pages/student/studentTypes"

export interface StudentHeaderProps {
  title?: string
  subtitle?: string
  showGreeting?: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  searchPlaceholder?: string
  onSwitchToTeacher: () => void
  hexColor: string
  onChangeHexColor: (c: string) => void
  onOpenAiModal: () => void
  onNavigate: (page: StudentNavPage) => void
  onLogout?: () => void
}

export function StudentHeader({
  title,
  subtitle,
  showGreeting = false,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  onSwitchToTeacher,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  onNavigate,
  onLogout,
}: StudentHeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Retrieve current student profile
  const [studentUser, setStudentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("quantum_current_user")
      if (saved) {
        const u = JSON.parse(saved)
        return {
          name: u.name || "Niharika",
          role: "Student",
          email: u.email || "niharika@quantum.ai",
          avatar: u.avatar || "/assets/student-1.png",
        }
      }
    } catch {
      // fallback
    }
    return {
      name: "Niharika",
      role: "Student",
      email: "niharika@quantum.ai",
      avatar: "/assets/student-1.png",
    }
  })

  // Listen for storage changes in case profile updates
  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem("quantum_current_user")
        if (saved) {
          const u = JSON.parse(saved)
          setStudentUser({
            name: u.name || "Niharika",
            role: "Student",
            email: u.email || "niharika@quantum.ai",
            avatar: u.avatar || "/assets/student-1.png",
          })
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false)
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hasTitleOrGreeting = Boolean(showGreeting || title)

  return (
    <header className="dashboard-header shrink-0 h-auto min-h-[54px] flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 mb-3 pl-12 lg:pl-0 w-full max-w-full min-w-0 box-border">
      {/* Left side: Search bar (when no title/greeting) OR Page Title / Greeting */}
      {!hasTitleOrGreeting ? (
        <div className="search-box flex-1 max-w-xl min-w-[240px]">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              searchPlaceholder || "Search for courses, announcements, events..."
            }
            aria-label="Search portal"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1 cursor-pointer"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <div className="min-w-0 py-0.5">
          {showGreeting ? (
            <>
              <div className="greeting">
                <span>Good morning, {studentUser.name}</span>
                <span className="wave-emoji" role="img" aria-label="wave">
                  👋
                </span>
              </div>
              <div className="subtitle text-xs text-white/90 leading-tight">
                Keep learning. Build your AI skills. Make an impact.
              </div>
            </>
          ) : (
            <>
              <div className="greeting">
                <span>{title}</span>
              </div>
              {subtitle && (
                <div className="subtitle text-xs text-white/90 leading-tight">
                  {subtitle}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Right side: Shared Navigation Actions & Profile */}
      <div className="header-actions flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
        {/* Search box only rendered here if page has a title/greeting on the left */}
        {hasTitleOrGreeting && (
          <div className="search-box shrink-0">
            <Icon name="search" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                searchPlaceholder || "Search for courses, announcements, events..."
              }
              aria-label="Search portal"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1 cursor-pointer"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Quick Portal Switcher */}
        <button
          onClick={onSwitchToTeacher}
          className="px-3 h-[35px] rounded-full bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-purple-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Switch to Teacher View"
        >
          <span>👨‍🏫 Teacher Portal</span>
        </button>

        {/* Background Hex Color Picker */}
        <div className="shrink-0">
          <HexColorField hexColor={hexColor} onChangeHex={onChangeHexColor} />
        </div>

        {/* Ask AI Black Pill Button */}
        <button
          className="ask-ai shrink-0"
          onClick={onOpenAiModal}
          aria-label="Ask AI Assistant"
        >
          <span>✦</span>
          Ask AI
        </button>

        {/* Notifications Bell */}
        <div className="relative shrink-0" ref={notifRef}>
          <button
            onClick={() => {
              setIsNotificationsOpen((prev) => !prev)
              setIsProfileOpen(false)
            }}
            className="student-icon-btn relative hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center w-[35px] h-[35px] rounded-full text-white"
            title="Notifications & Campus Notices"
            aria-label="View notifications"
          >
            <Icon name="bell" size={17} />
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9.5px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-xs">
              3
            </span>
          </button>

          {isNotificationsOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 bg-white border border-zinc-200/90 rounded-2xl shadow-xl z-50 p-3 text-left animate-in fade-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-zinc-900">
                    Notifications
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-600">
                    3 new
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsNotificationsOpen(false)
                    onNavigate("Events & Notices")
                  }}
                  className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                <div
                  onClick={() => {
                    setIsNotificationsOpen(false)
                    onNavigate("Assignments")
                  }}
                  className="p-2 rounded-xl hover:bg-purple-50/60 transition-colors cursor-pointer flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="document" size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-800 truncate">
                      Assignment 4 Graded: 94/100
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Heuristic Evaluation feedback is available.
                    </p>
                    <span className="text-[10px] text-zinc-400">10m ago</span>
                  </div>
                </div>
                <div
                  onClick={() => {
                    setIsNotificationsOpen(false)
                    onNavigate("Events & Notices")
                  }}
                  className="p-2 rounded-xl hover:bg-purple-50/60 transition-colors cursor-pointer flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-lime-100 text-lime-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="calendar" size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-800 truncate">
                      Fall AI Hackathon RSVP Open
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Registration deadline closes tomorrow.
                    </p>
                    <span className="text-[10px] text-zinc-400">1h ago</span>
                  </div>
                </div>
                <div
                  onClick={() => {
                    setIsNotificationsOpen(false)
                    onNavigate("Timetable")
                  }}
                  className="p-2 rounded-xl hover:bg-purple-50/60 transition-colors cursor-pointer flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="flex items-center">
                      <Icon name="users" size={13} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-800 truncate">
                      Studio Class Starting in 15m
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Interactive Design Lab with Dr. Sarah Chan.
                    </p>
                    <span className="text-[10px] text-zinc-400">2h ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile / Avatar Dropdown in top right corner */}
        <div className="relative shrink-0" ref={profileRef}>
          <button
            onClick={() => {
              setIsProfileOpen((prev) => !prev)
              setIsNotificationsOpen(false)
            }}
            className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-left"
            title="Student Account & Profile"
            aria-label="Student profile menu"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-white/70 shadow-xs">
              <img
                src={studentUser.avatar}
                alt={studentUser.name}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#5c3cd6]" />
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-white max-w-[100px] truncate">
                {studentUser.name}
              </span>
              <span className="text-[10px] text-purple-200/90 font-medium">
                Student
              </span>
            </div>
            <span className="text-[10px] text-white/80 font-bold ml-0.5 transition-transform duration-200">
              {isProfileOpen ? "▴" : "▾"}
            </span>
          </button>

          {isProfileOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-60 bg-white border border-zinc-200/90 rounded-2xl shadow-xl z-50 p-2 text-left animate-in fade-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Profile Header info */}
              <div className="px-3 py-2.5 border-b border-zinc-100 flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-purple-200">
                  <img
                    src={studentUser.avatar}
                    alt={studentUser.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900 truncate">
                    {studentUser.name}
                  </p>
                  <p className="text-[11px] text-purple-600 font-semibold truncate">
                    Student · Year 4
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {studentUser.email}
                  </p>
                </div>
              </div>

              {/* Dropdown Options */}
              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    setIsProfileOpen(false)
                    onNavigate("Profile")
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-100 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <span className="text-zinc-500 flex items-center">
                    <Icon name="users" size={14} />
                  </span>
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false)
                    onNavigate("Settings")
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-100 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <span className="text-zinc-500 flex items-center">
                    <Icon name="settings" size={14} />
                  </span>
                  <span>Account Settings</span>
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false)
                    onNavigate("Events & Notices")
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-100 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <span className="text-zinc-500 flex items-center">
                    <Icon name="bell" size={14} />
                  </span>
                  <span>Events & Notices</span>
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false)
                    onNavigate("Support & Help")
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-100 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <span className="text-zinc-500 flex items-center">
                    <Icon name="help" size={14} />
                  </span>
                  <span>Support & Help</span>
                </button>

                <div className="my-1 border-t border-zinc-100" />

                <button
                  onClick={() => {
                    setIsProfileOpen(false)
                    onSwitchToTeacher()
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-purple-700 hover:bg-purple-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <span>👨‍🏫</span>
                  <span>Switch to Teacher Portal</span>
                </button>

                {onLogout && (
                  <button
                    onClick={() => {
                      setIsProfileOpen(false)
                      onLogout()
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <span className="text-red-500 flex items-center">
                      <Icon name="logout" size={14} />
                    </span>
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
