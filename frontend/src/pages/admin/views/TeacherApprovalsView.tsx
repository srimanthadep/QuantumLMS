import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import { CircleCheck, CircleX, ClipboardCheck, Hourglass, Inbox, RotateCcw, Search, SearchX, TrendingUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import EmptyState from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { SegmentedControl } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import ApprovalDetail from "./approvals/ApprovalDetail"
import ApprovalListItem from "./approvals/ApprovalListItem"
import {
  CATEGORIES,
  CATEGORY_META,
  SEED_APPROVALS,
  STORAGE_KEY,
  loadApprovals,
  type ApprovalCategory,
  type ApprovalRecord,
  type ApprovalStatus,
} from "./approvals/approvalData"

export type { ApprovalRecord } from "./approvals/approvalData"

interface TeacherApprovalsViewProps {
  onToast: (msg: string) => void
}

type StatusFilter = ApprovalStatus | "All"
type CategoryFilter = ApprovalCategory | "all"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "Pending", label: "To review" },
  { value: "Approved", label: "Approved" },
  { value: "Revision Requested", label: "Changes requested" },
  { value: "All", label: "All" },
]

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [query])
  return matches
}

function Stat({ icon: Icon, label, value, hint, tone }: { icon: React.ElementType; label: string; value: string; hint: string; tone: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 shadow-xs">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", tone)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">{label}</p>
        <p className="truncate text-xl font-bold leading-6 tabular-nums text-foreground">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}

export default function TeacherApprovalsView({ onToast }: TeacherApprovalsViewProps) {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>(loadApprovals)
  const [status, setStatus] = useState<StatusFilter>("Pending")
  const [category, setCategory] = useState<CategoryFilter>("all")
  const [search, setSearch] = useState("")
  const query = useDeferredValue(search.trim().toLowerCase())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [checks, setChecks] = useState<Record<string, boolean[]>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [sheetOpen, setSheetOpen] = useState(false)
  const wide = useMediaQuery("(min-width: 1280px)")

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(approvals))
    } catch {
      // storage full or blocked; the queue still works in memory
    }
  }, [approvals])

  // ---- Derived numbers ----------------------------------------------------------
  const stats = useMemo(() => {
    const pending = approvals.filter((a) => a.status === "Pending")
    const approved = approvals.filter((a) => a.status === "Approved").length
    const revisions = approvals.filter((a) => a.status === "Revision Requested").length
    const decided = approved + revisions
    return {
      pending: pending.length,
      today: pending.filter((a) => a.submittedAt.startsWith("Today")).length,
      approved,
      revisions,
      rate: decided ? Math.round((approved / decided) * 100) : null,
    }
  }, [approvals])

  const statusCounts = useMemo(() => {
    const c: Record<StatusFilter, number> = { Pending: 0, Approved: 0, "Revision Requested": 0, All: approvals.length }
    approvals.forEach((a) => (c[a.status] += 1))
    return c
  }, [approvals])

  const byStatus = useMemo(() => (status === "All" ? approvals : approvals.filter((a) => a.status === status)), [approvals, status])

  const categoryCounts = useMemo(() => {
    const c = { all: byStatus.length } as Record<CategoryFilter, number>
    CATEGORIES.forEach((k) => (c[k] = byStatus.filter((a) => a.category === k).length))
    return c
  }, [byStatus])

  const visible = useMemo(() => {
    const list = byStatus.filter((a) => {
      if (category !== "all" && a.category !== category) return false
      if (!query) return true
      return `${a.title} ${a.courseName} ${a.courseCode} ${a.instructor} ${a.moduleName ?? ""}`.toLowerCase().includes(query)
    })
    // Pending first when showing everything.
    return status === "All" ? [...list].sort((a, b) => Number(b.status === "Pending") - Number(a.status === "Pending")) : list
  }, [byStatus, category, query, status])

  const activeIndex = Math.max(0, visible.findIndex((a) => a.id === activeId))
  const active = visible[activeIndex] ?? null
  const visiblePending = visible.filter((a) => a.status === "Pending")
  const selectedVisible = visiblePending.filter((a) => selected.has(a.id))

  // ---- Actions ---------------------------------------------------------------
  const open = (id: string) => {
    setActiveId(id)
    if (!wide) setSheetOpen(true)
  }

  const move = useCallback(
    (delta: number) => {
      const next = visible[Math.min(visible.length - 1, Math.max(0, activeIndex + delta))]
      if (next) setActiveId(next.id)
    },
    [visible, activeIndex],
  )

  const decide = useCallback(
    (item: ApprovalRecord, decision: ApprovalStatus) => {
      const note = notes[item.id]?.trim()
      if (decision === "Revision Requested" && !note) {
        onToast("Add a comment so the instructor knows what to change.")
        document.getElementById(`note-${item.id}`)?.focus()
        return
      }
      // Keep the reviewer moving: jump to the neighbour before this item leaves the filtered list.
      if (status === "Pending") {
        const idx = visible.findIndex((a) => a.id === item.id)
        const neighbour = visible[idx + 1] ?? visible[idx - 1]
        setActiveId(neighbour?.id ?? null)
        if (!neighbour) setSheetOpen(false)
      }
      setApprovals((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: decision, reviewNote: note || undefined, decidedAt: new Date().toISOString() } : a)),
      )
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      onToast(decision === "Approved" ? `Approved "${item.title}". It is now live for learners.` : `Sent "${item.title}" back to ${item.instructor} with your comment.`)
    },
    [notes, onToast, status, visible],
  )

  const reopen = (item: ApprovalRecord) => {
    setApprovals((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: "Pending", decidedAt: undefined } : a)))
    setNotes((prev) => ({ ...prev, [item.id]: item.reviewNote ?? "" }))
    onToast(`Reopened "${item.title}" for review.`)
  }

  const approveSelected = () => {
    const ids = new Set(selectedVisible.map((a) => a.id))
    if (!ids.size) return
    const now = new Date().toISOString()
    setApprovals((prev) => prev.map((a) => (ids.has(a.id) ? { ...a, status: "Approved", reviewNote: notes[a.id]?.trim() || undefined, decidedAt: now } : a)))
    setSelected(new Set())
    onToast(`Approved ${ids.size} ${ids.size === 1 ? "request" : "requests"}.`)
  }

  const toggleSelectAll = (on: boolean) => setSelected(on ? new Set(visiblePending.map((a) => a.id)) : new Set())

  const resetQueue = () => {
    setApprovals(SEED_APPROVALS)
    setSelected(new Set())
    setChecks({})
    setNotes({})
    setActiveId(null)
    onToast("Restored the sample approvals queue.")
  }

  // ---- Keyboard: J / K to move, A to approve --------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return
      const key = e.key.toLowerCase()
      if (key === "j") {
        e.preventDefault()
        move(1)
      } else if (key === "k") {
        e.preventDefault()
        move(-1)
      } else if (key === "a" && active?.status === "Pending") {
        e.preventDefault()
        decide(active, "Approved")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [move, decide, active])

  const detail = active && (
    <ApprovalDetail
      key={active.id}
      item={active}
      checks={checks[active.id] ?? []}
      note={notes[active.id] ?? ""}
      position={{ index: activeIndex, total: visible.length }}
      compact={!wide}
      onToggleCheck={(i) =>
        setChecks((prev) => {
          const list = [...(prev[active.id] ?? [])]
          list[i] = !list[i]
          return { ...prev, [active.id]: list }
        })
      }
      onNoteChange={(v) => setNotes((prev) => ({ ...prev, [active.id]: v }))}
      onApprove={() => decide(active, "Approved")}
      onRequestChanges={() => decide(active, "Revision Requested")}
      onReopen={() => reopen(active)}
      onPrev={() => move(-1)}
      onNext={() => move(1)}
    />
  )

  const filtersActive = category !== "all" || query.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Teacher approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review class schedules, coursework, recordings and grade releases before they reach learners.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetQueue} leftIcon={<RotateCcw aria-hidden="true" />}>
          Reset sample queue
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Hourglass}
          label="Awaiting review"
          value={String(stats.pending)}
          hint={stats.today ? `${stats.today} submitted today` : "Nothing new today"}
          tone="bg-warning-soft text-warning ring-warning/20"
        />
        <Stat icon={CircleCheck} label="Approved" value={String(stats.approved)} hint="Live for learners" tone="bg-success-soft text-success ring-success/20" />
        <Stat icon={CircleX} label="Changes requested" value={String(stats.revisions)} hint="Back with instructors" tone="bg-danger-soft text-danger ring-danger/20" />
        <Stat
          icon={TrendingUp}
          label="Approval rate"
          value={stats.rate === null ? "–" : `${stats.rate}%`}
          hint="Of decisions made"
          tone="bg-primary-soft text-primary-text ring-primary-border"
        />
      </div>

      {/* Toolbar */}
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-3 shadow-xs sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
            <SegmentedControl
              size="sm"
              className="[&_button]:whitespace-nowrap"
              aria-label="Filter by status"
              value={status}
              onChange={(v) => {
                setStatus(v)
                setSelected(new Set())
              }}
              options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: `${o.label} · ${statusCounts[o.value]}` }))}
            />
          </div>
          <Input
            leading={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
            trailing={
              search ? (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="rounded p-0.5 text-subtle-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : undefined
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, course or instructor…"
            aria-label="Search approvals"
            wrapperClassName="lg:w-80"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          {(["all", ...CATEGORIES] as CategoryFilter[]).map((key) => {
            const on = category === key
            const meta = key === "all" ? null : CATEGORY_META[key]
            const Icon = meta?.icon ?? ClipboardCheck
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setCategory(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  on ? "border-primary-border bg-primary-soft text-primary-text" : "border-border text-muted-foreground hover:border-border-strong/60 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {meta?.short ?? "All types"}
                <span className={cn("tabular-nums", on ? "text-primary-text/80" : "text-subtle-foreground")}>{categoryCounts[key]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Queue + review panel */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
        <section aria-label="Requests" className="space-y-2">
          {visible.length > 0 && (
            <div className="flex min-h-9 items-center justify-between gap-3 px-1">
              <label className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
                <Checkbox
                  checked={selectedVisible.length === 0 ? false : selectedVisible.length === visiblePending.length ? true : "indeterminate"}
                  onCheckedChange={toggleSelectAll}
                  disabled={visiblePending.length === 0}
                  aria-label="Select all pending requests"
                />
                {selectedVisible.length ? `${selectedVisible.length} selected` : `${visible.length} ${visible.length === 1 ? "request" : "requests"}`}
              </label>
              {selectedVisible.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                  <Button size="sm" onClick={approveSelected} leftIcon={<CircleCheck aria-hidden="true" />}>
                    Approve {selectedVisible.length}
                  </Button>
                </div>
              )}
            </div>
          )}

          {visible.length === 0 ? (
            filtersActive ? (
              <EmptyState
                icon={<SearchX aria-hidden="true" />}
                title="No matching requests"
                description="Try another search or request type."
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearch("")
                      setCategory("all")
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Inbox aria-hidden="true" />}
                title={status === "Pending" ? "You're all caught up" : "Nothing here yet"}
                description={status === "Pending" ? "New requests from teachers will show up here." : "Decisions you make will be listed here."}
              />
            )
          ) : (
            <ul className="space-y-2">
              {visible.map((item) => (
                <ApprovalListItem
                  key={item.id}
                  item={item}
                  active={wide && item.id === active?.id}
                  selected={selected.has(item.id)}
                  onOpen={() => open(item.id)}
                  onToggleSelect={(on) =>
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (on) next.add(item.id)
                      else next.delete(item.id)
                      return next
                    })
                  }
                />
              ))}
            </ul>
          )}
        </section>

        {wide && (
          <div className="sticky top-4 h-[calc(100dvh-8rem)] min-h-[560px]">
            {detail ?? (
              <div className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface/50">
                <EmptyState icon={<ClipboardCheck aria-hidden="true" />} title="Select a request" description="Pick a request from the queue to review it here." />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Small screens: review in a side sheet */}
      {!wide && (
        <Sheet open={sheetOpen && !!active} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-full max-w-xl gap-0 p-0 [&>article]:rounded-none [&>article]:border-0 [&>article]:shadow-none">
            <SheetTitle className="sr-only">{active?.title ?? "Review request"}</SheetTitle>
            <SheetDescription className="sr-only">Review the request and approve it or ask for changes.</SheetDescription>
            {detail}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
