import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { duration, ease } from "@/lib/motion"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-100 */
  value: number
  tone?: "primary" | "success" | "warning" | "danger" | "info"
  size?: "xs" | "sm" | "md"
  label?: string
}

const TONES = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
}

/** Progress bar; the fill animates with scaleX (transform only). */
function Progress({ value, tone = "primary", size = "sm", label, className, ...props }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-border",
        size === "xs" ? "h-1" : size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
      {...props}
    >
      <motion.div
        className={cn("h-full w-full origin-left rounded-full", TONES[tone])}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: pct / 100 }}
        transition={{ duration: duration.slow * 2, ease: ease.out }}
      />
    </div>
  )
}

export { Progress }
export default Progress
