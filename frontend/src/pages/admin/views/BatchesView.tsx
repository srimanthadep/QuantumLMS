import { useDeferredValue, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  Gauge,
  X,
  Layers,
  LayoutGrid,
  List,
  Plus,
  Search,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { CustomSelect } from "@/components/ui/select"
import { SegmentedControl } from "@/components/ui/tabs"
import type { AdminBatch, useAdminStore } from "@/data/adminStore"
import { cn } from "@/lib/utils"
import BatchCard from "./batches/BatchCard"
import BatchFormDialog, {
  type BatchFormValues,
} from "./batches/BatchFormDialog"
import BatchRow from "./batches/BatchRow"
import BatchWorkspaceModal, {
  type BatchWorkspaceTab,
} from "./batches/BatchWorkspaceModal"
import { resolveBatchTheme, seatUtilization } from "./batches/batchTheme"
interface BatchesViewProps {
  store: ReturnType<typeof useAdminStore>
  onOpenCreateBatch: () => void
  onToast?: (msg: string) => void
}
type StatusFilter = "All" | AdminBatch["status"]
type SortKey = "priority" | "start" | "enrolled" | "utilization" | "name"
type ViewMode = "grid" | "list"
const SORT_OPTIONS: {
  value: SortKey
  label: string
}[] = [
  { value: "priority", label: "Active first" },
  { value: "start", label: "Start date" },
  { value: "enrolled", label: "Most enrolled" },
  { value: "utilization", label: "Highest occupancy" },
  { value: "name", label: "Name (A–Z)" },
]
function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  hint: string
  icon: LucideIcon
  tone: string
}) {
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
/** Batch operations, with portfolio metrics and focused learner/settings workspaces. */
export default function BatchesView({
  store,
  onOpenCreateBatch,
  onToast,
}: BatchesViewProps) {
  const {
    batches,
    courses,
    teachers,
    updateBatch,
    duplicateBatch,
    deleteBatch,
  } = store
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [capacityFilter, setCapacityFilter] =
    useState<"All" | "near-full" | "waitlist">("All")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All")
  const [courseFilter, setCourseFilter] = useState("All")
  const [sortBy, setSortBy] = useState<SortKey>("priority")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [workspaceBatchId, setWorkspaceBatchId] = useState<string | null>(null)
  const [workspaceTab, setWorkspaceTab] = useState<BatchWorkspaceTab>("roster")
  const [editingBatch, setEditingBatch] = useState<AdminBatch | null>(null)
  const [deletingBatch, setDeletingBatch] = useState<AdminBatch | null>(null)
  const [busyDelete, setBusyDelete] = useState(false)
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>()
    courses.forEach((c) => map.set(c.id, c.title))
    batches.forEach((b) => {
      if (b.courseId && !map.has(b.courseId)) map.set(b.courseId, b.courseTitle)
    })
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }))
  }, [courses, batches])
  const instructorList = useMemo(
    () => teachers.map((t) => t.name).filter(Boolean),
    [teachers],
  )
  const statusCounts = useMemo(
    () => ({
      All: batches.length,
      Active: batches.filter((b) => b.status === "Active").length,
      Upcoming: batches.filter((b) => b.status === "Upcoming").length,
      Completed: batches.filter((b) => b.status === "Completed").length,
      Archived: batches.filter((b) => b.status === "Archived").length,
    }),
    [batches],
  )
  const metrics = useMemo(() => {
    const enrolled = batches.reduce((sum, b) => sum + b.enrolledSeats, 0)
    const openBatches = batches.filter(
      (b) => b.status === "Active" || b.status === "Upcoming",
    )
    const waitlisted = openBatches.reduce(
      (sum, b) => sum + (b.waitlistedSeats ?? 0),
      0,
    )
    const capTotal = openBatches.reduce((sum, b) => sum + b.maxSeats, 0)
    const capFilled = openBatches.reduce((sum, b) => sum + b.enrolledSeats, 0)
    const utilization =
      capTotal > 0 ? Math.round((capFilled / capTotal) * 100) : 0
    const nearFull = openBatches.filter(
      (b) => b.maxSeats > 0 && b.enrolledSeats / b.maxSeats >= 0.85,
    ).length
    return { enrolled, waitlisted, utilization, nearFull }
  }, [batches])
  const filteredBatches = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    const list = batches.filter((b) => {
      const matchesQuery =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.courseTitle.toLowerCase().includes(q) ||
        (b.courseCode ?? "").toLowerCase().includes(q) ||
        b.instructor.toLowerCase().includes(q)
      const matchesStatus = statusFilter === "All" || b.status === statusFilter
      const matchesCourse =
        courseFilter === "All" || b.courseId === courseFilter
      const isOpen = b.status === "Active" || b.status === "Upcoming"
      const matchesCapacity =
        capacityFilter === "All" ||
        (isOpen &&
          (capacityFilter === "waitlist"
            ? b.waitlistedSeats > 0
            : b.maxSeats > 0 && b.enrolledSeats / b.maxSeats >= 0.85))
      return matchesQuery && matchesStatus && matchesCourse && matchesCapacity
    })
    return [...list].sort((a, b) => {
      if (sortBy === "priority") {
        const order = { Active: 0, Upcoming: 1, Completed: 2, Archived: 3 }
        return (
          order[a.status] - order[b.status] ||
          (a.startDate || "9999").localeCompare(b.startDate || "9999")
        )
      }
      if (sortBy === "enrolled") return b.enrolledSeats - a.enrolledSeats
      if (sortBy === "utilization") {
        return (
          seatUtilization(b.enrolledSeats, b.maxSeats) -
          seatUtilization(a.enrolledSeats, a.maxSeats)
        )
      }
      if (sortBy === "name") return a.name.localeCompare(b.name)
      return (a.startDate || "").localeCompare(b.startDate || "")
    })
  }, [
    batches,
    deferredSearch,
    statusFilter,
    courseFilter,
    sortBy,
    capacityFilter,
  ])
  const hasFilters =
    Boolean(search.trim()) ||
    statusFilter !== "All" ||
    courseFilter !== "All" ||
    capacityFilter !== "All"
  const clearFilters = () => {
    setSearch("")
    setStatusFilter("All")
    setCourseFilter("All")
    setCapacityFilter("All")
  }
  const openWorkspace = (
    batch: AdminBatch,
    initialTab: BatchWorkspaceTab = "roster",
  ) => {
    setWorkspaceTab(initialTab)
    setWorkspaceBatchId(batch.id)
  }
  const workspaceBatch = useMemo(
    () =>
      workspaceBatchId
        ? (batches.find((b) => b.id === workspaceBatchId) ?? null)
        : null,
    [batches, workspaceBatchId],
  )
  const handleSaveQuickEdit = async (values: BatchFormValues) => {
    if (!editingBatch) return
    await updateBatch(editingBatch.id, values)
    onToast?.(`Updated cohort "${values.name}"`)
    setEditingBatch(null)
  }
  const handleDuplicate = async (batch: AdminBatch) => {
    try {
      const copy = await duplicateBatch(batch.id)
      onToast?.(`Cloned cohort "${copy?.name ?? batch.name}"`)
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Could not clone cohort.")
    }
  }
  const handleToggleArchive = async (batch: AdminBatch) => {
    const nextStatus: AdminBatch["status"] =
      batch.status === "Archived" ? "Upcoming" : "Archived"
    try {
      await updateBatch(batch.id, { status: nextStatus })
      onToast?.(
        nextStatus === "Archived"
          ? `Archived cohort "${batch.name}"`
          : `Restored "${batch.name}" to Upcoming`,
      )
    } catch (err) {
      onToast?.(
        err instanceof Error ? err.message : "Could not update cohort status.",
      )
    }
  }
  const handleConfirmDelete = async () => {
    if (!deletingBatch) return
    setBusyDelete(true)
    const deletedId = deletingBatch.id
    const deletedName = deletingBatch.name
    try {
      await deleteBatch(deletedId)
      if (workspaceBatchId === deletedId) setWorkspaceBatchId(null)
      onToast?.(`Deleted cohort "${deletedName}"`)
      setDeletingBatch(null)
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Could not delete cohort.")
    } finally {
      setBusyDelete(false)
    }
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Batches
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your cohorts at a glance. Click a batch to open its full workspace.
          </p>
        </div>
        <Button
          onClick={onOpenCreateBatch}
          className="self-start sm:self-auto"
          leftIcon={<Plus aria-hidden="true" />}
        >
          New batch
        </Button>
      </header>
      <section
        aria-label="Batch overview"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Stat
          label="Running now"
          value={statusCounts.Active}
          hint={`${statusCounts.Upcoming} upcoming · ${batches.length} total batches`}
          icon={Layers}
          tone="bg-primary-soft text-primary-text ring-primary-border"
        />
        <Stat
          label="Learners enrolled"
          value={metrics.enrolled.toLocaleString("en-IN")}
          hint="Across all batches"
          icon={Users}
          tone="bg-info-soft text-info ring-info/20"
        />
        <Stat
          label="Seat occupancy"
          value={`${metrics.utilization}%`}
          hint="Active & upcoming batches"
          icon={Gauge}
          tone="bg-success-soft text-success ring-success/20"
        />
        <Stat
          label="On the waitlist"
          value={metrics.waitlisted}
          hint={
            metrics.waitlisted
              ? "Learners awaiting a place"
              : "No learners waiting for a place"
          }
          icon={Clock3}
          tone="bg-warning-soft text-warning ring-warning/20"
        />
      </section>
      {(metrics.nearFull > 0 || metrics.waitlisted > 0) && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/20 bg-warning-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">
                {metrics.waitlisted
                  ? "A little attention goes a long way"
                  : "Your batches are filling up"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {[
                  metrics.nearFull > 0 &&
                    `${metrics.nearFull} ${
                      metrics.nearFull === 1 ? "batch is" : "batches are"
                    } at 85% capacity or above`,
                  metrics.waitlisted > 0 &&
                    `${metrics.waitlisted} ${
                      metrics.waitlisted === 1 ? "learner is" : "learners are"
                    } waiting for a seat`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                .
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearFilters()
              setCapacityFilter(metrics.waitlisted ? "waitlist" : "near-full")
            }}
            className="flex shrink-0 items-center gap-2 self-start rounded-md px-2 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/10 sm:self-auto"
          >
            {metrics.waitlisted ? "Review waitlists" : "Review capacity"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
      <section aria-label="Find batches" className="space-y-3 rounded-2xl border border-border bg-surface p-3 shadow-xs sm:p-4">
        <div className="no-scrollbar overflow-x-auto">
          <SegmentedControl size="sm" aria-label="Filter batches by status" className="[&_button]:whitespace-nowrap" value={statusFilter} onChange={setStatusFilter}
            options={(["All", "Active", "Upcoming", "Completed", "Archived"] as StatusFilter[]).map((status) => ({ value: status, label: `${status} · ${statusCounts[status]}` }))} />
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            leading={<Search className="h-4 w-4" />}
            aria-label="Search batches"
            placeholder="Search batches, courses or instructors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="min-w-0 flex-1"
            className="h-10 bg-surface"
          />
          <div className="flex flex-wrap items-center gap-2">
            <CustomSelect
              aria-label="Filter by course"
              value={courseFilter}
              onChange={setCourseFilter}
              options={[
                { value: "All", label: "All courses" },
                ...courseOptions.map((c) => ({ value: c.id, label: c.title })),
              ]}
              className="min-w-0 flex-1 sm:w-48 sm:flex-none"
              triggerClassName="h-10 bg-surface"
            />
            <CustomSelect
              aria-label="Sort batches"
              value={sortBy}
              onChange={(v) => setSortBy(v as SortKey)}
              options={SORT_OPTIONS}
              className="min-w-0 flex-1 sm:w-48 sm:flex-none"
              triggerClassName="h-10 bg-surface"
            />
            <div
              className="flex h-10 shrink-0 items-center gap-0.5 rounded-lg border border-border bg-surface p-1"
              role="group"
              aria-label="Batch view"
            >
              {([
                { value: "grid", icon: LayoutGrid, label: "Grid view" },
                { value: "list", icon: List, label: "List view" },
              ] as const).map(({ value, icon: Icon, label }) => (
                <button
                  type="button"
                  key={value}
                  aria-label={label}
                  title={label}
                  aria-pressed={viewMode === value}
                  onClick={() => setViewMode(value)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                    viewMode === value
                      ? "bg-primary-soft text-primary-text"
                      : "text-subtle-foreground hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex min-h-5 flex-wrap items-center justify-between gap-2 text-xs">
          <p
            role="status"
            aria-live="polite"
            className="text-subtle-foreground"
          >
            <span className="font-medium text-foreground">
              {filteredBatches.length}
            </span>{" "}
            {filteredBatches.length === 1 ? "batch" : "batches"}
            {hasFilters ? ` of ${batches.length}` : " in your workspace"}
          </p>
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {capacityFilter !== "All" && (
                <span className="flex items-center gap-1 rounded-md bg-warning-soft px-2 py-1 text-[11px] font-medium text-warning">
                  {capacityFilter === "waitlist"
                    ? "With waitlisted learners"
                    : "85%+ capacity"}
                  <button
                    type="button"
                    aria-label="Remove capacity filter"
                    onClick={() => setCapacityFilter("All")}
                    className="rounded p-0.5 hover:bg-warning/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 rounded px-1 py-1 font-medium text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>
      {/* Content Area: Empty State / Grid Cards / Dense Table */}
      {filteredBatches.length === 0 ? (
        <EmptyState
          icon={<Layers />}
          title={
            hasFilters ? "No batches found" : "Your next cohort starts here"
          }
          description={
            hasFilters
              ? "Try a different search or clear your filters to see all batches."
              : "Create a batch to bring a course, an instructor and your learners together."
          }
          action={
            hasFilters ? (
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button type="button" onClick={onOpenCreateBatch}>
                <Plus className="h-4 w-4" /> Create your first batch
              </Button>
            )
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredBatches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              theme={resolveBatchTheme(batch, courses)}
              onOpen={() => openWorkspace(batch, "roster")}
              onEdit={() => setEditingBatch(batch)}
              onDuplicate={() => handleDuplicate(batch)}
              onToggleArchive={() => handleToggleArchive(batch)}
              onDelete={() => setDeletingBatch(batch)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div
            className="relative overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Scrollable batch list"
          >
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <caption className="sr-only">
                Batches, instructors, schedules and enrollment
              </caption>
              <thead>
                <tr className="border-b border-border bg-surface-2/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 pl-4 pr-3">Batch / course</th>
                  <th className="hidden px-3 py-3 md:table-cell">Instructor</th>
                  <th className="hidden px-3 py-3 lg:table-cell">Schedule</th>
                  <th className="px-3 py-3">Seats</th>
                  <th className="hidden px-3 py-3 sm:table-cell">Delivery</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="py-3 pl-2 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch) => (
                  <BatchRow
                    key={batch.id}
                    batch={batch}
                    theme={resolveBatchTheme(batch, courses)}
                    onOpen={() => openWorkspace(batch, "roster")}
                    onEdit={() => setEditingBatch(batch)}
                    onDuplicate={() => handleDuplicate(batch)}
                    onToggleArchive={() => handleToggleArchive(batch)}
                    onDelete={() => setDeletingBatch(batch)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Full-screen batch workspace, matching the admin course workspace. */}
      <BatchWorkspaceModal
        open={!!workspaceBatch}
        onOpenChange={(open) => !open && setWorkspaceBatchId(null)}
        batch={workspaceBatch}
        initialTab={workspaceTab}
        store={store}
        instructors={instructorList}
        onDuplicate={handleDuplicate}
        onRequestDelete={(target) => setDeletingBatch(target)}
        onToast={onToast}
      />
      {/* Quick-Edit Modal from "..." menu */}
      <BatchFormDialog
        open={!!editingBatch}
        onOpenChange={(open) => !open && setEditingBatch(null)}
        mode="edit"
        batch={editingBatch}
        courses={courses}
        instructors={instructorList}
        onSubmit={handleSaveQuickEdit}
      />
      {/* Delete Batch Confirmation Dialog */}
      <Dialog
        open={!!deletingBatch}
        onOpenChange={(open) => !busyDelete && !open && setDeletingBatch(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-danger/20 bg-danger/10 text-danger">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Delete this batch?</DialogTitle>
                <DialogDescription>
                  This permanently deletes this batch and clears its student
                  roster assignments.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {deletingBatch && (
            <div className="space-y-1 rounded-xl border border-border bg-surface-2 p-3 text-xs">
              <div className="text-sm font-semibold text-foreground">
                {deletingBatch.name}
              </div>
              <div className="text-muted-foreground">
                {deletingBatch.courseTitle} · {deletingBatch.enrolledSeats}{" "}
                enrolled student(s)
              </div>
              <p className="pt-1 text-muted-foreground">
                Student course enrollments and completed assignments remain
                preserved in the course catalog.
              </p>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={busyDelete}
              onClick={() => setDeletingBatch(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busyDelete}
              onClick={handleConfirmDelete}
            >
              {busyDelete ? "Deleting..." : "Delete batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
