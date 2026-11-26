import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, ChevronDown, Film, Loader2, X } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { api } from "@/lib/api"
import { cn, formatDateTime, formatDuration, timeAgo } from "@/lib/utils"
import { uploadTracker, useUploads, type UploadItem } from "@/lib/uploadTracker"

const POLL_MS = 3000
const LABEL: Record<UploadItem["phase"], string> = {
  uploading: "Uploading",
  queued: "Waiting to process",
  processing: "Processing",
  ready: "Ready. Attach it to a lesson",
  failed: "Failed",
}

/** Floating list of video uploads with their progress, from the first byte until the server has processed them. */
export default function UploadTray() {
  const uploads = useUploads()
  const [open, setOpen] = useState(true)
  const busy = uploads.some((u) => u.phase !== "ready" && u.phase !== "failed")
  // Ticks while something is in progress, so the running times move.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!busy) return
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [busy])

  // Follow server-side processing for every upload that has finished sending.
  const waiting = uploads.filter((u) => u.assetId && (u.phase === "queued" || u.phase === "processing")).map((u) => `${u.id}:${u.assetId}`).join(",")
  useEffect(() => {
    if (!waiting) return
    const poll = async () => {
      for (const pair of waiting.split(",")) {
        const [id, assetId] = pair.split(":")
        try {
          const { asset, job } = await api.get<{
            asset: { state: string; error?: string | null }
            job: { progress: number; uploaded_at: string; started_at: string | null; completed_at: string | null } | null
          }>(`/admin/media/${assetId}`, { bypassCache: true })
          const phase = asset.state === "ready" || asset.state === "failed" || asset.state === "processing" ? asset.state : "queued"
          uploadTracker.update(id!, {
            phase,
            error: asset.error ?? undefined,
            processed: job?.progress,
            uploadedAt: job?.uploaded_at,
            startedAt: job?.started_at ?? undefined,
            completedAt: job?.completed_at ?? undefined,
          })
        } catch {
          // A missed check is fine; the next one tries again.
        }
      }
    }
    const timer = window.setInterval(() => void poll(), POLL_MS)
    void poll()
    return () => window.clearInterval(timer)
  }, [waiting])

  if (!uploads.length) return null
  const active = uploads.filter((u) => u.phase !== "ready" && u.phase !== "failed").length
  const finished = uploads.length - active

  return (
    <section aria-label="Video uploads" className="fixed bottom-24 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--elev-lg)]">
      <header className="flex items-center gap-2 border-b border-border bg-surface-2/60 px-3 py-2.5">
        <Film className="h-4 w-4 text-primary-text" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{active ? `${active} ${active === 1 ? "video" : "videos"} in progress` : "Uploads finished"}</h2>
        {finished > 0 && (
          <button type="button" onClick={uploadTracker.clearFinished} className="text-caption font-medium text-muted-foreground hover:text-foreground">
            Clear finished
          </button>
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Collapse uploads" : "Expand uploads"} className="rounded p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
          <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "rotate-180")} aria-hidden="true" />
        </button>
      </header>
      {open && (
        <ul className="max-h-72 divide-y divide-border overflow-y-auto">
          {uploads.map((u) => (
            <li key={u.id} className="space-y-1.5 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={u.name}>
                  {u.name}
                </span>
                {u.phase === "ready" && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />}
                {u.phase === "failed" && <AlertCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />}
                {(u.phase === "queued" || u.phase === "processing") && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />}
                {(u.phase === "ready" || u.phase === "failed") && (
                  <button type="button" onClick={() => uploadTracker.remove(u.id)} aria-label={`Dismiss ${u.name}`} className="rounded p-0.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
              {u.phase === "uploading" && <Progress value={u.percent} size="sm" label={`Uploading ${u.name}`} />}
              {u.phase === "processing" && <Progress value={u.processed ?? 0} size="sm" tone="info" label={`Processing ${u.name}`} />}
              <p className={cn("text-caption tabular-nums", u.phase === "failed" ? "text-danger" : u.phase === "ready" ? "text-success" : "text-muted-foreground")}>
                {u.phase === "uploading"
                  ? `Uploading ${u.percent}%${u.addedAt ? ` · ${formatDuration(now - u.addedAt)}` : ""}. Keep this tab open.`
                  : u.phase === "processing"
                    ? `Processing ${u.processed ?? 0}% done${u.startedAt ? ` · ${formatDuration(now - Date.parse(u.startedAt))}` : ""}`
                    : u.phase === "ready" && u.completedAt
                      ? `Ready · processed in ${formatDuration(Date.parse(u.completedAt) - Date.parse(u.startedAt ?? u.uploadedAt ?? u.completedAt))}`
                      : u.phase === "failed"
                        ? (u.error ?? "Failed")
                        : LABEL[u.phase]}
              </p>
              {u.uploadedAt && (
                <p className="text-[11px] text-subtle-foreground">
                  Uploaded {formatDateTime(u.uploadedAt)} · {timeAgo(u.uploadedAt, now)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
