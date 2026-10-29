import { motion, type HTMLMotionProps } from "framer-motion"
import { spring } from "@/lib/motion"

interface PressableProps extends HTMLMotionProps<"div"> {
  /** Lift on hover (px). Set 0 to disable. */
  lift?: number
}

/** Hover lift + press scale feedback wrapper for cards and tiles. */
export default function Pressable({ lift = 2, children, ...props }: PressableProps) {
  return (
    <motion.div whileHover={lift ? { y: -lift } : undefined} whileTap={{ scale: 0.98 }} transition={spring.snappy} {...props}>
      {children}
    </motion.div>
  )
}
