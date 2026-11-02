import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { ease } from "@/lib/motion"
import type { AssessmentSummary } from "@/pages/evaluator/data/types"

const SEGMENTS = [
  { key: "released", label: "Released", className: "bg-success" },
  { key: "evaluated", label: "Ready", className: "bg-primary" },
  { key: "drafts", label: "Drafts", className: "bg-info" },
  { key: "pending", label: "To mark", className: "bg-warning" },
] as const

/**
 * How far marking has got on one assignment: one bar split by state, revealed once with scaleX. The reveal uses its
 * own in-view check: a whileInView nested inside a staggered whileInView grid can stay at its initial state.
 */
export default function MarkingBar({ assessment: a, legend = false }: { assessment: AssessmentSummary; legend?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, margin: "-20px" })
  const total = Math.max(1, a.submissions)
  const label = SEGMENTS.map((s) => `${a[s.key]} ${s.label.toLowerCase()}`).join(", ")
  return (
    <div>
      <div ref={ref} className="h-2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-border" role="img" aria-label={`${a.submissions} submissions: ${label}`}>
        <motion.div className="flex h-full w-full origin-left" initial={{ scaleX: 0 }} animate={{ scaleX: seen ? 1 : 0 }} transition={{ duration: 0.8, ease: ease.out }}>
          {SEGMENTS.map((s) => (a[s.key] ? <span key={s.key} className={`${s.className} h-full`} style={{ width: `${(a[s.key] / total) * 100}%` }} /> : null))}
        </motion.div>
      </div>
      {legend && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
          {SEGMENTS.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className={`${s.className} h-2 w-2 rounded-full`} aria-hidden="true" />
              <span className="tabular-nums text-foreground">{a[s.key]}</span> {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
