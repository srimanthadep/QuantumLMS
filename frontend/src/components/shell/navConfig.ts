import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileClock,
  FileText,
  GraduationCap,
  Headphones,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Layers,
  LibraryBig,
  MessageCircleQuestion,
  MessagesSquare,
  NotebookPen,
  PlayCircle,
  Radio,
  RotateCcw,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import type { UserRole } from "@/types"

export interface ShellNavItem {
  id: string
  label: string
  icon: LucideIcon
  /** "main" items sit at the top; "secondary" items sit below a divider. */
  section: "main" | "secondary"
  /** Extra command-palette search terms. */
  keywords?: string[]
}

const item = (id: string, label: string, icon: LucideIcon, section: "main" | "secondary" = "main", keywords?: string[]): ShellNavItem => ({
  id,
  label,
  icon,
  section,
  keywords,
})

/** Navigation per role (design.md > App shell). Portals map ids onto their routes or tabs. */
export const NAV: Record<UserRole, ShellNavItem[]> = {
  Student: [
    item("dashboard", "Dashboard", LayoutDashboard),
    item("courses", "My Courses", BookOpen, "main", ["learn", "player", "lessons"]),
    item("schedule", "Schedule", CalendarDays, "main", ["live", "timetable", "classes"]),
    item("assessments", "Assessments", ClipboardList, "main", ["quiz", "assignment", "tests"]),
    item("grades", "Grades & Certificates", Award, "main", ["certificate", "results"]),
    item("notes", "Notes", NotebookPen),
    item("community", "Community", MessagesSquare, "main", ["discussions"]),
    item("career", "Career Hub", Briefcase, "main", ["interview", "resume"]),
    item("support", "Support", HelpCircle, "secondary", ["help", "ticket"]),
    item("settings", "Settings", Settings, "secondary", ["profile", "theme"]),
  ],
  Teacher: [
    item("dashboard", "Dashboard", LayoutDashboard),
    item("courses", "Courses", BookOpen, "main", ["builder", "modules", "upload"]),
    item("live", "Live Classes", Radio, "main", ["studio", "schedule"]),
    item("recordings", "Recordings", PlayCircle, "main", ["chapters", "replay", "transcript"]),
    item("students", "Students", Users),
    item("doubts", "Doubts", MessageCircleQuestion, "main", ["questions"]),
    item("calendar", "Calendar", CalendarDays),
    item("analytics", "Analytics", BarChart3, "main", ["reports"]),
    item("support", "Support", HelpCircle, "secondary"),
    item("settings", "Settings", Settings, "secondary"),
  ],
  Evaluator: [
    item("dashboard", "Dashboard", LayoutDashboard),
    item("queue", "Queue", ClipboardCheck, "main", ["submissions", "grading"]),
    item("reevaluations", "Re-evaluations", RotateCcw, "main", ["reassessment", "appeals"]),
    item("reports", "Reports", FileText),
    item("settings", "Settings", Settings, "secondary"),
  ],
  Support: [
    item("dashboard", "Dashboard", LayoutDashboard),
    item("inbox", "Inbox", Inbox, "main", ["tickets"]),
    item("live-chat", "Live Chat", Headphones, "main", ["chat"]),
    item("knowledge-base", "Knowledge Base", LibraryBig, "main", ["articles", "kb"]),
    item("agents", "Agents", UsersRound),
    item("analytics", "Analytics", BarChart3),
    item("settings", "Settings", Settings, "secondary"),
  ],
  Admin: [
    item("overview", "Overview", LayoutDashboard),
    item("approvals", "Teacher Approvals", ClipboardCheck, "main", ["approvals", "schedule", "assignments", "grades", "curriculum"]),
    item("courses", "Courses", BookOpen),
    item("batches", "Batches", Layers, "main", ["cohorts", "schedules"]),
    item("teachers", "Teachers", GraduationCap, "main", ["instructors", "faculty"]),
    item("students", "Students", Users, "main", ["enrolments", "learners"]),
    item("orders", "Orders", CreditCard, "main", ["payments"]),
    item("reports", "Reports", FileText),
    item("health", "Platform Health", Activity),
    item("access", "Access Control", ShieldCheck, "main", ["rbac", "roles", "permissions"]),
    item("audit", "Audit Logs", FileClock),
    item("ai", "AI Usage", Bot, "main", ["tokens", "models"]),
    item("revenue", "Revenue", Wallet),
    item("settings", "Settings", Settings, "secondary"),
  ],
  "Super Admin": [
    item("overview", "Overview", LayoutDashboard),
    item("approvals", "Teacher Approvals", ClipboardCheck, "main", ["approvals", "schedule", "assignments", "grades", "curriculum"]),
    item("courses", "Courses", BookOpen),
    item("batches", "Batches", Layers, "main", ["cohorts", "schedules"]),
    item("teachers", "Teachers", GraduationCap, "main", ["instructors", "faculty"]),
    item("students", "Students", Users, "main", ["enrolments", "learners"]),
    item("orders", "Orders", CreditCard, "main", ["payments"]),
    item("reports", "Reports", FileText),
    item("health", "Platform Health", Activity),
    item("access", "Access Control", ShieldCheck, "main", ["rbac", "roles", "permissions"]),
    item("audit", "Audit Logs", FileClock),
    item("ai", "AI Usage", Bot, "main", ["tokens", "models"]),
    item("revenue", "Revenue", Wallet),
    item("settings", "Settings", Settings, "secondary"),
  ],
}

/** Short workspace label shown under the logo. */
export const ROLE_WORKSPACE: Record<UserRole, string> = {
  Student: "Learning",
  Teacher: "Instructor studio",
  Evaluator: "Evaluation desk",
  Support: "Support desk",
  Admin: "Academy admin",
  "Super Admin": "Platform console",
}

/** Courses offered, surfaced in the command palette. */
export const COURSE_SHORTCUTS = [
  "Generative AI Engineering",
  "LLM Engineering in Production",
  "Agentic Systems Bootcamp",
  "Machine Learning Foundations",
  "Computer Vision with Deep Learning",
  "MLOps for LLM Apps",
  "Prompt Engineering Essentials",
  "Python for AI",
]
