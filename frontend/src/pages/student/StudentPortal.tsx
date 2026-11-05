import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react"
import AppShell from "@/components/shell/AppShell"
import type { NotificationSource, ShellNotification } from "@/components/shell/NotificationsMenu"
import PageTransition from "@/components/motion/PageTransition"
import { useToast } from "@/components/ui/toast"
import type { StudentNavPage, CourseItem } from "./studentTypes"
import StudentDashboardPage from "./StudentDashboardPage"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import StudentDataProvider, { useStudentData } from "./data/StudentDataProvider"
import type { SubmissionInput } from "./data/actions"
import { relTime } from "./studentUtils"
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
const LiveClassPage = lazy(() => import("./LiveClassPage"))

/** Notification links (set by the backend) -> student pages. */
const NOTIFICATION_PAGE: Record<string, StudentNavPage> = {
  announcements: "Announcements",
  support: "Support & Help",
  assessments: "Assessments",
  quizzes: "Quizzes",
  certificates: "Certificates",
  grades: "Grades",
  courses: "My Courses",
}

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
    case "Live Class":
    case "Live Classes":
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
      target === "live-class" ||
      target === "live-classes" ||
      target === "live class" ||
      target === "live classes" ||
      target === "live"
    )
      return "Live Class"
    if (
      target === "timetable" ||
      target === "schedule" ||
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
      target === "resume"
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

function courseFromUrl(): string | null {
  if (typeof window === "undefined") return null
  return new URLSearchParams(window.location.search).get("course")
}

/** Signs the student in and loads their data, then renders the portal. */
export default function StudentPortal(props: StudentPortalProps) {
  return (
    <StudentDataProvider>
      <StudentPortalBody {...props} />
    </StudentDataProvider>
  )
}

function StudentPortalBody({ onOpenAiModal, onLogout, onToast }: StudentPortalProps) {
  const data = useStudentData()
  const toast = useToast()
  const { courses, catalog, assignments, quizzes } = data.view
  const [activeTab, setActiveTabState] = useState<StudentNavPage>(() => parseInitialTab())
  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => courseFromUrl() ?? courses[0]?.id ?? catalog[0]?.id ?? "")

  // Navigate helper that updates URL history cleanly
  const navigateTo = useCallback((page: StudentNavPage, courseId?: string) => {
    setActiveTabState(page)
    if (courseId) setSelectedCourseId(courseId)
    document.getElementById("main")?.scrollTo({ top: 0 })
    try {
      const slug = page.toLowerCase().replace(/\s+/g, "-").replace("&", "and")
      const url = new URL(window.location.href)
      url.searchParams.set("page", slug)
      if (page === "Course Details" && courseId) url.searchParams.set("course", courseId)
      else if (page !== "Course Details") url.searchParams.delete("course")
      window.history.pushState(null, "", url.toString())
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setActiveTabState(parseInitialTab())
      const c = courseFromUrl()
      if (c) setSelectedCourseId(c)
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const handleEnrollCourse = async (course: CourseItem) => {
    try {
      await data.enroll(course)
      onToast(`Enrolled in "${course.title}". Your first lesson is ready.`)
      navigateTo("Course Details", course.id)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleSubmitAssignment = async (id: string, input: SubmissionInput) => {
    await data.submitAssignment(id, input)
    onToast("Assignment submitted for evaluation")
  }

  const { notifications: notificationRows, markNotificationRead, markAllNotificationsRead } = data
  const notifications = useMemo<NotificationSource>(
    () => ({
      items: notificationRows.map((n) => ({ id: n.id, title: n.title, message: n.message, timestamp: relTime(n.created_at, data.now), read: !!n.read_at, kind: n.kind as ShellNotification["kind"] })),
      onSelect: (n) => {
        markNotificationRead(n.id)
        const row = notificationRows.find((r) => r.id === n.id)
        const page = row?.link ? NOTIFICATION_PAGE[row.link] : undefined
        if (page) navigateTo(page)
      },
      onMarkAllRead: markAllNotificationsRead,
    }),
    [notificationRows, markNotificationRead, markAllNotificationsRead, navigateTo, data.now],
  )

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
          />
        )
      case "Live Class":
      case "Live Classes":
        return (
          <LiveClassPage
            onNavigate={navigateTo}
            onToast={onToast}
            onSubmitAssignment={handleSubmitAssignment}
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
            onNavigate={navigateTo}
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
        return (
          <CareerHubPage
            onToast={onToast}
            onNavigate={navigateTo}
            onOpenAiModal={onOpenAiModal}
            initialTab={activeTab === "Resume Building" ? "resume" : "interviews"}
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
    <AppShell role="Student" activeId={navIdFor(activeTab)} onNavigate={(id) => navigateTo(NAV_TO_PAGE[id] ?? "Dashboard")} notifications={notifications}>
      <PageTransition transitionKey={activeTab === "Course Details" ? `course-${selectedCourseId}` : activeTab} className="w-full">
        <Suspense fallback={<StudentPageFallback />}>{renderPage()}</Suspense>
      </PageTransition>
    </AppShell>
  )
}
