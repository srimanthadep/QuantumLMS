import { Suspense, useState, useMemo, useEffect } from "react"
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import AppShell from "@/components/shell/AppShell"
import PageTransition from "@/components/motion/PageTransition"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import type { CurrentUser } from "@/types"
import type { NotificationSource, ShellNotification } from "@/components/shell/NotificationsMenu"
import { useAdminStore, useSuperAdminStore } from "@/data/adminStore"
import {
  AddTeacherModal,
  CreateBatchModal,
  ManualEnrolModal,
} from "@/components/AdminModals"

// Super Admin platform console views
import PlatformHealthView from "./views/PlatformHealthView"
import TenantsView from "./views/TenantsView"
import RbacView from "./views/RbacView"
import AuditLogsView from "./views/AuditLogsView"
import AiUsageView from "./views/AiUsageView"
import RevenueView from "./views/RevenueView"
import SuperAdminSettingsView from "./views/SuperAdminSettingsView"

// Academy admin views (Super Admin has complete edit & delete authority)
import OverviewView from "../admin/views/OverviewView"
import CoursesView from "../admin/views/CoursesView"
import BatchesView from "../admin/views/BatchesView"
import TeachersView from "../admin/views/TeachersView"
import StudentsView from "../admin/views/StudentsView"
import OrdersView from "../admin/views/OrdersView"
import ReportsView from "../admin/views/ReportsView"

interface SuperAdminPortalProps {
  currentUser?: CurrentUser
  onToast: (msg: string) => void
}

const NAV_PATHS: Record<string, string> = {
  // Academy Admin scope
  overview: "/super-admin/overview",
  courses: "/super-admin/courses",
  batches: "/super-admin/batches",
  teachers: "/super-admin/teachers",
  students: "/super-admin/students",
  orders: "/super-admin/orders",
  reports: "/super-admin/reports",
  // Super Admin platform console scope
  health: "/super-admin/health",
  tenants: "/super-admin/tenants",
  access: "/super-admin/access",
  audit: "/super-admin/audit",
  ai: "/super-admin/ai",
  revenue: "/super-admin/revenue",
  settings: "/super-admin/settings",
}

function navIdFor(pathname: string): string {
  const segment = pathname.replace(/^\/(?:super-admin|admin)\/?/, "").split("/")[0]
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

function useSuperAdminNotifications(
  auditLogs: any[],
  batches: any[],
  orders: any[],
): NotificationSource {
  const [read, setRead] = useState<Set<string>>(new Set())

  const entries = useMemo(() => {
    const out: (ShellNotification & { to: string })[] = []

    // Security warning or refused event
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

    // High capacity batch notification
    const fullBatches = batches.filter((b) => b.enrolledSeats / b.maxSeats >= 0.9)
    if (fullBatches.length > 0) {
      out.push({
        id: `batch-cap-${fullBatches[0].id}`,
        title: "Cohort Near Capacity",
        message: `${fullBatches[0].name} has ${fullBatches[0].maxSeats - fullBatches[0].enrolledSeats} seats left`,
        timestamp: "Now",
        read: read.has(`batch-cap-${fullBatches[0].id}`),
        kind: "class",
        to: "/super-admin/batches",
      })
    }

    // Recent paid orders
    const latestOrder = orders.find((o) => o.status === "Paid")
    if (latestOrder) {
      out.push({
        id: `ord-${latestOrder.id}`,
        title: "New Tuition Payment",
        message: `${latestOrder.studentName} enrolled in ${latestOrder.courseTitle}`,
        timestamp: "10m ago",
        read: read.has(`ord-${latestOrder.id}`),
        kind: "grade",
        to: "/super-admin/orders",
      })
    }

    return out
  }, [auditLogs, batches, orders, read])

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

  const adminStore = useAdminStore()
  const superAdminStore = useSuperAdminStore()
  const notifications = useSuperAdminNotifications(
    superAdminStore.auditLogs,
    adminStore.batches,
    adminStore.orders,
  )

  // Seamlessly rewrite direct /admin/* paths to /super-admin/*
  useEffect(() => {
    if (location.pathname.startsWith("/admin")) {
      const rest = location.pathname.replace(/^\/admin/, "")
      navigate(`/super-admin${rest || "/health"}`, { replace: true })
    }
  }, [location.pathname, navigate])

  // Global modals state for Academy operations
  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false)
  const [isManualEnrolOpen, setIsManualEnrolOpen] = useState(false)
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false)

  const handleNavigate = (id: string) => {
    navigate(NAV_PATHS[id] ?? "/super-admin/health")
  }

  const handleCreateBatch = (data: any) => {
    adminStore.addBatch(data)
    onToast(`Cohort batch created: ${data.name}`)
  }

  const handleManualEnrol = (data: any) => {
    adminStore.enrolStudent(data)
    onToast(`Enrolled ${data.name} into cohort`)
  }

  const handleAddTeacher = (data: any) => {
    adminStore.addTeacher(data)
    onToast(`Added instructor ${data.name}`)
  }

  return (
    <AppShell
      role="Super Admin"
      activeId={activeId}
      onNavigate={handleNavigate}
      notifications={notifications}
    >
      <PageTransition transitionKey={location.pathname}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Super Admin Console */}
            <Route
              path="/"
              element={<PlatformHealthView store={superAdminStore} onToast={onToast} />}
            />
            <Route
              path="/health"
              element={<PlatformHealthView store={superAdminStore} onToast={onToast} />}
            />
            <Route
              path="/tenants"
              element={<TenantsView store={superAdminStore} />}
            />
            <Route
              path="/access"
              element={<RbacView store={superAdminStore} onToast={onToast} />}
            />
            <Route
              path="/audit"
              element={<AuditLogsView store={superAdminStore} />}
            />
            <Route
              path="/ai"
              element={<AiUsageView store={superAdminStore} onToast={onToast} />}
            />
            <Route
              path="/revenue"
              element={<RevenueView store={superAdminStore} />}
            />
            <Route
              path="/settings"
              element={<SuperAdminSettingsView store={superAdminStore} onToast={onToast} />}
            />

            {/* Admin Modules with Full Edit & Delete Controls */}
            <Route
              path="/overview"
              element={
                <OverviewView
                  store={adminStore}
                  onOpenCreateBatch={() => setIsCreateBatchOpen(true)}
                  onOpenManualEnrol={() => setIsManualEnrolOpen(true)}
                  onNavigate={handleNavigate}
                />
              }
            />
            <Route
              path="/courses"
              element={<CoursesView store={adminStore} onToast={onToast} />}
            />
            <Route
              path="/batches"
              element={
                <BatchesView
                  store={adminStore}
                  onOpenCreateBatch={() => setIsCreateBatchOpen(true)}
                />
              }
            />
            <Route
              path="/teachers"
              element={
                <TeachersView
                  store={adminStore}
                  onOpenAddTeacher={() => setIsAddTeacherOpen(true)}
                />
              }
            />
            <Route
              path="/students"
              element={
                <StudentsView
                  store={adminStore}
                  onOpenManualEnrol={() => setIsManualEnrolOpen(true)}
                />
              }
            />
            <Route
              path="/orders"
              element={<OrdersView store={adminStore} onToast={onToast} />}
            />
            <Route
              path="/reports"
              element={<ReportsView store={adminStore} onToast={onToast} />}
            />

            <Route path="*" element={<Navigate to="/super-admin/health" replace />} />
          </Routes>
        </Suspense>
      </PageTransition>

      {/* Global Modals for Admin Operations */}
      <CreateBatchModal
        isOpen={isCreateBatchOpen}
        onClose={() => setIsCreateBatchOpen(false)}
        onCreate={handleCreateBatch}
        courses={adminStore.courses}
      />

      <ManualEnrolModal
        isOpen={isManualEnrolOpen}
        onClose={() => setIsManualEnrolOpen(false)}
        onEnrol={handleManualEnrol}
        courses={adminStore.courses}
        batches={adminStore.batches}
      />

      <AddTeacherModal
        isOpen={isAddTeacherOpen}
        onClose={() => setIsAddTeacherOpen(false)}
        onAdd={handleAddTeacher}
        courses={adminStore.courses}
      />
    </AppShell>
  )
}
