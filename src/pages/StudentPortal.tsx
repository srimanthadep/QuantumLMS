import { useState } from "react"
import { StudentSidebar, type StudentNavPage } from "../components/StudentSidebar"
import StudentDashboardPage from "./StudentDashboardPage"
import { StudentOtherPage } from "./StudentOtherPages"

interface StudentPortalProps {
  onOpenAiModal: () => void
  onSwitchToTeacher: () => void
  onLogout: () => void
  onToast: (msg: string) => void
  hexColor: string
  onChangeHexColor: (c: string) => void
  isLightBg?: boolean
}

export default function StudentPortal({
  onOpenAiModal,
  onSwitchToTeacher,
  onLogout,
  onToast,
  hexColor,
  onChangeHexColor,
  isLightBg,
}: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<StudentNavPage>("Home")

  return (
    <div
      className="dashboard-shell student-dashboard-shell"
      style={{
        backgroundColor: hexColor,
        backgroundImage: isLightBg
          ? "linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px)"
          : "linear-gradient(rgba(255, 255, 255, 0.19) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.19) 1px, transparent 1px)",
      }}
    >
      {/* Student Persistent Sidebar (Shares identical lavender background, avatar, and layout) */}
      <StudentSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAiModal={onOpenAiModal}
        onSwitchToTeacher={onSwitchToTeacher}
        onLogout={onLogout}
      />

      {/* Main Student Content Viewport */}
      <main className="dashboard-content">
        {activeTab === "Home" ? (
          <StudentDashboardPage
            onOpenAiModal={onOpenAiModal}
            onSwitchToTeacher={onSwitchToTeacher}
            onToast={onToast}
            hexColor={hexColor}
            onChangeHexColor={onChangeHexColor}
          />
        ) : (
          <StudentOtherPage
            page={activeTab}
            onToast={onToast}
            onSwitchToTeacher={onSwitchToTeacher}
            hexColor={hexColor}
            onChangeHexColor={onChangeHexColor}
            onOpenAiModal={onOpenAiModal}
          />
        )}
      </main>
    </div>
  )
}
