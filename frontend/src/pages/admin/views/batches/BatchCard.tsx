import type { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"
import { ArrowRight, CalendarDays, Clock3, Hourglass } from "lucide-react"
import CourseCover from "@/components/shared/CourseCover"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { AdminBatch } from "@/data/adminStore"
import { transition } from "@/lib/motion"
import { cn } from "@/lib/utils"
import BatchActionsMenu from "./BatchActionsMenu"
import { batchPriceLabel, batchStatusTone, batchTimeline, formatShortDateRange, SHORT_DELIVERY_MODE, seatTone, seatUtilization } from "./batchTheme"

interface BatchCardProps {
  batch: AdminBatch
  theme: { icon: LucideIcon; gradient?: string; category?: string }
  onOpen: () => void
  onEdit: () => void
  onDuplicate: () => void
  onToggleArchive: () => void
  onDelete: () => void
  className?: string
  /** React 19 passes `ref` as a prop; AnimatePresence popLayout needs it on the DOM node. */
  ref?: React.Ref<HTMLDivElement>
}

const CHIP =
  "rounded-full border border-white/15 bg-ink-950/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm"

/** Start date as a small calendar tile: month over day. */
function DateTile({ iso }: { iso: string }) {
  const d = iso ? new Date(`${iso}T00:00:00`) : null
  const valid = d && !Number.isNaN(d.getTime())
  return (
    <div className="flex h-12 w-11 shrink-0 flex-col overflow-hidden rounded-md border border-border bg-surface text-center shadow-[var(--elev-xs)]" aria-hidden="true">
      <span className="bg-primary py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-foreground">
        {valid ? d!.toLocaleDateString("en-IN", { month: "short" }) : "TBD"}
      </span>
      <span className="flex flex-1 items-center justify-center text-base font-semibold tabular-nums leading-none text-foreground">{valid ? d!.getDate() : "–"}</span>
    </div>
  )
}

/** Batch tile in the learner card style. The whole tile opens the batch page. */
export default function BatchCard({ batch, theme, onOpen, onEdit, onDuplicate, onToggleArchive, onDelete, className, ref }: BatchCardProps) {
  const pct = seatUtilization(batch.enrolledSeats, batch.maxSeats)
  const available = Math.max(0, batch.maxSeats - batch.enrolledSeats)
  const accepting = batch.status === "Active" || batch.status === "Upcoming"
  const timeline = batchTimeline(batch)

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: transition.fast }}
      transition={transition.base}
      role="button"
      tabIndex={0}
      aria-label={`Open ${batch.name}, ${batch.enrolledSeats} of ${batch.maxSeats} seats filled`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        "group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--elev-xs)] transition-[translate,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-border-strong/60 hover:shadow-[var(--elev-md)]",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30",
        className,
      )}
    >
      <CourseCover title={batch.name} category={theme.category} showTitle={false} className={cn("aspect-[16/6]", batch.status === "Archived" && "grayscale-[60%]")}>
        <span className={cn(CHIP, "absolute left-3 top-3 z-10 max-w-[70%] truncate")} title={batch.courseTitle ? `Topic: ${batch.courseTitle}` : undefined}>
          {batchPriceLabel(batch.price)}{batch.courseTitle ? ` · ${batch.courseCode || batch.courseTitle}` : ""}
        </span>
        <div className="absolute right-2.5 top-2.5 z-10">
          <BatchActionsMenu batch={batch} onCover onOpenWorkspace={onOpen} onEdit={onEdit} onDuplicate={onDuplicate} onToggleArchive={onToggleArchive} onDelete={onDelete} />
        </div>
        <div className="absolute bottom-3 left-3 z-10">
          <Badge tone={batchStatusTone(batch)} dot className="bg-ink-950/75 text-white ring-1 ring-white/15 backdrop-blur-md">
            {batch.lifecycle ?? batch.status}
          </Badge>
        </div>
      </CourseCover>

      <div className="flex flex-1 flex-col gap-3.5 p-4">
        <div className="flex items-start gap-3">
          <DateTile iso={batch.startDate} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold text-foreground" title={batch.name}>
              {batch.name}
            </h3>
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <Avatar src={batch.instructorAvatar || undefined} name={batch.instructor || "?"} size="xs" />
              <p className="min-w-0 truncate text-caption text-muted-foreground" title={batch.instructor}>
                {batch.instructor || "No instructor"} · {SHORT_DELIVERY_MODE[batch.deliveryMode]}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-caption text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
            <span className="truncate">{formatShortDateRange(batch.startDate, batch.endDate)}</span>
          </p>
          <p className="flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
            <span className="truncate">{batch.schedule || "Schedule not set"}</span>
          </p>
          <p className="flex items-center gap-2">
            <Hourglass className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
            <span className={cn("truncate", timeline.phase === "running" && "font-medium text-foreground")}>{timeline.label}</span>
            {timeline.phase === "running" && timeline.pct !== null && (
              <span className="ml-auto h-1 w-16 shrink-0 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                <span className="block h-full rounded-full bg-success" style={{ width: `${timeline.pct}%` }} />
              </span>
            )}
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-caption">
            <span className="text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{batch.enrolledSeats}</span> / <span className="tabular-nums">{batch.maxSeats}</span> seats
            </span>
            <span className={cn("font-semibold tabular-nums", accepting && pct >= 100 ? "text-danger" : accepting && pct >= 85 ? "text-warning" : "text-foreground")}>
              {accepting ? (available === 0 ? "Full" : `${available} left`) : `${pct}%`}
            </span>
          </div>
          <Progress value={pct} size="xs" tone={accepting ? seatTone(pct) : "primary"} label={`${batch.name} seats filled`} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <p className={cn("min-w-0 truncate text-caption", batch.waitlistedSeats > 0 ? "font-medium text-warning" : "text-subtle-foreground")}>
            {batch.waitlistedSeats > 0 ? `${batch.waitlistedSeats} on waitlist` : accepting ? "No waitlist" : "Enrollment closed"}
          </p>
          <span className="flex shrink-0 items-center gap-1 text-caption font-medium text-primary-text">
            {accepting ? "Manage" : "Review"}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </motion.div>
  )
}
