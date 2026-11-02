import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Eye, EyeOff, KeyRound, Laptop, LogOut, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import { useSession } from "@/app/session"
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Progress, Switch } from "@/components/ui"
import { changePassword, describeDevice, enrollTotp, listTotpFactors, signOutAllDevices, unenrollTotp, verifyTotp, type TotpEnrollment, type TotpFactor } from "@/lib/account"
import { meetsPasswordPolicy, PASSWORD_RULE } from "@/lib/auth"
import SaveButton, { useSaveState } from "./SaveButton"

function strength(pw: string): { score: number; label: string; tone: "danger" | "warning" | "success" } {
  let s = 0
  if (pw.length >= 10) s++
  if (pw.length >= 14) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 2) return { score: s, label: "Weak", tone: "danger" }
  if (s <= 3) return { score: s, label: "Fair", tone: "warning" }
  return { score: s, label: "Strong", tone: "success" }
}

function PasswordInput({ value, onChange, autoComplete, ...rest }: { value: string; onChange: (v: string) => void; autoComplete: string; id?: string }) {
  const [show, setShow] = useState(false)
  return (
    <Input
      {...rest}
      type={show ? "text" : "password"}
      value={value}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      leading={<KeyRound aria-hidden="true" />}
      trailing={
        <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)} className="flex rounded p-1 hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      }
    />
  )
}

interface SecuritySettingsProps {
  /** Shared demo accounts can't change their password, two-factor settings or sessions. */
  isDemo: boolean
  /** Which kind of account to suggest creating instead of the demo one ("student account"). */
  ownAccountHint: string
  onToast: (m: string) => void
  onLogout?: () => void
}

/** Cognito account security for the API-backed portals: password, authenticator app and sessions. */
export default function SecuritySettings({ isDemo, ownAccountHint, onToast, onLogout }: SecuritySettingsProps) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const { saving, saved, run } = useSaveState()
  const s = strength(next)

  // Two-factor authentication (TOTP authenticator apps).
  const [factors, setFactors] = useState<TotpFactor[] | null>(null)
  const [enrolling, setEnrolling] = useState<TotpEnrollment | null>(null)
  const [code, setCode] = useState("")
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [mfaBusy, setMfaBusy] = useState(false)
  useEffect(() => {
    listTotpFactors()
      .then(setFactors)
      .catch(() => setFactors([]))
  }, [])
  const twoFactor = !!factors?.length

  const toggle2fa = async (on: boolean) => {
    setMfaError(null)
    setMfaBusy(true)
    try {
      if (on) {
        setEnrolling(await enrollTotp())
        setCode("")
      } else {
        for (const f of factors ?? []) await unenrollTotp(f.id)
        setFactors([])
        onToast("Two-factor authentication off")
      }
    } catch (e) {
      onToast((e as Error).message)
    } finally {
      setMfaBusy(false)
    }
  }
  const confirm2fa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrolling) return
    setMfaBusy(true)
    setMfaError(null)
    try {
      await verifyTotp(enrolling.factorId, code)
      setFactors(await listTotpFactors())
      setEnrolling(null)
      onToast("Two-factor authentication on. You'll enter a code at your next sign-in.")
    } catch (err) {
      setMfaError((err as Error).message)
    } finally {
      setMfaBusy(false)
    }
  }
  const cancelEnroll = () => {
    const pendingFactor = enrolling
    setEnrolling(null)
    if (pendingFactor) unenrollTotp(pendingFactor.factorId).catch(() => undefined)
  }

  const session = useSession()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const signOutEverywhere = async () => {
    setSigningOut(true)
    try {
      await signOutAllDevices()
    } catch (e) {
      onToast((e as Error).message)
      setSigningOut(false)
      return
    }
    session.logout()
    navigate("/auth")
    onToast("Signed out of all devices. Sign in again to continue.")
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = {
      current: current ? undefined : "Enter your current password.",
      next: !meetsPasswordPolicy(next) ? PASSWORD_RULE : next === current ? "Choose a different password." : undefined,
      confirm: confirm !== next ? "Passwords don't match." : undefined,
    }
    setErrors(errs)
    if (errs.current || errs.next || errs.confirm) return
    void run(
      async () => {
        await changePassword("", current, next)
        setCurrent("")
        setNext("")
        setConfirm("")
        onToast("Password changed")
      },
      (m) => setErrors(/current/i.test(m) ? { current: m } : { next: m }),
    )
  }

  return (
    <div className="grid gap-5">
      {isDemo && (
        <Card className="border-warning/30 bg-warning-soft">
          <CardContent className="pt-5 text-sm text-foreground">
            This is the shared demo account, so its password, two-factor settings and sessions can't be changed. Create your own {ownAccountHint} to try them.
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <form onSubmit={submit} noValidate>
          <fieldset disabled={isDemo} className="contents">
            <CardContent className="grid gap-4 sm:max-w-md">
              <Field label="Current password" error={errors.current}>
                <PasswordInput value={current} onChange={setCurrent} autoComplete="current-password" />
              </Field>
              <Field label="New password" error={errors.next}>
                <PasswordInput value={next} onChange={setNext} autoComplete="new-password" />
              </Field>
              <AnimatePresence initial={false}>
                {next && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transition.fast} className="-mt-2 grid gap-1.5">
                    <Progress value={(s.score / 5) * 100} tone={s.tone} size="xs" label="Password strength" />
                    <p className={cn("text-caption font-medium", s.tone === "danger" ? "text-danger" : s.tone === "warning" ? "text-warning" : "text-success")}>{s.label} password</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <Field label="Confirm new password" error={errors.confirm}>
                <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
              </Field>
            </CardContent>
            <div className="flex justify-end border-t border-border px-5 py-3">
              <SaveButton dirty={!!(current || next || confirm)} saving={saving} saved={saved} label="Update password" />
            </div>
          </fieldset>
        </form>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-5">
          <label htmlFor="two-factor" className="min-w-0 cursor-pointer">
            <span className="block text-sm font-medium text-foreground">Two-factor authentication</span>
            <span className="block text-caption text-muted-foreground">
              {factors === null ? "Checking…" : twoFactor ? "On. Sign-in asks for a code from your authenticator app." : "Ask for a code from your authenticator app at sign-in."}
            </span>
          </label>
          <Switch id="two-factor" checked={twoFactor || !!enrolling} disabled={isDemo || factors === null || mfaBusy} onCheckedChange={(v) => (v ? void toggle2fa(true) : enrolling ? cancelEnroll() : void toggle2fa(false))} />
        </CardContent>
        <AnimatePresence initial={false}>
          {enrolling && (
            <motion.form
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: transition.fast }}
              transition={transition.base}
              onSubmit={confirm2fa}
              className="grid gap-4 border-t border-border px-5 py-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start"
            >
              <img src={enrolling.qrCode} alt="QR code for your authenticator app" className="h-40 w-40 rounded-md border border-border bg-white p-2" />
              <div className="grid gap-3">
                <p className="text-sm text-foreground">Scan the code with Google Authenticator, 1Password or a similar app, then enter the 6-digit code it shows.</p>
                <p className="text-caption text-muted-foreground">
                  Can't scan? Enter this key: <span className="break-all font-mono text-foreground">{enrolling.secret}</span>
                </p>
                <Field label="Code" error={mfaError}>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="123456" className="max-w-[10rem] font-mono" />
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" loading={mfaBusy} disabled={code.replace(/\s/g, "").length < 6}>
                    Turn on
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={cancelEnroll} disabled={mfaBusy}>
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle>Where you're signed in</CardTitle>
          <Button variant="ghost" size="sm" disabled={isDemo} loading={signingOut} onClick={() => void signOutEverywhere()}>
            Sign out of all devices
          </Button>
        </CardHeader>
        <CardContent className="grid gap-1">
          <div className="flex items-center gap-3 rounded-md px-1 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground ring-1 ring-inset ring-border">
              {/Android|iPhone|iPad/.test(navigator.userAgent) ? <Smartphone className="h-4 w-4" aria-hidden="true" /> : <Laptop className="h-4 w-4" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{describeDevice()}</p>
              <p className="truncate text-caption text-muted-foreground">Active now</p>
            </div>
            <Badge tone="success" dot>
              This device
            </Badge>
          </div>
          <p className="px-1 pt-1 text-caption text-muted-foreground">Signing out of all devices ends every session of your account, this one included. You'll sign in again here.</p>
        </CardContent>
      </Card>

      {onLogout && (
        <Card className="border-danger/30">
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Sign out</p>
              <p className="text-caption text-muted-foreground">End your session on this device.</p>
            </div>
            <Button variant="danger" leftIcon={<LogOut aria-hidden="true" />} onClick={onLogout}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
