import { motion, type HTMLMotionProps } from "framer-motion"
import { duration, ease } from "@/lib/motion"

interface RevealProps extends HTMLMotionProps<"div"> {
  delay?: number
  /** Vertical offset in px before reveal. */
  y?: number
}

/** Reveals content once when it scrolls into view. */
export default function Reveal({ delay = 0, y = 12, children, ...props }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: duration.slow, ease: ease.out, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
