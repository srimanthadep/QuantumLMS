import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
  Award,
  BookOpen,
  BookOpenCheck,
  Check,
  Clock3,
  Copy,
  GraduationCap,
  IndianRupee,
  Layers,
  Mail,
  MapPin,
  Phone,
  Receipt,
  RefreshCw,
  TrendingUp,
  UserPlus,
  Video,
  type LucideIcon,
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { cn, formatINR } from "@/lib/utils"

export interface Student360Data {
  student: { id: string; name: string; email: string; avatar_url: string | null; roll_number: string; phone: string; location: string; joined_at: string | null; disabled: boolean }
  totals: { courses: number; batches: number; lessons_completed: number; certificates: number; attendance: number | null; paid: number }
  courses: { id: string; title: string; category: string; enrolled_at: string | null; last_activity: string | null; completed_lessons: number; total_lessons: number; progress: number; certified: boolean; source: "paid" | "free_or_added" }[]
  batches: { id: string; name: string; instructor: string; lifecycle: string; status: string; enrolled_at: string | null; start_date: string; end_date: string; sessions_held: number; sessions_attended: number; attendance: number | null }[]
  payments: { id: string; title: string; kind: "course" | "batch"; amount: number; refunded: number; status: string; method: string | null; at: string | null }[]
  activity: { day: string; minutes: number; lessons: number }[]
  timeline: { kind: string; title: string; detail: string | null; at: string | null }[]
}

interface Student360SheetProps {
  /** The learner to open. Null closes the sheet. */
  studentId: string | null
  /** Shown instantly while the full profile loads. */
  preview?: { name: string; email: string; avatar_url?: string | null; roll_number?: string }
  /** Highlights this course when the sheet is opened from its Learners tab. */
  focusCourseId?: string
  onClose: () => void
}

const dateLabel = (iso: string | null | undefined) => {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}
const ago = (iso: string | null | undefined) => {
  if (!iso) return "No activity yet"
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days} days ago`
  return dateLabel(iso)
}

const KIND: Record<string, { icon: LucideIcon; tone: string; label: (title: string, detail: string | null) => ReactNode }> = {
  lesson: { icon: BookOpenCheck, tone: "bg-success-soft text-success", label: (t) => <>Completed <b className="font-semibold text-foreground">{t}</b></> },
  session: { icon: Video, tone: "bg-info-soft text-info", label: (t) => <>Joined live class <b className="font-semibold text-foreground">{t}</b></> },
  certificate: { icon: Award, tone: "bg-warning-soft text-warning", label: (t) => <>Earned <b className="font-semibold text-foreground">{t}</b></> },
  payment: { icon: Receipt, tone: "bg-primary-soft text-primary-text", label: (t) => <>Paid for <b className="font-semibold text-foreground">{t}</b></> },
  enrolled: { icon: UserPlus, tone: "bg-surface-2 text-muted-foreground", label: (t) => <>Enrolled in <b className="font-semibold text-foreground">{t}</b></> },
}
const PAY_TONE: Record<string, BadgeTone> = { paid: "success", refunded: "warning", failed: "danger", expired: "neutral", created: "neutral" }

function Stat({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {hint && <p className="truncate text-[11px] text-subtle-foreground">{hint}</p>}
    </div>
  )
}

function Empty({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong px-6 py-10 text-center">
      <Icon className="h-5 w-5 text-subtle-foreground" aria-hidden="true" />
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  )
}

/** Student 360: one place to see how a learner is doing across courses, live batches and payments. */
export default function Student360Sheet({ studentId, preview, focusCourseId, onClose }: Student360SheetProps) {
  const [data, setData] = useState<Student360Data | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState("overview")
  const [copied, setCopied] = useState(false)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      setData(await api.get<Student360Data>(`/admin/students/${encodeURIComponent(id)}/360`, { bypassCache: true }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load this learner.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!studentId) return
    setData(null)
    setTab("overview")
    void load(studentId)
  }, [studentId, load])

  const s = data?.student
  const name = s?.name ?? preview?.name ?? "Learner"
  const email = s?.email ?? preview?.email ?? ""
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard can be blocked; the address is still on screen */
    }
  }

  const minutes = data?.activity.reduce((n, a) => n + a.minutes, 0) ?? 0
  const lessons14 = data?.activity.reduce((n, a) => n + a.lessons, 0) ?? 0
  const peak = Math.max(1, ...(data?.activity.map((a) => a.minutes) ?? [1]))
  const lastSeen = data?.timeline[0]?.at ?? null

  return (
    <Sheet open={Boolean(studentId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-[580px] gap-0 p-0">
        <SheetHeader className="gap-0 border-b border-border bg-surface-2/50 px-5 pb-5 pt-6 sm:px-6">
          <div className="flex items-start gap-4">
            <Avatar name={name} src={s?.avatar_url ?? preview?.avatar_url} size="xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-text">Student 360</p>
              <SheetTitle className="mt-0.5 truncate text-xl">{name}</SheetTitle>
              <SheetDescription className="mt-0.5 truncate text-xs">{email}</SheetDescription>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {(s?.roll_number || preview?.roll_number) && <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{s?.roll_number || preview?.roll_number}</span>}
                {s && <Badge tone={s.disabled ? "danger" : "success"} dot>{s.disabled ? "Disabled" : "Active"}</Badge>}
                {s && <span className="text-[11px] text-muted-foreground">Joined {dateLabel(s.joined_at)}</span>}
              </div>
              {(s?.phone || s?.location) && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  {s.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" aria-hidden="true" />
                      {s.phone}
                    </span>
                  )}
                  {s.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {s.location}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {email && (
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm" variant="outline" leftIcon={<Mail />}>
                <a href={`mailto:${email}`}>Email</a>
              </Button>
              <Button size="sm" variant="ghost" leftIcon={copied ? <Check /> : <Copy />} onClick={() => void copyEmail()}>
                {copied ? "Copied" : "Copy email"}
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="px-5 py-5 sm:px-6">
          {error && (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
              <Button size="sm" variant="outline" leftIcon={<RefreshCw />} onClick={() => studentId && void load(studentId)}>
                Retry
              </Button>
            </div>
          )}

          {!data && loading && (
            <div className="space-y-4" role="status" aria-label="Loading learner">
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-[72px]" />
                ))}
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {data && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat icon={BookOpen} label="Courses" value={data.totals.courses} hint={`${data.totals.certificates} certified`} />
                <Stat icon={Layers} label="Live batches" value={data.totals.batches} />
                <Stat icon={GraduationCap} label="Lessons done" value={data.totals.lessons_completed} />
                <Stat icon={Video} label="Class attendance" value={data.totals.attendance === null ? "—" : `${data.totals.attendance}%`} hint={data.totals.attendance === null ? "No classes yet" : undefined} />
                <Stat icon={Award} label="Certificates" value={data.totals.certificates} />
                <Stat icon={IndianRupee} label="Paid" value={formatINR(data.totals.paid)} />
              </div>

              <Tabs value={tab} onValueChange={setTab} variant="underline">
                <TabsList aria-label="Learner sections" className="w-full justify-start">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="courses">
                    Courses <span className="tabular-nums text-subtle-foreground">{data.courses.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="batches">
                    Batches <span className="tabular-nums text-subtle-foreground">{data.batches.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="payments">
                    Payments <span className="tabular-nums text-subtle-foreground">{data.payments.length}</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-5 space-y-5">
                  <section aria-label="Last 14 days" className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <TrendingUp className="h-4 w-4 text-primary-text" aria-hidden="true" />
                          Last 14 days
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {minutes > 0 ? `${minutes} min studied · ${lessons14} lesson${lessons14 === 1 ? "" : "s"} completed` : "No study time recorded"}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock3 className="h-3 w-3" aria-hidden="true" />
                        Last seen {ago(lastSeen)}
                      </span>
                    </div>
                    <div role="img" aria-label={`Study minutes per day for the last 14 days, ${minutes} in total`} className="mt-4 flex h-16 items-end gap-1">
                      {data.activity.map((a) => (
                        <div key={a.day} title={`${dateLabel(a.day)} · ${a.minutes} min`} className="flex h-full flex-1 items-end">
                          <div className={cn("w-full rounded-sm", a.minutes > 0 ? "bg-primary" : "bg-surface-3")} style={{ height: a.minutes > 0 ? `${Math.max(12, (a.minutes / peak) * 100)}%` : "4px" }} />
                        </div>
                      ))}
                    </div>
                  </section>

                  <section aria-label="Recent activity">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Recent activity</h3>
                    {data.timeline.length === 0 ? (
                      <Empty icon={Clock3} text="Nothing has happened on this account yet." />
                    ) : (
                      <ol className="space-y-0">
                        {data.timeline.map((t, i) => {
                          const k = KIND[t.kind] ?? KIND.enrolled
                          return (
                            <li key={`${t.kind}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                              {i < data.timeline.length - 1 && <span className="absolute left-4 top-8 h-[calc(100%-1.75rem)] w-px bg-border" aria-hidden="true" />}
                              <span className={cn("relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full", k.tone)}>
                                <k.icon className="h-4 w-4" aria-hidden="true" />
                              </span>
                              <div className="min-w-0 flex-1 pt-1">
                                <p className="text-xs leading-snug text-muted-foreground">{k.label(t.title, t.detail)}</p>
                                <p className="mt-0.5 truncate text-[11px] text-subtle-foreground">
                                  {t.detail ? `${t.detail} · ` : ""}
                                  {ago(t.at)}
                                </p>
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </section>
                </TabsContent>

                <TabsContent value="courses" className="mt-5 space-y-3">
                  {data.courses.length === 0 && <Empty icon={BookOpen} text="Not enrolled in any course yet." />}
                  {[...data.courses].sort((a, b) => Number(b.id === focusCourseId) - Number(a.id === focusCourseId)).map((c) => (
                    <article key={c.id} className={cn("rounded-lg border bg-surface p-4", c.id === focusCourseId ? "border-primary-border ring-1 ring-primary/15" : "border-border")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-semibold text-foreground">{c.title}</h4>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.category} · Enrolled {dateLabel(c.enrolled_at)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {c.certified && (
                            <Badge tone="success">
                              <Award className="h-3 w-3" aria-hidden="true" />
                              Certified
                            </Badge>
                          )}
                          <Badge tone={c.source === "paid" ? "success" : "neutral"}>{c.source === "paid" ? "Paid" : "Free or added"}</Badge>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Progress value={c.progress} size="sm" tone={c.progress >= 100 || c.certified ? "success" : "primary"} label={`${c.title} progress`} className="flex-1" />
                        <span className="w-9 text-right text-xs font-semibold tabular-nums text-foreground">{c.progress}%</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-subtle-foreground tabular-nums">
                        {c.completed_lessons} of {c.total_lessons} lessons · Last active {ago(c.last_activity).toLowerCase()}
                      </p>
                    </article>
                  ))}
                </TabsContent>

                <TabsContent value="batches" className="mt-5 space-y-3">
                  {data.batches.length === 0 && <Empty icon={Layers} text="Not in any live batch." />}
                  {data.batches.map((b) => (
                    <article key={b.id} className="rounded-lg border border-border bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-semibold text-foreground">{b.name}</h4>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {b.instructor} · {b.start_date} to {b.end_date}
                          </p>
                        </div>
                        <Badge tone={b.status === "Active" ? "success" : b.status === "Waitlisted" ? "warning" : b.status === "At Risk" ? "danger" : "neutral"} dot>
                          {b.status}
                        </Badge>
                      </div>
                      {b.attendance === null ? (
                        <p className="mt-3 text-[11px] text-subtle-foreground">No classes held since they joined on {dateLabel(b.enrolled_at)}.</p>
                      ) : (
                        <>
                          <div className="mt-3 flex items-center gap-3">
                            <Progress value={b.attendance} size="sm" tone={b.attendance >= 75 ? "success" : b.attendance >= 50 ? "warning" : "danger"} label={`${b.name} attendance`} className="flex-1" />
                            <span className="w-9 text-right text-xs font-semibold tabular-nums text-foreground">{b.attendance}%</span>
                          </div>
                          <p className="mt-1.5 text-[11px] text-subtle-foreground tabular-nums">
                            Joined {b.sessions_attended} of {b.sessions_held} classes since {dateLabel(b.enrolled_at)}
                          </p>
                        </>
                      )}
                    </article>
                  ))}
                </TabsContent>

                <TabsContent value="payments" className="mt-5">
                  {data.payments.length === 0 ? (
                    <Empty icon={Receipt} text="No payments. This learner joined for free or was added by your team." />
                  ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                      {data.payments.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {p.kind === "batch" ? "Live batch" : "Course"} · {dateLabel(p.at)}
                              {p.method ? ` · ${p.method.toUpperCase()}` : ""}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums text-foreground">{formatINR(p.amount)}</p>
                            <Badge tone={PAY_TONE[p.status] ?? "neutral"} className="mt-0.5 capitalize">
                              {p.status}
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
