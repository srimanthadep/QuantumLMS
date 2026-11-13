import AssessmentAuthoringPanel from "@/components/admin/AssessmentAuthoringPanel"
import SelfPacedOfferPanel from "./courses/SelfPacedOfferPanel"
import { useState, useEffect } from "react"
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Video,
  FileText,
  Upload,
  File,
  Download,
  Sparkles,
  Layers,
  GraduationCap,
  X,
  FileCode,
  Database,
  Presentation,
  ChevronDown,
  ChevronsUpDown,
  Settings2,
  Star,
  Play,
  type LucideIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CustomSelect } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { formatINR, seatPercent, themeFor, CATEGORIES, STATUSES } from "./courses/courseTheme"
import { NavItem, PanelHeader, WorkspaceEmpty } from "./courses/WorkspaceParts"
import LessonPlayer from "@/pages/student/course/LessonPlayer"
import type { AdminCourse } from "@/data/adminStore"

/** Converts YouTube/Vimeo watch URLs to embed URLs; returns null for direct/R2 video streams. */
function toVideoEmbedUrl(url?: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url, window.location.origin)
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "")
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v")
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null
    }
  } catch {
    return null
  }
  return null
}

function lessonHasPlayableVideo(l: LessonRowItem): boolean {
  const hasQualities = Boolean(l.video_qualities && typeof l.video_qualities === "object" && Object.keys(l.video_qualities).length > 0)
  return l.type === "video" && Boolean(l.video_url || hasQualities)
}

interface CourseModuleItem {
  id: string
  course_id: string
  position: number
  title: string
  duration: string
}

interface LessonRowItem {
  id: string
  course_id: string
  module_id: string
  position: number
  title: string
  duration: string
  minutes: number
  type: "video" | "reading" | "lab"
  summary: string
  video_url?: string | null
  video_qualities?: any
}

interface MaterialItem {
  id: string
  course_id: string
  position: number
  title: string
  type: "PDF" | "Code Notebook" | "Dataset" | "Slides"
  description: string
  url?: string | null
  file_name?: string | null
  size: string
  published_at?: string | null
}

interface CourseEditorModalProps {
  course: AdminCourse | null
  open: boolean
  refreshKey?: number
  onOpenChange: (open: boolean) => void
  onCourseUpdated: (course: AdminCourse) => void
  onOpenVideoUpload: (courseId: string, moduleId?: string) => void
  onToast: (msg: string) => void
}

type EditorTab = "enrollment" | "curriculum" | "materials" | "assignments" | "settings"

export default function CourseEditorModal({
  course,
  open,
  refreshKey,
  onOpenChange,
  onCourseUpdated,
  onOpenVideoUpload,
  onToast,
}: CourseEditorModalProps) {
  const [loadError, setLoadError] = useState("")
  const [activeTab, setActiveTab] = useState<EditorTab>("curriculum")
  const [loading, setLoading] = useState(false)
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())

  // Remote data
  const [modules, setModules] = useState<CourseModuleItem[]>([])
  const [lessons, setLessons] = useState<LessonRowItem[]>([])
  const [materials, setMaterials] = useState<MaterialItem[]>([])

  // Course Settings Form
  const [editTitle, setEditTitle] = useState("")
  const [editCategory, setEditCategory] = useState<any>("LLM Engineering")
  const [editInstructor, setEditInstructor] = useState("")
  const [editPrice, setEditPrice] = useState(39999)
  const [editCapacity, setEditCapacity] = useState(300)
  const [editLevel, setEditLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate")
  const [editDuration, setEditDuration] = useState("12 Weeks")
  const [editStatus, setEditStatus] = useState<AdminCourse["status"]>("Published")
  const [editDescription, setEditDescription] = useState("")

  // Add Chapter (Module) State
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState("")
  const [newModuleDuration, setNewModuleDuration] = useState("2 Hours")
  const [savingModule, setSavingModule] = useState(false)

  // Edit Chapter State
  const [editingModule, setEditingModule] = useState<CourseModuleItem | null>(null)
  const [editModTitle, setEditModTitle] = useState("")
  const [editModDuration, setEditModDuration] = useState("")

  // Add Lesson State
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false)
  const [targetModuleId, setTargetModuleId] = useState("")
  const [newLessonTitle, setNewLessonTitle] = useState("")
  const [newLessonType, setNewLessonType] = useState<"video" | "reading" | "lab">("video")
  const [newLessonDuration, setNewLessonDuration] = useState("15m")
  const [newLessonSummary, setNewLessonSummary] = useState("")
  const [savingLesson, setSavingLesson] = useState(false)

  // Edit Lesson State
  const [editingLesson, setEditingLesson] = useState<LessonRowItem | null>(null)
  // Preview / Play Video Lesson State
  const [previewingLesson, setPreviewingLesson] = useState<{ lesson: LessonRowItem; moduleTitle: string } | null>(null)

  // Upload Material State
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false)
  const [matTitle, setMatTitle] = useState("")
  const [matType, setMatType] = useState<"PDF" | "Code Notebook" | "Dataset" | "Slides">("PDF")
  const [matDescription, setMatDescription] = useState("")
  const [matUrl, setMatUrl] = useState("")
  const [matFile, setMatFile] = useState<File | null>(null)
  const [uploadingMat, setUploadingMat] = useState(false)

  // Load only persisted course content. Failed requests remain visible and retryable.
  const fetchDetails = async () => {
    if (!course) return
    setLoading(true); setLoadError("")
    try {
      const res = await api.get<{ course: any; modules: CourseModuleItem[]; lessons: LessonRowItem[]; materials: MaterialItem[] }>(`/admin/courses/${course.id}`, { bypassCache: true })
      setModules(res.modules); setLessons(res.lessons); setMaterials(res.materials)
      setOpenModules(new Set(res.modules.map(m => m.id)))
      setEditTitle(res.course.title); setEditCategory(res.course.category); setEditInstructor(res.course.instructor)
      setEditLevel(res.course.level); setEditDuration(res.course.duration); setEditDescription(res.course.description)
      setEditPrice(Number(res.course.price)); setEditCapacity(Number(res.course.capacity)); setEditStatus(res.course.status)
    } catch (error) { setLoadError((error as Error).message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (open && course) {
      setActiveTab("curriculum")
    }
  }, [open, course?.id])

  useEffect(() => {
    if (open && course) {
      fetchDetails()
    }
  }, [open, course?.id, refreshKey])

  if (!course) return null

  const mutateContent = async (action: () => Promise<unknown>, message: string) => {
    try { await action(); await fetchDetails(); onToast(message); return true }
    catch (error) { onToast((error as Error).message); return false }
  }
  const moveContent = async (kind: "module" | "lesson", id: string, direction: -1 | 1) => {
    const ids = kind === "module" ? modules.map(m => m.id) : lessons.map(l => l.id)
    const index = ids.indexOf(id)
    const siblings = kind === "module" ? ids : lessons.filter(l => l.module_id === lessons.find(row => row.id === id)?.module_id).map(l => l.id)
    const neighbor = siblings[siblings.indexOf(id) + direction]
    const target = ids.indexOf(neighbor)
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    await mutateContent(() => api.put(`/admin/courses/${course.id}/order`, { module_ids: kind === "module" ? ids : modules.map(m => m.id), lesson_ids: kind === "lesson" ? ids : lessons.map(l => l.id) }), "Lesson order saved. Learner progress is preserved.")
  }
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newModuleTitle.trim()) return
    setSavingModule(true)
    if (await mutateContent(() => api.post(`/admin/courses/${course.id}/modules`, { title: newModuleTitle.trim(), duration: newModuleDuration.trim() }), "Chapter added. Review and publish the offer when ready.")) { setIsAddModuleOpen(false); setNewModuleTitle("") }
    setSavingModule(false)
  }
  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingModule) return
    if (await mutateContent(() => api.patch(`/admin/courses/${course.id}/modules/${editingModule.id}`, { title: editModTitle.trim(), duration: editModDuration.trim() }), "Chapter saved.")) setEditingModule(null)
  }
  const handleDeleteModule = async (moduleId: string, title: string) => {
    if (!window.confirm(`Remove "${title}" from the curriculum? Content and learner progress will remain in history.`)) return
    await mutateContent(() => api.delete(`/admin/courses/${course.id}/modules/${moduleId}`), "Chapter archived; learner history retained.")
  }
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault(); if (!targetModuleId || !newLessonTitle.trim()) return
    setSavingLesson(true)
    if (await mutateContent(() => api.post(`/admin/courses/${course.id}/lessons`, { moduleId: targetModuleId, title: newLessonTitle.trim(), type: newLessonType, duration: newLessonDuration, minutes: parseInt(newLessonDuration, 10) || 15, summary: newLessonSummary.trim() }), "Lesson created. Attach a processed upload for video lessons.")) { setIsAddLessonOpen(false); setNewLessonTitle(""); setNewLessonSummary("") }
    setSavingLesson(false)
  }
  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingLesson) return
    if (await mutateContent(() => api.patch(`/admin/courses/${course.id}/lessons/${editingLesson.id}`, { title: editingLesson.title.trim(), type: editingLesson.type, duration: editingLesson.duration, minutes: parseInt(editingLesson.duration, 10) || 15, summary: editingLesson.summary }), "Lesson saved; its previous content and learner progress are retained.")) setEditingLesson(null)
  }
  const handleDeleteLesson = async (lessonId: string, title: string) => {
    if (!window.confirm(`Remove "${title}" from the curriculum? Content and learner progress will remain in history.`)) return
    await mutateContent(() => api.delete(`/admin/courses/${course.id}/lessons/${lessonId}`), "Lesson archived; learner history retained.")
  }

  // 3. Materials Handlers
  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matTitle.trim()) return
    setUploadingMat(true)

    try {
      let finalUrl = matUrl.trim()
      let fileName = matFile ? matFile.name : undefined
      let sizeStr = matFile ? `${(matFile.size / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB"

      // If physical file attached, upload directly to /admin/courses/:id/materials/upload
      if (matFile) {
        const uploadRes = await api.postBuffer<{
          ok: boolean
          url: string
          fileName: string
          size: string
        }>(`/admin/courses/${course.id}/materials/upload?filename=${encodeURIComponent(matFile.name)}`, matFile, {
          headers: {
            "Content-Type": matFile.type || "application/octet-stream",
            "x-filename": matFile.name,
          },
        })
        finalUrl = uploadRes.url
        fileName = uploadRes.fileName
        sizeStr = uploadRes.size
      }

      const res = await api.post<{ ok: boolean; material: MaterialItem }>(`/admin/courses/${course.id}/materials`, {
        title: matTitle.trim(),
        type: matType,
        description: matDescription.trim(),
        url: finalUrl || undefined,
        fileName,
        size: sizeStr,
      })

      if (res.material) {
        setMaterials((prev) => [...prev, res.material])
        onToast(`Added material: "${res.material.title}"`)
        setIsAddMaterialOpen(false)
        setMatTitle("")
        setMatDescription("")
        setMatUrl("")
        setMatFile(null)
      }
    } catch (err: any) {
      onToast(`Failed to upload material: ${err.message}`)
    } finally {
      setUploadingMat(false)
    }
  }

  const handleDeleteMaterial = async (matId: string, matTitle: string) => {
    if (!window.confirm(`Delete material "${matTitle}"?`)) return
    try {
      await api.delete(`/admin/courses/${course.id}/materials/${matId}`)
      setMaterials((prev) => prev.filter((m) => m.id !== matId))
      onToast(`Removed material "${matTitle}"`)
    } catch (err: any) {
      onToast(`Failed to remove material: ${err.message}`)
    }
  }

  // 5. Course Details Save Handler
  const handleSaveCourseSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim()) return

    try {
      await api.patch(`/admin/courses/${course.id}`, {
        title: editTitle.trim(),
        category: editCategory,
        instructor: editInstructor.trim(),
        level: editLevel,
        duration: editDuration.trim(),
        description: editDescription.trim(),
        price: Math.max(0, Number(editPrice) || 0),
        capacity: Math.max(1, Number(editCapacity) || 250),
        status: editStatus,
      })

      const updated: AdminCourse = {
        ...course,
        title: editTitle.trim(),
        category: editCategory,
        instructor: editInstructor.trim(),
        price: Number(editPrice),
        capacity: Number(editCapacity),
        status: editStatus,
      }
      onCourseUpdated(updated)
      onToast(`Saved course settings for "${editTitle}"`)
    } catch (err: any) {
      onToast(`Failed to save course settings: ${err.message}`)
    }
  }

  // ---- Derived workspace numbers -------------------------------------------------
  const totalMinutes = lessons.reduce((sum, l) => sum + (l.minutes || 0), 0)
  const runtimeLabel = totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`
  const videoLessons = lessons.filter((l) => l.type === "video")
  const videosReady = videoLessons.filter((l) => l.video_url).length
  const { gradient, icon: CourseIcon } = themeFor(course.category)
  const seatPct = seatPercent(course)
  const allOpen = modules.length > 0 && openModules.size === modules.length

  const toggleModule = (id: string) =>
    setOpenModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const tabs: { id: EditorTab; label: string; icon: LucideIcon; count?: number }[] = [
    { id: "curriculum", label: "Chapters & Videos", icon: Layers, count: modules.length },
    { id: "materials", label: "Materials", icon: FileText, count: materials.length },
    { id: "assignments", label: "Assessments & completion", icon: GraduationCap },
    { id: "enrollment", label: "Enrollment & publishing", icon: GraduationCap },
    { id: "settings", label: "Course Settings", icon: Settings2 },
  ]

  const statusDot = editStatus === "Published" ? "bg-emerald-300" : editStatus === "Draft" ? "bg-amber-300" : "bg-slate-300"

  const handleLessonClick = (lesson: LessonRowItem, moduleTitle: string) => {
    if (lessonHasPlayableVideo(lesson)) {
      setPreviewingLesson({ lesson, moduleTitle })
      return
    }
    if (lesson.type === "video") {
      onToast("No processed video is attached yet. Use Upload Video to upload and attach one.")
    }
    setEditingLesson(lesson)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        containerClassName="p-0 sm:p-0"
        className="w-screen h-dvh max-w-none max-h-dvh flex flex-col p-0 gap-0 overflow-hidden rounded-none sm:rounded-none border-0 bg-background text-foreground shadow-none"
      >
        {/* ===== Hero Header (title, category, published ALL on ONE LINE) ===== */}
        <header className={cn("relative shrink-0 overflow-hidden bg-gradient-to-r text-white", gradient)}>
          <CourseIcon className="pointer-events-none absolute -right-6 -top-8 h-56 w-56 rotate-[-10deg] text-white/10" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" aria-hidden="true" />
          <div className="relative px-5 py-5 sm:px-7 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left: Icon + Title/Status row stacked above category */}
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-xs">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                    <DialogTitle className="truncate text-2xl font-bold tracking-tight text-white sm:text-[28px] leading-tight">
                      {course.title}
                    </DialogTitle>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur sm:text-[13px]">
                      <span className={cn("h-2 w-2 rounded-full", statusDot)} aria-hidden="true" />
                      {editStatus}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="inline-flex shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
                      {course.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Quick telemetry pills + close X */}
              <div className="flex items-center gap-3 shrink-0">
                <dl className="hidden md:flex items-center gap-2.5">
                  {[
                    { label: "Chapters", value: String(modules.length) },
                    { label: "Lessons", value: String(lessons.length) },
                    { label: "Runtime", value: runtimeLabel },
                    { label: "Videos ready", value: `${videosReady}/${videoLessons.length}` },
                  ].map((s) => (
                    <div key={s.label} className="min-w-[88px] rounded-xl bg-white/15 px-3.5 py-2 text-center backdrop-blur">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-white/75">{s.label}</dt>
                      <dd className="mt-0.5 text-base font-bold tabular-nums leading-tight">{s.value}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                  aria-label="Close workspace"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ===== Body: sidebar on the left + panel on the right ===== */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Desktop & Tablet Left Sidebar */}
          <aside className="hidden w-[var(--shell-sidebar-w)] shrink-0 flex-col overflow-y-auto border-r border-border bg-surface p-3 md:flex">
            <nav aria-label="Workspace sections">
              <ul className="flex flex-col gap-0.5">
                {tabs.map((t) => (
                  <li key={t.id}>
                    <NavItem
                      icon={t.icon}
                      label={t.label}
                      count={t.count}
                      active={activeTab === t.id}
                      onClick={() => setActiveTab(t.id)}
                    />
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mx-2 my-3 h-px bg-border" role="separator" />

            <div className="space-y-3 rounded-xl border border-border bg-surface-2/50 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">Course snapshot</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Seats</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {course.enrolledStudents} / {course.capacity}
                  </span>
                </div>
                <Progress value={seatPct} size="sm" tone={seatPct >= 100 ? "danger" : seatPct >= 85 ? "warning" : "primary"} label={`${seatPct}% of seats filled`} />
              </div>
              <dl className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Tuition</dt>
                  <dd className="font-semibold tabular-nums text-foreground">{formatINR(course.price)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Revenue</dt>
                  <dd className="font-semibold tabular-nums text-primary-text">{formatINR(course.revenue)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Rating</dt>
                  <dd className="flex items-center gap-1 font-semibold tabular-nums text-foreground">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                    {course.rating}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Completion</dt>
                  <dd className="font-semibold tabular-nums text-foreground">{course.completionRate}%</dd>
                </div>
              </dl>
              <p className="truncate border-t border-border pt-3 text-[11px] font-mono tabular-nums text-subtle-foreground" title={course.id}>
                ID · {course.id}
              </p>
            </div>
          </aside>

          {/* Mobile section pills */}
          <nav aria-label="Workspace sections" className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-2 md:hidden">
            {tabs.map((t) => (
              <NavItem key={t.id} pill icon={t.icon} label={t.label} count={t.count} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} />
            ))}
          </nav>

          {/* Right Main Content Panel */}
          <main className="min-h-0 flex-1 overflow-y-auto bg-background">
            <div className="w-full space-y-6 px-5 py-6 sm:px-8">
            {loadError ? <div role="alert" className="rounded-xl border border-danger/30 p-5"><p>{loadError}</p><Button variant="outline" onClick={() => void fetchDetails()}>Retry</Button></div> : loading ? (
              <div className="space-y-3" aria-busy="true" aria-label="Loading course details">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface-2/60" />
                ))}
              </div>
            ) : (
              <>
                {/* ---------- CURRICULUM ---------- */}
                {activeTab === "curriculum" && (
                  <div className="space-y-5">
                    <PanelHeader
                      title="Course Curriculum"
                      description="Organize chapters and upload video lectures with neural transcripts."
                    >
                      {modules.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<ChevronsUpDown aria-hidden="true" />}
                          onClick={() => setOpenModules(allOpen ? new Set() : new Set(modules.map((m) => m.id)))}
                          className="shrink-0"
                        >
                          {allOpen ? "Collapse all" : "Expand all"}
                        </Button>
                      )}
                      <Button
                        size="md"
                        leftIcon={<Video className="h-4 w-4" aria-hidden="true" />}
                        onClick={() => onOpenVideoUpload(course.id)}
                        className="shrink-0 rounded-[14px]! px-4 shadow-xs"
                      >
                        Upload Video Chapter
                      </Button>
                    </PanelHeader>

                      {modules.length === 0 ? (
                        <WorkspaceEmpty icon={Layers} title="No chapters yet" description="Add a chapter to group lessons, or upload a video lecture to get started.">
                          <Button size="sm" variant="outline" onClick={() => setIsAddModuleOpen(true)}>
                            Add chapter
                          </Button>
                          <Button size="md" leftIcon={<Video className="h-4 w-4" aria-hidden="true" />} className="rounded-[14px]! px-4 shadow-xs" onClick={() => onOpenVideoUpload(course.id)}>
                            Upload Video Chapter
                          </Button>
                        </WorkspaceEmpty>
                      ) : (
                        <ol className="space-y-3">
                          {modules.map((m, mIdx) => {
                            const moduleLessons = lessons.filter((l) => l.module_id === m.id)
                            const isOpen = openModules.has(m.id)
                            return (
                              <li key={m.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
                                <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
                                  <button
                                    type="button"
                                    onClick={() => toggleModule(m.id)}
                                    aria-expanded={isOpen}
                                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
                                  >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-bold text-primary-text">
                                      {mIdx + 1}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-semibold text-foreground">{m.title}</span>
                                      <span className="block text-xs text-muted-foreground">
                                        {moduleLessons.length} {moduleLessons.length === 1 ? "lesson" : "lessons"} · {m.duration || "1 Hour"}
                                      </span>
                                    </span>
                                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                                  </button>

                                  <div className="flex shrink-0 items-center gap-0.5">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="hidden sm:inline-flex"
                                      leftIcon={<Plus aria-hidden="true" />}
                                      onClick={() => {
                                        setTargetModuleId(m.id)
                                        setIsAddLessonOpen(true)
                                        setOpenModules((prev) => new Set(prev).add(m.id))
                                      }}
                                    >
                                      Lesson
                                    </Button>
                                    <Button
                                      size="icon-sm"
                                      variant="ghost"
                                      aria-label={`Upload video to ${m.title}`}
                                      title="Upload video"
                                      onClick={() => onOpenVideoUpload(course.id, m.id)}
                                    >
                                      <Video aria-hidden="true" />
                                    </Button>
                                    <Button
                                      size="icon-sm"
                                      variant="ghost"
                                      aria-label={`Rename ${m.title}`}
                                      title="Edit chapter"
                                      onClick={() => {
                                        setEditingModule(m)
                                        setEditModTitle(m.title)
                                        setEditModDuration(m.duration)
                                      }}
                                    >
                                      <Edit2 aria-hidden="true" />
                                    </Button>
                                    <Button size="icon-sm" variant="ghost" aria-label={`Move ${m.title} earlier`} disabled={mIdx === 0} onClick={() => void moveContent("module", m.id, -1)}>↑</Button>
                                    <Button size="icon-sm" variant="ghost" aria-label={`Move ${m.title} later`} disabled={mIdx === modules.length-1} onClick={() => void moveContent("module", m.id, 1)}>↓</Button>
                                    <Button
                                      size="icon-sm"
                                      variant="ghost"
                                      aria-label={`Delete ${m.title}`}
                                      title="Delete chapter"
                                      className="text-danger hover:bg-danger/10 hover:text-danger"
                                      onClick={() => handleDeleteModule(m.id, m.title)}
                                    >
                                      <Trash2 aria-hidden="true" />
                                    </Button>
                                  </div>
                                </div>

                                {isOpen && (
                                  <div className="border-t border-border bg-surface-2/30">
                                    {moduleLessons.length === 0 ? (
                                      <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                                        <p className="text-xs text-muted-foreground">This chapter has no lessons yet.</p>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            leftIcon={<Plus aria-hidden="true" />}
                                            onClick={() => {
                                              setTargetModuleId(m.id)
                                              setIsAddLessonOpen(true)
                                            }}
                                          >
                                            Add lesson
                                          </Button>
                                          <Button size="sm" variant="outline" leftIcon={<Video aria-hidden="true" />} onClick={() => onOpenVideoUpload(course.id, m.id)}>
                                            Upload video
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <ul className="divide-y divide-border/60">
                                        {moduleLessons.map((l, lIdx) => {
                                          const playable = lessonHasPlayableVideo(l)
                                          return (
                                            <li key={l.id} className="group flex items-center gap-2 px-3 py-2 transition-colors hover:bg-surface-2/60 sm:px-4">
                                              <button
                                                type="button"
                                                onClick={() => handleLessonClick(l, m.title)}
                                                title={playable ? `Play ${l.title}` : `Open ${l.title}`}
                                                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-0.5 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 cursor-pointer"
                                              >
                                                <span className="w-5 shrink-0 text-center tabular-nums text-[11px] font-medium text-subtle-foreground">{lIdx + 1}</span>
                                                <span
                                                  className={cn(
                                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                                                    l.type === "video"
                                                      ? playable
                                                        ? "bg-primary-soft text-primary-text group-hover:bg-primary group-hover:text-primary-foreground"
                                                        : "bg-primary-soft text-primary-text"
                                                      : l.type === "lab"
                                                        ? "bg-warning-soft text-warning"
                                                        : "bg-info-soft text-info",
                                                  )}
                                                >
                                                  {l.type === "video" ? (
                                                    playable ? (
                                                      <>
                                                        <Video className="h-4 w-4 group-hover:hidden" aria-hidden="true" />
                                                        <Play className="hidden h-3.5 w-3.5 fill-current group-hover:block" aria-hidden="true" />
                                                      </>
                                                    ) : (
                                                      <Video className="h-4 w-4" aria-hidden="true" />
                                                    )
                                                  ) : l.type === "lab" ? (
                                                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                                                  ) : (
                                                    <FileText className="h-4 w-4" aria-hidden="true" />
                                                  )}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                  <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary-text">{l.title}</p>
                                                  <p className="text-xs text-muted-foreground">
                                                    {l.duration || `${l.minutes}m`} · <span className="capitalize">{l.type}</span>
                                                  </p>
                                                </div>
                                                {l.type === "video" &&
                                                  (playable ? (
                                                    <Badge tone="success" size="sm" dot className="hidden shrink-0 sm:inline-flex">
                                                      Video ready
                                                    </Badge>
                                                  ) : (
                                                    <Badge tone="warning" size="sm" className="hidden shrink-0 sm:inline-flex">
                                                      No video
                                                    </Badge>
                                                  ))}
                                              </button>
                                              <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                                <Button size="icon-sm" variant="ghost" aria-label={`Move ${l.title} earlier`} disabled={lIdx === 0} onClick={() => void moveContent("lesson", l.id, -1)}>↑</Button>
                                                <Button size="icon-sm" variant="ghost" aria-label={`Move ${l.title} later`} disabled={lIdx === moduleLessons.length-1} onClick={() => void moveContent("lesson", l.id, 1)}>↓</Button>
                                                <Button size="icon-sm" variant="ghost" aria-label={`Edit ${l.title}`} onClick={() => setEditingLesson(l)}>
                                                  <Edit2 aria-hidden="true" />
                                                </Button>
                                                <Button
                                                  size="icon-sm"
                                                  variant="ghost"
                                                  aria-label={`Delete ${l.title}`}
                                                  className="text-danger hover:bg-danger/10 hover:text-danger"
                                                  onClick={() => handleDeleteLesson(l.id, l.title)}
                                                >
                                                  <Trash2 aria-hidden="true" />
                                                </Button>
                                              </div>
                                            </li>
                                          )
                                        })}
                                      </ul>
                                    )}
                                  </div>
                                )}
                              </li>
                            )
                          })}
                        </ol>
                      )}

                      {modules.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsAddModuleOpen(true)}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary-border hover:bg-primary-soft/40 hover:text-primary-text"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          Add another chapter
                        </button>
                      )}
                    </div>
                  )}

                  {/* ---------- MATERIALS ---------- */}
                  {activeTab === "materials" && (
                    <div className="space-y-5">
                      <PanelHeader title="Materials" description="Slides, notebooks, datasets and reference PDFs available to enrolled learners.">
                        <Button size="sm" leftIcon={<Upload aria-hidden="true" />} onClick={() => setIsAddMaterialOpen(true)}>
                          Upload material
                        </Button>
                      </PanelHeader>

                      {materials.length === 0 ? (
                        <WorkspaceEmpty icon={FileText} title="No materials yet" description="Share slide decks, code notebooks or datasets with your learners.">
                          <Button size="sm" onClick={() => setIsAddMaterialOpen(true)}>
                            Upload material
                          </Button>
                        </WorkspaceEmpty>
                      ) : (
                        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {materials.map((mat) => {
                            const MatIcon = mat.type === "Code Notebook" ? FileCode : mat.type === "Dataset" ? Database : mat.type === "Slides" ? Presentation : FileText
                            const matTone =
                              mat.type === "Code Notebook"
                                ? "bg-success-soft text-success"
                                : mat.type === "Dataset"
                                  ? "bg-info-soft text-info"
                                  : mat.type === "Slides"
                                    ? "bg-warning-soft text-warning"
                                    : "bg-primary-soft text-primary-text"
                            return (
                              <li key={mat.id} className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs transition-colors hover:border-primary-border">
                                <div className="flex items-start gap-3">
                                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", matTone)}>
                                    <MatIcon className="h-5 w-5" aria-hidden="true" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{mat.title}</h3>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {mat.type} · <span className="tabular-nums">{mat.size}</span>
                                    </p>
                                  </div>
                                </div>
                                {mat.description && <p className="line-clamp-2 text-xs text-muted-foreground">{mat.description}</p>}
                                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                                  {mat.url ? (
                                    <a
                                      href={mat.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-text hover:underline"
                                    >
                                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                                      Download
                                    </a>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No file attached</span>
                                  )}
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={`Delete ${mat.title}`}
                                    className="text-danger hover:bg-danger/10 hover:text-danger"
                                    onClick={() => handleDeleteMaterial(mat.id, mat.title)}
                                  >
                                    <Trash2 aria-hidden="true" />
                                  </Button>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* ---------- ASSIGNMENTS ---------- */}
                  {activeTab === "assignments" && <AssessmentAuthoringPanel courseId={course.id} />}

                  {activeTab === "enrollment" && <SelfPacedOfferPanel courseId={course.id} title={course.title} onChanged={fetchDetails} />}
                  {activeTab === "settings" && (
                    <form onSubmit={handleSaveCourseSettings} className="space-y-5">
                      <PanelHeader title="Course settings" description="Catalog details, delivery format and pricing." />

                      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-xs">
                        <h3 className="text-sm font-semibold text-foreground">Basics</h3>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Course title</label>
                          <Input required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Domain category</label>
                            <CustomSelect value={editCategory} onChange={setEditCategory} options={[...CATEGORIES]} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Lead instructor</label>
                            <Input required value={editInstructor} onChange={(e) => setEditInstructor(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Overview</label>
                          <textarea
                            rows={4}
                            className="w-full rounded-md border border-border bg-surface p-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20"
                            placeholder="Prerequisites, syllabus topics and target outcomes for learners…"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        </div>
                      </section>

                      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-xs">
                        <h3 className="text-sm font-semibold text-foreground">Delivery & pricing</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Difficulty</label>
                            <CustomSelect value={editLevel} onChange={(val) => setEditLevel(val as any)} options={["Beginner", "Intermediate", "Advanced"]} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Duration</label>
                            <Input value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="e.g. 12 Weeks" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Status</label>
                            <CustomSelect value={editStatus} onChange={(val) => setEditStatus(val as AdminCourse["status"])} options={STATUSES} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Tuition fee (₹)</label>
                            <Input type="number" min={0} value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Seat capacity</label>
                            <Input type="number" min={10} value={editCapacity} onChange={(e) => setEditCapacity(Number(e.target.value))} />
                          </div>
                        </div>
                      </section>

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                          Close
                        </Button>
                        <Button type="submit">Save settings</Button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </DialogContent>

      {/* --- SUB-DIALOG 1: ADD CHAPTER (MODULE) --- */}
      <Dialog open={isAddModuleOpen} onOpenChange={setIsAddModuleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Chapter</DialogTitle>
            <DialogDescription>Create a modular chapter for lectures and lessons</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateModule} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Chapter Title</label>
              <Input
                required
                placeholder="e.g. Chapter 2: LangGraph Memory & Stateful Routing"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Expected Duration</label>
              <Input
                placeholder="e.g. 2 Hours"
                value={newModuleDuration}
                onChange={(e) => setNewModuleDuration(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddModuleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={savingModule}>
                Create Chapter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- SUB-DIALOG 2: EDIT CHAPTER --- */}
      <Dialog open={!!editingModule} onOpenChange={(open) => !open && setEditingModule(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Chapter</DialogTitle>
            <DialogDescription>Update chapter header and duration</DialogDescription>
          </DialogHeader>

          {editingModule && (
            <form onSubmit={handleUpdateModule} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Chapter Title</label>
                <Input
                  required
                  value={editModTitle}
                  onChange={(e) => setEditModTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Duration</label>
                <Input
                  value={editModDuration}
                  onChange={(e) => setEditModDuration(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingModule(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* --- SUB-DIALOG 3: ADD LESSON --- */}
      <Dialog open={isAddLessonOpen} onOpenChange={setIsAddLessonOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Lesson to Chapter</DialogTitle>
            <DialogDescription>Add a video, reading, or lab exercise to the chapter</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLesson} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Lesson Title</label>
              <Input
                required
                placeholder="e.g. 2.1 Graph State Checkpoints"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Lesson Type</label>
                <CustomSelect
                  value={newLessonType}
                  onChange={(val) => setNewLessonType(val as any)}
                  options={[
                    { value: "video", label: "Video Lecture" },
                    { value: "reading", label: "Reading / Article" },
                    { value: "lab", label: "Interactive Lab" },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Duration</label>
                <Input
                  placeholder="e.g. 25m"
                  value={newLessonDuration}
                  onChange={(e) => setNewLessonDuration(e.target.value)}
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">For video lessons, upload and process a file, then attach it to this lesson from Upload Video.</p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Lesson Overview / Summary</label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-border bg-surface p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Brief summary of concepts covered..."
                value={newLessonSummary}
                onChange={(e) => setNewLessonSummary(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddLessonOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={savingLesson}>
                Create Lesson
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- SUB-DIALOG 4: EDIT LESSON --- */}
      <Dialog open={!!editingLesson} onOpenChange={(open) => !open && setEditingLesson(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
            <DialogDescription>Modify lesson title, duration, video URL, or summary</DialogDescription>
          </DialogHeader>

          {editingLesson && (
            <form onSubmit={handleUpdateLesson} className="space-y-3.5 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Lesson Title</label>
                <Input
                  required
                  value={editingLesson.title}
                  onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Lesson Type</label>
                  <CustomSelect
                    value={editingLesson.type}
                    onChange={(val) => setEditingLesson({ ...editingLesson, type: val as any })}
                    options={[
                      { value: "video", label: "Video Lecture" },
                      { value: "reading", label: "Reading / Article" },
                      { value: "lab", label: "Interactive Lab" },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Duration</label>
                  <Input
                    value={editingLesson.duration}
                    onChange={(e) => setEditingLesson({ ...editingLesson, duration: e.target.value })}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">Use Upload Video to replace a video after processing. The previous asset and learner progress are retained.</p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Lesson Summary / Transcript</label>
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-border bg-surface p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={editingLesson.summary || ""}
                  onChange={(e) => setEditingLesson({ ...editingLesson, summary: e.target.value })}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingLesson(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Lesson</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* --- SUB-DIALOG 5: UPLOAD MATERIAL --- */}
      <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Course Material</DialogTitle>
            <DialogDescription>Attach lecture slides, PDFs, code files, or datasets</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadMaterial} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Material Title</label>
              <Input
                required
                placeholder="e.g. Lecture Slides - Agent Architecture"
                value={matTitle}
                onChange={(e) => setMatTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Resource Type</label>
              <CustomSelect
                value={matType}
                onChange={(val) => setMatType(val as any)}
                options={[
                  { value: "PDF", label: "PDF Document / Notes" },
                  { value: "Slides", label: "Presentation Slides" },
                  { value: "Code Notebook", label: "Code Notebook (IPYNB / ZIP)" },
                  { value: "Dataset", label: "Dataset (CSV / JSON / H5)" },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">File Attachment (Upload to R2)</label>
              <Input
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setMatFile(f)
                }}
              />
              <p className="text-[11px] text-muted-foreground">Supported: PDF, PPTX, IPYNB, ZIP, CSV, JSON</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">OR External Link (Google Drive / GitHub)</label>
              <Input
                placeholder="https://drive.google.com/... or https://github.com/..."
                value={matUrl}
                onChange={(e) => setMatUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-border bg-surface p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Instructions or overview of the material..."
                value={matDescription}
                onChange={(e) => setMatDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddMaterialOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={uploadingMat}>
                Upload Material
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- SUB-DIALOG 6: VIDEO LESSON PLAYER PREVIEW --- */}
      <Dialog open={!!previewingLesson} onOpenChange={(o) => !o && setPreviewingLesson(null)}>
        <DialogContent className="max-w-4xl gap-0 overflow-hidden border border-border bg-surface p-0">
          {previewingLesson && (() => {
            const { lesson, moduleTitle } = previewingLesson
            const embedUrl = toVideoEmbedUrl(lesson.video_url)
            return (
              <>
                <div className="border-b border-border bg-surface-2/60 px-5 py-3.5 pr-12">
                  <DialogTitle className="truncate text-base font-semibold text-foreground">{lesson.title}</DialogTitle>
                  <DialogDescription className="truncate text-xs text-muted-foreground">
                    {moduleTitle} · {lesson.duration || `${lesson.minutes}m`}
                  </DialogDescription>
                </div>
                <div className="bg-black p-3 sm:p-4">
                  {embedUrl ? (
                    <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
                      <iframe
                        src={embedUrl}
                        title={lesson.title}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <LessonPlayer
                      playbackEndpoint={`/admin/lessons/${encodeURIComponent(lesson.id)}/playback`}
                      lesson={{
                        id: lesson.id,
                        title: lesson.title,
                        duration: lesson.duration || `${lesson.minutes || 10}m`,
                        minutes: lesson.minutes,
                        type: lesson.type,
                        status: "In Progress",
                        summary: lesson.summary || "",
                        video_url: lesson.video_url || undefined,
                        video_qualities: lesson.video_qualities || undefined,
                      }}
                      moduleTitle={moduleTitle}
                      poster="/assets/course_genai.jpg"
                      completed={false}
                      onComplete={() => {}}
                      autoPlay
                    />
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
