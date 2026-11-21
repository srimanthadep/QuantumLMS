import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import type { UserRole } from "@/types"
import { ROLE_HOME, useSession } from "./session"

/**
 * Guards a portal route. Signed-out visitors go to /auth?redirect=<path>.
 * A signed-in user of another role returns to their own portal.
 * Super Admin retains full authority across both Admin and Super Admin scopes.
 */
export default function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { isAuthenticated, role: current } = useSession()
  const location = useLocation()
  const isSuperAdminAccessingAdmin = current === "Super Admin" && role === "Admin"
  const mismatch = isAuthenticated && current !== role && !isSuperAdminAccessingAdmin

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth?redirect=${redirect}`} replace />
  }
  if (mismatch) return <Navigate to={ROLE_HOME[current]} replace />
  return <>{children}</>
}
