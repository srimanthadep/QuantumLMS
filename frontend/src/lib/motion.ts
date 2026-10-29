import type { Transition, Variants } from "framer-motion"

/**
 * Motion tokens (design.md > Motion). Durations are in seconds.
 * Animate transform and opacity only.
 */
export const duration = {
  fast: 0.15,
  base: 0.22,
  slow: 0.32,
} as const

export const ease = {
  out: [0.22, 1, 0.36, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
}

export const spring = {
  snappy: { type: "spring", stiffness: 500, damping: 34 } as Transition,
  soft: { type: "spring", stiffness: 260, damping: 30 } as Transition,
}

export const transition = {
  fast: { duration: duration.fast, ease: ease.out } as Transition,
  base: { duration: duration.base, ease: ease.out } as Transition,
  slow: { duration: duration.slow, ease: ease.out } as Transition,
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transition.base },
  exit: { opacity: 0, transition: transition.fast },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: transition.base },
  exit: { opacity: 0, y: -4, transition: transition.fast },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: transition.base },
  exit: { opacity: 0, scale: 0.98, transition: transition.fast },
}

export function staggerContainer(stagger = 0.04, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
    exit: {},
  }
}
