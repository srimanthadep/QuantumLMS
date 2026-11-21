import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Field from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { type ApprovalItem, recordingTitle, teacherName } from "./approvalTypes"

const MAX = 1000

/** Decline a publish request with an optional note that is sent to the teacher. */
export default function DeclineDialog({ item, onClose, onConfirm }: { item: ApprovalItem | null; onClose: () => void; onConfirm: (item: ApprovalItem, note: string) => Promise<boolean> }) {
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (item) setNote("")
  }, [item])

  const submit = async () => {
    if (!item) return
    setBusy(true)
    try {
      if (await onConfirm(item, note.trim())) onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle>Decline this request?</DialogTitle>
              <DialogDescription>
                “{recordingTitle(item)}” stays a draft. {teacherName(item)} is notified and can edit it and ask again.
              </DialogDescription>
            </DialogHeader>
            <Field label="Note for the teacher" aside={<span className="text-[11px] text-subtle-foreground">Optional</span>} className="mt-2">
              <Textarea
                autoFocus
                rows={4}
                maxLength={MAX}
                value={note}
                disabled={busy}
                placeholder="For example: chapter 3 cuts off mid-sentence, please fix the end time."
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <p className="mt-1 text-right text-[11px] tabular-nums text-subtle-foreground">
              {note.length}/{MAX}
            </p>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" variant="danger" loading={busy} onClick={() => void submit()}>
                Decline request
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
