import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"

export interface AdminCourse {
  id: string
  title: string
  slug: string
  category: "LLM Engineering" | "Agentic Systems" | "Computer Vision" | "MLOps" | "AI Foundations" | string
  instructor: string
  instructorAvatar: string
  enrolledStudents: number
  capacity: number
  price: number
  revenue: number
  rating: number
  completionRate: number
  status: "Published" | "Draft" | "Archived"
  cohortCount: number
  updatedAt: string
}

export interface AdminBatch {
  id: string
  name: string
  courseId: string
  courseTitle: string
  instructor: string
  instructorAvatar: string
  startDate: string
  endDate: string
  schedule: string
  enrolledSeats: number
  maxSeats: number
  deliveryMode: "Live + Replay" | "Replay Only"
  replayDelayHours: number
  accessExpiryMonths: number
  features: {
    liveChat: boolean
    doubtClearing: boolean
    aiTutor: boolean
    certificate: boolean
  }
  status: "Active" | "Upcoming" | "Completed"
}

export interface AdminTeacher {
  id: string
  name: string
  email: string
  title: string
  specialization: string
  role: "Lead Instructor" | "Teaching Assistant" | "Evaluator"
  assignedCourses: string[]
  activeBatches: string[]
  studentCount: number
  rating: number
  status: "Live Now" | "Available" | "In Review" | "Off-Duty"
  avatar: string
  attendanceRate: number
}

export interface AdminStudent {
  id: string
  name: string
  email: string
  avatar: string
  courseId: string
  courseTitle: string
  batchId: string
  batchName: string
  enrolledAt: string
  progress: number
  attendanceRate: number
  evaluationScore: number
  status: "Active" | "Completed" | "At Risk" | "Paused"
}

export interface AdminOrder {
  id: string
  orderNumber: string
  studentId: string
  studentName: string
  studentEmail: string
  courseTitle: string
  amount: number
  currency: "INR"
  method: "Razorpay (UPI)" | "Razorpay (Card)" | "Razorpay (NetBanking)" | "Stripe (Card)" | "Corporate Wire"
  date: string
  status: "Paid" | "Refunded" | "Pending"
  refundReason?: string
  invoiceUrl?: string
}

export interface AcademySettings {
  name: string
  tagline: string
  domain: string
  supportEmail: string
  timezone: string
  currency: string
  gstNumber: string
  certificateSignatory: string
  autoIssueCertificates: boolean
  enablePublicVerification: boolean
  requireMfaForStaff: boolean
  notifyOnEnrolment: boolean
  notifyOnLowBatchSeats: boolean
  notifyOnRefundRequest: boolean
}

// Super Admin Interfaces
export interface PlatformServiceHealth {
  id: string
  name: string
  endpoint: string
  category: "Core API" | "Media & Video" | "AI Engine" | "Billing" | "Database & Storage"
  status: "Healthy" | "Degraded" | "Outage"
  uptime: number
  latencyMs: number
  lastIncident?: string
  sparkline: number[]
}

export interface TenantHub {
  id: string
  name: string
  type: "Enterprise Lab" | "Regional Hub" | "Research Guild" | "University Partner"
  location: string
  cloudRegion: string
  learnersCount: number
  coursesSubscribed: number
  aiTokensUsedMonthly: number
  aiTokenLimitMonthly: number
  status: "Active" | "Provisioning" | "Maintenance"
  contactPerson: string
  contactEmail: string
}

export interface RbacPermissionRow {
  id: string
  permission: string
  description: string
  category: "Curriculum" | "Classes & Video" | "Evaluations" | "Finance" | "Administration" | "AI & Models"
  superAdmin: boolean
  admin: boolean
  teacher: boolean
  evaluator: boolean
  support: boolean
  student: boolean
}

export interface SecurityAuditLog {
  id: string
  timestamp: string
  actorName: string
  actorRole: string
  actorEmail: string
  action: string
  category: "Auth" | "Course" | "Billing" | "RBAC" | "AI Engine" | "Security"
  target: string
  ip: string
  status: "Success" | "Warning" | "Refused"
  details: string
}

export interface AiUsageMetrics {
  totalTokensMonth: number
  totalCostInr: number
  tokensByFeature: {
    aiTutor: number
    videoChaptering: number
    transcription: number
    evaluatorAssist: number
  }
  primaryModel: string
  fallbackModel: string
  temperature: number
  strictnessScore: number
  monthlyBudgetCapInr: number
}

// Initial Seed Data
export const INITIAL_COURSES: AdminCourse[] = [
  {
    id: "course-1",
    title: "Generative AI Engineering",
    slug: "generative-ai-engineering",
    category: "LLM Engineering",
    instructor: "Srimanth",
    instructorAvatar: "/assets/srimanth.png",
    enrolledStudents: 540,
    capacity: 600,
    price: 44999,
    revenue: 24299460,
    rating: 4.96,
    completionRate: 88,
    status: "Published",
    cohortCount: 4,
    updatedAt: "2026-11-01",
  },
  {
    id: "course-2",
    title: "LLM Engineering in Production",
    slug: "llm-production",
    category: "LLM Engineering",
    instructor: "Srimanth",
    instructorAvatar: "/assets/srimanth.png",
    enrolledStudents: 380,
    capacity: 450,
    price: 49999,
    revenue: 18999620,
    rating: 4.94,
    completionRate: 82,
    status: "Published",
    cohortCount: 3,
    updatedAt: "2026-10-28",
  },
  {
    id: "course-3",
    title: "Agentic Systems Bootcamp",
    slug: "agentic-systems",
    category: "Agentic Systems",
    instructor: "Dr. Vikram Sen",
    instructorAvatar: "/assets/teacher-male.png",
    enrolledStudents: 310,
    capacity: 350,
    price: 39999,
    revenue: 12399690,
    rating: 4.91,
    completionRate: 79,
    status: "Published",
    cohortCount: 2,
    updatedAt: "2026-11-02",
  },
  {
    id: "course-4",
    title: "MLOps for LLM Applications",
    slug: "mlops-llm",
    category: "MLOps",
    instructor: "Ananya Roy",
    instructorAvatar: "/assets/teacher-female.png",
    enrolledStudents: 220,
    capacity: 300,
    price: 34999,
    revenue: 7699780,
    rating: 4.89,
    completionRate: 85,
    status: "Published",
    cohortCount: 2,
    updatedAt: "2026-10-24",
  },
  {
    id: "course-5",
    title: "Computer Vision with Deep Learning",
    slug: "cv-deep-learning",
    category: "Computer Vision",
    instructor: "Dr. Vikram Sen",
    instructorAvatar: "/assets/teacher-male.png",
    enrolledStudents: 190,
    capacity: 250,
    price: 29999,
    revenue: 5699810,
    rating: 4.86,
    completionRate: 76,
    status: "Published",
    cohortCount: 1,
    updatedAt: "2026-10-15",
  },
  {
    id: "course-6",
    title: "Prompt Engineering & RAG Architecture",
    slug: "prompt-rag",
    category: "AI Foundations",
    instructor: "Meera Nair",
    instructorAvatar: "/assets/student-4.png",
    enrolledStudents: 420,
    capacity: 500,
    price: 19999,
    revenue: 8399580,
    rating: 4.92,
    completionRate: 91,
    status: "Published",
    cohortCount: 3,
    updatedAt: "2026-10-30",
  },
]

export const INITIAL_BATCHES: AdminBatch[] = [
  {
    id: "batch-1",
    name: "GenAI Engineering Cohort 14",
    courseId: "course-1",
    courseTitle: "Generative AI Engineering",
    instructor: "Srimanth",
    instructorAvatar: "/assets/srimanth.png",
    startDate: "2026-11-10",
    endDate: "2027-02-28",
    schedule: "Mon, Wed, Fri · 7:30 PM - 9:30 PM IST",
    enrolledSeats: 88,
    maxSeats: 100,
    deliveryMode: "Live + Replay",
    replayDelayHours: 2,
    accessExpiryMonths: 12,
    features: { liveChat: true, doubtClearing: true, aiTutor: true, certificate: true },
    status: "Active",
  },
  {
    id: "batch-2",
    name: "LLM Production Weekend Cohort 6",
    courseId: "course-2",
    courseTitle: "LLM Engineering in Production",
    instructor: "Srimanth",
    instructorAvatar: "/assets/srimanth.png",
    startDate: "2026-11-15",
    endDate: "2027-02-15",
    schedule: "Sat, Sun · 10:00 AM - 1:00 PM IST",
    enrolledSeats: 94,
    maxSeats: 100,
    deliveryMode: "Live + Replay",
    replayDelayHours: 2,
    accessExpiryMonths: 12,
    features: { liveChat: true, doubtClearing: true, aiTutor: true, certificate: true },
    status: "Active",
  },
  {
    id: "batch-3",
    name: "Agentic Systems Winter '26",
    courseId: "course-3",
    courseTitle: "Agentic Systems Bootcamp",
    instructor: "Dr. Vikram Sen",
    instructorAvatar: "/assets/teacher-male.png",
    startDate: "2026-12-01",
    endDate: "2027-02-20",
    schedule: "Tue, Thu, Sat · 8:00 PM - 9:30 PM IST",
    enrolledSeats: 62,
    maxSeats: 80,
    deliveryMode: "Live + Replay",
    replayDelayHours: 4,
    accessExpiryMonths: 6,
    features: { liveChat: true, doubtClearing: true, aiTutor: true, certificate: true },
    status: "Upcoming",
  },
  {
    id: "batch-4",
    name: "MLOps Evening FastTrack",
    courseId: "course-4",
    courseTitle: "MLOps for LLM Applications",
    instructor: "Ananya Roy",
    instructorAvatar: "/assets/teacher-female.png",
    startDate: "2026-10-01",
    endDate: "2026-12-15",
    schedule: "Mon, Thu · 7:00 PM - 9:00 PM IST",
    enrolledSeats: 50,
    maxSeats: 50,
    deliveryMode: "Live + Replay",
    replayDelayHours: 2,
    accessExpiryMonths: 12,
    features: { liveChat: true, doubtClearing: true, aiTutor: true, certificate: true },
    status: "Active",
  },
]

export const INITIAL_TEACHERS: AdminTeacher[] = [
  {
    id: "teach-1",
    name: "Srimanth",
    email: "srimanth@quantumschool.ai",
    title: "Founder & Lead AI Instructor",
    specialization: "Large Language Models & Agentic Architectures",
    role: "Lead Instructor",
    assignedCourses: ["Generative AI Engineering", "LLM Engineering in Production"],
    activeBatches: ["GenAI Engineering Cohort 14", "LLM Production Weekend Cohort 6"],
    studentCount: 920,
    rating: 4.96,
    status: "Live Now",
    avatar: "/assets/srimanth.png",
    attendanceRate: 98.7,
  },
  {
    id: "teach-2",
    name: "Dr. Vikram Sen",
    email: "vikram.sen@quantumschool.ai",
    title: "Principal AI Architect",
    specialization: "Multi-Agent Systems & Deep Reinforcement Learning",
    role: "Lead Instructor",
    assignedCourses: ["Agentic Systems Bootcamp", "Computer Vision with Deep Learning"],
    activeBatches: ["Agentic Systems Winter '26"],
    studentCount: 500,
    rating: 4.91,
    status: "Available",
    avatar: "/assets/teacher-male.png",
    attendanceRate: 97.4,
  },
  {
    id: "teach-3",
    name: "Meera Nair",
    email: "meera.nair@quantumschool.ai",
    title: "Senior AI Evaluator & TA Lead",
    specialization: "RAG Systems & Prompt Engineering",
    role: "Teaching Assistant",
    assignedCourses: ["Prompt Engineering & RAG Architecture", "Generative AI Engineering"],
    activeBatches: ["GenAI Engineering Cohort 14"],
    studentCount: 680,
    rating: 4.93,
    status: "In Review",
    avatar: "/assets/student-4.png",
    attendanceRate: 99.1,
  },
  {
    id: "teach-4",
    name: "Ananya Roy",
    email: "ananya.roy@quantumschool.ai",
    title: "Staff MLOps Engineer",
    specialization: "Distributed Training, vLLM & Kubernetes",
    role: "Lead Instructor",
    assignedCourses: ["MLOps for LLM Applications"],
    activeBatches: ["MLOps Evening FastTrack"],
    studentCount: 340,
    rating: 4.89,
    status: "Available",
    avatar: "/assets/teacher-female.png",
    attendanceRate: 96.8,
  },
]

export const INITIAL_STUDENTS: AdminStudent[] = [
  {
    id: "stu-1",
    name: "Aarav Mehta",
    email: "aarav.mehta@learner.ai",
    avatar: "/assets/student-2.png",
    courseId: "course-1",
    courseTitle: "Generative AI Engineering",
    batchId: "batch-1",
    batchName: "GenAI Engineering Cohort 14",
    enrolledAt: "2026-10-12",
    progress: 88,
    attendanceRate: 98,
    evaluationScore: 94,
    status: "Active",
  },
  {
    id: "stu-2",
    name: "Zara Chen",
    email: "zara.chen@learner.ai",
    avatar: "/assets/student-1.png",
    courseId: "course-2",
    courseTitle: "LLM Engineering in Production",
    batchId: "batch-2",
    batchName: "LLM Production Weekend Cohort 6",
    enrolledAt: "2026-10-18",
    progress: 74,
    attendanceRate: 92,
    evaluationScore: 89,
    status: "Active",
  },
  {
    id: "stu-3",
    name: "Rohan Varma",
    email: "rohan.v@enterprise.io",
    avatar: "/assets/student-3.png",
    courseId: "course-1",
    courseTitle: "Generative AI Engineering",
    batchId: "batch-1",
    batchName: "GenAI Engineering Cohort 14",
    enrolledAt: "2026-10-14",
    progress: 92,
    attendanceRate: 100,
    evaluationScore: 96,
    status: "Active",
  },
  {
    id: "stu-4",
    name: "Pooja Hegde",
    email: "pooja.h@techcorp.in",
    avatar: "/assets/student-4.png",
    courseId: "course-3",
    courseTitle: "Agentic Systems Bootcamp",
    batchId: "batch-3",
    batchName: "Agentic Systems Winter '26",
    enrolledAt: "2026-10-25",
    progress: 60,
    attendanceRate: 85,
    evaluationScore: 81,
    status: "Active",
  },
  {
    id: "stu-5",
    name: "Devansh Nair",
    email: "devansh.n@startup.co",
    avatar: "/assets/student-5.png",
    courseId: "course-4",
    courseTitle: "MLOps for LLM Applications",
    batchId: "batch-4",
    batchName: "MLOps Evening FastTrack",
    enrolledAt: "2026-09-30",
    progress: 95,
    attendanceRate: 96,
    evaluationScore: 92,
    status: "Completed",
  },
  {
    id: "stu-6",
    name: "Karan Johar",
    email: "karan.j@learner.ai",
    avatar: "/assets/student-3.png",
    courseId: "course-2",
    courseTitle: "LLM Engineering in Production",
    batchId: "batch-2",
    batchName: "LLM Production Weekend Cohort 6",
    enrolledAt: "2026-10-20",
    progress: 32,
    attendanceRate: 54,
    evaluationScore: 58,
    status: "At Risk",
  },
]

export const INITIAL_ORDERS: AdminOrder[] = [
  {
    id: "ord-1",
    orderNumber: "ORD-2026-9041",
    studentId: "stu-1",
    studentName: "Aarav Mehta",
    studentEmail: "aarav.mehta@learner.ai",
    courseTitle: "Generative AI Engineering",
    amount: 44999,
    currency: "INR",
    method: "Razorpay (UPI)",
    date: "2026-10-12 14:32 IST",
    status: "Paid",
  },
  {
    id: "ord-2",
    orderNumber: "ORD-2026-9042",
    studentId: "stu-2",
    studentName: "Zara Chen",
    studentEmail: "zara.chen@learner.ai",
    courseTitle: "LLM Engineering in Production",
    amount: 49999,
    currency: "INR",
    method: "Razorpay (Card)",
    date: "2026-10-18 09:14 IST",
    status: "Paid",
  },
  {
    id: "ord-3",
    orderNumber: "ORD-2026-9043",
    studentId: "stu-3",
    studentName: "Rohan Varma",
    studentEmail: "rohan.v@enterprise.io",
    courseTitle: "Generative AI Engineering",
    amount: 44999,
    currency: "INR",
    method: "Corporate Wire",
    date: "2026-10-14 16:50 IST",
    status: "Paid",
  },
  {
    id: "ord-4",
    orderNumber: "ORD-2026-9044",
    studentId: "stu-4",
    studentName: "Pooja Hegde",
    studentEmail: "pooja.h@techcorp.in",
    courseTitle: "Agentic Systems Bootcamp",
    amount: 39999,
    currency: "INR",
    method: "Razorpay (UPI)",
    date: "2026-10-25 18:22 IST",
    status: "Paid",
  },
  {
    id: "ord-5",
    orderNumber: "ORD-2026-9045",
    studentId: "stu-5",
    studentName: "Devansh Nair",
    studentEmail: "devansh.n@startup.co",
    courseTitle: "MLOps for LLM Applications",
    amount: 34999,
    currency: "INR",
    method: "Stripe (Card)",
    date: "2026-09-30 11:05 IST",
    status: "Paid",
  },
  {
    id: "ord-6",
    orderNumber: "ORD-2026-9039",
    studentId: "stu-legacy",
    studentName: "Vikram Malhotra",
    studentEmail: "vikram.m@test.com",
    courseTitle: "Prompt Engineering & RAG",
    amount: 19999,
    currency: "INR",
    method: "Razorpay (UPI)",
    date: "2026-10-04 15:10 IST",
    status: "Refunded",
    refundReason: "Customer requested schedule change before batch start",
  },
]

export const INITIAL_ACADEMY_SETTINGS: AcademySettings = {
  name: "Quantum School of AI",
  tagline: "Premier AI Engineering & Agentic Systems Academy",
  domain: "quantumschool.ai",
  supportEmail: "support@quantumschool.ai",
  timezone: "Asia/Kolkata (IST, UTC+5:30)",
  currency: "INR (₹)",
  gstNumber: "29AABCS1429B1Z8",
  certificateSignatory: "Srimanth, Founder & Lead Instructor",
  autoIssueCertificates: true,
  enablePublicVerification: true,
  requireMfaForStaff: true,
  notifyOnEnrolment: true,
  notifyOnLowBatchSeats: true,
  notifyOnRefundRequest: true,
}

// Super Admin Seed Data
export const INITIAL_SERVICES_HEALTH: PlatformServiceHealth[] = [
  {
    id: "srv-1",
    name: "Fastify 5 REST API Gateway",
    endpoint: "https://api.quantumschool.ai/api/health",
    category: "Core API",
    status: "Healthy",
    uptime: 99.99,
    latencyMs: 14,
    sparkline: [12, 14, 15, 13, 14, 14, 13, 14],
  },
  {
    id: "srv-2",
    name: "AWS MediaConvert Video Processor",
    endpoint: "arn:aws:mediaconvert:eu-north-1:pipeline/hls",
    category: "Media & Video",
    status: "Healthy",
    uptime: 99.96,
    latencyMs: 46,
    sparkline: [42, 45, 48, 44, 46, 49, 45, 46],
  },
  {
    id: "srv-3",
    name: "Whisper AI Auto-Transcription Engine",
    endpoint: "https://transcribe.internal.ai/v1/jobs",
    category: "AI Engine",
    status: "Healthy",
    uptime: 99.93,
    latencyMs: 120,
    sparkline: [110, 115, 125, 120, 118, 122, 120, 120],
  },
  {
    id: "srv-4",
    name: "Clover AI Real-Time Tutor (Gemini 2.5)",
    endpoint: "https://ai-tutor.quantumschool.ai/v2/stream",
    category: "AI Engine",
    status: "Healthy",
    uptime: 99.98,
    latencyMs: 280,
    sparkline: [290, 285, 275, 280, 278, 282, 280, 280],
  },
  {
    id: "srv-5",
    name: "Razorpay / Stripe Webhook Receiver",
    endpoint: "https://api.quantumschool.ai/api/billing/webhooks",
    category: "Billing",
    status: "Healthy",
    uptime: 100.0,
    latencyMs: 82,
    sparkline: [80, 84, 82, 85, 82, 81, 83, 82],
  },
  {
    id: "srv-6",
    name: "AWS S3 Multi-Region Course Storage",
    endpoint: "s3://quantumschool-assets-prod",
    category: "Database & Storage",
    status: "Healthy",
    uptime: 100.0,
    latencyMs: 16,
    sparkline: [16, 17, 15, 16, 16, 17, 16, 16],
  },
]

export const INITIAL_TENANTS: TenantHub[] = [
  {
    id: "tenant-1",
    name: "Bengaluru Tech Hub · AI Cohort Alpha",
    type: "Regional Hub",
    location: "Bengaluru, India",
    cloudRegion: "ap-south-1 (Mumbai)",
    learnersCount: 640,
    coursesSubscribed: 6,
    aiTokensUsedMonthly: 18400000,
    aiTokenLimitMonthly: 25000000,
    status: "Active",
    contactPerson: "Rajesh Kumar",
    contactEmail: "rajesh.k@bengaluru-hub.ai",
  },
  {
    id: "tenant-2",
    name: "NeoCorp Enterprise AI Lab",
    type: "Enterprise Lab",
    location: "Hyderabad, India",
    cloudRegion: "ap-south-1 (Mumbai)",
    learnersCount: 420,
    coursesSubscribed: 4,
    aiTokensUsedMonthly: 14200000,
    aiTokenLimitMonthly: 20000000,
    status: "Active",
    contactPerson: "Dr. Shalini Gupta",
    contactEmail: "shalini.g@neocorp.com",
  },
  {
    id: "tenant-3",
    name: "Singularity AI Research Guild",
    type: "Research Guild",
    location: "Stockholm, Sweden",
    cloudRegion: "eu-north-1 (Stockholm)",
    learnersCount: 280,
    coursesSubscribed: 5,
    aiTokensUsedMonthly: 9600000,
    aiTokenLimitMonthly: 15000000,
    status: "Active",
    contactPerson: "Erik Lindqvist",
    contactEmail: "erik@singularity-guild.se",
  },
  {
    id: "tenant-4",
    name: "National Institute of AI Innovation",
    type: "University Partner",
    location: "New Delhi, India",
    cloudRegion: "ap-south-1 (Mumbai)",
    learnersCount: 140,
    coursesSubscribed: 2,
    aiTokensUsedMonthly: 3100000,
    aiTokenLimitMonthly: 10000000,
    status: "Provisioning",
    contactPerson: "Prof. K. Sundaram",
    contactEmail: "sundaram@niai.ac.in",
  },
]

export const INITIAL_RBAC: RbacPermissionRow[] = [
  {
    id: "p-1",
    permission: "Manage Course Curriculum",
    description: "Create, edit, publish and archive AI courses, modules and lessons",
    category: "Curriculum",
    superAdmin: true,
    admin: true,
    teacher: true,
    evaluator: false,
    support: false,
    student: false,
  },
  {
    id: "p-2",
    permission: "Publish Class Recordings",
    description: "Upload and publish processed HLS recordings and auto-generated transcripts",
    category: "Classes & Video",
    superAdmin: true,
    admin: true,
    teacher: true,
    evaluator: false,
    support: false,
    student: false,
  },
  {
    id: "p-3",
    permission: "Host Live Classes",
    description: "Start WebRTC / RTMP broadcast studio, share screen and host interactive doubts",
    category: "Classes & Video",
    superAdmin: true,
    admin: true,
    teacher: true,
    evaluator: false,
    support: false,
    student: false,
  },
  {
    id: "p-4",
    permission: "Grade Assignments & Rubrics",
    description: "Evaluate code submissions, assign scores per rubric criterion and release results",
    category: "Evaluations",
    superAdmin: true,
    admin: true,
    teacher: true,
    evaluator: true,
    support: false,
    student: false,
  },
  {
    id: "p-5",
    permission: "Issue Refunds & Process Payments",
    description: "View payment transaction details and trigger refunds through payment gateway",
    category: "Finance",
    superAdmin: true,
    admin: true,
    teacher: false,
    evaluator: false,
    support: false,
    student: false,
  },
  {
    id: "p-6",
    permission: "Manage Enterprise Tenants",
    description: "Provision enterprise cohort nodes, assign token quotas and configure SSO",
    category: "Administration",
    superAdmin: true,
    admin: false,
    teacher: false,
    evaluator: false,
    support: false,
    student: false,
  },
  {
    id: "p-7",
    permission: "View Security Audit Logs",
    description: "Inspect user access history, auth sessions, IP addresses and API security events",
    category: "Administration",
    superAdmin: true,
    admin: true,
    teacher: false,
    evaluator: false,
    support: false,
    student: false,
  },
  {
    id: "p-8",
    permission: "Configure AI Engine & Models",
    description: "Set primary LLM endpoints, temperature, strictness parameters and token caps",
    category: "AI & Models",
    superAdmin: true,
    admin: false,
    teacher: false,
    evaluator: false,
    support: false,
    student: false,
  },
]

export const INITIAL_AUDIT_LOGS: SecurityAuditLog[] = [
  {
    id: "log-1",
    timestamp: "2026-11-03 09:42:15 IST",
    actorName: "Kavya Rao",
    actorRole: "Super Admin",
    actorEmail: "superadmin@quantumschool.ai",
    action: "UPDATE_AI_MODEL_SETTINGS",
    category: "AI Engine",
    target: "Clover Tutor · Primary Model -> Gemini 2.5 Flash",
    ip: "49.37.142.88",
    status: "Success",
    details: '{"temperature": 0.4, "maxTokens": 4096, "quotaCheck": "enabled"}',
  },
  {
    id: "log-2",
    timestamp: "2026-11-03 09:15:02 IST",
    actorName: "Rohan Iyer",
    actorRole: "Admin",
    actorEmail: "admin@quantumschool.ai",
    action: "BATCH_SEAT_LIMIT_EXPANDED",
    category: "Course",
    target: "GenAI Engineering Cohort 14 · Seats -> 100",
    ip: "103.21.244.12",
    status: "Success",
    details: '{"previous": 80, "current": 100, "reason": "Waitlist demand"}',
  },
  {
    id: "log-3",
    timestamp: "2026-11-03 08:30:44 IST",
    actorName: "Rohan Iyer",
    actorRole: "Admin",
    actorEmail: "admin@quantumschool.ai",
    action: "ORDER_REFUND_APPROVED",
    category: "Billing",
    target: "Order #ORD-2026-9039 · ₹19,999 to Vikram Malhotra",
    ip: "103.21.244.12",
    status: "Success",
    details: '{"gateway": "Razorpay", "refundId": "rfnd_9a87f123", "feeDeducted": 0}',
  },
  {
    id: "log-4",
    timestamp: "2026-11-02 23:14:18 IST",
    actorName: "System Automation",
    actorRole: "Worker",
    actorEmail: "system@internal.worker",
    action: "AUTOSWEEP_QUIZZES",
    category: "Security",
    target: "Submitted 14 expired timed quiz attempts",
    ip: "10.0.4.12",
    status: "Success",
    details: '{"processedAttempts": 14, "autoGraded": 14}',
  },
  {
    id: "log-5",
    timestamp: "2026-11-02 19:40:05 IST",
    actorName: "Unknown Visitor",
    actorRole: "Anonymous",
    actorEmail: "attacker@external.net",
    action: "UNAUTHORIZED_API_ACCESS",
    category: "Auth",
    target: "POST /api/evaluator/release",
    ip: "185.220.101.5",
    status: "Refused",
    details: '{"reason": "Missing bearer token", "httpStatus": 401}',
  },
]

export const INITIAL_AI_USAGE: AiUsageMetrics = {
  totalTokensMonth: 45800000,
  totalCostInr: 284200,
  tokensByFeature: {
    aiTutor: 22400000,
    videoChaptering: 9200000,
    transcription: 10400000,
    evaluatorAssist: 3800000,
  },
  primaryModel: "Gemini 2.5 Flash",
  fallbackModel: "Claude 3.5 Sonnet",
  temperature: 0.35,
  strictnessScore: 85,
  monthlyBudgetCapInr: 500000,
}

// LocalStorage Keys
const KEYS = {
  courses: "quantum_admin_courses_v2",
  batches: "quantum_admin_batches_v2",
  teachers: "quantum_admin_teachers_v2",
  students: "quantum_admin_students_v2",
  orders: "quantum_admin_orders_v2",
  settings: "quantum_admin_settings_v2",
  services: "quantum_superadmin_services_v2",
  tenants: "quantum_superadmin_tenants_v2",
  rbac: "quantum_superadmin_rbac_v2",
  audit: "quantum_superadmin_audit_v2",
  aiUsage: "quantum_superadmin_ai_usage_v2",
}

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // ignore
  }
  return fallback
}

function saveStorage(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // ignore
  }
}

// Custom Hook for Admin Data
export function useAdminStore() {
  const [courses, setCourses] = useState<AdminCourse[]>(() => loadStorage(KEYS.courses, INITIAL_COURSES))
  const [batches, setBatches] = useState<AdminBatch[]>(() => loadStorage(KEYS.batches, INITIAL_BATCHES))
  const [teachers, setTeachers] = useState<AdminTeacher[]>(() => loadStorage(KEYS.teachers, INITIAL_TEACHERS))
  const [students, setStudents] = useState<AdminStudent[]>(() => loadStorage(KEYS.students, INITIAL_STUDENTS))
  const [orders, setOrders] = useState<AdminOrder[]>(() => loadStorage(KEYS.orders, INITIAL_ORDERS))
  const [settings, setSettings] = useState<AcademySettings>(() => loadStorage(KEYS.settings, INITIAL_ACADEMY_SETTINGS))

  useEffect(() => saveStorage(KEYS.courses, courses), [courses])
  useEffect(() => saveStorage(KEYS.batches, batches), [batches])
  useEffect(() => saveStorage(KEYS.teachers, teachers), [teachers])
  useEffect(() => saveStorage(KEYS.students, students), [students])
  useEffect(() => saveStorage(KEYS.orders, orders), [orders])
  useEffect(() => saveStorage(KEYS.settings, settings), [settings])

  // Sync courses with Backend API
  useEffect(() => {
    let cancelled = false
    async function fetchBackendCourses() {
      try {
        const res = await api.get<{ courses: any[] }>("/admin/courses")
        if (!cancelled && res?.courses && Array.isArray(res.courses) && res.courses.length > 0) {
          const apiCourses: AdminCourse[] = res.courses.map((c) => ({
            id: c.id,
            title: c.title,
            slug: c.code ? c.code.toLowerCase().replace(/[^a-z0-9]/g, "-") : c.title.toLowerCase().replace(/[^a-z0-9]/g, "-"),
            category: c.category || "LLM Engineering",
            instructor: c.instructor || "Srimanth",
            instructorAvatar: "/assets/srimanth.png",
            enrolledStudents: c.enrolled_students ?? 0,
            capacity: 250,
            price: 39999,
            revenue: (c.enrolled_students ?? 0) * 39999,
            rating: parseFloat(c.rating || "5.0") || 5.0,
            completionRate: 88,
            status: (c.status as any) || "Published",
            cohortCount: Math.max(1, c.modules_count ?? 1),
            updatedAt: c.updated_at ? new Date(c.updated_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          }))

          setCourses((prev) => {
            const apiMap = new Map(apiCourses.map((c) => [c.id, c]))
            const merged = [...apiCourses]
            for (const p of prev) {
              if (!apiMap.has(p.id)) {
                merged.push(p)
              }
            }
            return merged
          })
        }
      } catch {
        // Fallback to offline / mock storage smoothly
      }
    }
    fetchBackendCourses()
    return () => {
      cancelled = true
    }
  }, [])

  const addCourse = useCallback((newCourse: Omit<AdminCourse, "id" | "enrolledStudents" | "revenue" | "rating" | "completionRate" | "cohortCount" | "updatedAt">) => {
    const localId = `c-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`
    const course: AdminCourse = {
      ...newCourse,
      id: localId,
      enrolledStudents: 0,
      revenue: 0,
      rating: 5.0,
      completionRate: 0,
      cohortCount: 1,
      updatedAt: new Date().toISOString().split("T")[0],
    }
    setCourses((prev) => [course, ...prev])

    // Asynchronously persist to backend PostgreSQL
    api
      .post<{ ok: boolean; course: any }>("/admin/courses", {
        title: newCourse.title,
        category: newCourse.category,
        instructor: newCourse.instructor,
        instructor_role: "Lead Instructor",
        description: `Comprehensive track in ${newCourse.title} covering architecture, practical applications and production deployment.`,
        level: "Beginner",
        credits: 4,
        duration: "12 Weeks",
      })
      .then((res) => {
        if (res?.course?.id) {
          setCourses((prev) =>
            prev.map((c) => (c.id === localId ? { ...c, id: res.course.id } : c))
          )
        }
      })
      .catch(() => {
        // Safe offline fallback
      })

    return course
  }, [])

  const toggleCourseStatus = useCallback((courseId: string) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c
        const nextStatus = c.status === "Published" ? "Archived" : "Published"
        return { ...c, status: nextStatus, updatedAt: new Date().toISOString().split("T")[0] }
      })
    )
    api.patch(`/admin/courses/${courseId}`, {}).catch(() => {})
  }, [])

  const deleteCourse = useCallback((courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId))
    api.delete(`/admin/courses/${courseId}`).catch(() => {})
  }, [])

  const addBatch = useCallback((batchData: Omit<AdminBatch, "id" | "enrolledSeats">) => {
    const batch: AdminBatch = {
      ...batchData,
      id: `batch-${Date.now()}`,
      enrolledSeats: 0,
    }
    setBatches((prev) => [batch, ...prev])
    setCourses((prev) =>
      prev.map((c) => (c.id === batch.courseId ? { ...c, cohortCount: c.cohortCount + 1 } : c))
    )
    return batch
  }, [])

  const addTeacher = useCallback((teacherData: Omit<AdminTeacher, "id" | "studentCount" | "rating" | "attendanceRate">) => {
    const teacher: AdminTeacher = {
      ...teacherData,
      id: `teach-${Date.now()}`,
      studentCount: 0,
      rating: 5.0,
      attendanceRate: 100,
    }
    setTeachers((prev) => [teacher, ...prev])
    return teacher
  }, [])

  const enrolStudent = useCallback((studentData: { name: string; email: string; courseId: string; batchId: string }) => {
    const course = courses.find((c) => c.id === studentData.courseId)
    const batch = batches.find((b) => b.id === studentData.batchId)
    const student: AdminStudent = {
      id: `stu-${Date.now()}`,
      name: studentData.name,
      email: studentData.email,
      avatar: `/assets/student-${Math.floor(Math.random() * 5) + 1}.png`,
      courseId: studentData.courseId,
      courseTitle: course ? course.title : "AI Course",
      batchId: studentData.batchId,
      batchName: batch ? batch.name : "Active Cohort",
      enrolledAt: new Date().toISOString().split("T")[0],
      progress: 0,
      attendanceRate: 100,
      evaluationScore: 100,
      status: "Active",
    }
    setStudents((prev) => [student, ...prev])
    if (batch) {
      setBatches((prev) =>
        prev.map((b) => (b.id === batch.id ? { ...b, enrolledSeats: b.enrolledSeats + 1 } : b))
      )
    }
    if (course) {
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, enrolledStudents: c.enrolledStudents + 1 } : c))
      )
    }
    return student
  }, [courses, batches])

  const refundOrder = useCallback((orderId: string, reason: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "Refunded", refundReason: reason } : o))
    )
  }, [])

  const updateSettings = useCallback((newSettings: Partial<AcademySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }, [])

  return {
    courses,
    batches,
    teachers,
    students,
    orders,
    settings,
    addCourse,
    toggleCourseStatus,
    deleteCourse,
    addBatch,
    addTeacher,
    enrolStudent,
    refundOrder,
    updateSettings,
  }
}

// Custom Hook for Super Admin Data
export function useSuperAdminStore() {
  const [services, setServices] = useState<PlatformServiceHealth[]>(() => loadStorage(KEYS.services, INITIAL_SERVICES_HEALTH))
  const [tenants, setTenants] = useState<TenantHub[]>(() => loadStorage(KEYS.tenants, INITIAL_TENANTS))
  const [rbac, setRbac] = useState<RbacPermissionRow[]>(() => loadStorage(KEYS.rbac, INITIAL_RBAC))
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>(() => loadStorage(KEYS.audit, INITIAL_AUDIT_LOGS))
  const [aiUsage, setAiUsage] = useState<AiUsageMetrics>(() => loadStorage(KEYS.aiUsage, INITIAL_AI_USAGE))

  useEffect(() => saveStorage(KEYS.services, services), [services])
  useEffect(() => saveStorage(KEYS.tenants, tenants), [tenants])
  useEffect(() => saveStorage(KEYS.rbac, rbac), [rbac])
  useEffect(() => saveStorage(KEYS.audit, auditLogs), [auditLogs])
  useEffect(() => saveStorage(KEYS.aiUsage, aiUsage), [aiUsage])

  const toggleRbacPermission = useCallback((id: string, roleKey: "superAdmin" | "admin" | "teacher" | "evaluator" | "support" | "student") => {
    setRbac((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        const updated = { ...row, [roleKey]: !row[roleKey] }
        return updated
      })
    )
    // Add audit log entry
    const log: SecurityAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
      actorName: "Kavya Rao",
      actorRole: "Super Admin",
      actorEmail: "superadmin@quantumschool.ai",
      action: "PERMISSION_MODIFIED",
      category: "RBAC",
      target: `Permission #${id} for role ${roleKey}`,
      ip: "49.37.142.88",
      status: "Success",
      details: `Toggled permission ${id} on role ${roleKey}`,
    }
    setAuditLogs((prev) => [log, ...prev])
  }, [])

  const flushCache = useCallback(() => {
    const log: SecurityAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
      actorName: "Kavya Rao",
      actorRole: "Super Admin",
      actorEmail: "superadmin@quantumschool.ai",
      action: "FLUSH_GLOBAL_REDIS_CACHE",
      category: "Security",
      target: "Fastify Gateway & CloudFront Edge",
      ip: "49.37.142.88",
      status: "Success",
      details: "Cleared 1,420 cached session keys and invalidation markers",
    }
    setAuditLogs((prev) => [log, ...prev])
  }, [])

  const triggerSnapshot = useCallback(() => {
    const log: SecurityAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
      actorName: "Kavya Rao",
      actorRole: "Super Admin",
      actorEmail: "superadmin@quantumschool.ai",
      action: "DATABASE_SNAPSHOT_MANUAL",
      category: "Security",
      target: "PostgreSQL Database (aws-0-eu-north-1)",
      ip: "49.37.142.88",
      status: "Success",
      details: "Created full point-in-time snapshot with HMAC integrity seal",
    }
    setAuditLogs((prev) => [log, ...prev])
  }, [])

  const updateAiModelSettings = useCallback((updates: Partial<AiUsageMetrics>) => {
    setAiUsage((prev) => ({ ...prev, ...updates }))
    const log: SecurityAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
      actorName: "Kavya Rao",
      actorRole: "Super Admin",
      actorEmail: "superadmin@quantumschool.ai",
      action: "UPDATE_AI_CONFIG",
      category: "AI Engine",
      target: "Global LLM Inference Pipeline",
      ip: "49.37.142.88",
      status: "Success",
      details: JSON.stringify(updates),
    }
    setAuditLogs((prev) => [log, ...prev])
  }, [])

  return {
    services,
    tenants,
    rbac,
    auditLogs,
    aiUsage,
    toggleRbacPermission,
    flushCache,
    triggerSnapshot,
    updateAiModelSettings,
  }
}

