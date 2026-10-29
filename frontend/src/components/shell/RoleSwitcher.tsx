import { Repeat } from "lucide-react"
import type { UserRole } from "@/types"
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"

export const ALL_ROLES: UserRole[] = ["Student", "Teacher", "Evaluator", "Support", "Admin", "Super Admin"]

/** "Switch role" submenu for the user menu (demo convenience). */
export default function RoleSwitcher({ role, onSwitch }: { role: UserRole; onSwitch: (role: UserRole) => void }) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Repeat /> Switch role
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={role} onValueChange={(v) => v !== role && onSwitch(v as UserRole)}>
          {ALL_ROLES.map((r) => (
            <DropdownMenuRadioItem key={r} value={r}>
              {r}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
