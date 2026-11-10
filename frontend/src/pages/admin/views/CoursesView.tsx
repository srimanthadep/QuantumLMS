import { lazy, Suspense, useCallback, useDeferredValue, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  BookOpen,
  ClipboardCheck,
  LayoutGrid,
  List,
  Plus,
  Search,
  SearchX,
  Star,
  Trash2,
  Users,
  Video,
  Wallet,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CustomSelect } from "@/components/ui/select"
import { SegmentedControl } from "@/components/ui/tabs"
import EmptyState from "@/components/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { useAdminStore, AdminCourse } from "@/data/adminStore"
import CourseCard from "./courses/CourseCard"
import CourseRow from "./courses/CourseRow"
import CourseFormDialog, { type CourseFormValues } from "./courses/CourseFormDialog"
import { CATEGORIES, compactINR, SORT_OPTIONS, type SortKey } from "./courses/courseTheme"

const VideoCourseUploadModal = lazy(() => import("./VideoCourseUploadModal"))
const CourseEditorModal = lazy(() => import("./CourseEditorModal"))

interface CoursesViewProps {
  store: ReturnType<typeof useAdminStore>
  onToast: (msg: string) => void
}

type StatusFilter = "All" | AdminCourse["status"]
type ViewMode = "grid" | "list"

const DEFAULT_INSTRUCTORS = ["Srimanth", "Dr. Vikram Sen", "Meera Nair", "Ananya Roy"]

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

/** Admin course catalog: stats, filters, grid or list of courses; opens a full-screen workspace per course. */
export default function CoursesView({ store, onToast }: CoursesViewProps) {
  const navigate = useNavigate()
  const { courses, addCourse, updateCourse, toggleCourseStatus, deleteCourse } = store

  // Filters
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState<StatusFilter>("All")
  const [category, setCategory] = useState("All")
  const [sort, setSort] = useState<SortKey>("default")
  const [view, setView] = useState<ViewMode>("grid")

  // Dialog / workspace state
  const [activeCourse, setActiveCourse] = useState<AdminCourse | null>(null)
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<AdminCourse | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isVideoUploadOpen, setIsVideoUploadOpen] = useState(false)
  const [videoUploadTarget, setVideoUploadTarget] = useState<{ courseId?: string; moduleId?: string } | null>(null)

  const instructors = useMemo(() => Array.from(new Set([...DEFAULT_INSTRUCTORS, ...courses.map((c) => c.instructor)])), [courses])

  // Portfolio-level numbers, independent of the active filters.
  const summary = useMemo(() => {
    const published = courses.filter((c) => c.status === "Published").length
    const enrolled = courses.reduce((sum, c) => sum + c.enrolledStudents, 0)
    const capacity = courses.reduce((sum, c) => sum + c.capacity, 0)
    const revenue = courses.reduce((sum, c) => sum + c.revenue, 0)
    const rated = courses.filter((c) => c.rating > 0)
    const rating = rated.length ? rated.reduce((sum, c) => sum + c.rating, 0) / rated.length : 0
    return { published, enrolled, capacity, revenue, rating }
  }, [courses])

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { All: courses.length, Published: 0, Draft: 0, Archived: 0 }
    for (const c of courses) counts[c.status] += 1
    return counts
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
      case "enrollment":
        return [...list].sort((a, b) => b.enrolledStudents - a.enrolledStudents)
      case "revenue":
        return [...list].sort((a, b) => b.revenue - a.revenue)
      case "rating":
        return [...list].sort((a, b) => b.rating - a.rating)
      case "price":
        return [...list].sort((a, b) => b.price - a.price)
      case "title":
        return [...list].sort((a, b) => a.title.localeCompare(b.title))
      default:
        return list
    }
  }, [courses, deferredSearch, status, category, sort])

  const hasFilters = search !== "" || status !== "All" || category !== "All"
  const clearFilters = () => {
    setSearch("")
    setStatus("All")
    setCategory("All")
  }

  // Stable handlers so memoised cards/rows skip re-rendering while typing in the search box.
  const openCourse = useCallback((c: AdminCourse) => setActiveCourse(c), [])
  const editCourse = useCallback((c: AdminCourse) => setEditingCourse(c), [])
  const askDelete = useCallback((c: AdminCourse) => setDeletingCourse(c), [])
  const toggleStatus = useCallback(
    (c: AdminCourse) => {
      toggleCourseStatus(c.id)
      onToast(`"${c.title}" ${c.status === "Published" ? "archived" : "published"}`)
    },
    [toggleCourseStatus, onToast],
  )

  const handleCreate = (v: CourseFormValues) => {
    const slug = v.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    addCourse({
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

  const handleSaveEdit = (v: CourseFormValues) => {
    if (!editingCourse) return
    updateCourse(editingCourse.id, v)
    onToast(`Updated "${v.title}"`)
    setEditingCourse(null)
  }

  const handleDelete = () => {
    if (!deletingCourse) return
    deleteCourse(deletingCourse.id)
    onToast(`Deleted course "${deletingCourse.title}"`)
    setDeletingCourse(null)
  }

  const cardProps = { onOpen: openCourse, onEdit: editCourse, onToggleStatus: toggleStatus, onDelete: askDelete }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your catalog at a glance. Click a course to open its full workspace.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/approvals")} leftIcon={<ClipboardCheck className="text-warning" aria-hidden="true" />}>
            Approvals
          </Button>
          <Button variant="outline" onClick={() => setIsVideoUploadOpen(true)} leftIcon={<Video aria-hidden="true" />}>
            Upload video course
          </Button>
          <Button onClick={() => setIsAddOpen(true)} leftIcon={<Plus aria-hidden="true" />}>
            New course
          </Button>
        </div>
      </div>

      {/* Portfolio stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={BookOpen}
          label="Courses"
          value={String(courses.length)}
          hint={`${summary.published} published`}
          tone="bg-primary-soft text-primary-text ring-primary-border"
        />
        <Stat
          icon={Users}
          label="Learners enrolled"
          value={summary.enrolled.toLocaleString("en-IN")}
          hint={`${summary.capacity ? Math.round((summary.enrolled / summary.capacity) * 100) : 0}% of ${summary.capacity.toLocaleString("en-IN")} seats`}
          tone="bg-info-soft text-info ring-info/20"
        />
        <Stat
          icon={Wallet}
          label="Total revenue"
          value={compactINR(summary.revenue)}
          hint="Across all courses"
          tone="bg-success-soft text-success ring-success/20"
        />
        <Stat
          icon={Star}
          label="Average rating"
          value={summary.rating ? summary.rating.toFixed(1) : "–"}
          hint="Learner feedback"
          tone="bg-warning-soft text-warning ring-warning/20"
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
              onChange={setStatus}
              options={(["All", "Published", "Draft", "Archived"] as StatusFilter[]).map((s) => ({
                value: s,
                label: `${s} · ${statusCounts[s]}`,
              }))}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              leading={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, instructor or category…"
              aria-label="Search courses"
              wrapperClassName="sm:w-72"
            />
            <CustomSelect
              className="sm:w-44"
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              options={SORT_OPTIONS}
            />
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

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          {["All", ...CATEGORIES].map((cat) => (
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
          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters} leftIcon={<X aria-hidden="true" />} className="ml-auto h-7 text-xs">
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing <span className="font-semibold text-foreground">{visible.length}</span> of {courses.length} courses
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon={courses.length === 0 ? <BookOpen aria-hidden="true" /> : <SearchX aria-hidden="true" />}
          title={courses.length === 0 ? "No courses yet" : "No courses match these filters"}
          description={courses.length === 0 ? "Create your first course to start building a catalog." : "Try a different search term or clear the filters."}
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
            <CourseCard key={c.id} course={c} {...cardProps} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Instructor</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="w-12 px-2 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((c) => (
                  <CourseRow key={c.id} course={c} {...cardProps} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / quick-edit */}
      <CourseFormDialog open={isAddOpen} onOpenChange={setIsAddOpen} mode="create" instructors={instructors} onSubmit={handleCreate} />
      <CourseFormDialog
        open={!!editingCourse}
        onOpenChange={(o) => !o && setEditingCourse(null)}
        mode="edit"
        course={editingCourse}
        instructors={instructors}
        onSubmit={handleSaveEdit}
      />

      {/* Full-screen course workspace */}
      {activeCourse && (
        <Suspense fallback={null}>
          <CourseEditorModal
            course={activeCourse}
            open={!!activeCourse}
            onOpenChange={(o) => !o && setActiveCourse(null)}
            onCourseUpdated={(updated) => {
              updateCourse(updated.id, updated)
              setActiveCourse(updated)
            }}
            onOpenVideoUpload={(courseId, moduleId) => {
              setVideoUploadTarget({ courseId, moduleId })
              setIsVideoUploadOpen(true)
            }}
            onToast={onToast}
          />
        </Suspense>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deletingCourse} onOpenChange={(o) => !o && setDeletingCourse(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-danger/20 bg-danger/10 text-danger">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <DialogTitle>Delete this course?</DialogTitle>
                <DialogDescription>This removes its curriculum, modules and lessons. It can't be undone.</DialogDescription>
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
            <Button type="button" variant="outline" onClick={() => setDeletingCourse(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete}>
              Delete course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video course upload & audio extraction */}
      {isVideoUploadOpen && (
        <Suspense fallback={null}>
          <VideoCourseUploadModal
            open={isVideoUploadOpen}
            onOpenChange={(o) => {
              setIsVideoUploadOpen(o)
              if (!o) setVideoUploadTarget(null)
            }}
            initialCourseId={videoUploadTarget?.courseId}
            initialModuleId={videoUploadTarget?.moduleId}
            existingCourses={courses}
            onCourseCreated={(newCourse) => {
              if (courses.some((c) => c.id === newCourse.id)) {
                updateCourse(newCourse.id, newCourse)
              } else {
                addCourse(newCourse)
              }
            }}
            onToast={onToast}
          />
        </Suspense>
      )}
    </div>
  )
}
