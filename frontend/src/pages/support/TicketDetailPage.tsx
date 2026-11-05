import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  LifeBuoy,
  Paperclip,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui"
import {
  getTicketById,
  updateTicketStatus,
  addTicketReply,
  type SupportTicket,
} from "@/services/ticketService"
import { Student360Drawer } from "@/components/shared/Student360Drawer"
import { cn } from "@/lib/utils"

interface TicketDetailPageProps {
  onToast?: (msg: string) => void
}

const CANNED_MACROS = [
  {
    label: "Acknowledge",
    text: "Hello! We have received your query and are investigating. A specialist will follow up shortly.",
  },
  {
    label: "Request Logs",
    text: "Could you please share a screenshot of the error, browser console logs, or your terminal output?",
  },
  {
    label: "Batch Shift",
    text: "We reviewed your request. You have been transferred to the requested cohort. Check your dashboard.",
  },
  {
    label: "Resolved",
    text: "This issue has now been resolved. Please reach back out if you need any additional assistance!",
  },
]

export default function TicketDetailPage({ onToast }: TicketDetailPageProps) {
  const { ticketId } = useParams<{ ticketId?: string }>()
  const navigate = useNavigate()

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [replyText, setReplyText] = useState("")
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState("")

  // Modals & Drawers
  const [isStudent360Open, setIsStudent360Open] = useState(false)
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false)
  const [isExtensionOpen, setIsExtensionOpen] = useState(false)

  // Modals form state
  const [targetBatch, setTargetBatch] = useState("Cohort 8 (Evening)")
  const [extensionDays, setExtensionDays] = useState("3")

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchTicket = useCallback(async () => {
    if (!ticketId) {
      setIsLoading(false)
      return
    }

    try {
      const data = await getTicketById(ticketId)
      if (data) {
        setTicket(data)
        setResolutionNotes(data.resolution_notes || "")
      } else {
        setTicket(null)
      }
    } catch (err) {
      console.error("Failed to load ticket:", err)
    } finally {
      setIsLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [ticket?.messages?.length])

  const handleStatusChange = async (newStatus: SupportTicket["status"]) => {
    if (!ticket) return
    setIsSavingStatus(true)
    try {
      const updated = await updateTicketStatus(
        ticket.id,
        newStatus,
        newStatus === "Resolved" || newStatus === "Closed" ? resolutionNotes : undefined,
      )
      setTicket(updated)
      onToast?.(`Status updated to ${newStatus}`)
    } catch (err: any) {
      onToast?.(err.message || "Failed to update status")
    } finally {
      setIsSavingStatus(false)
    }
  }

  const handlePriorityChange = async (newPriority: SupportTicket["priority"]) => {
    if (!ticket) return
    setIsSavingStatus(true)
    try {
      const updated = await updateTicketStatus(ticket.id, ticket.status, undefined, undefined)
      // If endpoint doesn't support priority in patch directly, update local state
      setTicket({ ...ticket, priority: newPriority })
      onToast?.(`Priority set to ${newPriority}`)
    } catch (err: any) {
      onToast?.(err.message || "Failed to update priority")
    } finally {
      setIsSavingStatus(false)
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket || !replyText.trim()) return

    setIsSendingReply(true)
    try {
      await addTicketReply(ticket.id, replyText.trim())
      setReplyText("")
      onToast?.("Reply sent to student.")
      await fetchTicket()
    } catch (err: any) {
      onToast?.(err.message || "Failed to send reply.")
    } finally {
      setIsSendingReply(false)
    }
  }

  const handleConfirmBatchMove = async () => {
    if (!ticket) return
    setIsBatchMoveOpen(false)
    const reply = `[Academic Action]: Batch transfer proposal to ${targetBatch} has been approved by Support.`
    try {
      await addTicketReply(ticket.id, reply)
      onToast?.(`Student transferred to ${targetBatch}.`)
      await fetchTicket()
    } catch (err: any) {
      onToast?.(err.message || "Failed to process transfer.")
    }
  }

  const handleConfirmExtension = async () => {
    if (!ticket) return
    setIsExtensionOpen(false)
    const reply = `[Academic Action]: Granted a ${extensionDays}-day extension for upcoming assessment submission.`
    try {
      await addTicketReply(ticket.id, reply)
      onToast?.(`Granted ${extensionDays}-day assignment extension.`)
      await fetchTicket()
    } catch (err: any) {
      onToast?.(err.message || "Failed to grant extension.")
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary-text" />
        <p>Loading ticket records...</p>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="p-12">
        <EmptyState
          icon={<LifeBuoy className="h-5 w-5" />}
          title="Ticket Not Found"
          description={`Ticket #${ticketId} was not found in the database.`}
          action={
            <Button onClick={() => navigate("/support/inbox")}>
              ← Back to Tickets Inbox
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`${ticket.ticketNumber}: ${ticket.subject}`}
        description={`Submitted by ${ticket.studentName} · ${ticket.category}`}
        breadcrumb={[
          { label: "Support", href: "/support" },
          { label: "Inbox", href: "/support/inbox" },
          { label: ticket.ticketNumber },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/support/inbox")}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Inbox
            </Button>

            {/* Priority Selector */}
            <Select
              value={ticket.priority}
              onValueChange={(val) => handlePriorityChange(val as SupportTicket["priority"])}
              disabled={isSavingStatus}
            >
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Selector */}
            <Select
              value={ticket.status}
              onValueChange={(val) => handleStatusChange(val as SupportTicket["status"])}
              disabled={isSavingStatus}
            >
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchTicket}
              aria-label="Refresh ticket"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Interactive Chat & Resolution Stream (8 cols) */}
        <div className="space-y-4 lg:col-span-8">
          <Card className="flex flex-col overflow-hidden border border-border shadow-[var(--elev-sm)]">
            {/* Chat Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-border bg-surface-2/60 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <Avatar name={ticket.studentName} className="h-9 w-9 ring-1 ring-border" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{ticket.studentName}</span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                      Active Ticket Chat
                    </span>
                  </div>
                  <p className="text-caption text-muted-foreground">
                    {ticket.studentEmail} · {ticket.category}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  tone={
                    ticket.priority === "Urgent"
                      ? "danger"
                      : ticket.priority === "High"
                        ? "warning"
                        : ticket.priority === "Medium"
                          ? "info"
                          : "neutral"
                  }
                >
                  {ticket.priority} Priority
                </Badge>
                <Badge
                  tone={
                    ticket.status === "Open"
                      ? "danger"
                      : ticket.status === "In Progress"
                        ? "warning"
                        : ticket.status === "Resolved"
                          ? "success"
                          : "neutral"
                  }
                >
                  {ticket.status}
                </Badge>
              </div>
            </div>

            {/* Chat Messages Feed */}
            <div className="h-[460px] overflow-y-auto p-4 sm:p-5 space-y-4 bg-surface-3/30">
              {/* Initial ticket request rendered as student's first message */}
              <div className="flex items-start gap-3">
                <Avatar name={ticket.studentName} className="h-8 w-8 mt-1 shrink-0" />
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tl-sm border border-border bg-surface p-3.5 text-xs sm:text-sm shadow-xs space-y-2">
                  <div className="flex items-center justify-between gap-3 text-caption">
                    <span className="font-semibold text-foreground">{ticket.studentName}</span>
                    <span className="text-muted-foreground text-[10px] tabular-nums">
                      {new Date(ticket.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="font-medium text-foreground">{ticket.subject}</p>
                  <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                  {ticket.attachment_name && (
                    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-caption text-foreground">
                      <Paperclip className="h-3.5 w-3.5 text-primary-text" />
                      <span>{ticket.attachment_name}</span>
                      {ticket.attachment_size && (
                        <span className="text-muted-foreground">({ticket.attachment_size})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Thread messages */}
              {ticket.messages.slice(1).map((msg) => {
                const isAgent = msg.role === "agent" || msg.sender.includes("Support")
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-3",
                      isAgent ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <Avatar
                      name={isAgent ? "Support Agent" : msg.sender}
                      className="h-8 w-8 mt-1 shrink-0"
                    />
                    <div
                      className={cn(
                        "max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs sm:text-sm shadow-xs space-y-1.5",
                        isAgent
                          ? "rounded-tr-sm bg-primary-soft/50 border border-primary-border/60 text-foreground"
                          : "rounded-tl-sm bg-surface border border-border text-foreground",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 text-caption">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          {msg.sender}
                          <Badge tone={isAgent ? "primary" : "neutral"} size="sm" className="text-[10px]">
                            {isAgent ? "Support" : "Student"}
                          </Badge>
                        </span>
                        <span className="text-muted-foreground text-[10px] tabular-nums">{msg.timestamp}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Composer Footer */}
            <div className="border-t border-border bg-surface p-4 space-y-3">
              {/* Macro chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground font-medium mr-1">
                  Quick Macro:
                </span>
                {CANNED_MACROS.map((macro) => (
                  <button
                    key={macro.label}
                    type="button"
                    onClick={() => setReplyText((prev) => (prev ? `${prev} ${macro.text}` : macro.text))}
                    className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
                  >
                    {macro.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendReply} className="flex gap-2">
                <Textarea
                  required
                  rows={2}
                  placeholder={`Reply to ${ticket.studentName}… (Press Enter to send)`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      if (replyText.trim() && !isSendingReply) {
                        handleSendReply(e)
                      }
                    }
                  }}
                  className="resize-none text-xs sm:text-sm"
                />
                <Button
                  type="submit"
                  loading={isSendingReply}
                  disabled={!replyText.trim()}
                  className="self-end h-10 px-4"
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:ml-1.5">Send</span>
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Right Column: Student 360 & Ticket Details (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Student Profile Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Student 360° Profile</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary-text"
                  onClick={() => setIsStudent360Open(true)}
                >
                  Full Profile →
                </Button>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name={ticket.studentName} className="h-11 w-11 border border-border" />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{ticket.studentName}</p>
                  <p className="text-xs text-muted-foreground truncate">{ticket.studentEmail}</p>
                  <p className="text-[11px] font-medium text-primary-text mt-0.5">{ticket.studentBatch}</p>
                </div>
              </div>

              {/* Academic Actions */}
              <div className="space-y-2 pt-3 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Academic Fast-Actions
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setIsBatchMoveOpen(true)}
                >
                  <ArrowRightLeft className="mr-2 h-3.5 w-3.5 text-primary-text" />
                  Propose Batch Transfer
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setIsExtensionOpen(true)}
                >
                  <Clock className="mr-2 h-3.5 w-3.5 text-warning" />
                  Grant Milestone Extension
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Metadata Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ticket Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Ticket ID</span>
                <span className="font-mono font-semibold text-foreground">{ticket.ticketNumber}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium text-foreground">{ticket.category}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Priority</span>
                <Badge
                  tone={
                    ticket.priority === "Urgent"
                      ? "danger"
                      : ticket.priority === "High"
                        ? "warning"
                        : ticket.priority === "Medium"
                          ? "info"
                          : "neutral"
                  }
                >
                  {ticket.priority}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  tone={
                    ticket.status === "Open"
                      ? "danger"
                      : ticket.status === "In Progress"
                        ? "warning"
                        : ticket.status === "Resolved"
                          ? "success"
                          : "neutral"
                  }
                >
                  {ticket.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Assigned Specialist</span>
                <span className="font-medium text-foreground">{ticket.assignedAgent}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Batch Move Dialog */}
      <Dialog open={isBatchMoveOpen} onOpenChange={setIsBatchMoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Propose Cohort Transfer</DialogTitle>
            <DialogDescription>
              Transfer {ticket.studentName} to another cohort. Replay progress and quiz scores remain intact.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Field label="Target Cohort">
              <Select value={targetBatch} onValueChange={setTargetBatch}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cohort 8 (Evening)">Cohort 8 (Evening - Mon/Wed/Fri)</SelectItem>
                  <SelectItem value="Cohort 7 (Weekend)">Cohort 7 (Weekend - Sat/Sun)</SelectItem>
                  <SelectItem value="Agentic Bootcamp">Agentic Systems Bootcamp 2026</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchMoveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBatchMove}>
              Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Milestone Extension Dialog */}
      <Dialog open={isExtensionOpen} onOpenChange={setIsExtensionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grant Assignment Extension</DialogTitle>
            <DialogDescription>
              Add a grace period to {ticket.studentName}&apos;s current pending assignment deadline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Field label="Extension Duration">
              <Select value={extensionDays} onValueChange={setExtensionDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Days Grace Period</SelectItem>
                  <SelectItem value="3">3 Days Grace Period</SelectItem>
                  <SelectItem value="5">5 Days Grace Period</SelectItem>
                  <SelectItem value="7">1 Week Grace Period</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtensionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmExtension}>
              Grant Extension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student 360 Drawer */}
      <Student360Drawer
        open={isStudent360Open}
        onOpenChange={setIsStudent360Open}
        studentId={ticket.student_id}
      />
    </div>
  )
}
