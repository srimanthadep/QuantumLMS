import { useState, useEffect, useCallback, lazy, Suspense } from "react"
import AppShell from "@/components/shell/AppShell"
import PageTransition from "@/components/motion/PageTransition"
import type {
  StudentNavPage,
  CourseItem,
  AssignmentData,
  QuizData,
  AssessmentAttempt,
} from "./studentTypes"
import StudentDashboardPage from "./StudentDashboardPage"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
const MyCoursesPage = lazy(() => import("./MyCoursesPage"))
const CourseDetailsPage = lazy(() => import("./CourseDetailsPage"))
const SchedulePage = lazy(() => import("./SchedulePage"))
const AssessmentsPage = lazy(() => import("./AssessmentsPage"))
const GradesPage = lazy(() => import("./GradesPage"))
const CommunityPage = lazy(() => import("./CommunityPage"))
const CareerHubPage = lazy(() => import("./CareerHubPage"))
const StudentSettingsPage = lazy(() => import("./StudentSettingsPage"))
const SupportHelpPage = lazy(() => import("./SupportHelpPage"))
const MyNotesPage = lazy(() => import("./MyNotesPage"))
import {
  initialStudentCourses,
  catalogCourses,
  initialAssignmentsList,
  initialQuizzesList,
  initialQuizAttempts,
} from "./studentMockData"

/** Shell nav id -> student page. */
const NAV_TO_PAGE: Record<string, StudentNavPage> = {
  dashboard: "Dashboard",
  courses: "My Courses",
  schedule: "Schedule",
  assessments: "Assessments",
  grades: "Grades & Certificates",
  notes: "My Notes",
  community: "Community",
  career: "Career Hub",
  support: "Support & Help",
  settings: "Settings",
}

function navIdFor(page: StudentNavPage): string {
  switch (page) {
    case "My Courses":
    case "Course Details":
      return "courses"
    case "Schedule":
    case "Timetable":
    case "Attendance":
      return "schedule"
    case "Assessments":
    case "Assignments":
    case "Quizzes":
      return "assessments"
    case "Grades & Certificates":
    case "Grades":
    case "Certificates":
      return "grades"
    case "My Notes":
      return "notes"
    case "Community":
    case "Communication":
    case "Discussions":
      return "community"
    case "Career Hub":
    case "Mock Interview":
    case "Resume Building":
    case "Mentor Details":
      return "career"
    case "Support & Help":
    case "Support":
    case "Help Center":
      return "support"
    case "Settings":
    case "Profile":
      return "settings"
    default:
      return "dashboard"
  }
}

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
  onLogout: () => void
  onToast: (msg: string) => void
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

export default function StudentPortal({ onOpenAiModal, onLogout, onToast }: StudentPortalProps) {
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
  // Navigate helper that updates URL history cleanly
  const navigateTo = useCallback(
    (page: StudentNavPage, courseId?: string) => {
      setActiveTabState(page)
      if (courseId) {
        setSelectedCourseId(courseId)
      }
      document.getElementById("main")?.scrollTo({ top: 0 })

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

  const renderPage = () => {
    switch (activeTab) {
      case "My Courses":
        return (
          <MyCoursesPage
            onNavigate={navigateTo}
            onToast={onToast}
            onSelectCourse={setSelectedCourseId}
            onEnrollCourse={handleEnrollCourse}
            courses={courses}
            catalog={catalog}
          />
        )
      case "Course Details":
        return (
          <CourseDetailsPage
            selectedCourseId={selectedCourseId}
            courses={[...courses, ...catalog]}
            onSelectCourse={(id) => navigateTo("Course Details", id)}
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
        )
      case "Schedule":
      case "Timetable":
      case "Attendance":
      case "Events & Notices":
      case "Announcements":
        return (
          <SchedulePage
            onToast={onToast}
            initialTab={
              activeTab === "Attendance" ? "attendance" : activeTab === "Events & Notices" ? "events" : activeTab === "Announcements" ? "announcements" : "timetable"
            }
          />
        )
      case "Assessments":
      case "Assignments":
      case "Quizzes":
        return (
          <AssessmentsPage
            assignments={assignments}
            onSubmitAssignment={handleSubmitAssignment}
            quizzes={quizzes}
            onCompleteQuiz={handleCompleteQuiz}
            quizAttempts={quizAttempts}
            onToast={onToast}
            initialTab={activeTab === "Quizzes" ? "quizzes" : "assignments"}
          />
        )
      case "Grades & Certificates":
      case "Grades":
      case "Certificates":
        return <GradesPage onToast={onToast} onNavigate={navigateTo} initialView={activeTab === "Certificates" ? "certificates" : "grades"} />
      case "Community":
      case "Communication":
      case "Discussions":
        return <CommunityPage onToast={onToast} />
      case "Career Hub":
      case "Mock Interview":
      case "Resume Building":
      case "Mentor Details":
        return (
          <CareerHubPage
            onToast={onToast}
            onNavigate={navigateTo}
            onOpenAiModal={onOpenAiModal}
            initialTab={activeTab === "Resume Building" ? "resume" : activeTab === "Mentor Details" ? "mentorship" : "interviews"}
          />
        )
      case "Settings":
      case "Profile":
        return <StudentSettingsPage onToast={onToast} onNavigate={navigateTo} onLogout={onLogout} initialTab="profile" />
      case "Support & Help":
      case "Support":
      case "Help Center":
        return <SupportHelpPage onToast={onToast} onOpenAiModal={onOpenAiModal} onNavigate={navigateTo} />
      case "My Notes":
        return <MyNotesPage onToast={onToast} />
      default:
        return <StudentDashboardPage onNavigate={navigateTo} onToast={onToast} courses={courses} assignments={assignments} quizzes={quizzes} />
    }
  }

  return (
    <AppShell role="Student" activeId={navIdFor(activeTab)} onNavigate={(id) => navigateTo(NAV_TO_PAGE[id] ?? "Dashboard")}>
      <PageTransition transitionKey={activeTab === "Course Details" ? `course-${selectedCourseId}` : activeTab} className="w-full">
        <Suspense fallback={<StudentPageFallback />}>{renderPage()}</Suspense>
      </PageTransition>
    </AppShell>
  )
}
