import { useEffect, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import type { UserRole } from "@/types"
import { useSession } from "./session"
import RouteFallback from "./RouteFallback"

/**
 * Guards a portal route. Signed-out visitors go to /auth?redirect=<path>.
 * A signed-in user of another role is switched to this route's role, so demo
 * links like /teacher or /admin always open the matching portal.
 */
export default function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { isAuthenticated, role: current, switchRole } = useSession()
  const location = useLocation()
  const mismatch = isAuthenticated && current !== role

  useEffect(() => {
    if (mismatch) switchRole(role)
  }, [mismatch, role, switchRole])

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth?redirect=${redirect}`} replace />
  }
  if (mismatch) return <RouteFallback />
  return <>{children}</>
}
