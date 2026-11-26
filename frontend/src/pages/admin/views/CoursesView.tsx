import { lazy, Suspense, useCallback, useDeferredValue, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAdminBase } from "./shared/useAdminBase"
import { BookOpen, FilePenLine, LayoutGrid, List, ListChecks, Plus, Search, SearchX, Trash2, Users, Video, Wallet, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { CustomSelect } from "@/components/ui/select"
import { StatCard } from "@/components/ui/StatCard"
import { SegmentedControl } from "@/components/ui/tabs"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import EmptyState from "@/components/ui/empty-state"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { useAdminStore, AdminCourse } from "@/data/adminStore"
import BulkDeleteDialog, { type BulkDeleteRequest } from "./shared/BulkDeleteDialog"
import { BulkActionBar, bulkResultMessage, useBulkSelect } from "./shared/bulkSelect"
import CourseCard from "./courses/CourseCard"
import CourseRow from "./courses/CourseRow"
import CourseFormDialog, { type CourseFormValues } from "./courses/CourseFormDialog"
import { batchInstructorNames } from "./batches/batchTheme"
import { CATEGORIES, compactINR, SORT_OPTIONS, type SortKey } from "./courses/courseTheme"

const VideoCourseUploadModal = lazy(() => import("./VideoCourseUploadModal"))

interface CoursesViewProps {
  store: ReturnType<typeof useAdminStore>
  onToast: (msg: string) => void
}

type StatusFilter = "All" | AdminCourse["status"]
type ViewMode = "grid" | "list"

const STATUS_FILTERS: StatusFilter[] = ["All", "Published", "Draft", "Archived"]

/** Admin course catalog: headline numbers, filters, and a grid or table of courses. Each course opens its own page. */
export default function CoursesView({ store, onToast }: CoursesViewProps) {
  const navigate = useNavigate()
  const base = useAdminBase()
  const { courses, teachers, addCourse, updateCourse, toggleCourseStatus, deleteCourse, refreshCourses } = store

  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState<StatusFilter>("All")
  const [category, setCategory] = useState("All")
  const [sort, setSort] = useState<SortKey>("default")
  const [view, setView] = useState<ViewMode>("grid")

  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<AdminCourse | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isVideoUploadOpen, setIsVideoUploadOpen] = useState(false)
  const bulk = useBulkSelect()
  const [bulkRequest, setBulkRequest] = useState<BulkDeleteRequest | null>(null)

  // The real teachers, plus anyone already named on a course.
  const instructors = useMemo(
    () => Array.from(new Set([...batchInstructorNames(teachers), ...courses.map((c) => c.instructor.trim())].filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [teachers, courses],
  )

  // Catalog-wide numbers, independent of the active filters.
  const summary = useMemo(() => {
    let published = 0
    let drafts = 0
    let enrolled = 0
    let free = 0
    let revenue = 0
    for (const c of courses) {
      if (c.status === "Published") published += 1
      if (c.status === "Draft") drafts += 1
      enrolled += c.enrolledStudents
      if (c.price <= 0) free += 1
      revenue += c.revenue
    }
    return { published, drafts, enrolled, free, paid: courses.length - free, revenue }
  }, [courses])

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { All: courses.length, Published: 0, Draft: 0, Archived: 0 }
    for (const c of courses) counts[c.status] = (counts[c.status] ?? 0) + 1
    return counts
  }, [courses])

  // Show every category that exists, even ones outside the default list.
  const categories = useMemo(() => {
    const extra = courses.map((c) => c.category).filter((c) => !(CATEGORIES as readonly string[]).includes(c))
    return [...CATEGORIES, ...Array.from(new Set(extra))]
  }, [courses])

  const visible = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    const list = courses.filter(
      (c) =>
        (status === "All" || c.status === status) &&
        (category === "All" || c.category === category) &&
        (!q || c.title.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)),
    )
    switch (sort) {
      case "updated":
        return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      case "enrollment":
        return [...list].sort((a, b) => b.enrolledStudents - a.enrolledStudents)
      case "revenue":
        return [...list].sort((a, b) => b.revenue - a.revenue)
      case "price":
        return [...list].sort((a, b) => b.price - a.price)
      case "title":
        return [...list].sort((a, b) => a.title.localeCompare(b.title))
      default:
        return list
    }
  }, [courses, deferredSearch, status, category, sort])

  // Only courses that are on screen count. A ticked course hidden by a filter is never deleted by accident.
  const chosen = useMemo(() => visible.filter((c) => bulk.selected.has(c.id)), [visible, bulk.selected])

  const hasFilters = search !== "" || status !== "All" || category !== "All"
  const clearFilters = () => {
    setSearch("")
    setStatus("All")
    setCategory("All")
  }

  // Stable handlers so memoised cards and rows skip re-rendering while typing in the search box.
  const openCourse = useCallback((c: AdminCourse) => navigate(`${base}/courses/${c.id}`), [navigate, base])
  const editCourse = useCallback((c: AdminCourse) => setEditingCourse(c), [])
  const askDelete = useCallback((c: AdminCourse) => setDeletingCourse(c), [])
  const { toggle: toggleTick } = bulk
  const toggleSelect = useCallback((c: AdminCourse) => toggleTick(c.id), [toggleTick])
  const toggleStatus = useCallback(
    async (c: AdminCourse) => {
      try {
        await toggleCourseStatus(c.id)
        onToast(`"${c.title}" ${c.status === "Published" ? "unpublished" : "published"}`)
      } catch (err) {
        onToast(err instanceof Error ? err.message : "Could not update course status.")
      }
    },
    [toggleCourseStatus, onToast],
  )

  const handleCreate = async (v: CourseFormValues) => {
    const slug = v.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    await addCourse({
      title: v.title,
      slug,
      category: v.category,
      instructor: v.instructor,
      instructorAvatar: v.instructor === "Srimanth" ? "/assets/srimanth.png" : "/assets/teacher-male.png",
      capacity: v.capacity,
      price: v.price,
      status: v.status,
    })
    setIsAddOpen(false)
    onToast(`Created course "${v.title}"`)
  }

  const handleSaveEdit = async (v: CourseFormValues) => {
    if (!editingCourse) return
    await updateCourse(editingCourse.id, v)
    onToast(`Updated "${v.title}"`)
    setEditingCourse(null)
  }

  const handleDelete = async () => {
    if (!deletingCourse) return
    const target = deletingCourse
    setDeleting(true)
    try {
      await deleteCourse(target.id)
      onToast(`Removed "${target.title}" from the catalog`)
      setDeletingCourse(null)
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not remove course.")
    } finally {
      setDeleting(false)
    }
  }

  const askBulkDelete = () => {
    const targets = chosen
    if (!targets.length) return
    setBulkRequest({
      items: targets.map((c) => ({ id: c.id, title: c.title, meta: `${c.category} · ${c.enrolledStudents} ${c.enrolledStudents === 1 ? "learner" : "learners"} · ${c.status}` })),
      noun: { one: "course", many: "courses" },
      verbs: { do: "Remove", doing: "Removing", done: "removed" },
      summary: `Enrollment closes and ${targets.length === 1 ? "the course leaves" : "these courses leave"} the catalog. Learners keep their access, content and progress.`,
      confirmLabel: `Remove ${targets.length} ${targets.length === 1 ? "course" : "courses"}`,
      remove: deleteCourse,
      onFinished: ({ done, failed }) => {
        onToast(bulkResultMessage("Removed", { one: "course", many: "courses" }, done.length, failed))
        if (failed.length) bulk.keepOnly(failed.map((f) => f.id))
        else bulk.stop()
      },
    })
  }

  const cardProps = { onOpen: openCourse, onEdit: editCourse, onToggleStatus: toggleStatus, onDelete: askDelete }
  const selectProps = (c: AdminCourse) => ({ selecting: bulk.selecting, selected: bulk.selected.has(c.id), onToggleSelect: toggleSelect })

  return (
    <Stagger className="flex flex-col gap-5" stagger={0.05}>
      <StaggerItem>
        <PageHeader
          className="mb-0"
          eyebrow="Catalog"
          title="Courses"
          description="Build curriculum, set pricing and track how each course is selling."
          actions={
            <>
              <Button variant="outline" onClick={() => setIsVideoUploadOpen(true)} leftIcon={<Video aria-hidden="true" />}>
                Upload video course
              </Button>
              <Button onClick={() => setIsAddOpen(true)} leftIcon={<Plus aria-hidden="true" />}>
                New course
              </Button>
            </>
          }
        />
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            icon={BookOpen}
            title="Live courses"
            value={summary.published}
            trend={`${courses.length} in catalog`}
            tone="primary"
            isActive={status === "Published"}
            onClick={() => setStatus((prev) => (prev === "Published" ? "All" : "Published"))}
          />
          <StatCard icon={Users} title="Learners" value={summary.enrolled.toLocaleString("en-IN")} trend={`${summary.free} free · ${summary.paid} paid courses`} tone="info" />
          <StatCard icon={Wallet} title="Net collected" value={compactINR(summary.revenue)} trend="Payments, less refunds" tone="success" />
          <StatCard
            icon={FilePenLine}
            title="Drafts"
            value={summary.drafts}
            trend={summary.drafts ? "Not visible to learners" : "Nothing in progress"}
            tone="warning"
            isActive={status === "Draft"}
            onClick={() => setStatus((prev) => (prev === "Draft" ? "All" : "Draft"))}
          />
        </div>
      </StaggerItem>

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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, instructor or category"
              aria-label="Search courses"
              wrapperClassName="lg:max-w-sm lg:flex-1"
            />
            <div className="no-scrollbar -mx-1 overflow-x-auto px-1 lg:ml-auto">
              <SegmentedControl
                size="sm"
                className="[&_button]:whitespace-nowrap"
                aria-label="Filter by status"
                value={status}
                onChange={setStatus}
                options={STATUS_FILTERS.map((s) => ({ value: s, label: `${s} ${statusCounts[s] ?? 0}` }))}
              />
            </div>
            <div className="flex items-center gap-2">
              {courses.length > 0 && (
                <Button
                  variant={bulk.selecting ? "secondary" : "outline"}
                  aria-pressed={bulk.selecting}
                  onClick={bulk.selecting ? bulk.stop : bulk.start}
                  leftIcon={<ListChecks aria-hidden="true" />}
                >
                  {bulk.selecting ? "Cancel" : "Select"}
                </Button>
              )}
              <CustomSelect className="min-w-0 flex-1 sm:w-48 sm:flex-none" value={sort} onChange={(v) => setSort(v as SortKey)} options={SORT_OPTIONS} />
              <div className="hidden sm:block">
                <SegmentedControl
                  size="sm"
                  aria-label="Layout"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "grid" as ViewMode, label: <LayoutGrid className="h-3.5 w-3.5" aria-label="Grid view" /> },
                    { value: "list" as ViewMode, label: <List className="h-3.5 w-3.5" aria-label="List view" /> },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by category">
              {["All", ...categories].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={category === cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    category === cat
                      ? "border-primary-border bg-primary-soft text-primary-text"
                      : "border-transparent bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground",
                  )}
                >
                  {cat === "All" ? "All categories" : cat}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
              <span>
                Showing <span className="font-semibold tabular-nums text-foreground">{visible.length}</span> of {courses.length}
              </span>
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
        {visible.length === 0 ? (
          <EmptyState
            icon={courses.length === 0 ? <BookOpen aria-hidden="true" /> : <SearchX aria-hidden="true" />}
            title={courses.length === 0 ? "No courses yet" : "No courses match these filters"}
            description={courses.length === 0 ? "Create your first course, then add chapters, lessons and a batch." : "Try a different search term or clear the filters."}
            action={
              courses.length === 0 ? (
                <Button onClick={() => setIsAddOpen(true)} leftIcon={<Plus aria-hidden="true" />}>
                  New course
                </Button>
              ) : (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((c) => (
              <CourseCard key={c.id} course={c} {...cardProps} {...selectProps(c)} />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-border bg-surface-2/80 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {bulk.selecting && (
                      <th className="w-10 pl-4 pr-0">
                        <Checkbox
                          aria-label="Select all courses"
                          checked={chosen.length === visible.length ? true : chosen.length > 0 ? "indeterminate" : false}
                          onCheckedChange={(on) => bulk.setMany(visible.map((c) => c.id), on)}
                        />
                      </th>
                    )}
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Instructor</th>
                    <th className="px-4 py-3">Content</th>
                    <th className="px-4 py-3">Access</th>
                    <th className="px-4 py-3">Learners</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Net collected</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="w-12 px-2 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((c) => (
                    <CourseRow key={c.id} course={c} {...cardProps} {...selectProps(c)} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </StaggerItem>

      <CourseFormDialog open={isAddOpen} onOpenChange={setIsAddOpen} mode="create" instructors={instructors} categories={categories} onSubmit={handleCreate} />
      <CourseFormDialog
        open={!!editingCourse}
        onOpenChange={(o) => !o && setEditingCourse(null)}
        mode="edit"
        course={editingCourse}
        instructors={instructors}
        categories={categories}
        onSubmit={handleSaveEdit}
      />

      <Dialog open={!!deletingCourse} onOpenChange={(o) => !o && !deleting && setDeletingCourse(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-danger/20 bg-danger/10 text-danger">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <DialogTitle>Remove this course from the catalog?</DialogTitle>
                <DialogDescription>
                  Enrollment closes and the course leaves this list. Learners keep their access, content and progress.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {deletingCourse && (
            <div className="space-y-1 rounded-lg border border-border bg-surface-2 p-3 text-xs">
              <p className="text-sm font-semibold text-foreground">{deletingCourse.title}</p>
              <p className="text-muted-foreground">
                {deletingCourse.instructor} · {deletingCourse.category} · {deletingCourse.enrolledStudents} learners enrolled
              </p>
            </div>
          )}
          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setDeletingCourse(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete} loading={deleting}>
              Remove course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkDeleteDialog request={bulkRequest} onClose={() => setBulkRequest(null)} />
      {bulk.selecting && (
        <BulkActionBar
          count={chosen.length}
          total={visible.length}
          onSelectAll={() => bulk.setMany(visible.map((c) => c.id), true)}
          onClearSelection={bulk.clear}
          onDelete={askBulkDelete}
          onDone={bulk.stop}
          deleteLabel="Remove"
        />
      )}

      {isVideoUploadOpen && (
        <Suspense fallback={null}>
          <VideoCourseUploadModal
            open={isVideoUploadOpen}
            onOpenChange={setIsVideoUploadOpen}
            existingCourses={courses}
            onCourseCreated={() => {
              refreshCourses().catch(() => {})
            }}
            onSuccess={() => {
              refreshCourses().catch(() => {})
            }}
            onToast={onToast}
          />
        </Suspense>
      )}
    </Stagger>
  )
}
