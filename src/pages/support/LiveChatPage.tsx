import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Bot,
  User,
  Paperclip,
  Smile,
  PhoneCall,
  Video,
  CheckCheck,
  Clock,
  ArrowRightLeft,
  CheckCircle2,
  Flame,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Award,
  X,
  UserCheck,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  ChevronsUpDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Student360Drawer } from "@/components/shared/Student360Drawer";
import "./supportTheme.css";

interface ChatMessage {
  id: string;
  sender: "student" | "agent" | "bot" | "system";
  text: string;
  time: string;
  isAiSuggested?: boolean;
}

interface ChatSession {
  id: string;
  studentId: string;
  studentName: string;
  avatar: string;
  email: string;
  courseTitle: string;
  batchName: string;
  progressPercent: number;
  attendancePercent: number;
  status: "active" | "queued" | "resolved";
  priority: "urgent" | "normal";
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  slaMinutesLeft: number;
  messages: ChatMessage[];
}

const INITIAL_CHATS: ChatSession[] = [
  {
    id: "chat-1",
    studentId: "usr-student-1",
    studentName: "Arjun Mehta",
    avatar: "AM",
    email: "arjun.m@learner.ai",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    batchName: "Cohort 7 (Live + Replay)",
    progressPercent: 78,
    attendancePercent: 92,
    status: "active",
    priority: "urgent",
    slaMinutesLeft: 3,
    lastMessage: "Can someone confirm if my batch change request to Weekend Bootcamp was approved?",
    lastMessageTime: "2m ago",
    unreadCount: 0,
    isOnline: true,
    messages: [
      {
        id: "m-1",
        sender: "system",
        text: "Arjun Mehta joined the live support channel. Connected to Support Desk Agent.",
        time: "10:18 AM",
      },
      {
        id: "m-2",
        sender: "student",
        text: "Hi support team! I submitted ticket #TKT-1082 this morning regarding moving from Weekday Evening to Weekend Cohort.",
        time: "10:19 AM",
      },
      {
        id: "m-3",
        sender: "agent",
        text: "Hello Arjun! I see your request in the queue. You're at 78% progress with 92% attendance, so you easily qualify for the cohort shift policy.",
        time: "10:20 AM",
      },
      {
        id: "m-4",
        sender: "student",
        text: "Can someone confirm if my batch change request to Weekend Bootcamp was approved by the academic admin?",
        time: "10:22 AM",
      },
    ],
  },
  {
    id: "chat-2",
    studentId: "usr-student-5",
    studentName: "Simran Kaur",
    avatar: "SK",
    email: "simran.k@example.com",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    batchName: "Cohort 8 (Replay Only)",
    progressPercent: 44,
    attendancePercent: 60,
    status: "active",
    priority: "urgent",
    slaMinutesLeft: 6,
    lastMessage: "I need to share my medical certificate for the 30-day course validity extension.",
    lastMessageTime: "8m ago",
    unreadCount: 2,
    isOnline: true,
    messages: [
      {
        id: "m-201",
        sender: "student",
        text: "Hello, I was hospitalized last week with severe dengue and missed two modules.",
        time: "10:10 AM",
      },
      {
        id: "m-202",
        sender: "student",
        text: "I need to share my medical certificate for the 30-day course validity extension.",
        time: "10:14 AM",
      },
    ],
  },
  {
    id: "chat-3",
    studentId: "usr-student-2",
    studentName: "Pooja Hegde",
    avatar: "PH",
    email: "pooja.h@example.com",
    courseTitle: "Autonomous Multi-Agent Architectures",
    batchName: "Agentic Systems Bootcamp",
    progressPercent: 85,
    attendancePercent: 88,
    status: "queued",
    priority: "normal",
    slaMinutesLeft: 14,
    lastMessage: "Quick query about GPU server credits for the autonomous swarm project.",
    lastMessageTime: "15m ago",
    unreadCount: 0,
    isOnline: false,
    messages: [
      {
        id: "m-301",
        sender: "student",
        text: "Quick query about GPU server credits for the autonomous swarm project.",
        time: "10:05 AM",
      },
    ],
  },
  {
    id: "chat-4",
    studentId: "usr-student-3",
    studentName: "Rohan Nair",
    avatar: "RN",
    email: "rohan.n@tech.io",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    batchName: "Cohort 7 (Live + Replay)",
    progressPercent: 62,
    attendancePercent: 75,
    status: "resolved",
    priority: "normal",
    slaMinutesLeft: 0,
    lastMessage: "Thanks a lot for the replay link! That worked perfectly.",
    lastMessageTime: "1h ago",
    unreadCount: 0,
    isOnline: false,
    messages: [
      {
        id: "m-401",
        sender: "student",
        text: "Lecture 6 replay player showed a buffering error.",
        time: "09:15 AM",
      },
      {
        id: "m-402",
        sender: "agent",
        text: "I've flushed the CDN edge cache for your stream token. Please try refreshing now.",
        time: "09:20 AM",
      },
      {
        id: "m-403",
        sender: "student",
        text: "Thanks a lot for the replay link! That worked perfectly.",
        time: "09:22 AM",
      },
    ],
  },
];

const CANNED_MACROS = [
  {
    label: "Batch Shift SOP",
    tag: "#batch",
    text: "Your batch shift request has been verified against our attendance policy and routed to Academic Admin for final roster sync. You will receive an email confirmation within 2 hours.",
  },
  {
    label: "Validity Extension Policy",
    tag: "#validity",
    text: "We have received your document. The 30-day medical validity extension proposal has been flagged for prioritized approval so you can continue seamless access.",
  },
  {
    label: "CDN & Stream Flush",
    tag: "#cdn",
    text: "We have regenerated your secure LMS streaming tokens and flushed edge CDN caches. Please clear browser cookies and reload the lecture player.",
  },
  {
    label: "GPU Compute Credits",
    tag: "#gpu",
    text: "Your modal/cloud sandbox workspace quota has been augmented with 50 bonus GPU compute minutes for this milestone.",
  },
];

export const LiveChatPage: React.FC = () => {
  const [chats, setChats] = useState<ChatSession[]>(INITIAL_CHATS);
  const [selectedChatId, setSelectedChatId] = useState<string>("chat-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "queued" | "resolved">("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);
  const [isStudentTyping, setIsStudentTyping] = useState(false);
  const [is360DrawerOpen, setIs360DrawerOpen] = useState(false);
  const [agentStatus, setAgentStatus] = useState<"online" | "busy" | "away">("online");
  const [workflowToast, setWorkflowToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedChat = chats.find((c) => c.id === selectedChatId) || chats[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages, isStudentTyping]);

  // When a chat is clicked or viewed, its unread notification badge is cleared immediately
  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
    );
  };

  // Automatically clear unread notification badge for the active seen chat
  useEffect(() => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === selectedChatId && c.unreadCount > 0
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
  }, [selectedChatId]);

  const activeCount = chats.filter((c) => c.status === "active").length;
  const queuedCount = chats.filter((c) => c.status === "queued").length;
  const resolvedCount = chats.filter((c) => c.status === "resolved").length;
  const urgentCount = chats.filter((c) => c.priority === "urgent" && c.status !== "resolved").length;

  const filteredChats = chats.filter((c) => {
    const matchesSearch =
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusTab !== "all" && c.status !== statusTab) return false;
    if (urgentOnly && c.priority !== "urgent") return false;
    return true;
  });

  const showNotification = (msg: string) => {
    setWorkflowToast(msg);
    setTimeout(() => setWorkflowToast(null), 3500);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: "agent",
      text: inputText.trim(),
      time: "Just now",
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === selectedChatId) {
          return {
            ...chat,
            lastMessage: newMsg.text,
            lastMessageTime: "Just now",
            messages: [...chat.messages, newMsg],
          };
        }
        return chat;
      })
    );
    setInputText("");

    // Simulate student typing indicator then response
    setTimeout(() => {
      setIsStudentTyping(true);
    }, 1200);

    setTimeout(() => {
      setIsStudentTyping(false);
      const studentReply: ChatMessage = {
        id: `m-${Date.now() + 1}`,
        sender: "student",
        text: "Thank you so much! That really clarifies everything. Appreciate the fast help!",
        time: "Just now",
      };
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === selectedChatId) {
            return {
              ...chat,
              messages: [...chat.messages, studentReply],
              lastMessage: studentReply.text,
              lastMessageTime: "Just now",
            };
          }
          return chat;
        })
      );
    }, 3200);
  };

  const handleApplyMacro = (text: string) => {
    setInputText(text);
    textareaRef.current?.focus();
  };

  const handleAiCopilotGenerate = (type: "general" | "batch" | "validity" | "empathy") => {
    setIsCopilotThinking(true);
    setTimeout(() => {
      setIsCopilotThinking(false);
      let draft = "";
      if (type === "batch") {
        draft = `Hi ${selectedChat.studentName.split(" ")[0]}, I checked ticket #TKT-1082 and can confirm your request to move to the Weekend Intensive Cohort has been approved by the academic committee. Your dashboard timetable and live class invitations will reflect the weekend slot starting this Saturday.`;
      } else if (type === "validity") {
        draft = `Hi ${selectedChat.studentName.split(" ")[0]}, I have received your medical documentation. We have approved a 30-day extension to your course validity so you can recover without any study pressure. Your new expiry is marked in your portal.`;
      } else if (type === "empathy") {
        draft = `Hi ${selectedChat.studentName.split(" ")[0]}, I completely understand how frustrating this must be. Rest assured, I am personally taking ownership of this and expediting resolution with the senior engineering mentors right now.`;
      } else {
        draft = `Hi ${selectedChat.studentName.split(" ")[0]}, I've reviewed your active request for ${selectedChat.courseTitle}. Everything looks in order, and I've processed the approval on your LMS record.`;
      }
      setInputText(draft);
      textareaRef.current?.focus();
    }, 600);
  };

  const handleResolveChat = () => {
    setChats((prev) =>
      prev.map((c) => (c.id === selectedChatId ? { ...c, status: "resolved", unreadCount: 0 } : c))
    );
    showNotification(`Chat session with ${selectedChat.studentName} marked as resolved.`);
  };

  const handleQuickBatchApproval = () => {
    const sysMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      sender: "system",
      text: `Academic Admin verified: ${selectedChat.studentName} moved from ${selectedChat.batchName} to Weekend Intensive Batch.`,
      time: "Just now",
    };
    setChats((prev) =>
      prev.map((c) =>
        c.id === selectedChatId
          ? {
            ...c,
            batchName: "Weekend Intensive Bootcamp (Approved)",
            messages: [...c.messages, sysMsg],
          }
          : c
      )
    );
    showNotification(`Batch shift approved for ${selectedChat.studentName}. Timetable synced.`);
  };

  const handleQuickValidityExtension = () => {
    const sysMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      sender: "system",
      text: `Medical exception logged: 30-day validity extension granted to ${selectedChat.studentName}.`,
      time: "Just now",
    };
    setChats((prev) =>
      prev.map((c) =>
        c.id === selectedChatId
          ? {
            ...c,
            messages: [...c.messages, sysMsg],
          }
          : c
      )
    );
    showNotification(`30-day course validity extension granted to ${selectedChat.studentName}.`);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 support-page-font h-full">
      {/* Toast Notification Alert */}
      {workflowToast && (
        <div className="fixed top-5 right-5 z-50 animate-fadeIn">
          <div className="bg-[#111111] text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-[#905FEB]/40">
            <CheckCircle2 className="h-4 w-4 text-[#AEEB00] shrink-0" />
            <span>{workflowToast}</span>
            <button
              onClick={() => setWorkflowToast(null)}
              className="ml-2 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Control Header matching canonical design */}
      <div className="panel shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-zinc-150">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-2xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center font-bold shadow-2xs shrink-0">
            <MessageSquare className="h-4.5 w-4.5 text-[#905FEB]" />
          </div>
          <div className="min-w-0 flex items-center gap-2.5">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-[#111111] truncate">
              Live Chat Operations Desk
            </h1>
            <span className="hidden sm:inline text-zinc-300">•</span>
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="badge-status-completed text-[10px] font-bold px-2 py-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3B6600] animate-pulse" />
                Live Desk
              </span>
              <span className="text-zinc-500 font-semibold">{activeCount} Active</span>
              <span className="text-zinc-300">•</span>
              <span className="text-[#7042D2] font-bold">{urgentCount} Urgent SLA</span>
              <span className="text-zinc-300">•</span>
              <span className="text-zinc-400 font-mono text-[11px]">Avg First Reply: 42s</span>
            </div>
          </div>
        </div>

        {/* Global Desk Actions matching Figma UI Kit */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-full border border-[#E5DEFF] p-0.5 bg-[#FAF9FF] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAgentStatus("online")}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${agentStatus === "online"
                  ? "bg-[#EAFCC7] text-[#3B6600] shadow-xs"
                  : "text-zinc-500 hover:text-[#111111]"
                }`}
            >
              Online
            </button>
            <button
              type="button"
              onClick={() => setAgentStatus("busy")}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${agentStatus === "busy"
                  ? "bg-[#FFF3E0] text-[#B45309] shadow-xs"
                  : "text-zinc-500 hover:text-[#111111]"
                }`}
            >
              In Chat
            </button>
            <button
              type="button"
              onClick={() => setAgentStatus("away")}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${agentStatus === "away"
                  ? "bg-[#F3F4F6] text-[#4B5563] shadow-xs"
                  : "text-zinc-500 hover:text-[#111111]"
                }`}
            >
              Away
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIs360DrawerOpen(true)}
            className="btn-support-secondary text-xs h-8 px-3.5 font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs hover:shadow-xs"
            title="Inspect Student 360° Profile"
          >
            <User className="h-3.5 w-3.5 text-[#7042D2]" />
            <span>Student 360°</span>
          </button>

          <button
            type="button"
            onClick={handleResolveChat}
            disabled={selectedChat?.status === "resolved"}
            className="btn-support-primary text-xs h-8 px-3.5 font-bold cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Resolve Session</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0">
        {/* =========================================
            COLUMN 1: Conversation Queue (4 cols)
           ========================================= */}
        <div className="lg:col-span-4 h-full panel flex flex-col min-h-0 overflow-hidden bg-white border border-zinc-150">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-[#F0EDFF] space-y-2 bg-[#FAF9FF] shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-[#905FEB]" />
              <input
                placeholder="Search conversations or students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 h-8.5 text-xs bg-white rounded-full border border-[#E5DEFF] text-[#111111] placeholder:text-zinc-400 focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs matching Figma Pills */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 p-0.5 rounded-full bg-white border border-[#E5DEFF] text-xs flex-1">
                {(["all", "active", "queued", "resolved"] as const).map((tab) => {
                  const count =
                    tab === "all"
                      ? chats.length
                      : tab === "active"
                        ? activeCount
                        : tab === "queued"
                          ? queuedCount
                          : resolvedCount;
                  const isTabActive = statusTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStatusTab(tab)}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-full capitalize transition-all flex items-center justify-center gap-1 cursor-pointer ${isTabActive
                          ? "bg-[#905FEB] text-white shadow-xs"
                          : "text-zinc-500 hover:text-[#7042D2]"
                        }`}
                    >
                      <span>{tab}</span>
                      <span className="text-[10px] opacity-80 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Urgent SLA Flame Toggle */}
              <button
                type="button"
                onClick={() => setUrgentOnly((prev) => !prev)}
                title="Filter by Urgent SLA"
                className={`h-8 px-2.5 rounded-full border transition-all text-xs flex items-center gap-1 shrink-0 cursor-pointer ${urgentOnly
                    ? "bg-[#FFF3E0] text-[#B45309] border-[#F59E0B]/50 font-bold shadow-xs"
                    : "bg-white border-[#E5DEFF] text-zinc-500 hover:border-[#905FEB]"
                  }`}
              >
                <Flame className={`h-3.5 w-3.5 ${urgentOnly ? "text-amber-600 animate-pulse" : "text-zinc-400"}`} />
              </button>
            </div>

            {/* Scroll Indicator Sub-bar */}
            <div className="flex items-center justify-between px-1 pt-0.5 text-[11px]">
              <span className="font-semibold text-zinc-500">Queue ({filteredChats.length})</span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 text-[10px] font-bold shadow-2xs"
                title="Live conversation queue is scrollable"
              >
                <ChevronsUpDown className="h-3 w-3 text-[#905FEB] animate-pulse" />
                <span>Scroll Queue</span>
              </span>
            </div>
          </div>

          {/* Conversation Cards List with Visible Custom Scrollbar */}
          <div className="p-1 flex-1 min-h-0 overflow-y-auto space-y-1 support-queue-scrollbar">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 space-y-1">
                <AlertCircle className="h-6 w-6 mx-auto text-zinc-300 mb-1" />
                <p className="font-bold text-[#111111]">No conversations found</p>
                <p className="text-[11px]">Adjust your search query or status filter.</p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.id === selectedChatId;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => handleSelectChat(chat.id)}
                    className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all relative cursor-pointer border ${isSelected
                        ? "bg-[#FAF9FF] border-[#905FEB] shadow-xs"
                        : "bg-white border-transparent hover:bg-[#FAF9FF]/60 hover:border-[#E5DEFF]"
                      }`}
                  >
                    {/* Student Avatar + Online indicator */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="h-9 w-9 rounded-2xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center font-bold text-xs shadow-2xs">
                        {chat.avatar}
                      </div>
                      {chat.isOnline ? (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#AEEB00] ring-2 ring-white" />
                      ) : (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-zinc-300 ring-2 ring-white" />
                      )}
                    </div>

                    {/* Chat Content Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-[#111111] truncate">
                          {chat.studentName}
                        </span>
                        <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                          {chat.lastMessageTime}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-500 truncate leading-snug">
                        {chat.lastMessage}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {chat.status === "active" ? (
                          <span className="badge-status-in-progress text-[9px] font-bold px-2 py-0.5">
                            Active
                          </span>
                        ) : chat.status === "queued" ? (
                          <span className="badge-status-assigned text-[9px] font-bold px-2 py-0.5">
                            Queued
                          </span>
                        ) : (
                          <span className="badge-status-completed text-[9px] font-bold px-2 py-0.5">
                            Resolved
                          </span>
                        )}

                        {chat.priority === "urgent" && (
                          <span className="badge-status-assigned text-[9px] font-bold px-2 py-0.5 flex items-center gap-1">
                            <Flame className="h-2.5 w-2.5 text-amber-600 animate-pulse" />
                            <span>&lt;{chat.slaMinutesLeft}m SLA</span>
                          </span>
                        )}

                        {chat.unreadCount > 0 && (
                          <span className="ml-auto h-4.5 min-w-[18px] px-1.5 rounded-full bg-[#905FEB] text-white text-[10px] font-bold flex items-center justify-center shadow-xs transition-all duration-200 scale-100">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================
            COLUMN 2: Chat Stream Console (5 cols)
           ========================================= */}
        <div className="lg:col-span-5 h-full panel flex flex-col min-h-0 overflow-hidden bg-white border border-zinc-150">
          {/* Active Conversation Header */}
          <div className="p-3 border-b border-[#F0EDFF] flex items-center justify-between bg-[#FAF9FF] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="h-9 w-9 rounded-2xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center font-bold text-xs shadow-2xs">
                  {selectedChat.avatar}
                </div>
                {selectedChat.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#AEEB00] ring-2 ring-white" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#111111] truncate">
                    {selectedChat.studentName}
                  </h3>
                  <span className="badge-status-completed text-[9px] font-bold px-1.5 py-0">
                    Verified
                  </span>
                  {selectedChat.priority === "urgent" && (
                    <span className="badge-status-assigned text-[9px] font-bold px-1.5 py-0 flex items-center gap-0.5">
                      <Flame className="h-2.5 w-2.5 text-amber-600" />
                      Urgent SLA
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#7042D2] font-semibold truncate max-w-[260px]">
                  {selectedChat.courseTitle}
                </p>
              </div>
            </div>

            {/* Quick Action Tools using Figma Action Icons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 text-[10px] font-bold shadow-2xs"
                title="Conversation messages are scrollable"
              >
                <ChevronsUpDown className="h-3 w-3 text-[#905FEB] animate-pulse" />
                <span>Scroll Chat</span>
              </span>
              <button
                type="button"
                className="action-icon-lavender"
                title="Initiate Voice Callback"
                onClick={() => showNotification(`Initiating voice link with ${selectedChat.studentName}...`)}
              >
                <PhoneCall className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="action-icon-lavender"
                title="Open Video & Screen Share"
                onClick={() => showNotification(`Screen share room created for ${selectedChat.studentName}.`)}
              >
                <Video className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="action-icon-lavender"
                title="Refresh Thread"
                onClick={() => showNotification("Thread refreshed.")}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 min-h-0 p-3.5 overflow-y-auto space-y-3 support-queue-scrollbar bg-[#FAF9FF]/40">
            {selectedChat.messages.map((msg) => {
              if (msg.sender === "system") {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className="text-[10px] text-[#7042D2] bg-[#F0EDFF] border border-[#905FEB]/30 px-3 py-1 rounded-full font-bold shadow-2xs flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#905FEB]" />
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isAgent = msg.sender === "agent";
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isAgent ? "justify-end" : "justify-start"}`}
                >
                  {!isAgent && (
                    <div className="h-7 w-7 rounded-xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {selectedChat.avatar}
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs space-y-1 ${isAgent
                        ? "bg-[#905FEB] text-white rounded-br-xs shadow-md"
                        : "bg-white text-[#111111] border border-[#E5DEFF] rounded-bl-xs shadow-xs"
                      }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap text-xs font-medium">{msg.text}</p>
                    <div
                      className={`flex items-center gap-1 text-[9px] ${isAgent ? "text-white/80 justify-end" : "text-zinc-400"
                        }`}
                    >
                      <span>{msg.time}</span>
                      {isAgent && <CheckCheck className="h-3 w-3 text-[#AEEB00]" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Live Typing Simulation */}
            {isStudentTyping && (
              <div className="flex items-end gap-2 justify-start animate-fadeIn">
                <div className="h-7 w-7 rounded-xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {selectedChat.avatar}
                </div>
                <div className="bg-white text-zinc-500 border border-[#E5DEFF] rounded-2xl rounded-bl-xs px-3.5 py-2 text-xs flex items-center gap-2 shadow-xs">
                  <span className="text-[11px] font-medium">{selectedChat.studentName.split(" ")[0]} is typing</span>
                  <span className="flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#905FEB] animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#905FEB] animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#905FEB] animate-bounce" />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* AI Copilot & Macro Acceleration Bar */}
          <div className="p-2.5 border-t border-[#F0EDFF] bg-[#FAF9FF] space-y-2 shrink-0">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#111111] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#905FEB]" />
                <span>AI Draft Proposals:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAiCopilotGenerate("batch")}
                  disabled={isCopilotThinking}
                  className="btn-support-secondary text-[10px] h-6 px-2.5 font-bold cursor-pointer"
                >
                  <Bot className="h-3 w-3" />
                  <span>Batch Shift SOP</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAiCopilotGenerate("validity")}
                  disabled={isCopilotThinking}
                  className="btn-support-secondary text-[10px] h-6 px-2.5 font-bold cursor-pointer"
                >
                  <Clock className="h-3 w-3" />
                  <span>Medical Policy</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAiCopilotGenerate("empathy")}
                  disabled={isCopilotThinking}
                  className="btn-support-secondary text-[10px] h-6 px-2.5 font-bold cursor-pointer"
                >
                  <Award className="h-3 w-3" />
                  <span>Empathetic</span>
                </button>
              </div>
            </div>

            {/* Quick Canned Macros Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 support-card-scroll">
              {CANNED_MACROS.map((macro, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyMacro(macro.text)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-[#E5DEFF] bg-white hover:bg-[#F0EDFF] hover:border-[#905FEB] text-[#111111] shrink-0 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span className="font-mono text-[#7042D2]">{macro.tag}</span>
                  <span>{macro.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Compact Composer */}
          <div className="p-2.5 border-t border-[#F0EDFF] bg-white space-y-2 shrink-0">
            <textarea
              ref={textareaRef}
              rows={2}
              placeholder="Type your response to student... (Enter to send, Shift+Enter for newline)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="w-full text-xs p-2.5 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] text-[#111111] resize-none focus:outline-none focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20 font-sans leading-relaxed"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="action-icon-lavender h-7 w-7"
                  title="Attach File"
                  onClick={() => showNotification("File upload attachment dialog ready.")}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="action-icon-lavender h-7 w-7"
                  title="Insert Quick Emoji"
                  onClick={() => setInputText((prev) => prev + " 👍 ")}
                >
                  <Smile className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline ml-1">
                  ↵ Enter to dispatch
                </span>
              </div>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="btn-support-primary text-xs h-8 px-4 font-bold disabled:opacity-50 cursor-pointer shadow-sm hover:shadow-md"
              >
                <span>Send Reply</span>
                <Send className="h-3 w-3 ml-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================
            COLUMN 3: Telemetry & Instant Actions (3 cols)
           ========================================= */}
        <div className="lg:col-span-3 h-full panel flex flex-col min-h-0 overflow-hidden bg-white border border-zinc-150">
          <div className="p-3 border-b border-[#F0EDFF] bg-[#FAF9FF] flex items-center justify-between shrink-0">
            <span className="text-xs font-extrabold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-[#905FEB]" />
              Learner 360° Telemetry
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 text-[10px] font-bold shadow-2xs"
                title="Telemetry details are scrollable"
              >
                <ChevronsUpDown className="h-3 w-3 text-[#905FEB] animate-pulse" />
                <span>Scroll Telemetry</span>
              </span>
              <span className="badge-status-completed text-[9px] font-bold px-2 py-0.5">
                Verified
              </span>
            </div>
          </div>

          <div className="p-3.5 space-y-3.5 text-xs flex-1 min-h-0 overflow-y-auto support-queue-scrollbar">
            {/* Student ID Card */}
            <div className="p-3.5 rounded-2xl border border-[#E5DEFF] bg-[#FAF9FF] text-center space-y-1.5 shadow-2xs">
              <div className="h-12 w-12 rounded-2xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 font-extrabold text-sm mx-auto flex items-center justify-center shadow-xs">
                {selectedChat.avatar}
              </div>
              <h4 className="font-extrabold text-[#111111] text-sm leading-tight">
                {selectedChat.studentName}
              </h4>
              <p className="text-[11px] text-zinc-500 font-mono truncate">
                {selectedChat.email}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="badge-status-in-progress text-[10px] font-mono font-bold px-2 py-0.5">
                  #{selectedChat.studentId.toUpperCase()}
                </span>
                <span
                  className={
                    selectedChat.isOnline
                      ? "badge-status-completed text-[10px] font-bold px-2 py-0.5"
                      : "badge-status-not-started text-[10px] font-bold px-2 py-0.5"
                  }
                >
                  {selectedChat.isOnline ? "Active Online" : "Offline"}
                </span>
              </div>
            </div>

            {/* Course & Progress Gauges using Figma Progress Bars */}
            <div className="space-y-2.5 p-3.5 rounded-2xl border border-[#E5DEFF] bg-white shadow-xs">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                Enrolled Curriculum
              </span>
              <p className="font-bold text-[#111111] text-xs leading-snug">
                {selectedChat.courseTitle}
              </p>
              <p className="text-[11px] text-[#7042D2] font-semibold">
                {selectedChat.batchName}
              </p>

              {/* Course Progress */}
              <div className="space-y-1 pt-1.5 border-t border-[#F0EDFF]">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-500">Course Completion</span>
                  <span className="font-bold text-[#111111] font-mono">
                    {selectedChat.progressPercent}%
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill-purple"
                    style={{ width: `${selectedChat.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Attendance Progress */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-500">Attendance Telemetry</span>
                  <span className="font-bold font-mono text-[#3B6600]">
                    {selectedChat.attendancePercent}%
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill-lime"
                    style={{ width: `${selectedChat.attendancePercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* One-Click Rapid Resolutions matching Figma Buttons */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                One-Click Mentor Actions
              </span>

              <button
                type="button"
                onClick={handleQuickBatchApproval}
                className="btn-support-secondary w-full text-xs justify-start gap-2 h-8.5 font-bold cursor-pointer"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-[#7042D2]" />
                <span>Approve Batch Shift</span>
              </button>

              <button
                type="button"
                onClick={handleQuickValidityExtension}
                className="btn-support-secondary w-full text-xs justify-start gap-2 h-8.5 font-bold cursor-pointer"
              >
                <Clock className="h-3.5 w-3.5 text-[#7042D2]" />
                <span>Grant 30-Day Extension</span>
              </button>

              <button
                type="button"
                onClick={() => setIs360DrawerOpen(true)}
                className="btn-support-outlined w-full text-xs justify-start gap-2 h-8.5 font-bold cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Inspect Full 360° Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Student360Drawer
        open={is360DrawerOpen}
        onOpenChange={setIs360DrawerOpen}
        studentId={selectedChat.studentId}
      />
    </div>
  );
};

export default LiveChatPage;
