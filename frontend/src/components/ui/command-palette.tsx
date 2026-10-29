import * as React from "react"
import { motion } from "framer-motion"
import { CornerDownLeft, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog"
import { Kbd } from "./kbd"

export interface CommandItem {
  id: string
  label: string
  group: string
  icon?: React.ReactNode
  /** Extra search terms. */
  keywords?: string[]
  hint?: string
  onSelect: () => void
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CommandItem[]
  placeholder?: string
}

function score(item: CommandItem, q: string): number {
  if (!q) return 1
  const hay = [item.label, item.group, ...(item.keywords ?? [])].join(" ").toLowerCase()
  const label = item.label.toLowerCase()
  if (label.startsWith(q)) return 3
  if (label.includes(q)) return 2
  return q.split(/\s+/).every((w) => hay.includes(w)) ? 1 : 0
}

/** ⌘K palette: dialog + filtered, grouped list with arrow-key navigation and a sliding highlight. */
export default function CommandPalette({ open, onOpenChange, items, placeholder = "Search pages, courses and actions…" }: CommandPaletteProps) {
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)
  const id = React.useId()

  React.useEffect(() => {
    if (open) {
      setQuery("")
      setActive(0)
    }
  }, [open])

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .map((it) => ({ it, s: score(it, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.it)
      .slice(0, 40)
  }, [items, query])

  // Keep groups in first-appearance order while preserving the global index for keyboard nav.
  const groups = React.useMemo(() => {
    const map = new Map<string, { item: CommandItem; index: number }[]>()
    results.forEach((item, index) => {
      if (!map.has(item.group)) map.set(item.group, [])
      map.get(item.group)!.push({ item, index })
    })
    return [...map.entries()]
  }, [results])

  React.useEffect(() => setActive(0), [query])

  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" })
  }, [active])

  const run = (item: CommandItem | undefined) => {
    if (!item) return
    onOpenChange(false)
    item.onSelect()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => Math.min(results.length - 1, a + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      run(results[active])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="max-w-xl gap-0 overflow-hidden p-0"
        containerClassName="items-start pt-[12vh] sm:items-start"
        onKeyDown={onKeyDown}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Type to filter, use the arrow keys to move and Enter to open.</DialogDescription>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={results[active] ? `${id}-opt-${active}` : undefined}
            aria-label="Search commands"
            className="h-12 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle-foreground focus-visible:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={listRef} id={`${id}-list`} role="listbox" aria-label="Results" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-10 text-center text-sm text-muted-foreground">No results for “{query}”</p>}
          {groups.map(([group, entries]) => (
            <div key={group} role="group" aria-label={group} className="mb-1 last:mb-0">
              <div className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-subtle-foreground">{group}</div>
              {entries.map(({ item, index }) => {
                const isActive = index === active
                return (
                  <div
                    key={item.id}
                    id={`${id}-opt-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isActive}
                    onMouseMove={() => setActive(index)}
                    onClick={() => run(item)}
                    className={cn(
                      "relative flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId={`${id}-highlight`}
                        transition={spring.snappy}
                        className="absolute inset-0 rounded-md bg-surface-2"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative flex h-5 w-5 items-center justify-center text-muted-foreground [&_svg]:size-4">{item.icon}</span>
                    <span className="relative min-w-0 flex-1 truncate">{item.label}</span>
                    {item.hint && <span className="relative text-caption text-subtle-foreground">{item.hint}</span>}
                    {isActive && <CornerDownLeft className="relative h-3.5 w-3.5 text-subtle-foreground" aria-hidden="true" />}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-caption text-subtle-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> open
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { CommandPalette }
