/**
 * Quantum LMS - Role-Segregated Components Architecture
 *
 * Professional component hierarchy:
 * - /teacher - Teacher & Faculty UI (Sidebar, Attendance, Assignments, Studio suggestions)
 * - /student - Student UI (StudentSidebar, learning widgets)
 * - /admin   - Institutional Admin UI (AdminSidebar, AdminModals, AI Monitoring)
 * - /shared  - Cross-role components (Modals, MetricCard, HexColorField, VideoPlayer, AI Tutor, Drawers)
 * - /ui      - Atomic design system components (buttons, badges, cards, dialogs, tabs)
 * - /icons   - Brand & currency icons
 */

export * as TeacherComponents from "./teacher"
export * as StudentComponents from "./student"
export * as AdminComponents from "./admin"
export * as SharedComponents from "./shared"
export * as UI from "./ui"
export * as Icons from "./icons"
