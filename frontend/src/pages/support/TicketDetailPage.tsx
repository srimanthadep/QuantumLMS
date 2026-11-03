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
    text: "Hello! We have received your query and are investigating. A mentor will follow up shortly.",
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
        {/* Left Column: Conversation & Reply (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Initial Inquiry Card */}
          <Card>
            <CardHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={ticket.studentName} className="h-9 w-9" />
                  <div>
                    <CardTitle className="text-sm font-semibold">{ticket.studentName}</CardTitle>
                    <CardDescription className="text-xs">
                      {ticket.studentEmail} · {new Date(ticket.created_at).toLocaleString()}
                    </CardDescription>
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
                    {ticket.priority}
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
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </div>

              {ticket.attachment_name && (
                <div className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-foreground">
                  <Paperclip className="h-3.5 w-3.5 text-primary-text" />
                  <span>{ticket.attachment_name}</span>
                  {ticket.attachment_size && (
                    <span className="text-muted-foreground">({ticket.attachment_size})</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation Thread */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conversation Timeline ({ticket.messages.length} messages)
            </h4>

            {ticket.messages.length <= 1 ? (
              <p className="text-xs text-muted-foreground italic">
                No subsequent replies yet. Post a response below to notify the learner.
              </p>
            ) : (
              <div className="space-y-3">
                {ticket.messages.slice(1).map((msg) => {
                  const isAgent = msg.role === "agent" || msg.sender.includes("Support")
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-lg border p-4 text-xs sm:text-sm space-y-2",
                        isAgent
                          ? "bg-primary-soft/30 border-primary-border/40 ml-4 sm:ml-8"
                          : "bg-surface-2 border-border mr-4 sm:mr-8",
                      )}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{msg.sender}</span>
                          <Badge tone={isAgent ? "primary" : "neutral"} className="text-[10px]">
                            {isAgent ? "Support Team" : "Student"}
                          </Badge>
                        </div>
                        <span className="text-muted-foreground text-[11px]">{msg.timestamp}</span>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Composer Card */}
          <Card>
            <form onSubmit={handleSendReply}>
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary-text" />
                  Compose Reply
                </CardTitle>
                <CardDescription>
                  Replies are instantly routed to the student&apos;s notification inbox.
                </CardDescription>

                {/* Canned Macro Quick Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  <span className="text-[11px] text-muted-foreground font-medium mr-1">
                    Insert Macro:
                  </span>
                  {CANNED_MACROS.map((macro) => (
                    <button
                      key={macro.label}
                      type="button"
                      onClick={() => setReplyText((prev) => (prev ? `${prev}\n\n${macro.text}` : macro.text))}
                      className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
                    >
                      {macro.label}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3">
                <Textarea
                  required
                  rows={5}
                  placeholder="Write your message to the student..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Pressing Send Reply will notify {ticket.studentName} via email and student portal.
                  </p>

                  <Button type="submit" loading={isSendingReply} disabled={!replyText.trim()}>
                    <Send className="mr-1.5 h-4 w-4" />
                    Send Reply
                  </Button>
                </div>
              </CardContent>
            </form>
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
                <span className="text-muted-foreground">Assigned Mentor</span>
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
