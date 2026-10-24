import { useState } from "react"
import { Icon } from "../../components/Icon"
import type { StudentNavPage } from "./studentTypes"
import { studentProfileData, assignedMentorData } from "./studentMockData"

interface StudentProfilePageProps {
  onToast: (msg: string) => void
  onNavigate: (page: StudentNavPage) => void
  onLogout: () => void
}

export function StudentProfilePage({
  onToast,
  onNavigate,
  onLogout,
}: StudentProfilePageProps) {
  // Editable personal info state
  const [fullName, setFullName] = useState(studentProfileData.fullName)
  const [email, setEmail] = useState(studentProfileData.email)
  const [phone, setPhone] = useState(studentProfileData.phone)
  const [campusAddress, setCampusAddress] = useState(
    studentProfileData.campusAddress,
  )
  const [emergencyContact, setEmergencyContact] = useState(
    studentProfileData.emergencyContact,
  )
  const [avatar, setAvatar] = useState(studentProfileData.avatar)
  const [isEditingAvatar, setIsEditingAvatar] = useState(false)

  const [profileError, setProfileError] = useState<string | null>(null)

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
    onToast("Student profile information updated and saved successfully! ✅")
  }

  const handleAvatarChange = (newSrc: string) => {
    setAvatar(newSrc)
    setIsEditingAvatar(false)
    onToast("Profile photo updated!")
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Hero Identity Banner */}
      <section
        className="panel p-6 bg-white border border-zinc-100 shadow-sm"
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
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                  {studentProfileData.rollNumber}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  Active Enrolled
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                  Dean's Honor List
                </span>
              </div>

              <p className="text-xs font-semibold text-zinc-700 mb-2">
                {studentProfileData.program} · {studentProfileData.batch}
              </p>

              <div className="flex flex-wrap items-center justify-start gap-4 text-xs text-zinc-500 font-medium">
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
                  <button
                    onClick={() => onNavigate("Mentor Details")}
                    className="text-purple-700 font-bold hover:underline cursor-pointer"
                  >
                    {studentProfileData.advisor}
                  </button>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("Settings")}
              className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Icon name="settings" size={13} />
              <span>Go to Settings</span>
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

      {/* 2. Assigned Faculty Mentor Card with Direct Link */}
      <section
        className="p-5 bg-gradient-to-r from-purple-50 via-white to-purple-50/50 rounded-2xl border border-purple-200 shadow-sm"
        aria-label="Assigned Faculty Advisor Card"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <img
              src={assignedMentorData.avatar}
              alt={assignedMentorData.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-300 shadow-sm"
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
                onToast("Opening Mentor Details...")
                onNavigate("Mentor Details")
              }}
              className="px-4 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Icon name="users" size={13} />
              <span>View Mentor & 1:1 Meeting →</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Academic Transcript Summary & Download */}
      <section
        className="panel p-6 bg-white border border-zinc-100 shadow-sm"
        aria-label="Academic Records"
      >
        <div className="card-header mb-4">
          <div>
            <h3 className="card-title text-sm">
              Academic Standing & Credits Audit
            </h3>
            <span className="text-[11px] text-zinc-500">
              Official student record verified by School of AI Registrar
            </span>
          </div>
          <button
            onClick={() =>
              onToast(
                "Downloading official signed academic transcript (.pdf)...",
              )
            }
            className="px-4 py-1.5 rounded-full bg-purple-700 text-white font-bold text-xs hover:bg-purple-800 cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Icon name="document" size={13} />
            <span>Download Official Transcript (PDF)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
            <span className="text-[10px] text-zinc-400 font-bold block uppercase">
              Degree Program
            </span>
            <strong className="text-zinc-900 text-sm block mt-0.5">
              {studentProfileData.program}
            </strong>
            <span className="text-zinc-500 text-[11px]">
              Concentration: Autonomous Multi-Agent Systems
            </span>
          </div>

          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
            <span className="text-[10px] text-zinc-400 font-bold block uppercase">
              Academic Department
            </span>
            <strong className="text-zinc-900 text-sm block mt-0.5">
              {studentProfileData.department}
            </strong>
            <span className="text-zinc-500 text-[11px]">
              Maple Hall Campus · Maple Cohort
            </span>
          </div>

          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
            <span className="text-[10px] text-zinc-400 font-bold block uppercase">
              Completed Credits
            </span>
            <strong className="text-zinc-900 text-sm block mt-0.5">
              {studentProfileData.creditsCompleted} of{" "}
              {studentProfileData.totalCredits} Credits
            </strong>
            <span className="text-emerald-700 font-semibold text-[11px]">
              70% toward graduation · On Track
            </span>
          </div>

          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
            <span className="text-[10px] text-zinc-400 font-bold block uppercase">
              Expected Graduation
            </span>
            <strong className="text-zinc-900 text-sm block mt-0.5">
              June 2027
            </strong>
            <span className="text-purple-700 font-semibold text-[11px]">
              Class of 2027 Honors Candidate
            </span>
          </div>
        </div>
      </section>

      {/* 4. Edit Personal & Contact Information Form */}
      <section
        className="panel p-6 bg-white border border-zinc-100 shadow-sm"
        aria-label="Edit Profile Details"
      >
        <div className="card-header mb-4 pb-2 border-b border-zinc-100">
          <div>
            <h3 className="card-title text-sm">
              Personal & Contact Information
            </h3>
            <span className="text-[11px] text-zinc-500">
              Keep your student directory contact information current
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSaveProfile}
          className="flex flex-col gap-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-zinc-700 block mb-1">
                Full Legal Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">
                University Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">
                Primary Mobile Number
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">
                Emergency Contact / Guardian
              </label>
              <input
                type="text"
                required
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-zinc-700 block mb-1">
              Campus Residential / Mailing Address
            </label>
            <input
              type="text"
              required
              value={campusAddress}
              onChange={(e) => setCampusAddress(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
            />
          </div>

          {profileError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              ⚠️ {profileError}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-zinc-100">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-purple-700 text-white font-bold hover:bg-purple-800 transition-colors cursor-pointer shadow-sm"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
