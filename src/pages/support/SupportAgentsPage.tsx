import React, { useState } from "react";
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Star,
  Shield,
  LifeBuoy,
  MessageSquare,
  TrendingUp,
  Award,
  Calendar,
  AlertCircle,
  MoreVertical,
  UserCheck,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { MetricItem } from "@/types";
import { MetricCard } from "@/components/MetricCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ArrowRight, Sparkles, Eye, Check } from "lucide-react";

interface SupportAgent {
  id: string;
  name: string;
  email: string;
  avatar: string;
  roleTier: "Tier 1 Support" | "Senior Technical Mentor" | "Escalations Lead";
  status: "online" | "in_chat" | "away" | "offline";
  activeTickets: number;
  solvedToday: number;
  avgResponseTime: string;
  csatScore: number;
  specialties: string[];
  currentShift: string;
  capacityPercent: number;
}

const AGENTS: SupportAgent[] = [
  {
    id: "agt-1",
    name: "Nikhil Joshi",
    email: "nikhil.j@edtech.com",
    avatar: "NJ",
    roleTier: "Tier 1 Support",
    status: "online",
    activeTickets: 4,
    solvedToday: 18,
    avgResponseTime: "8 mins",
    csatScore: 4.92,
    specialties: ["Batch Moves", "Validity Extensions", "Portal Login"],
    currentShift: "08:00 AM - 04:00 PM (IST)",
    capacityPercent: 80,
  },
  {
    id: "agt-2",
    name: "Aakash Varma",
    email: "aakash.v@edtech.com",
    avatar: "AV",
    roleTier: "Senior Technical Mentor",
    status: "in_chat",
    activeTickets: 5,
    solvedToday: 14,
    avgResponseTime: "12 mins",
    csatScore: 4.96,
    specialties: ["LLM Embeddings", "LangChain & LlamaIndex", "GPU Sandboxes"],
    currentShift: "10:00 AM - 06:00 PM (IST)",
    capacityPercent: 90,
  },
  {
    id: "agt-3",
    name: "Meera Sen",
    email: "meera.s@edtech.com",
    avatar: "MS",
    roleTier: "Escalations Lead",
    status: "online",
    activeTickets: 2,
    solvedToday: 8,
    avgResponseTime: "6 mins",
    csatScore: 4.98,
    specialties: ["SLA Escalations", "Refund Approvals", "Academic Exceptions"],
    currentShift: "09:00 AM - 05:00 PM (IST)",
    capacityPercent: 50,
  },
  {
    id: "agt-4",
    name: "Karan Singhania",
    email: "karan.s@edtech.com",
    avatar: "KS",
    roleTier: "Senior Technical Mentor",
    status: "away",
    activeTickets: 3,
    solvedToday: 11,
    avgResponseTime: "15 mins",
    csatScore: 4.88,
    specialties: ["Multi-Agent Swarms", "Autogen", "FastAPI Serving"],
    currentShift: "02:00 PM - 10:00 PM (IST)",
    capacityPercent: 60,
  },
  {
    id: "agt-5",
    name: "Tanvi Deshmukh",
    email: "tanvi.d@edtech.com",
    avatar: "TD",
    roleTier: "Tier 1 Support",
    status: "online",
    activeTickets: 3,
    solvedToday: 21,
    avgResponseTime: "9 mins",
    csatScore: 4.91,
    specialties: ["Course Access", "Payment Inquiries", "Certificate Verification"],
    currentShift: "08:00 AM - 04:00 PM (IST)",
    capacityPercent: 65,
  },
  {
    id: "agt-6",
    name: "Vikramaditya Roy",
    email: "vikram.r@edtech.com",
    avatar: "VR",
    roleTier: "Senior Technical Mentor",
    status: "offline",
    activeTickets: 0,
    solvedToday: 0,
    avgResponseTime: "18 mins",
    csatScore: 4.85,
    specialties: ["Vector Databases", "Milvus / Qdrant", "RAG Optimization"],
    currentShift: "06:00 PM - 02:00 AM (Night On-Call)",
    capacityPercent: 0,
  },
];

const AGENT_STATUS_THEMES = {
  online: {
    label: "Online",
    border: "border-emerald-200/90",
    hoverBorder: "hover:border-emerald-400",
    topStrip: "from-emerald-500 to-teal-500",
    textColor: "text-emerald-700",
    headerTextColor: "text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    avatarBg: "bg-emerald-50",
    avatarText: "text-emerald-700",
    avatarRing: "ring-emerald-300",
    capacityBar: "bg-emerald-500",
    delegateBtn: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  in_chat: {
    label: "In Live Chat",
    border: "border-blue-200/90",
    hoverBorder: "hover:border-blue-400",
    topStrip: "from-blue-500 to-indigo-500",
    textColor: "text-blue-700",
    headerTextColor: "text-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500 animate-pulse",
    avatarBg: "bg-blue-50",
    avatarText: "text-blue-700",
    avatarRing: "ring-blue-300",
    capacityBar: "bg-blue-500",
    delegateBtn: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  },
  away: {
    label: "Away",
    border: "border-amber-200/90",
    hoverBorder: "hover:border-amber-400",
    topStrip: "from-amber-500 to-orange-500",
    textColor: "text-amber-700",
    headerTextColor: "text-amber-600",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    avatarBg: "bg-amber-50",
    avatarText: "text-amber-700",
    avatarRing: "ring-amber-300",
    capacityBar: "bg-amber-500",
    delegateBtn: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
  offline: {
    label: "Offline",
    border: "border-red-200/90",
    hoverBorder: "hover:border-red-400",
    topStrip: "from-red-500 to-rose-500",
    textColor: "text-red-700",
    headerTextColor: "text-red-600",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500 ring-1 ring-red-400",
    avatarBg: "bg-red-50",
    avatarText: "text-red-700",
    avatarRing: "ring-red-300",
    capacityBar: "bg-red-500",
    delegateBtn: "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100",
  },
} as const;

const ROLE_TIER_STYLES: Record<string, string> = {
  "Tier 1 Support": "bg-blue-50 text-blue-700 border-blue-200",
  "Senior Technical Mentor": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Escalations Lead": "bg-purple-50 text-purple-700 border-purple-200",
};

export const SupportAgentsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState<SupportAgent | null>(null);

  const tiers = [
    "all",
    "Tier 1 Support",
    "Senior Technical Mentor",
    "Escalations Lead",
  ];

  const statuses = [
    { id: "all", label: "All Statuses" },
    { id: "online", label: "Online" },
    { id: "in_chat", label: "In Chat" },
    { id: "away", label: "Away" },
    { id: "offline", label: "Offline" },
  ];

  const filteredAgents = AGENTS.filter((agt) => {
    const matchesSearch =
      agt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agt.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agt.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (tierFilter !== "all" && agt.roleTier !== tierFilter) return false;
    if (statusFilter !== "all" && agt.status !== statusFilter) return false;
    return true;
  });

  const onlineCount = AGENTS.filter((a) => a.status === "online" || a.status === "in_chat").length;
  const inChatCount = AGENTS.filter((a) => a.status === "in_chat").length;

  const kpis: MetricItem[] = [
    {
      icon: "users",
      label: "Active Agents",
      value: `${onlineCount} / ${AGENTS.length}`,
      trend: `${inChatCount} in live chats`,
      tone: "lavender",
    },
    {
      icon: "clock",
      label: "Team First Reply",
      value: "10 mins",
      trend: "-4 mins vs SLA",
      tone: "pink",
    },
    {
      icon: "star",
      label: "CSAT Satisfaction",
      value: "4.92 / 5.0",
      trend: "98.4% positive",
      tone: "yellow",
    },
    {
      icon: "check-circle",
      label: "Resolved Today",
      value: "72",
      trend: "+18% vs yesterday",
      tone: "lime",
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 support-page-font h-full">
      {/* 1. KPI Stats Grid (Canonical 132px Folder-Tab Cards with 8px Gap) */}
      <div className="metrics-grid shrink-0">
        {kpis.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* 2. Search and Category Filter Bar */}
      <div className="panel p-3.5 bg-white border border-zinc-150 shrink-0">
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#905FEB]" />
            <Input
              placeholder="Search by agent name, specialty, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-xs sm:text-sm bg-white border-[#E5DEFF] rounded-full focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20 text-[#111111] placeholder:text-zinc-400 shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            {/* Role Tiers Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 sleek-scrollbar items-center">
              {tiers.map((tier) => {
                const isActive = tierFilter === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTierFilter(tier)}
                    className={cn(
                      "h-7 px-3 text-[11px] sm:text-xs font-semibold rounded-full capitalize whitespace-nowrap cursor-pointer flex items-center gap-1.5 border transition-all duration-150",
                      isActive
                        ? "bg-[#905FEB] text-white border-[#905FEB] shadow-xs hover:bg-[#7D46E7]"
                        : "bg-[#F0EDFF] text-[#7042D2] border-[#905FEB]/20 hover:bg-[#E2DBFC]"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-colors",
                        isActive ? "bg-white" : "bg-[#905FEB]"
                      )}
                    />
                    <span>{tier === "all" ? "All Role Tiers" : tier}</span>
                  </button>
                );
              })}
            </div>

            {/* Status Pills & Scroll Indicator */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1 items-center overflow-x-auto min-w-0">
                {statuses.map((st) => {
                  const isActive = statusFilter === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(st.id)}
                      className={cn(
                        "h-6.5 px-2.5 text-[10px] font-semibold rounded-full whitespace-nowrap cursor-pointer border transition-all shrink-0",
                        isActive
                          ? "bg-[#111111] text-white border-[#111111]"
                          : "bg-white text-zinc-600 border-[#E5DEFF] hover:bg-[#FAF9FF]"
                      )}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Scrollable Viewport */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 support-queue-scrollbar">
        {filteredAgents.length === 0 ? (
          <div className="py-12 text-center bg-white panel p-8">
            <Users className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#111111]">No support agents found</p>
            <p className="text-xs text-zinc-500 mt-1">Try resetting the search query or tier/status filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredAgents.map((agt) => {
              return (
                <div
                  key={agt.id}
                  onClick={() => setSelectedAgent(agt)}
                  className="panel relative bg-white border border-zinc-150 hover:border-purple-300 flex flex-col justify-between cursor-pointer overflow-hidden transition-all duration-200"
                >
                  {/* Top Colorful Category Gradient Strip */}
                  <div
                    className="h-1.5 w-full bg-gradient-to-r from-[#905FEB] via-[#824FE7] to-[#A87DF5] shadow-xs"
                  />

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5 bg-white">
                    <div className="space-y-3">
                      {/* Header: Avatar, Name & Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-11 w-11 rounded-2xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center font-bold text-sm shadow-xs">
                              {agt.avatar}
                            </div>
                            <span
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white",
                                agt.status === "online" ? "bg-[#AEEB00] animate-pulse" :
                                  agt.status === "in_chat" ? "bg-[#905FEB] animate-pulse" :
                                    agt.status === "away" ? "bg-amber-400" : "bg-zinc-400"
                              )}
                            />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-[#111111] leading-snug hover:text-[#905FEB] transition-colors">
                              {agt.name}
                            </h3>
                            <p className="text-[11px] text-zinc-500 font-mono">{agt.email}</p>
                          </div>
                        </div>

                        <span
                          className={cn(
                            "text-[10px] font-bold px-2.5 py-0.5",
                            agt.status === "online" ? "badge-status-completed" :
                              agt.status === "in_chat" ? "badge-status-in-progress" :
                                agt.status === "away" ? "badge-status-assigned" : "badge-status-not-started"
                          )}
                        >
                          {agt.status === "online" ? "Online" :
                            agt.status === "in_chat" ? "In Chat" :
                              agt.status === "away" ? "Away" : "Offline"}
                        </span>
                      </div>

                      {/* Role Tier and Shift */}
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="badge-status-in-progress text-[10px] font-bold px-2 py-0.5">
                          {agt.roleTier}
                        </span>
                        <span className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                          <Star className="h-3.5 w-3.5 fill-current" /> {agt.csatScore}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-500 flex items-center gap-1 font-medium">
                        <Clock className="h-3 w-3 text-zinc-400" /> Shift: {agt.currentShift}
                      </p>

                      {/* Metrics Box */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#FAF9FF] border border-[#E5DEFF] text-center">
                        <div>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active</p>
                          <p className="text-sm font-bold text-[#111111] mt-0.5">{agt.activeTickets}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Solved</p>
                          <p className="text-sm font-bold text-[#3B6600] mt-0.5">{agt.solvedToday}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Response</p>
                          <p className="text-sm font-bold text-[#111111] mt-0.5">{agt.avgResponseTime}</p>
                        </div>
                      </div>

                      {/* Specialties Tags */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Specialties &amp; Coverage
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {agt.specialties.map((spec, i) => (
                            <span
                              key={i}
                              className="text-[10px] py-0.5 px-2.5 bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/20 rounded-full font-medium"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Meta & Action Area like KnowledgeBasePage */}
                    <div className="space-y-2 pt-2.5 border-t border-[#F0EDFF]">
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-support-primary flex-1 text-xs h-8 gap-1.5 font-bold cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert(`Direct ticket delegation queue initiated for ${agt.name}.`);
                          }}
                        >
                          <LifeBuoy className="h-3.5 w-3.5" />
                          <span>Delegate Tickets</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>

                        <button
                          className="action-icon-lavender w-8 h-8 rounded-full cursor-pointer shrink-0"
                          title="Open direct live chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert(`Direct internal chat with ${agt.name} opened.`);
                          }}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Agent Detail Modal like KnowledgeBasePage */}
      {selectedAgent && (
        <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
          <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto bg-white text-zinc-900 border border-[#E5DEFF] shadow-2xl rounded-2xl p-6 sm:p-7 sleek-scrollbar">
            <DialogHeader className="space-y-3 border-b border-[#F0EDFF] pb-4 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge-status-in-progress text-xs font-bold px-3 py-1">
                  {selectedAgent.roleTier}
                </span>
                <span
                  className={cn(
                    "text-xs font-bold px-3 py-1",
                    selectedAgent.status === "online" ? "badge-status-completed" :
                      selectedAgent.status === "in_chat" ? "badge-status-in-progress" :
                        selectedAgent.status === "away" ? "badge-status-assigned" : "badge-status-not-started"
                  )}
                >
                  Status: {selectedAgent.status.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="h-12 w-12 rounded-2xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center font-bold text-base shadow-xs">
                  {selectedAgent.avatar}
                </div>
                <div>
                  <DialogTitle className="text-xl font-extrabold text-[#111111]">
                    {selectedAgent.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 font-mono mt-0.5">
                    {selectedAgent.email} • Shift: {selectedAgent.currentShift}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#FAF9FF] border border-[#E5DEFF] text-center">
                <div>
                  <span className="text-zinc-500 font-semibold block text-[10px] uppercase">Active Queue</span>
                  <span className="text-base font-bold text-[#111111]">{selectedAgent.activeTickets} Tickets</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-semibold block text-[10px] uppercase">Solved Today</span>
                  <span className="text-base font-bold text-[#3B6600]">{selectedAgent.solvedToday} Closed</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-semibold block text-[10px] uppercase">CSAT Score</span>
                  <span className="text-base font-bold text-amber-500 flex items-center justify-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-current" /> {selectedAgent.csatScore}
                  </span>
                </div>
              </div>


              <div className="space-y-2">
                <span className="font-bold text-zinc-700 text-xs block">Assigned Domain Specialties</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.specialties.map((spec: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/25 rounded-full text-xs font-semibold"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-[#F0EDFF] flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                className="btn-support-secondary text-xs h-8.5 px-4 font-bold cursor-pointer"
                onClick={() => setSelectedAgent(null)}
              >
                Close
              </button>
              <button
                className="btn-support-primary text-xs h-8.5 px-4 gap-1.5 font-bold cursor-pointer"
                onClick={() => {
                  alert(`Direct ticket delegation initiated for ${selectedAgent.name}.`);
                  setSelectedAgent(null);
                }}
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                <span>Delegate Active Ticket</span>
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SupportAgentsPage;
