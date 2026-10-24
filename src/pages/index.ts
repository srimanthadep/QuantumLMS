/**
 * Quantum LMS - Role-Segregated Pages Architecture
 *
 * Professional file tree structure grouping pages strictly by user role:
 * - /teacher - Teacher & Instructor portal (Maple Class, Courses, Live Classes, Analytics, etc.)
 * - /student - Modular Student learning portal (Dashboard, Courses, Assignments, Quizzes, etc.)
 * - /admin   - Institutional Admin & Super Admin management portal
 * - /support - Support Agent & Help Desk portal
 * - /auth    - Sign-in, onboarding & authentication
 */

export * as TeacherPages from "./teacher"
export * as StudentPages from "./student"
export * as AdminPages from "./admin"
export * as SupportPages from "./support"
export * as AuthPages from "./auth"

export { default as StudentPortal } from "./student/StudentPortal"
export { default as AdminPortal } from "./admin/AdminPortal"
export { default as AuthPage } from "./auth/AuthPage"
export { default as SupportPortal } from "./support"
