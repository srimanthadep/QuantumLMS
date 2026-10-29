import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fadeUp } from "@/lib/motion"

export default function NotFoundPage() {
  return (
    <main id="main" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]"
      />
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="relative max-w-md text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface text-primary-text">
          <Compass className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="font-mono text-sm text-subtle-foreground">404</p>
        <h1 className="mt-2 text-h2 font-semibold text-foreground">This page is off the map</h1>
        <p className="mt-3 text-sm text-muted-foreground">The link may be outdated, or the page moved during the redesign.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="secondary">
            <Link to="/">
              <ArrowLeft />
              Go home
            </Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </motion.div>
    </main>
  )
}
