import { useState, useMemo } from "react"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"
import { MetricCard } from "../components/MetricCard"
import type {
  StudentNavPage,
  CourseItem,
  AssignmentData,
  QuizData,
} from "./student/studentTypes"
import { initialStudentCourses } from "./student/studentMockData"

interface StudentDashboardProps {
  onNavigate: (page: StudentNavPage, courseId?: string) => void
  onOpenAiModal: () => void
  onSwitchToTeacher: () => void
  onToast: (msg: string) => void
  hexColor: string
  onChangeHexColor: (c: string) => void
  courses?: CourseItem[]
  assignments?: AssignmentData[]
  quizzes?: QuizData[]
}

export default function StudentDashboardPage({
  onNavigate,
  onOpenAiModal,
  onSwitchToTeacher,
  onToast,
  hexColor,
  onChangeHexColor,
  courses = initialStudentCourses,
}: StudentDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [courseFilter, setCourseFilter] =
    useState<"All" | "In Progress" | "Completed">("All")
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isCertModalOpen, setIsCertModalOpen] = useState(false)
  const [chartTimeframe, setChartTimeframe] =
    useState<"This Week" | "Last Week" | "This Month">("This Week")
  const [isChartDropdownOpen, setIsChartDropdownOpen] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(
    {},
  )

  const filteredCourses = useMemo(() => {
    let list = courses
    if (courseFilter === "In Progress")
      list = courses.filter((c) => c.status === "In Progress")
    else if (courseFilter === "Completed")
      list = courses.filter((c) => c.status === "Completed")
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q),
    )
  }, [courses, courseFilter, searchQuery])

  // Recommended courses
  const recommendedCourses = [
    {
      id: "rec-1",
      title: "Prompt Engineering Deep Dive",
      image: "/assets/rec_prompt.jpg",
      rating: "4.8",
      reviews: "2.1k",
    },
    {
      id: "rec-2",
      title: "AI Agents in Practice",
      image: "/assets/student_hero_robot.jpg",
      rating: "4.9",
      reviews: "1.8k",
    },
    {
      id: "rec-3",
      title: "Computer Vision with Python",
      image: "/assets/rec_cv.jpg",
      rating: "4.7",
      reviews: "1.2k",
    },
  ]

  const toggleTask = (taskId: string, title: string) => {
    const nextState = !completedTasks[taskId]
    setCompletedTasks((prev) => ({ ...prev, [taskId]: nextState }))
    if (nextState) {
      onToast(`Completed task: "${title}"!`)
    }
  }

  return (
    <div className="student-dashboard-content w-full max-w-full min-w-0 h-full min-h-0 flex flex-col overflow-hidden box-border">
      {/* 1. Dashboard Header - Stationary, responsive, aligned and unclipped */}
      <header className="dashboard-header shrink-0 h-auto min-h-[54px] flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 mb-3 pl-12 lg:pl-0">
        <div className="min-w-0 py-0.5">
          <div className="greeting">
            <span>Good morning, Srimanth</span>
            <span className="wave-emoji" role="img" aria-label="wave">
              👋
            </span>
          </div>
          <div className="subtitle text-xs text-white/90 leading-tight">
            Keep learning. Build your AI skills. Make an impact.
          </div>
        </div>

        <div className="header-actions flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Search box */}
          <div className="search-box shrink-0">
            <Icon name="search" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, lessons or topics..."
              aria-label="Search courses"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Portal Switcher */}
          <button
            onClick={onSwitchToTeacher}
            className="px-3 h-[35px] rounded-full bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-purple-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Switch to Teacher View"
          >
            <span>👨‍🏫 Teacher Portal</span>
          </button>

          {/* Background Hex Color Picker */}
          <div className="shrink-0">
            <HexColorField hexColor={hexColor} onChangeHex={onChangeHexColor} />
          </div>

          {/* Ask AI Black Pill Button */}
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

      {/* 2. Independently Scrollable Dashboard Body */}
      <div className="student-scroll-viewport flex-1 min-h-0 w-full max-w-full overflow-y-auto pr-1 pb-12 space-y-4 box-border">
        {/* Top Metric Cards (4) - Folder Tab Cut Cards */}
        <section className="metrics-grid" aria-label="Student Learning Metrics">
        <div
          onClick={() => onNavigate("My Courses")}
          className="cursor-pointer"
        >
          <MetricCard
            item={{
              label: "Active Courses",
              value: `${courses.length}`,
              trend: "↗ +2 this term",
              tone: "lavender",
              icon: "book",
            }}
          />
        </div>
        <div
          onClick={() => onNavigate("Attendance")}
          className="cursor-pointer"
        >
          <MetricCard
            item={{
              label: "Attendance Rate",
              value: "96.2%",
              trend: "↗ Top 5% rank",
              tone: "lime",
              icon: "check",
            }}
          />
        </div>
        <div
          onClick={() => onNavigate("Assignments")}
          className="cursor-pointer"
        >
          <MetricCard
            item={{
              label: "Pending Tasks",
              value: "3 Due",
              trend: "2 labs, 1 quiz",
              tone: "pink",
              icon: "document",
            }}
          />
        </div>
        <div onClick={() => onNavigate("Grades")} className="cursor-pointer">
          <MetricCard
            item={{
              label: "Current GPA",
              value: "3.88 / 4.0",
              trend: "↗ Dean's List",
              tone: "yellow",
              icon: "trend",
            }}
          />
        </div>
      </section>

      {/* 3. Main Content Grid - Same 2-Column Responsive Split */}
      <div className="content-grid">
        {/* Left Column (Hero Continue Learning, My Courses, Recommendations) */}
        <div className="left-column">
          {/* Featured Hero: Continue Learning Banner (Teacher Maple Class Theme) */}
          <section
            className="student-hero-banner student-hero-lime"
            aria-label="Continue Learning"
          >
            <div className="student-hero-content">
              <span className="student-hero-badge-black">
                CONTINUE LEARNING
              </span>
              <h2 className="student-hero-title-dark">
                Generative AI Masterclass
              </h2>
              <p className="student-hero-sub-dark">
                Module 4 · RAG Applications
              </p>
              <div className="student-hero-meta-dark">
                Lesson 3 of 8 · 18 min left
              </div>

              <div className="student-hero-actions">
                <button
                  className="student-hero-btn-dark cursor-pointer"
                  onClick={() => {
                    onToast("Opening Generative AI Masterclass curriculum...")
                    onNavigate("Course Details", "c-1")
                  }}
                >
                  <Icon name="play" size={14} />
                  <span>Continue Learning</span>
                </button>
                <button
                  className={`student-hero-bookmark-dark cursor-pointer ${
                    isBookmarked ? "active" : ""
                  }`}
                  onClick={() => {
                    setIsBookmarked(!isBookmarked)
                    onToast(
                      isBookmarked
                        ? "Removed from bookmarks"
                        : "Bookmarked module for later!",
                    )
                  }}
                  aria-label="Bookmark module"
                >
                  <Icon name="bookmark" size={16} />
                </button>
              </div>
            </div>

            {/* Seamless Blended Floating AI Robot Visual */}
            <div className="student-hero-visual-seamless">
              <img
                src="/assets/robot_transparent.png"
                alt="AI Assistant 3D Visual"
                className="student-hero-robot-blend"
              />
              <div className="student-hero-progress-lime">
                <span className="student-progress-label-lime">
                  64% complete
                </span>
                <div className="student-progress-track-lime">
                  <div
                    className="student-progress-fill-lime"
                    style={{ width: "64%" }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* My Courses Card */}
          <section
            className="panel student-shared-panel"
            aria-label="My Courses"
          >
            <div className="card-header">
              <h3 className="card-title">My Courses</h3>
              <div className="student-filter-pills">
                {(["All", "In Progress", "Completed"] as const).map(
                  (filter) => {
                    const count =
                      filter === "All"
                        ? courses.length
                        : filter === "In Progress"
                          ? courses.filter((c) => c.status === "In Progress")
                              .length
                          : courses.filter((c) => c.status === "Completed")
                              .length
                    const isActive = courseFilter === filter
                    return (
                      <button
                        key={filter}
                        className={`student-filter-pill ${
                          isActive ? "active" : ""
                        }`}
                        onClick={() => setCourseFilter(filter)}
                      >
                        {filter} ({count})
                      </button>
                    )
                  },
                )}
                <button
                  className="view-all ml-1 cursor-pointer"
                  onClick={() => onNavigate("My Courses")}
                >
                  View all
                </button>
              </div>
            </div>

            {/* Courses Grid */}
            <div className="student-courses-grid">
              {filteredCourses.map((course) => (
                <div key={course.id} className="student-course-card">
                  <div className="student-course-thumb-box">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="student-course-thumb"
                    />
                    <div className="student-course-status-pill">
                      {course.status}
                    </div>
                  </div>

                  <div className="student-course-info">
                    <h4 className="student-course-title" title={course.title}>
                      {course.title}
                    </h4>

                    {/* Progress Bar & Percentage */}
                    <div className="student-course-bar-row">
                      <div className="student-course-track">
                        <div
                          className="student-course-fill"
                          style={{
                            width: `${course.progress}%`,
                            backgroundColor: course.progressColor,
                          }}
                        />
                      </div>
                      <span className="student-course-pct">
                        {course.progress}%
                      </span>
                    </div>

                    {/* Last Watched & Action */}
                    <div className="student-course-bottom">
                      <div className="student-course-watched">
                        <span className="student-watched-label">
                          Last watched
                        </span>
                        <span
                          className="student-watched-topic"
                          title={course.lastWatched}
                        >
                          {course.lastWatched}
                        </span>
                      </div>
                      <button
                        className="student-play-circle-btn cursor-pointer"
                        onClick={() => {
                          onToast(`Opening "${course.title}"...`)
                          onNavigate("Course Details", course.id)
                        }}
                        title={`Resume ${course.title}`}
                      >
                        <Icon name="play" size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recommended for You Card */}
          <section
            className="panel student-shared-panel"
            aria-label="Recommended for You"
          >
            <div className="card-header">
              <h3 className="card-title">Recommended Programs</h3>
              <button
                className="view-all cursor-pointer"
                onClick={() => onNavigate("My Courses")}
              >
                View all
              </button>
            </div>

            <div className="student-rec-grid">
              {recommendedCourses.map((item) => (
                <div key={item.id} className="student-rec-card">
                  <div className="student-rec-img-box">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="student-rec-img"
                    />
                  </div>
                  <div className="student-rec-body">
                    <h4 className="student-rec-title" title={item.title}>
                      {item.title}
                    </h4>
                    <div className="student-rec-bottom-row">
                      <div className="student-rec-rating">
                        <span className="text-amber-500 text-xs">★</span>
                        <strong className="text-xs font-bold text-zinc-900">
                          {item.rating}
                        </strong>
                        <span className="text-[11px] text-zinc-400">
                          ({item.reviews})
                        </span>
                      </div>
                      <button
                        className="student-rec-arrow-btn cursor-pointer"
                        onClick={() => onNavigate("My Courses")}
                        title="Enroll / Preview"
                      >
                        <Icon name="chevron-right" size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column (Upcoming Live Classes, Tasks, Certificates, Learning Progress) */}
        <div className="right-column">
          {/* 1. Upcoming Live Classes Card */}
          <section
            className="panel student-shared-panel"
            aria-label="Upcoming Live Classes"
          >
            <div className="card-header">
              <h3 className="card-title">Today's Class Schedule</h3>
              <button
                className="view-all cursor-pointer"
                onClick={() => onNavigate("Timetable")}
              >
                View Timetable →
              </button>
            </div>

            <div className="student-classes-list">
              {/* Class 1 - LIVE */}
              <div className="student-class-item live-active">
                <div className="student-date-box lavender">
                  <span className="student-date-month">OCT</span>
                  <span className="student-date-day">21</span>
                </div>
                <div className="student-class-details">
                  <div className="student-class-title">Building AI Agents</div>
                  <div className="student-class-instructor">with Srimanth</div>
                  <div className="student-class-time">
                    <span className="live-dot" />
                    <span>06:00 PM - 07:30 PM</span>
                  </div>
                </div>
                <button
                  className="student-join-live-btn cursor-pointer"
                  onClick={() =>
                    onToast("Connecting to live interactive stream...")
                  }
                >
                  <Icon name="radio" size={13} />
                  <span>Join Live</span>
                </button>
              </div>

              {/* Class 2 */}
              <div className="student-class-item">
                <div className="student-date-box lavender">
                  <span className="student-date-month">OCT</span>
                  <span className="student-date-day">22</span>
                </div>
                <div className="student-class-details">
                  <div className="student-class-title">RAG Systems Lab</div>
                  <div className="student-class-instructor">with Srimanth</div>
                  <div className="student-class-time">
                    <span>10:00 AM - 11:30 AM</span>
                  </div>
                </div>
                <button
                  className="student-cal-btn cursor-pointer"
                  onClick={() =>
                    onToast("Added 'RAG Systems Lab' to calendar reminder!")
                  }
                >
                  <Icon name="calendar" size={13} />
                  <span>Calendar</span>
                </button>
              </div>

              {/* Class 3 */}
              <div className="student-class-item">
                <div className="student-date-box lavender">
                  <span className="student-date-month">OCT</span>
                  <span className="student-date-day">23</span>
                </div>
                <div className="student-class-details">
                  <div className="student-class-title">Neural Networks Lab</div>
                  <div className="student-class-instructor">with Srimanth</div>
                  <div className="student-class-time">
                    <span>02:00 PM - 03:30 PM</span>
                  </div>
                </div>
                <button
                  className="student-cal-btn cursor-pointer"
                  onClick={() =>
                    onToast("Added 'Neural Networks Lab' to calendar!")
                  }
                >
                  <Icon name="calendar" size={13} />
                  <span>Calendar</span>
                </button>
              </div>
            </div>
          </section>

          {/* Assigned Faculty Mentor Widget */}
          <section
            className="panel student-shared-panel p-4 bg-gradient-to-r from-purple-50/70 to-white border border-purple-100 shadow-sm"
            aria-label="Faculty Mentor"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  Assigned Mentor
                </span>
                <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Available Now
                </span>
              </div>
              <button
                className="text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                onClick={() => onNavigate("Mentor Details")}
              >
                Profile & Hours →
              </button>
            </div>

            <div className="flex items-center gap-3">
              <img
                src="/assets/srimanth.png"
                alt="Prof. Srimanth Adep"
                className="w-11 h-11 rounded-2xl object-cover border border-purple-200 shadow-sm"
              />
              <div className="flex-1 min-w-0 text-xs">
                <strong className="text-zinc-900 font-bold block truncate">
                  Prof. Srimanth Adep
                </strong>
                <span className="text-zinc-500 text-[11px] block truncate">
                  Lead Professor · AI Research Fellow
                </span>
              </div>
              <button
                onClick={() => {
                  onToast("Opening Mentor Details & 1:1 Meeting...")
                  onNavigate("Mentor Details")
                }}
                className="px-3 py-1.5 rounded-full bg-purple-700 text-white text-[11px] font-bold hover:bg-purple-800 transition-colors cursor-pointer shadow-sm whitespace-nowrap"
              >
                1:1 Meeting
              </button>
            </div>
          </section>

          {/* 2. Your Next Tasks Card */}
          <section
            className="panel student-shared-panel"
            aria-label="Your Next Tasks"
          >
            <div className="card-header">
              <h3 className="card-title">Your Next Tasks</h3>
              <button
                className="view-all cursor-pointer"
                onClick={() => onNavigate("Assignments")}
              >
                View all →
              </button>
            </div>

            <div className="student-tasks-list">
              {/* Task 1 */}
              <div
                className={`student-task-item cursor-pointer ${
                  completedTasks["t1"] ? "completed" : ""
                }`}
                onClick={() =>
                  toggleTask("t1", "Submit Project 1: RAG Pipeline")
                }
              >
                <div className="student-task-icon-box lavender">
                  <Icon name="document" size={16} />
                </div>
                <div className="student-task-info">
                  <div className="student-task-title">
                    Submit Project 1: RAG Pipeline
                  </div>
                  <div className="student-task-meta">
                    Generative AI Masterclass
                  </div>
                </div>
                <span className="status orange">Due Oct 22</span>
              </div>

              {/* Task 2 */}
              <div
                className={`student-task-item cursor-pointer ${
                  completedTasks["t2"] ? "completed" : ""
                }`}
                onClick={() => onNavigate("Quizzes")}
              >
                <div className="student-task-icon-box pink">
                  <Icon name="clock" size={16} />
                </div>
                <div className="student-task-info">
                  <div className="student-task-title">
                    Quiz 4: Vector Embeddings
                  </div>
                  <div className="student-task-meta">Module 4 · 10 MCQs</div>
                </div>
                <span className="status orange">Due Oct 24</span>
              </div>

              {/* Task 3 */}
              <div
                className={`student-task-item cursor-pointer ${
                  completedTasks["t3"] ? "completed" : ""
                }`}
                onClick={() => toggleTask("t3", "Peer Review")}
              >
                <div className="student-task-icon-box yellow">
                  <Icon name="users" size={16} />
                </div>
                <div className="student-task-info">
                  <div className="student-task-title">
                    Peer Review: Agent Architectures
                  </div>
                  <div className="student-task-meta">AI Agents Bootcamp</div>
                </div>
                <span className="status yellow">Pending</span>
              </div>

              {/* Task 4 */}
              <div
                className={`student-task-item cursor-pointer ${
                  completedTasks["t4"] ? "completed" : ""
                }`}
                onClick={() => toggleTask("t4", "Complete Lesson 5")}
              >
                <div className="student-task-icon-box lime">
                  <Icon name="play" size={16} />
                </div>
                <div className="student-task-info">
                  <div className="student-task-title">Complete Lesson 5</div>
                  <div className="student-task-meta">
                    Machine Learning Foundations
                  </div>
                </div>
                <span className="status gray">Not Started</span>
              </div>
            </div>
          </section>

          {/* 3. Certificates Card */}
          <section
            className="panel student-shared-panel"
            aria-label="Certificates"
          >
            <div className="card-header">
              <h3 className="card-title">Earned Credentials</h3>
              <button
                className="view-all cursor-pointer"
                onClick={() => onNavigate("Certificates")}
              >
                View all →
              </button>
            </div>

            <div className="student-cert-card-inner">
              <div className="student-cert-badge-icon">
                <Icon name="award" size={24} />
              </div>
              <div className="student-cert-meta">
                <div className="student-cert-title">Python for AI</div>
                <div className="student-cert-sub">
                  Verified Credential with Distinction
                </div>
              </div>
              <button
                className="student-cert-view-btn cursor-pointer"
                onClick={() => setIsCertModalOpen(true)}
              >
                View Certificate
              </button>
            </div>
          </section>

          {/* 4. Learning Progress (Weekly Bar Chart) */}
          <section
            className="panel student-shared-panel"
            aria-label="Learning Progress"
          >
            <div className="card-header relative">
              <h3 className="card-title">Learning Progress</h3>
              <div className="relative">
                <button
                  type="button"
                  className="student-chart-dropdown cursor-pointer flex items-center gap-1.5"
                  onClick={() => setIsChartDropdownOpen(!isChartDropdownOpen)}
                >
                  <span>{chartTimeframe}</span>
                  <span className="text-[10px]">{isChartDropdownOpen ? "▲" : "▼"}</span>
                </button>

                {isChartDropdownOpen && (
                  <div className="absolute right-0 top-8 z-30 bg-white rounded-xl shadow-lg border border-zinc-200 py-1 min-w-[120px] text-xs font-semibold">
                    {(["This Week", "Last Week", "This Month"] as const).map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => {
                          setChartTimeframe(tf)
                          setIsChartDropdownOpen(false)
                          onToast(`Viewing learning analytics for ${tf}`)
                        }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-purple-50 transition-colors cursor-pointer ${
                          chartTimeframe === tf ? "text-purple-700 font-bold bg-purple-50/50" : "text-zinc-700"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div className="student-chart-container">
              <div className="student-chart-y-axis">
                <span>{chartTimeframe === "This Month" ? "20h" : "4h"}</span>
                <span>{chartTimeframe === "This Month" ? "10h" : "2h"}</span>
                <span>0h</span>
              </div>

              <div className="student-chart-bars">
                {(chartTimeframe === "This Week"
                  ? [
                      { day: "Mon", height: "42%", val: "1.5h" },
                      { day: "Tue", height: "65%", val: "2.6h" },
                      { day: "Wed", height: "50%", val: "2.0h" },
                      { day: "Thu", height: "85%", val: "3.4h", active: true },
                      { day: "Fri", height: "25%", val: "1.0h" },
                      { day: "Sat", height: "60%", val: "2.4h" },
                      { day: "Sun", height: "40%", val: "1.6h" },
                    ]
                  : chartTimeframe === "Last Week"
                  ? [
                      { day: "Mon", height: "55%", val: "2.2h" },
                      { day: "Tue", height: "70%", val: "2.8h" },
                      { day: "Wed", height: "60%", val: "2.4h", active: true },
                      { day: "Thu", height: "45%", val: "1.8h" },
                      { day: "Fri", height: "80%", val: "3.2h" },
                      { day: "Sat", height: "30%", val: "1.2h" },
                      { day: "Sun", height: "50%", val: "2.0h" },
                    ]
                  : [
                      { day: "W1", height: "60%", val: "12h" },
                      { day: "W2", height: "75%", val: "15h" },
                      { day: "W3", height: "85%", val: "17h", active: true },
                      { day: "W4", height: "68%", val: "13.6h" },
                    ]
                ).map((item) => (
                  <div key={item.day} className="student-chart-col">
                    <div className="student-chart-bar-track">
                      <div
                        className={`student-chart-bar-fill ${
                          item.active ? "highlight" : ""
                        }`}
                        style={{ height: item.height }}
                        title={`${item.day}: ${item.val}`}
                      />
                    </div>
                    <span className="student-chart-day-label">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom 3 Stats */}
            <div className="student-chart-stats-row">
              <div className="student-chart-stat-item">
                <span className="student-chart-stat-icon green">
                  <Icon name="clock" size={13} />
                </span>
                <div>
                  <div className="student-chart-stat-val">
                    {chartTimeframe === "This Week" ? "14.5h" : chartTimeframe === "Last Week" ? "15.6h" : "57.6h"}
                  </div>
                  <div className="student-chart-stat-lbl">Study time</div>
                </div>
              </div>

              <div className="student-chart-stat-item">
                <span className="student-chart-stat-icon purple">
                  <Icon name="book" size={13} />
                </span>
                <div>
                  <div className="student-chart-stat-val">
                    {chartTimeframe === "This Week" ? "12" : chartTimeframe === "Last Week" ? "14" : "48"}
                  </div>
                  <div className="student-chart-stat-lbl">Lessons</div>
                </div>
              </div>

              <div className="student-chart-stat-item">
                <span className="student-chart-stat-icon cyan">
                  <Icon name="check" size={13} />
                </span>
                <div>
                  <div className="student-chart-stat-val">
                    {chartTimeframe === "This Week" ? "3" : chartTimeframe === "Last Week" ? "4" : "11"}
                  </div>
                  <div className="student-chart-stat-lbl">Quizzes</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      </div>

      {/* Certificate Modal */}
      {isCertModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsCertModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Icon name="award" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Official Certificate
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Quantum School of AI · Verified Credential
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCertModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="my-6 p-6 border-2 border-dashed border-purple-200 rounded-2xl bg-purple-50/40 text-center">
              <div className="text-xs uppercase tracking-widest font-bold text-purple-600 mb-2">
                Certificate of Completion
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-1">
                Python for AI
              </h2>
              <p className="text-sm text-zinc-600 mb-4">
                This credential certifies that{" "}
                <strong className="text-black">Srimanth</strong> has
                successfully mastered Python for Data Analysis, NumPy, Pandas,
                and Neural Architectures.
              </p>
              <div className="flex justify-center items-center gap-6 text-xs text-zinc-500">
                <span>Issued: October 18, 2026</span>
                <span>•</span>
                <span>Credential ID: QAI-88392-PY</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-full border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                onClick={() => {
                  const certText =
                    "===========================================================\n" +
                    "       QUANTUM SCHOOL OF AI - CERTIFICATE OF DISTINCTION  \n" +
                    "===========================================================\n" +
                    "Recipient: Srimanth (QS-2024-8821)\n" +
                    "Course: Python for AI (PY-201)\n" +
                    "Grade: A+ (98.4%) · Dean's Honor List\n" +
                    "Credential ID: QAI-88392-PY\n" +
                    "Issue Date: October 18, 2026\n" +
                    "Blockchain Verification Hash: 0x98A1B2C3D4E5F67890ABCDEF\n" +
                    "Issuer: Quantum School of AI Academic Registry\n"
                  const blob = new Blob([certText], { type: "text/plain;charset=utf-8;" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "Quantum_Certificate_Python_for_AI.txt"
                  a.click()
                  URL.revokeObjectURL(url)
                  setIsCertModalOpen(false)
                  onToast("Certificate downloaded successfully! 🎓")
                }}
              >
                Download PDF
              </button>
              <button
                className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer"
                onClick={() => {
                  navigator.clipboard?.writeText?.("https://verify.quantumschool.ai/cert/QAI-88392-PY")
                  setIsCertModalOpen(false)
                  onToast("Credential verification link copied to clipboard! 🔗")
                }}
              >
                Share Credential
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
