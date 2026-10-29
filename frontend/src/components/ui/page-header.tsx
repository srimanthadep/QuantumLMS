import * as React from "react"
import { ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { fadeUp } from "@/lib/motion"

export interface Crumb {
  label: string
  onClick?: () => void
  href?: string
}

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  breadcrumb?: Crumb[]
  /** Small label above the title (e.g. "Course builder"). */
  eyebrow?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

/** Page title block: optional breadcrumb, eyebrow, title, description and right-aligned actions. */
export default function PageHeader({ title, description, actions, breadcrumb, eyebrow, className, children }: PageHeaderProps) {
  return (
    <motion.header variants={fadeUp} initial="hidden" animate="show" className={cn("mb-6 flex flex-col gap-4", className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-caption text-muted-foreground">
            {breadcrumb.map((c, i) => {
              const last = i === breadcrumb.length - 1
              return (
                <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                  {last ? (
                    <span aria-current="page" className="font-medium text-foreground">
                      {c.label}
                    </span>
                  ) : c.href ? (
                    <a href={c.href} className="rounded hover:text-foreground">
                      {c.label}
                    </a>
                  ) : (
                    <button type="button" onClick={c.onClick} className="rounded hover:text-foreground">
                      {c.label}
                    </button>
                  )}
                  {!last && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
                </li>
              )
            })}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow && <div className="text-caption font-medium uppercase tracking-wider text-primary-text">{eyebrow}</div>}
          <h1 className="text-[24px] font-semibold leading-8 tracking-tight text-foreground sm:text-h2">{title}</h1>
          {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </motion.header>
  )
}

export { PageHeader }
