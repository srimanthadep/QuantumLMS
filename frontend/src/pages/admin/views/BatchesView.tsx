import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Layers,
  Plus,
  Calendar,
  Clock,
  Users,
  Video,
  Bot,
  MessageSquare,
  Award,
  Sparkles,
  AlertTriangle,
} from "lucide-react"
import type { useAdminStore } from "@/data/adminStore"

interface BatchesViewProps {
  store: ReturnType<typeof useAdminStore>
  onOpenCreateBatch: () => void
}

export default function BatchesView({ store, onOpenCreateBatch }: BatchesViewProps) {
  const { batches } = store
  const [filter, setFilter] = useState<string>("All")

  const filteredBatches = batches.filter((b) => {
    if (filter === "All") return true
    return b.status === filter
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Cohort Batches & Schedules
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage live cohorts, seat fill rates, broadcast timetables, and student entitlements
          </p>
        </div>

        <Button onClick={onOpenCreateBatch}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create Cohort Batch
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {["All", "Active", "Upcoming", "Completed"].map((st) => (
          <Button
            key={st}
            size="sm"
            variant={filter === st ? "default" : "ghost"}
            onClick={() => setFilter(st)}
            className="h-8 text-xs font-semibold"
          >
            {st} Batches
          </Button>
        ))}
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {filteredBatches.map((batch) => {
          const fillPct = Math.round((batch.enrolledSeats / batch.maxSeats) * 100)
          const isFull = fillPct >= 90

          return (
            <div
              key={batch.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs hover:border-primary/40 transition-colors space-y-4"
            >
              <div className="space-y-3">
                {/* Top Badge & Status */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold text-primary-text mb-1">
                      {batch.courseTitle}
                    </div>
                    <h3 className="text-lg font-bold text-foreground leading-snug">
                      {batch.name}
                    </h3>
                  </div>
                  <Badge
                    variant={
                      batch.status === "Active"
                        ? "default"
                        : batch.status === "Upcoming"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {batch.status}
                  </Badge>
                </div>

                {/* Schedule & Timing Info */}
                <div className="space-y-2 rounded-xl border border-border bg-surface-2 p-3 text-xs">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Clock className="h-3.5 w-3.5 text-primary-text" />
                    <span>{batch.schedule}</span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/60">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {batch.startDate} ➔ {batch.endDate}
                    </span>
                    <span className="font-semibold text-foreground">
                      Lead: {batch.instructor}
                    </span>
                  </div>
                </div>

                {/* Seat Capacity Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      Seat Capacity
                    </span>
                    <span className={`font-mono font-bold ${isFull ? "text-danger" : "text-foreground"}`}>
                      {batch.enrolledSeats} / {batch.maxSeats} ({fillPct}%)
                    </span>
                  </div>

                  <Progress
                    value={fillPct}
                    className={`h-2 ${isFull ? "[&>div]:bg-danger" : "[&>div]:bg-primary"}`}
                  />

                  {isFull && (
                    <div className="text-[11px] text-danger flex items-center gap-1 font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      Nearly full — consider creating a new cohort batch
                    </div>
                  )}
                </div>
              </div>

              {/* Entitlement Badges */}
              <div className="border-t border-border pt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <Badge variant="outline" className="gap-1 bg-surface-2">
                  <Video className="h-3 w-3 text-primary-text" />
                  {batch.deliveryMode}
                </Badge>

                {batch.features.liveChat && (
                  <Badge variant="outline" className="gap-1 bg-surface-2">
                    <MessageSquare className="h-3 w-3 text-emerald-500" />
                    Live Chat
                  </Badge>
                )}

                {batch.features.aiTutor && (
                  <Badge variant="outline" className="gap-1 bg-surface-2">
                    <Bot className="h-3 w-3 text-blue-500" />
                    Clover AI Tutor
                  </Badge>
                )}

                {batch.features.certificate && (
                  <Badge variant="outline" className="gap-1 bg-surface-2">
                    <Award className="h-3 w-3 text-amber-500" />
                    Verified Certificate
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

