import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { AssignmentItem, CurrentUser, LiveSessionItem, ReportItem, StudentItem, UserRole } from "@/types"
import {
  initialAnalyticsMetrics,
  initialAssignments,
  initialCourseMetrics,
  initialCourses,
  initialLiveSessions,
  initialReports,
  initialStudentMetrics,
  initialStudents,
} from "@/data/mockData"
import { DesktopSidebar, MobileDrawer, MobileTopBar } from "@/components/Sidebar"
import { AddStudentModal, AskAiModal, NewAssignmentModal, ReportSenderModal } from "@/components/Modals"
import { LEGACY_BG, noopHexChange } from "@/app/legacy"
import {
  AnalyticsPage,
  CalendarPage,
  CoursesPage,
  DoubtsPage,
  LiveStudioPage,
  SettingsPage,
  StudentsPage,
  SupportPage,
} from "./index"

interface TeacherPortalProps {
  currentUser: CurrentUser
  onSwitchRole: (role: UserRole) => void
  onLogout: () => void
  onToast: (msg: string) => void
}

const LIVE_SESSIONS_KEY = "quantum_teacher_live_sessions_v1"

/** Maps a /teacher/* path to the legacy tab name. Nested routes replace this in Phase 4. */
function tabFromPath(pathname: string): string {
  const p = pathname.toLowerCase()
  if (p.includes("/courses")) return "My Courses"
  if (p.includes("/students")) return "My Students"
  if (p.includes("/doubts")) return "Doubts"
  if (p.includes("/calendar")) return "Calendar"
  if (p.includes("/live")) return "Live Class"
  if (p.includes("/reports") || p.includes("/analytics")) return "Analytics"
  if (p.includes("/settings")) return "Settings"
  if (p.includes("/support") || p.includes("/help")) return "Help & Support"
  return "Dashboard"
}

function loadLiveSessions(): LiveSessionItem[] {
  try {
    const saved = localStorage.getItem(LIVE_SESSIONS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length >= 8 && parsed[0]?.title) return parsed
    }
  } catch {
    // ignore
  }
  return initialLiveSessions
}

export default function TeacherPortal({ currentUser, onSwitchRole, onLogout, onToast }: TeacherPortalProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => tabFromPath(location.pathname))
  const [liveSessions, setLiveSessions] = useState<LiveSessionItem[]>(loadLiveSessions)
  const [studioSession, setStudioSession] = useState<LiveSessionItem | null>(null)

  // Derive tab / studio state from the URL (initial load, back/forward, navigate()).
  useEffect(() => {
    const p = location.pathname.toLowerCase()
    if (p.includes("/reports")) {
      navigate("/teacher/analytics", { replace: true })
      return
    }
    setActiveTab(tabFromPath(p))
    const parts = location.pathname.split("/")
    const last = parts[parts.length - 1]
    if (p.includes("/live-class/studio/") || p.includes("/live/studio/")) {
      setStudioSession(liveSessions.find((s) => s.id === last) || liveSessions[0])
    } else {
      setStudioSession(null)
    }
    // liveSessions intentionally omitted: only the URL drives this sync
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navigate])

  const [searchQuery, setSearchQuery] = useState("")
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState("All")

  const [assignments, setAssignments] = useState(initialAssignments)
  const [courses] = useState(initialCourses)
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

  const handleLeaveStudio = () => navigate("/teacher/live-class")

  const handleEndClass = (sessionId: string) => {
    setLiveSessions((prev) => {
      const next = prev.map((s) => (s.id === sessionId ? { ...s, status: "Completed" as const } : s))
      try {
        localStorage.setItem(LIVE_SESSIONS_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
    navigate(`/teacher/live-class/review/${sessionId}`)
    onToast("Live class ended. Opening the recording review.")
  }

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students
    const q = searchQuery.toLowerCase()
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        (s.assignedClass && s.assignedClass.toLowerCase().includes(q)),
    )
  }, [students, searchQuery])

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || filteredStudents[0] || students[0],
    [students, filteredStudents, selectedStudentId],
  )

  const handleCreateAssignment = (newAssignment: Omit<AssignmentItem, "id">) => {
    const item: AssignmentItem = { ...newAssignment, id: `a-${Date.now()}` }
    setAssignments((prev) => [item, ...prev])
    onToast(`Assignment "${item.title}" created successfully!`)
  }

  const handleAddStudent = (newStudent: Omit<StudentItem, "id">) => {
    const item: StudentItem = { ...newStudent, id: `s-${Date.now()}` }
    setStudents((prev) => [item, ...prev])
    setSelectedStudentId(item.id)
    onToast(`Student "${item.name}" enrolled successfully!`)
  }

  const handleSendReport = (title: string) => {
    const newReport: ReportItem = {
      id: `r-${Date.now()}`,
      title,
      meta: "Due today",
      date: "Today",
      type: "Custom Report",
      recipients: reportTargetStudent ? reportTargetStudent : "All learners in the batch",
      readRate: 0,
      status: "Sent",
      tone: "green",
      summary: {
        avgScore: 82,
        attendance: 96,
        readCount: "Sent just now",
        topGain: "Delivered in the learner portal",
        notes: "Progress and attendance summary shared with the learner.",
      },
    }
    setReports((prev) => [newReport, ...prev])
    onToast(`Report "${title}" sent successfully!`)
  }

  const openStudentReportModal = (studentName: string) => {
    setReportTargetStudent(studentName)
    setIsReportModalOpen(true)
  }

  const openAi = () => setIsAiModalOpen(true)

  return (
    <div className="dashboard-shell teacher-portal-shell" style={{ backgroundColor: LEGACY_BG }}>
      <DesktopSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        currentUser={currentUser}
        onSwitchRole={onSwitchRole}
      />

      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        hexColor={LEGACY_BG}
        onChangeHexColor={noopHexChange}
        currentUser={currentUser}
        onSwitchRole={onSwitchRole}
      />

      <main className="dashboard-content">
        <MobileTopBar onOpenDrawer={() => setIsDrawerOpen(true)} onOpenNewAssignment={handleOpenNewAssignment} />

        {(activeTab === "Dashboard" || activeTab === "Class" || activeTab === "My Courses") && (
          <CoursesPage
            metrics={initialCourseMetrics}
            courses={courses}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={LEGACY_BG}
            onChangeHexColor={noopHexChange}
            onOpenAiModal={openAi}
            allStudents={filteredStudents}
            onSelectStudentDetails={(st) => {
              setSelectedStudentId(st.id)
              setActiveTab("My Students")
            }}
            onToast={onToast}
          />
        )}

        {(activeTab === "My Students" || activeTab === "Students") && (
          <StudentsPage
            metrics={initialStudentMetrics}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={LEGACY_BG}
            onChangeHexColor={noopHexChange}
            onOpenAiModal={openAi}
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
            hexColor={LEGACY_BG}
            onChangeHexColor={noopHexChange}
            onOpenAiModal={openAi}
            courses={courses}
            students={students}
            onToast={onToast}
          />
        )}

        {activeTab === "Calendar" && (
          <CalendarPage
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={LEGACY_BG}
            onChangeHexColor={noopHexChange}
            onOpenAiModal={openAi}
            courses={courses}
            onToast={onToast}
          />
        )}

        {(activeTab === "Live Class" || activeTab === "Live Studio") && (
          <LiveStudioPage
            session={studioSession || liveSessions[0]}
            students={filteredStudents}
            onLeaveStudio={handleLeaveStudio}
            onEndClass={handleEndClass}
            onToast={onToast}
          />
        )}

        {activeTab === "Analytics" && (
          <AnalyticsPage
            metrics={initialAnalyticsMetrics}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={LEGACY_BG}
            onChangeHexColor={noopHexChange}
            onOpenAiDiagnostic={openAi}
            onAssignSkill={handleOpenAssignWithTopic}
            onSelectStudentForReport={openStudentReportModal}
            onOpenAiAssistant={openAi}
            reports={reports}
            onShareDigest={() => onToast("AI progress digest shared with learners.")}
            courses={courses}
            students={students}
            liveSessions={liveSessions}
            assignments={assignments}
            onToast={onToast}
          />
        )}

        {activeTab === "Settings" && (
          <SettingsPage
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={LEGACY_BG}
            onChangeHexColor={noopHexChange}
            onSave={() => onToast("Settings and preferences saved successfully!")}
          />
        )}

        {(activeTab === "Help & Support" || activeTab === "Support") && (
          <SupportPage
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hexColor={LEGACY_BG}
            onChangeHexColor={noopHexChange}
            onNavigateTab={(tab) => {
              setActiveTab(tab)
              setStudioSession(null)
            }}
            onToast={onToast}
          />
        )}
      </main>

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
      <AddStudentModal isOpen={isAddStudentOpen} onClose={() => setIsAddStudentOpen(false)} onSubmit={handleAddStudent} />
      <AskAiModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />
      <ReportSenderModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false)
          setReportTargetStudent(undefined)
        }}
        onSent={handleSendReport}
        initialTarget={reportTargetStudent}
      />
    </div>
  )
}
