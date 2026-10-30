import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type IconTone = "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "neutral"

export const ICON_TONE: Record<IconTone, string> = {
  primary: "bg-primary-soft text-primary-text ring-primary-border",
  secondary: "bg-secondary-soft text-secondary-text ring-secondary/20",
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  danger: "bg-danger-soft text-danger ring-danger/20",
  info: "bg-info-soft text-info ring-info/20",
  neutral: "bg-surface-2 text-muted-foreground ring-border",
}

interface IconTileProps {
  icon: LucideIcon
  tone?: IconTone
  size?: "sm" | "md" | "lg"
  className?: string
}

/** Tinted square that holds a section or row icon. Decorative: the text next to it carries the meaning. */
export default function IconTile({ icon: Icon, tone = "primary", size = "md", className }: IconTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
        size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8",
        ICON_TONE[tone],
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
    </span>
  )
}
