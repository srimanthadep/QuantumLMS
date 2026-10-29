import { motion, type HTMLMotionProps } from "framer-motion"
import { fadeUp, staggerContainer } from "@/lib/motion"

interface StaggerProps extends HTMLMotionProps<"div"> {
  /** Seconds between children. */
  stagger?: number
  delay?: number
  /** Animate when scrolled into view instead of on mount. */
  inView?: boolean
}

/** Container that staggers the entrance of its <StaggerItem> children. */
export default function Stagger({ stagger = 0.04, delay = 0, inView = false, children, ...props }: StaggerProps) {
  const trigger = inView
    ? { whileInView: "show" as const, viewport: { once: true, margin: "-40px" } }
    : { animate: "show" as const }
  return (
    <motion.div variants={staggerContainer(stagger, delay)} initial="hidden" {...trigger} {...props}>
      {children}
    </motion.div>
  )
}

/** One staggered child (fade up 8px). */
export function StaggerItem({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={fadeUp} {...props}>
      {children}
    </motion.div>
  )
}
