import { useState, useEffect, useRef, type ReactNode } from "react"
import { Icon } from "../../components/Icon"
import { HexColorField } from "../../components/HexColorField"

export interface TeacherHeaderActionsProps {
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenAiModal?: () => void
  onSwitchToStudent?: () => void
  showPortalSwitch?: boolean
  children?: ReactNode
}

export function TeacherHeaderActions({
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  onSwitchToStudent,
  showPortalSwitch = true,
  children,
}: TeacherHeaderActionsProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Current Teacher Profile State
  const [teacherUser, setTeacherUser] = useState(() => {
    try {
      const saved = localStorage.getItem("quantum_current_user")
      if (saved) {
        const u = JSON.parse(saved)
        if (u.role === "Teacher" || u.name === "Srimanth") {
          return {
            name: u.name || "Srimanth",
            role: "Teacher",
            subtitle: u.title || "Teacher · Year 4 Lead",
            email: u.email || "srimanth@quantum-lms.edu",
            avatar: "/assets/teacher.png",
          }
        }
      }
    } catch {
      // ignore
    }
    return {
      name: "Srimanth",
      role: "Teacher",
      subtitle: "Teacher · Year 4 Lead",
      email: "srimanth@quantum-lms.edu",
      avatar: "/assets/teacher.png",
    }
  })

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

  const handleNavigate = (path: string) => {
    setIsProfileOpen(false)
    setIsNotificationsOpen(false)
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", path)
      window.dispatchEvent(new PopStateEvent("popstate"))
    }
  }

  const handleRoleSwitch = () => {
    setIsProfileOpen(false)
    if (onSwitchToStudent) {
      onSwitchToStudent()
    } else {
      try {
        localStorage.setItem("quantum_user_role", "Student")
        window.location.pathname = "/student"
      } catch {
        window.location.pathname = "/student"
      }
    }
  }

  const handleLogout = () => {
    setIsProfileOpen(false)
    try {
      localStorage.setItem("quantum_auth_session", "false")
      window.location.pathname = "/auth"
    } catch {
      window.location.pathname = "/auth"
    }
  }

  return (
    <div className="header-actions flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
      {/* Optional page-specific action buttons (e.g. + Add Reminder, Save All, New Request) */}
      {children}

      {/* Quick Portal Switcher Button */}
      {showPortalSwitch && (
        <button
          type="button"
          onClick={handleRoleSwitch}
          className="px-3 h-[35px] rounded-full bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-purple-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Switch to Student Portal"
          aria-label="Switch to Student Portal"
        >
          <span>🎓 Student Portal</span>
        </button>
      )}

      {/* Background HEX color picker */}
      <div className="shrink-0">
        <HexColorField hexColor={hexColor} onChangeHex={onChangeHexColor} />
      </div>

      {/* Ask AI Black Pill Button */}
      <button
        type="button"
        className="ask-ai shrink-0 cursor-pointer"
        onClick={() => {
          if (onOpenAiModal) {
            onOpenAiModal()
          } else {
            window.dispatchEvent(new CustomEvent("open-ai-modal"))
          }
        }}
        aria-label="Ask AI assistant"
      >
        <span>✦</span>
        Ask AI
      </button>

      {/* Notifications Bell Button with Red Badge 3 */}
      <div className="relative shrink-0" ref={notifRef}>
        <button
          type="button"
          onClick={() => {
            setIsNotificationsOpen((prev) => !prev)
            setIsProfileOpen(false)
          }}
          className="relative flex items-center justify-center w-[35px] h-[35px] rounded-full bg-white text-zinc-700 hover:bg-zinc-100 shadow-sm transition-colors cursor-pointer border border-white/60"
          title="Notifications & Campus Notices"
          aria-label="View notifications"
        >
          <Icon name="bell" size={17} />
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9.5px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
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
                type="button"
                onClick={() => handleNavigate("/teacher/calendar")}
                className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
              >
                View all
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
              {/* Notification 1: Submissions */}
              <div
                onClick={() => handleNavigate("/teacher/class")}
                className="p-2 rounded-xl hover:bg-purple-50/60 transition-colors cursor-pointer flex items-start gap-2.5"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="document" size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-800 truncate">
                    Assignment 4 Submissions: 18/24
                  </p>
                  <p className="text-[11px] text-zinc-500 line-clamp-1">
                    Heuristic Evaluation feedback is available.
                  </p>
                  <span className="text-[10px] text-zinc-400">10m ago</span>
                </div>
              </div>

              {/* Notification 2: Hackathon RSVP */}
              <div
                onClick={() => handleNavigate("/teacher/calendar")}
                className="p-2 rounded-xl hover:bg-purple-50/60 transition-colors cursor-pointer flex items-start gap-2.5"
              >
                <div className="w-8 h-8 rounded-full bg-lime-100 text-lime-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="calendar" size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-800 truncate">
                    Fall AI Hackathon RSVP Open
                  </p>
                  <p className="text-[11px] text-zinc-500 line-clamp-1">
                    Registration deadline closes tomorrow.
                  </p>
                  <span className="text-[10px] text-zinc-400">1h ago</span>
                </div>
              </div>

              {/* Notification 3: Live Studio Class */}
              <div
                onClick={() => handleNavigate("/teacher/live")}
                className="p-2 rounded-xl hover:bg-purple-50/60 transition-colors cursor-pointer flex items-start gap-2.5"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="users" size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-800 truncate">
                    Studio Class Starting In 15m
                  </p>
                  <p className="text-[11px] text-zinc-500 line-clamp-1">
                    Interactive Design Lab with Year 4 Cohort.
                  </p>
                  <span className="text-[10px] text-zinc-400">2h ago</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile / Avatar Pill with Dropdown */}
      <div className="relative shrink-0" ref={profileRef}>
        <button
          type="button"
          onClick={() => {
            setIsProfileOpen((prev) => !prev)
            setIsNotificationsOpen(false)
          }}
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-left"
          title="Teacher Account & Profile"
          aria-label="Teacher profile menu"
        >
          <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-white/80 shadow-xs">
            <img
              src={teacherUser.avatar}
              alt={teacherUser.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = "/assets/student-1.png"
              }}
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
          <div className="hidden sm:flex flex-col text-left leading-tight">
            <span className="text-xs font-bold text-white max-w-[100px] truncate">
              {teacherUser.name}
            </span>
            <span className="text-[10px] text-purple-200/90 font-medium">
              {teacherUser.role}
            </span>
          </div>
          <span className="text-[10px] text-white/80 font-bold ml-0.5 transition-transform duration-200">
            {isProfileOpen ? "▴" : "▾"}
          </span>
        </button>

        {isProfileOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-64 bg-white border border-zinc-200/90 rounded-2xl shadow-xl z-50 p-2 text-left animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile Header User Card */}
            <div className="px-3 py-2.5 border-b border-zinc-100 flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-purple-200 shadow-xs">
                <img
                  src={teacherUser.avatar}
                  alt={teacherUser.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = "/assets/student-1.png"
                  }}
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-zinc-900 truncate">
                  {teacherUser.name}
                </p>
                <p className="text-[11px] text-purple-600 font-semibold truncate">
                  {teacherUser.subtitle}
                </p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {teacherUser.email}
                </p>
              </div>
            </div>

            {/* Dropdown Options matching Student Header reference */}
            <div className="py-1 space-y-0.5">
              <button
                type="button"
                onClick={() => handleNavigate("/teacher/settings")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-100 flex items-center gap-2.5 cursor-pointer transition-colors"
              >
                <span className="text-zinc-500 flex items-center">
                  <Icon name="users" size={14} />
                </span>
                <span>My Profile</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate("/teacher/settings")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-100 flex items-center gap-2.5 cursor-pointer transition-colors"
              >
                <span className="text-zinc-500 flex items-center">
                  <Icon name="settings" size={14} />
                </span>
                <span>Account Settings</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate("/teacher/calendar")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-100 flex items-center gap-2.5 cursor-pointer transition-colors"
              >
                <span className="text-zinc-500 flex items-center">
                  <Icon name="bell" size={14} />
                </span>
                <span>Events & Notices</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate("/teacher/support")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-100 flex items-center gap-2.5 cursor-pointer transition-colors"
              >
                <span className="text-zinc-500 flex items-center">
                  <Icon name="help" size={14} />
                </span>
                <span>Support & Help</span>
              </button>

              <div className="my-1 border-t border-zinc-100" />

              <button
                type="button"
                onClick={handleRoleSwitch}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-purple-700 hover:bg-purple-50 flex items-center gap-2.5 cursor-pointer transition-colors"
              >
                <span>🎓</span>
                <span>Switch to Student Portal</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer transition-colors"
              >
                <span className="text-red-500 flex items-center">
                  <Icon name="logout" size={14} />
                </span>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
