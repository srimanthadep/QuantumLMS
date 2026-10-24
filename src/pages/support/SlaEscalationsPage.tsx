import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  TrendingDown,
  CheckCircle2,
  Users,
  LifeBuoy,
  Flame,
  ArrowRight,
  RefreshCw,
  BellRing,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MetricItem } from "@/types";
import { MetricCard } from "@/components/MetricCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EscalatedTicket {
  id: string;
  ticketNumber: string;
  studentName: string;
  category: string;
  subject: string;
  priority: "high" | "medium" | "low";
  assignedAgent: string;
  slaTargetMinutes: number;
  minutesRemaining: number;
  escalationTier: "Tier 1: Desk" | "Tier 2: Senior Mentor" | "Tier 3: Academic Admin" | "Tier 4: Super Admin";
  status: "approaching_breach" | "breached" | "pending_admin";
}

const INITIAL_ESCALATIONS: EscalatedTicket[] = [
  {
    id: "tkt-1089",
    ticketNumber: "TKT-1089",
    studentName: "Devendra Patel",
    category: "Technical Support",
    subject: "Duplicate UPI debit during Cohort 8 enrollment checkout",
    priority: "high",
    assignedAgent: "Meera Sen",
    slaTargetMinutes: 30,
    minutesRemaining: 6,
    escalationTier: "Tier 3: Academic Admin",
    status: "approaching_breach",
  },
  {
    id: "tkt-1084",
    ticketNumber: "TKT-1084",
    studentName: "Rohan Verma",
    category: "Technical Support",
    subject: "GPU Jupyter Notebook instance out of CUDA memory during PyTorch lab",
    priority: "high",
    assignedAgent: "Aakash Varma",
    slaTargetMinutes: 60,
    minutesRemaining: 11,
    escalationTier: "Tier 2: Senior Mentor",
    status: "approaching_breach",
  },
  {
    id: "tkt-1083",
    ticketNumber: "TKT-1083",
    studentName: "Simran Kaur",
    category: "Account & Access Management",
    subject: "Medical pause: Requesting 30-day access validity extension",
    priority: "high",
    assignedAgent: "Nikhil Joshi",
    slaTargetMinutes: 120,
    minutesRemaining: 18,
    escalationTier: "Tier 3: Academic Admin",
    status: "approaching_breach",
  },
  {
    id: "tkt-1086",
    ticketNumber: "TKT-1086",
    studentName: "Devendra Rao",
    category: "Assignments & Assessments",
    subject: "RAG pipeline vector store query latency threshold exceeded in assignment 4",
    priority: "medium",
    assignedAgent: "Pooja Hegde",
    slaTargetMinutes: 120,
    minutesRemaining: 28,
    escalationTier: "Tier 2: Senior Mentor",
    status: "pending_admin",
  },
  {
    id: "tkt-1093",
    ticketNumber: "TKT-1093",
    studentName: "Siddharth Joshi",
    category: "Assignments & Assessments",
    subject: "University semester examinations conflict: Request 15-day milestone deferral",
    priority: "high",
    assignedAgent: "Nikhil Joshi",
    slaTargetMinutes: 180,
    minutesRemaining: 34,
    escalationTier: "Tier 3: Academic Admin",
    status: "pending_admin",
  },
  {
    id: "tkt-1096",
    ticketNumber: "TKT-1096",
    studentName: "Neha Gupta",
    category: "Live Classes & Attendance",
    subject: "Attendance record not synced for Session 12 on Fine-tuning LoRA Models",
    priority: "medium",
    assignedAgent: "Nikhil Joshi",
    slaTargetMinutes: 240,
    minutesRemaining: 82,
    escalationTier: "Tier 2: Senior Mentor",
    status: "pending_admin",
  },
  {
    id: "tkt-1082",
    ticketNumber: "TKT-1082",
    studentName: "Arjun Mehta",
    category: "Account & Access Management",
    subject: "Requesting move from Weekday Evening to Weekend Intensive cohort",
    priority: "medium",
    assignedAgent: "Nikhil Joshi",
    slaTargetMinutes: 360,
    minutesRemaining: 145,
    escalationTier: "Tier 2: Senior Mentor",
    status: "pending_admin",
  },
  {
    id: "tkt-1085",
    ticketNumber: "TKT-1085",
    studentName: "Ananya Sharma",
    category: "Course & Content Management",
    subject: "Course materials zip bundle checksum hash mismatch in Module 3",
    priority: "medium",
    assignedAgent: "Meera Sen",
    slaTargetMinutes: 240,
    minutesRemaining: 155,
    escalationTier: "Tier 2: Senior Mentor",
    status: "pending_admin",
  },
  {
    id: "tkt-1094",
    ticketNumber: "TKT-1094",
    studentName: "Aditi Roy",
    category: "Account & Access Management",
    subject: "Request to upgrade from Self-Paced Replay-Only to Live Synchronous Cohort",
    priority: "medium",
    assignedAgent: "Nikhil Joshi",
    slaTargetMinutes: 360,
    minutesRemaining: 210,
    escalationTier: "Tier 2: Senior Mentor",
    status: "pending_admin",
  },
  {
    id: "tkt-1077",
    ticketNumber: "TKT-1077",
    studentName: "Ananya Deshmukh",
    category: "Technical Support",
    subject: "Lecture 9 live stream video blackscreen error on Linux Brave browser",
    priority: "high",
    assignedAgent: "Aakash Varma",
    slaTargetMinutes: 120,
    minutesRemaining: -12,
    escalationTier: "Tier 4: Super Admin",
    status: "breached",
  },
];

export const SlaEscalationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [escalations, setEscalations] = useState<EscalatedTicket[]>(INITIAL_ESCALATIONS);
  const [filterTier, setFilterTier] = useState("all");

  const filtered = escalations.filter((t) => {
    if (filterTier !== "all" && !t.escalationTier.includes(filterTier)) return false;
    return true;
  });

  const breachedCount = escalations.filter((e) => e.status === "breached").length;
  const atRiskCount = escalations.filter((e) => e.status === "approaching_breach").length;
  const adminEscalatedCount = escalations.filter((e) => e.escalationTier.includes("Admin")).length;

  const handleEscalateHigher = (id: string) => {
    setEscalations((prev) =>
      prev.map((tkt) => {
        if (tkt.id === id) {
          return {
            ...tkt,
            escalationTier: "Tier 4: Super Admin",
            minutesRemaining: Math.max(tkt.minutesRemaining, 30),
          };
        }
        return tkt;
      })
    );
    alert(`Ticket ${id} escalated to Super Admin queue with executive priority tag.`);
  };

  const kpis: MetricItem[] = [
    {
      icon: "check-circle",
      label: "Overall SLA Adherence",
      value: "96.8%",
      trend: "+1.4% vs target",
      tone: "lime",
    },
    {
      icon: "fire",
      label: "Tickets At Risk (< 20m)",
      value: `${atRiskCount}`,
      trend: "Urgent dispatch",
      tone: "pink",
    },
    {
      icon: "shield",
      label: "Escalated to Admin",
      value: `${adminEscalatedCount}`,
      trend: "Pending auth",
      tone: "yellow",
    },
    {
      icon: "clock",
      label: "Avg Breach Recovery",
      value: "14 mins",
      trend: "Rapid triage active",
      tone: "lavender",
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 support-page-font h-full">
      {/* 1. KPI Stats (Canonical Folder-Tab Cards with 8px Gap) */}
      <div className="metrics-grid shrink-0">
        {kpis.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* 2. SLA Tiers Adherence Breakdown in 8px grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        <div className="p-3 rounded-2xl border border-zinc-150 bg-white shadow-xs space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-[#111111] flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-[#905FEB] animate-pulse" />
              P1 High (30 Mins)
            </span>
            <span className="badge-status-completed text-[9px] font-bold px-2 py-0.5">100%</span>
          </div>
          <p className="text-lg font-bold text-[#111111] tracking-tight leading-none">12m avg</p>
          <div className="progress-bar-track">
            <div className="progress-bar-fill-purple" style={{ width: "100%" }} />
          </div>
          <p className="text-[10px] text-zinc-500 font-medium truncate">Double charges &amp; live stream cutoffs</p>
        </div>

        <div className="p-3 rounded-2xl border border-zinc-150 bg-white shadow-xs space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-[#111111] flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-[#AEEB00]" />
              P2 High (2 Hours)
            </span>
            <span className="badge-status-assigned text-[9px] font-bold px-2 py-0.5">94.2%</span>
          </div>
          <p className="text-lg font-bold text-[#111111] tracking-tight leading-none">58m avg</p>
          <div className="progress-bar-track">
            <div className="progress-bar-fill-lime" style={{ width: "94.2%" }} />
          </div>
          <p className="text-[10px] text-zinc-500 font-medium truncate">Validity extensions &amp; 2FA lockouts</p>
        </div>

        <div className="p-3 rounded-2xl border border-zinc-150 bg-white shadow-xs space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-[#111111] flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-[#905FEB]" />
              P3 Medium (6 Hours)
            </span>
            <span className="badge-status-in-progress text-[9px] font-bold px-2 py-0.5">98.5%</span>
          </div>
          <p className="text-lg font-bold text-[#111111] tracking-tight leading-none">2.4h avg</p>
          <div className="progress-bar-track">
            <div className="progress-bar-fill-purple" style={{ width: "98.5%" }} />
          </div>
          <p className="text-[10px] text-zinc-500 font-medium truncate">Batch transfers &amp; schedule clashes</p>
        </div>

        <div className="p-3 rounded-2xl border border-zinc-150 bg-white shadow-xs space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-[#111111] flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-[#AEEB00]" />
              P4 Low (24 Hours)
            </span>
            <span className="badge-status-completed text-[9px] font-bold px-2 py-0.5">99.8%</span>
          </div>
          <p className="text-lg font-bold text-[#111111] tracking-tight leading-none">8.2h avg</p>
          <div className="progress-bar-track">
            <div className="progress-bar-fill-lime" style={{ width: "99.8%" }} />
          </div>
          <p className="text-[10px] text-zinc-500 font-medium truncate">General questions &amp; certificates</p>
        </div>
      </div>

      {/* 3. Escalation Queue Panel */}
      <div className="panel bg-white border border-zinc-150 flex flex-col flex-1 min-h-0 overflow-hidden relative">
        <div className="card-header px-5 py-3 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 mb-0">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-[#111111]">
                Active SLA Countdown Queue
              </CardTitle>

            </div>
            <CardDescription className="text-xs text-zinc-500 mt-0.5">
              Live tickets prioritized by remaining resolution window ({filtered.length} total active).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-full sm:w-[210px] h-8 text-xs rounded-full border border-[#E5DEFF] bg-white text-[#111111] font-medium shadow-2xs hover:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20">
                <SelectValue placeholder="All Escalation Tiers" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-2xl border border-[#E5DEFF] bg-white text-[#111111] shadow-xl min-w-[210px]">
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#905FEB]" />
                    <span>All Escalation Tiers</span>
                  </div>
                </SelectItem>
                <SelectItem value="Tier 2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#AEEB00]" />
                    <span>Tier 2: Senior Mentor</span>
                  </div>
                </SelectItem>
                <SelectItem value="Tier 3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#905FEB]" />
                    <span>Tier 3: Academic Admin</span>
                  </div>
                </SelectItem>
                <SelectItem value="Tier 4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span>Tier 4: Super Admin</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent
          className="p-0 divide-y divide-[#F0EDFF] bg-white flex-1 min-h-0 overflow-y-auto scroll-smooth support-queue-scrollbar"
        >
          {filtered.map((tkt) => {
            const isBreached = tkt.minutesRemaining <= 0;
            const isCritical = tkt.minutesRemaining > 0 && tkt.minutesRemaining <= 20;

            return (
              <div
                key={tkt.id}
                className="px-4 py-2.5 sm:px-5 sm:py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white hover:bg-[#F0EDFF]/30 transition-colors"
              >
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[#7042D2] bg-[#F0EDFF] px-2.5 py-0.5 rounded-full border border-[#905FEB]/30">
                      {tkt.ticketNumber}
                    </span>
                    <span className="text-xs text-zinc-300">•</span>
                    <span className="text-xs font-bold text-[#111111]">
                      {tkt.studentName}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-semibold border-[#E5DEFF] text-zinc-700 bg-white rounded-full">
                      {tkt.category}
                    </Badge>
                    <span
                      className={`text-[10px] font-bold ${
                        tkt.priority === "high"
                          ? "badge-status-assigned text-[10px] px-2 py-0.5"
                          : tkt.priority === "medium"
                            ? "badge-status-in-progress text-[10px] px-2 py-0.5"
                            : "badge-status-not-started text-[10px] px-2 py-0.5"
                      }`}
                    >
                      {tkt.priority.toUpperCase()}
                    </span>
                  </div>

                  <Link to={`/support/ticket/${tkt.id}`} className="group block">
                    <h4 className="text-xs sm:text-sm font-bold text-[#111111] leading-snug group-hover:text-[#905FEB] transition-colors">
                      {tkt.subject}
                    </h4>
                  </Link>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#111111]/70 font-medium">
                    <span>Assigned: <strong className="text-[#111111]">{tkt.assignedAgent}</strong></span>
                    <span>Current Escalation: <strong className="text-[#7042D2] font-bold">{tkt.escalationTier}</strong></span>
                  </div>
                </div>

                {/* Countdown & Actions */}
                <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-1 lg:pt-0">
                  <div className="text-left lg:text-right">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                      SLA Countdown
                    </p>
                    <div
                      className={`text-sm font-extrabold font-mono flex items-center lg:justify-end gap-1 ${isBreached
                        ? "text-red-600 animate-pulse"
                        : isCritical
                          ? "text-[#B45309] animate-pulse"
                          : "text-[#3B6600]"
                        }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {isBreached
                        ? `BREACHED (-${Math.abs(tkt.minutesRemaining)}m)`
                        : `${tkt.minutesRemaining}m remaining`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="btn-support-secondary text-xs h-8 px-3.5 gap-1 font-bold cursor-pointer"
                      onClick={() => handleEscalateHigher(tkt.id)}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Escalate
                    </button>

                    <Link to={`/support/ticket/${tkt.id}`}>
                      <button className="btn-support-primary text-xs h-8 px-4 gap-1.5 font-bold cursor-pointer">
                        Open Ticket <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </div>
    </div>
  );
};

export default SlaEscalationsPage;
