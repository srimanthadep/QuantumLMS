import { useState, useEffect, useMemo } from "react"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"

export function SettingsHeader({
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onSavePreferences,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onSavePreferences: () => void
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>Settings</span>
        </div>
        <div className="subtitle">
          Manage your profile, preferences, notifications, and account security.
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
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
        <HexColorField
          hexColor={hexColor}
          onChangeHex={onChangeHexColor}
        />
        <button
          className="ask-ai"
          onClick={onSavePreferences}
          aria-label="Save Settings"
        >
          <span>✓</span>
          Save All
        </button>
      </div>
    </header>
  )
}

type SettingsCategory =
  | "profile"
  | "preferences"
  | "notifications"
  | "appearance"
  | "security"
  | "accessibility"

interface CategoryTab {
  id: SettingsCategory
  label: string
  icon: string
  badge?: string
}

const CATEGORIES: CategoryTab[] = [
  { id: "profile", label: "Profile", icon: "user" },
  { id: "preferences", label: "Account Preferences", icon: "settings" },
  { id: "notifications", label: "Notifications", icon: "bell", badge: "5 active" },
  { id: "appearance", label: "Appearance", icon: "sparkles" },
  { id: "security", label: "Privacy & Security", icon: "check" },
  { id: "accessibility", label: "Accessibility", icon: "eye" },
]

export default function SettingsPage({
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onSave,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onSave?: () => void
}) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("profile")
  const [successBanner, setSuccessBanner] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // 1. Profile State
  const [profileForm, setProfileForm] = useState(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_profile_v1")
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return {
      fullName: "Srimanth",
      email: "srimanth@quantum-lms.edu",
      phone: "+1 (555) 234-5678",
      designation: "Lead Educator · Year 4 STEM & AI",
      assignedClass: "Year 4 – Maple Class",
      officeHours: "Mon-Thu 3:30 PM - 5:00 PM",
      bio: "Elementary educator specializing in computational thinking, foundational AI concepts, and project-based STEM learning.",
    }
  })

  const [profileBackup, setProfileBackup] = useState(profileForm)
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})

  // 2. Account Preferences State
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_preferences_v1")
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return {
      language: "en-US",
      timeZone: "America/New_York",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "12-hour",
      landingPage: "Dashboard",
    }
  })

  // 3. Notifications State
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_notifications_v1")
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return {
      assignmentSubmissions: true,
      lateSubmissions: true,
      gradingReminders: true,
      studentDoubts: true,
      unresolvedThreadsSummary: false,
      liveClassFifteenMin: true,
      liveAttendanceAlerts: true,
      dailyAttendanceSummary: true,
      parentDigestFriday: true,
      systemAnnouncements: true,
    }
  })

  // 4. Appearance State
  const [appearance, setAppearance] = useState(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_appearance_v1")
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return {
      density: "comfortable",
      showGridLines: true,
      sidebarBehavior: "expanded",
    }
  })

  // 5. Privacy & Security State
  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // 6. Accessibility State
  const [accessibility, setAccessibility] = useState(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_accessibility_v1")
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return {
      reducedMotion: false,
      fontSize: "normal",
      highContrastFocus: false,
      keyboardShortcuts: true,
    }
  })

  // Flash message timeout
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successBanner])

  // Profile Form Validation & Actions
  const handleSaveProfile = () => {
    const errors: Record<string, string> = {}
    if (!profileForm.fullName.trim()) {
      errors.fullName = "Full name is required."
    }
    if (!profileForm.email.trim()) {
      errors.email = "Email address is required."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
      errors.email = "Please provide a valid email format."
    }
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors)
      return
    }

    setProfileErrors({})
    try {
      localStorage.setItem("quantum_teacher_profile_v1", JSON.stringify(profileForm))
      localStorage.setItem(
        "quantum_current_user",
        JSON.stringify({
          id: "u-1",
          name: profileForm.fullName,
          role: "Teacher",
          email: profileForm.email,
          title: profileForm.designation,
          avatar: "/assets/srimanth.png",
        })
      )
    } catch {
      // ignore
    }
    setProfileBackup(profileForm)
    setIsEditingProfile(false)
    setSuccessBanner("Profile information updated and saved locally!")
    onSave?.()
  }

  const handleCancelProfile = () => {
    setProfileForm(profileBackup)
    setProfileErrors({})
    setIsEditingProfile(false)
  }

  // Save Preferences
  const handleSavePreferences = () => {
    try {
      localStorage.setItem("quantum_teacher_preferences_v1", JSON.stringify(preferences))
    } catch {
      // ignore
    }
    setSuccessBanner("Account preferences updated successfully!")
    onSave?.()
  }

  // Toggle Notification
  const handleToggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev: typeof notifications) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem("quantum_teacher_notifications_v1", JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
    setSuccessBanner("Notification preferences updated.")
  }

  // Save Appearance
  const handleUpdateAppearance = (key: keyof typeof appearance, val: string | boolean) => {
    setAppearance((prev: typeof appearance) => {
      const next = { ...prev, [key]: val }
      try {
        localStorage.setItem("quantum_teacher_appearance_v1", JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
    setSuccessBanner("Appearance setting updated.")
  }

  // Password Update Simulator
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordState.currentPassword) {
      setPasswordMessage({ type: "error", text: "Please enter your current password." })
      return
    }
    if (passwordState.newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters long." })
      return
    }
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setPasswordMessage({ type: "error", text: "New password and confirmation do not match." })
      return
    }

    setPasswordMessage({
      type: "success",
      text: "Password verified and updated in current browser session.",
    })
    setPasswordState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  }

  // Save Accessibility
  const handleUpdateAccessibility = (key: keyof typeof accessibility, val: string | boolean) => {
    setAccessibility((prev: typeof accessibility) => {
      const next = { ...prev, [key]: val }
      try {
        localStorage.setItem("quantum_teacher_accessibility_v1", JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
    setSuccessBanner("Accessibility settings updated.")
  }

  // Search filtering over categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES
    const q = searchQuery.toLowerCase()
    return CATEGORIES.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    )
  }, [searchQuery])

  return (
    <div className="space-y-4">
      <SettingsHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
        onSavePreferences={() => {
          handleSaveProfile()
          handleSavePreferences()
          onSave?.()
        }}
      />

      {/* Global Feedback Banner */}
      {successBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white grid place-items-center text-[10px] font-bold">
              ✓
            </span>
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Settings Structured Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Navigation Area: Left Sidebar (Desktop) / Horizontal Scrollable Tabs (Mobile) */}
        <aside className="lg:col-span-3">
          <div className="panel p-3 bg-white/95 backdrop-blur-xs">
            {/* Mobile Category Dropdown Selector */}
            <div className="block sm:hidden mb-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Select Category
              </label>
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value as SettingsCategory)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-bold text-zinc-800 bg-white"
                aria-label="Settings Category"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tablet & Desktop Category Navigation List */}
            <nav className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Settings Categories">
              {filteredCategories.map((cat) => {
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap text-left shrink-0 ${isActive
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-zinc-600 hover:text-purple-700 hover:bg-purple-50/60"
                      }`}
                    role="tab"
                    aria-selected={isActive}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon name={cat.icon} size={15} />
                      <span>{cat.label}</span>
                    </div>
                    {cat.badge && (
                      <span
                        className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold hidden sm:inline ${isActive ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"
                          }`}
                      >
                        {cat.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="lg:col-span-9 space-y-4">
          {/* CATEGORY 1: PROFILE */}
          {activeCategory === "profile" && (
            <div className="panel p-5 sm:p-6 bg-white space-y-5" aria-label="Profile Settings Section">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-150">
                <div>
                  <h2 className="text-base font-bold text-zinc-900">Teacher Profile Information</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    View and update your display name, contact credentials, and verified classroom assignments.
                  </p>
                </div>
                {!isEditingProfile ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="px-4 h-8.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto shadow-2xs"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={handleCancelProfile}
                      className="px-3.5 h-8.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="px-4 h-8.5 rounded-xl btn-primary text-xs font-bold cursor-pointer shadow-xs"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              {/* Profile Card Header */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50/70 to-pink-50/40 border border-purple-100 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative shrink-0">
                  <img
                    src="/assets/srimanth.png"
                    alt={profileForm.fullName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-300 shadow-xs"
                  />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="Active Account"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-zinc-900">{profileForm.fullName}</h3>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      Teacher Role
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{profileForm.designation}</div>
                  <div className="text-[11px] text-purple-700 font-mono mt-1">
                    {profileForm.email} · {profileForm.assignedClass}
                  </div>
                </div>
              </div>

              {/* Profile Details Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Full Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className={`w-full h-9.5 px-3 rounded-xl border text-xs font-medium transition-all ${isEditingProfile
                        ? "bg-white border-zinc-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                        : "bg-gray-50 border-gray-200 text-zinc-700 cursor-not-allowed"
                      }`}
                  />
                  {profileErrors.fullName && (
                    <span className="text-[11px] text-rose-600 mt-1 block">{profileErrors.fullName}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    disabled={!isEditingProfile}
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className={`w-full h-9.5 px-3 rounded-xl border text-xs font-medium transition-all ${isEditingProfile
                        ? "bg-white border-zinc-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                        : "bg-gray-50 border-gray-200 text-zinc-700 cursor-not-allowed"
                      }`}
                  />
                  {profileErrors.email && (
                    <span className="text-[11px] text-rose-600 mt-1 block">{profileErrors.email}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    disabled={!isEditingProfile}
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className={`w-full h-9.5 px-3 rounded-xl border text-xs font-medium transition-all ${isEditingProfile
                        ? "bg-white border-zinc-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                        : "bg-gray-50 border-gray-200 text-zinc-700 cursor-not-allowed"
                      }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Department & Designation
                  </label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={profileForm.designation}
                    onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                    className={`w-full h-9.5 px-3 rounded-xl border text-xs font-medium transition-all ${isEditingProfile
                        ? "bg-white border-zinc-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                        : "bg-gray-50 border-gray-200 text-zinc-700 cursor-not-allowed"
                      }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Assigned Class Cohort (Admin Provisioned)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profileForm.assignedClass}
                    className="w-full h-9.5 px-3 rounded-xl border border-gray-200 bg-gray-100 text-zinc-600 font-medium cursor-not-allowed text-xs"
                  />
                  <span className="text-[11px] text-zinc-400 mt-1 block">
                    Class cohort assignments are managed centrally by the School Administration.
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Educator Bio & Office Hours
                  </label>
                  <textarea
                    rows={3}
                    disabled={!isEditingProfile}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className={`w-full p-3 rounded-xl border text-xs font-medium leading-relaxed transition-all ${isEditingProfile
                        ? "bg-white border-zinc-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                        : "bg-gray-50 border-gray-200 text-zinc-700 cursor-not-allowed"
                      }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* CATEGORY 2: ACCOUNT PREFERENCES */}
          {activeCategory === "preferences" && (
            <div className="panel p-5 sm:p-6 bg-white space-y-5" aria-label="Account Preferences Section">
              <div className="pb-4 border-b border-gray-150">
                <h2 className="text-base font-bold text-zinc-900">Regional & System Preferences</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Configure localization, clock formatting, and your default starting view when signing in.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Preferred Language
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
                  >
                    <option value="en-US">English (United States)</option>
                    <option value="en-GB">English (United Kingdom)</option>
                    <option value="es-ES">Español (Spanish)</option>
                    <option value="fr-FR">Français (French)</option>
                    <option value="de-DE">Deutsch (German)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Time Zone
                  </label>
                  <select
                    value={preferences.timeZone}
                    onChange={(e) => setPreferences({ ...preferences, timeZone: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
                  >
                    <option value="America/New_York">Eastern Time (US & Canada) · UTC-5</option>
                    <option value="America/Chicago">Central Time (US & Canada) · UTC-6</option>
                    <option value="America/Los_Angeles">Pacific Time (US & Canada) · UTC-8</option>
                    <option value="Europe/London">London · UTC+0</option>
                    <option value="Asia/Kolkata">India Standard Time · UTC+5:30</option>
                    <option value="Asia/Tokyo">Tokyo · UTC+9</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Date Format
                  </label>
                  <select
                    value={preferences.dateFormat}
                    onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 23/10/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/23/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Time Format
                  </label>
                  <select
                    value={preferences.timeFormat}
                    onChange={(e) => setPreferences({ ...preferences, timeFormat: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
                  >
                    <option value="12-hour">12-hour (e.g. 10:30 AM / 4:15 PM)</option>
                    <option value="24-hour">24-hour Military (e.g. 10:30 / 16:15)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Default Landing View
                  </label>
                  <select
                    value={preferences.landingPage}
                    onChange={(e) => setPreferences({ ...preferences, landingPage: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
                  >
                    <option value="Dashboard">Teacher Dashboard (Overview)</option>
                    <option value="My Courses">My Courses & Curriculum</option>
                    <option value="My Students">My Students & Individual Rosters</option>
                    <option value="Live Class">Live Academic Broadcasts & Studio</option>
                    <option value="Analytics">Analytics & Diagnostic Insights</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-150 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="px-5 h-9 rounded-xl btn-primary text-xs font-bold cursor-pointer shadow-xs"
                >
                  Save Account Preferences
                </button>
              </div>
            </div>
          )}

          {/* CATEGORY 3: NOTIFICATIONS */}
          {activeCategory === "notifications" && (
            <div className="panel p-5 sm:p-6 bg-white space-y-6" aria-label="Notification Preferences Section">
              <div className="pb-4 border-b border-gray-150">
                <h2 className="text-base font-bold text-zinc-900">Notification Alerts & Dispatches</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Organized by category. Controls which classroom events trigger in-app banners and reminder badges.
                </p>
              </div>

              {/* Group A: Assignments & Submissions */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block">
                  Assignments & Grading
                </span>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/80 hover:bg-purple-50/40 border border-gray-150 transition-colors cursor-pointer">
                    <div className="min-w-0 pr-3">
                      <strong className="text-xs font-bold text-zinc-900 block">Student Assignment Submissions</strong>
                      <span className="text-[11px] text-zinc-500">
                        Receive instant notifications when students submit homework or lab assignments.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.assignmentSubmissions}
                      onChange={() => handleToggleNotification("assignmentSubmissions")}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 shrink-0 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/80 hover:bg-purple-50/40 border border-gray-150 transition-colors cursor-pointer">
                    <div className="min-w-0 pr-3">
                      <strong className="text-xs font-bold text-zinc-900 block">Late Turn-in Alerts</strong>
                      <span className="text-[11px] text-zinc-500">
                        Flag assignments turned in past the official submission deadline.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.lateSubmissions}
                      onChange={() => handleToggleNotification("lateSubmissions")}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 shrink-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Group B: Student Doubts & Questions */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block">
                  Student Doubts & Questions
                </span>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/80 hover:bg-purple-50/40 border border-gray-150 transition-colors cursor-pointer">
                    <div className="min-w-0 pr-3">
                      <strong className="text-xs font-bold text-zinc-900 block">New Student Doubt Notifications</strong>
                      <span className="text-[11px] text-zinc-500">
                        Receive an immediate alert when a student posts a question in Doubts Forum.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.studentDoubts}
                      onChange={() => handleToggleNotification("studentDoubts")}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 shrink-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Group C: Live Class & Attendance */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block">
                  Live Class & Attendance
                </span>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/80 hover:bg-purple-50/40 border border-gray-150 transition-colors cursor-pointer">
                    <div className="min-w-0 pr-3">
                      <strong className="text-xs font-bold text-zinc-900 block">15-Minute Broadcast Countdown</strong>
                      <span className="text-[11px] text-zinc-500">
                        Prompt to prepare classroom studio assets 15 minutes before scheduled start time.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.liveClassFifteenMin}
                      onChange={() => handleToggleNotification("liveClassFifteenMin")}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 shrink-0 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/80 hover:bg-purple-50/40 border border-gray-150 transition-colors cursor-pointer">
                    <div className="min-w-0 pr-3">
                      <strong className="text-xs font-bold text-zinc-900 block">Low Attendance Cohort Alert</strong>
                      <span className="text-[11px] text-zinc-500">
                        Warn when live class cohort attendance dips below the 85% statutory threshold.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.liveAttendanceAlerts}
                      onChange={() => handleToggleNotification("liveAttendanceAlerts")}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 shrink-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Group D: General Announcements & Parent Digests */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block">
                  Announcements & Parent Communication
                </span>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/80 hover:bg-purple-50/40 border border-gray-150 transition-colors cursor-pointer">
                    <div className="min-w-0 pr-3">
                      <strong className="text-xs font-bold text-zinc-900 block">Weekly Friday Parent Digest Dispatch</strong>
                      <span className="text-[11px] text-zinc-500">
                        Automatically collate Maple Class weekly milestones and dispatch to parents every Friday at 4 PM.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.parentDigestFriday}
                      onChange={() => handleToggleNotification("parentDigestFriday")}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 shrink-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* CATEGORY 4: APPEARANCE */}
          {activeCategory === "appearance" && (
            <div className="panel p-5 sm:p-6 bg-white space-y-5" aria-label="Appearance Section">
              <div className="pb-4 border-b border-gray-150">
                <h2 className="text-base font-bold text-zinc-900">Appearance & Canvas Styling</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Customize the visual presentation of the Quantum LMS teacher canvas.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Visual Density */}
                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <strong className="text-xs font-bold text-zinc-900 block">Layout Spacing Density</strong>
                    <span className="text-[11px] text-zinc-500">
                      Choose between spacious comfortable padding or high-density view.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-gray-200">
                    <button
                      type="button"
                      onClick={() => handleUpdateAppearance("density", "comfortable")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${appearance.density === "comfortable"
                          ? "bg-purple-600 text-white"
                          : "text-zinc-600 hover:text-zinc-900"
                        }`}
                    >
                      Comfortable
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateAppearance("density", "compact")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${appearance.density === "compact"
                          ? "bg-purple-600 text-white"
                          : "text-zinc-600 hover:text-zinc-900"
                        }`}
                    >
                      Compact
                    </button>
                  </div>
                </div>

                {/* Background Grid Pattern */}
                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-xs font-bold text-zinc-900 block">Quantum Background Grid Lines</strong>
                    <span className="text-[11px] text-zinc-500">
                      Display technical geometric blueprint grid lines across the application background.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={appearance.showGridLines}
                    onChange={(e) => handleUpdateAppearance("showGridLines", e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                {/* Hex Color Palette Preset */}
                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-150 space-y-3">
                  <div>
                    <strong className="text-xs font-bold text-zinc-900 block">Canvas Background Hex Color</strong>
                    <span className="text-[11px] text-zinc-500">
                      Current: <span className="font-mono font-bold text-purple-700">{hexColor}</span>. Select a curated preset or use the header picker.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { name: "Default Violet", hex: "#9860e9" },
                      { name: "Deep Royal", hex: "#5b45b0" },
                      { name: "Slate Minimal", hex: "#27272a" },
                      { name: "Teal Emerald", hex: "#0f766e" },
                      { name: "Warm Amber", hex: "#b45309" },
                    ].map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => onChangeHexColor(preset.hex)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${hexColor.toLowerCase() === preset.hex.toLowerCase()
                            ? "bg-white border-purple-500 ring-2 ring-purple-200 text-zinc-900 shadow-xs"
                            : "bg-white border-gray-200 text-zinc-600 hover:border-gray-300"
                          }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: preset.hex }}
                        ></span>
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CATEGORY 5: PRIVACY & SECURITY */}
          {activeCategory === "security" && (
            <div className="panel p-5 sm:p-6 bg-white space-y-5" aria-label="Privacy & Security Section">
              <div className="pb-4 border-b border-gray-150">
                <h2 className="text-base font-bold text-zinc-900">Account Security & Active Sessions</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Manage educator authentication credentials and monitor active browser logins.
                </p>
              </div>

              {/* Password Change Form */}
              <form onSubmit={handleChangePassword} className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block">
                  Update Account Password
                </span>

                {passwordMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold border flex items-center justify-between ${passwordMessage.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                  >
                    <span>{passwordMessage.text}</span>
                    <button
                      type="button"
                      onClick={() => setPasswordMessage(null)}
                      className="px-1 font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-zinc-700 font-bold mb-1">Current Password</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordState.currentPassword}
                      onChange={(e) =>
                        setPasswordState({ ...passwordState, currentPassword: e.target.value })
                      }
                      placeholder="••••••••"
                      className="w-full h-9.5 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-purple-200"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-700 font-bold mb-1">New Password</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordState.newPassword}
                      onChange={(e) =>
                        setPasswordState({ ...passwordState, newPassword: e.target.value })
                      }
                      placeholder="Min. 8 characters"
                      className="w-full h-9.5 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-purple-200"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-700 font-bold mb-1">Confirm New Password</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordState.confirmPassword}
                      onChange={(e) =>
                        setPasswordState({ ...passwordState, confirmPassword: e.target.value })
                      }
                      placeholder="Repeat new password"
                      className="w-full h-9.5 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-purple-600"
                    />
                    <span>Show password characters</span>
                  </label>

                  <button
                    type="submit"
                    className="px-4 h-8.5 rounded-xl btn-primary text-xs font-bold cursor-pointer"
                  >
                    Update Password
                  </button>
                </div>
              </form>

              {/* Active Session & Two-Factor Information */}
              <div className="pt-4 border-t border-gray-150 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block">
                  Active Session & Identity Verification
                </span>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-150 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600">Active Device:</span>
                    <strong className="text-zinc-900">Chrome 131 · Windows 11</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600">IP Location:</span>
                    <span className="font-mono text-zinc-700">192.168.0.109 (Local Campus Network)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600">Session Status:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Verified Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600">Two-Factor Authentication:</span>
                    <span className="text-purple-700 font-semibold">Enforced by Quantum Admin</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CATEGORY 6: ACCESSIBILITY */}
          {activeCategory === "accessibility" && (
            <div className="panel p-5 sm:p-6 bg-white space-y-5" aria-label="Accessibility Preferences Section">
              <div className="pb-4 border-b border-gray-150">
                <h2 className="text-base font-bold text-zinc-900">Accessibility & Visual Comfort</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Adjust keyboard navigation, high contrast focus outlines, and motion settings.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {/* Reduced Motion */}
                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-xs font-bold text-zinc-900 block">Reduced Motion</strong>
                    <span className="text-[11px] text-zinc-500">
                      Minimize CSS animations and transition effects across dashboard cards and drawers.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={accessibility.reducedMotion}
                    onChange={(e) => handleUpdateAccessibility("reducedMotion", e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                {/* Font Scaling */}
                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <strong className="text-xs font-bold text-zinc-900 block">Text Scaling</strong>
                    <span className="text-[11px] text-zinc-500">
                      Increase font readability across dashboard tables and lesson content.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-gray-200">
                    {(["normal", "medium", "large"] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => handleUpdateAccessibility("fontSize", sz)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-colors ${accessibility.fontSize === sz
                            ? "bg-purple-600 text-white"
                            : "text-zinc-600 hover:text-zinc-900"
                          }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* High Contrast Focus */}
                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-150 flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-xs font-bold text-zinc-900 block">Enhanced Focus Visibility</strong>
                    <span className="text-[11px] text-zinc-500">
                      Draw bold purple outlines around focused buttons and inputs for keyboard users.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={accessibility.highContrastFocus}
                    onChange={(e) => handleUpdateAccessibility("highContrastFocus", e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                {/* Keyboard Shortcuts Reference */}
                <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-2">
                  <strong className="text-xs font-bold text-purple-950 block">Quick Keyboard Navigation Guide</strong>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-purple-900">
                    <div className="flex justify-between p-2 rounded-lg bg-white border border-purple-100">
                      <span>Dismiss Modal / Popup:</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border text-zinc-700 font-mono font-bold">Esc</kbd>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-white border border-purple-100">
                      <span>Activate Focused Button:</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border text-zinc-700 font-mono font-bold">Enter</kbd>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-white border border-purple-100">
                      <span>Next Interactive Item:</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border text-zinc-700 font-mono font-bold">Tab</kbd>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-white border border-purple-100">
                      <span>Previous Item:</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border text-zinc-700 font-mono font-bold">Shift+Tab</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
