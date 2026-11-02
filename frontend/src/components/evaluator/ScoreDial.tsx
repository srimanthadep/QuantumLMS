import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import ProgressRing from "@/components/charts/ProgressRing"
import { letterGrade, pctTone } from "@/pages/evaluator/data/derive"

interface ScoreDialProps {
  /** Points on the rubric scale. */
  total: number
  rubricMax: number
  /** The assignment's scale (what the student sees). */
  maxMarks: number
  scored: number
  criteria: number
  /** Score before a re-evaluation, for the change badge. */
  before?: number | null
  className?: string
}

/** The running total: ring, score on the assignment's scale, letter grade and how many criteria are scored. */
export default function ScoreDial({ total, rubricMax, maxMarks, scored, criteria, before, className }: ScoreDialProps) {
  const score = rubricMax ? Math.round((total / rubricMax) * maxMarks) : 0
  const pct = maxMarks ? Math.round((score * 100) / maxMarks) : 0
  const complete = scored === criteria && criteria > 0
  const delta = before === null || before === undefined ? 0 : score - before
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <ProgressRing value={pct} size={52} thickness={5} tone={complete ? pctTone(pct) : "primary"} label={`Score ${pct}%`} showValue={false}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={complete ? letterGrade(pct) : "partial"} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={transition.fast} className="text-xs font-semibold text-foreground">
            {complete ? letterGrade(pct) : `${pct}%`}
          </motion.span>
        </AnimatePresence>
      </ProgressRing>
      <div className="min-w-0">
        <p className="flex items-baseline gap-1 text-lg font-semibold leading-6 tabular-nums text-foreground" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={score} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} transition={transition.fast} className="inline-block">
              {score}
            </motion.span>
          </AnimatePresence>
          <span className="text-sm font-medium text-muted-foreground">/ {maxMarks}</span>
          {delta !== 0 && <span className={cn("ml-1 text-caption font-semibold", delta > 0 ? "text-success" : "text-warning")}>{delta > 0 ? `+${delta}` : delta}</span>}
        </p>
        <p className="text-caption text-muted-foreground">
          {scored} of {criteria} criteria scored
        </p>
      </div>
    </div>
  )
}
