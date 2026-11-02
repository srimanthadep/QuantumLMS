import { useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, ChevronRight, ClipboardCheck, FileCode2, GitBranch, Search, Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  Input,
  PageHeader,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui"
import { useToast } from "@/components/ui/toast"
import ReleaseDialog from "@/components/evaluator/ReleaseDialog"
import StatePill from "@/components/evaluator/StatePill"
import { useEvaluator } from "./data/EvaluatorDataProvider"
import { releaseEvaluations } from "./data/api"
import { relTime, shortTitle, SORT_LABEL, sortItems, type QueueSort } from "./data/derive"
import type { QueueItem } from "./data/types"

type View = "tomark" | "ready" | "released" | "all"
const VIEWS: { value: View; label: string }[] = [
  { value: "tomark", label: "To mark" },
  { value: "ready", label: "Ready to release" },
  { value: "released", label: "Released" },
  { value: "all", label: "All" },
]

export default function QueuePage() {
  const { queue, toMark, ready, profile, now, reload, patchItem } = useEvaluator()
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const view = (VIEWS.some((v) => v.value === params.get("view")) ? params.get("view") : "tomark") as View
  const assessment = params.get("assessment") ?? "all"
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<QueueSort>(profile.preferences.queue_sort)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState<QueueItem[] | null>(null)
  const [releasing, setReleasing] = useState(false)

  const setParam = (key: string, value: string | null) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (value === null) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )

  const inAssessment = (i: QueueItem) => assessment === "all" || i.assignment_id === assessment
  const pools: Record<View, QueueItem[]> = useMemo(
    () => ({
      tomark: toMark,
      ready,
      released: queue.items.filter((i) => i.state === "released"),
      all: queue.items,
    }),
    [toMark, ready, queue.items],
  )
  const q = query.trim().toLowerCase()
  const list = useMemo(
    () =>
      sortItems(
        pools[view].filter((i) => inAssessment(i) && (!q || `${i.student_name} ${i.roll_number ?? ""} ${i.assignment_title} ${i.course_code}`.toLowerCase().includes(q))),
        sort,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pools, view, assessment, q, sort],
  )
  const selectable = view === "ready"
  const chosen = list.filter((i) => selected.has(i.id))

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const release = async () => {
    if (!confirming?.length) return
    setReleasing(true)
    try {
      const r = await releaseEvaluations(confirming.map((i) => i.id))
      for (const i of confirming) patchItem(i.id, { state: "released", released_at: new Date().toISOString() })
      toast.success(r.released === 1 ? `Released to ${confirming[0].student_name}.` : `Released ${r.released} results. Students have been notified.`)
      setSelected(new Set())
      setConfirming(null)
      reload()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setReleasing(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Evaluation desk"
        title="Queue"
        description="Every submission to the assignments you mark. Your own drafts stay at the top."
        actions={
          toMark.length > 0 && (
            <Button rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => navigate(`/evaluator/queue/${toMark[0].id}`)}>
              {toMark[0].state === "draft" ? "Continue marking" : "Start marking"}
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="no-scrollbar overflow-x-auto">
          <SegmentedControl
            aria-label="Queue view"
            size="sm"
            options={VIEWS.map((v) => ({ value: v.value, label: `${v.label} · ${pools[v.value].filter(inAssessment).length}` }))}
            value={view}
            onChange={(v) => {
              setSelected(new Set())
              setParam("view", v === "tomark" ? null : v)
            }}
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] xl:w-[640px]">
          <Input
            aria-label="Search the queue"
            placeholder="Search students or work"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leading={<Search aria-hidden="true" />}
            trailing={
              query ? (
                <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="flex rounded p-0.5 hover:text-foreground">
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : null
            }
          />
          <Select value={assessment} onValueChange={(v) => setParam("assessment", v === "all" ? null : v)}>
            <SelectTrigger aria-label="Assessment" className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assessments</SelectItem>
              {queue.assessments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.course_code} · {shortTitle(a.title)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as QueueSort)}>
            <SelectTrigger aria-label="Sort" className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABEL) as QueueSort[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {SORT_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck aria-hidden="true" />}
          title={q ? "No matches" : view === "tomark" ? "Nothing to mark" : view === "ready" ? "Nothing waiting for release" : "Nothing here yet"}
          description={
            q
              ? "Try another name or assignment."
              : view === "tomark"
                ? "New submissions appear here as students turn them in."
                : view === "ready"
                  ? "Finish an evaluation and it waits here until you release it."
                  : "Released results appear here."
          }
          action={
            q ? (
              <Button size="sm" variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            ) : view !== "all" ? (
              <Button size="sm" variant="outline" onClick={() => setParam("view", "all")}>
                See all submissions
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--elev-xs)]">
          <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_150px_200px_24px] items-center gap-4 border-b border-border bg-surface-2/60 px-4 py-2 text-caption font-medium text-muted-foreground md:grid" aria-hidden="true">
            <span className={cn(selectable && "pl-8")}>Student</span>
            <span>Assessment</span>
            <span>Submitted</span>
            <span>Status</span>
            <span />
          </div>
          <motion.ul layout className="divide-y divide-border" aria-label="Submissions">
            <AnimatePresence mode="popLayout" initial={false}>
              {list.map((i, n) => (
                <motion.li
                  key={i.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { ...transition.base, delay: Math.min(n, 12) * 0.02 } }}
                  exit={{ opacity: 0, transition: transition.fast }}
                  className="relative flex items-center"
                >
                  {selectable && (
                    <span className="pl-4">
                      <Checkbox checked={selected.has(i.id)} onCheckedChange={() => toggle(i.id)} aria-label={`Select ${i.student_name}`} />
                    </span>
                  )}
                  <QueueRow item={i} now={now} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </div>
      )}

      <AnimatePresence>
        {selectable && list.length > 0 && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0, transition: transition.fast }}
            transition={spring.soft}
            className="sticky bottom-4 z-20 mx-auto mt-4 flex w-full max-w-xl items-center justify-between gap-3 rounded-lg border border-border bg-surface-3 px-4 py-3 shadow-[var(--elev-lg)]"
          >
            <p className="text-sm text-foreground">
              {chosen.length ? (
                <>
                  <span className="font-semibold tabular-nums">{chosen.length}</span> selected
                </>
              ) : (
                <>
                  <span className="font-semibold tabular-nums">{list.length}</span> ready · students can't see them yet
                </>
              )}
            </p>
            <div className="flex shrink-0 gap-2">
              {chosen.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              )}
              <Button size="sm" leftIcon={<Send aria-hidden="true" />} onClick={() => setConfirming(chosen.length ? chosen : list)}>
                {chosen.length ? `Release ${chosen.length}` : "Release all"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReleaseDialog items={confirming} releasing={releasing} onConfirm={() => void release()} onClose={() => setConfirming(null)} />
    </div>
  )
}

function QueueRow({ item: i, now }: { item: QueueItem; now: number }) {
  return (
    <Link
      to={`/evaluator/queue/${i.id}`}
      className="group grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3 transition-colors hover:bg-surface-2/70 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_150px_200px_24px]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <Avatar name={i.student_name} src={i.student_avatar} size="md" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{i.student_name}</span>
          <span className="block truncate font-mono text-[11px] text-subtle-foreground">{i.roll_number ?? "No roll number"}</span>
        </span>
      </span>
      <span className="col-span-2 min-w-0 md:col-span-1">
        <span className="flex min-w-0 items-center gap-2">
          <Badge tone="neutral" size="sm" className="shrink-0">
            {i.course_code}
          </Badge>
          <span className="truncate text-sm text-foreground">{i.assignment_title}</span>
        </span>
        <span className="mt-1 flex items-center gap-2 text-subtle-foreground">
          {i.repo_url && <GitBranch className="h-3.5 w-3.5" aria-label="Repository link" />}
          {i.file_name && <FileCode2 className="h-3.5 w-3.5" aria-label={`File ${i.file_name}`} />}
          {i.reevaluation_status && (
            <Badge tone={i.reevaluation_status === "Pending" || i.reevaluation_status === "In Review" ? "warning" : "neutral"} size="sm">
              Re-evaluation {i.reevaluation_status.toLowerCase()}
            </Badge>
          )}
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-caption text-muted-foreground md:flex-col md:items-start md:gap-0.5">
        <span className="tabular-nums">{relTime(i.submitted_at, now)}</span>
        {i.late && (
          <Badge tone="danger" size="sm">
            Late
          </Badge>
        )}
      </span>
      <span className="flex justify-end md:justify-start">
        <StatePill item={i} />
      </span>
      <ChevronRight className="hidden h-4 w-4 text-subtle-foreground transition-transform duration-200 group-hover:translate-x-0.5 md:block" aria-hidden="true" />
    </Link>
  )
}
