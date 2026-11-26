import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Clock, Film, Loader2, RefreshCw, RotateCcw, UploadCloud } from "lucide-react"
import { Badge, Button, Card, EmptyState, PageHeader, Progress, SegmentedControl, Skeleton } from "@/components/ui"
import type { BadgeTone } from "@/components/ui"
import { api } from "@/lib/api"
import { formatDateTime, formatDuration, timeAgo } from "@/lib/utils"

interface UploadRow {
  id: string
  state: "uploading" | "queued" | "processing" | "failed" | "ready"
  error: string | null
  created_at: string
  duration_seconds: number | null
  source_key: string
  course_title: string | null
  batch_name: string | null
  uploader: string | null
  job_state: string | null
  attempts: number | null
  max_attempts: number | null
  job_error: string | null
  /** 0-100 while processing. */
  progress: number | null
  /** When the file finished sending, when this processing attempt started, and when it finished. */
  uploaded_at: string | null
  started_at: string | null
  completed_at: string | null
}

type Filter = "all" | "active" | "failed" | "ready"
const POLL_MS = 5000
const ACTIVE = ["uploading", "queued", "processing"]

const LABEL: Record<UploadRow["state"], string> = { uploading: "Upload not finished", queued: "Waiting to process", processing: "Processing", failed: "Failed", ready: "Ready" }
const TONE: Record<UploadRow["state"], BadgeTone> = { uploading: "warning", queued: "neutral", processing: "info", failed: "danger", ready: "success" }

/** "mwx3thg2-add7c6e0-…-vidssave.com_What_is_RAG.mp4" -> "vidssave.com_What_is_RAG.mp4" */
const fileName = (key: string) => (key.split("/").pop() ?? key).replace(/^[a-z0-9]+-[0-9a-f-]{36}-/, "")
const duration = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "")

/** Every video upload and its processing state, straight from the server, so it is the same after a refresh or a new sign-in. */
export default function VideoUploadsView({ onToast }: { onToast: (msg: string) => void }) {
  const [rows, setRows] = useState<UploadRow[] | null>(null)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [retrying, setRetrying] = useState<string | null>(null)
  // Ticks every second so "3 mins ago" and the running time stay current between refreshes.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [])

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ assets: UploadRow[] }>("/admin/media/overview", { bypassCache: true })
      setRows(data.assets)
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load uploads.")
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load()
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  const retry = async (row: UploadRow) => {
    setRetrying(row.id)
    try {
      await api.post(`/admin/media/${row.id}/retry`, {})
      onToast("Processing restarted")
      await load()
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Couldn't retry this upload.")
    } finally {
      setRetrying(null)
    }
  }

  const counts = useMemo(() => {
    const all = rows ?? []
    return { all: all.length, active: all.filter((r) => ACTIVE.includes(r.state)).length, failed: all.filter((r) => r.state === "failed").length, ready: all.filter((r) => r.state === "ready").length }
  }, [rows])
  const shown = (rows ?? []).filter((r) => filter === "all" || (filter === "active" ? ACTIVE.includes(r.state) : r.state === filter))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Media"
        title="Video uploads"
        description="Every course video and where it is: uploading, processing, ready or failed. This list is kept on the server."
        actions={
          <Button variant="outline" leftIcon={<RefreshCw aria-hidden="true" />} onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "In progress", value: counts.active, icon: Loader2, tone: "text-info" },
          { label: "Failed", value: counts.failed, icon: AlertCircle, tone: "text-danger" },
          { label: "Ready", value: counts.ready, icon: CheckCircle2, tone: "text-success" },
          { label: "All uploads", value: counts.all, icon: Film, tone: "text-muted-foreground" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="flex items-center gap-3 p-4">
            <Icon className={`h-5 w-5 shrink-0 ${tone}`} aria-hidden="true" />
            <div>
              <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
              <p className="text-caption text-muted-foreground">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <SegmentedControl
        size="sm"
        aria-label="Filter uploads"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all" as Filter, label: `All ${counts.all}` },
          { value: "active" as Filter, label: `In progress ${counts.active}` },
          { value: "failed" as Filter, label: `Failed ${counts.failed}` },
          { value: "ready" as Filter, label: `Ready ${counts.ready}` },
        ]}
      />

      {error && !rows ? (
        <EmptyState icon={<AlertCircle aria-hidden="true" />} title="Uploads didn't load" description={error} action={<Button onClick={() => void load()}>Try again</Button>} />
      ) : !rows ? (
        <div className="space-y-3" role="status" aria-label="Loading uploads">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<UploadCloud aria-hidden="true" />}
          title={rows.length ? "Nothing in this view" : "No videos uploaded yet"}
          description={rows.length ? "Try another filter." : "Upload a video from a course. It will appear here at once."}
        />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {shown.map((r) => {
            const reason = r.error ?? r.job_error
            return (
              <div key={r.id} className="flex flex-wrap items-start gap-3 px-4 py-3.5">
                <Film className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground" title={fileName(r.source_key)}>
                    {fileName(r.source_key)}
                  </p>
                  <p className="mt-0.5 truncate text-caption text-muted-foreground">
                    {[r.course_title ?? r.batch_name ?? "No course", r.uploader && `by ${r.uploader}`, duration(r.duration_seconds)].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    {r.uploaded_at ? (
                      <>
                        Uploaded <span className="font-medium text-foreground">{formatDateTime(r.uploaded_at)}</span> · {timeAgo(r.uploaded_at, now)}
                      </>
                    ) : (
                      <>Upload started {formatDateTime(r.created_at)} · {timeAgo(r.created_at, now)}</>
                    )}
                  </p>
                  {r.state === "processing" && (
                    <div className="mt-2 max-w-md">
                      <Progress value={r.progress ?? 0} size="sm" label={`Processing ${fileName(r.source_key)}`} />
                      <p className="mt-1 text-caption tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{r.progress ?? 0}% done</span>
                        {r.started_at && ` · running ${formatDuration(now - Date.parse(r.started_at))}`}
                      </p>
                    </div>
                  )}
                  {r.state === "queued" && <p className="mt-1 text-caption text-muted-foreground">Waiting for the media worker{r.uploaded_at && ` · queued ${timeAgo(r.uploaded_at, now)}`}</p>}
                  {r.state === "ready" && r.completed_at && (
                    <p className="mt-1 flex items-center gap-1.5 text-caption text-success">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Processed in {formatDuration(Date.parse(r.completed_at) - Date.parse(r.started_at ?? r.uploaded_at ?? r.completed_at))} · finished {formatDateTime(r.completed_at)}
                    </p>
                  )}
                  {r.state === "failed" && reason && <p className="mt-1 flex items-start gap-1.5 text-caption text-danger"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{reason}</p>}
                  {r.state === "uploading" && <p className="mt-1 flex items-center gap-1.5 text-caption text-warning"><Clock className="h-3.5 w-3.5" aria-hidden="true" />The file never finished sending. Upload it again from the course.</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.attempts ? <span className="hidden text-caption tabular-nums text-muted-foreground sm:inline">Try {r.attempts}/{r.max_attempts}</span> : null}
                  <Badge tone={TONE[r.state]} dot>
                    {LABEL[r.state]}
                  </Badge>
                  {r.state === "failed" && r.job_state === "failed" && (
                    <Button size="sm" variant="outline" loading={retrying === r.id} leftIcon={<RotateCcw aria-hidden="true" />} onClick={() => void retry(r)}>
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
