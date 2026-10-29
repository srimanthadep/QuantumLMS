/**
 * Quantum LMS - Role-Segregated Components Architecture
 *
 * Professional component hierarchy:
 * - /teacher - Teacher & Faculty UI (Sidebar, Attendance, Assignments, Studio suggestions)
 * - /student - Student UI (StudentSidebar, learning widgets)
 * - /admin   - Institutional Admin UI (AdminSidebar, AdminModals, AI Monitoring)
 * - /shared  - Cross-role components (Modals, MetricCard, Drawers)
 * - /ui      - Atomic design system components (buttons, badges, cards, dialogs, tabs)
 * - /shell   - AppShell (sidebar, top bar, mobile nav, command palette, Ask AI) shared by every portal
 * - /motion  - Motion primitives (PageTransition, Stagger, Reveal, AnimatedNumber, Pressable)
 * - /charts  - Lightweight SVG charts
 */

export * as TeacherComponents from "./teacher"
export * as StudentComponents from "./student"
export * as AdminComponents from "./admin"
export * as SharedComponents from "./shared"
export * as UI from "./ui"
export * as Shell from "./shell"
export * as Motion from "./motion"
export * as Charts from "./charts"

// Direct convenience exports
export { Icon } from "./Icon"
export { StatCard as MetricCard, FolderTabBackground } from "./ui/StatCard"
export { AppShell } from "./shell"
export { StudentHeader } from "./StudentHeader"
