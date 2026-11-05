import { lazy, Suspense, useState, useMemo } from "react"
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

import OverviewView from "./views/OverviewView"
import CoursesView from "./views/CoursesView"
import BatchesView from "./views/BatchesView"
import TeachersView from "./views/TeachersView"
import StudentsView from "./views/StudentsView"
import OrdersView from "./views/OrdersView"
import ReportsView from "./views/ReportsView"
import SettingsView from "./views/SettingsView"

// Single-tenant platform operations views
import PlatformHealthView from "../super-admin/views/PlatformHealthView"
import RbacView from "../super-admin/views/RbacView"
import AuditLogsView from "../super-admin/views/AuditLogsView"
import AiUsageView from "../super-admin/views/AiUsageView"
import RevenueView from "../super-admin/views/RevenueView"

// Lazy load Super Admin in case role="Super Admin" is passed to AdminPortal
const SuperAdminPortal = lazy(() => import("../super-admin/SuperAdminPortal"))

interface AdminPortalProps {
  role?: "Admin" | "Super Admin"
  currentUser?: CurrentUser
  onToast: (msg: string) => void
  /** @deprecated */
  hexColor?: string
  /** @deprecated */
  onChangeHexColor?: (color: string) => void
  isLightBg?: boolean
}

const NAV_PATHS: Record<string, string> = {
  overview: "/admin/overview",
  courses: "/admin/courses",
  batches: "/admin/batches",
  teachers: "/admin/teachers",
  students: "/admin/students",
  orders: "/admin/orders",
  reports: "/admin/reports",
  health: "/admin/health",
  access: "/admin/access",
  audit: "/admin/audit",
  ai: "/admin/ai",
  revenue: "/admin/revenue",
  settings: "/admin/settings",
}

function navIdFor(pathname: string): string {
  const segment = pathname.replace(/^\/admin\/?/, "").split("/")[0]
  return segment in NAV_PATHS ? segment : "overview"
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

function useAdminNotifications(batches: any[], orders: any[]): NotificationSource {
  const [read, setRead] = useState<Set<string>>(new Set())

  const entries = useMemo(() => {
    const out: (ShellNotification & { to: string })[] = []

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
        to: "/admin/batches",
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
        to: "/admin/orders",
      })
    }

    return out
  }, [batches, orders, read])

  return {
    items: entries,
    onSelect: (n) => setRead((prev) => new Set([...prev, n.id])),
    onMarkAllRead: () => setRead(new Set(entries.map((e) => e.id))),
  }
}

export default function AdminPortal({
  role = "Admin",
  currentUser,
  onToast,
}: AdminPortalProps) {
  // If role is Super Admin, redirect/render SuperAdminPortal
  if (role === "Super Admin" || currentUser?.role === "Super Admin") {
    return (
      <Suspense fallback={<PageFallback />}>
        <SuperAdminPortal onToast={onToast} currentUser={currentUser} />
      </Suspense>
    )
  }

  const location = useLocation()
  const navigate = useNavigate()
  const activeId = navIdFor(location.pathname)

  const store = useAdminStore()
  const superAdminStore = useSuperAdminStore()
  const notifications = useAdminNotifications(store.batches, store.orders)

  // Global modals state
  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false)
  const [isManualEnrolOpen, setIsManualEnrolOpen] = useState(false)
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false)

  const handleNavigate = (id: string) => {
    navigate(NAV_PATHS[id] ?? "/admin/overview")
  }

  const handleCreateBatch = (data: any) => {
    store.addBatch(data)
    onToast(`Cohort batch created: ${data.name}`)
  }

  const handleManualEnrol = (data: any) => {
    store.enrolStudent(data)
    onToast(`Enrolled ${data.name} into cohort`)
  }

  const handleAddTeacher = (data: any) => {
    store.addTeacher(data)
    onToast(`Added instructor ${data.name}`)
  }

  return (
    <AppShell
      role="Admin"
      activeId={activeId}
      onNavigate={handleNavigate}
      notifications={notifications}
    >
      <PageTransition>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route
              path="/"
              element={
                <OverviewView
                  store={store}
                  onOpenCreateBatch={() => setIsCreateBatchOpen(true)}
                  onOpenManualEnrol={() => setIsManualEnrolOpen(true)}
                  onNavigate={handleNavigate}
                />
              }
            />
            <Route
              path="/overview"
              element={
                <OverviewView
                  store={store}
                  onOpenCreateBatch={() => setIsCreateBatchOpen(true)}
                  onOpenManualEnrol={() => setIsManualEnrolOpen(true)}
                  onNavigate={handleNavigate}
                />
              }
            />
            <Route
              path="/courses"
              element={<CoursesView store={store} onToast={onToast} />}
            />
            <Route
              path="/batches"
              element={
                <BatchesView
                  store={store}
                  onOpenCreateBatch={() => setIsCreateBatchOpen(true)}
                />
              }
            />
            <Route
              path="/teachers"
              element={
                <TeachersView
                  store={store}
                  onOpenAddTeacher={() => setIsAddTeacherOpen(true)}
                />
              }
            />
            <Route
              path="/students"
              element={
                <StudentsView
                  store={store}
                  onOpenManualEnrol={() => setIsManualEnrolOpen(true)}
                />
              }
            />
            <Route
              path="/orders"
              element={<OrdersView store={store} onToast={onToast} />}
            />
            <Route
              path="/reports"
              element={<ReportsView store={store} onToast={onToast} />}
            />
            <Route
              path="/health"
              element={<PlatformHealthView store={superAdminStore} onToast={onToast} />}
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
              element={<SettingsView store={store} onToast={onToast} />}
            />
            <Route path="*" element={<Navigate to="/admin/overview" replace />} />
          </Routes>
        </Suspense>
      </PageTransition>

      {/* Global Modals */}
      <CreateBatchModal
        isOpen={isCreateBatchOpen}
        onClose={() => setIsCreateBatchOpen(false)}
        onCreate={handleCreateBatch}
        courses={store.courses}
      />

      <ManualEnrolModal
        isOpen={isManualEnrolOpen}
        onClose={() => setIsManualEnrolOpen(false)}
        onEnrol={handleManualEnrol}
        courses={store.courses}
        batches={store.batches}
      />

      <AddTeacherModal
        isOpen={isAddTeacherOpen}
        onClose={() => setIsAddTeacherOpen(false)}
        onAdd={handleAddTeacher}
        courses={store.courses}
      />
    </AppShell>
  )
}
