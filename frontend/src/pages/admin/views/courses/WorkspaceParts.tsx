import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Section title + actions row used at the top of every workspace panel. */
export function PanelHeader({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex shrink-0 flex-nowrap items-center gap-2.5 overflow-x-auto">{children}</div>}
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-surface/60 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-2 text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-1">
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children && <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}

/** Navigation entry: a sidebar row on desktop, a pill on mobile. */
export function NavItem({
  icon: Icon,
  label,
  count,
  active,
  onClick,
  pill,
}: {
  icon: LucideIcon
  label: string
  count?: number
  active: boolean
  onClick: () => void
  pill?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 whitespace-nowrap text-sm font-medium transition-colors",
        pill ? "rounded-full px-3.5 py-1.5" : "w-full rounded-xl px-3 py-2.5",
        active ? "bg-primary-soft text-primary-text" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className={cn(!pill && "flex-1 text-left")}>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
            active ? "bg-primary/15 text-primary-text" : "bg-surface-2 text-muted-foreground",
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

