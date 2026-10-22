import { useState, useMemo, useEffect } from "react"
import type { AssignmentItem, StudentItem, ReportItem, UserRole, CurrentUser } from "./types"
import {
  initialClassMetrics,
  initialStudentMetrics,
  initialReportMetrics,
  initialAnalyticsMetrics,
  initialAssignments,
  initialStudents,
  initialReports,
} from "./data/mockData"
import { demoAccounts } from "./data/adminMockData"
import {
  DEFAULT_BG_HEX,
  isValidHexColor,
  normalizeHexColor,
  getHexContrast,
} from "./utils/colorUtils"
import {
  DesktopSidebar,
  MobileDrawer,
  MobileTopBar,
} from "./components/Sidebar"
import {
  NewAssignmentModal,
  AddStudentModal,
  AskAiModal,
  ReportSenderModal,
  Toast,
} from "./components/Modals"
import ClassPage from "./pages/ClassPage"
import StudentsPage from "./pages/StudentsPage"
import ReportsPage from "./pages/ReportsPage"
import AnalyticsPage from "./pages/AnalyticsPage"
import SettingsPage from "./pages/SettingsPage"
import AuthPage from "./pages/AuthPage"
import StudentPortal from "./pages/StudentPortal"
import AdminPortal from "./pages/AdminPortal"

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname.toLowerCase()
      if (p === "/auth" || p === "/login" || p.startsWith("/auth/")) {
        return false
      }
    }
    try {
      const auth = localStorage.getItem("quantum_auth_session")
      if (auth === "false") return false
      return true
    } catch {
      return true
    }
  })

  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname.toLowerCase()
      if (p.includes("/super-admin")) return "Super Admin"
      if (p.includes("/admin")) return "Admin"
      if (p.includes("/student")) return "Student"
      if (p.includes("/teacher")) return "Teacher"
    }
    try {
      const saved = localStorage.getItem("quantum_user_role") as UserRole
      if (saved) return saved
    } catch {
      // ignore
    }
    return "Teacher"
  })

  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    try {
      const saved = localStorage.getItem("quantum_current_user")
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return {
      id: "u-1",
      name: "Srimanth",
      role: "Teacher",
      email: "srimanth@quantum-lms.edu",
      title: "Lead Educator · Year 4 Maple Class",
      avatar: "/assets/srimanth.png",
    }
  })

  // Synchronize route with back/forward history navigation
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname.toLowerCase()
      if (p === "/auth" || p === "/login" || p.startsWith("/auth/")) {
        setIsAuthenticated(false)
      } else {
        const auth = localStorage.getItem("quantum_auth_session")
        if (auth !== "false") {
          setIsAuthenticated(true)
        }
        if (p.includes("/super-admin")) {
          setUserRole("Super Admin")
        } else if (p.includes("/admin")) {
          setUserRole("Admin")
        } else if (p.includes("/student")) {
          setUserRole("Student")
        } else if (p.includes("/teacher") || p === "/" || p === "") {
          setUserRole("Teacher")
        }
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])
  const [activeTab, setActiveTab] = useState("Class")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState("All")
  const [reportFilter, setReportFilter] = useState("All")

  const [assignments, setAssignments] = useState(initialAssignments)
  const [students, setStudents] = useState(initialStudents)
  const [reports, setReports] = useState(initialReports)
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudents[0].id)
  const [selectedReportId, setSelectedReportId] = useState(initialReports[0].id)

  const [isNewAssignmentOpen, setIsNewAssignmentOpen] = useState(false)
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportTargetStudent, setReportTargetStudent] = useState<string | undefined>(undefined)
  const [assignmentInitialTitle, setAssignmentInitialTitle] = useState<string | undefined>(undefined)
  const [assignmentInitialSubject, setAssignmentInitialSubject] = useState<string | undefined>(undefined)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Hex background color state with persistence
  const [hexColor, setHexColor] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("quantum_lms_bg_hex")
      if (saved && isValidHexColor(saved)) {
        return normalizeHexColor(saved)
      }
    } catch {
      // ignore
    }
    return DEFAULT_BG_HEX
  })

  const { isLight: isLightBg } = useMemo(() => getHexContrast(hexColor), [hexColor])

  // Synchronize entire page background and CSS custom properties dynamically
  useEffect(() => {
    document.body.style.backgroundColor = hexColor
    document.documentElement.style.setProperty("--bg-custom", hexColor)
    if (isLightBg) {
      document.documentElement.style.setProperty("--bg-grid-line", "rgba(0, 0, 0, 0.08)")
      document.documentElement.style.setProperty("--header-text-color", "#09090b")
      document.documentElement.style.setProperty("--header-subtitle-color", "rgba(9, 9, 11, 0.75)")
    } else {
      document.documentElement.style.setProperty("--bg-grid-line", "rgba(255, 255, 255, 0.19)")
      document.documentElement.style.setProperty("--header-text-color", "#ffffff")
      document.documentElement.style.setProperty("--header-subtitle-color", "rgba(255, 255, 255, 0.95)")
    }
  }, [hexColor, isLightBg])

  const handleHexColorChange = (newHex: string) => {
    if (isValidHexColor(newHex)) {
      const normalized = normalizeHexColor(newHex)
      setHexColor(normalized)
      try {
        localStorage.setItem("quantum_lms_bg_hex", normalized)
      } catch {
        // ignore
      }
    }
  }

  const handleOpenAssignWithTopic = (topic: string, subjectType: string) => {
    setAssignmentInitialTitle(topic)
    setAssignmentInitialSubject(subjectType)
    setIsNewAssignmentOpen(true)
  }

  const handleOpenNewAssignment = () => {
    setAssignmentInitialTitle(undefined)
    setAssignmentInitialSubject(undefined)
    setIsNewAssignmentOpen(true)
  }

  // Filter items according to search query
  const filteredAssignments = useMemo(() => {
    if (!searchQuery.trim()) return assignments
    const q = searchQuery.toLowerCase()
    return assignments.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.meta.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
    )
  }, [assignments, searchQuery])

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students
    const q = searchQuery.toLowerCase()
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [students, searchQuery])

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0]
  }, [students, selectedStudentId])

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports
    const q = searchQuery.toLowerCase()
    return reports.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.meta.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.recipients.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    )
  }, [reports, searchQuery])

  const selectedReport = useMemo(() => {
    return reports.find((r) => r.id === selectedReportId) || reports[0]
  }, [reports, selectedReportId])

  const handleCreateAssignment = (
    newAssignment: Omit<AssignmentItem, "id">
  ) => {
    const item: AssignmentItem = {
      ...newAssignment,
      id: `a-${Date.now()}`,
    }
    setAssignments((prev) => [item, ...prev])
    setToastMessage(`Assignment "${item.title}" created successfully!`)
  }

  const handleAddStudent = (
    newStudent: Omit<StudentItem, "id">
  ) => {
    const item: StudentItem = {
      ...newStudent,
      id: `s-${Date.now()}`,
    }
    setStudents((prev) => [item, ...prev])
    setSelectedStudentId(item.id)
    setToastMessage(`Student "${item.name}" enrolled successfully!`)
  }

  const handleSendReport = (title: string) => {
    const newReport: ReportItem = {
      id: `r-${Date.now()}`,
      title,
      meta: "Year 4 Due Today",
      date: "Today",
      type: "Custom Report",
      recipients: reportTargetStudent
        ? `Parents of ${reportTargetStudent}`
        : "All Year 4 Parents (24)",
      readRate: 0,
      status: "Sent",
      tone: "green",
      summary: {
        avgScore: 82,
        attendance: 96,
        readCount: "Dispatched just now",
        topGain: "Sent to parents via portal",
        notes: "Detailed academic and attendance summary dispatched for parental review.",
      },
    }
    setReports((prev) => [newReport, ...prev])
    setSelectedReportId(newReport.id)
    setToastMessage(`Report "${title}" dispatched successfully!`)
  }

  const openStudentReportModal = (studentName: string) => {
    setReportTargetStudent(studentName)
    setIsReportModalOpen(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    try {
      localStorage.setItem("quantum_auth_session", "false")
      window.history.pushState(null, "", "/auth")
    } catch {
      // ignore
    }
    setToastMessage("You have been signed out.")
  }

  const handleSwitchRole = (targetRole: UserRole) => {
    setUserRole(targetRole)
    const acc = demoAccounts.find((d) => d.role === targetRole)
    if (acc) {
      const updatedUser: CurrentUser = {
        id: `u-${Date.now()}`,
        name: acc.name,
        role: targetRole,
        email: acc.email,
        avatar: acc.avatar,
        title: acc.title,
      }
      setCurrentUser(updatedUser)
      try {
        localStorage.setItem("quantum_user_role", targetRole)
        localStorage.setItem("quantum_current_user", JSON.stringify(updatedUser))
        const path =
          targetRole === "Super Admin"
            ? "/super-admin"
            : targetRole === "Admin"
            ? "/admin"
            : targetRole === "Student"
            ? "/student"
            : "/"
        window.history.pushState(null, "", path)
      } catch {
        // ignore
      }
    }
    setToastMessage(`Switched active perspective to: ${targetRole}`)
  }

  const handleLogin = (user: {
    name: string
    role: UserRole
    email: string
    avatar?: string
    title?: string
  }) => {
    setIsAuthenticated(true)
    setUserRole(user.role)
    const fullUser: CurrentUser = {
      id: `u-${Date.now()}`,
      name: user.name,
      role: user.role,
      email: user.email,
      avatar: user.avatar,
      title: user.title,
    }
    setCurrentUser(fullUser)
    try {
      localStorage.setItem("quantum_auth_session", "true")
      localStorage.setItem("quantum_user_role", user.role)
      localStorage.setItem("quantum_current_user", JSON.stringify(fullUser))
      const path =
        user.role === "Super Admin"
          ? "/super-admin"
          : user.role === "Admin"
          ? "/admin"
          : user.role === "Student"
          ? "/student"
          : "/"
      window.history.pushState(null, "", path)
    } catch {
      // ignore
    }
    setToastMessage(`Welcome back, ${user.name}! Connected to Quantum AI as ${user.role}.`)
  }

  if (!isAuthenticated) {
    return (
      <div
        className="auth-shell"
        style={{
          backgroundColor: hexColor,
          backgroundImage: isLightBg
            ? "linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px)"
            : "linear-gradient(rgba(255, 255, 255, 0.19) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.19) 1px, transparent 1px)",
        }}
      >
        <AuthPage
          onLogin={handleLogin}
          hexColor={hexColor}
          onChangeHexColor={handleHexColorChange}
        />
        {toastMessage && (
          <Toast
            message={toastMessage}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>
    )
  }

  if (userRole === "Super Admin" || userRole === "Admin") {
    return (
      <>
        <AdminPortal
          role={userRole}
          currentUser={currentUser}
          onSwitchRole={handleSwitchRole}
          onLogout={handleLogout}
          onToast={(msg) => setToastMessage(msg)}
          hexColor={hexColor}
          onChangeHexColor={handleHexColorChange}
          isLightBg={isLightBg}
        />
        {toastMessage && (
          <Toast
            message={toastMessage}
            onClose={() => setToastMessage(null)}
          />
        )}
      </>
    )
  }

  if (userRole === "Student") {
    return (
      <>
        <StudentPortal
          onOpenAiModal={() => setIsAiModalOpen(true)}
          onSwitchToTeacher={() => handleSwitchRole("Teacher")}
          onLogout={handleLogout}
          onToast={(msg) => setToastMessage(msg)}
          hexColor={hexColor}
          onChangeHexColor={handleHexColorChange}
          isLightBg={isLightBg}
        />
        <AskAiModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
        />
        {toastMessage && (
          <Toast
            message={toastMessage}
            onClose={() => setToastMessage(null)}
          />
        )}
      </>
    )
  }

  return (
    <div
      className="dashboard-shell"
      style={{
        backgroundColor: hexColor,
        backgroundImage: isLightBg
          ? "linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px)"
          : "linear-gradient(rgba(255, 255, 255, 0.19) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.19) 1px, transparent 1px)",
      }}
    >
      {/* Desktop Persistent Sidebar */}
      <DesktopSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Mobile & Tablet Slide-over Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        hexColor={hexColor}
        onChangeHexColor={handleHexColorChange}
      />

      {/* Main Content Viewport */}
      <main className="dashboard-content">
        {/* Mobile & Tablet Header Bar */}
        <MobileTopBar
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onOpenNewAssignment={handleOpenNewAssignment}
        />

        {activeTab === "Class" && (
          <ClassPage
            metrics={initialClassMetrics}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={hexColor}
            onChangeHexColor={handleHexColorChange}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            students={filteredStudents}
            assignments={filteredAssignments}
            reports={reports}
            onOpenNewAssignment={handleOpenNewAssignment}
            onOpenReportModal={() => {
              setReportTargetStudent(undefined)
              setIsReportModalOpen(true)
            }}
            onSelectStudent={(s) => {
              setSelectedStudentId(s.id)
              setActiveTab("Students")
            }}
            onShowAllStudents={() => setActiveTab("Students")}
            onSwitchToStudent={() => handleSwitchRole("Student")}
          />
        )}

        {activeTab === "Students" && (
          <StudentsPage
            metrics={initialStudentMetrics}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={hexColor}
            onChangeHexColor={handleHexColorChange}
            onOpenAddStudent={() => setIsAddStudentOpen(true)}
            students={filteredStudents}
            selectedStudentId={selectedStudentId}
            setSelectedStudentId={setSelectedStudentId}
            selectedStudent={selectedStudent}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            onOpenReportModal={openStudentReportModal}
            onOpenNewAssignment={handleOpenNewAssignment}
          />
        )}

        {activeTab === "Reports" && (
          <ReportsPage
            metrics={initialReportMetrics}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={hexColor}
            onChangeHexColor={handleHexColorChange}
            onOpenReportModal={() => {
              setReportTargetStudent(undefined)
              setIsReportModalOpen(true)
            }}
            reports={filteredReports}
            selectedReportId={selectedReportId}
            setSelectedReportId={setSelectedReportId}
            selectedReport={selectedReport}
            reportFilter={reportFilter}
            setReportFilter={setReportFilter}
            onDownloadPdf={() =>
              setToastMessage(`Downloading PDF: "${selectedReport?.title}"`)
            }
            onResendAlert={() =>
              setToastMessage(
                `Dispatched parent notifications for "${selectedReport?.title}"!`
              )
            }
            onAddSchedule={() =>
              setToastMessage("Automated report schedule saved!")
            }
          />
        )}

        {activeTab === "Analytics" && (
          <AnalyticsPage
            metrics={initialAnalyticsMetrics}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={hexColor}
            onChangeHexColor={handleHexColorChange}
            onOpenAiDiagnostic={() => setIsAiModalOpen(true)}
            onAssignSkill={handleOpenAssignWithTopic}
            onSelectStudentForReport={openStudentReportModal}
            onOpenAiAssistant={() => setIsAiModalOpen(true)}
            onShareDigest={() =>
              setToastMessage("Quantum AI Diagnostic Digest dispatched to 24 parent portals!")
            }
          />
        )}

        {activeTab === "Settings" && (
          <SettingsPage
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={hexColor}
            onChangeHexColor={handleHexColorChange}
            onSave={() => setToastMessage("Settings and preferences saved successfully!")}
          />
        )}
      </main>

      {/* Modals */}
      <NewAssignmentModal
        isOpen={isNewAssignmentOpen}
        onClose={() => {
          setIsNewAssignmentOpen(false)
          setAssignmentInitialTitle(undefined)
          setAssignmentInitialSubject(undefined)
        }}
        onSubmit={handleCreateAssignment}
        initialTitle={assignmentInitialTitle}
        initialSubject={assignmentInitialSubject}
      />

      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onSubmit={handleAddStudent}
      />

      <AskAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

      <ReportSenderModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false)
          setReportTargetStudent(undefined)
        }}
        onSent={handleSendReport}
        initialTarget={reportTargetStudent}
      />

      {/* Toast feedback */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  )
}
