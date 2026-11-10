import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { CATEGORY_META, STATUS_META, type ApprovalRecord } from "./approvalData"

interface ApprovalListItemProps {
  item: ApprovalRecord
  active: boolean
  selected: boolean
  onOpen: () => void
  onToggleSelect: (on: boolean) => void
}

/** One request in the review queue: category tile, title, course and status. */
export default function ApprovalListItem({ item, active, selected, onOpen, onToggleSelect }: ApprovalListItemProps) {
  const meta = CATEGORY_META[item.category]
  const status = STATUS_META[item.status]
  const Icon = meta.icon
  const pending = item.status === "Pending"

  return (
    <li
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border px-3 py-3 transition-[background-color,border-color,box-shadow] duration-150",
        active
          ? "border-primary-border bg-primary-soft/40 shadow-[0_0_0_1px_var(--primary-border)]"
          : "border-border bg-surface hover:border-border-strong/60 hover:bg-surface-2/50",
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-y-3 left-0 w-[3px] rounded-r-full transition-opacity", meta.accent, active ? "opacity-100" : "opacity-0")} />

      <div className="flex h-10 items-center">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          disabled={!pending}
          aria-label={`Select ${item.title}`}
          className={cn(!pending && "invisible")}
        />
      </div>

      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none"
      >
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", meta.tile)}>
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">{meta.label}</span>
            <span className="ml-auto shrink-0 text-[11px] tabular-nums text-subtle-foreground">{item.submittedAt}</span>
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-foreground" title={item.title}>
            {item.title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            <span className="font-mono">{item.courseCode}</span> · {item.instructor}
          </span>
          <span className="mt-2 flex items-center gap-2">
            <Badge tone={status.tone} size="sm" dot={pending}>
              {status.label}
            </Badge>
          </span>
        </span>

        <ChevronRight
          className={cn("mt-3 h-4 w-4 shrink-0 text-subtle-foreground transition-transform", active ? "translate-x-0.5 text-primary-text" : "group-hover:translate-x-0.5")}
          aria-hidden="true"
        />
      </button>
    </li>
  )
}

