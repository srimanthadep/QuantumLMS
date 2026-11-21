import usePersistedNotifications from "@/lib/usePersistedNotifications"
import PlacementWorkspace from "@/components/placement/PlacementWorkspace"
import { lazy, Suspense, useState, useEffect } from "react"
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import AppShell from "@/components/shell/AppShell"
import PageTransition from "@/components/motion/PageTransition"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import type { CurrentUser } from "@/types"
import { useAdminStore, useSuperAdminStore } from "@/data/adminStore"
import {
  AddTeacherModal,
  CreateBatchModal,
  ManualEnrolModal,
} from "@/components/AdminModals"
import { usePendingApprovals } from "../admin/views/shared/usePendingApprovals"

// Super Admin platform console views
const PlatformHealthView = lazy(() => import("./views/PlatformHealthView"))
const RbacView = lazy(() => import("./views/RbacView"))
const AuditLogsView = lazy(() => import("./views/AuditLogsView"))
const AiUsageView = lazy(() => import("./views/AiUsageView"))
const RevenueView = lazy(() => import("./views/RevenueView"))
const SuperAdminSettingsView = lazy(() => import("./views/SuperAdminSettingsView"))

// Academy admin views (Super Admin has complete edit & delete authority)
const OverviewView = lazy(() => import("../admin/views/OverviewView"))
const CoursesView = lazy(() => import("../admin/views/CoursesView"))
const BatchesView = lazy(() => import("../admin/views/BatchesView"))
const CourseWorkspacePage = lazy(() => import("../admin/views/courses/CourseWorkspacePage"))
const BatchWorkspacePage = lazy(() => import("../admin/views/batches/BatchWorkspacePage"))
const TeacherApprovalsView = lazy(() => import("../admin/views/TeacherApprovalsView"))
const TeachersView = lazy(() => import("../admin/views/TeachersView"))
const StudentsView = lazy(() => import("../admin/views/StudentsView"))
const OrdersView = lazy(() => import("../admin/views/OrdersView"))
const AlumniView = lazy(() => import("../admin/views/AlumniView"))
const ReportsView = lazy(() => import("../admin/views/ReportsView"))

interface SuperAdminPortalProps {
  currentUser?: CurrentUser
  onToast: (msg: string) => void
}

const NAV_PATHS: Record<string, string> = {
  placements: "/super-admin/placements",
  // Academy Admin scope
  overview: "/super-admin/overview",
  approvals: "/super-admin/approvals",
  courses: "/super-admin/courses",
  batches: "/super-admin/batches",
  teachers: "/super-admin/teachers",
  students: "/super-admin/students",
  alumni: "/super-admin/alumni",
  orders: "/super-admin/orders",
  reports: "/super-admin/reports",
  // Super Admin platform console scope
  health: "/super-admin/health",
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

export default function SuperAdminPortal({
  currentUser,
  onToast,
}: SuperAdminPortalProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const activeId = navIdFor(location.pathname)

  const adminStore = useAdminStore()
  const superAdminStore = useSuperAdminStore()
  const notifications = usePersistedNotifications(onToast)
  const pendingApprovals = usePendingApprovals()

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

  const handleCreateBatch = async (data: any) => {
    try {
      await adminStore.addBatch(data)
      onToast(`Cohort batch created: ${data.name}`)
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not create cohort batch.")
      throw err
    }
  }

  const handleManualEnrol = async (data: any) => {
    try {
      await adminStore.enrolStudent(data)
      onToast(`Enrolled ${data.name}`)
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not enrol student.")
      throw err
    }
  }

  const handleAddTeacher = async (data: any) => {
    await adminStore.addTeacher(data)
    onToast(`Added instructor ${data.name}`)
  }

  return (
    <AppShell
      role="Super Admin"
      activeId={activeId}
      onNavigate={handleNavigate}
      notifications={notifications}
      badges={{ approvals: pendingApprovals || undefined }}
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
              path="/courses/:courseId"
              element={<CourseWorkspacePage store={adminStore} onToast={onToast} />}
            />
            <Route
              path="/approvals"
              element={<TeacherApprovalsView onToast={onToast} />}
            />
            <Route
              path="/batches"
              element={
                <BatchesView
                  store={adminStore}
                  onOpenCreateBatch={() => setIsCreateBatchOpen(true)}
                  onToast={onToast}
                />
              }
            />
            <Route
              path="/batches/:batchId"
              element={<BatchWorkspacePage store={adminStore} onToast={onToast} />}
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
                <StudentsView onToast={onToast}
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
              path="/alumni"
              element={<AlumniView onToast={onToast} />}
            />
            <Route
              path="/reports"
              element={<ReportsView store={adminStore} onToast={onToast} />}
            />

            <Route path="placements" element={<PlacementWorkspace role="Admin" />} />
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
        teachers={adminStore.teachers}
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
