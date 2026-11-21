import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAdminBase } from "../shared/useAdminBase"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CircleDashed,
  Clock,
  Copy,
  FileText,
  MoreHorizontal,
  Rocket,
  SearchX,
  Trash2,
  Upload,
  Users,
  Video,
  Wallet,
  Archive,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import EmptyState from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CourseCover from "@/components/shared/CourseCover"
import AssessmentAuthoringPanel from "@/components/admin/AssessmentAuthoringPanel"
import { api, ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { AdminCourse, useAdminStore } from "@/data/adminStore"
import ConfirmDialog, { type ConfirmRequest } from "../shared/ConfirmDialog"
import { useTabParam } from "../shared/useTabParam"
import CourseCurriculumPanel from "./CourseCurriculumPanel"
import CourseLearnersPanel from "./CourseLearnersPanel"
import CourseMaterialsPanel from "./CourseMaterialsPanel"
import CourseSettingsPanel, { type CourseSettingsValues } from "./CourseSettingsPanel"
import { compactINR, formatINR, seatPercent, STATUS_TONE } from "./courseTheme"
import { formatRuntime, lessonHasPlayableVideo, type CourseDetailResponse, type MaterialItem } from "./courseContent"

const VideoCourseUploadModal = lazy(() => import("../VideoCourseUploadModal"))

interface CourseWorkspacePageProps {
  store: ReturnType<typeof useAdminStore>
  onToast: (msg: string) => void
}

const TABS = ["overview", "curriculum", "learners", "materials", "assessments", "settings"] as const
type TabId = (typeof TABS)[number]

type LoadState = "loading" | "ready" | "error" | "missing"

/** Full-page course workspace at /admin/courses/:courseId. */
export default function CourseWorkspacePage({ store, onToast }: CourseWorkspacePageProps) {
  const { courseId = "" } = useParams()
  const navigate = useNavigate()
  const base = useAdminBase()
  const [tab, setTab] = useTabParam(TABS, "overview")

  const storeCourse = store.courses.find((c) => c.id === courseId)
  const [detail, setDetail] = useState<CourseDetailResponse | null>(null)
  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [loadError, setLoadError] = useState("")
  const [settingsDirty, setSettingsDirty] = useState(false)
  const [learnerCount, setLearnerCount] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [upload, setUpload] = useState<{ moduleId?: string } | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)

  const fetchDetails = useCallback(async () => {
    if (!courseId) return
    try {
      const res = await api.get<CourseDetailResponse>(`/admin/courses/${courseId}`, { bypassCache: true })
      setDetail((prev) => {
        // Keep the same course object when nothing changed so an open settings form is not rebased.
        const sameCourse = prev && JSON.stringify(prev.course) === JSON.stringify(res.course)
        return { ...res, course: sameCourse ? prev.course : res.course }
      })
      setLoadState("ready")
      setLoadError("")
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setLoadState("missing")
      else {
        setLoadError(err instanceof Error ? err.message : "Could not load this course.")
        setLoadState((s) => (s === "ready" ? s : "error"))
      }
    }
  }, [courseId])

  useEffect(() => {
    setDetail(null)
    setLoadState("loading")
    void fetchDetails()
  }, [fetchDetails])

  // Warn before closing the tab with unsaved settings.
  useEffect(() => {
    if (!settingsDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [settingsDirty])

  const goBack = useCallback(() => {
    if (!settingsDirty) return navigate(`${base}/courses`)
    setConfirm({
      title: "Leave without saving?",
      description: "Your changes in Settings will be lost.",
      confirmLabel: "Leave page",
      onConfirm: () => navigate(`${base}/courses`),
    })
  }, [settingsDirty, navigate, base])

  const mutate = useCallback(
    async (action: () => Promise<unknown>, message: string) => {
      try {
        await action()
        await fetchDetails()
        store.refreshCourses().catch(() => {})
        onToast(message)
        return true
      } catch (err) {
        onToast(err instanceof Error ? err.message : "Something went wrong.")
        return false
      }
    },
    [fetchDetails, onToast, store],
  )

  const modules = detail?.modules ?? []
  const lessons = detail?.lessons ?? []
  const materials = detail?.materials ?? []
  const record = detail?.course

  const stats = useMemo(() => {
    const minutes = lessons.reduce((sum, l) => sum + (l.minutes || 0), 0)
    const videoLessons = lessons.filter((l) => l.type === "video")
    const videosReady = videoLessons.filter(lessonHasPlayableVideo).length
    return { minutes, videoTotal: videoLessons.length, videosReady }
  }, [lessons])

  // Header data: the detail record is freshest; the store adds learners, revenue and avatar.
  const title = record?.title ?? storeCourse?.title ?? "Course"
  const category = record?.category ?? storeCourse?.category ?? ""
  const status = (record?.status ?? storeCourse?.status ?? "Draft") as AdminCourse["status"]
  const instructor = record?.instructor ?? storeCourse?.instructor ?? ""
  const price = Number(record?.price ?? storeCourse?.price ?? 0)
  const rawCapacity = record ? record.capacity : storeCourse?.capacity
  const capacity: number | null = rawCapacity == null ? null : Number(rawCapacity)
  const enrolled = storeCourse?.enrolledStudents ?? 0
  const seatPct = capacity === null ? 0 : seatPercent({ enrolledStudents: enrolled, capacity })

  const saveSettings = async (v: CourseSettingsValues) => {
    try {
      await api.patch(`/admin/courses/${courseId}`, {
        title: v.title,
        category: v.category,
        instructor: v.instructor,
        level: v.level,
        duration: v.duration,
        description: v.description,
        price: Math.max(0, Number(v.price) || 0),
        capacity: v.capacity === null ? null : Math.max(1, Number(v.capacity) || 1),
        status: v.status,
      })
      await fetchDetails()
      store.refreshCourses().catch(() => {})
      onToast(`Saved "${v.title}"`)
      return true
    } catch (err) {
      onToast(err instanceof Error ? `Could not save: ${err.message}` : "Could not save settings.")
      return false
    }
  }

  const setStatus = async (next: AdminCourse["status"]) => {
    setStatusBusy(true)
    try {
      await api.patch(`/admin/courses/${courseId}`, { status: next })
      await fetchDetails()
      store.refreshCourses().catch(() => {})
      onToast(next === "Published" ? `"${title}" is live` : `"${title}" unpublished`)
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not change status.")
    } finally {
      setStatusBusy(false)
    }
  }

  const askRemove = () =>
    setConfirm({
      title: "Remove this course from the catalog?",
      description: "Enrollment closes and the course leaves the list. Learners keep their access, content and progress.",
      confirmLabel: "Remove course",
      onConfirm: async () => {
        try {
          await store.deleteCourse(courseId)
          onToast(`Removed "${title}" from the catalog`)
          setSettingsDirty(false)
          navigate(`${base}/courses`)
        } catch (err) {
          onToast(err instanceof Error ? err.message : "Could not remove course.")
          return false
        }
      },
    })

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      onToast("Link copied")
    } catch {
      onToast("Could not copy the link")
    }
  }

  const breadcrumb = [{ label: "Courses", onClick: goBack }, { label: title }]

  if (loadState === "missing" || (loadState === "error" && !detail)) {
    return (
      <div className="flex flex-col">
        <PageHeader breadcrumb={[{ label: "Courses", onClick: () => navigate(`${base}/courses`) }, { label: "Not available" }]} title={storeCourse?.title ?? "Course"} />
        <EmptyState
          icon={<SearchX aria-hidden="true" />}
          title={loadState === "missing" ? "This course doesn't exist" : "Couldn't load this course"}
          description={loadState === "missing" ? "It may have been removed from the catalog. Check the link or go back to all courses." : loadError}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" leftIcon={<ArrowLeft aria-hidden="true" />} onClick={() => navigate(`${base}/courses`)}>
                All courses
              </Button>
              {loadState === "error" && <Button onClick={() => { setLoadState("loading"); void fetchDetails() }}>Try again</Button>}
            </div>
          }
        />
      </div>
    )
  }

  const isPublished = status === "Published"

  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={breadcrumb}
        eyebrow={[category, record?.level].filter(Boolean).join(" · ") || "Course"}
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="min-w-0 break-words">{title}</span>
            <Badge tone={STATUS_TONE[status]} dot className="align-middle">
              {status}
            </Badge>
          </span>
        }
        description={[instructor, record?.duration].filter(Boolean).join(" · ")}
        actions={
          <>
            <Button variant="outline" leftIcon={<ArrowLeft aria-hidden="true" />} onClick={goBack} className="hidden sm:inline-flex">
              All courses
            </Button>
            <Button variant="outline" leftIcon={<Upload aria-hidden="true" />} onClick={() => setUpload({})} disabled={!detail}>
              Upload video
            </Button>
            {isPublished ? (
              <Button variant="outline" leftIcon={<Archive aria-hidden="true" />} loading={statusBusy} disabled={!detail} onClick={() => void setStatus("Archived")}>
                Unpublish
              </Button>
            ) : (
              <Button leftIcon={<Rocket aria-hidden="true" />} loading={statusBusy} disabled={!detail} onClick={() => void setStatus("Published")}>
                Publish
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More course actions">
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => void copyLink()}>
                  <Copy className="h-4 w-4" aria-hidden="true" /> Copy page link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={askRemove} destructive>
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove from catalog
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Summary strip */}
      <Card className="mb-5 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
          <CourseCover title={title} category={category} showTitle={false} hoverZoom={false} className="hidden md:block md:aspect-auto md:h-full md:min-h-[150px]" />
          <dl className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
            <SummaryStat icon={Users} label="Learners" value={enrolled.toLocaleString("en-IN")}>
              {capacity === null ? (
                <p className="mt-2 text-[11px] text-muted-foreground">Open to everyone · no learner cap</p>
              ) : (
                <div className="mt-2">
                  <Progress value={seatPct} size="xs" tone={seatPct >= 100 ? "danger" : seatPct >= 85 ? "warning" : "primary"} label="Learner cap filled" />
                  <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                    {seatPct}% of {capacity.toLocaleString("en-IN")} learner cap
                  </p>
                </div>
              )}
            </SummaryStat>
            <SummaryStat icon={Wallet} label="Net collected" value={compactINR(storeCourse?.revenue ?? 0)} hint={price > 0 ? `List price ${formatINR(price)}` : "Free course"} />
            <SummaryStat icon={Wallet} label="Access" value={price > 0 ? formatINR(price) : "Free"} hint={price > 0 ? "Paid course · one-time checkout" : "One-click enrol, no payment"} />
            <SummaryStat icon={BookOpen} label="Lessons" value={detail ? String(lessons.length) : "–"} hint={detail ? `${modules.length} chapters · ${formatRuntime(stats.minutes)}` : "Loading"} />
          </dl>
        </div>
      </Card>

      {loadState === "loading" && !detail ? (
        <div className="space-y-3" role="status" aria-label="Loading course">
          <Skeleton className="h-10 w-full max-w-xl" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab} variant="underline">
          <TabsList aria-label="Course sections" className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="curriculum">
              Curriculum <span className="tabular-nums text-subtle-foreground">{lessons.length}</span>
            </TabsTrigger>
            <TabsTrigger value="learners">
              Learners <span className="tabular-nums text-subtle-foreground">{learnerCount ?? enrolled}</span>
            </TabsTrigger>
            <TabsTrigger value="materials">
              Materials <span className="tabular-nums text-subtle-foreground">{materials.length}</span>
            </TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="settings">
              Settings
              {settingsDirty && <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-label="unsaved changes" />}
            </TabsTrigger>
          </TabsList>

          {loadError && detail && (
            <p role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
              {loadError}
              <Button size="sm" variant="outline" onClick={() => void fetchDetails()}>
                Retry
              </Button>
            </p>
          )}

          <TabsContent value="overview" className="mt-5">
            {detail && (
              <CourseOverview
                detail={detail}
                stats={stats}
                status={status}
                onGo={setTab}
                onPublish={() => void setStatus("Published")}
                publishing={statusBusy}
              />
            )}
          </TabsContent>
          <TabsContent value="curriculum" className="mt-5">
            <CourseCurriculumPanel
              courseId={courseId}
              modules={modules}
              lessons={lessons}
              mutate={mutate}
              onUploadVideo={(moduleId) => setUpload({ moduleId })}
              onConfirm={setConfirm}
              onToast={onToast}
            />
          </TabsContent>
          <TabsContent value="learners" className="mt-5">
            <CourseLearnersPanel courseId={courseId} courseTitle={record?.title ?? ""} store={store} onToast={onToast} onCount={setLearnerCount} />
          </TabsContent>
          <TabsContent value="materials" className="mt-5">
            <CourseMaterialsPanel
              courseId={courseId}
              materials={materials}
              onMaterialsChange={(next: MaterialItem[]) => setDetail((d) => (d ? { ...d, materials: next } : d))}
              onConfirm={setConfirm}
              onToast={onToast}
            />
          </TabsContent>
          <TabsContent value="assessments" className="mt-5">
            <AssessmentAuthoringPanel courseId={courseId} />
          </TabsContent>
          {/* Settings stays mounted so unsaved edits survive switching tabs. */}
          <TabsContent value="settings" forceMount className="mt-5 data-[state=inactive]:hidden">
            {record && <CourseSettingsPanel record={record} onSave={saveSettings} onDirtyChange={setSettingsDirty} />}
          </TabsContent>
        </Tabs>
      )}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />

      {upload && (
        <Suspense fallback={null}>
          <VideoCourseUploadModal
            open
            onOpenChange={(o) => !o && setUpload(null)}
            initialCourseId={courseId}
            initialModuleId={upload.moduleId}
            existingCourses={store.courses}
            onCourseCreated={() => {
              store.refreshCourses().catch(() => {})
            }}
            onSuccess={() => {
              void fetchDetails()
              store.refreshCourses().catch(() => {})
            }}
            onToast={onToast}
          />
        </Suspense>
      )}
    </div>
  )
}

function SummaryStat({ icon: Icon, label, value, hint, children }: { icon: typeof Users; label: string; value: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 bg-surface p-4">
      <dt className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 truncate text-xl font-semibold tabular-nums tracking-tight text-foreground">{value}</dd>
      {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}

interface CourseOverviewProps {
  detail: CourseDetailResponse
  stats: { minutes: number; videoTotal: number; videosReady: number }
  status: AdminCourse["status"]
  onGo: (tab: TabId) => void
  onPublish: () => void
  publishing: boolean
}

function CourseOverview({ detail, stats, status, onGo, onPublish, publishing }: CourseOverviewProps) {
  const { modules, lessons, materials, course } = detail
  const missingVideos = stats.videoTotal - stats.videosReady
  const steps: { label: string; detail: string; done: boolean; optional?: boolean; action: ReactNode }[] = [
    {
      label: "Build the curriculum",
      detail: lessons.length ? `${modules.length} chapters, ${lessons.length} lessons` : "Add a chapter and its first lessons",
      done: lessons.length > 0,
      action: <StepLink onClick={() => onGo("curriculum")}>{lessons.length ? "Review" : "Start"}</StepLink>,
    },
    {
      label: "Attach every lesson video",
      detail: stats.videoTotal ? `${stats.videosReady} of ${stats.videoTotal} videos ready` : "No video lessons yet",
      done: lessons.length > 0 && missingVideos === 0,
      action: <StepLink onClick={() => onGo("curriculum")}>{missingVideos ? "Fix" : "Review"}</StepLink>,
    },
    {
      label: "Write the course overview",
      detail: course.description?.trim() ? "Shown on the course page" : "Learners see this before they enroll",
      done: Boolean(course.description?.trim()),
      action: <StepLink onClick={() => onGo("settings")}>Edit</StepLink>,
    },
    {
      label: "Share materials",
      detail: materials.length ? `${materials.length} ${materials.length === 1 ? "file" : "files"} shared` : "Slides, notebooks or datasets",
      done: materials.length > 0,
      optional: true,
      action: <StepLink onClick={() => onGo("materials")}>{materials.length ? "Manage" : "Add"}</StepLink>,
    },
    {
      label: "Publish the course",
      detail: status === "Published" ? "Live in the catalog" : "Hidden from learners until published",
      done: status === "Published",
      action:
        status === "Published" ? (
          <StepLink onClick={() => onGo("settings")}>Pricing</StepLink>
        ) : (
          <Button size="sm" loading={publishing} onClick={onPublish}>
            Publish
          </Button>
        ),
    },
  ]
  const required = steps.filter((s) => !s.optional)
  const doneCount = required.filter((s) => s.done).length
  const pct = Math.round((doneCount / required.length) * 100)

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Launch checklist</h3>
              <p className="text-caption text-muted-foreground">
                {doneCount === required.length ? "Everything required is done." : `${required.length - doneCount} required ${required.length - doneCount === 1 ? "step" : "steps"} left`}
              </p>
            </div>
            <div className="flex w-40 items-center gap-2">
              <Progress value={pct} size="sm" tone={pct === 100 ? "success" : "primary"} label="Checklist progress" />
              <span className="text-caption font-semibold tabular-nums text-foreground">{pct}%</span>
            </div>
          </div>
          <ol className="divide-y divide-border border-t border-border">
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    s.done ? "bg-success-soft text-success" : "border border-dashed border-border-strong text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", s.done ? "text-muted-foreground" : "text-foreground")}>
                    {s.label}
                    {s.optional && <span className="ml-1.5 text-caption font-normal text-subtle-foreground">optional</span>}
                    <span className="sr-only">{s.done ? " (done)" : " (to do)"}</span>
                  </p>
                  <p className="truncate text-caption text-muted-foreground">{s.detail}</p>
                </div>
                <div className="shrink-0">{s.action}</div>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-5 pb-3">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Curriculum at a glance</h3>
              <p className="text-caption text-muted-foreground">
                {modules.length} chapters · {lessons.length} lessons · {formatRuntime(stats.minutes)}
              </p>
            </div>
            <StepLink onClick={() => onGo("curriculum")}>Open curriculum</StepLink>
          </div>
          {modules.length === 0 ? (
            <div className="flex items-center gap-3 border-t border-border px-5 py-6 text-sm text-muted-foreground">
              <CircleDashed className="h-4 w-4 shrink-0" aria-hidden="true" />
              No chapters yet. Start with a chapter, then add lessons or upload videos.
            </div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {modules.slice(0, 6).map((m, i) => {
                const ml = lessons.filter((l) => l.module_id === m.id)
                const ready = ml.filter((l) => l.type !== "video" || lessonHasPlayableVideo(l)).length
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => onGo("curriculum")} className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-surface-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-soft text-xs font-semibold tabular-nums text-primary-text">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{m.title}</span>
                      <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
                        {ml.length} lessons
                        {ml.length > 0 && ready < ml.length && <span className="ml-2 text-warning">{ml.length - ready} need video</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
              {modules.length > 6 && (
                <li className="px-5 py-2.5 text-caption text-muted-foreground">
                  and {modules.length - 6} more {modules.length - 6 === 1 ? "chapter" : "chapters"}
                </li>
              )}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-semibold text-foreground">Details</h3>
          <dl className="space-y-2.5 text-sm">
            <DetailRow icon={BookOpen} label="Category" value={course.category} />
            <DetailRow icon={Users} label="Instructor" value={course.instructor} />
            <DetailRow icon={Clock} label="Duration" value={course.duration || "Not set"} />
            <DetailRow icon={Video} label="Videos ready" value={stats.videoTotal ? `${stats.videosReady} / ${stats.videoTotal}` : "None yet"} />
            <DetailRow icon={FileText} label="Materials" value={String(materials.length)} />
            <DetailRow icon={Wallet} label="Price" value={Number(course.price) > 0 ? formatINR(Number(course.price)) : "Free"} />
            <DetailRow icon={Users} label="Learner cap" value={course.capacity == null ? "None" : Number(course.capacity).toLocaleString("en-IN")} />
          </dl>
          {course.description?.trim() && <p className="mt-4 line-clamp-4 border-t border-border pt-4 text-caption leading-5 text-muted-foreground">{course.description}</p>}
          <Button size="sm" variant="ghost" className="mt-3 -ml-2" onClick={() => onGo("settings")}>
            Edit details
          </Button>
        </Card>
      </div>
    </div>
  )
}

function StepLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button size="sm" variant="ghost" onClick={onClick} rightIcon={<ArrowRight aria-hidden="true" />} className="text-primary-text hover:text-primary-text">
      {children}
    </Button>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right font-medium text-foreground">{value}</dd>
    </div>
  )
}
