import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Film, Loader2, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import type { AdminCourse } from "@/data/adminStore"

interface Props {
  open: boolean; onOpenChange: (open: boolean) => void; onCourseCreated?: (course: AdminCourse) => void
  onToast: (message: string) => void; initialCourseId?: string; initialModuleId?: string
  existingCourses?: AdminCourse[]; onSuccess?: () => void
}
type Asset = { id: string; state: string; error?: string | null; duration_seconds?: number; created_at: string }
type Lesson = { id: string; title: string; type: string }
type Detail = { asset: Asset; variants: { quality: string; url: string }[] }

export default function VideoCourseUploadModal(props: Props) {
  const [courseId, setCourseId] = useState(props.initialCourseId ?? "")
  const [title, setTitle] = useState("")
  const [instructor, setInstructor] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [replaceLessonId, setReplaceLessonId] = useState("")
  const [lessonId, setLessonId] = useState("")
  const [assetId, setAssetId] = useState("")
  const [detail, setDetail] = useState<Detail | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [attached, setAttached] = useState(false)

  useEffect(() => {
    if (!courseId) { setAssets([]); setLessons([]); return }
    let active = true
    Promise.all([api.get<{ assets: Asset[] }>(`/admin/media?courseId=${encodeURIComponent(courseId)}`), api.get<{ lessons: Lesson[] }>(`/admin/courses/${courseId}`)])
      .then(([media, course]) => { if (active) { setAssets(media.assets); setLessons(course.lessons.filter(l => l.type === "video")) } })
      .catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [courseId])

  useEffect(() => {
    if (!assetId) return
    let active = true
    let timeout: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const data = await api.get<Detail>(`/admin/media/${assetId}`, { bypassCache: true })
        if (!active) return
        setDetail(data)
        if (["queued", "processing"].includes(data.asset.state)) timeout = setTimeout(poll, 3000)
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Unable to load processing status") }
    }
    void poll()
    return () => { active = false; clearTimeout(timeout) }
  }, [assetId, detail?.asset.state])

  async function upload() {
    if (!file || !title.trim()) return
    setBusy(true); setError(""); setAttached(false)
    try {
      let target = courseId
      if (!target) {
        const data = await api.post<{ course: AdminCourse }>("/admin/courses", { title, instructor, category: "General", status: "Draft" })
        target = data.course.id; setCourseId(target); props.onCourseCreated?.(data.course)
      }
      if (replaceLessonId) setLessonId(replaceLessonId)
      else {
        let moduleId = props.initialCourseId === target ? props.initialModuleId : undefined
        if (!moduleId) moduleId = (await api.post<{ module: { id: string } }>(`/admin/courses/${target}/modules`, { title })).module.id
        const created = await api.post<{ lesson: Lesson }>(`/admin/courses/${target}/lessons`, { moduleId, title, type: "video" })
        setLessonId(created.lesson.id); setLessons(previous => [...previous.filter(l => l.id !== created.lesson.id), created.lesson])
      }
      const data = await api.post<{ asset: Asset; upload: { url: string; method: string; headers: Record<string, string> } }>("/admin/media/uploads", {
        courseId: target, filename: file.name, contentType: file.type || "video/mp4", bytes: file.size,
      })
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open(data.upload.method, data.upload.url)
        Object.entries(data.upload.headers).forEach(([name, value]) => xhr.setRequestHeader(name, value))
        xhr.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100)) }
        xhr.onerror = () => reject(new Error("Upload failed. Check the connection and storage CORS settings."))
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload rejected (${xhr.status})`))
        xhr.send(file)
      })
      await api.post(`/admin/media/${data.asset.id}/finalize`, {})
      setDetail(null); setAssetId(data.asset.id); props.onSuccess?.()
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed") }
    finally { setBusy(false) }
  }
  async function attach() {
    setBusy(true); setError("")
    try {
      await api.post(`/admin/media/${assetId}/attach`, { lessonId })
      setAttached(true); props.onSuccess?.(); props.onToast("Video attached. Review the course before publishing.")
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to attach video") }
    finally { setBusy(false) }
  }
  const selectClass = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
  return <Dialog open={props.open} onOpenChange={open => { if (!busy) props.onOpenChange(open) }}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Film className="h-5 w-5 text-primary" /> Course video</DialogTitle>
        <DialogDescription>Upload a video, review the processed result, then attach it to a lesson. Replacements preserve lesson progress and the previous content history.</DialogDescription></DialogHeader>
      <div className="space-y-5 py-2">
        <label className="block space-y-2 text-sm font-medium">Course
          <select className={selectClass} value={courseId} disabled={busy || !!props.initialCourseId} onChange={e => { setCourseId(e.target.value); setAssetId(""); setDetail(null); setLessonId("") }}>
            <option value="">Create a draft course</option>{props.existingCourses?.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select></label>
        {!courseId && <label className="block space-y-2 text-sm font-medium">Instructor<Input value={instructor} onChange={e => setInstructor(e.target.value)} /></label>}
        {courseId && lessons.length > 0 && <label className="block space-y-2 text-sm font-medium">Upload destination<select className={selectClass} value={replaceLessonId} disabled={busy} onChange={e => { setReplaceLessonId(e.target.value); const lesson = lessons.find(l => l.id === e.target.value); if (lesson) setTitle(lesson.title) }}><option value="">Create a new video lesson</option>{lessons.map(l => <option key={l.id} value={l.id}>Replace video: {l.title}</option>)}</select></label>}
        <label className="block space-y-2 text-sm font-medium">Lesson title<Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Building your first AI workflow" /></label>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 p-7 text-center">
          <Upload className="h-6 w-6 text-primary" /><span className="text-sm font-medium">{file?.name ?? "Choose a video"}</span>
          <span className="text-xs text-muted-foreground">MP4, WebM or MOV · up to 5 GB</span>
          <input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy} className="max-w-full text-xs" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <Button onClick={() => void upload()} disabled={busy || !file || title.trim().length < 3 || (!courseId && instructor.trim().length < 2)} className="w-full">
          {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {progress < 100 ? `Uploading ${progress}%` : "Saving…"}</> : "Upload and process"}
        </Button>
        {assets.length > 0 && <label className="block space-y-2 text-sm font-medium">Resume a previous upload
          <select className={selectClass} value={assetId} onChange={e => { setAssetId(e.target.value); setAttached(false) }}><option value="">Select upload</option>{assets.map(a => <option key={a.id} value={a.id}>{new Date(a.created_at).toLocaleString()} · {a.state}</option>)}</select></label>}
        {detail && <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4" aria-live="polite">
          <p className="text-sm font-semibold capitalize">Processing: {detail.asset.state}</p>
          {["queued", "processing"].includes(detail.asset.state) && <p className="text-sm text-muted-foreground">You can close this window. Processing continues on the server; reopen this course to check the result.</p>}
          {detail.asset.error && <p className="text-sm text-destructive">{detail.asset.error}</p>}
          {detail.asset.state === "failed" && <Button variant="outline" onClick={async () => { try { await api.post(`/admin/media/${assetId}/retry`, {}); setDetail({ ...detail, asset: { ...detail.asset, state: "queued" } }) } catch (e) { setError(e instanceof Error ? e.message : "Retry failed") } }}>Retry processing</Button>}
          {detail.asset.state === "ready" && <>
            <video controls className="w-full rounded-xl bg-black" src={detail.variants[0]?.url} />
            <label className="block space-y-2 text-sm">Attach to lesson<select value={lessonId} onChange={e => setLessonId(e.target.value)} className={selectClass}><option value="">Select a lesson</option>{lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
            <Button disabled={!lessonId || busy || attached} onClick={() => void attach()}>{attached ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Attached</> : "Attach this video"}</Button>
          </>}
        </div>}
        {error && <p role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{error}</p>}
      </div>
    </DialogContent>
  </Dialog>
}
