import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Bell, Camera, Monitor, Palette, ShieldCheck, User } from "lucide-react"
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
import SaveButton, { useSaveState } from "@/components/shared/SaveButton"
import SecuritySettings from "@/components/shared/SecuritySettings"
import type { StudentNavPage } from "./studentTypes"
import { useStudentData } from "./data/StudentDataProvider"
import { uploadAvatar } from "./data/actions"

type SettingsTab = "profile" | "appearance" | "notifications" | "security"

interface StudentSettingsPageProps {
  onToast: (msg: string) => void
  onNavigate?: (page: StudentNavPage) => void
  onLogout?: () => void
  initialTab?: SettingsTab
}

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

/** Saved preferences (profiles.notification_prefs) over the defaults. */
function readPrefs(saved: unknown): Record<PrefId, boolean> {
  const out = { ...DEFAULT_PREFS }
  if (saved && typeof saved === "object" && !Array.isArray(saved)) {
    for (const k of Object.keys(out) as PrefId[]) {
      const v = (saved as Record<string, unknown>)[k]
      if (typeof v === "boolean") out[k] = v
    }
  }
  return out
}

export default function StudentSettingsPage({ onToast, onLogout, initialTab = "profile" }: StudentSettingsPageProps) {
  const { isDemo } = useStudentData()
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
            <SecuritySettings isDemo={isDemo} ownAccountHint="student account" onToast={onToast} onLogout={onLogout} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function Profile({ onToast }: { onToast: (m: string) => void }) {
  const { user } = useSession()
  const { profile, uid, updateProfile } = useStudentData()
  const initial = useMemo(() => ({ name: profile.full_name, phone: profile.phone, bio: profile.bio, location: profile.location }), [profile])
  const [form, setForm] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const { saving, saved: justSaved, run } = useSaveState()
  const fileRef = useRef<HTMLInputElement>(null)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)

  // A profile reload (another tab, demo reset) refreshes the form unless it has unsaved edits.
  const prevInitial = useRef(initial)
  useEffect(() => {
    setForm((f) => (JSON.stringify(f) === JSON.stringify(prevInitial.current) ? initial : f))
    prevInitial.current = initial
  }, [initial])

  const changePhoto = async (f: File) => {
    setUploading(true)
    try {
      const url = await uploadAvatar(uid, f)
      await updateProfile({ avatar_url: url })
      onToast("Profile photo updated")
    } catch (e) {
      onToast(`Couldn't update the photo: ${(e as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const name = form.name.trim()
        if (!name) {
          setError("Enter your name.")
          return
        }
        setError(null)
        void run(
          async () => {
            await updateProfile({ full_name: name, phone: form.phone.trim(), location: form.location.trim(), bio: form.bio.trim() })
            setForm((f) => ({ ...f, name, phone: f.phone.trim(), location: f.location.trim(), bio: f.bio.trim() }))
            onToast("Profile updated")
          },
          (m) => setError(m),
        )
      }}
      className="grid gap-5"
    >
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center">
          <div className="relative w-fit">
            <Avatar src={profile.avatar_url ?? undefined} name={form.name} size="xl" className={cn(uploading && "opacity-60")} />
            <button
              type="button"
              aria-label="Change photo"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-3 text-foreground shadow-[var(--elev-sm)] transition-transform hover:scale-105 disabled:opacity-60"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ""
                if (f) void changePhoto(f)
              }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground">{form.name || user.name}</p>
            <p className="text-sm text-muted-foreground">{profile.program}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="neutral" className="font-mono">
                {profile.roll_number}
              </Badge>
              <Badge tone="primary">{profile.batch}</Badge>
            </div>
            <p className="mt-2 text-caption text-muted-foreground">{uploading ? "Uploading photo…" : "PNG, JPG, WebP or GIF up to 2 MB."}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={error}>
            <Input value={form.name} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Email" hint="Your sign-in email">
            <Input value={profile.email} disabled />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} maxLength={40} inputMode="tel" onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="Location">
            <Input value={form.location} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </Field>
          <Field label="Bio" className="sm:col-span-2" hint={`${form.bio.length}/200`}>
            <Textarea value={form.bio} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
          </Field>
        </CardContent>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="ghost" disabled={!dirty || saving} onClick={() => setForm(initial)}>
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
  const { profile, updateProfile } = useStudentData()
  const prefs = readPrefs(profile.notification_prefs)
  const quiet = profile.quiet_hours
  const on = Object.values(prefs).filter(Boolean).length
  const setPrefs = (next: Record<PrefId, boolean>, message: string) =>
    updateProfile({ notification_prefs: next })
      .then(() => onToast(message))
      .catch((e: Error) => onToast(`Couldn't save: ${e.message}`))
  const setQuiet = (v: string) =>
    updateProfile({ quiet_hours: v })
      .then(() => onToast(v === "off" ? "Quiet hours off" : "Quiet hours updated"))
      .catch((e: Error) => onToast(`Couldn't save: ${e.message}`))

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
                  <Switch id={id} checked={prefs[item.id]} onCheckedChange={(v) => void setPrefs({ ...prefs, [item.id]: v }, `${item.label} ${v ? "on" : "off"}`)} />
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
          <Select value={quiet} onValueChange={(v) => void setQuiet(v)}>
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
