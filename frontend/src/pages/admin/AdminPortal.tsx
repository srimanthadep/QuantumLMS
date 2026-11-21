import usePersistedNotifications from "@/lib/usePersistedNotifications"
import PlacementWorkspace from "@/components/placement/PlacementWorkspace"
import { lazy, Suspense, useState } from "react"
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import AppShell from "@/components/shell/AppShell"
import PageTransition from "@/components/motion/PageTransition"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import type { CurrentUser } from "@/types"
import { useAdminStore } from "@/data/adminStore"
import {
  AddTeacherModal,
  CreateBatchModal,
  ManualEnrolModal,
} from "@/components/AdminModals"
import { usePendingApprovals } from "./views/shared/usePendingApprovals"

const OverviewView = lazy(() => import("./views/OverviewView"))
const CoursesView = lazy(() => import("./views/CoursesView"))
const BatchesView = lazy(() => import("./views/BatchesView"))
const CourseWorkspacePage = lazy(() => import("./views/courses/CourseWorkspacePage"))
const BatchWorkspacePage = lazy(() => import("./views/batches/BatchWorkspacePage"))
const TeachersView = lazy(() => import("./views/TeachersView"))
const StudentsView = lazy(() => import("./views/StudentsView"))
const OrdersView = lazy(() => import("./views/OrdersView"))
const AlumniView = lazy(() => import("./views/AlumniView"))
const ReportsView = lazy(() => import("./views/ReportsView"))
const SettingsView = lazy(() => import("./views/SettingsView"))
const TeacherApprovalsView = lazy(() => import("./views/TeacherApprovalsView"))

// Single-tenant platform operations views

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
  placements: "/admin/placements",
  overview: "/admin/overview",
  approvals: "/admin/approvals",
  courses: "/admin/courses",
  batches: "/admin/batches",
  teachers: "/admin/teachers",
  students: "/admin/students",
  alumni: "/admin/alumni",
  orders: "/admin/orders",
  reports: "/admin/reports",
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
  const notifications = usePersistedNotifications(onToast)
  const pendingApprovals = usePendingApprovals()

  // Global modals state
  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false)
  const [isManualEnrolOpen, setIsManualEnrolOpen] = useState(false)
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false)

  const handleNavigate = (id: string) => {
    navigate(NAV_PATHS[id] ?? "/admin/overview")
  }

  const handleCreateBatch = async (data: any) => {
    try {
      await store.addBatch(data)
      onToast(`Cohort batch created: ${data.name}`)
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not create cohort batch.")
      throw err
    }
  }

  const handleManualEnrol = async (data: any) => {
    try {
      await store.enrolStudent(data)
      onToast(`Enrolled ${data.name}`)
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not enrol student.")
      throw err
    }
  }

  const handleAddTeacher = async (data: any) => {
    await store.addTeacher(data)
    onToast(`Added instructor ${data.name}`)
  }

  return (
    <AppShell
      role="Admin"
      activeId={activeId}
      onNavigate={handleNavigate}
      notifications={notifications}
      badges={{ approvals: pendingApprovals || undefined }}
    >
      {store.error&&<p role="alert" className="mb-4 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{store.error} Displayed records may be incomplete. Refresh to retry.</p>}
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
              path="/courses/:courseId"
              element={<CourseWorkspacePage store={store} onToast={onToast} />}
            />
            <Route
              path="/approvals"
              element={<TeacherApprovalsView onToast={onToast} />}
            />
            <Route
              path="/batches"
              element={
                <BatchesView
                  store={store}
                  onOpenCreateBatch={() => setIsCreateBatchOpen(true)}
                  onToast={onToast}
                />
              }
            />
            <Route
              path="/batches/:batchId"
              element={<BatchWorkspacePage store={store} onToast={onToast} />}
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
                <StudentsView onToast={onToast}
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
              path="/alumni"
              element={<AlumniView onToast={onToast} />}
            />
            <Route
              path="/reports"
              element={<ReportsView store={store} onToast={onToast} />}
            />
            <Route
              path="/settings"
              element={<SettingsView store={store} onToast={onToast} />}
            />
            <Route path="placements" element={<PlacementWorkspace role="Admin" />} />
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
        teachers={store.teachers}
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
