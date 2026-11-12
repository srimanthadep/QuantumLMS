import type { LucideIcon } from "lucide-react"
import { Video } from "lucide-react"
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
  safeHref,
  seatTone,
  seatUtilization,
} from "./batchTheme"
interface BatchRowProps {
  batch: AdminBatch
  theme: { icon: LucideIcon }
  onOpen: () => void
  onEdit: () => void
  onDuplicate: () => void
  onToggleArchive: () => void
  onDelete: () => void
}
/** Dense table row for cohort batches list view, matching CourseRow. */
export default function BatchRow({
  batch,
  theme,
  onOpen,
  onEdit,
  onDuplicate,
  onToggleArchive,
  onDelete,
}: BatchRowProps) {
  const Icon = theme.icon
  const pct = seatUtilization(batch.enrolledSeats, batch.maxSeats)
  const meetingHref = safeHref(batch.meetingUrl)
  return (
    <tr className="group border-b border-border transition-colors last:border-b-0 hover:bg-surface-2/60">
      <td className="py-4 pl-4 pr-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary-text",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <button
              type="button"
              onClick={onOpen}
              className="rounded text-left font-semibold text-foreground hover:text-primary-text"
              aria-label={`Open ${batch.name}`}
            >
              {batch.name}
            </button>
            <div className="truncate text-xs text-muted-foreground">
              {batch.courseTitle}
              {batch.courseCode ? ` · ${batch.courseCode}` : ""}
            </div>
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-4 md:table-cell">
        <div className="flex items-center gap-2 text-xs text-foreground">
          <Avatar
            src={batch.instructorAvatar}
            name={batch.instructor}
            size="xs"
          />
          <span className="truncate">{batch.instructor}</span>
        </div>
      </td>
      <td className="hidden px-3 py-4 text-xs lg:table-cell">
        <div className="font-medium text-foreground">
          {formatShortDateRange(batch.startDate, batch.endDate)}
        </div>
        <div className="max-w-[200px] truncate text-muted-foreground">
          {batch.schedule}
        </div>
      </td>
      <td className="px-3 py-4">
        <div className="w-32 space-y-1">
          <div className="flex items-center justify-between text-xs tabular-nums">
            <span className="font-medium text-foreground">
              {batch.enrolledSeats}/{batch.maxSeats}
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <Progress
            value={pct}
            size="xs"
            tone={seatTone(pct)}
            label={`${batch.name} seats`}
          />
          {batch.waitlistedSeats > 0 && (
            <div className="text-[11px] font-medium text-warning">
              +{batch.waitlistedSeats} waitlisted
            </div>
          )}
        </div>
      </td>
      <td className="hidden px-3 py-4 text-xs sm:table-cell">
        <div className="font-medium text-foreground">
          {SHORT_DELIVERY_MODE[batch.deliveryMode]}
        </div>
        {meetingHref ? (
          <a
            href={meetingHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-text hover:underline"
          >
            <Video className="h-3 w-3" /> Live link
          </a>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {batch.timezone}
          </span>
        )}
      </td>
      <td className="px-3 py-4">
        <Badge tone={BATCH_STATUS_TONE[batch.status]} dot>
          {batch.lifecycle ?? batch.status}
        </Badge>
      </td>
      <td
        className="py-4 pl-2 pr-4 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <BatchActionsMenu
          batch={batch}
          onOpenWorkspace={onOpen}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onToggleArchive={onToggleArchive}
          onDelete={onDelete}
        />
      </td>
    </tr>
  )
}
