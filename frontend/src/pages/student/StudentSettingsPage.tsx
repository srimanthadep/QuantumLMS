import React, { useState, useEffect, useRef } from "react"
import { Icon } from "../../components/Icon"
import { StudentDropdown, type DropdownOption } from "../../components/StudentDropdown"
import { ThemeAccentPicker } from "../../components/ui/ThemeAccentPicker"
import type { StudentNavPage } from "./studentTypes"
import { studentProfileData, assignedMentorData } from "./studentMockData"
import { fetchStudentIdFromSupabase } from "../../lib/supabase"

interface StudentSettingsPageProps {
  onToast: (msg: string) => void
  onNavigate: (page: StudentNavPage) => void
  onLogout: () => void
  hexColor?: string
  onChangeHexColor?: (color: string) => void
  initialTab?: "profile" | "appearance" | "security" | "notifications"
}

// 3D Isometric Illustration matching screenshot
function SettingsBannerIllustration() {
  return (
    <div className="relative w-44 h-22 hidden md:flex items-center justify-center shrink-0 select-none pointer-events-none">
      <svg
        viewBox="0 0 200 110"
        className="w-full h-full drop-shadow-sm overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="158" cy="30" r="13" fill="#F8B8D0" opacity="0.85" />
        <circle cx="154" cy="26" r="4" fill="#FFFFFF" opacity="0.4" />

        <g transform="translate(24, 52) scale(0.95)">
          <path
            d="M13 0h6v6h-6zM13 26h6v6h-6zM0 13h6v6H0zM26 13h6v6h-6zM3.8 3.8l4.2 4.2-4.2 4.2-4.2-4.2zM22.2 22.2l4.2 4.2-4.2 4.2-4.2-4.2zM3.8 28.2l4.2-4.2 4.2 4.2-4.2 4.2zM22.2 9.8l4.2-4.2 4.2 4.2-4.2 4.2z"
            fill="#6C38E8"
          />
          <circle cx="16" cy="16" r="13" fill="#6C38E8" />
          <circle cx="16" cy="16" r="5.5" fill="#F4EFFF" />
        </g>

        <rect
          x="72"
          y="16"
          width="82"
          height="54"
          rx="5"
          fill="#532AD5"
          transform="skewY(-3.5)"
        />
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
        <rect x="83" y="26" width="24" height="3" rx="1.5" fill="#FFFFFF" opacity="0.9" transform="skewY(-3.5)" />
        <rect x="83" y="31" width="38" height="2" rx="1" fill="#E4DFFD" opacity="0.85" transform="skewY(-3.5)" />
        <rect x="83" y="35" width="30" height="2" rx="1" fill="#E4DFFD" opacity="0.85" transform="skewY(-3.5)" />
        <rect x="83" y="39" width="18" height="2" rx="1" fill="#E7FF9C" opacity="0.9" transform="skewY(-3.5)" />
        <rect x="83" y="43" width="34" height="2" rx="1" fill="#FFFFFF" opacity="0.75" transform="skewY(-3.5)" />

        <path
          d="M60 74 L170 67 L164 81 L52 87 Z"
          fill="#3E1A91"
          opacity="0.9"
        />
        <path
          d="M62 73 L168 66 L163 78 L55 84 Z"
          fill="#6332CC"
        />
        <polygon
          points="102,73 126,71.5 124,78 100,79.5"
          fill="#7C46DE"
        />

        <g transform="translate(152, 70)">
          <rect x="0" y="6" width="38" height="8" rx="2" fill="#4B2896" />
          <rect x="3" y="8" width="34" height="4" rx="1" fill="#FFFFFF" opacity="0.95" />
          <rect x="2" y="0" width="36" height="7" rx="2" fill="#F7B928" />
          <rect x="5" y="2" width="32" height="3" rx="1" fill="#FFFFFF" opacity="0.95" />
          <rect x="1" y="0" width="4" height="7" rx="1" fill="#E59B00" />
        </g>
      </svg>
    </div>
  )
}

const CapIcon = () => (
  <svg className="w-6 h-6 text-primary-text" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
    <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
  </svg>
)

export function StudentSettingsPage({
  onToast,
  onNavigate,
  onLogout,
  hexColor,
  onChangeHexColor,
  initialTab = "profile",
}: StudentSettingsPageProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "appearance" | "security" | "notifications">(initialTab)

  // 1. Profile State (Merged from StudentProfilePage)
  const [fullName, setFullName] = useState(studentProfileData.fullName)
  const [email, setEmail] = useState(studentProfileData.email)
  const [phone, setPhone] = useState(studentProfileData.phone)
  const [campusAddress, setCampusAddress] = useState(studentProfileData.campusAddress)
  const [emergencyContact, setEmergencyContact] = useState(studentProfileData.emergencyContact)
  const [avatar, setAvatar] = useState(studentProfileData.avatar)
  const [isEditingAvatar, setIsEditingAvatar] = useState(false)

  // Dynamic Student ID fetched from Supabase
  const [studentId, setStudentId] = useState<string>("Not Assigned")
  const [isLoadingStudentId, setIsLoadingStudentId] = useState<boolean>(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    setIsLoadingStudentId(true)

    fetchStudentIdFromSupabase(email)
      .then((res) => {
        if (isMounted) {
          setStudentId(res.studentId)
          setIsLoadingStudentId(false)
        }
      })
      .catch((err) => {
        console.error("Failed to load student ID from Supabase:", err)
        if (isMounted) {
          setStudentId("Not Assigned")
          setIsLoadingStudentId(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [email])

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setProfileError("Full Name is required.")
      onToast("Please enter your full name.")
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setProfileError("Please enter a valid university email address.")
      onToast("Invalid email address format.")
      return
    }
    if (!phone.trim()) {
      setProfileError("Contact phone number is required.")
      onToast("Please enter a valid phone number.")
      return
    }
    setProfileError(null)
    onToast("Student profile information saved successfully! ✅")
  }

  const handleAvatarChange = (newSrc: string) => {
    setAvatar(newSrc)
    setIsEditingAvatar(false)
    onToast("Profile photo updated!")
  }

  // 2. Security Form State
  const [currentPw, setCurrentPw] = useState("••••••••••••")
  const [newPw, setNewPw] = useState("••••••••••••")
  const [confirmPw, setConfirmPw] = useState("••••••••••••")
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [is2FaEnabled, setIs2FaEnabled] = useState(true)
  const [is2FaModalOpen, setIs2FaModalOpen] = useState(false)
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false)

  const [activeSessions] = useState([
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

  // 3. Notification & Regional State
  const [emailGrades, setEmailGrades] = useState(true)
  const [deadlineReminders, setDeadlineReminders] = useState(true)
  const [smsLiveStreams, setSmsLiveStreams] = useState(true)
  const [announcementsDigest, setAnnouncementsDigest] = useState(false)
  const [portalLanguage, setPortalLanguage] = useState<string>("English (US)")
  const [timezone, setTimezone] = useState<string>("UTC -05:00 (Eastern Time)")
  const [defaultTab, setDefaultTab] = useState<StudentNavPage>("Dashboard")

  const languageOptions: DropdownOption<string>[] = [
    { value: "English (US)", label: "English (US)" },
    { value: "English (UK)", label: "English (UK)" },
    { value: "Spanish (Español)", label: "Spanish (Español)" },
    { value: "French (Français)", label: "French (Français)" },
  ]

  const timezoneOptions: DropdownOption<string>[] = [
    { value: "UTC -05:00 (Eastern Time)", label: "UTC -05:00 (Eastern Time)" },
    { value: "UTC -08:00 (Pacific Time)", label: "UTC -08:00 (Pacific Time)" },
    { value: "UTC +00:00 (London / UTC)", label: "UTC +00:00 (London / UTC)" },
    { value: "UTC +05:30 (India Standard Time)", label: "UTC +05:30 (India Standard Time)" },
  ]

  const landingScreenOptions: DropdownOption<StudentNavPage>[] = [
    { value: "Dashboard", label: "Dashboard" },
    { value: "My Courses", label: "My Courses" },
    { value: "Timetable", label: "Schedule & Timetable" },
    { value: "Assignments", label: "Assessments" },
    { value: "Grades", label: "Grades & Certificates" },
  ]

  return (
    <div className="app-card-stack flex flex-col gap-[var(--app-card-gap,14px)] w-full max-w-full min-w-0 box-border text-left">
      {/* 1. Header Banner */}
      <section
        className="bg-surface/95 border border-purple-100 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        aria-label="Student Account & Profile Settings"
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-primary-soft border border-purple-100 flex items-center justify-center shrink-0 shadow-xs">
            <CapIcon />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
                Account & Profile Settings
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-primary-soft text-primary-text">
                Personalized Hub
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Manage your verified student identity, academic credentials, security authentication, and theme preferences.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
          <SettingsBannerIllustration />
          <div className="flex flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-surface border border-rose-200 text-xs font-bold text-rose-500 hover:bg-rose-50/50 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
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

      {/* 2. Unified Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-200/80">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "profile"
              ? "bg-purple-700 text-white shadow-xs"
              : "bg-surface text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200"
          }`}
        >
          <span>👤</span>
          <span>Profile & Academic Identity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("appearance")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "appearance"
              ? "bg-purple-700 text-white shadow-xs"
              : "bg-surface text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200"
          }`}
        >
          <span>🎨</span>
          <span>Theme & Appearance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "security"
              ? "bg-purple-700 text-white shadow-xs"
              : "bg-surface text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200"
          }`}
        >
          <span>🔒</span>
          <span>Security & Sessions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "notifications"
              ? "bg-purple-700 text-white shadow-xs"
              : "bg-surface text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200"
          }`}
        >
          <span>🔔</span>
          <span>Notifications & Region</span>
        </button>
      </div>

      {/* TAB 1: Profile & Academic Identity (Merged from StudentProfilePage) */}
      {activeTab === "profile" && (
        <div className="flex flex-col gap-[var(--app-card-gap,14px)]">
          {/* Hero Identity Banner */}
          <section
            className="panel p-6 bg-surface border border-zinc-200/80 rounded-2xl shadow-xs"
            aria-label="Student Identity Banner"
          >
            <div className="flex flex-col sm:flex-row items-start justify-between gap-6 text-left">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                {/* Avatar with Edit Badge */}
                <div className="relative shrink-0">
                  <img
                    src={avatar}
                    alt={fullName}
                    className="w-24 h-24 rounded-3xl object-cover border-4 border-purple-100 shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingAvatar(true)}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-purple-700 text-white flex items-center justify-center text-xs shadow hover:bg-purple-800 cursor-pointer"
                    title="Change Profile Photo"
                    aria-label="Change Profile Photo"
                  >
                    ✎
                  </button>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-start gap-2 mb-1">
                    <h2 className="text-2xl font-black text-zinc-900">
                      {fullName}
                    </h2>
                    {/* Dynamic Student ID Badge */}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-soft text-primary-text border border-primary-border/60 flex items-center gap-1">
                      <span>Student ID:</span>
                      <span className="font-mono">{isLoadingStudentId ? "..." : studentId}</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      Active Enrolled
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                      Dean's Honor List
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-zinc-700 mb-2">
                    {studentProfileData.program} · {studentProfileData.department} · {studentProfileData.batch}
                  </p>

                  <div className="flex flex-wrap items-center justify-start gap-4 text-xs text-zinc-500 font-medium">
                    <span>
                      Email: <strong className="text-zinc-800 font-semibold">{email}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Cumulative GPA:{" "}
                      <strong className="text-purple-700 font-bold">
                        {studentProfileData.gpa}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Attendance:{" "}
                      <strong className="text-emerald-700 font-bold">
                        {studentProfileData.attendance}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Advisor:{" "}
                      <strong className="text-purple-700 font-bold">
                        {studentProfileData.advisor}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Avatar Selection Modal */}
            {isEditingAvatar && (
              <div className="mt-4 p-4 bg-purple-50/60 rounded-2xl border border-purple-200 flex flex-col gap-2">
                <span className="text-xs font-bold text-purple-900">
                  Choose Profile Photo:
                </span>
                <div className="flex items-center gap-3 flex-wrap">
                  {[
                    { name: "Srimanth (Original)", src: "/assets/srimanth.png" },
                    { name: "Student 1", src: "/assets/student-1.png" },
                    { name: "Student 2", src: "/assets/student-2.png" },
                    { name: "Student 3", src: "/assets/student-3.png" },
                    { name: "Student 4", src: "/assets/student-4.png" },
                    { name: "Student 5", src: "/assets/student-5.png" },
                  ].map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleAvatarChange(p.src)}
                      className={`w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                        avatar === p.src
                          ? "border-purple-600 ring-2 ring-purple-300"
                          : "border-zinc-200 hover:border-zinc-400"
                      }`}
                      title={p.name}
                    >
                      <img
                        src={p.src}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsEditingAvatar(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-800 ml-2 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Assigned Faculty Mentor Card */}
          <section
            className="p-5 bg-gradient-to-r from-purple-50 via-white to-purple-50/50 rounded-2xl border border-purple-200 shadow-xs"
            aria-label="Assigned Faculty Advisor Card"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <img
                  src={assignedMentorData.avatar}
                  alt={assignedMentorData.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-300 shadow-xs"
                />
                <div>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      Assigned Faculty Mentor
                    </span>
                    <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Available Now
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-zinc-900 mt-0.5">
                    {assignedMentorData.name}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {assignedMentorData.title} · {assignedMentorData.department}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onToast("Opening Career Hub & 1:1 Mentorship...")
                    onNavigate("Career Hub")
                  }}
                  className="px-4 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Icon name="users" size={13} />
                  <span>View in Career Hub →</span>
                </button>
              </div>
            </div>
          </section>

          {/* Academic Records & Credits Audit */}
          <section
            className="panel p-6 bg-surface border border-zinc-200/80 rounded-2xl shadow-xs"
            aria-label="Academic Records"
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">
                  Academic Standing & Credits Audit
                </h3>
                <span className="text-[11px] text-zinc-500">
                  Official student record verified by School of AI Registrar
                </span>
              </div>
              <button
                type="button"
                onClick={() => onToast("Downloading official signed academic transcript (.pdf)...")}
                className="px-4 py-1.5 rounded-full bg-purple-700 text-white font-bold text-xs hover:bg-purple-800 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Icon name="document" size={13} />
                <span>Download Transcript (PDF)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--app-card-gap,14px)] text-xs">
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Official Student ID</span>
                <strong className="text-sm block mt-1 font-mono text-primary-text font-black">
                  {isLoadingStudentId ? "Fetching..." : studentId}
                </strong>
                <span className="text-zinc-500 text-[11px] mt-1 block">✓ Synced with Supabase</span>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Degree Program</span>
                <strong className="text-zinc-900 text-sm block mt-1">{studentProfileData.program}</strong>
                <span className="text-zinc-500 text-[11px]">Specialization: Autonomous Multi-Agent Systems</span>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Academic Department</span>
                <strong className="text-zinc-900 text-sm block mt-1">{studentProfileData.department}</strong>
                <span className="text-zinc-500 text-[11px]">School of Computing</span>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Batch & Year</span>
                <strong className="text-zinc-900 text-sm block mt-1">{studentProfileData.batch}</strong>
                <span className="text-purple-700 font-semibold text-[11px]">Class of 2027 Honors Candidate</span>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Completed Credits</span>
                <strong className="text-zinc-900 text-sm block mt-1">
                  {studentProfileData.creditsCompleted} of {studentProfileData.totalCredits} Credits
                </strong>
                <span className="text-emerald-700 font-semibold text-[11px]">70% toward graduation · On Track</span>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Expected Graduation</span>
                <strong className="text-zinc-900 text-sm block mt-1">June 2027</strong>
                <span className="text-purple-700 font-semibold text-[11px]">Verified by School Registrar</span>
              </div>
            </div>
          </section>

          {/* Edit Personal & Contact Information Form */}
          <section
            className="panel p-6 bg-surface border border-zinc-200/80 rounded-2xl shadow-xs"
            aria-label="Edit Profile Details"
          >
            <div className="mb-4 pb-2 border-b border-zinc-100">
              <h3 className="font-bold text-sm text-zinc-900">
                Personal & Contact Information
              </h3>
              <span className="text-[11px] text-zinc-500">
                Keep your student directory and contact details accurate
              </span>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--app-card-gap,14px)]">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-zinc-700 block">Student ID</label>
                    <span className="text-[10px] font-semibold text-muted-foreground bg-primary-soft px-2 py-0.5 rounded-full border border-primary-border/60">
                      🔒 Read-Only
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={isLoadingStudentId ? "Fetching from Supabase..." : studentId}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono font-bold text-primary-text cursor-not-allowed select-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-surface text-zinc-900 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">University Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-surface text-zinc-900 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Primary Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-surface text-zinc-900 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Emergency Contact / Guardian</label>
                  <input
                    type="text"
                    required
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-surface text-zinc-900 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Campus Residential Address</label>
                  <input
                    type="text"
                    required
                    value={campusAddress}
                    onChange={(e) => setCampusAddress(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-surface text-zinc-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {profileError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  ⚠️ {profileError}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-zinc-100">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-purple-700 text-white font-bold hover:bg-purple-800 transition-colors cursor-pointer shadow-xs"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* TAB 2: Theme & Appearance (With Curated ThemeAccentPicker) */}
      {activeTab === "appearance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--app-card-gap,14px)]">
          <section
            className="bg-surface border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between"
            aria-label="Brand Theme Presets"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🎨</span>
                <h3 className="font-bold text-zinc-900 text-sm">Curated Brand Themes</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                Select from WCAG contrast-certified university themes for optimal visual ergonomics.
              </p>
              <ThemeAccentPicker />
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 text-xs text-zinc-400">
              System enforces strict scannability and contrast guarantees across all screen sizes.
            </div>
          </section>

          <section
            className="bg-surface border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between"
            aria-label="Regional & Landing Settings"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🌐</span>
                <h3 className="font-bold text-zinc-900 text-sm">Regional Preferences</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                Configure your timezone and default landing screen upon login.
              </p>

              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Timezone</label>
                  <StudentDropdown
                    options={timezoneOptions}
                    value={timezone}
                    onChange={(val) => {
                      setTimezone(val)
                      onToast(`Timezone updated to ${val}`)
                    }}
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Default Landing Screen</label>
                  <StudentDropdown
                    options={landingScreenOptions}
                    value={defaultTab}
                    onChange={(val) => {
                      setDefaultTab(val)
                      onToast(`Default landing screen set to ${val}`)
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-end">
              <button
                type="button"
                onClick={() => onToast("Regional preferences saved! ✅")}
                className="px-4 py-2 rounded-xl bg-purple-700 text-white font-bold text-xs hover:bg-purple-800 transition-colors shadow-xs cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: Security & Sessions */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--app-card-gap,14px)]">
          <section
            className="bg-surface border border-zinc-200/80 rounded-2xl p-6 shadow-xs"
            aria-label="Change Password"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🔐</span>
              <h3 className="font-bold text-zinc-900 text-sm">Update Password</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Ensure your account uses a strong, unique password with at least 8 characters.
            </p>

            <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    required
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-surface text-zinc-900 pr-9 focus:outline-none focus:border-purple-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-700 cursor-pointer text-xs"
                  >
                    {showCurrentPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    required
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-surface text-zinc-900 pr-9 focus:outline-none focus:border-purple-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-700 cursor-pointer text-xs"
                  >
                    {showNewPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    required
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-surface text-zinc-900 pr-9 focus:outline-none focus:border-purple-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-700 cursor-pointer text-xs"
                  >
                    {showConfirmPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 text-white font-bold text-xs hover:bg-purple-800 transition-colors shadow-xs cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </section>

          <section
            className="bg-surface border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between"
            aria-label="Active Sessions & 2FA"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🛡️</span>
                <h3 className="font-bold text-zinc-900 text-sm">Two-Factor & Sessions</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                Strengthen login authentication and manage active device connections.
              </p>

              <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 mb-3">
                <div>
                  <strong className="text-xs text-zinc-900 block">Two-Factor Authentication (2FA)</strong>
                  <span className="text-[11px] text-zinc-500">Require an authenticator code when logging in</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIs2FaEnabled(!is2FaEnabled)
                    onToast(is2FaEnabled ? "2FA has been disabled." : "2FA enabled successfully! 🛡️")
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    is2FaEnabled
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-zinc-200 text-zinc-700"
                  }`}
                >
                  {is2FaEnabled ? "✓ Enabled" : "Disabled"}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Active Device Sessions</span>
                {activeSessions.map((sess) => (
                  <div key={sess.id} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{sess.icon}</span>
                      <div>
                        <div className="font-bold text-zinc-900 flex items-center gap-2">
                          <span>{sess.device}</span>
                          {sess.isCurrent && (
                            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 font-bold text-[9px] rounded">
                              This Device
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500">{sess.meta}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-end">
              <button
                type="button"
                onClick={() => onToast("All other device sessions logged out.")}
                className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 font-bold text-xs hover:bg-rose-50 cursor-pointer"
              >
                Log Out Other Sessions
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: Notifications & Preferences */}
      {activeTab === "notifications" && (
        <section
          className="bg-surface border border-zinc-200/80 rounded-2xl p-6 shadow-xs max-w-2xl"
          aria-label="Notification Preferences"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🔔</span>
            <h3 className="font-bold text-zinc-900 text-sm">Alert & Notification Channels</h3>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            Select the communication channels you wish to receive urgent academic updates through.
          </p>

          <div className="flex flex-col gap-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 cursor-pointer">
              <div>
                <strong className="block text-zinc-900">Grade & Evaluation Results</strong>
                <span className="text-[11px] text-zinc-500">Get notified when assessments are marked by evaluators</span>
              </div>
              <input
                type="checkbox"
                checked={emailGrades}
                onChange={(e) => setEmailGrades(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 cursor-pointer">
              <div>
                <strong className="block text-zinc-900">Upcoming Deadline Reminders</strong>
                <span className="text-[11px] text-zinc-500">24-hour and 6-hour alerts before assignment closures</span>
              </div>
              <input
                type="checkbox"
                checked={deadlineReminders}
                onChange={(e) => setDeadlineReminders(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 cursor-pointer">
              <div>
                <strong className="block text-zinc-900">Live Stream & Class Alerts</strong>
                <span className="text-[11px] text-zinc-500">SMS and in-app alerts when faculty starts live broadcast</span>
              </div>
              <input
                type="checkbox"
                checked={smsLiveStreams}
                onChange={(e) => setSmsLiveStreams(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 cursor-pointer">
              <div>
                <strong className="block text-zinc-900">Weekly Digest & Campus Announcements</strong>
                <span className="text-[11px] text-zinc-500">Curated weekly summary of campus happenings</span>
              </div>
              <input
                type="checkbox"
                checked={announcementsDigest}
                onChange={(e) => setAnnouncementsDigest(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
            </label>
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-100 flex justify-end">
            <button
              type="button"
              onClick={() => onToast("Notification preferences updated successfully! 🔔")}
              className="px-5 py-2 rounded-xl bg-purple-700 text-white font-bold text-xs hover:bg-purple-800 transition-colors shadow-xs cursor-pointer"
            >
              Save Notification Preferences
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

export default StudentSettingsPage
