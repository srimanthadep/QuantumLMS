import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  User,
  HelpCircle,
  ArrowRightLeft,
  Clock,
  ShieldCheck,
  ExternalLink,
  Award,
  Sparkles,
  BookOpen,
  X,
} from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import "@/pages/support/supportTheme.css";

interface StudentProfile {
  studentId: string;
  name: string;
  email: string;
  idNumber: string;
  avatar: string;
  program: string;
  accessTier: string;
  cohort: string;
  expires: string;
  liveAttendancePercent: number;
  sessionsAttended: string;
  replayWatchHours: string;
  replayCompletionPercent: number;
  milestonesGraded: string;
  milestonesAvgScore: number;
  totalDoubtsAsked: number;
  doubtsResolvedPercent: number;
  recentDoubt: {
    lecture: string;
    topic: string;
    status: string;
    resolutionNote?: string;
  };
}

const STUDENT_PROFILES: Record<string, StudentProfile> = {
  "usr-student-1": {
    studentId: "usr-student-1",
    name: "Arjun Mehta",
    email: "arjun.m@learner.ai",
    idNumber: "#USR-4810",
    avatar: "AM",
    program: "Full-Stack AI & LLM Systems Engineering",
    accessTier: "Live + Replay Access",
    cohort: "Cohort 7 (Evening)",
    expires: "31 Dec 2026",
    liveAttendancePercent: 88,
    sessionsAttended: "14/16 sessions attended",
    replayWatchHours: "42.5 hrs",
    replayCompletionPercent: 92,
    milestonesGraded: "2 / 3",
    milestonesAvgScore: 95,
    totalDoubtsAsked: 4,
    doubtsResolvedPercent: 100,
    recentDoubt: {
      lecture: "Lecture 8 @ 00:24:18",
      topic: "HNSW efSearch parameter nuance in production vector search.",
      status: "Resolved",
      resolutionNote: "Mentor verified efSearch >= 64 for 99% recall parity.",
    },
  },
  "usr-student-5": {
    studentId: "usr-student-5",
    name: "Simran Kaur",
    email: "simran.k@example.com",
    idNumber: "#USR-5192",
    avatar: "SK",
    program: "Full-Stack AI & LLM Systems Engineering",
    accessTier: "Replay Only Access",
    cohort: "Cohort 8 (Replay Only)",
    expires: "15 Nov 2026",
    liveAttendancePercent: 60,
    sessionsAttended: "9/15 sessions attended",
    replayWatchHours: "28.0 hrs",
    replayCompletionPercent: 74,
    milestonesGraded: "1 / 3",
    milestonesAvgScore: 88,
    totalDoubtsAsked: 2,
    doubtsResolvedPercent: 100,
    recentDoubt: {
      lecture: "Lecture 4 @ 01:12:00",
      topic: "Medical leave catch-up & LoRA fine-tuning batch scripts.",
      status: "Resolved",
      resolutionNote: "Extension SOP approved for hospital recovery window.",
    },
  },
  "usr-student-2": {
    studentId: "usr-student-2",
    name: "Pooja Hegde",
    email: "pooja.h@example.com",
    idNumber: "#USR-3401",
    avatar: "PH",
    program: "Autonomous Multi-Agent Architectures",
    accessTier: "Enterprise VIP Lab Access",
    cohort: "Agentic Systems Bootcamp",
    expires: "31 Jan 2027",
    liveAttendancePercent: 88,
    sessionsAttended: "15/17 sessions attended",
    replayWatchHours: "36.5 hrs",
    replayCompletionPercent: 95,
    milestonesGraded: "3 / 3",
    milestonesAvgScore: 98,
    totalDoubtsAsked: 1,
    doubtsResolvedPercent: 100,
    recentDoubt: {
      lecture: "Lab 3 @ 00:45:10",
      topic: "CUDA OOM handling in LangGraph swarm topologies.",
      status: "Resolved",
      resolutionNote: "Allocated 50 additional GPU cluster compute hours.",
    },
  },
  "usr-student-3": {
    studentId: "usr-student-3",
    name: "Rohan Nair",
    email: "rohan.n@tech.io",
    idNumber: "#USR-2914",
    avatar: "RN",
    program: "Full-Stack AI & LLM Systems Engineering",
    accessTier: "Live + Replay Access",
    cohort: "Cohort 7 (Live + Replay)",
    expires: "31 Dec 2026",
    liveAttendancePercent: 75,
    sessionsAttended: "12/16 sessions attended",
    replayWatchHours: "39.0 hrs",
    replayCompletionPercent: 85,
    milestonesGraded: "2 / 3",
    milestonesAvgScore: 91,
    totalDoubtsAsked: 3,
    doubtsResolvedPercent: 100,
    recentDoubt: {
      lecture: "Lecture 6 @ 00:15:30",
      topic: "CDN stream edge cache invalidation & video player buffering.",
      status: "Resolved",
      resolutionNote: "Flushed edge CDN cache on stream token.",
    },
  },
  "usr-student-24": {
    studentId: "usr-student-24",
    name: "Devendra Patel",
    email: "dev.patel@tech.in",
    idNumber: "#USR-7821",
    avatar: "DP",
    program: "Full-Stack AI & LLM Systems Engineering",
    accessTier: "Replay Only Access",
    cohort: "Cohort 8 (Replay Only)",
    expires: "31 Dec 2026",
    liveAttendancePercent: 72,
    sessionsAttended: "11/15 sessions attended",
    replayWatchHours: "34.0 hrs",
    replayCompletionPercent: 88,
    milestonesGraded: "2 / 3",
    milestonesAvgScore: 94,
    totalDoubtsAsked: 3,
    doubtsResolvedPercent: 100,
    recentDoubt: {
      lecture: "Checkout @ 07:45:00",
      topic: "Duplicate UPI debit during Cohort 8 enrollment checkout (Razorpay).",
      status: "Investigating",
      resolutionNote: "Bank RRN tracked via payment gateway dashboard.",
    },
  },
};

const DEFAULT_PROFILE = STUDENT_PROFILES["usr-student-1"];

interface Student360DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: string;
}

export const Student360Drawer: React.FC<Student360DrawerProps> = ({
  open,
  onOpenChange,
  studentId,
}) => {
  const [proposedActionMessage, setProposedActionMessage] = useState<string | null>(null);
  const { addNotification } = useNotifications();

  const student = (studentId && STUDENT_PROFILES[studentId]) || DEFAULT_PROFILE;

  const handleProposeMove = () => {
    const msg = `Proposal logged: Moving ${student.name} to Weekend Cohort. Routed to Academic Admin.`;
    setProposedActionMessage(msg);
    addNotification({
      title: "Batch Move Proposed",
      message: `Batch transfer request for ${student.name} submitted for Admin approval.`,
      type: "system",
      link: "/admin/batches",
    });
    setTimeout(() => setProposedActionMessage(null), 5000);
  };

  const handleProposeExtension = () => {
    const msg = `Proposal logged: 30-Day course validity extension for ${student.name}. Routed to Academic Admin.`;
    setProposedActionMessage(msg);
    addNotification({
      title: "Extension Proposed",
      message: `30-day course validity extension for ${student.name} submitted for Admin approval.`,
      type: "system",
      link: "/admin/students",
    });
    setTimeout(() => setProposedActionMessage(null), 5000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ========================================================
          CENTERED POPUP DIALOG WITH BORDER-RADIUS AND INTERNAL SCROLL
          - Centered in the screen via fixed left-50% top-50%
          - Large elegant border-radius: rounded-[28px]
          - Max height: max-h-[88vh]
          - Internal scrollable body: support-card-scroll
         ======================================================== */}
      <DialogContent className="w-[94vw] sm:max-w-xl max-h-[88vh] p-0 gap-0 rounded-[28px] bg-white border border-[#E5DEFF] shadow-2xl flex flex-col overflow-hidden support-page-font focus:outline-none">
        {/* ========================================================
            POPUP HEADER (Fixed at top of popup)
           ======================================================== */}
        <div className="p-4 sm:p-5 border-b border-[#F0EDFF] bg-gradient-to-b from-[#FAF9FF] to-white flex items-center justify-between shrink-0 pr-12">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center font-extrabold text-base shadow-xs">
                {student.avatar}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#AEEB00] ring-2 ring-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-extrabold text-[#111111] leading-tight truncate">
                  {student.name}
                </DialogTitle>
                <span className="badge-status-completed text-[10px] font-bold px-2 py-0.5 shrink-0">
                  Active Enrolled
                </span>
              </div>
              <DialogDescription className="text-xs text-zinc-500 font-mono mt-0.5 truncate">
                {student.email} • Student ID: {student.idNumber}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* ========================================================
            SCROLLABLE POPUP BODY with clean transparent scrollbar
           ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 support-card-scroll">
          {/* Action Success Toast Banner */}
          {proposedActionMessage && (
            <div className="p-3 rounded-2xl bg-[#EAFCC7] border border-[#AEEB00]/60 text-[#3B6600] text-xs font-semibold flex items-center gap-2 shadow-xs animate-fadeIn">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#3B6600]" />
              <span className="leading-snug">{proposedActionMessage}</span>
            </div>
          )}

          {/* SECTION 1: Enrolled Program Capsule */}
          <div className="p-4 rounded-2xl border border-[#E5DEFF] bg-[#FAF9FF] shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#111111] flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-[#905FEB]" />
                Enrolled Program
              </span>
              <span className="badge-status-in-progress text-[10px] font-bold px-2 py-0.5">
                {student.accessTier}
              </span>
            </div>

            <p className="text-sm font-extrabold text-[#111111] leading-snug">
              {student.program}
            </p>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-600 pt-2 border-t border-[#F0EDFF]">
              <span>
                Cohort: <strong className="text-[#111111] font-bold">{student.cohort}</strong>
              </span>
              <span>
                Expires: <strong className="text-[#7042D2] font-mono font-bold">{student.expires}</strong>
              </span>
            </div>

            {/* Dual Telemetry Progress Bars (Figma 76% & 48%) */}
            <div className="space-y-2 pt-1 border-t border-[#F0EDFF]">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500 font-medium">Curriculum Completion</span>
                  <span className="font-bold text-[#111111] font-mono">76%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill-purple" style={{ width: "76%" }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500 font-medium">Live Attendance Telemetry</span>
                  <span className="font-bold font-mono text-[#3B6600]">
                    {student.liveAttendancePercent}%
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill-lime"
                    style={{ width: `${student.liveAttendancePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ACADEMIC & ATTENDANCE METRICS (2x2 Grid) */}
          <div>
            <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Award className="h-3 w-3 text-[#905FEB]" />
              Academic &amp; Attendance Metrics
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Card 1: Live Attendance */}
              <div className="p-3.5 rounded-2xl border border-[#E5DEFF] bg-[#FAF9FF] hover:border-[#905FEB] hover:bg-white hover:shadow-xs transition-all space-y-1">
                <p className="text-[11px] text-zinc-500 font-medium">Live Attendance</p>
                <p className="text-xl font-black text-[#111111] font-mono">
                  {student.liveAttendancePercent}%
                </p>
                <span className="badge-status-completed text-[9px] font-bold px-1.5 py-0 inline-block truncate max-w-full">
                  {student.sessionsAttended}
                </span>
                <div className="progress-bar-track mt-1.5">
                  <div
                    className="progress-bar-fill-lime"
                    style={{ width: `${student.liveAttendancePercent}%` }}
                  />
                </div>
              </div>

              {/* Card 2: Replay Watch Time */}
              <div className="p-3.5 rounded-2xl border border-[#E5DEFF] bg-[#FAF9FF] hover:border-[#905FEB] hover:bg-white hover:shadow-xs transition-all space-y-1">
                <p className="text-[11px] text-zinc-500 font-medium">Replay Watch Time</p>
                <p className="text-xl font-black text-[#111111] font-mono">
                  {student.replayWatchHours}
                </p>
                <span className="badge-status-in-progress text-[9px] font-bold px-1.5 py-0 inline-block">
                  {student.replayCompletionPercent}% completion
                </span>
                <div className="progress-bar-track mt-1.5">
                  <div
                    className="progress-bar-fill-purple"
                    style={{ width: `${student.replayCompletionPercent}%` }}
                  />
                </div>
              </div>

              {/* Card 3: Milestones Graded */}
              <div className="p-3.5 rounded-2xl border border-[#E5DEFF] bg-[#FAF9FF] hover:border-[#905FEB] hover:bg-white hover:shadow-xs transition-all space-y-1">
                <p className="text-[11px] text-zinc-500 font-medium">Milestones Graded</p>
                <p className="text-xl font-black text-[#111111] font-mono">
                  {student.milestonesGraded}
                </p>
                <span className="text-[10px] text-[#7042D2] font-bold block">
                  Avg Score: {student.milestonesAvgScore}%
                </span>
                <div className="progress-bar-track mt-1.5">
                  <div className="progress-bar-fill-purple" style={{ width: "67%" }} />
                </div>
              </div>

              {/* Card 4: Total Doubts Asked */}
              <div className="p-3.5 rounded-2xl border border-[#E5DEFF] bg-[#FAF9FF] hover:border-[#905FEB] hover:bg-white hover:shadow-xs transition-all space-y-1">
                <p className="text-[11px] text-zinc-500 font-medium">Total Doubts Asked</p>
                <p className="text-xl font-black text-[#111111] font-mono">
                  {student.totalDoubtsAsked}
                </p>
                <span className="badge-status-completed text-[9px] font-bold px-1.5 py-0 inline-block">
                  {student.doubtsResolvedPercent}% Resolved
                </span>
                <div className="progress-bar-track mt-1.5">
                  <div className="progress-bar-fill-lime" style={{ width: "100%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: RECENT DOUBTS LOG */}
          <div>
            <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-[#905FEB]" />
              Recent Doubts Log
            </p>
            <div className="space-y-2">
              <div className="p-3.5 rounded-2xl border border-[#E5DEFF] bg-[#FAF9FF] hover:border-[#905FEB] transition-all text-xs space-y-1.5 shadow-2xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-extrabold text-[#111111] font-mono">
                    {student.recentDoubt.lecture}
                  </span>
                  <span className="badge-status-completed text-[9px] font-bold px-2 py-0.5">
                    {student.recentDoubt.status}
                  </span>
                </div>
                <p className="text-zinc-600 text-[11px] leading-relaxed">
                  {student.recentDoubt.topic}
                </p>
                {student.recentDoubt.resolutionNote && (
                  <p className="text-[10px] text-[#7042D2] font-semibold pt-1 border-t border-[#F0EDFF] flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-[#905FEB] shrink-0" />
                    <span>{student.recentDoubt.resolutionNote}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: PRIVILEGED MENTOR ACTIONS matching Figma Buttons */}
          <div className="pt-2 border-t border-[#F0EDFF] space-y-2.5">
            <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
              Privileged Mentor Actions
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleProposeMove}
                className="btn-support-secondary text-xs h-9 font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-[#7042D2]" />
                <span>Propose Cohort Move</span>
              </button>

              <button
                type="button"
                onClick={handleProposeExtension}
                className="btn-support-secondary text-xs h-9 font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs"
              >
                <Clock className="h-3.5 w-3.5 text-[#7042D2]" />
                <span>Propose Extension</span>
              </button>
            </div>

            <Link
              to={`/support/student-360?id=${student.studentId}`}
              className="btn-support-outlined text-xs h-9 font-bold w-full flex items-center justify-center gap-1.5 cursor-pointer text-center"
              onClick={() => onOpenChange(false)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Full Student 360° Portal</span>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Student360Drawer;
