import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Building2,
  Globe,
  Bot,
  Users,
  Search,
  CheckCircle,
  Plus,
  Mail,
} from "lucide-react"
import type { useSuperAdminStore } from "@/data/adminStore"

interface TenantsViewProps {
  store: ReturnType<typeof useSuperAdminStore>
}

export default function TenantsView({ store }: TenantsViewProps) {
  const { tenants } = store
  const [search, setSearch] = useState("")

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase()) ||
      t.contactPerson.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Enterprise Tenants & Cohort Hubs
          </h1>
          <p className="text-sm text-muted-foreground">
            Multi-tenant organization partitioning, AI token quotas, and cloud region mappings
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tenant by name or hub..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {filteredTenants.map((tenant) => {
          const quotaPct = Math.round(
            (tenant.aiTokensUsedMonthly / tenant.aiTokenLimitMonthly) * 100
          )
          const isNearCap = quotaPct >= 85

          return (
            <div
              key={tenant.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs hover:border-primary/40 transition-colors space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="text-[10px] mb-1 font-normal bg-surface-2">
                      {tenant.type}
                    </Badge>
                    <h3 className="text-base font-bold text-foreground leading-snug">
                      {tenant.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Globe className="h-3 w-3" />
                      <span>{tenant.location}</span>
                      <span>·</span>
                      <span className="font-mono text-[11px] text-primary-text">{tenant.cloudRegion}</span>
                    </div>
                  </div>

                  <Badge
                    variant={tenant.status === "Active" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {tenant.status}
                  </Badge>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                  <div className="rounded-xl border border-border bg-surface-2 p-2.5">
                    <div className="text-[11px] text-muted-foreground">Active Learners</div>
                    <div className="text-lg font-bold text-foreground font-mono">
                      {tenant.learnersCount}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-surface-2 p-2.5">
                    <div className="text-[11px] text-muted-foreground">Subscribed Courses</div>
                    <div className="text-lg font-bold text-primary-text font-mono">
                      {tenant.coursesSubscribed} Tracks
                    </div>
                  </div>
                </div>

                {/* AI Token Quota Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Bot className="h-3.5 w-3.5 text-primary-text" />
                      Monthly AI Token Quota
                    </span>
                    <span className={`font-mono font-bold ${isNearCap ? "text-danger" : "text-foreground"}`}>
                      {(tenant.aiTokensUsedMonthly / 1000000).toFixed(1)}M / {(tenant.aiTokenLimitMonthly / 1000000).toFixed(1)}M ({quotaPct}%)
                    </span>
                  </div>

                  <Progress
                    value={quotaPct}
                    className={`h-2 ${isNearCap ? "[&>div]:bg-danger" : "[&>div]:bg-primary"}`}
                  />
                </div>
              </div>

              {/* Contact Footer */}
              <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{tenant.contactPerson}</span>
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Mail className="h-3 w-3" />
                  {tenant.contactEmail}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
