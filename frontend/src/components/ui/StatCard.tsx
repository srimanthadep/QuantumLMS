import React from "react"
import { cn } from "@/lib/utils"
import type { MetricItem } from "../../types"
import { Icon } from "../Icon"

export function FolderTabBackground() {
  return null
}

export interface StatCardProps {
  item?: MetricItem
  title?: string
  value?: string | number
  subtitle?: string
  change?: string
  icon?: React.ElementType | string
  tone?: "lavender" | "pink" | "yellow" | "lime"
  trend?:
    | {
        value: string
        isPositive?: boolean
      }
    | "up"
    | "down"
    | "neutral"
    | string
  highlight?: boolean
  index?: number
  className?: string
  onAction?: () => void
  onClick?: () => void
  isActive?: boolean
}

export const StatCard: React.FC<StatCardProps> = ({
  item,
  title,
  value,
  subtitle,
  change,
  icon,
  tone,
  trend,
  className,
  onClick,
  isActive = false,
}) => {
  // Resolve item vs direct props
  const resolvedTitle = item ? item.label : title || ""
  const resolvedValue = item ? item.value : value ?? ""
  const resolvedTone = item ? item.tone : tone || "lavender"
  const rawTrend = item ? item.trend : (typeof trend === "object" ? trend?.value : typeof trend === "string" ? trend : change || subtitle || "")
  const resolvedIcon = item ? item.icon : icon

  // Determine trend badge style (is it positive, neutral, or badge)
  const isPositiveTrend = typeof rawTrend === "string" && (rawTrend.startsWith("+") || rawTrend.includes("met") || rawTrend.includes("All") || rawTrend.includes("Target"));

  return (
    <section
      onClick={onClick}
      className={cn(
        "metric-card bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between transition-all shadow-xs",
        isActive && "ring-2 ring-primary shadow-sm",
        onClick && "cursor-pointer hover:border-primary/40",
        className
      )}
      aria-label={resolvedTitle}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="metric-label text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
          {resolvedTitle}
        </span>
        {resolvedIcon && (
          <div className={cn("metric-icon shrink-0", resolvedTone)}>
            {typeof resolvedIcon === "string" ? (
              <Icon name={resolvedIcon as any} size={18} />
            ) : (
              React.createElement(resolvedIcon as any, { size: 18, className: "w-[18px] h-[18px]" })
            )}
          </div>
        )}
      </div>

      <div className="metric-bottom flex items-baseline justify-between gap-2 mt-auto">
        <strong className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {resolvedValue}
        </strong>
        {rawTrend && (
          <span
            className={cn(
              "text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums shrink-0",
              isPositiveTrend
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                : "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700/60"
            )}
          >
            {rawTrend}
          </span>
        )}
      </div>
    </section>
  )
}

export default StatCard
