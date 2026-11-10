import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpenText,
  CalendarPlus,
  Check,
  ChevronDown,
  ClipboardCheck,
  Code2,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Flag,
  FolderArchive,
  Headphones,
  ListChecks,
  MessageCircleQuestion,
  Paperclip,
  PenLine,
  PlayCircle,
  Plus,
  Presentation,
  Radio,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Video,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Field,
  Input,
  DatePicker,
  PageHeader,
  Progress,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  type BadgeTone,
} from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import CourseCover from "@/components/shared/CourseCover"
import DateTile from "@/components/student/DateTile"
import GradingSheet from "@/components/teacher/GradingSheet"
import IconTile from "@/components/teacher/IconTile"
import ScheduleSessionDialog from "@/components/teacher/ScheduleSessionDialog"
import StudentDrawer from "@/components/teacher/StudentDrawer"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import type { CourseItem, CourseModuleItem, LessonItem, LessonMaterial, ModuleAssignmentItem, StudentItem } from "@/types"
import { assignmentKey, useTeacherData } from "../teacherStore"
import { courseArt, dayLabel, DEMO_DATE, DOUBT_PRIORITY_TONE, DOUBT_STATUS_TONE, formatTimeRange, monthDay, SESSION_STATUS_TONE, STUDENT_STATUS_TONE } from "../teacherUtils"

type Tab = "curriculum" | "assignments" | "learners" | "classes" | "doubts"
const TABS: Tab[] = ["curriculum", "assignments", "learners", "classes", "doubts"]

const LESSON_ICON: Record<LessonItem["type"], LucideIcon> = {
  "Video Lecture": Video,
  "Interactive Lab": FlaskConical,
  "Hands-on Exercise": Wrench,
  "Reading & Theory": BookOpenText,
  "PDF Document": FileText,
  "Audio Lecture": Headphones,
}
const LESSON_TYPES = Object.keys(LESSON_ICON) as LessonItem["type"][]

const MATERIAL_ICON: Record<LessonMaterial["type"], LucideIcon> = {
  Document: FileText,
  PDF: FileText,
  "Video Lecture": PlayCircle,
  "Lab Worksheet": FlaskConical,
  "Slide Deck": Presentation,
  Audio: Headphones,
  External: ExternalLink,
}

const ASSIGNMENT_ICON: Record<ModuleAssignmentItem["type"], LucideIcon> = {
  "Written Assignment": PenLine,
  "Coding Lab": Code2,
  "Quiz Assessment": ListChecks,
  "Project Milestone": Flag,
}
const ASSIGNMENT_TONE: Record<ModuleAssignmentItem["status"], BadgeTone> = { Assigned: "info", "In Review": "warning", Graded: "success", Closed: "neutral" }

function AddModuleDialog({ open, onOpenChange, course }: { open: boolean; onOpenChange: (o: boolean) => void; course: CourseItem }) {
  const { addModule, notify } = useTeacherData()
  const [title, setTitle] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) {
      setTitle("")
      setError(null)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (title.trim().length < 3) return setError("Give the module a title of at least 3 characters.")
            addModule(course.id, title.trim())
            notify(`Added module “${title.trim()}” to ${course.code}`)
            onOpenChange(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a module</DialogTitle>
            <DialogDescription>It goes to the end of the curriculum. You can reorder modules afterwards.</DialogDescription>
          </DialogHeader>
          <Field label="Module title" required error={error}>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Neural networks with paper and pencil" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" leftIcon={<Plus aria-hidden="true" />}>
              Add module
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface PreviewMaterialItem {
  id?: string
  title: string
  type: string
  sizeOrDuration?: string
  url?: string
  approvalStatus?: string
}

function MaterialPreviewDialog({
  material,
  open,
  onOpenChange,
  onToast,
}: {
  material: PreviewMaterialItem | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onToast: (msg: string) => void
}) {
  if (!material) return null

  const handleDownload = () => {
    const content = `QuantumLMS Resource: ${material.title}\nCategory: ${material.type}\nStatus: ${material.approvalStatus || "Approved"}\nSize: ${material.sizeOrDuration || "Standard"}\nGenerated: ${new Date().toLocaleString()}\n\nOfficial verified curriculum material for offline access.`
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${material.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "material"}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onToast(`Downloading “${material.title}”`)
  }

  const Icon = MATERIAL_ICON[material.type as LessonMaterial["type"]] ?? FileText

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <div className="border-b border-border bg-surface-2 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <IconTile icon={Icon} tone="primary" size="lg" />
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground sm:text-lg truncate">
                  {material.title}
                </DialogTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge tone="neutral" size="sm">{material.type}</Badge>
                  {material.sizeOrDuration && <span>· {material.sizeOrDuration}</span>}
                  {material.approvalStatus && (
                    <Badge tone={material.approvalStatus === "Approved" ? "success" : "warning"} size="sm">
                      {material.approvalStatus}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-xl border border-border bg-surface-2/40 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary-text border border-primary-border shadow-inner">
              <Icon className="h-8 w-8" />
            </div>
            <h4 className="mt-4 font-semibold text-foreground text-sm sm:text-base">
              {material.title}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
              Verified curriculum document ready for review and student download. Fully synced with Quantum offline cache.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button leftIcon={<Download className="h-4 w-4" />} onClick={handleDownload}>
                Download File
              </Button>
              {material.url && material.url.startsWith("http") && (
                <a
                  href={material.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-2 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" /> Open External Link
                </a>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="bg-surface-2 px-6 py-3 border-t border-border">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddAssignmentDialog({
  open,
  onOpenChange,
  courseId,
  moduleId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  courseId: string
  moduleId: string
}) {
  const { addAssignment } = useTeacherData()
  const [title, setTitle] = useState("")
  const [type, setType] = useState<ModuleAssignmentItem["type"]>("Written Assignment")
  const [description, setDescription] = useState("")
  const [instructions, setInstructions] = useState("")
  const [dueDate, setDueDate] = useState("2026-11-20")
  const [maxMarks, setMaxMarks] = useState("100")
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string; type: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files.length) return
    const newItems = Array.from(files).map((f) => {
      const sizeKb = Math.round(f.size / 1024)
      const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`
      return {
        name: f.name,
        size: sizeFormatted,
        type: f.name.split(".").pop()?.toUpperCase() || "FILE",
      }
    })
    setAttachedFiles((prev) => [...prev, ...newItems])
  }

  const removeFile = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form
          noValidate
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (title.trim().length < 3) return setError("Assignment title must be at least 3 characters.")
            addAssignment(courseId, moduleId, {
              title: title.trim(),
              type,
              description: description.trim() || "Practical module assignment.",
              instructions: instructions.trim() || "Complete the problem statement and submit solution before deadline.",
              dueDate: dueDate.trim() || "2026-11-20",
              maxMarks: Number(maxMarks) || 100,
              attachments: attachedFiles,
            })
            onOpenChange(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>Add module assignment</DialogTitle>
            <DialogDescription>
              New assignments are sent to Admin for curriculum verification.
            </DialogDescription>
          </DialogHeader>
          <Field label="Assignment title" required error={error}>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Prompt Pipeline Evaluation" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={type} onValueChange={(v) => setType(v as ModuleAssignmentItem["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Written Assignment">Written Assignment</SelectItem>
                  <SelectItem value="Coding Lab">Coding Lab</SelectItem>
                  <SelectItem value="Project Milestone">Project Milestone</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Max marks">
              <Input type="number" min={10} max={500} value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
            </Field>
          </div>
          <Field label="Due date">
            <DatePicker value={dueDate} onChange={setDueDate} placeholder="Select due date" />
          </Field>
          <Field label="Description">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short overview" />
          </Field>
          <Field label="Instructions & Rubric">
            <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Task instructions..." rows={3} />
          </Field>

          {/* Assignment Files / Starter Code Upload */}
          <div className="space-y-2 rounded-lg border border-border bg-surface-2/40 p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-primary" />
                Upload Assignment Brief & Starter Code
              </label>
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-hover transition-colors">
                <Upload className="h-3 w-3" />
                Browse
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,.doc,.zip,.py,.ipynb,.csv,.txt"
                />
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Attach PDFs, starter notebooks (.ipynb, .py), data files, or project ZIP archives for learners.
            </p>

            {attachedFiles.length > 0 && (
              <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-surface">
                {attachedFiles.map((file, idx) => (
                  <li key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="h-4 w-4 text-success shrink-0" />
                      <span className="font-medium text-foreground truncate">{file.name}</span>
                      <span className="text-muted-foreground shrink-0 font-mono">({file.size})</span>
                    </div>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeFile(idx)}
                      className="text-muted-foreground hover:text-danger"
                      aria-label="Remove file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" leftIcon={<Plus aria-hidden="true" />}>
              Submit for Approval
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddQuizDialog({
  open,
  onOpenChange,
  courseId,
  moduleId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  courseId: string
  moduleId: string
}) {
  const { addQuiz } = useTeacherData()
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("2026-11-25")
  const [maxMarks, setMaxMarks] = useState("100")
  const [timeLimitMins, setTimeLimitMins] = useState("30")
  const [passingMarks, setPassingMarks] = useState("60")
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string; type: string }[]>([])
  const [questionsCount, setQuestionsCount] = useState(10)
  const [error, setError] = useState<string | null>(null)

  const handleQuizFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files.length) return
    const newItems = Array.from(files).map((f) => {
      const sizeKb = Math.round(f.size / 1024)
      const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`
      return {
        name: f.name,
        size: sizeFormatted,
        type: f.name.split(".").pop()?.toUpperCase() || "CSV",
      }
    })
    setAttachedFiles((prev) => [...prev, ...newItems])
    setQuestionsCount((prev) => Math.max(prev, 15))
  }

  const removeFile = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form
          noValidate
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (title.trim().length < 3) return setError("Quiz title must be at least 3 characters.")
            addQuiz(courseId, moduleId, {
              title: title.trim(),
              dueDate: dueDate.trim() || "2026-11-25",
              maxMarks: Number(maxMarks) || 100,
              timeLimitMins: Number(timeLimitMins) || 30,
              passingMarks: Number(passingMarks) || 60,
              attachments: attachedFiles,
              questionsCount,
            })
            onOpenChange(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>Add module quiz</DialogTitle>
            <DialogDescription>
              Quizzes are verified by the Admin before being published to learners.
            </DialogDescription>
          </DialogHeader>
          <Field label="Quiz title" required error={error}>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Attention & Transformer Checkpoint" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Time limit (mins)">
              <Input type="number" min={5} max={180} value={timeLimitMins} onChange={(e) => setTimeLimitMins(e.target.value)} />
            </Field>
            <Field label="Max marks">
              <Input type="number" min={10} max={200} value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
            </Field>
            <Field label="Passing marks">
              <Input type="number" min={5} max={200} value={passingMarks} onChange={(e) => setPassingMarks(e.target.value)} />
            </Field>
          </div>
          <Field label="Due date">
            <DatePicker value={dueDate} onChange={setDueDate} placeholder="Select due date" />
          </Field>

          {/* Question Bank File Upload */}
          <div className="space-y-2 rounded-lg border border-border bg-surface-2/40 p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                Upload Questions / Question Bank
              </label>
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-hover transition-colors">
                <Upload className="h-3 w-3" />
                Upload Questions
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleQuizFileUpload}
                  accept=".csv,.json,.xlsx,.txt,.docx,.pdf"
                />
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Upload questions via CSV, JSON, Excel sheet, or question bank document.
            </p>

            {attachedFiles.length > 0 ? (
              <div className="space-y-2">
                <ul className="divide-y divide-border rounded-md border border-border bg-surface">
                  {attachedFiles.map((file, idx) => (
                    <li key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck className="h-4 w-4 text-success shrink-0" />
                        <span className="font-medium text-foreground truncate">{file.name}</span>
                        <Badge tone="success" size="sm" className="shrink-0">{questionsCount} Questions</Badge>
                      </div>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeFile(idx)}
                        className="text-muted-foreground hover:text-danger"
                        aria-label="Remove question file"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between rounded bg-success-soft px-3 py-1.5 text-xs text-success">
                  <span className="font-medium">Question bank loaded successfully</span>
                  <span className="font-mono font-semibold">{questionsCount} Questions Ready</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">Questions in quiz</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={questionsCount}
                    onChange={(e) => setQuestionsCount(Number(e.target.value) || 1)}
                    wrapperClassName="w-20"
                    className="text-right h-8 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">items</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" leftIcon={<ListChecks aria-hidden="true" />}>
              Submit for Approval
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UploadMaterialDialog({
  open,
  onOpenChange,
  courseId,
  target,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  courseId: string
  target: { moduleId: string; lessonId: string } | null
}) {
  const { addMaterial } = useTeacherData()
  const [title, setTitle] = useState("")
  const [type, setType] = useState<LessonMaterial["type"]>("Document")
  const [sizeOrDuration, setSizeOrDuration] = useState("PDF · 3.2 MB")
  const [url, setUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  if (!target) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form
          noValidate
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (title.trim().length < 3) return setError("Material title must be at least 3 characters.")
            addMaterial(courseId, target.moduleId, target.lessonId, {
              title: title.trim(),
              type,
              sizeOrDuration: sizeOrDuration.trim() || "PDF · 2.4 MB",
              url: url.trim() || "#",
            })
            onOpenChange(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>Upload study material</DialogTitle>
            <DialogDescription>
              New material files undergo administrative review prior to learner access.
            </DialogDescription>
          </DialogHeader>
          <Field label="Material title" required error={error}>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Architecture Reference Sheet" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={type} onValueChange={(v) => setType(v as LessonMaterial["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Document">Document</SelectItem>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="Video Lecture">Video Lecture</SelectItem>
                  <SelectItem value="Lab Worksheet">Lab Worksheet</SelectItem>
                  <SelectItem value="Slide Deck">Slide Deck</SelectItem>
                  <SelectItem value="Audio">Audio</SelectItem>
                  <SelectItem value="External">External Resource</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Size / Duration">
              <Input value={sizeOrDuration} onChange={(e) => setSizeOrDuration(e.target.value)} placeholder="e.g. PDF · 4.1 MB" />
            </Field>
          </div>
          <Field label="Resource Link / CDN URL">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://cdn.quantumschool.ai/materials/..." />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" leftIcon={<Upload aria-hidden="true" />}>
              Submit for Approval
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ModuleCard({
  course,
  module: m,
  index,
  last,
  open,
  onToggle,
  onPreview,
}: {
  course: CourseItem
  module: CourseModuleItem
  index: number
  last: boolean
  open: boolean
  onToggle: () => void
  onPreview: (lesson: LessonItem, moduleId: string) => void
}) {
  const { moveModule, addLesson, toggleLessonDelivered, assignments } = useTeacherData()
  const [title, setTitle] = useState("")
  const [type, setType] = useState<LessonItem["type"]>("Interactive Lab")
  const [length, setLength] = useState("30 mins")
  const [error, setError] = useState<string | null>(null)
  const done = m.lessons.filter((l) => l.completed).length
  const materials = m.lessons.reduce((s, l) => s + l.materials.length, 0)
  const hasAssignment = !!assignments[assignmentKey(course.id, m.id)]
  const panelId = `module-${m.id}-panel`

  return (
    <motion.li layout="position" transition={spring.soft} className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--elev-xs)]">
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold tabular-nums ring-1 ring-inset",
            m.completed ? "bg-success-soft text-success ring-success/20" : "bg-primary-soft text-primary-text ring-primary-border",
          )}
          aria-hidden="true"
        >
          {m.completed ? <Check className="h-4 w-4" /> : index + 1}
        </span>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className="group flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary-text">{m.title}</span>
            <span className="block truncate text-caption text-muted-foreground">
              {done}/{m.lessons.length} lessons delivered · {materials} materials{hasAssignment ? " · assignment" : ""}
            </span>
          </span>
          <span className="hidden w-32 shrink-0 sm:block">
            <Progress value={m.progress} size="xs" tone={m.completed ? "success" : "primary"} label={`${m.title} ${m.progress}% delivered`} />
          </span>
          <span className="hidden w-10 shrink-0 text-right text-sm font-medium tabular-nums text-foreground sm:block">{m.progress}%</span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={transition.base} className="flex shrink-0 text-muted-foreground">
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </motion.span>
        </button>
        <div className="flex shrink-0 items-center">
          <Button size="icon-sm" variant="ghost" aria-label={`Move ${m.title} up`} disabled={index === 0} onClick={() => moveModule(course.id, m.id, -1)}>
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={`Move ${m.title} down`} disabled={last} onClick={() => moveModule(course.id, m.id, 1)}>
            <ArrowDown aria-hidden="true" />
          </Button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            id={panelId}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: transition.fast }}
            transition={transition.base}
            className="border-t border-border"
          >
            {m.lessons.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">No lessons yet. Add the first one below.</p>
            ) : (
              <ul className="divide-y divide-border">
                {m.lessons.map((l) => {
                  const Icon = LESSON_ICON[l.type] ?? FileText
                  return (
                    <li key={l.id} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2/70 sm:px-4">
                      <Checkbox
                        checked={l.completed}
                        onCheckedChange={() => toggleLessonDelivered(course.id, m.id, l.id)}
                        aria-label={l.completed ? `Mark “${l.title}” as not delivered` : `Mark “${l.title}” as delivered`}
                      />
                      <IconTile icon={Icon} tone="neutral" size="sm" />
                      <button type="button" onClick={() => onPreview(l, m.id)} className="min-w-0 flex-1 text-left">
                        <span className={cn("block truncate text-sm text-foreground transition-colors hover:text-primary-text", l.completed && "text-muted-foreground")}>{l.title}</span>
                        <span className="block truncate text-caption text-muted-foreground">
                          {l.type} · {l.duration}
                          {l.materials.length ? ` · ${l.materials.length} materials` : ""}
                        </span>
                      </button>
                      <Badge tone={l.completed ? "success" : "neutral"} size="sm" className="hidden sm:inline-flex">
                        {l.completed ? "Delivered" : "Planned"}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
            <form
              noValidate
              className="grid gap-3 border-t border-dashed border-border bg-surface-2/50 p-3 sm:grid-cols-[minmax(0,1fr)_180px_110px_auto] sm:items-end sm:p-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (title.trim().length < 3) return setError("At least 3 characters.")
                addLesson(course.id, m.id, { title: title.trim(), type, duration: length.trim() || "30 mins" })
                setTitle("")
                setError(null)
              }}
            >
              <Field label="New lesson" error={error}>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" />
              </Field>
              <Field label="Type">
                <Select value={type} onValueChange={(v) => setType(v as LessonItem["type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LESSON_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Length">
                <Input value={length} onChange={(e) => setLength(e.target.value)} />
              </Field>
              <Button type="submit" variant="secondary" leftIcon={<Plus aria-hidden="true" />}>
                Add lesson
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

function AssignmentCard({
  course,
  module: m,
  index,
  onGrade,
  onAddAssignment,
  onAddQuiz,
  onPreviewAttachment,
}: {
  course: CourseItem
  module: CourseModuleItem
  index: number
  onGrade: (key: string) => void
  onAddAssignment: (moduleId: string) => void
  onAddQuiz: (moduleId: string) => void
  onPreviewAttachment: (f: { name: string; size: string; type: string; url?: string }) => void
}) {
  const { assignments } = useTeacherData()
  const [brief, setBrief] = useState(false)
  const key = assignmentKey(course.id, m.id)
  const a = assignments[key]
  if (!a) {
    return (
      <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4 bg-surface-2/40">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-caption font-semibold tabular-nums text-muted-foreground" aria-hidden="true">
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{m.title}</p>
            <p className="text-caption text-muted-foreground">No assignment or assessment created yet.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" leftIcon={<PenLine className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => onAddAssignment(m.id)}>
            Add assignment
          </Button>
          <Button size="sm" variant="outline" leftIcon={<ListChecks className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => onAddQuiz(m.id)}>
            Add quiz
          </Button>
        </div>
      </li>
    )
  }
  const subs = a.submissions ?? []
  const todo = subs.filter((s) => s.status === "Submitted" || s.status === "Late").length
  const missing = subs.filter((s) => s.status === "Pending").length
  const avg = typeof a.averageScore === "number" ? Math.round((a.averageScore / a.maxMarks) * 100) : null
  const Icon = ASSIGNMENT_ICON[a.type]
  return (
    <li className="rounded-lg border border-border bg-surface p-4 shadow-[var(--elev-xs)]">
      <div className="flex flex-wrap items-start gap-3">
        <IconTile icon={Icon} tone="warning" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-caption text-muted-foreground">
            Module {index + 1} · {m.title}
          </p>
          <p className="text-sm font-semibold text-foreground">{a.title}</p>
          <p className="text-caption text-muted-foreground">
            {a.type} · Due {a.dueDate} · {a.maxMarks} marks
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {a.approvalStatus && (
            <Badge tone={a.approvalStatus === "Approved" ? "success" : "warning"} size="sm">
              {a.approvalStatus}
            </Badge>
          )}
          {a.publishGradeApproval && (
            <Badge tone={a.publishGradeApproval === "Approved" ? "success" : "warning"} size="sm">
              Grades: {a.publishGradeApproval}
            </Badge>
          )}
          <Badge tone={ASSIGNMENT_TONE[a.status]}>{a.status}</Badge>
        </div>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="mb-1.5 flex justify-between text-caption text-muted-foreground">
            Submitted
            <span className="font-medium tabular-nums text-foreground">
              {a.submissionsCount}/{a.totalEnrolled}
            </span>
          </dt>
          <dd>
            <Progress value={(a.submissionsCount / Math.max(1, a.totalEnrolled)) * 100} size="xs" label={`${a.submissionsCount} of ${a.totalEnrolled} submitted`} />
          </dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">Average</dt>
          <dd className="text-sm font-semibold tabular-nums text-foreground">{avg === null ? "Not graded yet" : `${avg}%`}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">Waiting on you</dt>
          <dd className="text-sm font-semibold text-foreground">
            {todo} to grade · <span className="text-muted-foreground">{missing} missing</span>
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant={todo ? "primary" : "secondary"} leftIcon={<ClipboardCheck aria-hidden="true" />} onClick={() => onGrade(key)}>
          {todo ? `Grade ${todo}` : "Review grades"}
        </Button>
        <Button size="sm" variant="ghost" aria-expanded={brief} onClick={() => setBrief((b) => !b)}>
          {brief ? "Hide brief" : "View brief"}
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {brief && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: transition.fast }}
            transition={transition.base}
            className="mt-4 space-y-3 rounded-md bg-surface-2/70 p-4 text-sm"
          >
            <p className="text-foreground">{a.description}</p>
            <p className="whitespace-pre-line leading-6 text-muted-foreground">{a.instructions}</p>
            {a.attachments && a.attachments.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {a.attachments.map((f) => (
                  <li key={f.name}>
                    <button
                      type="button"
                      onClick={() => onPreviewAttachment(f)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-caption font-medium text-foreground transition-colors hover:border-border-strong/60 hover:bg-surface-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary-text" aria-hidden="true" />
                      {f.name}
                      <span className="text-muted-foreground">{f.size}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

/** One course: curriculum builder, assignments, learners and live classes. */
export default function CourseWorkspacePage() {
  const { courseId = "" } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { courses, students, sessions, recordings, assignments, doubts = [], replyToDoubt, setDoubtStatus, toggleLessonDelivered, startSession, notify } = useTeacherData()
  const course = courses.find((c) => c.id === courseId)
  const tabParam = params.get("tab") as Tab | null
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "curriculum"

  // The first module still being taught starts expanded.
  const [openModules, setOpenModules] = useState<Set<string>>(() => {
    const current = course?.modules.find((m) => !m.completed)
    return new Set(current ? [current.id] : [])
  })
  const [preview, setPreview] = useState<{ lessonId: string; moduleId: string } | null>(null)
  const [previewMaterial, setPreviewMaterial] = useState<PreviewMaterialItem | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [gradingKey, setGradingKey] = useState<string | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [addAssignmentModuleId, setAddAssignmentModuleId] = useState<string | null>(null)
  const [addQuizModuleId, setAddQuizModuleId] = useState<string | null>(null)
  const [uploadMaterialTarget, setUploadMaterialTarget] = useState<{ moduleId: string; lessonId: string } | null>(null)
  const [doubtFilter, setDoubtFilter] = useState<"all" | "pending" | "resolved">("all")
  const [doubtDrafts, setDoubtDrafts] = useState<Record<string, string>>({})

  const learners = useMemo(
    () => (course ? course.enrolledStudentIds.map((id) => students.find((s) => s.id === id)).filter((s): s is StudentItem => Boolean(s)) : []),
    [course, students],
  )
  const courseSessions = useMemo(
    () => sessions.filter((s) => s.courseId === courseId).sort((a, b) => `${a.scheduledDate}${a.startTime}`.localeCompare(`${b.scheduledDate}${b.startTime}`)),
    [sessions, courseId],
  )

  const courseDoubts = useMemo(
    () => doubts.filter((d) => d.courseId === courseId || d.courseCode === course?.code),
    [doubts, courseId, course],
  )

  const filteredCourseDoubts = useMemo(() => {
    if (doubtFilter === "pending") return courseDoubts.filter((d) => d.status !== "Resolved")
    if (doubtFilter === "resolved") return courseDoubts.filter((d) => d.status === "Resolved")
    return courseDoubts
  }, [courseDoubts, doubtFilter])

  if (!course) {
    return (
      <div className="flex w-full flex-col">
        <PageHeader title="Course not found" breadcrumb={[{ label: "Courses", onClick: () => navigate("/teacher/courses") }, { label: "Not found" }]} />
        <EmptyState
          icon={<BookOpenText aria-hidden="true" />}
          title="This course doesn't exist"
          description="It may have been archived, or the link is wrong."
          action={
            <Button leftIcon={<ArrowLeft aria-hidden="true" />} onClick={() => navigate("/teacher/courses")}>
              Back to courses
            </Button>
          }
        />
      </div>
    )
  }

  const lessons = course.modules.flatMap((m) => m.lessons)
  const delivered = lessons.filter((l) => l.completed).length
  const graded = course.modules.map((m) => assignments[assignmentKey(course.id, m.id)]).filter((a): a is ModuleAssignmentItem => !!a && typeof a.averageScore === "number")
  const avgScore = graded.length ? Math.round(graded.reduce((s, a) => s + ((a.averageScore ?? 0) / a.maxMarks) * 100, 0) / graded.length) : null
  const toGrade = course.modules.reduce((sum, m) => {
    const a = assignments[assignmentKey(course.id, m.id)]
    return sum + (a?.submissions ?? []).filter((s) => s.status === "Submitted" || s.status === "Late").length
  }, 0)
  const next = courseSessions.find((s) => s.status === "Live Now") ?? courseSessions.find((s) => s.status === "Upcoming" || s.status === "Scheduled")
  const upcoming = courseSessions.filter((s) => s.status === "Upcoming" || s.status === "Scheduled" || s.status === "Live Now")
  const past = courseSessions.filter((s) => s.status === "Completed" || s.status === "Cancelled").reverse()

  const previewModule = preview ? course.modules.find((m) => m.id === preview.moduleId) : undefined
  const previewLesson = previewModule?.lessons.find((l) => l.id === preview?.lessonId)

  const setTab = (t: string) => {
    const nextParams = new URLSearchParams(params)
    if (t === "curriculum") nextParams.delete("tab")
    else nextParams.set("tab", t)
    setParams(nextParams, { replace: true })
  }

  const progressFor = (s: StudentItem) => s.courses?.find((c) => c.code === course.code)?.progress ?? s.completion

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        breadcrumb={[{ label: "Courses", onClick: () => navigate("/teacher/courses") }, { label: course.name }]}
        eyebrow={`${course.code} · ${course.term}`}
        title={course.name}
        description={`${course.assignedClass} · taught by ${course.instructor}`}
        actions={
          <Button leftIcon={<Plus aria-hidden="true" />} onClick={() => setAddOpen(true)}>
            Add module
          </Button>
        }
      />

      <Stagger className="flex flex-col gap-5" stagger={0.05}>
        <StaggerItem>
          <Card className="overflow-hidden">
            <div className="grid md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              <CourseCover title={course.name} category={courseArt(course.id)} image={course.thumbnail} hoverZoom={false} className="md:aspect-auto md:h-full" />
              <div className="flex flex-col gap-5 p-5 sm:p-6">
                {course.description && <p className="text-sm leading-6 text-muted-foreground">{course.description}</p>}
                <div className="flex flex-wrap items-center gap-5">
                  <ProgressRing value={course.progress} size={76} thickness={7} tone="success" label={`${course.progress}% of the curriculum delivered`} />
                  <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                    {[
                      { label: "Learners", value: String(course.enrolledStudentsCount) },
                      { label: "Modules", value: String(course.modules.length) },
                      { label: "Lessons delivered", value: `${delivered}/${lessons.length}` },
                      { label: "Assignment average", value: avgScore === null ? "–" : `${avgScore}%` },
                    ].map((s) => (
                      <div key={s.label} className="min-w-0">
                        <dt className="truncate text-caption text-muted-foreground">{s.label}</dt>
                        <dd className="text-lg font-semibold tabular-nums text-foreground">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-2/60 px-3 py-2.5">
                  {next ? (
                    <>
                      <DateTile {...monthDay(next.scheduledDate)} size="sm" tone={next.status === "Live Now" ? "live" : "accent"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{next.title}</p>
                        <p className="text-caption text-muted-foreground">
                          {next.status === "Live Now" ? "Live now" : dayLabel(next.scheduledDate)} · {formatTimeRange(next.startTime, next.endTime)}
                        </p>
                      </div>
                      {next.status === "Live Now" ? (
                        <Button size="sm" leftIcon={<Radio aria-hidden="true" />} onClick={() => navigate(`/teacher/live-class/studio/${next.id}`)}>
                          Enter studio
                        </Button>
                      ) : next.scheduledDate === DEMO_DATE ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            startSession(next.id)
                            notify(`“${next.title}” is live`)
                            navigate(`/teacher/live-class/studio/${next.id}`)
                          }}
                        >
                          Start class
                        </Button>
                      ) : (
                        <Badge tone="info">Scheduled</Badge>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="flex-1 text-sm text-muted-foreground">No live class scheduled for this course.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Tabs value={tab} onValueChange={setTab} variant="underline">
            <TabsList aria-label="Course sections" className="w-full justify-start">
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="assignments">
                Assignments
                {toGrade > 0 && (
                  <Badge tone="warning" size="sm">
                    {toGrade}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="learners">Learners</TabsTrigger>
              <TabsTrigger value="classes">Classes</TabsTrigger>
              <TabsTrigger value="doubts" className="gap-2">
                Doubts
                {courseDoubts.filter((d) => d.status !== "Resolved").length > 0 && (
                  <Badge tone="warning" size="sm">
                    {courseDoubts.filter((d) => d.status !== "Resolved").length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="curriculum">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {course.modules.length} modules · {lessons.length} lessons · tick a lesson once you've taught it
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpenModules((cur) => (cur.size === course.modules.length ? new Set() : new Set(course.modules.map((m) => m.id))))}
                >
                  {openModules.size === course.modules.length ? "Collapse all" : "Expand all"}
                </Button>
              </div>
              {course.modules.length === 0 ? (
                <EmptyState
                  icon={<BookOpenText aria-hidden="true" />}
                  title="Start the curriculum"
                  description="Modules group lessons, materials and an assignment."
                  action={
                    <Button leftIcon={<Plus aria-hidden="true" />} onClick={() => setAddOpen(true)}>
                      Add the first module
                    </Button>
                  }
                />
              ) : (
                <motion.ol layout className="flex flex-col gap-3">
                  {course.modules.map((m, i) => (
                    <ModuleCard
                      key={m.id}
                      course={course}
                      module={m}
                      index={i}
                      last={i === course.modules.length - 1}
                      open={openModules.has(m.id)}
                      onToggle={() =>
                        setOpenModules((cur) => {
                          const n = new Set(cur)
                          if (n.has(m.id)) n.delete(m.id)
                          else n.add(m.id)
                          return n
                        })
                      }
                      onPreview={(l, moduleId) => setPreview({ lessonId: l.id, moduleId })}
                    />
                  ))}
                </motion.ol>
              )}
            </TabsContent>

            <TabsContent value="assignments">
              {course.modules.length === 0 ? (
                <EmptyState icon={<ClipboardCheck aria-hidden="true" />} title="No assignments yet" description="Assignments belong to modules. Add a module first." />
              ) : (
                <ul className="flex flex-col gap-3">
                  {course.modules.map((m, i) => (
                    <AssignmentCard
                      key={m.id}
                      course={course}
                      module={m}
                      index={i}
                      onGrade={setGradingKey}
                      onAddAssignment={(modId) => setAddAssignmentModuleId(modId)}
                      onAddQuiz={(modId) => setAddQuizModuleId(modId)}
                      onPreviewAttachment={(f) =>
                        setPreviewMaterial({
                          title: f.name,
                          type: f.type || "Document",
                          sizeOrDuration: f.size,
                          url: f.url,
                          approvalStatus: "Approved",
                        })
                      }
                    />
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="learners">
              <DataTable
                caption={`Learners in ${course.name}`}
                data={learners}
                rowKey={(s) => s.id}
                onRowClick={(s) => setDrawerId(s.id)}
                initialSort={{ id: "progress", dir: "desc" }}
                empty={<EmptyState icon={<Users aria-hidden="true" />} title="No learners yet" description="Enrolled learners in this course will appear here." />}
                columns={[
                  {
                    id: "name",
                    header: "Learner",
                    sortValue: (s) => s.name,
                    cell: (s) => (
                      <span className="flex items-center gap-3">
                        <Avatar src={s.image} name={s.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">{s.name}</span>
                          <span className="block text-caption text-muted-foreground">{s.rollNumber}</span>
                        </span>
                      </span>
                    ),
                  },
                  {
                    id: "progress",
                    header: "Course progress",
                    sortValue: (s) => progressFor(s),
                    cell: (s) => (
                      <span className="flex items-center gap-2">
                        <Progress value={progressFor(s)} size="xs" className="w-24" label={`${progressFor(s)}%`} />
                        <span className="tabular-nums">{progressFor(s)}%</span>
                      </span>
                    ),
                  },
                  { id: "average", header: "Average", align: "right", sortValue: (s) => s.average, cell: (s) => <span className="tabular-nums">{s.average}%</span> },
                  { id: "attendance", header: "Attendance", align: "right", hideOnMobile: true, sortValue: (s) => s.attendance, cell: (s) => <span className="tabular-nums">{s.attendance}%</span> },
                  {
                    id: "status",
                    header: "Status",
                    sortValue: (s) => s.status,
                    cell: (s) => <Badge tone={STUDENT_STATUS_TONE[s.status]}>{s.status}</Badge>,
                  },
                ]}
                mobileCard={(s) => (
                  <div className="flex items-center gap-3">
                    <Avatar src={s.image} name={s.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={progressFor(s)} size="xs" label={`${progressFor(s)}%`} />
                        <span className="text-caption tabular-nums text-muted-foreground">{progressFor(s)}%</span>
                      </div>
                    </div>
                    <Badge tone={STUDENT_STATUS_TONE[s.status]}>{s.status}</Badge>
                  </div>
                )}
              />
            </TabsContent>

            <TabsContent value="classes">
              <div className="grid gap-5 lg:grid-cols-2">
                {[
                  { title: "Upcoming", list: upcoming, empty: "No upcoming classes." },
                  { title: "Past", list: past, empty: "No classes yet." },
                ].map((group) => (
                  <section key={group.title} aria-label={`${group.title} classes`}>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">{group.title}</h3>
                    {group.list.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{group.empty}</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {group.list.map((s) => {
                          const rec = recordings.find((r) => r.sessionId === s.id)
                          return (
                            <li key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                              <DateTile {...monthDay(s.scheduledDate)} size="sm" tone={s.status === "Live Now" ? "live" : s.status === "Completed" ? "default" : "accent"} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                                <p className="truncate text-caption text-muted-foreground">
                                  {formatTimeRange(s.startTime, s.endTime)} · {s.platform}
                                </p>
                              </div>
                              {s.status === "Live Now" ? (
                                <Button size="sm" onClick={() => navigate(`/teacher/live-class/studio/${s.id}`)}>
                                  Enter
                                </Button>
                              ) : s.status === "Completed" && rec ? (
                                <Button size="sm" variant="outline" leftIcon={<PlayCircle aria-hidden="true" />} onClick={() => navigate(`/teacher/recordings/${rec.id}`)}>
                                  Recording
                                </Button>
                              ) : (
                                <Badge tone={SESSION_STATUS_TONE[s.status]}>{s.status}</Badge>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="doubts">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SegmentedControl
                    size="sm"
                    aria-label="Filter doubts by status"
                    options={[
                      { value: "all", label: `All (${courseDoubts.length})` },
                      { value: "pending", label: `Pending (${courseDoubts.filter((d) => d.status !== "Resolved").length})` },
                      { value: "resolved", label: `Resolved (${courseDoubts.filter((d) => d.status === "Resolved").length})` },
                    ]}
                    value={doubtFilter}
                    onChange={(v) => setDoubtFilter(v as any)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
                  onClick={() => navigate("/teacher/doubts")}
                >
                  Full Doubts Desk
                </Button>
              </div>

              {filteredCourseDoubts.length === 0 ? (
                <EmptyState
                  icon={<MessageCircleQuestion aria-hidden="true" />}
                  title="No doubts in this section"
                  description="Learners can ask questions while watching video lessons or working on assignments. Their questions will appear here."
                />
              ) : (
                <ul className="flex flex-col gap-4">
                  {filteredCourseDoubts.map((d) => {
                    const draft = doubtDrafts[d.id] ?? ""
                    const isResolved = d.status === "Resolved"
                    return (
                      <li
                        key={d.id}
                        className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-[var(--elev-xs)] transition-all hover:border-border-strong/60"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar src={d.studentAvatar} name={d.studentName} size="md" />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-foreground text-sm">{d.studentName}</h4>
                                <span className="font-mono text-caption text-muted-foreground">{d.studentRoll}</span>
                              </div>
                              <p className="text-caption text-muted-foreground">{d.submittedAt} · {d.courseCode}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={DOUBT_PRIORITY_TONE[d.priority]} size="sm">
                              {d.priority} Priority
                            </Badge>
                            <Badge tone={DOUBT_STATUS_TONE[d.status]} size="sm">
                              {d.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-3 space-y-1">
                          <h5 className="text-sm font-bold text-foreground">{d.questionTitle}</h5>
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{d.questionText}</p>
                        </div>

                        {/* Answer / Responses section */}
                        {d.responses && d.responses.length > 0 && (
                          <div className="mt-3.5 rounded-lg border border-border bg-surface-2/60 p-3 text-xs space-y-2">
                            <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">Responses</span>
                            {d.responses.map((resp) => (
                              <div key={resp.id} className="rounded-md border border-border/60 bg-surface p-2.5">
                                <div className="flex items-center justify-between text-caption font-medium text-foreground mb-1">
                                  <span>{resp.author} ({resp.authorRole})</span>
                                  <span className="text-muted-foreground">{resp.createdAt}</span>
                                </div>
                                <p className="text-xs text-foreground/90">{resp.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply interface */}
                        {!isResolved ? (
                          <div className="mt-4 pt-3 border-t border-border space-y-2.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] text-muted-foreground font-medium">Quick suggestions:</span>
                              {[
                                "Great question! Let's review this in the upcoming live workshop.",
                                "Review module notes on page 3 and check your environment setup.",
                                "Verify your Python version and ensure dependencies are installed.",
                              ].map((preset, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setDoubtDrafts((prev) => ({ ...prev, [d.id]: preset }))}
                                  className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[10px] text-muted-foreground hover:bg-surface-3 hover:text-foreground transition-colors"
                                >
                                  {preset.slice(0, 32)}...
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Textarea
                                rows={2}
                                placeholder="Write a clear, helpful reply to learner..."
                                value={draft}
                                onChange={(e) => setDoubtDrafts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                                className="text-xs"
                              />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (!draft.trim()) return
                                  replyToDoubt(d.id, draft.trim(), false)
                                  setDoubtDrafts((prev) => ({ ...prev, [d.id]: "" }))
                                }}
                                disabled={!draft.trim()}
                              >
                                Reply
                              </Button>
                              <Button
                                size="sm"
                                leftIcon={<Send className="h-3 w-3" />}
                                onClick={() => {
                                  if (!draft.trim()) return
                                  replyToDoubt(d.id, draft.trim(), true)
                                  setDoubtDrafts((prev) => ({ ...prev, [d.id]: "" }))
                                }}
                                disabled={!draft.trim()}
                              >
                                Reply & Resolve
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center justify-between text-xs text-success">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Check className="h-3.5 w-3.5" /> Resolved with answer
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDoubtStatus(d.id, "Pending")}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              Reopen
                            </Button>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </StaggerItem>
      </Stagger>

      <Sheet open={!!previewLesson} onOpenChange={(o) => !o && setPreview(null)}>
        <SheetContent side="right" className="max-w-lg">
          {previewLesson && previewModule && (
            <>
              <SheetHeader>
                <p className="text-caption font-medium uppercase tracking-wider text-primary-text">{previewModule.title}</p>
                <SheetTitle>{previewLesson.title}</SheetTitle>
                <SheetDescription>
                  {previewLesson.type} · {previewLesson.duration}
                </SheetDescription>
              </SheetHeader>
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2/60 px-3 py-2.5">
                <Badge tone={previewLesson.completed ? "success" : "neutral"} dot>
                  {previewLesson.completed ? "Delivered" : "Not delivered yet"}
                </Badge>
                <Button size="sm" variant="secondary" onClick={() => toggleLessonDelivered(course.id, previewModule.id, previewLesson.id)}>
                  {previewLesson.completed ? "Mark as not delivered" : "Mark as delivered"}
                </Button>
              </div>
              {previewLesson.description && <p className="text-sm leading-6 text-foreground">{previewLesson.description}</p>}
              {previewLesson.objectives.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">Learners will</h3>
                  <ul className="space-y-1.5">
                    {previewLesson.objectives.map((o) => (
                      <li key={o} className="flex gap-2 text-sm text-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                        {o}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {previewLesson.contentSummary && (
                <section className="space-y-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">Summary</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{previewLesson.contentSummary}</p>
                </section>
              )}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">Materials</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Upload className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => setUploadMaterialTarget({ moduleId: previewModule.id, lessonId: previewLesson.id })}
                  >
                    Upload material
                  </Button>
                </div>
                {previewLesson.materials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No materials attached.</p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {previewLesson.materials.map((mat) => {
                      const Icon = MATERIAL_ICON[mat.type] ?? FileText
                      return (
                        <li key={mat.id} className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setPreviewMaterial(mat)}
                            className="group flex flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                          >
                            <IconTile icon={Icon} tone="primary" size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary-text">{mat.title}</span>
                              <span className="block text-caption text-muted-foreground">
                                {mat.type} · {mat.sizeOrDuration}
                              </span>
                            </span>
                            <Eye className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:scale-110" aria-hidden="true" />
                          </button>
                          {mat.approvalStatus && (
                            <div className="pr-3">
                              <Badge tone={mat.approvalStatus === "Approved" ? "success" : "warning"} size="sm">
                                {mat.approvalStatus}
                              </Badge>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
              {previewLesson.adminNotes && <p className="rounded-md border border-info/20 bg-info-soft px-3 py-2.5 text-caption text-info">{previewLesson.adminNotes}</p>}
            </>
          )}
        </SheetContent>
      </Sheet>

      <AddModuleDialog open={addOpen} onOpenChange={setAddOpen} course={course} />
      <ScheduleSessionDialog open={scheduleOpen} onOpenChange={setScheduleOpen} defaultCourseId={course.id} />
      <GradingSheet open={gradingKey !== null} onOpenChange={(o) => !o && setGradingKey(null)} assignmentId={gradingKey} />
      <StudentDrawer studentId={drawerId} open={drawerId !== null} onOpenChange={(o) => !o && setDrawerId(null)} />
      <AddAssignmentDialog
        open={addAssignmentModuleId !== null}
        onOpenChange={(o) => !o && setAddAssignmentModuleId(null)}
        courseId={course.id}
        moduleId={addAssignmentModuleId ?? ""}
      />
      <AddQuizDialog
        open={addQuizModuleId !== null}
        onOpenChange={(o) => !o && setAddQuizModuleId(null)}
        courseId={course.id}
        moduleId={addQuizModuleId ?? ""}
      />
      <UploadMaterialDialog
        open={uploadMaterialTarget !== null}
        onOpenChange={(o) => !o && setUploadMaterialTarget(null)}
        courseId={course.id}
        target={uploadMaterialTarget}
      />
      <MaterialPreviewDialog
        material={previewMaterial}
        open={previewMaterial !== null}
        onOpenChange={(o) => !o && setPreviewMaterial(null)}
        onToast={notify}
      />
    </div>
  )
}
