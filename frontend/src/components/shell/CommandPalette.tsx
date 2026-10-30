import { useMemo } from "react"
import { BookOpen, LogOut, Moon, Repeat, Sparkles, Sun } from "lucide-react"
import type { UserRole } from "@/types"
import CommandPaletteDialog, { type CommandItem } from "@/components/ui/command-palette"
import { useTheme } from "@/app/ThemeProvider"
import { COURSE_SHORTCUTS, type ShellNavItem } from "./navConfig"
import { ALL_ROLES } from "./RoleSwitcher"

interface ShellCommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: UserRole
  items: ShellNavItem[]
  onNavigate: (id: string) => void
  onSwitchRole: (role: UserRole) => void
  onLogout: () => void
  onOpenAi: () => void
}

/** ⌘K palette for the shell: current role's pages, courses, and quick actions. */
export default function CommandPalette({ open, onOpenChange, role, items, onNavigate, onSwitchRole, onLogout, onOpenAi }: ShellCommandPaletteProps) {
  const { resolved, setMode } = useTheme()
  const coursesTarget = items.find((i) => i.id === "courses")?.id
  const commands = useMemo<CommandItem[]>(() => {
    const nav = items.map<CommandItem>((it) => {
      const Icon = it.icon
      return { id: `nav-${it.id}`, label: it.label, group: "Go to", icon: <Icon />, keywords: it.keywords, onSelect: () => onNavigate(it.id) }
    })
    const courses = coursesTarget
      ? COURSE_SHORTCUTS.map<CommandItem>((c) => ({ id: `course-${c}`, label: c, group: "Courses", icon: <BookOpen />, onSelect: () => onNavigate(coursesTarget) }))
      : []
    const actions: CommandItem[] = [
      { id: "ai", label: "Open Clover", group: "Actions", icon: <Sparkles />, keywords: ["assistant", "ai", "clover", "help"], onSelect: onOpenAi },
      {
        id: "theme",
        label: resolved === "dark" ? "Switch to light theme" : "Switch to dark theme",
        group: "Actions",
        icon: resolved === "dark" ? <Sun /> : <Moon />,
        keywords: ["theme", "appearance", "mode"],
        onSelect: () => setMode(resolved === "dark" ? "light" : "dark"),
      },
      ...ALL_ROLES.filter((r) => r !== role).map<CommandItem>((r) => ({
        id: `role-${r}`,
        label: `Switch to ${r}`,
        group: "Actions",
        icon: <Repeat />,
        keywords: ["role", "portal"],
        onSelect: () => onSwitchRole(r),
      })),
      { id: "logout", label: "Sign out", group: "Actions", icon: <LogOut />, onSelect: onLogout },
    ]
    return [...nav, ...courses, ...actions]
  }, [items, coursesTarget, onNavigate, onOpenAi, resolved, setMode, role, onSwitchRole, onLogout])

  return <CommandPaletteDialog open={open} onOpenChange={onOpenChange} items={commands} />
}
