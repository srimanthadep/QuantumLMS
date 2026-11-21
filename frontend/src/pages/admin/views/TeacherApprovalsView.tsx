import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import { CheckCircle2, ChevronRight, Clock3, Hourglass, MessageSquareQuote, PlayCircle, RefreshCw, Search, Timer, X, XCircle } from "lucide-react"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import { StatCard } from "@/components/ui/StatCard"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { SegmentedControl } from "@/components/ui/tabs"
import { api, toApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import ApprovalReviewSheet from "./approvals/ApprovalReviewSheet"
import DeclineDialog from "./approvals/DeclineDialog"
import {
  type ApprovalItem,
  type ApprovalList,
  type ApprovalState,
  dateTime,
  minutes,
  recordingTitle,
  shortDate,
  STATE_META,
  teacherName,
  timeAgo,
  waitLength,
} from "./approvals/approvalTypes"
import { InlineAlert } from "./batches/parts"
import { announceApprovalsChanged } from "./shared/usePendingApprovals"

type Filter = "Pending" | "Approved" | "Rejected" | "all"

const EMPTY_COUNTS: Record<ApprovalState, number> = { Pending: 0, Approved: 0, Rejected: 0, Withdrawn: 0, Superseded: 0 }

/** Median time from request to decision, over approved and declined requests. */
function typicalResponse(rows: ApprovalItem[]) {
  const spans = rows
    .filter((r) => (r.state === "Approved" || r.state === "Rejected") && r.decided_at)
    .map((r) => new Date(r.decided_at!).getTime() - new Date(r.created_at).getTime())
    .filter((ms) => ms >= 0)
    .sort((a, b) => a - b)
  if (!spans.length) return null
  const mid = spans[Math.floor(spans.length / 2)]
  return new Date(Date.now() - mid).toISOString()
}

/**
 * The approval queue. Teachers ask to publish a class recording; an administrator watches it,
 * checks chapters and access dates, then approves (publishes) or declines with an optional note.
 */
export default function TeacherApprovalsView({ onToast }: { onToast: (message: string) => void }) {
  const [data, setData] = useState<ApprovalList | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<Filter>("Pending")
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [declineId, setDeclineId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [, setTick] = useState(0)

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    try {
      const r = await api.get<ApprovalList>("/admin/approvals?state=all&limit=500", { bypassCache: true })
      setData(r)
      setError("")
    } catch (e) {
      setError(toApiError(e, "Could not load approval requests.").message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Keep "3 min ago" fresh and pick up new requests when the admin comes back to the tab.
  useEffect(() => {
    const tick = window.setInterval(() => setTick((t) => t + 1), 60_000)
    const onVisible = () => document.visibilityState === "visible" && void load(true)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(tick)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [load])

  const rows = data?.approvals ?? []
  const counts = data?.counts ?? EMPTY_COUNTS
  const pendingRows = useMemo(() => rows.filter((r) => r.state === "Pending"), [rows])
  const oldest = pendingRows[0]?.created_at ?? null
  const typical = useMemo(() => typicalResponse(rows), [rows])

  const visible = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter !== "all" && r.state !== filter) return false
      if (!q) return true
      return [r.recording_title, r.requested_by_name, r.requested_by_email, r.batch_name, r.course_title, r.session_title, r.note]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [rows, filter, deferredSearch])

  const reviewItem = rows.find((r) => r.id === reviewId) ?? null
  const declineItem = rows.find((r) => r.id === declineId) ?? null

  const afterDecision = async () => {
    api.cache.invalidate("/recordings")
    announceApprovalsChanged()
    await load(true)
  }

  const approve = async (item: ApprovalItem) => {
    setBusy(true)
    try {
      await api.post(`/admin/approvals/${item.id}/approve`, {})
      onToast(`Published “${recordingTitle(item)}” for ${item.batch_name ?? "the batch"}`)
      setReviewId(null)
      await afterDecision()
    } catch (e) {
      onToast(toApiError(e, "Could not approve this request.").message)
      await load(true)
    } finally {
      setBusy(false)
    }
  }

  const decline = async (item: ApprovalItem, note: string) => {
    try {
      await api.post(`/admin/approvals/${item.id}/reject`, note ? { note } : {})
      onToast(`Declined “${recordingTitle(item)}”. ${teacherName(item)} has been told.`)
      setReviewId(null)
      await afterDecision()
      return true
    } catch (e) {
      onToast(toApiError(e, "Could not decline this request.").message)
      await load(true)
      return false
    }
  }

  const hasSearch = search.trim().length > 0
  const otherCount = counts.Withdrawn + counts.Superseded

  return (
    <Stagger className="flex flex-col gap-5" stagger={0.05}>
      <StaggerItem>
        <PageHeader
          className="mb-0"
          eyebrow="Review"
          title="Approvals"
          description="Teachers ask before a class recording goes live. Watch it, then publish it to the batch or send it back."
          actions={
            <Button variant="outline" onClick={() => void load(true)} loading={refreshing} leftIcon={<RefreshCw aria-hidden="true" />}>
              Refresh
            </Button>
          }
        />
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            icon={Hourglass}
            title="Waiting"
            value={counts.Pending}
            trend={counts.Pending ? "Recordings to review" : "All caught up"}
            tone="warning"
            isActive={filter === "Pending"}
            onClick={() => setFilter("Pending")}
          />
          <StatCard icon={Clock3} title="Oldest request" value={oldest ? waitLength(oldest) : "—"} trend={oldest ? `Since ${shortDate(oldest)}` : "Nothing waiting"} tone="primary" />
          <StatCard
            icon={CheckCircle2}
            title="Approved"
            value={counts.Approved}
            trend="Published to batches"
            tone="success"
            isActive={filter === "Approved"}
            onClick={() => setFilter((f) => (f === "Approved" ? "Pending" : "Approved"))}
          />
          <StatCard
            icon={Timer}
            title="Response time"
            value={typical ? waitLength(typical) : "—"}
            trend={counts.Rejected ? `Typical · ${counts.Rejected} declined` : "Typical, request to decision"}
            tone="info"
          />
        </div>
      </StaggerItem>

      {error && (
        <StaggerItem>
          <InlineAlert
            tone="danger"
            action={
              <Button size="sm" variant="ghost" onClick={() => void load(true)}>
                Try again
              </Button>
            }
          >
            {error}
          </InlineAlert>
        </StaggerItem>
      )}

      <StaggerItem>
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="no-scrollbar -mx-1 max-w-full overflow-x-auto px-1">
              <SegmentedControl
                size="sm"
                aria-label="Filter requests"
                className="[&_button]:whitespace-nowrap"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "Pending" as Filter, label: `Waiting ${counts.Pending}` },
                  { value: "Approved" as Filter, label: `Approved ${counts.Approved}` },
                  { value: "Rejected" as Filter, label: `Declined ${counts.Rejected}` },
                  { value: "all" as Filter, label: "All" },
                ]}
              />
            </div>
            <Input
              leading={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
              trailing={
                search ? (
                  <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="text-muted-foreground transition-colors hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null
              }
              aria-label="Search requests"
              placeholder="Search recording, teacher or batch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              wrapperClassName="lg:max-w-sm lg:flex-1"
            />
          </div>
          {filter === "all" && otherCount > 0 && (
            <p className="mt-3 border-t border-border pt-3 text-caption text-muted-foreground">
              Includes {otherCount} {otherCount === 1 ? "request" : "requests"} the teacher withdrew or replaced with a newer version.
            </p>
          )}
        </Card>
      </StaggerItem>

      <StaggerItem>
        {loading ? (
          <div className="space-y-3" role="status" aria-label="Loading requests">
            <Skeleton className="h-[104px]" />
            <Skeleton className="h-[104px]" />
            <Skeleton className="h-[104px]" />
          </div>
        ) : visible.length === 0 ? (
          hasSearch ? (
            <EmptyState
              icon={<Search aria-hidden="true" />}
              title="No matching requests"
              description="Try another name or clear the search."
              action={
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              }
            />
          ) : filter === "Pending" ? (
            <EmptyState
              icon={<CheckCircle2 aria-hidden="true" />}
              title="You're all caught up"
              description="When a teacher asks to publish a class recording, it shows up here. You'll also see a count next to Approvals in the sidebar."
              action={
                rows.length ? (
                  <Button variant="outline" onClick={() => setFilter("all")}>
                    See past decisions
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              icon={filter === "Rejected" ? <XCircle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
              title={filter === "Approved" ? "Nothing approved yet" : filter === "Rejected" ? "Nothing declined" : "No requests yet"}
              description="Decisions you make appear here with their notes."
            />
          )
        ) : (
          <section aria-label={filter === "Pending" ? "Waiting for review, oldest first" : "Requests"} className="space-y-3">
            {filter === "Pending" && (
              <p className="px-1 text-caption text-muted-foreground">
                Oldest first. <span className="text-subtle-foreground">Approving publishes the exact version the teacher submitted.</span>
              </p>
            )}
            <ul className="space-y-3">
              {visible.map((item) => (
                <li key={item.id}>
                  <RequestRow item={item} onOpen={() => setReviewId(item.id)} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </StaggerItem>

      <ApprovalReviewSheet
        item={reviewItem}
        busy={busy}
        onOpenChange={(o) => !o && setReviewId(null)}
        onApprove={approve}
        onDecline={(item) => setDeclineId(item.id)}
      />
      <DeclineDialog item={declineItem} onClose={() => setDeclineId(null)} onConfirm={decline} />
    </Stagger>
  )
}

function RequestRow({ item, onOpen }: { item: ApprovalItem; onOpen: () => void }) {
  const pending = item.state === "Pending"
  const meta = STATE_META[item.state]
  const length = minutes(item.duration_seconds)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${pending ? "Review" : "View"} ${recordingTitle(item)} from ${teacherName(item)}`}
      className="group flex w-full flex-col gap-3 rounded-lg border border-border bg-surface p-3 text-left shadow-[var(--elev-xs)] transition-[border-color,box-shadow] hover:border-border-strong/60 hover:shadow-[var(--elev-md)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
      <div className="relative flex aspect-video w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-ink-950 text-white sm:w-32">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_10%,rgba(139,124,255,0.35),transparent_55%)]" aria-hidden="true" />
        <PlayCircle className="relative h-6 w-6 opacity-80 transition-transform group-hover:scale-110 sm:h-7 sm:w-7" aria-hidden="true" />
        {length && <span className="absolute bottom-1.5 right-1.5 hidden rounded bg-ink-950/75 px-1.5 py-0.5 text-[10px] font-medium tabular-nums sm:block">{length}</span>}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-foreground">{recordingTitle(item)}</p>
          {!pending && (
            <Badge tone={meta.tone} size="sm" dot>
              {meta.label}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-caption text-muted-foreground sm:truncate">
          {[item.batch_name ?? "Batch removed", item.course_title, item.session_starts_at && `Class on ${shortDate(item.session_starts_at)}`, item.chapter_count ? `${item.chapter_count} ${item.chapter_count === 1 ? "chapter" : "chapters"}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {pending ? (
          item.note ? (
            <p className="mt-2 flex items-start gap-1.5 text-caption text-foreground">
              <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-text" aria-hidden="true" />
              <span className="line-clamp-2 break-words">{item.note}</span>
            </p>
          ) : null
        ) : (
          <p className="mt-2 line-clamp-2 break-words text-caption text-muted-foreground">
            {meta.label}
            {item.decided_by_name && ` by ${item.decided_by_name}`}
            {item.decided_at && ` · ${timeAgo(item.decided_at)}`}
            {item.decision_note && <span className="text-foreground">{` · “${item.decision_note}”`}</span>}
          </p>
        )}
      </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3 sm:w-64 sm:shrink-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={teacherName(item)} src={item.requested_by_avatar} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-caption font-medium text-foreground">{teacherName(item)}</p>
            <p className={cn("truncate text-[11px]", pending ? "text-warning" : "text-muted-foreground")}>
              <time dateTime={item.created_at} title={dateTime(item.created_at)}>
                {pending ? `Waiting ${waitLength(item.created_at)}` : `Asked ${timeAgo(item.created_at)}`}
              </time>
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors",
            pending ? "bg-primary-soft text-primary-text group-hover:bg-primary group-hover:text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
          )}
          aria-hidden="true"
        >
          {pending ? "Review" : "View"}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}
