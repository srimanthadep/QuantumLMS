import { useLocation } from "react-router-dom"

/** "/super-admin" or "/admin": the same academy pages are mounted under both portals. */
export function useAdminBase() {
  const { pathname } = useLocation()
  return pathname.startsWith("/super-admin") ? "/super-admin" : "/admin"
}
