import React from "react"
import { cn } from "@/lib/utils"
import type { MetricItem } from "../../types"
import { Icon } from "../Icon"
import AnimatedNumber from "../motion/AnimatedNumber"
import Sparkline from "../charts/Sparkline"

/** @deprecated kept for older imports; renders nothing. */
export function FolderTabBackground(_props?: { width?: number; height?: number; label?: string }) {
  return null
}

type LegacyTone = "lavender" | "pink" | "yellow" | "lime"
export type StatTone = "primary" | "danger" | "warning" | "success" | "info" | "neutral"

const LEGACY_TONE: Record<LegacyTone, StatTone> = {
  lavender: "primary",
  pink: "danger",
  yellow: "warning",
  lime: "success",
}

const TONE_ICON: Record<StatTone, string> = {
  primary: "bg-primary-soft text-primary-text ring-primary-border",
  danger: "bg-danger-soft text-danger ring-danger/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  success: "bg-success-soft text-success ring-success/20",
  info: "bg-info-soft text-info ring-info/20",
  neutral: "bg-surface-2 text-muted-foreground ring-border",
}
const TONE_STROKE: Record<StatTone, string> = {
  primary: "var(--primary-text)",
  danger: "var(--danger)",
  warning: "var(--warning)",
  success: "var(--success)",
  info: "var(--info)",
  neutral: "var(--muted-foreground)",
}

export interface StatCardProps {
  item?: MetricItem
  title?: string
  value?: string | number
  subtitle?: string
  change?: string
  icon?: React.ElementType | string
  tone?: LegacyTone | StatTone
  trend?: { value: string; isPositive?: boolean } | "up" | "down" | "neutral" | string
  highlight?: boolean
  index?: number
  className?: string
  onAction?: () => void
  onClick?: () => void
  isActive?: boolean
  /** Optional trailing series drawn as a sparkline. */
  sparkline?: number[]
}

/** Splits "₹4,82,000", "96.2%" or "3 Due" into prefix / number / suffix so the number can animate. */
function parseNumeric(v: string | number): { prefix: string; num: number; decimals: number; suffix: string } | null {
  if (typeof v === "number") return { prefix: "", num: v, decimals: Number.isInteger(v) ? 0 : 1, suffix: "" }
  const m = /^([^\d-]*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/.exec(v.trim())
  if (!m) return null
  const raw = m[2].replace(/,/g, "")
  const num = Number(raw)
  if (!Number.isFinite(num)) return null
  return { prefix: m[1], num, decimals: raw.includes(".") ? raw.split(".")[1].length : 0, suffix: m[3] }
}

function trendDirection(text: string, explicit?: boolean): "up" | "down" | "flat" {
  if (explicit === true) return "up"
  if (explicit === false) return "down"
  if (/^\s*(↗|↑|\+|▲)/.test(text) || /\bup\b/i.test(text)) return "up"
  if (/^\s*(↘|↓|-|−|▼)/.test(text) || /\bdown\b/i.test(text)) return "down"
  return "flat"
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
  sparkline,
}) => {
  const resolvedTitle = item ? item.label : title || ""
  const resolvedValue = item ? item.value : (value ?? "")
  const rawTone = (item ? item.tone : tone) || (["lavender", "pink", "yellow", "lime"] as const)[index % 4]
  const resolvedTone: StatTone = rawTone in LEGACY_TONE ? LEGACY_TONE[rawTone as LegacyTone] : (rawTone as StatTone)
  const explicitPositive = typeof trend === "object" ? trend?.isPositive : undefined
  const rawTrend = item
    ? item.trend
    : typeof trend === "object"
      ? trend?.value
      : typeof trend === "string" && !["up", "down", "neutral"].includes(trend)
        ? trend
        : change || subtitle || ""
  const trendText = (rawTrend || "").replace(/^\s*(↗|↘|↑|↓)\s*/, "")
  const dir = trendDirection(rawTrend || "", explicitPositive)
  const resolvedIcon = item ? item.icon : icon
  const numeric = parseNumeric(resolvedValue)

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
      aria-label={onClick ? resolvedTitle : undefined}
      className={cn(
        "@container group relative flex h-full min-h-[112px] flex-col justify-between gap-3 overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-[var(--elev-xs)] transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:border-border-strong/60 hover:shadow-[var(--elev-md)]",
        isActive && "border-primary ring-1 ring-primary",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 truncate text-[13px] font-medium text-muted-foreground">{resolvedTitle}</span>
        {resolvedIcon && (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ring-inset transition-transform duration-200 group-hover:scale-105",
              TONE_ICON[resolvedTone],
            )}
            aria-hidden="true"
          >
            {typeof resolvedIcon === "string" ? (
              <Icon name={resolvedIcon as never} size={16} />
            ) : (
              React.createElement(resolvedIcon as React.ElementType, { size: 16, className: "h-4 w-4" })
            )}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <strong className="block truncate text-[26px] font-semibold leading-8 tracking-tight text-foreground">
            {numeric ? (
              <AnimatedNumber value={numeric.num} decimals={numeric.decimals} prefix={numeric.prefix} suffix={numeric.suffix} />
            ) : (
              resolvedValue
            )}
          </strong>
          {trendText && (
            <span
              className={cn(
                "mt-0.5 block truncate text-caption font-medium tabular-nums",
                dir === "up" ? "text-success" : dir === "down" ? "text-danger" : "text-muted-foreground",
              )}
            >
              {dir === "up" ? "↑ " : dir === "down" ? "↓ " : ""}
              {trendText}
            </span>
          )}
        </div>
        {/* Narrow cards (two-up on phones) drop the sparkline so the value never truncates. */}
        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} stroke={TONE_STROKE[resolvedTone]} className="hidden h-8 w-20 shrink-0 @min-[12rem]:block" />
        )}
      </div>
    </section>
  )
}

export default StatCard
