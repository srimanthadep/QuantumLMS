import type { Role } from "./db/schema.js"

/**
 * Shared demo accounts behind the quick-launch buttons (only with DEMO_MODE=true). Their passwords are public, so
 * the API resets them on "Reset demo data" and refuses profile changes that would lock other visitors out.
 */
export const DEMO_ACCOUNTS: { email: string; password: string; name: string; role: Role; group?: string }[] = [
  { email: process.env.DEMO_STUDENT_EMAIL || "niharika@lms.com", password: "123456", name: "Niharika", role: "Student", group: "students" },
  { email: process.env.DEMO_EVALUATOR_EMAIL || "eval@lms.com", password: "123456", name: "Eval", role: "Evaluator", group: "evaluators" },
  { email: process.env.DEMO_SUPPORT_EMAIL || "maheshwar@lms.com", password: "123456", name: "Maheshwar", role: "Support", group: "support" },
  { email: process.env.DEMO_ADMIN_EMAIL || "admin@lms.com", password: "123456", name: "Admin", role: "Admin", group: "admins" },
  { email: process.env.DEMO_SUPER_ADMIN_EMAIL || "superadmin@lms.com", password: "123456", name: "Super Admin", role: "Super Admin", group: "super-admins" },
  { email: process.env.DEMO_TEACHER_EMAIL || "shanmuk@lms.com", password: "123456", name: "Shanmuk", role: "Teacher", group: "teachers" },
]
