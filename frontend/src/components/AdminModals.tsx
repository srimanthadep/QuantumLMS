import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { CustomSelect } from "./ui/select"
import {
  GraduationCap,
  UserPlus,
  Receipt,
  RotateCcw,
  ShieldAlert,
  Calendar,
  Clock,
} from "lucide-react"
import type {
  AdminCourse,
  AdminBatch,
  AdminTeacher,
  AdminOrder,
  SecurityAuditLog,
} from "../data/adminStore"
import BatchFormDialog, { type BatchFormValues } from "../pages/admin/views/batches/BatchFormDialog"
import { batchInstructorNames } from "../pages/admin/views/batches/batchTheme"

// 1. Add Teacher / Instructor Modal
export function AddTeacherModal({ isOpen, onClose, onAdd, courses }: {
  isOpen: boolean; onClose: () => void; courses: AdminCourse[];
  onAdd: (data: { name: string; email: string; title: string; specialization: string; role: "Lead Instructor" | "Evaluator"; assignedCourses: string[]; activeBatches: string[]; status: "Available"; avatar: string }) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"Lead Instructor" | "Evaluator">("Lead Instructor")
  const [courseId, setCourseId] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("")
    try {
      await onAdd({ name, email, role, title: "", specialization: "", assignedCourses: role === "Lead Instructor" && courseId ? [courseId] : [], activeBatches: [], status: "Available", avatar: "" })
      setName(""); setEmail(""); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to send invitation") }
    finally { setBusy(false) }
  }
  return <Dialog open={isOpen} onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent className="max-w-lg">
    <DialogHeader><DialogTitle>Invite faculty</DialogTitle><DialogDescription>Create an account and send a sign-in invitation to their email.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-2 text-sm">Full name<Input required minLength={2} value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="block space-y-2 text-sm">Email<Input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block space-y-2 text-sm">Role<CustomSelect value={role} onChange={v => setRole(v as typeof role)} options={["Lead Instructor", "Evaluator"]} /></label>
      {role === "Lead Instructor" && <label className="block space-y-2 text-sm">Course assignment (optional)<select className="h-10 w-full rounded-lg border border-border bg-surface px-3" value={courseId} onChange={e => setCourseId(e.target.value)}><option value="">Assign later</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Sending invitation…" : "Send invitation"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>
}

export function CreateBatchModal({
  isOpen,
  onClose,
  onCreate,
  courses,
  teachers,
}: {
  isOpen: boolean
  onClose: () => void
  onCreate: (batch: BatchFormValues) => Promise<void> | void
  courses: AdminCourse[]
  teachers: AdminTeacher[]
}) {
  return (
    <BatchFormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      mode="create"
      courses={courses}
      instructors={batchInstructorNames(teachers)}
      onSubmit={onCreate}
    />
  )
}

// 3. Manual Enrolment Modal
export function ManualEnrolModal({
  isOpen,
  onClose,
  onEnrol,
  courses,
  batches,
  initialCourseId = "",
}: {
  isOpen: boolean
  onClose: () => void
  onEnrol: (data: { name: string; email: string; courseId: string; batchId: string }) => Promise<void> | void
  courses: AdminCourse[]
  batches: AdminBatch[]
  /** Preselects a course, e.g. when opened from that course's Learners tab. */
  initialCourseId?: string
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [courseId, setCourseId] = useState("")
  const [batchId, setBatchId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [formError, setFormError] = useState("")

  useEffect(() => {
    if (!isOpen) return
    setCourseId(initialCourseId)
    setBatchId("")
    setFormError("")
  }, [isOpen, initialCourseId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    if (!courseId && !batchId) {
      setFormError("Choose a course, a batch, or both.")
      return
    }
    setSubmitting(true)
    setFormError("")
    try {
      await onEnrol({ name: name.trim(), email: email.trim(), courseId, batchId })
      setName("")
      setEmail("")
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not enrol this learner.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text border border-primary-border">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Manual Learner Enrolment</DialogTitle>
              <DialogDescription>Give a learner access to a course, a live batch, or both</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Student Name</label>
            <Input
              required
              placeholder="e.g. Priyanshu Das"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Email Address</label>
            <Input
              type="email"
              required
              placeholder="priyanshu@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Course (self-paced lessons)</label>
            <CustomSelect
              value={courseId}
              onChange={setCourseId}
              placeholder="No course"
              options={[{ value: "", label: "No course" }, ...courses.map((c) => ({ value: c.id, label: c.title }))]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Live batch (classes and recordings)</label>
            <CustomSelect
              value={batchId}
              onChange={setBatchId}
              placeholder="No batch"
              options={[
                { value: "", label: "No batch" },
                ...batches.map((b) => ({ value: b.id, label: `${b.name} (${b.enrolledSeats}/${b.maxSeats} seats)` })),
              ]}
            />
          </div>
          <p className="text-[11px] text-subtle-foreground">Courses and batches are separate. Pick either one, or both.</p>
          {formError && (
            <p role="alert" className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger">
              {formError}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Complete Enrolment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RefundConfirmDialog({
  order,
  isOpen,
  onClose,
  onConfirmRefund,
}: {
  order: AdminOrder | null
  isOpen: boolean
  onClose: () => void
  onConfirmRefund: (orderId: string, reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState("Customer requested cancellation before cohort start date")

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!order) return null

  const handleRefund = async () => {
    if (pending) return
    setPending(true); setError(null)
    try { await onConfirmRefund(order.id, reason); onClose() }
    catch (e) { setError((e as Error).message) }
    finally { setPending(false) }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-soft text-danger border border-danger/30">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Confirm Refund</DialogTitle>
              <DialogDescription>
                Initiate gateway reversal for {order.orderNumber}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="rounded-xl border border-border bg-surface-2 p-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Learner:</span>
              <span className="font-semibold text-foreground">{order.studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Course:</span>
              <span className="font-medium text-foreground">{order.courseTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Refund Amount:</span>
              <span className="font-bold text-danger font-mono">₹{order.amount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Refund Reason</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRefund} disabled={pending}>
            Approve & Refund ₹{order.amount.toLocaleString("en-IN")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 6. Audit Detail Sheet
export function AuditDetailSheet({
  log,
  isOpen,
  onClose,
}: {
  log: SecurityAuditLog | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!log) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary-text" />
            <SheetTitle>Audit Log Inspection</SheetTitle>
          </div>
          <SheetDescription>Log ID: {log.id}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4 text-xs">
          <div className="space-y-2 rounded-xl border border-border bg-surface-2 p-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timestamp:</span>
              <span className="font-medium text-foreground">{log.timestamp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actor:</span>
              <span className="font-semibold text-foreground">
                {log.actorName} ({log.actorRole})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IP Address:</span>
              <span className="font-mono text-foreground">{log.ip || "Not recorded"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={log.status === "Success" ? "default" : "destructive"}>
                {log.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="font-semibold text-foreground">Action</div>
            <div className="p-2.5 rounded-lg border border-border bg-surface font-mono text-[11px] text-foreground">
              {log.action}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="font-semibold text-foreground">Target Resource</div>
            <div className="p-2.5 rounded-lg border border-border bg-surface text-foreground">
              {log.target}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="font-semibold text-foreground">Event Payload (JSON)</div>
            <pre className="p-3 rounded-lg border border-border bg-surface font-mono text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
              {log.details}
            </pre>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
