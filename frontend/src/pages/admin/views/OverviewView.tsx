import { useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CircleCheck,
  Clock3,
  CreditCard,
  Gauge,
  Hourglass,
  Layers,
  Link2Off,
  PencilLine,
  Plus,
  ReceiptText,
  Undo2,
  UserPlus,
  UserRoundX,
  Users,
  Wallet,
} from "lucide-react"
import CourseCover from "@/components/shared/CourseCover"
import AreaChart from "@/components/charts/AreaChart"
import DonutChart from "@/components/charts/DonutChart"
import { compactNumber } from "@/components/charts/chartUtils"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import { useAdminBase } from "./shared/useAdminBase"
import { StatCard } from "@/components/ui/StatCard"
import { Avatar } from "@/components/ui/avatar"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { Progress } from "@/components/ui/progress"
import { SegmentedControl } from "@/components/ui/tabs"
import type { AdminBatch, AdminCourse, AdminOrder, AdminStudent, useAdminStore } from "@/data/adminStore"
import { cn } from "@/lib/utils"
import {
  batchStatusTone,
  formatShortDateRange,
  resolveBatchTheme,
  safeHref,
  seatTone,
  seatUtilization,
} from "./batches/batchTheme"
import { STATUS_TONE, compactINR } from "./courses/courseTheme"

interface OverviewViewProps {
  store: ReturnType<typeof useAdminStore>
  onOpenCreateBatch: () => void
  onOpenManualEnrol: () => void
  onNavigate: (tabId: string) => void
}

type Period = "3" | "6" | "12"
type AttentionTone = "danger" | "warning" | "info" | "neutral"

interface AttentionItem {
  id: string
  icon: LucideIcon
  tone: AttentionTone
  title: string
  detail: string
  target: string
}

interface CapturedPayment {
  key: string
  amount: number
  at: number
  order: AdminOrder
}

const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_WINDOW_DAYS = 30
const STARTING_SOON_DAYS = 14
const LINK_WARNING_DAYS = 7
const NEAR_FULL_RATIO = 0.85

/** Placeholders the admin store writes when a learner has no course or batch. */
const NO_COURSE_PLACEHOLDER = "No active access"
const NO_BATCH_PLACEHOLDER = "Unassigned"

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "3", label: "3M" },
  { value: "6", label: "6M" },
  { value: "12", label: "12M" },
]

const ATTENTION_TONE: Record<AttentionTone, string> = {
  danger: "bg-danger-soft text-danger ring-danger/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  info: "bg-info-soft text-info ring-info/20",
  neutral: "bg-surface-2 text-muted-foreground ring-border",
}

const ORDER_STATUS_TONE: Record<AdminOrder["status"], BadgeTone> = {
  Paid: "success",
  Pending: "neutral",
  Refunded: "danger",
  "Refund pending": "warning",
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})
const countFormatter = new Intl.NumberFormat("en-IN")
const relativeFormatter = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" })
const eyebrowFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
})
const dayFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" })
const monthFormatter = new Intl.DateTimeFormat("en-IN", { month: "short" })
const monthYearFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
})

const formatCount = (n: number) => countFormatter.format(n)
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** Parses "YYYY-MM-DD" as a local date and anything else as a full timestamp. */
function parseDate(value: string | null | undefined): number | null {
  if (!value) return null
  const ms = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value).getTime()
  return Number.isNaN(ms) ? null : ms
}

function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Calendar-day distance, so "tomorrow" means the next date, not 24 hours. */
function daysBetween(fromMs: number, toMs: number): number {
  return Math.round((startOfDay(toMs) - startOfDay(fromMs)) / DAY_MS)
}

/** "today", "tomorrow", "in 5 days", "in 3 weeks", "in 2 months". */
function relativeDay(targetMs: number, now: number): string {
  const days = daysBetween(now, targetMs)
  const abs = Math.abs(days)
  if (abs < 7) return relativeFormatter.format(days, "day")
  if (abs < 60) return relativeFormatter.format(Math.round(days / 7), "week")
  return relativeFormatter.format(Math.round(days / 30), "month")
}

/** "just now", "35 min ago", "3 hr ago", then calendar days. */
function relativePast(ms: number, now: number): string {
  const diff = now - ms
  if (diff < 60 * 1000) return "just now"
  if (diff < 60 * 60 * 1000) return relativeFormatter.format(-Math.floor(diff / 60000), "minute")
  if (diff < DAY_MS) return relativeFormatter.format(-Math.floor(diff / 3600000), "hour")
  return relativeDay(ms, now)
}

function greetingFor(ms: number): string {
  const hour = new Date(ms).getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function hasValue(value: string | null | undefined, placeholder: string): boolean {
  const text = (value ?? "").trim()
  return text.length > 0 && text !== placeholder
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export default function OverviewView({
  store,
  onOpenCreateBatch,
  onOpenManualEnrol,
  onNavigate,
}: OverviewViewProps) {
  const navigate = useNavigate()
  const base = useAdminBase()
  const { courses, batches, students, teachers, orders } = store
  const [now] = useState(() => Date.now())
  const [period, setPeriod] = useState<Period>("6")

  const learnerStats = useMemo(() => {
    const recentStart = now - RECENT_WINDOW_DAYS * DAY_MS
    let joinedRecently = 0
    let inBatch = 0
    let accessOnly = 0
    let noAccess = 0
    let disabled = 0
    const dated: { student: AdminStudent; at: number }[] = []

    for (const student of students) {
      const at = parseDate(student.enrolledAt)
      if (at !== null) {
        dated.push({ student, at })
        if (at >= recentStart && at <= now) joinedRecently += 1
      }
      if (student.status === "Paused") {
        disabled += 1
      } else if (hasValue(student.batchName, NO_BATCH_PLACEHOLDER)) {
        inBatch += 1
      } else if (hasValue(student.courseTitle, NO_COURSE_PLACEHOLDER)) {
        accessOnly += 1
      } else {
        noAccess += 1
      }
    }

    // Total learners at the end of each of the last eight weeks (accounts without a
    // sign-up date are counted from the start, so the line ends at today's total).
    const undated = students.length - dated.length
    const endOfToday = startOfDay(now) + DAY_MS
    const growth = Array.from({ length: 8 }, (_, i) => {
      const cutoff = endOfToday - (7 - i) * 7 * DAY_MS
      return undated + dated.filter((d) => d.at < cutoff).length
    })

    const recent = [...dated].sort((a, b) => b.at - a.at).slice(0, 5)
    return { joinedRecently, inBatch, accessOnly, noAccess, disabled, growth, recent }
  }, [students, now])

  const batchStats = useMemo(() => {
    const today = startOfDay(now)
    const open = batches.filter((b) => b.status === "Active" || b.status === "Upcoming")
    const active = batches.filter((b) => b.status === "Active").length
    const upcoming = open.length - active
    const capacity = open.reduce((sum, b) => sum + Math.max(0, b.maxSeats), 0)
    const filled = open.reduce((sum, b) => sum + Math.max(0, b.enrolledSeats), 0)
    const occupancy = capacity > 0 ? Math.round((filled / capacity) * 100) : 0
    const waitlisted = open.reduce((sum, b) => sum + Math.max(0, b.waitlistedSeats ?? 0), 0)
    const nearFull = open.filter(
      (b) => b.maxSeats > 0 && b.enrolledSeats / b.maxSeats >= NEAR_FULL_RATIO,
    ).length

    const startsWithin = (b: AdminBatch, days: number) => {
      const start = parseDate(b.startDate)
      return start !== null && start >= today && daysBetween(today, start) <= days
    }
    const startingSoon = open.filter(
      (b) => b.status === "Upcoming" && startsWithin(b, STARTING_SOON_DAYS),
    ).length
    const missingLink = open.filter(
      (b) =>
        b.deliveryMode === "Live + Replay" &&
        !safeHref(b.meetingUrl) &&
        (b.status === "Active" || startsWithin(b, LINK_WARNING_DAYS)),
    ).length

    const pipeline = [...open]
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "Active" ? -1 : 1
        const key = (x: AdminBatch) =>
          parseDate(x.status === "Active" ? x.endDate : x.startDate) ?? Number.MAX_SAFE_INTEGER
        return key(a) - key(b)
      })
      .slice(0, 5)

    return {
      openCount: open.length,
      active,
      upcoming,
      capacity,
      filled,
      occupancy,
      waitlisted,
      nearFull,
      startingSoon,
      missingLink,
      pipeline,
    }
  }, [batches, now])

  const paymentStats = useMemo(() => {
    const payments: CapturedPayment[] = []
    let captured = 0
    let refunded = 0
    let refundPending = 0
    for (const order of orders) {
      captured += order.capturedAmount || 0
      refunded += order.refundedAmount || 0
      if (order.status === "Refund pending") refundPending += 1
      ;(order.capturedPayments ?? []).forEach((p, i) => {
        const at = parseDate(p.date)
        if (at !== null && Number.isFinite(p.amount))
          payments.push({ key: `${order.id}-${i}`, amount: p.amount, at, order })
      })
    }
    payments.sort((a, b) => b.at - a.at)

    const recentStart = now - RECENT_WINDOW_DAYS * DAY_MS
    const priorStart = recentStart - RECENT_WINDOW_DAYS * DAY_MS
    let last30 = 0
    let prior30 = 0
    for (const p of payments) {
      if (p.at >= recentStart && p.at <= now) last30 += p.amount
      else if (p.at >= priorStart && p.at < recentStart) prior30 += p.amount
    }

    /** Totals for the last `count` calendar months, oldest first. */
    const monthlyTotals = (count: number) => {
      const buckets = Array.from({ length: count }, (_, i) => {
        const at = new Date(now)
        at.setDate(1)
        at.setHours(0, 0, 0, 0)
        at.setMonth(at.getMonth() - (count - 1) + i)
        return { at: at.getTime(), key: at.getFullYear() * 12 + at.getMonth(), value: 0, count: 0 }
      })
      const index = new Map(buckets.map((b, i) => [b.key, i]))
      for (const p of payments) {
        const d = new Date(p.at)
        const i = index.get(d.getFullYear() * 12 + d.getMonth())
        if (i !== undefined) {
          buckets[i].value += p.amount
          buckets[i].count += 1
        }
      }
      return buckets
    }

    return {
      payments,
      captured,
      refunded,
      net: captured - refunded,
      refundPending,
      last30,
      prior30,
      monthlyTotals,
      recent: payments.slice(0, 5),
    }
  }, [orders, now])

  const trend = useMemo(() => {
    const months = Number(period)
    const series = paymentStats.monthlyTotals(months * 2)
    const current = series.slice(months)
    const previous = series.slice(0, months)
    const total = current.reduce((sum, m) => sum + m.value, 0)
    const count = current.reduce((sum, m) => sum + m.count, 0)
    const previousTotal = previous.reduce((sum, m) => sum + m.value, 0)
    return {
      labels: current.map((m) => monthFormatter.format(m.at)),
      values: current.map((m) => m.value),
      total,
      count,
      average: count > 0 ? Math.round(total / count) : 0,
      change: percentChange(total, previousTotal),
      range: `${monthYearFormatter.format(current[0].at)} – ${monthYearFormatter.format(current[current.length - 1].at)}`,
    }
  }, [paymentStats, period])

  const sparkline = useMemo(() => paymentStats.monthlyTotals(6).map((m) => m.value), [paymentStats])

  const catalog = useMemo(() => {
    const counts: Record<AdminCourse["status"], number> = { Published: 0, Draft: 0, Archived: 0 }
    for (const course of courses) {
      if (course.status in counts) counts[course.status] += 1
    }
    const top = [...courses]
      .filter((c) => c.status !== "Archived")
      .sort((a, b) => b.enrolledStudents - a.enrolledStudents || a.title.localeCompare(b.title))
      .slice(0, 4)
    const topMax = Math.max(1, ...top.map((c) => c.enrolledStudents))
    return { counts, top, topMax }
  }, [courses])

  const teachersInReview = useMemo(() => teachers.filter((t) => t.status === "In Review").length, [teachers])

  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = []
    if (paymentStats.refundPending > 0)
      items.push({
        id: "refunds",
        icon: Undo2,
        tone: "warning",
        title: `${formatCount(paymentStats.refundPending)} ${plural(paymentStats.refundPending, "refund is", "refunds are")} pending`,
        detail: "Awaiting confirmation from Razorpay",
        target: "orders",
      })
    if (batchStats.nearFull > 0)
      items.push({
        id: "near-full",
        icon: Gauge,
        tone: "warning",
        title: `${formatCount(batchStats.nearFull)} ${plural(batchStats.nearFull, "batch is", "batches are")} nearly full`,
        detail: "85% or more of seats are taken",
        target: "batches",
      })
    if (batchStats.waitlisted > 0)
      items.push({
        id: "waitlist",
        icon: Hourglass,
        tone: "warning",
        title: `${formatCount(batchStats.waitlisted)} ${plural(batchStats.waitlisted, "learner is", "learners are")} waitlisted`,
        detail: "Waiting for a seat in an open batch",
        target: "batches",
      })
    if (batchStats.missingLink > 0)
      items.push({
        id: "missing-link",
        icon: Link2Off,
        tone: "info",
        title: `${formatCount(batchStats.missingLink)} live ${plural(batchStats.missingLink, "batch has", "batches have")} no classroom link`,
        detail: "Running now or starting within a week",
        target: "batches",
      })
    if (learnerStats.noAccess > 0)
      items.push({
        id: "no-access",
        icon: UserRoundX,
        tone: "info",
        title: `${formatCount(learnerStats.noAccess)} ${plural(learnerStats.noAccess, "learner has", "learners have")} no course access`,
        detail: "Active accounts with no course or batch",
        target: "students",
      })
    if (teachersInReview > 0)
      items.push({
        id: "teachers",
        icon: Clock3,
        tone: "info",
        title: `${formatCount(teachersInReview)} ${plural(teachersInReview, "instructor is", "instructors are")} still provisioning`,
        detail: "Accounts not yet active",
        target: "teachers",
      })
    if (catalog.counts.Draft > 0)
      items.push({
        id: "drafts",
        icon: PencilLine,
        tone: "neutral",
        title: `${formatCount(catalog.counts.Draft)} ${plural(catalog.counts.Draft, "course is", "courses are")} still in draft`,
        detail: "Not visible to learners yet",
        target: "courses",
      })
    return items
  }, [batchStats, paymentStats.refundPending, learnerStats.noAccess, teachersInReview, catalog.counts.Draft])

  const learnerTrend =
    learnerStats.joinedRecently > 0
      ? { value: `${formatCount(learnerStats.joinedRecently)} new · 30d`, isPositive: true }
      : "No new sign-ups in 30 days"

  const collectionsTrend =
    paymentStats.last30 > 0
      ? `${compactINR(Math.round(paymentStats.last30))} · last 30d`
      : "No captures in 30 days"

  const accessSegments = [
    { label: "In a batch", value: learnerStats.inBatch, color: "var(--success)" },
    { label: "Course access only", value: learnerStats.accessOnly, color: "var(--info)" },
    { label: "No course access", value: learnerStats.noAccess, color: "var(--warning)" },
    { label: "Disabled", value: learnerStats.disabled, color: "var(--border-strong)" },
  ]
  const accessTotal = accessSegments.reduce((sum, s) => sum + s.value, 0)
  const unbatched = learnerStats.accessOnly + learnerStats.noAccess

  return (
    <Stagger className="flex flex-col gap-5" stagger={0.05}>
      <StaggerItem>
        <PageHeader
          className="mb-0"
          eyebrow={`${greetingFor(now)} · ${eyebrowFormatter.format(now)}`}
          title="Academy overview"
          description="Courses, batches, learners and payments at a glance, with what needs your attention first."
          actions={
            <>
              <Button
                variant="secondary"
                onClick={onOpenManualEnrol}
                leftIcon={<UserPlus aria-hidden="true" />}
              >
                Enrol learner
              </Button>
              <Button onClick={onOpenCreateBatch} leftIcon={<Plus aria-hidden="true" />}>
                New batch
              </Button>
            </>
          }
        />
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            title="Learners"
            value={students.length}
            trend={learnerTrend}
            tone="primary"
            sparkline={learnerStats.growth[7] > learnerStats.growth[0] ? learnerStats.growth : undefined}
            onClick={() => onNavigate("students")}
          />
          <StatCard
            icon={Layers}
            title="Running batches"
            value={batchStats.active}
            trend={
              batchStats.startingSoon > 0
                ? `${formatCount(batchStats.upcoming)} upcoming · ${formatCount(batchStats.startingSoon)} start in 2 weeks`
                : `${formatCount(batchStats.upcoming)} upcoming`
            }
            tone="info"
            onClick={() => onNavigate("batches")}
          />
          <StatCard
            icon={Gauge}
            title="Seat occupancy"
            value={`${batchStats.occupancy}%`}
            trend={
              batchStats.capacity > 0
                ? `${formatCount(batchStats.filled)} of ${formatCount(batchStats.capacity)} seats filled`
                : "No open batches"
            }
            tone="success"
            onClick={() => onNavigate("batches")}
          />
          <StatCard
            icon={Wallet}
            title="Net collected"
            value={compactINR(Math.max(0, Math.round(paymentStats.net)))}
            trend={collectionsTrend}
            tone="warning"
            sparkline={sparkline.some((n) => n > 0) ? sparkline : undefined}
            onClick={() => onNavigate("orders")}
          />
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SectionCard
            className="lg:col-span-2"
            title="Collections"
            description={
              paymentStats.payments.length > 0
                ? `Captured payments by month · ${trend.range}`
                : "Captured payments by month"
            }
            action={
              paymentStats.payments.length === 0 ? undefined : (
                <SegmentedControl
                  aria-label="Collections period"
                  size="sm"
                  options={PERIOD_OPTIONS}
                  value={period}
                  onChange={setPeriod}
                />
              )
            }
          >
            {paymentStats.payments.length === 0 ? (
              <EmptyState
                size="sm"
                className="flex-1"
                icon={<CreditCard aria-hidden="true" />}
                title="No payments captured yet"
                description="Payments confirmed by Razorpay will chart here by month."
                action={
                  <Button variant="secondary" size="sm" onClick={() => onNavigate("orders")}>
                    Open payments
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-4">
                <dl className="grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-surface-2/60">
                  <MiniStat
                    label="Captured"
                    value={compactINR(Math.round(trend.total))}
                    hint={
                      trend.change === null
                        ? "No earlier data"
                        : `${trend.change >= 0 ? "+" : "−"}${Math.abs(trend.change)}% vs prior ${period}M`
                    }
                    hintTone={trend.change === null ? "muted" : trend.change >= 0 ? "success" : "danger"}
                  />
                  <MiniStat
                    label="Payments"
                    value={formatCount(trend.count)}
                    hint={`Last ${period} months`}
                  />
                  <MiniStat
                    label="Average"
                    value={trend.count > 0 ? compactINR(trend.average) : "—"}
                    hint="Per payment"
                  />
                </dl>
                <AreaChart
                  labels={trend.labels}
                  series={[{ name: "Captured (₹)", values: trend.values, color: "var(--primary)" }]}
                  height={236}
                  label={`Captured payments per month, ${trend.range}`}
                  formatValue={(v) => compactNumber.format(v)}
                />
              </div>
            )}
            <p className="mt-auto flex flex-wrap items-center gap-x-1.5 pt-4 gap-y-1 text-caption text-muted-foreground">
              <Badge tone="warning" size="sm">
                Test mode
              </Badge>
              Razorpay test captures, grouped by capture date.
              {paymentStats.refunded > 0 &&
                ` ${inrFormatter.format(Math.round(paymentStats.refunded))} refunded to date.`}
            </p>
          </SectionCard>

          <SectionCard
            title="Needs attention"
            description={
              attention.length > 0
                ? `${attention.length} ${plural(attention.length, "item", "items")} to review`
                : "Nothing waiting on you"
            }
            action={
              attention.length > 0 ? (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-danger-soft px-2 text-xs font-semibold tabular-nums text-danger">
                  {attention.length}
                </span>
              ) : undefined
            }
          >
            {attention.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success-soft text-success">
                  <CircleCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-foreground">You're all caught up</p>
                <p className="max-w-[16rem] text-caption text-muted-foreground">
                  Batches, learners, refunds and courses have no open issues.
                </p>
              </div>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {attention.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.target)}
                      className="group flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
                          ATTENTION_TONE[item.tone],
                        )}
                        aria-hidden="true"
                      >
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-5 text-foreground">
                          {item.title}
                        </span>
                        <span className="block truncate text-caption text-muted-foreground">
                          {item.detail}
                        </span>
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SectionCard
            className="lg:col-span-2"
            title="Batch pipeline"
            description={
              batchStats.openCount > 0
                ? `${formatCount(batchStats.active)} running · ${formatCount(batchStats.upcoming)} upcoming`
                : "Running and upcoming cohorts"
            }
            action={
              batchStats.openCount > 0 ? (
                <ViewAll label="batches" onClick={() => onNavigate("batches")} />
              ) : undefined
            }
          >
            {batchStats.pipeline.length === 0 ? (
              <EmptyState
                size="sm"
                className="flex-1"
                icon={<Layers aria-hidden="true" />}
                title="No running or upcoming batches"
                description="Create a batch to open enrolment for a course."
                action={
                  <Button size="sm" onClick={onOpenCreateBatch} leftIcon={<Plus aria-hidden="true" />}>
                    New batch
                  </Button>
                }
              />
            ) : (
              <ul className="-mx-2 flex flex-col">
                {batchStats.pipeline.map((batch) => (
                  <li key={batch.id}>
                    <PipelineRow
                      batch={batch}
                      courses={courses}
                      now={now}
                      onOpen={() => navigate(`${base}/batches/${batch.id}`)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Learner access"
            description="Where every account stands today"
            action={<ViewAll label="learners" onClick={() => onNavigate("students")} />}
          >
            {accessTotal === 0 ? (
              <EmptyState
                size="sm"
                className="flex-1"
                icon={<Users aria-hidden="true" />}
                title="No learners yet"
                description="Enrol a learner to give them course access."
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onOpenManualEnrol}
                    leftIcon={<UserPlus aria-hidden="true" />}
                  >
                    Enrol learner
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-1 flex-col gap-5">
                <DonutChart
                  className="mx-auto w-full max-w-md flex-col justify-center gap-6 sm:flex-row"
                  data={accessSegments}
                  size={148}
                  thickness={16}
                  formatValue={formatCount}
                  center={
                    <>
                      <span className="text-[22px] font-semibold leading-7 tracking-tight tabular-nums text-foreground">
                        {formatCount(accessTotal)}
                      </span>
                      <span className="text-caption text-muted-foreground">
                        {plural(accessTotal, "learner", "learners")}
                      </span>
                    </>
                  }
                />
                <div className="mt-auto flex items-center gap-3 rounded-md border border-border bg-surface-2/60 px-3 py-2.5">
                  <span className="min-w-0 flex-1 text-caption text-muted-foreground">
                    {unbatched > 0 ? (
                      <>
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatCount(unbatched)}
                        </span>{" "}
                        active {plural(unbatched, "learner isn't", "learners aren't")} in a batch yet
                      </>
                    ) : (
                      "Every active learner is in a batch"
                    )}
                  </span>
                  {unbatched > 0 && (
                    <Button variant="secondary" size="sm" onClick={() => onNavigate("students")}>
                      Review
                    </Button>
                  )}
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SectionCard
            title="New learners"
            description="Most recent sign-ups"
            action={
              learnerStats.recent.length > 0 ? (
                <ViewAll label="learners" onClick={() => onNavigate("students")} />
              ) : undefined
            }
          >
            {learnerStats.recent.length === 0 ? (
              <EmptyState
                size="sm"
                className="flex-1"
                icon={<UserPlus aria-hidden="true" />}
                title="No sign-ups yet"
              />
            ) : (
              <ul className="-mx-2 flex flex-col">
                {learnerStats.recent.map(({ student, at }) => {
                  const hasCourse = hasValue(student.courseTitle, NO_COURSE_PLACEHOLDER)
                  return (
                    <li key={student.id}>
                      <ListRow
                        onClick={() => onNavigate("students")}
                        leading={
                          <Avatar src={student.avatar || null} name={student.name || "Learner"} size="sm" />
                        }
                        title={student.name || "Unnamed learner"}
                        subtitle={hasCourse ? student.courseTitle : "No course access"}
                        subtitleMuted={!hasCourse}
                        trailing={
                          <span className="text-caption tabular-nums text-muted-foreground">
                            {relativePast(at, now)}
                          </span>
                        }
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Recent payments"
            description="Latest captures from Razorpay"
            action={
              paymentStats.recent.length > 0 ? (
                <ViewAll label="payments" onClick={() => onNavigate("orders")} />
              ) : undefined
            }
          >
            {paymentStats.recent.length === 0 ? (
              <EmptyState
                size="sm"
                className="flex-1"
                icon={<ReceiptText aria-hidden="true" />}
                title="No payments yet"
              />
            ) : (
              <ul className="-mx-2 flex flex-col">
                {paymentStats.recent.map((payment) => (
                  <li key={payment.key}>
                    <ListRow
                      onClick={() => onNavigate("orders")}
                      leading={
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success-soft text-success ring-1 ring-inset ring-success/20">
                          <ReceiptText className="h-4 w-4" aria-hidden="true" />
                        </span>
                      }
                      title={payment.order.studentName || payment.order.studentEmail || "Learner"}
                      subtitle={payment.order.courseTitle || "Course purchase"}
                      trailing={
                        <span className="flex flex-col items-end gap-0.5">
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {inrFormatter.format(payment.amount)}
                          </span>
                          {payment.order.status === "Paid" ? (
                            <span className="text-caption tabular-nums text-muted-foreground">
                              {relativePast(payment.at, now)}
                            </span>
                          ) : (
                            <Badge tone={ORDER_STATUS_TONE[payment.order.status]} size="sm">
                              {payment.order.status}
                            </Badge>
                          )}
                        </span>
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            className="md:col-span-2 xl:col-span-1"
            title="Course catalog"
            description={`${formatCount(courses.length)} ${plural(courses.length, "course", "courses")} in total`}
            action={
              courses.length > 0 ? (
                <ViewAll label="courses" onClick={() => onNavigate("courses")} />
              ) : undefined
            }
          >
            {courses.length === 0 ? (
              <EmptyState
                size="sm"
                className="flex-1"
                icon={<BookOpen aria-hidden="true" />}
                title="No courses yet"
                description="Add a course to start building your catalog."
                action={
                  <Button size="sm" variant="secondary" onClick={() => onNavigate("courses")}>
                    Go to courses
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-2">
                  {(["Published", "Draft", "Archived"] as const).map((status) => (
                    <div key={status} className="rounded-md border border-border bg-surface-2/60 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            STATUS_TONE[status] === "success"
                              ? "bg-success"
                              : STATUS_TONE[status] === "warning"
                                ? "bg-warning"
                                : "bg-border-strong",
                          )}
                          aria-hidden="true"
                        />
                        {status}
                      </div>
                      <p className="mt-1 text-lg font-semibold leading-6 tabular-nums text-foreground">
                        {formatCount(catalog.counts[status])}
                      </p>
                    </div>
                  ))}
                </div>
                {catalog.top.length > 0 && (
                  <div>
                    <p className="mb-2 text-caption font-medium uppercase tracking-wider text-subtle-foreground">
                      Most enrolled
                    </p>
                    <ul className="flex flex-col gap-3">
                      {catalog.top.map((course) => (
                        <li key={course.id} className="min-w-0">
                          <div className="mb-1.5 flex items-baseline justify-between gap-3">
                            <span
                              className="truncate text-sm font-medium text-foreground"
                              title={course.title}
                            >
                              {course.title}
                            </span>
                            <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
                              {formatCount(course.enrolledStudents)}{" "}
                              {plural(course.enrolledStudents, "learner", "learners")}
                            </span>
                          </div>
                          <Progress
                            size="xs"
                            value={(course.enrolledStudents / catalog.topMax) * 100}
                            label={`${course.title}: ${formatCount(course.enrolledStudents)} learners`}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      </StaggerItem>
    </Stagger>
  )
}

function SectionCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={cn("flex min-w-0 flex-col p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold leading-6 tracking-tight text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-pretty text-caption text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center">{action}</div>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </Card>
  )
}

function ViewAll({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="-mr-2"
      aria-label={`View all ${label}`}
      rightIcon={<ArrowRight aria-hidden="true" />}
    >
      View all
    </Button>
  )
}

function MiniStat({
  label,
  value,
  hint,
  hintTone = "muted",
}: {
  label: string
  value: string
  hint: string
  hintTone?: "muted" | "success" | "danger"
}) {
  return (
    <div className="min-w-0 px-3 py-2.5 sm:px-4">
      <dt className="truncate text-caption text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-base font-semibold leading-6 tabular-nums text-foreground sm:text-lg">
        {value}
      </dd>
      <dd
        className={cn(
          "text-[11px] font-medium leading-4 tabular-nums",
          hintTone === "success"
            ? "text-success"
            : hintTone === "danger"
              ? "text-danger"
              : "text-subtle-foreground",
        )}
      >
        {hint}
      </dd>
    </div>
  )
}

function ListRow({
  leading,
  title,
  subtitle,
  subtitleMuted,
  trailing,
  onClick,
}: {
  leading: ReactNode
  title: string
  subtitle: string
  subtitleMuted?: boolean
  trailing: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="shrink-0">{leading}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        <span
          className={cn(
            "block truncate text-caption",
            subtitleMuted ? "italic text-subtle-foreground" : "text-muted-foreground",
          )}
        >
          {subtitle}
        </span>
      </span>
      <span className="shrink-0">{trailing}</span>
    </button>
  )
}

function PipelineRow({
  batch,
  courses,
  now,
  onOpen,
}: {
  batch: AdminBatch
  courses: AdminCourse[]
  now: number
  onOpen: () => void
}) {
  const theme = resolveBatchTheme(batch, courses)
  const pct = seatUtilization(batch.enrolledSeats, batch.maxSeats)
  const isActive = batch.status === "Active"
  const milestone = parseDate(isActive ? batch.endDate : batch.startDate)
  const today = startOfDay(now)

  let timing: { text: string; overdue: boolean }
  if (milestone === null) {
    timing = { text: isActive ? "No end date" : "Start date not set", overdue: false }
  } else if (milestone < today) {
    timing = { text: isActive ? "End date passed" : "Start date passed", overdue: true }
  } else {
    timing = { text: `${isActive ? "Ends" : "Starts"} ${relativeDay(milestone, now)}`, overdue: false }
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[auto_minmax(0,1fr)_9rem_7.5rem]"
    >
      <CourseCover title={batch.name} category={theme.category} showTitle={false} hoverZoom={false} className="aspect-auto h-9 w-12 shrink-0 rounded-md shadow-[var(--elev-xs)]" />

      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{batch.name}</span>
          <Badge tone={batchStatusTone(batch)} size="sm" dot className="shrink-0">
            {isActive ? "Running" : "Upcoming"}
          </Badge>
        </span>
        <span className="block truncate text-caption text-muted-foreground">{batch.courseTitle}</span>
      </span>

      <span className="col-start-2 flex min-w-0 flex-col gap-0.5 sm:col-start-auto">
        <span
          className={cn(
            "flex items-center gap-1.5 text-caption",
            timing.overdue ? "font-medium text-danger" : "text-foreground",
          )}
        >
          {timing.overdue ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="truncate">{timing.text}</span>
        </span>
        <span className="truncate pl-5 text-[11px] tabular-nums text-muted-foreground">
          {milestone === null
            ? formatShortDateRange(batch.startDate, batch.endDate)
            : dayFormatter.format(milestone)}
        </span>
      </span>

      <span className="col-start-2 flex min-w-0 flex-col gap-1 sm:col-start-auto">
        <span className="flex items-baseline justify-between gap-2 text-caption">
          <span className="tabular-nums text-foreground">
            {formatCount(batch.enrolledSeats)}
            <span className="text-muted-foreground">/{formatCount(batch.maxSeats)}</span>
          </span>
          <span className="tabular-nums text-muted-foreground">{pct}%</span>
        </span>
        <Progress
          size="xs"
          value={pct}
          tone={seatTone(pct)}
          label={`${batch.name}: ${batch.enrolledSeats} of ${batch.maxSeats} seats filled`}
        />
      </span>
    </button>
  )
}
