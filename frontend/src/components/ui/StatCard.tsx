import React from "react"
import { cn } from "@/lib/utils"
import type { MetricItem } from "../../types"
import { Icon } from "../Icon"

export function FolderTabBackground(_props?: {
  width?: number
  height?: number
  label?: string
}) {
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
  index = 0,
  className,
  onClick,
  isActive = false,
}) => {
  const resolvedTitle = item ? item.label : title || ""
  const resolvedValue = item ? item.value : value ?? ""
  const resolvedTone: "lavender" | "pink" | "yellow" | "lime" =
    (item ? item.tone : tone) ||
    (index % 4 === 0
      ? "lavender"
      : index % 4 === 1
      ? "pink"
      : index % 4 === 2
      ? "yellow"
      : "lime")

  const rawTrend = item
    ? item.trend
    : typeof trend === "object"
    ? trend?.value
    : typeof trend === "string"
    ? trend
    : change || subtitle || ""

  const resolvedIcon = item ? item.icon : icon

  return (
    <section
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        "metric-card bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between transition-all shadow-xs",
        onClick && "cursor-pointer hover:border-[#F0442E]/40",
        isActive && "ring-2 ring-[#F0442E] border-[#F0442E] -translate-y-0.5",
        className
      )}
      aria-label={resolvedTitle}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="metric-label text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
          {resolvedTitle}
        </span>
        {resolvedIcon && (
          <div className={cn("metric-icon shrink-0", resolvedTone)}>
            {typeof resolvedIcon === "string" ? (
              <Icon name={resolvedIcon as any} size={18} />
            ) : (
              React.createElement(resolvedIcon as any, {
                size: 18,
                className: "w-[18px] h-[18px]",
              })
            )}
          </div>
        )}
      </div>

      <div className="metric-bottom flex items-baseline justify-between gap-2 mt-auto">
        <strong className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
          {resolvedValue}
        </strong>
        {rawTrend && (
          <span className="text-[11px] font-semibold text-[#0F766E] bg-teal-50 dark:bg-teal-950/40 border border-teal-600/20 px-2 py-0.5 rounded-full tabular-nums shrink-0">
            {rawTrend}
          </span>
        )}
      </div>
    </section>
  )
}

export default StatCard
