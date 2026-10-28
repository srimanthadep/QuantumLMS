import React, { useState } from "react";
import {
  BookOpen,
  Search,
  Filter,
  FileText,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Tag,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
  AlertCircle,
  Sparkles,
  Eye,
  CheckCircle2,
  Layers,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MetricItem } from "@/types";
import { MetricCard } from "@/components/MetricCard";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface KbArticle {
  id: string;
  title: string;
  category: "Batch Transfers" | "Course Extensions" | "Billing & Refunds" | "LMS Video & Streams" | "AI Evaluation Appeals" | "Account & 2FA";
  summary: string;
  readTime: string;
  updatedAt: string;
  views: number;
  macroSnippet: string;
  content: string[];
  checklist: string[];
}

const ARTICLES: KbArticle[] = [
  {
    id: "kb-1",
    title: "SOP-101: Cohort Shift & Batch Transfer Policy",
    category: "Batch Transfers",
    summary: "Criteria, entitlement preservation rules, and Admin two-person approval requirements when moving students between weekday and weekend batches.",
    readTime: "3 min read",
    updatedAt: "12 Oct 2026",
    views: 428,
    macroSnippet: "Hello! We have reviewed your attendance record and verified your eligibility. A formal batch shift proposal has been routed to Academic Admin for final roster sync. Your lecture replay milestones and quiz history will remain 100% intact.",
    checklist: [
      "Check learner live attendance (>65% required for synchronous transfer)",
      "Verify seat capacity in the target cohort before proposing",
      "Do not edit roster directly — trigger the 'Propose Batch Move' action",
      "Inform student that live timetable updates take up to 2 hours",
    ],
    content: [
      "Students enrolled in Live Synchronous cohorts may request a batch transfer within the first 4 weeks of the cohort start date.",
      "Support agents are strictly restricted from directly modifying course rosters. The 'Propose Batch Move' button must be used to trigger Admin dual-authorization.",
      "Upon Admin approval, the student's historical milestone submissions, test grades, and doubt history automatically migrate without data loss.",
    ],
  },
  {
    id: "kb-2",
    title: "SOP-204: Medical & Professional Course Validity Extension",
    category: "Course Extensions",
    summary: "Standard operating procedure for granting 30, 60, or 90 days extra replay access for medical emergencies, relocation, or academic conflicts.",
    readTime: "4 min read",
    updatedAt: "08 Oct 2026",
    views: 612,
    macroSnippet: "We have reviewed your documentation regarding your recent medical leave. A 30-day course validity extension has been submitted for fast-tracked Admin confirmation so you can complete your remaining projects without disruption.",
    checklist: [
      "Verify student has submitted supporting documentation or explanation",
      "Check current entitlement expiry date in Student 360",
      "Select extension length (standard: 30 days; maximum: 90 days)",
      "Trigger 'Propose Extension' action on the ticket or profile drawer",
    ],
    content: [
      "Validity extensions grant continued access to recorded replays, AI tutor, and self-paced code milestones past the scheduled cohort end date.",
      "Support agents cannot unilaterally execute database expiry overrides. All extensions must be queued via the LMS dual-key proposal workflow.",
      "Students receiving an extension remain eligible for their course certificate upon finishing all required evaluations.",
    ],
  },
  {
    id: "kb-3",
    title: "SOP-305: Resolving CDN Edge Buffering & DRM Replay Issues",
    category: "LMS Video & Streams",
    summary: "Troubleshooting steps for video playback errors, DRM token timeouts, and low-latency WebRTC live stream drops.",
    readTime: "2 min read",
    updatedAt: "14 Oct 2026",
    views: 890,
    macroSnippet: "We have re-issued your secure DRM playback credentials and purged the edge CDN cache node closest to your region. Please try reloading the player in an incognito window or disabling aggressive ad-blocking extensions.",
    checklist: [
      "Ask student for exact browser version and OS",
      "Confirm if issue occurs on replays or during the live WebRTC stream",
      "Check Super-Admin Platform Health for active CDN edge incidents",
      "Instruct student to disable hardware acceleration if screen is black",
    ],
    content: [
      "Our LMS uses Widevine / FairPlay DRM with dynamic watermarking to protect proprietary intellectual property.",
      "If a student sees Error Code 403-DRM, their token expired after 4 hours of idle time. Reloading the page requests a new ephemeral JWT.",
      "For persistent stuttering, verify their ISP speed with our integrated network telemetry diagnostic tool.",
    ],
  },
  {
    id: "kb-4",
    title: "SOP-402: AI Evaluation Appeals & Rubric Grade Re-evaluations",
    category: "AI Evaluation Appeals",
    summary: "Handling student disputes on autograded coding milestones and routing resubmissions to human evaluators.",
    readTime: "5 min read",
    updatedAt: "05 Oct 2026",
    views: 340,
    macroSnippet: "Thank you for detailing your rationale. We have submitted your code submission and comments to our Senior Evaluator queue for manual secondary review. You will receive an updated rubric score within 48 business hours.",
    checklist: [
      "Verify that the milestone has already been finalized and released",
      "Review the objective test cases and autograder rationale",
      "If a genuine edge case was penalized, trigger the 'Re-evaluate' workflow",
      "Do not manually edit rubric scores — route to the assigned human evaluator",
    ],
    content: [
      "Students may appeal their autograded scores within 7 days of score release if they believe the test harness penalized valid alternative architectures.",
      "The evaluator desk provides side-by-side AST diffing and execution logs to confirm if the code satisfied the specification.",
      "If an error was caused by autograder infrastructure timeout, an automatic re-run is granted immediately.",
    ],
  },
  {
    id: "kb-5",
    title: "SOP-510: Payment Capture Failures & Refund Processing",
    category: "Billing & Refunds",
    summary: "Guidelines on diagnosing failed UPI transactions, webhook delays, and processing 7-day money-back guarantee requests.",
    readTime: "3 min read",
    updatedAt: "10 Oct 2026",
    views: 520,
    macroSnippet: "We have verified your transaction status with our payment gateway (Razorpay). The debited funds will either reflect on your enrolled account within 30 minutes or be automatically refunded to your original source account by your bank within 3-5 business days.",
    checklist: [
      "Look up order ID in Admin > Payments desk",
      "Verify payment gateway status (captured vs failed vs authorized)",
      "Check if student's course access was provisioned automatically",
      "For refunds, verify if requested within the 7-day initial window",
    ],
    content: [
      "Transactions marked as 'authorized' but not 'captured' are automatically resolved by our hourly reconciliation cron job.",
      "Refund requests must be formally submitted to the Admin Finance Desk for compliance and GST credit note generation.",
    ],
  },
  {
    id: "kb-6",
    title: "SOP-601: Two-Factor Authentication (2FA) Lockouts & Device Reset",
    category: "Account & 2FA",
    summary: "Emergency procedures for students unable to access their authenticator app (Google Authenticator / Authy) or backup codes.",
    readTime: "2 min read",
    updatedAt: "15 Oct 2026",
    views: 290,
    macroSnippet: "For your account security, we have initiated an identity verification check. Please reply with the government ID associated with your student enrollment to complete your 2FA authenticator reset.",
    checklist: [
      "Verify student's identity via registered phone number or alternate email",
      "Check Super-Admin Security Audit logs for recent suspicious IP logins",
      "Route 2FA reset ticket to Super Admin for final security clearance",
    ],
    content: [
      "2FA reset requests require mandatory dual-factor confirmation to prevent social engineering account takeover attempts.",
      "Once approved by Super Admin, the student receives a one-time recovery link valid for 15 minutes.",
    ],
  },
];
const UNIFIED_THEME = {
  cardBorder: "border-purple-100 hover:border-[#905FEB]/60",
  badgeClass: "bg-[#F0EDFF] text-[#7042D2] border-[#905FEB]/25 font-bold",
  topGradient: "from-[#905FEB] via-[#824FE7] to-[#A87DF5]",
  buttonClass: "bg-[#905FEB] hover:bg-[#7D46E7] text-white font-bold",
  chipActive: "bg-[#905FEB] text-white",
  dotColor: "bg-[#905FEB]",
};

const CATEGORY_CONFIG: Record<
  KbArticle["category"],
  {
    cardBorder: string;
    badgeClass: string;
    topGradient: string;
    buttonClass: string;
    chipActive: string;
    dotColor: string;
  }
> = {
  "Batch Transfers": UNIFIED_THEME,
  "Course Extensions": UNIFIED_THEME,
  "Billing & Refunds": UNIFIED_THEME,
  "LMS Video & Streams": UNIFIED_THEME,
  "AI Evaluation Appeals": UNIFIED_THEME,
  "Account & 2FA": UNIFIED_THEME,
};

export const KnowledgeBasePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeArticle, setActiveArticle] = useState<KbArticle | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    "all",
    "Batch Transfers",
    "Course Extensions",
    "Billing & Refunds",
    "LMS Video & Streams",
    "AI Evaluation Appeals",
    "Account & 2FA",
  ];

  const filtered = ARTICLES.filter((art) => {
    const matchesSearch =
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedCategory !== "all" && art.category !== selectedCategory) return false;
    return true;
  });

  const handleCopyMacro = (art: KbArticle) => {
    navigator.clipboard.writeText(art.macroSnippet);
    setCopiedId(art.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const kpis: MetricItem[] = [
    {
      icon: "book",
      label: "Verified SOPs",
      value: `${ARTICLES.length}`,
      trend: "All policies active",
      tone: "lavender",
    },
    {
      icon: "compass",
      label: "Support Categories",
      value: `${categories.length - 1}`,
      trend: "Coverage domains",
      tone: "pink",
    },
    {
      icon: "clock",
      label: "Avg Read Time",
      value: "3.5m",
      trend: "Fast reference",
      tone: "lime",
    },
    {
      icon: "sparkles",
      label: "Macro Adherence",
      value: "99.4%",
      trend: "Verified QA score",
      tone: "yellow",
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
              placeholder="Search SOP articles, keywords, or macros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-xs sm:text-sm bg-white border-[#E5DEFF] rounded-full focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20 text-[#111111] placeholder:text-zinc-400 shadow-2xs"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 sleek-scrollbar items-center flex-1 min-w-0">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "h-7 px-3 text-[11px] sm:text-xs font-semibold rounded-full capitalize whitespace-nowrap cursor-pointer flex items-center border transition-all duration-150 shrink-0",
                      isActive
                        ? "bg-[#905FEB] text-white border-[#905FEB] shadow-xs hover:bg-[#7D46E7]"
                        : "bg-[#F0EDFF] text-[#7042D2] border-[#905FEB]/20 hover:bg-[#E2DBFC]"
                    )}
                  >
                    <span>{cat === "all" ? "All SOP Categories" : cat}</span>
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {/* 3. Articles Grid with 8px gap */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 support-queue-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtered.map((art) => {
          return (
            <div
              key={art.id}
              onClick={() => setActiveArticle(art)}
              className="panel relative bg-white border border-zinc-150 hover:border-purple-300 flex flex-col justify-between cursor-pointer overflow-hidden transition-all duration-200"
            >
              {/* Top Colorful Category Gradient Strip */}
              <div
                className="h-1.5 w-full bg-gradient-to-r from-[#905FEB] via-[#824FE7] to-[#A87DF5] shadow-xs"
              />

              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5 bg-white">
                <div className="space-y-2.5">
                  {/* Category Badge & Read Time */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="badge-status-in-progress text-[10px] font-bold px-2.5 py-0.5"
                    >
                      {art.category}
                    </span>
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono font-medium">
                      <Clock className="h-3 w-3 text-zinc-400" /> {art.readTime}
                    </span>
                  </div>

                  {/* Article Title */}
                  <h3 className="text-sm font-bold text-[#111111] leading-snug hover:text-[#905FEB] transition-colors">
                    {art.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-zinc-600 text-xs leading-relaxed line-clamp-3 font-medium">
                    {art.summary}
                  </p>
                </div>

                {/* Bottom Meta & Action Area */}
                <div className="space-y-2.5 pt-2.5 border-t border-[#F0EDFF]">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                    <span>Updated: {art.updatedAt}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-zinc-400" /> {art.views} views
                    </span>
                  </div>

                  {/* Action Buttons in Category Color */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      className="btn-support-primary flex-1 text-xs h-8 gap-1.5 font-bold cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveArticle(art);
                      }}
                    >
                      <span>Read Full SOP</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      className="action-icon-lavender w-8 h-8 rounded-full cursor-pointer shrink-0"
                      title="Copy response macro"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyMacro(art);
                      }}
                    >
                      {copiedId === art.id ? (
                        <Check className="h-3.5 w-3.5 text-[#3B6600] font-bold" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Full Article Modal Dialog with Pure Solid White Background */}
      {activeArticle && (
        <Dialog open={!!activeArticle} onOpenChange={() => setActiveArticle(null)}>
          <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto bg-white text-zinc-900 border border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-7 sleek-scrollbar">
            <DialogHeader className="space-y-3 border-b border-slate-100 pb-4 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-bold px-3 py-1 rounded-xl border",
                    CATEGORY_CONFIG[activeArticle.category].badgeClass
                  )}
                >
                  {activeArticle.category}
                </Badge>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold gap-1 px-2.5 py-0.5 rounded-xl">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Verified SOP
                </Badge>
                <span className="text-xs text-zinc-400 font-mono ml-auto">
                  Updated: {activeArticle.updatedAt} • {activeArticle.readTime}
                </span>
              </div>

              <DialogTitle className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight leading-snug">
                {activeArticle.title}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed">
                {activeArticle.summary}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4 text-xs leading-relaxed bg-white">
              {/* Agent Action Checklist */}
              <div className="p-4 sm:p-5 rounded-2xl border border-purple-200/80 bg-purple-50/40 space-y-3">
                <h4 className="font-extrabold text-purple-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-purple-700" /> Agent Operational Checklist
                </h4>
                <ul className="space-y-2">
                  {activeArticle.checklist.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-purple-100/70 shadow-2xs"
                    >
                      <span className="h-5 w-5 rounded-full bg-purple-600 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        {idx + 1}
                      </span>
                      <span className="text-zinc-800 text-xs font-semibold leading-relaxed pt-0.5">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Policy Body */}
              <div className="space-y-2.5">
                <h4 className="font-extrabold text-zinc-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-purple-600" /> Detailed Policy Guidelines
                </h4>
                <div className="space-y-2">
                  {activeArticle.content.map((p, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-zinc-700 text-xs sm:text-sm leading-relaxed"
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              {/* Copyable Macro Box with White Card & Purple Accents */}
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-purple-200 bg-white space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-zinc-900 text-xs flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-600" /> Approved Response Macro
                  </span>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs px-3"
                    onClick={() => handleCopyMacro(activeArticle)}
                  >
                    {copiedId === activeArticle.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-white" /> Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy Macro Snippet
                      </>
                    )}
                  </Button>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 font-mono text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap select-all">
                  {activeArticle.macroSnippet}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <DialogFooter className="border-t border-slate-100 pt-3 flex flex-row items-center justify-end gap-2 bg-white">
              <Button
                variant="outline"
                className="text-xs font-bold h-9 px-4 rounded-xl bg-white text-zinc-700 hover:bg-slate-50 border-slate-200"
                onClick={() => setActiveArticle(null)}
              >
                Close SOP
              </Button>
              <Button
                className="text-xs font-bold h-9 px-4 rounded-xl bg-[#905FEB] hover:bg-[#7D46E7] text-white shadow-xs gap-1.5 transition-colors"
                onClick={() => handleCopyMacro(activeArticle)}
              >
                <Copy className="h-3.5 w-3.5" /> Copy Snippet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
export default KnowledgeBasePage;
