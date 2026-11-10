import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  FileText,
  Hourglass,
  ListOrdered,
  MessageSquare,
  ShieldCheck,
  Tag,
  Target,
  Timer,
  Undo2,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Kbd } from "@/components/ui/kbd"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { CATEGORY_META, STATUS_META, formatClassDate, formatDecidedAt, type ApprovalRecord } from "./approvalData"

interface ApprovalDetailProps {
  item: ApprovalRecord
  checks: boolean[]
  note: string
  position: { index: number; total: number }
  onToggleCheck: (index: number) => void
  onNoteChange: (value: string) => void
  onApprove: () => void
  onRequestChanges: () => void
  onReopen: () => void
  onPrev: () => void
  onNext: () => void
  /** Hide the prev/next stepper (used inside the mobile sheet header). */
  compact?: boolean
}

interface Fact {
  icon: LucideIcon
  label: string
  value: string
}

function factsFor(item: ApprovalRecord): Fact[] {
  const d = item.details
  const facts: Fact[] = []
  if (d.date) facts.push({ icon: CalendarDays, label: "Date", value: formatClassDate(d.date) })
  if (d.time) facts.push({ icon: Clock, label: "Time", value: d.time })
  if (d.duration) facts.push({ icon: Timer, label: "Duration", value: d.duration })
  if (d.type) facts.push({ icon: Tag, label: "Format", value: d.type })
  if (d.marks !== undefined) facts.push({ icon: Target, label: "Max marks", value: String(d.marks) })
  if (d.passingMarks !== undefined) facts.push({ icon: Target, label: "Pass mark", value: String(d.passingMarks) })
  if (d.timeLimit) facts.push({ icon: Hourglass, label: "Time limit", value: d.timeLimit })
  if (d.submissionsGraded !== undefined) facts.push({ icon: Users, label: "Graded", value: `${d.submissionsGraded} submissions` })
  if (d.chaptersCount !== undefined) facts.push({ icon: ListOrdered, label: "Chapters", value: `${d.chaptersCount} chapters` })
  if (d.fileSize) facts.push({ icon: FileText, label: "File", value: d.fileSize })
  return facts
}

/** Full review panel for one request: summary, instructor note, checklist, comment and decision. */
export default function ApprovalDetail({
  item,
  checks,
  note,
  position,
  onToggleCheck,
  onNoteChange,
  onApprove,
  onRequestChanges,
  onReopen,
  onPrev,
  onNext,
  compact,
}: ApprovalDetailProps) {
  const meta = CATEGORY_META[item.category]
  const status = STATUS_META[item.status]
  const Icon = meta.icon
  const pending = item.status === "Pending"
  const facts = factsFor(item)
  const done = checks.filter(Boolean).length
  const allChecked = done === meta.checklist.length
  const avg = item.details.averageScore

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xs" aria-label={`Review ${item.title}`}>
      {/* Header */}
      <header className="relative overflow-hidden border-b border-border px-5 pb-5 pt-4 sm:px-6">
        <div aria-hidden="true" className={cn("pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full opacity-[0.12] blur-3xl", meta.accent)} />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={cn("flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold ring-1 ring-inset", meta.tile)}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {meta.label}
            </span>
            <Badge tone={status.tone} size="sm" dot={pending}>
              {status.label}
            </Badge>
          </div>
          {!compact && (
            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs tabular-nums text-subtle-foreground">
                {position.index + 1} of {position.total}
              </span>
              <Button size="icon-sm" variant="ghost" onClick={onPrev} disabled={position.index <= 0} aria-label="Previous request">
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={onNext} disabled={position.index >= position.total - 1} aria-label="Next request">
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>

        <h2 className="relative mt-3 text-xl font-bold leading-7 tracking-tight text-foreground">{item.title}</h2>
        <p className="relative mt-1 text-sm text-muted-foreground">
          <span className="font-mono text-foreground">{item.courseCode}</span> · {item.courseName}
          {item.moduleName && <span className="block text-xs text-subtle-foreground">{item.moduleName}</span>}
        </p>

        <div className="relative mt-4 flex items-center gap-2.5">
          <Avatar name={item.instructor} size="sm" />
          <div className="min-w-0 text-xs leading-4">
            <p className="font-semibold text-foreground">{item.instructor}</p>
            <p className="text-muted-foreground">Submitted {item.submittedAt}</p>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
        {facts.length > 0 && (
          <section aria-labelledby={`facts-${item.id}`}>
            <h3 id={`facts-${item.id}`} className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Request details
            </h3>
            <dl className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-3 py-2.5">
                  <f.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[11px] text-subtle-foreground">{f.label}</dt>
                    <dd className="truncate text-sm font-medium tabular-nums text-foreground" title={f.value}>
                      {f.value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>
        )}

        {avg !== undefined && (
          <section className="rounded-xl border border-border p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">Class average</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{avg}%</p>
              </div>
              <span className="text-xs text-muted-foreground">out of {item.details.marks ?? 100} marks</span>
            </div>
            <Progress value={avg} size="sm" tone={avg >= 75 ? "success" : avg >= 50 ? "warning" : "danger"} className="mt-3" label="Class average score" />
          </section>
        )}

        {item.details.notes && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">Note from the instructor</h3>
            <blockquote className="mt-2.5 rounded-xl border-l-[3px] border-border-strong bg-surface-2/50 px-4 py-3 text-sm leading-6 text-foreground">
              {item.details.notes}
            </blockquote>
          </section>
        )}

        {pending ? (
          <>
            <section aria-labelledby={`check-${item.id}`}>
              <div className="flex items-center justify-between">
                <h3 id={`check-${item.id}`} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Review checklist
                </h3>
                <span className={cn("text-xs font-medium tabular-nums", allChecked ? "text-success" : "text-subtle-foreground")}>
                  {done}/{meta.checklist.length}
                </span>
              </div>
              <ul className="mt-2.5 divide-y divide-border overflow-hidden rounded-xl border border-border">
                {meta.checklist.map((label, i) => {
                  const id = `chk-${item.id}-${i}`
                  return (
                    <li key={label} className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-surface-2/50">
                      <Checkbox id={id} checked={checks[i] ?? false} onCheckedChange={() => onToggleCheck(i)} />
                      <label htmlFor={id} className={cn("flex-1 cursor-pointer text-sm", checks[i] ? "text-muted-foreground line-through decoration-border-strong" : "text-foreground")}>
                        {label}
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section>
              <label htmlFor={`note-${item.id}`} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Comment to instructor
              </label>
              <Textarea
                id={`note-${item.id}`}
                className="mt-2.5"
                rows={3}
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder="Optional when approving. Required when requesting changes."
              />
            </section>
          </>
        ) : (
          <section
            className={cn(
              "rounded-xl border p-4",
              item.status === "Approved" ? "border-success/25 bg-success-soft/60" : "border-danger/25 bg-danger-soft/60",
            )}
          >
            <div className="flex items-start gap-3">
              {item.status === "Approved" ? (
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {item.status === "Approved" ? "Approved and live for learners" : "Sent back to the instructor"}
                </p>
                {item.decidedAt && <p className="text-xs text-muted-foreground">{formatDecidedAt(item.decidedAt)}</p>}
                {item.reviewNote && <p className="mt-2 text-sm leading-6 text-foreground">"{item.reviewNote}"</p>}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Decision bar */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-2/40 px-5 py-3.5 sm:px-6">
        {pending ? (
          <>
            <p className="hidden items-center gap-1.5 text-xs text-subtle-foreground md:flex">
              <Kbd>A</Kbd> approve <Kbd>J</Kbd>
              <Kbd>K</Kbd> move
            </p>
            <div className="flex flex-1 items-center justify-end gap-2">
              <Button variant="outline" onClick={onRequestChanges} leftIcon={<CircleX className="text-danger" aria-hidden="true" />}>
                Request changes
              </Button>
              <Button onClick={onApprove} leftIcon={<CircleCheck aria-hidden="true" />}>
                {allChecked ? "Approve" : "Approve anyway"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Decision recorded. You can reopen it for another look.</p>
            <Button variant="outline" onClick={onReopen} leftIcon={<Undo2 aria-hidden="true" />}>
              Reopen
            </Button>
          </>
        )}
      </footer>
    </article>
  )
}

