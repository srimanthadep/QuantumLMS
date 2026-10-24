import { useState, useMemo } from "react"
import { Icon } from "../../components/Icon"
import type { CourseItem, StudentNavPage } from "./studentTypes"

interface MyCoursesPageProps {
  courses: CourseItem[]
  catalog: CourseItem[]
  onSelectCourse: (courseId: string) => void
  onNavigate: (page: StudentNavPage) => void
  onToast: (msg: string) => void
  onEnrollCourse: (course: CourseItem) => void
}

type EnrolledFilter = "All" | "In Progress" | "Completed"
type CourseSort = "recent" | "name" | "progress"

export function MyCoursesPage({
  courses,
  catalog,
  onSelectCourse,
  onNavigate,
  onToast,
  onEnrollCourse,
}: MyCoursesPageProps) {
  // Mode: "enrolled" shows enrolled courses + the Explore Courses card; "catalogue" shows the course catalogue
  const [viewMode, setViewMode] = useState<"enrolled" | "catalogue">("enrolled")
  const [filter, setFilter] = useState<EnrolledFilter>("All")
  const [search, setSearch] = useState("")
  const [catalogueSearch, setCatalogueSearch] = useState("")
  const [sortBy, setSortBy] = useState<CourseSort>("recent")
  const [expandedDescriptions, setExpandedDescriptions] = useState<
    Record<string, boolean>
  >({})

  const toggleDescription = (courseId: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }))
  }

  // Filter and sort enrolled courses only (excluding catalog courses from main list)
  const filteredEnrolledCourses = useMemo(() => {
    let list: CourseItem[] = []

    if (filter === "All") {
      list = [...courses]
    } else if (filter === "In Progress") {
      list = courses.filter((c) => c.status === "In Progress")
    } else if (filter === "Completed") {
      list = courses.filter((c) => c.status === "Completed")
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.instructor.toLowerCase().includes(q) ||
          c.level.toLowerCase().includes(q),
      )
    }

    // Apply sorting
    const sorted = [...list]
    if (sortBy === "name") {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === "progress") {
      sorted.sort((a, b) => b.progress - a.progress)
    }

    return sorted
  }, [courses, filter, search, sortBy])

  // Filtered catalogue courses
  const filteredCatalogueCourses = useMemo(() => {
    let list = [...catalog]
    if (catalogueSearch.trim()) {
      const q = catalogueSearch.toLowerCase()
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.instructor.toLowerCase().includes(q) ||
          c.level.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      )
    }
    return list
  }, [catalog, catalogueSearch])

  // Counts for tabs
  const allCount = courses.length
  const inProgressCount = courses.filter((c) => c.status === "In Progress").length
  const completedCount = courses.filter((c) => c.status === "Completed").length
  const catalogCount = catalog.length

  const handleOpenCourse = (courseId: string) => {
    onSelectCourse(courseId)
    onNavigate("Course Details")
  }

  const handleEnrollAndOpen = (course: CourseItem) => {
    onEnrollCourse(course)
    onToast(`Enrolled in "${course.title}" successfully! 🎉`)
    onSelectCourse(course.id)
    onNavigate("Course Details")
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full min-w-0 box-border">
      {/* =========================================================================
          VIEW A: ENROLLED COURSES VIEW + SINGLE EXPLORE COURSES CARD
          ========================================================================= */}
      {viewMode === "enrolled" ? (
        <>
          {/* 1. Header and Filters Section */}
          <section
            className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-100 shadow-sm w-full max-w-full min-w-0 box-border"
            aria-label="My Courses Controls"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                    My Courses
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F0EDFF] text-[#5F2BC0] border border-purple-100 shrink-0">
                    {courses.length} Enrolled
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-zinc-500 mt-1 font-normal break-words">
                  Continue learning, review syllabi, and track your milestone progress across enrolled courses.
                </p>
              </div>

              {/* Filter Tabs (Pill Buttons) */}
              <div className="flex flex-wrap gap-2 shrink-0">
                {(
                  [
                    { id: "All" as const, label: "All Courses", count: allCount },
                    {
                      id: "In Progress" as const,
                      label: "In Progress",
                      count: inProgressCount,
                    },
                    {
                      id: "Completed" as const,
                      label: "Completed",
                      count: completedCount,
                    },
                  ] as const
                ).map((tab) => {
                  const isActive = filter === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setFilter(tab.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-[#905FEB] text-white shadow-xs"
                          : "bg-[#F0EDFF] text-[#5F2BC0] hover:bg-[#E4DFFD]"
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  )
                })}

                {/* Explore Catalogue Switcher Tab */}
                <button
                  onClick={() => setViewMode("catalogue")}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer bg-white border border-purple-200 text-[#5F2BC0] hover:bg-purple-50 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  title="Explore Course Catalogue"
                >
                  <Icon name="compass" size={13} />
                  <span>Explore Catalogue ({catalogCount})</span>
                </button>
              </div>
            </div>

            {/* Search & Sort Controls Row */}
            <div className="mt-4 pt-3.5 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              {/* Search bar */}
              <div className="relative w-full max-w-md min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Icon name="search" size={14} />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search enrolled courses by title, instructor, or topic..."
                  className="w-full pl-9 pr-8 py-2 rounded-full text-xs bg-zinc-50 border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-[#905FEB] transition-all box-border"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer font-bold"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Sorting dropdown and item count */}
              <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap min-w-0">
                <div className="flex items-center gap-2 text-xs text-zinc-600 shrink-0">
                  <span className="font-semibold text-zinc-500 whitespace-nowrap">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as CourseSort)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-50 border border-zinc-200 text-zinc-800 focus:outline-none focus:border-[#905FEB] cursor-pointer"
                  >
                    <option value="recent">Recently Accessed</option>
                    <option value="name">Course Name (A–Z)</option>
                    <option value="progress">Highest Progress</option>
                  </select>
                </div>

                <span className="text-xs text-zinc-400 font-medium whitespace-nowrap hidden sm:inline">
                  Showing <strong className="text-zinc-700 font-bold">{filteredEnrolledCourses.length}</strong> {filteredEnrolledCourses.length === 1 ? "course" : "courses"}
                </span>
              </div>
            </div>
          </section>

          {/* 2. Responsive Grid Layout:
              Enrolled Course Cards + Single Explore Courses Card
              - Wide screens: 3 cards per row
              - Medium screens: 2 cards per row
              - Small screens: 1 card per row
          */}
          <div className="student-courses-grid w-full max-w-full min-w-0 box-border">
            {/* Render Enrolled Course Cards */}
            {filteredEnrolledCourses.map((course) => {
              const isCompleted = course.status === "Completed"
              const isInProgress = course.status === "In Progress"
              const isExpanded = !!expandedDescriptions[course.id]

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-zinc-100 hover:border-purple-200 shadow-sm hover:shadow-md transition-all p-3.5 sm:p-4 flex flex-col justify-between h-full group min-w-0 max-w-full box-border overflow-hidden"
                >
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* A. Course Cover Image with Category & Status Badges */}
                    <div
                      className="relative rounded-xl overflow-hidden h-28 sm:h-32 mb-2.5 bg-zinc-900 flex-shrink-0 cursor-pointer shadow-xs w-full max-w-full"
                      onClick={() => handleOpenCourse(course.id)}
                    >
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25" />

                      {/* Overlaid Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center gap-2 pointer-events-none min-w-0">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-black/60 text-white backdrop-blur-md shadow-xs truncate max-w-[60%]">
                          {course.category}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase backdrop-blur-md shadow-xs shrink-0 ${
                            isCompleted
                              ? "bg-[#E7FF9C] text-[#385000] border border-[#AEEB00]"
                              : "bg-[#905FEB] text-white"
                          }`}
                        >
                          {course.status}
                        </span>
                      </div>
                    </div>

                    {/* B. Course Title & Instructor Details */}
                    <div className="mb-2 min-w-0">
                      <h3
                        className="font-bold text-[14.5px] sm:text-[15.5px] text-zinc-900 leading-snug hover:text-[#905FEB] transition-colors line-clamp-2 cursor-pointer break-words"
                        onClick={() => handleOpenCourse(course.id)}
                        title={course.title}
                      >
                        {course.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-zinc-500 mt-1 min-w-0">
                        <span className="truncate max-w-full">
                          Instructor: <strong className="text-zinc-800 font-bold">{course.instructor}</strong>
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-zinc-600 shrink-0">{course.credits} Credits</span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold text-[10.5px] shrink-0">
                          {course.level}
                        </span>
                      </div>
                    </div>

                    {/* C. Course Description with View More */}
                    <div className="mb-2.5 text-[12px] sm:text-[12.5px] text-zinc-600 leading-[17px] min-w-0">
                      <p className={`break-words ${isExpanded ? "" : "line-clamp-2"}`}>
                        {course.description}
                      </p>
                      {course.description.length > 85 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleDescription(course.id)
                          }}
                          className="text-[11px] font-bold text-[#905FEB] hover:text-[#7E4BDC] hover:underline cursor-pointer mt-0.5 inline-block"
                        >
                          {isExpanded ? "View Less" : "View More"}
                        </button>
                      )}
                    </div>

                    {/* D. Module Completion & Progress Section */}
                    <div className="mb-2.5 bg-zinc-50/90 p-2.5 sm:p-3 rounded-xl border border-zinc-100 mt-auto min-w-0">
                      <div className="flex justify-between items-center text-[11.5px] sm:text-xs mb-1.5 font-bold min-w-0 gap-2">
                        <span className="text-zinc-700 truncate">
                          {course.completedModules} of {course.totalModules} Modules Completed
                        </span>
                        <span
                          className={`text-xs sm:text-[13px] font-extrabold shrink-0 ${
                            isCompleted ? "text-[#385000]" : "text-[#905FEB]"
                          }`}
                        >
                          {course.progress}%
                        </span>
                      </div>

                      {/* Capsule Progress Bar */}
                      <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden mb-1.5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${course.progress}%`,
                            backgroundColor: isCompleted ? "#AEEB00" : (course.progressColor || "#905FEB"),
                          }}
                        />
                      </div>

                      {/* Activity and Milestone Details */}
                      <div className="flex flex-wrap items-center justify-between text-[10.5px] sm:text-[11px] text-zinc-500 gap-1 pt-0.5 min-w-0">
                        <span
                          className="font-medium flex items-center gap-1.5 truncate max-w-full"
                          title={`Last Activity: ${course.lastWatched}`}
                        >
                          <span className="shrink-0">📍</span>
                          <span className="truncate">{course.lastWatched}</span>
                        </span>
                        <span
                          className="font-bold text-zinc-700 flex items-center gap-1 truncate max-w-full"
                          title={`Milestone: ${course.nextMilestone}`}
                        >
                          <span className="shrink-0">🎯</span>
                          <span className="truncate">{course.nextMilestone}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* E. Bottom Actions Row */}
                  <div className="flex flex-wrap items-center justify-between pt-2.5 border-t border-zinc-100 gap-2 mt-auto min-w-0">
                    {/* Course Rating */}
                    {course.rating ? (
                      <div className="flex items-center gap-1 text-[11.5px] font-bold text-amber-500 shrink-0">
                        <span className="text-xs">★</span>
                        <span className="text-zinc-800 font-bold">{course.rating}</span>
                        {course.reviews && (
                          <span className="text-zinc-400 font-normal text-[10.5px]">
                            ({course.reviews})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-zinc-400 font-semibold truncate">
                        Verified Course
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isInProgress && (
                        <button
                          onClick={() => handleOpenCourse(course.id)}
                          className="px-3.5 py-1.5 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-[11.5px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all whitespace-nowrap"
                          title="Resume Learning"
                        >
                          <Icon name="play" size={11} />
                          <span>Resume</span>
                        </button>
                      )}

                      {isCompleted && (
                        <button
                          onClick={() => handleOpenCourse(course.id)}
                          className="px-3.5 py-1.5 rounded-full bg-[#111111] hover:bg-zinc-800 text-white text-[11.5px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all whitespace-nowrap"
                          title="Review Completed Course Materials"
                        >
                          <Icon name="check" size={11} />
                          <span>View Course</span>
                        </button>
                      )}

                      {!isInProgress && !isCompleted && (
                        <button
                          onClick={() => handleOpenCourse(course.id)}
                          className="px-3.5 py-1.5 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-[11.5px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all whitespace-nowrap"
                          title="Resume Learning"
                        >
                          <Icon name="play" size={11} />
                          <span>Resume</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* =====================================================================
                SECTION 2: SINGLE EXPLORE COURSES CARD
                Matches Noorly Soft UI, original purple & lime palette,
                and consistent sizing/spacing with the course grid.
                ===================================================================== */}
            <div
              onClick={() => setViewMode("catalogue")}
              className="bg-gradient-to-b from-[#F0EDFF]/70 via-white to-white rounded-2xl border-2 border-dashed border-purple-200 hover:border-[#905FEB] shadow-sm hover:shadow-md transition-all p-3.5 sm:p-4 flex flex-col justify-between h-full cursor-pointer group min-w-0 max-w-full box-border overflow-hidden"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setViewMode("catalogue")
                }
              }}
              aria-label="Explore Courses - Discover new skills and explore courses available to you"
            >
              <div className="flex-1 flex flex-col min-w-0">
                {/* Visual Exploration Banner matching card image height */}
                <div className="relative rounded-xl overflow-hidden h-28 sm:h-32 mb-2.5 bg-gradient-to-br from-[#905FEB] via-[#8048DE] to-[#5F2BC0] p-2.5 sm:p-3 flex flex-col justify-between text-white flex-shrink-0 shadow-xs group-hover:scale-[1.01] transition-transform min-w-0">
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold tracking-wide uppercase bg-black/30 backdrop-blur-md text-white border border-white/20 truncate">
                      Curriculum Catalogue
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold tracking-wide uppercase bg-[#E7FF9C] text-[#385000] shrink-0">
                      {catalogCount} Available
                    </span>
                  </div>

                  {/* Centered Exploration Icon */}
                  <div className="flex items-center gap-2.5 my-auto min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg sm:text-xl shadow-inner border border-white/30 group-hover:rotate-6 transition-transform shrink-0">
                      🧭
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold text-purple-200 uppercase tracking-wider truncate">
                        Expand Your Skills
                      </div>
                      <div className="text-[13.5px] sm:text-[15px] font-black text-white leading-tight truncate">
                        New Specializations
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/85 min-w-0">
                    <span className="whitespace-nowrap">✦ LLMs & Prompts</span>
                    <span>•</span>
                    <span className="whitespace-nowrap">✦ Computer Vision</span>
                    <span>•</span>
                    <span className="whitespace-nowrap">✦ Robotics</span>
                  </div>
                </div>

                {/* Heading & Mandatory Description */}
                <div className="mb-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[14.5px] sm:text-[15.5px] text-zinc-900 group-hover:text-[#905FEB] transition-colors leading-snug break-words">
                      Explore Courses
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-[#AEEB00] shrink-0" />
                  </div>
                  <p className="text-[11px] sm:text-xs text-zinc-600 leading-snug mt-1 font-normal break-words">
                    Discover new skills and explore courses available to you.
                  </p>
                </div>

                {/* Benefits / Curriculum Box */}
                <div className="mb-2.5 bg-[#F0EDFF]/60 p-2 sm:p-2.5 rounded-xl border border-purple-100 mt-auto text-[10.5px] sm:text-[11px] text-zinc-700 space-y-1 min-w-0">
                  <div className="flex items-start gap-1.5 font-medium min-w-0">
                    <span className="text-[#905FEB] font-bold shrink-0">✓</span>
                    <span className="break-words">Accredited curriculum with verified faculty credits</span>
                  </div>
                  <div className="flex items-start gap-1.5 font-medium min-w-0">
                    <span className="text-[#905FEB] font-bold shrink-0">✓</span>
                    <span className="break-words">Self-paced video modules, lab code & certifications</span>
                  </div>
                </div>
              </div>

              {/* Prominent Explore Courses Action Button */}
              <div className="pt-2.5 border-t border-zinc-100 mt-auto min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setViewMode("catalogue")
                  }}
                  className="w-full py-1.5 sm:py-2 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-[11.5px] font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer group-hover:shadow-md hover:scale-[1.01]"
                >
                  <Icon name="compass" size={13} />
                  <span>Explore Courses</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredEnrolledCourses.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-zinc-100 shadow-sm w-full max-w-full min-w-0 box-border">
              <p className="text-sm text-zinc-500">
                No enrolled courses found matching your search. Try adjusting your query or explore available courses.
              </p>
              <button
                onClick={() => setViewMode("catalogue")}
                className="mt-4 px-4 py-2 rounded-full bg-[#905FEB] text-white text-xs font-bold hover:bg-[#7E4BDC] cursor-pointer"
              >
                Browse Course Catalogue
              </button>
            </div>
          )}

        </>
      ) : (
        /* =========================================================================
           VIEW B: COURSE CATALOGUE VIEW (OPENED VIA EXPLORE COURSES)
           ========================================================================= */
        <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full max-w-full min-w-0 box-border">
          {/* Catalogue Header Bar */}
          <section
            className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-100 shadow-sm w-full max-w-full min-w-0 box-border"
            aria-label="Course Catalogue Header"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
              <div className="min-w-0">
                <button
                  onClick={() => setViewMode("enrolled")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5F2BC0] hover:text-[#905FEB] transition-colors cursor-pointer mb-2 px-3 py-1 rounded-full bg-[#F0EDFF] hover:bg-purple-100 w-fit shrink-0"
                >
                  <span>←</span>
                  <span>Back to My Courses</span>
                </button>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                    Course Catalogue
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E7FF9C] text-[#385000] border border-[#AEEB00] shrink-0">
                    {catalogCount} Available to Enroll
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-zinc-500 mt-1 font-normal break-words">
                  Discover new skills and explore courses available to you. Inspect syllabi, instructors, and enroll with a single click.
                </p>
              </div>

              {/* Back to Enrolled Courses Pill Button */}
              <button
                onClick={() => setViewMode("enrolled")}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#111111] hover:bg-zinc-800 text-white transition-all cursor-pointer shadow-xs self-start md:self-auto flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <span>View Enrolled Courses ({courses.length})</span>
              </button>
            </div>

            {/* Search within Catalogue */}
            <div className="mt-4 pt-3.5 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              <div className="relative w-full max-w-md min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Icon name="search" size={14} />
                </div>
                <input
                  type="text"
                  value={catalogueSearch}
                  onChange={(e) => setCatalogueSearch(e.target.value)}
                  placeholder="Search catalogue by skill, title, instructor, or level..."
                  className="w-full pl-9 pr-8 py-2 rounded-full text-xs bg-zinc-50 border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-[#905FEB] transition-all box-border"
                />
                {catalogueSearch && (
                  <button
                    onClick={() => setCatalogueSearch("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer font-bold"
                    aria-label="Clear catalogue search"
                  >
                    ×
                  </button>
                )}
              </div>

              <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">
                Showing <strong className="text-zinc-800 font-bold">{filteredCatalogueCourses.length}</strong> available {filteredCatalogueCourses.length === 1 ? "course" : "courses"}
              </span>
            </div>
          </section>

          {/* Catalogue Courses Grid */}
          <div className="student-courses-grid w-full max-w-full min-w-0 box-border">
            {filteredCatalogueCourses.map((course) => {
              const isExpanded = !!expandedDescriptions[course.id]

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-zinc-100 hover:border-purple-200 shadow-sm hover:shadow-md transition-all p-3.5 sm:p-4 flex flex-col justify-between h-full group min-w-0 max-w-full box-border overflow-hidden"
                >
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* Cover Image with Category & Catalog Badges */}
                    <div
                      className="relative rounded-xl overflow-hidden h-28 sm:h-32 mb-2.5 bg-zinc-900 flex-shrink-0 cursor-pointer shadow-xs w-full max-w-full"
                      onClick={() => handleOpenCourse(course.id)}
                    >
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25" />

                      <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center gap-2 pointer-events-none min-w-0">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-black/60 text-white backdrop-blur-md shadow-xs truncate max-w-[60%]">
                          {course.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-amber-500 text-white shadow-xs shrink-0">
                          Catalog
                        </span>
                      </div>
                    </div>

                    {/* Title & Instructor Details */}
                    <div className="mb-2 min-w-0">
                      <h3
                        className="font-bold text-[14.5px] sm:text-[15.5px] text-zinc-900 leading-snug hover:text-[#905FEB] transition-colors line-clamp-2 cursor-pointer break-words"
                        onClick={() => handleOpenCourse(course.id)}
                        title={course.title}
                      >
                        {course.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-zinc-500 mt-1 min-w-0">
                        <span className="truncate max-w-full">
                          Instructor: <strong className="text-zinc-800 font-bold">{course.instructor}</strong>
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-zinc-600 shrink-0">{course.credits} Credits</span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold text-[10.5px] shrink-0">
                          {course.level}
                        </span>
                      </div>
                    </div>

                    {/* Course Description with View More */}
                    <div className="mb-2.5 text-[12px] sm:text-[12.5px] text-zinc-600 leading-[17px] min-w-0">
                      <p className={`break-words ${isExpanded ? "" : "line-clamp-2"}`}>
                        {course.description}
                      </p>
                      {course.description.length > 85 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleDescription(course.id)
                          }}
                          className="text-[11px] font-bold text-[#905FEB] hover:text-[#7E4BDC] hover:underline cursor-pointer mt-0.5 inline-block"
                        >
                          {isExpanded ? "View Less" : "View More"}
                        </button>
                      )}
                    </div>

                    {/* Catalogue Metadata Box */}
                    <div className="mb-2.5 bg-zinc-50/90 p-2.5 sm:p-3 rounded-xl border border-zinc-100 mt-auto flex flex-col gap-1.5 min-w-0">
                      <div className="flex flex-wrap items-center justify-between text-xs text-zinc-800 font-semibold gap-1.5 min-w-0">
                        <span className="flex items-center gap-1.5 shrink-0 text-[11px] sm:text-xs">
                          <span>⏱</span>
                          <strong>{course.duration}</strong>
                        </span>
                        <span className="flex items-center gap-1.5 truncate text-[11px] sm:text-xs">
                          <span>📚</span>
                          <strong className="truncate">{course.totalModules} Modules</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#F0EDFF] text-[#5F2BC0] text-[10.5px] font-bold shrink-0">
                          {course.level}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-zinc-500 italic break-words">
                        Open enrollment • Verified accreditation on completion
                      </p>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between pt-2.5 border-t border-zinc-100 gap-2 mt-auto min-w-0">
                    {/* Course Rating */}
                    {course.rating ? (
                      <div className="flex items-center gap-1 text-[11.5px] font-bold text-amber-500 shrink-0">
                        <span className="text-xs">★</span>
                        <span className="text-zinc-800 font-bold">{course.rating}</span>
                        {course.reviews && (
                          <span className="text-zinc-400 font-normal text-[10.5px]">
                            ({course.reviews})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-zinc-400 font-semibold shrink-0">
                        Accredited
                      </div>
                    )}

                    {/* Buttons: View Details & Enroll in Course */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                      <button
                        onClick={() => handleOpenCourse(course.id)}
                        className="px-3 py-1.5 rounded-full bg-[#F0EDFF] hover:bg-[#E4DFFD] text-[#5F2BC0] text-[11.5px] font-bold border border-purple-200 transition-all cursor-pointer whitespace-nowrap"
                        title="View Course Syllabus & Details"
                      >
                        View Details
                      </button>

                      <button
                        onClick={() => handleEnrollAndOpen(course)}
                        className="px-3.5 py-1.5 rounded-full bg-[#111111] hover:bg-zinc-800 text-white text-[11.5px] font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-1.5"
                      >
                        <span>Enroll in Course</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Empty State for Catalogue */}
          {filteredCatalogueCourses.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-zinc-100 shadow-sm w-full max-w-full min-w-0 box-border">
              <p className="text-sm text-zinc-500">
                No catalogue courses found matching &quot;{catalogueSearch}&quot;.
              </p>
              <button
                onClick={() => setCatalogueSearch("")}
                className="mt-3 px-4 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold hover:bg-zinc-200 cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
