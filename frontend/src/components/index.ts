/**
 * Quantum LMS - Role-Segregated Components Architecture
 *
 * Professional component hierarchy:
 * - /teacher - Teacher portal building blocks (live class hero, student drawer, grading sheet, dialogs)
 * - /student - Student portal building blocks (course card, quiz runner, dialogs)
 * - /admin   - Institutional Admin UI (AdminModals)
 * - /shared  - Cross-role components (CourseCover, Student360Drawer, MetricCard)
 * - /ui      - Atomic design system components (buttons, badges, cards, dialogs, tabs)
 * - /shell   - AppShell (sidebar, top bar, mobile nav, command palette, Clover) shared by every portal
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

