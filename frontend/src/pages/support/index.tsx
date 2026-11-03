import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import AppShell from "@/components/shell/AppShell"
import type { NotificationSource, ShellNotification } from "@/components/shell/NotificationsMenu"
import PageTransition from "@/components/motion/PageTransition"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import type { CurrentUser } from "@/types"
import { getAllTickets, subscribeToTickets, type SupportTicket } from "@/services/ticketService"

// Lazy-loaded support portal subpages
const SupportDashboard = lazy(() => import("./SupportDashboard"))
const TicketsInboxPage = lazy(() => import("./TicketsInboxPage"))
const TicketDetailPage = lazy(() => import("./TicketDetailPage"))
const LiveChatPage = lazy(() => import("./LiveChatPage"))
const KnowledgeBasePage = lazy(() => import("./KnowledgeBasePage"))
const SupportAgentsPage = lazy(() => import("./SupportAgentsPage"))
const SupportAnalyticsPage = lazy(() => import("./SupportAnalyticsPage"))
const SupportSettingsPage = lazy(() => import("./SupportSettingsPage"))

export interface SupportPortalProps {
  currentUser?: CurrentUser
  onOpenAiModal?: () => void
  onToast?: (msg: string) => void
}

const NAV_PATHS: Record<string, string> = {
  dashboard: "/support",
  inbox: "/support/inbox",
  "live-chat": "/support/live-chat",
  "knowledge-base": "/support/knowledge-base",
  agents: "/support/agents",
  analytics: "/support/analytics",
  settings: "/support/settings",
}

function navIdFor(pathname: string): string {
  const path = pathname.toLowerCase()
  if (path.startsWith("/support/ticket") || path.startsWith("/support/inbox")) return "inbox"
  if (path.startsWith("/support/live-chat")) return "live-chat"
  if (path.startsWith("/support/knowledge-base")) return "knowledge-base"
  if (path.startsWith("/support/agents")) return "agents"
  if (path.startsWith("/support/analytics")) return "analytics"
  if (path.startsWith("/support/settings")) return "settings"
  return "dashboard"
}

function SupportPageFallback() {
  return (
    <div className="space-y-6 pt-2" role="status" aria-label="Loading support desk">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Skeleton className="h-72" />
        </div>
        <div className="space-y-4 lg:col-span-4">
          <Skeleton className="h-72" />
        </div>
      </div>
      <SkeletonText lines={4} />
    </div>
  )
}

function useSupportNotifications(tickets: SupportTicket[]): NotificationSource {
  const [read, setRead] = useState<Set<string>>(new Set())

  const items = useMemo(() => {
    const list: (ShellNotification & { to: string })[] = []

    const urgentTickets = tickets.filter(
      (t) =>
        (t.status === "Open" || t.status === "In Progress") &&
        (t.priority === "Urgent" || t.priority === "High"),
    )

    for (const t of urgentTickets.slice(0, 5)) {
      list.push({
        id: `tkt-${t.id}`,
        title: `${t.priority} Priority: ${t.ticketNumber}`,
        message: `${t.studentName}: ${t.subject}`,
        timestamp: new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        read: read.has(`tkt-${t.id}`),
        kind: "doubt",
        to: `/support/ticket/${t.id}`,
      })
    }

    return list
  }, [tickets, read])

  return {
    items,
    onSelect: (n) => setRead((prev) => new Set([...prev, n.id])),
    onMarkAllRead: () => setRead(new Set(items.map((i) => i.id))),
  }
}

export default function SupportPortal({ currentUser, onOpenAiModal, onToast }: SupportPortalProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<SupportTicket[]>([])

  useEffect(() => {
    getAllTickets().then(setTickets).catch(console.error)
    return subscribeToTickets(() => {
      getAllTickets().then(setTickets).catch(console.error)
    })
  }, [])

  const notifications = useSupportNotifications(tickets)
  const activeNav = navIdFor(location.pathname)

  const openTicketsCount = tickets.filter((t) => t.status === "Open").length
  const badges: Record<string, number | string> = useMemo(() => {
    const map: Record<string, number | string> = {}
    if (openTicketsCount > 0) map.inbox = openTicketsCount
    map["live-chat"] = 3
    return map
  }, [openTicketsCount])

  return (
    <AppShell
      role="Support"
      activeId={activeNav}
      onNavigate={(id) => navigate(NAV_PATHS[id] ?? "/support")}
      notifications={notifications}
      badges={badges}
    >
      <PageTransition transitionKey={location.pathname}>
        <Suspense fallback={<SupportPageFallback />}>
          <Routes>
            <Route index element={<SupportDashboard onOpenAiModal={onOpenAiModal} />} />
            <Route path="dashboard" element={<SupportDashboard onOpenAiModal={onOpenAiModal} />} />
            <Route path="inbox" element={<TicketsInboxPage onToast={onToast} />} />
            <Route path="tickets" element={<TicketsInboxPage onToast={onToast} />} />
            <Route path="ticket/:ticketId" element={<TicketDetailPage onToast={onToast} />} />
            <Route path="tickets/:ticketId" element={<TicketDetailPage onToast={onToast} />} />
            <Route path="live-chat" element={<LiveChatPage onToast={onToast} />} />
            <Route path="knowledge-base" element={<KnowledgeBasePage onToast={onToast} />} />
            <Route path="agents" element={<SupportAgentsPage onToast={onToast} />} />
            <Route path="analytics" element={<SupportAnalyticsPage />} />
            <Route path="settings" element={<SupportSettingsPage onToast={onToast} />} />
            <Route path="*" element={<Navigate to="/support" replace />} />
          </Routes>
        </Suspense>
      </PageTransition>
    </AppShell>
  )
}

export { SupportPortal }
