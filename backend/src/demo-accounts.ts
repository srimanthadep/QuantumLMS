import type { Role } from "./db/schema.js"

/**
 * Shared demo accounts behind the quick-launch buttons (only with DEMO_MODE=true). Their passwords are public, so
 * the API resets them on "Reset demo data" and refuses profile changes that would lock other visitors out.
 */
export const DEMO_ACCOUNTS: { email: string; password: string; name: string; role: Role; group?: string }[] = [
  { email: process.env.DEMO_STUDENT_EMAIL || "aarav.mehta@learner.ai", password: "DemoStudent2026", name: "Aarav Mehta", role: "Student", group: "students" },
  { email: process.env.DEMO_EVALUATOR_EMAIL || "evaluator@quantumschool.ai", password: "DemoEvaluator2026", name: "Meera Nair", role: "Evaluator", group: "evaluators" },
]
