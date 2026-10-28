import { useState, useRef } from "react"
import { StudentDropdown, type DropdownOption } from "../../components/StudentDropdown"
import type { StudentNavPage } from "./studentTypes"

interface StudentSettingsPageProps {
  onToast: (msg: string) => void
  onNavigate: (page: StudentNavPage) => void
  onLogout: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
}

// 3D Isometric Illustration matching screenshot (laptop, books, gear, sphere)
function SettingsBannerIllustration() {
  return (
    <div className="relative w-44 h-22 hidden md:flex items-center justify-center shrink-0 select-none pointer-events-none">
      <svg
        viewBox="0 0 200 110"
        className="w-full h-full drop-shadow-sm overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft floating pink/coral sphere */}
        <circle cx="158" cy="30" r="13" fill="#F8B8D0" opacity="0.85" />
        <circle cx="154" cy="26" r="4" fill="#FFFFFF" opacity="0.4" />

        {/* Purple Gear on the left */}
        <g transform="translate(24, 52) scale(0.95)">
          <path
            d="M13 0h6v6h-6zM13 26h6v6h-6zM0 13h6v6H0zM26 13h6v6h-6zM3.8 3.8l4.2 4.2-4.2 4.2-4.2-4.2zM22.2 22.2l4.2 4.2-4.2 4.2-4.2-4.2zM3.8 28.2l4.2-4.2 4.2 4.2-4.2 4.2zM22.2 9.8l4.2-4.2 4.2 4.2-4.2 4.2z"
            fill="#6C38E8"
          />
          <circle cx="16" cy="16" r="13" fill="#6C38E8" />
          <circle cx="16" cy="16" r="5.5" fill="#F4EFFF" />
        </g>

        {/* Laptop Display (Tilted Isometric) */}
        <rect
          x="72"
          y="16"
          width="82"
          height="54"
          rx="5"
          fill="#532AD5"
          transform="skewY(-3.5)"
        />
        {/* Screen Bezel & Content */}
        <rect
          x="76"
          y="19"
          width="74"
          height="46"
          rx="3"
          fill="#A47BFC"
          transform="skewY(-3.5)"
        />
        <rect
          x="78"
          y="21"
          width="70"
          height="42"
          rx="2"
          fill="#B693FE"
          transform="skewY(-3.5)"
        />
        {/* Code / Window lines inside screen */}
        <rect x="83" y="26" width="24" height="3" rx="1.5" fill="#FFFFFF" opacity="0.9" transform="skewY(-3.5)" />
        <rect x="83" y="31" width="38" height="2" rx="1" fill="#E4DFFD" opacity="0.85" transform="skewY(-3.5)" />
        <rect x="83" y="35" width="30" height="2" rx="1" fill="#E4DFFD" opacity="0.85" transform="skewY(-3.5)" />
        <rect x="83" y="39" width="18" height="2" rx="1" fill="#E7FF9C" opacity="0.9" transform="skewY(-3.5)" />
        <rect x="83" y="43" width="34" height="2" rx="1" fill="#FFFFFF" opacity="0.75" transform="skewY(-3.5)" />

        {/* Laptop Base */}
        <path
          d="M60 74 L170 67 L164 81 L52 87 Z"
          fill="#3E1A91"
          opacity="0.9"
        />
        <path
          d="M62 73 L168 66 L163 78 L55 84 Z"
          fill="#6332CC"
        />
        {/* Trackpad */}
        <polygon
          points="102,73 126,71.5 124,78 100,79.5"
          fill="#7C46DE"
        />

        {/* Stacked Books underneath on the right */}
        <g transform="translate(152, 70)">
          {/* Bottom Book (Purple) */}
          <rect x="0" y="6" width="38" height="8" rx="2" fill="#4B2896" />
          <rect x="3" y="8" width="34" height="4" rx="1" fill="#FFFFFF" opacity="0.95" />
          {/* Top Book (Yellow) */}
          <rect x="2" y="0" width="36" height="7" rx="2" fill="#F7B928" />
          <rect x="5" y="2" width="32" height="3" rx="1" fill="#FFFFFF" opacity="0.95" />
          <rect x="1" y="0" width="4" height="7" rx="1" fill="#E59B00" />
        </g>
      </svg>
    </div>
  )
}

// Clean inline SVG Icons for settings cards
const CapIcon = () => (
  <svg className="w-6 h-6 text-[#905FEB]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
    <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
  </svg>
)

const PaletteIcon = () => (
  <svg className="w-5 h-5 text-[#905FEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
  </svg>
)

const GlobeIcon = () => (
  <svg className="w-5 h-5 text-[#905FEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

const BellIcon = () => (
  <svg className="w-5 h-5 text-[#905FEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-5 h-5 text-[#905FEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const LockIcon = () => (
  <svg className="w-5 h-5 text-[#905FEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const MonitorIcon = () => (
  <svg className="w-5 h-5 text-[#905FEB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

const EyeIcon = ({ isSlash }: { isSlash?: boolean }) => (
  <svg className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-800 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {isSlash ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
)

export function StudentSettingsPage({
  onToast,
  onNavigate,
  onLogout,
  hexColor,
  onChangeHexColor,
}: StudentSettingsPageProps) {
  // Canvas Hex Input State
  const [hexInput, setHexInput] = useState(hexColor)
  const colorPickerRef = useRef<HTMLInputElement>(null)

  // Password change form
  const [currentPw, setCurrentPw] = useState("••••••••••••")
  const [newPw, setNewPw] = useState("••••••••••••")
  const [confirmPw, setConfirmPw] = useState("••••••••••••")

  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  // Security toggles & modals
  const [is2FaEnabled, setIs2FaEnabled] = useState(true)
  const [is2FaModalOpen, setIs2FaModalOpen] = useState(false)
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false)

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

  // Notification toggles
  const [emailGrades, setEmailGrades] = useState(true)
  const [deadlineReminders, setDeadlineReminders] = useState(true)
  const [smsLiveStreams, setSmsLiveStreams] = useState(true)
  const [announcementsDigest, setAnnouncementsDigest] = useState(false)

  // Regional Preferences
  const [portalLanguage, setPortalLanguage] = useState<string>("English (US)")
  const [timezone, setTimezone] = useState<string>("UTC -05:00 (Eastern Time)")
  const [defaultTab, setDefaultTab] = useState<StudentNavPage>("Dashboard")

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPw) {
      onToast("Please enter your current password.")
      return
    }
    if (newPw !== confirmPw) {
      onToast("New passwords do not match!")
      return
    }
    if (newPw.length < 6) {
      onToast("New password must be at least 6 characters.")
      return
    }
    onToast("Password updated successfully! 🔒")
  }

  const handleSavePreferences = () => {
    onToast("Notification preferences updated successfully! 🔔")
  }

  const languageOptions: DropdownOption<string>[] = [
    {
      value: "English (US)",
      label: "English (US)",
      icon: (
        <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
    {
      value: "English (UK)",
      label: "English (UK)",
      icon: (
        <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
    {
      value: "Spanish (Español)",
      label: "Spanish (Español)",
      icon: (
        <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
    {
      value: "French (Français)",
      label: "French (Français)",
      icon: (
        <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
  ]

  const timezoneOptions: DropdownOption<string>[] = [
    {
      value: "UTC -05:00 (Eastern Time)",
      label: "UTC -05:00 (Eastern Time)",
      icon: (
        <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      value: "UTC -08:00 (Pacific Time)",
      label: "UTC -08:00 (Pacific Time)",
      icon: (
        <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      value: "UTC +00:00 (London / UTC)",
      label: "UTC +00:00 (London / UTC)",
      icon: (
        <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      value: "UTC +05:30 (India Standard Time)",
      label: "UTC +05:30 (India Standard Time)",
      icon: (
        <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ]

  const landingScreenOptions: DropdownOption<StudentNavPage>[] = [
    {
      value: "Dashboard",
      label: "Dashboard",
      icon: (
        <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      value: "My Courses",
      label: "My Courses",
      icon: (
        <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      value: "Timetable",
      label: "Timetable",
      icon: (
        <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      value: "Assignments",
      label: "Assignments",
      icon: (
        <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      value: "Grades",
      label: "Grades",
      icon: (
        <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full max-w-full min-w-0 box-border text-left">
      {/* Top Breadcrumb Navigation */}
      <div className="flex justify-end items-center gap-1.5 text-xs text-zinc-400 font-medium -mb-1">
        <span>Settings</span>
        <span className="text-zinc-300">›</span>
        <button
          type="button"
          onClick={() => onNavigate("Profile")}
          className="text-zinc-700 hover:text-[#905FEB] font-bold cursor-pointer transition-colors"
        >
          Profile
        </button>
      </div>

      {/* 1. Student Account Settings Banner */}
      <section
        className="bg-white/90 border border-purple-100/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        aria-label="Student Account Settings Banner"
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#F0EDFF] border border-purple-100/80 flex items-center justify-center shrink-0 shadow-xs">
            <CapIcon />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
                Student Account Settings
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#F0EDFF] text-[#905FEB]">
                Preferences
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Manage security passwords, two factor authentication, email alert preferences, and portal appearance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
          <SettingsBannerIllustration />
          <div className="flex flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate("Profile")}
              className="px-4 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>View Profile</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-500 hover:bg-rose-50/50 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </section>

      {/* Row 1: Two-Column Arrangement (Portal Theme & Regional Preferences) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* 2. Portal Theme & Canvas Background */}
        <section
          className="bg-white border border-zinc-100 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between"
          aria-label="Portal Theme & Canvas Background"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#F0EDFF] flex items-center justify-center shrink-0">
                <PaletteIcon />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-[15px] text-zinc-900 leading-tight">
                  Portal Theme & Canvas Background
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Customize the background color of your workspace using the LMS color engine.
                </p>
              </div>
            </div>

            <div className="bg-[#FBFAFC] border border-zinc-200/70 rounded-2xl p-4">
              <strong className="text-xs font-bold text-zinc-800 block">
                Canvas HEX Background
              </strong>
              <p className="text-[11px] text-zinc-500 mt-0.5 mb-3">
                Pick any hex color. The entire application background and content recalculates automatically.
              </p>

              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                {/* Pill input matching screenshot: [ (swatch) HEX #626bea × ] */}
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => colorPickerRef.current?.click()}
                    className="w-5 h-5 rounded-full border border-black/10 shrink-0 cursor-pointer shadow-xs transition-transform hover:scale-105"
                    style={{ backgroundColor: hexColor }}
                    title="Click to pick custom color"
                  >
                    <input
                      ref={colorPickerRef}
                      type="color"
                      value={hexColor.length === 7 ? hexColor : "#F1F0F3"}
                      onChange={(e) => {
                        const c = e.target.value
                        setHexInput(c)
                        onChangeHexColor(c)
                      }}
                      className="sr-only"
                    />
                  </button>

                  <span className="text-[11px] font-bold text-zinc-700 tracking-wide select-none">
                    HEX
                  </span>

                  <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => {
                      const val = e.target.value
                      setHexInput(val)
                      if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
                        onChangeHexColor(val)
                      }
                    }}
                    placeholder="#626bea"
                    className="text-xs font-semibold text-zinc-800 w-24 bg-transparent outline-none font-mono"
                  />

                  {hexColor.toLowerCase() !== "#f1f0f3" && (
                    <button
                      type="button"
                      onClick={() => {
                        setHexInput("#F1F0F3")
                        onChangeHexColor("#F1F0F3")
                      }}
                      className="text-zinc-400 hover:text-zinc-700 text-sm font-bold leading-none cursor-pointer"
                      title="Reset to default"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setHexInput("#F1F0F3")
                    onChangeHexColor("#F1F0F3")
                  }}
                  className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 shadow-2xs cursor-pointer transition-colors"
                >
                  Default Canvas (#F1F0F3)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Account & Regional Preferences */}
        <section
          className="bg-white border border-zinc-100 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between"
          aria-label="Account & Regional Preferences"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#F0EDFF] flex items-center justify-center shrink-0">
                <GlobeIcon />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-[15px] text-zinc-900 leading-tight">
                  Account & Regional Preferences
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Locale, time zone, and navigation defaults.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-4">
              <div>
                <label className="font-bold text-zinc-700 block mb-1.5 text-[11px]">
                  Portal Display Language
                </label>
                <StudentDropdown<string>
                  value={portalLanguage}
                  onChange={(val) => setPortalLanguage(String(val))}
                  options={languageOptions}
                  size="sm"
                  rounded="xl"
                  triggerClassName="rounded-xl border-zinc-200 bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1.5 text-[11px]">
                  Campus Timezone
                </label>
                <StudentDropdown<string>
                  value={timezone}
                  onChange={(val) => setTimezone(String(val))}
                  options={timezoneOptions}
                  size="sm"
                  rounded="xl"
                  triggerClassName="rounded-xl border-zinc-200 bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1.5 text-[11px]">
                  Default Landing Screen
                </label>
                <StudentDropdown<StudentNavPage>
                  value={defaultTab}
                  onChange={(val) => setDefaultTab(val as StudentNavPage)}
                  options={landingScreenOptions}
                  size="sm"
                  rounded="xl"
                  triggerClassName="rounded-xl border-zinc-200 bg-white"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Row 2: Two-Column Arrangement (Notification & Security) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* 4. Notification & Alert Preferences */}
        <section
          className="bg-white border border-zinc-100 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between"
          aria-label="Notification & Alert Preferences"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#F0EDFF] flex items-center justify-center shrink-0">
                <BellIcon />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-[15px] text-zinc-900 leading-tight">
                  Notification & Alert Preferences
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Choose when and how Quantum LMS contacts you.
                </p>
              </div>
            </div>

            {/* Notification Toggles List */}
            <div className="flex flex-col divide-y divide-zinc-100">
              {/* Item 1 */}
              <div className="flex items-center justify-between py-2.5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={emailGrades}
                    onClick={() => setEmailGrades(!emailGrades)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      emailGrades ? "bg-[#905FEB]" : "bg-zinc-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                        emailGrades ? "translate-x-5.5 ml-0.5" : "translate-x-0.5 ml-0.5"
                      }`}
                    />
                  </button>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-zinc-900 leading-tight">
                      Email Notifications for Grades & Instructor Feedback
                    </div>
                    <div className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                      Receive notifications immediately upon grading of labs, projects, and quizzes.
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F0EDFF] text-[#905FEB] shrink-0">
                  Email
                </span>
              </div>

              {/* Item 2 */}
              <div className="flex items-center justify-between py-2.5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={deadlineReminders}
                    onClick={() => setDeadlineReminders(!deadlineReminders)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      deadlineReminders ? "bg-[#905FEB]" : "bg-zinc-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                        deadlineReminders ? "translate-x-5.5 ml-0.5" : "translate-x-0.5 ml-0.5"
                      }`}
                    />
                  </button>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-zinc-900 leading-tight">
                      Assignment Deadline Alerts (24 Hours Prior)
                    </div>
                    <div className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                      Automatic reminder notifications prior to submission window close.
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] shrink-0">
                  Urgent
                </span>
              </div>

              {/* Item 3 */}
              <div className="flex items-center justify-between py-2.5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={smsLiveStreams}
                    onClick={() => setSmsLiveStreams(!smsLiveStreams)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      smsLiveStreams ? "bg-[#905FEB]" : "bg-zinc-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                        smsLiveStreams ? "translate-x-5.5 ml-0.5" : "translate-x-0.5 ml-0.5"
                      }`}
                    />
                  </button>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-zinc-900 leading-tight">
                      SMS Reminders for Live Broadcast Lectures
                    </div>
                    <div className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                      Get an SMS alert 15 minutes before Prof. Srimanth Aditya's live lectures begin.
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] shrink-0">
                  SMS
                </span>
              </div>

              {/* Item 4 */}
              <div className="flex items-center justify-between py-2.5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={announcementsDigest}
                    onClick={() => setAnnouncementsDigest(!announcementsDigest)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      announcementsDigest ? "bg-[#905FEB]" : "bg-zinc-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                        announcementsDigest ? "translate-x-5.5 ml-0.5" : "translate-x-0.5 ml-0.5"
                      }`}
                    />
                  </button>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-zinc-900 leading-tight">
                      Weekly Campus Digest & Hackathon Bulletins
                    </div>
                    <div className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                      Summary email every Monday morning with academic and event highlights.
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 shrink-0">
                  Digest
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 mt-1">
            <button
              type="button"
              onClick={handleSavePreferences}
              className="px-4 py-2 rounded-xl bg-[#905FEB] hover:bg-[#7D4BD8] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>Save Notification Preferences</span>
            </button>
          </div>
        </section>

        {/* 5. Security & Password Management */}
        <section
          className="bg-white border border-zinc-100 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between"
          aria-label="Security & Password Management"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#F0EDFF] flex items-center justify-center shrink-0">
                <ShieldIcon />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-[15px] text-zinc-900 leading-tight">
                  Security & Password Management
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Protect your student portal identity, GPU allocations, and grades.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Current Password */}
                <div>
                  <label className="font-bold text-zinc-700 block mb-1.5 text-[11px]">
                    Current Password
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-zinc-500">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      required
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-8 pr-8 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:border-purple-600 font-mono shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 cursor-pointer"
                      title={showCurrentPw ? "Hide password" : "Show password"}
                    >
                      <EyeIcon isSlash={showCurrentPw} />
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="font-bold text-zinc-700 block mb-1.5 text-[11px]">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-zinc-500">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showNewPw ? "text" : "password"}
                      required
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-8 pr-8 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:border-purple-600 font-mono shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 cursor-pointer"
                      title={showNewPw ? "Hide password" : "Show password"}
                    >
                      <EyeIcon isSlash={showNewPw} />
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="font-bold text-zinc-700 block mb-1.5 text-[11px]">
                    Confirm New Password
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-zinc-500">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showConfirmPw ? "text" : "password"}
                      required
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-8 pr-8 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:border-purple-600 font-mono shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 cursor-pointer"
                      title={showConfirmPw ? "Hide password" : "Show password"}
                    >
                      <EyeIcon isSlash={showConfirmPw} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-start pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#905FEB] hover:bg-[#7D4BD8] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* Row 3: Bottom Two Cards (2FA & Active Authorized Sessions) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* 6. Two-Factor Authentication (2FA) */}
        <section
          className="bg-white border border-zinc-100 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          aria-label="Two-Factor Authentication"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#F0EDFF] flex items-center justify-center shrink-0">
              <LockIcon />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-zinc-900 leading-tight">
                Two-Factor Authentication (2FA)
              </h4>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
                Generate a 6-digit one-time code on Google Authenticator or 1Password when signing in from unknown devices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#059669] text-white flex items-center gap-1 shadow-2xs">
              ✓ 2FA Enabled
            </span>
            <button
              type="button"
              onClick={() => setIs2FaModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Manage 2FA</span>
            </button>
          </div>
        </section>

        {/* 7. Active Authorized Sessions */}
        <section
          className="bg-white border border-zinc-100 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          aria-label="Active Authorized Sessions"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#F0EDFF] flex items-center justify-center shrink-0">
              <MonitorIcon />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-zinc-900 leading-tight">
                Active Authorized Sessions
              </h4>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
                View and manage all devices currently signed in with your student credentials.
              </p>
            </div>
          </div>

          <div className="shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setIsSessionsModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>Manage Sessions</span>
            </button>
          </div>
        </section>
      </div>

      {/* ========================================================
          MODAL: MANAGE 2FA
          ======================================================== */}
      {is2FaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-purple-100 shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                  🔒
                </span>
                <h3 className="font-bold text-sm text-zinc-900">
                  Two-Factor Authentication (2FA)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIs2FaModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Your account is secured with multi-factor authentication using Google Authenticator or 1Password. A 6-digit TOTP code is required for logins from unrecognized browsers.
            </p>

            <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
              <div>
                <strong className="text-xs font-bold text-zinc-800 block">
                  Enforce 2FA on Next Login
                </strong>
                <span className="text-[11px] text-zinc-500">
                  {is2FaEnabled ? "Currently active & verified" : "Disabled"}
                </span>
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  is2FaEnabled
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                }`}
              >
                {is2FaEnabled ? "Active" : "Enable"}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIs2FaModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#905FEB] text-white text-xs font-bold hover:bg-[#7D4BD8] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: MANAGE ACTIVE SESSIONS
          ======================================================== */}
      {isSessionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-purple-100 shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                  🖥
                </span>
                <h3 className="font-bold text-sm text-zinc-900">
                  Authorized Device Sessions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSessionsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              These are the web and mobile applications currently authorized with your student credentials. You can revoke secondary sessions at any time.
            </p>

            <div className="flex flex-col gap-2.5">
              {activeSessions.map((sess) => (
                <div
                  key={sess.id}
                  className="flex items-center justify-between p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{sess.icon}</span>
                    <div className="min-w-0">
                      <strong className="text-zinc-900 block truncate">
                        {sess.device}
                      </strong>
                      <span className="text-zinc-400 text-[10.5px] truncate block">
                        {sess.meta}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                      sess.isCurrent
                        ? "text-emerald-700 bg-emerald-100"
                        : "text-zinc-500 bg-zinc-200"
                    }`}
                  >
                    {sess.isCurrent ? "This Device" : "Active"}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 gap-2">
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
                className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
              >
                Log Out Other Devices
              </button>
              <button
                type="button"
                onClick={() => setIsSessionsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#905FEB] text-white text-xs font-bold hover:bg-[#7D4BD8] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
