import type { ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useLocation } from "react-router-dom"
import { fadeUp } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface PageTransitionProps {
  children: ReactNode
  className?: string
  /** Override the key (defaults to location.pathname). */
  transitionKey?: string
}

/** Fades routed content up on navigation. Wrap a portal's <Outlet/> or <Routes/>. */
export default function PageTransition({ children, className, transitionKey }: PageTransitionProps) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey ?? location.pathname}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        exit="exit"
        className={cn("min-w-0", className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
