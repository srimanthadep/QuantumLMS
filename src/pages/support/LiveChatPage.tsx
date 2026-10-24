import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Search,
  Send,
  MoreVertical,
  Paperclip,
  Mic,
  CheckCheck,
  Check,
  Play,
  Pause,
  Eye,
  Smile,
  X,
  UserCheck,
  Sparkles,
  Bot,
  Clock,
  Award,
  ChevronRight,
  ChevronsUpDown,
  ExternalLink,
  ArrowRightLeft,
  Flame,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  User,
  Heart,
} from "lucide-react";
import { Student360Drawer } from "@/components/shared/Student360Drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "./supportTheme.css";

// Reaction Interface
interface Reaction {
  emoji: string;
  count: number;
  userReacted?: boolean;
}

// Chat Message Interface
interface ChatMessage {
  id: string;
  sender: "student" | "agent" | "system";
  senderName?: string;
  senderAvatar?: string;
  senderPhoto?: string;
  text?: string;
  time: string;
  views?: number;
  reactions?: Reaction[];
  type?: "text" | "voice" | "image";
  voiceDuration?: string;
  imageUrl?: string;
  imageCaption?: string;
}

// Conversation Session Interface
interface ChatSession {
  id: string;
  studentId: string;
  studentName: string;
  avatarText?: string;
  avatarBg?: string;
  photoUrl?: string;
  email: string;
  courseTitle: string;
  batchName: string;
  progressPercent: number;
  attendancePercent: number;
  status: "active" | "queued" | "resolved";
  priority: "urgent" | "normal";
  lastMessage: string;
  lastMessageTime: string;
  lastMessageSender?: "you" | "them";
  isVoiceMessage?: boolean;
  unreadCount: number;
  isOnline: boolean;
  isPinned?: boolean;
  isRead?: boolean;
  slaMinutesLeft: number;
  verified?: boolean;
  messages: ChatMessage[];
}

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "chat-arjun",
    studentId: "usr-student-1",
    studentName: "Arjun Mehta",
    avatarText: "AM",
    avatarBg: "#F0EDFF",
    photoUrl: "/assets/student-1.png",
    email: "arjun.m@learner.ai",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    batchName: "Cohort 7 (Live + Replay)",
    progressPercent: 78,
    attendancePercent: 92,
    status: "active",
    priority: "urgent",
    slaMinutesLeft: 3,
    lastMessage: "Can someone confirm if my batch change request to Weekend Bootcamp was approved by the academic admin?",
    lastMessageTime: "2m ago",
    lastMessageSender: "them",
    unreadCount: 0,
    isOnline: true,
    isPinned: false,
    verified: true,
    messages: [
      {
        id: "m-sys-1",
        sender: "system",
        text: "Arjun Mehta joined the live support channel. Connected to Support Desk Agent.",
        time: "10:18 AM",
      },
      {
        id: "m-1",
        sender: "student",
        senderName: "Arjun Mehta",
        text: "Hi support team! I submitted ticket #TKT-1082 this morning regarding moving from Weekday Evening to Weekend Cohort.",
        time: "10:19 AM",
        type: "text",
      },
      {
        id: "m-2",
        sender: "agent",
        senderName: "Srimanth",
        text: "Hello Arjun! I see your request in the queue. You’re at 78% progress with 92% attendance, so you easily qualify for the cohort shift policy.",
        time: "10:20 AM",
        type: "text",
      },
      {
        id: "m-3",
        sender: "student",
        senderName: "Arjun Mehta",
        text: "Can someone confirm if my batch change request to Weekend Bootcamp was approved by the academic admin?",
        time: "10:22 AM",
        type: "text",
      },
    ],
  },
  {
    id: "chat-simran",
    studentId: "usr-student-5",
    studentName: "Simran Kaur",
    avatarText: "SK",
    avatarBg: "#FFF0F5",
    photoUrl: "/assets/student-5.png",
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
    lastMessageSender: "them",
    unreadCount: 2,
    isOnline: true,
    isPinned: false,
    verified: true,
    messages: [
      {
        id: "m-sk-sys",
        sender: "system",
        text: "Simran Kaur joined the live support channel. Connected to Support Desk Agent.",
        time: "10:08 AM",
      },
      {
        id: "m-sk-1",
        sender: "student",
        senderName: "Simran Kaur",
        text: "Hello support team! I was hospitalized last week with severe dengue and missed two live lab sessions.",
        time: "10:10 AM",
        type: "text",
      },
      {
        id: "m-sk-2",
        sender: "student",
        senderName: "Simran Kaur",
        text: "I need to share my medical certificate for the 30-day course validity extension.",
        time: "10:14 AM",
        type: "text",
      },
      {
        id: "m-sk-3",
        sender: "agent",
        senderName: "Srimanth",
        text: "Hello Simran! Glad to hear you are recovering well. Under our Medical Extension Policy, I can grant you a 30-day course validity extension so you have plenty of time to complete the modules.",
        time: "10:16 AM",
        type: "text",
      },
    ],
  },
  {
    id: "chat-pooja",
    studentId: "usr-student-2",
    studentName: "Pooja Hegde",
    avatarText: "PH",
    avatarBg: "#F0EDFF",
    photoUrl: "/assets/student-2.png",
    email: "pooja.h@example.com",
    courseTitle: "Autonomous Multi-Agent Architectures",
    batchName: "Agentic Systems Bootcamp",
    progressPercent: 85,
    attendancePercent: 88,
    status: "queued",
    priority: "normal",
    slaMinutesLeft: 15,
    lastMessage: "Quick query about GPU server credits for the autonomous swarm project.",
    lastMessageTime: "15m ago",
    lastMessageSender: "them",
    unreadCount: 0,
    isOnline: false,
    verified: true,
    messages: [
      {
        id: "m-ph-sys",
        sender: "system",
        text: "Pooja Hegde joined the live support channel. Connected to Support Desk Agent.",
        time: "10:02 AM",
      },
      {
        id: "m-ph-1",
        sender: "student",
        senderName: "Pooja Hegde",
        text: "Quick query about GPU server credits for the autonomous swarm project. Our team is running low on A10G compute hours for our benchmark simulation.",
        time: "10:05 AM",
        type: "text",
      },
      {
        id: "m-ph-2",
        sender: "agent",
        senderName: "Srimanth",
        text: "Hi Pooja! I checked your project milestone score (96%). I've topped up your sandbox GPU quota with 50 compute credits for your team. Ticket marked as resolved.",
        time: "10:08 AM",
        type: "text",
      },
    ],
  },
  {
    id: "chat-rohan",
    studentId: "usr-student-3",
    studentName: "Rohan Nair",
    avatarText: "RN",
    avatarBg: "#E5DEFF",
    photoUrl: "/assets/student-3.png",
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
    lastMessageSender: "them",
    unreadCount: 0,
    isOnline: false,
    isRead: true,
    verified: true,
    messages: [
      {
        id: "m-rn-sys",
        sender: "system",
        text: "Rohan Nair joined the live support channel. Connected to Support Desk Agent.",
        time: "09:10 AM",
      },
      {
        id: "m-rn-1",
        sender: "student",
        senderName: "Rohan Nair",
        text: "Lecture 6 replay player showed a buffering error and wouldn't load past minute 42.",
        time: "09:15 AM",
        type: "text",
      },
      {
        id: "m-rn-2",
        sender: "agent",
        senderName: "Srimanth",
        text: "I've flushed the CDN edge cache for your stream token and updated your player endpoint. Please try refreshing now.",
        time: "09:20 AM",
        type: "text",
      },
      {
        id: "m-rn-3",
        sender: "student",
        senderName: "Rohan Nair",
        text: "Thanks a lot for the replay link! That worked perfectly.",
        time: "09:25 AM",
        type: "text",
      },
    ],
  },
];

// Sample Canned Macros from Image 1
const CANNED_MACROS = [
  { tag: "#batch", label: "Batch Shift SOP", text: "We have reviewed your attendance and course progress. Your request to shift cohorts is approved." },
  { tag: "#validity", label: "Validity Extension Policy", text: "A 30-day course access extension has been applied to your learner portal per medical policy." },
  { tag: "#cdn", label: "CDN & Stream Flush", text: "I have re-synchronized your stream token and flushed the CDN edge cache. Please refresh your browser." },
  { tag: "#gpu", label: "GPU Server Quota", text: "Your cloud sandbox GPU server quota has been topped up with 50 compute credits for the bootcamp project." },
];

export const LiveChatPage: React.FC = () => {
  const [chats, setChats] = useState<ChatSession[]>(INITIAL_SESSIONS);
  const [selectedChatId, setSelectedChatId] = useState<string>("chat-arjun");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "queued" | "resolved">("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [agentPresence, setAgentPresence] = useState<"online" | "in_chat" | "away">("online");
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [voiceSecondsLeft, setVoiceSecondsLeft] = useState(15);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [is360DrawerOpen, setIs360DrawerOpen] = useState(false);
  const [showTelemetryPanel, setShowTelemetryPanel] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceTimerRef = useRef<number | null>(null);
  const recordTimerRef = useRef<number | null>(null);

  const selectedChat = chats.find((c) => c.id === selectedChatId) || chats[0];

  // Counts from Image 1
  const activeCount = chats.filter((c) => c.status === "active").length;
  const queuedCount = chats.filter((c) => c.status === "queued").length;
  const resolvedCount = chats.filter((c) => c.status === "resolved").length;
  const urgentCount = chats.filter((c) => c.priority === "urgent" && c.status === "active").length;

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat.messages, isRecordingVoice]);

  // Handle Voice Playback Countdown
  const handleToggleVoice = () => {
    if (isVoicePlaying) {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      setIsVoicePlaying(false);
    } else {
      setIsVoicePlaying(true);
      if (voiceSecondsLeft <= 0) setVoiceSecondsLeft(15);
      voiceTimerRef.current = window.setInterval(() => {
        setVoiceSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(voiceTimerRef.current!);
            setIsVoicePlaying(false);
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  // Handle Reactions toggle
  const handleToggleReaction = (messageId: string, emoji: string) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== selectedChatId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => {
            if (m.id !== messageId) return m;
            const existing = m.reactions || [];
            const found = existing.find((r) => r.emoji === emoji);
            let updated: Reaction[];
            if (found) {
              updated = existing
                .map((r) =>
                  r.emoji === emoji
                    ? {
                        ...r,
                        count: r.userReacted ? r.count - 1 : r.count + 1,
                        userReacted: !r.userReacted,
                      }
                    : r
                )
                .filter((r) => r.count > 0);
            } else {
              updated = [...existing, { emoji, count: 1, userReacted: true }];
            }
            return { ...m, reactions: updated };
          }),
        };
      })
    );
  };

  // Notification Toast Helper
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3200);
  };

  // Send Message
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMsg: ChatMessage = {
      id: `agent-${Date.now()}`,
      sender: "agent",
      senderName: "Srimanth",
      senderPhoto: "/assets/srimanth.png",
      text: inputText.trim(),
      time: timeStr,
      views: 1,
      type: "text",
    };

    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== selectedChatId) return c;
        return {
          ...c,
          lastMessage: `You: ${inputText.trim()}`,
          lastMessageTime: "Just now",
          lastMessageSender: "you",
          messages: [...c.messages, newMsg],
        };
      })
    );

    setInputText("");
    showToast("Reply dispatched to student.");
  };

  // Voice Recording Toggle
  const handleToggleRecord = () => {
    if (isRecordingVoice) {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setIsRecordingVoice(false);

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const durationSec = recordingSeconds || 4;
      const durationStr = `0:${durationSec < 10 ? "0" : ""}${durationSec}`;

      const newVoiceMsg: ChatMessage = {
        id: `voice-${Date.now()}`,
        sender: "agent",
        senderName: "Srimanth",
        senderPhoto: "/assets/srimanth.png",
        type: "voice",
        voiceDuration: durationStr,
        time: timeStr,
        views: 1,
      };

      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== selectedChatId) return c;
          return {
            ...c,
            lastMessage: "You sent a voice message",
            lastMessageTime: "Just now",
            lastMessageSender: "you",
            messages: [...c.messages, newVoiceMsg],
          };
        })
      );

      setRecordingSeconds(0);
      showToast("Voice message sent!");
    } else {
      setIsRecordingVoice(true);
      setRecordingSeconds(1);
      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  // Resolve Session Action from Image 1
  const handleResolveSession = () => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === selectedChatId
          ? {
              ...c,
              status: "resolved",
              lastMessage: "Session marked as resolved",
              lastMessageTime: "Just now",
            }
          : c
      )
    );
    showToast(`Session with ${selectedChat.studentName} marked as Resolved.`);
  };

  // Filtered Chats
  const filteredChats = chats.filter((c) => {
    const matchesSearch =
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (urgentOnly && c.priority !== "urgent") return false;
    if (statusTab !== "all" && c.status !== statusTab) return false;
    return true;
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 h-full support-page-font">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-[#111111] text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border border-white/10 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="h-4 w-4 text-[#AEEB00]" />
          <span>{notification}</span>
        </div>
      )}

      {/* =========================================================
          FEATURE BAR FROM IMAGE 1 (With Image 2's sleek rounded UI)
         ========================================================= */}
      <div className="panel px-4 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-150 rounded-2xl shadow-2xs">
        {/* Left Side: Operations Desk Info & Status Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#F0EDFF] text-[#7042D2] flex items-center justify-center font-bold">
              <MessageSquare className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-[#111111] tracking-tight">
              Live Chat Operations Desk
            </h2>
          </div>

          <div className="h-4 w-px bg-zinc-200 hidden sm:block" />

          {/* Lime Live Desk Indicator */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBFDCE] text-[#345C00] border border-[#AEEB00]/40 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#AEEB00] animate-pulse" />
            <span>Live Desk</span>
          </span>

          <span className="text-xs font-bold text-zinc-600 bg-zinc-100 px-2.5 py-0.5 rounded-full">
            {activeCount} Active
          </span>

          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60 flex items-center gap-1">
            <Flame className="h-3 w-3 text-amber-500 animate-pulse" />
            <span>{urgentCount} Urgent SLA</span>
          </span>

          <span className="text-[11px] text-zinc-400 font-mono hidden md:inline">
            Avg First Reply: 42s
          </span>
        </div>

        {/* Right Side: Agent Presence & Instant Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Agent Presence Pill */}
          <div className="flex items-center rounded-full border border-[#E5DEFF] p-0.5 bg-[#FAF9FF] text-xs">
            {(["online", "in_chat", "away"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setAgentPresence(st);
                  showToast(`Agent presence set to ${st.replace("_", " ")}.`);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                  agentPresence === st
                    ? st === "online"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : st === "in_chat"
                      ? "bg-[#7042D2] text-white shadow-2xs"
                      : "bg-amber-500 text-white shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Student 360 Full Modal Button */}
          <button
            type="button"
            onClick={() => setIs360DrawerOpen(true)}
            className="px-3 h-8 rounded-full border border-[#E5DEFF] text-[#7042D2] bg-[#FAF9FF] hover:bg-[#F0EDFF] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Inspect Full Student 360"
          >
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Student 360°</span>
          </button>

          {/* Resolve Session Button */}
          <button
            type="button"
            onClick={handleResolveSession}
            disabled={selectedChat.status === "resolved"}
            className="px-3.5 h-8 rounded-full bg-[#7042D2] hover:bg-[#5D32B8] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Mark session as resolved"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Resolve Session</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          MAIN 3-COLUMN WORKSPACE: FEATURES FROM 1 + UI FROM 2
         ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0">
        {/* =========================================================
            COLUMN 1: Conversation Queue (4 cols / 3.5 cols)
           ========================================================= */}
        <div className="lg:col-span-4 h-full panel flex flex-col min-h-0 overflow-hidden bg-white border border-zinc-150 rounded-2xl shadow-2xs">
          {/* Search Bar + Filters (Image 2 UI + Image 1 Tabs) */}
          <div className="p-3 pb-2 border-b border-[#F0EDFF] space-y-2.5 bg-white shrink-0">
            {/* Search Pill */}
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                placeholder="Search conversations or students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 h-9 text-xs sm:text-sm bg-[#F0EDFF] rounded-full border border-transparent focus:border-[#905FEB] text-[#111111] placeholder:text-zinc-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Tabs matching Image 1 & 2 */}
            <div className="flex items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
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
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                        isTabActive
                          ? "bg-[#7042D2] text-white shadow-2xs"
                          : "text-zinc-500 hover:text-[#7042D2] hover:bg-[#F0EDFF]"
                      }`}
                    >
                      {tab} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Urgent SLA Flame Toggle Button */}
              <button
                type="button"
                onClick={() => setUrgentOnly(!urgentOnly)}
                title="Filter Urgent SLA"
                className={`h-7 px-2.5 rounded-full border transition-all text-xs flex items-center gap-1 shrink-0 cursor-pointer ${
                  urgentOnly
                    ? "bg-[#FFF3E0] text-[#B45309] border-[#F59E0B]/50 font-bold shadow-2xs"
                    : "bg-white border-[#E5DEFF] text-zinc-500 hover:border-[#905FEB]"
                }`}
              >
                <Flame className={`h-3.5 w-3.5 ${urgentOnly ? "text-amber-600 animate-pulse" : "text-zinc-400"}`} />
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List with Image 2's Squircle UI */}
          <div className="p-2 flex-1 min-h-0 overflow-y-auto space-y-1.5 support-queue-scrollbar">
            {filteredChats.map((chat) => {
              const isSelected = chat.id === selectedChatId;

              return (
                <div
                  key={chat.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedChatId(chat.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedChatId(chat.id);
                    }
                  }}
                  className={`w-full p-3 rounded-2xl flex items-start gap-3 transition-all cursor-pointer text-left select-none border ${
                    isSelected
                      ? "bg-[#F0EDFF] border-[#905FEB] text-[#111111] shadow-2xs"
                      : "bg-white border-transparent hover:bg-[#FAF9FF]"
                  }`}
                >
                  {/* Squircle Avatar with Image or Initial Pill */}
                  <div className="relative shrink-0 mt-0.5">
                    {chat.photoUrl ? (
                      <img
                        src={chat.photoUrl}
                        alt={chat.studentName}
                        className="w-11 h-11 rounded-2xl object-cover shadow-2xs border border-[#E5DEFF]"
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-2xl font-bold text-sm flex items-center justify-center text-white shadow-xs"
                        style={{ backgroundColor: chat.avatarBg || "#1C1C1E" }}
                      >
                        {chat.avatarText || chat.studentName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {chat.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#AEEB00] ring-2 ring-white" />
                    )}
                  </div>

                  {/* Conversation Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-sm font-bold text-[#111111] truncate">
                        {chat.studentName}
                      </h4>
                      <span className="text-[11px] text-zinc-400 font-medium shrink-0 ml-1">
                        {chat.lastMessageTime}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 truncate leading-snug">
                      {chat.isVoiceMessage ? (
                        <span className="text-[#7042D2] font-semibold flex items-center gap-1">
                          <Mic className="h-3 w-3" /> Voice message
                        </span>
                      ) : chat.lastMessageSender === "you" ? (
                        <span>
                          <span className="text-[#905FEB] font-medium">You: </span>
                          {chat.lastMessage.replace("You: ", "")}
                        </span>
                      ) : (
                        chat.lastMessage
                      )}
                    </p>

                    {/* Features from Image 1: Badges row */}
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
                        <span className="bg-[#FFF3E0] text-[#B45309] border border-[#F59E0B]/40 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Flame className="h-2.5 w-2.5 text-amber-600 animate-pulse" />
                          <span>&lt;{chat.slaMinutesLeft}m SLA</span>
                        </span>
                      )}

                      {/* Right Indicators: Unread Pill or Double Checkmarks */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        {chat.isRead && (
                          <CheckCheck className="h-3.5 w-3.5 text-[#7042D2]" />
                        )}
                        {chat.unreadCount > 0 && (
                          <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-[#7042D2] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================
            COLUMN 2: Chat Stream Console (5 cols if telemetry open, else 8)
           ========================================================= */}
        <div
          className={`${
            showTelemetryPanel ? "lg:col-span-5" : "lg:col-span-8"
          } h-full panel flex flex-col min-h-0 overflow-hidden bg-white border border-zinc-150 rounded-2xl shadow-2xs transition-all`}
        >
          {/* Active Conversation Header (Image 2 UI + Image 1 verified/SLA badges) */}
          <div className="px-5 py-3 border-b border-[#F0EDFF] flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {/* Header Avatar Circle with Initials matching screenshot */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center border border-[#E5DEFF] text-[#7042D2] bg-[#F0EDFF] shadow-2xs">
                  {selectedChat.avatarText || selectedChat.studentName.slice(0, 2).toUpperCase()}
                </div>
                {selectedChat.isOnline && (
                  <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full bg-[#AEEB00] ring-2 ring-white" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-[#111111] tracking-tight leading-tight truncate">
                    {selectedChat.studentName}
                  </h3>
                  {selectedChat.verified && (
                    <span className="badge-status-completed text-[9px] font-bold px-1.5 py-0">
                      Verified
                    </span>
                  )}
                  {selectedChat.priority === "urgent" && (
                    <span className="bg-[#FFF3E0] text-[#B45309] border border-[#F59E0B]/40 text-[9px] font-bold px-1.5 py-0 rounded-full flex items-center gap-0.5">
                      <Flame className="h-2.5 w-2.5 text-amber-600" />
                      <span>Urgent SLA</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#7042D2] font-semibold truncate max-w-[280px]">
                  {selectedChat.courseTitle}
                </p>
              </div>
            </div>

            {/* Header Action Tools matching screenshot */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-2xs hover:shadow-xs ${
                  showTelemetryPanel
                    ? "bg-[#7042D2] text-white shadow-xs"
                    : "bg-[#F0EDFF] text-[#7042D2] hover:bg-[#E5DEFF]"
                }`}
                title={showTelemetryPanel ? 'Close "Learner 360° Telemetry" block' : 'Open "Learner 360° Telemetry" block'}
                onClick={() => {
                  setShowTelemetryPanel((prev) => !prev);
                }}
              >
                <User className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="w-9 h-9 rounded-full bg-[#F0EDFF] text-[#7042D2] hover:bg-[#E5DEFF] flex items-center justify-center transition-colors cursor-pointer shadow-2xs hover:shadow-xs"
                title="Refresh Thread"
                onClick={() => showToast("Chat stream refreshed.")}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream Viewport: Pure Query and Resolve */}
          <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto space-y-4 support-queue-scrollbar bg-[#FAF9FF]/30">
            {selectedChat.messages.map((msg) => {
              if (msg.sender === "system") {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className="text-[11px] text-[#7042D2] bg-[#F0EDFF] border border-[#905FEB]/30 px-3.5 py-1.5 rounded-full font-bold shadow-2xs flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#905FEB]" />
                      {msg.text}
                    </span>
                  </div>
                );
              }

              if (msg.sender === "agent") {
                return (
                  <div key={msg.id} className="flex items-end justify-end">
                    <div className="bg-[#7042D2] text-white rounded-[22px] rounded-br-sm p-4 text-xs sm:text-sm font-medium leading-relaxed max-w-[85%] sm:max-w-[78%] shadow-2xs">
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <div className="text-[11px] text-white/80 mt-2 flex items-center gap-1.5 justify-end font-medium">
                        <span>{msg.time}</span>
                        <CheckCheck className="h-3.5 w-3.5 text-[#AEEB00]" />
                      </div>
                    </div>
                  </div>
                );
              }

              // Student Query message
              return (
                <div key={msg.id} className="flex items-start gap-3 justify-start max-w-[85%] sm:max-w-[78%]">
                  <div className="w-8.5 h-8.5 rounded-full bg-[#F0EDFF] text-[#7042D2] font-bold text-xs flex items-center justify-center border border-[#E5DEFF] shrink-0 mt-0.5 select-none shadow-2xs">
                    {selectedChat.avatarText || selectedChat.studentName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="bg-white border border-[#E5DEFF] rounded-[22px] rounded-tl-sm p-4 text-[#111111] text-xs sm:text-sm font-medium leading-relaxed shadow-2xs">
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <div className="text-[11px] text-zinc-400 mt-2 font-medium">{msg.time}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* AI COPILOT & MACRO ACCELERATION BAR (From Image 1) */}
          <div className="px-4 py-2 border-t border-[#F0EDFF] bg-[#FAF9FF] space-y-1.5 shrink-0">
            {/* Top row: AI Draft Proposals */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-zinc-600 flex items-center gap-1 shrink-0 mr-1">
                <Sparkles className="h-3.5 w-3.5 text-[#7042D2]" />
                <span>AI Draft Proposals:</span>
              </span>
              <button
                type="button"
                onClick={() => setInputText("Hello! I reviewed your attendance (92%) and course progress (78%). You meet all eligibility criteria, so your cohort transfer is approved.")}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white hover:bg-[#F0EDFF] border border-[#E5DEFF] text-[#7042D2] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>💼 Batch Shift SOP</span>
              </button>
              <button
                type="button"
                onClick={() => setInputText("We have reviewed your request under our medical policy guidelines and granted a 30-day course validity extension.")}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white hover:bg-[#F0EDFF] border border-[#E5DEFF] text-[#7042D2] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>🕒 Medical Policy</span>
              </button>
              <button
                type="button"
                onClick={() => setInputText("I completely understand your situation and am prioritizing your request right away so your learning progress remains smooth.")}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white hover:bg-[#F0EDFF] border border-[#E5DEFF] text-[#7042D2] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>🤝 Empathetic</span>
              </button>
            </div>

            {/* Bottom row: Canned Macro Pills from Image 1 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CANNED_MACROS.map((macro, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(macro.text)}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[#E5DEFF] bg-white hover:bg-[#F0EDFF] hover:border-[#905FEB] text-[#111111] shrink-0 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span className="font-mono text-[#7042D2]">{macro.tag}</span>
                  <span>{macro.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SLEEK PILL COMPOSER (From Image 2 with Image 1 shortcuts) */}
          <div className="p-3 sm:p-4 bg-white border-t border-[#F0EDFF] shrink-0">
            {isRecordingVoice ? (
              /* Voice Recording Bar */
              <div className="rounded-full bg-rose-50 border border-rose-200 p-2 px-4 flex items-center justify-between shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-600 animate-ping" />
                  <span className="text-xs font-bold text-rose-700">
                    Recording audio message... 0:0{recordingSeconds}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Done &amp; Send
                </button>
              </div>
            ) : (
              /* Modern Pill Input Bar */
              <div className="rounded-full bg-[#F4F3F8] p-1.5 sm:p-2 pl-4 pr-2 flex items-center gap-3 border border-[#E5DEFF] shadow-xs">
                {/* Attachment Icon */}
                <button
                  type="button"
                  onClick={() => showToast("Attachment dialog ready. You can attach PDFs or diagrams.")}
                  className="text-zinc-400 hover:text-[#7042D2] transition-colors cursor-pointer"
                  title="Attach file"
                >
                  <Paperclip className="h-4.5 w-4.5" />
                </button>

                {/* Quick Emoji Icon */}
                <button
                  type="button"
                  onClick={() => setInputText((prev) => prev + " 👍 ")}
                  className="text-zinc-400 hover:text-[#7042D2] transition-colors cursor-pointer"
                  title="Insert emoji"
                >
                  <Smile className="h-4.5 w-4.5" />
                </button>

                {/* Input Text Box */}
                <input
                  type="text"
                  placeholder="Type your response to student... (Enter to send, Shift+Enter for newline)"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm text-[#111111] placeholder:text-zinc-400"
                />

                {/* Voice Record Mic */}
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  className="text-zinc-400 hover:text-[#7042D2] transition-colors cursor-pointer"
                  title="Record Voice Message"
                >
                  <Mic className="h-4.5 w-4.5" />
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  className="px-3.5 h-8 rounded-full bg-[#7042D2] hover:bg-[#5D32B8] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40 transition-colors"
                  title="Send reply"
                >
                  <span>Send Reply</span>
                  <Send className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================
            COLUMN 3: LEARNER 360° TELEMETRY (FEATURES FROM IMAGE 1 + UI FROM IMAGE 2)
           ========================================================= */}
        {showTelemetryPanel && (
          <div className="lg:col-span-3 h-full panel flex flex-col min-h-0 overflow-hidden bg-white border border-zinc-150 rounded-2xl shadow-2xs animate-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <div className="p-3 border-b border-[#F0EDFF] bg-[#FAF9FF] flex items-center justify-between shrink-0">
              <span className="text-xs font-extrabold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-[#7042D2]" />
                Learner 360° Telemetry
              </span>
              <div className="flex items-center gap-1.5">
                <span className="badge-status-completed text-[9px] font-bold px-2 py-0.5">
                  Verified
                </span>
                <button
                  type="button"
                  onClick={() => setShowTelemetryPanel(false)}
                  className="text-zinc-400 hover:text-zinc-700 cursor-pointer ml-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Telemetry Cards */}
            <div className="p-3.5 space-y-3.5 text-xs flex-1 min-h-0 overflow-y-auto support-queue-scrollbar">
              {/* Student ID Card */}
              <div className="p-3.5 rounded-2xl border border-[#E5DEFF] bg-[#FAF9FF] text-center space-y-1.5 shadow-2xs">
                {selectedChat.photoUrl ? (
                  <img
                    src={selectedChat.photoUrl}
                    alt={selectedChat.studentName}
                    className="w-12 h-12 rounded-2xl object-cover mx-auto shadow-xs border border-[#E5DEFF]"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-2xl font-bold text-sm mx-auto flex items-center justify-center text-white shadow-xs"
                    style={{ backgroundColor: selectedChat.avatarBg || "#1C1C1E" }}
                  >
                    {selectedChat.avatarText || selectedChat.studentName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <h4 className="font-extrabold text-[#111111] text-sm leading-tight mt-1">
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

              {/* Course & Progress Gauges */}
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

              {/* One-Click Rapid Resolutions from Image 1 */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                  One-Click Mentor Actions
                </span>

                <button
                  type="button"
                  onClick={() => showToast("Cohort transfer approved for " + selectedChat.studentName)}
                  className="group w-full h-9 px-3.5 rounded-full bg-[#F0EDFF] text-[#7042D2] border border-[#E5DEFF] text-xs font-bold flex items-center justify-start gap-2.5 transition-colors duration-150 cursor-pointer hover:bg-[#7042D2] hover:text-white hover:border-[#7042D2] hover:shadow-md hover:shadow-[#7042D2]/25"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 text-[#7042D2] group-hover:text-white transition-colors shrink-0" />
                  <span>Approve Batch Shift</span>
                </button>

                <button
                  type="button"
                  onClick={() => showToast("30-Day extension granted for " + selectedChat.studentName)}
                  className="group w-full h-9 px-3.5 rounded-full bg-[#F0EDFF] text-[#7042D2] border border-[#E5DEFF] text-xs font-bold flex items-center justify-start gap-2.5 transition-colors duration-150 cursor-pointer hover:bg-[#7042D2] hover:text-white hover:border-[#7042D2] hover:shadow-md hover:shadow-[#7042D2]/25"
                >
                  <Clock className="h-3.5 w-3.5 text-[#7042D2] group-hover:text-white transition-colors shrink-0" />
                  <span>Grant 30-Day Extension</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIs360DrawerOpen(true)}
                  className="group w-full h-9 px-3.5 rounded-full bg-[#F0EDFF] text-[#7042D2] border border-[#E5DEFF] text-xs font-bold flex items-center justify-start gap-2.5 transition-colors duration-150 cursor-pointer hover:bg-[#7042D2] hover:text-white hover:border-[#7042D2] hover:shadow-md hover:shadow-[#7042D2]/25"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-[#7042D2] group-hover:text-white transition-colors shrink-0" />
                  <span>Inspect Full 360° Profile</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Lightbox Dialog */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/90 border border-white/20 rounded-2xl shadow-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>Image Attachment Preview</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <img
                src={previewImage}
                alt="Attachment Preview"
                className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Full Student 360 Drawer */}
      <Student360Drawer
        open={is360DrawerOpen}
        onOpenChange={setIs360DrawerOpen}
        studentId={selectedChat.studentId}
      />
    </div>
  );
};

export default LiveChatPage;
