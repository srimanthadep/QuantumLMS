import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  LifeBuoy,
  Users,
  Award,
  ArrowUpRight,
  ChevronRight,
  MessageSquare,
  BarChart2,
  Star,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Layers,
  HelpCircle,
  FileText,
  Activity,
  Tag,
  Trash2,
  Edit3,
  BookOpen,
  FolderGit2,
  Cpu,
  GraduationCap,
  Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { MetricItem } from "@/types";
import { MetricCard } from "@/components/MetricCard";
import { cn } from "@/lib/utils";
import { getAllSupportTickets, SUPPORT_CATEGORIES } from "./supportTicketsData";
import "./supportTheme.css";

interface MentorPerformance {
  id: string;
  name: string;
  role: string;
  avatar: string;
  resolvedCount: number;
  rating: number;
  status: "online" | "in_chat" | "away";
  statusLabel: string;
  tierBadge: string;
  statusBadgeType: "completed" | "in-progress" | "assigned";
}

const TOP_MENTORS: MentorPerformance[] = [
  {
    id: "m-1",
    name: "Nikhil Joshi",
    role: "Lead Student Mentor",
    avatar: "NJ",
    resolvedCount: 78,
    rating: 4.94,
    status: "online",
    statusLabel: "Online",
    tierBadge: "Tier 1 Support",
    statusBadgeType: "completed",
  },
  {
    id: "m-2",
    name: "Aakash Varma",
    role: "Senior Technical Mentor",
    avatar: "AV",
    resolvedCount: 65,
    rating: 4.96,
    status: "in_chat",
    statusLabel: "In Live Chat",
    tierBadge: "Senior Technical Mentor",
    statusBadgeType: "in-progress",
  },
  {
    id: "m-3",
    name: "Meera Sen",
    role: "Escalations Lead",
    avatar: "MS",
    resolvedCount: 42,
    rating: 4.98,
    status: "online",
    statusLabel: "Online",
    tierBadge: "Escalations Lead",
    statusBadgeType: "completed",
  },
  {
    id: "m-4",
    name: "Ankita Mukhopadhyay",
    role: "Academic Counselor",
    avatar: "AM",
    resolvedCount: 54,
    rating: 4.88,
    status: "away",
    statusLabel: "Away",
    tierBadge: "Tier 1 Support",
    statusBadgeType: "assigned",
  },
  {
    id: "m-5",
    name: "Rahul Sharma",
    role: "Technical Doubts Support",
    avatar: "RS",
    resolvedCount: 49,
    rating: 4.85,
    status: "online",
    statusLabel: "Online",
    tierBadge: "Senior Technical Mentor",
    statusBadgeType: "completed",
  },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Account & Access Management": Users,
  "Course & Content Management": BookOpen,
  "Assignments & Assessments": FileText,
  "Live Classes & Attendance": Activity,
  "Technical Support": Cpu,
  "Communication & Notifications": Bell,
  "Others": HelpCircle,
  "General Help & Feedback": HelpCircle,
};

export const SupportAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const tickets = getAllSupportTickets();

  // Progress Bar color cycle directly from Figma tokens:
  // 1. Primary Purple: #905FEB
  // 2. Secondary Lime: #AEEB00
  // 3. Accent Pink: #F472B6
  // 4. Deep Purple: #7042D2
  // 5. Warm Amber: #F59E0B
  // 6. Vibrant Rose: #EC4899
  // 7. Neutral Slate: #64748B
  const categoryFigmaColors = [
    { bg: "#905FEB", labelColor: "text-[#7042D2]", badge: "badge-status-in-progress" },
    { bg: "#AEEB00", labelColor: "text-[#3B6600]", badge: "badge-status-completed" },
    { bg: "#F472B6", labelColor: "text-[#BE185D]", badge: "badge-status-assigned" },
    { bg: "#7042D2", labelColor: "text-[#5B21B6]", badge: "badge-status-in-progress" },
    { bg: "#F59E0B", labelColor: "text-[#B45309]", badge: "badge-status-assigned" },
    { bg: "#EC4899", labelColor: "text-[#9D174D]", badge: "badge-status-assigned" },
    { bg: "#64748B", labelColor: "text-[#334155]", badge: "badge-status-not-started" },
  ];

  const categoryStats = SUPPORT_CATEGORIES.map((cat, idx) => {
    const count = tickets.filter((t) => t.category === cat.id).length;
    const percent = tickets.length > 0 ? Math.round((count / tickets.length) * 100) : 0;
    const colorScheme = categoryFigmaColors[idx % categoryFigmaColors.length];
    const IconComponent = CATEGORY_ICONS[cat.id] || HelpCircle;
    return {
      ...cat,
      count,
      percent,
      colorHex: colorScheme.bg,
      labelColor: colorScheme.labelColor,
      badgeClass: colorScheme.badge,
      icon: IconComponent,
    };
  });

  const kpis: MetricItem[] = [
    {
      icon: "clock",
      label: "Avg First Reply",
      value: "14 mins",
      trend: "-6 mins vs SLA",
      tone: "pink",
    },
    {
      icon: "check-circle",
      label: "SLA Adherence",
      value: "96.8%",
      trend: "+1.2% this week",
      tone: "lime",
    },
    {
      icon: "mail",
      label: "Resolved Tickets",
      value: "184",
      trend: "+28% vs previous",
      tone: "lavender",
    },
    {
      icon: "star",
      label: "CSAT Satisfaction",
      value: "4.94 / 5.0",
      trend: "98.4% positive",
      tone: "yellow",
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 support-page-font h-full">
      {/* 1. KPI Stats Grid (Canonical Folder-Tab Cards with 8px Gap) */}
      <div className="metrics-grid shrink-0">
        {kpis.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* 2. Operations & Timeframe Toolbar */}
      <div className="panel px-4 py-2 bg-white border border-zinc-150 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-900 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Support Velocity &amp; SLA Trends</span>
          </span>
          <span className="text-zinc-300">|</span>
          <span className="text-xs text-zinc-500">Live Telemetry · 342 Reviews Analyzed</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe pill tabs */}
          <div className="flex items-center p-0.5 rounded-full bg-zinc-50 border border-zinc-200">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer",
                  timeRange === r
                    ? "bg-[#111111] text-white shadow-2xs"
                    : "text-zinc-500 hover:text-[#111111]"
                )}
              >
                {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-support-primary text-xs h-7.5 px-3.5 gap-1.5 font-bold cursor-pointer"
            onClick={() => alert("Monthly Support & SLA Performance Report (PDF) generated.")}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 3. Primary Analytics Grid (8px gap) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0">
        {/* Inquiry Category Breakdown Card (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-2 h-full min-h-0">
          <div className="panel bg-white border border-zinc-150 overflow-hidden flex flex-col h-full min-h-0 justify-between">
            {/* Top Purple Gradient Strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#905FEB] via-[#824FE7] to-[#A87DF5] shadow-xs" />

            <CardHeader className="p-4 sm:p-5 border-b border-[#F0EDFF] flex flex-row items-center justify-between bg-white shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base sm:text-lg font-extrabold text-[#111111] tracking-tight">
                    Inquiry Category Breakdown
                  </CardTitle>
                  <span className="badge-status-in-progress rounded-full text-[10px] font-bold px-2.5 py-0.5 shadow-2xs">
                    {tickets.length} Active Tickets
                  </span>

                </div>
                <CardDescription className="text-xs text-zinc-500 font-medium mt-0.5">
                  Volume percentage and progress distributions across support domains over {timeRange}.
                </CardDescription>
              </div>
              <button
                type="button"
                className="btn-support-secondary rounded-full text-xs h-7.5 px-3 font-bold cursor-pointer flex items-center gap-1 shadow-2xs"
                onClick={() => navigate("/support/tickets")}
              >
                <span>View Queue</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 flex-1 min-h-0 bg-white overflow-hidden flex flex-col">
              {/* Category Breakdown Items with Smooth Scroll & Figma Pill Progress Bars */}
              <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2.5 support-queue-scrollbar">
                {categoryStats.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="space-y-2">
                      {/* Header Row: Icon, Category Name, Ticket Count */}
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
                            style={{
                              backgroundColor: `${item.colorHex}18`,
                              color: item.colorHex,
                            }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[#111111] font-bold text-xs sm:text-sm">
                            {item.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500 font-mono font-medium">
                            {item.count} tickets
                          </span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5", item.badgeClass)}>
                            {item.percent > 20 ? "High" : item.percent > 10 ? "Medium" : "Normal"}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar Row from Figma: Rounded Pill Track + Fill + Bold % */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3.5 rounded-full bg-[#F2F4F7] p-0.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out shadow-xs"
                            style={{
                              backgroundColor: item.colorHex,
                              width: `${Math.max(item.percent, item.count > 0 ? 6 : 0)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-extrabold text-[#111111] font-mono min-w-[38px] text-right">
                          {item.percent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </div>
        </div>

        {/* Mentor Performance Leaderboard (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-2 h-full min-h-0">
          <div className="panel bg-white border border-zinc-150 overflow-hidden flex flex-col h-full min-h-0 justify-between">
            {/* Top Lavender Gradient Strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#905FEB] via-[#B89CF5] to-[#E5DEFF] shadow-xs" />

            <CardHeader className="p-4 sm:p-5 border-b border-[#F0EDFF] flex flex-row items-center justify-between bg-white shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base sm:text-lg font-extrabold text-[#111111] tracking-tight">
                    Mentor Team Performance
                  </CardTitle>

                </div>
                <CardDescription className="text-xs text-zinc-500 font-medium mt-0.5">
                  Active team members handling learner inquiries and batch shifts.
                </CardDescription>
              </div>
              <button
                type="button"
                className="btn-support-secondary text-xs h-7.5 px-3 font-bold cursor-pointer flex items-center gap-1"
                onClick={() => navigate("/support/agents")}
              >
                <span>View Directory</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-[#F0EDFF] bg-white flex-1 min-h-0 overflow-y-auto support-queue-scrollbar">
              {TOP_MENTORS.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9FF] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="h-10 w-10 rounded-2xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center font-bold text-xs shadow-xs">
                        {m.avatar}
                      </div>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white",
                          m.status === "online" ? "bg-[#AEEB00] animate-pulse" :
                            m.status === "in_chat" ? "bg-[#905FEB] animate-pulse" : "bg-amber-400"
                        )}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#111111]">{m.name}</h4>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5",
                            m.statusBadgeType === "completed"
                              ? "badge-status-completed"
                              : m.statusBadgeType === "in-progress"
                                ? "badge-status-in-progress"
                                : "badge-status-assigned"
                          )}
                        >
                          {m.statusLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-medium mt-0.5">{m.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3.5">
                    <div className="text-left sm:text-right text-xs">
                      <span className="font-bold text-[#111111] block">{m.resolvedCount} Resolved</span>
                      <span className="flex items-center gap-1 text-amber-500 font-bold text-[11px]">
                        <Star className="h-3 w-3 fill-current" /> {m.rating} CSAT
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="btn-support-secondary text-[11px] h-7.5 px-3 font-bold cursor-pointer flex items-center gap-1"
                        onClick={() => navigate("/support/agents")}
                      >
                        <LifeBuoy className="h-3 w-3 text-[#905FEB]" />
                        <span>Delegate</span>
                      </button>

                      <button
                        type="button"
                        className="action-icon-lavender w-7.5 h-7.5 rounded-full cursor-pointer shrink-0"
                        onClick={() => navigate("/support/live-chat")}
                        title={`Direct chat with ${m.name}`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportAnalyticsPage;
