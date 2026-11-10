import { CalendarClock, CirclePlay, GraduationCap, Layers, type LucideIcon } from "lucide-react"

export type ApprovalCategory = "class_schedule" | "curriculum_item" | "video_recording" | "publish_grade"
export type ApprovalStatus = "Pending" | "Approved" | "Revision Requested"

export interface ApprovalRecord {
  id: string
  category: ApprovalCategory
  title: string
  courseName: string
  courseCode: string
  moduleName?: string
  instructor: string
  submittedAt: string
  status: ApprovalStatus
  /** Reviewer comment saved with the decision. */
  reviewNote?: string
  /** When the decision was made (ISO). */
  decidedAt?: string
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

export interface CategoryMeta {
  label: string
  short: string
  icon: LucideIcon
  /** Soft tile: background, text and ring. */
  tile: string
  /** Solid accent used for the left rail and dots. */
  accent: string
  checklist: string[]
}

export const CATEGORY_META: Record<ApprovalCategory, CategoryMeta> = {
  class_schedule: {
    label: "Class schedule",
    short: "Schedules",
    icon: CalendarClock,
    tile: "bg-info-soft text-info ring-info/20",
    accent: "bg-info",
    checklist: ["No clash with the existing timetable", "Room or studio is available", "Learners get at least 48 hours notice"],
  },
  curriculum_item: {
    label: "Assignment & material",
    short: "Curriculum",
    icon: Layers,
    tile: "bg-primary-soft text-primary-text ring-primary-border",
    accent: "bg-primary",
    checklist: ["Matches the module outcomes", "Marking scheme or answer key attached", "No licensing or plagiarism concerns"],
  },
  video_recording: {
    label: "Class recording",
    short: "Recordings",
    icon: CirclePlay,
    tile: "bg-warning-soft text-warning ring-warning/20",
    accent: "bg-warning",
    checklist: ["Audio and video quality checked", "Chapters and transcript look right", "No private information on screen"],
  },
  publish_grade: {
    label: "Grade release",
    short: "Grades",
    icon: GraduationCap,
    tile: "bg-success-soft text-success ring-success/20",
    accent: "bg-success",
    checklist: ["Every submission is graded", "Score distribution looks reasonable", "Feedback written for low scores"],
  },
}

export const CATEGORIES = Object.keys(CATEGORY_META) as ApprovalCategory[]

export const STATUS_META: Record<ApprovalStatus, { label: string; tone: "warning" | "success" | "danger" }> = {
  Pending: { label: "Awaiting review", tone: "warning" },
  Approved: { label: "Approved", tone: "success" },
  "Revision Requested": { label: "Changes requested", tone: "danger" },
}

export const STORAGE_KEY = "admin:teacher_approvals"

export const SEED_APPROVALS: ApprovalRecord[] = [
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

export function loadApprovals(): ApprovalRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // fall back to the seed queue
  }
  return SEED_APPROVALS
}

export function formatDecidedAt(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
}

export function formatClassDate(date?: string): string {
  if (!date) return ""
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
}

