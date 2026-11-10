import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Hub } from "aws-amplify/utils"
import { CloudOff, RotateCcw } from "lucide-react"
import { Button, EmptyState } from "@/components/ui"
import { toApiError } from "@/lib/api"
import { currentSignIn, isAuthConfigured, signInWithEmail } from "@/lib/auth"
import { clearAll } from "@/lib/resource"
import { useSession } from "./session"
import RouteFallback from "./RouteFallback"

type GateState = { status: "checking" } | { status: "ready"; uid: string } | { status: "error"; message: string }

export function FullPageError({ title, message, onRetry, onBack }: { title: string; message: string; onRetry: () => void; onBack?: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <EmptyState
        icon={<CloudOff aria-hidden="true" />}
        title={title}
        description={message}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={onRetry} leftIcon={<RotateCcw aria-hidden="true" />}>
              Try again
            </Button>
            {onBack && (
              <Button variant="ghost" onClick={onBack}>
                Back to sign in
              </Button>
            )}
          </div>
        }
      />
    </div>
  )
}

interface CognitoGateProps {
  /** The shared demo account of this portal, signed in for demo sessions (role switcher, quick launch). */
  demo: { email: string; password: string }
  /** Loads the portal's own profile; its id scopes the portal's cached data. */
  load: () => Promise<{ id: string }>
  /** Heading of the error screen, e.g. "The student portal can't connect". */
  errorTitle: string
  children: (uid: string) => ReactNode
}

/**
 * Makes sure the right Cognito account is signed in before a backend portal renders. Demo sessions sign in the
 * portal's shared demo account (also when another account is signed in on this device, e.g. after switching role);
 * a real account whose sign-in expired goes back to the sign-in page.
 */
export default function CognitoGate({ demo, load, errorTitle, children }: CognitoGateProps) {
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState<GateState>({ status: "checking" })
  const uidRef = useRef<string | null>(null)
  const sessionRef = useRef(session)
  sessionRef.current = session
  const hereRef = useRef("")
  hereRef.current = location.pathname + location.search
  const loadRef = useRef(load)
  loadRef.current = load

  const toSignIn = useCallback(() => {
    sessionRef.current.logout()
    navigate(`/auth?redirect=${encodeURIComponent(hereRef.current || "/")}`, { replace: true })
  }, [navigate])

  const check = useCallback(async () => {
    setState({ status: "checking" })
    if (!isAuthConfigured) {
      setState({ status: "error", message: "Sign-in isn't configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID in frontend/.env.local." })
      return
    }
    try {
      const want = sessionRef.current.user.email.trim().toLowerCase()
      const signedIn = await currentSignIn()
      if (!signedIn) {
        toSignIn()
        return
      }
      const profile = await loadRef.current()
      uidRef.current = profile.id
      setState({ status: "ready", uid: profile.id })
    } catch (e) {
      const err = toApiError(e, "We couldn't sign you in.")
      if (err.status === 401 || err.status === 403) {
        toSignIn()
        return
      }
      setState({ status: "error", message: err.message })
    }
  }, [demo.email, demo.password, toSignIn])

  useEffect(() => {
    void check()
  }, [check])

  // Signing out in another tab, or an expired refresh token, sends the user back to sign in.
  useEffect(() => {
    return Hub.listen("auth", async ({ payload }) => {
      if (payload.event !== "signedOut" && payload.event !== "tokenRefresh_failure") return
      const signedIn = await currentSignIn()
      if (signedIn) return
      if (!uidRef.current) return
      uidRef.current = null
      clearAll()
      if (sessionRef.current.isAuthenticated) toSignIn()
    })
  }, [toSignIn])

  if (state.status === "checking") return <RouteFallback />
  if (state.status === "error") return <FullPageError title={errorTitle} message={state.message} onRetry={() => void check()} onBack={toSignIn} />
  return <>{children(state.uid)}</>
}
