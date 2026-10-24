import { useState, useEffect, useCallback } from "react"
import {
  StudentSidebar,
  type StudentNavPage,
} from "../components/StudentSidebar"
import StudentDashboardPage from "./StudentDashboardPage"
import { StudentOtherPage } from "./StudentOtherPages"
import type {
  CourseItem,
  AssignmentData,
  QuizData,
  AssessmentAttempt,
} from "./student/studentTypes"
import {
  initialStudentCourses,
  catalogCourses,
  initialAssignmentsList,
  initialQuizzesList,
  initialQuizAttempts,
} from "./student/studentMockData"

interface StudentPortalProps {
  onOpenAiModal: () => void
  onSwitchToTeacher: () => void
  onLogout: () => void
  onToast: (msg: string) => void
  hexColor: string
  onChangeHexColor: (c: string) => void
  isLightBg?: boolean
}

// Normalize any route or query string to a valid StudentNavPage
function parseInitialTab(): StudentNavPage {
  if (typeof window === "undefined") return "Dashboard"
  try {
    const params = new URLSearchParams(window.location.search)
    const pageParam = params.get("page") || params.get("tab")
    const hash = window.location.hash.replace("#", "")
    const target = (pageParam || hash || "").toLowerCase().trim()

    if (
      target === "timetable" ||
      target === "schedule" ||
      target === "live-classes" ||
      target === "live classes"
    )
      return "Timetable"
    if (target === "attendance") return "Attendance"
    if (
      target === "my-courses" ||
      target === "courses" ||
      target === "my courses" ||
      target === "my-learning" ||
      target === "my learning" ||
      target === "explore courses" ||
      target === "explore-courses"
    )
      return "My Courses"
    if (
      target === "course-details" ||
      target === "course details" ||
      target === "materials"
    )
      return "Course Details"
    if (target === "assignments" || target === "submissions")
      return "Assignments"
    if (target === "quizzes" || target === "tests" || target === "assessments")
      return "Quizzes"
    if (
      target === "grades" ||
      target === "performance" ||
      target === "gpa" ||
      target === "my-progress" ||
      target === "my progress"
    )
      return "Grades"
    if (
      target === "communication" ||
      target === "communications" ||
      target === "speech" ||
      target === "verbal"
    )
      return "Communication"
    if (
      target === "discussions" ||
      target === "discussion" ||
      target === "forum" ||
      target === "study-groups" ||
      target === "study groups"
    )
      return "Discussions"
    if (target === "my-notes" || target === "notes" || target === "my notes")
      return "My Notes"
    if (target === "certificates") return "Certificates"
    if (
      target === "events" ||
      target === "notices" ||
      target === "events & notices" ||
      target === "events-and-notices"
    )
      return "Events & Notices"
    if (target === "announcements") return "Announcements"
    if (target === "community") return "Community"
    if (
      target === "mentor-details" ||
      target === "mentor" ||
      target === "mentor details" ||
      target === "advisor" ||
      target === "faculty"
    )
      return "Mentor Details"
    if (target === "profile") return "Profile"
    if (target === "settings") return "Settings"
    if (
      target === "support-help" ||
      target === "support-and-help" ||
      target === "support & help" ||
      target === "help-and-support" ||
      target === "help-support" ||
      target === "support" ||
      target === "tickets" ||
      target === "ticket" ||
      target === "help-center" ||
      target === "help center" ||
      target === "help" ||
      target === "faq" ||
      target === "faqs"
    )
      return "Support & Help"
    if (target === "dashboard" || target === "home") return "Dashboard"
  } catch {
    // fallback
  }
  return "Dashboard"
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
  const [activeTab, setActiveTabState] = useState<StudentNavPage>(() =>
    parseInitialTab(),
  )
  const [selectedCourseId, setSelectedCourseId] = useState<string>("c-1")
  const [courses, setCourses] = useState<CourseItem[]>(initialStudentCourses)
  const [catalog, setCatalog] = useState<CourseItem[]>(catalogCourses)
  const [assignments, setAssignments] = useState<AssignmentData[]>(
    initialAssignmentsList,
  )
  const [quizzes, setQuizzes] = useState<QuizData[]>(initialQuizzesList)
  const [quizAttempts, setQuizAttempts] = useState<Record<string, AssessmentAttempt>>(() => {
    try {
      const saved = localStorage.getItem("quantum_student_quiz_attempts")
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...initialQuizAttempts, ...parsed }
      }
    } catch {
      // ignore
    }
    return initialQuizAttempts
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Navigate helper that updates URL history cleanly
  const navigateTo = useCallback(
    (page: StudentNavPage, courseId?: string) => {
      setActiveTabState(page)
      if (courseId) {
        setSelectedCourseId(courseId)
      }
      setIsMobileMenuOpen(false)

      // Sync URL query without page reload
      if (typeof window !== "undefined") {
        try {
          const slug = page
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace("&", "and")
          const url = new URL(window.location.href)
          url.searchParams.set("page", slug)
          window.history.pushState(null, "", url.toString())
        } catch {
          // ignore
        }
      }
    },
    [],
  )

  // Sync route on popstate (browser back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      setActiveTabState(parseInitialTab())
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // Enroll in new catalog course
  const handleEnrollCourse = (newCourse: CourseItem) => {
    const enrolledItem: CourseItem = {
      ...newCourse,
      status: "In Progress",
      progress: 0,
      completedModules: 0,
      lastWatched: "Module 1 · Orientation",
    }
    setCourses((prev) => [enrolledItem, ...prev])
    setCatalog((prev) => prev.filter((c) => c.id !== newCourse.id))
    setSelectedCourseId(enrolledItem.id)
    onToast(`Enrolled in "${newCourse.title}" successfully! 🎉`)
    navigateTo("Course Details", enrolledItem.id)
  }

  // Submit assignment
  const handleSubmitAssignment = (
    id: string,
    repoUrl: string,
    comments: string,
  ) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return {
            ...a,
            status: "Submitted",
            submissionDate: "Just now",
            repoUrl: repoUrl || undefined,
            comments: comments || undefined,
            uploadedFileName: "solution_srimanth_assignment.zip (4.8 MB)",
          }
        }
        return a
      }),
    )
  }

  // Complete quiz
  const handleCompleteQuiz = (
    id: string,
    scoreStr: string,
    pct: number,
    attemptData?: AssessmentAttempt,
  ) => {
    setQuizzes((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          return {
            ...q,
            status: "Completed",
            score: scoreStr,
            pct,
            latestAttemptId: attemptData?.id || q.latestAttemptId,
            attemptsUsed: (q.attemptsUsed || 0) + 1,
          }
        }
        return q
      }),
    )
    if (attemptData) {
      setQuizAttempts((prev) => {
        const updated = {
          ...prev,
          [attemptData.id]: attemptData,
          [id]: attemptData,
        }
        try {
          localStorage.setItem(
            "quantum_student_quiz_attempts",
            JSON.stringify(updated),
          )
        } catch {
          // ignore
        }
        return updated
      })
    }
  }

  return (
    <div
      className="dashboard-shell student-dashboard-shell relative w-full max-w-full min-w-0 box-border h-screen max-h-screen overflow-hidden"
      style={{
        backgroundColor: hexColor,
        backgroundImage: isLightBg
          ? "linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px)"
          : "linear-gradient(rgba(255, 255, 255, 0.19) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.19) 1px, transparent 1px)",
      }}
    >
      {/* Mobile Drawer Toggle */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center text-zinc-800 border border-zinc-200 cursor-pointer"
          aria-label="Toggle navigation drawer"
        >
          <span className="text-base font-bold">
            {isMobileMenuOpen ? "✕" : "☰"}
          </span>
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Student Persistent Sidebar (Hidden on small screens unless drawer is open) */}
      <div
        className={`lg:block ${
          isMobileMenuOpen
            ? "fixed inset-y-0 left-0 z-50 w-64 shadow-2xl block animate-in slide-in-from-left"
            : "hidden lg:block h-full min-h-0"
        }`}
      >
        <StudentSidebar
          activeTab={activeTab}
          setActiveTab={(tab) => navigateTo(tab)}
          onOpenAiModal={onOpenAiModal}
          onSwitchToTeacher={onSwitchToTeacher}
          onLogout={onLogout}
        />
      </div>

      {/* Main Student Content Viewport */}
      <main className="dashboard-content w-full max-w-full min-w-0 h-full min-h-0 flex flex-col overflow-hidden box-border">
        {activeTab === "Dashboard" ? (
          <StudentDashboardPage
            onNavigate={navigateTo}
            onOpenAiModal={onOpenAiModal}
            onSwitchToTeacher={onSwitchToTeacher}
            onToast={onToast}
            hexColor={hexColor}
            onChangeHexColor={onChangeHexColor}
            courses={courses}
            assignments={assignments}
            quizzes={quizzes}
          />
        ) : (
          <StudentOtherPage
            page={activeTab}
            onNavigate={navigateTo}
            onToast={onToast}
            onSwitchToTeacher={onSwitchToTeacher}
            onLogout={onLogout}
            hexColor={hexColor}
            onChangeHexColor={onChangeHexColor}
            onOpenAiModal={onOpenAiModal}
            selectedCourseId={selectedCourseId}
            onSelectCourse={setSelectedCourseId}
            courses={courses}
            catalog={catalog}
            onEnrollCourse={handleEnrollCourse}
            assignments={assignments}
            onSubmitAssignment={handleSubmitAssignment}
            quizzes={quizzes}
            onCompleteQuiz={handleCompleteQuiz}
            quizAttempts={quizAttempts}
          />
        )}
      </main>
    </div>
  )
}
