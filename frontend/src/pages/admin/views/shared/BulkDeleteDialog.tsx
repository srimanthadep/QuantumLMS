import { useEffect, useMemo, useState, type ReactNode } from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, CircleDashed, Loader2, Trash2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { deleteMany } from "./bulkDelete"

export interface BulkDeleteItem {
  id: string
  title: string
  /** Small grey line under the title, e.g. "Upcoming · 2 learners". */
  meta?: string
  /** Amber tag on the row, for an item that is likely to be refused. */
  flag?: string
}

export interface BulkDeleteRequest {
  /** Snapshot of what was ticked when the dialog opened. */
  items: BulkDeleteItem[]
  noun: { one: string; many: string }
  /** The action in three forms, e.g. Delete / Deleting / deleted. */
  verbs: { do: string; doing: string; done: string }
  /** What the action does, shown under the title. */
  summary: ReactNode
  /** Extra note for items carrying a flag. */
  flagNote?: ReactNode
  confirmLabel: string
  remove: (id: string) => Promise<unknown>
  /** Runs once everything has been tried. Update the selection and the toast here. */
  onFinished: (result: { done: string[]; failed: { id: string; name: string; message: string }[] }) => void
}

type Phase = "confirm" | "running" | "finished"
type RowState = { state: "done" } | { state: "failed"; message: string }

/** Bulk delete: what will go, a safety tick for permanent deletes, then live progress and a per-item result. */
export default function BulkDeleteDialog({ request, onClose }: { request: BulkDeleteRequest | null; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("confirm")
  const [results, setResults] = useState<Record<string, RowState>>({})
  const [ack, setAck] = useState(false)

  useEffect(() => {
    setPhase("confirm")
    setResults({})
    setAck(false)
  }, [request])

  const items = request?.items ?? []
  const flagged = useMemo(() => items.filter((i) => i.flag).length, [items])
  const finished = Object.keys(results).length
  const failed = Object.values(results).filter((r) => r.state === "failed").length
  const succeeded = finished - failed
  const label = (n: number) => `${n} ${n === 1 ? request?.noun.one : request?.noun.many}`
  const currentId = phase === "running" ? items.find((i) => !results[i.id])?.id : undefined

  const run = async () => {
    if (!request) return
    setPhase("running")
    const result = await deleteMany(items, request.remove, (item, error) => setResults((cur) => ({ ...cur, [item.id]: error ? { state: "failed", message: error } : { state: "done" } })))
    setPhase("finished")
    request.onFinished({ done: result.done.map((i) => i.id), failed: result.failed.map((f) => ({ id: f.item.id, name: f.item.title, message: f.message })) })
  }

  const allFailed = phase === "finished" && succeeded === 0
  const verbs = request?.verbs
  const title =
    phase === "finished"
      ? allFailed
        ? `Nothing was ${verbs?.done}`
        : failed
          ? `${succeeded} of ${items.length} ${verbs?.done}`
          : `${label(succeeded)} ${verbs?.done}`
      : phase === "running"
        ? `${verbs?.doing} ${label(items.length)}…`
        : `${verbs?.do} ${label(items.length)}?`

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && phase !== "running" && onClose()}>
      <DialogContent className="max-w-lg gap-0 p-0" hideClose={phase === "running"}>
        {request && (
          <>
            <DialogHeader className="space-y-0 px-6 pb-4 pt-6">
              <div className="flex items-start gap-3.5">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                    phase === "finished" && !allFailed && !failed ? "border-success/25 bg-success-soft text-success" : phase === "finished" && failed ? "border-warning/30 bg-warning-soft text-warning" : "border-danger/20 bg-danger-soft text-danger",
                  )}
                >
                  {phase === "running" ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : phase === "finished" ? (
                    failed ? <AlertTriangle className="h-5 w-5" aria-hidden="true" /> : <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 pt-0.5">
                  <DialogTitle className="text-lg">{title}</DialogTitle>
                  <DialogDescription className="mt-1">
                    {phase === "confirm" ? (
                      request.summary
                    ) : phase === "running" ? (
                      "Please keep this window open until it finishes."
                    ) : failed ? (
                      `${label(failed)} couldn't be ${request.verbs.done}. They stay selected so you can look at them.`
                    ) : (
                      "Everything you selected is gone from the list."
                    )}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 px-6 pb-5">
              {phase === "confirm" && flagged > 0 && (
                <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5 text-caption leading-relaxed text-foreground">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                  <p>
                    <span className="font-semibold">
                      {flagged} of {items.length} may be refused.
                    </span>{" "}
                    {request.flagNote}
                  </p>
                </div>
              )}

              {phase === "running" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-caption tabular-nums text-muted-foreground">
                    <span>
                      {finished} of {items.length} done
                    </span>
                    {failed > 0 && <span className="font-medium text-warning">{failed} refused</span>}
                  </div>
                  <Progress value={(finished / items.length) * 100} tone={failed ? "warning" : "primary"} size="sm" label="Deleting" />
                </div>
              )}

              <div>
                <p className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>{phase === "finished" ? "Result" : `${request.noun.many.replace(/^./, (c) => c.toUpperCase())} (${items.length})`}</span>
                </p>
                <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface" aria-label={`${request.noun.many} to ${request.verbs.do.toLowerCase()}`}>
                  {items.map((item) => {
                    const r = results[item.id]
                    const current = item.id === currentId
                    return (
                      <li key={item.id} className={cn("flex items-start gap-3 px-3 py-2.5", r?.state === "failed" && "bg-warning-soft/50")}>
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
                          {r?.state === "done" ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : r?.state === "failed" ? (
                            <XCircle className="h-4 w-4 text-warning" />
                          ) : current ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <CircleDashed className="h-4 w-4 text-subtle-foreground" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm font-medium", r?.state === "done" ? "text-muted-foreground line-through" : "text-foreground")} title={item.title}>
                            {item.title}
                          </span>
                          {r?.state === "failed" ? (
                            <span className="mt-0.5 block text-caption leading-snug text-warning">{r.message}</span>
                          ) : (
                            item.meta && <span className="block truncate text-caption text-muted-foreground">{item.meta}</span>
                          )}
                        </span>
                        {phase === "confirm" && item.flag && (
                          <Badge tone="warning" size="sm" className="shrink-0">
                            {item.flag}
                          </Badge>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>

              {phase === "confirm" && (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-soft/60 px-3 py-2.5 text-caption leading-relaxed text-foreground">
                  <Checkbox className="mt-0.5" checked={ack} onCheckedChange={setAck} aria-label={`I understand ${label(items.length)} will be permanently ${request.verbs.done}`} />
                  <span>
                    I understand {label(items.length)} will be permanently {request.verbs.done} and this can't be undone.
                  </span>
                </label>
              )}
            </div>

            <DialogFooter className="border-t border-border bg-surface-2/60 px-6 py-3.5">
              {phase === "confirm" ? (
                <>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="button" variant="danger" leftIcon={<Trash2 aria-hidden="true" />} disabled={!ack} onClick={() => void run()}>
                    {request.confirmLabel}
                  </Button>
                </>
              ) : (
                <Button type="button" variant={phase === "running" ? "outline" : "primary"} loading={phase === "running"} disabled={phase === "running"} onClick={onClose}>
                  {phase === "running" ? "Working…" : "Done"}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
