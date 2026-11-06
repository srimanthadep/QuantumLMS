import { useState, useEffect } from "react"
import {
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
import { api } from "@/lib/api"
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-2/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text border border-primary-border">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-foreground">{course.title}</DialogTitle>
                <Badge variant="outline" className="text-xs">
                  {course.category}
                </Badge>
                <Badge
                  variant={course.status === "Published" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {course.status}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Manage video chapters, materials, assignments, and curriculum architecture
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border px-6 bg-surface">
          <button
            type="button"
            onClick={() => setActiveTab("curriculum")}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
              activeTab === "curriculum"
                ? "border-primary text-primary-text"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            Chapters & Videos ({modules.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("materials")}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
              activeTab === "materials"
                ? "border-primary text-primary-text"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            Materials ({materials.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assignments")}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
              activeTab === "assignments"
                ? "border-primary text-primary-text"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Assignments ({assignmentsList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
              activeTab === "settings"
                ? "border-primary text-primary-text"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Edit2 className="h-4 w-4" />
            Course Settings
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-sm">Loading course details...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: CURRICULUM (CHAPTERS & VIDEO LESSONS) */}
              {activeTab === "curriculum" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Course Curriculum</h3>
                      <p className="text-xs text-muted-foreground">
                        Organize chapters and upload video lectures with neural transcripts.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Plus className="h-4 w-4" />}
                        onClick={() => setIsAddModuleOpen(true)}
                      >
                        New Chapter
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={<Video className="h-4 w-4" />}
                        onClick={() => onOpenVideoUpload(course.id)}
                      >
                        Upload Video Chapter
                      </Button>
                    </div>
                  </div>

                  {modules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-12 text-center bg-surface-2/30">
                      <Layers className="h-10 w-10 text-muted-foreground mb-3" />
                      <h4 className="text-sm font-semibold text-foreground">No chapters in this course yet</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                        Add your first chapter or upload a video lecture to automatically generate multi-quality streaming and synchronized transcripts.
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setIsAddModuleOpen(true)}>
                          Add Chapter
                        </Button>
                        <Button size="sm" onClick={() => onOpenVideoUpload(course.id)}>
                          Upload Video Lecture
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {modules.map((m, mIdx) => {
                        const moduleLessons = lessons.filter((l) => l.module_id === m.id)
                        return (
                          <div
                            key={m.id}
                            className="rounded-xl border border-border bg-surface-2/40 overflow-hidden shadow-xs"
                          >
                            {/* Chapter Bar */}
                            <div className="flex items-center justify-between px-4 py-3 bg-surface-2 border-b border-border/60">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-soft text-primary-text text-xs font-bold">
                                  {mIdx + 1}
                                </span>
                                <div>
                                  <h4 className="text-sm font-bold text-foreground">{m.title}</h4>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{moduleLessons.length} lessons</span>
                                    <span>·</span>
                                    <span>{m.duration || "1 Hour"}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setTargetModuleId(m.id)
                                    setIsAddLessonOpen(true)
                                  }}
                                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                                  className="h-7 text-xs"
                                >
                                  Add Lesson
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onOpenVideoUpload(course.id, m.id)}
                                  leftIcon={<Video className="h-3.5 w-3.5 text-primary" />}
                                  className="h-7 text-xs"
                                >
                                  Upload Video
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingModule(m)
                                    setEditModTitle(m.title)
                                    setEditModDuration(m.duration)
                                  }}
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteModule(m.id, m.title)}
                                  className="h-7 px-2 text-xs text-danger hover:text-danger hover:bg-danger/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Lessons List within Chapter */}
                            <div className="divide-y divide-border/50">
                              {moduleLessons.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                  No lessons in this chapter yet. Click "Add Lesson" or "Upload Video".
                                </div>
                              ) : (
                                moduleLessons.map((l) => (
                                  <div
                                    key={l.id}
                                    className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-3/40 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-muted-foreground">
                                        {l.type === "video" ? (
                                          <Video className="h-3.5 w-3.5 text-primary-text" />
                                        ) : l.type === "lab" ? (
                                          <Sparkles className="h-3.5 w-3.5 text-warning" />
                                        ) : (
                                          <FileText className="h-3.5 w-3.5 text-foreground" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-semibold text-foreground truncate">
                                            {l.title}
                                          </span>
                                          {l.video_url && (
                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-primary-soft text-primary-text">
                                              Video Ready
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                          {l.duration || `${l.minutes}m`} · {l.type.toUpperCase()}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingLesson(l)}
                                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteLesson(l.id, l.title)}
                                        className="h-7 px-2 text-xs text-danger hover:text-danger hover:bg-danger/10"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: COURSE MATERIALS */}
              {activeTab === "materials" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Course Materials & Downloads</h3>
                      <p className="text-xs text-muted-foreground">
                        Upload lecture slides, research papers, Jupyter notebooks, and datasets.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      leftIcon={<Upload className="h-4 w-4" />}
                      onClick={() => setIsAddMaterialOpen(true)}
                    >
                      Upload Material
                    </Button>
                  </div>

                  {materials.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-12 text-center bg-surface-2/30">
                      <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                      <h4 className="text-sm font-semibold text-foreground">No course materials uploaded yet</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                        Share slide decks, code repositories, reference PDFs, or sample datasets with enrolled learners.
                      </p>
                      <Button size="sm" onClick={() => setIsAddMaterialOpen(true)}>
                        Upload Material
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {materials.map((mat) => {
                        const IconComponent =
                          mat.type === "Code Notebook"
                            ? FileCode
                            : mat.type === "Dataset"
                            ? Database
                            : mat.type === "Slides"
                            ? Presentation
                            : FileText

                        return (
                          <div
                            key={mat.id}
                            className="flex flex-col justify-between rounded-xl border border-border bg-surface-2/40 p-4 hover:border-primary-border transition-colors shadow-xs"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-primary">
                                    <IconComponent className="h-4 w-4" />
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {mat.type}
                                  </Badge>
                                </div>
                                <span className="text-xs font-mono text-muted-foreground">{mat.size}</span>
                              </div>

                              <div>
                                <h4 className="text-sm font-bold text-foreground leading-snug">{mat.title}</h4>
                                {mat.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                    {mat.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-3">
                              {mat.url ? (
                                <a
                                  href={mat.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-text hover:underline"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Download File
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">Resource Link</span>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteMaterial(mat.id, mat.title)}
                                className="h-7 px-2 text-xs text-danger hover:text-danger hover:bg-danger/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ASSIGNMENTS */}
              {activeTab === "assignments" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Course Assignments</h3>
                      <p className="text-xs text-muted-foreground">
                        Create graded milestones, deadlines, and project submissions for learners.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => {
                        setEditingAssignment(null)
                        setAssignTitle("")
                        setAssignDesc("")
                        setAssignMarks(100)
                        setAssignPriority("Normal")
                        setIsAddAssignmentOpen(true)
                      }}
                    >
                      New Assignment
                    </Button>
                  </div>

                  {assignmentsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-12 text-center bg-surface-2/30">
                      <GraduationCap className="h-10 w-10 text-muted-foreground mb-3" />
                      <h4 className="text-sm font-semibold text-foreground">No assignments created yet</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                        Add hands-on assignments to evaluate learner knowledge and grant course certificates.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingAssignment(null)
                          setIsAddAssignmentOpen(true)
                        }}
                      >
                        Create Assignment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assignmentsList.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 p-4 hover:border-primary-border transition-colors shadow-xs"
                        >
                          <div className="space-y-1 min-w-0 flex-1 pr-4">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-foreground">{a.title}</h4>
                              <Badge
                                variant={
                                  a.priority === "High"
                                    ? "destructive"
                                    : a.priority === "Medium"
                                    ? "default"
                                    : "outline"
                                }
                                className="text-[10px] py-0 px-1.5 h-4"
                              >
                                {a.priority} Priority
                              </Badge>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                {a.max_marks} pts
                              </Badge>
                            </div>
                            {a.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Due {new Date(a.due_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingAssignment(a)
                                setAssignTitle(a.title)
                                setAssignDesc(a.description || "")
                                setAssignMarks(a.max_marks)
                                setAssignPriority(a.priority)
                                setAssignDueDate(new Date(a.due_at).toISOString().split("T")[0])
                                setIsAddAssignmentOpen(true)
                              }}
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteAssignment(a.id, a.title)}
                              className="h-8 px-2 text-xs text-danger hover:text-danger hover:bg-danger/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: COURSE DETAILS & SETTINGS */}
              {activeTab === "settings" && (
                <form onSubmit={handleSaveCourseSettings} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Course Title</label>
                    <Input required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Domain Category</label>
                      <CustomSelect
                        value={editCategory}
                        onChange={setEditCategory}
                        options={[
                          "LLM Engineering",
                          "Agentic Systems",
                          "MLOps",
                          "Computer Vision",
                          "AI Foundations",
                        ]}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Lead Instructor</label>
                      <Input required value={editInstructor} onChange={(e) => setEditInstructor(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Difficulty Level</label>
                      <CustomSelect
                        value={editLevel}
                        onChange={(val) => setEditLevel(val as any)}
                        options={["Beginner", "Intermediate", "Advanced"]}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Tuition Fee (₹)</label>
                      <Input
                        type="number"
                        min={0}
                        value={editPrice}
                        onChange={(e) => setEditPrice(Number(e.target.value))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Seat Capacity</label>
                      <Input
                        type="number"
                        min={10}
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Course Overview / Description</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-md border border-border bg-surface p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Explain prerequisites, syllabus topics, and target outcomes for learners..."
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit">Save Course Settings</Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3.5 bg-surface-2/40">
          <span className="text-xs text-muted-foreground">Course ID: {course.id}</span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
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
