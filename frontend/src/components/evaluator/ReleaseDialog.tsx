import { Send } from "lucide-react"
import { Avatar, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui"
import type { QueueItem } from "@/pages/evaluator/data/types"

interface ReleaseDialogProps {
  items: QueueItem[] | null
  releasing: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Confirms releasing finished evaluations: students see their scores and feedback, and get a notification. */
export default function ReleaseDialog({ items, releasing, onConfirm, onClose }: ReleaseDialogProps) {
  const list = items ?? []
  const shown = list.slice(0, 5)
  return (
    <Dialog open={!!items?.length} onOpenChange={(o) => !o && !releasing && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Release {list.length} {list.length === 1 ? "result" : "results"}?
          </DialogTitle>
          <DialogDescription>Students see their score, the rubric breakdown and your feedback, and get a notification. Released grades change only through a re-evaluation.</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-1.5">
          {shown.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
              <Avatar name={i.student_name} src={i.student_avatar} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{i.student_name}</span>
                <span className="block truncate text-caption text-muted-foreground">{i.assignment_title}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {i.score}
                <span className="font-normal text-muted-foreground">/{i.max_marks}</span>
              </span>
            </li>
          ))}
          {list.length > shown.length && <li className="px-1 text-caption text-muted-foreground">and {list.length - shown.length} more</li>}
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={releasing}>
            Not yet
          </Button>
          <Button onClick={onConfirm} loading={releasing} leftIcon={<Send aria-hidden="true" />}>
            Release {list.length === 1 ? "result" : `${list.length} results`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
