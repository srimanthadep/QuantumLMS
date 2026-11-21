import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Section title + actions row used at the top of every workspace panel. */
export function PanelHeader({
  title,
  description,
  eyebrow,
  badge,
  children,
}: {
  title: string
  description: string
  eyebrow?: string
  badge?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary-text">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {title}
          </h2>
          {badge}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p>
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}

/** Dashed empty placeholder with icon, copy and optional actions. */
export function WorkspaceEmpty({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface/60 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary-text ring-1 ring-inset ring-primary-border">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-1">
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p>
      </div>
      {children && <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}

/** Navigation entry: matches the app shell sidebar on desktop, pill on mobile. */
export function NavItem({
  icon: Icon,
  label,
  hint,
  count,
  dirty,
  disabled,
  active,
  onClick,
  pill,
  layoutId = "course-workspace-nav",
}: {
  icon: LucideIcon
  label: string
  hint?: string
  count?: number
  dirty?: boolean
  disabled?: boolean
  active: boolean
  onClick: () => void
  pill?: boolean
  layoutId?: string
}) {
  if (pill) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 sm:text-sm",
          active
            ? "bg-primary-soft font-semibold text-primary-text"
            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
        {dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-label="Unsaved changes" />}
        {count !== undefined && (
          <span
            className={cn(
              "rounded-full px-1.5 text-[10px] font-semibold leading-4 tabular-nums",
              active || count > 0 ? "bg-primary-soft text-primary-text" : "bg-surface-2 text-muted-foreground",
            )}
          >
            {count}
          </span>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-md px-2.5 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50",
        hint ? "py-2" : "h-9",
        active ? "font-semibold text-foreground" : "text-muted-foreground hover:bg-surface-2/70 hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          aria-hidden="true"
          className="absolute inset-0 z-0 rounded-md border border-border bg-surface-2 shadow-2xs"
        >
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
        </motion.span>
      )}
      <Icon
        className={cn("relative z-10 h-4 w-4 shrink-0 transition-colors", active ? "text-primary-text" : "group-hover:text-foreground")}
        aria-hidden="true"
      />
      <span className="relative z-10 min-w-0 flex-1">
        <span className="block truncate leading-tight">{label}</span>
        {hint && (
          <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      {dirty && <span className="relative z-10 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-label="Unsaved changes" />}
      {count !== undefined && (
        <span
          className={cn(
            "relative z-10 rounded-full px-1.5 text-[10px] font-semibold leading-4 tabular-nums",
            active || count > 0 ? "bg-primary-soft text-primary-text" : "bg-surface-2 text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

/** "Overdue by 2d" / "Due in 5d" style label for an ISO due date. */
export function dueInfo(iso: string): { label: string; tone: "danger" | "warning" | "neutral" } {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (Number.isNaN(days)) return { label: "No due date", tone: "neutral" }
  if (days < 0) return { label: `Overdue by ${-days}d`, tone: "danger" }
  if (days === 0) return { label: "Due today", tone: "warning" }
  if (days <= 3) return { label: `Due in ${days}d`, tone: "warning" }
  return { label: `Due in ${days}d`, tone: "neutral" }
}

