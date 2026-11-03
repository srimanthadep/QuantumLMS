import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Bell, Camera, Check, KeyRound, LaptopMinimal, LogOut, Monitor, Palette, Plus, Presentation, ShieldCheck, Smartphone, Tablet, UserRound, X, type LucideIcon } from "lucide-react"
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
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  ThemeControls,
} from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import type { LiveSessionItem } from "@/types"
import { useSession } from "@/app/session"
import { useTeacherData } from "./teacherStore"

type Section = "profile" | "notifications" | "classroom" | "appearance" | "security"

const SECTIONS: { id: Section; label: string; icon: LucideIcon; detail: string }[] = [
  { id: "profile", label: "Profile", icon: UserRound, detail: "What learners and families see" },
  { id: "notifications", label: "Notifications", icon: Bell, detail: "What reaches you, and how" },
  { id: "classroom", label: "Classroom", icon: Presentation, detail: "Defaults for new live classes" },
  { id: "appearance", label: "Appearance", icon: Palette, detail: "Theme and accent colour" },
  { id: "security", label: "Security", icon: ShieldCheck, detail: "Password, sign-in and devices" },
]

interface TeacherSettings {
  profile: { name: string; title: string; phone: string; bio: string; subjects: string[]; officeHours: string }
  notifications: { channel: "email" | "app" | "both"; doubts: boolean; submissions: boolean; lateJoins: boolean; recordings: boolean; reminders: boolean; weekly: boolean; quiet: boolean; quietFrom: string; quietTo: string }
  classroom: { platform: LiveSessionItem["platform"]; length: string; autoRecord: boolean; autoPublish: boolean; insights: boolean; waitingRoom: boolean; selfUnmute: boolean; lateAfter: string }
  security: { twoFactor: boolean }
}

const KEY = "quantum_teacher_settings_v2"

function defaults(name: string, title: string): TeacherSettings {
  return {
    profile: {
      name,
      title,
      phone: "+91 98450 21877",
      bio: "Lead AI Instructor specializing in Large Language Models, autonomous multi-agent systems, and production GPU infrastructure.",
      subjects: ["Generative AI", "LLM Engineering", "Agentic Systems", "MLOps"],
      officeHours: "Thursdays, 11:30 AM – 12:30 PM",
    },
    notifications: { channel: "both", doubts: true, submissions: true, lateJoins: false, recordings: true, reminders: true, weekly: true, quiet: true, quietFrom: "20:00", quietTo: "07:00" },
    classroom: { platform: "Quantum Classroom", length: "60", autoRecord: true, autoPublish: false, insights: true, waitingRoom: false, selfUnmute: true, lateAfter: "10" },
    security: { twoFactor: true },
  }
}

function load(fallback: TeacherSettings): TeacherSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<TeacherSettings>
      return {
        profile: { ...fallback.profile, ...saved.profile },
        notifications: { ...fallback.notifications, ...saved.notifications },
        classroom: { ...fallback.classroom, ...saved.classroom },
        security: { ...fallback.security, ...saved.security },
      }
    }
  } catch {
    // use defaults
  }
  return fallback
}

function ToggleRow({ id, title, detail, checked, onChange, disabled }: { id: string; title: string; detail: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <li className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <label htmlFor={id} className={cn("cursor-pointer text-sm font-medium text-foreground", disabled && "cursor-not-allowed opacity-60")}>
          {title}
        </label>
        <p className="text-caption text-muted-foreground">{detail}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </li>
  )
}

function strength(pw: string): { score: number; label: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  return { score, label: ["Too short", "Weak", "Fair", "Good", "Strong"][score] }
}

/** Teacher preferences: profile, notifications, classroom defaults, appearance and security. */
export default function SettingsPage() {
  const { user } = useSession()
  const { notify } = useTeacherData()
  const [section, setSection] = useState<Section>("profile")
  const [settings, setSettings] = useState<TeacherSettings>(() => load(defaults(user.name, user.title ?? "Teacher")))
  const [profile, setProfile] = useState(settings.profile)
  const [subjectDraft, setSubjectDraft] = useState("")
  const [photo, setPhoto] = useState<string | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" })
  const [pwErrors, setPwErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [devices, setDevices] = useState([
    { id: "d1", icon: Monitor, name: "Chrome on Windows", meta: "Bengaluru · this device", current: true },
    { id: "d2", icon: LaptopMinimal, name: "Safari on MacBook Air", meta: "Bengaluru · yesterday, 9:12 PM", current: false },
    { id: "d3", icon: Tablet, name: "Quantum app on iPad", meta: "Mysuru · 3 days ago", current: false },
    { id: "d4", icon: Smartphone, name: "Quantum app on Android", meta: "Bengaluru · last week", current: false },
  ])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      // storage unavailable
    }
  }, [settings])
  useEffect(() => () => (photo ? URL.revokeObjectURL(photo) : undefined), [photo])

  const dirty = JSON.stringify(profile) !== JSON.stringify(settings.profile)
  const setN = <K extends keyof TeacherSettings["notifications"]>(k: K, v: TeacherSettings["notifications"][K]) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, [k]: v } }))
  const setC = <K extends keyof TeacherSettings["classroom"]>(k: K, v: TeacherSettings["classroom"][K]) => setSettings((s) => ({ ...s, classroom: { ...s.classroom, [k]: v } }))
  const n = settings.notifications
  const c = settings.classroom
  const pwStrength = strength(pw.next)

  const addSubject = () => {
    const v = subjectDraft.trim()
    if (!v || profile.subjects.includes(v)) return setSubjectDraft("")
    setProfile((p) => ({ ...p, subjects: [...p.subjects, v] }))
    setSubjectDraft("")
  }

  const content = () => {
    switch (section) {
      case "profile":
        return (
          <form
            className="grid gap-5"
            onSubmit={(e) => {
              e.preventDefault()
              setSettings((s) => ({ ...s, profile }))
              notify("Profile saved")
            }}
          >
            <div className="flex flex-wrap items-center gap-4">
              <Avatar src={photo ?? user.avatar} name={profile.name || user.name} size="xl" />
              <div>
                <p className="text-sm font-medium text-foreground">Profile photo</p>
                <p className="text-caption text-muted-foreground">Square images work best. PNG or JPG.</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setPhoto(URL.createObjectURL(file))
                    notify("Photo updated for this session")
                  }}
                />
                <Button type="button" size="sm" variant="secondary" className="mt-2" leftIcon={<Camera aria-hidden="true" />} onClick={() => fileRef.current?.click()}>
                  Change photo
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name">
                <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              </Field>
              <Field label="Title">
                <Input value={profile.title} onChange={(e) => setProfile((p) => ({ ...p, title: e.target.value }))} />
              </Field>
              <Field label="Email" hint="Managed by your school.">
                <Input value={user.email} readOnly disabled />
              </Field>
              <Field label="Phone">
                <Input type="tel" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
              </Field>
            </div>
            <Field label="About you" hint="Shown on your course pages.">
              <Textarea value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} />
            </Field>
            <Field label="Office hours">
              <Input value={profile.officeHours} onChange={(e) => setProfile((p) => ({ ...p, officeHours: e.target.value }))} />
            </Field>
            <div className="grid gap-2">
              <span className="text-sm font-medium text-foreground">Subjects you teach</span>
              <ul className="flex flex-wrap gap-1.5">
                <AnimatePresence initial={false}>
                  {profile.subjects.map((s) => (
                    <motion.li key={s} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={spring.snappy}>
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary-border bg-primary-soft py-0.5 pl-2.5 pr-1 text-caption font-medium text-primary-text">
                        {s}
                        <button
                          type="button"
                          aria-label={`Remove ${s}`}
                          onClick={() => setProfile((p) => ({ ...p, subjects: p.subjects.filter((x) => x !== s) }))}
                          className="rounded-full p-0.5 transition-colors hover:bg-primary/15"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              <div className="flex max-w-sm gap-2">
                <Input
                  value={subjectDraft}
                  onChange={(e) => setSubjectDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addSubject()
                    }
                  }}
                  placeholder="Add a subject"
                  aria-label="Add a subject"
                />
                <Button type="button" variant="secondary" size="icon" aria-label="Add subject" onClick={addSubject}>
                  <Plus aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="ghost" disabled={!dirty} onClick={() => setProfile(settings.profile)}>
                Discard
              </Button>
              <Button type="submit" disabled={!dirty} leftIcon={<Check aria-hidden="true" />}>
                Save profile
              </Button>
            </div>
          </form>
        )
      case "notifications":
        return (
          <div className="grid gap-6">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-foreground">Send notifications by</span>
              <SegmentedControl
                aria-label="Notification channel"
                className="max-w-md"
                block
                options={[
                  { value: "email" as const, label: "Email" },
                  { value: "app" as const, label: "In the app" },
                  { value: "both" as const, label: "Both" },
                ]}
                value={n.channel}
                onChange={(v) => {
                  setN("channel", v)
                  notify("Notification channel updated")
                }}
              />
            </div>
            <section aria-label="Learner activity">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">Learner activity</h3>
              <ul className="divide-y divide-border">
                <ToggleRow id="n-doubts" title="New doubts" detail="When a learner asks a question" checked={n.doubts} onChange={(v) => setN("doubts", v)} />
                <ToggleRow id="n-submissions" title="Assignment submissions" detail="A daily round-up, plus late submissions as they happen" checked={n.submissions} onChange={(v) => setN("submissions", v)} />
                <ToggleRow id="n-late" title="Late joins" detail="When a learner joins a live class more than 10 minutes late" checked={n.lateJoins} onChange={(v) => setN("lateJoins", v)} />
              </ul>
            </section>
            <section aria-label="Classes">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">Classes</h3>
              <ul className="divide-y divide-border">
                <ToggleRow id="n-reminders" title="Class reminders" detail="15 minutes before each live class" checked={n.reminders} onChange={(v) => setN("reminders", v)} />
                <ToggleRow id="n-recordings" title="Recording ready" detail="When chapters and the transcript are done" checked={n.recordings} onChange={(v) => setN("recordings", v)} />
                <ToggleRow id="n-weekly" title="Weekly summary" detail="Mondays: last week's attendance, scores and open work" checked={n.weekly} onChange={(v) => setN("weekly", v)} />
              </ul>
            </section>
            <section aria-label="Quiet hours" className="rounded-lg border border-border p-4">
              <ul>
                <ToggleRow id="n-quiet" title="Quiet hours" detail="Hold notifications overnight. Urgent support replies still come through." checked={n.quiet} onChange={(v) => setN("quiet", v)} />
              </ul>
              <div className="mt-3 grid max-w-sm grid-cols-2 gap-3">
                <Field label="From">
                  <Input type="time" value={n.quietFrom} disabled={!n.quiet} onChange={(e) => setN("quietFrom", e.target.value)} />
                </Field>
                <Field label="To">
                  <Input type="time" value={n.quietTo} disabled={!n.quiet} onChange={(e) => setN("quietTo", e.target.value)} />
                </Field>
              </div>
            </section>
          </div>
        )
      case "classroom":
        return (
          <div className="grid gap-6">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-foreground">Default platform</span>
              <SegmentedControl
                aria-label="Default platform"
                className="max-w-lg"
                block
                options={(["Quantum Classroom", "Zoom", "Google Meet"] as const).map((p) => ({ value: p, label: p }))}
                value={c.platform}
                onChange={(v) => setC("platform", v)}
              />
            </div>
            <div className="grid max-w-lg gap-4 sm:grid-cols-2">
              <Field label="Default class length">
                <Select value={c.length} onValueChange={(v) => setC("length", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["45", "60", "75", "90"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Mark learners late after">
                <Select value={c.lateAfter} onValueChange={(v) => setC("lateAfter", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["5", "10", "15"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <ul className="divide-y divide-border">
              <ToggleRow id="c-record" title="Record classes automatically" detail="Recording starts when you start the class" checked={c.autoRecord} onChange={(v) => setC("autoRecord", v)} />
              <ToggleRow
                id="c-publish"
                title="Publish recordings when ready"
                detail="Skip the review step. You can still unpublish later."
                checked={c.autoPublish}
                disabled={!c.autoRecord}
                onChange={(v) => setC("autoPublish", v)}
              />
              <ToggleRow id="c-insights" title="Live engagement insights" detail="Engagement score, pacing hints and attention moments in the studio" checked={c.insights} onChange={(v) => setC("insights", v)} />
              <ToggleRow id="c-waiting" title="Waiting room" detail="Learners wait until you let them in" checked={c.waitingRoom} onChange={(v) => setC("waitingRoom", v)} />
              <ToggleRow id="c-unmute" title="Learners can unmute themselves" detail="Otherwise they raise a hand and you call on them" checked={c.selfUnmute} onChange={(v) => setC("selfUnmute", v)} />
            </ul>
          </div>
        )
      case "appearance":
        return (
          <div className="grid gap-4">
            <ThemeControls idPrefix="teacher-settings" />
            <p className="text-caption text-muted-foreground">Theme and accent apply to every portal on this device.</p>
          </div>
        )
      case "security":
        return (
          <div className="grid gap-6">
            <form
              noValidate
              className="grid max-w-md gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                const next = {
                  current: pw.current.length < 6 ? "Enter your current password." : undefined,
                  next: pwStrength.score < 3 ? "Use at least 12 characters with upper and lower case letters." : undefined,
                  confirm: pw.confirm !== pw.next ? "The passwords don't match." : undefined,
                }
                setPwErrors(next)
                if (next.current || next.next || next.confirm) return
                setPw({ current: "", next: "", confirm: "" })
                notify("Password updated")
              }}
            >
              <h3 className="text-sm font-semibold text-foreground">Change password</h3>
              <Field label="Current password" error={pwErrors.current}>
                <Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
              </Field>
              <Field label="New password" error={pwErrors.next}>
                <Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
              </Field>
              {pw.next && (
                <div className="-mt-2" aria-live="polite">
                  <div className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <motion.span
                          className={cn("block h-full w-full origin-left rounded-full", pwStrength.score >= 3 ? "bg-success" : pwStrength.score === 2 ? "bg-warning" : "bg-danger")}
                          initial={false}
                          animate={{ scaleX: i < pwStrength.score ? 1 : 0 }}
                          transition={transition.base}
                        />
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-caption text-muted-foreground">Strength: {pwStrength.label}</p>
                </div>
              )}
              <Field label="Confirm new password" error={pwErrors.confirm}>
                <Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
              </Field>
              <div>
                <Button type="submit" leftIcon={<KeyRound aria-hidden="true" />}>
                  Update password
                </Button>
              </div>
            </form>
            <ul className="border-t border-border pt-5">
              <ToggleRow
                id="s-2fa"
                title="Two-step verification"
                detail="Ask for a code from your phone when you sign in on a new device"
                checked={settings.security.twoFactor}
                onChange={(v) => {
                  setSettings((s) => ({ ...s, security: { twoFactor: v } }))
                  notify(v ? "Two-step verification turned on" : "Two-step verification turned off")
                }}
              />
            </ul>
            <section aria-label="Signed-in devices" className="border-t border-border pt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">Signed-in devices</h3>
                {devices.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<LogOut aria-hidden="true" />}
                    onClick={() => {
                      setDevices((d) => d.filter((x) => x.current))
                      notify("Signed out of every other device")
                    }}
                  >
                    Sign out of other devices
                  </Button>
                )}
              </div>
              <ul className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {devices.map((d) => (
                    <motion.li
                      key={d.id}
                      layout
                      exit={{ opacity: 0, x: 16, transition: transition.fast }}
                      transition={spring.soft}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground" aria-hidden="true">
                        <d.icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                        <p className="truncate text-caption text-muted-foreground">{d.meta}</p>
                      </div>
                      {d.current ? (
                        <Badge tone="success" dot>
                          Active now
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDevices((list) => list.filter((x) => x.id !== d.id))
                            notify(`Signed out of ${d.name}`)
                          }}
                        >
                          Sign out
                        </Button>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          </div>
        )
    }
  }

  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader title="Settings" description="Your profile, notifications and classroom defaults. Switches save as soon as you change them." />

      <Stagger className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]" stagger={0.05}>
        <StaggerItem>
          <nav aria-label="Settings sections" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 lg:sticky lg:top-0 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {SECTIONS.map((s) => {
              const active = s.id === section
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors lg:w-full",
                    active ? "text-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  {active && <motion.span layoutId="teacher-settings-nav" transition={spring.snappy} aria-hidden="true" className="absolute inset-0 rounded-md border border-border bg-surface shadow-[var(--elev-xs)]" />}
                  <s.icon className={cn("relative h-4 w-4 shrink-0", active ? "text-primary-text" : "")} aria-hidden="true" />
                  <span className="relative whitespace-nowrap">{s.label}</span>
                </button>
              )
            })}
          </nav>
        </StaggerItem>

        <StaggerItem className="min-w-0">
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle>{current.label}</CardTitle>
              <p className="text-sm text-muted-foreground">{current.detail}</p>
            </CardHeader>
            <CardContent className="pt-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={section} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: transition.fast }} transition={transition.base}>
                  {content()}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </StaggerItem>
      </Stagger>
    </div>
  )
}
