import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarDays, Clock, PlayCircle, Radio, Users, Video } from "lucide-react"
import { Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui"
import { api } from "@/lib/api"
import type { EnrollmentTarget } from "@/components/student/EnrollmentDialog"
import type { StudentNavPage } from "./studentTypes"

type MyBatch = {
  id: string
  name: string
  instructor: string
  schedule: string
  timezone: string
  starts_at: string | null
  ends_at: string | null
  lifecycle: string
  registration_state: string
  topic: string | null
  next_session_at: string | null
  replay_count: number
  video_count: number
}
type OpenBatch = {
  id: string
  name: string
  instructor: string
  schedule: string
  timezone: string
  starts_at: string | null
  offer_id: string
  price: number
  topic: string | null
  seats_left: number
  description: string | null
}

type BatchTarget = Extract<EnrollmentTarget, { kind: "batch" }>

interface LiveBatchesTabProps {
  query: string
  /** Bumps after a successful join so the lists reload. */
  refreshKey: number
  onJoin: (target: BatchTarget) => void
  onNavigate: (page: StudentNavPage) => void
  onCount?: (count: number) => void
}

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Dates to be announced")

/** Live batches are separate from courses: the learner's own cohorts first, then cohorts open for registration. */
export default function LiveBatchesTab({ query, refreshKey, onJoin, onNavigate, onCount }: LiveBatchesTabProps) {
  const [mine, setMine] = useState<MyBatch[] | null>(null)
  const [open, setOpen] = useState<OpenBatch[]>([])
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const [m, o] = await Promise.all([api.get<{ batches: MyBatch[] }>("/student/batches", { bypassCache: true }), api.get<{ batches: OpenBatch[] }>("/catalog/batches", { bypassCache: true })])
      setMine(m.batches)
      setOpen(o.batches)
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load live batches.")
      setMine((prev) => prev ?? [])
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const q = query.trim().toLowerCase()
  const match = (...values: (string | null)[]) => !q || values.some((v) => (v ?? "").toLowerCase().includes(q))
  const myList = useMemo(() => (mine ?? []).filter((b) => match(b.name, b.instructor, b.topic)), [mine, q]) // eslint-disable-line react-hooks/exhaustive-deps
  const joined = useMemo(() => new Set((mine ?? []).map((b) => b.id)), [mine])
  const openList = useMemo(() => open.filter((b) => !joined.has(b.id) && match(b.name, b.instructor, b.topic)), [open, joined, q]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onCount?.((mine?.length ?? 0) + open.filter((b) => !joined.has(b.id)).length), [mine, open, joined, onCount])

  if (mine === null) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading live batches">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <section aria-labelledby="my-batches-heading" className="space-y-3">
        <h2 id="my-batches-heading" className="text-sm font-semibold text-foreground">
          Your batches
        </h2>
        {myList.length === 0 ? (
          <EmptyState
            icon={<Radio aria-hidden="true" />}
            title={mine.length ? "No batches match" : "You haven't joined a live batch"}
            description={mine.length ? "Try a broader search." : "Live batches give you scheduled classes, recordings and batch-only videos. Courses are separate."}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {myList.map((b) => (
              <li key={b.id}>
                <Card className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-semibold text-foreground" title={b.name}>
                        {b.name}
                      </h3>
                      <p className="truncate text-caption text-muted-foreground">{b.instructor}{b.topic ? ` · ${b.topic}` : ""}</p>
                    </div>
                    <Badge tone={b.registration_state === "confirmed" ? "success" : "warning"} size="sm" className="shrink-0 capitalize">
                      {b.registration_state}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-caption text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {day(b.starts_at)} – {day(b.ends_at)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {b.next_session_at ? `Next class ${new Date(b.next_session_at).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : b.schedule || "No class scheduled"}
                    </p>
                    <p className="flex items-center gap-2">
                      <PlayCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {b.replay_count} {b.replay_count === 1 ? "replay" : "replays"} · {b.video_count} batch {b.video_count === 1 ? "video" : "videos"}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" className="mt-auto" leftIcon={<Video aria-hidden="true" />} onClick={() => onNavigate("Live Classes")}>
                    Open live classes
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="open-batches-heading" className="space-y-3">
        <h2 id="open-batches-heading" className="text-sm font-semibold text-foreground">
          Open for registration
        </h2>
        {openList.length === 0 ? (
          <EmptyState icon={<Users aria-hidden="true" />} title="No batches are open right now" description="New live batches will appear here when registration opens." />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {openList.map((b) => (
              <li key={b.id}>
                <Card className="flex h-full flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-foreground" title={b.name}>
                      {b.name}
                    </h3>
                    <p className="truncate text-caption text-muted-foreground">{b.instructor}{b.topic ? ` · ${b.topic}` : ""}</p>
                  </div>
                  {b.description && <p className="line-clamp-2 text-caption text-muted-foreground">{b.description}</p>}
                  <div className="space-y-1.5 text-caption text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Starts {day(b.starts_at)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {b.schedule || "Schedule to be announced"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {b.seats_left > 0 ? `${b.seats_left} ${b.seats_left === 1 ? "seat" : "seats"} left` : "Full"}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
                    <span className="text-sm font-semibold tabular-nums text-foreground">₹{Number(b.price).toLocaleString("en-IN")}</span>
                    <Button size="sm" disabled={b.seats_left <= 0} onClick={() => onJoin({ kind: "batch", id: b.id, title: b.name, offerId: b.offer_id, price: Number(b.price) })}>
                      {b.seats_left > 0 ? "Join batch" : "Full"}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
