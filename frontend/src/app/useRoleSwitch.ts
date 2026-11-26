import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import savedAccounts from "virtual:local-password-accounts"
import type { UserRole } from "@/types"
import { useToast } from "@/components/ui/toast"
import { accountSignIn } from "@/pages/auth/accountAuth"
import { ROLE_HOME, useSession } from "./session"

/**
 * "Switch role" from the user menu. When the local dev server has a saved test account for the role (the list is
 * always empty outside the loopback dev server), it signs straight in as that account. Otherwise it goes to the
 * sign-in page for that role.
 */
export default function useRoleSwitch() {
  const session = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const { login, switchRole } = session

  return useCallback(
    async (role: UserRole) => {
      const account = savedAccounts.find((a) => a.role === role)
      if (account) {
        try {
          const result = await accountSignIn(account.email, account.password)
          if (typeof result !== "string") {
            login(result)
            navigate(ROLE_HOME[result.role], { replace: true })
            toast.success(`Switched to ${result.role}`)
            return
          }
        } catch (e) {
          toast.show((e as Error).message || `Couldn't switch to ${role}.`)
          return
        }
      }
      navigate(switchRole(role))
      toast.show(`Sign in to your ${role} account`)
    },
    [login, switchRole, navigate, toast],
  )
}
