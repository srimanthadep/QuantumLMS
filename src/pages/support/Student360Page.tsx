import React, { useState } from "react";
import {
  Users,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  BookOpen,
  HelpCircle,
  TrendingUp,
  MessageSquare,
  User,
  Star,
  ShieldAlert,
  ArrowRight,
  Flame,
  LifeBuoy,
  ArrowRightLeft,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { MetricItem } from "@/types";
import { MetricCard } from "@/components/MetricCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import "./supportTheme.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";

interface LearnerSummary {
  id: string;
  name: string;
  email: string;
  avatar: string;
  enrolledBatch: string;
  courseTitle: string;
  progressPercent: number;
  attendancePercent: number;
  doubtsAsked: number;
  status: "active" | "at_risk" | "paused";
  joinedDate: string;
  satisfactionRating: number;
}

const LEARNERS: LearnerSummary[] = [
  {
    id: "usr-student-1",
    name: "Arjun Mehta",
    email: "arjun.m@learner.ai",
    avatar: "AM",
    enrolledBatch: "Cohort 7 (Live + Replay)",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    progressPercent: 78,
    attendancePercent: 92,
    doubtsAsked: 4,
    status: "active",
    joinedDate: "01 Sep 2026",
    satisfactionRating: 5.0,
  },
  {
    id: "usr-student-2",
    name: "Pooja Hegde",
    email: "pooja.h@example.com",
    avatar: "PH",
    enrolledBatch: "Agentic Systems Bootcamp",
    courseTitle: "Autonomous Multi-Agent Architectures",
    progressPercent: 85,
    attendancePercent: 88,
    doubtsAsked: 2,
    status: "active",
    joinedDate: "15 Sep 2026",
    satisfactionRating: 4.9,
  },
  {
    id: "usr-student-3",
    name: "Rohan Nair",
    email: "rohan.n@tech.io",
    avatar: "RN",
    enrolledBatch: "Cohort 7 (Live + Replay)",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    progressPercent: 62,
    attendancePercent: 75,
    doubtsAsked: 3,
    status: "active",
    joinedDate: "01 Sep 2026",
    satisfactionRating: 4.8,
  },
  {
    id: "usr-student-5",
    name: "Simran Kaur",
    email: "simran.k@example.com",
    avatar: "SK",
    enrolledBatch: "Cohort 8 (Replay Only)",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    progressPercent: 44,
    attendancePercent: 60,
    doubtsAsked: 1,
    status: "at_risk",
    joinedDate: "01 Oct 2026",
    satisfactionRating: 4.5,
  },
  {
    id: "usr-student-6",
    name: "Devendra Patel",
    email: "dev.patel@tech.in",
    avatar: "DP",
    enrolledBatch: "Cohort 8 (Replay Only)",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    progressPercent: 30,
    attendancePercent: 45,
    doubtsAsked: 2,
    status: "at_risk",
    joinedDate: "10 Oct 2026",
    satisfactionRating: 4.7,
  },
  {
    id: "usr-student-7",
    name: "Ananya Deshmukh",
    email: "ananya.d@cloud.org",
    avatar: "AD",
    enrolledBatch: "Diffusion Models & Vision",
    courseTitle: "Diffusion Models & Generative Vision",
    progressPercent: 92,
    attendancePercent: 96,
    doubtsAsked: 5,
    status: "active",
    joinedDate: "05 Sep 2026",
    satisfactionRating: 5.0,
  },
];

export const Student360Page: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<LearnerSummary | null>(null);
  const [accommodationMsg, setAccommodationMsg] = useState<string | null>(null);

  const filtered = LEARNERS.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.enrolledBatch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    return true;
  });

  const activeCount = LEARNERS.filter((l) => l.status === "active").length;
  const atRiskCount = LEARNERS.filter((l) => l.status === "at_risk").length;

  const kpis: MetricItem[] = [
    {
      icon: "users",
      label: "Total Customers",
      value: "340",
      trend: "+28 enrollments",
      tone: "lavender",
    },
    {
      icon: "check-circle",
      label: "Active Students",
      value: `${activeCount}`,
      trend: "92% attendance",
      tone: "lime",
    },
    {
      icon: "fire",
      label: "At-Risk Learners",
      value: `${atRiskCount}`,
      trend: "Needs attention",
      tone: "pink",
    },
    {
      icon: "star",
      label: "Avg Customer CSAT",
      value: "4.86 / 5.0",
      trend: "96.2% satisfaction",
      tone: "yellow",
    },
  ];

  return (
    <div className="flex flex-col gap-2 support-page-font">
      {/* 1. KPI Stats Grid (Canonical 132px Folder-Tab Cards with 8px Gap) */}
      <div className="metrics-grid">
        {kpis.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* 2. Search and Filters Bar */}
      <div className="panel p-3.5 bg-white border border-zinc-150">
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#905FEB]" />
            <Input
              placeholder="Search students, emails, or courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-full border border-[#E5DEFF] bg-white text-[#111111] placeholder:text-zinc-400 focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[195px] h-9 text-xs rounded-full border border-[#E5DEFF] bg-white text-[#111111] font-medium shadow-2xs hover:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20">
                <SelectValue placeholder="All Customer Statuses" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-2xl border border-[#E5DEFF] bg-white text-[#111111] shadow-xl min-w-[200px]">
                <SelectItem value="all">All Customer Statuses</SelectItem>
                <SelectItem value="active">Active Enrolled</SelectItem>
                <SelectItem value="at_risk">At-Risk Learners</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs text-zinc-500 whitespace-nowrap hidden sm:inline">
              Showing {filtered.length} of {LEARNERS.length} customers
            </span>
          </div>
        </div>
      </div>

      {/* 3. Dedicated Scrollable Container with 8px Gap */}
      <div className="flex-1 min-h-0 support-sleek-scroll pr-1 pb-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center bg-white panel p-8">
            <Users className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#111111]">No customers or learners found</p>
            <p className="text-xs text-zinc-500 mt-1">Try resetting the search query or status filter.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="mt-3 text-xs rounded-full border-[#905FEB]/30 text-[#7042D2] hover:bg-[#F0EDFF] cursor-pointer"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filtered.map((learner) => (
              <div
                key={learner.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedStudent(learner)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedStudent(learner);
                  }
                }}
                className="panel group relative bg-white border border-[#E5DEFF] hover:border-[#905FEB]/70 shadow-xs hover:shadow-lg flex flex-col justify-between cursor-pointer overflow-hidden transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-[#905FEB]/40"
              >
                {/* Top Full #905FEB Strip */}
                <div className="h-1.5 w-full bg-[#905FEB] shadow-xs transition-all duration-200 group-hover:h-2" />

                <div className="p-4 border-b border-[#F0EDFF] flex flex-row items-center justify-between pb-3 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center font-bold text-xs shadow-xs transition-all duration-200 group-hover:scale-105 group-hover:border-[#905FEB] group-hover:ring-2 group-hover:ring-[#905FEB]/20">
                      {learner.avatar}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#111111] leading-snug group-hover:text-[#905FEB] transition-colors duration-150">
                        {learner.name}
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-mono">{learner.email}</p>
                    </div>
                  </div>

                  {learner.status === "active" ? (
                    <span className="bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 rounded-full text-[10px] font-bold px-2.5 py-0.5">
                      Active
                    </span>
                  ) : (
                    <span className="bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/40 rounded-full text-[10px] font-bold px-2.5 py-0.5">
                      At-Risk
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-3.5 text-xs flex-1 flex flex-col justify-between bg-white">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Enrolled Program
                    </span>
                    <p className="font-semibold text-[#111111] text-xs leading-snug">
                      {learner.courseTitle}
                    </p>
                    <p className="text-[11px] text-[#7042D2] font-medium">
                      {learner.enrolledBatch}
                    </p>
                  </div>

                  {/* Progress metrics matching Figma progress bars */}
                  <div className="space-y-2 pt-1 border-t border-[#F0EDFF]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Course Completion</span>
                        <span className="font-bold text-[#111111]">{learner.progressPercent}%</span>
                      </div>
                      <div className="progress-bar-track">
                        <div
                          className="progress-bar-fill-purple"
                          style={{ width: `${learner.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Live Attendance</span>
                        <span className={`font-bold ${learner.attendancePercent < 65 ? "text-red-500" : "text-[#3B6600]"}`}>
                          {learner.attendancePercent}%
                        </span>
                      </div>
                      <div className="progress-bar-track">
                        <div
                          className="progress-bar-fill-lime"
                          style={{ width: `${learner.attendancePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metrics Box */}
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-[#FAF9FF] border border-[#E5DEFF] text-center text-[11px] transition-colors duration-200 group-hover:bg-[#F5F2FF] group-hover:border-[#E5DEFF]/80">
                    <div>
                      <span className="text-zinc-500 text-[10px] block font-medium">Doubts Asked</span>
                      <span className="font-bold text-[#111111]">{learner.doubtsAsked}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[10px] block font-medium">CSAT Rating</span>
                      <span className="font-bold text-[#111111] flex items-center justify-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {learner.satisfactionRating}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Actions matching SupportAgents / Figma */}
                  <div className="pt-2 border-t border-[#F0EDFF] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudent(learner);
                      }}
                      className="btn-support-primary flex-1 gap-1.5 text-xs font-bold h-8.5 rounded-full cursor-pointer justify-center transition-all duration-150 group-hover:bg-[#7D46E7] group-hover:shadow-md"
                    >
                      <span>Inspect 360° Profile</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                    <Link
                      to="/support/live-chat"
                      onClick={(e) => e.stopPropagation()}
                      title="Open direct live chat with learner"
                    >
                      <button
                        type="button"
                        className="action-icon-lavender w-8.5 h-8.5 rounded-full cursor-pointer shrink-0 transition-all duration-150 hover:scale-110 hover:bg-[#E2DBFC] active:scale-95"
                        title="Direct Live Chat"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-[#7042D2]" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student 360 Detail Modal like SupportAgents */}
      {selectedStudent && (
        <Dialog
          open={!!selectedStudent}
          onOpenChange={(val) => {
            if (!val) {
              setSelectedStudent(null);
              setAccommodationMsg(null);
            }
          }}
        >
          <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto bg-white text-zinc-900 border border-[#E5DEFF] shadow-2xl rounded-2xl p-6 sm:p-7 sleek-scrollbar">
            <DialogHeader className="space-y-3 border-b border-[#F0EDFF] pb-4 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 text-xs font-bold px-3 py-1 rounded-full">
                  {selectedStudent.status === "active" ? "Active Enrolled" : "At-Risk Learner"}
                </span>
                <span className="badge-status-in-progress text-xs font-bold px-3 py-1">
                  {selectedStudent.enrolledBatch}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="h-12 w-12 rounded-2xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center font-bold text-base shadow-xs">
                  {selectedStudent.avatar}
                </div>
                <div>
                  <DialogTitle className="text-xl font-extrabold text-[#111111]">
                    {selectedStudent.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 font-mono mt-0.5">
                    {selectedStudent.email} • ID: #{selectedStudent.id.toUpperCase()} • Joined {selectedStudent.joinedDate}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {accommodationMsg && (
                <div className="p-3 rounded-xl bg-[#F0EDFF] border border-[#905FEB]/30 text-[#7042D2] text-xs font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#905FEB]" />
                  <span>{accommodationMsg}</span>
                </div>
              )}

              {/* Enrolled Program Capsule */}
              <div className="p-3.5 rounded-2xl border border-[#E5DEFF] bg-[#FAF9FF] space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Enrolled Curriculum
                </span>
                <p className="text-sm font-bold text-[#111111]">
                  {selectedStudent.courseTitle}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#7042D2] pt-1 font-semibold">
                  <span>Batch: {selectedStudent.enrolledBatch}</span>
                  <span>Enrolled: {selectedStudent.joinedDate}</span>
                </div>
              </div>

              {/* Academic Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#FAF9FF] border border-[#E5DEFF] text-center">
                <div>
                  <span className="text-zinc-500 font-semibold block text-[10px] uppercase">Course Progress</span>
                  <span className="text-base font-bold text-[#7042D2]">{selectedStudent.progressPercent}%</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-semibold block text-[10px] uppercase">Attendance</span>
                  <span className="text-base font-bold text-[#7042D2]">
                    {selectedStudent.attendancePercent}%
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 font-semibold block text-[10px] uppercase">Doubts Asked</span>
                  <span className="text-base font-bold text-[#111111]">{selectedStudent.doubtsAsked}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-semibold block text-[10px] uppercase">CSAT Score</span>
                  <span className="text-base font-bold text-[#7042D2] flex items-center justify-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-[#905FEB] text-[#905FEB]" /> {selectedStudent.satisfactionRating}
                  </span>
                </div>
              </div>

              {/* Telemetry Progress Bars */}
              <div className="space-y-3 p-3.5 rounded-2xl border border-[#E5DEFF] bg-white">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Curriculum Completion Milestone</span>
                    <span className="font-bold text-[#111111]">{selectedStudent.progressPercent}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill-purple"
                      style={{ width: `${selectedStudent.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Live Attendance Telemetry</span>
                    <span className="font-bold text-[#7042D2]">
                      {selectedStudent.attendancePercent}%
                    </span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill-purple"
                      style={{ width: `${selectedStudent.attendancePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Privileged Mentor / Academic Actions */}
              <div className="space-y-2">
                <span className="font-bold text-zinc-700 text-xs block uppercase tracking-wider">
                  Academic Accommodations
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccommodationMsg(`Batch transfer request for ${selectedStudent.name} submitted to Admin.`)}
                    className="p-2.5 rounded-xl border border-[#E5DEFF] bg-white hover:bg-[#FAF9FF] text-left transition-all cursor-pointer flex items-center gap-2 group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-[#F0EDFF] text-[#7042D2] flex items-center justify-center shrink-0">
                      <ArrowRightLeft className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-[#111111] group-hover:text-[#905FEB]">Propose Cohort Move</p>
                      <p className="text-[10px] text-zinc-500">Shift weekday / weekend</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccommodationMsg(`30-day course validity extension logged for ${selectedStudent.name}.`)}
                    className="p-2.5 rounded-xl border border-[#E5DEFF] bg-white hover:bg-[#FAF9FF] text-left transition-all cursor-pointer flex items-center gap-2 group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-[#111111] group-hover:text-[#905FEB]">30-Day Extension</p>
                      <p className="text-[10px] text-zinc-500">Extend replay access</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-[#F0EDFF] flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                className="btn-support-secondary text-xs h-8.5 px-4 font-bold cursor-pointer"
                onClick={() => {
                  setSelectedStudent(null);
                  setAccommodationMsg(null);
                }}
              >
                Close
              </button>
              <Link to="/support/live-chat">
                <button
                  className="btn-support-primary text-xs h-8.5 px-4 gap-1.5 font-bold cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Initiate Live Chat</span>
                </button>
              </Link>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Student360Page;
