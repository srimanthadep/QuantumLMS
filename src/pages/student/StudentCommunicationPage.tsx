import React, { useState, useEffect } from "react";

// ============================================================================
// SVG ICONS (Self-contained, pixel-perfect, Noorly Soft UI compatible)
// ============================================================================
const IconPropsDefault = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function MessageSquareIcon({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MicIcon({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function MicOffIcon({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function SparklesIcon({ className = "", size = 16 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <path d="m12 3 2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" />
    </svg>
  );
}

function CheckCircle2Icon({ className = "", size = 16 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function AlertCircleIcon({ className = "", size = 16 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function ClockIcon({ className = "", size = 14 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PlayIcon({ className = "", size = 14 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function SendIcon({ className = "", size = 14 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <line x1="22" x2="11" y1="2" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function UserIcon({ className = "", size = 16 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function TrendingUpIcon({ className = "", size = 14 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function BarChart2Icon({ className = "", size = 16 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}

function InfoIcon({ className = "", size = 16 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="16" y2="12" />
      <line x1="12" x2="12.01" y1="8" y2="8" />
    </svg>
  );
}

// ============================================================================
// NOORLY SOFT UI PRIMITIVES
// ============================================================================
const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", children, ...props }) => (
  <div
    className={`bg-white rounded-[22px] border border-[#E2DCEE] shadow-[0_8px_28px_rgba(39,28,61,0.055)] transition-all ${className}`}
    {...props}
  >
    {children}
  </div>
);

const Badge: React.FC<{
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
  className?: string;
  children: React.ReactNode;
}> = ({ variant = "default", className = "", children }) => {
  let styleClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight ";
  if (variant === "default") {
    styleClasses += "bg-[#F0E7FF] text-[#5F2BC0] border border-[#D8C2FF]/60 ";
  } else if (variant === "secondary") {
    styleClasses += "bg-[#E7FF9C] text-[#385000] border border-[#D2F66A]/60 ";
  } else if (variant === "outline") {
    styleClasses += "border border-[#B6AEC8] text-[#514B68] bg-transparent ";
  } else if (variant === "success") {
    styleClasses += "bg-[#E7FF9C] text-[#253700] border border-[#D2F66A] ";
  } else if (variant === "warning") {
    styleClasses += "bg-[#FFF6C9] text-[#7A5B00] border border-[#FFE885] ";
  }
  return <span className={`${styleClasses} ${className}`}>{children}</span>;
};

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg";
  }
> = ({ variant = "default", size = "default", className = "", children, ...props }) => {
  let base =
    "inline-flex items-center justify-center font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ";
  if (variant === "default") {
    base += "bg-[#905FEB] text-white hover:bg-[#7D4BD8] shadow-[0_6px_16px_rgba(91,51,163,0.14)] ";
  } else if (variant === "outline") {
    base += "border border-[#E2DCEE] bg-white text-[#171526] hover:bg-[#F0EDFF] hover:border-[#905FEB] ";
  } else if (variant === "ghost") {
    base += "bg-transparent text-[#514B68] hover:bg-[#F0EDFF] hover:text-[#171526] ";
  } else if (variant === "secondary") {
    base += "bg-[#F0EDFF] text-[#5F2BC0] hover:bg-[#E4DFFD] ";
  }

  if (size === "sm") {
    base += "h-8 px-3 text-xs rounded-full ";
  } else if (size === "lg") {
    base += "h-11 px-6 text-sm rounded-full ";
  } else {
    base += "h-9 px-4 text-xs rounded-full ";
  }

  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
};

// ============================================================================
// DATA INTERFACES
// ============================================================================
export interface CompetencyScore {
  name: string;
  category: string;
  score: number;
  maxScore: number;
  description: string;
}

export interface PracticeActivity {
  id: string;
  title: string;
  category:
    | "Spoken English Practice"
    | "Pronunciation and Fluency"
    | "Vocabulary and Grammar"
    | "Listening Comprehension"
    | "Presentation & Interview";
  duration: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  prompt: string;
  objective: string;
  completed?: boolean;
}

export interface AssessmentHistoryItem {
  id: string;
  title: string;
  date: string;
  category: string;
  score: number;
  maxScore: number;
  performanceLevel: string;
  evaluator: string;
}

interface StudentCommunicationPageProps {
  onToast?: (msg: string) => void;
  onNavigate?: (page: any, courseId?: string) => void;
  onOpenAiModal?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const StudentCommunicationPage: React.FC<StudentCommunicationPageProps> = ({
  onToast,
  onOpenAiModal,
}) => {
  const [activeTab, setActiveTab] = useState<"evaluation" | "practice" | "history">("evaluation");

  // Interactive Practice Modal State
  const [selectedActivity, setSelectedActivity] = useState<PracticeActivity | null>(null);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<{
    score: number;
    fluency: number;
    clarity: number;
    vocabulary: number;
    feedback: string;
  } | null>(null);

  // Competency Dimensions (All 7 standard dimensions)
  const competencies: CompetencyScore[] = [
    {
      name: "Fluency",
      category: "Speech Flow & Pacing",
      score: 86,
      maxScore: 100,
      description: "Speech rate (138 WPM), smooth phrase transitions, minimal unnatural pausing.",
    },
    {
      name: "Pronunciation",
      category: "Phonetic Articulation",
      score: 90,
      maxScore: 100,
      description: "Clear consonant articulation, syllable stress accuracy on technical terms.",
    },
    {
      name: "Grammar",
      category: "Syntax & Sentence Structure",
      score: 92,
      maxScore: 100,
      description: "Precise conditional clauses, active voice formulation, correct tense agreement.",
    },
    {
      name: "Vocabulary",
      category: "Lexical Breadth & Domain Precision",
      score: 88,
      maxScore: 100,
      description: "Nuanced engineering vocabulary, accurate terminology in distributed systems.",
    },
    {
      name: "Listening",
      category: "Comprehension & Response Alignment",
      score: 94,
      maxScore: 100,
      description: "Immediate synthesis of complex questions and contextual follow-ups.",
    },
    {
      name: "Clarity and Coherence",
      category: "Logical Progression & Structure",
      score: 85,
      maxScore: 100,
      description: "Clear introductory framing, deductive rationale, concise summary closings.",
    },
    {
      name: "Confidence and Presentation",
      category: "Executive Composure & Modulation",
      score: 83,
      maxScore: 100,
      description: "Steady vocal projection, confident inflection, minimal filler reliance.",
    },
  ];

  // Practice Activities List
  const practiceActivities: PracticeActivity[] = [
    {
      id: "act-1",
      title: "Explaining System Architecture Trade-Offs",
      category: "Presentation & Interview",
      duration: "3 mins",
      difficulty: "Advanced",
      prompt:
        "Explain the latency vs throughput trade-offs between synchronous REST endpoints and asynchronous message queues to an engineering director in under 90 seconds.",
      objective: "Hone concise executive framing, structured trade-off articulation, and confident pacing.",
    },
    {
      id: "act-2",
      title: "Pronunciation Drill: Distributed Systems Terminology",
      category: "Pronunciation and Fluency",
      duration: "5 mins",
      difficulty: "Intermediate",
      prompt:
        "Read aloud: 'Asynchronous consensus algorithms like Raft prevent split-brain anomalies through deterministic leader election epochs and quorum replication.'",
      objective: "Master multisyllabic technical articulation and consonant precision.",
    },
    {
      id: "act-3",
      title: "Spoken English: Navigating Technical Disagreements",
      category: "Spoken English Practice",
      duration: "4 mins",
      difficulty: "Intermediate",
      prompt:
        "Formulate a diplomatic counter-proposal to a peer who wants to use monolithic architecture instead of microservices for a real-time analytics engine.",
      objective: "Practice constructive technical diplomacy and professional business phrasing.",
    },
    {
      id: "act-4",
      title: "Vocabulary Expansion: Precision Engineering Verbs",
      category: "Vocabulary and Grammar",
      duration: "5 mins",
      difficulty: "Beginner",
      prompt:
        "Replace common verbs (make, do, get) with high-impact precision engineering verbs (orchestrate, instantiate, benchmark, throttle, mitigate).",
      objective: "Elevate written and verbal vocabulary for project presentations.",
    },
    {
      id: "act-5",
      title: "Listening Comprehension: Faculty Viva Audio Synthesis",
      category: "Listening Comprehension",
      duration: "6 mins",
      difficulty: "Advanced",
      prompt:
        "Listen to a 60-second excerpt from Prof. Verma's lecture on KV-cache memory pressure, then formulate a 2-point response outlining mitigation steps.",
      objective: "Train fast contextual listening and precise responsive synthesis.",
    },
  ];

  // Assessment History
  const historyItems: AssessmentHistoryItem[] = [
    {
      id: "hist-1",
      title: "Midterm Capstone Presentation & Technical Viva",
      date: "11 Oct 2026",
      category: "Presentation & Interview Communication",
      score: 88,
      maxScore: 100,
      performanceLevel: "Advanced Professional",
      evaluator: "Prof. Rajesh Verma & Dr. Priya Sharma",
    },
    {
      id: "hist-2",
      title: "Sprint 2 Architecture Defense & Oral Defense",
      date: "18 Sep 2026",
      category: "Clarity, Coherence & Fluency",
      score: 81,
      maxScore: 100,
      performanceLevel: "Proficient",
      evaluator: "Dr. Priya Sharma",
    },
    {
      id: "hist-3",
      title: "Cohort 7 Diagnostic Baseline Assessment",
      date: "24 Aug 2026",
      category: "Comprehensive Communication Diagnostic",
      score: 74,
      maxScore: 100,
      performanceLevel: "Developing",
      evaluator: "Apex Academic Evaluation Board",
    },
  ];

  // Recording timer effect
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleOpenActivity = (act: PracticeActivity) => {
    setSelectedActivity(act);
    setIsRecording(false);
    setRecordTimer(0);
    setHasRecorded(false);
    setAssessmentResult(null);
    setIsActivityOpen(true);
  };

  const handleToggleRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      setHasRecorded(false);
      setRecordTimer(0);
    } else {
      setIsRecording(false);
      setHasRecorded(true);
    }
  };

  const handleSubmitPractice = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      setIsEvaluating(false);
      setAssessmentResult({
        score: 89,
        fluency: 88,
        clarity: 92,
        vocabulary: 87,
        feedback:
          "Excellent articulation and pacing (136 WPM). Good structuring with problem statement leading directly into solution rationale. Recommended follow-up: minimize filler words during transition pauses.",
      });

      if (onToast) {
        onToast("Communication Activity Submitted: Your response was evaluated and diagnostic scores updated! 🎉");
      }
    }, 1800);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Page Header / Action Bar */}
      <section className="student-shared-panel p-5 sm:p-6 mb-0" aria-label="Communication Header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title flex items-center gap-2 text-lg">
                <MessageSquareIcon size={20} className="text-[#905FEB]" />
                Communication Support & Evaluation
              </h3>
              <Badge variant="default">Phonetic AI Engine</Badge>
            </div>
            <p className="text-xs text-[#514B68] mt-1">
              Structured verbal communication assessments, interactive speaking drills, and faculty feedback analytics.
            </p>
          </div>

          {/* Tab Navigation Pill Group */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F0EDFF] rounded-full border border-[#E2DCEE] self-start md:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab("evaluation")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "evaluation"
                  ? "bg-[#905FEB] text-white shadow-sm"
                  : "text-[#514B68] hover:text-[#171526]"
              }`}
            >
              Structured Evaluation
            </button>
            <button
              onClick={() => setActiveTab("practice")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "practice"
                  ? "bg-[#905FEB] text-white shadow-sm"
                  : "text-[#514B68] hover:text-[#171526]"
              }`}
            >
              Practice Activities ({practiceActivities.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-[#905FEB] text-white shadow-sm"
                  : "text-[#514B68] hover:text-[#171526]"
              }`}
            >
              Assessment History ({historyItems.length})
            </button>
          </div>
        </div>
      </section>

      {/* Information & Disclaimer Banner */}
      <div className="bg-[#F0EDFF]/70 border border-[#E2DCEE] rounded-[18px] p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#905FEB]/10 flex items-center justify-center shrink-0">
          <InfoIcon size={18} className="text-[#905FEB]" />
        </div>
        <p className="text-xs text-[#514B68] leading-relaxed">
          <strong className="text-[#171526] font-bold">Official Note:</strong> In-browser speech evaluation and automated phonetic analysis in this module represent frontend interactive diagnostic simulations. Official accredited evaluations are conducted via scheduled faculty viva.
        </p>
      </div>

      {/* Section C: Workflow Visualizer Banner */}
      <Card className="p-5 bg-gradient-to-r from-[#F0EDFF]/40 via-white to-white">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#514B68] flex items-center gap-1.5">
            <SparklesIcon size={14} className="text-[#905FEB]" /> Communication Assessment Workflow
          </h4>
          <span className="text-[11px] font-bold text-[#905FEB]">Standard Academic Protocol</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
          <div className="p-3 rounded-2xl bg-[#FBFAFC] border border-[#E2DCEE] space-y-1">
            <span className="h-6 w-6 rounded-full bg-[#F0E7FF] text-[#5F2BC0] font-bold text-xs flex items-center justify-center mx-auto">
              1
            </span>
            <p className="font-bold text-[#171526] text-xs">Select Activity</p>
            <p className="text-[11px] text-[#514B68]">Choose prompt drill</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#FBFAFC] border border-[#E2DCEE] space-y-1">
            <span className="h-6 w-6 rounded-full bg-[#F0E7FF] text-[#5F2BC0] font-bold text-xs flex items-center justify-center mx-auto">
              2
            </span>
            <p className="font-bold text-[#171526] text-xs">Record Practice</p>
            <p className="text-[11px] text-[#514B68]">Speak with timer</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#FBFAFC] border border-[#E2DCEE] space-y-1">
            <span className="h-6 w-6 rounded-full bg-[#F0E7FF] text-[#5F2BC0] font-bold text-xs flex items-center justify-center mx-auto">
              3
            </span>
            <p className="font-bold text-[#171526] text-xs">Submit for Review</p>
            <p className="text-[11px] text-[#514B68]">Diagnostic engine</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#FBFAFC] border border-[#E2DCEE] space-y-1">
            <span className="h-6 w-6 rounded-full bg-[#F0E7FF] text-[#5F2BC0] font-bold text-xs flex items-center justify-center mx-auto">
              4
            </span>
            <p className="font-bold text-[#171526] text-xs">Score & Feedback</p>
            <p className="text-[11px] text-[#514B68]">Review 7 dimensions</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#E7FF9C]/30 border border-[#D2F66A] space-y-1 col-span-2 sm:col-span-1">
            <span className="h-6 w-6 rounded-full bg-[#AEEB00] text-[#151B00] font-bold text-xs flex items-center justify-center mx-auto">
              5
            </span>
            <p className="font-bold text-[#151B00] text-xs">Track Progress</p>
            <p className="text-[11px] text-[#385000]">Target practice</p>
          </div>
        </div>
      </Card>

      {/* TAB 1: STRUCTURED EVALUATION DASHBOARD */}
      {activeTab === "evaluation" && (
        <div className="space-y-6">
          {/* Main Assessment Summary Card */}
          <Card className="border-2 border-[#905FEB]/30 p-5 sm:p-6 space-y-5 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DCEE] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Latest Official Assessment</Badge>
                  <span className="text-xs text-[#514B68]">11 Oct 2026</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[#171526]">
                  Executive Technical Pitch & Agent Architecture Viva
                </h2>
                <p className="text-xs text-[#514B68]">
                  Evaluated by: <span className="font-bold text-[#171526]">Prof. Rajesh Verma & Dr. Priya Sharma</span>
                </p>
              </div>

              {/* Score Display Card */}
              <div className="flex items-center gap-4 bg-[#F0EDFF]/50 p-3.5 rounded-[20px] border border-[#E2DCEE] shrink-0">
                <div className="text-right">
                  <span className="text-[11px] text-[#514B68] block font-semibold">Overall Score</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[#905FEB] font-mono">88</span>
                    <span className="text-xs text-[#514B68]">/ 100</span>
                  </div>
                </div>
                <div className="h-10 w-px bg-[#E2DCEE]" />
                <div>
                  <Badge variant="secondary" className="font-bold">
                    Advanced Professional
                  </Badge>
                  <span className="text-[11px] text-[#385000] block mt-1 flex items-center gap-1 font-bold">
                    <TrendingUpIcon size={13} className="text-[#385000]" /> +7% vs baseline
                  </span>
                </div>
              </div>
            </div>

            {/* 7 Suggested Evaluation Categories Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#514B68] flex items-center gap-1.5">
                  <BarChart2Icon size={14} className="text-[#905FEB]" /> Evaluation by 7 Competency Dimensions
                </h4>
                <span className="text-[11px] text-[#514B68]">Passing Benchmark: 75%</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {competencies.map((c) => (
                  <div
                    key={c.name}
                    className="p-3.5 rounded-[18px] border border-[#E2DCEE] bg-[#FBFAFC] hover:bg-[#F0EDFF]/30 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#171526]">{c.name}</span>
                        <span className="text-[11px] text-[#514B68] ml-1.5">({c.category})</span>
                      </div>
                      <span className="font-mono font-bold text-[#905FEB]">
                        {c.score}/{c.maxScore}
                      </span>
                    </div>

                    {/* Progress Bar with Noorly styling */}
                    <div className="w-full bg-[#EEEAF4] rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-[#905FEB] h-full rounded-full transition-all duration-500"
                        style={{ width: `${(c.score / c.maxScore) * 100}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-[#514B68] leading-tight line-clamp-1">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Areas Requiring Improvement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-[18px] border border-[#D2F66A] bg-[#E7FF9C]/25 space-y-2">
                <h5 className="text-xs font-bold text-[#253700] flex items-center gap-1.5 uppercase tracking-wider">
                  <CheckCircle2Icon size={16} /> Demonstrated Strengths
                </h5>
                <ul className="space-y-1.5 text-xs text-[#171526]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#385000] font-bold">•</span>
                    Crisp formulation of complex distributed consensus mechanisms without hesitation.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#385000] font-bold">•</span>
                    Extensive, natural deployment of systems engineering vocabulary.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#385000] font-bold">•</span>
                    High composure during challenging follow-up architectural edge cases.
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-[18px] border border-[#FFE885] bg-[#FFF6C9]/40 space-y-2">
                <h5 className="text-xs font-bold text-[#7A5B00] flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertCircleIcon size={16} /> Areas Requiring Improvement
                </h5>
                <ul className="space-y-1.5 text-xs text-[#171526]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#7A5B00] font-bold">•</span>
                    Filler words ('basically', 'you know') surface during transition phases between slides.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#7A5B00] font-bold">•</span>
                    Maintain consistent speech cadence (130–145 WPM) during mathematical proofs.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#7A5B00] font-bold">•</span>
                    Incorporate a concise 10-second executive conclusion before taking committee questions.
                  </li>
                </ul>
              </div>
            </div>

            {/* Evaluator Remarks */}
            <div className="p-4 rounded-[18px] border border-[#E2DCEE] bg-[#F0EDFF]/30 space-y-1.5">
              <h5 className="text-xs font-bold text-[#171526] flex items-center gap-1.5">
                <UserIcon size={16} className="text-[#905FEB]" /> Faculty Evaluator Remarks
              </h5>
              <p className="text-xs text-[#514B68] leading-relaxed italic">
                "Arjun displayed stellar domain communication. His explanation of the KV-cache eviction policy was structured and highly persuasive. Honing transition pauses and eliminating filler habits during slide changes will elevate his technical presentations to top 1% executive readiness."
              </p>
              <p className="text-[11px] text-[#171526] font-bold pt-1">
                — Prof. Rajesh Verma (Lead Faculty Chair)
              </p>
            </div>

            {/* Recommended Practice Activities */}
            <div className="pt-2 border-t border-[#E2DCEE]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#514B68] flex items-center gap-1.5">
                  <SparklesIcon size={14} className="text-[#905FEB]" /> Recommended Practice Drills
                </h4>
                {onOpenAiModal && (
                  <button
                    onClick={onOpenAiModal}
                    className="text-xs text-[#905FEB] font-bold hover:underline cursor-pointer"
                  >
                    ✦ Request AI Speech Drill
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenActivity(practiceActivities[0])}
                  className="rounded-[18px] text-xs p-3.5 text-left flex flex-col items-start gap-1 justify-between border border-[#E2DCEE] bg-white hover:border-[#905FEB] hover:bg-[#F0EDFF]/30 transition-all cursor-pointer shadow-sm"
                >
                  <span className="font-bold text-[#171526]">{practiceActivities[0].title}</span>
                  <span className="text-[11px] text-[#514B68]">Focus: Structured trade-offs</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenActivity(practiceActivities[1])}
                  className="rounded-[18px] text-xs p-3.5 text-left flex flex-col items-start gap-1 justify-between border border-[#E2DCEE] bg-white hover:border-[#905FEB] hover:bg-[#F0EDFF]/30 transition-all cursor-pointer shadow-sm"
                >
                  <span className="font-bold text-[#171526]">{practiceActivities[1].title}</span>
                  <span className="text-[11px] text-[#514B68]">Focus: Phonetic precision</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenActivity(practiceActivities[3])}
                  className="rounded-[18px] text-xs p-3.5 text-left flex flex-col items-start gap-1 justify-between border border-[#E2DCEE] bg-white hover:border-[#905FEB] hover:bg-[#F0EDFF]/30 transition-all cursor-pointer shadow-sm"
                >
                  <span className="font-bold text-[#171526]">{practiceActivities[3].title}</span>
                  <span className="text-[11px] text-[#514B68]">Focus: Precision verbs</span>
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: PRACTICE ACTIVITIES & LEARNING RESOURCES */}
      {activeTab === "practice" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {practiceActivities.map((act) => (
              <Card
                key={act.id}
                className="hover:border-[#905FEB] p-5 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {act.category}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs text-[#514B68]">
                      <span className="flex items-center gap-1 font-medium">
                        <ClockIcon size={12} className="text-[#905FEB]" /> {act.duration}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {act.difficulty}
                      </Badge>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#171526]">{act.title}</h3>

                  <p className="text-xs text-[#514B68]">
                    <span className="font-bold text-[#171526]">Objective:</span> {act.objective}
                  </p>

                  <div className="p-3 rounded-[16px] bg-[#F0EDFF]/50 border border-[#E2DCEE] text-xs text-[#514B68]">
                    <span className="font-bold text-[#171526] block mb-0.5">Prompt:</span>
                    "{act.prompt}"
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2DCEE] flex items-center justify-between">
                  <span className="text-xs text-[#514B68] flex items-center gap-1.5 font-medium">
                    <MicIcon size={14} className="text-[#905FEB]" /> Voice Practice Ready
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleOpenActivity(act)}
                    className="flex items-center gap-1.5"
                  >
                    <PlayIcon size={11} /> Start Practice
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ASSESSMENT HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {historyItems.map((item) => (
            <Card key={item.id} className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px]">
                      {item.category}
                    </Badge>
                    <span className="text-xs text-[#514B68]">{item.date}</span>
                  </div>
                  <h4 className="text-base font-bold text-[#171526]">{item.title}</h4>
                  <p className="text-xs text-[#514B68]">Evaluator: {item.evaluator}</p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[11px] text-[#514B68] block font-semibold">Score</span>
                    <span className="font-mono text-xl font-bold text-[#905FEB]">
                      {item.score}/{item.maxScore}
                    </span>
                  </div>
                  <Badge variant="secondary" className="font-bold">
                    {item.performanceLevel}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: INTERACTIVE PRACTICE WORKFLOW */}
      {/* ==================================================================== */}
      {isActivityOpen && selectedActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsActivityOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-[24px] shadow-2xl border border-[#E2DCEE] p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E2DCEE] pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {selectedActivity.category}
                  </Badge>
                  <span className="text-xs text-[#514B68] font-medium">
                    Target: {selectedActivity.duration}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#171526]">
                  {selectedActivity.title}
                </h3>
                <p className="text-xs text-[#514B68]">{selectedActivity.objective}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActivityOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#514B68] hover:bg-[#F0EDFF] hover:text-[#171526] transition-colors cursor-pointer text-sm font-bold"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {/* Speaking Prompt Card */}
            <div className="p-4 rounded-[18px] bg-[#F0EDFF]/50 border border-[#E2DCEE] space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#905FEB]">
                Speaking Prompt:
              </span>
              <p className="text-xs sm:text-sm text-[#171526] leading-relaxed italic">
                "{selectedActivity.prompt}"
              </p>
            </div>

            {/* Voice Recording Simulator */}
            <div className="p-6 rounded-[22px] border-2 border-dashed border-[#B6AEC8] bg-[#FBFAFC] text-center space-y-4">
              <div className="flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  className={`h-16 w-16 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isRecording
                      ? "bg-[#E21D2D] text-white animate-pulse scale-110 shadow-[0_8px_20px_rgba(226,29,45,0.35)]"
                      : "bg-[#905FEB] text-white hover:bg-[#7D4BD8] shadow-[0_8px_20px_rgba(144,95,235,0.25)]"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? <MicOffIcon size={26} /> : <MicIcon size={26} />}
                </button>
                <span className="text-xs font-mono font-bold text-[#171526]">
                  {isRecording
                    ? `Recording: ${formatSeconds(recordTimer)}`
                    : hasRecorded
                    ? `Recorded: ${formatSeconds(recordTimer)}`
                    : "Click microphone to record"}
                </span>
              </div>

              {/* Simulated Audio Waveform */}
              {isRecording && (
                <div className="flex items-center justify-center gap-1.5 h-8">
                  {[40, 75, 20, 90, 60, 30, 85, 45, 95, 30, 60, 80, 50, 90, 40].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-[#905FEB] rounded-full animate-pulse"
                      style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
                    />
                  ))}
                </div>
              )}

              <p className="text-[11px] text-[#514B68]">
                {isRecording
                  ? "Speak clearly into your microphone. Deliver your structured technical response."
                  : hasRecorded
                  ? "Recording ready! Submit below to analyze speaking pacing, vocabulary, and grammar."
                  : "Ensure your microphone is connected before beginning your practice response."}
              </p>
            </div>

            {/* Result Diagnostic Display */}
            {assessmentResult && (
              <div className="p-4 rounded-[18px] border border-[#D2F66A] bg-[#E7FF9C]/25 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#253700] flex items-center gap-1.5 uppercase">
                    <CheckCircle2Icon size={16} /> Diagnostic Feedback
                  </span>
                  <span className="font-mono text-sm font-bold text-[#905FEB]">
                    Score: {assessmentResult.score}/100
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-[14px] bg-white border border-[#E2DCEE]">
                    <span className="text-[10px] text-[#514B68] block font-semibold">Fluency</span>
                    <span className="font-bold text-[#171526] font-mono">{assessmentResult.fluency}%</span>
                  </div>
                  <div className="p-2.5 rounded-[14px] bg-white border border-[#E2DCEE]">
                    <span className="text-[10px] text-[#514B68] block font-semibold">Clarity</span>
                    <span className="font-bold text-[#171526] font-mono">{assessmentResult.clarity}%</span>
                  </div>
                  <div className="p-2.5 rounded-[14px] bg-white border border-[#E2DCEE]">
                    <span className="text-[10px] text-[#514B68] block font-semibold">Vocabulary</span>
                    <span className="font-bold text-[#171526] font-mono">{assessmentResult.vocabulary}%</span>
                  </div>
                </div>

                <p className="text-xs text-[#171526] leading-relaxed">{assessmentResult.feedback}</p>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2DCEE]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsActivityOpen(false)}
              >
                Close
              </Button>
              {hasRecorded && !assessmentResult && (
                <Button
                  size="sm"
                  disabled={isEvaluating}
                  onClick={handleSubmitPractice}
                  className="flex items-center gap-1.5"
                >
                  {isEvaluating ? (
                    "Analyzing Speech..."
                  ) : (
                    <>
                      <SendIcon size={12} /> Submit for Evaluation
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCommunicationPage;
