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
  AdminOrder,
  SecurityAuditLog,
} from "../data/adminStore"
import BatchFormDialog, { type BatchFormValues } from "../pages/admin/views/batches/BatchFormDialog"

// 1. Add Teacher / Instructor Modal
export function AddTeacherModal({
  isOpen,
  onClose,
  onAdd,
  courses,
}: {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: {
    name: string
    email: string
    title: string
    specialization: string
    role: "Lead Instructor" | "Teaching Assistant" | "Evaluator"
    assignedCourses: string[]
    activeBatches: string[]
    status: "Available" | "Live Now" | "In Review" | "Off-Duty"
    avatar: string
  }) => void
  courses: AdminCourse[]
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [title, setTitle] = useState("AI Instructor & Faculty Researcher")
  const [specialization, setSpecialization] = useState("LLM Architectures & Multi-Agent Systems")
  const [role, setRole] = useState<"Lead Instructor" | "Teaching Assistant" | "Evaluator">("Lead Instructor")
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.title || "Generative AI Engineering")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, ".")}@quantumschool.ai`,
      title,
      specialization,
      role,
      assignedCourses: [selectedCourse],
      activeBatches: [`${selectedCourse} Cohort 1`],
      status: "Available",
      avatar: `/assets/teacher-${Math.random() > 0.5 ? "male" : "female"}.png`,
    })
    setName("")
    setEmail("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text border border-primary-border">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Add Instructor or TA</DialogTitle>
              <DialogDescription>Register a new AI instructor or faculty member to the academy</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Full Name</label>
            <Input
              required
              placeholder="e.g. Dr. Aryan Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Official Email</label>
            <Input
              type="email"
              placeholder="aryan.sharma@quantumschool.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Role</label>
              <CustomSelect
                value={role}
                onChange={(val) => setRole(val as any)}
                options={["Lead Instructor", "Teaching Assistant", "Evaluator"]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Assigned Course</label>
              <CustomSelect
                value={selectedCourse}
                onChange={setSelectedCourse}
                options={courses.map((c) => ({ value: c.title, label: c.title }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Professional Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Domain Specialization</label>
            <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Instructor</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 2. Create Cohort Batch Modal (delegates to shared BatchFormDialog)
export function CreateBatchModal({
  isOpen,
  onClose,
  onCreate,
  courses,
}: {
  isOpen: boolean
  onClose: () => void
  onCreate: (batch: BatchFormValues) => Promise<void> | void
  courses: AdminCourse[]
}) {
  return (
    <BatchFormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      mode="create"
      courses={courses}
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
}: {
  isOpen: boolean
  onClose: () => void
  onEnrol: (data: { name: string; email: string; courseId: string; batchId: string }) => Promise<void> | void
  courses: AdminCourse[]
  batches: AdminBatch[]
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [courseId, setCourseId] = useState("")
  const [batchId, setBatchId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const initialCourseId = courses[0]?.id || ""
    setCourseId(initialCourseId)
    const matching = batches.find((b) => b.courseId === initialCourseId) || batches[0]
    setBatchId(matching?.id || "")
  }, [isOpen, courses, batches])

  const relevantBatches = batches.filter((b) => b.courseId === courseId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setSubmitting(true)
    try {
      await onEnrol({
        name: name.trim(),
        email: email.trim(),
        courseId: courseId || courses[0]?.id || "",
        batchId: batchId || relevantBatches[0]?.id || batches[0]?.id || "",
      })
      setName("")
      setEmail("")
      onClose()
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
              <DialogDescription>Enrol a student directly into an active cohort batch</DialogDescription>
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
            <label className="text-xs font-semibold text-foreground">Select Course</label>
            <CustomSelect
              value={courseId}
              onChange={(val) => {
                setCourseId(val)
                const nextBatch = batches.find((b) => b.courseId === val)
                if (nextBatch) setBatchId(nextBatch.id)
              }}
              options={courses.map((c) => ({ value: c.id, label: c.title }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Assigned Cohort Batch</label>
            <CustomSelect
              value={batchId}
              onChange={setBatchId}
              placeholder={relevantBatches.length > 0 ? "Select batch" : "No active batches for this course"}
              options={relevantBatches.map((b) => ({
                value: b.id,
                label: `${b.name} (${b.enrolledSeats}/${b.maxSeats} seats)`,
              }))}
            />
          </div>

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

// 4. Invoice View Modal
export function InvoiceModal({
  order,
  isOpen,
  onClose,
}: {
  order: AdminOrder | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!order) return null

  const tax = Math.round(order.amount * 0.18)
  const base = order.amount - tax

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text border border-primary-border">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Tax Invoice</DialogTitle>
                <DialogDescription>{order.orderNumber}</DialogDescription>
              </div>
            </div>
            <Badge variant={order.status === "Paid" ? "default" : "destructive"}>
              {order.status.toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-4 my-2 text-xs">
          <div className="flex justify-between items-start border-b border-border pb-3">
            <div>
              <div className="font-bold text-sm text-foreground">Quantum School of AI</div>
              <div className="text-muted-foreground">GSTIN: 29AABCS1429B1Z8</div>
              <div className="text-muted-foreground">Bengaluru, Karnataka, India</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground">Date: {order.date}</div>
              <div className="text-muted-foreground">Method: {order.method}</div>
            </div>
          </div>

          <div>
            <div className="text-muted-foreground uppercase font-semibold text-[10px] mb-1">Billed To</div>
            <div className="font-semibold text-foreground text-sm">{order.studentName}</div>
            <div className="text-muted-foreground">{order.studentEmail}</div>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex justify-between font-medium text-foreground">
              <span>{order.courseTitle} (Full Tuition & Lab Access)</span>
              <span>₹{base.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Integrated GST (18%)</span>
              <span>₹{tax.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-foreground border-t border-border pt-2">
              <span>Total Paid</span>
              <span className="text-primary-text font-mono">₹{order.amount.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              window.print()
            }}
          >
            Print / Save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 5. Refund Confirm Dialog
export function RefundConfirmDialog({
  order,
  isOpen,
  onClose,
  onConfirmRefund,
}: {
  order: AdminOrder | null
  isOpen: boolean
  onClose: () => void
  onConfirmRefund: (orderId: string, reason: string) => void
}) {
  const [reason, setReason] = useState("Customer requested cancellation before cohort start date")

  if (!order) return null

  const handleRefund = () => {
    onConfirmRefund(order.id, reason)
    onClose()
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRefund}>
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
              <span className="font-mono text-foreground">{log.ip}</span>
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
