import { useState, useMemo, useEffect, type ReactNode } from "react"
import type {
  MetricItem,
  AssignmentItem,
  StudentItem,
  ReportItem,
  CourseItem,
  LiveSessionItem,
  StudentModuleSubmission,
} from "../../types"
import {
  initialCourses,
  initialLiveSessions,
  initialStudents,
  initialAssignments,
  initialReports,
  initialAttendanceRecords,
} from "../../data/mockData"
import { MODULE_ASSIGNMENTS } from "../../data/courseAssignmentsData"
import { Icon } from "../../components/Icon"
import { HexColorField } from "../../components/HexColorField"
import { MetricCard } from "../../components/MetricCard"

/**
 * Helper to safely navigate to any Teacher Portal tab by triggering
 * the corresponding navigation item in the sidebar/navigation list.
 */
function navigateToTeacherTab(tabName: string, fallbackAction?: () => void) {
  if (fallbackAction) {
    fallbackAction()
    return
  }
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button.nav-item, nav button")
  )
  const target = buttons.find((b) =>
    b.textContent?.trim().toLowerCase().includes(tabName.toLowerCase())
  )
  if (target) {
    target.click()
  }
}

export function DashboardHeader({
  searchQuery,
  setSearchQuery,
  onOpenAiModal,
  hexColor,
  onChangeHexColor,
  onSwitchToStudent,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenAiModal: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onSwitchToStudent?: () => void
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>Good morning, Srimanth</span>
          <span className="wave-emoji" role="img" aria-label="waving hand">
            👋
          </span>
        </div>
        <div className="subtitle">
          Year 4 Lead Educator · 4 Active Courses · 24 Students On Track
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses, students, topics..."
            aria-label="Search courses, students, topics"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1 cursor-pointer"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        {onSwitchToStudent && (
          <button
            className="px-3 h-[35px] rounded-full bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-purple-700 transition-colors cursor-pointer"
            onClick={onSwitchToStudent}
            aria-label="Switch to Student Portal"
          >
            <span>🎓 Student Portal</span>
          </button>
        )}
        <HexColorField hexColor={hexColor} onChangeHex={onChangeHexColor} />
        <button
          className="ask-ai cursor-pointer"
          onClick={onOpenAiModal}
          aria-label="Ask AI assistant"
        >
          <span>✦</span>
          Ask AI
        </button>
      </div>
    </header>
  )
}

function CardHeader({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="card-header">
      <div className="card-title">{title}</div>
      {action}
    </div>
  )
}

function StudentAvatarGroup() {
  return (
    <div className="avatar-group" aria-label="Student avatars">
      {[1, 2, 3, 4, 5].map((number) => (
        <img
          key={number}
          src={`/assets/student-${number}.png`}
          alt={`Student ${number}`}
        />
      ))}
      <div className="avatar-more">+19</div>
    </div>
  )
}

function ClassOverviewCard() {
  return (
    <section className="class-card" aria-label="Class Overview">
      <div className="class-heading">Year 4 – Maple Class</div>
      <div className="class-subtitle">
        24 students | English · Math · Science · AI
      </div>
      <span className="on-track">On track</span>
      <img
        className="hand-art"
        src="/assets/hand.png"
        alt=""
        aria-hidden="true"
      />
      <StudentAvatarGroup />
      <div className="class-progress">
        <span>Class progress</span>
        <strong>76%</strong>
        <div className="class-progress-track">
          <i style={{ width: "76%" }} />
        </div>
      </div>
    </section>
  )
}



/**
 * Assigned Courses Section
 * Displays the courses assigned to the teacher with progress, enrolled counts, and syllabus navigation.
 * Complies with strict rule: No course creation/upload buttons.
 */
function AssignedCoursesSection({
  courses,
  searchQuery,
  onSelectCourse,
  onViewAllCourses,
}: {
  courses: CourseItem[]
  searchQuery: string
  onSelectCourse: (c: CourseItem) => void
  onViewAllCourses: () => void
}) {
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses
    const q = searchQuery.toLowerCase()
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.assignedClass?.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    )
  }, [courses, searchQuery])

  return (
    <section className="panel p-5" aria-label="Assigned Courses">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="card-title text-base font-bold text-zinc-900">
              Assigned Courses
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              {courses.length} Active
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Curricula and cohorts currently assigned to your instruction
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onViewAllCourses}
            className="text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>View All in Curriculum</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-400 font-medium">
          No assigned courses match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredCourses.slice(0, 4).map((c) => (
            <div
              key={c.id}
              className="p-3.5 rounded-2xl border border-zinc-200/90 bg-zinc-50/50 hover:bg-white hover:border-purple-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={c.thumbnail || "/assets/course_genai.jpg"}
                      alt={c.name}
                      className="w-11 h-11 rounded-xl object-cover border border-zinc-200 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                          {c.code}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-medium">
                          {c.assignedClass || "Year 4 Cohort"}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-900 mt-0.5 group-hover:text-purple-900 transition-colors line-clamp-1">
                        {c.name}
                      </h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                    Active
                  </span>
                </div>

                <p className="text-[11px] text-zinc-600 line-clamp-2 mb-3 leading-relaxed">
                  {c.description}
                </p>

                {/* Progress & Stats */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-600 font-medium">
                      Syllabus Progress
                    </span>
                    <strong className="text-zinc-800 font-bold">
                      {c.progress || 76}%
                    </strong>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-300"
                      style={{ width: `${c.progress || 76}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-zinc-200/70 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-3 text-zinc-600 font-medium">
                  <span className="flex items-center gap-1">
                    <Icon name="users" size={12} />
                    {c.enrolledStudentsCount || 24} Enrolled
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="book" size={12} />
                    {c.modulesCount || 6} Modules
                  </span>
                </div>
                <button
                  onClick={() => onSelectCourse(c)}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>Go to Course</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Notice */}
      <div className="mt-3.5 px-3 py-2 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between text-[11px] text-purple-900">
        <div className="flex items-center gap-2">
          <span className="text-purple-600 font-bold">🔒 Institutional Governance:</span>
          <span>
            Curricula, lesson plans, and learning materials are authored and updated by School Administrators.
          </span>
        </div>
        <span className="text-[10px] text-purple-700 font-semibold bg-white px-2 py-0.5 rounded-full border border-purple-200">
          Verified Content
        </span>
      </div>
    </section>
  )
}

/**
 * Upcoming Classes Section
 * Displays scheduled live classes, studio sessions, and lecture details with Join/Studio triggers.
 */
function UpcomingClassesSection({
  sessions,
  onEnterStudio,
  onOpenCalendar,
}: {
  sessions: LiveSessionItem[]
  onEnterStudio: (s: LiveSessionItem) => void
  onOpenCalendar: () => void
}) {
  return (
    <section className="panel p-5" aria-label="Upcoming Classes">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="card-title text-base font-bold text-zinc-900">
              Upcoming Classes & Live Sessions
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
              1 Live Now
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Interactive sessions scheduled for your cohorts today & tomorrow
          </p>
        </div>
        <button
          onClick={onOpenCalendar}
          className="text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Open Full Calendar</span>
          <span>→</span>
        </button>
      </div>

      <div className="space-y-3">
        {sessions.slice(0, 3).map((ses) => {
          const isLive = ses.status === "Live Now"
          return (
            <div
              key={ses.id}
              className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isLive
                  ? "bg-purple-50/50 border-purple-300 shadow-xs"
                  : "bg-zinc-50/60 border-zinc-200/90 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isLive
                      ? "bg-red-500 text-white shadow-xs"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  <Icon name="video" size={18} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isLive
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {ses.status}
                    </span>
                    <span className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                      <Icon name="clock" size={12} />
                      {ses.startTime} - {ses.endTime} ({ses.durationMinutes}m)
                    </span>
                    <span className="text-[10px] text-zinc-600 font-medium">
                      · {ses.batchName}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-900 mt-1">
                    {ses.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-zinc-600">
                    <span className="font-semibold text-zinc-700">
                      {ses.courseName}
                    </span>
                    <span>·</span>
                    <span>{ses.enrolledCount} Students Enrolled</span>
                    <span>·</span>
                    <span className="text-purple-700 font-medium">
                      Platform: {ses.platform}
                    </span>
                  </div>
                  {ses.topicsCovered && ses.topicsCovered.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {ses.topicsCovered.slice(0, 3).map((topic, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-medium bg-white px-2 py-0.5 rounded-md border border-zinc-200 text-zinc-600"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:self-center shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEnterStudio(ses)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    isLive
                      ? "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200"
                      : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 border border-zinc-200"
                  }`}
                >
                  <Icon name="video" size={13} />
                  <span>{isLive ? "Enter Live Studio" : "View Session Room"}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * Recent Submissions & Reviews Section
 * Allows teacher to inspect submissions, grade them, and give feedback.
 */
function RecentSubmissionsSection({
  submissions,
  onReviewSubmission,
  onViewAllSubmissions,
}: {
  submissions: StudentModuleSubmission[]
  onReviewSubmission: (sub: StudentModuleSubmission) => void
  onViewAllSubmissions: () => void
}) {
  const [filter, setFilter] = useState<"All" | "Pending" | "Graded">("All")

  const filtered = useMemo(() => {
    if (filter === "All") return submissions
    if (filter === "Pending")
      return submissions.filter(
        (s) => s.status === "Submitted" || s.status === "Pending"
      )
    return submissions.filter((s) => s.status === "Graded")
  }, [submissions, filter])

  const pendingCount = submissions.filter(
    (s) => s.status === "Submitted" || s.status === "Pending"
  ).length

  return (
    <section className="panel p-5" aria-label="Recent Submissions">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="card-title text-base font-bold text-zinc-900">
              Recent Submissions & Reviews
            </h3>
            {pendingCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {pendingCount} Need Review
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Student work turned in for Year 4 AI & Mathematics assignments
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
          <button
            type="button"
            onClick={() => setFilter("All")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === "All"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            All ({submissions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("Pending")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === "Pending"
                ? "bg-white text-amber-700 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Needs Review ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("Graded")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === "Graded"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Graded ({submissions.length - pendingCount})
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {filtered.slice(0, 5).map((sub) => {
          const isPending =
            sub.status === "Submitted" || sub.status === "Pending"
          return (
            <div
              key={`${sub.studentId}-${sub.submittedAt}`}
              className="p-3 rounded-xl border border-zinc-200/90 bg-white hover:border-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={sub.studentAvatar || "/assets/student-1.png"}
                  alt={sub.studentName}
                  className="w-9 h-9 rounded-full object-cover border border-zinc-200 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-zinc-900 truncate">
                      {sub.studentName}
                    </strong>
                    <span className="text-[10px] text-zinc-600 font-medium">
                      {sub.studentRoll}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        isPending
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isPending ? "Needs Grading" : `Graded: ${sub.score}/100`}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-600 flex items-center gap-2 mt-0.5">
                    <span className="font-medium text-zinc-700 truncate">
                      Module 1 Assignment: AI Pattern Classifier
                    </span>
                    <span>·</span>
                    <span className="text-zinc-600 text-[10px] shrink-0">
                      {sub.submittedAt}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onReviewSubmission(sub)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isPending
                      ? "bg-purple-600 text-white hover:bg-purple-700 shadow-xs"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  <Icon name="document" size={13} />
                  <span>{isPending ? "Review & Grade" : "View Feedback"}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * Student Analytics Section
 * Authentic data derived from student roster metrics (Average, Attendance, Completion, Strengths)
 */
function StudentAnalyticsSection({
  students,
  onOpenAnalyticsTab,
  onSelectStudent,
}: {
  students: StudentItem[]
  onOpenAnalyticsTab: () => void
  onSelectStudent: (s: StudentItem) => void
}) {
  const stats = useMemo(() => {
    if (!students.length) {
      return { avgScore: 85, avgAttendance: 96, avgCompletion: 76 }
    }
    const scoreSum = students.reduce((acc, s) => acc + s.average, 0)
    const attSum = students.reduce((acc, s) => acc + s.attendance, 0)
    const compSum = students.reduce((acc, s) => acc + s.completion, 0)
    return {
      avgScore: Math.round(scoreSum / students.length),
      avgAttendance: Math.round(attSum / students.length),
      avgCompletion: Math.round(compSum / students.length),
    }
  }, [students])

  // Flag students with score under 75 as needing support
  const needsAttention = useMemo(() => {
    return students.filter((s) => s.average < 75).slice(0, 2)
  }, [students])

  // Top performers
  const topPerformers = useMemo(() => {
    return [...students].sort((a, b) => b.average - a.average).slice(0, 3)
  }, [students])

  return (
    <section className="panel p-5" aria-label="Student Analytics">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="card-title text-base font-bold text-zinc-900">
            Student Analytics & Class Standing
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time cohort performance derived from active Maple Class student profiles
          </p>
        </div>
        <button
          onClick={onOpenAnalyticsTab}
          className="text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Full Analytics Diagnostic</span>
          <span>→</span>
        </button>
      </div>

      {/* 3 Metric Badges */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100">
          <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
            Class Average
          </div>
          <div className="text-xl font-bold text-purple-950 mt-1">
            {stats.avgScore}%
          </div>
          <div className="text-[10px] text-purple-600 font-medium mt-0.5">
            +3.2% this term
          </div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
            Attendance Rate
          </div>
          <div className="text-xl font-bold text-emerald-950 mt-1">
            {stats.avgAttendance}%
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
            96% Benchmark met
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100">
          <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
            Completion Pace
          </div>
          <div className="text-xl font-bold text-blue-950 mt-1">
            {stats.avgCompletion}%
          </div>
          <div className="text-[10px] text-blue-600 font-medium mt-0.5">
            On track (Week 8)
          </div>
        </div>
      </div>

      {/* Subject Competency Bars */}
      <div className="space-y-2.5 mb-4 p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
        <div className="text-xs font-bold text-zinc-800 mb-1">
          Subject Mastery Index
        </div>
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-zinc-600 font-medium">
              Artificial Intelligence & Pattern Recognition
            </span>
            <strong className="text-purple-700 font-bold">92% Mastery</strong>
          </div>
          <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
            <div className="h-full bg-purple-600 rounded-full" style={{ width: "92%" }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-zinc-600 font-medium">
              Verbal Reasoning & Reading
            </span>
            <strong className="text-blue-700 font-bold">88% Mastery</strong>
          </div>
          <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: "88%" }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-zinc-600 font-medium">
              STEM & Science Explorations
            </span>
            <strong className="text-emerald-700 font-bold">82% Mastery</strong>
          </div>
          <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full" style={{ width: "82%" }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-zinc-600 font-medium">
              Fractions & Mathematics
            </span>
            <strong className="text-amber-700 font-bold">74% Target Focus</strong>
          </div>
          <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: "74%" }} />
          </div>
        </div>
      </div>

      {/* Focus Watchlist: Needs Support & Top Performers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2">
            <span>⚠️</span>
            <span>Needs Focused Practice</span>
          </div>
          <div className="space-y-1.5">
            {needsAttention.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectStudent(s)}
                className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white/80 hover:bg-white border border-amber-100 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={s.image}
                    alt={s.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="font-semibold text-zinc-800">{s.name}</span>
                </div>
                <span className="text-[10px] font-bold text-amber-700">
                  {s.average}% Avg
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 mb-2">
            <span>🌟</span>
            <span>Honor Roll Leaders</span>
          </div>
          <div className="space-y-1.5">
            {topPerformers.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectStudent(s)}
                className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white/80 hover:bg-white border border-purple-100 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={s.image}
                    alt={s.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="font-semibold text-zinc-800">{s.name}</span>
                </div>
                <span className="text-[10px] font-bold text-purple-700">
                  {s.average}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Interactive Modal for Taking Class Attendance
 */
function QuickAttendanceModal({
  isOpen,
  onClose,
  students,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  students: StudentItem[]
  onSaved: (msg: string) => void
}) {
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, "Present" | "Late" | "Absent">
  >(() => {
    const init: Record<string, "Present" | "Late" | "Absent"> = {}
    students.forEach((s, idx) => {
      // simulate all present except 1
      init[s.id] = idx === 4 ? "Absent" : "Present"
    })
    return init
  })

  if (!isOpen) return null

  const handleToggle = (
    id: string,
    status: "Present" | "Late" | "Absent"
  ) => {
    setAttendanceMap((prev) => ({ ...prev, [id]: status }))
  }

  const presentCount = Object.values(attendanceMap).filter(
    (s) => s === "Present"
  ).length
  const lateCount = Object.values(attendanceMap).filter((s) => s === "Late").length
  const absentCount = Object.values(attendanceMap).filter(
    (s) => s === "Absent"
  ).length

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Class Attendance Register"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Icon name="calendar" size={16} />
              <span>Year 4 Maple Class Attendance Register</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Today: {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-800 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Counter Summary */}
        <div className="px-4 py-2.5 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between text-xs font-semibold">
          <div className="text-purple-900">
            Total Enrolled: {students.length}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-700">✓ Present: {presentCount}</span>
            <span className="text-amber-700">⏰ Late: {lateCount}</span>
            <span className="text-red-700">✕ Absent: {absentCount}</span>
          </div>
        </div>

        {/* Students List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {students.map((st) => {
            const current = attendanceMap[st.id] || "Present"
            return (
              <div
                key={st.id}
                className="flex items-center justify-between p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={st.image}
                    alt={st.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-bold text-zinc-900">{st.name}</div>
                    <div className="text-[10px] text-zinc-600">{st.rollNumber}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(st.id, "Present")}
                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      current === "Present"
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    Present
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(st.id, "Late")}
                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      current === "Late"
                        ? "bg-amber-500 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    Late
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(st.id, "Absent")}
                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      current === "Absent"
                        ? "bg-red-500 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    Absent
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-3.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">
            Attendance syncs directly with Academic Central Registry.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSaved(
                  `Attendance successfully recorded for ${students.length} students (${presentCount} Present)!`
                )
                onClose()
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer"
            >
              Confirm & Save Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Interactive Modal for Reviewing and Grading Submissions
 */
function ReviewSubmissionModal({
  submission,
  isOpen,
  onClose,
  onSaved,
}: {
  submission: StudentModuleSubmission | null
  isOpen: boolean
  onClose: () => void
  onSaved: (studentId: string, score: number, feedback: string) => void
}) {
  const [score, setScore] = useState<number>(() => submission?.score ?? 92)
  const [feedback, setFeedback] = useState<string>(
    () =>
      submission?.teacherFeedback ||
      "Exceptional work on the classification rules. The decision tree branches cleanly and addresses the edge cases observed during the shape sorter experiment."
  )

  // Keep state updated if selected submission changes
  useEffect(() => {
    if (submission) {
      setScore(submission.score ?? 92)
      setFeedback(
        submission.teacherFeedback ||
          "Exceptional work on the classification rules. The decision tree branches cleanly and addresses the edge cases observed during the shape sorter experiment."
      )
    }
  }, [submission])

  if (!isOpen || !submission) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Review Student Submission"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <img
              src={submission.studentAvatar || "/assets/student-1.png"}
              alt={submission.studentName}
              className="w-9 h-9 rounded-full object-cover border border-zinc-200"
            />
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                {submission.studentName}
              </h3>
              <p className="text-xs text-zinc-500">
                {submission.studentRoll} · Submitted {submission.submittedAt}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-800 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          <div>
            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Assignment
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200/80 font-bold text-purple-950">
              Module 1 Assignment: AI Pattern Classifier & Decision Trees
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Submitted Document
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-purple-600 font-bold">📄</span>
                <span className="font-semibold text-zinc-800">
                  {submission.submittedFile || "Liam_Johnson_m1_Submission.pdf"}
                </span>
                <span className="text-[10px] text-zinc-600">· 1.4 MB PDF</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Verified
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-700">
              Assigned Grade (Max 100)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-24 h-9 px-3 rounded-lg border border-zinc-300 font-bold text-sm focus:outline-none focus:border-purple-600"
              />
              <span className="text-zinc-500 font-medium">/ 100 Marks</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-700">
              Teacher Feedback & Observations
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback on student understanding..."
              className="w-full p-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600 text-xs leading-relaxed"
            />
          </div>
        </div>

        <div className="p-3.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSaved(submission.studentId, score, feedback)
              onClose()
            }}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer"
          >
            Submit Grade & Return to Student
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClassPage({
  metrics,
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  students = initialStudents,
  assignments = initialAssignments,
  reports = initialReports,
  onOpenNewAssignment,
  onOpenReportModal,
  onSelectStudent,
  onShowAllStudents,
  onSwitchToStudent,
}: {
  metrics: MetricItem[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenAiModal: () => void
  students: StudentItem[]
  assignments: AssignmentItem[]
  reports: ReportItem[]
  onOpenNewAssignment: () => void
  onOpenReportModal: () => void
  onSelectStudent: (s: StudentItem) => void
  onShowAllStudents: () => void
  onSwitchToStudent?: () => void
}) {
  // Local state for modals & feedback
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] =
    useState<StudentModuleSubmission | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur))
    }, 3500)
  }

  // Reactive Submissions Data initialized with top 3 pending review
  const [submissionsList, setSubmissionsList] = useState<StudentModuleSubmission[]>(() => {
    const raw = MODULE_ASSIGNMENTS["m1"]?.submissions || []
    return raw.map((s, idx) => {
      if (idx < 3) {
        return {
          ...s,
          status: "Submitted" as const,
          submittedAt: `Oct 22, 2026 at 0${9 + idx}:30 AM`,
          score: undefined,
          teacherFeedback: undefined,
        }
      }
      return s
    })
  })

  const handleGradeSaved = (studentId: string, newScore: number, newFeedback: string) => {
    setSubmissionsList((prev) =>
      prev.map((sub) => {
        if (sub.studentId === studentId) {
          return {
            ...sub,
            status: "Graded" as const,
            score: newScore,
            teacherFeedback: newFeedback,
          }
        }
        return sub
      })
    )
    const stName = submissionsList.find((s) => s.studentId === studentId)?.studentName || "Student"
    showToast(`Grade of ${newScore}/100 and feedback recorded for ${stName}!`)
  }

  // Dynamic Metrics for Summary Cards: My Courses, My Students, Pending Reviews, Attendance
  const dashboardMetrics: MetricItem[] = useMemo(() => {
    const courseCount = initialCourses.length || 4
    const studentCount = students.length || 24
    const pendingSubmissionsCount = submissionsList.filter(
      (s) => s.status === "Submitted" || s.status === "Pending"
    ).length
    const pendingCount = pendingSubmissionsCount + 2 // Submissions + Doubts
    const avgAttendance = students.length
      ? Math.round(
          students.reduce((acc, s) => acc + s.attendance, 0) / students.length
        )
      : 96

    return [
      {
        icon: "book",
        label: "My Courses",
        value: `${courseCount} Active`,
        trend: "2 Cohorts · Year 4",
        tone: "lavender",
      },
      {
        icon: "users",
        label: "My Students",
        value: `${studentCount} Students`,
        trend: "100% Active · Maple Class",
        tone: "pink",
      },
      {
        icon: "document",
        label: "Pending Reviews",
        value: `${pendingCount} Pending`,
        trend: `${pendingSubmissionsCount} Submissions · 2 Doubts`,
        tone: "yellow",
      },
      {
        icon: "calendar",
        label: "Attendance",
        value: `${avgAttendance}%`,
        trend: "+2.4% vs last week",
        tone: "lime",
      },
    ]
  }, [students, submissionsList])

  // Navigation handlers using sidebar trigger
  const handleNavCourses = () => {
    navigateToTeacherTab("My Courses")
  }

  const handleNavStudents = () => {
    if (onShowAllStudents) {
      onShowAllStudents()
    } else {
      navigateToTeacherTab("My Students")
    }
  }

  const handleNavLiveClass = () => {
    navigateToTeacherTab("Live Class")
  }

  const handleNavCalendar = () => {
    navigateToTeacherTab("Calendar")
  }

  const handleNavAnalytics = () => {
    navigateToTeacherTab("Analytics")
  }

  return (
    <>
      <DashboardHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAiModal={onOpenAiModal}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
        onSwitchToStudent={onSwitchToStudent}
      />

      {/* Summary Cards: My Courses, My Students, Pending Reviews, and Attendance */}
      <div className="metrics-grid shrink-0 mb-4">
        {dashboardMetrics.map((item) => (
          <div
            key={item.label}
            className="cursor-pointer transition-transform hover:scale-[1.01]"
            onClick={() => {
              if (item.label === "My Courses") handleNavCourses()
              else if (item.label === "My Students") handleNavStudents()
              else if (item.label === "Pending Reviews") {
                const el = document.getElementById("recent-submissions-anchor")
                el?.scrollIntoView({ behavior: "smooth" })
              } else if (item.label === "Attendance") {
                setIsAttendanceModalOpen(true)
              }
            }}
            title={`Click to open ${item.label}`}
          >
            <MetricCard item={item} />
          </div>
        ))}
      </div>

      {/* Content Grid: 2 columns on desktop */}
      <div className="content-grid pb-12 shrink-0">
        {/* Left Primary Column: Assigned Courses, Upcoming Classes, Recent Submissions */}
        <div className="left-column">
          {/* Assigned Courses Section */}
          <AssignedCoursesSection
            courses={initialCourses}
            searchQuery={searchQuery}
            onSelectCourse={() => handleNavCourses()}
            onViewAllCourses={handleNavCourses}
          />

          {/* Upcoming Classes Section */}
          <UpcomingClassesSection
            sessions={initialLiveSessions}
            onEnterStudio={() => handleNavLiveClass()}
            onOpenCalendar={handleNavCalendar}
          />

          {/* Recent Submissions Section */}
          <div id="recent-submissions-anchor">
            <RecentSubmissionsSection
              submissions={submissionsList}
              onReviewSubmission={(sub) => setSelectedSubmission(sub)}
              onViewAllSubmissions={handleNavCourses}
            />
          </div>
        </div>

        {/* Right Secondary Column: Class Overview, Student Analytics */}
        <div className="right-column">
          {/* Iconic Class Overview Card */}
          <ClassOverviewCard />

          {/* Student Analytics Section */}
          <StudentAnalyticsSection
            students={students}
            onOpenAnalyticsTab={handleNavAnalytics}
            onSelectStudent={(st) => {
              if (onSelectStudent) {
                onSelectStudent(st)
              } else {
                handleNavStudents()
              }
            }}
          />
        </div>
      </div>

      {/* Attendance Modal */}
      <QuickAttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        students={students}
        onSaved={showToast}
      />

      {/* Review & Grading Modal */}
      <ReviewSubmissionModal
        submission={selectedSubmission}
        isOpen={Boolean(selectedSubmission)}
        onClose={() => setSelectedSubmission(null)}
        onSaved={handleGradeSaved}
      />

      {/* In-page Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-zinc-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-white text-xs font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
