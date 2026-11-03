import type { Role } from "./db/schema.js"

/**
 * Shared demo accounts behind the quick-launch buttons (only with DEMO_MODE=true). Their passwords are public, so
 * the API resets them on "Reset demo data" and refuses profile changes that would lock other visitors out.
 */
export const DEMO_ACCOUNTS: { email: string; password: string; name: string; role: Role; group?: string }[] = [
  { email: process.env.DEMO_STUDENT_EMAIL || "aarav.mehta@learner.ai", password: "DemoStudent2026", name: "Aarav Mehta", role: "Student", group: "students" },
  { email: process.env.DEMO_EVALUATOR_EMAIL || "evaluator@quantumschool.ai", password: "DemoEvaluator2026", name: "Meera Nair", role: "Evaluator", group: "evaluators" },
  { email: process.env.DEMO_SUPPORT_EMAIL || "support@quantumschool.ai", password: "DemoSupport2026", name: "Neha Kapoor", role: "Support", group: "support" },
  { email: process.env.DEMO_ADMIN_EMAIL || "admin@quantumschool.ai", password: "DemoAdmin2026", name: "Rohan Iyer", role: "Admin", group: "admins" },
  { email: process.env.DEMO_SUPER_ADMIN_EMAIL || "superadmin@quantumschool.ai", password: "DemoSuperAdmin2026", name: "Dr. Vikram Seth", role: "Super Admin", group: "super-admins" },
]
