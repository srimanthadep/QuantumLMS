import { useState } from "react"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"
import { MetricCard } from "../components/MetricCard"

interface StudentDashboardProps {
  onOpenAiModal: () => void
  onSwitchToTeacher: () => void
  onToast: (msg: string) => void
  hexColor: string
  onChangeHexColor: (c: string) => void
}

export default function StudentDashboardPage({
  onOpenAiModal,
  onSwitchToTeacher,
  onToast,
  hexColor,
  onChangeHexColor,
}: StudentDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [courseFilter, setCourseFilter] = useState<"All" | "In Progress" | "Completed">("All")
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isCertModalOpen, setIsCertModalOpen] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({})

  // Course Data matching the attached design
  const allCourses = [
    {
      id: "c-1",
      title: "Generative AI Masterclass",
      image: "/assets/course_genai.jpg",
      progress: 64,
      status: "In Progress",
      lastWatched: "RAG Applications",
      progressColor: "#10b981",
    },
    {
      id: "c-2",
      title: "Python for AI",
      image: "/assets/course_python.jpg",
      progress: 42,
      status: "In Progress",
      lastWatched: "Data Analysis with Pandas",
      progressColor: "#3b82f6",
    },
    {
      id: "c-3",
      title: "Machine Learning",
      image: "/assets/course_ml.jpg",
      progress: 28,
      status: "In Progress",
      lastWatched: "Linear Regression",
      progressColor: "#8b5cf6",
    },
    {
      id: "c-4",
      title: "AI Agents Bootcamp",
      image: "/assets/course_agents.jpg",
      progress: 100,
      status: "Completed",
      lastWatched: "Autonomous Agent Architectures",
      progressColor: "#ec4899",
    },
  ]

  const filteredCourses = allCourses.filter((course) => {
    if (courseFilter === "In Progress") return course.status === "In Progress"
    if (courseFilter === "Completed") return course.status === "Completed"
    return true
  })

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
    <div className="student-dashboard-content">
      {/* 1. Dashboard Header - Identical to Teacher DashboardHeader */}
      <header className="dashboard-header">
        <div className="flex-shrink-0">
          <div className="greeting whitespace-nowrap">
            <span>Good evening, Srimanth</span>
            <span className="wave-emoji" role="img" aria-label="wave">👋</span>
          </div>
          <div className="subtitle whitespace-nowrap">
            Keep learning. Build your AI skills. Make an impact.
          </div>
        </div>

        <div className="header-actions">
          {/* Search box */}
          <div className="search-box">
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
            className="px-3 h-[35px] rounded-full bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-purple-700 transition-colors cursor-pointer"
            title="Switch to Teacher View"
          >
            <span>👨‍🏫 Teacher Portal</span>
          </button>

          {/* Background Hex Color Picker */}
          <HexColorField
            hexColor={hexColor}
            onChangeHex={onChangeHexColor}
          />

          {/* Ask AI Black Pill Button */}
          <button
            className="ask-ai"
            onClick={onOpenAiModal}
            aria-label="Ask AI Assistant"
          >
            <span>✦</span>
            Ask AI
          </button>
        </div>
      </header>

      {/* 2. Top Metric Cards (4) - Folder Tab Cut Cards with Teacher Color Tokens */}
      <section className="metrics-grid" aria-label="Student Learning Metrics">
        <MetricCard
          item={{
            label: "Active Courses",
            value: "4",
            trend: "↗ +2",
            tone: "lavender",
            icon: "book",
          }}
        />
        <MetricCard
          item={{
            label: "Learning Time",
            value: "6.5h",
            trend: "↗ +18%",
            tone: "lime",
            icon: "clock",
          }}
        />
        <MetricCard
          item={{
            label: "Lessons Completed",
            value: "28",
            trend: "↗ +12%",
            tone: "pink",
            icon: "check",
          }}
        />
        <MetricCard
          item={{
            label: "Learning Streak",
            value: "7 days",
            trend: "↗ +3",
            tone: "yellow",
            icon: "fire",
          }}
        />
      </section>

      {/* 3. Main Content Grid - Same 2-Column Responsive Split as Teacher Dashboard */}
      <div className="content-grid">
        {/* Left Column (Hero Continue Learning, My Courses, Recommendations) */}
        <div className="left-column">
          {/* Featured Hero: Continue Learning Banner (Teacher Maple Class Theme) */}
          <section className="student-hero-banner student-hero-lime" aria-label="Continue Learning">
            <div className="student-hero-content">
              <span className="student-hero-badge-black">CONTINUE LEARNING</span>
              <h2 className="student-hero-title-dark">Generative AI Masterclass</h2>
              <p className="student-hero-sub-dark">Module 4 · RAG Applications</p>
              <div className="student-hero-meta-dark">Lesson 3 of 8 · 18 min left</div>

              <div className="student-hero-actions">
                <button
                  className="student-hero-btn-dark"
                  onClick={() => onToast("Resuming Generative AI Masterclass: Lesson 3...")}
                >
                  <Icon name="play" size={14} />
                  <span>Continue Learning</span>
                </button>
                <button
                  className={`student-hero-bookmark-dark ${isBookmarked ? "active" : ""}`}
                  onClick={() => {
                    setIsBookmarked(!isBookmarked)
                    onToast(isBookmarked ? "Removed from bookmarks" : "Bookmarked module for later!")
                  }}
                  aria-label="Bookmark module"
                >
                  <Icon name="bookmark" size={16} />
                </button>
              </div>
            </div>

            {/* Seamless Blended Floating AI Robot Visual (Zero box/background) */}
            <div className="student-hero-visual-seamless">
              <img
                src="/assets/robot_transparent.png"
                alt="AI Assistant 3D Visual"
                className="student-hero-robot-blend"
              />
              <div className="student-hero-progress-lime">
                <span className="student-progress-label-lime">64% complete</span>
                <div className="student-progress-track-lime">
                  <div className="student-progress-fill-lime" style={{ width: "64%" }} />
                </div>
              </div>
            </div>
          </section>

          {/* My Courses Card (Teacher White Panel) */}
          <section className="panel student-shared-panel" aria-label="My Courses">
            <div className="card-header">
              <h3 className="card-title">My Courses</h3>
              <div className="student-filter-pills">
                {(["All", "In Progress", "Completed"] as const).map((filter) => {
                  const count =
                    filter === "All"
                      ? allCourses.length
                      : filter === "In Progress"
                      ? allCourses.filter((c) => c.status === "In Progress").length
                      : allCourses.filter((c) => c.status === "Completed").length
                  const isActive = courseFilter === filter
                  return (
                    <button
                      key={filter}
                      className={`student-filter-pill ${isActive ? "active" : ""}`}
                      onClick={() => setCourseFilter(filter)}
                    >
                      {filter} ({count})
                    </button>
                  )
                })}
                <button
                  className="view-all ml-1"
                  onClick={() => onToast("Viewing all catalog courses...")}
                >
                  View all
                </button>
              </div>
            </div>

            {/* Courses 4-Card Grid */}
            <div className="student-courses-grid">
              {filteredCourses.map((course) => (
                <div key={course.id} className="student-course-card">
                  <div className="student-course-thumb-box">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="student-course-thumb"
                    />
                    <div className="student-course-status-pill">{course.status}</div>
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
                      <span className="student-course-pct">{course.progress}%</span>
                    </div>

                    {/* Last Watched & Action */}
                    <div className="student-course-bottom">
                      <div className="student-course-watched">
                        <span className="student-watched-label">Last watched</span>
                        <span className="student-watched-topic" title={course.lastWatched}>
                          {course.lastWatched}
                        </span>
                      </div>
                      <button
                        className="student-play-circle-btn"
                        onClick={() => onToast(`Launching ${course.title}...`)}
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

          {/* Recommended for You Card (Teacher White Panel) */}
          <section className="panel student-shared-panel" aria-label="Recommended for You">
            <div className="card-header">
              <h3 className="card-title">Recommended for You</h3>
              <button
                className="view-all"
                onClick={() => onToast("Exploring all personalized AI recommendations...")}
              >
                View all
              </button>
            </div>

            <div className="student-rec-grid">
              {recommendedCourses.map((item) => (
                <div key={item.id} className="student-rec-card">
                  <div className="student-rec-img-box">
                    <img src={item.image} alt={item.title} className="student-rec-img" />
                  </div>
                  <div className="student-rec-body">
                    <h4 className="student-rec-title" title={item.title}>{item.title}</h4>
                    <div className="student-rec-bottom-row">
                      <div className="student-rec-rating">
                        <span className="text-amber-500 text-xs">★</span>
                        <strong className="text-xs font-bold text-zinc-900">{item.rating}</strong>
                        <span className="text-[11px] text-zinc-400">({item.reviews})</span>
                      </div>
                      <button
                        className="student-rec-arrow-btn"
                        onClick={() => onToast(`Opening course preview: ${item.title}`)}
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
          <section className="panel student-shared-panel" aria-label="Upcoming Live Classes">
            <div className="card-header">
              <h3 className="card-title">Upcoming Live Classes</h3>
              <button
                className="view-all"
                onClick={() => onToast("Opening full live classes timetable...")}
              >
                View all
              </button>
            </div>

            <div className="student-classes-list">
              {/* Class 1 - LIVE */}
              <div className="student-class-item live-active">
                <div className="student-date-box lavender">
                  <span className="student-date-month">OCT</span>
                  <span className="student-date-day">20</span>
                </div>
                <div className="student-class-details">
                  <div className="student-class-title">Building AI Agents</div>
                  <div className="student-class-instructor">with Srimanth</div>
                  <div className="student-class-time">
                    <span className="live-dot" />
                    <span>6:00 PM - 7:30 PM</span>
                  </div>
                </div>
                <button
                  className="student-join-live-btn"
                  onClick={() => onToast("Connecting to live interactive stream...")}
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
                  <div className="student-class-title">Fine-tuning LLMs</div>
                  <div className="student-class-instructor">with Srimanth</div>
                  <div className="student-class-time">
                    <span>6:00 PM - 7:30 PM</span>
                  </div>
                </div>
                <button
                  className="student-cal-btn"
                  onClick={() => onToast("Added 'Fine-tuning LLMs' to your calendar!")}
                >
                  <Icon name="calendar" size={13} />
                  <span>Add to Calendar</span>
                </button>
              </div>

              {/* Class 3 */}
              <div className="student-class-item">
                <div className="student-date-box lavender">
                  <span className="student-date-month">OCT</span>
                  <span className="student-date-day">25</span>
                </div>
                <div className="student-class-details">
                  <div className="student-class-title">AI Product Design</div>
                  <div className="student-class-instructor">with Srimanth</div>
                  <div className="student-class-time">
                    <span>6:00 PM - 7:30 PM</span>
                  </div>
                </div>
                <button
                  className="student-cal-btn"
                  onClick={() => onToast("Added 'AI Product Design' to your calendar!")}
                >
                  <Icon name="calendar" size={13} />
                  <span>Add to Calendar</span>
                </button>
              </div>
            </div>
          </section>

          {/* 2. Your Next Tasks Card */}
          <section className="panel student-shared-panel" aria-label="Your Next Tasks">
            <div className="card-header">
              <h3 className="card-title">Your Next Tasks</h3>
              <button
                className="view-all"
                onClick={() => onToast("Viewing all assignment tasks...")}
              >
                View all
              </button>
            </div>

            <div className="student-tasks-list">
              {/* Task 1 */}
              <div
                className={`student-task-item ${completedTasks["t1"] ? "completed" : ""}`}
                onClick={() => toggleTask("t1", "Submit Project 1")}
              >
                <div className="student-task-icon-box lavender">
                  <Icon name="document" size={16} />
                </div>
                <div className="student-task-info">
                  <div className="student-task-title">Submit Project 1</div>
                  <div className="student-task-meta">Generative AI Masterclass</div>
                </div>
                <span className="status orange">Due Oct 22</span>
              </div>

              {/* Task 2 */}
              <div
                className={`student-task-item ${completedTasks["t2"] ? "completed" : ""}`}
                onClick={() => toggleTask("t2", "Quiz: RAG Fundamentals")}
              >
                <div className="student-task-icon-box pink">
                  <Icon name="clock" size={16} />
                </div>
                <div className="student-task-info">
                  <div className="student-task-title">Quiz: RAG Fundamentals</div>
                  <div className="student-task-meta">Module 4</div>
                </div>
                <span className="status orange">Due Oct 24</span>
              </div>

              {/* Task 3 */}
              <div
                className={`student-task-item ${completedTasks["t3"] ? "completed" : ""}`}
                onClick={() => toggleTask("t3", "Peer Review")}
              >
                <div className="student-task-icon-box yellow">
                  <Icon name="users" size={16} />
                </div>
                <div className="student-task-info">
                  <div className="student-task-title">Peer Review</div>
                  <div className="student-task-meta">AI Product Design</div>
                </div>
                <span className="status yellow">Pending</span>
              </div>

              {/* Task 4 */}
              <div
                className={`student-task-item ${completedTasks["t4"] ? "completed" : ""}`}
                onClick={() => toggleTask("t4", "Complete Lesson 5")}
              >
                <div className="student-task-icon-box lime">
                  <Icon name="play" size={16} />
                </div>
                <div className="student-task-info">
                  <div className="student-task-title">Complete Lesson 5</div>
                  <div className="student-task-meta">Machine Learning</div>
                </div>
                <span className="status gray">Not Started</span>
              </div>
            </div>
          </section>

          {/* 3. Certificates Card */}
          <section className="panel student-shared-panel" aria-label="Certificates">
            <div className="card-header">
              <h3 className="card-title">Certificates</h3>
              <button
                className="view-all"
                onClick={() => onToast("Viewing all earned credentials...")}
              >
                View all
              </button>
            </div>

            <div className="student-cert-card-inner">
              <div className="student-cert-badge-icon">
                <Icon name="award" size={24} />
              </div>
              <div className="student-cert-meta">
                <div className="student-cert-title">Python for AI</div>
                <div className="student-cert-sub">Certificate of Completion</div>
              </div>
              <button
                className="student-cert-view-btn"
                onClick={() => setIsCertModalOpen(true)}
              >
                View Certificate
              </button>
            </div>
          </section>

          {/* 4. Learning Progress (Weekly Bar Chart) */}
          <section className="panel student-shared-panel" aria-label="Learning Progress">
            <div className="card-header">
              <h3 className="card-title">Learning Progress</h3>
              <div className="student-chart-dropdown">
                <span>This Week</span>
                <span className="text-[10px]">▼</span>
              </div>
            </div>

            {/* Visual 7-day Bar Chart */}
            <div className="student-chart-container">
              <div className="student-chart-y-axis">
                <span>4h</span>
                <span>2h</span>
                <span>0h</span>
              </div>

              <div className="student-chart-bars">
                {[
                  { day: "Mon", height: "42%", val: "1.5h" },
                  { day: "Tue", height: "65%", val: "2.6h" },
                  { day: "Wed", height: "50%", val: "2.0h" },
                  { day: "Thu", height: "85%", val: "3.4h", active: true },
                  { day: "Fri", height: "25%", val: "1.0h" },
                  { day: "Sat", height: "60%", val: "2.4h" },
                  { day: "Sun", height: "40%", val: "1.6h" },
                ].map((item) => (
                  <div key={item.day} className="student-chart-col">
                    <div className="student-chart-bar-track">
                      <div
                        className={`student-chart-bar-fill ${item.active ? "highlight" : ""}`}
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
                  <div className="student-chart-stat-val">6.5h</div>
                  <div className="student-chart-stat-lbl">Total time</div>
                </div>
              </div>

              <div className="student-chart-stat-item">
                <span className="student-chart-stat-icon purple">
                  <Icon name="book" size={13} />
                </span>
                <div>
                  <div className="student-chart-stat-val">12</div>
                  <div className="student-chart-stat-lbl">Lessons</div>
                </div>
              </div>

              <div className="student-chart-stat-item">
                <span className="student-chart-stat-icon cyan">
                  <Icon name="check" size={13} />
                </span>
                <div>
                  <div className="student-chart-stat-val">3</div>
                  <div className="student-chart-stat-lbl">Quizzes</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Certificate Modal */}
      {isCertModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCertModalOpen(false)}>
          <div className="student-cert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Icon name="award" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Official Certificate</h3>
                  <p className="text-xs text-zinc-500">Quantum School of AI · Verified Credential</p>
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
              <h2 className="text-2xl font-black text-zinc-900 mb-1">Python for AI</h2>
              <p className="text-sm text-zinc-600 mb-4">
                This credential certifies that <strong className="text-black">Srimanth</strong> has successfully mastered Python for Data Analysis, NumPy, Pandas, and Neural Architectures.
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
                  setIsCertModalOpen(false)
                  onToast("Downloading high-resolution certificate PDF...")
                }}
              >
                Download PDF
              </button>
              <button
                className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer"
                onClick={() => {
                  setIsCertModalOpen(false)
                  onToast("Certificate shared to LinkedIn profile!")
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
