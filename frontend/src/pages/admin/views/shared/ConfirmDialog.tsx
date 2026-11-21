import { useState, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export interface ConfirmRequest {
  title: string
  description: ReactNode
  confirmLabel: string
  /** Danger styling for destructive actions (default true). */
  danger?: boolean
  /** Runs when confirmed. Return false (or throw) to keep the dialog open. */
  onConfirm: () => Promise<unknown> | unknown
}

/** One reusable "are you sure?" dialog, driven by a request object. Pass null to close. */
export default function ConfirmDialog({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    if (!request) return
    setBusy(true)
    try {
      const result = await request.onConfirm()
      if (result !== false) onClose()
    } catch {
      // The caller reports the error; keep the dialog open so the admin can retry.
    } finally {
      setBusy(false)
    }
  }
  const danger = request?.danger ?? true
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        {request && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                {danger && (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-danger/20 bg-danger/10 text-danger">
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0">
                  <DialogTitle>{request.title}</DialogTitle>
                  <DialogDescription>{request.description}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" variant={danger ? "danger" : "primary"} onClick={() => void run()} loading={busy}>
                {request.confirmLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
