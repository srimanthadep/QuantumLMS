import { useState, useEffect, useMemo } from "react"
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  ListChecks,
  PlayCircle,
  Radio,
  Search,
  Sparkles,
  Upload,
  User,
  Video,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export interface ApprovalRecord {
  id: string
  category: "class_schedule" | "curriculum_item" | "video_recording" | "publish_grade"
  title: string
  courseName: string
  courseCode: string
  moduleName?: string
  instructor: string
  submittedAt: string
  status: "Pending" | "Approved" | "Revision Requested"
  details: {
    type?: string
    date?: string
    time?: string
    duration?: string
    marks?: number
    passingMarks?: number
    timeLimit?: string
    submissionsGraded?: number
    averageScore?: number
    chaptersCount?: number
    fileSize?: string
    notes?: string
  }
}

const INITIAL_APPROVAL_RECORDS: ApprovalRecord[] = [
  // 1. Classes Schedule Approval
  {
    id: "appr-sched-1",
    category: "class_schedule",
    title: "Deep Dive: Fine-Tuning Llama-3 with LoRA & QLoRA",
    courseName: "GenAI Engineering (LLMs & Multi-Agent)",
    courseCode: "AI-301",
    instructor: "Srimanth",
    submittedAt: "Today, 09:30 AM",
    status: "Pending",
    details: {
      date: "2026-11-12",
      time: "7:00 PM - 8:45 PM IST",
      duration: "105 mins",
      type: "Live Classroom (Studio)",
      notes: "Interactive GPU cluster demo requiring learner compute instances.",
    },
  },
  {
    id: "appr-sched-2",
    category: "class_schedule",
    title: "Graph RAG Architecture & Vector Index Sharding",
    courseName: "Agentic Systems & Workflow Automation",
    courseCode: "AI-302",
    instructor: "Shanmuk",
    submittedAt: "Yesterday, 04:15 PM",
    status: "Pending",
    details: {
      date: "2026-11-14",
      time: "6:30 PM - 8:00 PM IST",
      duration: "90 mins",
      type: "Live Interactive Lab",
      notes: "Requires Neo4j sandbox instance activation.",
    },
  },

  // 2. Assignment, Quiz & Material Upload Approval
  {
    id: "appr-curr-1",
    category: "curriculum_item",
    title: "Production RAG Evaluator with Ragas & TruLens",
    courseName: "GenAI Engineering (LLMs & Multi-Agent)",
    courseCode: "AI-301",
    moduleName: "Module 3: Retrieval Augmented Generation",
    instructor: "Srimanth",
    submittedAt: "Today, 10:15 AM",
    status: "Pending",
    details: {
      type: "Coding Lab Assignment",
      marks: 100,
      notes: "Hands-on pipeline evaluation with automated unit tests.",
    },
  },
  {
    id: "appr-curr-2",
    category: "curriculum_item",
    title: "Attention Mechanism & KV-Cache Checkpoint Assessment",
    courseName: "GenAI Engineering (LLMs & Multi-Agent)",
    courseCode: "AI-301",
    moduleName: "Module 1: Transformers Architecture",
    instructor: "Srimanth",
    submittedAt: "Today, 10:45 AM",
    status: "Pending",
    details: {
      type: "Timed Quiz Assessment",
      marks: 100,
      passingMarks: 65,
      timeLimit: "30 mins",
      notes: "20 multiple choice questions with code snippets.",
    },
  },
  {
    id: "appr-curr-3",
    category: "curriculum_item",
    title: "FlashAttention-2 & Memory Bandwidth Reference Guide",
    courseName: "GenAI Engineering (LLMs & Multi-Agent)",
    courseCode: "AI-301",
    moduleName: "Module 2: LLM Inference Optimization",
    instructor: "Srimanth",
    submittedAt: "Yesterday, 06:00 PM",
    status: "Pending",
    details: {
      type: "Study Material (PDF)",
      fileSize: "PDF · 4.8 MB",
      notes: "Supplementary hardware architecture schematics.",
    },
  },

  // 3. Video Approval for Sending Learners after Live Class Recording
  {
    id: "appr-vid-1",
    category: "video_recording",
    title: "Live Class: Decision Trees, Entropy & Information Gain",
    courseName: "GenAI Engineering (LLMs & Multi-Agent)",
    courseCode: "AI-301",
    moduleName: "Module 2: Machine Learning Fundamentals",
    instructor: "Srimanth",
    submittedAt: "Today, 11:50 AM",
    status: "Pending",
    details: {
      duration: "50 mins",
      chaptersCount: 5,
      fileSize: "1080p Full HD · 640 MB",
      notes: "Live recording completed and auto-chaptered. Verified audio clarity.",
    },
  },

  // 4. Publish Grade Approval
  {
    id: "appr-grd-1",
    category: "publish_grade",
    title: "Module 1 Milestone: Multi-Head Attention from Scratch",
    courseName: "GenAI Engineering (LLMs & Multi-Agent)",
    courseCode: "AI-301",
    moduleName: "Module 1: Transformers Architecture",
    instructor: "Srimanth",
    submittedAt: "Today, 11:10 AM",
    status: "Pending",
    details: {
      submissionsGraded: 24,
      averageScore: 86,
      marks: 100,
      notes: "All 24 submissions graded with detailed feedback rubrics. Ready to publish to learner report cards.",
    },
  },
]

const STORAGE_KEY = "admin:teacher_approvals"

interface TeacherApprovalsViewProps {
  onToast: (msg: string) => void
}

export default function TeacherApprovalsView({ onToast }: TeacherApprovalsViewProps) {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return INITIAL_APPROVAL_RECORDS
  })

  const [activeTab, setActiveTab] = useState<string>("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(approvals))
    } catch {
      // ignore
    }
  }, [approvals])

  const pendingCount = useMemo(() => approvals.filter((a) => a.status === "Pending").length, [approvals])

  const counts = useMemo(
    () => ({
      all: approvals.length,
      class_schedule: approvals.filter((a) => a.category === "class_schedule").length,
      curriculum_item: approvals.filter((a) => a.category === "curriculum_item").length,
      video_recording: approvals.filter((a) => a.category === "video_recording").length,
      publish_grade: approvals.filter((a) => a.category === "publish_grade").length,
    }),
    [approvals],
  )

  const handleApprove = (id: string, title: string) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "Approved" } : item)),
    )
    onToast(`Approved: "${title}" — changes are now live for learners.`)
  }

  const handleRequestRevision = (id: string, title: string) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "Revision Requested" } : item)),
    )
    onToast(`Requested revision for: "${title}". Notification sent to instructor.`)
  }

  const filteredItems = useMemo(() => {
    return approvals.filter((item) => {
      const matchTab = activeTab === "all" || item.category === activeTab
      const matchQuery =
        !search.trim() ||
        `${item.title} ${item.courseName} ${item.instructor} ${item.courseCode}`
          .toLowerCase()
          .includes(search.toLowerCase())
      return matchTab && matchQuery
    })
  }, [approvals, activeTab, search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Teacher Approvals Queue
            </h1>
            {pendingCount > 0 && (
              <Badge tone="warning" className="animate-pulse">
                {pendingCount} Pending Review
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Review and verify teacher schedule requests, new assignments &amp; study materials, post-class recordings, and published student grades.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setApprovals(INITIAL_APPROVAL_RECORDS)
              onToast("Reset sample approvals queue")
            }}
          >
            Reset Queue
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-soft text-info">
              <Calendar className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Class Schedules</p>
              <p className="text-xl font-bold tabular-nums text-foreground">{counts.class_schedule}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
              <Layers className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assignments &amp; Materials</p>
              <p className="text-xl font-bold tabular-nums text-foreground">{counts.curriculum_item}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-soft text-warning">
              <PlayCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Video Recordings</p>
              <p className="text-xl font-bold tabular-nums text-foreground">{counts.video_recording}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-soft text-success">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Grade Releases</p>
              <p className="text-xl font-bold tabular-nums text-foreground">{counts.publish_grade}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Tabs Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by title, instructor, or course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs text-xs"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs">
              All ({approvals.length})
            </TabsTrigger>
            <TabsTrigger value="class_schedule" className="text-xs">
              Schedules ({counts.class_schedule})
            </TabsTrigger>
            <TabsTrigger value="curriculum_item" className="text-xs">
              Curriculum ({counts.curriculum_item})
            </TabsTrigger>
            <TabsTrigger value="video_recording" className="text-xs">
              Videos ({counts.video_recording})
            </TabsTrigger>
            <TabsTrigger value="publish_grade" className="text-xs">
              Grades ({counts.publish_grade})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Approvals List */}
      <div className="space-y-3.5">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No approval requests in this category matching your search.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isApproved = item.status === "Approved"
            const isRevision = item.status === "Revision Requested"

            return (
              <Card
                key={item.id}
                className="overflow-hidden border border-border transition-all hover:border-border-strong/70"
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          item.category === "class_schedule"
                            ? "info"
                            : item.category === "curriculum_item"
                              ? "primary"
                              : item.category === "video_recording"
                                ? "warning"
                                : "success"
                        }
                        size="sm"
                      >
                        {item.category === "class_schedule"
                          ? "Class Schedule"
                          : item.category === "curriculum_item"
                            ? "Assignment / Material"
                            : item.category === "video_recording"
                              ? "Video Recording"
                              : "Publish Grade"}
                      </Badge>

                      <Badge
                        tone={isApproved ? "success" : isRevision ? "danger" : "warning"}
                        size="sm"
                      >
                        {item.status}
                      </Badge>

                      <span className="text-[11px] text-muted-foreground">
                        Submitted {item.submittedAt} by <strong className="text-foreground">{item.instructor}</strong>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {item.courseCode} · {item.courseName}
                        {item.moduleName && ` · ${item.moduleName}`}
                      </p>
                    </div>

                    {/* Metadata Pill Box */}
                    <div className="flex flex-wrap gap-2 pt-1 text-xs text-foreground">
                      {item.details.date && (
                        <span className="rounded-md border border-border bg-surface-2 px-2.5 py-1">
                          📅 <strong>Date:</strong> {item.details.date} ({item.details.time})
                        </span>
                      )}
                      {item.details.duration && (
                        <span className="rounded-md border border-border bg-surface-2 px-2.5 py-1">
                          ⏱️ <strong>Length:</strong> {item.details.duration}
                        </span>
                      )}
                      {item.details.type && (
                        <span className="rounded-md border border-border bg-surface-2 px-2.5 py-1">
                          🏷️ <strong>Format:</strong> {item.details.type}
                        </span>
                      )}
                      {item.details.marks !== undefined && (
                        <span className="rounded-md border border-border bg-surface-2 px-2.5 py-1">
                          🎯 <strong>Max Marks:</strong> {item.details.marks}
                        </span>
                      )}
                      {item.details.timeLimit && (
                        <span className="rounded-md border border-border bg-surface-2 px-2.5 py-1">
                          ⏳ <strong>Time Limit:</strong> {item.details.timeLimit}
                        </span>
                      )}
                      {item.details.submissionsGraded !== undefined && (
                        <span className="rounded-md border border-border bg-surface-2 px-2.5 py-1">
                          🎓 <strong>Submissions Graded:</strong> {item.details.submissionsGraded} (Avg: {item.details.averageScore}%)
                        </span>
                      )}
                      {item.details.chaptersCount && (
                        <span className="rounded-md border border-border bg-surface-2 px-2.5 py-1">
                          📑 <strong>Chapters:</strong> {item.details.chaptersCount} chapters
                        </span>
                      )}
                    </div>

                    {item.details.notes && (
                      <p className="rounded-md border border-info/20 bg-info-soft/40 p-2.5 text-xs text-info">
                        <strong>Instructor Note:</strong> {item.details.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2 shrink-0 sm:min-w-[150px] justify-end">
                    {isApproved ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-success py-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Approved &amp; Active
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          className="h-8"
                          onClick={() => handleApprove(item.id, item.title)}
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => handleRequestRevision(item.id, item.title)}
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          Request Changes
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
