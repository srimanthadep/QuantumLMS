import {
  ArrowUpRight,
  BookOpen,
  Building2,
  CreditCard,
  TrendingUp,
  Wallet,
} from "lucide-react"
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  StatCard,
} from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import AreaChart from "@/components/charts/AreaChart"
import type { MetricItem } from "@/types"
import type { useSuperAdminStore } from "@/data/adminStore"
import { cn } from "@/lib/utils"

interface RevenueViewProps {
  store: ReturnType<typeof useSuperAdminStore>
}

export default function RevenueView({ store }: RevenueViewProps) {
  const mrrTrajectory = [
    { label: "Jan", value: 14.2 },
    { label: "Feb", value: 15.8 },
    { label: "Mar", value: 17.1 },
    { label: "Apr", value: 18.5 },
    { label: "May", value: 19.8 },
    { label: "Jun", value: 21.0 },
    { label: "Jul", value: 22.4 },
    { label: "Aug", value: 21.9 },
    { label: "Sep", value: 23.5 },
    { label: "Oct", value: 24.1 },
    { label: "Nov", value: 26.8 },
  ]

  const chartSeries = [
    {
      name: "MRR (₹ Lakhs)",
      values: mrrTrajectory.map((p) => p.value),
      color: "var(--primary-text)",
    },
  ]

  const kpis: MetricItem[] = [
    {
      icon: "trend",
      label: "Monthly Run-Rate (MRR)",
      value: "₹26,80,000",
      trend: "+11.2% MoM Expansion",
      tone: "lime",
    },
    {
      icon: "fire",
      label: "Institutional Contracts",
      value: "₹84,50,000",
      trend: "4 enterprise campuses",
      tone: "lavender",
    },
    {
      icon: "star",
      label: "Gateway Success Rate",
      value: "99.4%",
      trend: "Razorpay + Stripe online",
      tone: "yellow",
    },
    {
      icon: "users",
      label: "Annual Run-Rate (ARR)",
      value: "₹3.21 Cr",
      trend: "Projected FY 26-27",
      tone: "pink",
    },
  ]

  const CONTRACTS = [
    { campus: "IIT Madras Research Park", plan: "Enterprise Sovereign Tier", value: "₹32,00,000", status: "Active", renewal: "Oct 2027" },
    { campus: "BITS Pilani Innovation Hub", plan: "Pro Academy Campus", value: "₹24,50,000", status: "Active", renewal: "Jan 2027" },
    { campus: "IIIT Hyderabad Foundation", plan: "Pro Academy Campus", value: "₹18,00,000", status: "Active", renewal: "Aug 2027" },
    { campus: "PES University AI Lab", plan: "Growth Tier", value: "₹10,00,000", status: "In Renewal", renewal: "Dec 2026" },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Platform Revenue & Run-Rate"
        description="Monthly recurring receipts, institutional cohort contracts, and gateway reconciliation."
        breadcrumb={[{ label: "Platform Console", href: "/super-admin" }, { label: "Revenue" }]}
      />

      {/* KPI Cards */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <StaggerItem key={kpi.label}>
            <StatCard item={kpi} />
          </StaggerItem>
        ))}
      </Stagger>

      {/* MRR Trajectory Chart Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Monthly Recurring Revenue Trajectory</CardTitle>
              <CardDescription>Growth trajectory in ₹ Lakhs across calendar year 2026</CardDescription>
            </div>
            <Badge tone="success">+88.7% YoY Growth</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <AreaChart
            labels={mrrTrajectory.map((p) => p.label)}
            series={chartSeries}
            height={260}
            formatValue={(v) => `₹${v}L`}
          />
        </CardContent>
      </Card>

      {/* Institutional Contracts Breakdown */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base">Institutional Enterprise Contracts</CardTitle>
          <CardDescription>Multi-cohort billing agreements and scheduled renewal cycles</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-2 font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Campus / Institution</th>
                  <th className="px-4 py-3">Tier Plan</th>
                  <th className="px-4 py-3">Contract Value</th>
                  <th className="px-4 py-3">Renewal Date</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {CONTRACTS.map((c) => (
                  <tr key={c.campus} className="hover:bg-surface-2/60 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-foreground text-sm">
                      {c.campus}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {c.plan}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                      {c.value}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">
                      {c.renewal}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Badge tone={c.status === "Active" ? "success" : "warning"} dot>
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
