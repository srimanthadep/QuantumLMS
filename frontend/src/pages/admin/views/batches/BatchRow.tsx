import type { LucideIcon } from "lucide-react"
import { Video } from "lucide-react"
import CourseCover from "@/components/shared/CourseCover"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import type { AdminBatch } from "@/data/adminStore"
import { cn } from "@/lib/utils"
import BatchActionsMenu from "./BatchActionsMenu"
import { batchPriceLabel, batchStatusTone, batchTimeline, formatShortDateRange, safeHref, SHORT_DELIVERY_MODE, seatTone, seatUtilization } from "./batchTheme"

interface BatchRowProps {
  batch: AdminBatch
  theme: { icon: LucideIcon; category?: string }
  onOpen: () => void
  onEdit: () => void
  onDuplicate: () => void
  onToggleArchive: () => void
  onDelete: () => void
  /** Select mode: a leading checkbox cell, and a click ticks the row instead of opening it. */
  selecting?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}

/** Dense table row for the batches list view. The whole row opens the batch page. */
export default function BatchRow({ batch, theme, onOpen, onEdit, onDuplicate, onToggleArchive, onDelete, selecting = false, selected = false, onToggleSelect }: BatchRowProps) {
  const pct = seatUtilization(batch.enrolledSeats, batch.maxSeats)
  const meetingHref = safeHref(batch.meetingUrl)
  const timeline = batchTimeline(batch)
  return (
    <tr
      role="button"
      tabIndex={0}
      aria-label={selecting ? `Select ${batch.name}` : `Open ${batch.name}`}
      aria-pressed={selecting ? selected : undefined}
      onClick={selecting ? onToggleSelect : onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          if (selecting) onToggleSelect?.()
          else onOpen()
        }
      }}
      className={cn("group cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-surface-2/70 focus-visible:bg-surface-2 focus-visible:outline-none", selected && "bg-primary-soft/60 hover:bg-primary-soft/70")}
    >
      {selecting && (
        <td className="w-10 pl-4 pr-0">
          <Checkbox checked={selected} onCheckedChange={() => {}} tabIndex={-1} aria-hidden="true" className="pointer-events-none" />
        </td>
      )}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <CourseCover title={batch.name} category={theme.category} showTitle={false} hoverZoom={false} className="aspect-auto h-10 w-16 shrink-0 rounded-md" />
          <div className="min-w-0">
            <p className="max-w-[240px] truncate text-sm font-semibold text-foreground group-hover:text-primary-text">{batch.name}</p>
            <p className="max-w-[240px] truncate text-caption text-muted-foreground">
              {batchPriceLabel(batch.price)}
              {batch.courseTitle ? ` · ${batch.courseTitle}` : ""}
            </p>
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-3 md:table-cell">
        <div className="flex items-center gap-2 text-caption text-foreground">
          <Avatar src={batch.instructorAvatar || undefined} name={batch.instructor || "?"} size="xs" />
          <span className="max-w-[140px] truncate">{batch.instructor || "Not assigned"}</span>
        </div>
      </td>
      <td className="hidden px-3 py-3 text-caption lg:table-cell">
        <div className="font-medium text-foreground">{formatShortDateRange(batch.startDate, batch.endDate)}</div>
        <div className={cn("max-w-[200px] truncate", timeline.phase === "running" ? "text-success" : "text-muted-foreground")}>{timeline.label}</div>
      </td>
      <td className="px-3 py-3">
        <div className="w-32 space-y-1.5">
          <div className="flex items-center justify-between text-caption tabular-nums">
            <span className="font-medium text-foreground">
              {batch.enrolledSeats} / {batch.maxSeats}
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} size="xs" tone={seatTone(pct)} label={`${batch.name} seats`} />
          {batch.waitlistedSeats > 0 && <div className="text-[11px] font-medium text-warning">+{batch.waitlistedSeats} waitlisted</div>}
        </div>
      </td>
      <td className="hidden px-3 py-3 text-caption sm:table-cell">
        <div className="font-medium text-foreground">{SHORT_DELIVERY_MODE[batch.deliveryMode]}</div>
        {meetingHref ? (
          <a
            href={meetingHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-text hover:underline"
          >
            <Video className="h-3 w-3" aria-hidden="true" /> Class link
          </a>
        ) : (
          <span className="text-[11px] text-muted-foreground">{batch.schedule || batch.timezone}</span>
        )}
      </td>
      <td className="px-3 py-3">
        <Badge tone={batchStatusTone(batch)} dot>
          {batch.lifecycle ?? batch.status}
        </Badge>
      </td>
      <td className="py-3 pl-2 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
        {!selecting && <BatchActionsMenu batch={batch} onOpenWorkspace={onOpen} onEdit={onEdit} onDuplicate={onDuplicate} onToggleArchive={onToggleArchive} onDelete={onDelete} />}
      </td>
    </tr>
  )
}
