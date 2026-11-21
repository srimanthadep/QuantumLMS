import { useDeferredValue, useEffect, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  GraduationCap,
  Info,
  Layers,
  MoreHorizontal,
  Pencil,
  Search,
  UserCheck,
  UserPlus,
  UserRound,
  UserX,
  X,
} from "lucide-react"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import { StatCard } from "@/components/ui/StatCard"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { CustomSelect } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { SegmentedControl } from "@/components/ui/tabs"
import type { AdminStudent, useAdminStore } from "@/data/adminStore"
import { cn } from "@/lib/utils"

interface StudentsViewProps {
  store: ReturnType<typeof useAdminStore>
  onToast: (msg: string) => void
  onOpenManualEnrol: () => void
}

type AccountFilter = "All" | "Active" | "Disabled"
type EnrollmentFilter = "all" | "access" | "no-access" | "batch" | "no-batch"
type SortKey = "name-asc" | "name-desc" | "newest" | "oldest"

/** A student with the fields the directory derives once and reuses everywhere. */
interface Learner {
  student: AdminStudent
  name: string
  courses: string[]
  batches: string[]
  disabled: boolean
  joinedAt: number | null
  haystack: string
}

type PendingAction = { kind: "rename" | "disable"; learner: Learner }

const PAGE_SIZE = 20
const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

/** Placeholders the admin store writes when a learner has no course or batch. */
const NO_COURSE_PLACEHOLDER = "No active access"
const NO_BATCH_PLACEHOLDER = "Unassigned"

const ENROLLMENT_OPTIONS: { value: EnrollmentFilter; label: string }[] = [
  { value: "all", label: "All enrollment" },
  { value: "access", label: "With course access" },
  { value: "no-access", label: "No course access" },
  { value: "batch", label: "In a batch" },
  { value: "no-batch", label: "Not in a batch" },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
]

const joinedFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function parseJoined(value: string | null | undefined): number | null {
  if (!value) return null
  const ms = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  ).getTime()
  return Number.isNaN(ms) ? null : ms
}

function formatJoined(ms: number | null): string {
  return ms === null ? "—" : joinedFormatter.format(ms)
}

/**
 * The API joins a learner's courses (and batches) into one ", "-separated
 * string. Titles may contain commas themselves, so pieces are re-joined
 * whenever they form a title the store already knows.
 */
function splitJoined(
  value: string | null | undefined,
  placeholder: string,
  known: ReadonlySet<string>,
): string[] {
  const text = (value ?? "").trim()
  if (!text || text === placeholder) return []
  const parts = text.split(", ")
  const items: string[] = []
  let i = 0
  while (i < parts.length) {
    let end = i + 1
    for (let j = parts.length; j > i + 1; j--) {
      if (known.has(parts.slice(i, j).join(", "))) {
        end = j
        break
      }
    }
    const item = parts.slice(i, end).join(", ").trim()
    if (item) items.push(item)
    i = end
  }
  return items
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation()

function AccountBadge({ disabled }: { disabled: boolean }) {
  return (
    <Badge tone={disabled ? "neutral" : "success"} dot>
      {disabled ? "Disabled" : "Active"}
    </Badge>
  )
}

/** First item, plus a "+N" count when the learner has more than one. */
function NameList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <span className="text-xs text-subtle-foreground">{empty}</span>
  }
  return (
    <div className="flex min-w-0 items-center gap-1.5" title={items.join("\n")}>
      <span className="min-w-0 truncate text-sm text-foreground">{items[0]}</span>
      {items.length > 1 && (
        <Badge size="sm" className="shrink-0 tabular-nums">
          +{items.length - 1}
        </Badge>
      )}
    </div>
  )
}

function LearnerActionsMenu({
  learner,
  onView,
  onRename,
  onCopyEmail,
  onDisable,
}: {
  learner: Learner
  onView: () => void
  onRename: () => void
  onCopyEmail: () => void
  onDisable: () => void
}) {
  return (
    <div onClick={stop} onPointerDown={stop} onKeyDown={stop}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${learner.name}`}
            className="h-8 w-8 rounded-full"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onView}>
            <UserRound className="h-4 w-4" />
            View profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onRename}>
            <Pencil className="h-4 w-4" />
            Edit name
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCopyEmail}>
            <Copy className="h-4 w-4" />
            Copy email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            disabled={learner.disabled}
            onSelect={onDisable}
          >
            <UserX className="h-4 w-4" />
            {learner.disabled ? "Account disabled" : "Disable account"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Titled list inside the profile panel (course access, batches). */
function ProfileList({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string
  icon: LucideIcon
  items: string[]
  empty: string
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
          {title}
        </h3>
        <span className="rounded-md border border-border bg-surface-2 px-1.5 text-[11px] font-medium tabular-nums leading-4 text-muted-foreground">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-text ring-1 ring-inset ring-primary-border">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 break-words text-sm font-medium text-foreground">
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Learner directory: account status, course access and batch placement for every student. */
export default function StudentsView({
  store,
  onToast,
  onOpenManualEnrol,
}: StudentsViewProps) {
  const { students, courses, batches, updateStudent, deleteStudent } = store

  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("All")
  const [enrollmentFilter, setEnrollmentFilter] =
    useState<EnrollmentFilter>("all")
  const [sortBy, setSortBy] = useState<SortKey>("name-asc")
  const [page, setPage] = useState(1)

  const [profileId, setProfileId] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const [action, setAction] = useState<PendingAction | null>(null)
  const [actionOpen, setActionOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [actionError, setActionError] = useState("")
  const [busy, setBusy] = useState(false)

  const learners = useMemo<Learner[]>(() => {
    const knownCourses = new Set(courses.map((c) => c.title))
    const knownBatches = new Set(batches.map((b) => b.name))
    return students.map((student) => {
      const name = student.name?.trim() || "Unnamed learner"
      const courseList = splitJoined(
        student.courseTitle,
        NO_COURSE_PLACEHOLDER,
        knownCourses,
      )
      const batchList = splitJoined(
        student.batchName,
        NO_BATCH_PLACEHOLDER,
        knownBatches,
      )
      return {
        student,
        name,
        courses: courseList,
        batches: batchList,
        disabled: student.status === "Paused",
        joinedAt: parseJoined(student.enrolledAt),
        haystack: [name, student.email, ...courseList, ...batchList]
          .join(" ")
          .toLowerCase(),
      }
    })
  }, [students, courses, batches])

  const metrics = useMemo(() => {
    const recentFrom = Date.now() - RECENT_WINDOW_MS
    const total = learners.length
    const disabled = learners.filter((l) => l.disabled).length
    const withAccess = learners.filter((l) => l.courses.length > 0).length
    const inBatch = learners.filter((l) => l.batches.length > 0).length
    return {
      total,
      disabled,
      active: total - disabled,
      withAccess,
      accessShare: total > 0 ? Math.round((withAccess / total) * 100) : 0,
      inBatch,
      recent: learners.filter(
        (l) => l.joinedAt !== null && l.joinedAt >= recentFrom,
      ).length,
      activeWithoutAccess: learners.filter(
        (l) => !l.disabled && l.courses.length === 0,
      ).length,
    }
  }, [learners])

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    const list = learners.filter((l) => {
      if (q && !l.haystack.includes(q)) return false
      if (accountFilter === "Active" && l.disabled) return false
      if (accountFilter === "Disabled" && !l.disabled) return false
      if (enrollmentFilter === "access") return l.courses.length > 0
      if (enrollmentFilter === "no-access") return l.courses.length === 0
      if (enrollmentFilter === "batch") return l.batches.length > 0
      if (enrollmentFilter === "no-batch") return l.batches.length === 0
      return true
    })
    const byName = (a: Learner, b: Learner) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    return [...list].sort((a, b) => {
      if (sortBy === "name-asc") return byName(a, b)
      if (sortBy === "name-desc") return byName(b, a)
      // Learners without a join date stay at the end in both directions.
      if (a.joinedAt === null || b.joinedAt === null) {
        if (a.joinedAt === b.joinedAt) return byName(a, b)
        return a.joinedAt === null ? 1 : -1
      }
      return (
        (sortBy === "newest"
          ? b.joinedAt - a.joinedAt
          : a.joinedAt - b.joinedAt) || byName(a, b)
      )
    })
  }, [learners, deferredSearch, accountFilter, enrollmentFilter, sortBy])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, accountFilter, enrollmentFilter, sortBy])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const hasFilters =
    Boolean(search.trim()) ||
    accountFilter !== "All" ||
    enrollmentFilter !== "all"

  const clearFilters = () => {
    setSearch("")
    setAccountFilter("All")
    setEnrollmentFilter("all")
  }

  const profile = useMemo(
    () =>
      profileId
        ? (learners.find((l) => l.student.id === profileId) ?? null)
        : null,
    [learners, profileId],
  )

  const openProfile = (learner: Learner) => {
    setProfileId(learner.student.id)
    setProfileOpen(true)
  }

  const openAction = (kind: PendingAction["kind"], learner: Learner) => {
    setAction({ kind, learner })
    setNameDraft(learner.student.name ?? "")
    setActionError("")
    setActionOpen(true)
  }

  const closeAction = () => {
    if (!busy) setActionOpen(false)
  }

  const copyEmail = async (learner: Learner) => {
    try {
      await navigator.clipboard.writeText(learner.student.email)
      onToast(`Copied ${learner.student.email}`)
    } catch {
      onToast("Could not copy the email address.")
    }
  }

  const trimmedName = nameDraft.trim()
  const canSaveName =
    action?.kind === "rename" &&
    trimmedName.length > 0 &&
    trimmedName !== (action.learner.student.name ?? "").trim()

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!action || action.kind !== "rename" || busy || !canSaveName) return
    setBusy(true)
    setActionError("")
    try {
      await updateStudent(action.learner.student.id, { name: trimmedName })
      setActionOpen(false)
      onToast(`Saved name for ${trimmedName}`)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not save the name.",
      )
    } finally {
      setBusy(false)
    }
  }

  const handleDisable = async () => {
    if (!action || action.kind !== "disable" || busy) return
    setBusy(true)
    setActionError("")
    try {
      await deleteStudent(action.learner.student.id)
      setActionOpen(false)
      onToast(`Disabled the account for ${action.learner.name}. History is retained.`)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not disable the account.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stagger className="flex flex-col gap-5" stagger={0.05}>
      <StaggerItem>
        <PageHeader
          className="mb-0"
          eyebrow="Learner Directory"
          title="Students"
          description="Find any learner, review their course access and batches, and manage account status."
          actions={
            <Button
              onClick={onOpenManualEnrol}
              leftIcon={<UserPlus aria-hidden="true" />}
            >
              Enrol learner
            </Button>
          }
        />
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={UserCheck}
            title="Active learners"
            value={metrics.active}
            trend={`${metrics.total} total · ${metrics.disabled} disabled`}
            tone="primary"
            isActive={accountFilter === "Active"}
            onClick={() =>
              setAccountFilter((prev) => (prev === "Active" ? "All" : "Active"))
            }
          />
          <StatCard
            icon={BookOpen}
            title="With course access"
            value={metrics.withAccess}
            trend={`${metrics.accessShare}% of all learners`}
            tone="success"
            isActive={enrollmentFilter === "access"}
            onClick={() =>
              setEnrollmentFilter((prev) =>
                prev === "access" ? "all" : "access",
              )
            }
          />
          <StatCard
            icon={Layers}
            title="In a batch"
            value={metrics.inBatch}
            trend={`${metrics.total - metrics.inBatch} not in a batch`}
            tone="info"
            isActive={enrollmentFilter === "batch"}
            onClick={() =>
              setEnrollmentFilter((prev) => (prev === "batch" ? "all" : "batch"))
            }
          />
          <StatCard
            icon={UserPlus}
            title="New learners"
            value={metrics.recent}
            trend="Joined in the last 30 days"
            tone="warning"
          />
        </div>
      </StaggerItem>

      {metrics.activeWithoutAccess > 0 && (
        <StaggerItem>
          <div className="flex flex-col gap-3 rounded-lg border border-warning/25 bg-warning-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Learners without course access
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {metrics.activeWithoutAccess}{" "}
                  {metrics.activeWithoutAccess === 1
                    ? "active learner has"
                    : "active learners have"}{" "}
                  no active course access. They can sign in, but have nothing to
                  learn yet.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch("")
                setAccountFilter("Active")
                setEnrollmentFilter("no-access")
              }}
              className="flex shrink-0 items-center gap-1.5 self-start rounded-md px-2.5 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/10 sm:self-auto"
            >
              Review learners
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </StaggerItem>
      )}

      <StaggerItem>
        <Card className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              leading={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
              trailing={
                search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null
              }
              aria-label="Search students"
              placeholder="Search name, email, course or batch…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              wrapperClassName="sm:min-w-[16rem] sm:max-w-md sm:flex-1"
            />
            <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center">
              <CustomSelect
                aria-label="Filter by enrollment"
                value={enrollmentFilter}
                onChange={(v) => setEnrollmentFilter(v as EnrollmentFilter)}
                options={ENROLLMENT_OPTIONS}
                className="w-full sm:w-48"
              />
              <CustomSelect
                aria-label="Sort students"
                value={sortBy}
                onChange={(v) => setSortBy(v as SortKey)}
                options={SORT_OPTIONS}
                className="w-full sm:w-44"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <div className="no-scrollbar -mx-1 max-w-full shrink-0 overflow-x-auto px-1">
              <SegmentedControl
                size="sm"
                aria-label="Filter students by account status"
                value={accountFilter}
                onChange={setAccountFilter}
                options={[
                  { value: "All" as AccountFilter, label: `All · ${metrics.total}` },
                  { value: "Active" as AccountFilter, label: `Active · ${metrics.active}` },
                  { value: "Disabled" as AccountFilter, label: `Disabled · ${metrics.disabled}` },
                ]}
              />
            </div>
            <div
              className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <span>
                <span className="font-semibold tabular-nums text-foreground">
                  {filtered.length}
                </span>{" "}
                of {metrics.total}
              </span>
              {hasFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearFilters}
                  leftIcon={<X aria-hidden="true" />}
                  className="h-7 text-xs"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </Card>
      </StaggerItem>

      <StaggerItem>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<GraduationCap aria-hidden="true" />}
            title={hasFilters ? "No matching learners" : "No learners yet"}
            description={
              hasFilters
                ? "Try another search, or clear your filters."
                : "Enrol a learner to create their account and give them course access."
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button
                  onClick={onOpenManualEnrol}
                  leftIcon={<UserPlus aria-hidden="true" />}
                >
                  Enrol your first learner
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            <Card className="overflow-hidden">
              <div
                className="relative overflow-x-auto"
                tabIndex={0}
                role="region"
                aria-label="Students list"
              >
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <caption className="sr-only">
                    Students: course access, batches, join date and account status
                  </caption>
                  <thead>
                    <tr className="border-b border-border bg-surface-2/80 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th scope="col" className="px-4 py-3">Learner</th>
                      <th scope="col" className="hidden w-[34%] px-3 py-3 sm:table-cell xl:w-[24%]">Course access</th>
                      <th scope="col" className="hidden w-[22%] px-3 py-3 xl:table-cell">Batch</th>
                      <th scope="col" className="hidden w-[7.5rem] px-3 py-3 xl:table-cell">Joined</th>
                      <th scope="col" className="w-[6.5rem] px-3 py-3 sm:w-28">Account</th>
                      <th scope="col" className="w-12 py-3 pl-0 pr-2 text-right sm:w-14 sm:pr-4">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((learner) => (
                      <tr
                        key={learner.student.id}
                        onClick={() => openProfile(learner)}
                        className={cn(
                          "group cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-surface-2/60",
                          learner.disabled && "opacity-75",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={learner.student.avatar}
                              name={learner.name}
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openProfile(learner)
                                }}
                                aria-label={`View ${learner.name}`}
                                title={learner.name}
                                className="block max-w-full truncate rounded text-left text-sm font-semibold text-foreground transition-colors group-hover:text-primary-text"
                              >
                                {learner.name}
                              </button>
                              <div
                                className="truncate text-xs text-muted-foreground"
                                title={learner.student.email}
                              >
                                {learner.student.email}
                              </div>
                              <div className="mt-0.5 text-[11px] text-subtle-foreground sm:hidden">
                                {learner.courses.length === 0
                                  ? "No course access"
                                  : `${learner.courses.length} ${learner.courses.length === 1 ? "course" : "courses"}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-3 py-3 sm:table-cell">
                          <NameList items={learner.courses} empty="No active access" />
                        </td>
                        <td className="hidden px-3 py-3 xl:table-cell">
                          <NameList items={learner.batches} empty="Not in a batch" />
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground xl:table-cell">
                          {formatJoined(learner.joinedAt)}
                        </td>
                        <td className="px-3 py-3">
                          <AccountBadge disabled={learner.disabled} />
                        </td>
                        <td className="py-3 pl-0 pr-2 sm:pr-4" onClick={stop}>
                          <div className="flex justify-end">
                            <LearnerActionsMenu
                              learner={learner}
                              onView={() => openProfile(learner)}
                              onRename={() => openAction("rename", learner)}
                              onCopyEmail={() => void copyEmail(learner)}
                              onDisable={() => openAction("disable", learner)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pageCount > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Showing{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {pageStart + 1}–{pageStart + pageRows.length}
                    </span>{" "}
                    of {filtered.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                      leftIcon={<ChevronLeft aria-hidden="true" />}
                    >
                      Previous
                    </Button>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      Page {currentPage} of {pageCount}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === pageCount}
                      onClick={() => setPage(currentPage + 1)}
                      rightIcon={<ChevronRight aria-hidden="true" />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Admissions, transfers and learner status are managed inside the
              relevant batch. Disabling an account keeps payment, grading and
              certificate history.
            </p>
          </div>
        )}
      </StaggerItem>

      {/* Learner profile */}
      <Sheet
        open={profileOpen && profile !== null}
        onOpenChange={setProfileOpen}
      >
        <SheetContent className="gap-0 overflow-hidden p-0">
          {profile && (
            <>
              <div className="border-b border-border bg-surface-2/60 px-6 pb-5 pt-6">
                <div className="flex items-start gap-4 pr-8">
                  <Avatar
                    src={profile.student.avatar}
                    name={profile.name}
                    size="xl"
                  />
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="break-words leading-snug">
                      {profile.name}
                    </SheetTitle>
                    <SheetDescription className="break-all">
                      {profile.student.email}
                    </SheetDescription>
                    <div className="mt-2.5">
                      <AccountBadge disabled={profile.disabled} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <section className="space-y-2.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                    Account
                  </h3>
                  <dl className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
                    <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                      <dt className="text-muted-foreground">Sign-in access</dt>
                      <dd className="font-medium text-foreground">
                        {profile.disabled ? "Disabled" : "Enabled"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                      <dt className="text-muted-foreground">Joined</dt>
                      <dd className="font-medium tabular-nums text-foreground">
                        {formatJoined(profile.joinedAt)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                      <dt className="shrink-0 text-muted-foreground">Learner ID</dt>
                      <dd
                        className="min-w-0 truncate font-mono text-xs text-muted-foreground"
                        title={profile.student.id}
                      >
                        {profile.student.id}
                      </dd>
                    </div>
                  </dl>
                </section>

                <ProfileList
                  title="Course access"
                  icon={BookOpen}
                  items={profile.courses}
                  empty="No active course access."
                />
                <ProfileList
                  title="Batches"
                  icon={Layers}
                  items={profile.batches}
                  empty="Not placed in a batch."
                />

                <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  To change course access or move this learner, open the
                  relevant batch.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface px-6 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAction("rename", profile)}
                  leftIcon={<Pencil aria-hidden="true" />}
                >
                  Edit name
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void copyEmail(profile)}
                  leftIcon={<Copy aria-hidden="true" />}
                >
                  Copy email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={profile.disabled}
                  onClick={() => openAction("disable", profile)}
                  leftIcon={<UserX aria-hidden="true" />}
                  className="ml-auto border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
                >
                  {profile.disabled ? "Account disabled" : "Disable account"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit name */}
      <Dialog
        open={actionOpen && action?.kind === "rename"}
        onOpenChange={(open) => !open && closeAction()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-border bg-primary-soft text-primary-text">
                <Pencil className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <DialogTitle>Edit learner name</DialogTitle>
                <DialogDescription>
                  Updates the name on the account. Course access and batches
                  are not affected.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            <Field
              label="Full name"
              required
              hint={action?.learner.student.email}
              error={actionError || undefined}
            >
              <Input
                value={nameDraft}
                onChange={(e) => {
                  setNameDraft(e.target.value)
                  setActionError("")
                }}
                maxLength={120}
                autoComplete="off"
                autoFocus
                readOnly={busy}
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={closeAction}
              >
                Cancel
              </Button>
              <Button type="submit" loading={busy} disabled={!canSaveName}>
                Save name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disable account */}
      <Dialog
        open={actionOpen && action?.kind === "disable"}
        onOpenChange={(open) => !open && closeAction()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-danger/20 bg-danger/10 text-danger">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <DialogTitle>Disable this account?</DialogTitle>
                <DialogDescription>
                  The learner will lose sign-in access. Payment, grading and
                  certificate history is kept.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {action && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
              <Avatar
                src={action.learner.student.avatar}
                name={action.learner.name}
                size="md"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">
                  {action.learner.name}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {action.learner.student.email}
                </div>
              </div>
            </div>
          )}
          {actionError && (
            <p role="alert" className="text-sm font-medium text-danger">
              {actionError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={closeAction}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={busy}
              onClick={() => void handleDisable()}
            >
              Disable account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Stagger>
  )
}
