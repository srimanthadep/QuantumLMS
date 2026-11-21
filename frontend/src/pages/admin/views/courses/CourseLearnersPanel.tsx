import { useCallback, useEffect, useMemo, useState } from "react"
import { Award, ChevronRight, Download, RefreshCw, Search, SearchX, TrendingUp, UserPlus, Users, type LucideIcon } from "lucide-react"
import { ManualEnrolModal } from "@/components/AdminModals"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { SegmentedControl } from "@/components/ui/tabs"
import type { useAdminStore } from "@/data/adminStore"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import Student360Sheet from "../shared/Student360Sheet"
import { PanelHeader, WorkspaceEmpty } from "./WorkspaceParts"

export interface CourseLearner {
  id: string
  name: string
  email: string
  avatar_url: string | null
  roll_number: string
  enrolled_at: string
  last_activity: string | null
  completed_lessons: number
  total_lessons: number
  progress: number
  certified: boolean
  source: "paid" | "free_or_added"
}

type Filter = "all" | "progress" | "done" | "new"

interface CourseLearnersPanelProps {
  courseId: string
  courseTitle: string
  store: ReturnType<typeof useAdminStore>
  onToast: (msg: string) => void
  /** Tells the page header the live learner count. */
  onCount?: (count: number) => void
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
const dateLabel = (iso: string | null) => {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}
const ago = (iso: string | null) => {
  if (!iso) return "No activity yet"
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days} days ago`
  return dateLabel(iso)
}
const isDone = (l: CourseLearner) => l.certified || (l.total_lessons > 0 && l.progress >= 100)
const isActiveThisWeek = (l: CourseLearner) => Boolean(l.last_activity) && Date.now() - new Date(l.last_activity as string).getTime() < 7 * 86_400_000

function Stat({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-subtle-foreground">{hint}</p>
    </div>
  )
}

/** Learners tab: everyone enrolled in this course, however they joined, with their progress. */
export default function CourseLearnersPanel({ courseId, courseTitle, store, onToast, onCount }: CourseLearnersPanelProps) {
  const [learners, setLearners] = useState<CourseLearner[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [enrolOpen, setEnrolOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ learners: CourseLearner[] }>(`/admin/courses/${encodeURIComponent(courseId)}/learners`, { bypassCache: true })
      setLearners(res.learners)
      onCount?.(res.learners.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load learners.")
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(() => {
    const all = learners ?? []
    return {
      all: all.length,
      progress: all.filter((l) => !isDone(l) && l.progress > 0).length,
      done: all.filter(isDone).length,
      new: all.filter((l) => l.progress === 0 && !isDone(l)).length,
    }
  }, [learners])

  const stats = useMemo(() => {
    const all = learners ?? []
    const n = all.length
    return {
      active: all.filter(isActiveThisWeek).length,
      completion: n ? Math.round((all.filter(isDone).length / n) * 100) : 0,
      avg: n ? Math.round(all.reduce((sum, l) => sum + l.progress, 0) / n) : 0,
    }
  }, [learners])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (learners ?? []).filter((l) => {
      if (filter === "progress" && (isDone(l) || l.progress === 0)) return false
      if (filter === "done" && !isDone(l)) return false
      if (filter === "new" && (l.progress > 0 || isDone(l))) return false
      return !q || l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.roll_number.toLowerCase().includes(q)
    })
  }, [learners, search, filter])

  const exportCsv = () => {
    const rows = [["Name", "Email", "Roll number", "Joined via", "Progress %", "Lessons done", "Total lessons", "Certificate", "Last active", "Enrolled on"]]
    for (const l of visible) {
      rows.push([l.name, l.email, l.roll_number, l.source === "paid" ? "Paid" : "Free or added", l.progress, l.completed_lessons, l.total_lessons, l.certified ? "Yes" : "No", l.last_activity ?? "", l.enrolled_at].map(String))
    }
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${courseTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "course"}-learners.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const enrol = async (data: { name: string; email: string; courseId: string; batchId: string }) => {
    await store.enrolStudent(data)
    await load()
    onToast(`${data.name} enrolled`)
  }

  return (
    <div className="space-y-5">
      <PanelHeader
        title="Learners"
        description="Everyone enrolled in this course, whichever way they joined."
        badge={learners ? <Badge tone="neutral">{learners.length}</Badge> : undefined}
      >
        <Button variant="outline" size="sm" leftIcon={<Download />} onClick={exportCsv} disabled={!visible.length}>
          Export CSV
        </Button>
        <Button size="sm" leftIcon={<UserPlus />} onClick={() => setEnrolOpen(true)}>
          Enrol learner
        </Button>
      </PanelHeader>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
          <Button size="sm" variant="outline" leftIcon={<RefreshCw />} onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      {!learners && loading && (
        <div className="space-y-2" role="status" aria-label="Loading learners">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {learners && learners.length === 0 && (
        <WorkspaceEmpty icon={Users} title="No learners yet" description="Learners appear here as soon as they enrol, buy this course or are added by your team.">
          <Button size="sm" leftIcon={<UserPlus />} onClick={() => setEnrolOpen(true)}>
            Enrol a learner
          </Button>
        </WorkspaceEmpty>
      )}

      {learners && learners.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={Users} label="Learners" value={counts.all} hint={`${counts.new} not started yet`} />
            <Stat icon={RefreshCw} label="Active this week" value={stats.active} hint={stats.active === 1 ? "learner studied recently" : "learners studied recently"} />
            <Stat icon={Award} label="Completed" value={counts.done} hint={`${stats.completion}% completion rate`} />
            <Stat icon={TrendingUp} label="Average progress" value={`${stats.avg}%`} hint="across all learners" />
          </div>

          <Card className="overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" aria-hidden="true" />
                <Input aria-label="Search learners" placeholder="Search name, email or roll number" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <SegmentedControl<Filter>
                aria-label="Filter learners"
                size="sm"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: `All ${counts.all}` },
                  { value: "progress", label: `In progress ${counts.progress}` },
                  { value: "done", label: `Completed ${counts.done}` },
                  { value: "new", label: `Not started ${counts.new}` },
                ]}
              />
            </div>

            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <SearchX className="h-6 w-6 text-subtle-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">No learners match</p>
                <p className="text-xs text-muted-foreground">Try a different name or filter.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch("")
                    setFilter("all")
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <ul aria-label="Learners" className="divide-y divide-border">
                <li aria-hidden="true" className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_120px_28px] gap-4 bg-surface-2/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
                  <span>Learner</span>
                  <span>Progress</span>
                  <span>Last active</span>
                  <span />
                </li>
                {visible.map((l) => {
                  const done = isDone(l)
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(l.id)}
                        aria-label={`Open ${l.name}'s Student 360 profile`}
                        className="group grid w-full grid-cols-[minmax(0,1fr)_28px] items-center gap-x-4 gap-y-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60 focus-visible:bg-surface-2/60 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_120px_28px]"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <Avatar name={l.name} src={l.avatar_url} size="md" />
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-foreground">{l.name}</span>
                              {l.roll_number && <span className="hidden shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">{l.roll_number}</span>}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">{l.email}</span>
                          </span>
                        </span>

                        <ChevronRight className="col-start-2 row-start-1 h-4 w-4 justify-self-end text-subtle-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground md:col-start-4" aria-hidden="true" />

                        <span className="col-span-2 min-w-0 md:col-span-1">
                          <span className="flex items-center gap-3">
                            <Progress value={l.progress} size="sm" tone={done ? "success" : "primary"} label={`${l.name} progress`} className="flex-1" />
                            <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">{l.progress}%</span>
                          </span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {done ? (
                              <Badge tone="success">
                                <Award className="h-3 w-3" aria-hidden="true" />
                                Completed
                              </Badge>
                            ) : l.progress > 0 ? (
                              <Badge tone="info">In progress</Badge>
                            ) : (
                              <Badge tone="neutral">Not started</Badge>
                            )}
                            <Badge tone={l.source === "paid" ? "success" : "neutral"}>{l.source === "paid" ? "Paid" : "Free or added"}</Badge>
                            <span className="text-[11px] text-subtle-foreground tabular-nums">
                              {l.completed_lessons}/{l.total_lessons} lessons
                            </span>
                          </span>
                        </span>

                        <span className={cn("col-span-2 text-xs md:col-span-1", l.last_activity ? "text-foreground" : "text-subtle-foreground")}>
                          <span className="md:hidden text-subtle-foreground">Last active: </span>
                          {ago(l.last_activity)}
                          <span className="block text-[11px] text-subtle-foreground">Joined {dateLabel(l.enrolled_at)}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{visible.length}</span> of {learners.length} · Select a learner to open their full profile
            </div>
          </Card>
        </>
      )}

      <Student360Sheet
        studentId={openId}
        focusCourseId={courseId}
        preview={(() => {
          const l = learners?.find((x) => x.id === openId)
          return l ? { name: l.name, email: l.email, avatar_url: l.avatar_url, roll_number: l.roll_number } : undefined
        })()}
        onClose={() => setOpenId(null)}
      />

      <ManualEnrolModal isOpen={enrolOpen} onClose={() => setEnrolOpen(false)} onEnrol={enrol} courses={store.courses} batches={store.batches} initialCourseId={courseId} />
    </div>
  )
}
