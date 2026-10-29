import { lazy, Suspense, useCallback, useState, type ComponentType, type ReactNode } from "react"
import { Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom"
import type { UserRole } from "@/types"
import { useToast } from "@/components/ui/toast"
import { AskAiModal } from "@/components/Modals"
import { ROLE_HOME, useSession, type LoginInput } from "./session"
import RequireRole from "./RequireRole"
import RouteFallback from "./RouteFallback"
import { LEGACY_BG, noopHexChange } from "./legacy"

const AuthPage = lazy(() => import("@/pages/auth/AuthPage"))
const StudentPortal = lazy(() => import("@/pages/student/StudentPortal"))
const TeacherPortal = lazy(() => import("@/pages/teacher/TeacherPortal"))
const EvaluatorPortal = lazy(() => import("@/pages/evaluator/EvaluatorPortal"))
const SupportPortal = lazy(() => import("@/pages/support"))
const AdminPortal = lazy(() => import("@/pages/admin/AdminPortal"))
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"))
const DesignSystemPage: ComponentType | null = import.meta.env.DEV ? lazy(() => import("@/pages/dev/DesignSystemPage")) : null

/** Callbacks every legacy portal expects. */
function usePortalProps() {
  const session = useSession()
  const toast = useToast()
  const navigate = useNavigate()
  const onToast = useCallback((msg: string) => toast.show(msg), [toast])
  const onSwitchRole = useCallback(
    (role: UserRole) => {
      navigate(session.switchRole(role))
      toast.show(`Switched to the ${role} portal`)
    },
    [navigate, session, toast],
  )
  const onLogout = useCallback(() => {
    session.logout()
    navigate("/auth")
    toast.show("You have been signed out.")
  }, [navigate, session, toast])
  return { currentUser: session.user, onToast, onSwitchRole, onLogout }
}

/** Temporary Ask AI host until the app shell (AiAssistantDialog) owns it. */
function useAiModal() {
  const [open, setOpen] = useState(false)
  return { open: () => setOpen(true), node: <AskAiModal isOpen={open} onClose={() => setOpen(false)} /> }
}

function Guard({ role, children }: { role: UserRole; children: ReactNode }) {
  return (
    <RequireRole role={role}>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </RequireRole>
  )
}

function AuthRoute() {
  const session = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const redirect = params.get("redirect")
  const onLogin = (user: LoginInput) => {
    session.login(user)
    const safe = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : null
    navigate(safe ?? ROLE_HOME[user.role], { replace: true })
    toast.success(`Welcome back, ${user.name}`)
  }
  return (
    <Suspense fallback={<RouteFallback variant="page" />}>
      <AuthPage onLogin={onLogin} hexColor={LEGACY_BG} onChangeHexColor={noopHexChange} />
    </Suspense>
  )
}

function StudentRoute() {
  const p = usePortalProps()
  const ai = useAiModal()
  return (
    <>
      <StudentPortal
        onOpenAiModal={ai.open}
        onSwitchToTeacher={() => p.onSwitchRole("Teacher")}
        onLogout={p.onLogout}
        onToast={p.onToast}
        hexColor={LEGACY_BG}
        onChangeHexColor={noopHexChange}
      />
      {ai.node}
    </>
  )
}

function TeacherRoute() {
  const p = usePortalProps()
  return <TeacherPortal currentUser={p.currentUser} onSwitchRole={p.onSwitchRole} onLogout={p.onLogout} onToast={p.onToast} />
}

function EvaluatorRoute() {
  const p = usePortalProps()
  return <EvaluatorPortal currentUser={p.currentUser} onSwitchRole={p.onSwitchRole} onLogout={p.onLogout} onToast={p.onToast} hexColor={LEGACY_BG} />
}

function SupportRoute() {
  const p = usePortalProps()
  const ai = useAiModal()
  return (
    <>
      <SupportPortal
        currentUser={p.currentUser}
        onSwitchRole={p.onSwitchRole}
        onOpenAiModal={ai.open}
        onSwitchToTeacher={() => p.onSwitchRole("Teacher")}
        onSwitchToStudent={() => p.onSwitchRole("Student")}
        onLogout={p.onLogout}
        onToast={p.onToast}
        hexColor={LEGACY_BG}
      />
      {ai.node}
    </>
  )
}

function AdminRoute({ role }: { role: "Admin" | "Super Admin" }) {
  const p = usePortalProps()
  return <AdminPortal role={role} currentUser={p.currentUser} onSwitchRole={p.onSwitchRole} onLogout={p.onLogout} onToast={p.onToast} hexColor={LEGACY_BG} />
}

/** The whole route table. Every page is lazy-loaded into its own chunk. */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Phase 2 replaces this redirect with the marketing landing page. */}
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/login" element={<AuthRoute />} />
      <Route
        path="/student/*"
        element={
          <Guard role="Student">
            <StudentRoute />
          </Guard>
        }
      />
      <Route
        path="/teacher/*"
        element={
          <Guard role="Teacher">
            <TeacherRoute />
          </Guard>
        }
      />
      <Route
        path="/evaluator/*"
        element={
          <Guard role="Evaluator">
            <EvaluatorRoute />
          </Guard>
        }
      />
      <Route
        path="/support/*"
        element={
          <Guard role="Support">
            <SupportRoute />
          </Guard>
        }
      />
      <Route
        path="/admin/*"
        element={
          <Guard role="Admin">
            <AdminRoute role="Admin" />
          </Guard>
        }
      />
      <Route
        path="/super-admin/*"
        element={
          <Guard role="Super Admin">
            <AdminRoute role="Super Admin" />
          </Guard>
        }
      />
      {DesignSystemPage && (
        <Route
          path="/design-system"
          element={
            <Suspense fallback={<RouteFallback variant="page" />}>
              <DesignSystemPage />
            </Suspense>
          }
        />
      )}
      <Route
        path="*"
        element={
          <Suspense fallback={<RouteFallback variant="page" />}>
            <NotFoundPage />
          </Suspense>
        }
      />
    </Routes>
  )
}
