import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  Server,
  RefreshCw,
  Database,
  CheckCircle,
  AlertTriangle,
  Zap,
  Globe,
  Clock,
  Sparkles,
} from "lucide-react"
import Sparkline from "@/components/charts/Sparkline"
import type { useSuperAdminStore } from "@/data/adminStore"

interface PlatformHealthViewProps {
  store: ReturnType<typeof useSuperAdminStore>
  onToast: (msg: string) => void
}

export default function PlatformHealthView({ store, onToast }: PlatformHealthViewProps) {
  const { services, flushCache, triggerSnapshot } = store
  const [isFlushing, setIsFlushing] = useState(false)
  const [isSnapshotting, setIsSnapshotting] = useState(false)

  const handleFlush = () => {
    setIsFlushing(true)
    setTimeout(() => {
      flushCache()
      setIsFlushing(false)
      onToast("Global Redis & Edge Cache flushed across all clusters")
    }, 600)
  }

  const handleSnapshot = () => {
    setIsSnapshotting(true)
    setTimeout(() => {
      triggerSnapshot()
      setIsSnapshotting(false)
      onToast("Point-in-time PostgreSQL snapshot created with HMAC seal")
    }, 700)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-text">
            <Activity className="h-3.5 w-3.5" />
            Infrastructure & Cloud Reliability
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Platform Health & Telemetry
          </h1>
          <p className="text-sm text-muted-foreground">
            Distributed microservices, video transcoding pipelines, AI inference latencies, and edge caches
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFlush}
            disabled={isFlushing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isFlushing ? "animate-spin" : ""}`} />
            Flush Cache
          </Button>

          <Button
            size="sm"
            onClick={handleSnapshot}
            disabled={isSnapshotting}
            className="gap-1.5"
          >
            <Database className="h-4 w-4" />
            Trigger Snapshot
          </Button>
        </div>
      </div>

      {/* Global Edge Summary Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="text-xs text-muted-foreground">Global API Uptime</div>
          <div className="text-2xl font-bold text-success font-mono">99.98%</div>
          <div className="text-[11px] text-muted-foreground">Last 90 days rolling</div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="text-xs text-muted-foreground">Edge P95 Latency</div>
          <div className="text-2xl font-bold text-foreground font-mono">24ms</div>
          <div className="text-[11px] text-success">CloudFront + Fastify 5</div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="text-xs text-muted-foreground">Active Incidents</div>
          <div className="text-2xl font-bold text-foreground font-mono">0</div>
          <div className="text-[11px] text-success flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> All systems nominal
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="text-xs text-muted-foreground">Primary Database Node</div>
          <div className="text-2xl font-bold text-primary-text font-mono">5 Connections</div>
          <div className="text-[11px] text-muted-foreground">Pooler-safe max: 5/15</div>
        </div>
      </div>

      {/* Services Health Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {services.map((srv) => (
          <div
            key={srv.id}
            className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs hover:border-primary/40 transition-colors space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="outline" className="text-[10px] mb-1.5 font-normal bg-surface-2">
                    {srv.category}
                  </Badge>
                  <h3 className="text-sm font-bold text-foreground leading-snug">
                    {srv.name}
                  </h3>
                </div>

                <Badge
                  variant={srv.status === "Healthy" ? "default" : "destructive"}
                  className="text-xs"
                >
                  {srv.status}
                </Badge>
              </div>

              <div className="p-2.5 rounded-xl border border-border bg-surface-2 font-mono text-[11px] text-muted-foreground truncate">
                {srv.endpoint}
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
                <div>
                  <div className="text-[11px] text-muted-foreground">Uptime</div>
                  <div className="text-base font-bold text-success font-mono">
                    {srv.uptime}%
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-muted-foreground">Avg Latency</div>
                  <div className="text-base font-bold text-foreground font-mono">
                    {srv.latencyMs}ms
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Latency Sparkline (ms)</span>
                <span className="font-mono">{srv.latencyMs}ms</span>
              </div>
              <div className="h-8 w-full">
                <Sparkline data={srv.sparkline} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
