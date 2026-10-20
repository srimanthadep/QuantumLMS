import { useState } from "react"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"

interface AuthPageProps {
  onLogin: (user: { name: string; role: string; email: string }) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
}

export default function AuthPage({
  onLogin,
  hexColor,
  onChangeHexColor,
}: AuthPageProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [role, setRole] = useState<"Teacher" | "Student" | "Parent" | "Admin">("Teacher")
  const [email, setEmail] = useState("srimanth@quantum-lms.edu")
  const [password, setPassword] = useState("quantum2026")
  const [fullName, setFullName] = useState("Srimanth")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      onLogin({
        name: mode === "signin" ? (role === "Teacher" ? "Srimanth" : role) : (fullName || "Educator"),
        role,
        email,
      })
    }, 400)
  }

  const handleQuickDemo = () => {
    setIsLoading(true)
    setEmail("srimanth@quantum-lms.edu")
    setPassword("quantum2026")
    setRole("Teacher")
    setTimeout(() => {
      setIsLoading(false)
      onLogin({
        name: "Srimanth",
        role: "Teacher",
        email: "srimanth@quantum-lms.edu",
      })
    }, 300)
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
          {/* Left Side: Educational Platform Showcase */}
          <div className="auth-showcase">
            <div>
              {/* Lime Hero Banner */}
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

            {/* Educator Profile Card */}
            <div className="auth-teacher-card">
              <img src="/assets/srimanth.png" alt="Srimanth" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <strong className="text-xs font-bold text-zinc-900">Srimanth</strong>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[11px] text-zinc-500 font-medium block">
                  Lead Educator · Year 4 Maple Class
                </span>
                <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">
                  Active Verified Session
                </span>
              </div>
            </div>

            {/* Feature Bullets */}
            <div className="auth-feature-bullets">
              <div className="auth-bullet-item">
                <span className="auth-bullet-icon">✦</span>
                <span>Automatic AI parent digests generated from weekly tasks</span>
              </div>
              <div className="auth-bullet-item">
                <span className="auth-bullet-icon">⚡</span>
                <span>Instant diagnostic grading with personalized skill interventions</span>
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

            {/* Role Chips */}
            <div className="mb-2">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Select Your Role
              </div>
              <div className="role-chip-group">
                <button
                  type="button"
                  className={`role-chip ${role === "Teacher" ? "active" : ""}`}
                  onClick={() => setRole("Teacher")}
                >
                  <span>🎓</span>
                  <span>Teacher</span>
                </button>
                <button
                  type="button"
                  className={`role-chip ${role === "Student" ? "active" : ""}`}
                  onClick={() => setRole("Student")}
                >
                  <span>🎒</span>
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  className={`role-chip ${role === "Parent" ? "active" : ""}`}
                  onClick={() => setRole("Parent")}
                >
                  <span>👨‍👩‍👧</span>
                  <span>Parent</span>
                </button>
                <button
                  type="button"
                  className={`role-chip ${role === "Admin" ? "active" : ""}`}
                  onClick={() => setRole("Admin")}
                >
                  <span>🏫</span>
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {/* 1-Click Fast Demo Box */}
            <div className="auth-demo-box">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                  <span>✨</span>
                  <span>Interactive Teacher Demo</span>
                </div>
                <div className="text-[10px] text-zinc-600 font-medium">
                  Instant access to Srimanth&apos;s live classroom
                </div>
              </div>
              <button
                type="button"
                className="auth-demo-btn"
                onClick={handleQuickDemo}
                disabled={isLoading}
              >
                {isLoading ? "Launching..." : "1-Click Launch →"}
              </button>
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
                      placeholder="e.g. Srimanth"
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
                <span>{isLoading ? "Signing in..." : mode === "signin" ? "Sign In to Classroom →" : "Create Account & Launch →"}</span>
              </button>
            </form>

            {/* Divider */}
            <div className="auth-divider">
              <span>Or Continue With</span>
            </div>

            {/* SSO Buttons */}
            <div className="auth-sso-grid">
              <button
                type="button"
                className="auth-sso-btn"
                onClick={handleQuickDemo}
              >
                <span className="text-emerald-600">📗</span>
                <span>Google Classroom</span>
              </button>
              <button
                type="button"
                className="auth-sso-btn"
                onClick={handleQuickDemo}
              >
                <span className="text-blue-600">🔷</span>
                <span>School SSO</span>
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
