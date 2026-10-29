import { useEffect, useRef, useState } from "react"
import { animate, useInView, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedNumberProps {
  value: number
  /** Custom formatter; defaults to Intl en-IN with `decimals` fraction digits. */
  format?: (n: number) => string
  formatOptions?: Intl.NumberFormatOptions
  decimals?: number
  /** Animation length in seconds. */
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

/** Counts from 0 to `value` once it is in view. Tabular numerals keep width stable. */
export default function AnimatedNumber({
  value,
  format,
  formatOptions,
  decimals = 0,
  duration = 0.9,
  className,
  prefix = "",
  suffix = "",
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-20px" })
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)

  const fmt =
    format ??
    ((n: number) =>
      new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        ...formatOptions,
      }).format(n))

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    if (!inView) return
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [inView, value, duration, reduced])

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {fmt(display)}
      {suffix}
    </span>
  )
}
