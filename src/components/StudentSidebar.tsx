import type { IconName } from "../types"
import { Icon } from "./Icon"
import type { StudentNavPage } from "../pages/student/studentTypes"

export type { StudentNavPage } from "../pages/student/studentTypes"

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
    { label: "Dashboard", icon: "home" },
    { label: "My Courses", icon: "book" },
    { label: "Timetable", icon: "calendar" },
    { label: "Attendance", icon: "check" },
    { label: "Grades", icon: "trend" },
    { label: "Communication", icon: "chat" },
    { label: "Discussions", icon: "message" },
    { label: "Mentor Details", icon: "users" },
    { label: "My Notes", icon: "note" },
    { label: "Certificates", icon: "award" },
    { label: "Resume Building", icon: "document" },
    { label: "Mock Interview", icon: "chat" },
  ]

  return (
    <aside
      className="sidebar student-sidebar-shared h-full max-h-full flex flex-col justify-between box-border min-h-0"
      aria-label="Student Navigation"
    >
      {/* Brand Logo - identical to Teacher sidebar */}
      <div
        className="logo cursor-pointer shrink-0"
        onClick={() => setActiveTab("Dashboard")}
        aria-label="Quantum School of AI"
      >
        <img src="/logo.png" alt="Quantum School of AI" className="logo-img" />
      </div>

      {/* Student Profile Card - clicking opens Profile page */}
      <div
        className="teacher cursor-pointer hover:opacity-90 transition-opacity shrink-0"
        onClick={() => setActiveTab("Profile")}
        title="View Student Profile"
      >
        <img src="/assets/srimanth.png" alt="Srimanth" />
        <strong>Srimanth</strong>
        <span>Student · Year 4</span>
      </div>

      {/* Navigation Pages matching LMS Student Portal */}
      <nav className="student-shared-nav flex-1 min-h-0 overflow-y-auto" aria-label="Student main navigation">
        {navItems.map((item) => {
          const isActive =
            activeTab === item.label ||
            (item.label === "My Courses" && activeTab === "Course Details")
          return (
            <button
              key={item.label}
              className={isActive ? "nav-item active" : "nav-item"}
              onClick={() => setActiveTab(item.label)}
              title={item.label}
            >
              <Icon name={item.icon} size={15} />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Sidebar Action Buttons */}
      <div className="student-sidebar-actions shrink-0 mt-auto">
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
