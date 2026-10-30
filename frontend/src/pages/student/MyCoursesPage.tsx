import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BookOpen, CheckCircle2, Clock, Compass, GraduationCap, Layers, Search, Star, X } from "lucide-react"
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  PageHeader,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import AnimatedNumber from "@/components/motion/AnimatedNumber"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import CourseCover from "@/components/shared/CourseCover"
import CourseCard from "@/components/student/CourseCard"
import type { CourseItem, StudentNavPage } from "./studentTypes"
import { coverCategory } from "./studentUtils"

interface MyCoursesPageProps {
  onNavigate: (page: StudentNavPage, courseId?: string) => void
  onToast: (msg: string) => void
  onSelectCourse: (id: string) => void
  onEnrollCourse: (course: CourseItem) => void
  courses: CourseItem[]
  catalog: CourseItem[]
}

type StatusFilter = "All" | "In Progress" | "Completed"
type SortKey = "recent" | "progress-desc" | "progress-asc" | "title"

const SORTS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently accessed" },
  { value: "progress-desc", label: "Most progress" },
  { value: "progress-asc", label: "Least progress" },
  { value: "title", label: "Title A–Z" },
]

const hours = (d: string) => Number.parseFloat(d) || 0

function matches(c: CourseItem, q: string) {
  if (!q) return true
  const s = q.toLowerCase()
  return [c.title, c.category, c.instructor, c.description].some((v) => v.toLowerCase().includes(s))
}

export default function MyCoursesPage({ onNavigate, onEnrollCourse, courses, catalog }: MyCoursesPageProps) {
  const [tab, setTab] = useState<"enrolled" | "catalog">("enrolled")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("All")
  const [sort, setSort] = useState<SortKey>("recent")
  const [preview, setPreview] = useState<CourseItem | null>(null)

  const stats = useMemo(() => {
    const avg = courses.length ? Math.round(courses.reduce((s, c) => s + c.progress, 0) / courses.length) : 0
    return {
      avg,
      inProgress: courses.filter((c) => c.status === "In Progress").length,
      completed: courses.filter((c) => c.status === "Completed").length,
      modulesDone: courses.reduce((s, c) => s + c.completedModules, 0),
      modulesTotal: courses.reduce((s, c) => s + c.totalModules, 0),
      hours: courses.reduce((s, c) => s + hours(c.duration), 0),
    }
  }, [courses])

  const enrolled = useMemo(() => {
    const list = courses.filter((c) => (status === "All" || c.status === status) && matches(c, query.trim()))
    if (sort === "progress-desc") return [...list].sort((a, b) => b.progress - a.progress)
    if (sort === "progress-asc") return [...list].sort((a, b) => a.progress - b.progress)
    if (sort === "title") return [...list].sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [courses, status, query, sort])

  const explore = useMemo(() => catalog.filter((c) => matches(c, query.trim())), [catalog, query])

  const statusOptions = (["All", "In Progress", "Completed"] as const).map((s) => ({
    value: s as StatusFilter,
    label: `${s === "In Progress" ? "In progress" : s} · ${s === "All" ? courses.length : s === "In Progress" ? stats.inProgress : stats.completed}`,
  }))

  const open = (c: CourseItem) => onNavigate("Course Details", c.id)
  const clearFilters = () => {
    setQuery("")
    setStatus("All")
  }

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="Learning" title="My Courses" description="Pick up where you left off, or explore a new program from the catalog." />

      <Stagger className="flex flex-col gap-5" stagger={0.06}>
        <StaggerItem>
          <Card className="grid grid-cols-2 gap-px overflow-hidden bg-border lg:grid-cols-4">
            <div className="col-span-2 flex items-center gap-4 bg-surface p-5 lg:col-span-1">
              <ProgressRing value={stats.avg} size={64} thickness={6} label="Average course progress" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Overall progress</p>
                <p className="text-caption text-muted-foreground">
                  {stats.modulesDone} of {stats.modulesTotal} modules complete
                </p>
              </div>
            </div>
            {[
              { icon: BookOpen, label: "In progress", value: stats.inProgress, tile: "bg-primary-soft text-primary-text ring-primary-border" },
              { icon: CheckCircle2, label: "Completed", value: stats.completed, tile: "bg-success-soft text-success ring-success/20" },
              { icon: Clock, label: "Hours of content", value: stats.hours, tile: "bg-info-soft text-info ring-info/20" },
            ].map((s, i) => (
              <div key={s.label} className={i === 2 ? "col-span-2 flex items-center gap-3 bg-surface p-5 lg:col-span-1" : "flex items-center gap-3 bg-surface p-5"}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${s.tile}`}>
                  <s.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <AnimatedNumber value={s.value} className="block text-xl font-semibold text-foreground" />
                  <span className="text-caption text-muted-foreground">{s.label}</span>
                </div>
              </div>
            ))}
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <TabsList aria-label="Course lists">
                <TabsTrigger value="enrolled">
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  Enrolled
                  <span className="tabular-nums text-subtle-foreground">{courses.length}</span>
                </TabsTrigger>
                <TabsTrigger value="catalog">
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  Explore
                  <span className="tabular-nums text-subtle-foreground">{catalog.length}</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  aria-label="Search courses"
                  placeholder="Search by title, topic or instructor"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  leading={<Search aria-hidden="true" />}
                  trailing={
                    query ? (
                      <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="flex rounded p-0.5 hover:text-foreground">
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    ) : null
                  }
                  wrapperClassName="sm:w-72"
                />
                {tab === "enrolled" && (
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger aria-label="Sort courses" className="sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORTS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <TabsContent value="enrolled" className="mt-5">
              <SegmentedControl size="sm" aria-label="Filter by status" options={statusOptions} value={status} onChange={setStatus} className="mb-4" />
              {enrolled.length === 0 ? (
                <EmptyState
                  icon={<Search aria-hidden="true" />}
                  title="No courses match"
                  description="Try another search term or clear the filters."
                  action={
                    <Button variant="secondary" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {enrolled.map((c) => (
                      <CourseCard key={c.id} course={c} onOpen={() => open(c)} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="catalog" className="mt-5">
              {explore.length === 0 ? (
                <EmptyState
                  icon={<Compass aria-hidden="true" />}
                  title={catalog.length ? "Nothing matches that search" : "You're enrolled in everything"}
                  description={catalog.length ? "Try a broader term." : "New programs will show up here as they launch."}
                  action={
                    query ? (
                      <Button variant="secondary" size="sm" onClick={() => setQuery("")}>
                        Clear search
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {explore.map((c) => (
                      <CourseCard key={c.id} course={c} variant="catalog" onOpen={() => setPreview(c)} onEnroll={() => setPreview(c)} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </StaggerItem>
      </Stagger>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
          {preview && (
            <>
              <CourseCover title={preview.title} category={coverCategory(preview.category)} image={preview.image} showTitle={false} hoverZoom={false} className="aspect-[21/9]">
                <span className="absolute bottom-3 left-4 z-10 rounded-full border border-white/15 bg-ink-950/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
                  {preview.category}
                </span>
              </CourseCover>
              <div className="grid gap-5 p-6">
                <DialogHeader>
                  <DialogTitle className="text-h3">{preview.title}</DialogTitle>
                  <DialogDescription>
                    {preview.instructor} · {preview.instructorRole}
                  </DialogDescription>
                </DialogHeader>
                <p className="text-sm leading-6 text-muted-foreground">{preview.description}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { icon: Clock, label: "Duration", value: preview.duration },
                    { icon: Layers, label: "Modules", value: String(preview.totalModules) },
                    { icon: GraduationCap, label: "Level", value: preview.level },
                    { icon: Star, label: "Rating", value: `${preview.rating} (${preview.reviews})` },
                  ].map((s) => (
                    <div key={s.label} className="rounded-md border border-border bg-surface-2 p-3">
                      <s.icon className="h-4 w-4 text-primary-text" aria-hidden="true" />
                      <p className="mt-2 truncate text-sm font-semibold text-foreground">{s.value}</p>
                      <p className="text-caption text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                <DialogFooter className="items-center sm:justify-between">
                  <Badge tone="neutral">{preview.credits} credits</Badge>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button variant="ghost" onClick={() => setPreview(null)}>
                      Maybe later
                    </Button>
                    <Button
                      onClick={() => {
                        const c = preview
                        setPreview(null)
                        onEnrollCourse(c)
                      }}
                    >
                      Enroll and start
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
