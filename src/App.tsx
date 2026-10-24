import { useState, useMemo, useEffect } from "react"
import type {
  AssignmentItem,
  StudentItem,
  ReportItem,
  CourseItem,
  LiveSessionItem,
  UserRole,
  CurrentUser,
} from "./types"
import {
  initialCourseMetrics,
  initialCourses,
  initialClassMetrics,
  initialStudentMetrics,
  initialAnalyticsMetrics,
  initialAssignments,
  initialStudents,
  initialReports,
  initialLiveSessions,
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
// Role Pages
import AuthPage from "./pages/auth/AuthPage"
import AdminPortal from "./pages/admin/AdminPortal"
import StudentPortal from "./pages/student/StudentPortal"
import {
  ClassPage,
  CoursesPage,
  StudentsPage,
  DoubtsPage,
  CalendarPage,
  LiveClassPage,
  LiveStudioPage,
  AnalyticsPage,
  SettingsPage,
} from "./pages/teacher"
import { lazy, Suspense } from "react"
const SupportPortal = lazy(() => import("./pages/support"))

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

  const [userRole, setUserRole] = useState<UserRole | "Support">(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname.toLowerCase()
      if (p.includes("/support")) return "Support"
      if (p.includes("/super-admin")) return "Super Admin"
      if (p.includes("/admin")) return "Admin"
      if (p.includes("/student")) return "Student"
      if (p.includes("/teacher")) return "Teacher"
    }
    try {
      const saved = localStorage.getItem("quantum_user_role") as UserRole | "Support"
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

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname.toLowerCase()
      if (p.includes("/courses")) return "My Courses"
      if (p.includes("/students")) return "My Students"
      if (p.includes("/doubts")) return "Doubts"
      if (p.includes("/calendar")) return "Calendar"
      if (p.includes("/live") || p.includes("/live-class")) return "Live Class"
      if (p.includes("/reports")) {
        window.history.replaceState(null, "", "/teacher/analytics")
        return "Analytics"
      }
      if (p.includes("/analytics")) return "Analytics"
      if (p.includes("/settings")) return "Settings"
    }
    return "Dashboard"
  })

  // Persistent Live Sessions State
  const [liveSessions, setLiveSessions] = useState<LiveSessionItem[]>(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_live_sessions_v1")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length >= 8 && parsed[0]?.title) {
          return parsed
        }
      }
    } catch {
      // ignore
    }
    return initialLiveSessions
  })

  // Studio Session for In-App Live Studio
  const [studioSession, setStudioSession] = useState<LiveSessionItem | null>(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname.toLowerCase()
      if (p.includes("/live-class/studio/") || p.includes("/live/studio/")) {
        const parts = window.location.pathname.split("/")
        const id = parts[parts.length - 1]
        const found = initialLiveSessions.find((s) => s.id === id) || initialLiveSessions[0]
        return found
      }
    }
    return null
  })

  // Review Session ID for Recording Review page
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname.toLowerCase()
      if (p.includes("/live-class/review/") || p.includes("/live-class/recordings/")) {
        const parts = window.location.pathname.split("/")
        return parts[parts.length - 1] || null
      }
    }
    return null
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
        if (p.includes("/support")) {
          setUserRole("Support")
        } else if (p.includes("/super-admin")) {
          setUserRole("Super Admin")
        } else if (p.includes("/admin")) {
          setUserRole("Admin")
        } else if (p.includes("/student")) {
          setUserRole("Student")
        } else if (p.includes("/teacher") || p === "/" || p === "") {
          setUserRole("Teacher")
          if (p.includes("/courses")) {
            setActiveTab("My Courses")
            setStudioSession(null)
          } else if (p.includes("/doubts")) {
            setActiveTab("Doubts")
            setStudioSession(null)
          } else if (p.includes("/calendar")) {
            setActiveTab("Calendar")
            setStudioSession(null)
          } else if (p.includes("/live-class/studio/") || p.includes("/live/studio/")) {
            setActiveTab("Live Class")
            const parts = window.location.pathname.split("/")
            const id = parts[parts.length - 1]
            const found = liveSessions.find((s) => s.id === id) || liveSessions[0]
            setStudioSession(found)
          } else if (p.includes("/live-class/review/") || p.includes("/live-class/recordings/")) {
            setActiveTab("Live Class")
            const parts = window.location.pathname.split("/")
            setReviewSessionId(parts[parts.length - 1] || null)
            setStudioSession(null)
          } else if (p.includes("/live") || p.includes("/live-class")) {
            setActiveTab("Live Class")
            setStudioSession(null)
          } else if (p.includes("/reports")) {
            setActiveTab("Analytics")
            setStudioSession(null)
            window.history.replaceState(null, "", "/teacher/analytics")
          } else if (p.includes("/analytics")) {
            setActiveTab("Analytics")
            setStudioSession(null)
          } else if (p.includes("/settings")) {
            setActiveTab("Settings")
            setStudioSession(null)
          } else {
            setActiveTab("Dashboard")
            setStudioSession(null)
          }
        }
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [liveSessions])

  const [searchQuery, setSearchQuery] = useState("")
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState("All")

  const [assignments, setAssignments] = useState(initialAssignments)
  const [courses, setCourses] = useState(initialCourses)
  const [students, setStudents] = useState(initialStudents)
  const [reports, setReports] = useState(initialReports)
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudents[0].id)

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

  const handleEnterStudio = (session: LiveSessionItem) => {
    setStudioSession(session)
    setActiveTab("Live Class")
    window.history.pushState(null, "", `/teacher/live-class/studio/${session.id}`)
  }

  const handleLeaveStudio = () => {
    setStudioSession(null)
    window.history.pushState(null, "", "/teacher/live-class")
  }

  const handleEndClass = (sessionId: string) => {
    setLiveSessions((prev) => {
      const next = prev.map((s) =>
        s.id === sessionId ? { ...s, status: "Completed" as const } : s
      )
      try {
        localStorage.setItem("quantum_teacher_live_sessions_v1", JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
    setStudioSession(null)
    setReviewSessionId(sessionId)
    window.history.pushState(null, "", `/teacher/live-class/review/${sessionId}`)
    setToastMessage("Live class concluded. Redirected to Lecture Recording & AI Intelligence Review.")
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
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        (s.assignedClass && s.assignedClass.toLowerCase().includes(q))
    )
  }, [students, searchQuery])

  const selectedStudent = useMemo(() => {
    return (
      students.find((s) => s.id === selectedStudentId) ||
      filteredStudents[0] ||
      students[0]
    )
  }, [students, filteredStudents, selectedStudentId])

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
    setToastMessage(`Report "${title}" dispatched successfully!`)
  }

  const openStudentReportModal = (studentName: string) => {
    setReportTargetStudent(studentName)
    setIsReportModalOpen(true)
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
                : targetRole === "Support"
                  ? "/support"
                  : "/"
        window.history.pushState(null, "", path)
      } catch {
        // ignore
      }
    }
    setToastMessage(`Switched active perspective to: ${targetRole}`)
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
              : user.role === "Support"
                ? "/support"
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

  if (userRole === "Support") {
    return (
      <>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-zinc-500">Loading Support Portal...</div>}>
          <SupportPortal
            currentUser={currentUser}
            onSwitchRole={handleSwitchRole}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            onSwitchToTeacher={() => handleSwitchRole("Teacher")}
            onSwitchToStudent={() => handleSwitchRole("Student")}
            onLogout={handleLogout}
            onToast={(msg) => setToastMessage(msg)}
            hexColor={hexColor}
            onChangeHexColor={handleHexColorChange}
            isLightBg={isLightBg}
          />
        </Suspense>
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
      className="dashboard-shell teacher-portal-shell"
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
        currentUser={currentUser}
        onSwitchRole={handleSwitchRole}
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
        currentUser={currentUser}
        onSwitchRole={handleSwitchRole}
      />

      {/* Main Content Viewport */}
      <main className="dashboard-content">
        {/* Mobile & Tablet Header Bar */}
        <MobileTopBar
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onOpenNewAssignment={handleOpenNewAssignment}
        />

        {(activeTab === "Dashboard" || activeTab === "Class") && (
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
              setActiveTab("My Students")
            }}
            onShowAllStudents={() => setActiveTab("My Students")}
            onSwitchToStudent={() => handleSwitchRole("Student")}
          />
        )}

        {activeTab === "My Courses" && (
          <CoursesPage
            metrics={initialCourseMetrics}
            courses={courses}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={hexColor}
            onChangeHexColor={handleHexColorChange}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            allStudents={filteredStudents}
            onSelectStudentDetails={(st) => {
              setSelectedStudentId(st.id)
              setActiveTab("My Students")
            }}
            onToast={(msg) => setToastMessage(msg)}
          />
        )}

        {(activeTab === "My Students" || activeTab === "Students") && (
          <StudentsPage
            metrics={initialStudentMetrics}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={hexColor}
            onChangeHexColor={handleHexColorChange}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            students={filteredStudents}
            selectedStudentId={selectedStudentId}
            setSelectedStudentId={setSelectedStudentId}
            selectedStudent={selectedStudent}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            onOpenReportModal={openStudentReportModal}
          />
        )}

        {activeTab === "Doubts" && (
          <DoubtsPage
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={hexColor}
            onChangeHexColor={handleHexColorChange}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            courses={courses}
            students={students}
            onToast={(msg) => setToastMessage(msg)}
          />
        )}

        {activeTab === "Calendar" && (
          <CalendarPage
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={hexColor}
            onChangeHexColor={handleHexColorChange}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            courses={courses}
            onToast={(msg) => setToastMessage(msg)}
          />
        )}

        {activeTab === "Live Class" &&
          (studioSession ? (
            <LiveStudioPage
              session={studioSession}
              students={filteredStudents}
              onLeaveStudio={handleLeaveStudio}
              onEndClass={handleEndClass}
              onToast={(msg) => setToastMessage(msg)}
            />
          ) : (
            <LiveClassPage
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              hexColor={hexColor}
              onChangeHexColor={handleHexColorChange}
              onOpenAiModal={() => setIsAiModalOpen(true)}
              courses={courses}
              sessions={liveSessions}
              onEnterStudio={handleEnterStudio}
              reviewSessionId={reviewSessionId}
              onClearReviewSessionId={() => setReviewSessionId(null)}
              onToast={(msg) => setToastMessage(msg)}
            />
          ))}

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
            courses={courses}
            students={students}
            liveSessions={liveSessions}
            assignments={assignments}
            onToast={(msg) => setToastMessage(msg)}
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
