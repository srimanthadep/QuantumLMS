import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check } from "lucide-react"
import { transition } from "@/lib/motion"
import { Button } from "@/components/ui"

/** Submit button for settings forms: disabled until something changed, then "Saving…" and a brief "Saved". */
export default function SaveButton({ dirty, saving, saved, label = "Save changes" }: { dirty: boolean; saving: boolean; saved: boolean; label?: string }) {
  return (
    <Button type="submit" disabled={!dirty && !saving} loading={saving} className="min-w-[132px]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={saved ? "saved" : "save"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={transition.fast} className="flex items-center gap-1.5">
          {saved && <Check className="h-4 w-4" aria-hidden="true" />}
          {saving ? "Saving…" : saved ? "Saved" : label}
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}

/** Runs an async save and shows "Saved" for a moment afterwards. Rejections surface through onError. */
export function useSaveState() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const run = async (fn: () => Promise<void>, onError: (message: string) => void) => {
    setSaving(true)
    try {
      await fn()
      setSaved(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }
  return { saving, saved, run }
}
