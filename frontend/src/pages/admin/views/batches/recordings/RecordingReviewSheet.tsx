import { useCallback, useEffect, useState } from "react"
import { ChevronDown, History, Loader2, Plus, RotateCw, Save, Send, Trash2, Undo2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DateTimePicker } from "@/components/ui/date-picker"
import Field from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import RecordingPlayer, { type ReplayChapter } from "@/components/live/RecordingPlayer"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { announceApprovalsChanged } from "../../shared/usePendingApprovals"
import { deviceTimezone, InlineAlert, toLocalInput } from "../parts"
import type { RecordingDetail } from "./types"

interface RecordingReviewSheetProps {
  recordingId: string | null
  title?: string
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

const mmss = (sec: number) => (Number.isFinite(sec) && sec >= 0 ? `${Math.floor(sec / 60)}:${String(Math.floor(sec) % 60).padStart(2, "0")}` : "--:--")
const chapterKey = (c: ReplayChapter[]) => JSON.stringify(c.map((x) => ({ title: x.title, start_seconds: x.start_seconds, end_seconds: x.end_seconds })))

/** Review one recording: watch, edit title, summary, availability and chapters, then publish. Same endpoints as before. */
export default function RecordingReviewSheet({ recordingId, title: fallbackTitle, onOpenChange, onChanged }: RecordingReviewSheetProps) {
  const open = Boolean(recordingId)
  const [detail, setDetail] = useState<RecordingDetail | null>(null)
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [release, setRelease] = useState("")
  const [expires, setExpires] = useState("")
  const [chapters, setChapters] = useState<ReplayChapter[]>([])
  const [history, setHistory] = useState<{ version: number; created_at: string; snapshot: { status: string; title: string } }[] | null>(null)
  const [playerKey, setPlayerKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [tab, setTab] = useState("details")

  const loadDetail = useCallback(async () => {
    if (!recordingId) return
    const r = await api.get<RecordingDetail>(`/recordings/${recordingId}`, { bypassCache: true })
    setDetail(r)
    setTitle(r.recording.title)
    setSummary(r.recording.summary)
    setRelease(toLocalInput(r.recording.release_at))
    setExpires(toLocalInput(r.recording.expires_at))
    setChapters(r.chapters)
  }, [recordingId])

  useEffect(() => {
    setDetail(null)
    setHistory(null)
    setError("")
    setMessage("")
    setTab("details")
    void loadDetail().catch((e) => setError(e.message))
  }, [loadDetail])

  // Poll while the media is still processing.
  useEffect(() => {
    if (!detail || !["queued", "processing"].includes(detail.asset.state)) return
    const t = window.setTimeout(() => void loadDetail().catch((e) => setError(e.message)), 4000)
    return () => window.clearTimeout(t)
  }, [detail, loadDetail])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await action()
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recording action failed")
    } finally {
      setBusy(false)
    }
  }

  const rec = detail?.recording
  const dirty =
    !!detail &&
    (title !== detail.recording.title ||
      summary !== detail.recording.summary ||
      release !== toLocalInput(detail.recording.release_at) ||
      expires !== toLocalInput(detail.recording.expires_at) ||
      chapterKey(chapters) !== chapterKey(detail.chapters))
  const published = rec?.status === "Published"
  const request = detail?.approval?.state === "Pending" && detail.approval.target_version === detail.recording.version ? detail.approval : null
  const ready = detail?.asset.state === "ready"

  const saveReview = () =>
    detail &&
    run(async () => {
      if (chapters.some((c) => !Number.isFinite(c.start_seconds) || !Number.isFinite(c.end_seconds) || c.start_seconds < 0 || c.end_seconds < 1)) {
        throw new Error("Enter valid start and end seconds for every chapter.")
      }
      await api.patch(`/recordings/${recordingId}`, {
        expected_version: detail.recording.version,
        title,
        summary,
        release_at: release === toLocalInput(detail.recording.release_at) ? detail.recording.release_at : new Date(release).toISOString(),
        expires_at: expires === toLocalInput(detail.recording.expires_at) ? detail.recording.expires_at : new Date(expires).toISOString(),
        chapters,
      })
      await loadDetail()
      setPlayerKey((v) => v + 1)
      if (request) announceApprovalsChanged()
      setMessage(request ? "Saved as a draft. The teacher's waiting request was replaced by your edit." : "Saved as a draft. Publish when ready.")
    })

  const togglePublish = () =>
    detail &&
    run(async () => {
      if (dirty) throw new Error("Save your changes before publishing.")
      await api.post(`/recordings/${recordingId}/publish`, { expected_version: detail.recording.version, publish: detail.recording.status !== "Published" })
      await loadDetail()
      if (request) announceApprovalsChanged()
      setMessage(detail.recording.status === "Published" ? "Replay unpublished." : request ? "Replay published. The teacher's request is marked approved." : "Replay published with its saved release and expiry window.")
    })

  const addChapter = () =>
    setChapters((v) => {
      const last = v[v.length - 1]
      const total = detail?.asset.duration_seconds ?? 1
      if (!last) return [{ title: "Full session", start_seconds: 0, end_seconds: total }]
      const split = Math.floor((last.start_seconds + last.end_seconds) / 2)
      if (split <= last.start_seconds) return v
      return [...v.slice(0, -1), { ...last, end_seconds: split }, { title: `Chapter ${v.length + 1}`, start_seconds: split, end_seconds: last.end_seconds }]
    })

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent side="right" className="w-full max-w-3xl gap-0 p-0 sm:max-w-3xl">
        <div className="flex min-h-full flex-col">
          <div className="border-b border-border px-6 pb-4 pt-6 pr-12">
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle className="min-w-0 truncate">{rec?.title ?? fallbackTitle ?? "Recording"}</SheetTitle>
              {rec && (
                <Badge tone={published ? "success" : "warning"} dot>
                  {rec.status}
                </Badge>
              )}
              {rec && <span className="text-caption text-muted-foreground">v{rec.version}</span>}
            </div>
            <SheetDescription className="mt-1">Editing a published recording returns it to draft until you publish again.</SheetDescription>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-5 px-6 py-5">
            {error && <InlineAlert tone="danger">{error}</InlineAlert>}
            {message && <InlineAlert tone="success">{message}</InlineAlert>}
            {request && !published && (
              <InlineAlert tone="warning">
                The teacher asked to publish this version{request.note ? `: “${request.note}”` : "."} Publishing approves their request; saving an edit replaces it.
              </InlineAlert>
            )}

            {!detail ? (
              !error && (
                <div className="space-y-3" role="status" aria-label="Loading recording">
                  <Skeleton className="aspect-video w-full" />
                  <Skeleton className="h-10" />
                </div>
              )
            ) : !ready ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-2/60 px-6 py-10 text-center">
                {detail.asset.state === "failed" ? (
                  <>
                    <p className="text-sm font-medium text-danger">Processing failed</p>
                    {detail.asset.error && <p className="max-w-md text-caption text-muted-foreground">{detail.asset.error}</p>}
                    <Button
                      size="sm"
                      loading={busy}
                      leftIcon={<RotateCw aria-hidden="true" />}
                      onClick={() =>
                        void run(async () => {
                          await api.post(`/recordings/assets/${detail.asset.id}/retry`, {})
                          await loadDetail()
                          setMessage("Processing retry queued.")
                        })
                      }
                    >
                      Retry processing
                    </Button>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-primary-text" aria-hidden="true" />
                    <p className="text-sm font-medium text-foreground">Processing the video ({detail.asset.state})</p>
                    <p className="max-w-sm text-caption text-muted-foreground">Transcripts and chapters appear when it's done. This page checks every few seconds; you can close it meanwhile.</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-lg bg-black">
                  <RecordingPlayer key={`${recordingId}:${playerKey}`} recordingId={recordingId!} />
                </div>

                <Tabs value={tab} onValueChange={setTab} variant="underline">
                  <TabsList aria-label="Review sections" className="w-full justify-start">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="chapters">
                      Chapters <span className="tabular-nums text-subtle-foreground">{chapters.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="transcript">Transcript</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-4">
                    <fieldset disabled={busy} className="space-y-4">
                      <Field label="Title">
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                      </Field>
                      <Field label="Summary">
                        <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
                      </Field>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Release at">
                          <DateTimePicker value={release} onChange={setRelease} placeholder="Select release date & time" />
                        </Field>
                        <Field label="Access ends">
                          <DateTimePicker value={expires} min={release || undefined} onChange={setExpires} placeholder="Select expiry date & time" />
                        </Field>
                      </div>
                      <p className="text-caption text-muted-foreground">Times in your device timezone ({deviceTimezone()}). The batch's replay delay and access period still apply.</p>
                    </fieldset>
                  </TabsContent>

                  <TabsContent value="chapters" className="mt-4">
                    <fieldset disabled={busy} className="space-y-3">
                      <p className="text-caption text-muted-foreground">Draft titles come from the transcript. Check each title and time. Times are seconds from the start.</p>
                      {chapters.length === 0 && <p className="rounded-md border border-dashed border-border-strong p-4 text-center text-sm text-muted-foreground">No chapters yet.</p>}
                      <ol className="space-y-2">
                        {chapters.map((c, i) => (
                          <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-end gap-2 rounded-lg border border-border p-3 sm:grid-cols-[28px_minmax(0,1fr)_96px_96px_auto]">
                            <span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary-text">{i + 1}</span>
                            <Field label="Title">
                              <Input aria-label={`Chapter ${i + 1} title`} value={c.title} onChange={(e) => setChapters((v) => v.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                            </Field>
                            <Field label={`Start · ${mmss(c.start_seconds)}`} className="col-start-2 sm:col-start-auto">
                              <Input type="number" min={0} placeholder="0" value={c.start_seconds} onChange={(e) => setChapters((v) => v.map((x, j) => (j === i ? { ...x, start_seconds: e.target.value === "" ? Number.NaN : Number(e.target.value) } : x)))} />
                            </Field>
                            <Field label={`End · ${mmss(c.end_seconds)}`} className="col-start-2 sm:col-start-auto">
                              <Input type="number" min={1} placeholder="60" value={c.end_seconds} onChange={(e) => setChapters((v) => v.map((x, j) => (j === i ? { ...x, end_seconds: e.target.value === "" ? Number.NaN : Number(e.target.value) } : x)))} />
                            </Field>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              className="col-start-3 row-start-1 mb-0.5 text-danger hover:bg-danger/10 hover:text-danger sm:col-start-auto sm:row-start-auto"
                              aria-label={`Remove chapter ${i + 1}`}
                              onClick={() => setChapters((v) => v.filter((_, j) => j !== i))}
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </li>
                        ))}
                      </ol>
                      <Button type="button" size="sm" variant="outline" leftIcon={<Plus aria-hidden="true" />} onClick={addChapter}>
                        Split last chapter
                      </Button>
                    </fieldset>
                  </TabsContent>

                  <TabsContent value="transcript" className="mt-4">
                    {detail.asset.transcript?.length ? (
                      <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1 text-sm">
                        {detail.asset.transcript.map((seg, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="w-12 shrink-0 font-mono text-caption tabular-nums text-subtle-foreground">{mmss(seg.start)}</span>
                            <span className="text-muted-foreground">{seg.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No speech was detected in this recording.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}

            {detail && (
              <div className="border-t border-border pt-4">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="-ml-2"
                  leftIcon={<History aria-hidden="true" />}
                  rightIcon={<ChevronDown className={cn("transition-transform", history && "rotate-180")} aria-hidden="true" />}
                  onClick={() =>
                    history
                      ? setHistory(null)
                      : void run(async () => {
                          const r = await api.get<{ revisions: NonNullable<typeof history> }>(`/recordings/${recordingId}/history`, { bypassCache: true })
                          setHistory(r.revisions)
                        })
                  }
                >
                  Version history
                </Button>
                {history && (
                  <ul className="mt-2 space-y-1.5">
                    {history.length === 0 && <li className="text-caption text-muted-foreground">No earlier versions.</li>}
                    {history.map((h) => (
                      <li key={h.version} className="flex items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2 text-caption">
                        <span className="min-w-0 truncate text-foreground">
                          v{h.version} · {h.snapshot.title}
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {h.snapshot.status} · {new Date(h.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {detail && ready && (
            <div className="sticky bottom-0 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4">
              <p className="text-caption text-muted-foreground">{dirty ? "Unsaved changes" : published ? "Learners can watch this replay" : "Draft: learners can't see it yet"}</p>
              <div className="flex gap-2">
                {dirty && (
                  <Button type="button" variant="ghost" disabled={busy} leftIcon={<Undo2 aria-hidden="true" />} onClick={() => void loadDetail()}>
                    Discard
                  </Button>
                )}
                <Button type="button" variant={dirty ? "primary" : "outline"} disabled={busy || !dirty} loading={busy && dirty} leftIcon={<Save aria-hidden="true" />} onClick={() => void saveReview()}>
                  Save
                </Button>
                <Button type="button" variant={published ? "outline" : dirty ? "outline" : "primary"} disabled={busy || dirty} leftIcon={<Send aria-hidden="true" />} onClick={() => void togglePublish()}>
                  {published ? "Unpublish" : request ? "Approve and publish" : "Publish replay"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
