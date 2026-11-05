import { useId, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { duration, ease } from "@/lib/motion"
import { buildPath, compactNumber, niceMax, scalePoints } from "./chartUtils"

export interface AreaSeries {
  name: string
  values: number[]
  color?: string
  dashed?: boolean
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
  /** Label every nth point on the x axis (the tooltip still names every point). Default: all of them. */
  tickEvery?: number
}

const W = 600

/** Responsive area chart with gridlines, x labels and a hover crosshair tooltip. */
export default function AreaChart({ labels, series, height = 220, className, formatValue = (v) => compactNumber.format(v), label, yMin = 0, yMax, tickEvery = 1 }: AreaChartProps) {
  const id = useId().replace(/:/g, "")
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const H = height
  const padTop = 14
  const padBottom = 26
  const padLeft = 32
  const plotW = W - padLeft
  const plotH = H - padTop - padBottom
  const max = useMemo(() => yMax ?? niceMax(Math.max(1, ...series.flatMap((s) => s.values))), [series, yMax])
  const colors = ["#F97316", "#0EA5E9", "var(--success)", "var(--warning)"]

  const paths = series.map((s, si) => {
    const pts = scalePoints(s.values, plotW, plotH, 0, yMin, max).map((p) => ({ x: p.x + padLeft, y: p.y + padTop }))
    const line = buildPath(pts)
    const isDashed = s.dashed ?? s.name.toLowerCase().includes("goal")
    return {
      pts,
      line,
      area: `${line} L ${W} ${padTop + plotH} L ${padLeft} ${padTop + plotH} Z`,
      color: s.color ?? colors[si % colors.length],
      dashed: isDashed,
    }
  })
  const step = labels.length > 1 ? plotW / (labels.length - 1) : plotW

  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * W - padLeft
    setHover(Math.max(0, Math.min(labels.length - 1, Math.round(x / step))))
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div ref={ref} className={cn("relative w-full select-none", className)} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full" style={{ height: H }} role="img" aria-label={label ?? series.map((s) => s.name).join(", ")}>
        <defs>
          {paths.map((p, i) => (
            <linearGradient key={i} id={`ag-${id}-${i}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={p.color} stopOpacity={p.dashed ? 0.04 : 0.14} />
              <stop offset="100%" stopColor={p.color} stopOpacity={0} />
            </linearGradient>
          ))}
          <clipPath id={`ac-${id}`}>
            <motion.rect
              x={padLeft}
              y={0}
              width={plotW}
              height={H}
              style={{ originX: 0 }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: ease.out }}
            />
          </clipPath>
        </defs>

        {/* Y Gridlines and Y-Axis Ticks */}
        {yTicks.map((t) => {
          const y = padTop + plotH * (1 - t)
          const val = yMin + (max - yMin) * t
          return (
            <g key={t}>
              <line
                x1={padLeft}
                x2={W}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeOpacity={0.6}
                strokeDasharray={t === 0 ? undefined : "3 4"}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={padLeft - 6}
                y={y + 3.5}
                textAnchor="end"
                className="fill-muted-foreground text-[10px] font-mono tabular-nums"
              >
                {formatValue(Math.round(val))}
              </text>
            </g>
          )
        })}

        <g clipPath={`url(#ac-${id})`}>
          {paths.map((p, i) => (
            <g key={i}>
              <path d={p.area} fill={`url(#ag-${id}-${i})`} />
              <path
                d={p.line}
                fill="none"
                stroke={p.color}
                strokeWidth={p.dashed ? 1.75 : 2.25}
                strokeDasharray={p.dashed ? "4 4" : undefined}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </g>

        {hover !== null && (
          <line
            x1={padLeft + hover * step}
            x2={padLeft + hover * step}
            y1={padTop}
            y2={padTop + plotH}
            stroke="var(--border-strong)"
            strokeWidth={1}
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* X-Axis Labels */}
      <div
        className="pointer-events-none absolute bottom-0 flex justify-between text-[11px] font-medium text-muted-foreground"
        style={{ left: `${(padLeft / W) * 100}%`, right: 0 }}
      >
        {labels.map((l, i) => (
          <span key={`${l}-${i}`} className={cn("text-center", labels.length > 8 && i % 2 === 1 && "hidden sm:inline")}>
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
            style={{ left: `${((padLeft + hover * step) / W) * 100}%` }}
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
