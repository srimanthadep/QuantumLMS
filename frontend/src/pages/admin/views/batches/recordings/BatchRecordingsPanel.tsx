import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Clapperboard, Clock3, FileVideo, Loader2, PlayCircle, RefreshCw, Upload } from "lucide-react"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { SegmentedControl } from "@/components/ui/tabs"
import type { DatedSession } from "@/components/live/LiveSessionsPanel"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { EmptyBlock, InlineAlert, MiniStat, TabHeader } from "../parts"
import RecordingReviewSheet from "./RecordingReviewSheet"
import UploadRecordingSheet from "./UploadRecordingSheet"
import type { MediaAsset, ProviderNotice, RecordingRow } from "./types"

type Filter = "all" | "published" | "draft" | "attention"

const STATE_TONE: Record<string, BadgeTone> = { ready: "success", processing: "info", queued: "info", failed: "danger" }

interface BatchRecordingsPanelProps {
  batchId: string
  /** Pre-selects this ended class when the upload sheet opens (from Live sessions). */
  focusSessionId?: string | null
  onFocusHandled?: () => void
}

/** Recordings tab: replay access, every recording with its state, upload and review. Admin endpoints as before. */
export default function BatchRecordingsPanel({ batchId, focusSessionId, onFocusHandled }: BatchRecordingsPanelProps) {
  const [rows, setRows] = useState<RecordingRow[]>([])
  const [sessions, setSessions] = useState<DatedSession[]>([])
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [notices, setNotices] = useState<ProviderNotice[]>([])
  const [globalEnabled, setGlobalEnabled] = useState(true)
  const [batchEnabled, setBatchEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [upload, setUpload] = useState<{ sessionId: string; kind?: "class" | "video" } | null>(null)

  const reload = useCallback(async () => {
    try {
      const r = await api.get<{ recordings: RecordingRow[]; replay_enabled: boolean }>(`/recordings?${new URLSearchParams({ batch_id: batchId })}`, { bypassCache: true })
      setRows(r.recordings)
      setGlobalEnabled(r.replay_enabled)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load recordings")
    } finally {
      setLoading(false)
    }
  }, [batchId])
  useEffect(() => {
    void reload()
    const t = window.setInterval(() => void reload(), 15000)
    return () => window.clearInterval(t)
  }, [reload])

  const loadSessions = useCallback(async () => {
    const r = await api.get<{ sessions: DatedSession[] }>(`/sessions?batch_id=${encodeURIComponent(batchId)}`, { bypassCache: true })
    setSessions(r.sessions.filter((s) => s.status === "Ended" && s.actual_end))
  }, [batchId])
  const loadAssets = useCallback(async () => {
    const r = await api.get<{ assets: MediaAsset[]; replay_enabled: boolean }>(`/recordings/batches/${batchId}/assets`, { bypassCache: true })
    setAssets(r.assets)
    setBatchEnabled(r.replay_enabled)
  }, [batchId])
  useEffect(() => {
    void loadSessions().catch((e) => setError(e.message))
    void loadAssets().catch((e) => setError(e.message))
    api
      .get<{ notices: ProviderNotice[] }>("/recordings/provider-notices", { bypassCache: true })
      .then((r) => setNotices(r.notices))
      .catch(() => {})
  }, [loadSessions, loadAssets])

  // Arriving from Live sessions: open the matching recording, or the upload sheet for that class.
  useEffect(() => {
    if (!focusSessionId || loading) return
    const existing = rows.find((r) => r.session_id === focusSessionId)
    if (existing) setReviewId(existing.id)
    else setUpload({ sessionId: focusSessionId })
    onFocusHandled?.()
  }, [focusSessionId, loading, rows, onFocusHandled])

  const toggleReplay = async (enabled: boolean) => {
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await api.put(`/recordings/batches/${batchId}/settings`, { replay_enabled: enabled })
      setBatchEnabled(enabled)
      setMessage(enabled ? "Replays are on for this batch." : "Replays are off for this batch.")
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change replay access")
    } finally {
      setBusy(false)
    }
  }

  const stats = useMemo(() => {
    const published = rows.filter((r) => r.status === "Published").length
    const processing = rows.filter((r) => r.processing_state === "processing" || r.processing_state === "queued").length
    const failed = rows.filter((r) => r.processing_state === "failed").length
    return { published, drafts: rows.length - published, processing, failed }
  }, [rows])

  const visible = rows.filter((r) =>
    filter === "all"
      ? true
      : filter === "published"
        ? r.status === "Published"
        : filter === "draft"
          ? r.status !== "Published"
          : r.processing_state === "failed" || r.processing_state === "processing" || r.processing_state === "queued",
  )
  const endedWithout = sessions.filter((s) => !rows.some((r) => r.session_id === s.id))

  return (
    <div className="space-y-5">
      <TabHeader title="Recordings" description="Class recordings and extra videos for this batch. Review chapters, then publish to learners.">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Reload recordings" onClick={() => void reload()}>
          <RefreshCw aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" size="sm" leftIcon={<Upload aria-hidden="true" />} onClick={() => setUpload({ sessionId: "", kind: "video" })}>
          Upload video
        </Button>
        <Button type="button" size="sm" leftIcon={<Upload aria-hidden="true" />} onClick={() => setUpload({ sessionId: endedWithout[0]?.id ?? sessions[0]?.id ?? "", kind: sessions.length ? "class" : "video" })}>
          Upload recording
        </Button>
      </TabHeader>

      {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      {message && <InlineAlert tone="success">{message}</InlineAlert>}

      <Card className="flex items-center gap-4 p-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", batchEnabled && globalEnabled ? "bg-success-soft text-success" : "bg-surface-2 text-muted-foreground")}>
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Class replays for this batch</p>
            <p className="text-caption text-muted-foreground">
              {!globalEnabled ? "Replays are turned off academy-wide, so learners can't watch class replays." : batchEnabled ? "Learners can watch published class replays. Batch videos are always available once published." : "Class replays are hidden for now. Published batch videos stay available."}
            </p>
          </div>
        </div>
        <Switch className="shrink-0" aria-label="Class replays for this batch" checked={batchEnabled} disabled={busy} onCheckedChange={(v) => void toggleReplay(v)} />
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon={CheckCircle2} label="Published" value={stats.published} tone="success" active={filter === "published"} onClick={() => setFilter((f) => (f === "published" ? "all" : "published"))} />
        <MiniStat icon={FileVideo} label="Drafts" value={stats.drafts} tone="warning" active={filter === "draft"} onClick={() => setFilter((f) => (f === "draft" ? "all" : "draft"))} />
        <MiniStat icon={Loader2} label="Processing" value={stats.processing} tone="info" active={filter === "attention"} onClick={() => setFilter((f) => (f === "attention" ? "all" : "attention"))} />
        <MiniStat
          icon={Clapperboard}
          label="Classes without one"
          value={endedWithout.length}
          tone={endedWithout.length ? "danger" : "neutral"}
          hint={stats.failed ? `${stats.failed} failed processing` : endedWithout.length ? "Ended but not uploaded" : "All caught up"}
          onClick={endedWithout.length ? () => setUpload({ sessionId: endedWithout[0].id }) : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          size="sm"
          aria-label="Filter recordings"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all" as Filter, label: `All ${rows.length}` },
            { value: "published" as Filter, label: `Published ${stats.published}` },
            { value: "draft" as Filter, label: `Drafts ${stats.drafts}` },
            { value: "attention" as Filter, label: `In progress ${stats.processing + stats.failed}` },
          ]}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyBlock
          icon={Clapperboard}
          title={rows.length ? "Nothing in this view" : "No recordings yet"}
          description={rows.length ? "Choose another filter." : "Upload a video for this batch, or add the recording of an ended class."}
        >
          {!rows.length && (
            <Button size="sm" leftIcon={<Upload aria-hidden="true" />} onClick={() => setUpload({ sessionId: endedWithout[0]?.id ?? sessions[0]?.id ?? "", kind: sessions.length ? "class" : "video" })}>
              {sessions.length ? "Upload recording" : "Upload video"}
            </Button>
          )}
        </EmptyBlock>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((r) => {
            const session = sessions.find((s) => s.id === r.session_id)
            const published = r.status === "Published"
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setReviewId(r.id)}
                  className="group flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-surface text-left shadow-[var(--elev-xs)] transition-[border-color,box-shadow,translate] hover:-translate-y-0.5 hover:border-border-strong/60 hover:shadow-[var(--elev-md)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
                >
                  <div className="relative flex aspect-[16/7] items-center justify-center bg-ink-950 text-white">
                    <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_10%,rgba(139,124,255,0.35),transparent_55%)]" aria-hidden="true" />
                    <PlayCircle className="relative h-9 w-9 opacity-80 transition-transform group-hover:scale-110" aria-hidden="true" />
                    <span className="absolute left-3 top-3">
                      <Badge tone={published ? "success" : "warning"} dot className="bg-ink-950/75 text-white ring-1 ring-white/15 backdrop-blur-md">
                        {!published && r.approval_state === "Pending" ? "Awaiting approval" : r.status}
                      </Badge>
                    </span>
                    {r.duration_seconds ? (
                      <span className="absolute bottom-2.5 right-3 rounded bg-ink-950/75 px-1.5 py-0.5 text-[11px] font-medium tabular-nums">{Math.ceil(r.duration_seconds / 60)} min</span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{r.title}</p>
                    <p className="text-caption text-muted-foreground">
                      {session ? new Date(session.starts_at).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : r.session_id ? r.batch_name : "Batch video"} · v{r.version}
                    </p>
                    {r.processing_error && (
                      <p className="flex items-start gap-1.5 text-caption text-danger">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="line-clamp-2">{r.processing_error}</span>
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5 text-caption">
                      <Badge tone={STATE_TONE[r.processing_state] ?? "neutral"} size="sm">
                        {r.processing_state}
                      </Badge>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock3 className="h-3 w-3" aria-hidden="true" />
                        Until {new Date(r.expires_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <UploadRecordingSheet
        open={!!upload}
        onOpenChange={(o) => !o && setUpload(null)}
        batchId={batchId}
        initialSessionId={upload?.sessionId ?? ""}
        initialKind={upload?.kind ?? "class"}
        sessions={sessions}
        rows={rows}
        assets={assets}
        notices={notices}
        onReloadAssets={loadAssets}
        onDone={async (recordingId, note) => {
          await reload()
          setMessage(note)
          if (recordingId) {
            setUpload(null)
            setReviewId(recordingId)
          }
        }}
      />

      <RecordingReviewSheet
        recordingId={reviewId}
        onOpenChange={(o) => !o && setReviewId(null)}
        onChanged={() => void reload()}
        title={rows.find((r) => r.id === reviewId)?.title}
      />
    </div>
  )
}
