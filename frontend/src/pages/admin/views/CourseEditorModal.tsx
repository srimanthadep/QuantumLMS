import { useState, useEffect } from "react"
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Video,
  FileText,
  Upload,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  File,
  Download,
  ExternalLink,
  Sparkles,
  Layers,
  GraduationCap,
  X,
  FileCode,
  Database,
  Presentation,
  Check,
  ChevronRight,
  Loader2,
  ChevronDown,
  ChevronsUpDown,
  Settings2,
  Star,
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
import { DatePicker } from "@/components/ui/date-picker"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { formatINR, seatPercent, themeFor, CATEGORIES, STATUSES } from "./courses/courseTheme"
import { NavItem, PanelHeader, WorkspaceEmpty, dueInfo } from "./courses/WorkspaceParts"
import type { AdminCourse } from "@/data/adminStore"

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

interface AssignmentItem {
  id: string
  course_id: string
  title: string
  description: string
  max_marks: number
  priority: "High" | "Medium" | "Normal"
  due_at: string
}

interface CourseEditorModalProps {
  course: AdminCourse | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCourseUpdated: (course: AdminCourse) => void
  onOpenVideoUpload: (courseId: string, moduleId?: string) => void
  onToast: (msg: string) => void
}

type EditorTab = "curriculum" | "materials" | "assignments" | "settings"

export default function CourseEditorModal({
  course,
  open,
  onOpenChange,
  onCourseUpdated,
  onOpenVideoUpload,
  onToast,
}: CourseEditorModalProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("curriculum")
  const [loading, setLoading] = useState(false)
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())

  // Remote data
  const [modules, setModules] = useState<CourseModuleItem[]>([])
  const [lessons, setLessons] = useState<LessonRowItem[]>([])
  const [materials, setMaterials] = useState<MaterialItem[]>([])
  const [assignmentsList, setAssignmentsList] = useState<AssignmentItem[]>([])

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
  const [newLessonUrl, setNewLessonUrl] = useState("")
  const [newLessonSummary, setNewLessonSummary] = useState("")
  const [savingLesson, setSavingLesson] = useState(false)

  // Edit Lesson State
  const [editingLesson, setEditingLesson] = useState<LessonRowItem | null>(null)

  // Upload Material State
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false)
  const [matTitle, setMatTitle] = useState("")
  const [matType, setMatType] = useState<"PDF" | "Code Notebook" | "Dataset" | "Slides">("PDF")
  const [matDescription, setMatDescription] = useState("")
  const [matUrl, setMatUrl] = useState("")
  const [matFile, setMatFile] = useState<File | null>(null)
  const [uploadingMat, setUploadingMat] = useState(false)

  // Create Assignment State
  const [isAddAssignmentOpen, setIsAddAssignmentOpen] = useState(false)
  const [assignTitle, setAssignTitle] = useState("")
  const [assignDesc, setAssignDesc] = useState("")
  const [assignMarks, setAssignMarks] = useState(100)
  const [assignPriority, setAssignPriority] = useState<"High" | "Medium" | "Normal">("Normal")
  const [assignDueDate, setAssignDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split("T")[0]
  })
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null)

  // Fetch full details whenever modal opens or course changes
  const fetchDetails = async () => {
    if (!course) return
    setLoading(true)
    try {
      const res = await api.get<{
        course: any
        modules: CourseModuleItem[]
        lessons: LessonRowItem[]
        materials?: MaterialItem[]
        assignments?: AssignmentItem[]
      }>(`/admin/courses/${course.id}`)

      setModules(res.modules || [])
      setOpenModules(new Set((res.modules || []).map((m) => m.id)))
      setLessons(res.lessons || [])
      setMaterials(res.materials || [])
      setAssignmentsList(res.assignments || [])

      if (res.course) {
        setEditTitle(res.course.title || course.title)
        setEditCategory(res.course.category || course.category)
        setEditInstructor(res.course.instructor || course.instructor)
        setEditPrice(res.course.price ?? course.price)
        setEditCapacity(res.course.capacity ?? course.capacity)
        setEditLevel(res.course.level || "Intermediate")
        setEditDuration(res.course.duration || "12 Weeks")
        setEditStatus(course.status || "Published")
        setEditDescription(res.course.description || "")
      }
    } catch (err: any) {
      console.warn("Could not fetch detailed course curriculum:", err)
      onToast("Note: Showing current cached curriculum.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && course) {
      setActiveTab("curriculum")
      fetchDetails()
    }
  }, [open, course?.id])

  if (!course) return null

  // 1. Chapter / Module Handlers
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newModuleTitle.trim()) return
    setSavingModule(true)
    try {
      const res = await api.post<{ ok: boolean; module: CourseModuleItem }>(`/admin/courses/${course.id}/modules`, {
        title: newModuleTitle.trim(),
        duration: newModuleDuration.trim() || "1 Hour",
      })
      if (res.module) {
        setModules((prev) => [...prev, res.module])
        setOpenModules((prev) => new Set(prev).add(res.module.id))
        onToast(`Added chapter "${res.module.title}"`)
        setIsAddModuleOpen(false)
        setNewModuleTitle("")
      }
    } catch (err: any) {
      onToast(`Failed to add chapter: ${err.message}`)
    } finally {
      setSavingModule(false)
    }
  }

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingModule || !editModTitle.trim()) return
    try {
      const res = await api.patch<{ ok: boolean; module: CourseModuleItem }>(
        `/admin/courses/${course.id}/modules/${editingModule.id}`,
        {
          title: editModTitle.trim(),
          duration: editModDuration.trim() || editingModule.duration,
        }
      )
      if (res.module) {
        setModules((prev) => prev.map((m) => (m.id === editingModule.id ? res.module : m)))
        onToast(`Updated chapter "${res.module.title}"`)
        setEditingModule(null)
      }
    } catch (err: any) {
      onToast(`Failed to update chapter: ${err.message}`)
    }
  }

  const handleDeleteModule = async (moduleId: string, moduleTitle: string) => {
    if (!window.confirm(`Delete "${moduleTitle}" and all its lessons? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/courses/${course.id}/modules/${moduleId}`)
      setModules((prev) => prev.filter((m) => m.id !== moduleId))
      setLessons((prev) => prev.filter((l) => l.module_id !== moduleId))
      onToast(`Deleted chapter "${moduleTitle}"`)
    } catch (err: any) {
      onToast(`Failed to delete chapter: ${err.message}`)
    }
  }

  // 2. Lesson Handlers
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetModuleId || !newLessonTitle.trim()) return
    setSavingLesson(true)
    try {
      const mins = parseInt(newLessonDuration.replace(/\D/g, ""), 10) || 15
      const res = await api.post<{ ok: boolean; lesson: LessonRowItem }>(`/admin/courses/${course.id}/lessons`, {
        moduleId: targetModuleId,
        title: newLessonTitle.trim(),
        type: newLessonType,
        duration: newLessonDuration.trim() || `${mins}m`,
        minutes: mins,
        videoUrl: newLessonUrl.trim() || undefined,
        summary: newLessonSummary.trim(),
      })
      if (res.lesson) {
        setLessons((prev) => [...prev, res.lesson])
        onToast(`Added lesson "${res.lesson.title}"`)
        setIsAddLessonOpen(false)
        setNewLessonTitle("")
        setNewLessonUrl("")
        setNewLessonSummary("")
      }
    } catch (err: any) {
      onToast(`Failed to add lesson: ${err.message}`)
    } finally {
      setSavingLesson(false)
    }
  }

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLesson || !editingLesson.title.trim()) return
    try {
      const mins = parseInt(editingLesson.duration.replace(/\D/g, ""), 10) || 15
      const res = await api.patch<{ ok: boolean; lesson: LessonRowItem }>(
        `/admin/courses/${course.id}/lessons/${editingLesson.id}`,
        {
          title: editingLesson.title.trim(),
          type: editingLesson.type,
          duration: editingLesson.duration.trim() || `${mins}m`,
          minutes: mins,
          videoUrl: editingLesson.video_url || undefined,
          summary: editingLesson.summary,
        }
      )
      if (res.lesson) {
        setLessons((prev) => prev.map((l) => (l.id === editingLesson.id ? res.lesson : l)))
        onToast(`Updated lesson "${res.lesson.title}"`)
        setEditingLesson(null)
      }
    } catch (err: any) {
      onToast(`Failed to update lesson: ${err.message}`)
    }
  }

  const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
    if (!window.confirm(`Delete lesson "${lessonTitle}"?`)) return
    try {
      await api.delete(`/admin/courses/${course.id}/lessons/${lessonId}`)
      setLessons((prev) => prev.filter((l) => l.id !== lessonId))
      onToast(`Deleted lesson "${lessonTitle}"`)
    } catch (err: any) {
      onToast(`Failed to delete lesson: ${err.message}`)
    }
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

  // 4. Assignments Handlers
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignTitle.trim()) return
    setSavingAssignment(true)

    try {
      if (editingAssignment) {
        const res = await api.patch<{ ok: boolean; assignment: AssignmentItem }>(
          `/admin/courses/${course.id}/assignments/${editingAssignment.id}`,
          {
            title: assignTitle.trim(),
            description: assignDesc.trim(),
            maxMarks: Number(assignMarks),
            priority: assignPriority,
            dueAt: new Date(assignDueDate).toISOString(),
          }
        )
        if (res.assignment) {
          setAssignmentsList((prev) => prev.map((a) => (a.id === editingAssignment.id ? res.assignment : a)))
          onToast(`Updated assignment "${res.assignment.title}"`)
          setEditingAssignment(null)
        }
      } else {
        const res = await api.post<{ ok: boolean; assignment: AssignmentItem }>(
          `/admin/courses/${course.id}/assignments`,
          {
            title: assignTitle.trim(),
            description: assignDesc.trim(),
            maxMarks: Number(assignMarks),
            priority: assignPriority,
            dueAt: new Date(assignDueDate).toISOString(),
          }
        )
        if (res.assignment) {
          setAssignmentsList((prev) => [...prev, res.assignment])
          onToast(`Created assignment: "${res.assignment.title}"`)
          setIsAddAssignmentOpen(false)
          setAssignTitle("")
          setAssignDesc("")
        }
      }
    } catch (err: any) {
      onToast(`Failed to save assignment: ${err.message}`)
    } finally {
      setSavingAssignment(false)
    }
  }

  const handleDeleteAssignment = async (assignId: string, assignTitleStr: string) => {
    if (!window.confirm(`Delete assignment "${assignTitleStr}"?`)) return
    try {
      await api.delete(`/admin/courses/${course.id}/assignments/${assignId}`)
      setAssignmentsList((prev) => prev.filter((a) => a.id !== assignId))
      onToast(`Deleted assignment "${assignTitleStr}"`)
    } catch (err: any) {
      onToast(`Failed to delete assignment: ${err.message}`)
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
    { id: "curriculum", label: "Curriculum", icon: Layers, count: modules.length },
    { id: "materials", label: "Materials", icon: FileText, count: materials.length },
    { id: "assignments", label: "Assignments", icon: GraduationCap, count: assignmentsList.length },
    { id: "settings", label: "Settings", icon: Settings2 },
  ]

  const statusDot = course.status === "Published" ? "bg-emerald-300" : course.status === "Draft" ? "bg-amber-300" : "bg-slate-300"

  const openNewAssignment = () => {
    setEditingAssignment(null)
    setAssignTitle("")
    setAssignDesc("")
    setAssignMarks(100)
    setAssignPriority("Normal")
    setIsAddAssignmentOpen(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        containerClassName="p-0 sm:p-0"
        className="w-screen h-dvh max-w-none max-h-dvh flex flex-col p-0 gap-0 overflow-hidden rounded-none sm:rounded-none border-0 bg-background text-foreground shadow-none"
      >
        {/* ===== Hero header ===== */}
        <header className={cn("relative shrink-0 overflow-hidden bg-gradient-to-br text-white", gradient)}>
          <CourseIcon className="pointer-events-none absolute -right-6 -top-8 h-56 w-56 rotate-[-10deg] text-white/10" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" aria-hidden="true" />
          <div className="relative px-4 py-4 sm:px-8 sm:py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-medium">
                  <Button variant="glass" size="sm" onClick={() => onOpenChange(false)} leftIcon={<ArrowLeft aria-hidden="true" />}>
                    Back to courses
                  </Button>
                  <span className="rounded-full bg-white/20 px-2.5 py-1 backdrop-blur">{course.category}</span>
                  <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur">
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} aria-hidden="true" />
                    {course.status}
                  </span>
                </div>
                <DialogTitle className="mt-3 truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">{course.title}</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-white/80">
                  Led by {course.instructor}. Build the curriculum, attach materials and set assignments.
                </DialogDescription>
              </div>

              <dl className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Chapters", value: String(modules.length) },
                  { label: "Lessons", value: String(lessons.length) },
                  { label: "Runtime", value: runtimeLabel },
                  { label: "Videos ready", value: `${videosReady}/${videoLessons.length}` },
                ].map((s) => (
                  <div key={s.label} className="min-w-[96px] rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/70">{s.label}</dt>
                    <dd className="text-lg font-bold tabular-nums">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </header>

        {/* ===== Body: sidebar + panel ===== */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Desktop sidebar */}
          <aside className="hidden w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-surface p-4 lg:flex">
            <nav aria-label="Workspace sections" className="flex flex-col gap-1">
              {tabs.map((t) => (
                <NavItem key={t.id} icon={t.icon} label={t.label} count={t.count} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} />
              ))}
            </nav>

            <div className="space-y-3 rounded-2xl border border-border bg-surface-2/50 p-4">
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
              <p className="truncate border-t border-border pt-3 text-[11px] tabular-nums text-subtle-foreground" title={course.id}>
                ID · {course.id}
              </p>
            </div>
          </aside>

          {/* Mobile section pills */}
          <nav aria-label="Workspace sections" className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-2 lg:hidden">
            {tabs.map((t) => (
              <NavItem key={t.id} pill icon={t.icon} label={t.label} count={t.count} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} />
            ))}
          </nav>

          {/* Panel */}
          <main className="min-h-0 flex-1 overflow-y-auto bg-background">
            <div className="w-full space-y-5 px-5 py-6 sm:px-8">
              {loading ? (
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
                      <PanelHeader title="Curriculum" description="Organise chapters and lessons. Upload video lectures to get transcripts and multi-quality streaming.">
                        {modules.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<ChevronsUpDown aria-hidden="true" />}
                            onClick={() => setOpenModules(allOpen ? new Set() : new Set(modules.map((m) => m.id)))}
                          >
                            {allOpen ? "Collapse all" : "Expand all"}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" leftIcon={<Plus aria-hidden="true" />} onClick={() => setIsAddModuleOpen(true)}>
                          New chapter
                        </Button>
                        <Button size="sm" leftIcon={<Video aria-hidden="true" />} onClick={() => onOpenVideoUpload(course.id)}>
                          Upload video
                        </Button>
                      </PanelHeader>

                      {modules.length === 0 ? (
                        <WorkspaceEmpty icon={Layers} title="No chapters yet" description="Add a chapter to group lessons, or upload a video lecture to get started.">
                          <Button size="sm" variant="outline" onClick={() => setIsAddModuleOpen(true)}>
                            Add chapter
                          </Button>
                          <Button size="sm" onClick={() => onOpenVideoUpload(course.id)}>
                            Upload video lecture
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
                                        {moduleLessons.map((l, lIdx) => (
                                          <li key={l.id} className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2/60 sm:px-4">
                                            <span className="w-5 shrink-0 text-center tabular-nums text-[11px] font-medium text-subtle-foreground">{lIdx + 1}</span>
                                            <span
                                              className={cn(
                                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                                l.type === "video" ? "bg-primary-soft text-primary-text" : l.type === "lab" ? "bg-warning-soft text-warning" : "bg-info-soft text-info",
                                              )}
                                            >
                                              {l.type === "video" ? <Video className="h-4 w-4" aria-hidden="true" /> : l.type === "lab" ? <Sparkles className="h-4 w-4" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                              <p className="truncate text-sm font-medium text-foreground">{l.title}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {l.duration || `${l.minutes}m`} · <span className="capitalize">{l.type}</span>
                                              </p>
                                            </div>
                                            {l.type === "video" &&
                                              (l.video_url ? (
                                                <Badge tone="success" size="sm" dot className="hidden sm:inline-flex">
                                                  Video ready
                                                </Badge>
                                              ) : (
                                                <Badge tone="warning" size="sm" className="hidden sm:inline-flex">
                                                  No video
                                                </Badge>
                                              ))}
                                            <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
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
                                        ))}
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
                  {activeTab === "assignments" && (
                    <div className="space-y-5">
                      <PanelHeader title="Assignments" description="Graded milestones, deadlines and project submissions.">
                        <Button size="sm" leftIcon={<Plus aria-hidden="true" />} onClick={openNewAssignment}>
                          New assignment
                        </Button>
                      </PanelHeader>

                      {assignmentsList.length === 0 ? (
                        <WorkspaceEmpty icon={GraduationCap} title="No assignments yet" description="Add hands-on assignments to assess learners and unlock certificates.">
                          <Button size="sm" onClick={openNewAssignment}>
                            Create assignment
                          </Button>
                        </WorkspaceEmpty>
                      ) : (
                        <ul className="space-y-3">
                          {assignmentsList.map((a) => {
                            const due = dueInfo(a.due_at)
                            return (
                              <li key={a.id} className="flex overflow-hidden rounded-2xl border border-border bg-surface shadow-xs transition-colors hover:border-primary-border">
                                <span
                                  className={cn("w-1.5 shrink-0", a.priority === "High" ? "bg-danger" : a.priority === "Medium" ? "bg-warning" : "bg-border-strong")}
                                  aria-hidden="true"
                                />
                                <div className="flex min-w-0 flex-1 items-start gap-3 p-4">
                                  <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                                      <Badge tone={a.priority === "High" ? "danger" : a.priority === "Medium" ? "warning" : "neutral"} size="sm">
                                        {a.priority}
                                      </Badge>
                                      <Badge tone="primary" size="sm">
                                        {a.max_marks} pts
                                      </Badge>
                                    </div>
                                    {a.description && <p className="line-clamp-2 text-xs text-muted-foreground">{a.description}</p>}
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                                        {new Date(a.due_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                      </span>
                                      <Badge tone={due.tone} size="sm">
                                        {due.label}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-0.5">
                                    <Button
                                      size="icon-sm"
                                      variant="ghost"
                                      aria-label={`Edit ${a.title}`}
                                      onClick={() => {
                                        setEditingAssignment(a)
                                        setAssignTitle(a.title)
                                        setAssignDesc(a.description || "")
                                        setAssignMarks(a.max_marks)
                                        setAssignPriority(a.priority)
                                        setAssignDueDate(new Date(a.due_at).toISOString().split("T")[0])
                                        setIsAddAssignmentOpen(true)
                                      }}
                                    >
                                      <Edit2 aria-hidden="true" />
                                    </Button>
                                    <Button
                                      size="icon-sm"
                                      variant="ghost"
                                      aria-label={`Delete ${a.title}`}
                                      className="text-danger hover:bg-danger/10 hover:text-danger"
                                      onClick={() => handleDeleteAssignment(a.id, a.title)}
                                    >
                                      <Trash2 aria-hidden="true" />
                                    </Button>
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* ---------- SETTINGS ---------- */}
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Video Stream URL (Optional)</label>
              <Input
                placeholder="https://... or /api/files/videos/..."
                value={newLessonUrl}
                onChange={(e) => setNewLessonUrl(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Tip: You can also use "Upload Video" from the chapter menu to auto-extract neural transcripts and transcode 1080p.
              </p>
            </div>

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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Video Stream URL</label>
                <Input
                  value={editingLesson.video_url || ""}
                  onChange={(e) => setEditingLesson({ ...editingLesson, video_url: e.target.value })}
                />
              </div>

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

      {/* --- SUB-DIALOG 6: CREATE / EDIT ASSIGNMENT --- */}
      <Dialog
        open={isAddAssignmentOpen || !!editingAssignment}
        onOpenChange={(o) => {
          if (!o) {
            setIsAddAssignmentOpen(false)
            setEditingAssignment(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? "Edit Assignment" : "New Course Assignment"}</DialogTitle>
            <DialogDescription>Set grading criteria, instructions, and deadline</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAssignment} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Assignment Title</label>
              <Input
                required
                placeholder="e.g. Capstone: Production Agent Supervisor"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Max Marks / Score</label>
                <Input
                  type="number"
                  min={10}
                  max={1000}
                  value={assignMarks}
                  onChange={(e) => setAssignMarks(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Priority</label>
                <CustomSelect
                  value={assignPriority}
                  onChange={(val) => setAssignPriority(val as any)}
                  options={["Normal", "Medium", "High"]}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Submission Deadline</label>
              <DatePicker
                required
                value={assignDueDate}
                onChange={setAssignDueDate}
                placeholder="Select submission deadline"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Instructions & Rubric</label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-border bg-surface p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Describe project requirements, test cases, and delivery expectations..."
                value={assignDesc}
                onChange={(e) => setAssignDesc(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddAssignmentOpen(false)
                  setEditingAssignment(null)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={savingAssignment}>
                {editingAssignment ? "Save Assignment" : "Publish Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
