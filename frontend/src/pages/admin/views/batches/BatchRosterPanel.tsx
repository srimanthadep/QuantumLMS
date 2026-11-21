import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRightLeft, Clock3, Download, Loader2, MoreHorizontal, MousePointerClick, RefreshCw, Search, SearchX, TrendingUp, Trash2, UserPlus, Users, X } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Field from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { CustomSelect } from "@/components/ui/select"
import { SegmentedControl } from "@/components/ui/tabs"
import type { AdminBatch, BatchAvailableStudent, BatchRosterStatus, BatchRosterStudent, useAdminStore } from "@/data/adminStore"
import { cn } from "@/lib/utils"
import ConfirmDialog, { type ConfirmRequest } from "../shared/ConfirmDialog"
import BatchEnrollmentPanel from "./BatchEnrollmentPanel"
import { seatTone, seatUtilization } from "./batchTheme"
import { EmptyBlock, InlineAlert, MiniStat, TabHeader } from "./parts"

interface BatchRosterPanelProps {
  batch: AdminBatch
  allBatches: AdminBatch[]
  store: ReturnType<typeof useAdminStore>
  onToast?: (msg: string) => void
  onBusyChange: (busy: boolean) => void
  onRosterLoaded?: (liveBatch: AdminBatch, studentCount: number) => void
}

const STATUSES: BatchRosterStatus[] = ["Active", "Waitlisted", "At Risk", "Paused", "Completed"]
const STATUS_TONE: Record<BatchRosterStatus, BadgeTone> = { Active: "success", Waitlisted: "warning", Completed: "info", Paused: "neutral", "At Risk": "danger" }
type Filter = "All" | BatchRosterStatus

const csvCell = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`
const formatDate = (iso: string) => {
  if (!iso) return "—"
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

/** Learners tab: who is in the cohort, how they're doing, and quick actions per learner. */
export default function BatchRosterPanel({ batch, allBatches, store, onToast, onRosterLoaded, onBusyChange }: BatchRosterPanelProps) {
  const { fetchBatchStudents, addStudentsToBatch, updateBatchStudent, removeStudentFromBatch } = store
  const [loading, setLoading] = useState(false)
  const [liveBatch, setLiveBatch] = useState<AdminBatch>(batch)
  const [students, setStudents] = useState<BatchRosterStudent[]>([])
  const [available, setAvailable] = useState<BatchAvailableStudent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("All")
  const [addOpen, setAddOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [transfer, setTransfer] = useState<{ student: BatchRosterStudent; targetId: string } | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const activeBatch = liveBatch.id === batch.id ? { ...batch, enrolledSeats: liveBatch.enrolledSeats, waitlistedSeats: liveBatch.waitlistedSeats } : batch
  /** Lesson progress only means something when the batch is labelled with a topic course. */
  const hasTopic = Boolean(activeBatch.courseId)

  const loadRoster = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBatchStudents(batch.id)
      setLiveBatch(data.batch)
      setStudents(data.students)
      setAvailable(data.availableStudents)
      onRosterLoaded?.(data.batch, data.students.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the learners in this batch.")
    } finally {
      setLoading(false)
    }
  }, [batch.id, fetchBatchStudents, onRosterLoaded])

  useEffect(() => {
    setLiveBatch(batch)
    setAddOpen(false)
    setSearch("")
    setFilter("All")
    void loadRoster()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch.id, loadRoster])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { All: students.length, Active: 0, Waitlisted: 0, Completed: 0, Paused: 0, "At Risk": 0 }
    for (const s of students) c[s.status] = (c[s.status] ?? 0) + 1
    return c
  }, [students])

  const insights = useMemo(() => {
    const progressAvg = students.length ? Math.round(students.reduce((sum, s) => sum + (s.courseProgress || 0), 0) / students.length) : 0
    const rated = students.filter((s) => s.attendanceRate != null)
    const joinAvg = rated.length ? Math.round(rated.reduce((sum, s) => sum + (s.attendanceRate ?? 0), 0) / rated.length) : null
    return { progressAvg, joinAvg }
  }, [students])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter(
      (s) => (filter === "All" || s.status === filter) && (!q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)),
    )
  }, [students, search, filter])

  const otherBatches = useMemo(() => allBatches.filter((b) => b.id !== activeBatch.id && b.status !== "Archived"), [allBatches, activeBatch.id])

  const withBusy = async (student: BatchRosterStudent, action: () => Promise<void>, fallback: string) => {
    setBusyId(student.id)
    setError(null)
    try {
      await action()
      await loadRoster()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback)
      return false
    } finally {
      setBusyId(null)
    }
  }

  const changeStatus = (student: BatchRosterStudent, next: BatchRosterStatus) => {
    if (next === student.status) return
    void withBusy(
      student,
      async () => {
        await updateBatchStudent(activeBatch.id, student.id, { status: next })
        onToast?.(`${student.name} marked ${next}`)
      },
      "Could not update the learner's status.",
    )
  }

  const doTransfer = async () => {
    if (!transfer || !transfer.targetId || transfer.targetId === activeBatch.id) return
    const { student, targetId } = transfer
    const targetName = allBatches.find((b) => b.id === targetId)?.name ?? "the other batch"
    const ok = await withBusy(
      student,
      async () => {
        await updateBatchStudent(activeBatch.id, student.id, { targetBatchId: targetId })
        onToast?.(`Moved ${student.name} to ${targetName}`)
      },
      "Could not move the learner.",
    )
    if (ok) setTransfer(null)
  }

  const askRemove = (student: BatchRosterStudent) =>
    setConfirm({
      title: `Remove ${student.name}?`,
      description: `They leave ${activeBatch.name}. Their course enrollment and submitted work are kept.`,
      confirmLabel: "Remove learner",
      onConfirm: async () => {
        const ok = await withBusy(
          student,
          async () => {
            await removeStudentFromBatch(activeBatch.id, student.id)
            onToast?.(`Removed ${student.name} from ${activeBatch.name}`)
          },
          "Could not remove the learner.",
        )
        return ok
      },
    })

  const exportCsv = () => {
    if (students.length === 0) return
    const headers = ["Roll Number", "Name", "Email", "Status", "Join click %", "Progress %", "Joined"]
    const lines = [
      headers.map(csvCell).join(","),
      ...students.map((s) => [s.rollNumber, s.name, s.email, s.status, s.attendanceRate ?? "", hasTopic ? s.courseProgress : "", s.enrolledAt].map(csvCell).join(",")),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${activeBatch.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-roster.csv`
    link.click()
    URL.revokeObjectURL(url)
    onToast?.(`Exported ${students.length} learner record${students.length === 1 ? "" : "s"}`)
  }

  const pct = seatUtilization(activeBatch.enrolledSeats, activeBatch.maxSeats)
  const seatsLeft = Math.max(0, activeBatch.maxSeats - activeBatch.enrolledSeats)

  return (
    <div className="space-y-5">
      <TabHeader title="Learners" description="Everyone in this cohort: seats, progress and quick actions.">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Reload learners" onClick={() => void loadRoster()} disabled={loading}>
          <RefreshCw className={cn(loading && "animate-spin")} aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={students.length === 0} onClick={exportCsv} leftIcon={<Download aria-hidden="true" />}>
          Export CSV
        </Button>
        <Button type="button" size="sm" disabled={loading} onClick={() => setAddOpen(true)} leftIcon={<UserPlus aria-hidden="true" />}>
          Add learners
        </Button>
      </TabHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon={Users} label="Seats filled" value={`${activeBatch.enrolledSeats} / ${activeBatch.maxSeats}`} tone="primary" hint={seatsLeft ? `${seatsLeft} left` : "Batch is full"}>
          <div className="mt-2">
            <Progress value={pct} size="xs" tone={seatTone(pct)} label="Seats filled" />
          </div>
        </MiniStat>
        <MiniStat
          icon={Clock3}
          label="Waitlist"
          value={activeBatch.waitlistedSeats ?? 0}
          tone="warning"
          hint={(activeBatch.waitlistedSeats ?? 0) > 0 ? "Show waitlisted" : "Nobody waiting"}
          active={filter === "Waitlisted"}
          onClick={() => setFilter((f) => (f === "Waitlisted" ? "All" : "Waitlisted"))}
        />
        <MiniStat icon={TrendingUp} label="Avg. progress" value={hasTopic ? `${insights.progressAvg}%` : "—"} tone="success" hint={hasTopic ? "Topic course completion" : "No topic course"} />
        <MiniStat
          icon={MousePointerClick}
          label="Avg. join rate"
          value={insights.joinAvg == null ? "—" : `${insights.joinAvg}%`}
          tone="info"
          hint={insights.joinAvg == null ? "No ended classes yet" : "Join clicks per class"}
        />
      </div>

      {error && (
        <InlineAlert
          tone="danger"
          action={
            <Button size="sm" variant="outline" onClick={() => void loadRoster()} disabled={loading}>
              Try again
            </Button>
          }
        >
          {error}
        </InlineAlert>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-3 lg:flex-row lg:items-center">
          <Input
            leading={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
            trailing={
              search ? (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null
            }
            placeholder="Search name, email or roll number"
            aria-label="Search learners"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="lg:max-w-xs lg:flex-1"
          />
          <div className="no-scrollbar -mx-1 overflow-x-auto px-1 lg:ml-auto">
            <SegmentedControl
              size="sm"
              aria-label="Filter learners by status"
              className="[&_button]:whitespace-nowrap"
              value={filter}
              onChange={setFilter}
              options={(["All", ...STATUSES] as Filter[]).map((s) => ({ value: s, label: `${s} ${counts[s] ?? 0}` }))}
            />
          </div>
        </div>

        {loading && students.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading learners…
          </div>
        ) : visible.length === 0 ? (
          <div className="p-4">
            <EmptyBlock
              icon={students.length === 0 ? Users : SearchX}
              title={students.length === 0 ? "No learners yet" : "No learners match"}
              description={students.length === 0 ? "Add learners from your directory, or create a new learner for this cohort." : "Try another search or status."}
            >
              {students.length === 0 ? (
                <Button size="sm" onClick={() => setAddOpen(true)} leftIcon={<UserPlus aria-hidden="true" />}>
                  Add learners
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch("")
                    setFilter("All")
                  }}
                >
                  Clear filters
                </Button>
              )}
            </EmptyBlock>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,2.2fr)_120px_minmax(0,1.2fr)_100px_110px_44px] gap-4 border-b border-border bg-surface-2/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
              <span>Learner</span>
              <span>Status</span>
              <span>Progress</span>
              <span>Join rate</span>
              <span>Joined</span>
              <span className="sr-only">Actions</span>
            </div>
            <ul className="divide-y divide-border" aria-busy={loading}>
              {visible.map((s) => {
                const busy = busyId === s.id
                return (
                  <li
                    key={s.id}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2 px-4 py-3 md:gap-x-4 transition-colors hover:bg-surface-2/50 md:grid-cols-[minmax(0,2.2fr)_120px_minmax(0,1.2fr)_100px_110px_44px]",
                      busy && "opacity-60",
                    )}
                  >
                    <div className="order-1 flex min-w-0 items-center gap-3 md:order-none">
                      <Avatar src={s.avatarUrl || undefined} name={s.name} size="sm" />
                      <div className="min-w-0">
                        <p className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{s.name}</span>
                          {s.rollNumber && <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{s.rollNumber}</span>}
                        </p>
                        <p className="truncate text-caption text-muted-foreground">{s.email}</p>
                      </div>
                    </div>
                    <div className="order-2 md:order-none">
                      <Badge tone={STATUS_TONE[s.status]} dot>
                        {s.status}
                      </Badge>
                    </div>
                    <div className="order-4 col-span-3 flex items-center gap-2 md:order-none md:col-span-1">
                      <span className="w-14 shrink-0 text-caption text-muted-foreground md:hidden">Progress</span>
                      {hasTopic ? (
                        <>
                          <Progress value={s.courseProgress} size="xs" tone={s.courseProgress >= 100 ? "success" : "primary"} label={`${s.name} progress`} className="min-w-0 flex-1" />
                          <span className="w-9 shrink-0 text-right text-caption font-medium tabular-nums text-foreground">{s.courseProgress}%</span>
                        </>
                      ) : (
                        <span className="text-caption text-subtle-foreground">—</span>
                      )}
                    </div>
                    <div className="order-5 text-caption tabular-nums text-muted-foreground md:order-none md:text-sm md:text-foreground">
                      <span className="md:hidden">Join rate </span>
                      {s.attendanceRate == null ? <span className="text-muted-foreground">—</span> : `${s.attendanceRate}%`}
                    </div>
                    <div className="order-6 col-span-2 text-right text-caption text-muted-foreground md:order-none md:col-span-1 md:text-left">
                      <span className="md:hidden">Joined </span>
                      {formatDate(s.enrolledAt)}
                    </div>
                    <div className="order-3 flex justify-end md:order-none">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${s.name}`} disabled={busy}>
                            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MoreHorizontal aria-hidden="true" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel>Status</DropdownMenuLabel>
                          <DropdownMenuRadioGroup value={s.status} onValueChange={(v) => changeStatus(s, v as BatchRosterStatus)}>
                            {STATUSES.map((st) => (
                              <DropdownMenuRadioItem key={st} value={st}>
                                {st}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled={otherBatches.length === 0} onSelect={() => setTransfer({ student: s, targetId: "" })}>
                            <ArrowRightLeft className="h-4 w-4" aria-hidden="true" /> Move to another batch
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive onSelect={() => askRemove(s)}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove from batch
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="border-t border-border px-4 py-2.5 text-caption text-muted-foreground" aria-live="polite">
              Showing <span className="font-medium text-foreground">{visible.length}</span> of {students.length}
            </div>
          </>
        )}
      </Card>

      <BatchEnrollmentPanel
        open={addOpen}
        onOpenChange={setAddOpen}
        batch={activeBatch}
        available={available}
        addStudents={addStudentsToBatch}
        onAdded={async () => {
          await loadRoster()
          setAddOpen(false)
        }}
        onBusyChange={onBusyChange}
        onToast={onToast}
      />

      <Dialog open={!!transfer} onOpenChange={(o) => !o && !busyId && setTransfer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move {transfer?.student.name}</DialogTitle>
            <DialogDescription>They move to the chosen batch with their course access intact.</DialogDescription>
          </DialogHeader>
          <Field label="Destination batch">
            <CustomSelect
              value={transfer?.targetId ?? ""}
              placeholder="Choose a batch"
              onChange={(v) => setTransfer((t) => (t ? { ...t, targetId: v } : t))}
              options={otherBatches.map((b) => ({ value: b.id, label: b.name }))}
            />
          </Field>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setTransfer(null)} disabled={!!busyId}>
              Cancel
            </Button>
            <Button onClick={() => void doTransfer()} loading={!!busyId} disabled={!transfer?.targetId} leftIcon={<ArrowRightLeft aria-hidden="true" />}>
              Move learner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
