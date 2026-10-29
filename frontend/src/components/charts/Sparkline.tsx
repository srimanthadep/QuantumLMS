import { useId } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { duration, ease } from "@/lib/motion"
import { buildPath, scalePoints } from "./chartUtils"

interface SparklineProps {
  data: number[]
  stroke?: string
  className?: string
  /** Fill the area under the line with a fade. */
  area?: boolean
  label?: string
}

/** Tiny trend line. Reveals left-to-right via a scaleX clip (transform only). */
export default function Sparkline({ data, stroke = "var(--primary-text)", className, area = true, label }: SparklineProps) {
  const id = useId().replace(/:/g, "")
  const w = 100
  const h = 32
  const pts = scalePoints(data, w, h, 3)
  const line = buildPath(pts)
  const fill = `${line} L ${w} ${h} L 0 ${h} Z`
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("overflow-visible", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
        <clipPath id={`sc-${id}`}>
          <motion.rect
            x={0}
            y={-4}
            width={w}
            height={h + 8}
            style={{ originX: 0 }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: duration.slow * 2.5, ease: ease.out }}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#sc-${id})`}>
        {area && <path d={fill} fill={`url(#sg-${id})`} />}
        <path d={line} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  )
}
