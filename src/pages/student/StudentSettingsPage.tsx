import { useState } from "react"
import { Icon } from "../../components/Icon"
import { HexColorField } from "../../components/HexColorField"
import type { StudentNavPage } from "./studentTypes"

interface StudentSettingsPageProps {
  onToast: (msg: string) => void
  onNavigate: (page: StudentNavPage) => void
  onLogout: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
}

export function StudentSettingsPage({
  onToast,
  onNavigate,
  onLogout,
  hexColor,
  onChangeHexColor,
}: StudentSettingsPageProps) {
  // Password change form
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")

  // Security toggles
  const [is2FaEnabled, setIs2FaEnabled] = useState(true)
  const [browserRemembered, setBrowserRemembered] = useState(true)
  const [activeSessions, setActiveSessions] = useState([
    {
      id: "sess-1",
      device: "Chrome on Windows 11",
      meta: "Current Session · IP 192.168.1.42 (Campus WiFi)",
      icon: "💻",
      isCurrent: true,
    },
    {
      id: "sess-2",
      device: "Quantum Mobile App (Android 14)",
      meta: "Last active: 45 minutes ago",
      icon: "📱",
      isCurrent: false,
    },
  ])

  // Notification preferences
  const [emailGrades, setEmailGrades] = useState(true)
  const [deadlineReminders, setDeadlineReminders] = useState(true)
  const [smsLiveStreams, setSmsLiveStreams] = useState(true)
  const [announcementsDigest, setAnnouncementsDigest] = useState(false)

  // Account Preferences
  const [portalLanguage, setPortalLanguage] = useState("English (US)")
  const [timezone, setTimezone] = useState("UTC -05:00 (Eastern Time)")
  const [defaultTab, setDefaultTab] = useState<StudentNavPage>("Dashboard")

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPw || !newPw) {
      onToast("Please enter both your current password and your new password.")
      return
    }
    if (newPw.length < 8) {
      onToast("New password must be at least 8 characters long.")
      return
    }
    if (newPw !== confirmPw) {
      onToast("New passwords do not match. Please verify and retype.")
      return
    }

    setCurrentPw("")
    setNewPw("")
    setConfirmPw("")
    onToast(
      "Account password updated successfully! Next login requires new credentials. 🔒",
    )
  }

  const handleSavePreferences = () => {
    onToast("Account and notification preferences saved successfully! ✅")
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <section
        className="panel p-6 bg-white border border-zinc-100 shadow-sm"
        aria-label="Student Settings Header"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                ⚙️
              </span>
              <h2 className="text-xl font-black text-zinc-900">
                Student Account Settings
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                Preferences
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Manage security passwords, two-factor authentication, email alert
              preferences, and portal appearance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("Profile")}
              className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Icon name="users" size={13} />
              <span>View Profile</span>
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-full border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="logout" size={13} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Theme & Portal Appearance (Matches Quantum LMS Design System) */}
      <section
        className="panel p-6 bg-white border border-zinc-100 shadow-sm"
        aria-label="Appearance Settings"
      >
        <div className="card-header mb-3 pb-2 border-b border-zinc-100">
          <div>
            <h3 className="card-title text-sm">
              Portal Theme & Canvas Background
            </h3>
            <span className="text-[11px] text-zinc-500">
              Customize the background color of your workspace using the LMS
              color engine
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-zinc-50/70 rounded-2xl border border-zinc-200">
          <div>
            <strong className="text-xs font-bold text-zinc-900 block mb-1">
              Canvas HEX Background
            </strong>
            <p className="text-[11px] text-zinc-500 max-w-md">
              Pick any hex color. The entire application background and contrast
              calculate automatically.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <HexColorField hexColor={hexColor} onChangeHex={onChangeHexColor} />
            <button
              type="button"
              onClick={() => onChangeHexColor("#F1F0F3")}
              className="px-3 py-1.5 rounded-full border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100 cursor-pointer"
            >
              Default Canvas (#F1F0F3)
            </button>
          </div>
        </div>
      </section>

      {/* 3. Account Preferences (Language, Timezone, Default Tab) */}
      <section
        className="panel p-6 bg-white border border-zinc-100 shadow-sm"
        aria-label="General Preferences"
      >
        <div className="card-header mb-4 pb-2 border-b border-zinc-100">
          <div>
            <h3 className="card-title text-sm">
              Account & Regional Preferences
            </h3>
            <span className="text-[11px] text-zinc-500">
              Locale, time zone, and navigation defaults
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-bold text-zinc-700 block mb-1">
              Portal Display Language
            </label>
            <select
              value={portalLanguage}
              onChange={(e) => setPortalLanguage(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600 cursor-pointer"
            >
              <option value="English (US)">English (US)</option>
              <option value="English (UK)">English (UK)</option>
              <option value="Spanish (Español)">Spanish (Español)</option>
              <option value="French (Français)">French (Français)</option>
              <option value="German (Deutsch)">German (Deutsch)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-zinc-700 block mb-1">
              Campus Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600 cursor-pointer"
            >
              <option value="UTC -05:00 (Eastern Time)">
                UTC -05:00 (Eastern Time)
              </option>
              <option value="UTC -08:00 (Pacific Time)">
                UTC -08:00 (Pacific Time)
              </option>
              <option value="UTC +00:00 (London / UTC)">
                UTC +00:00 (London / UTC)
              </option>
              <option value="UTC +05:30 (India Standard Time)">
                UTC +05:30 (India Standard Time)
              </option>
            </select>
          </div>

          <div>
            <label className="font-bold text-zinc-700 block mb-1">
              Default Landing Screen
            </label>
            <select
              value={defaultTab}
              onChange={(e) => setDefaultTab(e.target.value as StudentNavPage)}
              className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600 cursor-pointer"
            >
              <option value="Dashboard">Dashboard</option>
              <option value="My Courses">My Courses</option>
              <option value="Timetable">Timetable</option>
              <option value="Assignments">Assignments</option>
            </select>
          </div>
        </div>
      </section>

      {/* 4. Notification Preferences */}
      <section
        className="panel p-6 bg-white border border-zinc-100 shadow-sm"
        aria-label="Notification Preferences"
      >
        <div className="card-header mb-4 pb-2 border-b border-zinc-100">
          <div>
            <h3 className="card-title text-sm">
              Notification & Alert Preferences
            </h3>
            <span className="text-[11px] text-zinc-500">
              Choose when and how Quantum LMS contacts you
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          <label className="flex items-center justify-between p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-100/60 transition-colors">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={emailGrades}
                onChange={(e) => setEmailGrades(e.target.checked)}
                className="accent-purple-600 w-4 h-4 cursor-pointer"
              />
              <div>
                <strong className="text-zinc-900 block font-bold">
                  Email Notifications for Grades & Instructor Feedback
                </strong>
                <span className="text-zinc-500 text-[11px]">
                  Receive dispatches immediately upon grading of labs, projects,
                  and quizzes.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
              Email
            </span>
          </label>

          <label className="flex items-center justify-between p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-100/60 transition-colors">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={deadlineReminders}
                onChange={(e) => setDeadlineReminders(e.target.checked)}
                className="accent-purple-600 w-4 h-4 cursor-pointer"
              />
              <div>
                <strong className="text-zinc-900 block font-bold">
                  Assignment Deadline Alerts (24 Hours Prior)
                </strong>
                <span className="text-zinc-500 text-[11px]">
                  Automatic reminder notifications prior to submission window
                  close.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
              Urgent
            </span>
          </label>

          <label className="flex items-center justify-between p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-100/60 transition-colors">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={smsLiveStreams}
                onChange={(e) => setSmsLiveStreams(e.target.checked)}
                className="accent-purple-600 w-4 h-4 cursor-pointer"
              />
              <div>
                <strong className="text-zinc-900 block font-bold">
                  SMS Reminders for Live Broadcast Lectures
                </strong>
                <span className="text-zinc-500 text-[11px]">
                  Get an SMS alert 15 minutes before Prof. Srimanth Adep's live
                  lectures begin.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
              SMS
            </span>
          </label>

          <label className="flex items-center justify-between p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-100/60 transition-colors">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={announcementsDigest}
                onChange={(e) => setAnnouncementsDigest(e.target.checked)}
                className="accent-purple-600 w-4 h-4 cursor-pointer"
              />
              <div>
                <strong className="text-zinc-900 block font-bold">
                  Weekly Campus Digest & Hackathon Bulletins
                </strong>
                <span className="text-zinc-500 text-[11px]">
                  Summary email every Monday morning with academic and event
                  highlights.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-zinc-600 bg-zinc-200 px-2.5 py-0.5 rounded-full">
              Digest
            </span>
          </label>
        </div>

        <div className="flex justify-end pt-3 mt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={handleSavePreferences}
            className="px-6 py-2 rounded-full bg-purple-700 text-white font-bold text-xs hover:bg-purple-800 transition-colors cursor-pointer shadow-sm"
          >
            Save Notification Preferences
          </button>
        </div>
      </section>

      {/* 5. Security & Password Management */}
      <section
        className="panel p-6 bg-white border border-zinc-100 shadow-sm"
        aria-label="Security and Credentials"
      >
        <div className="card-header mb-4 pb-2 border-b border-zinc-100">
          <div>
            <h3 className="card-title text-sm">
              Security & Password Management
            </h3>
            <span className="text-[11px] text-zinc-500">
              Protect your student portal identity, GPU allocations, and grades
            </span>
          </div>
        </div>

        <form
          onSubmit={handleUpdatePassword}
          className="flex flex-col gap-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-zinc-700 block mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          <div className="flex justify-start">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-purple-700 text-white font-bold hover:bg-purple-800 transition-colors cursor-pointer shadow-sm"
            >
              Update Password
            </button>
          </div>
        </form>

        {/* 2FA Section */}
        <div className="pt-5 mt-5 border-t border-zinc-100 flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
            <div>
              <div className="font-bold text-zinc-900 text-sm">
                Two-Factor Authentication (2FA)
              </div>
              <div className="text-zinc-500 text-[11px] mt-0.5">
                Generate a 6-digit one-time code on Google Authenticator or
                1Password when signing in from unknown devices.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !is2FaEnabled
                setIs2FaEnabled(next)
                onToast(
                  next
                    ? "Two-factor authentication enabled! 🛡️"
                    : "2FA disabled for student account.",
                )
              }}
              className={`px-4 py-2 rounded-full font-bold text-xs cursor-pointer shadow-sm ${
                is2FaEnabled
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
              }`}
            >
              {is2FaEnabled ? "✓ 2FA Enabled" : "Enable 2FA"}
            </button>
          </div>

          {/* Active Sessions */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-zinc-900 text-xs font-bold block">
                  Active Authorized Sessions
                </strong>
                <span className="text-zinc-500 text-[11px]">
                  Devices currently signed in with your student credentials
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const secondaryCount = activeSessions.filter((s) => !s.isCurrent).length
                  if (secondaryCount === 0) {
                    onToast("No other active devices to log out.")
                    return
                  }
                  setActiveSessions((prev) => prev.filter((s) => s.isCurrent))
                  onToast(`Logged out ${secondaryCount} secondary device session. Only this computer is authorized. 🔒`)
                }}
                className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
              >
                Log Out Other Devices
              </button>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {activeSessions.map((sess) => (
                <div
                  key={sess.id}
                  className="flex items-center justify-between text-xs p-2.5 bg-white rounded-xl border border-zinc-200"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{sess.icon}</span>
                    <div>
                      <strong className="text-zinc-900 block">
                        {sess.device}
                      </strong>
                      <span className="text-zinc-400 text-[10px]">
                        {sess.meta}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sess.isCurrent
                        ? "text-emerald-700 bg-emerald-100"
                        : "text-zinc-500 bg-zinc-100"
                    }`}
                  >
                    {sess.isCurrent ? "This Device" : "Active"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
