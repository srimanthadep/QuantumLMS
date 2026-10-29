import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { duration, ease } from "@/lib/motion"

export interface AccordionItemData {
  id: string
  title: React.ReactNode
  content: React.ReactNode
  /** Optional element shown at the right of the header (e.g. "4 lessons"). */
  meta?: React.ReactNode
}

interface AccordionProps {
  items: AccordionItemData[]
  /** Allow several panels open at once. */
  multiple?: boolean
  defaultOpen?: string[]
  className?: string
  itemClassName?: string
}

/**
 * Disclosure list. Panels reveal with opacity + translate while surrounding
 * items reflow through framer-motion `layout` (transform-based), so no height
 * is animated directly.
 */
export default function Accordion({ items, multiple = false, defaultOpen = [], className, itemClassName }: AccordionProps) {
  const [open, setOpen] = React.useState<string[]>(defaultOpen)
  const baseId = React.useId()
  const toggle = (id: string) =>
    setOpen((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : multiple ? [...cur, id] : [id]))

  return (
    <motion.div layout className={cn("divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface", className)}>
      {items.map((item) => {
        const isOpen = open.includes(item.id)
        const btnId = `${baseId}-${item.id}-btn`
        const panelId = `${baseId}-${item.id}-panel`
        return (
          <motion.div layout="position" key={item.id} className={itemClassName}>
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">{item.title}</span>
                {item.meta && <span className="shrink-0 text-caption text-muted-foreground">{item.meta}</span>}
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: duration.base, ease: ease.out }} className="flex">
                  <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="panel"
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  layout="position"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, transition: { duration: duration.fast } }}
                  transition={{ duration: duration.base, ease: ease.out }}
                  className="px-4 pb-4 text-sm text-muted-foreground"
                >
                  {item.content}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

export { Accordion }
