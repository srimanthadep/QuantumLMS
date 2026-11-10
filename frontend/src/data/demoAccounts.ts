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
  avatar?: string
  tagline: string
  accentColor: string
}

export const ALL_DEMO_ACCOUNTS: Record<UserRole, DemoAccount> = {
  Teacher: {
    role: "Teacher",
    name: "Shanmuk",
    email: "shanmuk@lms.com",
    password: "123456",
    title: "Lead AI Faculty & Instructor",
    badge: "INSTRUCTOR",
    avatar: "/assets/srimanth.png",
    tagline: "Course builder, live studio, recording chapters, doubts and analytics",
    accentColor: "#047857",
  },
  Student: {
    role: "Student",
    name: "Niharika",
    email: "niharika@lms.com",
    password: "123456",
    title: "Learner · AI Engineering Cohort",
    badge: "LEARNER",
    avatar: undefined,
    tagline: "Live classes, chaptered replays, assessments and certificates",
    accentColor: "#6d4aff",
  },
  Admin: {
    role: "Admin",
    name: "Admin",
    email: "admin@lms.com",
    password: "123456",
    title: "Academy Operations Lead",
    badge: "ADMIN",
    avatar: undefined,
    tagline: "Courses, batches, instructors, enrolments, orders and reports",
    accentColor: "#2563eb",
  },
  "Super Admin": {
    role: "Super Admin",
    name: "Super Admin",
    email: "superadmin@lms.com",
    password: "123456",
    title: "Platform Owner",
    badge: "SUPER ADMIN",
    avatar: "/assets/teacher-female.png",
    tagline: "Platform health, access control, audit logs, AI engine and revenue",
    accentColor: "#6d4aff",
  },
  Evaluator: {
    role: "Evaluator",
    name: "Eval",
    email: "eval@lms.com",
    password: "123456",
    title: "Assessment Lead",
    badge: "EVALUATOR",
    avatar: "/assets/teacher-female.png",
    tagline: "Submission queue, rubric grading, re-evaluations and reports",
    accentColor: "#b45309",
  },
  Support: {
    role: "Support",
    name: "Maheshwar",
    email: "maheshwar@lms.com",
    password: "123456",
    title: "Support Operations Lead",
    badge: "SUPPORT",
    avatar: "/assets/teacher-male.png",
    tagline: "Ticket inbox, live chat, student 360 and knowledge base",
    accentColor: "#0e7490",
  },
}

/** Demo accounts surfaced on the auth screen: 1 teacher and 1 student */
export const demoAccounts: DemoAccount[] = [
  ALL_DEMO_ACCOUNTS.Teacher,
  ALL_DEMO_ACCOUNTS.Student,
]

export function getDemoAccount(role: UserRole): DemoAccount {
  return ALL_DEMO_ACCOUNTS[role] ?? ALL_DEMO_ACCOUNTS.Teacher
}
