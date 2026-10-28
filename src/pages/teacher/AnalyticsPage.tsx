import { useState, useMemo } from "react"
import type {
  MetricItem,
  CourseItem,
  StudentItem,
  LiveSessionItem,
  AssignmentItem,
  LiveAttendanceRecord,
  SessionRecordingItem,
  CorrectionSubmissionItem,
} from "../../types"
import { Icon } from "../../components/Icon"
import { HexColorField } from "../../components/HexColorField"
import { MetricCard } from "../../components/MetricCard"
import { StudentActivityHeatmap } from "../../components/StudentActivityHeatmap"
import { TeacherHeaderActions } from "./TeacherHeaderActions"
import { getStudentActivityHeatmap } from "../../data/studentActivityData"
import { MODULE_ASSIGNMENTS, type ModuleAssignmentItem, type StudentModuleSubmission } from "../../data/courseAssignmentsData"
import {
  initialCourses,
  initialStudents,
  initialLiveSessions,
  initialAttendanceRecords,
  initialRecordings,
  initialCorrectionSubmissions,
  initialTeachingSuggestions,
  initialAIMonitoringData,
} from "../../data/mockData"

function getStudentActivityStats(student: StudentItem) {
  const summary = getStudentActivityHeatmap(student)
  const flatDays = summary.weeks.flatMap((w) => w.days)
  const allEvents = flatDays.flatMap((d) => d.events || [])

  const videoWatch = allEvents.filter((e) => e.type === "video_watched").length
  const lessonComplete = allEvents.filter((e) => e.type === "lesson_completed").length
  const materialRead = allEvents.filter((e) => e.type === "material_opened").length
  const assignmentSubmit = allEvents.filter((e) => e.type === "assignment_submitted").length
  const quizAttempt = allEvents.filter((e) => e.type === "quiz_attempted").length

  return {
    summary,
    totalEvents: summary.totalActivities,
    activeDays: summary.totalActiveDays,
    breakdown: {
      videoWatch,
      lessonComplete,
      materialRead,
      quizAttempt,
      assignmentSubmit,
    },
    flatDays,
  }
}

export function AnalyticsHeader({
  searchQuery,
  setSearchQuery,
  onOpenAiDiagnostic,
  hexColor,
  onChangeHexColor,
  onOpenAiAssistant,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenAiDiagnostic?: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenAiAssistant?: () => void
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>Academic & Growth Analytics</span>
        </div>
        <div className="subtitle">
          Real-time cohort insights, learning activity heatmaps, curriculum progress & live intelligence
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topic, lesson, assignment or student..."
            aria-label="Search analytics"
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
        <TeacherHeaderActions
          hexColor={hexColor}
          onChangeHexColor={onChangeHexColor}
          onOpenAiModal={onOpenAiAssistant || onOpenAiDiagnostic}
          showPortalSwitch={true}
        >
          {onOpenAiDiagnostic && (
            <button
              className="h-9 px-3 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
              onClick={onOpenAiDiagnostic}
              aria-label="Generate AI Diagnostic"
            >
              <span>✦</span>
              AI Diagnostic
            </button>
          )}
        </TeacherHeaderActions>
      </div>
    </header>
  )
}

interface AnalyticsPageProps {
  metrics?: MetricItem[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenAiDiagnostic?: () => void
  onAssignSkill?: (skillTitle: string, subjectType: string) => void
  onSelectStudentForReport?: (studentName: string) => void
  onOpenAiAssistant?: () => void
  onShareDigest?: () => void
  courses?: CourseItem[]
  students?: StudentItem[]
  liveSessions?: LiveSessionItem[]
  assignments?: AssignmentItem[]
  onToast?: (msg: string) => void
}

export default function AnalyticsPage({
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiDiagnostic,
  onAssignSkill,
  onSelectStudentForReport,
  onOpenAiAssistant,
  onShareDigest,
  courses: propCourses,
  students: propStudents,
  liveSessions: propLiveSessions,
  onToast,
}: AnalyticsPageProps) {
  // Use real data sources passed from App or fallbacks
  const courses = propCourses && propCourses.length > 0 ? propCourses : initialCourses
  const students = propStudents && propStudents.length > 0 ? propStudents : initialStudents
  const liveSessions = propLiveSessions && propLiveSessions.length > 0 ? propLiveSessions : initialLiveSessions

  // Active View Tab Filter
  const [activeTab, setActiveTab] = useState<
    "overview" | "student_activity" | "curriculum" | "assignments" | "attendance_live" | "ai_intelligence"
  >("overview")

  // Filter Bar State
  const [courseFilter, setCourseFilter] = useState<string>("All")
  const [moduleFilter, setModuleFilter] = useState<string>("All")
  const [studentFilter, setStudentFilter] = useState<string>("All")
  const [timeframeFilter, setTimeframeFilter] = useState<"all" | "12w" | "4w" | "1w">("12w")

  // Modal State for inspecting module assignment student submissions
  const [inspectingAssignment, setInspectingAssignment] = useState<ModuleAssignmentItem | null>(null)
  const [submissionSearch, setSubmissionSearch] = useState("")

  // Available modules based on selected course
  const availableModules = useMemo(() => {
    if (courseFilter === "All") {
      return courses.flatMap((c) =>
        c.modules.map((m) => ({ id: m.id, title: m.title, courseId: c.id, courseName: c.name }))
      )
    }
    const targetCourse = courses.find((c) => c.id === courseFilter)
    if (!targetCourse) return []
    return targetCourse.modules.map((m) => ({
      id: m.id,
      title: m.title,
      courseId: targetCourse.id,
      courseName: targetCourse.name,
    }))
  }, [courses, courseFilter])

  // Reset module filter if selected module doesn't belong to newly selected course
  const handleCourseFilterChange = (newCourseId: string) => {
    setCourseFilter(newCourseId)
    setModuleFilter("All")
  }

  // Filtered Students list
  const filteredStudents = useMemo(() => {
    let list = students
    if (studentFilter !== "All") {
      list = list.filter((s) => s.id === studentFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q) ||
          (s.assignedCourse && s.assignedCourse.toLowerCase().includes(q))
      )
    }
    return list
  }, [students, studentFilter, searchQuery])

  // Single Selected Student for Heatmap inspector
  const selectedStudentForHeatmap = useMemo(() => {
    if (studentFilter !== "All") {
      return students.find((s) => s.id === studentFilter) || students[0]
    }
    return null
  }, [students, studentFilter])

  // 1. KPI Overview Calculations from Actual Data
  const overviewStats = useMemo(() => {
    const totalStudents = students.length
    const totalCourses = courses.length
    const totalModules = courses.reduce((acc, c) => acc + (c.modules?.length || 0), 0)
    const totalLessons = courses.reduce(
      (acc, c) => acc + (c.modules?.reduce((mAcc, m) => mAcc + (m.lessons?.length || 0), 0) || 0),
      0
    )
    const avgProgress = Math.round(
      courses.reduce((acc, c) => acc + (c.progress || 0), 0) / (courses.length || 1)
    )

    // Module Assignments from MODULE_ASSIGNMENTS
    const assignmentList = Object.values(MODULE_ASSIGNMENTS)
    const totalAssignments = assignmentList.length
    const totalSubmissions = assignmentList.reduce((acc, a) => acc + a.submissionsCount, 0)
    const totalExpectedSubmissions = assignmentList.reduce((acc, a) => acc + a.totalEnrolled, 0)
    const submissionRate = Math.round((totalSubmissions / (totalExpectedSubmissions || 1)) * 100)

    // Live Classes
    const completedSessions = liveSessions.filter((s) => s.status === "Completed").length
    const upcomingSessions = liveSessions.filter((s) => s.status === "Upcoming" || s.status === "Scheduled").length
    const liveNowSessions = liveSessions.filter((s) => s.status === "Live Now").length

    // Live Attendance from initialAttendanceRecords
    const validRecords = initialAttendanceRecords
    const presentCount = validRecords.filter((r) => r.status === "Present").length
    const lateCount = validRecords.filter((r) => r.status === "Late").length
    const leftEarlyCount = validRecords.filter((r) => r.status === "Left Early").length
    const absentCount = validRecords.filter((r) => r.status === "Absent").length
    const attendancePct = Math.round(((presentCount + lateCount) / (validRecords.length || 1)) * 1000) / 10

    // Cohort Historical Roster Attendance
    const cohortRosterAttendance = Math.round(
      students.reduce((acc, s) => acc + (s.attendance || 0), 0) / (students.length || 1)
    )

    return {
      totalStudents,
      totalCourses,
      totalModules,
      totalLessons,
      avgProgress,
      totalAssignments,
      totalSubmissions,
      totalExpectedSubmissions,
      submissionRate,
      completedSessions,
      upcomingSessions,
      liveNowSessions,
      totalSessions: liveSessions.length,
      presentCount,
      lateCount,
      leftEarlyCount,
      absentCount,
      attendancePct,
      cohortRosterAttendance,
    }
  }, [students, courses, liveSessions])

  // Overview 6 Metric Cards
  const kpiCards: MetricItem[] = useMemo(() => {
    return [
      {
        icon: "users",
        label: "Total Assigned Students",
        value: `${overviewStats.totalStudents}`,
        trend: "100% active cohort · Maple & Oak",
        tone: "lavender",
      },
      {
        icon: "book",
        label: "Total Assigned Courses",
        value: `${overviewStats.totalCourses}`,
        trend: `${overviewStats.totalModules} Modules · ${overviewStats.totalLessons} Lessons`,
        tone: "yellow",
      },
      {
        icon: "chart",
        label: "Average Student Progress",
        value: `${overviewStats.avgProgress}%`,
        trend: "Weighted cohort curriculum pace",
        tone: "lime",
      },
      {
        icon: "document",
        label: "Assignment Submissions",
        value: `${overviewStats.totalSubmissions}/${overviewStats.totalExpectedSubmissions}`,
        trend: `${overviewStats.submissionRate}% submission velocity`,
        tone: "pink",
      },
      {
        icon: "video",
        label: "Live Classes Conducted",
        value: `${overviewStats.completedSessions}`,
        trend: `${overviewStats.upcomingSessions} Upcoming · ${overviewStats.liveNowSessions} Live Now`,
        tone: "lavender",
      },
      {
        icon: "sparkles",
        label: "Valid Attendance Rate",
        value: `${overviewStats.attendancePct}%`,
        trend: `${overviewStats.cohortRosterAttendance}% Historical roster avg`,
        tone: "lime",
      },
    ]
  }, [overviewStats])

  // 2. Student Activity Heatmap Aggregations (Section 2.B)
  const cohortActivityAggregate = useMemo(() => {
    let totalEvents = 0
    let totalActiveDaysSum = 0
    let videoWatch = 0
    let lessonComplete = 0
    let materialRead = 0
    let quizAttempt = 0
    let assignmentSubmit = 0

    // 84-day aggregated volume
    const dailyVolumes: number[] = new Array(84).fill(0)

    students.forEach((st) => {
      const stats = getStudentActivityStats(st)
      totalEvents += stats.totalEvents
      totalActiveDaysSum += stats.activeDays
      videoWatch += stats.breakdown.videoWatch
      lessonComplete += stats.breakdown.lessonComplete
      materialRead += stats.breakdown.materialRead
      quizAttempt += stats.breakdown.quizAttempt
      assignmentSubmit += stats.breakdown.assignmentSubmit

      stats.flatDays.forEach((day, idx) => {
        if (idx < 84) {
          dailyVolumes[idx] += day.count
        }
      })
    })

    const avgActiveDays = Math.round(totalActiveDaysSum / (students.length || 1))

    return {
      totalEvents,
      avgActiveDays,
      breakdown: {
        videoWatch,
        lessonComplete,
        materialRead,
        quizAttempt,
        assignmentSubmit,
      },
      dailyVolumes,
    }
  }, [students])

  // 3. Curriculum Resources Aggregation (Section 2.C)
  const curriculumResources = useMemo(() => {
    let videos = 0
    let pdfs = 0
    let audio = 0
    let labs = 0
    let documents = 0

    courses.forEach((c) => {
      c.modules?.forEach((m) => {
        m.lessons?.forEach((l) => {
          const rType = (l.resourceType || "").toLowerCase()
          const lType = (l.type || "").toLowerCase()

          if (rType === "video" || lType.includes("video")) videos++
          else if (rType === "audio" || lType.includes("audio")) audio++
          else if (rType === "pdf" || lType.includes("worksheet") || lType.includes("reading")) pdfs++
          else if (rType === "document" || lType.includes("theory") || lType.includes("document")) documents++
          else if (lType.includes("lab") || lType.includes("exercise")) labs++
          else documents++
        })
      })
    })

    return {
      videos,
      pdfs,
      audio,
      labs,
      documents,
      total: videos + pdfs + audio + labs + documents,
    }
  }, [courses])

  // 4. Assignments List with Module Association (Section 2.D)
  const assignmentsList: ModuleAssignmentItem[] = useMemo(() => {
    const list = Object.values(MODULE_ASSIGNMENTS)
    if (courseFilter !== "All") {
      return list.filter((a) => a.courseId === courseFilter)
    }
    if (moduleFilter !== "All") {
      return list.filter((a) => a.moduleId === moduleFilter)
    }
    return list
  }, [courseFilter, moduleFilter])

  // 5. AI Monitoring and Recording Review Aggregations (Section 2.G)
  const recordingReviewStats = useMemo(() => {
    const totalRecordings = initialRecordings.length
    const availableRecordings = initialRecordings.filter((r) => r.status === "Available").length
    const processingRecordings = initialRecordings.filter((r) => r.status === "Processing").length
    const notAvailableRecordings = initialRecordings.filter((r) => r.status === "Not Available").length

    // Correction proposals from localStorage or initial
    let submissions: CorrectionSubmissionItem[] = initialCorrectionSubmissions
    try {
      const saved = localStorage.getItem("quantum_teacher_correction_submissions_v1")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) submissions = parsed
      }
    } catch {
      // ignore
    }

    const acceptedProposals = submissions.filter((s) => s.status === "Accepted").length
    const pendingProposals = submissions.filter((s) => s.status === "Pending Review").length
    const rejectedProposals = submissions.filter((s) => s.status === "Rejected").length

    return {
      totalRecordings,
      availableRecordings,
      processingRecordings,
      notAvailableRecordings,
      whisperTranscriptsAvailable: 3, // rec-1, rec-2, rec-3
      totalChaptersIndexed: 12,
      executiveSummariesGenerated: 3,
      acceptedProposals,
      pendingProposals,
      rejectedProposals,
      totalProposals: submissions.length,
      proposalsList: submissions,
      teachingSuggestions: initialTeachingSuggestions,
      monitoringData: initialAIMonitoringData,
    }
  }, [])

  return (
    <div className="flex flex-col gap-2">
      {/* 1. Header */}
      <AnalyticsHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAiDiagnostic={onOpenAiDiagnostic}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
        onOpenAiAssistant={onOpenAiAssistant}
      />

      {/* 2. Top Summary KPI Cards (Section 2.A) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
        {kpiCards.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* 3. Global Filter Toolbar & View Mode Switcher (Section 2.H) */}
      <div className="panel p-3.5 sm:p-4 flex flex-col gap-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-purple-100/70">
          <button
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${activeTab === "overview"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-purple-50"
              }`}
            onClick={() => setActiveTab("overview")}
          >
            <Icon name="analytics" size={14} />
            <span>Overview</span>
          </button>

          <button
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${activeTab === "student_activity"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-purple-50"
              }`}
            onClick={() => setActiveTab("student_activity")}
          >
            <Icon name="trend" size={14} />
            <span>Student Activity & Heatmaps</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-900">
              {students.length}
            </span>
          </button>

          <button
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${activeTab === "curriculum"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-purple-50"
              }`}
            onClick={() => setActiveTab("curriculum")}
          >
            <Icon name="book" size={14} />
            <span>Courses & Learning</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-900">
              {courses.length}
            </span>
          </button>

          <button
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${activeTab === "assignments"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-purple-50"
              }`}
            onClick={() => setActiveTab("assignments")}
          >
            <Icon name="document" size={14} />
            <span>Module Assignments</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-900">
              {assignmentsList.length}
            </span>
          </button>

          <button
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${activeTab === "attendance_live"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-purple-50"
              }`}
            onClick={() => setActiveTab("attendance_live")}
          >
            <Icon name="video" size={14} />
            <span>Attendance & Live Class</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-900">
              {liveSessions.length}
            </span>
          </button>

          <button
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${activeTab === "ai_intelligence"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-purple-50"
              }`}
            onClick={() => setActiveTab("ai_intelligence")}
          >
            <span className="text-lime-500">✦</span>
            <span>AI Live & Recordings</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-lime-100 text-lime-900">
              {recordingReviewStats.totalRecordings}
            </span>
          </button>
        </div>

        {/* Dynamic Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Course Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Course:</span>
              <select
                className="bg-transparent font-bold text-zinc-800 outline-none cursor-pointer text-xs"
                value={courseFilter}
                onChange={(e) => handleCourseFilterChange(e.target.value)}
              >
                <option value="All">All Courses ({courses.length})</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Module Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Module:</span>
              <select
                className="bg-transparent font-bold text-zinc-800 outline-none cursor-pointer text-xs"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                <option value="All">All Modules ({availableModules.length})</option>
                {availableModules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id.toUpperCase()}: {m.title.slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Student Selector Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Student:</span>
              <select
                className="bg-transparent font-bold text-zinc-800 outline-none cursor-pointer text-xs"
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
              >
                <option value="All">All Students (24 Cohort Aggregate)</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.rollNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Window:</span>
              <select
                className="bg-transparent font-bold text-zinc-800 outline-none cursor-pointer text-xs"
                value={timeframeFilter}
                onChange={(e) => setTimeframeFilter(e.target.value as any)}
              >
                <option value="12w">12 Weeks (Term 1 Rolling)</option>
                <option value="4w">Past 4 Weeks (Month)</option>
                <option value="1w">Past 7 Days (Week)</option>
                <option value="all">All-Time Cumulative</option>
              </select>
            </div>
          </div>

          {/* Reset Filters / Active Filter Pills */}
          {(courseFilter !== "All" || moduleFilter !== "All" || studentFilter !== "All" || searchQuery) && (
            <button
              onClick={() => {
                setCourseFilter("All")
                setModuleFilter("All")
                setStudentFilter("All")
                setSearchQuery("")
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Reset Filters</span>
              <span>×</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          VIEW: STUDENT ACTIVITY ANALYTICS & HEATMAP (Section 2.B)
          ======================================================== */}
      {(activeTab === "overview" || activeTab === "student_activity") && (
        <section className="panel p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-150 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Icon name="trend" size={16} />
                  <span>Student Learning Activity & Heatmap Analytics</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {timeframeFilter === "12w" ? "12-Week Rolling Window" : "Filtered Window"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Activity volume, active study days, video watches, lesson completions, resources read, quizzes, and assignment submissions.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                Simulated Demo Activity Data
              </span>
            </div>
          </div>

          {/* If Single Student is Selected: Render their exact StudentActivityHeatmap component! */}
          {selectedStudentForHeatmap ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/70 border border-purple-100">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedStudentForHeatmap.image}
                    alt={selectedStudentForHeatmap.name}
                    className="w-10 h-10 rounded-full object-cover border border-purple-200"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">
                      {selectedStudentForHeatmap.name} ({selectedStudentForHeatmap.rollNumber})
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      {selectedStudentForHeatmap.assignedCourse} · Attendance: {selectedStudentForHeatmap.attendance}% · GPA: {selectedStudentForHeatmap.average}%
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setStudentFilter("All")}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-purple-200 text-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  View All Cohort
                </button>
              </div>

              {/* Individual Heatmap Component matching My Students exactly */}
              <StudentActivityHeatmap student={selectedStudentForHeatmap} />
            </div>
          ) : (
            /* Cohort Aggregated View */
            <div className="flex flex-col gap-4">
              {/* Cohort 5 Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 flex flex-col items-center text-center">
                  <span className="text-[10px] font-semibold text-purple-900 uppercase tracking-wide">Total Events</span>
                  <strong className="text-lg font-bold text-purple-950 mt-0.5">
                    {cohortActivityAggregate.totalEvents.toLocaleString()}
                  </strong>
                  <span className="text-[10px] text-purple-700/80 mt-0.5">Across 24 students</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 border border-gray-200 flex flex-col items-center text-center">
                  <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wide">Avg Active Days</span>
                  <strong className="text-lg font-bold text-zinc-900 mt-0.5">
                    {cohortActivityAggregate.avgActiveDays} / 84
                  </strong>
                  <span className="text-[10px] text-zinc-500 mt-0.5">73.8% consistency</span>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/40 border border-purple-100 flex flex-col items-center text-center">
                  <span className="text-[10px] font-semibold text-purple-800 uppercase tracking-wide">Video Views</span>
                  <strong className="text-lg font-bold text-purple-900 mt-0.5">
                    {cohortActivityAggregate.breakdown.videoWatch}
                  </strong>
                  <span className="text-[10px] text-purple-700/80 mt-0.5">Recorded lessons</span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex flex-col items-center text-center">
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide">Completions</span>
                  <strong className="text-lg font-bold text-emerald-900 mt-0.5">
                    {cohortActivityAggregate.breakdown.lessonComplete}
                  </strong>
                  <span className="text-[10px] text-emerald-700/80 mt-0.5">Lessons finished</span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 flex flex-col items-center text-center">
                  <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide">Quiz Attempts</span>
                  <strong className="text-lg font-bold text-amber-900 mt-0.5">
                    {cohortActivityAggregate.breakdown.quizAttempt}
                  </strong>
                  <span className="text-[10px] text-amber-700/80 mt-0.5">Formative checks</span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col items-center text-center">
                  <span className="text-[10px] font-semibold text-blue-800 uppercase tracking-wide">Submissions</span>
                  <strong className="text-lg font-bold text-blue-900 mt-0.5">
                    {cohortActivityAggregate.breakdown.assignmentSubmit}
                  </strong>
                  <span className="text-[10px] text-blue-700/80 mt-0.5">Lab & assignments</span>
                </div>
              </div>

              {/* Cohort 12-Week Daily Learning Activity Histogram & Trendline */}
              <div className="p-4 rounded-xl bg-white border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-800">
                    Cohort Daily Event Histogram (12-Week Rolling Trend)
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Peaks on Tuesday/Thursday lab afternoons · Daily cohort range: 8 – 28 events
                  </span>
                </div>

                <div className="h-28 w-full">
                  <svg viewBox="0 0 840 100" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9860e9" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#9860e9" stopOpacity="0.2" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="90" x2="840" y2="90" stroke="#f0f1f5" strokeWidth="1" />
                    <line x1="0" y1="50" x2="840" y2="50" stroke="#f0f1f5" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="10" x2="840" y2="10" stroke="#f0f1f5" strokeWidth="1" strokeDasharray="3 3" />

                    {cohortActivityAggregate.dailyVolumes.map((vol, idx) => {
                      const barHeight = Math.min(80, Math.max(4, (vol / 32) * 80))
                      const x = idx * 10 + 2
                      const y = 90 - barHeight
                      return (
                        <g key={idx}>
                          <rect
                            x={x}
                            y={y}
                            width="6"
                            height={barHeight}
                            rx="2"
                            fill="url(#bar-gradient)"
                            className="hover:fill-purple-700 transition-colors cursor-pointer"
                          >
                            <title>Day {idx + 1}: {vol} learning events across cohort</title>
                          </rect>
                        </g>
                      )
                    })}
                  </svg>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                  <span>Week 1 (Aug 2026)</span>
                  <span>Week 6 (Mid-Term)</span>
                  <span>Week 12 (Today - Oct 22)</span>
                </div>
              </div>

              {/* Cohort Student Activity Roster Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-zinc-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800">
                    Individual Student Learning Activity Breakdown ({filteredStudents.length} Students)
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Click any student to inspect their 12-week heatmap
                  </span>
                </div>

                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-[10.5px] font-semibold text-zinc-500 uppercase tracking-wider sticky top-0 border-b border-gray-200">
                      <tr>
                        <th className="py-2 px-3">Student</th>
                        <th className="py-2 px-3">Assigned Class & Batch</th>
                        <th className="py-2 px-3 text-center">Active Days</th>
                        <th className="py-2 px-3 text-center">Total Events</th>
                        <th className="py-2 px-3 text-center">Video / Lesson</th>
                        <th className="py-2 px-3 text-center">Quizzes & Asg</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredStudents.map((st) => {
                        const stats = getStudentActivityStats(st)
                        return (
                          <tr
                            key={st.id}
                            className="hover:bg-purple-50/50 cursor-pointer transition-colors"
                            onClick={() => setStudentFilter(st.id)}
                          >
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={st.image}
                                  alt={st.name}
                                  className="w-7 h-7 rounded-full object-cover border border-purple-200"
                                />
                                <div>
                                  <strong className="text-zinc-900 block text-xs">{st.name}</strong>
                                  <span className="text-[10px] text-zinc-400">{st.rollNumber}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-zinc-600">
                              <span className="block">{st.assignedCourse}</span>
                              <span className="text-[10px] text-zinc-400">{st.batch}</span>
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-zinc-800">
                              {stats.activeDays} <span className="text-[10px] font-normal text-zinc-400">/ 84</span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-100 text-purple-900">
                                {stats.totalEvents}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center text-zinc-600 text-[11px]">
                              {stats.breakdown.videoWatch}v · {stats.breakdown.lessonComplete}l
                            </td>
                            <td className="py-2 px-3 text-center text-zinc-600 text-[11px]">
                              {stats.breakdown.quizAttempt}q · {stats.breakdown.assignmentSubmit}a
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setStudentFilter(st.id)
                                }}
                              >
                                View Heatmap →
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          VIEW: COURSE & LEARNING ANALYTICS (Section 2.C)
          ======================================================== */}
      {(activeTab === "overview" || activeTab === "curriculum") && (
        <section className="panel p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-150 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Icon name="book" size={16} />
                <span>Course & Curriculum Learning Progress</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Combined module and lesson progression, resource format breakdown, and lesson completion status.
              </p>
            </div>
            <div className="text-xs text-zinc-500">
              Showing {courseFilter === "All" ? `All ${courses.length} Assigned Courses` : "Filtered Course"}
            </div>
          </div>

          {/* Curriculum Resource Format Distribution */}
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-gray-200 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <strong className="font-bold text-zinc-800">
                Curriculum Learning Resource Distribution ({curriculumResources.total} Total Lessons & Assets)
              </strong>
              <span className="text-[11px] text-zinc-500">Multimodal pedagogical balance</span>
            </div>

            {/* Proportional Resource Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-200">
              <div
                style={{ width: `${(curriculumResources.videos / curriculumResources.total) * 100}%` }}
                className="bg-purple-600"
                title={`${curriculumResources.videos} Video Lectures`}
              />
              <div
                style={{ width: `${(curriculumResources.labs / curriculumResources.total) * 100}%` }}
                className="bg-lime-500"
                title={`${curriculumResources.labs} Interactive Labs & Exercises`}
              />
              <div
                style={{ width: `${(curriculumResources.pdfs / curriculumResources.total) * 100}%` }}
                className="bg-amber-400"
                title={`${curriculumResources.pdfs} PDFs & Worksheets`}
              />
              <div
                style={{ width: `${(curriculumResources.documents / curriculumResources.total) * 100}%` }}
                className="bg-pink-400"
                title={`${curriculumResources.documents} Theory Slides & Guides`}
              />
              <div
                style={{ width: `${(curriculumResources.audio / curriculumResources.total) * 100}%` }}
                className="bg-indigo-500"
                title={`${curriculumResources.audio} Audio Walkthroughs`}
              />
            </div>

            {/* Resource Legend Pills */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-zinc-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                <span>🎥 Videos: {curriculumResources.videos}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-lime-500" />
                <span>💻 Interactive Labs: {curriculumResources.labs}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>📄 PDFs / Worksheets: {curriculumResources.pdfs}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                <span>📑 Guides & Slides: {curriculumResources.documents}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>🎧 Audio: {curriculumResources.audio}</span>
              </span>
            </div>
          </div>

          {/* Courses & Modules Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {courses
              .filter((c) => (courseFilter === "All" ? true : c.id === courseFilter))
              .map((course) => {
                const totalLessons = course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0
                const completedLessons =
                  course.modules?.reduce(
                    (acc, m) => acc + (m.lessons?.filter((l) => l.completed).length || 0),
                    0
                  ) || 0

                return (
                  <div key={course.id} className="p-4 rounded-xl bg-white border border-gray-200 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={course.thumbnail}
                          alt={course.name}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                        />
                        <div>
                          <strong className="text-xs font-bold text-zinc-900 block">{course.name}</strong>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {course.code} · {course.assignedClass} · {course.enrolledStudentsCount} Enrolled
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900">
                        {course.progress}% Complete
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-600"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>{course.modules?.length || 0} Modules Available</span>
                      <span>{completedLessons} of {totalLessons} Lessons Finished</span>
                    </div>

                    {/* Module Accordion / List */}
                    <div className="flex flex-col gap-1.5 mt-1 border-t border-gray-100 pt-2.5 max-h-48 overflow-y-auto">
                      {course.modules?.map((mod, mIdx) => (
                        <div
                          key={mod.id}
                          className="p-2 rounded-lg bg-zinc-50 hover:bg-purple-50/50 transition-colors flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-900 font-bold text-[10px] flex items-center justify-center shrink-0">
                              M{mIdx + 1}
                            </span>
                            <span className="font-semibold text-zinc-800 truncate text-[11px]">
                              {mod.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-zinc-400">
                              {mod.lessons?.length || 0} Lessons
                            </span>
                            {mod.completed ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                                Completed
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded-md">
                                {mod.progress}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        </section>
      )}

      {/* ========================================================
          VIEW: MODULE ASSIGNMENTS ANALYTICS (Section 2.D)
          ======================================================== */}
      {(activeTab === "overview" || activeTab === "assignments") && (
        <section className="panel p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-150 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Icon name="document" size={16} />
                <span>Module-Level Assignment Analytics</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Submissions received, grading status, average score, and cohort completion per curriculum module.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-zinc-700">Total: {assignmentsList.length} Assignments</span>
            </div>
          </div>

          {/* Assignment KPI Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
              <span className="text-[10px] font-semibold text-purple-900 uppercase tracking-wide block">
                Total Submissions
              </span>
              <strong className="text-base font-bold text-purple-950 mt-0.5 block">
                {overviewStats.totalSubmissions} / {overviewStats.totalExpectedSubmissions}
              </strong>
              <span className="text-[10.5px] text-purple-700/80">
                {overviewStats.submissionRate}% submission rate
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[10px] font-semibold text-emerald-900 uppercase tracking-wide block">
                Graded Reviews
              </span>
              <strong className="text-base font-bold text-emerald-950 mt-0.5 block">
                39 Submissions
              </strong>
              <span className="text-[10.5px] text-emerald-700/80">46.4% evaluated</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
              <span className="text-[10px] font-semibold text-amber-900 uppercase tracking-wide block">
                Pending Grading
              </span>
              <strong className="text-base font-bold text-amber-950 mt-0.5 block">
                45 Submissions
              </strong>
              <span className="text-[10.5px] text-amber-700/80">Ready for teacher grading</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-gray-200">
              <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wide block">
                Cohort Average Score
              </span>
              <strong className="text-base font-bold text-zinc-900 mt-0.5 block">
                88.6%
              </strong>
              <span className="text-[10.5px] text-zinc-500">Across graded assignments</span>
            </div>
          </div>

          {/* Comprehensive Assignment Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-[10.5px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Module & Assignment</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-center">Submissions</th>
                    <th className="py-2.5 px-3 text-center">Average Marks</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assignmentsList.map((asg) => {
                    const subRate = Math.round((asg.submissionsCount / asg.totalEnrolled) * 100)
                    return (
                      <tr key={asg.id} className="hover:bg-purple-50/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <strong className="text-zinc-900 block text-xs">{asg.title}</strong>
                          <span className="text-[10.5px] text-zinc-500">
                            {asg.moduleId.toUpperCase()} · {asg.moduleTitle}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-zinc-700">
                            {asg.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600 text-[11px] whitespace-nowrap">
                          {asg.dueDate}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-zinc-800 text-xs">
                              {asg.submissionsCount} / {asg.totalEnrolled} ({subRate}%)
                            </span>
                            <div className="w-20 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-purple-600"
                                style={{ width: `${subRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {asg.averageScore ? (
                            <span className="font-bold text-zinc-900 text-xs">
                              {asg.averageScore} / {asg.maxMarks}
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-zinc-400">Not Available</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${asg.status === "Graded"
                                ? "bg-emerald-100 text-emerald-800"
                                : asg.status === "In Review"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                          >
                            {asg.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors cursor-pointer"
                            onClick={() => {
                              setInspectingAssignment(asg)
                              setSubmissionSearch("")
                            }}
                          >
                            Inspect Submissions →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================
          VIEW: ATTENDANCE & LIVE CLASS ANALYTICS (Section 2.E & 2.F)
          ======================================================== */}
      {(activeTab === "overview" || activeTab === "attendance_live") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {/* Attendance Analytics Card (Section 2.E) */}
          <section className="panel p-4 sm:p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Icon name="calendar" size={16} />
                  <span>Attendance Analytics</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Verified Live Class attendance logs & student roster percentages
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-lime-100 text-lime-900">
                {overviewStats.attendancePct}% Rate
              </span>
            </div>

            {/* Attendance Status Counts (Present, Late, Left Early, Absent) */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] font-semibold text-emerald-800 uppercase block">Present</span>
                <strong className="text-base font-bold text-emerald-950 mt-0.5 block">
                  {overviewStats.presentCount}
                </strong>
                <span className="text-[10px] text-emerald-700/80">87.5%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-[10px] font-semibold text-amber-800 uppercase block">Late</span>
                <strong className="text-base font-bold text-amber-950 mt-0.5 block">
                  {overviewStats.lateCount}
                </strong>
                <span className="text-[10px] text-amber-700/80">8.3%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
                <span className="text-[10px] font-semibold text-purple-800 uppercase block">Left Early</span>
                <strong className="text-base font-bold text-purple-950 mt-0.5 block">
                  {overviewStats.leftEarlyCount}
                </strong>
                <span className="text-[10px] text-purple-700/80">4.2%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-gray-200">
                <span className="text-[10px] font-semibold text-zinc-600 uppercase block">Absent</span>
                <strong className="text-base font-bold text-zinc-900 mt-0.5 block">
                  {overviewStats.absentCount}
                </strong>
                <span className="text-[10px] text-zinc-500">0%</span>
              </div>
            </div>

            {/* Attendance Historical Trendline across live sessions */}
            <div className="p-3.5 rounded-xl bg-white border border-gray-200 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <strong className="font-bold text-zinc-800">Attendance Trends Over Recent Live Sessions</strong>
                <span className="text-[11px] text-zinc-500">4 Completed Sessions</span>
              </div>

              <div className="h-20 w-full">
                <svg viewBox="0 0 400 70" className="w-full h-full overflow-visible">
                  <line x1="20" y1="60" x2="380" y2="60" stroke="#f0f1f5" strokeWidth="1" />
                  <line x1="20" y1="20" x2="380" y2="20" stroke="#f0f1f5" strokeWidth="1" strokeDasharray="3 3" />
                  {/* Trendline */}
                  <polyline
                    fill="none"
                    stroke="#a8ed00"
                    strokeWidth="3"
                    strokeLinecap="round"
                    points="40,25 140,35 240,15 340,22"
                  />
                  {/* Points */}
                  {[
                    { x: 40, y: 25, label: "96%", session: "Oct 12" },
                    { x: 140, y: 35, label: "92%", session: "Oct 15" },
                    { x: 240, y: 15, label: "98%", session: "Oct 19" },
                    { x: 340, y: 22, label: "96%", session: "Oct 22" },
                  ].map((pt) => (
                    <g key={pt.session}>
                      <circle cx={pt.x} cy={pt.y} r="4" fill="#fff" stroke="#557c00" strokeWidth="2" />
                      <text x={pt.x} y={pt.y - 8} fill="#27272a" fontSize="9" fontWeight="bold" textAnchor="middle">
                        {pt.label}
                      </text>
                      <text x={pt.x} y="68" fill="#71717a" fontSize="8.5" textAnchor="middle">
                        {pt.session}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-50 border border-gray-200 text-[10.5px] text-zinc-500">
              📌 <strong>Data source:</strong> Live Attendance records from Class Studio · Validated across 24 enrolled students in Maple & Oak classes.
            </div>
          </section>

          {/* Live Class Analytics Card (Section 2.F) */}
          <section className="panel p-4 sm:p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Icon name="video" size={16} />
                  <span>Live Class & Session Workflows</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Conducted, scheduled, duration stats, and recording availability
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900">
                {overviewStats.totalSessions} Sessions Total
              </span>
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] font-semibold text-emerald-800 uppercase block">Completed</span>
                <strong className="text-base font-bold text-emerald-950 mt-0.5 block">
                  {overviewStats.completedSessions}
                </strong>
                <span className="text-[10px] text-emerald-700/80">330 mins broadcast</span>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
                <span className="text-[10px] font-semibold text-purple-800 uppercase block">Scheduled</span>
                <strong className="text-base font-bold text-purple-950 mt-0.5 block">
                  {overviewStats.upcomingSessions}
                </strong>
                <span className="text-[10px] text-purple-700/80">Upcoming on calendar</span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-[10px] font-semibold text-amber-800 uppercase block">Recordings</span>
                <strong className="text-base font-bold text-amber-950 mt-0.5 block">
                  3 Ready
                </strong>
                <span className="text-[10px] text-amber-700/80">1 Transcoding</span>
              </div>
            </div>

            {/* Live Class Session List */}
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {liveSessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="p-2.5 rounded-xl bg-zinc-50 hover:bg-purple-50/50 transition-colors border border-gray-150 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <strong className="text-zinc-900 block text-xs truncate">{session.title}</strong>
                    <span className="text-[10.5px] text-zinc-500">
                      {session.courseName} · {session.date} at {session.time} ({session.duration})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${session.status === "Completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : session.status === "Live Now"
                            ? "bg-red-100 text-red-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                    >
                      {session.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-50 border border-gray-200 text-[10.5px] text-zinc-500">
              💡 Sessions are confirmed as completed only when teacher uses the End Class workflow. Opening the studio does not mark sessions completed.
            </div>
          </section>
        </div>
      )}

      {/* ========================================================
          VIEW: AI LIVE MONITORING & RECORDING REVIEW (Section 2.G)
          ======================================================== */}
      {(activeTab === "overview" || activeTab === "ai_intelligence") && (
        <section className="panel p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-150 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <span className="text-lime-500">✦</span>
                <span>AI Live Monitoring & Lecture Recording Review Analytics</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Speech-to-text transcripts, chapter markers, executive summaries, and teacher correction proposals
              </p>
            </div>
            <span className="text-[10.5px] font-bold text-purple-900 bg-purple-100 px-2.5 py-1 rounded-md">
              Verified Transcripts · Demo Attention Scores
            </span>
          </div>

          {/* AI Intelligence Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100">
              <span className="text-[10px] font-semibold text-purple-900 uppercase block">Recordings Library</span>
              <strong className="text-lg font-bold text-purple-950 mt-0.5 block">
                {recordingReviewStats.availableRecordings} Available
              </strong>
              <span className="text-[10.5px] text-purple-700/80">
                +{recordingReviewStats.processingRecordings} Transcoding
              </span>
            </div>

            <div className="p-3 rounded-xl bg-lime-50/70 border border-lime-200">
              <span className="text-[10px] font-semibold text-lime-900 uppercase block">Whisper Transcripts</span>
              <strong className="text-lg font-bold text-lime-950 mt-0.5 block">
                100% Generated
              </strong>
              <span className="text-[10.5px] text-lime-800">
                Word-level timestamps for all 3 completed sessions
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-[10px] font-semibold text-amber-900 uppercase block">Lecture Chapters</span>
              <strong className="text-lg font-bold text-amber-950 mt-0.5 block">
                {recordingReviewStats.totalChaptersIndexed} Chapters
              </strong>
              <span className="text-[10.5px] text-amber-800">
                Auto-indexed segment boundaries
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-gray-200">
              <span className="text-[10px] font-semibold text-zinc-600 uppercase block">Teacher Proposals</span>
              <strong className="text-lg font-bold text-zinc-900 mt-0.5 block">
                {recordingReviewStats.acceptedProposals} Accepted
              </strong>
              <span className="text-[10.5px] text-zinc-500">
                {recordingReviewStats.pendingProposals} Pending review
              </span>
            </div>
          </div>

          {/* Teacher Correction Proposal Tracker Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-zinc-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800">
                Teacher Correction Suggestions & Proposals ({recordingReviewStats.totalProposals} Total)
              </span>
              <span className="text-[11px] text-zinc-500">
                Super Admin audit pipeline
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-[10.5px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-2 px-3">Session & Recording</th>
                    <th className="py-2 px-3">Proposal Title</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Submitted At</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recordingReviewStats.proposalsList.map((prop) => (
                    <tr key={prop.id} className="hover:bg-purple-50/40 transition-colors">
                      <td className="py-2 px-3 font-medium text-zinc-800">
                        {prop.recordingTitle}
                      </td>
                      <td className="py-2 px-3">
                        <strong className="text-zinc-900 block text-xs">{prop.proposedText}</strong>
                        <span className="text-[10px] text-zinc-400">Timestamp: {prop.timestamp}</span>
                      </td>
                      <td className="py-2 px-3 text-zinc-600">
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-gray-100 text-zinc-700 font-medium">
                          {prop.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-zinc-500 text-[11px]">
                        {prop.submittedAt}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${prop.status === "Accepted"
                              ? "bg-emerald-100 text-emerald-800"
                              : prop.status === "Pending Review"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                        >
                          {prop.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Teaching Suggestions Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recordingReviewStats.teachingSuggestions.map((sug) => (
              <div key={sug.id} className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-100 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wide">
                    {sug.category}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md text-[9.5px] font-bold bg-amber-100 text-amber-800">
                    {sug.priority} Priority
                  </span>
                </div>
                <strong className="text-xs font-bold text-zinc-900 leading-snug">
                  {sug.title}
                </strong>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  {sug.explanation}
                </p>
                <div className="mt-auto pt-2 border-t border-purple-100/60 text-[10.5px] font-medium text-purple-950">
                  ⚡ <strong>Action:</strong> {sug.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================
          EXISTING VISUAL DIAGNOSTIC CARDS (PRESERVED & INTEGRATED)
          ======================================================== */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <SubjectMasteryChartCard searchQuery={searchQuery} />
          <DiagnosticInterventionCard
            searchQuery={searchQuery}
            onAssignSkill={onAssignSkill}
          />
        </div>
      )}

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          <div className="lg:col-span-1">
            <CohortGrowthQuadrantCard
              onSelectStudentForReport={onSelectStudentForReport}
            />
          </div>
          <div className="lg:col-span-1">
            <SubmissionTimelinessCard />
          </div>
          <div className="lg:col-span-1">
            <AiDiagnosticDigestCard
              onOpenAiAssistant={onOpenAiAssistant}
              onShareDigest={onShareDigest}
            />
          </div>
        </div>
      )}

      {/* ========================================================
          INSPECT ASSIGNMENT SUBMISSIONS MODAL
          ======================================================== */}
      {inspectingAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-purple-50/70 border-b border-purple-100 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                  {inspectingAssignment.moduleId.toUpperCase()} · Module Assignment Inspection
                </span>
                <h3 className="text-sm font-bold text-zinc-900 mt-0.5">
                  {inspectingAssignment.title}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Due: {inspectingAssignment.dueDate} · Max Marks: {inspectingAssignment.maxMarks} · {inspectingAssignment.submissionsCount} of {inspectingAssignment.totalEnrolled} Received
                </p>
              </div>

              <button
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 cursor-pointer"
                onClick={() => setInspectingAssignment(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Search Filter Inside Modal */}
            <div className="px-5 py-2.5 border-b border-gray-150 bg-zinc-50/70 flex items-center gap-2">
              <Icon name="search" size={14} />
              <input
                type="text"
                placeholder="Filter student submissions by name..."
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                className="w-full text-xs bg-transparent outline-none text-zinc-800 placeholder-zinc-400"
              />
            </div>

            {/* Submissions Roster List */}
            <div className="p-5 overflow-y-auto divide-y divide-gray-150">
              {inspectingAssignment.submissions && inspectingAssignment.submissions.length > 0 ? (
                inspectingAssignment.submissions
                  .filter((s: StudentModuleSubmission) =>
                    submissionSearch.trim()
                      ? s.studentName.toLowerCase().includes(submissionSearch.toLowerCase()) ||
                      s.studentRoll.toLowerCase().includes(submissionSearch.toLowerCase())
                      : true
                  )
                  .map((sub: StudentModuleSubmission) => (
                    <div key={sub.studentId} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={sub.studentAvatar}
                          alt={sub.studentName}
                          className="w-8 h-8 rounded-full object-cover border border-purple-200"
                        />
                        <div>
                          <strong className="text-xs font-bold text-zinc-900 block">{sub.studentName}</strong>
                          <span className="text-[10px] text-zinc-400">
                            {sub.studentRoll} · Submitted: {sub.submittedAt}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {sub.score !== undefined ? (
                          <div className="text-right">
                            <span className="text-xs font-bold text-zinc-900">
                              {sub.score} / {sub.maxMarks}
                            </span>
                            <span className="text-[10px] text-emerald-600 block font-medium">Graded</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-600">Pending Review</span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sub.status === "Graded"
                              ? "bg-emerald-100 text-emerald-800"
                              : sub.status === "Submitted"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No submissions recorded for this assignment.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-zinc-50 border-t border-gray-150 flex items-center justify-between text-xs">
              <span className="text-zinc-500 text-[11px]">
                Read-only analytics view · Grading permissions active on Assignments portal
              </span>
              <button
                className="px-4 py-1.5 rounded-full bg-zinc-900 text-white font-bold hover:bg-black transition-colors cursor-pointer"
                onClick={() => setInspectingAssignment(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ========================================================
   PRESERVED COMPONENTS FOR INTEGRATION
   ======================================================== */

function SubjectMasteryChartCard({ searchQuery }: { searchQuery: string }) {
  const [timeframe, setTimeframe] = useState<"8w" | "4w" | "1w">("8w")
  const [selectedSubjectKey, setSelectedSubjectKey] = useState("math")

  const subjects = useMemo(
    () => [
      {
        key: "english",
        name: "English Language Arts",
        short: "English",
        hex: "#9860e9",
        mastery: 86,
        benchmark: 80,
        trendPoints: [72, 74, 76, 79, 81, 83, 85, 86],
        subskills: [
          { name: "Reading Comprehension & Inference", score: 91 },
          { name: "Vocabulary & Context Clues", score: 88 },
          { name: "Grammar & Complex Sentences", score: 79 },
        ],
      },
      {
        key: "math",
        name: "Mathematics & Reasoning",
        short: "Math",
        hex: "#a8ed00",
        mastery: 81,
        benchmark: 75,
        trendPoints: [65, 68, 70, 72, 75, 77, 80, 81],
        subskills: [
          { name: "Fractions & Mixed Numbers", score: 92 },
          { name: "Geometry & 2D Perimeters", score: 84 },
          { name: "Decimal Operations & Division", score: 68 },
        ],
      },
      {
        key: "science",
        name: "Natural Science & Discovery",
        short: "Science",
        hex: "#f2a6c7",
        mastery: 89,
        benchmark: 78,
        trendPoints: [70, 73, 75, 78, 82, 85, 88, 89],
        subskills: [
          { name: "Earth Weather Systems & Orbits", score: 94 },
          { name: "Forces, Magnetism & Energy", score: 86 },
          { name: "Scientific Observations & Lab", score: 87 },
        ],
      },
      {
        key: "art",
        name: "Creative Arts & Logic",
        short: "Art & Logic",
        hex: "#f8dc70",
        mastery: 94,
        benchmark: 82,
        trendPoints: [82, 84, 87, 89, 90, 92, 93, 94],
        subskills: [
          { name: "Color Harmony & Perspective", score: 96 },
          { name: "Visual Analysis & Structure", score: 92 },
          { name: "Creative Problem Solving", score: 94 },
        ],
      },
    ],
    []
  )

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects
    const q = searchQuery.toLowerCase()
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.short.toLowerCase().includes(q) ||
        s.subskills.some((sk) => sk.name.toLowerCase().includes(q))
    )
  }, [subjects, searchQuery])

  const activeSubject =
    filteredSubjects.find((s) => s.key === selectedSubjectKey) ||
    filteredSubjects[0] ||
    subjects[0]

  const getX = (idx: number) => 40 + idx * (520 / 7)
  const getY = (val: number) => {
    const clamped = Math.max(60, Math.min(100, val))
    return 155 - ((clamped - 60) / 40) * 130
  }

  const buildPath = (points: number[]) => {
    const pts = points.map((p, idx) => ({ x: getX(idx), y: getY(p) }))
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2
      const yc = (pts[i].y + pts[i + 1].y) / 2
      d += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`
    }
    d += ` T ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`
    return d
  }

  const buildAreaPath = (points: number[]) => {
    const linePath = buildPath(points)
    const lastX = getX(points.length - 1)
    const firstX = getX(0)
    return `${linePath} L ${lastX} 165 L ${firstX} 165 Z`
  }

  return (
    <section className="analytics-chart-card panel" aria-label="Subject Mastery & Growth Curve">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="card-title">Subject Mastery & Growth Curve</div>
          <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
            Cross-discipline trajectory · Class average vs 80% mastery target
          </div>
        </div>
        <div className="filter-pills">
          <button
            className={`filter-pill ${timeframe === "8w" ? "active" : ""}`}
            onClick={() => setTimeframe("8w")}
          >
            Term 1 (8 Wks)
          </button>
          <button
            className={`filter-pill ${timeframe === "4w" ? "active" : ""}`}
            onClick={() => setTimeframe("4w")}
          >
            Month (4 Wks)
          </button>
          <button
            className={`filter-pill ${timeframe === "1w" ? "active" : ""}`}
            onClick={() => setTimeframe("1w")}
          >
            Week
          </button>
        </div>
      </div>

      <div className="analytics-svg-wrapper">
        <svg viewBox="0 0 600 175" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="grad-active-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeSubject.hex} stopOpacity="0.25" />
              <stop offset="100%" stopColor={activeSubject.hex} stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow-line" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={activeSubject.hex} floodOpacity="0.35" />
            </filter>
          </defs>

          <line x1="30" y1="25" x2="570" y2="25" stroke="#edf0f5" strokeWidth="1" strokeDasharray="3 3" />
          <text x="24" y="28" fill="#9e9cb0" fontSize="9" fontWeight="500" textAnchor="end">100%</text>

          <line x1="30" y1="57.5" x2="570" y2="57.5" stroke="#edf0f5" strokeWidth="1" strokeDasharray="3 3" />
          <text x="24" y="60.5" fill="#9e9cb0" fontSize="9" fontWeight="500" textAnchor="end">90%</text>

          <line x1="30" y1="90" x2="570" y2="90" stroke="#c4b5fd" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x="24" y="93" fill="var(--purple)" fontSize="9" fontWeight="700" textAnchor="end">80%</text>
          <rect x="495" y="81" width="80" height="15" rx="4" fill="#f5f3ff" />
          <text x="535" y="92" fill="var(--purple-dark)" fontSize="8.5" fontWeight="700" textAnchor="middle">Target Goal 80%</text>

          <line x1="30" y1="122.5" x2="570" y2="122.5" stroke="#edf0f5" strokeWidth="1" strokeDasharray="3 3" />
          <text x="24" y="125.5" fill="#9e9cb0" fontSize="9" fontWeight="500" textAnchor="end">70%</text>

          <line x1="30" y1="155" x2="570" y2="155" stroke="#edf0f5" strokeWidth="1" />
          <text x="24" y="158" fill="#9e9cb0" fontSize="9" fontWeight="500" textAnchor="end">60%</text>

          {["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"].map((wk, idx) => (
            <text key={wk} x={getX(idx)} y="171" fill="#71717a" fontSize="9" fontWeight="500" textAnchor="middle">
              {wk}
            </text>
          ))}

          <path d={buildAreaPath(activeSubject.trendPoints)} fill="url(#grad-active-area)" />

          {subjects
            .filter((s) => s.key !== activeSubject.key)
            .map((s) => (
              <path
                key={s.key}
                d={buildPath(s.trendPoints)}
                fill="none"
                stroke={s.hex}
                strokeWidth="2"
                strokeOpacity="0.32"
                strokeLinecap="round"
              />
            ))}

          <path
            d={buildPath(activeSubject.trendPoints)}
            fill="none"
            stroke={activeSubject.hex}
            strokeWidth="3.2"
            strokeLinecap="round"
            filter="url(#glow-line)"
          />

          {activeSubject.trendPoints.map((pt, idx) => {
            const cx = getX(idx)
            const cy = getY(pt)
            const isLast = idx === activeSubject.trendPoints.length - 1
            return (
              <g key={idx}>
                <circle cx={cx} cy={cy} r={isLast ? "5.5" : "3.5"} fill="#fff" stroke={activeSubject.hex} strokeWidth={isLast ? "3" : "2"} />
                {isLast && (
                  <>
                    <rect x={cx - 16} y={cy - 20} width="32" height="15" rx="5" fill="#000" />
                    <text x={cx} y={cy - 10} fill="#fff" fontSize="9" fontWeight="700" textAnchor="middle">
                      {pt}%
                    </text>
                  </>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="analytics-subject-pills">
        {filteredSubjects.map((sub) => {
          const isSelected = sub.key === activeSubject.key
          const delta = sub.mastery - sub.benchmark
          return (
            <button
              key={sub.key}
              className={`analytics-subject-pill ${isSelected ? "active" : ""}`}
              onClick={() => setSelectedSubjectKey(sub.key)}
            >
              <span className="pill-dot" style={{ background: sub.hex }} />
              <span>{sub.name}</span>
              <strong className="text-black ml-1">{sub.mastery}%</strong>
              <span
                className="text-[9.5px] font-medium ml-1"
                style={{ color: delta >= 0 ? "#557c00" : "#d9534f" }}
              >
                ({delta >= 0 ? `+${delta}%` : `${delta}%`})
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function DiagnosticInterventionCard({
  searchQuery,
  onAssignSkill,
}: {
  searchQuery: string
  onAssignSkill?: (skillTitle: string, subjectType: string) => void
}) {
  const [activeFilter, setActiveFilter] = useState("All")

  const competencies = useMemo(
    () => [
      {
        id: "c1",
        topic: "Fractions: Addition & Mixed Denominators",
        subject: "Fractions Practice",
        passRate: 96,
        proficient: "23 of 24",
        status: "Mastered" as const,
        tone: "green" as const,
        detail: "Curriculum velocity is +1.4 weeks ahead of schedule. Exceptional student engagement.",
        btnText: "Assign Extension",
      },
      {
        id: "c2",
        topic: "Earth Systems: Weather & Planetary Orbits",
        subject: "Science Quiz",
        passRate: 92,
        proficient: "22 of 24",
        status: "Mastered" as const,
        tone: "green" as const,
        detail: "High concept retention on interactive solar diagrams and gravitational pull prompts.",
        btnText: "View Records",
      },
      {
        id: "c3",
        topic: "Decimal Division & Multi-Step Word Problems",
        subject: "Fractions Practice",
        passRate: 72,
        proficient: "17 of 24",
        status: "Review Needed" as const,
        tone: "yellow" as const,
        detail: "4 students need targeted support aligning decimal points in quotient step.",
        btnText: "+ Assign Recap",
      },
      {
        id: "c4",
        topic: "English Grammar: Subordinate Clauses & Commas",
        subject: "Grammar Worksheet",
        passRate: 64,
        proficient: "15 of 24",
        status: "At-Risk Alert" as const,
        tone: "purple" as const,
        detail: "6 students scored below 70%. 15-minute group modeling recommended before quiz.",
        btnText: "+ Assign Practice",
      },
    ],
    []
  )

  const filtered = useMemo(() => {
    let list = competencies
    if (activeFilter === "Review") {
      list = list.filter((c) => c.status === "Review Needed")
    } else if (activeFilter === "Risk") {
      list = list.filter((c) => c.status === "At-Risk Alert")
    } else if (activeFilter === "Mastered") {
      list = list.filter((c) => c.status === "Mastered")
    }

    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(
      (c) =>
        c.topic.toLowerCase().includes(q) ||
        c.detail.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
    )
  }, [competencies, activeFilter, searchQuery])

  return (
    <section className="diagnostic-card panel" aria-label="Curriculum Diagnostic & Learning Gaps">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="card-title">Skill Diagnostic & Intervention Matrix</div>
          <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
            Real-time competency health · Automated risk detection & teacher actions
          </div>
        </div>

        <div className="filter-pills">
          <button
            className={`filter-pill ${activeFilter === "All" ? "active" : ""}`}
            onClick={() => setActiveFilter("All")}
          >
            All
          </button>
          <button
            className={`filter-pill ${activeFilter === "Risk" ? "active" : ""}`}
            onClick={() => setActiveFilter("Risk")}
          >
            At-Risk
          </button>
          <button
            className={`filter-pill ${activeFilter === "Review" ? "active" : ""}`}
            onClick={() => setActiveFilter("Review")}
          >
            Needs Review
          </button>
          <button
            className={`filter-pill ${activeFilter === "Mastered" ? "active" : ""}`}
            onClick={() => setActiveFilter("Mastered")}
          >
            Mastered
          </button>
        </div>
      </div>

      <div className="diagnostic-list">
        {filtered.map((item) => (
          <div key={item.id} className="diagnostic-item">
            <div className="diagnostic-info">
              <div className="flex items-center gap-2">
                <strong>{item.topic}</strong>
                <span className={`status ${item.tone}`}>{item.status}</span>
              </div>
              <span>{item.detail}</span>
            </div>

            {onAssignSkill && (
              <button
                className="diagnostic-action-btn"
                onClick={() => onAssignSkill(item.topic, item.subject)}
              >
                {item.btnText}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function CohortGrowthQuadrantCard({
  onSelectStudentForReport,
}: {
  onSelectStudentForReport?: (studentName: string) => void
}) {
  const [selectedQuadrantId, setSelectedQuadrantId] = useState("accelerators")

  const quadrants = useMemo(
    () => [
      {
        id: "accelerators",
        label: "Accelerators",
        icon: "🚀",
        sublabel: "11 Students · 88-96% GPA",
        summary: "High Mastery & Rapid Growth",
        students: [
          { name: "Olivia Benett", rollNumber: "#Y4-101", image: "/assets/student-1.png", gpa: 88, growthRate: "+12%" },
          { name: "Ethan Davies", rollNumber: "#Y4-105", image: "/assets/student-5.png", gpa: 93, growthRate: "+14%" },
          { name: "Mia Anderson", rollNumber: "#Y4-112", image: "/assets/student-2.png", gpa: 91, growthRate: "+9%" },
        ],
      },
      {
        id: "fast_movers",
        label: "Fast Movers",
        icon: "📈",
        sublabel: "7 Students · 70-80% GPA",
        summary: "High Growth, Developing Mastery",
        students: [
          { name: "Liam Brooks", rollNumber: "#Y4-103", image: "/assets/student-3.png", gpa: 70, growthRate: "+18%" },
          { name: "Ava Patel", rollNumber: "#Y4-104", image: "/assets/student-4.png", gpa: 62, growthRate: "+16%" },
        ],
      },
      {
        id: "consistent",
        label: "Consistent",
        icon: "🛡️",
        sublabel: "4 Students · 84-88% GPA",
        summary: "Stable & Consistent Mastery",
        students: [
          { name: "Sophia Martinez", rollNumber: "#Y4-106", image: "/assets/student-6.png", gpa: 86, growthRate: "+4%" },
          { name: "Isabella Brown", rollNumber: "#Y4-110", image: "/assets/student-1.png", gpa: 85, growthRate: "+5%" },
        ],
      },
      {
        id: "priority",
        label: "Priority Focus",
        icon: "🎯",
        sublabel: "2 Students · < 68% GPA",
        summary: "Targeted 1-on-1 Intervention",
        students: [
          { name: "Lucas Chen", rollNumber: "#Y4-107", image: "/assets/student-7.png", gpa: 68, growthRate: "+3%" },
          { name: "Alexander Wright", rollNumber: "#Y4-111", image: "/assets/student-3.png", gpa: 71, growthRate: "+4%" },
        ],
      },
    ],
    []
  )

  const activeQuadrant = quadrants.find((q) => q.id === selectedQuadrantId) || quadrants[0]

  return (
    <section className="quadrant-card panel" aria-label="Cohort Growth Quadrant">
      <div className="card-header">
        <div>
          <div className="card-title">Cohort Growth Quadrant</div>
          <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
            Velocity vs Current GPA · 24 students mapped by learning momentum
          </div>
        </div>
      </div>

      <div className="quadrant-selector-grid">
        {quadrants.map((q) => {
          const isSelected = q.id === activeQuadrant.id
          return (
            <button
              key={q.id}
              className={`quadrant-selector-btn ${isSelected ? "active" : ""}`}
              onClick={() => setSelectedQuadrantId(q.id)}
            >
              <strong>
                <span>{q.icon}</span>
                <span>{q.label}</span>
              </strong>
              <span className="quadrant-sub">{q.sublabel}</span>
            </button>
          )
        })}
      </div>

      <div className="quadrant-roster-list">
        {activeQuadrant.students.map((student) => (
          <div
            key={student.rollNumber}
            className="quadrant-student-row hover:bg-purple-50/60 cursor-pointer transition-colors"
            onClick={() => onSelectStudentForReport?.(student.name)}
            title={`Send progress update for ${student.name}`}
          >
            <div className="quadrant-student-left">
              <img src={student.image} alt={student.name} />
              <div className="quadrant-student-meta">
                <strong>{student.name}</strong>
                <span>{student.rollNumber}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <strong className="text-black font-bold text-xs">{student.gpa}%</strong>
              <span className="quadrant-velocity-badge">{student.growthRate}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function SubmissionTimelinessCard() {
  return (
    <section className="timeliness-card panel" aria-label="Assignment Submission Timeliness">
      <div className="card-header">
        <div className="card-title">Submission Velocity & Timeliness</div>
        <span className="status green">96% On-Track</span>
      </div>

      <div className="timeliness-bar">
        <div style={{ width: "88%", background: "var(--lime)" }} title="88% Early & On-Time" />
        <div style={{ width: "8%", background: "#f8dc70" }} title="8% Grace Period (<24h)" />
        <div style={{ width: "4%", background: "#f2a6c7" }} title="4% Extended Extension" />
      </div>

      <div className="timeliness-stats-grid">
        <div className="timeliness-stat-box">
          <span>Avg. Turn-In</span>
          <strong>1.2 Days</strong>
        </div>
        <div className="timeliness-stat-box">
          <span>Final Completion</span>
          <strong>96.4%</strong>
        </div>
        <div className="timeliness-stat-box">
          <span>Ahead of Due</span>
          <strong>68%</strong>
        </div>
      </div>
    </section>
  )
}

function AiDiagnosticDigestCard({
  onOpenAiAssistant,
  onShareDigest,
}: {
  onOpenAiAssistant?: () => void
  onShareDigest?: () => void
}) {
  return (
    <section className="ai-digest-card" aria-label="Quantum AI Learning Synthesis">
      <div className="ai-digest-header">
        <div className="ai-digest-title">
          <span className="text-base text-[#f3ff9b]">✦</span>
          <span>Quantum AI Learning Diagnostics</span>
        </div>
        <span className="ai-digest-badge">Synthesized 10m ago</span>
      </div>

      <div className="ai-digest-body">
        <p className="mb-2">
          Analysis of <strong>148 recent submissions & assessments</strong> indicates strong conceptual acceleration across Year 4 (+8.4% monthly aggregate).
        </p>
      </div>

      <div className="ai-digest-actions">
        {onOpenAiAssistant && (
          <button
            className="flex-1 h-8 rounded-full bg-[#f3ff9b] text-black text-xs font-bold hover:bg-[#e4f57c] transition-colors flex items-center justify-center gap-1 shadow-sm"
            onClick={onOpenAiAssistant}
          >
            <span>✦</span>
            <span>Ask AI Diagnostic</span>
          </button>
        )}
        {onShareDigest && (
          <button
            className="flex-1 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
            onClick={onShareDigest}
          >
            Dispatch to Parents
          </button>
        )}
      </div>
    </section>
  )
}
