import { useEffect, useState, type FormEvent } from "react"
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronsUpDown,
  FileText,
  FlaskConical,
  Layers,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Field from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CustomSelect } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import LessonPlayer from "@/pages/student/course/LessonPlayer"
import type { ConfirmRequest } from "../shared/ConfirmDialog"
import { PanelHeader, WorkspaceEmpty } from "./WorkspaceParts"
import {
  formatRuntime,
  LESSON_TYPE_OPTIONS,
  lessonHasPlayableVideo,
  toVideoEmbedUrl,
  type CourseModuleItem,
  type LessonRowItem,
  type LessonType,
} from "./courseContent"

interface CourseCurriculumPanelProps {
  courseId: string
  modules: CourseModuleItem[]
  lessons: LessonRowItem[]
  /** Runs a content change, reloads the course and shows a toast. Resolves true on success. */
  mutate: (action: () => Promise<unknown>, message: string) => Promise<boolean>
  onUploadVideo: (moduleId?: string) => void
  onConfirm: (request: ConfirmRequest) => void
  onToast: (msg: string) => void
}

const TYPE_STYLE: Record<LessonType, { icon: typeof Video; tone: string; label: string }> = {
  video: { icon: Video, tone: "bg-primary-soft text-primary-text", label: "Video" },
  reading: { icon: FileText, tone: "bg-info-soft text-info", label: "Reading" },
  lab: { icon: FlaskConical, tone: "bg-warning-soft text-warning", label: "Lab" },
}

interface LessonDraft {
  title: string
  type: LessonType
  duration: string
  summary: string
}

const EMPTY_LESSON: LessonDraft = { title: "", type: "video", duration: "15m", summary: "" }

/** Chapters and lessons: accordion list with reorder, edit, delete, upload and preview. */
export default function CourseCurriculumPanel({ courseId, modules, lessons, mutate, onUploadVideo, onConfirm, onToast }: CourseCurriculumPanelProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(modules.map((m) => m.id)))
  const [busyOrder, setBusyOrder] = useState(false)

  // Chapter dialog: null = closed, "new" = create, otherwise the chapter being edited.
  const [chapterTarget, setChapterTarget] = useState<CourseModuleItem | "new" | null>(null)
  const [chapterTitle, setChapterTitle] = useState("")
  const [chapterDuration, setChapterDuration] = useState("")
  const [savingChapter, setSavingChapter] = useState(false)

  // Lesson dialog: create inside a chapter, or edit an existing lesson.
  const [lessonTarget, setLessonTarget] = useState<{ moduleId: string; lesson?: LessonRowItem } | null>(null)
  const [lessonDraft, setLessonDraft] = useState<LessonDraft>(EMPTY_LESSON)
  const [savingLesson, setSavingLesson] = useState(false)

  const [preview, setPreview] = useState<{ lesson: LessonRowItem; moduleTitle: string } | null>(null)

  // Newly added chapters open automatically; ones the admin collapsed stay collapsed.
  const [seen] = useState(() => new Set(modules.map((m) => m.id)))
  useEffect(() => {
    const fresh = modules.filter((m) => !seen.has(m.id)).map((m) => m.id)
    if (fresh.length === 0) return
    fresh.forEach((id) => seen.add(id))
    setOpenIds((prev) => new Set([...prev, ...fresh]))
  }, [modules, seen])

  const allOpen = modules.length > 0 && modules.every((m) => openIds.has(m.id))
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const move = async (kind: "module" | "lesson", id: string, direction: -1 | 1) => {
    const moduleIds = modules.map((m) => m.id)
    const lessonIds = lessons.map((l) => l.id)
    const ids = kind === "module" ? moduleIds : lessonIds
    const siblings = kind === "module" ? moduleIds : lessons.filter((l) => l.module_id === lessons.find((row) => row.id === id)?.module_id).map((l) => l.id)
    const neighbor = siblings[siblings.indexOf(id) + direction]
    if (!neighbor) return
    const a = ids.indexOf(id)
    const b = ids.indexOf(neighbor)
    ;[ids[a], ids[b]] = [ids[b], ids[a]]
    setBusyOrder(true)
    await mutate(
      () => api.put(`/admin/courses/${courseId}/order`, { module_ids: moduleIds, lesson_ids: lessonIds }),
      "Order saved. Learner progress is kept.",
    )
    setBusyOrder(false)
  }

  const openNewChapter = () => {
    setChapterTitle("")
    setChapterDuration("2 Hours")
    setChapterTarget("new")
  }
  const openEditChapter = (m: CourseModuleItem) => {
    setChapterTitle(m.title)
    setChapterDuration(m.duration ?? "")
    setChapterTarget(m)
  }
  const saveChapter = async (e: FormEvent) => {
    e.preventDefault()
    if (!chapterTitle.trim() || !chapterTarget) return
    setSavingChapter(true)
    const body = { title: chapterTitle.trim(), duration: chapterDuration.trim() }
    const ok =
      chapterTarget === "new"
        ? await mutate(() => api.post(`/admin/courses/${courseId}/modules`, body), "Chapter added.")
        : await mutate(() => api.patch(`/admin/courses/${courseId}/modules/${chapterTarget.id}`, body), "Chapter saved.")
    setSavingChapter(false)
    if (ok) setChapterTarget(null)
  }
  const deleteChapter = (m: CourseModuleItem) =>
    onConfirm({
      title: `Remove "${m.title}"?`,
      description: "The chapter and its lessons leave the curriculum. Learner progress stays in history.",
      confirmLabel: "Remove chapter",
      onConfirm: () => mutate(() => api.delete(`/admin/courses/${courseId}/modules/${m.id}`), "Chapter removed. Learner history kept."),
    })

  const openNewLesson = (moduleId: string) => {
    setLessonDraft(EMPTY_LESSON)
    setLessonTarget({ moduleId })
    setOpenIds((prev) => new Set(prev).add(moduleId))
  }
  const openEditLesson = (lesson: LessonRowItem) => {
    setLessonDraft({ title: lesson.title, type: lesson.type, duration: lesson.duration || `${lesson.minutes || 15}m`, summary: lesson.summary || "" })
    setLessonTarget({ moduleId: lesson.module_id, lesson })
  }
  const saveLesson = async (e: FormEvent) => {
    e.preventDefault()
    if (!lessonTarget || !lessonDraft.title.trim()) return
    setSavingLesson(true)
    const body = {
      title: lessonDraft.title.trim(),
      type: lessonDraft.type,
      duration: lessonDraft.duration,
      minutes: parseInt(lessonDraft.duration, 10) || 15,
      summary: lessonDraft.summary.trim(),
    }
    const ok = lessonTarget.lesson
      ? await mutate(() => api.patch(`/admin/courses/${courseId}/lessons/${lessonTarget.lesson!.id}`, body), "Lesson saved. Learner progress is kept.")
      : await mutate(
          () => api.post(`/admin/courses/${courseId}/lessons`, { moduleId: lessonTarget.moduleId, ...body }),
          lessonDraft.type === "video" ? "Lesson added. Upload a video to attach to it." : "Lesson added.",
        )
    setSavingLesson(false)
    if (ok) setLessonTarget(null)
  }
  const deleteLesson = (l: LessonRowItem) =>
    onConfirm({
      title: `Remove "${l.title}"?`,
      description: "The lesson leaves the curriculum. Learner progress stays in history.",
      confirmLabel: "Remove lesson",
      onConfirm: () => mutate(() => api.delete(`/admin/courses/${courseId}/lessons/${l.id}`), "Lesson removed. Learner history kept."),
    })

  const openLesson = (l: LessonRowItem, moduleTitle: string) => {
    if (lessonHasPlayableVideo(l)) {
      setPreview({ lesson: l, moduleTitle })
      return
    }
    if (l.type === "video") onToast("No processed video is attached yet. Use Upload video to add one.")
    openEditLesson(l)
  }

  const chapterIsNew = chapterTarget === "new"
  const editingLesson = lessonTarget?.lesson

  return (
    <div className="space-y-4">
      <PanelHeader title="Curriculum" description="Chapters group lessons. Click a lesson to preview its video or edit it.">
        {modules.length > 1 && (
          <Button size="sm" variant="ghost" leftIcon={<ChevronsUpDown aria-hidden="true" />} onClick={() => setOpenIds(allOpen ? new Set() : new Set(modules.map((m) => m.id)))}>
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        )}
        <Button size="sm" variant="outline" leftIcon={<Plus aria-hidden="true" />} onClick={openNewChapter}>
          Add chapter
        </Button>
        <Button size="sm" leftIcon={<Upload aria-hidden="true" />} onClick={() => onUploadVideo()}>
          Upload video
        </Button>
      </PanelHeader>

      {modules.length === 0 ? (
        <WorkspaceEmpty icon={Layers} title="No chapters yet" description="Add a chapter to group lessons, or upload a video lecture to start one.">
          <Button size="sm" variant="outline" leftIcon={<Plus aria-hidden="true" />} onClick={openNewChapter}>
            Add chapter
          </Button>
          <Button size="sm" leftIcon={<Upload aria-hidden="true" />} onClick={() => onUploadVideo()}>
            Upload video
          </Button>
        </WorkspaceEmpty>
      ) : (
        <ol className="space-y-3" aria-busy={busyOrder}>
          {modules.map((m, mIdx) => {
            const moduleLessons = lessons.filter((l) => l.module_id === m.id)
            const isOpen = openIds.has(m.id)
            const minutes = moduleLessons.reduce((sum, l) => sum + (l.minutes || 0), 0)
            const missingVideos = moduleLessons.filter((l) => l.type === "video" && !lessonHasPlayableVideo(l)).length
            return (
              <li key={m.id}>
                <Card className="overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
                    <button
                      type="button"
                      onClick={() => toggle(m.id)}
                      aria-expanded={isOpen}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-sm font-semibold tabular-nums text-primary-text">
                        {mIdx + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{m.title}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                          <span>
                            {moduleLessons.length} {moduleLessons.length === 1 ? "lesson" : "lessons"}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{minutes ? formatRuntime(minutes) : m.duration || "No runtime yet"}</span>
                          {missingVideos > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-warning">
                                {missingVideos} missing {missingVideos === 1 ? "video" : "videos"}
                              </span>
                            </>
                          )}
                        </span>
                      </span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="ghost" className="hidden sm:inline-flex" leftIcon={<Plus aria-hidden="true" />} onClick={() => openNewLesson(m.id)}>
                        Lesson
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost" aria-label={`More actions for ${m.title}`}>
                            <MoreHorizontal aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onSelect={() => openNewLesson(m.id)}>
                            <Plus className="h-4 w-4" aria-hidden="true" /> Add lesson
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onUploadVideo(m.id)}>
                            <Upload className="h-4 w-4" aria-hidden="true" /> Upload video here
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEditChapter(m)}>
                            <Pencil className="h-4 w-4" aria-hidden="true" /> Rename chapter
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={mIdx === 0 || busyOrder} onSelect={() => void move("module", m.id, -1)}>
                            <ArrowUp className="h-4 w-4" aria-hidden="true" /> Move up
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={mIdx === modules.length - 1 || busyOrder} onSelect={() => void move("module", m.id, 1)}>
                            <ArrowDown className="h-4 w-4" aria-hidden="true" /> Move down
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => deleteChapter(m)} destructive>
                            <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove chapter
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border bg-surface-2/40">
                      {moduleLessons.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                          <p className="text-caption text-muted-foreground">No lessons in this chapter yet.</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            <Button size="sm" variant="outline" leftIcon={<Plus aria-hidden="true" />} onClick={() => openNewLesson(m.id)}>
                              Add lesson
                            </Button>
                            <Button size="sm" variant="outline" leftIcon={<Upload aria-hidden="true" />} onClick={() => onUploadVideo(m.id)}>
                              Upload video
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <ul className="divide-y divide-border/70">
                          {moduleLessons.map((l, lIdx) => {
                            const playable = lessonHasPlayableVideo(l)
                            const style = TYPE_STYLE[l.type] ?? TYPE_STYLE.reading
                            const Icon = style.icon
                            return (
                              <li key={l.id} className="group flex items-center gap-2 px-3 py-2 transition-colors hover:bg-surface-2 sm:px-4">
                                <button
                                  type="button"
                                  onClick={() => openLesson(l, m.title)}
                                  aria-label={playable ? `Preview ${l.title}` : `Edit ${l.title}`}
                                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-0.5 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
                                >
                                  <span className="w-5 shrink-0 text-center text-[11px] font-medium tabular-nums text-subtle-foreground">
                                    {mIdx + 1}.{lIdx + 1}
                                  </span>
                                  <span className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md", style.tone)}>
                                    <Icon className={cn("h-4 w-4", playable && "group-hover:opacity-0")} aria-hidden="true" />
                                    {playable && <Play className="absolute h-3.5 w-3.5 fill-current opacity-0 group-hover:opacity-100" aria-hidden="true" />}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary-text">{l.title}</span>
                                    <span className="block text-caption text-muted-foreground">
                                      {style.label} · {l.duration || `${l.minutes}m`}
                                    </span>
                                  </span>
                                  {l.type === "video" &&
                                    (playable ? (
                                      <Badge tone="success" size="sm" dot className="hidden shrink-0 sm:inline-flex">
                                        Video ready
                                      </Badge>
                                    ) : (
                                      <Badge tone="warning" size="sm" className="hidden shrink-0 sm:inline-flex">
                                        No video yet
                                      </Badge>
                                    ))}
                                </button>
                                <div className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                  <Button size="icon-sm" variant="ghost" aria-label={`Move ${l.title} up`} disabled={lIdx === 0 || busyOrder} onClick={() => void move("lesson", l.id, -1)}>
                                    <ArrowUp aria-hidden="true" />
                                  </Button>
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={`Move ${l.title} down`}
                                    disabled={lIdx === moduleLessons.length - 1 || busyOrder}
                                    onClick={() => void move("lesson", l.id, 1)}
                                  >
                                    <ArrowDown aria-hidden="true" />
                                  </Button>
                                  <Button size="icon-sm" variant="ghost" aria-label={`Edit ${l.title}`} onClick={() => openEditLesson(l)}>
                                    <Pencil aria-hidden="true" />
                                  </Button>
                                  <Button size="icon-sm" variant="ghost" aria-label={`Remove ${l.title}`} className="text-danger hover:bg-danger/10 hover:text-danger" onClick={() => deleteLesson(l)}>
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
                </Card>
              </li>
            )
          })}
        </ol>
      )}

      {modules.length > 0 && (
        <button
          type="button"
          onClick={openNewChapter}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary-border hover:bg-primary-soft/40 hover:text-primary-text"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add another chapter
        </button>
      )}

      {/* Chapter create / rename */}
      <Dialog open={!!chapterTarget} onOpenChange={(o) => !o && !savingChapter && setChapterTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{chapterIsNew ? "Add chapter" : "Rename chapter"}</DialogTitle>
            <DialogDescription>{chapterIsNew ? "Chapters group related lessons for learners." : "Update the chapter title and expected duration."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveChapter} className="space-y-4 py-1">
            <Field label="Chapter title" required>
              <Input autoFocus required value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="e.g. Memory and stateful routing" />
            </Field>
            <Field label="Expected duration" hint="Shown when the chapter has no lessons yet.">
              <Input value={chapterDuration} onChange={(e) => setChapterDuration(e.target.value)} placeholder="e.g. 2 Hours" />
            </Field>
            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => setChapterTarget(null)} disabled={savingChapter}>
                Cancel
              </Button>
              <Button type="submit" loading={savingChapter} disabled={!chapterTitle.trim()}>
                {chapterIsNew ? "Add chapter" : "Save chapter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lesson create / edit */}
      <Dialog open={!!lessonTarget} onOpenChange={(o) => !o && !savingLesson && setLessonTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit lesson" : "Add lesson"}</DialogTitle>
            <DialogDescription>
              {lessonTarget ? `In ${modules.find((m) => m.id === lessonTarget.moduleId)?.title ?? "this chapter"}` : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveLesson} className="space-y-4 py-1">
            <Field label="Lesson title" required>
              <Input autoFocus required value={lessonDraft.title} onChange={(e) => setLessonDraft((d) => ({ ...d, title: e.target.value }))} placeholder="e.g. Graph state checkpoints" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <CustomSelect value={lessonDraft.type} onChange={(v) => setLessonDraft((d) => ({ ...d, type: v as LessonType }))} options={LESSON_TYPE_OPTIONS} />
              </Field>
              <Field label="Duration">
                <Input value={lessonDraft.duration} onChange={(e) => setLessonDraft((d) => ({ ...d, duration: e.target.value }))} placeholder="e.g. 25m" />
              </Field>
            </div>
            <Field label="Summary" hint={lessonDraft.type === "video" ? "Attach the video itself with Upload video once it is processed." : undefined}>
              <Textarea rows={3} value={lessonDraft.summary} onChange={(e) => setLessonDraft((d) => ({ ...d, summary: e.target.value }))} placeholder="What learners will cover in this lesson" />
            </Field>
            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => setLessonTarget(null)} disabled={savingLesson}>
                Cancel
              </Button>
              <Button type="submit" loading={savingLesson} disabled={!lessonDraft.title.trim()}>
                {editingLesson ? "Save lesson" : "Add lesson"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Video preview */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
          {preview &&
            (() => {
              const { lesson, moduleTitle } = preview
              const embedUrl = toVideoEmbedUrl(lesson.video_url)
              return (
                <>
                  <div className="border-b border-border bg-surface-2/60 px-5 py-3.5 pr-12">
                    <DialogTitle className="truncate text-base">{lesson.title}</DialogTitle>
                    <DialogDescription className="truncate text-caption">
                      {moduleTitle} · {lesson.duration || `${lesson.minutes}m`}
                    </DialogDescription>
                  </div>
                  <div className="bg-black p-3 sm:p-4">
                    {embedUrl ? (
                      <div className="aspect-video w-full overflow-hidden rounded-lg">
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
                          video_qualities: (lesson.video_qualities as never) || undefined,
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
    </div>
  )
}
