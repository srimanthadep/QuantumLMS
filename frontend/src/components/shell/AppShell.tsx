import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import type { UserRole } from "@/types"
import { useSession } from "@/app/session"
import { useToast } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getDemoAccount } from "@/data/demoAccounts"
import CloverAssistantButton from "./CloverAssistantButton"
import { useAiAssistant } from "./AiAssistantDialog"
import CommandPalette from "./CommandPalette"
import MobileNav from "./MobileNav"
import Sidebar from "./Sidebar"
import TopBar from "./TopBar"
import { NAV } from "./navConfig"
import type { NotificationSource } from "./NotificationsMenu"

const COLLAPSE_KEY = "quantum_shell_collapsed"

export interface AppShellProps {
  role: UserRole
  /** Id of the active nav item (see navConfig). */
  activeId?: string
  /** Called with a nav item id; the portal routes or switches tabs. */
  onNavigate: (id: string) => void
  children: ReactNode
  /** Only show these nav ids (for portals whose remaining pages arrive in later phases). */
  availableIds?: string[]
  badges?: Record<string, number | string | undefined>
  notifications?: NotificationSource
  /** Override the content wrapper (default: centered, padded, max 1440px). */
  contentClassName?: string
  /** Optional top-bar slot. */
  topBarSlot?: ReactNode
}

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1"
  } catch {
    return false
  }
}

/**
 * The one app frame for every portal: skip link, sidebar (collapsible rail on
 * desktop, sheet on mobile), sticky top bar, fixed lower-right Clover assistant, <main id="main"> and ⌘K palette.
 */
export default function AppShell({
  role,
  activeId,
  onNavigate,
  children,
  availableIds,
  badges,
  notifications,
  contentClassName,
  topBarSlot,
}: AppShellProps) {
  const session = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const ai = useAiAssistant()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const items = useMemo(() => NAV[role].filter((i) => !availableIds || availableIds.includes(i.id)), [role, availableIds])

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1")
      } catch {
        // ignore
      }
      return !c
    })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const switchRole = useCallback(
    (r: UserRole) => {
      navigate(session.switchRole(r))
      toast.show(`Switched to the ${r} portal`)
    },
    [navigate, session, toast],
  )
  const logout = useCallback(() => {
    session.logout()
    navigate("/auth")
    toast.show("You have been signed out.")
  }, [navigate, session, toast])

  // Students keep their data in their account; only the shared demo student has demo data to restore.
  const isStudent = role === "Student"
  const canReset = !isStudent || session.user.email.toLowerCase() === getDemoAccount("Student").email
  const resetDemo = useCallback(() => {
    toast.show(isStudent ? "Restoring the demo student's data…" : "Resetting demo data…")
    session.resetDemoData().catch((e: Error) => toast.error(e.message || "The demo data couldn't be reset."))
  }, [isStudent, session, toast])
  const storageNote = isStudent
    ? canReset
      ? "Shared demo account · progress is saved online"
      : "Your progress is saved to your account"
    : undefined

  const hasSettings = items.some((i) => i.id === "settings")
  const openAi = () => ai.open()

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <a href="#main" className="skip-link">
          Skip to content
        </a>

        <aside
          className={cn(
            "hidden shrink-0 border-r border-border bg-surface lg:block",
            collapsed ? "w-[var(--shell-rail-w)]" : "w-[var(--shell-sidebar-w)]",
          )}
        >
          <Sidebar
            role={role}
            items={items}
            activeId={activeId}
            onNavigate={onNavigate}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
            badges={badges}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            role={role}
            user={session.user}
            onOpenNav={() => setMobileOpen(true)}
            onOpenPalette={() => setPaletteOpen(true)}
            onSwitchRole={switchRole}
            onLogout={logout}
            onResetDemo={canReset ? resetDemo : undefined}
            storageNote={storageNote}
            onOpenSettings={hasSettings ? () => onNavigate("settings") : undefined}
            notifications={notifications}
          >
            {topBarSlot}
          </TopBar>
          <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden focus:outline-none">
            <div className={cn("mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:py-6", contentClassName)}>{children}</div>
          </main>
        </div>

        <MobileNav
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          role={role}
          items={items}
          activeId={activeId}
          onNavigate={onNavigate}
          badges={badges}
        />
        <CloverAssistantButton onOpen={openAi} />
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          role={role}
          items={items}
          onNavigate={onNavigate}
          onSwitchRole={switchRole}
          onLogout={logout}
          onOpenAi={openAi}
        />
      </div>
    </TooltipProvider>
  )
}
