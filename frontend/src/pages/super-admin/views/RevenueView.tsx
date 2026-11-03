import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Building2,
  BookOpen,
  ArrowUpRight,
} from "lucide-react"
import AreaChart from "@/components/charts/AreaChart"
import type { useSuperAdminStore } from "@/data/adminStore"

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-text">
            <Wallet className="h-3.5 w-3.5" />
            Financial Engine & Enterprise Contracts
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Platform Revenue & Run-Rate
          </h1>
          <p className="text-sm text-muted-foreground">
            Monthly recurring receipts, institutional cohort contracts, and gateway reconciliation
          </p>
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-1">
          <div className="text-xs text-muted-foreground">Monthly Recurring Run-Rate (MRR)</div>
          <div className="text-2xl font-bold text-foreground font-mono">₹26,80,000</div>
          <div className="text-[11px] text-success font-medium">+11.2% MoM Expansion</div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-1">
          <div className="text-xs text-muted-foreground">Annualized Run-Rate (ARR)</div>
          <div className="text-2xl font-bold text-primary-text font-mono">₹3.21 Crores</div>
          <div className="text-[11px] text-muted-foreground">Combined consumer & B2B contracts</div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-1">
          <div className="text-xs text-muted-foreground">Gateway Settlement Health</div>
          <div className="text-2xl font-bold text-success font-mono">99.9% Success</div>
          <div className="text-[11px] text-muted-foreground">Razorpay T+1 + Stripe Connect</div>
        </div>
      </div>

      {/* Growth AreaChart */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">MRR Trajectory (2026)</h2>
            <p className="text-xs text-muted-foreground">Platform gross billing in Lakhs (₹)</p>
          </div>
          <Badge variant="outline" className="text-success font-semibold">
            +88.7% Year-to-Date
          </Badge>
        </div>

        <div className="h-64 w-full pt-2">
          <AreaChart
            labels={mrrTrajectory.map((m) => m.label)}
            series={[{ name: "Platform MRR", values: mrrTrajectory.map((m) => m.value) }]}
            formatValue={(v) => `₹${v}L`}
            height={240}
          />
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-foreground">Enterprise Cohort Contracts</h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
              <div>
                <div className="font-semibold text-foreground">Bengaluru Tech Hub · AI Cohort</div>
                <div className="text-muted-foreground">640 Learners · Multi-track</div>
              </div>
              <div className="text-right font-mono font-bold text-foreground">
                ₹8,50,000 / mo
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
              <div>
                <div className="font-semibold text-foreground">NeoCorp Enterprise AI Lab</div>
                <div className="text-muted-foreground">420 Learners · LLM & MLOps</div>
              </div>
              <div className="text-right font-mono font-bold text-foreground">
                ₹6,20,000 / mo
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
              <div>
                <div className="font-semibold text-foreground">Singularity AI Research Guild</div>
                <div className="text-muted-foreground">280 Learners · Agentic Systems</div>
              </div>
              <div className="text-right font-mono font-bold text-foreground">
                ₹4,80,000 / mo
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-foreground">Consumer Tuition Breakdown</h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
              <div>
                <div className="font-semibold text-foreground">Generative AI Engineering (Cohort 14)</div>
                <div className="text-muted-foreground">Tuition ₹44,999 · 88 Enrolled</div>
              </div>
              <div className="text-right font-mono font-bold text-primary-text">
                ₹39,59,912
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
              <div>
                <div className="font-semibold text-foreground">LLM Engineering in Production (Cohort 6)</div>
                <div className="text-muted-foreground">Tuition ₹49,999 · 94 Enrolled</div>
              </div>
              <div className="text-right font-mono font-bold text-primary-text">
                ₹46,99,906
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
              <div>
                <div className="font-semibold text-foreground">Agentic Systems Bootcamp</div>
                <div className="text-muted-foreground">Tuition ₹39,999 · 62 Enrolled</div>
              </div>
              <div className="text-right font-mono font-bold text-primary-text">
                ₹24,79,938
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
