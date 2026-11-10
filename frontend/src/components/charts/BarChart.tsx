import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ease } from "@/lib/motion"
import { compactNumber, niceMax } from "./chartUtils"

export interface BarDatum {
  label: string
  value: number
  /** Highlight this bar with the primary colour / glow. */
  highlight?: boolean
  /** Explicit Tailwind color class (e.g. "bg-emerald-500" or "bg-gradient-to-t from-emerald-600 to-teal-400"). */
  color?: string
}

interface BarChartProps {
  data: BarDatum[]
  height?: number
  className?: string
  formatValue?: (v: number) => string
  label?: string
  /** Color strategy: "score" (dynamic color by value tier), "primary" (themed gradient), or "palette" (alternating vibrant hues). */
  colorScheme?: "score" | "primary" | "palette"
}

const PALETTE = [
  "bg-gradient-to-t from-violet-600 to-indigo-400 dark:from-violet-500 dark:to-indigo-300",
  "bg-gradient-to-t from-blue-600 to-cyan-400 dark:from-blue-500 dark:to-cyan-300",
  "bg-gradient-to-t from-emerald-600 to-teal-400 dark:from-emerald-500 dark:to-teal-300",
  "bg-gradient-to-t from-amber-600 to-orange-400 dark:from-amber-500 dark:to-orange-300",
  "bg-gradient-to-t from-fuchsia-600 to-pink-400 dark:from-fuchsia-500 dark:to-pink-300",
  "bg-gradient-to-t from-rose-600 to-red-400 dark:from-rose-500 dark:to-red-300",
  "bg-gradient-to-t from-cyan-600 to-teal-400 dark:from-cyan-500 dark:to-teal-300",
]

function getScoreGradient(val: number) {
  if (val >= 85) return "bg-gradient-to-t from-emerald-600 to-teal-400 dark:from-emerald-500 dark:to-teal-300"
  if (val >= 70) return "bg-gradient-to-t from-indigo-600 to-blue-400 dark:from-indigo-500 dark:to-blue-300"
  if (val >= 50) return "bg-gradient-to-t from-violet-600 to-purple-400 dark:from-violet-500 dark:to-purple-300"
  return "bg-gradient-to-t from-amber-600 to-orange-400 dark:from-amber-500 dark:to-orange-300"
}

/** Vertical bar chart. Bars grow with scaleY from the baseline, staggered. */
export default function BarChart({
  data,
  height = 200,
  className,
  formatValue = (v) => compactNumber.format(v),
  label,
  colorScheme = "score",
}: BarChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)))
  return (
    <figure className={cn("w-full", className)} aria-label={label}>
      <div className="relative flex items-end gap-2 border-b border-border pb-px" style={{ height }}>
        {[0.5, 1].map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/80" style={{ bottom: `${t * 100}%` }} aria-hidden="true" />
        ))}
        {data.map((d, i) => {
          const pct = Math.max(4, (d.value / max) * 100)
          const active = hover === i

          // Determine vibrant bar fill
          let barFill = d.color
          if (!barFill) {
            if (colorScheme === "score") {
              barFill = getScoreGradient(d.value)
            } else if (colorScheme === "palette") {
              barFill = PALETTE[i % PALETTE.length]
            } else {
              barFill = d.highlight || active
                ? "bg-gradient-to-t from-primary to-primary-hover"
                : "bg-gradient-to-t from-primary/75 to-primary/95"
            }
          }

          return (
            <div
              key={`${d.label}-${i}`}
              className="relative flex h-full flex-1 items-end justify-center group"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              <motion.div
                className={cn(
                  "relative w-full max-w-[36px] rounded-t-md transition-all duration-200 cursor-pointer overflow-hidden",
                  barFill,
                  (d.highlight || active) && "ring-2 ring-primary/40 shadow-[0_0_16px_var(--color-primary)] brightness-110",
                  !d.highlight && !active && "hover:brightness-110",
                )}
                style={{ height: `${pct}%`, originY: 1 }}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: ease.out, delay: i * 0.04 }}
                role="img"
                aria-label={`${d.label}: ${formatValue(d.value)}`}
              >
                {/* Crisp top highlight cap */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-white/40" />
              </motion.div>
              {active && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pointer-events-none absolute z-20 mb-2 whitespace-nowrap rounded-lg border border-border bg-surface-3/95 px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground shadow-lg backdrop-blur-sm"
                  style={{ bottom: `${pct}%` }}
                >
                  <span className="text-muted-foreground mr-1">{d.label}:</span>
                  {formatValue(d.value)}
                </motion.span>
              )}
            </div>
          )
        })}
      </div>
      <figcaption className="mt-2.5 flex gap-2 text-[11px] font-medium text-subtle-foreground">
        {data.map((d, i) => (
          <span key={`${d.label}-${i}`} className="flex-1 truncate text-center" title={d.label}>
            {d.label}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
