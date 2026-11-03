import type { UserRole } from "@/types"

/** One demo account per role. Used by the auth page quick-launch and the role switcher. */
export interface DemoAccount {
  role: UserRole
  name: string
  email: string
  /** Demo-only credential shown on the auth page; nothing is verified. */
  password: string
  title: string
  badge: string
  avatar: string
  tagline: string
  accentColor: string
}

export const demoAccounts: DemoAccount[] = [
  {
    role: "Super Admin",
    name: "Kavya Rao",
    email: "superadmin@quantumschool.ai",
    password: "DemoSuperAdmin2026",
    title: "Platform Owner",
    badge: "SUPER ADMIN",
    avatar: "/assets/teacher-female.png",
    tagline: "Platform health, tenants, access control, audit logs, AI usage and revenue",
    accentColor: "#6d4aff",
  },
  {
    role: "Admin",
    name: "Rohan Iyer",
    email: "admin@quantumschool.ai",
    password: "DemoAdmin2026",
    title: "Academy Operations Lead",
    badge: "ADMIN",
    avatar: "/assets/student-1.png",
    tagline: "Courses, batches, instructors, enrolments, orders and reports",
    accentColor: "#2563eb",
  },
  {
    role: "Teacher",
    name: "Srimanth",
    email: "srimanth@quantumschool.ai",
    password: "demo-teacher",
    title: "Founder & Lead AI Instructor",
    badge: "INSTRUCTOR",
    avatar: "/assets/srimanth.png",
    tagline: "Course builder, live studio, recording chapters, doubts and analytics",
    accentColor: "#047857",
  },
  {
    role: "Student",
    name: "Aarav Mehta",
    email: "aarav.mehta@learner.ai",
    password: "DemoStudent2026",
    title: "Learner · Generative AI Engineering",
    badge: "LEARNER",
    avatar: "/assets/student-2.png",
    tagline: "Live classes, chaptered replays, assessments and certificates",
    accentColor: "#6d4aff",
  },
  {
    role: "Evaluator",
    name: "Meera Nair",
    email: "evaluator@quantumschool.ai",
    password: "DemoEvaluator2026",
    title: "Assessment Lead",
    badge: "EVALUATOR",
    avatar: "/assets/teacher-female.png",
    tagline: "Submission queue, rubric grading, re-evaluations and reports",
    accentColor: "#b45309",
  },
  {
    role: "Support",
    name: "Neha Kapoor",
    email: "support@quantumschool.ai",
    password: "DemoSupport2026",
    title: "Learner Success Specialist",
    badge: "SUPPORT",
    avatar: "/assets/teacher-female.png",
    tagline: "Ticket inbox, live chat, student 360 and knowledge base",
    accentColor: "#0e7490",
  },
]

export function getDemoAccount(role: UserRole): DemoAccount {
  return demoAccounts.find((a) => a.role === role) ?? demoAccounts[2]
}
