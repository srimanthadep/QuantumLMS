import type { IconName } from "../types"
import { Icon } from "./Icon"

export type StudentNavPage =
  | "Home"
  | "My Learning"
  | "Explore Courses"
  | "Live Classes"
  | "Schedule"
  | "Assignments"
  | "My Progress"
  | "My Notes"
  | "Certificates"
  | "Community"
  | "Help & Support"

interface StudentSidebarProps {
  activeTab: StudentNavPage
  setActiveTab: (tab: StudentNavPage) => void
  onOpenAiModal: () => void
  onSwitchToTeacher: () => void
  onLogout: () => void
}

export function StudentSidebar({
  activeTab,
  setActiveTab,
  onOpenAiModal,
  onSwitchToTeacher,
  onLogout,
}: StudentSidebarProps) {
  const navItems: { label: StudentNavPage; icon: IconName }[] = [
    { label: "Home", icon: "home" },
    { label: "My Learning", icon: "book" },
    { label: "Explore Courses", icon: "compass" },
    { label: "Live Classes", icon: "radio" },
    { label: "Schedule", icon: "calendar" },
    { label: "Assignments", icon: "document" },
    { label: "My Progress", icon: "chart" },
    { label: "My Notes", icon: "note" },
    { label: "Certificates", icon: "award" },
    { label: "Community", icon: "users" },
    { label: "Help & Support", icon: "help" },
  ]

  return (
    <aside className="sidebar student-sidebar-shared" aria-label="Student Navigation">
      {/* Brand Logo - identical to Teacher sidebar */}
      <div className="logo" aria-label="Quantum School of AI">
        <img
          src="/logo.png"
          alt="Quantum School of AI"
          className="logo-img"
        />
      </div>

      {/* Student Profile - identical to Teacher Profile card */}
      <div className="teacher">
        <img src="/assets/srimanth.png" alt="Srimanth" />
        <strong>Srimanth</strong>
        <span>Student · Year 4</span>
      </div>

      {/* 11 Navigation Pages - identical nav-item styling */}
      <nav className="student-shared-nav" aria-label="Student main navigation">
        {navItems.map((item) => {
          const isActive = activeTab === item.label
          return (
            <button
              key={item.label}
              className={isActive ? "nav-item active" : "nav-item"}
              onClick={() => setActiveTab(item.label)}
              title={item.label}
            >
              <Icon name={item.icon} size={16} />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Sidebar Action Buttons */}
      <div className="student-sidebar-actions">
        {/* Ask AI Pill Button */}
        <button
          className="student-action-ai-btn"
          onClick={onOpenAiModal}
          aria-label="Ask AI Assistant"
        >
          <span>✦</span>
          <span>Ask AI</span>
        </button>

        {/* Switch to Teacher Portal */}
        <button
          className="student-action-switch-btn"
          onClick={onSwitchToTeacher}
          title="Switch to Teacher Workspace"
        >
          <span>👨‍🏫 Teacher Portal</span>
        </button>

        {/* Log Out Button */}
        <button
          className="student-action-logout-btn"
          onClick={onLogout}
          aria-label="Log Out"
        >
          <Icon name="logout" size={14} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  )
}

export default StudentSidebar
