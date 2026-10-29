import React, { useState, useEffect, useCallback, lazy, Suspense } from "react"
import { AppSidebar } from "../../components/Sidebar"
import { StudentHeader } from "../../components/StudentHeader"
import type {
  StudentNavPage,
  CourseItem,
  AssignmentData,
  QuizData,
  AssessmentAttempt,
} from "./studentTypes"
import StudentDashboardPage from "./StudentDashboardPage"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
const MyCoursesPage = lazy(() => import("./MyCoursesPage").then((m) => ({ default: m.MyCoursesPage })))
const CourseDetailsPage = lazy(() => import("./CourseDetailsPage").then((m) => ({ default: m.CourseDetailsPage })))
const TimetablePage = lazy(() => import("./TimetablePage").then((m) => ({ default: m.TimetablePage })))
const AttendancePage = lazy(() => import("./AttendancePage").then((m) => ({ default: m.AttendancePage })))
const AssignmentsPage = lazy(() => import("./AssignmentsPage").then((m) => ({ default: m.AssignmentsPage })))
const GradesPage = lazy(() => import("./GradesPage").then((m) => ({ default: m.GradesPage })))
const CommunityPage = lazy(() => import("./CommunityPage").then((m) => ({ default: m.CommunityPage })))
const CareerHubPage = lazy(() => import("./CareerHubPage").then((m) => ({ default: m.CareerHubPage })))
const StudentSettingsPage = lazy(() => import("./StudentSettingsPage").then((m) => ({ default: m.StudentSettingsPage })))
const SupportHelpPage = lazy(() => import("./SupportHelpPage").then((m) => ({ default: m.SupportHelpPage })))
const MyNotesPage = lazy(() => import("./MyNotesPage").then((m) => ({ default: m.MyNotesPage })))
import {
  initialStudentCourses,
  catalogCourses,
  initialAssignmentsList,
  initialQuizzesList,
  initialQuizAttempts,
} from "./studentMockData"

function StudentPageFallback() {
  return (
    <div className="mt-4 space-y-4" role="status" aria-label="Loading">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <SkeletonText lines={4} />
    </div>
  )
}

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
      target === "live classes" ||
      target === "events" ||
      target === "announcements"
    )
      return "Schedule"
    if (target === "attendance") return "Attendance"
    if (
      target === "my-courses" ||
      target === "courses" ||
      target === "my courses" ||
      target === "my-learning" ||
      target === "explore-courses"
    )
      return "My Courses"
    if (
      target === "course-details" ||
      target === "course details" ||
      target === "materials"
    )
      return "Course Details"
    if (
      target === "assessments" ||
      target === "assignments" ||
      target === "quizzes" ||
      target === "tests" ||
      target === "submissions"
    )
      return "Assessments"
    if (
      target === "grades-and-certificates" ||
      target === "grades" ||
      target === "certificates" ||
      target === "credentials" ||
      target === "gpa"
    )
      return "Grades & Certificates"
    if (
      target === "community" ||
      target === "communication" ||
      target === "discussions" ||
      target === "forums" ||
      target === "study-groups"
    )
      return "Community"
    if (
      target === "career-hub" ||
      target === "career hub" ||
      target === "career" ||
      target === "mock-interview" ||
      target === "mock interview" ||
      target === "resume-building" ||
      target === "resume" ||
      target === "mentor-details" ||
      target === "mentor"
    )
      return "Career Hub"
    if (target === "my-notes" || target === "notes") return "My Notes"
    if (target === "profile") return "Profile"
    if (target === "settings") return "Settings"
    if (
      target === "support-help" ||
      target === "support & help" ||
      target === "support" ||
      target === "help" ||
      target === "help-center"
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
  const [headerSearch, setHeaderSearch] = useState("")

  // Navigate helper that updates URL history cleanly
  const navigateTo = useCallback(
    (page: StudentNavPage, courseId?: string) => {
      setActiveTabState(page)
      if (courseId) {
        setSelectedCourseId(courseId)
      }
      setIsMobileMenuOpen(false)

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

  useEffect(() => {
    const handlePopState = () => {
      setActiveTabState(parseInitialTab())
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

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
    onToast("Assignment submitted successfully for evaluation! 🚀")
  }

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

  const getSubHeader = () => {
    switch (activeTab) {
      case "My Courses":
        return "Continue ongoing coursework, review syllabus progress, and explore catalogs."
      case "Course Details":
        return "Full module curriculum, video lectures, downloadable lab code, and course Q&A."
      case "Schedule":
      case "Timetable":
        return "Daily and weekly lecture periods, campus events, and academic bulletins."
      case "Attendance":
        return "Semester regularity percentage, subject-wise attendance logs, and leave requests."
      case "Assessments":
      case "Assignments":
      case "Quizzes":
        return "Upload GitHub code solutions, timed quiz evaluations, and grading rubrics."
      case "Grades & Certificates":
      case "Grades":
      case "Certificates":
        return "Cumulative GPA performance, official semester gradebooks, and verifiable credentials."
      case "Community":
      case "Communication":
      case "Discussions":
        return "Squad study channels, course discussions, technical Q&A, and speech verbal lab."
      case "Career Hub":
      case "Mock Interview":
      case "Resume Building":
      case "Mentor Details":
        return "AI-driven interview practice, ATS-compliant resume builder, and 1:1 faculty meetings."
      case "My Notes":
        return "Lecture annotations, mathematical formulas, and executable code snippets."
      case "Profile":
      case "Settings":
        return "Student identity credentials, theme preferences, and security passwords."
      case "Support & Help":
      case "Support":
        return "Help desk ticketing, live faculty support, and frequently asked questions."
      default:
        return "Academic progress, active classes, upcoming tasks, and quick actions."
    }
  }

  return (
    <div
      className="dashboard-shell student-dashboard-shell relative w-full max-w-full min-w-0 box-border h-screen max-h-screen overflow-hidden flex"
      style={{
        backgroundColor: hexColor,
      }}
    >
      {/* Mobile Drawer Toggle */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-10 h-10 rounded-full bg-surface/90 backdrop-blur shadow-md flex items-center justify-center text-zinc-800 border border-zinc-200 cursor-pointer"
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

      {/* Unified AppSidebar for Student Portal */}
      <div
        className={`lg:block shrink-0 ${
          isMobileMenuOpen
            ? "fixed inset-y-0 left-0 z-50 shadow-2xl block animate-in slide-in-from-left"
            : "hidden lg:block h-full min-h-0"
        }`}
      >
        <AppSidebar
          role="Student"
          activeItem={activeTab}
          onNavigate={(id) => navigateTo(id)}
          onOpenAiModal={onOpenAiModal}
          onSwitchRole={(r) => {
            if (r === "Teacher") onSwitchToTeacher()
          }}
          onLogout={onLogout}
        />
      </div>

      {/* Main Student Content Viewport */}
      <main className="dashboard-content flex-1 w-full max-w-full min-w-0 h-full min-h-0 flex flex-col overflow-hidden box-border bg-slate-50/60">
        {activeTab === "Dashboard" ? (
          <StudentDashboardPage
            onNavigate={navigateTo}
            onOpenAiModal={onOpenAiModal}
            onSwitchToTeacher={onSwitchToTeacher}
            onLogout={onLogout}
            onToast={onToast}
            hexColor={hexColor}
            onChangeHexColor={onChangeHexColor}
            courses={courses}
            assignments={assignments}
            quizzes={quizzes}
          />
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto px-4 md:px-6 py-4 md:py-6 max-w-7xl mx-auto w-full">
            {/* Standard Header Banner */}
            <StudentHeader
              title={
                activeTab === "Schedule"
                  ? "Schedule & Timetable"
                  : activeTab === "Assessments"
                  ? "Assessments & Quizzes"
                  : activeTab === "Grades & Certificates"
                  ? "Grades & Certificates"
                  : activeTab === "Career Hub"
                  ? "Career Hub"
                  : activeTab
              }
              subtitle={getSubHeader()}
              onOpenAiModal={onOpenAiModal}
              onSwitchToTeacher={onSwitchToTeacher}
              onLogout={onLogout}
              hexColor={hexColor}
              onChangeHexColor={onChangeHexColor}
              onNavigate={navigateTo}
              searchQuery={headerSearch}
              onSearchChange={setHeaderSearch}
            />

            {/* Direct Page Router without proxy */}
            <Suspense fallback={<StudentPageFallback />}>
            <div className="mt-4 flex-1 min-h-0">
              {activeTab === "My Courses" && (
                <MyCoursesPage
                  onNavigate={navigateTo}
                  onToast={onToast}
                  onSelectCourse={setSelectedCourseId}
                  onEnrollCourse={handleEnrollCourse}
                  courses={courses}
                  catalog={catalog}
                />
              )}

              {activeTab === "Course Details" && (
                <CourseDetailsPage
                  selectedCourseId={selectedCourseId}
                  courses={[...courses, ...catalog]}
                  onSelectCourse={setSelectedCourseId}
                  onBackToCourses={() => navigateTo("My Courses")}
                  onNavigate={navigateTo}
                  onToast={onToast}
                  onOpenAiModal={onOpenAiModal}
                  onEnrollCourse={handleEnrollCourse}
                  assignments={assignments}
                  onSubmitAssignment={handleSubmitAssignment}
                  quizzes={quizzes}
                  onCompleteQuiz={handleCompleteQuiz}
                  quizAttempts={quizAttempts}
                />
              )}

              {(activeTab === "Schedule" || activeTab === "Timetable") && (
                <TimetablePage onToast={onToast} />
              )}

              {activeTab === "Attendance" && (
                <AttendancePage onToast={onToast} />
              )}

              {(activeTab === "Assessments" || activeTab === "Assignments" || activeTab === "Quizzes") && (
                <AssignmentsPage
                  assignments={assignments}
                  onSubmitAssignment={handleSubmitAssignment}
                  quizzes={quizzes}
                  onCompleteQuiz={handleCompleteQuiz}
                  quizAttempts={quizAttempts}
                  onToast={onToast}
                  initialTab={activeTab === "Quizzes" ? "quizzes" : "assignments"}
                />
              )}

              {(activeTab === "Grades & Certificates" || activeTab === "Grades" || activeTab === "Certificates") && (
                <GradesPage
                  onToast={onToast}
                  initialView={activeTab === "Certificates" ? "certificates" : "grades"}
                />
              )}

              {(activeTab === "Community" || activeTab === "Communication" || activeTab === "Discussions") && (
                <CommunityPage
                  onToast={onToast}
                  initialTab={
                    activeTab === "Communication"
                      ? "speech"
                      : activeTab === "Discussions"
                      ? "discussions"
                      : "squads"
                  }
                />
              )}

              {(activeTab === "Career Hub" || activeTab === "Mock Interview" || activeTab === "Resume Building" || activeTab === "Mentor Details") && (
                <CareerHubPage
                  onToast={onToast}
                  onNavigate={navigateTo}
                  onOpenAiModal={onOpenAiModal}
                  initialTab={
                    activeTab === "Resume Building"
                      ? "resume"
                      : activeTab === "Mentor Details"
                      ? "mentorship"
                      : "interviews"
                  }
                />
              )}

              {(activeTab === "Settings" || activeTab === "Profile") && (
                <StudentSettingsPage
                  onToast={onToast}
                  onNavigate={navigateTo}
                  onLogout={onLogout}
                  hexColor={hexColor}
                  onChangeHexColor={onChangeHexColor}
                  initialTab={activeTab === "Profile" ? "profile" : "appearance"}
                />
              )}

              {(activeTab === "Support & Help" || activeTab === "Support" || activeTab === "Help Center") && (
                <SupportHelpPage onToast={onToast} onOpenAiModal={onOpenAiModal} onNavigate={navigateTo} />
              )}

              {activeTab === "My Notes" && (
                <MyNotesPage onToast={onToast} />
              )}
            </div>
            </Suspense>
          </div>
        )}
      </main>
    </div>
  )
}
