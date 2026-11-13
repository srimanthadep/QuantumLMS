import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Layers,
  Layers3,
  LifeBuoy,
  LogOut,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from "lucide-react"
import { ROLE_HOME, useSession } from "@/app/session"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CustomSelect } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { ALL_DEMO_ACCOUNTS } from "@/data/demoAccounts"
import { setFakeAuthToken } from "@/lib/auth"
import type { UserRole } from "@/types"

const ROLES: { role: UserRole; icon: typeof Layers; description: string }[] = [
  {
    role: "Admin",
    icon: Layers,
    description: "Full academy operations: batches & cohorts, course catalog, teacher assignments, and orders.",
  },
  {
    role: "Super Admin",
    icon: ShieldCheck,
    description: "Platform owner: infrastructure telemetry, RBAC permissions, audit log, and AI safety engine.",
  },
  {
    role: "Student",
    icon: GraduationCap,
    description: "Learner portal: enrollments, video lessons, weekly rhythm, squad discussion, and grades.",
  },
  {
    role: "Teacher",
    icon: Layers3,
    description: "Instructor portal: course authoring, live classroom studio, student doubts, and submissions.",
  },
  {
    role: "Evaluator",
    icon: Sparkles,
    description: "Assessment desk: rubric evaluations, learner code review, project grading, and feedback.",
  },
  {
    role: "Support",
    icon: LifeBuoy,
    description: "Help desk: tickets, user account troubleshooting, student issues, and escalation queues.",
  },
]

export default function FakeLoginPage() {
  const session = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const redirect = params.get("redirect")

  const [customEmail, setCustomEmail] = useState("")
  const [customRole, setCustomRole] = useState<UserRole>("Admin")
  const [customName, setCustomName] = useState("")
  const [busyRole, setBusyRole] = useState<string | null>(null)

  const performFakeLogin = async (
    role: UserRole,
    email: string,
    name: string,
    avatar?: string,
  ) => {
    setBusyRole(role)
    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name.trim() || cleanEmail.split("@")[0]
      const response = await fetch("/api/auth/fake-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: cleanEmail, role, name: cleanName }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error?.message ?? "Development login is disabled or unavailable")
      const user = result.user
      setFakeAuthToken(result.token, user)
      session.login({ id: user.id, name: user.full_name, role: user.role, email: user.email, avatar: user.avatar_url ?? avatar, title: ALL_DEMO_ACCOUNTS[role]?.title })

      toast.success(`Logged in as ${cleanName} (${role})`)
      const destination =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//")
          ? redirect
          : ROLE_HOME[role]
      navigate(destination, { replace: true })
    } catch (error) {
      setFakeAuthToken(null)
      toast.error(error instanceof Error ? error.message : "Sign-in failed")
    } finally {
      setBusyRole(null)
    }
  }

  const handleQuickLogin = (role: UserRole) => {
    const acc = ALL_DEMO_ACCOUNTS[role]
    if (!acc) return
    void performFakeLogin(role, acc.email, acc.name, acc.avatar)
  }

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customEmail.trim()) return
    void performFakeLogin(customRole, customEmail, customName || customEmail.split("@")[0])
  }

  const handleSignOut = () => {
    setFakeAuthToken(null)
    session.logout()
    toast.show("Signed out of all portals.")
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background via-surface to-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-3 rounded-2xl border border-primary-border bg-surface p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <Zap className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Local development login
              </h1>
              <Badge tone="warning">Development only</Badge>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
              One-click instant authentication into any portal without passwords, OTP verification, or Cognito dependencies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
              Standard Login →
            </Button>
            {session.isAuthenticated && (
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-danger hover:bg-danger/10">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            )}
          </div>
        </div>

        {/* Current Active Session Pill (if any) */}
        {session.isAuthenticated && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/70 p-4">
            <div className="flex items-center gap-3">
              <Avatar src={session.user.avatar} name={session.user.name} size="sm" />
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span>Currently active: {session.user.name}</span>
                  <Badge tone="success" dot>
                    {session.user.role}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground">{session.user.email}</div>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => navigate(ROLE_HOME[session.user.role])}
            >
              Enter {session.user.role} Portal <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* 1-Click Role Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Select Role to Enter
            </h2>
            <span className="text-xs text-muted-foreground">Direct bypass · All permissions granted</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
            {ROLES.map(({ role, icon: Icon, description }) => {
              const account = ALL_DEMO_ACCOUNTS[role]
              const isCurrent = session.isAuthenticated && session.user.role === role
              const isBusy = busyRole === role

              return (
                <div
                  key={role}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-4 shadow-xs transition-all ${
                    isCurrent
                      ? "border-primary-border bg-primary-soft/30 ring-2 ring-primary/20"
                      : "border-border bg-surface hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={account?.avatar} name={account?.name ?? role} size="sm" />
                        <div>
                          <div className="font-semibold text-foreground">{account?.name ?? role}</div>
                          <div className="text-[11px] text-muted-foreground">{account?.email}</div>
                        </div>
                      </div>

                      <Badge tone={isCurrent ? "success" : "neutral"} size="sm">
                        {role}
                      </Badge>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/80">
                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleQuickLogin(role)}
                      className="w-full justify-between"
                      variant={isCurrent ? "secondary" : "primary"}
                    >
                      <span>{isBusy ? "Logging in..." : `Login as ${role}`}</span>
                      {isCurrent ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Custom User Login Drawer */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Custom Email & Role Login</h3>
            <p className="text-xs text-muted-foreground">
              Sign in with any custom email address and assign whichever role you want to test.
            </p>
          </div>

          <form onSubmit={handleCustomLogin} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-foreground">Email Address *</label>
              <Input
                type="email"
                required
                placeholder="your.name@company.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Target Role</label>
              <CustomSelect
                value={customRole}
                onChange={(v) => setCustomRole(v as UserRole)}
                options={ROLES.map((r) => ({ value: r.role, label: r.role }))}
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={!customEmail.trim() || !!busyRole} className="w-full">
                <User className="h-3.5 w-3.5" />
                Instant Login
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

