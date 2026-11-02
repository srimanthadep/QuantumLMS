import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { ClipboardCheck, Minus, Palette, Plus, ShieldCheck, SlidersHorizontal, User, X } from "lucide-react"
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
  ThemeControls,
} from "@/components/ui"
import { useToast } from "@/components/ui/toast"
import SaveButton, { useSaveState } from "@/components/shared/SaveButton"
import SecuritySettings from "@/components/shared/SecuritySettings"
import { useEvaluator } from "./data/EvaluatorDataProvider"
import { SORT_LABEL, type QueueSort } from "./data/derive"
import type { Preferences } from "./data/types"

type Tab = "profile" | "marking" | "appearance" | "security"

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile")
  const { isDemo } = useEvaluator()
  const session = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "marking" as const, label: "Marking", icon: SlidersHorizontal },
    { id: "appearance" as const, label: "Appearance", icon: Palette },
    { id: "security" as const, label: "Security", icon: ShieldCheck },
  ]
  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="Account" title="Settings" description="Your evaluator profile, how the desk works for you, theme and sign-in security." />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} orientation="vertical" className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
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
            <Profile />
          </TabsContent>
          <TabsContent value="marking" className="mt-0">
            <Marking />
          </TabsContent>
          <TabsContent value="appearance" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Theme</CardTitle>
                <p className="text-sm text-muted-foreground">Changes apply instantly across every page.</p>
              </CardHeader>
              <CardContent>
                <ThemeControls idPrefix="evaluator-settings-theme" className="max-w-md" />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="security" className="mt-0">
            <SecuritySettings
              isDemo={isDemo}
              ownAccountHint="evaluator account (ask your academy admin)"
              onToast={(m) => toast.show(m)}
              onLogout={() => {
                session.logout()
                navigate("/auth")
                toast.show("You have been signed out.")
              }}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function Profile() {
  const { profile, updateProfile } = useEvaluator()
  const toast = useToast()
  const initial = useMemo(() => ({ full_name: profile.full_name, title: profile.title, department: profile.department, specializations: profile.specializations }), [profile])
  const [form, setForm] = useState(initial)
  const [tag, setTag] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { saving, saved, run } = useSaveState()
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)

  const addTag = () => {
    const t = tag.trim()
    if (!t) return
    if (form.specializations.some((s) => s.toLowerCase() === t.toLowerCase())) {
      setTag("")
      return
    }
    if (form.specializations.length >= 12) {
      setError("Add up to 12 specialisations.")
      return
    }
    setForm((f) => ({ ...f, specializations: [...f.specializations, t.slice(0, 60)] }))
    setTag("")
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.full_name.trim().length < 2) {
      setError("Enter your full name.")
      return
    }
    setError(null)
    void run(
      async () => {
        await updateProfile({ full_name: form.full_name.trim(), title: form.title.trim() || "Evaluator", department: form.department.trim(), specializations: form.specializations })
        toast.success("Profile saved")
      },
      (m) => setError(m),
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center">
          <Avatar name={form.full_name || profile.full_name} src={profile.avatar_url} size="xl" />
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground">{form.full_name || profile.full_name}</p>
            <p className="text-sm text-muted-foreground">{form.title || "Evaluator"}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="primary">{profile.finished_total} evaluations finished</Badge>
              <Badge tone="success">{profile.released_total} released</Badge>
              {profile.is_demo && <Badge tone="warning">Shared demo account</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={error}>
            <Input value={form.full_name} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </Field>
          <Field label="Email" hint="Your sign-in email">
            <Input value={profile.email} disabled />
          </Field>
          <Field label="Title">
            <Input value={form.title} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field label="Department">
            <Input value={form.department} maxLength={160} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Specialisations" hint="Press Enter to add. Students don't see these.">
              <Input
                value={tag}
                maxLength={60}
                placeholder="e.g. Retrieval-augmented generation"
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
            </Field>
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Specialisations">
              <AnimatePresence initial={false}>
                {form.specializations.map((s) => (
                  <motion.li key={s} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: transition.fast }} transition={transition.fast}>
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary-border bg-primary-soft py-0.5 pl-2.5 pr-1 text-xs font-medium text-primary-text">
                      {s}
                      <button type="button" aria-label={`Remove ${s}`} onClick={() => setForm((f) => ({ ...f, specializations: f.specializations.filter((x) => x !== s) }))} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/15">
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </CardContent>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="ghost" disabled={!dirty || saving} onClick={() => setForm(initial)}>
            Discard
          </Button>
          <SaveButton dirty={dirty} saving={saving} saved={saved} />
        </div>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Assessments you mark</CardTitle>
          <p className="text-sm text-muted-foreground">Your academy admin assigns these. Ask them to add or remove one.</p>
        </CardHeader>
        <CardContent className="grid gap-1.5">
          {profile.assigned.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {profile.assigned.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
              <ClipboardCheck className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{a.title}</span>
              <Badge tone="neutral" size="sm">
                {a.course_code}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </form>
  )
}

function Marking() {
  const { profile, updateProfile } = useEvaluator()
  const toast = useToast()
  const prefs = profile.preferences
  const [goal, setGoal] = useState(prefs.daily_goal)
  const goalTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(goalTimer.current), [])
  const save = (patch: Partial<Preferences>, message: string) =>
    updateProfile({ preferences: patch })
      .then(() => toast.success(message))
      .catch((e: Error) => toast.error(`Couldn't save: ${e.message}`))
  // Quick clicks on the stepper save once, after the last one.
  const setDailyGoal = (n: number) => {
    const v = Math.max(1, Math.min(50, n))
    setGoal(v)
    clearTimeout(goalTimer.current)
    goalTimer.current = setTimeout(() => void save({ daily_goal: v }, `Daily goal set to ${v}`), 600)
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle>Queue</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Default order</p>
              <p className="text-caption text-muted-foreground">How the queue and "Start marking" order your work. Your drafts always come first.</p>
            </div>
            <Select value={prefs.queue_sort} onValueChange={(v) => void save({ queue_sort: v as QueueSort }, `Queue order: ${SORT_LABEL[v as QueueSort].toLowerCase()}`)}>
              <SelectTrigger aria-label="Default order" className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABEL) as QueueSort[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SORT_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <label htmlFor="pref-advance" className="min-w-0 cursor-pointer">
              <span className="block text-sm font-medium text-foreground">Open the next submission after finishing</span>
              <span className="block text-caption text-muted-foreground">Go straight to the next one to mark instead of staying on the finished evaluation.</span>
            </label>
            <Switch id="pref-advance" checked={prefs.auto_advance} onCheckedChange={(v) => void save({ auto_advance: v }, v ? "Auto-advance on" : "Auto-advance off")} />
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <label htmlFor="pref-levels" className="min-w-0 cursor-pointer">
              <span className="block text-sm font-medium text-foreground">Show performance levels</span>
              <span className="block text-caption text-muted-foreground">Quick picks for each rubric level, with the level's description.</span>
            </label>
            <Switch id="pref-levels" checked={prefs.show_levels} onCheckedChange={(v) => void save({ show_levels: v }, v ? "Levels shown" : "Levels hidden")} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Daily goal</p>
            <p className="text-caption text-muted-foreground">Evaluations to finish each day. The dashboard tracks it.</p>
          </div>
          <div className="flex items-center gap-1.5" role="group" aria-label="Daily goal">
            <Button variant="outline" size="icon-sm" aria-label="Lower the daily goal" disabled={goal <= 1} onClick={() => setDailyGoal(goal - 1)}>
              <Minus aria-hidden="true" />
            </Button>
            <span className="w-10 text-center text-lg font-semibold tabular-nums text-foreground" aria-live="polite">
              {goal}
            </span>
            <Button variant="outline" size="icon-sm" aria-label="Raise the daily goal" disabled={goal >= 50} onClick={() => setDailyGoal(goal + 1)}>
              <Plus aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
