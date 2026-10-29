import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

export type BadgeTone = "neutral" | "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "live"

const badgeVariants = cva(
  "inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-2 text-muted-foreground",
        primary: "border-primary-border bg-primary-soft text-primary-text",
        secondary: "border-transparent bg-secondary-soft text-secondary-text",
        success: "border-transparent bg-success-soft text-success",
        warning: "border-transparent bg-warning-soft text-warning",
        danger: "border-transparent bg-danger-soft text-danger",
        info: "border-transparent bg-info-soft text-info",
        live: "border-transparent bg-danger text-white shadow-[0_0_16px_-2px_color-mix(in_srgb,var(--danger)_70%,transparent)] dark:text-ink-950",
      },
      size: {
        sm: "px-1.5 py-0 text-[10px]",
        md: "",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
)

/** Legacy `variant` names map onto tones. */
const VARIANT_TO_TONE: Record<string, BadgeTone> = {
  default: "neutral",
  secondary: "neutral",
  outline: "neutral",
  destructive: "danger",
  success: "success",
  warning: "warning",
  info: "info",
  accent: "primary",
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** @deprecated use `tone` */
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "accent"
  /** Leading status dot (pulses for the live tone). */
  dot?: boolean
}

function Badge({ className, tone, variant, size, dot, children, ...props }: BadgeProps) {
  const resolved: BadgeTone = tone ?? (variant ? VARIANT_TO_TONE[variant] : "neutral")
  return (
    <span className={cn(badgeVariants({ tone: resolved, size }), className)} {...props}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          {resolved === "live" && (
            <span className="absolute inline-flex h-full w-full animate-[q-pulse-ring_1.4s_ease-out_infinite] rounded-full bg-current" />
          )}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
export default Badge
