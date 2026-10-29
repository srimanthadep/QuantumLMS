import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import type { CurrentUser, UserRole } from "@/types"
import { getDemoAccount } from "@/data/demoAccounts"

/** Home route per role. */
export const ROLE_HOME: Record<UserRole, string> = {
  "Super Admin": "/super-admin",
  Admin: "/admin",
  Teacher: "/teacher",
  Student: "/student",
  Evaluator: "/evaluator/dashboard",
  Support: "/support",
}

const KEY_AUTH = "quantum_auth_session"
const KEY_ROLE = "quantum_user_role"
const KEY_USER = "quantum_current_user"
const ROLES = Object.keys(ROLE_HOME) as UserRole[]

export interface LoginInput {
  name: string
  role: UserRole
  email: string
  avatar?: string
  title?: string
}

interface SessionValue {
  isAuthenticated: boolean
  role: UserRole
  user: CurrentUser
  login: (user: LoginInput) => void
  logout: () => void
  /** Switch to another role's demo account. Returns that role's home path. */
  switchRole: (role: UserRole) => string
  /** Clears locally stored demo data (keeps session and theme) and reloads. */
  resetDemoData: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable; session lives in memory only
  }
}

function userFromAccount(role: UserRole): CurrentUser {
  const acc = getDemoAccount(role)
  return { id: `u-${role.toLowerCase().replace(/\s+/g, "-")}`, name: acc.name, role, email: acc.email, avatar: acc.avatar, title: acc.title }
}

function loadInitial(): { isAuthenticated: boolean; user: CurrentUser } {
  const isAuthenticated = read(KEY_AUTH) === "true"
  const savedRole = read(KEY_ROLE) as UserRole | null
  const role: UserRole = savedRole && ROLES.includes(savedRole) ? savedRole : "Student"
  let user: CurrentUser | null = null
  try {
    const raw = read(KEY_USER)
    if (raw) user = JSON.parse(raw) as CurrentUser
  } catch {
    user = null
  }
  if (!user || user.role !== role) user = userFromAccount(role)
  return { isAuthenticated, user }
}

export default function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadInitial)

  const persist = (isAuthenticated: boolean, user: CurrentUser) => {
    write(KEY_AUTH, isAuthenticated ? "true" : "false")
    write(KEY_ROLE, user.role)
    write(KEY_USER, JSON.stringify(user))
  }

  const login = useCallback((input: LoginInput) => {
    const user: CurrentUser = {
      id: `u-${Date.now()}`,
      name: input.name,
      role: input.role,
      email: input.email,
      avatar: input.avatar ?? getDemoAccount(input.role).avatar,
      title: input.title ?? getDemoAccount(input.role).title,
    }
    persist(true, user)
    setState({ isAuthenticated: true, user })
  }, [])

  const logout = useCallback(() => {
    setState((s) => {
      persist(false, s.user)
      return { ...s, isAuthenticated: false }
    })
  }, [])

  const switchRole = useCallback((role: UserRole) => {
    setState((s) => {
      if (s.user.role === role && s.isAuthenticated) return s
      const user = userFromAccount(role)
      persist(true, user)
      return { isAuthenticated: true, user }
    })
    return ROLE_HOME[role]
  }, [])

  const resetDemoData = useCallback(() => {
    try {
      const keep = new Set([KEY_AUTH, KEY_ROLE, KEY_USER, "app_theme_mode", "app_theme_accent", "quantum_shell_collapsed"])
      Object.keys(localStorage)
        .filter((k) => !keep.has(k) && (k.startsWith("quantum") || k.startsWith("evaluator") || k.startsWith("support")))
        .forEach((k) => localStorage.removeItem(k))
    } catch {
      // ignore
    }
    window.location.reload()
  }, [])

  const value = useMemo<SessionValue>(
    () => ({ isAuthenticated: state.isAuthenticated, role: state.user.role, user: state.user, login, logout, switchRole, resetDemoData }),
    [state, login, logout, switchRole, resetDemoData],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>")
  return ctx
}
