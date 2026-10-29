import { motion } from "framer-motion"
import { ChevronsLeft, ChevronsRight, Sparkles } from "lucide-react"
import type { UserRole } from "@/types"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"
import { Tooltip } from "@/components/ui/tooltip"
import type { ShellNavItem } from "./navConfig"
import { ROLE_WORKSPACE } from "./navConfig"

export interface SidebarProps {
  role: UserRole
  items: ShellNavItem[]
  activeId?: string
  onNavigate: (id: string) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  badges?: Record<string, number | string | undefined>
  onOpenAi: () => void
  /** Layout id namespace so desktop and mobile indicators don't fight. */
  instance?: "desktop" | "mobile"
  className?: string
}

export function Brand({ role, compact }: { role: UserRole; compact?: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", compact && "justify-center")}>
      <img src="/assets/logo.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-foreground">Quantum School of AI</p>
          <p className="truncate text-[11px] text-subtle-foreground">{ROLE_WORKSPACE[role]}</p>
        </div>
      )}
      <span className="sr-only">Quantum School of AI</span>
    </div>
  )
}

function NavButton({
  item,
  active,
  collapsed,
  badge,
  onClick,
  layoutId,
}: {
  item: ShellNavItem
  active: boolean
  collapsed: boolean
  badge?: number | string
  onClick: () => void
  layoutId: string
}) {
  const Icon = item.icon
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active ? "text-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      {active && (
        <motion.span layoutId={layoutId} transition={spring.snappy} aria-hidden="true" className="absolute inset-0 rounded-md border border-border bg-surface-2">
          <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-x-[1px] -translate-y-1/2 rounded-full bg-primary" />
        </motion.span>
      )}
      <Icon className={cn("relative h-4 w-4 shrink-0 transition-colors", active ? "text-primary-text" : "group-hover:text-foreground")} aria-hidden="true" />
      {!collapsed && <span className="relative min-w-0 flex-1 truncate text-left">{item.label}</span>}
      {badge !== undefined && badge !== 0 && (
        <span
          className={cn(
            "relative rounded-full bg-primary-soft px-1.5 text-[10px] font-semibold leading-4 tabular-nums text-primary-text",
            collapsed && "absolute right-1 top-1 h-2 w-2 p-0 text-[0px] ring-2 ring-surface",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  )
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {button}
    </Tooltip>
  ) : (
    button
  )
}

/** Role navigation: brand, main + secondary items with a shared-layout active indicator, Ask AI, collapse toggle. */
export default function Sidebar({
  role,
  items,
  activeId,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  badges,
  onOpenAi,
  instance = "desktop",
  className,
}: SidebarProps) {
  const main = items.filter((i) => i.section === "main")
  const secondary = items.filter((i) => i.section === "secondary")
  const layoutId = `shell-nav-${instance}`
  return (
    <nav aria-label="Primary" className={cn("flex h-full flex-col gap-1 p-3", className)}>
      <div className={cn("mb-4 flex h-10 items-center px-1.5", collapsed && "justify-center px-0")}>
        <Brand role={role} compact={collapsed} />
      </div>
      <ul className="flex flex-col gap-0.5">
        {main.map((it) => (
          <li key={it.id}>
            <NavButton item={it} active={activeId === it.id} collapsed={collapsed} badge={badges?.[it.id]} onClick={() => onNavigate(it.id)} layoutId={layoutId} />
          </li>
        ))}
      </ul>
      {secondary.length > 0 && (
        <>
          <div className="mx-2 my-3 h-px bg-border" role="separator" />
          <ul className="flex flex-col gap-0.5">
            {secondary.map((it) => (
              <li key={it.id}>
                <NavButton item={it} active={activeId === it.id} collapsed={collapsed} badge={badges?.[it.id]} onClick={() => onNavigate(it.id)} layoutId={layoutId} />
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-auto flex flex-col gap-2 pt-4">
        {collapsed ? (
          <Tooltip content="Ask AI" side="right">
            <button
              type="button"
              onClick={onOpenAi}
              aria-label="Ask AI"
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-md bg-[image:var(--gradient-primary)] text-white shadow-[var(--glow-primary)] transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={onOpenAi}
            className="group relative flex items-center gap-3 overflow-hidden rounded-lg border border-primary-border bg-primary-soft p-3 text-left transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[image:var(--gradient-primary)] text-white shadow-[var(--glow-primary)]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Ask AI</span>
              <span className="block truncate text-caption text-muted-foreground">Your course-aware assistant</span>
            </span>
          </button>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md px-2.5 text-caption font-medium text-subtle-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" aria-hidden="true" /> : <ChevronsLeft className="h-4 w-4" aria-hidden="true" />}
            {!collapsed && "Collapse"}
          </button>
        )}
      </div>
    </nav>
  )
}
