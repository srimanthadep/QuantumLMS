import { ChevronDown, LogOut, RotateCcw, Settings } from "lucide-react"
import type { CurrentUser, UserRole } from "@/types"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import RoleSwitcher from "./RoleSwitcher"

interface UserMenuProps {
  user: CurrentUser
  onSwitchRole: (role: UserRole) => void
  onLogout: () => void
  onResetDemo: () => void
  onOpenSettings?: () => void
}

/** Avatar menu: identity, settings, role switcher, reset demo data, sign out. */
export default function UserMenu({ user, onSwitchRole, onLogout, onResetDemo, onOpenSettings }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${user.name}`}
          className="flex h-9 items-center gap-2 rounded-md pl-1 pr-1.5 transition-colors hover:bg-surface-2 sm:pr-2"
        >
          <Avatar src={user.avatar} name={user.name} size="sm" status="online" />
          <span className="hidden min-w-0 text-left leading-tight md:block">
            <span className="block max-w-[140px] truncate text-sm font-medium text-foreground">{user.name}</span>
            <span className="block max-w-[140px] truncate text-[11px] text-subtle-foreground">{user.role}</span>
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-subtle-foreground md:block" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar src={user.avatar} name={user.name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-caption text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="px-2 pb-2">
          <Badge tone="primary">{user.role}</Badge>
          {user.title && <span className="ml-2 text-caption text-subtle-foreground">{user.title}</span>}
        </div>
        <DropdownMenuSeparator />
        {onOpenSettings && (
          <DropdownMenuItem onSelect={onOpenSettings}>
            <Settings /> Settings
          </DropdownMenuItem>
        )}
        <RoleSwitcher role={user.role} onSwitch={onSwitchRole} />
        <DropdownMenuItem onSelect={onResetDemo}>
          <RotateCcw /> Reset demo data
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="normal-case tracking-normal">Demo workspace · data stays in this browser</DropdownMenuLabel>
        <DropdownMenuItem destructive onSelect={onLogout}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
