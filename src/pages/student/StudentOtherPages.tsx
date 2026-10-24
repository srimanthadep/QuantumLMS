import { useState } from "react"
import { Icon } from "../../components/Icon"
import { HexColorField } from "../../components/HexColorField"
import type {
  StudentNavPage,
  CourseItem,
  AssignmentData,
  QuizData,
  AssessmentAttempt,
} from "./studentTypes"
import { MyCoursesPage } from "./MyCoursesPage"
import { CourseDetailsPage } from "./CourseDetailsPage"
import { TimetablePage } from "./TimetablePage"
import { AttendancePage } from "./AttendancePage"
import { AssignmentsPage } from "./AssignmentsPage"
import { QuizzesPage } from "./QuizzesPage"
import { GradesPage } from "./GradesPage"
import { EventsPage } from "./EventsPage"
import { AnnouncementsPage } from "./AnnouncementsPage"
import { StudentProfilePage } from "./StudentProfilePage"
import { StudentSettingsPage } from "./StudentSettingsPage"
import { MentorDetailsPage } from "./MentorDetailsPage"
import { SupportHelpPage } from "./SupportHelpPage"
import { MyNotesPage } from "./MyNotesPage"
import { CertificatesPage } from "./CertificatesPage"
import { CommunityPage } from "./CommunityPage"
import { StudentCommunicationPage } from "./StudentCommunicationPage"
import { StudentDiscussionsPage } from "./StudentDiscussionsPage"

interface StudentPageProps {
  page: StudentNavPage
  onNavigate: (page: StudentNavPage, courseId?: string) => void
  onToast: (msg: string) => void
  onSwitchToTeacher: () => void
  onLogout: () => void
  hexColor: string
  onChangeHexColor: (c: string) => void
  onOpenAiModal: () => void
  selectedCourseId: string
  onSelectCourse: (id: string) => void
  courses: CourseItem[]
  catalog: CourseItem[]
  onEnrollCourse: (course: CourseItem) => void
  assignments: AssignmentData[]
  onSubmitAssignment: (id: string, repoUrl: string, comments: string) => void
  quizzes: QuizData[]
  onCompleteQuiz: (
    id: string,
    scoreStr: string,
    pct: number,
    attemptData?: AssessmentAttempt,
  ) => void
  quizAttempts?: Record<string, AssessmentAttempt>
}

export function StudentOtherPage({
  page,
  onNavigate,
  onToast,
  onSwitchToTeacher,
  onLogout,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  selectedCourseId,
  onSelectCourse,
  courses,
  catalog,
  onEnrollCourse,
  assignments,
  onSubmitAssignment,
  quizzes,
  onCompleteQuiz,
  quizAttempts,
}: StudentPageProps) {
  const [headerSearch, setHeaderSearch] = useState("")

  const getSub = () => {
    switch (page) {
      case "My Courses":
        return "Continue ongoing coursework, review syllabus progress, and explore catalogs."
      case "Course Details":
        return "Full module curriculum, video lectures, downloadable lab code, and course Q&A."
      case "Timetable":
        return "Daily and weekly lecture periods, laboratory schedules, and live streams."
      case "Attendance":
        return "Semester regularity percentage, subject-wise attendance logs, and leave requests."
      case "Assignments":
        return "Upload GitHub code solutions, check upcoming deadlines, and inspect grading rubrics."
      case "Quizzes":
        return "Timed multiple-choice tests, conceptual evaluations, and quiz scores."
      case "Grades":
        return "Cumulative GPA performance, official semester gradebooks, and transcript downloads."
      case "Communication":
        return "Structured verbal communication assessments, interactive speaking drills, and faculty feedback analytics."
      case "Discussions":
        return "Course discussions, peer study circles, technical Q&A, and faculty answers."
      case "My Notes":
        return "Lecture annotations, mathematical formulas, and executable code snippets."
      case "Certificates":
        return "Verified diplomas, graduation credentials, and specializations."
      case "Events & Notices":
        return "Join upcoming AI hackathons, research seminars, and student colloquiums."
      case "Announcements":
        return "Dispatches and important updates from course faculty and the Dean of Academic Affairs."
      case "Community":
        return "Student discussion threads, hackathon team squads, and study circles."
      case "Mentor Details":
        return "Assigned faculty advisor, office hours booking, research profile, and cohort supervision."
      case "Profile":
        return "Student identity, academic standing, verified credentials, and emergency contact details."
      case "Settings":
        return "Account preferences, notification alerts, two-factor authentication, and canvas theme color."
      case "Support & Help":
      case "Support":
      case "Help Center":
        return "Knowledge base tutorials, portal handbook FAQs, campus assistance, and support ticket tracking."
      default:
        return "Quantum School of AI Student Workspace"
    }
  }

  return (
    <div className="student-dashboard-content w-full max-w-full min-w-0 h-full min-h-0 flex flex-col overflow-hidden box-border">
      {/* Shared Dashboard Header - Stationary */}
      <header className="dashboard-header shrink-0 h-auto min-h-[54px] flex flex-wrap xl:flex-nowrap items-center justify-between gap-3 mb-3 w-full max-w-full min-w-0 box-border pl-12 lg:pl-0">
        <div className="min-w-0 py-0.5">
          <div className="greeting">
            <span>{page}</span>
          </div>
          <div className="subtitle text-xs text-white/90 leading-tight">
            {getSub()}
          </div>
        </div>

        <div className="header-actions flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <div className="search-box shrink-0">
            <Icon name="search" size={15} />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder={`Search in ${page.toLowerCase()}...`}
              aria-label={`Search ${page}`}
            />
            {headerSearch && (
              <button
                onClick={() => setHeaderSearch("")}
                className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1"
              >
                ×
              </button>
            )}
          </div>

          <button
            onClick={onSwitchToTeacher}
            className="px-3 h-[35px] rounded-full bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-purple-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Switch to Teacher View"
          >
            <span>👨‍🏫 Teacher Portal</span>
          </button>

          <div className="shrink-0">
            <HexColorField hexColor={hexColor} onChangeHex={onChangeHexColor} />
          </div>

          <button
            className="ask-ai shrink-0"
            onClick={onOpenAiModal}
            aria-label="Ask AI Assistant"
          >
            <span>✦</span>
            Ask AI
          </button>
        </div>
      </header>

      {/* Main Page Viewport Switcher - Independently Scrollable Body */}
      <div className="student-scroll-viewport flex-1 min-h-0 w-full max-w-full overflow-y-auto pr-1 pb-12 box-border">
        {page === "My Courses" && (
          <MyCoursesPage
            courses={courses}
            catalog={catalog}
            onSelectCourse={onSelectCourse}
            onNavigate={onNavigate}
            onToast={onToast}
            onEnrollCourse={onEnrollCourse}
          />
        )}

        {page === "Course Details" && (
          <CourseDetailsPage
            selectedCourseId={selectedCourseId}
            courses={[...courses, ...catalog]}
            onSelectCourse={onSelectCourse}
            onBackToCourses={() => onNavigate("My Courses")}
            onNavigate={onNavigate}
            onToast={onToast}
            onOpenAiModal={onOpenAiModal}
            onEnrollCourse={onEnrollCourse}
            assignments={assignments}
            onSubmitAssignment={onSubmitAssignment}
            quizzes={quizzes}
            onCompleteQuiz={onCompleteQuiz}
            quizAttempts={quizAttempts}
          />
        )}

        {page === "Timetable" && <TimetablePage onToast={onToast} />}

        {page === "Attendance" && <AttendancePage onToast={onToast} />}

        {page === "Assignments" && (
          <AssignmentsPage
            assignments={assignments}
            onSubmitAssignment={onSubmitAssignment}
            onToast={onToast}
          />
        )}

        {page === "Quizzes" && (
          <QuizzesPage
            quizzes={quizzes}
            onCompleteQuiz={onCompleteQuiz}
            onToast={onToast}
            quizAttempts={quizAttempts}
          />
        )}

        {page === "Grades" && <GradesPage onToast={onToast} />}

        {page === "Communication" && (
          <StudentCommunicationPage
            onToast={onToast}
            onNavigate={onNavigate}
            onOpenAiModal={onOpenAiModal}
          />
        )}

        {page === "Discussions" && (
          <StudentDiscussionsPage
            onToast={onToast}
            onNavigate={onNavigate}
            onOpenAiModal={onOpenAiModal}
          />
        )}

        {page === "Mentor Details" && (
          <MentorDetailsPage
            onToast={onToast}
            onNavigate={onNavigate}
            onOpenAiModal={onOpenAiModal}
          />
        )}

        {page === "My Notes" && <MyNotesPage onToast={onToast} />}

        {page === "Certificates" && <CertificatesPage onToast={onToast} />}

        {page === "Events & Notices" && <EventsPage onToast={onToast} />}

        {page === "Announcements" && <AnnouncementsPage onToast={onToast} />}

        {page === "Community" && <CommunityPage onToast={onToast} />}

        {page === "Profile" && (
          <StudentProfilePage
            onToast={onToast}
            onNavigate={onNavigate}
            onLogout={onLogout}
          />
        )}

        {page === "Settings" && (
          <StudentSettingsPage
            onToast={onToast}
            onNavigate={onNavigate}
            onLogout={onLogout}
            hexColor={hexColor}
            onChangeHexColor={onChangeHexColor}
          />
        )}

        {(page === "Support & Help" ||
          page === "Support" ||
          page === "Help Center") && (
          <SupportHelpPage
            onToast={onToast}
            onOpenAiModal={onOpenAiModal}
            onNavigate={onNavigate}
            initialSection={page === "Help Center" ? "help" : "tickets"}
          />
        )}
      </div>
    </div>
  )
}
