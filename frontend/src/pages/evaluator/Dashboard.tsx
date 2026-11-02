import React, { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpenCheck,
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  FileText,
  Calendar,
  Award,
  Zap,
  TrendingUp,
  User,
  ExternalLink,
  ChevronRight,
  Flame,
  ShieldCheck,
  Check,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  StatCard,
  SegmentedControl,
  Avatar,
  Progress,
} from "@/components/ui"
import AreaChart, { type AreaSeries } from "@/components/charts/AreaChart"
import ProgressRing from "@/components/charts/ProgressRing"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import AnimatedNumber from "@/components/motion/AnimatedNumber"
import Reveal from "@/components/motion/Reveal"
import { StatusBadge, TypeBadge } from "./components/StatusBadge"
import type { EvaluatorState } from "./data/evaluatorStorage"
import { getDashboardMetrics } from "./data/evaluatorStorage"
import type { EvaluatorTab, StudentSubmission, EvaluatorAssessment } from "./types"

interface DashboardProps {
  state: EvaluatorState
  onNavigateTab: (tab: EvaluatorTab, context?: any) => void
  onOpenWorkspace: (submission: StudentSubmission) => void
}

type PaceRange = "week" | "term"

const THROUGHPUT_DATA: Record<PaceRange, { labels: string[]; target: number[]; actual: number[] }> = {
  week: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    target: [8, 8, 8, 8, 8, 5, 5],
    actual: [9, 11, 7, 12, 10, 6, 8],
  },
  term: {
    labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"],
    target: [30, 35, 40, 45, 45, 50, 50, 50],
    actual: [32, 38, 44, 49, 48, 55, 52, 58],
  },
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function Dashboard({
  state,
  onNavigateTab,
  onOpenWorkspace,
}: DashboardProps) {
  const [paceRange, setPaceRange] = useState<PaceRange>("week")
  const [queueFilter, setQueueFilter] = useState<"all" | "drafts" | "urgent" | "reassessment">("all")

  const {
    totalAssigned,
    pendingEvaluations,
    completedEvaluations,
    upcomingDeadlinesCount,
  } = getDashboardMetrics(state)

  const completionRate = useMemo(() => {
    const total = completedEvaluations + pendingEvaluations
    if (total === 0) return 0
    return Math.round((completedEvaluations / total) * 100)
  }, [completedEvaluations, pendingEvaluations])

  // Reassessment count
  const reassessmentCount = useMemo(() => {
    return state.submissions.filter((s) => s.status.includes("Reassessment")).length
  }, [state.submissions])

  // Submissions needing attention
  const prioritySubmissions = useMemo(() => {
    let list = state.submissions.filter((s) => s.status !== "Evaluated")

    if (queueFilter === "drafts") {
      list = list.filter((s) => s.status === "Draft Saved")
    } else if (queueFilter === "urgent") {
      list = list.filter((s) => s.status === "Submitted" || s.status === "In Progress")
    } else if (queueFilter === "reassessment") {
      list = list.filter((s) => s.status.includes("Reassessment"))
    }

    // Sort drafts and reassessments first
    return list.sort((a, b) => {
      if (a.status.includes("Reassessment")) return -1
      if (b.status.includes("Reassessment")) return 1
      if (a.status === "Draft Saved") return -1
      if (b.status === "Draft Saved") return 1
      return new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime()
    }).slice(0, 6)
  }, [state.submissions, queueFilter])

  // Find next submission to grade
  const handleContinueNextPending = () => {
    const draft = state.submissions.find((s) => s.status === "Draft Saved")
    if (draft) {
      onOpenWorkspace(draft)
      return
    }
    const reassessment = state.submissions.find((s) => s.status.includes("Reassessment"))
    if (reassessment) {
      onOpenWorkspace(reassessment)
      return
    }
    const nextSubmitted = state.submissions.find(
      (s) => s.status === "Submitted" || s.status === "In Progress"
    )
    if (nextSubmitted) {
      onOpenWorkspace(nextSubmitted)
      return
    }
    onNavigateTab("Submissions")
  }

  // Throughput chart series
  const throughputSeries: AreaSeries[] = useMemo(() => {
    const data = THROUGHPUT_DATA[paceRange]
    return [
      {
        name: "Actual Evaluated",
        values: data.actual,
        color: "var(--primary-text)",
      },
      {
        name: "SLA Benchmark",
        values: data.target,
        color: "var(--success)",
      },
    ]
  }, [paceRange])

  // Course breakdown stats
  const courseBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>()
    for (const sub of state.submissions) {
      const existing = map.get(sub.course) || { total: 0, completed: 0 }
      existing.total += 1
      if (sub.status === "Evaluated") existing.completed += 1
      map.set(sub.course, existing)
    }
    return Array.from(map.entries()).map(([course, stats]) => ({
      course,
      total: stats.total,
      completed: stats.completed,
      pct: Math.round((stats.completed / Math.max(1, stats.total)) * 100),
    }))
  }, [state.submissions])

  return (
    <div className="space-y-6">
      {/* 1. Hero Assessor Greeting Banner */}
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-primary-border bg-gradient-to-r from-primary-soft/60 via-surface to-secondary-soft/30 p-6 shadow-xs">
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 right-40 h-48 w-48 rounded-full bg-secondary/15 blur-2xl" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary" dot className="font-semibold">
                  Assessor Command Center
                </Badge>
                <Badge tone="success" size="sm">
                  <ShieldCheck className="h-3 w-3 mr-1 inline" />
                  SLA Health 96.4%
                </Badge>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs font-medium text-muted-foreground">
                  Apex AI Examination Board
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {greeting()}, {state.settings.profile.name}
              </h1>

              <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
                You have <strong className="text-foreground">{pendingEvaluations} submissions</strong> waiting in your grading queue, including{" "}
                <strong className="text-danger font-semibold">{reassessmentCount} re-evaluation appeals</strong>. Your average turnaround is{" "}
                <span className="text-primary-text font-semibold">14.2 hours</span> (well within the 24h SLA).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                variant="primary"
                size="lg"
                onClick={handleContinueNextPending}
                className="group relative shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4 text-primary-foreground group-hover:scale-110 transition-transform" />
                <span>Resume Grading</span>
                <ArrowRight className="h-4 w-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => onNavigateTab("Submissions", { filter: "reassessment" })}
                className="cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 text-danger" />
                <span>Re-evaluations</span>
                {reassessmentCount > 0 && (
                  <Badge tone="danger" size="sm" className="ml-1.5 font-bold">
                    {reassessmentCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 2. Four Key Stat Cards */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <StatCard
            title="Pending Evaluations"
            value={pendingEvaluations}
            subtitle="In your queue"
            tone="warning"
            change="3 due in < 6h"
            trend={{ value: "Priority SLA", isPositive: false }}
            sparkline={[14, 18, 16, 22, 19, pendingEvaluations]}
            onClick={() => onNavigateTab("Submissions")}
            className="cursor-pointer transition-all hover:border-warning/40 hover:shadow-md"
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            title="Evaluated This Term"
            value={completedEvaluations}
            subtitle={`${completionRate}% overall progress`}
            tone="success"
            change="+14 this week"
            trend={{ value: "+18% vs avg", isPositive: true }}
            sparkline={[20, 28, 36, 44, 52, completedEvaluations]}
            onClick={() => onNavigateTab("Submissions", { filter: "published" })}
            className="cursor-pointer transition-all hover:border-success/40 hover:shadow-md"
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            title="Re-evaluation Appeals"
            value={reassessmentCount}
            subtitle="Student requests"
            tone="danger"
            change="Urgent review"
            trend={{ value: "SLA: 48h", isPositive: false }}
            sparkline={[1, 0, 2, 1, 3, reassessmentCount]}
            onClick={() => onNavigateTab("Submissions", { filter: "reassessment" })}
            className="cursor-pointer transition-all hover:border-danger/40 hover:shadow-md"
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            title="Average Turnaround"
            value="14.2h"
            subtitle="Target: < 24.0h"
            tone="primary"
            change="2.1h faster than benchmark"
            trend={{ value: "Top 5% Pace", isPositive: true }}
            sparkline={[19, 17, 16, 15, 14.8, 14.2]}
            onClick={() => onNavigateTab("Reports")}
            className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
          />
        </StaggerItem>
      </Stagger>

      {/* 3. Main Analytics & Radar (2 Columns) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column (7 cols): Grading Throughput Chart */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border/80 shadow-xs hover:border-border transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-bold text-foreground">
                    Grading Throughput & Velocity
                  </CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">
                  Daily evaluations completed vs institutional SLA benchmarks
                </p>
              </div>

              <SegmentedControl
                aria-label="Throughput pace range"
                size="sm"
                options={[
                  { value: "week", label: "Week" },
                  { value: "term", label: "Term" },
                ]}
                value={paceRange}
                onChange={(v) => setPaceRange(v as PaceRange)}
              />
            </CardHeader>

            <CardContent className="pt-2">
              <AreaChart
                labels={THROUGHPUT_DATA[paceRange].labels}
                series={throughputSeries}
                height={220}
                className="mt-1"
                formatValue={(v) => `${v} graded`}
              />

              <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-border">
                <div className="rounded-xl bg-surface-2/60 p-3 text-center">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Scoring Consistency
                  </span>
                  <span className="text-lg font-bold text-foreground mt-0.5 block">
                    99.4%
                  </span>
                  <span className="text-[10px] text-success font-medium">Rubric verified</span>
                </div>

                <div className="rounded-xl bg-surface-2/60 p-3 text-center">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Average Score Awarded
                  </span>
                  <span className="text-lg font-bold text-foreground mt-0.5 block">
                    81.6%
                  </span>
                  <span className="text-[10px] text-muted-foreground">Normal bell curve</span>
                </div>

                <div className="rounded-xl bg-surface-2/60 p-3 text-center">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Criteria Checked
                  </span>
                  <span className="text-lg font-bold text-foreground mt-0.5 block">
                    348
                  </span>
                  <span className="text-[10px] text-primary-text font-medium">Across all courses</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (5 cols): Queue Completion & Course Capacity */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border/80 shadow-xs hover:border-border transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpenCheck className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-bold text-foreground">
                    Assigned Cohort Progress
                  </CardTitle>
                </div>
                <Badge tone="primary" size="sm">
                  {state.assessments.length} Active Courses
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Circular Progress & Overall Stats */}
              <div className="flex items-center gap-5 p-4 rounded-xl bg-surface-2/70 border border-border/60">
                <ProgressRing
                  value={completionRate}
                  size={76}
                  thickness={7}
                  tone={completionRate >= 75 ? "success" : "primary"}
                  showValue={false}
                >
                  <div className="text-center">
                    <span className="text-base font-black text-foreground">
                      <AnimatedNumber value={completionRate} />%
                    </span>
                  </div>
                </ProgressRing>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">
                    Cohort Evaluation Pace
                  </h4>
                  <p className="text-xs text-muted-foreground leading-snug">
                    <strong className="text-foreground">{completedEvaluations}</strong> of{" "}
                    <strong>{completedEvaluations + pendingEvaluations}</strong> total submissions assessed.
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                    <Check className="h-3 w-3" /> On schedule for grade publishing
                  </span>
                </div>
              </div>

              {/* Course-by-course micro progress */}
              <div className="space-y-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Course Breakdown
                </span>

                {courseBreakdown.map((item) => (
                  <div key={item.course} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground truncate max-w-[200px]" title={item.course}>
                        {item.course}
                      </span>
                      <span className="font-mono text-muted-foreground text-[11px]">
                        {item.completed} / {item.total} ({item.pct}%)
                      </span>
                    </div>
                    <Progress value={item.pct} className="h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Priority Grading Queue (Interactive Cards List) */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Priority Submissions Needing Evaluation
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review and grade student artifacts with instant rubric scoring
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SegmentedControl
              aria-label="Priority queue filter"
              size="sm"
              options={[
                { value: "all", label: "All Pending" },
                { value: "drafts", label: "Drafts" },
                { value: "urgent", label: "Needs Grading" },
                { value: "reassessment", label: "Appeals" },
              ]}
              value={queueFilter}
              onChange={(v) => setQueueFilter(v as any)}
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab("Submissions")}
              className="text-xs text-primary-text font-semibold hover:text-primary cursor-pointer shrink-0"
            >
              <span>View All ({pendingEvaluations})</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {prioritySubmissions.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-2" />
              <h4 className="text-sm font-bold text-foreground">
                All caught up in this view!
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                There are no pending submissions matching the selected filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prioritySubmissions.map((sub) => {
                const isReassessment = sub.status.includes("Reassessment")
                const isDraft = sub.status === "Draft Saved"

                return (
                  <motion.div
                    key={sub.id}
                    whileHover={{ y: -3 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`group relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                      isReassessment
                        ? "border-danger/30 bg-danger-soft/20 hover:border-danger hover:shadow-md"
                        : isDraft
                        ? "border-primary-border bg-primary-soft/20 hover:border-primary hover:shadow-md"
                        : "border-border/80 bg-surface hover:border-border hover:shadow-md"
                    }`}
                  >
                    <div>
                      {/* Top Row: Type badge and Status badge */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <TypeBadge type={sub.assessmentType} />
                        <StatusBadge status={sub.status} />
                      </div>

                      {/* Assessment Title */}
                      <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {sub.assessmentTitle}
                      </h4>

                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {sub.course}
                      </p>

                      {/* Student info */}
                      <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-border/60">
                        <Avatar
                          src={sub.studentAvatar}
                          name={sub.studentName}
                          size="sm"
                          className="ring-1 ring-border"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">
                            {sub.studentName}
                          </p>
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {sub.studentRoll}
                          </p>
                        </div>
                      </div>

                      {/* Files attached / Question count */}
                      <div className="flex items-center gap-2 mt-2.5 text-[11px] text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        <span>{sub.files?.length || 0} file(s) attached</span>
                        {sub.finalMarks !== undefined && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-foreground">
                              Draft: {sub.finalMarks} / {sub.maxMarks}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {sub.submissionDate}
                      </span>

                      <Button
                        variant={isReassessment ? "danger" : isDraft ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => onOpenWorkspace(sub)}
                        className="text-xs font-semibold cursor-pointer group-hover:scale-102 transition-transform"
                      >
                        <span>{isReassessment ? "Review Appeal" : isDraft ? "Continue Draft" : "Evaluate"}</span>
                        <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
