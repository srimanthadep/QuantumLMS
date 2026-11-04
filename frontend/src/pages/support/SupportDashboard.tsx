import { useState, useEffect, useCallback, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Headphones,
  LifeBuoy,
  MessageSquare,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatCard,
  Textarea,
} from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import type { MetricItem } from "@/types"
import {
  getAllTickets,
  createTicket,
  subscribeToTickets,
  type SupportTicket,
} from "@/services/ticketService"
import { SUPPORT_CATEGORIES } from "./supportTicketsData"
import { cn } from "@/lib/utils"

interface SupportDashboardProps {
  onOpenAiModal?: () => void
}

export default function SupportDashboard({ onOpenAiModal }: SupportDashboardProps) {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [agentPresence, setAgentPresence] = useState<"online" | "away" | "busy">("online")
  const [filterMode, setFilterMode] = useState<"all" | "open" | "in_progress" | "urgent">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // New Ticket Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createSubject, setCreateSubject] = useState("")
  const [createCategory, setCreateCategory] = useState("Technical Support")
  const [createPriority, setCreatePriority] = useState<SupportTicket["priority"]>("Medium")
  const [createDescription, setCreateDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const data = await getAllTickets()
      setTickets(data)
    } catch (err) {
      console.error("Failed to load tickets:", err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    return subscribeToTickets(loadData)
  }, [loadData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    if (createSubject.trim().length < 8) {
      setCreateError("Subject must be at least 8 characters.")
      return
    }
    if (createDescription.trim().length < 20) {
      setCreateError("Description must be at least 20 characters.")
      return
    }

    setIsSubmitting(true)
    try {
      const newTicket = await createTicket({
        subject: createSubject.trim(),
        category: createCategory,
        priority: createPriority,
        description: createDescription.trim(),
      })
      setIsCreateOpen(false)
      setCreateSubject("")
      setCreateDescription("")
      setCreateError(null)
      await loadData()
      navigate(`/support/ticket/${newTicket.id}`)
    } catch (err: any) {
      setCreateError(err.message || "Failed to create support ticket.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Counters
  const openCount = tickets.filter((t) => t.status === "Open").length
  const inProgressCount = tickets.filter((t) => t.status === "In Progress").length
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length
  const closedCount = tickets.filter((t) => t.status === "Closed").length
  const urgentCount = tickets.filter((t) => t.priority === "Urgent" || t.priority === "High").length

  const kpis: MetricItem[] = [
    {
      icon: "mail",
      label: "Active Inquiries",
      value: `${openCount}`,
      trend: `${inProgressCount} in triage`,
      tone: "lavender",
    },
    {
      icon: "fire",
      label: "Resolved Tickets",
      value: `${resolvedCount}`,
      trend: `${closedCount} archived`,
      tone: "lime",
    },
    {
      icon: "star",
      label: "Urgent & High SLAs",
      value: `${urgentCount}`,
      trend: "Immediate escalation",
      tone: "pink",
    },
    {
      icon: "trend",
      label: "Avg First Response",
      value: "12m",
      trend: "Target < 15m (98.4%)",
      tone: "yellow",
    },
  ]

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filterMode === "open" && t.status !== "Open") return false
      if (filterMode === "in_progress" && t.status !== "In Progress") return false
      if (filterMode === "urgent" && t.priority !== "Urgent" && t.priority !== "High") return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          t.ticketNumber.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.studentName.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [tickets, filterMode, searchQuery])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Support Command Center"
        description="Real-time student tickets, live chat escalations, triage queue, and academic SLAs."
        breadcrumb={[{ label: "Support", href: "/support" }, { label: "Command Center" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh tickets"
            >
              <RefreshCw className={cn("mr-1.5 h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/support/live-chat")}
            >
              <Headphones className="mr-1.5 h-4 w-4 text-primary-text" />
              Live Chat Desk
            </Button>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Ticket
            </Button>
          </div>
        }
      />

      {/* KPI Metric Cards */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <StaggerItem key={kpi.label}>
            <StatCard item={kpi} />
          </StaggerItem>
        ))}
      </Stagger>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Priority Tickets Queue (8 cols) */}
        <div className="space-y-4 lg:col-span-8">
          <Card className="flex flex-col">
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between border-b border-border">
              <div>
                <CardTitle className="text-base sm:text-lg">Priority Support Queue</CardTitle>
                <CardDescription>
                  Showing {filteredTickets.length} of {tickets.length} total tickets in database
                </CardDescription>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search queue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-36 pl-8 text-xs sm:w-48"
                  />
                </div>
                <div className="inline-flex rounded-md border border-border p-0.5 bg-surface-2 text-xs">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "open", label: "Open" },
                      { id: "in_progress", label: "Active" },
                      { id: "urgent", label: "Urgent" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFilterMode(m.id)}
                      className={cn(
                        "rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                        filterMode === m.id
                          ? "bg-surface text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Connecting to PostgreSQL ticket records...
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={<LifeBuoy className="h-5 w-5" />}
                    title="No tickets found"
                    description="No tickets match your filter criteria or search query."
                    action={
                      <Button variant="outline" size="sm" onClick={() => { setFilterMode("all"); setSearchQuery(""); }}>
                        Reset Filters
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredTickets.slice(0, 10).map((tkt) => {
                    const isUrgent = tkt.priority === "Urgent" || tkt.priority === "High"
                    return (
                      <Link
                        key={tkt.id}
                        to={`/support/ticket/${tkt.id}`}
                        className="group flex flex-col gap-3 p-4 transition-colors hover:bg-surface-2/60 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <Avatar
                            name={tkt.studentName}
                            src={tkt.messages[0]?.avatar}
                            className="h-10 w-10 shrink-0 border border-border"
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-primary-text">
                                {tkt.ticketNumber}
                              </span>
                              <Badge
                                tone={
                                  tkt.priority === "Urgent"
                                    ? "danger"
                                    : tkt.priority === "High"
                                      ? "warning"
                                      : tkt.priority === "Medium"
                                        ? "info"
                                        : "neutral"
                                }
                              >
                                {tkt.priority}
                              </Badge>
                              <Badge
                                tone={
                                  tkt.status === "Open"
                                    ? "danger"
                                    : tkt.status === "In Progress"
                                      ? "warning"
                                      : tkt.status === "Resolved"
                                        ? "success"
                                        : "neutral"
                                }
                              >
                                {tkt.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {tkt.category}
                              </span>
                            </div>

                            <p className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary-text transition-colors">
                              {tkt.subject}
                            </p>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                              <span className="font-medium text-foreground/80">{tkt.studentName}</span>
                              <span>·</span>
                              <span className="truncate">{tkt.studentBatch}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0">
                          <span className="text-xs text-muted-foreground">
                            {new Date(tkt.created_at).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-xs font-semibold text-primary-text flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            View <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>

            {filteredTickets.length > 10 && (
              <div className="p-3 bg-surface-2/40 border-t border-border text-center">
                <Link
                  to="/support/inbox"
                  className="text-xs font-semibold text-primary-text hover:underline inline-flex items-center gap-1"
                >
                  View all {filteredTickets.length} tickets in Inbox →
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Omnichannel & Desk Operations (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Omnichannel Dispatcher Panel */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Omnichannel Status</CardTitle>
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full ring-2 ring-background",
                    agentPresence === "online"
                      ? "bg-emerald-500 animate-pulse"
                      : agentPresence === "busy"
                        ? "bg-rose-500"
                        : "bg-amber-500",
                  )}
                />
              </div>
              <CardDescription>Configure your live availability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-1.5 rounded-md border border-border bg-surface-2 p-1 text-xs">
                {(["online", "away", "busy"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setAgentPresence(st)}
                    className={cn(
                      "rounded py-1 font-semibold capitalize transition-all cursor-pointer",
                      agentPresence === st
                        ? st === "online"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : st === "busy"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-amber-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-border text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Web Support Tickets</span>
                  <Badge tone="info">{openCount + inProgressCount} Active</Badge>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Live Chat Inquiries</span>
                  <Badge tone="live" dot>3 Waiting</Badge>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">SLA Escalations</span>
                  <Badge tone={urgentCount > 0 ? "danger" : "neutral"}>
                    {urgentCount} Critical
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Academic SOPs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary-text" />
                Quick SOPs & Policies
              </CardTitle>
              <CardDescription>Instant references for student inquiries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                to="/support/knowledge-base"
                className="flex items-center justify-between p-2.5 rounded-md border border-border hover:bg-surface-2 transition-colors group"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary-text transition-colors">
                    SOP-101: Cohort Transfer Policy
                  </p>
                  <p className="text-[11px] text-muted-foreground">Transfer rules & admin verification</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-text group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                to="/support/knowledge-base"
                className="flex items-center justify-between p-2.5 rounded-md border border-border hover:bg-surface-2 transition-colors group"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary-text transition-colors">
                    SOP-104: Assessment Extensions
                  </p>
                  <p className="text-[11px] text-muted-foreground">Deadline grace period rules</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-text group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                to="/support/knowledge-base"
                className="flex items-center justify-between p-2.5 rounded-md border border-border hover:bg-surface-2 transition-colors group"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary-text transition-colors">
                    SOP-202: AI Evaluation Appeals
                  </p>
                  <p className="text-[11px] text-muted-foreground">Rubric regrading escalation flow</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-text group-hover:translate-x-0.5 transition-all" />
              </Link>
            </CardContent>
          </Card>

          {/* On-Duty Support Roster */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary-text" />
                Active Shift Roster
              </CardTitle>
              <CardDescription>Specialists active on the support desk</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Nikhil Joshi", role: "Lead Support Specialist", status: "online", csat: 4.9 },
                { name: "Aakash Varma", role: "Senior Technical Specialist", status: "online", csat: 5.0 },
                { name: "Meera Sen", role: "Escalations Lead", status: "busy", csat: 4.8 },
              ].map((agent) => (
                <div key={agent.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={agent.name} className="h-7 w-7 text-[10px]" />
                    <div>
                      <p className="font-semibold text-foreground">{agent.name}</p>
                      <p className="text-[11px] text-muted-foreground">{agent.role}</p>
                    </div>
                  </div>
                  <Badge tone={agent.status === "online" ? "success" : "warning"} dot>
                    ★ {agent.csat}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create New Support Ticket Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>
                File an academic, technical, or account support inquiry into the system.
              </DialogDescription>
            </DialogHeader>

            {createError && (
              <div className="rounded-md bg-danger-soft p-3 text-xs text-danger flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-3">
              <Field label="Subject">
                <Input
                  required
                  placeholder="e.g. Docker container failure in Module 4"
                  value={createSubject}
                  onChange={(e) => setCreateSubject(e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <Select value={createCategory} onValueChange={setCreateCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Priority">
                  <Select
                    value={createPriority}
                    onValueChange={(val) => setCreatePriority(val as SupportTicket["priority"])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Description (min 20 characters)">
                <Textarea
                  required
                  rows={4}
                  placeholder="Detail the issue, observed error logs, or student request..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Create Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
