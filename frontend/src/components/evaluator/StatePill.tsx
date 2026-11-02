import { Lock } from "lucide-react"
import { Badge } from "@/components/ui"
import { STATE_META } from "@/pages/evaluator/data/derive"
import type { QueueItem } from "@/pages/evaluator/data/types"

/** Where a submission stands: to mark, a draft (someone else's shows a lock), ready to release, or released. */
export default function StatePill({ item }: { item: Pick<QueueItem, "state" | "mine" | "evaluator_name" | "score" | "max_marks" | "grade"> }) {
  const meta = STATE_META[item.state]
  if (item.state === "draft" && !item.mine) {
    return (
      <Badge tone="neutral" className="gap-1">
        <Lock className="h-3 w-3" aria-hidden="true" />
        {item.evaluator_name ? `${item.evaluator_name.split(" ").slice(-1)[0]} is marking` : "Being marked"}
      </Badge>
    )
  }
  return (
    <Badge tone={meta.tone} dot={item.state === "draft"}>
      {meta.label}
      {item.score !== null && (item.state === "evaluated" || item.state === "released") && (
        <span className="tabular-nums opacity-80">
          · {item.score}/{item.max_marks}
          {item.grade ? ` ${item.grade}` : ""}
        </span>
      )}
    </Badge>
  )
}
