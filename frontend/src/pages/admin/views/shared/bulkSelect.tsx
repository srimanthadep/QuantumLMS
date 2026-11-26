import { useCallback, useState } from "react"
import { motion } from "framer-motion"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { transition } from "@/lib/motion"

/** Select mode for a list: which items are ticked. Ids that are no longer shown are ignored by the caller. */
export function useBulkSelect() {
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const setMany = useCallback((ids: string[], on: boolean) => {
    setSelected((cur) => {
      const next = new Set(cur)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }, [])
  const clear = useCallback(() => setSelected(new Set()), [])
  const start = useCallback(() => setSelecting(true), [])
  const stop = useCallback(() => {
    setSelecting(false)
    setSelected(new Set())
  }, [])
  /** Keeps only these ids ticked (the ones whose delete failed). */
  const keepOnly = useCallback((ids: string[]) => setSelected(new Set(ids)), [])

  return { selecting, selected, toggle, setMany, clear, start, stop, keepOnly }
}

export { bulkResultMessage, deleteMany } from "./bulkDelete"

interface BulkActionBarProps {
  count: number
  total: number
  onSelectAll: () => void
  onClearSelection: () => void
  onDelete: () => void
  onDone: () => void
  deleteLabel: string
}

/** Floating bar shown while selecting: the count, select all, delete and done. */
export function BulkActionBar({ count, total, onSelectAll, onClearSelection, onDelete, onDone, deleteLabel }: BulkActionBarProps) {
  const all = count >= total
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.base}
      role="region"
      aria-label="Bulk actions"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-[var(--elev-lg)]">
        <span className="px-1 text-sm font-medium tabular-nums text-foreground" aria-live="polite">
          {count} selected
        </span>
        <Button size="sm" variant="ghost" onClick={all ? onClearSelection : onSelectAll} disabled={total === 0}>
          {all && count > 0 ? "Clear selection" : `Select all ${total}`}
        </Button>
        <Button size="sm" variant="danger" leftIcon={<Trash2 aria-hidden="true" />} disabled={count === 0} onClick={onDelete}>
          {deleteLabel}
          {count > 0 ? ` (${count})` : ""}
        </Button>
        <Button size="sm" variant="outline" onClick={onDone}>
          Done
        </Button>
      </div>
    </motion.div>
  )
}
