import type { ReactNode } from "react"
import { Menu, Search, Sparkles } from "lucide-react"
import type { CurrentUser, UserRole } from "@/types"
import { Kbd } from "@/components/ui/kbd"
import { ThemeAccentPicker } from "@/components/ui/ThemeAccentPicker"
import { Brand } from "./Sidebar"
import NotificationsMenu, { type NotificationSource } from "./NotificationsMenu"
import UserMenu from "./UserMenu"

interface TopBarProps {
  role: UserRole
  user: CurrentUser
  onOpenNav: () => void
  onOpenPalette: () => void
  onOpenAi: () => void
  onSwitchRole: (role: UserRole) => void
  onLogout: () => void
  onResetDemo: () => void
  onOpenSettings?: () => void
  notifications?: NotificationSource
  /** Optional content between the search trigger and the actions (e.g. a portal filter). */
  children?: ReactNode
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)

/** Sticky top bar: mobile menu + brand, ⌘K search trigger, Ask AI, theme, notifications, user menu. */
export default function TopBar({
  role,
  user,
  onOpenNav,
  onOpenPalette,
  onOpenAi,
  onSwitchRole,
  onLogout,
  onResetDemo,
  onOpenSettings,
  notifications,
  children,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[var(--shell-topbar-h)] shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-md sm:gap-3 sm:px-5">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="lg:hidden">
        <Brand role={role} compact />
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Search and commands"
        aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
        className="group ml-auto flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-sm text-subtle-foreground transition-colors hover:border-border-strong/60 hover:text-muted-foreground sm:ml-0 sm:w-full sm:max-w-sm"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden flex-1 truncate text-left sm:inline">Search pages, courses, actions…</span>
        <span className="hidden items-center gap-0.5 sm:flex">
          <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      {children}

      <div className="flex items-center gap-1.5 sm:ml-auto sm:gap-2">
        <button
          type="button"
          onClick={onOpenAi}
          className="hidden h-9 items-center gap-1.5 rounded-md bg-[image:var(--gradient-primary)] px-3 text-sm font-medium text-white shadow-[var(--glow-primary)] transition-transform hover:-translate-y-0.5 active:scale-[0.97] sm:inline-flex"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Ask AI
        </button>
        {/* Visible at every width: on phones this is the only way to change theme and accent. */}
        <ThemeAccentPicker />
        <NotificationsMenu source={notifications} />
        <UserMenu user={user} onSwitchRole={onSwitchRole} onLogout={onLogout} onResetDemo={onResetDemo} onOpenSettings={onOpenSettings} />
      </div>
    </header>
  )
}
