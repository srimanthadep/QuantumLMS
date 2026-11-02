import { lazy, Suspense, useCallback, type ComponentType, type ReactNode } from "react"
import { Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom"
import type { UserRole } from "@/types"
import { useToast } from "@/components/ui/toast"
import { AiAssistantProvider, useAiAssistant } from "@/components/shell/AiAssistantDialog"
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
const VerifyCertificatePage = lazy(() => import("@/pages/VerifyCertificatePage"))
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
  const ai = useAiAssistant()
  return (
    <StudentPortal onOpenAiModal={() => ai.open()} onLogout={p.onLogout} onToast={p.onToast} />
  )
}

function TeacherRoute() {
  const p = usePortalProps()
  return <TeacherPortal onToast={p.onToast} />
}

function EvaluatorRoute() {
  return <EvaluatorPortal />
}

function SupportRoute() {
  const p = usePortalProps()
  const ai = useAiAssistant()
  return <SupportPortal currentUser={p.currentUser} onOpenAiModal={() => ai.open()} onToast={p.onToast} />
}

function AdminRoute({ role }: { role: "Admin" | "Super Admin" }) {
  const p = usePortalProps()
  return <AdminPortal role={role} currentUser={p.currentUser} onToast={p.onToast} />
}

/** The whole route table. Every page is lazy-loaded into its own chunk. */
export default function AppRoutes() {
  return (
    <AiAssistantProvider>
    <Routes>
      {/* Phase 2 replaces this redirect with the marketing landing page. */}
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/login" element={<AuthRoute />} />
      {/* Public: anyone with a shared certificate link can check it. */}
      <Route
        path="/verify/:credentialId"
        element={
          <Suspense fallback={<RouteFallback variant="page" />}>
            <VerifyCertificatePage />
          </Suspense>
        }
      />
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
    </AiAssistantProvider>
  )
}
