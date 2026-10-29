import * as React from "react"
import { cn } from "@/lib/utils"

/** Placeholder block with a transform-only shimmer band. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden="true" className={cn("relative overflow-hidden rounded-md bg-surface-2", className)} {...props}>
      <div className="absolute inset-0 -translate-x-full animate-[q-shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
    </div>
  )
}

/** A few lines of text-shaped skeletons. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-3/5" : "w-full")} />
      ))}
    </div>
  )
}

export { Skeleton }
export default Skeleton
