import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom"
import AppShell from "@/components/shell/AppShell"
import type { NotificationSource, ShellNotification } from "@/components/shell/NotificationsMenu"
import PageTransition from "@/components/motion/PageTransition"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import EvaluatorDataProvider, { useEvaluator } from "./data/EvaluatorDataProvider"
import { dueLabel, relTime, shortTitle } from "./data/derive"

const DashboardPage = lazy(() => import("./DashboardPage"))
const QueuePage = lazy(() => import("./QueuePage"))
const WorkspacePage = lazy(() => import("./WorkspacePage"))
const ReevaluationsPage = lazy(() => import("./ReevaluationsPage"))
const ReportsPage = lazy(() => import("./ReportsPage"))
const SettingsPage = lazy(() => import("./SettingsPage"))

/** Shell nav id -> evaluator route. */
const NAV_PATHS: Record<string, string> = {
  dashboard: "/evaluator/dashboard",
  queue: "/evaluator/queue",
  reevaluations: "/evaluator/reevaluations",
  reports: "/evaluator/reports",
  settings: "/evaluator/settings",
}

function navIdFor(pathname: string): string {
  const segment = pathname.replace(/^\/evaluator\/?/, "").split("/")[0]
  return segment in NAV_PATHS ? segment : "dashboard"
}

function PageFallback() {
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

/** /evaluator/workspace/:id (old links) -> the submission in the queue. */
function LegacyWorkspace() {
  const { id } = useParams()
  return <Navigate to={id && /^[0-9a-f-]{36}$/i.test(id) ? `/evaluator/queue/${id}` : "/evaluator/queue"} replace />
}

const READ_KEY = "evaluator_notifications_read"
function readSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]") as string[])
  } catch {
    return new Set()
  }
}

/** The bell, fed by the desk's own data: new submissions, open requests, results waiting and deadlines. */
function useEvaluatorNotifications(): NotificationSource {
  const navigate = useNavigate()
  const { queue, ready, openRequests, now } = useEvaluator()
  const [read, setRead] = useState(readSet)

  const entries = useMemo(() => {
    const out: (ShellNotification & { to: string })[] = []
    for (const r of openRequests.filter((x) => x.status === "Pending")) {
      out.push({ id: `req-${r.id}`, title: `${r.student_name} asked for a re-evaluation`, message: `${shortTitle(r.assignment_title)} · ${r.original_score}/${r.max_marks}`, timestamp: relTime(r.created_at, now), read: false, kind: "assessment", to: `/evaluator/reevaluations?request=${r.id}` })
    }
    const fresh = queue.items.filter((i) => i.state === "pending" && now - new Date(i.submitted_at).getTime() < 48 * 3_600_000)
    if (fresh.length) {
      const latest = fresh.reduce((a, b) => (a.submitted_at > b.submitted_at ? a : b))
      out.push({ id: `new-${latest.id}`, title: fresh.length === 1 ? "New submission" : `${fresh.length} new submissions`, message: `Latest from ${latest.student_name} · ${shortTitle(latest.assignment_title)}`, timestamp: relTime(latest.submitted_at, now), read: false, kind: "assessment", to: "/evaluator/queue" })
    }
    if (ready.length) {
      out.push({ id: `ready-${ready.length}-${ready[0].id}`, title: `${ready.length} ${ready.length === 1 ? "result" : "results"} ready to release`, message: "Students see nothing until you release them.", timestamp: "Today", read: false, kind: "grade", to: "/evaluator/queue?view=ready" })
    }
    for (const a of queue.assessments) {
      const due = dueLabel(a.due_at, now)
      if (!due.urgent || !a.pending) continue
      out.push({ id: `due-${a.id}-${a.due_at}`, title: `${shortTitle(a.title)} ${due.label.toLowerCase()}`, message: `${a.pending} ${a.pending === 1 ? "submission" : "submissions"} to mark so far`, timestamp: due.label, read: false, kind: "system", to: `/evaluator/queue?assessment=${a.id}` })
    }
    return out
  }, [queue, ready, openRequests, now])

  const markRead = (ids: string[]) =>
    setRead((r) => {
      const next = new Set(r)
      ids.forEach((id) => next.add(id))
      try {
        localStorage.setItem(READ_KEY, JSON.stringify([...next].slice(-200)))
      } catch {
        // storage unavailable
      }
      return next
    })

  return {
    items: entries.map(({ to: _to, ...n }) => ({ ...n, read: read.has(n.id) })),
    onSelect: (n) => {
      markRead([n.id])
      const target = entries.find((e) => e.id === n.id)?.to
      if (target) navigate(target)
    },
    onMarkAllRead: () => markRead(entries.map((e) => e.id)),
  }
}

function EvaluatorShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toMark, openRequests } = useEvaluator()
  const notifications = useEvaluatorNotifications()

  useEffect(() => {
    document.getElementById("main")?.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <AppShell
      role="Evaluator"
      activeId={navIdFor(location.pathname)}
      onNavigate={(id) => navigate(NAV_PATHS[id] ?? "/evaluator/dashboard")}
      badges={{ queue: toMark.length || undefined, reevaluations: openRequests.length || undefined }}
      notifications={notifications}
    >
      <PageTransition className="w-full pb-16">
        <Suspense fallback={<PageFallback />}>
          <Routes location={location}>
            <Route index element={<Navigate to="/evaluator/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="queue/:submissionId" element={<WorkspacePage />} />
            <Route path="reevaluations" element={<ReevaluationsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            {/* Old links */}
            <Route path="workspace/:id" element={<LegacyWorkspace />} />
            <Route path="submissions" element={<Navigate to="/evaluator/queue" replace />} />
            <Route path="*" element={<Navigate to="/evaluator/dashboard" replace />} />
          </Routes>
        </Suspense>
      </PageTransition>
    </AppShell>
  )
}

/** Evaluator portal: Cognito sign-in, the desk's data from the API, the app shell and the nested routes. */
export default function EvaluatorPortal() {
  return (
    <EvaluatorDataProvider>
      <EvaluatorShell />
    </EvaluatorDataProvider>
  )
}
