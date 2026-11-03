import { useState } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  RefreshCw,
  Server,
  Sparkles,
  Zap,
} from "lucide-react"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  StatCard,
} from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import Sparkline from "@/components/charts/Sparkline"
import type { MetricItem } from "@/types"
import type { useSuperAdminStore } from "@/data/adminStore"
import { cn } from "@/lib/utils"

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

  const kpis: MetricItem[] = [
    {
      icon: "trend",
      label: "Global API Uptime",
      value: "99.98%",
      trend: "Last 90 days rolling",
      tone: "lime",
    },
    {
      icon: "fire",
      label: "Edge P95 Latency",
      value: "24ms",
      trend: "CloudFront + Fastify 5",
      tone: "lavender",
    },
    {
      icon: "star",
      label: "PostgreSQL Pool",
      value: "3 / 5",
      trend: "Session pooler active",
      tone: "yellow",
    },
    {
      icon: "users",
      label: "AI Inference P95",
      value: "420ms",
      trend: "Streaming responses",
      tone: "pink",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Platform Health & Telemetry"
        description="Distributed microservices, video transcoding pipelines, AI inference latencies, and edge caches."
        breadcrumb={[{ label: "Platform Console", href: "/super-admin" }, { label: "Platform Health" }]}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFlush}
              disabled={isFlushing}
            >
              <RefreshCw className={cn("mr-1.5 h-4 w-4", isFlushing && "animate-spin")} />
              Flush Cache
            </Button>
            <Button
              size="sm"
              onClick={handleSnapshot}
              disabled={isSnapshotting}
            >
              <Database className="mr-1.5 h-4 w-4" />
              Trigger Snapshot
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

      {/* Microservices Health Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Cluster Infrastructure</h3>
          <span className="text-xs text-muted-foreground">Auto-refreshing every 15s</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const isDegraded = service.status === "Degraded"
            return (
              <Card key={service.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold">{service.name}</CardTitle>
                      <CardDescription className="text-xs font-mono truncate">{service.endpoint}</CardDescription>
                    </div>
                    <Badge tone={isDegraded ? "warning" : "success"} dot>
                      {service.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Latency</span>
                    <span className="font-mono font-semibold text-foreground">{service.latencyMs}ms</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">90-Day Uptime</span>
                    <span className="font-mono font-semibold text-success">{service.uptime}%</span>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <span>24h Latency Profile</span>
                      <span className="font-mono">{service.sparkline[service.sparkline.length - 1]}ms</span>
                    </div>
                    <div className="h-8 w-full">
                      <Sparkline
                        data={service.sparkline}
                        stroke={isDegraded ? "var(--warning)" : "var(--success)"}
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
