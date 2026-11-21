import type { ReactNode } from "react"
import { AlertCircle, CheckCircle2, Info, TriangleAlert, type LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Building blocks shared by the batch page tabs, so every tab reads the same way. */

export function TabHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
  children?: ReactNode
  className?: string
  bodyClassName?: string
  id?: string
}) {
  return (
    <Card id={id} className={cn("scroll-mt-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-text">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
            {description && <p className="mt-0.5 text-caption text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children !== undefined && <div className={cn("px-5 pb-5", bodyClassName)}>{children}</div>}
    </Card>
  )
}

export function MiniStat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
  active,
  onClick,
  children,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info"
  active?: boolean
  onClick?: () => void
  children?: ReactNode
}) {
  const toneCls = {
    neutral: "bg-surface-2 text-muted-foreground",
    primary: "bg-primary-soft text-primary-text",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  }[tone]
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className={cn("hidden h-7 w-7 shrink-0 items-center justify-center rounded-md sm:flex", toneCls)}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="truncate text-caption text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 truncate text-xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
      {hint && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</div>}
      {children}
    </>
  )
  const cls = cn(
    "flex min-w-0 flex-col justify-start rounded-lg border bg-surface p-4 text-left shadow-[var(--elev-xs)]",
    active ? "border-primary-border ring-2 ring-primary/20" : "border-border",
  )
  return onClick ? (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn(cls, "transition-colors hover:border-border-strong/60")}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

const ALERT_STYLE = {
  info: { cls: "border-info/25 bg-info-soft text-info", icon: Info },
  success: { cls: "border-success/25 bg-success-soft text-success", icon: CheckCircle2 },
  warning: { cls: "border-warning/25 bg-warning-soft text-warning", icon: TriangleAlert },
  danger: { cls: "border-danger/25 bg-danger-soft text-danger", icon: AlertCircle },
} as const

export function InlineAlert({ tone, children, action, className }: { tone: keyof typeof ALERT_STYLE; children: ReactNode; action?: ReactNode; className?: string }) {
  const { cls, icon: Icon } = ALERT_STYLE[tone]
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm", cls, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function EmptyBlock({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface/60 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-1">
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children && <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}

/** Sticky save bar at the bottom of the scrolling page; matches the course Settings bar. */
export function StickySaveBar({ children, message }: { children: ReactNode; message: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6" role="region" aria-label="Unsaved changes">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
        {message}
      </p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

/** Converts an ISO timestamp to the value a datetime-local input expects, in the device timezone. */
export const toLocalInput = (value: string | null | undefined) => {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone
