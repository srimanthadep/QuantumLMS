import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MoveRight,
  Sparkles,
  ShieldCheck,
  Flame,
  CheckCheck,
  ArrowRightLeft,
  ExternalLink,
  CreditCard,
  Bot,
  Paperclip,
  Smile,
  Receipt,
  X,
  Award,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  getTicketById,
  updateTicketStatus,
  addTicketReply,
  type SupportTicket,
} from "@/services/ticketService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Student360Drawer } from "@/components/shared/Student360Drawer";

export const TicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId?: string }>();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<SupportTicket["messages"]>([]);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isStudent360Open, setIsStudent360Open] = useState(false);
  const [isBatchMoveModalOpen, setIsBatchMoveModalOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<SupportTicket["status"]>("Open");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showNotification = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => {
      setActionToast((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const fetchTicket = useCallback(async () => {
    if (!ticketId) {
      setError("No ticket ID provided.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getTicketById(ticketId);
      if (!data) {
        setError(`Ticket #${ticketId} was not found in the database.`);
        setTicket(null);
      } else {
        setTicket(data);
        setMessages(data.messages || []);
        setTicketStatus(data.status);
        setResolutionNotes(data.resolution_notes || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket.");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const CANNED_MACROS = [
    {
      label: "Razorpay Refund",
      tag: "#refund",
      text: `Hi ${ticket?.studentName || "there"}, I have cross-checked transaction details with payment logs. The reversal has been initiated. Funds will reflect in your original payment method within 5-7 banking business days.`,
    },
    {
      label: "Batch Shift SOP",
      tag: "#batch",
      text: `Hi ${ticket?.studentName || "there"}, your request for cohort migration has been forwarded to Academic Operations. Your milestone submissions, replays, and grades will be preserved upon confirmation.`,
    },
    {
      label: "Medical Validity",
      tag: "#validity",
      text: `Hi ${ticket?.studentName || "there"}, understanding your medical circumstances, we've initiated a 30-day course validity extension so you can catch up on live replays at your own pace.`,
    },
    {
      label: "Cluster / Lab Quota",
      tag: "#compute",
      text: "We have reviewed your resource request and granted additional compute quota on your assigned lab namespace. Please verify access and let us know if any issues persist.",
    },
  ];

  const handleSendReply = async () => {
    if (!replyText.trim() || !ticket) return;
    setIsSendingReply(true);

    try {
      await addTicketReply(ticket.id, replyText.trim());

      const optimisticMsg = {
        id: `msg-${Date.now()}`,
        sender: "Meera Sen (Support Lead)",
        role: "agent" as const,
        message: replyText.trim(),
        timestamp: "Just now",
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setReplyText("");
      showNotification("Reply saved to Supabase database & dispatched to student.");

      // Refresh to ensure exact sync
      const refreshed = await getTicketById(ticket.id);
      if (refreshed) {
        setTicket(refreshed);
        setMessages(refreshed.messages || []);
      }
    } catch (err) {
      showNotification(
        err instanceof Error ? err.message : "Unable to send reply to Supabase."
      );
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleAiCopilotGenerate = (type: "refund" | "batch" | "empathy") => {
    if (!ticket) return;
    setIsCopilotThinking(true);
    setTimeout(() => {
      setIsCopilotThinking(false);
      let draft = "";
      if (type === "refund") {
        draft = `Dear ${ticket.studentName},\n\nThank you for reaching out regarding ticket ${ticket.ticketNumber} for ${ticket.category}.\n\nWe have investigated the records in our database and successfully verified the transaction. The funds will be credited directly to your bank account within 5-7 business days.\n\nYour enrollment in ${ticket.studentBatch} remains active and confirmed!`;
      } else if (type === "batch") {
        draft = `Hi ${ticket.studentName}, I have reviewed your request for cohort migration regarding ticket ${ticket.ticketNumber}. Since you meet our academic policy requirements, your progress will be preserved when your transfer is sanctioned.`;
      } else {
        draft = `Hi ${ticket.studentName}, we completely understand your concern regarding "${ticket.subject}"! Please rest assured that our support desk is handling this as a high priority.`;
      }
      setReplyText(draft);
      showNotification("AI Copilot draft generated with student context.");
    }, 400);
  };

  const handleStatusChange = async (newStatus: SupportTicket["status"]) => {
    if (!ticket) return;
    setIsSavingStatus(true);
    try {
      const updated = await updateTicketStatus(
        ticket.id,
        newStatus,
        resolutionNotes,
        "Meera Sen (Support Lead)"
      );
      setTicket(updated);
      setTicketStatus(updated.status);
      showNotification(`Ticket status updated to ${newStatus} in Supabase.`);
    } catch (err) {
      showNotification(
        err instanceof Error ? err.message : "Failed to update ticket status."
      );
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleSaveResolutionNotes = async () => {
    if (!ticket) return;
    setIsSavingStatus(true);
    try {
      const updated = await updateTicketStatus(
        ticket.id,
        ticketStatus,
        resolutionNotes,
        "Meera Sen (Support Lead)"
      );
      setTicket(updated);
      showNotification("Resolution notes saved to Supabase database.");
    } catch (err) {
      showNotification(
        err instanceof Error ? err.message : "Failed to save resolution notes."
      );
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleResolveTicket = async () => {
    await handleStatusChange("Resolved");
  };

  const handleProposeBatchMove = async () => {
    if (!ticket) return;
    setIsBatchMoveModalOpen(false);
    await handleStatusChange("In Progress");
    showNotification(`Cohort transfer proposal logged for ${ticket.studentName}.`);
  };

  const handleProposeExtension = async () => {
    if (!ticket) return;
    setIsExtensionModalOpen(false);
    await handleStatusChange("In Progress");
    showNotification(`Validity extension proposal logged for ${ticket.studentName}.`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-zinc-500">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mb-3" />
        <h3 className="font-bold text-base text-zinc-800">Loading Ticket Details...</h3>
        <p className="text-xs text-zinc-400 mt-1">Connecting to Supabase PostgreSQL</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-3" />
        <h3 className="font-bold text-lg text-zinc-900 mb-1">Ticket Not Found</h3>
        <p className="text-sm text-zinc-500 max-w-md mb-6">
          {error || "The requested ticket record does not exist in the database."}
        </p>
        <Link to="/support/inbox">
          <button className="btn-support-primary px-4 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Tickets Inbox</span>
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-[var(--app-card-gap,14px)] support-page-font pb-0 h-full">
      {/* Toast Notification */}
      {actionToast && (
        <div className="fixed top-5 right-5 z-50 animate-fadeIn">
          <div className="bg-ink-900 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-primary/40">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            <span>{actionToast}</span>
            <button
              onClick={() => setActionToast(null)}
              className="ml-2 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TOP CONTROL BAR */}
      <div className="panel py-2 px-3 sm:px-4 bg-surface border border-zinc-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/support/inbox">
            <button
              type="button"
              className="btn-support-secondary text-xs h-7.5 px-3 font-bold cursor-pointer gap-1.5 shadow-2xs hover:shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Ticket Inbox</span>
            </button>
          </Link>

          <span className="hidden sm:inline text-zinc-300">•</span>

          <span className="font-mono text-xs font-extrabold text-primary-text bg-primary-soft px-2.5 py-0.5 rounded-full shadow-xs border border-primary/30">
            {ticket.ticketNumber}
          </span>

          {ticketStatus === "Resolved" ? (
            <span className="badge-status-completed text-[10px] font-bold px-2 py-0.5">
              Resolved
            </span>
          ) : ticketStatus === "In Progress" ? (
            <span className="badge-status-assigned text-[10px] font-bold px-2 py-0.5">
              In Progress
            </span>
          ) : ticketStatus === "Closed" ? (
            <span className="badge-status-not-started text-[10px] font-bold px-2 py-0.5">
              Closed
            </span>
          ) : (
            <span className="badge-status-in-progress text-[10px] font-bold px-2 py-0.5">
              Open
            </span>
          )}

          {ticket.priority === "High" || ticket.priority === "Urgent" ? (
            <span className="badge-status-assigned text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
              <Flame className="h-2.5 w-2.5 text-amber-600 animate-pulse" />
              <span>{ticket.priority} Priority SLA</span>
            </span>
          ) : null}

          {/* Quick status toggle button */}
          <div className="flex items-center gap-1 ml-2">
            {(["Open", "In Progress", "Resolved", "Closed"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusChange(st)}
                disabled={isSavingStatus || ticketStatus === st}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                  ticketStatus === st
                    ? "bg-purple-600 text-white border-purple-700 shadow-2xs"
                    : "bg-surface text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Global Ticket Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchTicket}
            className="p-1.5 rounded-full border border-zinc-200 text-zinc-600 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
            title="Refresh database record"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsStudent360Open(true)}
            className="btn-support-secondary text-xs font-bold h-7.5 px-3 cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs"
            title="Inspect Student 360° Profile"
          >
            <User className="h-3.5 w-3.5 text-primary-text" />
            <span>Student 360°</span>
          </button>

          <button
            type="button"
            onClick={handleResolveTicket}
            disabled={ticketStatus === "Resolved" || isSavingStatus}
            className="btn-support-primary text-xs font-bold h-7.5 px-3.5 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{ticketStatus === "Resolved" ? "Ticket Resolved" : "Resolve Ticket"}</span>
          </button>
        </div>
      </div>

      {/* MAIN 2-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--app-card-gap,14px)] flex-1 min-h-0">
        {/* ========================================================
            COLUMN 1: Conversation Thread & AI Composer (8 cols)
           ======================================================== */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0 gap-[var(--app-card-gap,14px)] overflow-hidden">
          {/* Ticket Overview Capsule */}
          <div className="panel p-3 bg-surface border border-zinc-150 space-y-1.5 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-extrabold text-foreground leading-tight truncate">
                    {ticket.subject}
                  </h2>
                  <span className="badge-status-in-progress text-[10px] font-bold px-2 py-0.5">
                    {ticket.category}
                  </span>
                  <span
                    className={
                      ticket.priority === "High" || ticket.priority === "Urgent"
                        ? "badge-status-assigned text-[10px] font-bold px-2 py-0.5"
                        : "badge-status-not-started text-[10px] font-bold px-2 py-0.5"
                    }
                  >
                    {ticket.priority.toUpperCase()} Priority
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                  <span className="font-semibold text-foreground">{ticket.studentName}</span>
                  <span>•</span>
                  <span className="font-mono text-zinc-400 text-[11px]">{ticket.studentEmail}</span>
                  <span>•</span>
                  <span className="text-primary-text font-semibold text-[11px]">{ticket.studentBatch}</span>
                  <span>•</span>
                  <span className="text-zinc-400 text-[11px]">
                    Created: {new Date(ticket.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Attachment Pill if present */}
              {ticket.attachment_name && (
                <div className="flex items-center gap-2 shrink-0 bg-primary-soft border border-primary-border px-2.5 py-1 rounded-xl shadow-2xs">
                  <Paperclip className="h-3.5 w-3.5 text-primary-text shrink-0" />
                  <span className="text-[11px] font-medium text-zinc-800 truncate max-w-[150px]">
                    {ticket.attachment_name}
                  </span>
                  {ticket.attachment_size && (
                    <span className="text-[10px] text-zinc-400">({ticket.attachment_size})</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Conversation History Stream & AI Composer */}
          <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-3.5 rounded-2xl bg-surface border border-primary-border shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between shrink-0 mb-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  Communication Thread ({messages.length})
                </h3>
                <span className="badge-status-completed text-[9px] font-bold px-1.5 py-0">
                  Live Supabase Sync
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                Auto-scroll active
              </span>
            </div>

            {/* Scrollable Message List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1.5 support-queue-scrollbar">
              {messages.map((msg) => {
                const isAgent = msg.role === "agent";
                return (
                  <div
                    key={msg.id}
                    className={`p-2.5 sm:p-3 rounded-2xl border transition-all space-y-1.5 ${
                      isAgent
                        ? "bg-primary text-white border-[#7D46E7] ml-4 sm:ml-8 shadow-sm shadow-primary/20"
                        : "bg-primary-soft text-foreground border-primary-border mr-4 sm:mr-8 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-7 w-7 rounded-xl flex items-center justify-center text-[10px] font-extrabold shrink-0 shadow-xs ${
                            isAgent
                              ? "bg-surface text-primary-text"
                              : "bg-primary-soft text-primary-text border border-primary/30"
                          }`}
                        >
                          {isAgent ? "MS" : "AM"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p
                              className={`text-xs font-extrabold leading-none ${
                                isAgent ? "text-white" : "text-foreground"
                              }`}
                            >
                              {msg.sender}
                            </p>
                            {isAgent && (
                              <span className="bg-black/20 text-white border border-white/30 text-[8px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-xs leading-none">
                                Staff
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[9px] font-mono mt-0.5 ${
                              isAgent ? "text-white" : "text-zinc-400"
                            }`}
                          >
                            {msg.timestamp}
                          </p>
                        </div>
                      </div>

                      {isAgent && (
                        <div className="flex items-center gap-1 text-[10px] text-white font-mono">
                          <span>Delivered</span>
                          <CheckCheck className="h-3.5 w-3.5 text-success" />
                        </div>
                      )}
                    </div>

                    <p
                      className={`text-xs leading-relaxed whitespace-pre-wrap pl-0.5 font-medium ${
                        isAgent ? "text-white" : "text-foreground"
                      }`}
                    >
                      {msg.message}
                    </p>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Copilot & Macro Acceleration Bar */}
            <div className="shrink-0 pt-2 border-t border-primary-soft space-y-1.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 support-card-scroll">
                <span className="font-extrabold text-foreground text-[10px] flex items-center gap-1 shrink-0">
                  <Sparkles className="h-3 w-3 text-primary-text" />
                  <span>Copilot:</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleAiCopilotGenerate("refund")}
                  disabled={isCopilotThinking}
                  className="btn-support-secondary text-[10px] h-6 px-2 font-bold cursor-pointer shrink-0"
                >
                  <Bot className="h-2.5 w-2.5" />
                  <span>Refund SOP</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAiCopilotGenerate("batch")}
                  disabled={isCopilotThinking}
                  className="btn-support-secondary text-[10px] h-6 px-2 font-bold cursor-pointer shrink-0"
                >
                  <ArrowRightLeft className="h-2.5 w-2.5" />
                  <span>Cohort Shift</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAiCopilotGenerate("empathy")}
                  disabled={isCopilotThinking}
                  className="btn-support-secondary text-[10px] h-6 px-2 font-bold cursor-pointer shrink-0"
                >
                  <Award className="h-2.5 w-2.5" />
                  <span>Empathetic</span>
                </button>

                <span className="text-zinc-300 shrink-0">|</span>

                {CANNED_MACROS.map((macro, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(macro.text)}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-primary-border bg-surface hover:bg-primary-soft hover:border-primary text-foreground shrink-0 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span className="font-mono text-primary-text">{macro.tag}</span>
                    <span>{macro.label}</span>
                  </button>
                ))}
              </div>

              {/* Reply Textarea & Dispatch Action */}
              <div className="space-y-1.5">
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Draft your reply to the student... (Saves to Supabase ticket_replies)"
                  className="w-full text-xs p-2 rounded-xl border border-primary-border bg-primary-soft text-foreground resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-sans leading-relaxed h-13 sm:h-15"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="action-icon-lavender h-6.5 w-6.5"
                      title="Insert Friendly Emoji"
                      onClick={() => setReplyText((prev) => prev + " 👍 ")}
                    >
                      <Smile className="h-3 w-3" />
                    </button>
                    <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline ml-1">
                      Markdown ready
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || isSendingReply}
                    className="btn-support-primary text-xs h-7.5 px-3.5 font-bold disabled:opacity-50 cursor-pointer shadow-xs hover:shadow-sm flex items-center gap-1"
                  >
                    {isSendingReply ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <span>Send Reply</span>
                        <Send className="h-3 w-3 ml-0.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            COLUMN 2: Student Telemetry, Mentor Actions & Resolution Notes (4 cols)
           ======================================================== */}
        <div className="lg:col-span-4 flex flex-col h-full min-h-0 gap-[var(--app-card-gap,14px)] overflow-y-auto support-queue-scrollbar pr-0.5">
          {/* Learner Profile Card */}
          <div className="p-3 rounded-2xl bg-surface border border-primary-border shadow-2xs space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                Learner Profile
              </span>
              <span className="badge-status-completed text-[9px] font-bold px-1.5 py-0">
                Verified Student
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary-text border border-primary/30 font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                AM
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-foreground text-xs truncate">
                  {ticket.studentName}
                </h4>
                <p className="text-[10px] text-zinc-500 font-mono truncate">
                  {ticket.studentEmail}
                </p>
                <p className="text-[9px] text-primary-text font-semibold truncate mt-0.5">
                  {ticket.studentBatch}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsStudent360Open(true)}
              className="btn-support-outlined w-full text-[11px] h-7 font-bold cursor-pointer justify-center gap-1.5"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Inspect Student 360°</span>
            </button>
          </div>

          {/* Resolution Notes Panel */}
          <div className="p-3 rounded-2xl bg-surface border border-primary-border shadow-2xs space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-600" />
                <h4 className="font-bold text-foreground text-xs">Resolution Notes</h4>
              </div>
              <span className="text-[9px] text-zinc-400">Supabase</span>
            </div>

            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Add official resolution notes for auditing..."
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 bg-zinc-50 text-foreground resize-none focus:outline-none focus:border-primary focus:bg-white"
            />

            <button
              type="button"
              onClick={handleSaveResolutionNotes}
              disabled={isSavingStatus}
              className="w-full py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSavingStatus ? "Saving..." : "Save Resolution Notes"}
            </button>
          </div>

          {/* Mentor Governance Actions Card */}
          <div className="p-3 rounded-2xl bg-surface border border-primary-border shadow-2xs space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-foreground text-xs leading-tight">
                Quick SOP Actions
              </h4>
              <span className="badge-status-completed text-[8px] font-bold px-1.5 py-0">
                Authorized
              </span>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleAiCopilotGenerate("refund")}
                className="w-full p-2 rounded-xl border border-primary-border bg-primary-soft hover:bg-success-soft/30 hover:border-success transition-all flex items-center justify-between gap-2 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CreditCard className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="text-[11px] font-bold text-foreground truncate">
                    Verify Billing / Gateway
                  </span>
                </div>
                <span className="text-[9px] font-bold text-purple-700">Apply →</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBatchMoveModalOpen(true)}
                className="w-full p-2 rounded-xl border border-primary-border bg-primary-soft hover:bg-purple-50 transition-all flex items-center justify-between gap-2 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span className="text-[11px] font-bold text-foreground truncate">
                    Propose Cohort Transfer
                  </span>
                </div>
                <span className="text-[9px] font-bold text-purple-700">Shift →</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExtensionModalOpen(true)}
                className="w-full p-2 rounded-xl border border-primary-border bg-primary-soft hover:bg-purple-50 transition-all flex items-center justify-between gap-2 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span className="text-[11px] font-bold text-foreground truncate">
                    Propose Validity Extension
                  </span>
                </div>
                <span className="text-[9px] font-bold text-purple-700">Extend →</span>
              </button>
            </div>
          </div>

          {/* Ticket SLA & Ownership Telemetry */}
          <div className="panel p-3 bg-surface border border-zinc-150 space-y-1.5 text-xs shrink-0">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 block">
              Database Audit &amp; Ownership
            </span>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-500">Ticket ID</span>
                <span className="font-mono font-bold text-primary-text">{ticket.id}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-500">Last Touch</span>
                <span className="font-medium text-foreground">
                  {ticket.last_update_by || "Support Team"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-500">Updated</span>
                <span className="font-mono text-zinc-500 text-[10px]">
                  {new Date(ticket.updated_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Propose Batch Move Modal */}
      <Dialog open={isBatchMoveModalOpen} onOpenChange={setIsBatchMoveModalOpen}>
        <DialogContent className="w-[94vw] sm:max-w-md p-0 rounded-[28px] bg-surface border border-primary-border shadow-2xl overflow-hidden support-page-font">
          <DialogHeader className="p-5 border-b border-primary-soft bg-gradient-to-b from-primary-soft to-white text-left">
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary-text" />
              <span>Propose Cohort Batch Transfer</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4 text-xs">
            <p className="text-zinc-500 leading-relaxed">
              Select destination cohort for <strong className="text-foreground">{ticket.studentName}</strong>.
            </p>

            <div className="space-y-1">
              <label className="font-bold text-foreground block">Current Cohort</label>
              <div className="p-2.5 rounded-xl bg-primary-soft border border-primary-border font-semibold text-zinc-700">
                {ticket.studentBatch}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground block">Target Destination Cohort</label>
              <select className="w-full text-xs rounded-xl border border-primary-border bg-primary-soft p-2.5 focus:border-primary focus:outline-none">
                <option>Full-Stack AI &amp; LLM Systems - Cohort 7 (Live + Replay)</option>
                <option>Autonomous Multi-Agent Bootcamp (Weekend Intensive)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-primary-soft bg-primary-soft flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBatchMoveModalOpen(false)}
              className="btn-support-secondary text-xs h-8 px-4 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProposeBatchMove}
              className="btn-support-primary text-xs h-8 px-4 font-bold cursor-pointer"
            >
              Submit Proposal
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Propose Extension Modal */}
      <Dialog open={isExtensionModalOpen} onOpenChange={setIsExtensionModalOpen}>
        <DialogContent className="w-[94vw] sm:max-w-md p-0 rounded-[28px] bg-surface border border-primary-border shadow-2xl overflow-hidden support-page-font">
          <DialogHeader className="p-5 border-b border-primary-soft bg-gradient-to-b from-primary-soft to-white text-left">
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary-text" />
              <span>Propose Access Validity Extension</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4 text-xs">
            <p className="text-zinc-500 leading-relaxed">
              Specify duration extension to grant <strong className="text-foreground">{ticket.studentName}</strong>.
            </p>

            <div className="space-y-1">
              <label className="font-bold text-foreground block">Extension Duration</label>
              <select className="w-full text-xs rounded-xl border border-primary-border bg-primary-soft p-2.5 focus:border-primary focus:outline-none">
                <option value="15">15 Days Extension</option>
                <option value="30">30 Days Extension (Standard Medical/Work)</option>
                <option value="60">60 Days Extension</option>
              </select>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-primary-soft bg-primary-soft flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsExtensionModalOpen(false)}
              className="btn-support-secondary text-xs h-8 px-4 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProposeExtension}
              className="btn-support-primary text-xs h-8 px-4 font-bold cursor-pointer"
            >
              Submit Extension Proposal
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Centered Student 360 Popup Modal */}
      <Student360Drawer
        open={isStudent360Open}
        onOpenChange={setIsStudent360Open}
        studentId={ticket.studentId}
      />
    </div>
  );
};

export default TicketDetailPage;
