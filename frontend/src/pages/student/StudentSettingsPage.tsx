import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Bell, Camera, Check, Eye, EyeOff, KeyRound, Laptop, LogOut, Monitor, Palette, ShieldCheck, Smartphone, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import { useSession } from "@/app/session"
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageHeader,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeControls,
} from "@/components/ui"
import type { StudentNavPage } from "./studentTypes"
import { studentProfileData } from "./studentMockData"

type SettingsTab = "profile" | "appearance" | "notifications" | "security"

interface StudentSettingsPageProps {
  onToast: (msg: string) => void
  onNavigate?: (page: StudentNavPage) => void
  onLogout?: () => void
  initialTab?: SettingsTab
}

const PREFS_KEY = "quantum_student_notification_prefs"
const PREF_GROUPS = [
  {
    title: "Learning",
    items: [
      { id: "live", label: "Live class reminders", hint: "15 minutes before each live session" },
      { id: "deadlines", label: "Assignment deadlines", hint: "48 and 24 hours before the due date" },
      { id: "quizzes", label: "Quiz openings", hint: "When a quiz becomes available" },
    ],
  },
  {
    title: "Results",
    items: [{ id: "grades", label: "Grades published", hint: "When an evaluator grades your work" }],
  },
  {
    title: "Community",
    items: [
      { id: "mentions", label: "Mentions and replies", hint: "When someone replies to your post" },
      { id: "squads", label: "Study squad sessions", hint: "Reminders for squads you've joined" },
    ],
  },
  {
    title: "Email",
    items: [{ id: "digest", label: "Weekly progress digest", hint: "A Monday summary of your week" }],
  },
] as const
type PrefId = (typeof PREF_GROUPS)[number]["items"][number]["id"]
const DEFAULT_PREFS: Record<PrefId, boolean> = { live: true, deadlines: true, quizzes: true, grades: true, mentions: true, squads: false, digest: true }

function loadPrefs(): Record<PrefId, boolean> {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    // ignore
  }
  return DEFAULT_PREFS
}

function strength(pw: string): { score: number; label: string; tone: "danger" | "warning" | "success" } {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 2) return { score: s, label: "Weak", tone: "danger" }
  if (s <= 3) return { score: s, label: "Fair", tone: "warning" }
  return { score: s, label: "Strong", tone: "success" }
}

export default function StudentSettingsPage({ onToast, onLogout, initialTab = "profile" }: StudentSettingsPageProps) {
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "appearance" as const, label: "Appearance", icon: Palette },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "security" as const, label: "Security", icon: ShieldCheck },
  ]
  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="Account" title="Settings" description="Manage your profile, theme, notifications and sign-in security." />
      <Tabs value={tab} onValueChange={(v) => setTab(v as SettingsTab)} orientation="vertical" className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <TabsList aria-label="Settings sections" className="lg:h-auto lg:w-full lg:flex-col lg:items-stretch lg:gap-1 lg:self-start lg:p-1">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="lg:h-9 lg:justify-start lg:px-3">
              <t.icon className="h-4 w-4" aria-hidden="true" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="min-w-0">
          <TabsContent value="profile" className="mt-0">
            <Profile onToast={onToast} />
          </TabsContent>
          <TabsContent value="appearance" className="mt-0">
            <Appearance />
          </TabsContent>
          <TabsContent value="notifications" className="mt-0">
            <Notifications onToast={onToast} />
          </TabsContent>
          <TabsContent value="security" className="mt-0">
            <Security onToast={onToast} onLogout={onLogout} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function SaveButton({ dirty, saving, saved, label = "Save changes" }: { dirty: boolean; saving: boolean; saved: boolean; label?: string }) {
  return (
    <Button type="submit" disabled={!dirty && !saving} loading={saving} className="min-w-[132px]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={saved ? "saved" : "save"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={transition.fast} className="flex items-center gap-1.5">
          {saved && <Check className="h-4 w-4" aria-hidden="true" />}
          {saving ? "Saving…" : saved ? "Saved" : label}
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}

function useSaveState() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const run = (fn: () => void) => {
    setSaving(true)
    setTimeout(() => {
      fn()
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    }, 600)
  }
  return { saving, saved, run }
}

function Profile({ onToast }: { onToast: (m: string) => void }) {
  const { user } = useSession()
  const initial = useMemo(
    () => ({ name: user.name, phone: studentProfileData.phone, bio: "AI engineering student focused on retrieval systems and multi-agent orchestration.", location: "Bengaluru, India" }),
    [user.name],
  )
  const [form, setForm] = useState(initial)
  const [saved, setSavedForm] = useState(initial)
  const [photo, setPhoto] = useState<string | undefined>(user.avatar)
  const { saving, saved: justSaved, run } = useSaveState()
  const fileRef = useRef<HTMLInputElement>(null)
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(() => {
          setSavedForm(form)
          onToast("Profile updated")
        })
      }}
      className="grid gap-5"
    >
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center">
          <div className="relative w-fit">
            <Avatar src={photo} name={form.name} size="xl" />
            <button
              type="button"
              aria-label="Change photo"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-3 text-foreground shadow-[var(--elev-sm)] transition-transform hover:scale-105"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setPhoto(URL.createObjectURL(f))
                onToast("Photo updated for this session")
              }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground">{form.name}</p>
            <p className="text-sm text-muted-foreground">{studentProfileData.program}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="neutral" className="font-mono">
                {studentProfileData.rollNumber}
              </Badge>
              <Badge tone="primary">{studentProfileData.batch}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Email" hint="Managed by your school account">
            <Input value={user.email} disabled />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </Field>
          <Field label="Bio" className="sm:col-span-2" hint={`${form.bio.length}/200`}>
            <Textarea value={form.bio} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
          </Field>
        </CardContent>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="ghost" disabled={!dirty || saving} onClick={() => setForm(saved)}>
            Discard
          </Button>
          <SaveButton dirty={dirty} saving={saving} saved={justSaved} />
        </div>
      </Card>
    </form>
  )
}

function Appearance() {
  const reduced = useReducedMotion()
  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Theme</CardTitle>
          <p className="text-sm text-muted-foreground">Changes apply instantly across every page.</p>
        </CardHeader>
        <CardContent>
          <ThemeControls idPrefix="settings-theme" className="max-w-md" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 pt-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground ring-1 ring-inset ring-border">
            <Monitor className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Motion</p>
            <p className="text-caption text-muted-foreground">Animations follow your device's reduced-motion setting.</p>
          </div>
          <Badge tone={reduced ? "warning" : "success"}>{reduced ? "Reduced" : "Full motion"}</Badge>
        </CardContent>
      </Card>
    </div>
  )
}

function Notifications({ onToast }: { onToast: (m: string) => void }) {
  const [prefs, setPrefs] = useState<Record<PrefId, boolean>>(loadPrefs)
  const [quiet, setQuiet] = useState("22-07")
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      // ignore
    }
  }, [prefs])
  const on = Object.values(prefs).filter(Boolean).length

  return (
    <div className="grid gap-5">
      {PREF_GROUPS.map((g) => (
        <Card key={g.title}>
          <CardHeader className="pb-1">
            <CardTitle>{g.title}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {g.items.map((item) => {
              const id = `pref-${item.id}`
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                  <label htmlFor={id} className="min-w-0 cursor-pointer">
                    <span className="block text-sm font-medium text-foreground">{item.label}</span>
                    <span className="block text-caption text-muted-foreground">{item.hint}</span>
                  </label>
                  <Switch
                    id={id}
                    checked={prefs[item.id]}
                    onCheckedChange={(v) => {
                      setPrefs((p) => ({ ...p, [item.id]: v }))
                      onToast(`${item.label} ${v ? "on" : "off"}`)
                    }}
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Quiet hours</p>
            <p className="text-caption text-muted-foreground">
              {on} notification types on. Push notifications pause during quiet hours.
            </p>
          </div>
          <Select value={quiet} onValueChange={setQuiet}>
            <SelectTrigger aria-label="Quiet hours" className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="22-07">10 PM – 7 AM</SelectItem>
              <SelectItem value="23-08">11 PM – 8 AM</SelectItem>
              <SelectItem value="00-09">12 AM – 9 AM</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  )
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

function Security({ onToast, onLogout }: { onToast: (m: string) => void; onLogout?: () => void }) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [twoFactor, setTwoFactor] = useState(true)
  const [sessions, setSessions] = useState([
    { id: "s1", icon: Laptop, device: "Chrome on Windows", place: "Bengaluru, India", when: "Active now", current: true },
    { id: "s2", icon: Smartphone, device: "Safari on iPhone 15", place: "Bengaluru, India", when: "2 days ago", current: false },
    { id: "s3", icon: Laptop, device: "Firefox on Ubuntu", place: "Campus Lab 3", when: "Last week", current: false },
  ])
  const { saving, saved, run } = useSaveState()
  const s = strength(next)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = {
      current: current ? undefined : "Enter your current password.",
      next: next.length < 8 ? "Use at least 8 characters." : s.label === "Weak" ? "Add numbers, symbols or mixed case." : undefined,
      confirm: confirm !== next ? "Passwords don't match." : undefined,
    }
    setErrors(errs)
    if (errs.current || errs.next || errs.confirm) return
    run(() => {
      setCurrent("")
      setNext("")
      setConfirm("")
      onToast("Password changed")
    })
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <form onSubmit={submit} noValidate>
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
        </form>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-5">
          <label htmlFor="two-factor" className="min-w-0 cursor-pointer">
            <span className="block text-sm font-medium text-foreground">Two-factor authentication</span>
            <span className="block text-caption text-muted-foreground">Ask for a code from your authenticator app at sign-in.</span>
          </label>
          <Switch
            id="two-factor"
            checked={twoFactor}
            onCheckedChange={(v) => {
              setTwoFactor(v)
              onToast(v ? "Two-factor authentication on" : "Two-factor authentication off")
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle>Where you're signed in</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            disabled={sessions.length < 2}
            onClick={() => {
              setSessions((list) => list.filter((x) => x.current))
              onToast("Signed out of all other devices")
            }}
          >
            Sign out others
          </Button>
        </CardHeader>
        <CardContent className="grid gap-1">
          <AnimatePresence initial={false}>
            {sessions.map((x) => (
              <motion.div key={x.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 16, transition: transition.fast }} transition={transition.base} className="flex items-center gap-3 rounded-md px-1 py-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground ring-1 ring-inset ring-border">
                  <x.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{x.device}</p>
                  <p className="truncate text-caption text-muted-foreground">
                    {x.place} · {x.when}
                  </p>
                </div>
                {x.current ? (
                  <Badge tone="success" dot>
                    This device
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSessions((list) => list.filter((y) => y.id !== x.id))
                      onToast(`Signed out of ${x.device}`)
                    }}
                  >
                    Sign out
                  </Button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
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
