import { useState, useEffect, useRef } from "react"
import { Icon } from "./Icon"
import { ThemeAccentPicker } from "./ui/ThemeAccentPicker"
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

  const [studentUser, setStudentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("quantum_current_user")
      if (saved) {
        const u = JSON.parse(saved)
        return {
          name: u.name || "Leo Thompson",
          role: "Student",
          email: u.email || "leo@quantum-lms.edu",
          avatar: u.avatar || "/assets/student-2.png",
        }
      }
    } catch {
      // fallback
    }
    return {
      name: "Leo Thompson",
      role: "Student",
      email: "leo@quantum-lms.edu",
      avatar: "/assets/student-2.png",
    }
  })

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem("quantum_current_user")
        if (saved) {
          const u = JSON.parse(saved)
          setStudentUser({
            name: u.name || "Leo Thompson",
            role: "Student",
            email: u.email || "leo@quantum-lms.edu",
            avatar: u.avatar || "/assets/student-2.png",
          })
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hasTitleOrGreeting = Boolean(showGreeting || title)

  return (
    <header className="dashboard-header shrink-0 h-auto min-h-[56px] flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 mb-4 pl-12 lg:pl-0 w-full max-w-full min-w-0 box-border">
      {!hasTitleOrGreeting ? (
        <div className="search-box flex-1 max-w-xl min-w-[240px]">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              searchPlaceholder || "Search courses, lessons, assignments, or mentors..."
            }
            aria-label="Search portal"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="text-xs text-slate-400 hover:text-slate-700 font-medium px-1 cursor-pointer"
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
                <span>Welcome back, {studentUser.name}</span>
              </div>
              <div className="subtitle">
                Track your ongoing courses, upcoming live classes, and pending milestones.
              </div>
            </>
          ) : (
            <>
              <div className="greeting">
                <span>{title}</span>
              </div>
              {subtitle && <div className="subtitle">{subtitle}</div>}
            </>
          )}
        </div>
      )}

      <div className="header-actions flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
        {hasTitleOrGreeting && (
          <div className="search-box shrink-0">
            <Icon name="search" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder || "Search courses, assignments..."}
              aria-label="Search portal"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="text-xs text-slate-400 hover:text-slate-700 font-medium px-1 cursor-pointer"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        )}

        <button
          onClick={onSwitchToTeacher}
          className="px-3 h-9 rounded-lg bg-surface border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Switch to Teacher View"
        >
          <span>Teacher View</span>
        </button>

        <div className="shrink-0 hidden sm:block">
          <ThemeAccentPicker />
        </div>

        <button className="ask-ai shrink-0" onClick={onOpenAiModal} aria-label="Ask AI Assistant">
          <span>✦</span>
          <span>Ask AI</span>
        </button>

        {/* Notifications Bell */}
        <div className="relative shrink-0" ref={notifRef}>
          <button
            onClick={() => {
              setIsNotificationsOpen((prev) => !prev)
              setIsProfileOpen(false)
            }}
            className="relative bg-surface border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center w-9 h-9 rounded-lg text-slate-700 shadow-2xs"
            title="Notifications & Campus Notices"
            aria-label="View notifications"
          >
            <Icon name="bell" size={16} />
            <span className="absolute -top-1 -right-1 bg-primary text-white text-[9.5px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
              3
            </span>
          </button>

          {isNotificationsOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 bg-surface border border-slate-200 rounded-xl shadow-xl z-50 p-3 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-slate-900">Notifications</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-[#FEF2F0] text-primary-text">
                    3 new
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsNotificationsOpen(false)
                    onNavigate("Events & Notices")
                  }}
                  className="text-[11px] font-semibold text-primary-text hover:underline cursor-pointer"
                >
                  View all
                </button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                <div
                  onClick={() => {
                    setIsNotificationsOpen(false)
                    onNavigate("Assignments")
                  }}
                  className="p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="document" size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      Assignment 4 Graded: 94/100
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Heuristic Evaluation feedback is available.
                    </p>
                    <span className="text-[10px] text-slate-400">10m ago</span>
                  </div>
                </div>
                <div
                  onClick={() => {
                    setIsNotificationsOpen(false)
                    onNavigate("Events & Notices")
                  }}
                  className="p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="calendar" size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      Fall AI Hackathon RSVP Open
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Registration deadline closes tomorrow.
                    </p>
                    <span className="text-[10px] text-slate-400">1h ago</span>
                  </div>
                </div>
                <div
                  onClick={() => {
                    setIsNotificationsOpen(false)
                    onNavigate("Timetable")
                  }}
                  className="p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-[#172033] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="users" size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      Studio Class Starting in 15m
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Interactive Design Lab with Dr. Sarah Chan.
                    </p>
                    <span className="text-[10px] text-slate-400">2h ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative shrink-0" ref={profileRef}>
          <button
            onClick={() => {
              setIsProfileOpen((prev) => !prev)
              setIsNotificationsOpen(false)
            }}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg bg-surface border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer text-left shadow-2xs"
            title="Student Account & Profile"
            aria-label="Student profile menu"
          >
            <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-200">
              <img
                src={studentUser.avatar}
                alt={studentUser.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-xs font-semibold text-slate-900 max-w-[100px] truncate">
                {studentUser.name}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Student</span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold ml-0.5">
              {isProfileOpen ? "▴" : "▾"}
            </span>
          </button>

          {isProfileOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-60 bg-surface border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-3">
                <img
                  src={studentUser.avatar}
                  alt={studentUser.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {studentUser.name}
                  </p>
                  <p className="text-[11px] text-[#0F766E] font-medium truncate">
                    Student · Year 4
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{studentUser.email}</p>
                </div>
              </div>

              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    setIsProfileOpen(false)
                    onNavigate("Profile")
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                >
                  <Icon name="users" size={14} />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false)
                    onNavigate("Settings")
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                >
                  <Icon name="settings" size={14} />
                  <span>Account Settings</span>
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false)
                    onNavigate("Support & Help")
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                >
                  <Icon name="help" size={14} />
                  <span>Support & Help</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => {
                    setIsProfileOpen(false)
                    onSwitchToTeacher()
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                >
                  <Icon name="layers" size={14} />
                  <span>Switch to Teacher Portal</span>
                </button>

                {onLogout && (
                  <button
                    onClick={() => {
                      setIsProfileOpen(false)
                      onLogout()
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Icon name="logout" size={14} />
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

export default StudentHeader
