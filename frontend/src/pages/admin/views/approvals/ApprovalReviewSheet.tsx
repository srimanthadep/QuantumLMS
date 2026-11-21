import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowUpRight, CalendarClock, Check, Clock3, Layers, Loader2, MessageSquareQuote, X } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import RecordingPlayer from "@/components/live/RecordingPlayer"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { InlineAlert } from "../batches/parts"
import type { RecordingDetail } from "../batches/recordings/types"
import { useAdminBase } from "../shared/useAdminBase"
import { type ApprovalItem, dateTime, minutes, recordingTitle, shortDate, STATE_META, teacherName, timeAgo } from "./approvalTypes"

interface ApprovalReviewSheetProps {
  item: ApprovalItem | null
  onOpenChange: (open: boolean) => void
  /** Approve the request; resolves when the server has published the replay. */
  onApprove: (item: ApprovalItem) => Promise<void>
  /** Open the decline dialog for this request. */
  onDecline: (item: ApprovalItem) => void
  busy: boolean
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec) % 60).padStart(2, "0")}`

/** Watch the recording a teacher wants to publish, check chapters and access dates, then approve or decline. */
export default function ApprovalReviewSheet({ item, onOpenChange, onApprove, onDecline, busy }: ApprovalReviewSheetProps) {
  const navigate = useNavigate()
  const base = useAdminBase()
  const [detail, setDetail] = useState<RecordingDetail | null>(null)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("chapters")
  const recordingId = item?.recording_id ?? null

  const load = useCallback(async () => {
    if (!recordingId) return
    const r = await api.get<RecordingDetail>(`/recordings/${recordingId}`, { bypassCache: true })
    setDetail(r)
  }, [recordingId])

  useEffect(() => {
    setDetail(null)
    setError("")
    setTab("chapters")
    void load().catch((e) => setError(e instanceof Error ? e.message : "Could not load this recording."))
  }, [load])

  const pending = item?.state === "Pending"
  const stale = !!detail && !!item && pending && detail.recording.version !== item.target_version
  const ready = detail?.asset.state === "ready"
  const meta = item ? STATE_META[item.state] : null

  return (
    <Sheet open={!!item} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent side="right" className="w-full max-w-3xl gap-0 p-0 sm:max-w-3xl">
        {item && (
          <div className="flex min-h-full flex-col">
            <div className="border-b border-border px-6 pb-4 pt-6 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="min-w-0 truncate">{recordingTitle(item)}</SheetTitle>
                {meta && (
                  <Badge tone={meta.tone} dot>
                    {meta.label}
                  </Badge>
                )}
              </div>
              <SheetDescription className="mt-1">
                {[item.batch_name ?? "Batch removed", item.course_title, item.session_starts_at && `Class on ${shortDate(item.session_starts_at)}`].filter(Boolean).join(" · ")}
              </SheetDescription>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-5 px-6 py-5">
              {error && <InlineAlert tone="danger">{error}</InlineAlert>}
              {stale && <InlineAlert tone="warning">The teacher edited this recording after asking. Decline this request; they can submit the new version.</InlineAlert>}
              {pending && item.replay_enabled === false && (
                <InlineAlert tone="info">Replays are turned off for this batch. Approving publishes the recording, but learners only see it once replays are turned on in the batch settings.</InlineAlert>
              )}

              <div className="rounded-lg border border-border bg-surface-2/50 p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={teacherName(item)} src={item.requested_by_avatar} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{teacherName(item)}</span> <span className="text-muted-foreground">asked to publish version {item.target_version}</span>
                    </p>
                    <p className="mt-0.5 text-caption text-muted-foreground">
                      <time dateTime={item.created_at} title={dateTime(item.created_at)}>
                        {timeAgo(item.created_at)}
                      </time>
                    </p>
                    {item.note ? (
                      <blockquote className="mt-3 flex gap-2 rounded-md border-l-2 border-primary/50 bg-surface px-3 py-2 text-sm leading-relaxed text-foreground">
                        <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-text" aria-hidden="true" />
                        <span className="whitespace-pre-wrap break-words">{item.note}</span>
                      </blockquote>
                    ) : (
                      <p className="mt-2 text-caption text-subtle-foreground">No note from the teacher.</p>
                    )}
                  </div>
                </div>
                {!pending && (
                  <div className="mt-4 border-t border-border pt-3 text-caption text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">{meta?.label}</span>
                      {item.decided_by_name && ` by ${item.decided_by_name}`}
                      {item.decided_at && ` · ${dateTime(item.decided_at)}`}
                    </p>
                    {item.decision_note && <p className="mt-1 whitespace-pre-wrap break-words text-foreground">{item.decision_note}</p>}
                  </div>
                )}
              </div>

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
                    <p className="text-sm font-medium text-danger">The video failed processing. Decline and ask the teacher to upload it again.</p>
                  ) : (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin text-primary-text" aria-hidden="true" />
                      <p className="text-sm font-medium text-foreground">The video is still processing</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-lg bg-black">
                    <RecordingPlayer key={`${detail.recording.id}:${detail.recording.version}`} recordingId={detail.recording.id} />
                  </div>

                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Fact icon={Clock3} label="Length" value={minutes(detail.asset.duration_seconds) ?? "—"} className="col-span-2 sm:col-span-1" />
                    <Fact icon={CalendarClock} label="Watchable from" value={dateTime(detail.recording.release_at)} />
                    <Fact icon={CalendarClock} label="Access ends" value={dateTime(detail.recording.expires_at)} />
                  </dl>

                  <Tabs value={tab} onValueChange={setTab} variant="underline">
                    <TabsList aria-label="Recording details" className="w-full justify-start">
                      <TabsTrigger value="chapters">
                        Chapters <span className="tabular-nums text-subtle-foreground">{detail.chapters.length}</span>
                      </TabsTrigger>
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="transcript">Transcript</TabsTrigger>
                    </TabsList>
                    <TabsContent value="chapters" className="mt-4">
                      {detail.chapters.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No chapters.</p>
                      ) : (
                        <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                          {detail.chapters.map((c, i) => (
                            <li key={`${c.start_seconds}-${i}`} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary-text">{i + 1}</span>
                              <span className="min-w-0 flex-1 truncate text-foreground">{c.title}</span>
                              <span className="shrink-0 font-mono text-caption tabular-nums text-muted-foreground">
                                {mmss(c.start_seconds)} – {mmss(c.end_seconds)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </TabsContent>
                    <TabsContent value="summary" className="mt-4">
                      {detail.recording.summary ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{detail.recording.summary}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No summary was written.</p>
                      )}
                    </TabsContent>
                    <TabsContent value="transcript" className="mt-4">
                      {detail.asset.transcript?.length ? (
                        <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1 text-sm">
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
            </div>

            <div className="sticky bottom-0 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4">
              {item.batch_id ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-2"
                  disabled={busy}
                  leftIcon={<Layers aria-hidden="true" />}
                  rightIcon={<ArrowUpRight aria-hidden="true" />}
                  onClick={() => navigate(`${base}/batches/${item.batch_id}?tab=recordings`)}
                >
                  Open in batch
                </Button>
              ) : (
                <span />
              )}
              {pending && (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={busy} leftIcon={<X aria-hidden="true" />} onClick={() => onDecline(item)}>
                    Decline
                  </Button>
                  <Button type="button" disabled={busy || !ready || stale} loading={busy} leftIcon={<Check aria-hidden="true" />} onClick={() => void onApprove(item)}>
                    Approve and publish
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Fact({ icon: Icon, label, value, className }: { icon: typeof Clock3; label: string; value: string; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-lg border border-border px-3 py-2.5", className)}>
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  )
}
