import { useState } from "react"
import { Icon } from "../../components/Icon"
import { HexColorField } from "../../components/HexColorField"
import { demoAccounts } from "../../data/adminMockData"
import type { UserRole } from "../../types"

interface AuthPageProps {
  onLogin: (user: {
    name: string
    role: UserRole
    email: string
    avatar?: string
    title?: string
  }) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
}

export default function AuthPage({
  onLogin,
  hexColor,
  onChangeHexColor,
}: AuthPageProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [role, setRole] = useState<UserRole>("Teacher")
  const [email, setEmail] = useState("srimanth@quantum-lms.edu")
  const [password, setPassword] = useState("quantum2026")
  const [fullName, setFullName] = useState("Srimanth")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole)
    const account = demoAccounts.find((d) => d.role === selectedRole)
    if (account) {
      setEmail(account.email)
      setPassword(account.password)
      setFullName(account.name)
    }
  }

  const handleQuickLaunch = (targetRole: UserRole) => {
    setIsLoading(true)
    const account = demoAccounts.find((d) => d.role === targetRole)
    if (account) {
      setEmail(account.email)
      setPassword(account.password)
      setRole(targetRole)
      setFullName(account.name)
      setTimeout(() => {
        setIsLoading(false)
        onLogin({
          name: account.name,
          role: account.role,
          email: account.email,
          avatar: account.avatar,
          title: account.title,
        })
      }, 350)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const account = demoAccounts.find((d) => d.role === role)
    setTimeout(() => {
      setIsLoading(false)
      onLogin({
        name: mode === "signin" ? (account?.name || fullName || role) : (fullName || "User"),
        role,
        email,
        avatar: account?.avatar,
        title: account?.title,
      })
    }, 400)
  }

  const handleForgotPassword = () => {
    setInfoMessage("A password reset link has been dispatched to your email address.")
    setTimeout(() => setInfoMessage(null), 4000)
  }

  return (
    <div className="auth-viewport">
      <div className="auth-container">
        {/* Top brand header with Hex Color Customizer */}
        <header className="auth-top-nav">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Quantum School of AI"
              className="h-9 w-auto object-contain drop-shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <HexColorField
              hexColor={hexColor}
              onChangeHex={onChangeHexColor}
            />
          </div>
        </header>

        {/* Main Double Card Container */}
        <div className="auth-main-card">
          {/* Left Side: Dynamic Educational Showcase */}
          <div className="auth-showcase">
            <div>
              {/* Dynamic Hero Banner based on Active Role */}
              {role === "Super Admin" ? (
                <div className="auth-lime-card !bg-linear-to-br !from-red-500 !to-rose-600 text-white">
                  <div className="auth-showcase-badge !bg-black/25 !text-white !border-white/20">
                    <span>⚡</span>
                    <span>Root Master Sovereignty</span>
                  </div>
                  <h1 className="auth-lime-heading !text-white">
                    Multi-Campus Cloud Architecture & AI Governance
                  </h1>
                  <p className="auth-lime-sub !text-white/90">
                    Orchestrate neural inference clusters, multi-tenant databases, RBAC permission matrices & cryptographic audit logs.
                  </p>

                  <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-semibold">
                    <span>99.98% Cloud SLA</span>
                    <span>3 Campus Clusters</span>
                    <span>1.42M AI Tokens/Day</span>
                  </div>
                </div>
              ) : role === "Admin" ? (
                <div className="auth-lime-card !bg-linear-to-br !from-purple-600 !to-indigo-700 text-white">
                  <div className="auth-showcase-badge !bg-black/25 !text-white !border-white/20">
                    <span>🏫</span>
                    <span>Campus Executive Oversight</span>
                  </div>
                  <h1 className="auth-lime-heading !text-white">
                    Comprehensive School Operations & Faculty Leadership
                  </h1>
                  <p className="auth-lime-sub !text-white/90">
                    Lead 28 verified educators, 480 enrolled students, class scheduling, and statutory accreditation reporting.
                  </p>

                  <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-semibold">
                    <span>480 Enrolled</span>
                    <span>97.2% Attendance</span>
                    <span>28 Verified Faculty</span>
                  </div>
                </div>
              ) : role === "Student" ? (
                <div className="auth-lime-card !bg-linear-to-br !from-blue-500 !to-cyan-600 text-white">
                  <div className="auth-showcase-badge !bg-black/25 !text-white !border-white/20">
                    <span>🎒</span>
                    <span>Interactive Student Suite</span>
                  </div>
                  <h1 className="auth-lime-heading !text-white">
                    Learn at Your Pace with Adaptive Quantum AI
                  </h1>
                  <p className="auth-lime-sub !text-white/90">
                    Daily quests, real-time diagnostic challenges, AI tutor assistance, and exciting XP rank milestones.
                  </p>

                  <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-semibold">
                    <span>1,420 XP</span>
                    <span>94% Avg Mastery</span>
                    <span>Top 5% Class Rank</span>
                  </div>
                </div>
              ) : role === "Support" ? (
                <div className="auth-lime-card !bg-linear-to-br !from-cyan-600 !to-teal-700 text-white">
                  <div className="auth-showcase-badge !bg-black/25 !text-white !border-white/20">
                    <span>🎧</span>
                    <span>Support & Resolution Suite</span>
                  </div>
                  <h1 className="auth-lime-heading !text-white">
                    Omnichannel Helpdesk, Live Chat & Student 360
                  </h1>
                  <p className="auth-lime-sub !text-white/90">
                    Real-time ticket routing, SLA alerts, student telemetry, and multi-agent coordination.
                  </p>
                  <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-semibold">
                    <span>⚡ 98.7% SLA Met</span>
                    <span>⏱ 2.4m Avg Response</span>
                    <span>⭐ 4.9/5 CSAT</span>
                  </div>
                </div>
              ) : (
                /* Teacher Default Banner */
                <div className="auth-lime-card">
                  <div className="auth-showcase-badge">
                    <span>✦</span>
                    <span>AI Learning Suite</span>
                  </div>
                  <h1 className="auth-lime-heading">
                    Next-Gen Intelligence for Teachers & Classrooms
                  </h1>
                  <p className="auth-lime-sub">
                    Real-time diagnostics, adaptive lesson paths, and transparent parental engagement.
                  </p>

                  {/* Overlapping student avatar previews */}
                  <div>
                    <div className="text-[10px] font-bold text-black/70 uppercase tracking-wider mb-1">
                      Year 4 · 24 Active Students
                    </div>
                    <div className="auth-avatar-row">
                      <img src="/assets/student-1.png" alt="Student" className="auth-avatar-item" />
                      <img src="/assets/student-2.png" alt="Student" className="auth-avatar-item" />
                      <img src="/assets/student-3.png" alt="Student" className="auth-avatar-item" />
                      <img src="/assets/student-4.png" alt="Student" className="auth-avatar-item" />
                      <img src="/assets/student-5.png" alt="Student" className="auth-avatar-item" />
                      <span className="auth-avatar-count">+19</span>
                    </div>
                  </div>

                  {/* Playful Hand Art */}
                  <img
                    src="/assets/hand.png"
                    alt="Interactive Learning Hand"
                    className="auth-hand-art"
                  />
                </div>
              )}

              {/* Quick Platform Metrics */}
              <div className="auth-stats-row mt-4">
                <div className="auth-stat-card">
                  <span className="auth-stat-value">98.4%</span>
                  <span className="auth-stat-label">Parent Engagement</span>
                </div>
                <div className="auth-stat-card">
                  <span className="auth-stat-value">76%</span>
                  <span className="auth-stat-label">Class Mastery</span>
                </div>
                <div className="auth-stat-card">
                  <span className="auth-stat-value">1.4h</span>
                  <span className="auth-stat-label">Saved Daily / Teacher</span>
                </div>
              </div>
            </div>

            {/* Profile Card according to selected role */}
            <div className="auth-teacher-card">
              <img
                src={
                  role === "Super Admin"
                    ? "/assets/srimanth.png"
                    : role === "Admin"
                    ? "/assets/student-1.png"
                    : role === "Student"
                    ? "/assets/student-2.png"
                    : role === "Support"
                    ? "/assets/student-3.png"
                    : "/assets/srimanth.png"
                }
                alt="Account User"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <strong className="text-xs font-bold text-zinc-900">
                    {role === "Super Admin"
                      ? "Dr. Katherine Vance"
                      : role === "Admin"
                      ? "Marcus Sterling"
                      : role === "Student"
                      ? "Leo Thompson"
                      : role === "Support"
                      ? "Alex Rivera"
                      : "Srimanth"}
                  </strong>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      role === "Super Admin"
                        ? "bg-red-500"
                        : role === "Support"
                        ? "bg-cyan-500"
                        : "bg-emerald-500"
                    }`}
                  />
                </div>
                <span className="text-[11px] text-zinc-500 font-medium block">
                  {role === "Super Admin"
                    ? "Chief System Director & Super Admin"
                    : role === "Admin"
                    ? "Principal & Academic Operations Director"
                    : role === "Student"
                    ? "Year 4 Student · Maple Class"
                    : "Lead Educator · Year 4 Maple Class"}
                </span>
                <span
                  className={`text-[10px] font-semibold block mt-0.5 ${
                    role === "Super Admin"
                      ? "text-red-700"
                      : role === "Admin"
                      ? "text-purple-700"
                      : "text-emerald-700"
                  }`}
                >
                  {role === "Super Admin"
                    ? "🔒 Root Master Key Verified"
                    : "Active Verified Session"}
                </span>
              </div>
            </div>

            {/* Feature Bullets */}
            <div className="auth-feature-bullets">
              <div className="auth-bullet-item">
                <span className="auth-bullet-icon">✦</span>
                <span>
                  {role === "Super Admin"
                    ? "256-bit zero-trust tenant encryption across all campus nodes"
                    : role === "Admin"
                    ? "Automated faculty class scheduling & teacher workload balancing"
                    : "Automatic AI parent digests generated from weekly tasks"}
                </span>
              </div>
              <div className="auth-bullet-item">
                <span className="auth-bullet-icon">⚡</span>
                <span>
                  {role === "Super Admin"
                    ? "Live AI model inference tracking & rate limit controls"
                    : role === "Admin"
                    ? "School-wide attendance registers & statutory accreditation PDF"
                    : "Instant diagnostic grading with personalized skill interventions"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Authentication Form */}
          <div className="auth-form-card">
            {/* Tab Switcher: Sign In vs Create Account */}
            <div className="auth-tab-switch">
              <button
                type="button"
                className={`auth-tab-btn ${mode === "signin" ? "active" : ""}`}
                onClick={() => setMode("signin")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${mode === "signup" ? "active" : ""}`}
                onClick={() => setMode("signup")}
              >
                Create Account
              </button>
            </div>

            {/* 1-Click Fast Demo Launcher Cards */}
            <div className="mb-4">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>⚡ 1-Click Instant Demo Logins</span>
                <span className="text-purple-600 font-extrabold text-[9px] uppercase">
                  Direct Access
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickLaunch(acc.role)}
                    disabled={isLoading}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      role === acc.role
                        ? "bg-purple-50/80 border-purple-300 shadow-xs"
                        : "bg-zinc-50/70 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-zinc-900 flex items-center gap-1">
                        <span>
                          {acc.role === "Super Admin"
                            ? "⚡"
                            : acc.role === "Admin"
                            ? "🏫"
                            : acc.role === "Teacher"
                            ? "🎓"
                            : "🎒"}
                        </span>
                        <span>{acc.role}</span>
                      </span>
                      <span
                        className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded"
                        style={{
                          backgroundColor: `${acc.accentColor}18`,
                          color: acc.accentColor,
                        }}
                      >
                        {acc.badge}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate mt-1">
                      {acc.name}
                    </div>
                    <div className="text-[9px] font-mono text-purple-700 font-bold mt-1">
                      Launch 1-Click →
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Role Chips */}
            <div className="mb-3">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Or Select Your Role
              </div>
              <div className="grid grid-cols-5 gap-1">
                <button
                  type="button"
                  className={`role-chip ${role === "Super Admin" ? "active !bg-red-50 !border-red-400 !text-red-700" : ""}`}
                  onClick={() => handleRoleSelect("Super Admin")}
                  title="Chief System Director / Super Admin"
                >
                  <span>⚡</span>
                  <span className="truncate">Super</span>
                </button>
                <button
                  type="button"
                  className={`role-chip ${role === "Admin" ? "active !bg-purple-50 !border-purple-400 !text-purple-800" : ""}`}
                  onClick={() => handleRoleSelect("Admin")}
                  title="School Principal / Academic Operations Admin"
                >
                  <span>🏫</span>
                  <span className="truncate">Admin</span>
                </button>
                <button
                  type="button"
                  className={`role-chip ${role === "Teacher" ? "active" : ""}`}
                  onClick={() => handleRoleSelect("Teacher")}
                  title="Educator & Classroom Teacher"
                >
                  <span>🎓</span>
                  <span className="truncate">Teacher</span>
                </button>
                <button
                  type="button"
                  className={`role-chip ${role === "Student" ? "active" : ""}`}
                  onClick={() => handleRoleSelect("Student")}
                  title="Student Portal"
                >
                  <span>🎒</span>
                  <span className="truncate">Student</span>
                </button>
                <button
                  type="button"
                  className={`role-chip ${role === "Support" ? "active !bg-cyan-50 !border-cyan-400 !text-cyan-800" : ""}`}
                  onClick={() => handleRoleSelect("Support")}
                  title="Omnichannel Support Desk & Ticketing"
                >
                  <span>🎧</span>
                  <span className="truncate">Support</span>
                </button>
              </div>
            </div>

            {infoMessage && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs font-semibold flex items-center gap-2">
                <Icon name="check" size={14} />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit}>
              {mode === "signup" && (
                <div className="auth-input-group">
                  <label className="auth-label">Full Name</label>
                  <div className="auth-input-wrapper">
                    <Icon name="users" size={16} />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Marcus Sterling"
                    />
                  </div>
                </div>
              )}

              <div className="auth-input-group">
                <label className="auth-label">Email or School ID</label>
                <div className="auth-input-wrapper">
                  <Icon name="mail" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@quantum-lms.edu"
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <div className="flex items-center justify-between">
                  <label className="auth-label">Password</label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="auth-input-wrapper">
                  <Icon name="settings" size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-zinc-400 hover:text-zinc-700 font-bold px-1"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-600 font-medium">
                    Keep me signed in on this device
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="auth-submit-btn"
              >
                <span>
                  {isLoading
                    ? "Signing in..."
                    : mode === "signin"
                    ? `Sign In as ${role} →`
                    : `Create ${role} Account & Launch →`}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="auth-divider">
              <span>Or Continue With SSO</span>
            </div>

            {/* SSO Buttons */}
            <div className="auth-sso-grid">
              <button
                type="button"
                className="auth-sso-btn"
                onClick={() => handleQuickLaunch(role)}
              >
                <span className="text-emerald-600">📗</span>
                <span>Google Classroom</span>
              </button>
              <button
                type="button"
                className="auth-sso-btn"
                onClick={() => handleQuickLaunch(role)}
              >
                <span className="text-blue-600">🔷</span>
                <span>School SSO Identity</span>
              </button>
            </div>

            {/* Security Trust Note */}
            <div className="auth-footer-trust">
              <span>🔒 Quantum AI 256-bit Encrypted Session · Student Privacy Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
