import { cn } from "@/lib/utils"

interface DateTileProps {
  month: string
  day: string
  /** `live` tints the tile red, `accent` uses the primary tint. */
  tone?: "default" | "accent" | "live"
  size?: "sm" | "md"
  className?: string
}

/** Calendar-style month/day tile for schedules, events and due dates. */
export default function DateTile({ month, day, tone = "default", size = "md", className }: DateTileProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-md border text-center",
        size === "md" ? "h-12 w-12" : "h-10 w-10",
        tone === "live"
          ? "border-danger/30 bg-danger-soft"
          : tone === "accent"
            ? "border-primary-border bg-primary-soft"
            : "border-border bg-surface",
        className,
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "text-[9px] font-semibold uppercase leading-3 tracking-wider",
          tone === "live" ? "text-danger" : tone === "accent" ? "text-primary-text" : "text-subtle-foreground",
        )}
      >
        {month}
      </span>
      <span className={cn("font-semibold tabular-nums text-foreground", size === "md" ? "text-base leading-5" : "text-sm leading-4")}>{day}</span>
    </div>
  )
}
