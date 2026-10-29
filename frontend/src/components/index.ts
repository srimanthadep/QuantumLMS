/**
 * Quantum LMS - Role-Segregated Components Architecture
 *
 * Professional component hierarchy:
 * - /teacher - Teacher & Faculty UI (Sidebar, Attendance, Assignments, Studio suggestions)
 * - /student - Student UI (StudentSidebar, learning widgets)
 * - /admin   - Institutional Admin UI (AdminSidebar, AdminModals, AI Monitoring)
 * - /shared  - Cross-role components (Modals, MetricCard, HexColorField, Drawers)
 * - /ui      - Atomic design system components (buttons, badges, cards, dialogs, tabs)
 */

export * as TeacherComponents from "./teacher"
export * as StudentComponents from "./student"
export * as AdminComponents from "./admin"
export * as SharedComponents from "./shared"
export * as UI from "./ui"

// Direct convenience exports
export { Icon } from "./Icon"
export { HexColorField } from "./HexColorField"
export { StatCard as MetricCard, FolderTabBackground } from "./ui/StatCard"
export { AppSidebar as AdminSidebar, AppSidebar as StudentSidebar } from "./Sidebar"
export { StudentHeader } from "./StudentHeader"
