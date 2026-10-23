import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  LifeBuoy,
  Send,
  User,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MoveRight,
  Calendar,
  Sparkles,
  ShieldCheck,
  FileText,
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
  ChevronsUpDown,
} from "lucide-react";
import { getAllSupportTickets, getSupportTicketById } from "./supportTicketsData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Student360Drawer } from "@/components/shared/Student360Drawer";
import { mockDataService } from "@/services/mockDataService";
import "./supportTheme.css";

export const TicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId?: string }>();
  const ticket = getSupportTicketById(ticketId) || getAllSupportTickets()[0];

  const [messages, setMessages] = useState(ticket?.messages || []);
  const [replyText, setReplyText] = useState("");
  const [isStudent360Open, setIsStudent360Open] = useState(false);
  const [isBatchMoveModalOpen, setIsBatchMoveModalOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<"open" | "pending" | "resolved">(
    (ticket?.status as "open" | "pending" | "resolved") || "open"
  );
  const [proposedStatus, setProposedStatus] = useState<string | null>(
    ticket?.proposedAction ? ticket.proposedAction.type : null
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ticket) {
      setMessages(ticket.messages || []);
      setProposedStatus(ticket.proposedAction ? ticket.proposedAction.type : null);
      setTicketStatus((ticket.status as "open" | "pending" | "resolved") || "open");
    }
  }, [ticket?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const showNotification = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => {
      setActionToast((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const CANNED_MACROS = [
    {
      label: "Razorpay Refund",
      tag: "#refund",
      text: `Hi ${ticket.studentName}, I have cross-checked transaction order_Qz89106 with Razorpay settlement logs. The duplicate debit of ₹39,999 has been initiated for automatic reversal. Funds will reflect in your original UPI payment method within 5-7 banking business days (RRN reference will be sent via SMS).`,
    },
    {
      label: "Batch Shift SOP",
      tag: "#batch",
      text: `Hi ${ticket.studentName}, your request for cohort migration has been forwarded to Academic Operations under Section 4.2. Your milestone submissions, replays, and grades will be preserved upon confirmation.`,
    },
    {
      label: "Medical Validity",
      tag: "#validity",
      text: `Hi ${ticket.studentName}, understanding your medical circumstances, we've initiated a 30-day course validity extension so you can catch up on live replays at your own pace.`,
    },
    {
      label: "CDN Edge Cache",
      tag: "#cdn",
      text: "We have regenerated your secure LMS streaming tokens and flushed edge CDN caches. Please clear browser cookies and reload the lecture player.",
    },
  ];

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: "Meera Sen (Support Lead)",
      role: "agent" as const,
      message: replyText.trim(),
      timestamp: "Just now",
    };
    setMessages((prev) => [...prev, newMsg]);
    setReplyText("");
    showNotification("Reply dispatched to student via portal & email.");
  };

  const handleAiCopilotGenerate = (type: "refund" | "batch" | "empathy") => {
    setIsCopilotThinking(true);
    setTimeout(() => {
      setIsCopilotThinking(false);
      let draft = "";
      if (type === "refund") {
        draft = `Dear ${ticket.studentName},\n\nThank you for reaching out regarding the duplicate payment during your enrollment in ${ticket.studentBatch}.\n\nI have investigated transaction order_Qz89106 on our Razorpay merchant console. We have successfully logged the reversal for ₹39,999. The funds will be credited directly to your UPI bank account within 5-7 business days.\n\nYour enrollment in ${ticket.studentBatch} remains active and confirmed!`;
      } else if (type === "batch") {
        draft = `Hi ${ticket.studentName}, I have reviewed your request for cohort migration. Since you meet our minimum milestone completion policy, your progress will be preserved when your transfer is sanctioned.`;
      } else {
        draft = `Hi ${ticket.studentName}, we completely understand how stressful duplicate payment debits can be! Please rest assured that your funds are safe, and our finance desk has placed this ticket on immediate priority for processing.`;
      }
      setReplyText(draft);
      showNotification("AI Copilot draft generated with student context.");
    }, 600);
  };

  const handleResolveTicket = () => {
    setTicketStatus("resolved");
    mockDataService.updateTicketStatus(ticket.id, "resolved");
    showNotification(`Ticket ${ticket.ticketNumber} marked as Resolved.`);
  };

  const handleProposeBatchMove = () => {
    setProposedStatus("batch_move");
    setIsBatchMoveModalOpen(false);
    mockDataService.updateTicketStatus(ticket.id, "pending");
    showNotification(`Cohort transfer proposal logged for ${ticket.studentName}.`);
  };

  const handleProposeExtension = () => {
    setProposedStatus("validity_extension");
    setIsExtensionModalOpen(false);
    mockDataService.updateTicketStatus(ticket.id, "pending");
    showNotification(`30-day validity extension proposal logged for ${ticket.studentName}.`);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 support-page-font pb-0 h-full">
      {/* Toast Notification */}
      {actionToast && (
        <div className="fixed top-5 right-5 z-50 animate-fadeIn">
          <div className="bg-[#111111] text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-[#905FEB]/40">
            <CheckCircle2 className="h-4 w-4 text-[#AEEB00] shrink-0" />
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

      {/* TOP CONTROL BAR matching canonical panel */}
      <div className="panel py-2 px-3 sm:px-4 bg-white border border-zinc-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
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

          <span className="font-mono text-xs font-extrabold text-[#7042D2] bg-[#F0EDFF] px-2.5 py-0.5 rounded-full shadow-xs border border-[#905FEB]/30">
            {ticket.ticketNumber}
          </span>

          {ticketStatus === "resolved" ? (
            <span className="badge-status-completed text-[10px] font-bold px-2 py-0.5">
              Completed
            </span>
          ) : ticketStatus === "pending" ? (
            <span className="badge-status-assigned text-[10px] font-bold px-2 py-0.5">
              Assigned (Under Review)
            </span>
          ) : (
            <span className="badge-status-in-progress text-[10px] font-bold px-2 py-0.5">
              In Progress
            </span>
          )}

          {ticket.priority === "high" && (
            <span className="badge-status-assigned text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
              <Flame className="h-2.5 w-2.5 text-amber-600 animate-pulse" />
              <span>&lt; 1h 45m SLA Target</span>
            </span>
          )}

          {proposedStatus && (
            <span className="badge-status-assigned text-[10px] gap-1 font-bold px-2 py-0.5 shadow-2xs">
              <Clock className="h-2.5 w-2.5 text-[#B45309]" />
              <span>
                Proposal: {proposedStatus === "batch_move" ? "Cohort Transfer" : "Validity Extension"}
              </span>
            </span>
          )}
        </div>

        {/* Global Ticket Actions matching Figma UI Kit */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsStudent360Open(true)}
            className="btn-support-secondary text-xs font-bold h-7.5 px-3 cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs"
            title="Inspect Student 360° Profile"
          >
            <User className="h-3.5 w-3.5 text-[#7042D2]" />
            <span>Student 360°</span>
          </button>

          <button
            type="button"
            onClick={handleResolveTicket}
            disabled={ticketStatus === "resolved"}
            className="btn-support-primary text-xs font-bold h-7.5 px-3.5 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{ticketStatus === "resolved" ? "Ticket Resolved" : "Resolve Ticket"}</span>
          </button>
        </div>
      </div>

      {/* MAIN 2-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0">
        {/* ========================================================
            COLUMN 1: Conversation Thread & AI Composer (8 cols)
           ======================================================== */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0 gap-2 overflow-hidden">
          {/* Compact Ticket Overview Capsule */}
          <div className="panel p-3 bg-white border border-zinc-150 space-y-1.5 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-extrabold text-[#111111] leading-tight truncate">
                    {ticket.subject}
                  </h2>
                  <span className="badge-status-in-progress text-[10px] font-bold px-2 py-0.5">
                    {ticket.category}
                  </span>
                  <span
                    className={
                      ticket.priority === "high"
                        ? "badge-status-assigned text-[10px] font-bold px-2 py-0.5"
                        : "badge-status-not-started text-[10px] font-bold px-2 py-0.5"
                    }
                  >
                    {ticket.priority.toUpperCase()} Priority
                  </span>
                  <span className="badge-status-completed text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                    <CreditCard className="h-3 w-3 text-[#3B6600]" />
                    <span>Razorpay Verified</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                  <span className="font-semibold text-[#111111]">{ticket.studentName}</span>
                  <span>•</span>
                  <span className="font-mono text-zinc-400 text-[11px]">{ticket.studentEmail}</span>
                  <span>•</span>
                  <span className="text-[#7042D2] font-semibold text-[11px]">{ticket.studentBatch}</span>
                </div>
              </div>

              {/* Inline Transaction Reference Badge */}
              <div className="flex items-center gap-2 shrink-0 bg-[#FAF9FF] border border-[#E5DEFF] px-2.5 py-1 rounded-xl shadow-2xs">
                <Receipt className="h-3.5 w-3.5 text-[#7042D2] shrink-0" />
                <span className="text-[11px] font-mono text-zinc-600">
                  <strong className="text-[#7042D2]">order_Qz89106</strong> (₹39,999)
                </span>
                <button
                  type="button"
                  onClick={() => handleAiCopilotGenerate("refund")}
                  className="btn-support-secondary text-[10px] h-6 px-2 font-bold cursor-pointer shrink-0"
                >
                  <Sparkles className="h-2.5 w-2.5 text-[#905FEB]" />
                  <span>Refund SOP</span>
                </button>
              </div>
            </div>
          </div>

          {/* Conversation History Stream & AI Composer */}
          <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-3.5 rounded-2xl bg-white border border-[#E5DEFF] shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between shrink-0 mb-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  Communication Thread ({messages.length})
                </h3>
                <span className="badge-status-completed text-[9px] font-bold px-1.5 py-0">
                  Live
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 text-[10px] font-bold shadow-2xs"
                  title="Communication thread is scrollable"
                >
                  <ChevronsUpDown className="h-3 w-3 text-[#905FEB] animate-pulse" />
                  <span>Scroll Thread</span>
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
                        ? "bg-[#905FEB] text-white border-[#7D46E7] ml-4 sm:ml-8 shadow-sm shadow-[#905FEB]/20"
                        : "bg-[#FAF9FF] text-[#111111] border-[#E5DEFF] mr-4 sm:mr-8 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-7 w-7 rounded-xl flex items-center justify-center text-[10px] font-extrabold shrink-0 shadow-xs ${
                            isAgent
                              ? "bg-white text-[#905FEB]"
                              : "bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30"
                          }`}
                        >
                          {isAgent ? "MS" : "DP"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`text-xs font-extrabold leading-none ${isAgent ? "text-white" : "text-[#111111]"}`}>
                              {msg.sender}
                            </p>
                            {isAgent && (
                              <span className="bg-white/20 text-white border border-white/30 text-[8px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-xs leading-none">
                                Mentor
                              </span>
                            )}
                          </div>
                          <p className={`text-[9px] font-mono mt-0.5 ${isAgent ? "text-white/80" : "text-zinc-400"}`}>
                            {msg.timestamp}
                          </p>
                        </div>
                      </div>

                      {isAgent && (
                        <div className="flex items-center gap-1 text-[10px] text-white/90 font-mono">
                          <span>Delivered</span>
                          <CheckCheck className="h-3.5 w-3.5 text-[#AEEB00]" />
                        </div>
                      )}
                    </div>

                    <p className={`text-xs leading-relaxed whitespace-pre-wrap pl-0.5 font-medium ${isAgent ? "text-white" : "text-[#111111]"}`}>
                      {msg.message}
                    </p>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Copilot & Macro Acceleration Bar */}
            <div className="shrink-0 pt-2 border-t border-[#F0EDFF] space-y-1.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 support-card-scroll">
                <span className="font-extrabold text-[#111111] text-[10px] flex items-center gap-1 shrink-0">
                  <Sparkles className="h-3 w-3 text-[#905FEB]" />
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
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#E5DEFF] bg-white hover:bg-[#F0EDFF] hover:border-[#905FEB] text-[#111111] shrink-0 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span className="font-mono text-[#7042D2]">{macro.tag}</span>
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
                  placeholder="Draft your reply to the student... (Markdown supported)"
                  className="w-full text-xs p-2 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] text-[#111111] resize-none focus:outline-none focus:border-[#905FEB] focus:ring-1 focus:ring-[#905FEB]/20 font-sans leading-relaxed h-13 sm:h-15"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="action-icon-lavender h-6.5 w-6.5"
                      title="Attach Billing Proof / File"
                      onClick={() => showNotification("Attachment dialog ready.")}
                    >
                      <Paperclip className="h-3 w-3" />
                    </button>
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
                    disabled={!replyText.trim()}
                    className="btn-support-primary text-xs h-7.5 px-3.5 font-bold disabled:opacity-50 cursor-pointer shadow-xs hover:shadow-sm"
                  >
                    <span>Send Reply</span>
                    <Send className="h-3 w-3 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            COLUMN 2: Student Telemetry, Mentor Actions & Governance (4 cols)
           ======================================================== */}
        <div className="lg:col-span-4 flex flex-col h-full min-h-0 gap-2 overflow-y-auto support-queue-scrollbar pr-0.5">
          {/* Learner 360° Profile Telemetry Card */}
          <div className="p-3 rounded-2xl bg-white border border-[#E5DEFF] shadow-2xs space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                Learner 360° Profile
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 text-[10px] font-bold shadow-2xs"
                  title="Telemetry details are scrollable"
                >
                  <ChevronsUpDown className="h-3 w-3 text-[#905FEB] animate-pulse" />
                  <span>Scroll Details</span>
                </span>
                <span className="badge-status-completed text-[9px] font-bold px-1.5 py-0">
                  Active Enrolled
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                DP
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-[#111111] text-xs truncate">
                  {ticket.studentName}
                </h4>
                <p className="text-[10px] text-zinc-500 font-mono truncate">
                  {ticket.studentEmail}
                </p>
                <p className="text-[9px] text-[#7042D2] font-semibold truncate mt-0.5">
                  {ticket.studentBatch}
                </p>
              </div>
            </div>

            {/* Dual Telemetry Progress Bars (Figma 76% & 48%) */}
            <div className="space-y-1.5 pt-1.5 border-t border-[#F0EDFF]">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9px]">
                  <span className="text-zinc-500 font-medium">Curriculum Completion</span>
                  <span className="font-bold text-[#111111] font-mono">76%</span>
                </div>
                <div className="progress-bar-track h-1.5">
                  <div className="progress-bar-fill-purple" style={{ width: "76%" }} />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[9px]">
                  <span className="text-zinc-500 font-medium">Live Attendance</span>
                  <span className="font-bold font-mono text-[#3B6600]">48%</span>
                </div>
                <div className="progress-bar-track h-1.5">
                  <div className="progress-bar-fill-lime" style={{ width: "48%" }} />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsStudent360Open(true)}
              className="btn-support-outlined w-full text-[11px] h-7 font-bold cursor-pointer justify-center gap-1.5"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Inspect Full Student 360°</span>
            </button>
          </div>

          {/* Mentor Governance Actions Card */}
          <div className="p-3 rounded-2xl bg-white border border-[#E5DEFF] shadow-2xs space-y-2 flex-1 min-h-0 flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center font-bold shadow-2xs shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#905FEB]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#111111] text-xs leading-tight">
                    Mentor Governance Actions
                  </h4>
                  <p className="text-[9px] text-zinc-500 font-medium">
                    Dual-key Admin approval required
                  </p>
                </div>
              </div>
              <span className="badge-status-completed text-[8px] font-bold px-1.5 py-0 shrink-0">
                Protected
              </span>
            </div>

            {/* Rich Interactive Action Tiles */}
            <div className="space-y-1.5">
              {/* Tile 1: Verify Gateway Refund */}
              <button
                type="button"
                onClick={() => handleAiCopilotGenerate("refund")}
                className="w-full p-2 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] hover:bg-[#EAFCC7]/30 hover:border-[#AEEB00] transition-all flex items-center justify-between gap-2 text-left group cursor-pointer shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6.5 w-6.5 rounded-lg bg-[#EAFCC7] text-[#3B6600] border border-[#AEEB00]/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#111111] truncate group-hover:text-[#3B6600] transition-colors leading-tight">
                      Verify Gateway Refund
                    </p>
                    <p className="text-[9px] text-zinc-500 font-medium truncate">
                      Razorpay UPI reversal ₹39,999
                    </p>
                  </div>
                </div>

                <span className="btn-support-secondary text-[9px] h-5.5 px-2 font-bold shrink-0 pointer-events-none group-hover:bg-[#EAFCC7] group-hover:text-[#3B6600] transition-all">
                  Verify →
                </span>
              </button>

              {/* Tile 2: Propose Cohort Batch Shift */}
              <button
                type="button"
                onClick={() => setIsBatchMoveModalOpen(true)}
                className="w-full p-2 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] hover:bg-[#F0EDFF] hover:border-[#905FEB] transition-all flex items-center justify-between gap-2 text-left group cursor-pointer shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6.5 w-6.5 rounded-lg bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#111111] truncate group-hover:text-[#7042D2] transition-colors leading-tight">
                      Propose Cohort Transfer
                    </p>
                    <p className="text-[9px] text-zinc-500 font-medium truncate">
                      Migrate to weekend/evening
                    </p>
                  </div>
                </div>

                <span className="btn-support-secondary text-[9px] h-5.5 px-2 font-bold shrink-0 pointer-events-none group-hover:bg-[#905FEB] group-hover:text-white transition-all">
                  Transfer →
                </span>
              </button>

              {/* Tile 3: Propose Validity Extension */}
              <button
                type="button"
                onClick={() => setIsExtensionModalOpen(true)}
                className="w-full p-2 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] hover:bg-[#F0EDFF] hover:border-[#905FEB] transition-all flex items-center justify-between gap-2 text-left group cursor-pointer shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6.5 w-6.5 rounded-lg bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#111111] truncate group-hover:text-[#7042D2] transition-colors leading-tight">
                      Propose Validity Extension
                    </p>
                    <p className="text-[9px] text-zinc-500 font-medium truncate">
                      Grant 15, 30, or 60-day buffer
                    </p>
                  </div>
                </div>

                <span className="btn-support-secondary text-[9px] h-5.5 px-2 font-bold shrink-0 pointer-events-none group-hover:bg-[#905FEB] group-hover:text-white transition-all">
                  Extend →
                </span>
              </button>

              {/* Tile 4: Escalate to Lead Instructor */}
              <button
                type="button"
                onClick={() => showNotification("Escalation logged: Lead Instructor Prof. Rajesh Verma notified.")}
                className="w-full p-2 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] hover:bg-[#FFF3E0] hover:border-[#F59E0B]/60 transition-all flex items-center justify-between gap-2 text-left group cursor-pointer shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6.5 w-6.5 rounded-lg bg-[#FFF3E0] text-[#B45309] border border-[#F59E0B]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#111111] truncate group-hover:text-[#B45309] transition-colors leading-tight">
                      Escalate to Instructor
                    </p>
                    <p className="text-[9px] text-zinc-500 font-medium truncate">
                      Route to Prof. Rajesh Verma
                    </p>
                  </div>
                </div>

                <span className="badge-status-assigned text-[9px] font-bold px-1.5 py-0.5 shrink-0 group-hover:bg-[#F59E0B] group-hover:text-white transition-all">
                  Escalate →
                </span>
              </button>
            </div>

            {/* Quick 1-Click Primary Action */}
            <button
              type="button"
              onClick={() => handleAiCopilotGenerate("refund")}
              className="btn-support-primary w-full text-xs h-7.5 font-bold cursor-pointer justify-center gap-1.5 shadow-xs hover:shadow-md shrink-0 mt-1"
            >
              <Sparkles className="h-3 w-3" />
              <span>Auto-Apply Action</span>
              <MoveRight className="h-3 w-3" />
            </button>
          </div>

          {/* Ticket SLA & Assignment Telemetry */}
          <div className="panel p-3 bg-white border border-zinc-150 space-y-1.5 text-xs shrink-0">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 block">
              SLA Audit &amp; Ownership
            </span>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-500">First Reply SLA</span>
                <span className="badge-status-completed text-[9px] font-bold px-1.5 py-0">
                  Met (12m response)
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-500">Target Resolution</span>
                <span className="font-mono font-bold text-[#111111]">Today by 11:45 AM</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-500">Assigned Agent</span>
                <span className="font-bold text-[#7042D2]">{ticket.assignedAgent || "Meera Sen"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Propose Batch Move Modal */}
      <Dialog open={isBatchMoveModalOpen} onOpenChange={setIsBatchMoveModalOpen}>
        <DialogContent className="w-[94vw] sm:max-w-md p-0 rounded-[28px] bg-white border border-[#E5DEFF] shadow-2xl overflow-hidden support-page-font">
          <DialogHeader className="p-5 border-b border-[#F0EDFF] bg-gradient-to-b from-[#FAF9FF] to-white text-left">
            <DialogTitle className="text-base font-extrabold text-[#111111] flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-[#905FEB]" />
              <span>Propose Cohort Batch Transfer</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4 text-xs">
            <p className="text-zinc-500 leading-relaxed">
              Select destination cohort for <strong className="text-[#111111]">{ticket.studentName}</strong>.
              Historical milestone submissions and grades transfer seamlessly.
            </p>

            <div className="space-y-1">
              <label className="font-bold text-[#111111] block">Current Cohort</label>
              <div className="p-2.5 rounded-xl bg-[#FAF9FF] border border-[#E5DEFF] font-semibold text-zinc-700">
                {ticket.studentBatch}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#111111] block">Target Destination Cohort</label>
              <select className="w-full text-xs rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] p-2.5 focus:border-[#905FEB] focus:outline-none">
                <option>Full-Stack AI &amp; LLM Systems - Cohort 7 (Live + Replay)</option>
                <option>Autonomous Multi-Agent Bootcamp (Weekend Intensive)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-[#F0EDFF] bg-[#FAF9FF] flex items-center justify-end gap-2">
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
        <DialogContent className="w-[94vw] sm:max-w-md p-0 rounded-[28px] bg-white border border-[#E5DEFF] shadow-2xl overflow-hidden support-page-font">
          <DialogHeader className="p-5 border-b border-[#F0EDFF] bg-gradient-to-b from-[#FAF9FF] to-white text-left">
            <DialogTitle className="text-base font-extrabold text-[#111111] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#905FEB]" />
              <span>Propose Access Validity Extension</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4 text-xs">
            <p className="text-zinc-500 leading-relaxed">
              Specify duration extension to grant <strong className="text-[#111111]">{ticket.studentName}</strong> for
              course completion buffer.
            </p>

            <div className="space-y-1">
              <label className="font-bold text-[#111111] block">Extension Duration</label>
              <select className="w-full text-xs rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] p-2.5 focus:border-[#905FEB] focus:outline-none">
                <option value="15">15 Days Extension</option>
                <option value="30">30 Days Extension (Standard Medical/Work)</option>
                <option value="60">60 Days Extension</option>
              </select>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-[#F0EDFF] bg-[#FAF9FF] flex items-center justify-end gap-2">
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
