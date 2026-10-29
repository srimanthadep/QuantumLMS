import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ease } from "@/lib/motion"
import AnimatedNumber from "../motion/AnimatedNumber"

interface ProgressRingProps {
  /** 0-100 */
  value: number
  size?: number
  thickness?: number
  tone?: "primary" | "success" | "warning" | "danger"
  className?: string
  /** Custom centre content; defaults to the animated percentage. */
  children?: ReactNode
  showValue?: boolean
  label?: string
}

const STROKE = { primary: "var(--primary)", success: "var(--success)", warning: "var(--warning)", danger: "var(--danger)" }

/** Circular progress. The arc sweeps in with rotate + opacity; the centre number counts up. */
export default function ProgressRing({ value, size = 64, thickness = 6, tone = "primary", className, children, showValue = true, label }: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, value))
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
        <motion.g
          style={{ originX: "50%", originY: "50%" }}
          initial={{ rotate: -120, opacity: 0 }}
          whileInView={{ rotate: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: ease.out }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={STROKE[tone]}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </motion.g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">
        {children ?? (showValue && <AnimatedNumber value={pct} suffix="%" className="text-xs font-semibold text-foreground" />)}
      </div>
    </div>
  )
}
