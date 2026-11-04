import { useState } from "react"
import {
  Award,
  CheckCircle2,
  Clock,
  Filter,
  LifeBuoy,
  MessageSquare,
  Search,
  Shield,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
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
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatCard,
} from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import type { MetricItem } from "@/types"
import { cn } from "@/lib/utils"

interface SupportAgentsPageProps {
  onToast?: (msg: string) => void
}

interface SupportAgent {
  id: string
  name: string
  email: string
  avatar: string
  roleTier: string
  status: "online" | "in_chat" | "away" | "offline"
  activeTickets: number
  maxCapacity: number
  solvedToday: number
  avgResponseTime: string
  csatScore: number
  specialties: string[]
  currentShift: string
}

const AGENTS: SupportAgent[] = [
  {
    id: "ag-1",
    name: "Nikhil Joshi",
    email: "nikhil.j@quantum.ai",
    avatar: "NJ",
    roleTier: "Lead Support Specialist",
    status: "online",
    activeTickets: 4,
    maxCapacity: 8,
    solvedToday: 18,
    avgResponseTime: "8m",
    csatScore: 4.94,
    specialties: ["Full-Stack AI", "Cohort Transfers", "Billing"],
    currentShift: "Morning Shift (08:00 - 16:00)",
  },
  {
    id: "ag-2",
    name: "Aakash Varma",
    email: "aakash.v@quantum.ai",
    avatar: "AV",
    roleTier: "Senior Technical Specialist",
    status: "in_chat",
    activeTickets: 6,
    maxCapacity: 8,
    solvedToday: 15,
    avgResponseTime: "11m",
    csatScore: 4.96,
    specialties: ["Docker & LLMOps", "GPU Clusters", "Evaluation Appeals"],
    currentShift: "Evening Shift (14:00 - 22:00)",
  },
  {
    id: "ag-3",
    name: "Meera Sen",
    email: "meera.s@quantum.ai",
    avatar: "MS",
    roleTier: "Escalations Lead",
    status: "away",
    activeTickets: 3,
    maxCapacity: 6,
    solvedToday: 12,
    avgResponseTime: "14m",
    csatScore: 4.88,
    specialties: ["Academic Appeals", "Disputes", "Faculty Escalations"],
    currentShift: "General Shift (10:00 - 18:00)",
  },
  {
    id: "ag-4",
    name: "Rhea Pillai",
    email: "rhea.p@quantum.ai",
    avatar: "RP",
    roleTier: "Support Specialist",
    status: "online",
    activeTickets: 3,
    maxCapacity: 8,
    solvedToday: 14,
    avgResponseTime: "9m",
    csatScore: 4.85,
    specialties: ["Python Fundamentals", "Quiz Resets", "Onboarding"],
    currentShift: "Morning Shift (08:00 - 16:00)",
  },
]

export default function SupportAgentsPage({ onToast }: SupportAgentsPageProps) {
  const [agents, setAgents] = useState<SupportAgent[]>(AGENTS)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Reassign Dialog
  const [reassignAgent, setReassignAgent] = useState<SupportAgent | null>(null)
  const [targetAgentId, setTargetAgentId] = useState<string>("")

  const onlineCount = agents.filter((a) => a.status === "online" || a.status === "in_chat").length
  const totalSolved = agents.reduce((sum, a) => sum + a.solvedToday, 0)
  const avgCsat = (agents.reduce((sum, a) => sum + a.csatScore, 0) / agents.length).toFixed(2)

  const kpis: MetricItem[] = [
    {
      icon: "users",
      label: "Active Agents Online",
      value: `${onlineCount} / ${agents.length}`,
      trend: "Current shift coverage",
      tone: "lavender",
    },
    {
      icon: "fire",
      label: "Inquiries Handled Today",
      value: `${totalSolved}`,
      trend: "+14% vs yesterday",
      tone: "lime",
    },
    {
      icon: "star",
      label: "Agent CSAT Average",
      value: `${avgCsat} ★`,
      trend: "Based on 142 ratings",
      tone: "yellow",
    },
    {
      icon: "trend",
      label: "Avg First Response",
      value: "10.5m",
      trend: "All tiers combined",
      tone: "pink",
    },
  ]

  const handleReassign = () => {
    if (!reassignAgent || !targetAgentId) return
    const target = agents.find((a) => a.id === targetAgentId)
    setReassignAgent(null)
    setTargetAgentId("")
    onToast?.(`Queue from ${reassignAgent.name} successfully redistributed to ${target?.name || "selected agent"}.`)
  }

  const filteredAgents = agents.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      return (
        a.name.toLowerCase().includes(q) ||
        a.roleTier.toLowerCase().includes(q) ||
        a.specialties.some((s) => s.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Support Roster & Team"
        description="Active support specialists on duty, shift capacity, queue load balancing, and CSAT scores."
        breadcrumb={[{ label: "Support", href: "/support" }, { label: "Agents" }]}
      />

      {/* KPI Cards */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <StaggerItem key={kpi.label}>
            <StatCard item={kpi} />
          </StaggerItem>
        ))}
      </Stagger>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents by name, tier, or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(["all", "online", "in_chat", "away"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer capitalize",
                statusFilter === st
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface border border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {st === "all" ? "All Agents" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Agents Roster Cards Grid */}
      {filteredAgents.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No agents found"
          description="Try adjusting your filter or search query."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filteredAgents.map((agent) => {
            const loadPercent = Math.round((agent.activeTickets / agent.maxCapacity) * 100)
            return (
              <Card key={agent.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar name={agent.name} className="h-11 w-11 border border-border" />
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-background",
                            agent.status === "online"
                              ? "bg-emerald-500"
                              : agent.status === "in_chat"
                                ? "bg-cyan-500 animate-pulse"
                                : agent.status === "away"
                                  ? "bg-amber-500"
                                  : "bg-zinc-400",
                          )}
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">{agent.name}</h4>
                        <p className="text-xs text-muted-foreground">{agent.roleTier}</p>
                        <p className="text-[11px] text-muted-foreground">{agent.currentShift}</p>
                      </div>
                    </div>

                    <Badge tone="success" className="text-xs font-semibold">
                      ★ {agent.csatScore} CSAT
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Capacity Bar */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Active Ticket Load</span>
                      <span className="font-semibold text-foreground">
                        {agent.activeTickets} / {agent.maxCapacity} slots ({loadPercent}%)
                      </span>
                    </div>
                    <Progress value={loadPercent} className="h-2" />
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 gap-2 rounded-md bg-surface-2 p-2.5 text-xs">
                    <div>
                      <p className="text-muted-foreground text-[11px]">Solved Today</p>
                      <p className="font-semibold text-foreground text-sm">{agent.solvedToday}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[11px]">Avg First Response</p>
                      <p className="font-semibold text-foreground text-sm">{agent.avgResponseTime}</p>
                    </div>
                  </div>

                  {/* Specialties */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Specialties
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {agent.specialties.map((spec) => (
                        <span
                          key={spec}
                          className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-foreground border border-border"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">ID: {agent.id}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setReassignAgent(agent)
                        setTargetAgentId(agents.find((a) => a.id !== agent.id)?.id || "")
                      }}
                    >
                      Reassign Queue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Reassign Dialog */}
      <Dialog open={!!reassignAgent} onOpenChange={(open) => !open && setReassignAgent(null)}>
        {reassignAgent && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reassign {reassignAgent.name}&apos;s Queue</DialogTitle>
              <DialogDescription>
                Redistribute {reassignAgent.activeTickets} active tickets to another on-duty agent.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Field label="Transfer to Agent">
                <Select value={targetAgentId} onValueChange={setTargetAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents
                      .filter((a) => a.id !== reassignAgent.id)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.activeTickets}/{a.maxCapacity} active)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setReassignAgent(null)}>
                Cancel
              </Button>
              <Button onClick={handleReassign} disabled={!targetAgentId}>
                Confirm Reassignment
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
