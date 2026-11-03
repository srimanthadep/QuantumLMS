import { Suspense, useState, useMemo } from "react"
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import AppShell from "@/components/shell/AppShell"
import PageTransition from "@/components/motion/PageTransition"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import type { CurrentUser } from "@/types"
import type { NotificationSource, ShellNotification } from "@/components/shell/NotificationsMenu"
import { useSuperAdminStore } from "@/data/adminStore"

import PlatformHealthView from "./views/PlatformHealthView"
import TenantsView from "./views/TenantsView"
import RbacView from "./views/RbacView"
import AuditLogsView from "./views/AuditLogsView"
import AiUsageView from "./views/AiUsageView"
import RevenueView from "./views/RevenueView"
import SuperAdminSettingsView from "./views/SuperAdminSettingsView"

interface SuperAdminPortalProps {
  currentUser?: CurrentUser
  onToast: (msg: string) => void
}

const NAV_PATHS: Record<string, string> = {
  health: "/super-admin/health",
  tenants: "/super-admin/tenants",
  access: "/super-admin/access",
  audit: "/super-admin/audit",
  ai: "/super-admin/ai",
  revenue: "/super-admin/revenue",
  settings: "/super-admin/settings",
}

function navIdFor(pathname: string): string {
  const segment = pathname.replace(/^\/super-admin\/?/, "").split("/")[0]
  return segment in NAV_PATHS ? segment : "health"
}

function PageFallback() {
  return (
    <div className="mt-2 space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <SkeletonText lines={6} />
    </div>
  )
}

function useSuperAdminNotifications(auditLogs: any[]): NotificationSource {
  const [read, setRead] = useState<Set<string>>(new Set())

  const entries = useMemo(() => {
    const out: (ShellNotification & { to: string })[] = []

    const recentWarning = auditLogs.find((l) => l.status === "Warning" || l.status === "Refused")
    if (recentWarning) {
      out.push({
        id: `audit-${recentWarning.id}`,
        title: `Security Event: ${recentWarning.action}`,
        message: `${recentWarning.target} from ${recentWarning.ip}`,
        timestamp: recentWarning.timestamp.split(" ")[1] || "Today",
        read: read.has(`audit-${recentWarning.id}`),
        kind: "assessment",
        to: "/super-admin/audit",
      })
    }

    return out
  }, [auditLogs, read])

  return {
    items: entries,
    onSelect: (n) => setRead((prev) => new Set([...prev, n.id])),
    onMarkAllRead: () => setRead(new Set(entries.map((e) => e.id))),
  }
}

export default function SuperAdminPortal({
  currentUser,
  onToast,
}: SuperAdminPortalProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const activeId = navIdFor(location.pathname)

  const store = useSuperAdminStore()
  const notifications = useSuperAdminNotifications(store.auditLogs)

  const handleNavigate = (id: string) => {
    navigate(NAV_PATHS[id] ?? "/super-admin/health")
  }

  return (
    <AppShell
      role="Super Admin"
      activeId={activeId}
      onNavigate={handleNavigate}
      notifications={notifications}
    >
      <PageTransition>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route
              path="/"
              element={<PlatformHealthView store={store} onToast={onToast} />}
            />
            <Route
              path="/health"
              element={<PlatformHealthView store={store} onToast={onToast} />}
            />
            <Route
              path="/tenants"
              element={<TenantsView store={store} />}
            />
            <Route
              path="/access"
              element={<RbacView store={store} onToast={onToast} />}
            />
            <Route
              path="/audit"
              element={<AuditLogsView store={store} />}
            />
            <Route
              path="/ai"
              element={<AiUsageView store={store} onToast={onToast} />}
            />
            <Route
              path="/revenue"
              element={<RevenueView store={store} />}
            />
            <Route
              path="/settings"
              element={<SuperAdminSettingsView store={store} onToast={onToast} />}
            />
            <Route path="*" element={<Navigate to="/super-admin/health" replace />} />
          </Routes>
        </Suspense>
      </PageTransition>
    </AppShell>
  )
}
