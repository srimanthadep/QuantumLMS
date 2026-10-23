import React, { useState } from "react";
import {
  Settings,
  Bell,
  Clock,
  Shield,
  MessageSquare,
  Sparkles,
  Save,
  CheckCircle2,
  Sliders,
  Webhook,
  Mail,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Check,
  Zap,
  Layers,
  Bot,
  Send,
  Volume2,
  Activity,
  FileText,
  Calendar,
  Lock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatCard } from "@/components/ui/StatCard";
import "./supportTheme.css";

export const SupportSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaved, setIsSaved] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<string | null>(null);

  // Form states - General
  const [deskName, setDeskName] = useState("Quantum Tier-1 Mentor & Support Desk");
  const [deskEmail, setDeskEmail] = useState("support@quantumlms.ai");
  const [operatingHours, setOperatingHours] = useState("08:00 AM - 11:00 PM (IST)");
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST - UTC+05:30)");
  const [liveChatEnabled, setLiveChatEnabled] = useState(true);
  const [inactivityTimeout, setInactivityTimeout] = useState("15");
  const [autoResponderText, setAutoResponderText] = useState(
    "Hello {student_name}, thank you for reaching out to the Quantum LMS Support Desk. Our academic mentors are currently reviewing your inquiry. We typically respond within 15 minutes."
  );
  const [activeDays, setActiveDays] = useState<string[]>([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ]);

  // SLA Thresholds (in minutes)
  const [p1Sla, setP1Sla] = useState("30");
  const [p2Sla, setP2Sla] = useState("120");
  const [p3Sla, setP3Sla] = useState("360");
  const [p4Sla, setP4Sla] = useState("1440");
  const [slaWarningPercent, setSlaWarningPercent] = useState("20");
  const [pauseSlaOffHours, setPauseSlaOffHours] = useState(true);
  const [autoEscalateBreach, setAutoEscalateBreach] = useState(true);

  // Auto-Routing
  const [autoAssignMode, setAutoAssignMode] = useState("load_balanced");
  const [maxTicketsPerAgent, setMaxTicketsPerAgent] = useState("8");
  const [fallbackToGeneral, setFallbackToGeneral] = useState(true);
  const [reassignOnAway, setReassignOnAway] = useState(true);

  // Notifications & Webhooks
  const [slackWebhook, setSlackWebhook] = useState(
    "https://hooks.slack.com/services/T04QUANTUM/B09SUPPORT/x9Z81EscalationKey"
  );
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [mentorLeadEmail, setMentorLeadEmail] = useState("mentor-leads@quantumlms.ai");
  const [browserPush, setBrowserPush] = useState(true);
  const [audioChimes, setAudioChimes] = useState(true);
  const [notifyOnP1, setNotifyOnP1] = useState(true);
  const [notifyOnWarning, setNotifyOnWarning] = useState(true);
  const [notifyOnLowCsat, setNotifyOnLowCsat] = useState(true);

  // AI & Macros
  const [aiCopilotEnabled, setAiCopilotEnabled] = useState(true);
  const [sentimentAnalysis, setSentimentAnalysis] = useState(true);
  const [autoSummarizeThreads, setAutoSummarizeThreads] = useState(true);

  const toggleDay = (day: string) => {
    if (activeDays.includes(day)) {
      if (activeDays.length > 1) {
        setActiveDays(activeDays.filter((d) => d !== day));
      }
    } else {
      setActiveDays([...activeDays, day]);
    }
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  const handleTestWebhook = () => {
    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    setTimeout(() => {
      setIsTestingWebhook(false);
      setWebhookTestResult("Webhook test successful: HTTP 200 OK delivered to Slack #support-alerts.");
      setTimeout(() => setWebhookTestResult(null), 4500);
    }, 1100);
  };

  return (
    <div className="flex flex-col gap-2 support-page-font">
      {/* Settings Control Strip matching canonical panel design */}
      <div className="panel px-4 py-2.5 bg-white border border-zinc-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-900 flex items-center gap-2">
              <Settings className="h-4 w-4 text-purple-600" />
              <span>Operations &amp; Operational Policies</span>
            </span>
            <span className="badge-status-completed text-[10px] font-bold px-2 py-0.5 hidden sm:inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3B6600] animate-pulse" />
              Live Desk Active
            </span>
          </div>
          <span className="text-zinc-300">|</span>
          <span className="text-xs text-zinc-500 font-medium">SLA Tiers, Escalation Matrix, Webhooks &amp; AI Copilot</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSaved && (
            <span className="badge-status-completed font-bold px-3 py-1.5 text-xs shadow-xs animate-fadeIn flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[#3B6600]" />
              Settings Saved!
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setDeskName("Quantum Tier-1 Mentor & Support Desk");
              setP1Sla("30");
              setP2Sla("120");
              setP3Sla("360");
              setP4Sla("1440");
            }}
            className="btn-support-secondary text-xs h-7.5 px-3.5 font-bold cursor-pointer"
            title="Reset to recommended defaults"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-support-primary text-xs h-7.5 px-4 gap-1.5 font-bold cursor-pointer shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>


      {/* Main Settings Tabs Container with Clean Transparent Scrollbar */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col min-h-0">
          {/* Pill Tabs Bar matching Figma UI kit */}
          <div className="shrink-0 pb-2">
            <TabsList className="bg-white border border-[#E5DEFF] shadow-2xs rounded-full p-1 h-auto flex flex-wrap gap-1">
              <TabsTrigger
                value="general"
                className="rounded-full text-xs font-bold px-3.5 py-1.5 transition-all data-[state=active]:bg-[#905FEB] data-[state=active]:text-white data-[state=active]:shadow-xs text-zinc-600 hover:text-[#905FEB]"
              >
                <Sliders className="h-3.5 w-3.5 mr-1.5" />
                Desk &amp; Hours
              </TabsTrigger>
              <TabsTrigger
                value="sla"
                className="rounded-full text-xs font-bold px-3.5 py-1.5 transition-all data-[state=active]:bg-[#905FEB] data-[state=active]:text-white data-[state=active]:shadow-xs text-zinc-600 hover:text-[#905FEB]"
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                SLA Deadlines
              </TabsTrigger>
              <TabsTrigger
                value="routing"
                className="rounded-full text-xs font-bold px-3.5 py-1.5 transition-all data-[state=active]:bg-[#905FEB] data-[state=active]:text-white data-[state=active]:shadow-xs text-zinc-600 hover:text-[#905FEB]"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                Auto-Routing
              </TabsTrigger>
              <TabsTrigger
                value="alerts"
                className="rounded-full text-xs font-bold px-3.5 py-1.5 transition-all data-[state=active]:bg-[#905FEB] data-[state=active]:text-white data-[state=active]:shadow-xs text-zinc-600 hover:text-[#905FEB]"
              >
                <Webhook className="h-3.5 w-3.5 mr-1.5" />
                Webhooks &amp; Alerts
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="rounded-full text-xs font-bold px-3.5 py-1.5 transition-all data-[state=active]:bg-[#905FEB] data-[state=active]:text-white data-[state=active]:shadow-xs text-zinc-600 hover:text-[#905FEB]"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                AI Copilot &amp; Macros
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Scrollable Content Viewport */}
          <div className="flex-1 min-h-0 support-sleek-scroll pr-1 pb-4">
            {/* TAB 1: General Desk Preferences */}
            <TabsContent value="general" className="space-y-3.5 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {/* Desk Identity Card */}
                <div className="rounded-2xl border border-[#E5DEFF] bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFF]">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-[#F0EDFF] text-[#7042D2] flex items-center justify-center font-bold">
                        <Sliders className="h-4 w-4 text-[#905FEB]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#111111]">Desk Identity &amp; Contact</h3>
                        <p className="text-[11px] text-zinc-500 font-medium">Public credentials shown to learners</p>
                      </div>
                    </div>
                    <span className="badge-status-in-progress text-[10px] font-bold px-2.5 py-0.5">
                      Production
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#111111] flex items-center justify-between">
                        <span>Desk Display Name</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Shown on ticket receipts</span>
                      </label>
                      <Input
                        value={deskName}
                        onChange={(e) => setDeskName(e.target.value)}
                        className="h-9.5 text-xs rounded-full border-[#E5DEFF] px-3.5 focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#111111] flex items-center justify-between">
                        <span>Support Email Address</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Inbound inquiry mailbox</span>
                      </label>
                      <Input
                        value={deskEmail}
                        onChange={(e) => setDeskEmail(e.target.value)}
                        className="h-9.5 text-xs rounded-full border-[#E5DEFF] px-3.5 font-mono focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#111111] flex items-center justify-between">
                        <span>Primary Operating Timezone</span>
                        <span className="text-[10px] text-[#7042D2] font-semibold">UTC+05:30</span>
                      </label>
                      <Input
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="h-9.5 text-xs rounded-full border-[#E5DEFF] px-3.5 font-medium focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Operating Coverage Schedule */}
                <div className="rounded-2xl border border-[#E5DEFF] bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFF]">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-[#EAFCC7] text-[#3B6600] flex items-center justify-center font-bold">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#111111]">Operating Coverage Hours</h3>
                        <p className="text-[11px] text-zinc-500 font-medium">Daily windows when mentors accept live queries</p>
                      </div>
                    </div>
                    <span className="badge-status-completed text-[10px] font-bold px-2.5 py-0.5">
                      6 Days / Week
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#111111]">Active Support Shift Hours</label>
                      <Input
                        value={operatingHours}
                        onChange={(e) => setOperatingHours(e.target.value)}
                        className="h-9.5 text-xs rounded-full border-[#E5DEFF] px-3.5 focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20"
                      />
                    </div>

                    {/* Active Days Toggle Pills */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-bold text-[#111111] block">Operational Days of Week</span>
                      <div className="flex flex-wrap gap-1.5">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                          const isSelected = activeDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              className={`h-8 px-3 rounded-full text-xs font-bold transition-all cursor-pointer ${isSelected
                                ? "bg-[#905FEB] text-white shadow-xs"
                                : "bg-[#F3F4F6] text-zinc-500 hover:bg-[#E5DEFF]/50"
                                }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#FAF9FF] border border-[#E5DEFF] text-xs text-zinc-600 flex items-center gap-2 mt-2">
                      <Activity className="h-4 w-4 text-[#905FEB] shrink-0" />
                      <span>
                        Outside coverage hours, inbound doubts automatically route to replay bot and queue for next day.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Chat & Auto-Responder Section */}
              <div className="rounded-2xl border border-[#E5DEFF] bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFF]">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-[#F0EDFF] text-[#7042D2] flex items-center justify-center font-bold">
                      <MessageSquare className="h-4 w-4 text-[#905FEB]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#111111]">Synchronous Chat Channels</h3>
                      <p className="text-[11px] text-zinc-500 font-medium">Real-time student chat desk &amp; timeout parameters</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#111111]">Enable Real-Time Chat Widget</h4>
                        <p className="text-[11px] text-zinc-500">Allows learners to initiate live mentor sessions</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLiveChatEnabled(!liveChatEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${liveChatEnabled ? "bg-[#905FEB]" : "bg-zinc-300"
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${liveChatEnabled ? "translate-x-6" : "translate-x-1"
                            }`}
                        />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#111111] flex items-center justify-between">
                        <span>Learner Inactivity Timeout (Minutes)</span>
                        <span className="text-[10px] text-[#7042D2] font-semibold">{inactivityTimeout} mins</span>
                      </label>
                      <Input
                        type="number"
                        value={inactivityTimeout}
                        onChange={(e) => setInactivityTimeout(e.target.value)}
                        className="h-9 text-xs rounded-full border-[#E5DEFF] px-3.5 font-mono focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20"
                      />
                      <p className="text-[11px] text-zinc-500">
                        Sessions idle longer than this are archived to asynchronous ticket view.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#111111] flex items-center justify-between">
                      <span>Automated First Response Greeting</span>
                      <span className="text-[10px] text-zinc-400 font-mono">&#123;student_name&#125; enabled</span>
                    </label>
                    <textarea
                      value={autoResponderText}
                      onChange={(e) => setAutoResponderText(e.target.value)}
                      rows={3}
                      className="w-full text-xs rounded-2xl border border-[#E5DEFF] p-3 text-[#111111] focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20 resize-none font-sans"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="badge-status-in-progress text-[9px] font-bold px-2 py-0.5 cursor-pointer">
                        + &#123;student_name&#125;
                      </span>
                      <span className="badge-status-in-progress text-[9px] font-bold px-2 py-0.5 cursor-pointer">
                        + &#123;desk_hours&#125;
                      </span>
                      <span className="badge-status-in-progress text-[9px] font-bold px-2 py-0.5 cursor-pointer">
                        + &#123;ticket_id&#125;
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Service Level Agreement (SLA) Targets */}
            <TabsContent value="sla" className="space-y-3.5 mt-0">
              <div className="p-4 rounded-2xl bg-white border border-[#E5DEFF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#FFF3E0] text-[#B45309] border border-amber-300/40 flex items-center justify-center font-bold">
                    <Shield className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#111111]">Service Level Agreement (SLA) Matrix</h3>
                    <p className="text-xs text-zinc-500 font-medium">
                      Maximum allowable resolution thresholds before tickets automatically flag as breached.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-status-in-progress text-xs font-bold px-3 py-1">
                    Enforcement Active
                  </span>
                </div>
              </div>

              {/* 4 SLA Tier Cards matching Figma UI Kit Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* P1 Urgent */}
                <div className="rounded-2xl border-2 border-red-200 bg-white p-4 shadow-xs space-y-3 relative overflow-hidden">
                  <div className="h-1.5 w-full bg-red-500 absolute top-0 left-0" />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-extrabold text-[#111111]">P1 Critical</span>
                    <span className="badge-status-assigned text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 border-red-300">
                      Emergency
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    Live stream outages, exam lockouts, billing double-charges.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Target Minutes
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={p1Sla}
                        onChange={(e) => setP1Sla(e.target.value)}
                        className="h-9 text-xs rounded-full border-[#E5DEFF] px-3.5 font-bold text-red-600 font-mono pr-12 focus:border-red-400"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-zinc-400 font-bold">mins</span>
                    </div>
                  </div>
                  <div className="flex gap-1 pt-1">
                    {["15", "30", "45", "60"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setP1Sla(val)}
                        className={`flex-1 py-1 text-[10px] rounded-full font-bold cursor-pointer transition-all ${p1Sla === val
                          ? "bg-red-500 text-white"
                          : "bg-[#F3F4F6] text-zinc-600 hover:bg-[#E5DEFF]"
                          }`}
                      >
                        {val}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* P2 High */}
                <div className="rounded-2xl border-2 border-amber-200 bg-white p-4 shadow-xs space-y-3 relative overflow-hidden">
                  <div className="h-1.5 w-full bg-amber-500 absolute top-0 left-0" />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-extrabold text-[#111111]">P2 High Priority</span>
                    <span className="badge-status-assigned text-[10px] font-bold px-2 py-0.5">
                      High Alert
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    Validity extensions, 2FA device resets, lab environment crash.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Target Minutes
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={p2Sla}
                        onChange={(e) => setP2Sla(e.target.value)}
                        className="h-9 text-xs rounded-full border-[#E5DEFF] px-3.5 font-bold text-amber-700 font-mono pr-12 focus:border-amber-400"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-zinc-400 font-bold">mins</span>
                    </div>
                  </div>
                  <div className="flex gap-1 pt-1">
                    {["60", "90", "120", "180"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setP2Sla(val)}
                        className={`flex-1 py-1 text-[10px] rounded-full font-bold cursor-pointer transition-all ${p2Sla === val
                          ? "bg-amber-500 text-white"
                          : "bg-[#F3F4F6] text-zinc-600 hover:bg-[#E5DEFF]"
                          }`}
                      >
                        {val}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* P3 Medium */}
                <div className="rounded-2xl border-2 border-[#E5DEFF] bg-white p-4 shadow-xs space-y-3 relative overflow-hidden">
                  <div className="h-1.5 w-full bg-[#905FEB] absolute top-0 left-0" />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-extrabold text-[#111111]">P3 Standard</span>
                    <span className="badge-status-in-progress text-[10px] font-bold px-2 py-0.5">
                      In Progress
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    Cohort moves, lecture timetable adjustments, assignment clarifications.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Target Minutes
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={p3Sla}
                        onChange={(e) => setP3Sla(e.target.value)}
                        className="h-9 text-xs rounded-full border-[#E5DEFF] px-3.5 font-bold text-[#7042D2] font-mono pr-12 focus:border-[#905FEB]"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-zinc-400 font-bold">mins</span>
                    </div>
                  </div>
                  <div className="flex gap-1 pt-1">
                    {["180", "240", "360", "480"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setP3Sla(val)}
                        className={`flex-1 py-1 text-[10px] rounded-full font-bold cursor-pointer transition-all ${p3Sla === val
                          ? "bg-[#905FEB] text-white"
                          : "bg-[#F3F4F6] text-zinc-600 hover:bg-[#E5DEFF]"
                          }`}
                      >
                        {val}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* P4 Low */}
                <div className="rounded-2xl border-2 border-emerald-200 bg-white p-4 shadow-xs space-y-3 relative overflow-hidden">
                  <div className="h-1.5 w-full bg-[#AEEB00] absolute top-0 left-0" />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-extrabold text-[#111111]">P4 General</span>
                    <span className="badge-status-completed text-[10px] font-bold px-2 py-0.5">
                      Standard
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    Alumni certificates, course recommendation requests, general info.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Target Minutes
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={p4Sla}
                        onChange={(e) => setP4Sla(e.target.value)}
                        className="h-9 text-xs rounded-full border-[#E5DEFF] px-3.5 font-bold text-[#3B6600] font-mono pr-12 focus:border-[#AEEB00]"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-zinc-400 font-bold">mins</span>
                    </div>
                  </div>
                  <div className="flex gap-1 pt-1">
                    {["720", "1440", "2880"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setP4Sla(val)}
                        className={`flex-1 py-1 text-[10px] rounded-full font-bold cursor-pointer transition-all ${p4Sla === val
                          ? "bg-[#AEEB00] text-[#111111]"
                          : "bg-[#F3F4F6] text-zinc-600 hover:bg-[#E5DEFF]"
                          }`}
                      >
                        {val}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SLA Enforcement Rules */}
              <div className="rounded-2xl border border-[#E5DEFF] bg-white p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider">
                  Automated SLA Escalation Rules
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#111111]">Pre-Breach Warning</h4>
                      <p className="text-[11px] text-zinc-500">Alert agent when 20% time left</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifyOnWarning(!notifyOnWarning)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${notifyOnWarning ? "bg-[#905FEB]" : "bg-zinc-300"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifyOnWarning ? "translate-x-6" : "translate-x-1"
                          }`}
                      />
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#111111]">Pause Off-Hours</h4>
                      <p className="text-[11px] text-zinc-500">Stop clock outside 08:00-23:00</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPauseSlaOffHours(!pauseSlaOffHours)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${pauseSlaOffHours ? "bg-[#905FEB]" : "bg-zinc-300"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pauseSlaOffHours ? "translate-x-6" : "translate-x-1"
                          }`}
                      />
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#111111]">Auto-Escalate Breach</h4>
                      <p className="text-[11px] text-zinc-500">Page Mentor Lead immediately</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoEscalateBreach(!autoEscalateBreach)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${autoEscalateBreach ? "bg-[#905FEB]" : "bg-zinc-300"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoEscalateBreach ? "translate-x-6" : "translate-x-1"
                          }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Auto-Routing Dispatch */}
            <TabsContent value="routing" className="space-y-3.5 mt-0">
              <div className="p-4 rounded-2xl bg-white border border-[#E5DEFF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center font-bold">
                    <UserCheck className="h-5 w-5 text-[#905FEB]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#111111]">Intelligent Dispatch Engine</h3>
                    <p className="text-xs text-zinc-500 font-medium">
                      Control how incoming doubt queries and live chats are automatically assigned to online mentors.
                    </p>
                  </div>
                </div>
                <span className="badge-status-completed text-xs font-bold px-3 py-1">
                  Active Algorithm: {autoAssignMode === "load_balanced" ? "Load-Balanced" : "Specialty"}
                </span>
              </div>

              {/* 3 Interactive Strategy Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {[
                  {
                    id: "load_balanced",
                    title: "Dynamic Load-Balanced",
                    badge: "Recommended",
                    badgeClass: "badge-status-completed",
                    icon: Zap,
                    desc: "Assigns incoming tickets dynamically to the online mentor with the lowest active workload.",
                    benefit: "Minimizes queue bottleneck & guarantees fastest first response.",
                  },
                  {
                    id: "round_robin",
                    title: "Sequential Round-Robin",
                    badge: "Even Spread",
                    badgeClass: "badge-status-in-progress",
                    icon: RefreshCw,
                    desc: "Cycles evenly through all active agents in rotation regardless of their current ticket queue.",
                    benefit: "Ensures equal distribution of student inquiries across shifts.",
                  },
                  {
                    id: "skill_based",
                    title: "Specialty & Course-Based",
                    badge: "Curriculum Match",
                    badgeClass: "badge-status-assigned",
                    icon: Layers,
                    desc: "Parses course tags to route LLM/Agentic inquiries to technical mentors and fee questions to billing desk.",
                    benefit: "Highest first-contact resolution accuracy for complex doubt queries.",
                  },
                ].map((strategy) => {
                  const isSelected = autoAssignMode === strategy.id;
                  const Icon = strategy.icon;
                  return (
                    <div
                      key={strategy.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setAutoAssignMode(strategy.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setAutoAssignMode(strategy.id);
                        }
                      }}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between space-y-3 bg-white shadow-xs hover:shadow-md ${isSelected
                        ? "border-[#905FEB] ring-2 ring-[#905FEB]/20 bg-[#FAF9FF]"
                        : "border-[#E5DEFF] hover:border-[#905FEB]/40"
                        }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold ${isSelected
                              ? "bg-[#905FEB] text-white shadow-xs"
                              : "bg-[#F0EDFF] text-[#7042D2]"
                              }`}
                          >
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <span className={`${strategy.badgeClass} text-[10px] font-bold px-2.5 py-0.5`}>
                            {strategy.badge}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-[#111111] leading-snug">
                          {strategy.title}
                        </h4>
                        <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                          {strategy.desc}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#F0EDFF] flex items-center justify-between text-[11px] text-[#7042D2] font-semibold">
                        <span>{strategy.benefit}</span>
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center ${isSelected
                            ? "border-[#905FEB] bg-[#905FEB] text-white"
                            : "border-zinc-300 bg-white"
                            }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Guardrails and Overflow Controls */}
              <div className="rounded-2xl border border-[#E5DEFF] bg-white p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider">
                  Capacity Guardrails &amp; Overflows
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#111111] flex items-center justify-between">
                      <span>Maximum Open Inquiries Per Mentor</span>
                      <span className="text-xs font-bold text-[#7042D2]">{maxTicketsPerAgent} active tickets</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {["6", "8", "10", "12"].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setMaxTicketsPerAgent(val)}
                          className={`flex-1 py-1.5 text-xs rounded-full font-bold cursor-pointer transition-all ${maxTicketsPerAgent === val
                            ? "bg-[#905FEB] text-white shadow-xs"
                            : "bg-[#F3F4F6] text-zinc-600 hover:bg-[#E5DEFF]"
                            }`}
                        >
                          {val} Max
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-zinc-500 pt-1">
                      When all mentors reach this threshold, new queries buffer into priority escalation queue.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#111111]">Away Mentor Auto-Reassign</h4>
                        <p className="text-[11px] text-zinc-500">Reassign tickets if agent inactive &gt; 10 mins</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReassignOnAway(!reassignOnAway)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${reassignOnAway ? "bg-[#905FEB]" : "bg-zinc-300"
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${reassignOnAway ? "translate-x-6" : "translate-x-1"
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Webhooks & Alert Channels */}
            <TabsContent value="alerts" className="space-y-3.5 mt-0">
              <div className="p-4 rounded-2xl bg-white border border-[#E5DEFF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center font-bold">
                    <Webhook className="h-5 w-5 text-[#905FEB]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#111111]">Webhook Alerts &amp; Integrations</h3>
                    <p className="text-xs text-zinc-500 font-medium">
                      Dispatch real-time webhooks to Slack channels and emergency SMS gateways upon SLA risk.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={isTestingWebhook}
                  className="btn-support-secondary text-xs h-8.5 px-3.5 font-bold cursor-pointer shrink-0"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isTestingWebhook ? "animate-spin" : ""}`} />
                  <span>{isTestingWebhook ? "Pinging..." : "Test Webhook"}</span>
                </button>
              </div>

              {webhookTestResult && (
                <div className="p-3.5 rounded-2xl bg-[#EAFCC7] border border-[#AEEB00]/60 text-[#3B6600] text-xs font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
                  <CheckCircle2 className="h-4 w-4 text-[#3B6600] shrink-0" />
                  <span>{webhookTestResult}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {/* Slack Channel Integration */}
                <div className="rounded-2xl border border-[#E5DEFF] bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFF]">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-[#F0EDFF] text-[#7042D2] flex items-center justify-center font-bold">
                        <Webhook className="h-4 w-4 text-[#905FEB]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-[#111111]">Slack Escalation Webhook</h4>
                        <p className="text-[10px] text-zinc-500 font-medium">Posts rich message card to #support-escalations</p>
                      </div>
                    </div>
                    <span className="badge-status-completed text-[10px] font-bold px-2.5 py-0.5">
                      Connected
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#111111]">Incoming Webhook URL</label>
                      <Input
                        value={slackWebhook}
                        onChange={(e) => setSlackWebhook(e.target.value)}
                        className="h-9.5 text-xs rounded-full border-[#E5DEFF] px-3.5 font-mono text-zinc-700 focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20"
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-bold text-[#111111] block">Automatic Trigger Conditions</span>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifyOnP1}
                            onChange={(e) => setNotifyOnP1(e.target.checked)}
                            className="rounded border-[#E5DEFF] text-[#905FEB] focus:ring-[#905FEB]"
                          />
                          <span>Immediate ping on P1 Critical ticket creation</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifyOnWarning}
                            onChange={(e) => setNotifyOnWarning(e.target.checked)}
                            className="rounded border-[#E5DEFF] text-[#905FEB] focus:ring-[#905FEB]"
                          />
                          <span>Warning alert when ticket reaches 15 minutes to SLA breach</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifyOnLowCsat}
                            onChange={(e) => setNotifyOnLowCsat(e.target.checked)}
                            className="rounded border-[#E5DEFF] text-[#905FEB] focus:ring-[#905FEB]"
                          />
                          <span>Alert on customer satisfaction rating &lt; 3.0 stars</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email & Browser Push */}
                <div className="rounded-2xl border border-[#E5DEFF] bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0EDFF]">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-[#F0EDFF] text-[#7042D2] flex items-center justify-center font-bold">
                        <Bell className="h-4 w-4 text-[#905FEB]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-[#111111]">Email &amp; Desktop Telemetry</h4>
                        <p className="text-[10px] text-zinc-500 font-medium">Broadcasts to mentor leads &amp; audio chimes</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#111111]">Mentor Lead Distribution Email</label>
                      <Input
                        value={mentorLeadEmail}
                        onChange={(e) => setMentorLeadEmail(e.target.value)}
                        className="h-9.5 text-xs rounded-full border-[#E5DEFF] px-3.5 font-mono text-zinc-700 focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20"
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="p-3 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-[#111111]">Browser Push Notifications</h4>
                          <p className="text-[11px] text-zinc-500">Alert agent on new live chats when tab backgrounded</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBrowserPush(!browserPush)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${browserPush ? "bg-[#905FEB]" : "bg-zinc-300"
                            }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${browserPush ? "translate-x-6" : "translate-x-1"
                              }`}
                          />
                        </button>
                      </div>

                      <div className="p-3 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-[#111111]">New Chat Audio Chimes</h4>
                          <p className="text-[11px] text-zinc-500">Play pleasant audio chime on student arrival</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAudioChimes(!audioChimes)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${audioChimes ? "bg-[#905FEB]" : "bg-zinc-300"
                            }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${audioChimes ? "translate-x-6" : "translate-x-1"
                              }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 5: AI Copilot & Macro Automations */}
            <TabsContent value="ai" className="space-y-3.5 mt-0">
              <div className="p-4 rounded-2xl bg-white border border-[#E5DEFF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 flex items-center justify-center font-bold">
                    <Sparkles className="h-5 w-5 text-[#905FEB]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#111111]">Quantum AI Copilot &amp; Fast Macros</h3>
                    <p className="text-xs text-zinc-500 font-medium">
                      Autonomous draft suggestions trained on Quantum LMS engineering curriculum &amp; doubt records.
                    </p>
                  </div>
                </div>
                <span className="badge-status-completed text-xs font-bold px-3 py-1 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-[#3B6600]" />
                  LLM Model v4.5 Ready
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl border border-[#E5DEFF] bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-xl bg-[#F0EDFF] text-[#7042D2] flex items-center justify-center font-bold">
                      <Bot className="h-4 w-4 text-[#905FEB]" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiCopilotEnabled(!aiCopilotEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${aiCopilotEnabled ? "bg-[#905FEB]" : "bg-zinc-300"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aiCopilotEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                      />
                    </button>
                  </div>
                  <h4 className="text-sm font-extrabold text-[#111111]">AI Auto-Draft Responses</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    Synthesizes code snippets and curriculum explanations directly into the agent&apos;s chat draft box.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-[#E5DEFF] bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-xl bg-[#F0EDFF] text-[#7042D2] flex items-center justify-center font-bold">
                      <Activity className="h-4 w-4 text-[#905FEB]" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSentimentAnalysis(!sentimentAnalysis)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${sentimentAnalysis ? "bg-[#905FEB]" : "bg-zinc-300"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${sentimentAnalysis ? "translate-x-6" : "translate-x-1"
                          }`}
                      />
                    </button>
                  </div>
                  <h4 className="text-sm font-extrabold text-[#111111]">Live Frustration Detector</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    Flags anxious learners in real-time and elevates queue priority to prevent negative CSAT ratings.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-[#E5DEFF] bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-xl bg-[#F0EDFF] text-[#7042D2] flex items-center justify-center font-bold">
                      <FileText className="h-4 w-4 text-[#905FEB]" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoSummarizeThreads(!autoSummarizeThreads)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${autoSummarizeThreads ? "bg-[#905FEB]" : "bg-zinc-300"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSummarizeThreads ? "translate-x-6" : "translate-x-1"
                          }`}
                      />
                    </button>
                  </div>
                  <h4 className="text-sm font-extrabold text-[#111111]">Thread Handoff Summarizer</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    Automatically generates 3-bullet handover summaries when tickets transfer between shifts.
                  </p>
                </div>
              </div>

              {/* Fast Canned Macros Library */}
              <div className="rounded-2xl border border-[#E5DEFF] bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider">
                    Frequently Used Canned Macros (Figma Label Buttons)
                  </h3>
                  <button
                    type="button"
                    className="btn-support-secondary text-[11px] h-7 px-3 font-bold cursor-pointer"
                  >
                    + Create New Macro
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      cmd: "#replay-extend",
                      title: "30-Day Replay Extension",
                      category: "Academic",
                    },
                    {
                      cmd: "#batch-move",
                      title: "Cohort Shift Request Form",
                      category: "Operations",
                    },
                    {
                      cmd: "#gpu-reset",
                      title: "Jupyter Kernel GPU Reset",
                      category: "Technical",
                    },
                  ].map((m) => (
                    <div
                      key={m.cmd}
                      className="p-3 rounded-xl border border-[#E5DEFF] bg-[#FAF9FF] flex items-center justify-between hover:border-[#905FEB]/50 cursor-pointer transition-all group"
                    >
                      <div>
                        <span className="font-mono text-[10px] font-bold text-[#7042D2] block">
                          {m.cmd}
                        </span>
                        <p className="text-xs font-bold text-[#111111] group-hover:text-[#905FEB]">
                          {m.title}
                        </p>
                      </div>
                      <span className="badge-status-in-progress text-[9px] font-bold px-2 py-0.5">
                        {m.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default SupportSettingsPage;
