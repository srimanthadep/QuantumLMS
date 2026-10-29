import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ease } from "@/lib/motion"
import { compactNumber, niceMax } from "./chartUtils"

export interface BarDatum {
  label: string
  value: number
  /** Highlight this bar with the primary colour. */
  highlight?: boolean
}

interface BarChartProps {
  data: BarDatum[]
  height?: number
  className?: string
  formatValue?: (v: number) => string
  label?: string
}

/** Vertical bar chart. Bars grow with scaleY from the baseline, staggered. */
export default function BarChart({ data, height = 200, className, formatValue = (v) => compactNumber.format(v), label }: BarChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)))
  return (
    <figure className={cn("w-full", className)} aria-label={label}>
      <div className="relative flex items-end gap-2 border-b border-border" style={{ height }}>
        {[0.5, 1].map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${t * 100}%` }} aria-hidden="true" />
        ))}
        {data.map((d, i) => {
          const pct = (d.value / max) * 100
          const active = hover === i
          return (
            <div
              key={`${d.label}-${i}`}
              className="relative flex h-full flex-1 items-end justify-center"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              <motion.div
                className={cn(
                  "w-full max-w-[36px] rounded-t-[5px] transition-colors",
                  d.highlight || active ? "bg-primary" : "bg-primary/35 dark:bg-primary/45",
                )}
                style={{ height: `${pct}%`, originY: 1 }}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: ease.out, delay: i * 0.04 }}
                role="img"
                aria-label={`${d.label}: ${formatValue(d.value)}`}
              />
              {active && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pointer-events-none absolute z-10 mb-1.5 whitespace-nowrap rounded-md border border-border bg-surface-3 px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground shadow-[var(--elev-md)]"
                  style={{ bottom: `${pct}%` }}
                >
                  {formatValue(d.value)}
                </motion.span>
              )}
            </div>
          )
        })}
      </div>
      <figcaption className="mt-2 flex gap-2 text-[10px] text-subtle-foreground">
        {data.map((d, i) => (
          <span key={`${d.label}-${i}`} className="flex-1 truncate text-center">
            {d.label}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
