import { useEffect, useId, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import { Badge, Textarea } from "@/components/ui"
import type { Criterion, ScoreEntry, Scores } from "@/pages/evaluator/data/types"

interface RubricScorerProps {
  criteria: Criterion[]
  scores: Scores
  /** Leave out for a read-only breakdown. */
  onChange?: (criterionId: string, entry: ScoreEntry) => void
  /** Show each criterion's performance levels as quick picks. */
  showLevels?: boolean
  /** A criterion to draw attention to, e.g. the first unscored one when finishing. */
  highlight?: string | null
  /** Scores before a re-evaluation, shown next to the new ones. */
  baseline?: Scores
}

/** Rubric scoring: per criterion, quick-pick levels, a points stepper, a bar and a comment for the student. */
export default function RubricScorer({ criteria, scores, onChange, showLevels = true, highlight, baseline }: RubricScorerProps) {
  return (
    <ol className="grid gap-3" aria-label="Rubric criteria">
      {criteria.map((c) => (
        <CriterionCard
          key={c.id}
          criterion={c}
          entry={scores[c.id] ?? { points: null, comment: "" }}
          before={baseline?.[c.id]?.points ?? null}
          onChange={onChange ? (e) => onChange(c.id, e) : undefined}
          showLevels={showLevels}
          highlighted={highlight === c.id}
          hasBaseline={!!baseline}
        />
      ))}
    </ol>
  )
}

function CriterionCard({
  criterion: c,
  entry,
  before,
  onChange,
  showLevels,
  highlighted,
  hasBaseline,
}: {
  criterion: Criterion
  entry: ScoreEntry
  before: number | null
  onChange?: (e: ScoreEntry) => void
  showLevels: boolean
  highlighted: boolean
  hasBaseline: boolean
}) {
  const id = useId()
  const ref = useRef<HTMLLIElement>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [draft, setDraft] = useState(entry.points === null ? "" : String(entry.points))
  const points = entry.points
  const readOnly = !onChange
  const scored = points !== null
  const active = c.levels.findIndex((l) => l.points === points)
  const detail = hovered !== null ? c.levels[hovered] : active >= 0 ? c.levels[active] : null

  // Keep the text field in step when the points change from a level pick or the stepper.
  useEffect(() => setDraft(points === null ? "" : String(points)), [points])
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [highlighted])

  const setPoints = (p: number | null) => onChange?.({ ...entry, points: p === null ? null : Math.max(0, Math.min(c.max_points, Math.round(p))) })
  const commitDraft = () => {
    const v = draft.trim()
    if (v === "") return setPoints(null)
    const n = Number(v)
    if (Number.isFinite(n)) setPoints(n)
    else setDraft(points === null ? "" : String(points))
  }
  const delta = hasBaseline && before !== null && points !== null ? points - before : 0

  return (
    <motion.li
      ref={ref}
      layout="position"
      className={cn(
        "rounded-lg border bg-surface p-4 transition-[border-color,box-shadow] duration-200",
        highlighted ? "border-warning shadow-[0_0_0_3px_color-mix(in_srgb,var(--warning)_18%,transparent)]" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ring-1 ring-inset transition-colors duration-200",
            scored ? "bg-primary text-primary-foreground ring-primary" : "bg-surface-2 text-muted-foreground ring-border",
          )}
          aria-hidden="true"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={scored ? "done" : "todo"} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={transition.fast} className="flex">
              {scored ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : c.position}
            </motion.span>
          </AnimatePresence>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0">
              <h4 id={`${id}-title`} className="text-sm font-semibold leading-5 text-foreground">
                {c.title}
              </h4>
              <p className="mt-0.5 text-caption leading-5 text-muted-foreground">{c.description}</p>
            </div>
            {readOnly ? (
              <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {points ?? "–"}
                <span className="font-normal text-muted-foreground"> / {c.max_points}</span>
              </p>
            ) : (
              <div className="flex shrink-0 items-center gap-1" role="group" aria-labelledby={`${id}-title`}>
                <StepButton label={`One point less for ${c.title}`} disabled={!points} onClick={() => setPoints((points ?? 0) - 1)}>
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </StepButton>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={c.max_points}
                  step={1}
                  value={draft}
                  placeholder="–"
                  aria-label={`${c.title}: points out of ${c.max_points}`}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitDraft}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      commitDraft()
                    }
                  }}
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  className="h-8 w-12 rounded-md border border-border-strong bg-surface text-center text-sm font-semibold tabular-nums text-foreground shadow-[var(--elev-xs)] [appearance:textfield] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <StepButton label={`One point more for ${c.title}`} disabled={points === c.max_points} onClick={() => setPoints((points ?? -1) + 1)}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </StepButton>
                <span className="w-9 text-caption tabular-nums text-muted-foreground">/ {c.max_points}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-border" aria-hidden="true">
              <motion.div
                className={cn("h-full w-full origin-left rounded-full", delta > 0 ? "bg-success" : delta < 0 ? "bg-warning" : "bg-primary")}
                initial={false}
                animate={{ scaleX: (points ?? 0) / c.max_points }}
                transition={spring.soft}
              />
            </div>
            <AnimatePresence initial={false}>
              {hasBaseline && before !== null && delta !== 0 && (
                <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={transition.fast}>
                  <Badge tone={delta > 0 ? "success" : "warning"} size="sm" className="tabular-nums">
                    was {before} · {delta > 0 ? "+" : ""}
                    {delta}
                  </Badge>
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {showLevels && c.levels.length > 0 && (
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" onPointerLeave={() => setHovered(null)}>
                {c.levels.map((l, i) => {
                  const on = i === active
                  return (
                    <button
                      key={l.label}
                      type="button"
                      disabled={readOnly}
                      aria-pressed={on}
                      aria-label={`${l.label}, ${l.points} points`}
                      onClick={() => setPoints(l.points)}
                      onPointerEnter={() => setHovered(i)}
                      onFocus={() => setHovered(i)}
                      onBlur={() => setHovered(null)}
                      className={cn(
                        "relative flex min-w-0 flex-col items-start rounded-md border px-2.5 py-1.5 text-left transition-colors duration-150",
                        on ? "border-primary-border text-primary-text" : "border-border text-muted-foreground",
                        !readOnly && !on && "hover:border-border-strong/60 hover:bg-surface-2 hover:text-foreground",
                        readOnly && "cursor-default",
                      )}
                    >
                      {on && <motion.span layoutId={`${id}-level`} transition={spring.snappy} className="absolute inset-0 rounded-[9px] bg-primary-soft" aria-hidden="true" />}
                      <span className="relative w-full truncate text-[11px] font-medium leading-4">{l.label}</span>
                      <span className={cn("relative text-sm font-semibold leading-5 tabular-nums", on ? "text-primary-text" : "text-foreground")}>{l.points}</span>
                    </button>
                  )
                })}
              </div>
              <AnimatePresence mode="wait" initial={false}>
                {detail && (
                  <motion.p
                    key={detail.label}
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    transition={transition.fast}
                    className="mt-2 text-caption leading-5 text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">{detail.label}:</span> {detail.description}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          {readOnly ? (
            entry.comment && <p className="mt-3 rounded-md bg-surface-2/70 px-3 py-2 text-caption leading-5 text-foreground">{entry.comment}</p>
          ) : (
            <Textarea
              aria-label={`Comment for the student on ${c.title}`}
              value={entry.comment}
              maxLength={1000}
              rows={2}
              placeholder="What earned these points, and what would earn more?"
              onChange={(e) => onChange?.({ ...entry, comment: e.target.value })}
              className="mt-3 min-h-[60px] text-[13px]"
            />
          )}
        </div>
      </div>
    </motion.li>
  )
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      transition={spring.snappy}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </motion.button>
  )
}
