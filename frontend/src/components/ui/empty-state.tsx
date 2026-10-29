import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { fadeUp } from "@/lib/motion"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  size?: "sm" | "md"
}

/** Centered empty / zero-data state with an icon tile, copy and an optional action. */
export default function EmptyState({ icon, title, description, action, className, size = "md" }: EmptyStateProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border text-center",
        size === "md" ? "gap-3 px-6 py-12" : "gap-2 px-4 py-8",
        className,
      )}
    >
      {icon && (
        <div className="relative isolate flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground [&_svg]:size-5">
          <div className="absolute inset-0 -z-10 rounded-md bg-primary/20 blur-xl" aria-hidden="true" />
          {icon}
        </div>
      )}
      <div className="max-w-sm space-y-1">
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </motion.div>
  )
}

export { EmptyState }
