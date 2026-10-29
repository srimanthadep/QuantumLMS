import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ease } from "@/lib/motion"

export interface DonutSegment {
  label: string
  value: number
  color?: string
}

interface DonutChartProps {
  data: DonutSegment[]
  size?: number
  thickness?: number
  className?: string
  /** Centre content (e.g. total). */
  center?: React.ReactNode
  legend?: boolean
  formatValue?: (v: number) => string
}

const PALETTE = ["var(--primary)", "var(--secondary)", "var(--success)", "var(--warning)", "var(--info)", "var(--danger)"]

/** Donut with a rotate + fade reveal (transform/opacity only) and an optional legend. */
export default function DonutChart({ data, size = 160, thickness = 16, className, center, legend = true, formatValue = (v) => String(v) }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const gap = data.length > 1 ? 2 : 0
  let offset = 0
  return (
    <div className={cn("flex flex-wrap items-center gap-5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={data.map((d) => `${d.label} ${formatValue(d.value)}`).join(", ")}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
          <motion.g
            style={{ originX: "50%", originY: "50%" }}
            initial={{ rotate: -90, opacity: 0, scale: 0.92 }}
            whileInView={{ rotate: 0, opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: ease.out }}
          >
            {data.map((d, i) => {
              const len = (d.value / total) * c
              const dash = Math.max(0, len - gap)
              const el = (
                <circle
                  key={d.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={d.color ?? PALETTE[i % PALETTE.length]}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              )
              offset += len
              return el
            })}
          </motion.g>
        </svg>
        {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
      </div>
      {legend && (
        <ul className="min-w-[140px] flex-1 space-y-1.5 text-sm">
          {data.map((d, i) => (
            <li key={d.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color ?? PALETTE[i % PALETTE.length] }} />
                {d.label}
              </span>
              <span className="tabular-nums text-foreground">{formatValue(d.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
