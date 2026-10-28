import { useState, useEffect, useMemo } from "react"
import { Icon } from "../../components/Icon"
import type { IconName } from "../../types"
import { HexColorField } from "../../components/HexColorField"
import { TeacherHeaderActions } from "./TeacherHeaderActions"

export type SettingsTabId =
  | "preferences"
  | "notifications"
  | "appearance"
  | "security"
  | "accessibility"

interface SettingsTabItem {
  id: SettingsTabId
  label: string
  subtitle: string
  icon: IconName
  badge?: string
}

export const SETTINGS_TABS: SettingsTabItem[] = [
  {
    id: "preferences",
    label: "Account Preferences",
    subtitle: "Language, regional time zone, date & time format",
    icon: "settings",
  },
  {
    id: "notifications",
    label: "Notifications",
    subtitle: "Assignments, student submissions, events, notices & alerts",
    icon: "bell",
    badge: "Active",
  },
  {
    id: "appearance",
    label: "Appearance",
    subtitle: "Accent colors, layout density, and canvas styling",
    icon: "sparkles",
  },
  {
    id: "security",
    label: "Privacy & Security",
    subtitle: "SSO credentials, active sessions & directory privacy",
    icon: "check",
  },
  {
    id: "accessibility",
    label: "Accessibility",
    subtitle: "Display font sizing, reduced motion, focus rings",
    icon: "activity",
  },
]

export function AccountSettingsHeader({
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  onSwitchToProfile,
}: {
  searchQuery?: string
  setSearchQuery?: (q: string) => void
  hexColor?: string
  onChangeHexColor?: (color: string) => void
  onOpenAiModal?: () => void
  onSwitchToProfile?: () => void
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>Account Settings</span>
        </div>
        <div className="subtitle">
          Manage system preferences, notification dispatches, interface display, sessions, and accessibility
        </div>
      </div>
      <div className="header-actions flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {setSearchQuery && (
          <div className="search-box">
            <Icon name="search" size={15} />
            <input
              type="text"
              value={searchQuery || ""}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              aria-label="Search settings"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1 cursor-pointer"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        )}
        <TeacherHeaderActions
          hexColor={hexColor || "#9860e9"}
          onChangeHexColor={onChangeHexColor || (() => {})}
          onOpenAiModal={onOpenAiModal}
          showPortalSwitch={true}
        >
          {onSwitchToProfile && (
            <button
              type="button"
              onClick={onSwitchToProfile}
              className="h-9 px-3.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              aria-label="Open My Profile"
            >
              <Icon name="users" size={13} />
              <span>My Profile</span>
            </button>
          )}
        </TeacherHeaderActions>
      </div>
    </header>
  )
}

export default function AccountSettingsPage({
  searchQuery = "",
  setSearchQuery,
  hexColor = "#9860e9",
  onChangeHexColor,
  onOpenAiModal,
  onToast,
  onSwitchToProfile,
  initialTab = "preferences",
}: {
  searchQuery?: string
  setSearchQuery?: (q: string) => void
  hexColor?: string
  onChangeHexColor?: (color: string) => void
  onOpenAiModal?: () => void
  onToast?: (msg: string) => void
  onSwitchToProfile?: () => void
  initialTab?: SettingsTabId
}) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // 1. Account Preferences State
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_preferences_v2") || localStorage.getItem("quantum_teacher_preferences_v1")
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      language: "en-US",
      timeZone: "America/New_York",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "12-hour",
      landingPage: "Dashboard",
      weekStart: "Monday",
    }
  })

  // 2. Notifications State
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_notifications_v2") || localStorage.getItem("quantum_teacher_notifications_v1")
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      assignmentUpdates: true,
      studentSubmissions: true,
      lateSubmissionsAlert: true,
      eventsNotices: true,
      upcomingEventReminder: true,
      studentDoubts: true,
      liveClassReminders: true,
      generalAnnouncements: true,
      weeklySummaryDigest: true,
    }
  })

  // 3. Appearance State
  const [appearance, setAppearance] = useState(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_appearance_v2") || localStorage.getItem("quantum_teacher_appearance_v1")
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      density: "comfortable",
      showGridLines: false,
      sidebarBehavior: "expanded",
      highContrastBorders: false,
      colorPreset: "#9860e9",
    }
  })

  // 4. Privacy & Security State (No fake passwords!)
  const [privacy, setPrivacy] = useState(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_privacy_v2")
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      directoryVisibility: "public", // 'public' | 'faculty-only'
      sharePhoneWithParents: false,
      showOnlineActivity: true,
      shareAnonymousTelemetry: true,
    }
  })

  // Active Sessions Mock Data
  const [sessions, setSessions] = useState([
    {
      id: "sess-1",
      device: "Windows 11 · Chrome 133.0",
      ip: "192.168.0.110",
      location: "Campus Faculty Center (Local)",
      isCurrent: true,
      lastActive: "Active Now",
    },
    {
      id: "sess-2",
      device: "iPhone 15 Pro · Quantum LMS Teacher App",
      ip: "172.56.21.90",
      location: "Mobile Cellular Network",
      isCurrent: false,
      lastActive: "2 hours ago",
    },
    {
      id: "sess-3",
      device: "iPad Pro 12.9 · Safari Mobile",
      ip: "192.168.0.145",
      location: "AI Innovation Lab Wi-Fi",
      isCurrent: false,
      lastActive: "Yesterday, 04:30 PM",
    },
  ])

  // 5. Accessibility State
  const [accessibility, setAccessibility] = useState(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_accessibility_v2") || localStorage.getItem("quantum_teacher_accessibility_v1")
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      fontSize: "normal", // 'normal' | 'medium' | 'large'
      reducedMotion: false,
      highContrastFocus: false,
      keyboardShortcuts: true,
      screenReaderLandmarks: true,
    }
  })

  // Auto-dismiss success notification
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successBanner])

  // Apply Accessibility preferences to document
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (accessibility.reducedMotion) {
        document.documentElement.classList.add("reduce-motion")
      } else {
        document.documentElement.classList.remove("reduce-motion")
      }

      if (accessibility.highContrastFocus) {
        document.documentElement.classList.add("high-contrast-focus")
      } else {
        document.documentElement.classList.remove("high-contrast-focus")
      }
    }
  }, [accessibility.reducedMotion, accessibility.highContrastFocus])

  // Save Handlers
  const handleSavePreferences = () => {
    try {
      localStorage.setItem("quantum_teacher_preferences_v2", JSON.stringify(preferences))
      window.dispatchEvent(new CustomEvent("quantum-preferences-updated", { detail: preferences }))
    } catch {}
    const msg = "Account preferences saved successfully!"
    setSuccessBanner(msg)
    if (onToast) onToast(msg)
  }

  const handleSaveNotifications = () => {
    try {
      localStorage.setItem("quantum_teacher_notifications_v2", JSON.stringify(notifications))
      window.dispatchEvent(new CustomEvent("quantum-notifications-updated", { detail: notifications }))
    } catch {}
    const msg = "Notification preferences updated and saved!"
    setSuccessBanner(msg)
    if (onToast) onToast(msg)
  }

  const handleSaveAppearance = () => {
    try {
      localStorage.setItem("quantum_teacher_appearance_v2", JSON.stringify(appearance))
      window.dispatchEvent(new CustomEvent("quantum-appearance-updated", { detail: appearance }))
    } catch {}
    const msg = "Appearance settings updated successfully!"
    setSuccessBanner(msg)
    if (onToast) onToast(msg)
  }

  const handleSavePrivacy = () => {
    try {
      localStorage.setItem("quantum_teacher_privacy_v2", JSON.stringify(privacy))
      window.dispatchEvent(new CustomEvent("quantum-privacy-updated", { detail: privacy }))
    } catch {}
    const msg = "Privacy and session security preferences saved!"
    setSuccessBanner(msg)
    if (onToast) onToast(msg)
  }

  const handleSaveAccessibility = () => {
    try {
      localStorage.setItem("quantum_teacher_accessibility_v2", JSON.stringify(accessibility))
      window.dispatchEvent(new CustomEvent("quantum-accessibility-updated", { detail: accessibility }))
    } catch {}
    const msg = "Accessibility settings saved and applied!"
    setSuccessBanner(msg)
    if (onToast) onToast(msg)
  }

  const handleSignOutOtherSessions = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent))
    const msg = "Signed out of all other device sessions."
    setSuccessBanner(msg)
    if (onToast) onToast(msg)
  }

  // Search filter across tabs
  const filteredTabs = useMemo(() => {
    if (!searchQuery?.trim()) return SETTINGS_TABS
    const q = searchQuery.toLowerCase()
    return SETTINGS_TABS.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
    )
  }, [searchQuery])

  return (
    <>
      <AccountSettingsHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
        onOpenAiModal={onOpenAiModal}
        onSwitchToProfile={onSwitchToProfile}
      />

      {/* Top View Mode Navigation Pill Switcher */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-150 flex-wrap gap-2">
        <div className="inline-flex items-center p-1 bg-gray-100/90 rounded-full border border-gray-200 shadow-2xs">
          {onSwitchToProfile && (
            <button
              type="button"
              onClick={onSwitchToProfile}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icon name="users" size={13} />
              <span>My Profile</span>
            </button>
          )}
          <div className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-purple-900 shadow-xs flex items-center gap-1.5">
            <Icon name="settings" size={13} />
            <span>Account Settings</span>
          </div>
        </div>

        <div className="text-xs text-zinc-500 flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-purple-600" />
          <span>System Configurations &amp; Preferences</span>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successBanner && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white grid place-items-center text-[10px] font-bold">
              ✓
            </span>
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold px-1 cursor-pointer"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Settings 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pb-8">
        {/* LEFT COLUMN: Settings Category Sidebar */}
        <aside className="lg:col-span-4">
          <div className="panel p-3 bg-white border border-gray-150 shadow-xs">
            <div className="px-3 py-2 border-b border-gray-100 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Settings Categories
              </span>
            </div>

            <nav className="space-y-1" aria-label="Settings Categories">
              {filteredTabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? "bg-purple-50/90 border border-purple-200 text-purple-950 shadow-2xs"
                        : "hover:bg-gray-50 border border-transparent text-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-purple-700 text-white"
                            : "bg-gray-100 text-zinc-500"
                        }`}
                      >
                        <Icon name={tab.icon} size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isActive ? "text-purple-950" : "text-zinc-800"}`}>
                          {tab.label}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate max-w-[190px]">
                          {tab.subtitle}
                        </p>
                      </div>
                    </div>

                    {tab.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 shrink-0">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* RIGHT COLUMN: Active Settings Section Content */}
        <main className="lg:col-span-8">
          {/* TAB 1: ACCOUNT PREFERENCES */}
          {activeTab === "preferences" && (
            <div className="panel p-5 bg-white border border-gray-150 shadow-xs space-y-5">
              <div className="pb-3 border-b border-gray-100">
                <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <span className="text-purple-600 flex items-center">
                    <Icon name="settings" size={15} />
                  </span>
                  <span>Account Preferences</span>
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Configure language localization, regional time zone, and date/time formats
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Language */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                    Language Localization
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="en-US">English (United States)</option>
                    <option value="en-GB">English (United Kingdom)</option>
                    <option value="es-ES">Español (Spanish)</option>
                    <option value="fr-FR">Français (French)</option>
                    <option value="de-DE">Deutsch (German)</option>
                    <option value="ja-JP">日本語 (Japanese)</option>
                  </select>
                </div>

                {/* Time Zone */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                    Regional Time Zone
                  </label>
                  <select
                    value={preferences.timeZone}
                    onChange={(e) => setPreferences({ ...preferences, timeZone: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="America/New_York">Eastern Time (US &amp; Canada) - GMT-5</option>
                    <option value="America/Chicago">Central Time (US &amp; Canada) - GMT-6</option>
                    <option value="America/Denver">Mountain Time (US &amp; Canada) - GMT-7</option>
                    <option value="America/Los_Angeles">Pacific Time (US &amp; Canada) - GMT-8</option>
                    <option value="Europe/London">London, Edinburgh (GMT+0)</option>
                    <option value="Europe/Paris">Paris, Berlin, Rome (GMT+1)</option>
                    <option value="Asia/Kolkata">India Standard Time (IST) - GMT+5:30</option>
                    <option value="Asia/Tokyo">Tokyo, Osaka (JST) - GMT+9</option>
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                    Date Format
                  </label>
                  <select
                    value={preferences.dateFormat}
                    onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 28/10/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/28/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-10-28)</option>
                  </select>
                </div>

                {/* Time Format */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                    Time Clock Format
                  </label>
                  <select
                    value={preferences.timeFormat}
                    onChange={(e) => setPreferences({ ...preferences, timeFormat: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="12-hour">12-Hour Clock (e.g. 02:30 PM)</option>
                    <option value="24-hour">24-Hour Clock (e.g. 14:30)</option>
                  </select>
                </div>

                {/* Default Landing Tab */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                    Default Portal Landing Page
                  </label>
                  <select
                    value={preferences.landingPage}
                    onChange={(e) => setPreferences({ ...preferences, landingPage: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="Dashboard">Class / Dashboard Overview</option>
                    <option value="My Courses">My Courses</option>
                    <option value="My Students">My Students</option>
                    <option value="Calendar">Academic Calendar</option>
                  </select>
                </div>

                {/* Week Start */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                    Calendar Week Starts On
                  </label>
                  <select
                    value={preferences.weekStart}
                    onChange={(e) => setPreferences({ ...preferences, weekStart: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="Monday">Monday (International Standard)</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="h-10 px-6 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>Save Preferences</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="panel p-5 bg-white border border-gray-150 shadow-xs space-y-5">
              <div className="pb-3 border-b border-gray-100">
                <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <span className="text-purple-600 flex items-center">
                    <Icon name="bell" size={15} />
                  </span>
                  <span>Notification Preferences</span>
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Control notifications for assignments, submissions, events, notices, and announcements
                </p>
              </div>

              <div className="space-y-3">
                {/* 1. Assignment Updates */}
                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900">Assignment Updates &amp; Deadlines</h5>
                    <p className="text-[11px] text-zinc-500">
                      Receive alerts when curriculum deadlines approach or assignments are modified
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.assignmentUpdates}
                    onChange={(e) =>
                      setNotifications({ ...notifications, assignmentUpdates: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>

                {/* 2. Student Submissions */}
                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900">Student Submissions</h5>
                    <p className="text-[11px] text-zinc-500">
                      Instant notifications when students submit homework or project work
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.studentSubmissions}
                    onChange={(e) =>
                      setNotifications({ ...notifications, studentSubmissions: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>

                {/* 3. Late Submissions Alert */}
                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900">Late Submission Warnings</h5>
                    <p className="text-[11px] text-zinc-500">
                      Notify immediately when an assignment past deadline is turned in
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.lateSubmissionsAlert}
                    onChange={(e) =>
                      setNotifications({ ...notifications, lateSubmissionsAlert: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>

                {/* 4. Events & Notices */}
                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3 bg-purple-50/30">
                  <div>
                    <h5 className="text-xs font-bold text-purple-950">Campus Events &amp; Notices Alerts</h5>
                    <p className="text-[11px] text-purple-800">
                      Dispatches for newly published academic notices and faculty senate circulars
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.eventsNotices}
                    onChange={(e) =>
                      setNotifications({ ...notifications, eventsNotices: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>

                {/* 5. Upcoming Event Reminders */}
                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900">Upcoming Event Reminders</h5>
                    <p className="text-[11px] text-zinc-500">
                      Reminders 1 hour prior to hackathons, faculty meetings, and guest lectures
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.upcomingEventReminder}
                    onChange={(e) =>
                      setNotifications({ ...notifications, upcomingEventReminder: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>

                {/* 6. Student Doubts */}
                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900">Student Doubts &amp; Queries</h5>
                    <p className="text-[11px] text-zinc-500">
                      Notify when students post new questions in assigned course doubt boards
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.studentDoubts}
                    onChange={(e) =>
                      setNotifications({ ...notifications, studentDoubts: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>

                {/* 7. Live Class Reminders */}
                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900">Live Class Countdown (15-min alert)</h5>
                    <p className="text-[11px] text-zinc-500">
                      Browser notification 15 minutes before your scheduled live broadcast
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.liveClassReminders}
                    onChange={(e) =>
                      setNotifications({ ...notifications, liveClassReminders: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>

                {/* 8. General Announcements */}
                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900">General School Announcements</h5>
                    <p className="text-[11px] text-zinc-500">
                      Receive administrative updates and weekly faculty digests
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.generalAnnouncements}
                    onChange={(e) =>
                      setNotifications({ ...notifications, generalAnnouncements: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotifications}
                  className="h-10 px-6 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>Save Notification Preferences</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: APPEARANCE */}
          {activeTab === "appearance" && (
            <div className="panel p-5 bg-white border border-gray-150 shadow-xs space-y-5">
              <div className="pb-3 border-b border-gray-100">
                <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <span className="text-purple-600 flex items-center">
                    <Icon name="sparkles" size={15} />
                  </span>
                  <span>Appearance &amp; Display Options</span>
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Theme accent color, layout density, and canvas presentation options
                </p>
              </div>

              <div className="space-y-4">
                {/* Accent Color Preset Picker */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-2">
                    Theme Accent Color
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {[
                      { label: "Quantum Purple", hex: "#9860e9" },
                      { label: "Royal Indigo", hex: "#6366f1" },
                      { label: "Emerald AI", hex: "#059669" },
                      { label: "Ocean Blue", hex: "#2563eb" },
                      { label: "Crimson Rose", hex: "#e11d48" },
                    ].map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => {
                          setAppearance({ ...appearance, colorPreset: col.hex })
                          if (onChangeHexColor) onChangeHexColor(col.hex)
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          hexColor?.toLowerCase() === col.hex.toLowerCase()
                            ? "border-purple-600 bg-purple-50 ring-2 ring-purple-300"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: col.hex }} />
                        <span>{col.label}</span>
                      </button>
                    ))}
                  </div>

                  {onChangeHexColor && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-600">Custom Hex:</span>
                      <HexColorField hexColor={hexColor} onChangeHex={onChangeHexColor} />
                    </div>
                  )}
                </div>

                {/* Layout Density */}
                <div className="pt-3 border-t border-gray-100">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-2">
                    Layout Density
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    <button
                      type="button"
                      onClick={() => setAppearance({ ...appearance, density: "comfortable" })}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        appearance.density === "comfortable"
                          ? "border-purple-600 bg-purple-50/70 ring-1 ring-purple-400"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <h5 className="text-xs font-bold text-zinc-900">Comfortable (Default)</h5>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Spacious paddings, clear line height</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAppearance({ ...appearance, density: "compact" })}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        appearance.density === "compact"
                          ? "border-purple-600 bg-purple-50/70 ring-1 ring-purple-400"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <h5 className="text-xs font-bold text-zinc-900">Compact</h5>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Higher information density on screens</p>
                    </button>
                  </div>
                </div>

                {/* Sidebar Behavior */}
                <div className="pt-3 border-t border-gray-100">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-2">
                    Sidebar Default Mode
                  </label>
                  <select
                    value={appearance.sidebarBehavior}
                    onChange={(e) =>
                      setAppearance({ ...appearance, sidebarBehavior: e.target.value })
                    }
                    className="w-full max-w-sm h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="expanded">Expanded (Full labels &amp; navigation)</option>
                    <option value="compact">Compact (Icon-only sidebar)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveAppearance}
                  className="h-10 px-6 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>Save Appearance Settings</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PRIVACY & SECURITY (Strictly no fake passwords!) */}
          {activeTab === "security" && (
            <div className="panel p-5 bg-white border border-gray-150 shadow-xs space-y-5">
              <div className="pb-3 border-b border-gray-100">
                <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <span className="text-purple-600 flex items-center">
                    <Icon name="check" size={15} />
                  </span>
                  <span>Privacy &amp; Security</span>
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Verified institutional identity, active sessions, and directory privacy controls
                </p>
              </div>

              {/* 1. Account Identity Information */}
              <div>
                <h5 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2.5">
                  Account Credentials &amp; Verification
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-150">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
                      Authentication Method
                    </span>
                    <span className="text-xs font-bold text-zinc-900 block">
                      Institutional Google Workspace SSO
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                      ✓ Managed by Central IT
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-150">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
                      Two-Factor Authentication (2FA)
                    </span>
                    <span className="text-xs font-bold text-zinc-900 block">
                      Enforced (Hardware Token &amp; App)
                    </span>
                    <span className="text-[10px] text-purple-700 font-semibold block mt-1">
                      🔒 Compliant with FERPA &amp; School Policy
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Active Sessions */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                      Active Device Sessions ({sessions.length})
                    </h5>
                    <p className="text-[11px] text-zinc-500">
                      Devices currently authorized to access your Teacher Portal
                    </p>
                  </div>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={handleSignOutOtherSessions}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Sign Out Other Sessions
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3 rounded-xl border border-gray-150 flex items-center justify-between flex-wrap gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{sess.device.includes("iPhone") ? "📱" : "💻"}</span>
                        <div>
                          <p className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                            <span>{sess.device}</span>
                            {sess.isCurrent && (
                              <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                This Device
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {sess.ip} · {sess.location}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-600">
                        {sess.lastActive}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Privacy Preferences */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <h5 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Supported Privacy Preferences
                </h5>

                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <h6 className="text-xs font-bold text-zinc-900">Campus Directory Visibility</h6>
                    <p className="text-[11px] text-zinc-500">
                      Show verified educator contact in the student &amp; faculty directory
                    </p>
                  </div>
                  <select
                    value={privacy.directoryVisibility}
                    onChange={(e) =>
                      setPrivacy({ ...privacy, directoryVisibility: e.target.value })
                    }
                    className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-semibold bg-white text-zinc-800"
                  >
                    <option value="public">Students &amp; Faculty</option>
                    <option value="faculty-only">Faculty Only</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <h6 className="text-xs font-bold text-zinc-900">Share Phone Number with Class Parents</h6>
                    <p className="text-[11px] text-zinc-500">
                      Display contact phone on parent weekly progress digests
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacy.sharePhoneWithParents}
                    onChange={(e) =>
                      setPrivacy({ ...privacy, sharePhoneWithParents: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <h6 className="text-xs font-bold text-zinc-900">Display Online Activity Status</h6>
                    <p className="text-[11px] text-zinc-500">
                      Show green active badge when available to answer student doubts
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacy.showOnlineActivity}
                    onChange={(e) =>
                      setPrivacy({ ...privacy, showOnlineActivity: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSavePrivacy}
                  className="h-10 px-6 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>Save Privacy Preferences</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: ACCESSIBILITY */}
          {activeTab === "accessibility" && (
            <div className="panel p-5 bg-white border border-gray-150 shadow-xs space-y-5">
              <div className="pb-3 border-b border-gray-100">
                <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <span className="text-purple-600 flex items-center">
                    <Icon name="activity" size={15} />
                  </span>
                  <span>Accessibility Preferences</span>
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Adjust typography scaling, reduced motion, and focus accessibility options
                </p>
              </div>

              <div className="space-y-4">
                {/* Font Size Selector */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-2">
                    Display Font Size Scaling
                  </label>
                  <div className="grid grid-cols-3 gap-2.5 max-w-lg">
                    {[
                      { id: "normal", label: "Standard (100%)", sample: "Aa Default" },
                      { id: "medium", label: "Medium (110%)", sample: "Aa Medium" },
                      { id: "large", label: "Large (125%)", sample: "Aa Large" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setAccessibility({ ...accessibility, fontSize: f.id })}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          accessibility.fontSize === f.id
                            ? "border-purple-600 bg-purple-50 ring-2 ring-purple-300"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-xs font-bold text-zinc-900 block">{f.label}</span>
                        <span className="text-[11px] text-purple-700 font-semibold mt-1 block">
                          {f.sample}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reduced Motion Toggle */}
                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900">Reduced Motion</h5>
                    <p className="text-[11px] text-zinc-500">
                      Minimize interface transitions, sliding panels, and background animations
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={accessibility.reducedMotion}
                    onChange={(e) =>
                      setAccessibility({ ...accessibility, reducedMotion: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>

                {/* High Contrast Focus Rings */}
                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900">High-Contrast Focus Outlines</h5>
                    <p className="text-[11px] text-zinc-500">
                      Display high-visibility 2px purple outlines around focused elements
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={accessibility.highContrastFocus}
                    onChange={(e) =>
                      setAccessibility({ ...accessibility, highContrastFocus: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>

                {/* Keyboard Shortcuts */}
                <div className="p-3.5 rounded-xl border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900">Keyboard Shortcuts Enabled</h5>
                    <p className="text-[11px] text-zinc-500">
                      Use keys (e.g. Esc to close modals, / to search) for quick navigation
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={accessibility.keyboardShortcuts}
                    onChange={(e) =>
                      setAccessibility({ ...accessibility, keyboardShortcuts: e.target.checked })
                    }
                    className="w-5 h-5 accent-purple-700 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveAccessibility}
                  className="h-10 px-6 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>Save Accessibility Settings</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
