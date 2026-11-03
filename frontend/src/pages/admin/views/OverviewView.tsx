import { useState } from "react"
import { StatCard } from "@/components/ui/StatCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Wallet,
  Users,
  Radio,
  TrendingUp,
  Layers,
  UserPlus,
  BookOpen,
  ArrowUpRight,
  Clock,
  AlertCircle,
  GraduationCap,
} from "lucide-react"
import AreaChart from "@/components/charts/AreaChart"
import type { useAdminStore } from "@/data/adminStore"

interface OverviewViewProps {
  store: ReturnType<typeof useAdminStore>
  onOpenCreateBatch: () => void
  onOpenManualEnrol: () => void
  onNavigate: (tabId: string) => void
}

export default function OverviewView({
  store,
  onOpenCreateBatch,
  onOpenManualEnrol,
  onNavigate,
}: OverviewViewProps) {
  const { courses, batches, students, orders } = store

  const totalRevenue = orders
    .filter((o) => o.status === "Paid")
    .reduce((sum, o) => sum + o.amount, 0)
  const activeStudents = students.filter((s) => s.status === "Active").length
  const totalEnrolments = students.length

  // Trajectory sample data for AreaChart
  const revenueHistory = [
    { label: "Jun", value: 12.4 },
    { label: "Jul", value: 14.8 },
    { label: "Aug", value: 13.9 },
    { label: "Sep", value: 16.5 },
    { label: "Oct", value: 18.2 },
    { label: "Nov", value: 24.3 },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Executive Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Live operations, cohort capacity, tuition revenue and student lifecycle
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={onOpenManualEnrol}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Manual Enrol
          </Button>
          <Button size="sm" onClick={onOpenCreateBatch}>
            <Layers className="mr-1.5 h-4 w-4" />
            New Cohort Batch
          </Button>
        </div>
      </div>

      {/* KPI StatCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="trend"
          title="Tuition Revenue (Nov)"
          value="₹18,45,000"
          trend="+18.4% vs last month"
          tone="lime"
          subtitle="Gross collected via Razorpay & Stripe"
        />
        <StatCard
          icon="users"
          title="Active Learners"
          value={totalEnrolments > 0 ? (totalEnrolments * 240).toLocaleString("en-IN") : "1,480"}
          trend="+124 this week"
          tone="lavender"
          subtitle="Across 11 active cohorts"
        />
        <StatCard
          icon="activity"
          title="Live Classes This Week"
          value="18 Sessions"
          trend="6 classes today"
          tone="pink"
          subtitle="Average 94% live attendance"
        />
        <StatCard
          icon="award"
          title="Avg. Completion Rate"
          value="84.6%"
          trend="+4.2% pace"
          tone="yellow"
          subtitle="Industry benchmark: 15%"
        />
      </div>

      {/* Main Grid: Revenue Trajectory & Cohort Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Trajectory */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Tuition Revenue Trajectory</h2>
              <p className="text-xs text-muted-foreground">Monthly gross receipts in Lakhs (₹)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-success">+34% YoY Growth</span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <AreaChart
              labels={revenueHistory.map((r) => r.label)}
              series={[{ name: "Gross Revenue", values: revenueHistory.map((r) => r.value) }]}
              formatValue={(v) => `₹${v}L`}
              height={240}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Total Paid Orders</div>
              <div className="text-lg font-bold text-foreground">{orders.filter((o) => o.status === "Paid").length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Avg. Order Value</div>
              <div className="text-lg font-bold text-primary-text font-mono">₹41,800</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Refund Rate</div>
              <div className="text-lg font-bold text-success font-mono">0.8%</div>
            </div>
          </div>
        </div>

        {/* Cohort Seat Capacity Watch */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Seat Fill Watch</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary-text hover:text-primary-hover p-0 h-auto"
                onClick={() => onNavigate("batches")}
              >
                View all
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cohorts nearing maximum capacity requiring seat cap extension
            </p>

            <div className="space-y-3.5">
              {batches.map((batch) => {
                const pct = Math.round((batch.enrolledSeats / batch.maxSeats) * 100)
                const isUrgent = pct >= 90

                return (
                  <div key={batch.id} className="space-y-1.5 p-3 rounded-xl border border-border bg-surface-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground truncate max-w-[180px]">
                        {batch.name}
                      </span>
                      <Badge variant={isUrgent ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {pct}% FULL
                      </Badge>
                    </div>

                    <Progress value={pct} className="h-1.5" />

                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{batch.instructor}</span>
                      <span className="font-mono">
                        {batch.enrolledSeats} / {batch.maxSeats} seats
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-primary-border bg-primary-soft p-3 text-xs text-primary-text flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>GenAI Cohort 14 has 12 seats remaining before registration closes.</span>
          </div>
        </div>
      </div>

      {/* Secondary Row: Top AI Courses & Recent Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Courses */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Top Performing Courses</h2>
              <p className="text-xs text-muted-foreground">Ranked by enrolment volume and learner rating</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate("courses")}
              className="text-xs"
            >
              Full Catalog
            </Button>
          </div>

          <div className="space-y-3">
            {courses.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2 hover:bg-surface-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-text font-bold text-xs">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm leading-tight">{c.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>Instructor: {c.instructor}</span>
                      <span>·</span>
                      <span className="text-warning font-semibold">★ {c.rating}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-foreground font-mono">
                    ₹{c.price.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {c.enrolledStudents} enrolled
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders & Transactions */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Recent Tuition Transactions</h2>
              <p className="text-xs text-muted-foreground">Real-time payment gateway settlements</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate("orders")}
              className="text-xs"
            >
              All Orders
            </Button>
          </div>

          <div className="space-y-3">
            {orders.slice(0, 4).map((ord) => (
              <div
                key={ord.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{ord.studentName}</span>
                    <Badge variant={ord.status === "Paid" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                      {ord.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                    {ord.courseTitle} · {ord.method}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-foreground font-mono">
                    ₹{ord.amount.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{ord.date.split(" ")[0]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
