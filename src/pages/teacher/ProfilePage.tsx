import { useState, useEffect, useMemo } from "react"
import { Icon } from "../../components/Icon"
import { TeacherHeaderActions } from "./TeacherHeaderActions"

export interface TeacherProfileData {
  fullName: string
  email: string
  phone: string
  designation: string
  department: string
  assignedClasses: string[]
  assignedCourses: { id: string; name: string; code: string; studentCount: number }[]
  bio: string
  officeHours: string
  staffId: string
  avatar: string
  academicTerm: string
}

export const initialTeacherProfile: TeacherProfileData = {
  fullName: "Srimanth",
  email: "srimanth@quantum-lms.edu",
  phone: "+1 (555) 234-5678",
  designation: "Lead Educator · Year 4 STEM & AI",
  department: "Department of Artificial Intelligence & Computer Science",
  assignedClasses: ["Year 4 – Maple Class (Lead)", "Year 4 – Oak Class (Co-Instructor)"],
  assignedCourses: [
    { id: "c1", name: "Foundations of Artificial Intelligence", code: "CS-101", studentCount: 24 },
    { id: "c2", name: "Prompt Engineering & LLM Systems", code: "CS-204", studentCount: 22 },
    { id: "c3", name: "Machine Learning Foundations", code: "CS-302", studentCount: 24 },
    { id: "c4", name: "Autonomous Multi-Agent Robotics", code: "CS-410", studentCount: 18 },
  ],
  bio: "Passionate elementary educator and computer scientist specializing in computational thinking, foundational AI concepts, and project-based STEM learning. Dedicated to empowering the next generation of engineers and researchers through engaging, hands-on curricula.",
  officeHours: "Mon – Thu, 03:30 PM – 05:00 PM (Room 402B & Virtual Video Bridge)",
  staffId: "FAC-AI-2024-089",
  avatar: "/assets/teacher.png",
  academicTerm: "Academic Year 2025–2026 (Semester 1)",
}

export function getTeacherProfile(): TeacherProfileData {
  try {
    const saved = localStorage.getItem("quantum_teacher_profile_v2") || localStorage.getItem("quantum_teacher_profile_v1")
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...initialTeacherProfile, ...parsed }
    }
  } catch {
    // fallback
  }
  return initialTeacherProfile
}

export function saveTeacherProfile(data: TeacherProfileData): void {
  try {
    localStorage.setItem("quantum_teacher_profile_v2", JSON.stringify(data))
    localStorage.setItem("quantum_teacher_profile_v1", JSON.stringify(data))
    // Also sync with global user profile
    localStorage.setItem(
      "quantum_current_user",
      JSON.stringify({
        id: "u-1",
        name: data.fullName,
        role: "Teacher",
        email: data.email,
        title: data.designation,
        avatar: data.avatar,
      })
    )
    window.dispatchEvent(new CustomEvent("quantum-teacher-profile-updated", { detail: data }))
  } catch {
    // ignore
  }
}

export function ProfileHeader({
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  onSwitchToSettings,
}: {
  searchQuery?: string
  setSearchQuery?: (q: string) => void
  hexColor?: string
  onChangeHexColor?: (color: string) => void
  onOpenAiModal?: () => void
  onSwitchToSettings?: () => void
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>My Profile</span>
        </div>
        <div className="subtitle">
          Personal credentials, educator biography, assigned classes, and institutional verification
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
              placeholder="Search profile details..."
              aria-label="Search profile"
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
          {onSwitchToSettings && (
            <button
              type="button"
              onClick={onSwitchToSettings}
              className="h-9 px-3.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              aria-label="Open Account Settings"
            >
              <Icon name="settings" size={13} />
              <span>Account Settings</span>
            </button>
          )}
        </TeacherHeaderActions>
      </div>
    </header>
  )
}

const PRESET_AVATARS = [
  { label: "Default Educator", url: "/assets/teacher.png" },
  { label: "Male Avatar 1", url: "/assets/student-1.png" },
  { label: "Male Avatar 2", url: "/assets/student-2.png" },
  { label: "Female Avatar 1", url: "/assets/student-3.png" },
  { label: "Female Avatar 2", url: "/assets/student-4.png" },
  { label: "Senior Scholar", url: "/assets/student-5.png" },
]

export default function ProfilePage({
  searchQuery = "",
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  onToast,
  onSwitchToSettings,
}: {
  searchQuery?: string
  setSearchQuery?: (q: string) => void
  hexColor?: string
  onChangeHexColor?: (color: string) => void
  onOpenAiModal?: () => void
  onToast?: (msg: string) => void
  onSwitchToSettings?: () => void
}) {
  const [profile, setProfile] = useState<TeacherProfileData>(() => getTeacherProfile())
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<TeacherProfileData>(profile)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [successBanner, setSuccessBanner] = useState<string | null>(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [customAvatarInput, setCustomAvatarInput] = useState("")

  // Listen for outside updates
  useEffect(() => {
    const handleUpdate = () => {
      const p = getTeacherProfile()
      setProfile(p)
      if (!isEditing) setEditForm(p)
    }
    window.addEventListener("quantum-teacher-profile-updated", handleUpdate)
    return () => window.removeEventListener("quantum-teacher-profile-updated", handleUpdate)
  }, [isEditing])

  // Auto-dismiss success notification
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 4500)
      return () => clearTimeout(timer)
    }
  }, [successBanner])

  const handleStartEditing = () => {
    setEditForm(profile)
    setFormErrors({})
    setIsEditing(true)
    setSuccessBanner(null)
  }

  const handleCancelEditing = () => {
    setEditForm(profile)
    setFormErrors({})
    setIsEditing(false)
    setShowAvatarPicker(false)
  }

  const handleSelectPresetAvatar = (url: string) => {
    setEditForm((prev) => ({ ...prev, avatar: url }))
    setShowAvatarPicker(false)
  }

  const handleApplyCustomAvatar = () => {
    if (customAvatarInput.trim()) {
      setEditForm((prev) => ({ ...prev, avatar: customAvatarInput.trim() }))
      setCustomAvatarInput("")
      setShowAvatarPicker(false)
    }
  }

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const errors: Record<string, string> = {}

    // Validation
    if (!editForm.fullName.trim()) {
      errors.fullName = "Full name is required."
    } else if (editForm.fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters."
    }

    if (!editForm.phone.trim()) {
      errors.phone = "Phone number is required."
    } else if (!/^[0-9+()\s.-]{7,20}$/.test(editForm.phone.trim())) {
      errors.phone = "Please enter a valid telephone number format."
    }

    if (!editForm.bio.trim()) {
      errors.bio = "Educator bio is required."
    } else if (editForm.bio.trim().length < 10) {
      errors.bio = "Please write a slightly more detailed bio (at least 10 characters)."
    } else if (editForm.bio.length > 500) {
      errors.bio = "Bio cannot exceed 500 characters."
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    saveTeacherProfile(editForm)
    setProfile(editForm)
    setIsEditing(false)
    setShowAvatarPicker(false)
    const successMsg = "Teacher profile successfully updated and persisted!"
    setSuccessBanner(successMsg)
    if (onToast) onToast(successMsg)
  }

  // Total students calculated from assigned courses
  const totalAssignedStudents = useMemo(() => {
    return profile.assignedCourses.reduce((acc, c) => acc + c.studentCount, 0)
  }, [profile.assignedCourses])

  return (
    <>
      <ProfileHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
        onOpenAiModal={onOpenAiModal}
        onSwitchToSettings={onSwitchToSettings}
      />

      {/* Top View Mode Navigation Pill Switcher */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-150 flex-wrap gap-2">
        <div className="inline-flex items-center p-1 bg-gray-100/90 rounded-full border border-gray-200 shadow-2xs">
          <div className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-purple-900 shadow-xs flex items-center gap-1.5">
            <Icon name="users" size={13} />
            <span>My Profile</span>
          </div>
          {onSwitchToSettings && (
            <button
              type="button"
              onClick={onSwitchToSettings}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icon name="settings" size={13} />
              <span>Account Settings</span>
            </button>
          )}
        </div>

        <div className="text-xs text-zinc-500 flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Verified Faculty Profile · Quantum School of AI</span>
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

      {/* Main 2-Column Profile Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pb-8">
        {/* LEFT COLUMN: Identity Card & Summary Metrics */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Identity Card */}
          <div className="panel p-5 bg-white text-center flex flex-col items-center relative overflow-hidden border border-gray-150 shadow-xs">
            {/* Top Accent Gradient Header */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800" />

            {/* Profile Avatar with Edit Overlay */}
            <div className="relative mt-5 mb-3">
              <div className="w-24 h-24 rounded-full p-1 bg-white shadow-md relative z-10 border-2 border-purple-200">
                <img
                  src={isEditing ? editForm.avatar : profile.avatar}
                  alt={isEditing ? editForm.fullName : profile.fullName}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = "/assets/student-1.png"
                  }}
                />
              </div>

              {isEditing && (
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="absolute bottom-1 right-1 z-20 w-8 h-8 rounded-full bg-purple-700 text-white shadow-md flex items-center justify-center hover:bg-purple-800 transition-colors cursor-pointer"
                  title="Change profile avatar"
                >
                  <Icon name="sparkles" size={14} />
                </button>
              )}
            </div>

            {/* Avatar Selector Dropdown / Popover (Only in Edit Mode) */}
            {isEditing && showAvatarPicker && (
              <div className="w-full p-3.5 mb-3 bg-purple-50/70 rounded-2xl border border-purple-200 text-left animate-in fade-in duration-150">
                <p className="text-[11px] font-bold text-purple-900 mb-2">Select Avatar Preset:</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av.url}
                      type="button"
                      onClick={() => handleSelectPresetAvatar(av.url)}
                      className={`p-1 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        editForm.avatar === av.url
                          ? "border-purple-600 bg-purple-100 ring-2 ring-purple-400"
                          : "border-gray-200 bg-white hover:border-purple-300"
                      }`}
                    >
                      <img src={av.url} alt={av.label} className="w-8 h-8 rounded-full object-cover" />
                      <span className="text-[9px] font-medium text-zinc-600 truncate max-w-full">
                        {av.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customAvatarInput}
                    onChange={(e) => setCustomAvatarInput(e.target.value)}
                    placeholder="Or paste custom image URL..."
                    className="flex-1 h-8 px-2.5 rounded-lg border border-gray-200 text-xs bg-white text-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomAvatar}
                    className="px-2.5 h-8 rounded-lg bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Name & Designation */}
            <h3 className="text-lg font-bold text-zinc-900 leading-tight">
              {isEditing ? editForm.fullName : profile.fullName}
            </h3>
            <p className="text-xs font-semibold text-purple-700 mt-1">
              {profile.designation}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {profile.department}
            </p>

            {/* Badges Bar */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap mt-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                Staff ID: {profile.staffId}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Verified Active
              </span>
            </div>

            {/* Edit Profile Action Button (When not in edit mode) */}
            {!isEditing ? (
              <button
                type="button"
                onClick={handleStartEditing}
                className="mt-5 w-full h-10 rounded-xl bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-purple-800 transition-colors cursor-pointer shadow-xs"
              >
                <span>✏️</span>
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full mt-5">
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="flex-1 h-10 rounded-xl border border-gray-200 bg-white text-zinc-700 text-xs font-bold hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveProfile()}
                  className="flex-1 h-10 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 cursor-pointer shadow-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {/* Quick Stats Card */}
          <div className="panel p-4 bg-white border border-gray-150 shadow-xs">
            <h4 className="text-xs font-bold text-zinc-900 mb-3 flex items-center gap-2">
              <span className="text-purple-600 flex items-center">
                <Icon name="activity" size={14} />
              </span>
              <span>Teaching Engagement Overview</span>
            </h4>
            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100">
                <span className="text-lg font-extrabold text-purple-950 block leading-none">
                  {profile.assignedClasses.length}
                </span>
                <span className="text-[10px] font-semibold text-purple-700 mt-1 block">
                  Assigned Classes
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-lime-50/70 border border-lime-200">
                <span className="text-lg font-extrabold text-lime-950 block leading-none">
                  {profile.assignedCourses.length}
                </span>
                <span className="text-[10px] font-semibold text-lime-800 mt-1 block">
                  Active Courses
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200">
                <span className="text-lg font-extrabold text-blue-950 block leading-none">
                  {totalAssignedStudents}
                </span>
                <span className="text-[10px] font-semibold text-blue-700 mt-1 block">
                  Assigned Students
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                <span className="text-lg font-extrabold text-amber-950 block leading-none">
                  98.4%
                </span>
                <span className="text-[10px] font-semibold text-amber-800 mt-1 block">
                  Evaluation Score
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Term:</span>
              <span className="font-semibold text-zinc-800">{profile.academicTerm}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Profile Form & Institutional Details */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Section 1: Editable Personal & Contact Info */}
          <div className="panel p-5 bg-white border border-gray-150 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <span className="text-purple-600 flex items-center">
                    <Icon name="users" size={15} />
                  </span>
                  <span>Personal &amp; Contact Details</span>
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Information displayed on your faculty profile and course syllabi
                </p>
              </div>

              {isEditing ? (
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                  Editing Mode Active
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                >
                  <span>Edit</span>
                  <span>→</span>
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      placeholder="e.g. Srimanth"
                      className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                        formErrors.fullName ? "border-rose-400 bg-rose-50/30" : "border-gray-200"
                      }`}
                    />
                    {formErrors.fullName && (
                      <p className="text-[10px] text-rose-600 font-semibold mt-1">
                        {formErrors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="+1 (555) 234-5678"
                      className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                        formErrors.phone ? "border-rose-400 bg-rose-50/30" : "border-gray-200"
                      }`}
                    />
                    {formErrors.phone && (
                      <p className="text-[10px] text-rose-600 font-semibold mt-1">
                        {formErrors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Office Hours */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                    Office Hours &amp; Location
                  </label>
                  <input
                    type="text"
                    value={editForm.officeHours}
                    onChange={(e) => setEditForm({ ...editForm, officeHours: e.target.value })}
                    placeholder="e.g. Mon – Thu, 3:30 PM - 5:00 PM (Room 402B)"
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Displayed to enrolled students and parents for one-on-one appointments.
                  </p>
                </div>

                {/* Educator Bio */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block">
                      Educator Biography <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-semibold ${
                        editForm.bio.length > 500 ? "text-rose-600" : "text-zinc-400"
                      }`}
                    >
                      {editForm.bio.length}/500 chars
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Write a brief educator summary regarding your teaching pedagogy, expertise, and STEM background..."
                    className={`w-full p-3 rounded-xl border text-xs font-medium text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 leading-relaxed resize-y ${
                      formErrors.bio ? "border-rose-400 bg-rose-50/30" : "border-gray-200"
                    }`}
                  />
                  {formErrors.bio && (
                    <p className="text-[10px] text-rose-600 font-semibold mt-1">
                      {formErrors.bio}
                    </p>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-zinc-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-6 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <span>✓</span>
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-150">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
                      Full Name
                    </span>
                    <span className="text-xs font-bold text-zinc-900 block">
                      {profile.fullName}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-150">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
                      Phone Number
                    </span>
                    <span className="text-xs font-bold text-zinc-900 block">
                      {profile.phone}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-150">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
                    Office Hours &amp; Location
                  </span>
                  <span className="text-xs font-semibold text-zinc-800 block">
                    {profile.officeHours}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-150">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    Educator Biography
                  </span>
                  <p className="text-xs text-zinc-700 leading-relaxed font-normal">
                    {profile.bio}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Administrator-Assigned Information (Strictly Read-Only) */}
          <div className="panel p-5 bg-white border border-gray-150 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <span className="text-purple-600 flex items-center">
                    <Icon name="check" size={15} />
                  </span>
                  <span>Administrator-Assigned Academic Information</span>
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Institutional assignments managed centrally by the Academic Affairs &amp; Super Admin
                </p>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-bold flex items-center gap-1 border border-zinc-200">
                <span>🔒</span>
                <span>Read-Only</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Institutional Email */}
              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-150">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900">
                    Institutional Email
                  </span>
                  <span className="text-[10px] text-purple-700 font-semibold">🔒 SSO Verified</span>
                </div>
                <span className="text-xs font-bold text-zinc-900 block truncate">
                  {profile.email}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  Managed via Google Workspace directory
                </span>
              </div>

              {/* Department */}
              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-150">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900">
                    Department
                  </span>
                  <span className="text-[10px] text-purple-700 font-semibold">🔒 Academic Board</span>
                </div>
                <span className="text-xs font-bold text-zinc-900 block truncate">
                  {profile.department}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  Faculty Division of STEM Sciences
                </span>
              </div>

              {/* Designation */}
              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-150">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900">
                    Academic Designation
                  </span>
                  <span className="text-[10px] text-purple-700 font-semibold">🔒 Human Resources</span>
                </div>
                <span className="text-xs font-bold text-zinc-900 block truncate">
                  {profile.designation}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  Tenure Track Faculty Appointment
                </span>
              </div>

              {/* Staff ID */}
              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-150">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900">
                    Faculty Staff ID
                  </span>
                  <span className="text-[10px] text-purple-700 font-semibold">🔒 System Registry</span>
                </div>
                <span className="text-xs font-bold text-zinc-900 block truncate">
                  {profile.staffId}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  National AI Faculty ID Database
                </span>
              </div>
            </div>

            {/* Assigned Classes */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-zinc-800">
                  Assigned Classes ({profile.assignedClasses.length})
                </h5>
                <span className="text-[10px] font-semibold text-zinc-400">
                  Read-Only Class Rosters
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.assignedClasses.map((cls) => (
                  <div
                    key={cls}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold flex items-center gap-2"
                  >
                    <span>🏫</span>
                    <span>{cls}</span>
                    <span className="text-[10px] text-purple-600 font-normal">🔒 Locked</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned Courses Table */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-zinc-800">
                  Assigned Courses &amp; Modules ({profile.assignedCourses.length})
                </h5>
                <span className="text-[10px] font-semibold text-zinc-400">
                  Admin Curriculum Allocation
                </span>
              </div>
              <div className="space-y-2">
                {profile.assignedCourses.map((crs) => (
                  <div
                    key={crs.id}
                    className="p-2.5 rounded-xl bg-gray-50 border border-gray-150 flex items-center justify-between flex-wrap gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">
                        {crs.code}
                      </span>
                      <span className="text-xs font-bold text-zinc-900">{crs.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                      <span>👥 {crs.studentCount} Students</span>
                      <span className="text-purple-700 font-semibold">Active Syllabus</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
