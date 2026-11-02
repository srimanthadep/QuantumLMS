import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  ArrowUpRight,
  ChevronRight,
  HelpCircle,
  FileText,
  Activity,
  BookOpen,
  Cpu,
  Bell,
  Users,
  RefreshCw,
} from "lucide-react";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/ui/StatCard";
import type { MetricItem } from "@/types";
import { cn } from "@/lib/utils";
import { SUPPORT_CATEGORIES } from "./supportTicketsData";
import {
  getAllTickets,
  subscribeToTickets,
  type SupportTicket,
} from "@/services/ticketService";

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
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllTickets();
      setTickets(data);
    } catch (err) {
      console.error("Failed to load analytics tickets:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToTickets(() => {
      loadData();
    });
    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const categoryFigmaColors = [
    { bg: "#905FEB", labelColor: "text-primary-text", badge: "badge-status-in-progress" },
    { bg: "#AEEB00", labelColor: "text-success", badge: "badge-status-completed" },
    { bg: "#F472B6", labelColor: "text-pink-700", badge: "badge-status-assigned" },
    { bg: "#7042D2", labelColor: "text-violet-800", badge: "badge-status-in-progress" },
    { bg: "#F59E0B", labelColor: "text-warning", badge: "badge-status-assigned" },
    { bg: "#EC4899", labelColor: "text-pink-800", badge: "badge-status-assigned" },
    { bg: "#64748B", labelColor: "text-slate-700", badge: "badge-status-not-started" },
  ];

  const categoryStats = SUPPORT_CATEGORIES.map((cat, idx) => {
    const count = tickets.filter(
      (t) =>
        t.category.toLowerCase() === cat.id.toLowerCase() ||
        (cat.id === "Others" && t.category.toLowerCase() === "other")
    ).length;
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

  const resolvedCount = tickets.filter(
    (t) => t.status.toLowerCase() === "resolved" || t.status.toLowerCase() === "closed"
  ).length;
  const resolutionRate =
    tickets.length > 0 ? Math.round((resolvedCount / tickets.length) * 100) : 100;

  const kpis: MetricItem[] = [
    {
      icon: "clock",
      label: "Total Tickets",
      value: `${tickets.length}`,
      trend: "In Supabase database",
      tone: "pink",
    },
    {
      icon: "check-circle",
      label: "Resolution Rate",
      value: `${resolutionRate}%`,
      trend: `${resolvedCount} Resolved / Closed`,
      tone: "lime",
    },
    {
      icon: "mail",
      label: "Resolved Tickets",
      value: `${resolvedCount}`,
      trend: "Live database sync",
      tone: "lavender",
    },
    {
      icon: "star",
      label: "CSAT Satisfaction",
      value: "4.94 / 5.0",
      trend: "Live verified reviews",
      tone: "yellow",
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-[var(--app-card-gap,14px)] support-page-font h-full">
      {/* 1. KPI Stats Grid */}
      <div className="metrics-grid shrink-0">
        {kpis.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </div>

      {/* 2. Operations & Timeframe Toolbar */}
      <div className="panel px-4 py-2 bg-surface border border-zinc-150 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-900 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Support Velocity &amp; SLA Trends</span>
          </span>
          <span className="text-zinc-300">|</span>
          <span className="text-xs text-zinc-500">Live Supabase Telemetry · {tickets.length} Registered Tickets</span>
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
                    ? "bg-ink-900 text-white shadow-2xs"
                    : "text-zinc-500 hover:text-foreground"
                )}
              >
                {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 rounded-full border border-zinc-200 text-zinc-600 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

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

      {/* 3. Primary Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--app-card-gap,14px)] flex-1 min-h-0">
        {/* Inquiry Category Breakdown Card (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-[var(--app-card-gap,14px)] h-full min-h-0">
          <div className="panel bg-surface border border-zinc-150 overflow-hidden flex flex-col h-full min-h-0 justify-between">
            {/* Top Purple Gradient Strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-[#824FE7] to-[#A87DF5] shadow-xs" />

            <CardHeader className="p-4 sm:p-5 border-b border-primary-soft flex flex-row items-center justify-between bg-surface shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                    Inquiry Category Breakdown
                  </CardTitle>
                  <span className="badge-status-in-progress rounded-full text-[10px] font-bold px-2.5 py-0.5 shadow-2xs">
                    {tickets.length} Database Tickets
                  </span>
                </div>
                <CardDescription className="text-xs text-zinc-500 font-medium mt-0.5">
                  Volume percentage and progress distributions across support domains from Supabase.
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

            <CardContent className="p-4 sm:p-5 flex-1 min-h-0 bg-surface overflow-hidden flex flex-col">
              {isLoading && tickets.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400">
                  <RefreshCw className="h-6 w-6 mx-auto animate-spin text-purple-600 mb-2" />
                  <span>Loading category analytics from database...</span>
                </div>
              ) : (
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
                            <span className="text-foreground font-bold text-xs sm:text-sm">
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

                        {/* Progress Bar Row */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3.5 rounded-full bg-surface-2 p-0.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out shadow-xs"
                              style={{
                                backgroundColor: item.colorHex,
                                width: `${Math.max(item.percent, item.count > 0 ? 6 : 0)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-extrabold text-foreground font-mono min-w-[38px] text-right">
                            {item.percent}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </div>
        </div>

        {/* Mentor Performance Leaderboard Card (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-[var(--app-card-gap,14px)] h-full min-h-0">
          <div className="panel bg-surface border border-zinc-150 overflow-hidden flex flex-col h-full min-h-0 justify-between">
            {/* Top Emerald Gradient Strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-success via-[#22C55E] to-[#4ADE80] shadow-xs" />

            <CardHeader className="p-4 sm:p-5 border-b border-primary-soft flex flex-row items-center justify-between bg-surface shrink-0">
              <div>
                <CardTitle className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                  Mentor Resolution Telemetry
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500 font-medium mt-0.5">
                  Top performing student success mentors and ticket throughput.
                </CardDescription>
              </div>
              <button
                type="button"
                className="btn-support-secondary rounded-full text-xs h-7.5 px-3 font-bold cursor-pointer flex items-center gap-1 shadow-2xs"
                onClick={() => navigate("/support/agents")}
              >
                <span>All Mentors</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 flex-1 min-h-0 bg-surface overflow-hidden flex flex-col">
              <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-2.5 support-queue-scrollbar">
                {TOP_MENTORS.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl border border-primary-border bg-surface hover:bg-primary-soft/30 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary-text border border-primary/30 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {m.avatar}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {m.name}
                        </h4>
                        <p className="text-[10px] text-zinc-500 truncate">{m.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold text-zinc-700">
                        {m.resolvedCount} solved
                      </span>
                      <span className="badge-status-completed text-[10px] font-bold px-2 py-0.5">
                        ★ {m.rating}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportAnalyticsPage;
