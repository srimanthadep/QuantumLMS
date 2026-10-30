import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom"
import AppShell from "@/components/shell/AppShell"
import type { NotificationSource, ShellNotification } from "@/components/shell/NotificationsMenu"
import PageTransition from "@/components/motion/PageTransition"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import { TeacherDataProvider, useTeacherData } from "./teacherStore"
import TeacherDashboardPage from "./TeacherDashboardPage"

const CoursesPage = lazy(() => import("./CoursesPage"))
const CourseWorkspacePage = lazy(() => import("./course/CourseWorkspacePage"))
const LiveClassesPage = lazy(() => import("./LiveClassesPage"))
const LiveStudioPage = lazy(() => import("./live/LiveStudioPage"))
const RecordingsPage = lazy(() => import("./RecordingsPage"))
const RecordingReviewPage = lazy(() => import("./recordings/RecordingReviewPage"))
const StudentsPage = lazy(() => import("./StudentsPage"))
const DoubtsPage = lazy(() => import("./DoubtsPage"))
const CalendarPage = lazy(() => import("./CalendarPage"))
const AnalyticsPage = lazy(() => import("./AnalyticsPage"))
const SupportPage = lazy(() => import("./SupportPage"))
const SettingsPage = lazy(() => import("./SettingsPage"))

interface TeacherPortalProps {
  onToast: (msg: string) => void
}

/** Shell nav id -> teacher route. */
const NAV_PATHS: Record<string, string> = {
  dashboard: "/teacher",
  courses: "/teacher/courses",
  live: "/teacher/live-class",
  recordings: "/teacher/recordings",
  students: "/teacher/students",
  doubts: "/teacher/doubts",
  calendar: "/teacher/calendar",
  analytics: "/teacher/analytics",
  support: "/teacher/support",
  settings: "/teacher/settings",
}

/** First path segment after /teacher -> shell nav id. */
const SEGMENT_TO_NAV: Record<string, string> = {
  courses: "courses",
  "live-class": "live",
  recordings: "recordings",
  students: "students",
  doubts: "doubts",
  calendar: "calendar",
  analytics: "analytics",
  support: "support",
  settings: "settings",
}

function navIdFor(pathname: string): string {
  const segment = pathname.replace(/^\/teacher\/?/, "").split("/")[0]
  return SEGMENT_TO_NAV[segment] ?? "dashboard"
}

function TeacherPageFallback() {
  return (
    <div className="mt-2 space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <SkeletonText lines={4} />
    </div>
  )
}

/** /teacher/live-class/review/:sessionId (old links) -> that session's recording. */
function LegacyReviewRedirect() {
  const { sessionId } = useParams()
  const { recordings } = useTeacherData()
  const rec = recordings.find((r) => r.sessionId === sessionId)
  return <Navigate to={rec ? `/teacher/recordings/${rec.id}` : "/teacher/recordings"} replace />
}

function LegacyStudioRedirect() {
  const { sessionId } = useParams()
  return <Navigate to={`/teacher/live-class/studio/${sessionId ?? ""}`} replace />
}

/** The shell's bell, fed by teacher data: the live class, urgent doubts, grading and recordings. */
function useTeacherNotifications(): NotificationSource {
  const navigate = useNavigate()
  const { sessions, doubts, assignments, recordings } = useTeacherData()
  const [read, setRead] = useState<Set<string>>(new Set())

  const entries = useMemo(() => {
    const out: (ShellNotification & { to: string })[] = []
    const live = sessions.find((s) => s.status === "Live Now")
    if (live) out.push({ id: `live-${live.id}`, title: "Your class is live", message: live.title, timestamp: "Now", read: false, kind: "class", to: `/teacher/live-class/studio/${live.id}` })
    for (const d of doubts.filter((x) => x.status === "Pending" && x.priority === "High")) {
      out.push({ id: `doubt-${d.id}`, title: `${d.studentName} needs help`, message: d.questionTitle, timestamp: d.submittedAt, read: false, kind: "doubt", to: `/teacher/doubts?doubt=${d.id}` })
    }
    const queue = Object.values(assignments)
      .map((a) => ({ a, n: (a.submissions ?? []).filter((s) => s.status === "Submitted" || s.status === "Late").length }))
      .filter((x) => x.n > 0)
    const waiting = queue.reduce((s, x) => s + x.n, 0)
    if (waiting && queue[0]) {
      out.push({
        id: "grading",
        title: `${waiting} submissions to grade`,
        message: `Across ${queue.length} assignments, starting with ${queue[0].a.moduleTitle}`,
        timestamp: "Today",
        read: false,
        kind: "grade",
        to: `/teacher/courses/${queue[0].a.courseId}?tab=assignments`,
      })
    }
    for (const r of recordings.filter((x) => x.status === "Processing")) {
      out.push({ id: `rec-${r.id}`, title: "A recording is processing", message: r.title, timestamp: "Today", read: false, kind: "system", to: `/teacher/recordings/${r.id}` })
    }
    return out
  }, [sessions, doubts, assignments, recordings])

  return {
    items: entries.map(({ to: _to, ...n }) => ({ ...n, read: read.has(n.id) })),
    onSelect: (n) => {
      setRead((r) => new Set(r).add(n.id))
      const target = entries.find((e) => e.id === n.id)?.to
      if (target) navigate(target)
    },
    onMarkAllRead: () => setRead(new Set(entries.map((e) => e.id))),
  }
}

function TeacherShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { doubts } = useTeacherData()
  const notifications = useTeacherNotifications()
  const openDoubts = doubts.filter((d) => d.status !== "Resolved").length

  useEffect(() => {
    document.getElementById("main")?.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <AppShell
      role="Teacher"
      activeId={navIdFor(location.pathname)}
      onNavigate={(id) => navigate(NAV_PATHS[id] ?? "/teacher")}
      badges={{ doubts: openDoubts || undefined }}
      notifications={notifications}
    >
      <PageTransition className="w-full pb-16">
        <Suspense fallback={<TeacherPageFallback />}>
          <Routes location={location}>
            <Route index element={<TeacherDashboardPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/:courseId" element={<CourseWorkspacePage />} />
            <Route path="live-class" element={<LiveClassesPage />} />
            <Route path="live-class/studio/:sessionId" element={<LiveStudioPage />} />
            <Route path="recordings" element={<RecordingsPage />} />
            <Route path="recordings/:recordingId" element={<RecordingReviewPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="doubts" element={<DoubtsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="settings" element={<SettingsPage />} />
            {/* Old links */}
            <Route path="reports" element={<Navigate to="/teacher/analytics?tab=reports" replace />} />
            <Route path="help" element={<Navigate to="/teacher/support" replace />} />
            <Route path="live-class/recordings" element={<Navigate to="/teacher/recordings" replace />} />
            <Route path="live-class/review/:sessionId" element={<LegacyReviewRedirect />} />
            <Route path="live/studio/:sessionId" element={<LegacyStudioRedirect />} />
            <Route path="*" element={<Navigate to="/teacher" replace />} />
          </Routes>
        </Suspense>
      </PageTransition>
    </AppShell>
  )
}

/** Teacher portal: shared teacher data, the app shell and the nested teacher routes. */
export default function TeacherPortal({ onToast }: TeacherPortalProps) {
  return (
    <TeacherDataProvider onToast={onToast}>
      <TeacherShell />
    </TeacherDataProvider>
  )
}
