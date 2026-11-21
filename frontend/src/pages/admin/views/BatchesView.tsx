import { useCallback, useDeferredValue, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAdminBase } from "./shared/useAdminBase"
import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, ArrowRight, Clock3, Gauge, Layers, LayoutGrid, List, Plus, Search, Users, X } from "lucide-react"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import { StatCard } from "@/components/ui/StatCard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { CustomSelect } from "@/components/ui/select"
import { SegmentedControl } from "@/components/ui/tabs"
import type { AdminBatch, useAdminStore } from "@/data/adminStore"
import { cn } from "@/lib/utils"
import BatchCard from "./batches/BatchCard"
import BatchFormDialog, { type BatchFormValues } from "./batches/BatchFormDialog"
import BatchRow from "./batches/BatchRow"
import { batchInstructorNames, resolveBatchTheme, seatUtilization } from "./batches/batchTheme"
import ConfirmDialog, { type ConfirmRequest } from "./shared/ConfirmDialog"

interface BatchesViewProps {
  store: ReturnType<typeof useAdminStore>
  onOpenCreateBatch: () => void
  onToast?: (msg: string) => void
}

type StatusFilter = "All" | AdminBatch["status"]
type SortKey = "priority" | "start" | "enrolled" | "utilization" | "name"
type ViewMode = "grid" | "list"
type CapacityFilter = "All" | "near-full" | "waitlist"

const STATUS_LABEL: Record<StatusFilter, string> = { All: "All", Active: "Running", Upcoming: "Upcoming", Completed: "Completed", Archived: "Archived" }

const GROUP_META: Record<AdminBatch["status"], { title: string; description: string; tone: string }> = {
  Active: { title: "Running now", description: "Classes in progress. Keep an eye on attendance and seats.", tone: "bg-success" },
  Upcoming: { title: "Upcoming", description: "Fill seats, confirm the instructor and schedule sessions.", tone: "bg-warning" },
  Completed: { title: "Completed", description: "Finished cohorts. Review outcomes and certificates.", tone: "bg-info" },
  Archived: { title: "Archived", description: "Kept for reference.", tone: "bg-subtle-foreground" },
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "priority", label: "Running first" },
  { value: "start", label: "Start date" },
  { value: "enrolled", label: "Most learners" },
  { value: "utilization", label: "Fullest first" },
  { value: "name", label: "Name A–Z" },
]

const ALL_COURSES = "__all__"

/** Batch list: headline numbers, attention banner, filters and grouped cards or table. Each batch opens its own page. */
export default function BatchesView({ store, onOpenCreateBatch, onToast }: BatchesViewProps) {
  const navigate = useNavigate()
  const base = useAdminBase()
  const { batches, courses, teachers, updateBatch, duplicateBatch, deleteBatch } = store

  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilter>("All")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All")
  const [courseFilter, setCourseFilter] = useState(ALL_COURSES)
  const [sortBy, setSortBy] = useState<SortKey>("priority")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [editingBatch, setEditingBatch] = useState<AdminBatch | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const instructorList = useMemo(() => batchInstructorNames(teachers), [teachers])

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { All: batches.length, Active: 0, Upcoming: 0, Completed: 0, Archived: 0 }
    for (const b of batches) counts[b.status] = (counts[b.status] ?? 0) + 1
    return counts
  }, [batches])

  const metrics = useMemo(() => {
    const enrolled = batches.reduce((sum, b) => sum + b.enrolledSeats, 0)
    const open = batches.filter((b) => b.status === "Active" || b.status === "Upcoming")
    const waitlisted = open.reduce((sum, b) => sum + (b.waitlistedSeats ?? 0), 0)
    const capTotal = open.reduce((sum, b) => sum + b.maxSeats, 0)
    const capFilled = open.reduce((sum, b) => sum + b.enrolledSeats, 0)
    const utilization = capTotal > 0 ? Math.round((capFilled / capTotal) * 100) : 0
    const nearFull = open.filter((b) => b.maxSeats > 0 && b.enrolledSeats / b.maxSeats >= 0.85).length
    return { enrolled, waitlisted, utilization, nearFull }
  }, [batches])

  // Only topics that actually have batches, so the filter never shows dead options.
  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const b of batches) if (b.courseId && !seen.has(b.courseId)) seen.set(b.courseId, b.courseTitle)
    return [{ value: ALL_COURSES, label: "All topics" }, ...Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))]
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
      const matchesCourse = courseFilter === ALL_COURSES || b.courseId === courseFilter
      const isOpen = b.status === "Active" || b.status === "Upcoming"
      const matchesCapacity =
        capacityFilter === "All" ||
        (isOpen && (capacityFilter === "waitlist" ? b.waitlistedSeats > 0 : b.maxSeats > 0 && b.enrolledSeats / b.maxSeats >= 0.85))
      return matchesQuery && matchesStatus && matchesCourse && matchesCapacity
    })
    return [...list].sort((a, b) => {
      if (sortBy === "priority") {
        const order = { Active: 0, Upcoming: 1, Completed: 2, Archived: 3 }
        return order[a.status] - order[b.status] || (a.startDate || "9999").localeCompare(b.startDate || "9999")
      }
      if (sortBy === "enrolled") return b.enrolledSeats - a.enrolledSeats
      if (sortBy === "utilization") return seatUtilization(b.enrolledSeats, b.maxSeats) - seatUtilization(a.enrolledSeats, a.maxSeats)
      if (sortBy === "name") return a.name.localeCompare(b.name)
      return (a.startDate || "").localeCompare(b.startDate || "")
    })
  }, [batches, deferredSearch, statusFilter, courseFilter, sortBy, capacityFilter])

  const hasFilters = Boolean(search.trim()) || statusFilter !== "All" || capacityFilter !== "All" || courseFilter !== ALL_COURSES

  const groups = useMemo(() => {
    if (sortBy === "priority" && statusFilter === "All") {
      return (["Active", "Upcoming", "Completed", "Archived"] as const)
        .map((status) => ({ key: status, ...GROUP_META[status], batches: filteredBatches.filter((b) => b.status === status) }))
        .filter((group) => group.batches.length > 0)
    }
    return [
      {
        key: "results",
        ...(statusFilter === "All"
          ? { title: hasFilters ? "Matching batches" : "All batches", description: "Open a batch to manage learners, sessions and settings.", tone: "bg-primary" }
          : GROUP_META[statusFilter]),
        batches: filteredBatches,
      },
    ]
  }, [filteredBatches, statusFilter, sortBy, hasFilters])

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("All")
    setCapacityFilter("All")
    setCourseFilter(ALL_COURSES)
  }

  const openBatch = useCallback((batch: AdminBatch) => navigate(`${base}/batches/${batch.id}`), [navigate, base])

  const handleSaveQuickEdit = async (values: BatchFormValues) => {
    if (!editingBatch) return
    await updateBatch(editingBatch.id, values)
    onToast?.(`Updated "${values.name}"`)
    setEditingBatch(null)
  }

  const handleDuplicate = async (batch: AdminBatch) => {
    try {
      const copy = await duplicateBatch(batch.id)
      onToast?.(`Created a copy: "${copy?.name ?? batch.name}"`)
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Could not duplicate the batch.")
    }
  }

  const handleToggleArchive = async (batch: AdminBatch) => {
    const nextStatus: AdminBatch["status"] = batch.status === "Archived" ? "Upcoming" : "Archived"
    try {
      await updateBatch(batch.id, { status: nextStatus })
      onToast?.(nextStatus === "Archived" ? `Archived "${batch.name}"` : `Restored "${batch.name}" to Upcoming`)
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Could not update the batch.")
    }
  }

  const askDelete = (batch: AdminBatch) =>
    setConfirm({
      title: `Delete "${batch.name}"?`,
      description: (
        <>
          This permanently deletes the batch and its roster ({batch.enrolledSeats} {batch.enrolledSeats === 1 ? "learner" : "learners"}). Course
          enrollments and submitted work stay in the course.
        </>
      ),
      confirmLabel: "Delete batch",
      onConfirm: async () => {
        try {
          await deleteBatch(batch.id)
          onToast?.(`Deleted "${batch.name}"`)
        } catch (err) {
          onToast?.(err instanceof Error ? err.message : "Could not delete the batch.")
          return false
        }
      },
    })

  const itemProps = (batch: AdminBatch) => ({
    batch,
    theme: resolveBatchTheme(batch, courses),
    onOpen: () => openBatch(batch),
    onEdit: () => setEditingBatch(batch),
    onDuplicate: () => void handleDuplicate(batch),
    onToggleArchive: () => void handleToggleArchive(batch),
    onDelete: () => askDelete(batch),
  })

  return (
    <Stagger className="flex flex-col gap-5" stagger={0.05}>
      <StaggerItem>
        <PageHeader
          className="mb-0"
          eyebrow="Cohorts"
          title="Batches"
          description="Run live cohorts: fill seats, schedule classes and track every learner."
          actions={
            <Button onClick={onOpenCreateBatch} leftIcon={<Plus aria-hidden="true" />}>
              New batch
            </Button>
          }
        />
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            icon={Layers}
            title="Running now"
            value={statusCounts.Active}
            trend={`${statusCounts.Upcoming} upcoming · ${batches.length} total`}
            tone="primary"
            isActive={statusFilter === "Active"}
            onClick={() => setStatusFilter((prev) => (prev === "Active" ? "All" : "Active"))}
          />
          <StatCard icon={Users} title="Learners" value={metrics.enrolled.toLocaleString("en-IN")} trend="Across all batches" tone="info" />
          <StatCard
            icon={Gauge}
            title="Seats filled"
            value={`${metrics.utilization}%`}
            trend="Running and upcoming"
            tone="success"
            isActive={capacityFilter === "near-full"}
            onClick={() => setCapacityFilter((prev) => (prev === "near-full" ? "All" : "near-full"))}
          />
          <StatCard
            icon={Clock3}
            title="Waitlist"
            value={metrics.waitlisted}
            trend={metrics.waitlisted ? "Learners waiting for a seat" : "Nobody waiting"}
            tone="warning"
            isActive={capacityFilter === "waitlist"}
            onClick={() => setCapacityFilter((prev) => (prev === "waitlist" ? "All" : "waitlist"))}
          />
        </div>
      </StaggerItem>

      {(metrics.nearFull > 0 || metrics.waitlisted > 0) && capacityFilter === "All" && (
        <StaggerItem>
          <div className="flex flex-col gap-3 rounded-lg border border-warning/25 bg-warning-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{metrics.waitlisted ? "Learners are waiting for seats" : "Some batches are almost full"}</p>
                <p className="mt-0.5 text-caption leading-relaxed text-muted-foreground">
                  {[
                    metrics.nearFull > 0 && `${metrics.nearFull} ${metrics.nearFull === 1 ? "batch is" : "batches are"} 85% full or more`,
                    metrics.waitlisted > 0 && `${metrics.waitlisted} ${metrics.waitlisted === 1 ? "learner is" : "learners are"} on a waitlist`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              rightIcon={<ArrowRight aria-hidden="true" />}
              className="self-start text-warning hover:bg-warning/10 hover:text-warning sm:self-auto"
              onClick={() => {
                clearFilters()
                setCapacityFilter(metrics.waitlisted ? "waitlist" : "near-full")
              }}
            >
              {metrics.waitlisted ? "Show waitlists" : "Show full batches"}
            </Button>
          </div>
        </StaggerItem>
      )}

      <StaggerItem>
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              leading={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
              trailing={
                search ? (
                  <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="text-muted-foreground transition-colors hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null
              }
              aria-label="Search batches"
              placeholder="Search batch, topic or instructor"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              wrapperClassName="lg:max-w-sm lg:flex-1"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:ml-auto">
              <CustomSelect aria-label="Filter by topic" value={courseFilter} onChange={setCourseFilter} options={courseOptions} className="w-full sm:w-52" />
              <div className="flex items-center gap-2">
                <CustomSelect aria-label="Sort batches" value={sortBy} onChange={(v) => setSortBy(v as SortKey)} options={SORT_OPTIONS} className="min-w-0 flex-1 sm:w-40 sm:flex-none" />
                <div className="hidden sm:block">
                  <SegmentedControl
                    size="sm"
                    aria-label="Layout"
                    value={viewMode}
                    onChange={setViewMode}
                    options={[
                      { value: "grid" as ViewMode, label: <LayoutGrid className="h-3.5 w-3.5" aria-label="Grid view" /> },
                      { value: "list" as ViewMode, label: <List className="h-3.5 w-3.5" aria-label="List view" /> },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <div className="no-scrollbar -mx-1 max-w-full overflow-x-auto px-1">
              <SegmentedControl
                size="sm"
                aria-label="Filter by status"
                className="[&_button]:whitespace-nowrap"
                value={statusFilter}
                onChange={setStatusFilter}
                options={(["All", "Active", "Upcoming", "Completed", "Archived"] as StatusFilter[]).map((s) => ({ value: s, label: `${STATUS_LABEL[s]} ${statusCounts[s] ?? 0}` }))}
              />
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
              <span>
                Showing <span className="font-semibold tabular-nums text-foreground">{filteredBatches.length}</span> of {batches.length}
              </span>
              {capacityFilter !== "All" && (
                <span className="flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 font-medium text-warning">
                  {capacityFilter === "waitlist" ? "Has a waitlist" : "85%+ full"}
                  <button type="button" aria-label="Remove seat filter" onClick={() => setCapacityFilter("All")} className="rounded-full p-0.5 hover:bg-warning/10">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {hasFilters && (
                <Button size="sm" variant="ghost" onClick={clearFilters} leftIcon={<X aria-hidden="true" />} className="h-7 text-xs">
                  Clear
                </Button>
              )}
            </div>
          </div>
        </Card>
      </StaggerItem>

      <StaggerItem>
        {filteredBatches.length === 0 ? (
          <EmptyState
            icon={<Layers aria-hidden="true" />}
            title={hasFilters ? "No matching batches" : "Your first cohort starts here"}
            description={hasFilters ? "Try another search or clear the filters." : "A batch is a live cohort with its own price, instructor, schedule and recordings."}
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button onClick={onOpenCreateBatch} leftIcon={<Plus aria-hidden="true" />}>
                  Create a batch
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.key} aria-labelledby={`batch-group-${group.key}`} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", group.tone)} aria-hidden="true" />
                      <h2 id={`batch-group-${group.key}`} className="text-sm font-semibold text-foreground">
                        {group.title}
                      </h2>
                      <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">{group.batches.length}</span>
                    </div>
                    <p className="mt-1 text-caption text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="h-px flex-1 bg-border" aria-hidden="true" />
                </div>
                {viewMode === "grid" ? (
                  <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {group.batches.map((batch) => (
                        <BatchCard key={batch.id} {...itemProps(batch)} />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                        <caption className="sr-only">{group.title}: instructors, dates and seats</caption>
                        <thead>
                          <tr className="border-b border-border bg-surface-2/80 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <th className="px-4 py-3">Batch</th>
                            <th className="hidden px-3 py-3 md:table-cell">Instructor</th>
                            <th className="hidden px-3 py-3 lg:table-cell">Dates</th>
                            <th className="px-3 py-3">Seats</th>
                            <th className="hidden px-3 py-3 sm:table-cell">Delivery</th>
                            <th className="px-3 py-3">Stage</th>
                            <th className="py-3 pl-2 pr-4 text-right">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.batches.map((batch) => (
                            <BatchRow key={batch.id} {...itemProps(batch)} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </section>
            ))}
          </div>
        )}
      </StaggerItem>

      <BatchFormDialog
        open={!!editingBatch}
        onOpenChange={(open) => !open && setEditingBatch(null)}
        mode="edit"
        batch={editingBatch}
        courses={courses}
        instructors={instructorList}
        onSubmit={handleSaveQuickEdit}
      />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </Stagger>
  )
}
