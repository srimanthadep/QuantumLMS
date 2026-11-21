import { useEffect, useRef, useState } from "react"
import { FileVideo, Link2, RefreshCw, Upload, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Field from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { CustomSelect } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { SegmentedControl } from "@/components/ui/tabs"
import type { DatedSession } from "@/components/live/LiveSessionsPanel"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { InlineAlert } from "../parts"
import type { MediaAsset, ProviderNotice, RecordingRow } from "./types"

type Mode = "upload" | "attach"
type Kind = "class" | "video"

interface UploadRecordingSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchId: string
  initialSessionId: string
  /** Which kind the sheet opens on. */
  initialKind?: Kind
  sessions: DatedSession[]
  rows: RecordingRow[]
  assets: MediaAsset[]
  notices: ProviderNotice[]
  onReloadAssets: () => Promise<void>
  /** Called after a successful upload or attach. recordingId opens the review when set. */
  onDone: (recordingId: string | null, message: string) => Promise<void>
}

const sessionLabel = (s: DatedSession) => `${s.title} · ${new Date(s.starts_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`

/** Upload a class recording (or attach processed media) for one ended class. Same upload and attach calls as before. */
export default function UploadRecordingSheet({ open, onOpenChange, batchId, initialSessionId, initialKind = "class", sessions, rows, assets, notices, onReloadAssets, onDone }: UploadRecordingSheetProps) {
  const [kind, setKind] = useState<Kind>("class")
  const [title, setTitle] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [mode, setMode] = useState<Mode>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [noticeId, setNoticeId] = useState("")
  const [assetId, setAssetId] = useState("")
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [note, setNote] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setKind(initialKind)
    setTitle("")
    setSessionId(initialSessionId || sessions[0]?.id || "")
    setMode("upload")
    setFile(null)
    setNoticeId("")
    setAssetId("")
    setProgress(0)
    setError("")
    setNote("")
  }, [open, initialSessionId, initialKind, sessions])

  const isVideo = kind === "video"
  const existing = isVideo ? undefined : rows.find((r) => r.session_id === sessionId)
  const sessionAssets = assets.filter((a) => !a.session_id || a.session_id === sessionId)
  const pickedAsset = assets.find((a) => a.id === assetId)
  const attachBlocked = !assetId || !sessionId || (Boolean(existing) && pickedAsset?.state !== "ready")

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError("")
    setNote("")
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recording action failed")
    } finally {
      setBusy(false)
    }
  }

  const upload = () =>
    file &&
    (isVideo || sessionId) &&
    run(async () => {
      const target = await api.post<{ asset_id: string; upload: { url: string; method: string; headers: Record<string, string> } }>("/recordings/uploads", {
        ...(isVideo ? { batch_id: batchId } : { session_id: sessionId }),
        filename: file.name,
        content_type: file.type || "video/mp4",
        bytes: file.size,
      })
      setProgress(0)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open(target.upload.method, target.upload.url)
        Object.entries(target.upload.headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onerror = () => reject(new Error("Upload failed. Retry when your connection is back."))
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage rejected the upload (${xhr.status})`)))
        xhr.send(file)
      })
      await api.post(`/recordings/assets/${target.asset_id}/finalize`, {})
      setAssetId(target.asset_id)
      let recordingId: string | null = null
      if (isVideo) {
        const saved = await api.post<{ recording: RecordingRow }>("/recordings/batch-videos", { batch_id: batchId, asset_id: target.asset_id, title: title.trim() })
        recordingId = saved.recording.id
      } else if (!existing) {
        const saved = await api.post<{ recording: RecordingRow }>("/recordings/attach", { session_id: sessionId, asset_id: target.asset_id, provider_event_id: noticeId || undefined })
        recordingId = saved.recording.id
      }
      await onReloadAssets()
      const msg = isVideo
        ? "Video uploaded and queued for processing. Review it when it's ready, then publish."
        : existing
        ? "Replacement uploaded. When it finishes processing, choose it under “Use processed media” and replace."
        : "Uploaded and queued for processing. You can leave this page; review it when it's ready."
      setNote(msg)
      setFile(null)
      if (!existing || isVideo) setMode("upload")
      else setMode("attach")
      await onDone(recordingId, msg)
    })

  const attach = () =>
    run(async () => {
      const saved = existing
        ? await api.post<{ recording: RecordingRow }>(`/recordings/${existing.id}/replace`, { asset_id: assetId, expected_version: existing.version })
        : await api.post<{ recording: RecordingRow }>("/recordings/attach", { session_id: sessionId, asset_id: assetId, provider_event_id: noticeId || undefined })
      await onDone(saved.recording.id, "Attached as a draft. Review the chapters before publishing.")
    })

  const pickFile = (f: File | null | undefined) => {
    if (!f) return
    setFile(f)
    setError("")
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent side="right" className="w-full max-w-xl gap-0 p-0 sm:max-w-xl">
        <div className="flex min-h-full flex-col">
          <div className="border-b border-border px-6 pb-4 pt-6 pr-12">
            <SheetTitle>{isVideo ? "Upload batch video" : existing ? "Replace recording" : "Upload recording"}</SheetTitle>
            <SheetDescription className="mt-1">{isVideo ? "A video only this batch can watch. Review its chapters before learners see it." : "Attach the class video, then review its chapters before learners see it."}</SheetDescription>
          </div>

          <fieldset disabled={busy} className="flex min-w-0 flex-1 flex-col gap-5 px-6 py-5">
            {error && <InlineAlert tone="danger">{error}</InlineAlert>}
            {note && <InlineAlert tone="success">{note}</InlineAlert>}

            <SegmentedControl
              block
              aria-label="What are you uploading"
              value={kind}
              onChange={(v: Kind) => {
                setKind(v)
                setMode("upload")
                setAssetId("")
              }}
              options={[
                { value: "class" as Kind, label: "Class recording" },
                { value: "video" as Kind, label: "Batch video" },
              ]}
            />

            {isVideo && (
              <Field label="Title" hint="Optional. Shown to learners in this batch's recordings.">
                <Input maxLength={200} placeholder="e.g. Prerequisites refresher" value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
            )}

            {!isVideo && (<>
            <Field label="Class" hint={sessions.length ? undefined : "End a live class before uploading its recording."}>
              <CustomSelect
                value={sessionId}
                placeholder={sessions.length ? "Choose an ended class" : "No ended classes yet"}
                disabled={!sessions.length}
                onChange={(v) => {
                  setSessionId(v)
                  setAssetId("")
                }}
                options={sessions.map((s) => ({ value: s.id, label: `${sessionLabel(s)}${rows.some((r) => r.session_id === s.id) ? " · has recording" : ""}` }))}
              />
            </Field>
            {existing && (
              <InlineAlert tone="info">
                This class already has <strong>{existing.title}</strong> (v{existing.version}, {existing.status}). A new upload becomes a replacement; earlier versions stay in history.
              </InlineAlert>
            )}

            </>)}

            {!isVideo && notices.length > 0 && (
              <Field label="Zoom recording notice" hint="Optional. Check it matches this class. Notices never download or publish anything by themselves.">
                <CustomSelect
                  value={noticeId || "__manual__"}
                  onChange={(v) => setNoticeId(v === "__manual__" ? "" : v)}
                  options={[
                    { value: "__manual__", label: "None, manual upload" },
                    ...notices.map((n) => ({ value: n.id, label: `${n.title} · meeting ${n.meeting_id} · ${n.recording_start ? new Date(n.recording_start).toLocaleString() : "time unknown"}` })),
                  ]}
                />
              </Field>
            )}

            {!isVideo && <SegmentedControl
              block
              aria-label="Source"
              value={mode}
              onChange={setMode}
              options={[
                { value: "upload" as Mode, label: "Upload a file" },
                { value: "attach" as Mode, label: "Use processed media" },
              ]}
            />}

            {mode === "upload" || isVideo ? (
              <div className="space-y-3">
                <input ref={input} id="recording-file" type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
                {file ? (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-3">
                    <FileVideo className="h-5 w-5 shrink-0 text-primary-text" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-caption text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                    </div>
                    {!busy && (
                      <button
                        type="button"
                        aria-label="Remove file"
                        className="rounded p-1 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setFile(null)
                          if (input.current) input.current.value = ""
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <label
                    htmlFor="recording-file"
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(false)
                      pickFile(e.dataTransfer.files?.[0])
                    }}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
                      dragOver ? "border-primary bg-primary-soft/60" : "border-border-strong hover:border-primary-border hover:bg-primary-soft/40",
                    )}
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm font-medium text-foreground">Drop the video here or choose a file</span>
                    <span className="text-caption text-muted-foreground">MP4, WebM or MOV</span>
                  </label>
                )}
                {busy && progress > 0 && (
                  <div className="space-y-1">
                    <Progress value={progress} size="sm" label="Upload progress" />
                    <p className="text-right text-caption tabular-nums text-muted-foreground">{progress}%</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">Processed media for this class</p>
                  <Button type="button" size="sm" variant="ghost" leftIcon={<RefreshCw aria-hidden="true" />} onClick={() => void run(onReloadAssets)}>
                    Refresh
                  </Button>
                </div>
                {sessionAssets.length ? (
                  <ul className="divide-y divide-border rounded-lg border border-border" role="radiogroup" aria-label="Media assets">
                    {sessionAssets.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={assetId === a.id}
                          onClick={() => setAssetId(a.id)}
                          className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors", assetId === a.id ? "bg-primary-soft/60" : "hover:bg-surface-2")}
                        >
                          <span className={cn("h-3.5 w-3.5 shrink-0 rounded-full border", assetId === a.id ? "border-[4px] border-primary" : "border-border-strong")} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono text-caption text-foreground">{a.id.slice(0, 8)}</span>
                            {a.error && <span className="block truncate text-caption text-danger">{a.error}</span>}
                          </span>
                          {a.duration_seconds ? <span className="text-caption tabular-nums text-muted-foreground">{Math.ceil(a.duration_seconds / 60)} min</span> : null}
                          <Badge tone={a.state === "ready" ? "success" : a.state === "failed" ? "danger" : "info"} size="sm">
                            {a.state}
                          </Badge>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-md border border-dashed border-border-strong p-5 text-center text-sm text-muted-foreground">No processed media for this class yet.</p>
                )}
                {existing && pickedAsset && pickedAsset.state !== "ready" && <p className="text-caption text-warning">Only ready media can replace an existing recording.</p>}
              </div>
            )}
          </fieldset>

          <div className="sticky bottom-0 mt-auto flex items-center justify-end gap-2 border-t border-border bg-surface px-6 py-4">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {mode === "upload" || isVideo ? (
              <Button type="button" loading={busy} disabled={!file || (!isVideo && !sessionId)} leftIcon={<Upload aria-hidden="true" />} onClick={() => void upload()}>
                {busy ? `Uploading ${progress}%` : "Upload for processing"}
              </Button>
            ) : (
              <Button type="button" loading={busy} disabled={attachBlocked} leftIcon={<Link2 aria-hidden="true" />} onClick={() => void attach()}>
                {existing ? "Replace with this media" : "Attach as draft"}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
