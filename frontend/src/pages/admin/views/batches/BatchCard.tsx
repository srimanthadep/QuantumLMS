import type { LucideIcon } from "lucide-react"
import { ArrowUpRight, CalendarDays, Clock3, Video } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { AdminBatch } from "@/data/adminStore"
import { cn } from "@/lib/utils"
import BatchActionsMenu from "./BatchActionsMenu"
import {
  BATCH_STATUS_TONE,
  SHORT_DELIVERY_MODE,
  formatShortDateRange,
  seatTone,
  seatUtilization,
} from "./batchTheme"
interface BatchCardProps {
  batch: AdminBatch
  theme: { icon: LucideIcon; gradient: string }
  onOpen: () => void
  onEdit: () => void
  onDuplicate: () => void
  onToggleArchive: () => void
  onDelete: () => void
}
export default function BatchCard({
  batch,
  theme,
  onOpen,
  onEdit,
  onDuplicate,
  onToggleArchive,
  onDelete,
}: BatchCardProps) {
  const Icon = theme.icon
  const pct = seatUtilization(batch.enrolledSeats, batch.maxSeats)
  const available = Math.max(0, batch.maxSeats - batch.enrolledSeats)
  const accepting = batch.status === "Active" || batch.status === "Upcoming"
  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xs transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary-border hover:shadow-md focus-within:border-primary-border">
      <div className={cn("relative h-28 overflow-hidden bg-gradient-to-br", theme.gradient)}>
        <Icon className="absolute -bottom-4 -right-3 h-28 w-28 rotate-[-8deg] text-white/20 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" aria-hidden="true" />
        <Badge tone={BATCH_STATUS_TONE[batch.status]} dot className="absolute left-3 top-3 bg-surface/95 backdrop-blur">{batch.status}</Badge>
        <div className="absolute right-2 top-2 z-10 rounded-lg bg-surface/95 backdrop-blur">
          <BatchActionsMenu batch={batch} onOpenWorkspace={onOpen} onEdit={onEdit} onDuplicate={onDuplicate} onToggleArchive={onToggleArchive} onDelete={onDelete} />
        </div>
        <span className="absolute bottom-3 left-3 max-w-[85%] truncate rounded-full bg-black/40 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">{batch.courseTitle}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-[15px] font-semibold leading-5 text-foreground">
          <button
            type="button"
            onClick={onOpen}
            className="text-left after:absolute after:inset-0 after:rounded-xl hover:text-primary-text focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
            aria-label={`Open ${batch.name}`}
          >
            {batch.name}
          </button>
        </h3>
        <div className="my-4 space-y-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-2.5">
            <CalendarDays
              className="h-3.5 w-3.5 shrink-0 text-subtle-foreground"
              aria-hidden="true"
            />
            {formatShortDateRange(batch.startDate, batch.endDate)}
          </p>
          <p className="flex items-start gap-2.5">
            <Clock3
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle-foreground"
              aria-hidden="true"
            />
            <span className="leading-relaxed">
              {batch.schedule || "Flexible schedule"}
            </span>
          </p>
        </div>
        <div className="mt-auto flex items-center gap-2.5 border-t border-border pt-4">
          <Avatar
            src={batch.instructorAvatar}
            name={batch.instructor}
            size="xs"
          />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
            {batch.instructor || "Instructor not assigned"}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            <Video className="h-3 w-3" aria-hidden="true" />
            {SHORT_DELIVERY_MODE[batch.deliveryMode]}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              <strong className="font-semibold tabular-nums text-foreground">
                {batch.enrolledSeats}
              </strong>{" "}
              / {batch.maxSeats} enrolled
            </span>
            <span
              className={cn(
                "font-medium tabular-nums",
                accepting && pct >= 85
                  ? "text-warning"
                  : "text-subtle-foreground",
              )}
            >
              {accepting
                ? available === 0
                  ? "At capacity"
                  : `${available} seats left`
                : `${pct}% filled`}
            </span>
          </div>
          <Progress
            value={pct}
            size="xs"
            tone={accepting ? seatTone(pct) : "primary"}
            label={`${batch.name} seat capacity`}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 rounded-b-2xl border-t border-border bg-surface-2/35 px-4 py-3">
        <span
          className={cn(
            "text-[11px]",
            batch.waitlistedSeats > 0
              ? "font-medium text-warning"
              : "text-subtle-foreground",
          )}
        >
          {batch.waitlistedSeats > 0
            ? `${batch.waitlistedSeats} on waitlist`
            : accepting
              ? "No waitlisted learners"
              : "Enrollment closed"}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground transition-colors group-hover:text-primary-text">
          Manage batch{" "}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </article>
  )
}
