import { useId, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { duration, ease } from "@/lib/motion"
import { buildPath, compactNumber, niceMax, scalePoints } from "./chartUtils"

export interface AreaSeries {
  name: string
  values: number[]
  color?: string
}

interface AreaChartProps {
  labels: string[]
  series: AreaSeries[]
  height?: number
  className?: string
  formatValue?: (v: number) => string
  label?: string
  /** Value at the baseline (default 0). Raise it for series that vary in a narrow band, e.g. GPA. */
  yMin?: number
  /** Value at the top gridline (default: a rounded max of the data). */
  yMax?: number
}

const W = 600

/** Responsive area chart with gridlines, x labels and a hover crosshair tooltip. */
export default function AreaChart({ labels, series, height = 220, className, formatValue = (v) => compactNumber.format(v), label, yMin = 0, yMax }: AreaChartProps) {
  const id = useId().replace(/:/g, "")
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const H = height
  const padTop = 12
  const padBottom = 24
  const plotH = H - padTop - padBottom
  const max = useMemo(() => yMax ?? niceMax(Math.max(1, ...series.flatMap((s) => s.values))), [series, yMax])
  const colors = ["var(--primary-text)", "var(--secondary-text)", "var(--success)", "var(--warning)"]

  const paths = series.map((s, si) => {
    const pts = scalePoints(s.values, W, plotH, 0, yMin, max).map((p) => ({ x: p.x, y: p.y + padTop }))
    const line = buildPath(pts)
    return { pts, line, area: `${line} L ${W} ${padTop + plotH} L 0 ${padTop + plotH} Z`, color: s.color ?? colors[si % colors.length] }
  })
  const step = labels.length > 1 ? W / (labels.length - 1) : W

  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * W
    setHover(Math.max(0, Math.min(labels.length - 1, Math.round(x / step))))
  }

  return (
    <div ref={ref} className={cn("relative w-full select-none", className)} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full" style={{ height: H }} role="img" aria-label={label ?? series.map((s) => s.name).join(", ")}>
        <defs>
          {paths.map((p, i) => (
            <linearGradient key={i} id={`ag-${id}-${i}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={p.color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={p.color} stopOpacity={0} />
            </linearGradient>
          ))}
          <clipPath id={`ac-${id}`}>
            <motion.rect
              x={0}
              y={0}
              width={W}
              height={H}
              style={{ originX: 0 }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: ease.out }}
            />
          </clipPath>
        </defs>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={0} x2={W} y1={padTop + plotH * t} y2={padTop + plotH * t} stroke="var(--border)" strokeDasharray={t === 1 ? undefined : "3 4"} vectorEffect="non-scaling-stroke" />
        ))}
        <g clipPath={`url(#ac-${id})`}>
          {paths.map((p, i) => (
            <g key={i}>
              <path d={p.area} fill={`url(#ag-${id}-${i})`} />
              <path d={p.line} fill="none" stroke={p.color} strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </g>
        {hover !== null && (
          <line x1={hover * step} x2={hover * step} y1={padTop} y2={padTop + plotH} stroke="var(--border-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {/* y-axis max label */}
      <span className="pointer-events-none absolute left-0 top-0 text-[10px] tabular-nums text-subtle-foreground">{formatValue(max)}</span>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-subtle-foreground">
        {labels.map((l, i) => (
          <span key={`${l}-${i}`} className={cn(labels.length > 8 && i % 2 === 1 && "hidden sm:inline")}>
            {l}
          </span>
        ))}
      </div>
      <AnimatePresence>
        {hover !== null && (
          <motion.div
            key="tip"
            initial={{ opacity: 0, y: 4, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, x: "-50%" }}
            transition={{ duration: duration.fast }}
            className="pointer-events-none absolute top-2 z-10 min-w-[120px] rounded-md border border-border bg-surface-3 px-2.5 py-1.5 text-xs shadow-[var(--elev-md)]"
            style={{ left: `${Math.min(88, Math.max(12, (hover / Math.max(1, labels.length - 1)) * 100))}%` }}
          >
            <div className="mb-0.5 font-medium text-foreground">{labels[hover]}</div>
            {series.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between gap-3 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: paths[i].color }} />
                  {s.name}
                </span>
                <span className="tabular-nums text-foreground">{formatValue(s.values[hover] ?? 0)}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
