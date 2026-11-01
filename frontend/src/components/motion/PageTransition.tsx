import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { useLocation } from "react-router-dom"
import { fadeUp } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface PageTransitionProps {
  children: ReactNode
  className?: string
  /** Override the key (defaults to location.pathname). */
  transitionKey?: string
}

/**
 * Fades routed content up on navigation. Enter-only: the next page mounts at once instead of waiting for the old one
 * to animate out, so a slow or interrupted exit can never leave the content area blank.
 */
export default function PageTransition({ children, className, transitionKey }: PageTransitionProps) {
  const location = useLocation()
  return (
    <motion.div key={transitionKey ?? location.pathname} variants={fadeUp} initial="hidden" animate="show" className={cn("min-w-0", className)}>
      {children}
    </motion.div>
  )
}
