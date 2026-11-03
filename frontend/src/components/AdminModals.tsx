import { useState } from "react"
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
import { Switch } from "./ui/switch"
import { Badge } from "./ui/badge"
import {
  GraduationCap,
  Layers,
  UserPlus,
  Receipt,
  RotateCcw,
  ShieldAlert,
  Calendar,
  Clock,
  Sparkles,
  Bot,
  MessageSquare,
  Award,
} from "lucide-react"
import type {
  AdminCourse,
  AdminBatch,
  AdminOrder,
  SecurityAuditLog,
} from "../data/adminStore"

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
  const [title, setTitle] = useState("AI Instructor & Research Mentor")
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
              <DialogDescription>Register a new AI instructor or mentor to the academy</DialogDescription>
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
              <select
                className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="Lead Instructor">Lead Instructor</option>
                <option value="Teaching Assistant">Teaching Assistant</option>
                <option value="Evaluator">Evaluator</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Assigned Course</label>
              <select
                className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.title}>
                    {c.title}
                  </option>
                ))}
              </select>
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

// 2. Create Cohort Batch Modal
export function CreateBatchModal({
  isOpen,
  onClose,
  onCreate,
  courses,
}: {
  isOpen: boolean
  onClose: () => void
  onCreate: (batch: Omit<AdminBatch, "id" | "enrolledSeats">) => void
  courses: AdminCourse[]
}) {
  const [name, setName] = useState("")
  const [courseId, setCourseId] = useState(courses[0]?.id || "")
  const [instructor, setInstructor] = useState("Srimanth")
  const [startDate, setStartDate] = useState("2026-11-20")
  const [endDate, setEndDate] = useState("2027-02-28")
  const [schedule, setSchedule] = useState("Mon, Wed, Fri · 7:30 PM - 9:30 PM IST")
  const [maxSeats, setMaxSeats] = useState(100)
  const [deliveryMode, setDeliveryMode] = useState<"Live + Replay" | "Replay Only">("Live + Replay")
  const [replayDelayHours, setReplayDelayHours] = useState(2)
  const [accessExpiryMonths, setAccessExpiryMonths] = useState(12)

  const [liveChat, setLiveChat] = useState(true)
  const [doubtClearing, setDoubtClearing] = useState(true)
  const [aiTutor, setAiTutor] = useState(true)
  const [certificate, setCertificate] = useState(true)

  const selectedCourse = courses.find((c) => c.id === courseId) || courses[0]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate({
      name,
      courseId: selectedCourse?.id || "course-1",
      courseTitle: selectedCourse?.title || "Generative AI Engineering",
      instructor,
      instructorAvatar: "/assets/srimanth.png",
      startDate,
      endDate,
      schedule,
      maxSeats: Number(maxSeats),
      deliveryMode,
      replayDelayHours: Number(replayDelayHours),
      accessExpiryMonths: Number(accessExpiryMonths),
      features: {
        liveChat,
        doubtClearing,
        aiTutor,
        certificate,
      },
      status: "Upcoming",
    })
    setName("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text border border-primary-border">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Create Cohort Batch</DialogTitle>
              <DialogDescription>Define schedule, seat capacity, and learning entitlements</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Cohort Batch Name</label>
            <Input
              required
              placeholder="e.g. GenAI Engineering Cohort 15"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Course</label>
              <select
                className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Lead Instructor</label>
              <select
                className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
              >
                <option value="Srimanth">Srimanth</option>
                <option value="Dr. Vikram Sen">Dr. Vikram Sen</option>
                <option value="Meera Nair">Meera Nair</option>
                <option value="Ananya Roy">Ananya Roy</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Seat Limit</label>
              <Input
                type="number"
                min={10}
                max={500}
                value={maxSeats}
                onChange={(e) => setMaxSeats(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Delivery Mode</label>
              <select
                className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={deliveryMode}
                onChange={(e) => setDeliveryMode(e.target.value as any)}
              >
                <option value="Live + Replay">Live Studio + Replay Access</option>
                <option value="Replay Only">On-Demand Replay Only</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Schedule Timing</label>
            <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </div>

          {/* Entitlement Toggles */}
          <div className="rounded-xl border border-border bg-surface-2 p-3 space-y-3">
            <div className="text-xs font-bold text-foreground uppercase tracking-wider">
              Student Entitlements & Features
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border">
                <span className="flex items-center gap-1.5 font-medium">
                  <MessageSquare className="h-3.5 w-3.5 text-primary-text" /> Live Chat
                </span>
                <Switch checked={liveChat} onCheckedChange={setLiveChat} />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-primary-text" /> Doubt Clearing
                </span>
                <Switch checked={doubtClearing} onCheckedChange={setDoubtClearing} />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border">
                <span className="flex items-center gap-1.5 font-medium">
                  <Bot className="h-3.5 w-3.5 text-primary-text" /> AI Tutor (Clover)
                </span>
                <Switch checked={aiTutor} onCheckedChange={setAiTutor} />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border">
                <span className="flex items-center gap-1.5 font-medium">
                  <Award className="h-3.5 w-3.5 text-primary-text" /> Official Certificate
                </span>
                <Switch checked={certificate} onCheckedChange={setCertificate} />
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Cohort</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  onEnrol: (data: { name: string; email: string; courseId: string; batchId: string }) => void
  courses: AdminCourse[]
  batches: AdminBatch[]
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [courseId, setCourseId] = useState(courses[0]?.id || "")
  const [batchId, setBatchId] = useState(batches[0]?.id || "")

  const relevantBatches = batches.filter((b) => b.courseId === courseId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    onEnrol({
      name,
      email,
      courseId,
      batchId: batchId || relevantBatches[0]?.id || batches[0]?.id || "batch-1",
    })
    setName("")
    setEmail("")
    onClose()
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
            <select
              className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value)
                const nextBatch = batches.find((b) => b.courseId === e.target.value)
                if (nextBatch) setBatchId(nextBatch.id)
              }}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Assigned Cohort Batch</label>
            <select
              className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
            >
              {relevantBatches.length > 0 ? (
                relevantBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.enrolledSeats}/{b.maxSeats} seats)
                  </option>
                ))
              ) : (
                <option value="">No active batches for this course</option>
              )}
            </select>
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
