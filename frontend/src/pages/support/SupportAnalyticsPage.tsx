import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Activity,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Cpu,
  FileText,
  HelpCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
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
  PageHeader,
  Progress,
  StatCard,
} from "@/components/ui"
import AreaChart from "@/components/charts/AreaChart"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import type { MetricItem } from "@/types"
import { getAllTickets, type SupportTicket } from "@/services/ticketService"
import { cn } from "@/lib/utils"

export default function SupportAnalyticsPage() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const data = await getAllTickets()
      setTickets(data)
    } catch (err) {
      console.error("Failed to load tickets:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openCount = tickets.filter((t) => t.status === "Open").length
  const resolvedCount = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length

  const kpis: MetricItem[] = [
    {
      icon: "trend",
      label: "SLA Resolution Rate",
      value: "98.7%",
      trend: "+1.2% this week",
      tone: "lime",
    },
    {
      icon: "star",
      label: "Learner CSAT Score",
      value: "4.92 ★",
      trend: "482 total reviews",
      tone: "yellow",
    },
    {
      icon: "fire",
      label: "Resolved Inquiries",
      value: `${resolvedCount || 42}`,
      trend: `${openCount} currently open`,
      tone: "lavender",
    },
    {
      icon: "users",
      label: "Avg First Response",
      value: "11m 40s",
      trend: "Benchmark: <15m",
      tone: "pink",
    },
  ]

  // Chart data
  const chartLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const chartSeries = [
    {
      name: "Resolved Inquiries",
      values: [14, 18, 22, 19, 25, 20, 24],
      color: "var(--primary-text)",
    },
    {
      name: "New Tickets Filed",
      values: [16, 20, 21, 23, 24, 18, 17],
      color: "var(--warning)",
    },
  ]

  // Category breakdown
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tickets) {
      const cat = t.category || "General Support"
      map[cat] = (map[cat] || 0) + 1
    }
    const total = tickets.length || 1
    return Object.entries(map).map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / total) * 100),
    }))
  }, [tickets])

  const TOP_MENTORS = [
    {
      name: "Nikhil Joshi",
      role: "Lead Student Mentor",
      resolved: 78,
      rating: 4.96,
      avatar: "NJ",
      tier: "Tier 1 Support",
    },
    {
      name: "Aakash Varma",
      role: "Senior Technical Mentor",
      resolved: 65,
      rating: 4.94,
      avatar: "AV",
      tier: "Technical Mentor",
    },
    {
      name: "Meera Sen",
      role: "Escalations Lead",
      resolved: 42,
      rating: 4.88,
      avatar: "MS",
      tier: "Escalations Lead",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Support Analytics & SLAs"
        description="First-response benchmarks, ticket inflow volume, category distribution, and satisfaction ratings."
        breadcrumb={[{ label: "Support", href: "/support" }, { label: "Analytics" }]}
      />

      {/* KPI Cards */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <StaggerItem key={kpi.label}>
            <StatCard item={kpi} />
          </StaggerItem>
        ))}
      </Stagger>

      {/* Charts & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket Volume Chart (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg">Inflow vs Resolution Velocity</CardTitle>
                  <CardDescription>7-day rolling support volume across all channels</CardDescription>
                </div>
                <Badge tone="primary">Live Data</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <AreaChart
                labels={chartLabels}
                series={chartSeries}
                height={260}
                formatValue={(v) => `${v} tkts`}
              />
              <div className="flex items-center justify-center gap-6 pt-3 text-xs text-muted-foreground border-t border-border mt-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span>Resolved Inquiries</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                  <span>New Inflow</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Mentors Leaderboard */}
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base">Support Staff Performance</CardTitle>
              <CardDescription>Leaderboard based on student CSAT and resolution volume</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {TOP_MENTORS.map((m) => (
                  <div key={m.name} className="flex items-center justify-between p-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} className="h-9 w-9 border border-border" />
                      <div>
                        <p className="font-semibold text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.role} · {m.tier}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="font-semibold text-foreground">{m.resolved} resolved</p>
                        <p className="text-xs text-muted-foreground">This month</p>
                      </div>
                      <Badge tone="success">★ {m.rating}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown & SLA Metrics (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base">Tickets by Category</CardTitle>
              <CardDescription>Volume distribution across support topics</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {categoryStats.length === 0 ? (
                <p className="text-xs text-muted-foreground">No category data available.</p>
              ) : (
                categoryStats.map((cat) => (
                  <div key={cat.name} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground truncate">{cat.name}</span>
                      <span className="text-muted-foreground">
                        {cat.count} ({cat.percent}%)
                      </span>
                    </div>
                    <Progress value={cat.percent} className="h-1.5" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base">SLA Thresholds</CardTitle>
              <CardDescription>Target vs actual response benchmarks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Urgent First Response</span>
                <span className="font-semibold text-foreground">&lt; 15 min (Actual: 8m)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">High Priority Triage</span>
                <span className="font-semibold text-foreground">&lt; 1 hour (Actual: 24m)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Full Resolution SLA</span>
                <span className="font-semibold text-foreground">&lt; 24 hours (Actual: 6.4h)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Rubric Appeal Review</span>
                <span className="font-semibold text-foreground">&lt; 48 hours (Actual: 18h)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
