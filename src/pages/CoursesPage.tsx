import { useState, useMemo, useEffect } from "react"
import type {
  MetricItem,
  CourseItem,
  StudentItem,
  CourseModuleItem,
  LessonItem,
  LessonMaterial,
} from "../types"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"
import { MetricCard } from "../components/MetricCard"
import { LessonContentInlineViewer } from "../components/LessonContentInlineViewer"
import { ModuleAssignmentSection } from "../components/ModuleAssignmentSection"
import { getModuleAssignment } from "../data/courseAssignmentsData"

interface CourseRouteState {
  level: "list" | "course"
  courseId: string | null
  moduleId: string | null
  lessonId: string | null
}

function parseCourseRoute(pathname: string): CourseRouteState {
  // Pattern: /teacher/courses/:courseId/modules/:moduleId/lessons/:lessonId
  const lessonMatch = pathname.match(
    /(?:teacher\/)?courses\/([^/]+)\/modules\/([^/]+)\/lessons\/([^/]+)/i
  )
  if (lessonMatch) {
    return {
      level: "course",
      courseId: lessonMatch[1],
      moduleId: lessonMatch[2],
      lessonId: lessonMatch[3],
    }
  }

  // Pattern: /teacher/courses/:courseId/modules/:moduleId
  const moduleMatch = pathname.match(
    /(?:teacher\/)?courses\/([^/]+)\/modules\/([^/]+)/i
  )
  if (moduleMatch) {
    return {
      level: "course",
      courseId: moduleMatch[1],
      moduleId: moduleMatch[2],
      lessonId: null,
    }
  }

  // Pattern: /teacher/courses/:courseId
  const courseMatch = pathname.match(/(?:teacher\/)?courses\/([^/]+)/i)
  if (courseMatch && courseMatch[1] !== "all" && courseMatch[1] !== "") {
    return {
      level: "course",
      courseId: courseMatch[1],
      moduleId: null,
      lessonId: null,
    }
  }

  return {
    level: "list",
    courseId: null,
    moduleId: null,
    lessonId: null,
  }
}

export function CoursesHeader({
  searchQuery,
  setSearchQuery,
  onOpenAiModal,
  hexColor,
  onChangeHexColor,
  totalCount,
  breadcrumbSubtitle,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenAiModal?: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  totalCount: number
  breadcrumbSubtitle?: string
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>My Courses</span>
        </div>
        <div className="subtitle">
          {breadcrumbSubtitle ||
            `${totalCount} assigned teaching courses · Year 4 STEM & AI cohorts`}
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search course name or code..."
            aria-label="Search courses by name or code"
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
        <HexColorField hexColor={hexColor} onChangeHex={onChangeHexColor} />
        {onOpenAiModal && (
          <button
            className="ask-ai"
            onClick={onOpenAiModal}
            aria-label="Ask AI assistant about courses"
          >
            <span>✦</span>
            Ask AI
          </button>
        )}
      </div>
    </header>
  )
}

function CourseCard({
  course,
  onViewCourse,
}: {
  course: CourseItem
  onViewCourse: (course: CourseItem) => void
}) {
  return (
    <div
      className="panel p-5 flex flex-col justify-between hover:shadow-md transition-all duration-200 border border-zinc-150 cursor-pointer group rounded-2xl bg-white"
      onClick={() => onViewCourse(course)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onViewCourse(course)
      }}
      aria-label={`Course: ${course.name}`}
    >
      <div>
        {/* Thumbnail and Badges */}
        <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3.5 bg-gray-100 border border-gray-100">
          <img
            src={course.thumbnail}
            alt={course.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/75 text-white backdrop-blur-xs shadow-xs">
              {course.code}
            </span>
          </div>
          <div className="absolute top-2.5 right-2.5">
            <span
              className={`status ${
                course.status === "Active"
                  ? "green"
                  : course.status === "Completed"
                  ? "purple"
                  : "yellow"
              }`}
            >
              {course.status}
            </span>
          </div>
        </div>

        {/* Title and Description */}
        <h3 className="font-bold text-sm text-zinc-900 group-hover:text-purple-700 transition-colors line-clamp-1">
          {course.name}
        </h3>
        <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
          {course.description}
        </p>

        {/* Meta Specs */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-[11px] text-zinc-600">
          <div className="flex items-center gap-1.5">
            <Icon name="users" size={14} />
            <span>{course.enrolledStudentsCount} Enrolled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="document" size={14} />
            <span>
              {course.modulesCount} Modules · {course.lessonsCount} Lessons
            </span>
          </div>
        </div>

        {/* Course Progress Bar */}
        <div className="mt-3.5">
          <div className="flex justify-between items-center text-[11px] mb-1">
            <span className="font-medium text-zinc-500">
              Average Student Progress
            </span>
            <span className="font-bold text-purple-700">
              {course.progress}%
            </span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[10.5px] font-normal text-zinc-400">
          {course.assignedClass}
        </span>
        <button
          type="button"
          className="view-details-btn cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onViewCourse(course)
          }}
          aria-label={`View course ${course.name}`}
        >
          <span>View Course Details →</span>
        </button>
      </div>
    </div>
  )
}

function CourseRow({
  course,
  onViewCourse,
}: {
  course: CourseItem
  onViewCourse: (course: CourseItem) => void
}) {
  return (
    <div
      className="panel p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 hover:shadow-md transition-all duration-200 border border-zinc-150 cursor-pointer group rounded-2xl bg-white"
      onClick={() => onViewCourse(course)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onViewCourse(course)
      }}
      aria-label={`Course: ${course.name}`}
    >
      {/* Left side: Thumbnail & Course Info */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        <div className="relative w-20 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100 border border-gray-100">
          <img
            src={course.thumbnail}
            alt={course.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-1 left-1">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/75 text-white backdrop-blur-xs">
              {course.code}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span
              className={`status ${
                course.status === "Active"
                  ? "green"
                  : course.status === "Completed"
                  ? "purple"
                  : "yellow"
              }`}
            >
              {course.status}
            </span>
            <span className="text-[10.5px] font-medium text-zinc-500">
              {course.term} · {course.assignedClass}
            </span>
          </div>

          <h3 className="font-bold text-sm text-zinc-900 group-hover:text-purple-700 transition-colors truncate">
            {course.name}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1 leading-relaxed">
            {course.description}
          </p>

          <div className="flex items-center gap-3 sm:gap-4 mt-2 text-[11px] text-zinc-600 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Icon name="users" size={13} />
              <span>
                <strong>{course.enrolledStudentsCount}</strong> Enrolled
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Icon name="document" size={13} />
              <span>
                <strong>{course.modulesCount}</strong> Modules ·{" "}
                <strong>{course.lessonsCount}</strong> Lessons
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-zinc-500">
              <span>
                Instructor: <strong>{course.instructor}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Progress Bar & View Details button */}
      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
        <div className="w-28 sm:w-36 text-right">
          <div className="flex justify-between items-center text-[11px] mb-1">
            <span className="font-medium text-zinc-500 text-[10px]">
              Avg Progress
            </span>
            <span className="font-bold text-purple-700">
              {course.progress}%
            </span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          className="view-details-btn cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onViewCourse(course)
          }}
          aria-label={`View course ${course.name}`}
        >
          <span>View Course Details →</span>
        </button>
      </div>
    </div>
  )
}

function NotFoundFallback({
  title,
  message,
  onReset,
  buttonLabel = "Return to All Courses",
}: {
  title: string
  message: string
  onReset: () => void
  buttonLabel?: string
}) {
  return (
    <div className="panel p-8 text-center bg-white rounded-2xl border border-gray-150 my-4 max-w-xl mx-auto shadow-sm">
      <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 grid place-items-center mx-auto mb-3">
        <Icon name="help" size={24} />
      </div>
      <h3 className="text-base font-bold text-zinc-900">{title}</h3>
      <p className="text-xs text-zinc-500 mt-1.5 max-w-md mx-auto leading-relaxed">
        {message}
      </p>
      <button
        onClick={onReset}
        className="mt-5 px-5 h-9 rounded-xl btn-primary text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-1.5"
      >
        <span>←</span>
        <span>{buttonLabel}</span>
      </button>
    </div>
  )
}

/* ========================================================
   COURSE DETAILS VIEW (Level: "course")
   Continuous Single-Page Learning Experience with Inline
   Modules, Inline Lessons, and Post-Module Assignments.
   ======================================================== */
function CourseDetailsView({
  course,
  allStudents,
  initialModuleId,
  initialLessonId,
  onBack,
  onSelectStudentDetails,
  onToast,
}: {
  course: CourseItem
  allStudents: StudentItem[]
  initialModuleId?: string | null
  initialLessonId?: string | null
  onBack: () => void
  onSelectStudentDetails?: (student: StudentItem) => void
  onToast?: (msg: string) => void
}) {
  const enrolledStudents = allStudents.filter((s) =>
    course.enrolledStudentIds.includes(s.id)
  )

  const completedModulesCount = course.modules.filter((m) => m.completed).length

  // Set of expanded module IDs - default expands the first module or initialModuleId
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(() => {
    const s = new Set<string>()
    if (initialModuleId && course.modules.some((m) => m.id === initialModuleId)) {
      s.add(initialModuleId)
    } else if (course.modules.length > 0) {
      s.add(course.modules[0].id)
    }
    return s
  })

  // Set of expanded lesson IDs - default expands initialLessonId
  const [expandedLessonIds, setExpandedLessonIds] = useState<Set<string>>(() => {
    const s = new Set<string>()
    if (initialLessonId) {
      s.add(initialLessonId)
    }
    return s
  })

  // Ensure initialModuleId/lessonId are expanded if route props change
  useEffect(() => {
    if (initialModuleId) {
      setExpandedModuleIds((prev) => {
        const next = new Set(prev)
        next.add(initialModuleId)
        return next
      })
    }
    if (initialLessonId) {
      setExpandedLessonIds((prev) => {
        const next = new Set(prev)
        next.add(initialLessonId)
        return next
      })
    }
  }, [initialModuleId, initialLessonId])

  const toggleModule = (moduleId: string) => {
    setExpandedModuleIds((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const expandAllModules = () => {
    setExpandedModuleIds(new Set(course.modules.map((m) => m.id)))
  }

  const collapseAllModules = () => {
    setExpandedModuleIds(new Set())
  }

  const toggleLesson = (lessonId: string) => {
    setExpandedLessonIds((prev) => {
      const next = new Set(prev)
      if (next.has(lessonId)) {
        next.delete(lessonId)
      } else {
        next.add(lessonId)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* 1. Top Navigation Bar (NO BREADCRUMBS) */}
      <div className="flex items-center justify-between gap-3 p-3 bg-white/90 backdrop-blur-xs rounded-xl border border-gray-150">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">
            ←
          </span>
          <span>Back to My Courses</span>
        </button>

        {/* Clear Section Title (Replacing Breadcrumbs) */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
            {course.code}
          </span>
          <h2 className="text-xs sm:text-sm font-bold text-zinc-900 truncate max-w-sm sm:max-w-md hidden sm:block">
            {course.name}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`status ${
              course.status === "Active"
                ? "green"
                : course.status === "Completed"
                ? "purple"
                : "yellow"
            }`}
          >
            {course.status}
          </span>
        </div>
      </div>

      {/* 2. Course Overview Banner */}
      <div className="panel p-5 bg-white rounded-2xl border border-zinc-150">
        <div className="flex flex-col md:flex-row gap-5 items-start">
          <img
            src={course.thumbnail}
            alt={course.name}
            className="w-full md:w-56 h-36 md:h-36 rounded-xl object-cover border border-gray-150 shrink-0 shadow-xs"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                {course.code}
              </span>
              <span className="text-xs font-semibold text-zinc-600">
                {course.term}
              </span>
              <span className="text-zinc-300">·</span>
              <span className="text-xs text-zinc-500">
                Class: <strong className="text-zinc-700">{course.assignedClass}</strong>
              </span>
              <span className="text-zinc-300">·</span>
              <span className="text-xs text-zinc-500">
                Lead Teacher: <strong className="text-zinc-700">{course.instructor}</strong>
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 leading-snug">
              {course.name}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-600 mt-2 leading-relaxed">
              {course.description}
            </p>

            <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-zinc-500 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg font-medium text-[11px]">
                <Icon name="sparkles" size={13} />
                <span>Admin-Verified Curriculum · Continuous Learning Experience</span>
              </div>
              <span className="text-[11px] text-zinc-400">
                Curriculum Content Managed by School Administration (Read Only)
              </span>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100">
          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 text-center">
            <span className="text-[10px] font-semibold text-purple-900 uppercase tracking-wide">
              Course Progress
            </span>
            <strong className="block text-xl font-bold text-purple-950 mt-0.5">
              {course.progress}%
            </strong>
            <span className="text-[10px] text-purple-800">
              Avg. Student Completion
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-lime-50/70 border border-lime-100 text-center">
            <span className="text-[10px] font-semibold text-lime-900 uppercase tracking-wide">
              Curriculum Scope
            </span>
            <strong className="block text-xl font-bold text-lime-950 mt-0.5">
              {course.modulesCount} Modules
            </strong>
            <span className="text-[10px] text-lime-800">
              {course.lessonsCount} Total Structured Lessons
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-yellow-50/70 border border-yellow-100 text-center">
            <span className="text-[10px] font-semibold text-yellow-900 uppercase tracking-wide">
              Enrolled Students
            </span>
            <strong className="block text-xl font-bold text-yellow-950 mt-0.5">
              {course.enrolledStudentsCount}
            </strong>
            <span className="text-[10px] text-yellow-800">
              Active Cohort Roster
            </span>
          </div>
        </div>
      </div>

      {/* 3. Combined Modules & Lessons Continuous Section */}
      <div className="panel p-5 bg-white rounded-2xl border border-zinc-150">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="card-title text-sm sm:text-base">
              Course Curriculum & Modules
            </h3>
            <p className="text-[11.5px] text-zinc-500 mt-0.5">
              {completedModulesCount} of {course.modules.length} modules completed
              · Click any module to expand its lessons, resources, and assignment inline
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAllModules}
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAllModules}
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Sequential Modules List */}
        <div className="space-y-4">
          {course.modules.map((mod, index) => {
            const isModuleExpanded = expandedModuleIds.has(mod.id)
            const completedLessons = mod.lessons.filter((l) => l.completed).length
            const assignment = mod.assignment ?? getModuleAssignment(course.id, mod.id)

            return (
              <div
                key={mod.id}
                className={`rounded-2xl border transition-all ${
                  isModuleExpanded
                    ? "bg-purple-50/20 border-purple-300 shadow-xs"
                    : "bg-gray-50/70 hover:bg-purple-50/30 border-gray-150"
                }`}
              >
                {/* Module Header Bar (Click to toggle expansion) */}
                <div
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                  onClick={() => toggleModule(mod.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") toggleModule(mod.id)
                  }}
                  aria-expanded={isModuleExpanded}
                  aria-label={`Module ${index + 1}: ${mod.title}`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <span
                      className={`w-8 h-8 rounded-full text-xs font-bold grid place-items-center shrink-0 mt-0.5 transition-colors ${
                        isModuleExpanded
                          ? "bg-purple-700 text-white"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-purple-700">
                          Module {index + 1}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            mod.completed
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {mod.completed ? "Completed" : "In Progress"}
                        </span>
                        <span className="text-zinc-300">·</span>
                        <span className="text-xs text-zinc-500 font-medium">
                          {mod.lessons.length} Lessons
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-zinc-900 leading-snug">
                        {mod.title}
                      </h4>

                      {mod.description && !isModuleExpanded && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-1 leading-relaxed">
                          {mod.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress & Expand Indicator */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-200">
                    <div className="w-24 sm:w-28 text-right">
                      <div className="flex justify-between items-center text-[10.5px] mb-1">
                        <span className="text-zinc-500 font-medium">Progress</span>
                        <span className="font-bold text-purple-700">
                          {mod.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${mod.progress}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 h-8 rounded-xl bg-white border border-gray-200 hover:border-purple-300 text-purple-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleModule(mod.id)
                      }}
                    >
                      <span>{isModuleExpanded ? "Collapse" : "Expand"}</span>
                      <span className={`text-[10px] transition-transform duration-200 ${isModuleExpanded ? "rotate-180" : ""}`}>
                        ▼
                      </span>
                    </button>
                  </div>
                </div>

                {/* EXPANDED MODULE CONTENT */}
                {isModuleExpanded && (
                  <div className="px-4 pb-5 sm:px-5 space-y-4 border-t border-purple-100 pt-4 animate-in fade-in duration-200">
                    {/* Module Description & Objectives */}
                    {mod.description && (
                      <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed">
                        {mod.description}
                      </p>
                    )}

                    {mod.objectives && mod.objectives.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100">
                        <span className="text-[10.5px] font-bold text-purple-950 uppercase tracking-wide block mb-2">
                          Module Objectives & Expected Competencies
                        </span>
                        <ul className="space-y-1.5 text-xs text-purple-900/90 pl-1">
                          {mod.objectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-purple-600 font-bold shrink-0">✓</span>
                              <span className="leading-relaxed">{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* SEQUENTIAL LESSONS SECTION */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-900 mb-1">
                        <span>Lessons in Module {index + 1} ({mod.lessons.length})</span>
                        <span className="text-[11px] font-normal text-zinc-500">
                          {completedLessons} of {mod.lessons.length} completed
                        </span>
                      </div>

                      {mod.lessons.map((lesson, lessonIndex) => {
                        const isLessonExpanded = expandedLessonIds.has(lesson.id)

                        return (
                          <div
                            key={lesson.id}
                            className={`rounded-xl border transition-all ${
                              isLessonExpanded
                                ? "bg-white border-purple-400 ring-2 ring-purple-100 shadow-xs"
                                : "bg-white hover:bg-purple-50/40 border-gray-200"
                            }`}
                          >
                            {/* Lesson Row Header */}
                            <div
                              className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                              onClick={() => toggleLesson(lesson.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") toggleLesson(lesson.id)
                              }}
                              aria-expanded={isLessonExpanded}
                              aria-label={`Lesson ${lessonIndex + 1}: ${lesson.title}`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span
                                  className={`w-6 h-6 rounded-md text-[11px] font-bold grid place-items-center shrink-0 ${
                                    isLessonExpanded
                                      ? "bg-purple-700 text-white"
                                      : "bg-purple-50 text-purple-700 border border-purple-200"
                                  }`}
                                >
                                  {lessonIndex + 1}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <strong className="text-xs sm:text-sm font-bold text-zinc-900 truncate">
                                      {lesson.title}
                                    </strong>
                                    <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-gray-100 text-zinc-600">
                                      {lesson.type}
                                    </span>
                                    <span className="text-[10.5px] text-zinc-400 font-mono">
                                      ⏱ {lesson.duration}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    lesson.completed
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {lesson.completed ? "Completed" : "In Progress"}
                                </span>

                                <button
                                  type="button"
                                  className={`px-2.5 h-7 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                    isLessonExpanded
                                      ? "bg-purple-100 text-purple-900 border border-purple-200"
                                      : "bg-gray-100 hover:bg-gray-200 text-zinc-700"
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleLesson(lesson.id)
                                  }}
                                >
                                  <span>{isLessonExpanded ? "Close" : "Open Lesson"}</span>
                                  <span className={`text-[9px] transition-transform duration-200 ${isLessonExpanded ? "rotate-180" : ""}`}>
                                    ▼
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* INLINE EXPANDED LESSON VIEWER */}
                            {isLessonExpanded && (
                              <div className="px-3 pb-3 sm:px-4 sm:pb-4 border-t border-purple-100">
                                <LessonContentInlineViewer
                                  lesson={lesson}
                                  moduleIndex={index}
                                  lessonIndex={lessonIndex}
                                  onToast={onToast}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* ASSIGNMENT SECTION (POSITIONED AFTER EVERY MODULE'S LESSONS) */}
                    <div className="pt-2">
                      <ModuleAssignmentSection
                        assignment={assignment}
                        moduleTitle={mod.title}
                        moduleIndex={index}
                        onToast={onToast}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. Enrolled Students Roster */}
      <div className="panel p-5 bg-white rounded-2xl border border-zinc-150">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="card-title text-sm sm:text-base">
              Enrolled Students ({enrolledStudents.length})
            </h3>
            <p className="text-[11.5px] text-zinc-500 mt-0.5">
              Active student cohort for {course.name}. Click any student card to view comprehensive student analytics and their activity heatmap.
            </p>
          </div>
          <span className="text-[11px] text-zinc-500 font-medium">
            Cohort Class: <strong>{course.assignedClass}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {enrolledStudents.map((st) => (
            <div
              key={st.id}
              className="p-2.5 rounded-xl bg-gray-50 hover:bg-purple-50/50 border border-gray-150 hover:border-purple-300 transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
              onClick={() => onSelectStudentDetails?.(st)}
              title={`View ${st.name}'s profile and activity heatmap`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={st.image || "/assets/student-1.png"}
                  alt={st.name}
                  className="w-8 h-8 rounded-lg object-cover border border-gray-200 shrink-0"
                />
                <div className="min-w-0">
                  <strong className="block text-xs text-zinc-900 group-hover:text-purple-700 transition-colors truncate">
                    {st.name}
                  </strong>
                  <span className="text-[10px] text-zinc-500">
                    {st.rollNumber}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-purple-700">
                  {st.completion}%
                </span>
                <span className="block text-[9.5px] text-zinc-400">Progress</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ========================================================
   MODULE DETAILS VIEW (Level: "module")
   ======================================================== */
function ModuleDetailsView({
  course,
  moduleItem,
  onBackToCourses,
  onBackToCourse,
  onSelectLesson,
}: {
  course: CourseItem
  moduleItem: CourseModuleItem
  onBackToCourses?: () => void
  onBackToCourse: () => void
  onSelectLesson: (lesson: LessonItem) => void
}) {
  const modIndex = course.modules.findIndex((m) => m.id === moduleItem.id)
  const completedLessonsCount = moduleItem.lessons.filter((l) => l.completed).length
  const totalLessonsCount = moduleItem.lessons.length
  const remainingLessonsCount = totalLessonsCount - completedLessonsCount
  const calculatedProgress =
    totalLessonsCount > 0
      ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
      : moduleItem.progress

  return (
    <div className="space-y-4" aria-label="Module Details Container">
      {/* 1. Breadcrumb Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white/95 backdrop-blur-xs rounded-2xl border border-gray-150 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            onClick={onBackToCourse}
            className="flex items-center gap-1.5 font-bold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer group mr-1"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>Back to Course</span>
          </button>
          <span className="text-zinc-300">|</span>
          <button
            onClick={onBackToCourses}
            className="text-zinc-500 hover:text-purple-700 transition-colors cursor-pointer font-medium"
          >
            My Courses
          </button>
          <span className="text-zinc-300">›</span>
          <button
            onClick={onBackToCourse}
            className="text-zinc-700 hover:text-purple-700 transition-colors cursor-pointer font-semibold max-w-[200px] truncate"
            title={course.name}
          >
            {course.name}
          </button>
          <span className="text-zinc-300">›</span>
          <span className="font-bold text-zinc-900 truncate max-w-[260px] bg-purple-50 text-purple-900 px-2.5 py-0.5 rounded-lg border border-purple-100">
            Module {modIndex >= 0 ? modIndex + 1 : 1}: {moduleItem.title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`status ${
              moduleItem.completed || calculatedProgress === 100 ? "green" : "yellow"
            }`}
          >
            {moduleItem.completed || calculatedProgress === 100 ? "Completed" : "In Progress"}
          </span>
          <span className="text-[11px] font-semibold text-zinc-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
            {completedLessonsCount} / {totalLessonsCount} Lessons Done
          </span>
        </div>
      </div>

      {/* 2. Module Header Overview Card */}
      <div className="panel p-5 sm:p-6 bg-white rounded-2xl border border-zinc-150 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                Module {modIndex >= 0 ? modIndex + 1 : 1} of {course.modules.length}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-zinc-100 text-zinc-800">
                {course.code}
              </span>
              <span className="text-xs text-zinc-500">
                Course: <strong className="text-zinc-800 font-semibold">{course.name}</strong>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 leading-snug tracking-tight">
              {moduleItem.title}
            </h1>

            {moduleItem.description && (
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-3xl pt-1">
                {moduleItem.description}
              </p>
            )}
          </div>

          {/* Quick Stats Pill Group */}
          <div className="flex lg:flex-col gap-2 shrink-0">
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-center min-w-[130px]">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                Completion Rate
              </span>
              <strong className="text-xl font-bold text-purple-950 mt-0.5 block">
                {calculatedProgress}%
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-150 text-center min-w-[130px]">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Lessons Count
              </span>
              <strong className="text-xl font-bold text-zinc-900 mt-0.5 block">
                {totalLessonsCount}
              </strong>
            </div>
          </div>
        </div>

        {/* 3. Module Progress Bar & Summary Stats */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-800">Module Progress</span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-600">
                {completedLessonsCount} completed, {remainingLessonsCount} remaining
              </span>
            </div>
            <span className="font-bold text-purple-700">{calculatedProgress}%</span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden border border-gray-200/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300"
              style={{ width: `${calculatedProgress}%` }}
            />
          </div>

          {/* Core Objectives Box */}
          {moduleItem.objectives && moduleItem.objectives.length > 0 && (
            <div className="mt-4 p-3.5 rounded-xl bg-purple-50/50 border border-purple-100">
              <span className="text-[10.5px] font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Icon name="sparkles" size={13} />
                <span>Module Learning Objectives & Core Competencies</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-purple-900/90">
                {moduleItem.objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold shrink-0">✓</span>
                    <span className="leading-relaxed">{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Lessons List (The Main Focus) */}
      <div className="panel p-5 sm:p-6 bg-white rounded-2xl border border-zinc-150 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="card-title text-base sm:text-lg">
              Lessons in this Module ({totalLessonsCount})
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Review curriculum structure, lesson duration, and Admin-verified teaching materials.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-zinc-700 w-fit">
            Curriculum Sequence
          </span>
        </div>

        {totalLessonsCount === 0 ? (
          <div className="p-8 text-center rounded-xl bg-gray-50 border border-gray-200">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 grid place-items-center mx-auto mb-2">
              <Icon name="book" size={20} />
            </div>
            <strong className="text-sm text-zinc-800">No lessons in this module yet</strong>
            <p className="text-xs text-zinc-500 mt-1">
              Curriculum content will appear here once published by School Administration.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {moduleItem.lessons.map((lesson, index) => {
              const seqStr = String(index + 1).padStart(2, "0")
              return (
                <div
                  key={lesson.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white hover:bg-purple-50/25 border border-gray-200 hover:border-purple-300 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs hover:shadow-sm"
                  onClick={() => onSelectLesson(lesson)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelectLesson(lesson)
                  }}
                  aria-label={`Lesson ${index + 1}: ${lesson.title}`}
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Sequence Badge */}
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white font-mono text-sm font-bold grid place-items-center shrink-0 border border-purple-200/60 transition-colors">
                      {seqStr}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                          {lesson.type}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-zinc-700">
                          ⏱ {lesson.duration}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lesson.completed
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {lesson.completed ? "✓ Completed" : "In Progress"}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-zinc-900 group-hover:text-purple-700 transition-colors leading-snug">
                        {lesson.title}
                      </h3>

                      {lesson.description && (
                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                          {lesson.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-500">
                        <span className="font-semibold text-purple-700 flex items-center gap-1">
                          <Icon name="document" size={12} />
                          {lesson.materials.length} Admin Materials
                        </span>
                        <span>·</span>
                        <span>{lesson.objectives.length} Objectives</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <button
                      type="button"
                      className="px-4 h-9 rounded-xl btn-primary text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectLesson(lesson)
                      }}
                      aria-label={`Open lesson ${lesson.title}`}
                    >
                      <span>Open Lesson</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ========================================================
   LESSON DETAILS VIEW (Level: "lesson")
   ======================================================== */
function LessonDetailsView({
  course,
  moduleItem,
  lesson,
  onBackToCourses,
  onBackToCourse,
  onBackToModule,
  onNavigateLesson,
  onToast,
}: {
  course: CourseItem
  moduleItem: CourseModuleItem
  lesson: LessonItem
  onBackToCourses?: () => void
  onBackToCourse?: () => void
  onBackToModule: () => void
  onNavigateLesson: (targetLesson: LessonItem, targetModule: CourseModuleItem) => void
  onToast?: (msg: string) => void
}) {
  const modIndex = course.modules.findIndex((m) => m.id === moduleItem.id)
  const lessonIndexInModule = moduleItem.lessons.findIndex((l) => l.id === lesson.id)

  // Flatten all course lessons to support intuitive previous & next navigation across the entire course
  const allCurriculumLessons = useMemo(() => {
    return course.modules.flatMap((m, mIdx) =>
      m.lessons.map((l, lIdx) => ({
        lesson: l,
        module: m,
        moduleIndex: mIdx,
        lessonIndex: lIdx,
      }))
    )
  }, [course])

  const currentIdx = allCurriculumLessons.findIndex(
    (item) => item.lesson.id === lesson.id
  )
  const prevItem = currentIdx > 0 ? allCurriculumLessons[currentIdx - 1] : null
  const nextItem =
    currentIdx >= 0 && currentIdx < allCurriculumLessons.length - 1
      ? allCurriculumLessons[currentIdx + 1]
      : null

  const handlePreviewMaterial = (mat: LessonMaterial) => {
    if (onToast) {
      onToast(`Previewing Admin Material: "${mat.title}" (${mat.sizeOrDuration})`)
    }
  }

  return (
    <div className="space-y-4" aria-label="Lesson Details Container">
      {/* 1. Breadcrumb Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white/95 backdrop-blur-xs rounded-2xl border border-gray-150 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            onClick={onBackToModule}
            className="flex items-center gap-1.5 font-bold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer group mr-1"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>Back to Module</span>
          </button>
          <span className="text-zinc-300">|</span>
          <button
            onClick={onBackToCourses}
            className="text-zinc-500 hover:text-purple-700 transition-colors cursor-pointer font-medium"
          >
            My Courses
          </button>
          <span className="text-zinc-300">›</span>
          <button
            onClick={onBackToCourse}
            className="text-zinc-700 hover:text-purple-700 transition-colors cursor-pointer font-semibold max-w-[150px] truncate"
            title={course.name}
          >
            {course.name}
          </button>
          <span className="text-zinc-300">›</span>
          <button
            onClick={onBackToModule}
            className="text-zinc-700 hover:text-purple-700 transition-colors cursor-pointer font-semibold max-w-[150px] truncate"
            title={moduleItem.title}
          >
            Module {modIndex >= 0 ? modIndex + 1 : 1}
          </button>
          <span className="text-zinc-300">›</span>
          <span className="font-bold text-purple-900 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-100 truncate max-w-[240px]">
            {lesson.title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`status ${
              lesson.completed ? "green" : "yellow"
            }`}
          >
            {lesson.completed ? "Completed" : "In Progress"}
          </span>
        </div>
      </div>

      {/* 2. Compact Lesson Header */}
      <div className="panel p-5 bg-white rounded-2xl border border-zinc-150 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
            Lesson {lessonIndexInModule >= 0 ? lessonIndexInModule + 1 : 1} of {moduleItem.lessons.length}
          </span>
          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-zinc-700">
            {lesson.type}
          </span>
          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-zinc-700">
            ⏱ {lesson.duration}
          </span>
          <span className="text-xs text-zinc-400">·</span>
          <span className="text-xs text-zinc-500">
            Module {modIndex >= 0 ? modIndex + 1 : 1}: <strong className="text-zinc-800">{moduleItem.title}</strong>
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 leading-snug tracking-tight">
          {lesson.title}
        </h1>

        {lesson.description && (
          <p className="text-xs sm:text-sm text-zinc-600 mt-2 leading-relaxed max-w-3xl">
            {lesson.description}
          </p>
        )}
      </div>

      {/* 3. Main Content Grid: 70% Content (Left) + 30% Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (Main Lesson Content - 8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* A. Curriculum Content & Teaching Notes */}
          <div className="panel p-5 bg-white rounded-2xl border border-zinc-150 shadow-xs">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Icon name="document" size={15} />
              <span>Curriculum Content & Teaching Notes</span>
            </h2>

            {lesson.contentSummary ? (
              <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                {lesson.contentSummary}
              </p>
            ) : (
              <p className="text-xs text-zinc-400 italic">
                No supplementary content summary notes available for this lesson.
              </p>
            )}
          </div>

          {/* B. Learning Objectives */}
          {lesson.objectives && lesson.objectives.length > 0 && (
            <div className="panel p-5 bg-purple-50/60 rounded-2xl border border-purple-100 shadow-xs">
              <h2 className="text-sm font-bold text-purple-950 flex items-center gap-2 mb-3">
                <Icon name="sparkles" size={15} />
                <span>Lesson Learning Objectives</span>
              </h2>

              <ul className="space-y-2 text-xs sm:text-sm text-purple-900/90 pl-1">
                {lesson.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-purple-600 font-bold shrink-0 mt-0.5">✓</span>
                    <span className="leading-relaxed">{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* C. Admin-Provided Teaching Materials */}
          <div className="panel p-5 bg-white rounded-2xl border border-zinc-150 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="card-title text-sm sm:text-base flex items-center gap-2">
                  <span>Admin-Provided Teaching Materials</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                    Read Only · Verified
                  </span>
                </h2>
                <p className="text-[11.5px] text-zinc-500 mt-0.5">
                  All lesson slide decks, interactive labs, and classroom worksheets are verified and provided by School Administration.
                </p>
              </div>
              <span className="text-xs font-semibold text-zinc-500 shrink-0">
                {lesson.materials.length} Verified Assets
              </span>
            </div>

            {lesson.materials.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 bg-gray-50 rounded-xl border border-gray-150">
                No digital attachments uploaded for this lesson.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lesson.materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-3.5 rounded-xl bg-gray-50/80 hover:bg-purple-50/40 border border-gray-200 hover:border-purple-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wide">
                          {mat.type}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {mat.sizeOrDuration}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-zinc-800 line-clamp-2">
                        {mat.title}
                      </h3>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-200/80 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 font-medium">
                        School Approved
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePreviewMaterial(mat)}
                        className="view-details-btn text-[10.5px] h-6 px-2.5 cursor-pointer"
                        aria-label={`Preview ${mat.title}`}
                      >
                        <span>Preview Asset →</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {lesson.adminNotes && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <span className="text-amber-600 font-bold shrink-0 mt-0.5">ℹ</span>
                <div className="leading-relaxed">
                  <strong className="font-bold">Super Admin Instruction:</strong> {lesson.adminNotes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Secondary Info & Persistent Module Lesson Navigation - 4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Module Context Card */}
          <div className="panel p-4 sm:p-5 bg-white rounded-2xl border border-zinc-150 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Course & Cohort Context
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-zinc-500">Course Code</span>
                <span className="font-bold text-purple-700">{course.code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-zinc-500">Academic Term</span>
                <span className="font-semibold text-zinc-800">{course.term}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-zinc-500">Assigned Cohort</span>
                <span className="font-semibold text-zinc-800">{course.assignedClass}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-zinc-500">Instructor</span>
                <span className="font-semibold text-zinc-800">{course.instructor}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Module Status</span>
                <span className="font-bold text-emerald-700">
                  {moduleItem.progress}% Cleared
                </span>
              </div>
            </div>
          </div>

          {/* Persistent In-Module Lesson Navigation */}
          <div className="panel p-4 sm:p-5 bg-white rounded-2xl border border-zinc-150 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Lessons in this Module
              </h3>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                Module {modIndex >= 0 ? modIndex + 1 : 1}
              </span>
            </div>

            <div className="space-y-1.5">
              {moduleItem.lessons.map((les, lIndex) => {
                const isCurrent = les.id === lesson.id
                return (
                  <button
                    key={les.id}
                    onClick={() => onNavigateLesson(les, moduleItem)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isCurrent
                        ? "bg-purple-100/80 text-purple-950 font-bold border border-purple-300 shadow-2xs"
                        : "hover:bg-gray-100 text-zinc-700 border border-transparent"
                    }`}
                    aria-label={`Jump to lesson: ${les.title}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-full text-[10px] grid place-items-center shrink-0 font-bold ${
                          isCurrent
                            ? "bg-purple-600 text-white"
                            : les.completed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-200 text-zinc-600"
                        }`}
                      >
                        {les.completed ? "✓" : lIndex + 1}
                      </span>
                      <span className="truncate">{les.title}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isCurrent && (
                        <span className="text-[9.5px] uppercase font-bold text-purple-800 bg-white px-1.5 py-0.2 rounded shadow-2xs">
                          Active
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {les.duration}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Previous & Next Lesson Navigation Bar */}
      <div className="panel p-4 bg-white rounded-2xl border border-zinc-150 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {prevItem ? (
          <button
            onClick={() => onNavigateLesson(prevItem.lesson, prevItem.module)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-purple-50 hover:text-purple-700 text-zinc-700 text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 transition-colors cursor-pointer"
            aria-label={`Previous lesson: ${prevItem.lesson.title}`}
          >
            <span>← Previous:</span>
            <span className="truncate max-w-[200px] font-semibold">
              {prevItem.lesson.title}
            </span>
          </button>
        ) : (
          <div className="text-xs text-zinc-400 font-medium px-4 py-2.5 text-center sm:text-left bg-gray-50 rounded-xl">
            First lesson in course curriculum
          </div>
        )}

        <button
          onClick={onBackToModule}
          className="text-xs font-bold text-purple-700 hover:text-purple-900 underline underline-offset-4 cursor-pointer"
        >
          Module Overview
        </button>

        {nextItem ? (
          <button
            onClick={() => onNavigateLesson(nextItem.lesson, nextItem.module)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl btn-primary text-xs font-bold flex items-center justify-center sm:justify-end gap-1.5 transition-all shadow-sm cursor-pointer"
            aria-label={`Next lesson: ${nextItem.lesson.title}`}
          >
            <span>Next:</span>
            <span className="truncate max-w-[200px] font-semibold">
              {nextItem.lesson.title}
            </span>
            <span>→</span>
          </button>
        ) : (
          <div className="text-xs text-zinc-400 font-medium px-4 py-2.5 text-center sm:text-right bg-gray-50 rounded-xl">
            Course curriculum complete! (Last lesson)
          </div>
        )}
      </div>
    </div>
  )
}

/* ========================================================
   MAIN COURSES PAGE COMPONENT
   ======================================================== */
export default function CoursesPage({
  metrics,
  courses,
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  allStudents,
  onSelectStudentDetails,
  onToast,
}: {
  metrics: MetricItem[]
  courses: CourseItem[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenAiModal?: () => void
  allStudents: StudentItem[]
  onSelectStudentDetails?: (student: StudentItem) => void
  onToast?: (msg: string) => void
}) {
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("All")

  // Persistent Grid vs List view mode
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      const saved = localStorage.getItem("quantum_courses_view")
      if (saved === "list" || saved === "grid") return saved
    } catch {
      // ignore
    }
    return "grid"
  })

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode)
    try {
      localStorage.setItem("quantum_courses_view", mode)
    } catch {
      // ignore
    }
  }

  // Hierarchical Route State: Course -> Curriculum -> Module -> Lesson
  const [routeState, setRouteState] = useState<CourseRouteState>(() => {
    if (typeof window !== "undefined") {
      return parseCourseRoute(window.location.pathname)
    }
    return {
      level: "list",
      courseId: null,
      moduleId: null,
      lessonId: null,
    }
  })

  // Synchronize route state with browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      setRouteState(parseCourseRoute(window.location.pathname))
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // Navigation helpers that update URL history and component state
  const navigateToCourses = () => {
    const path = "/teacher/courses"
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path)
    }
    setRouteState({
      level: "list",
      courseId: null,
      moduleId: null,
      lessonId: null,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const navigateToCourse = (courseId: string) => {
    const path = `/teacher/courses/${courseId}`
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path)
    }
    setRouteState({
      level: "course",
      courseId,
      moduleId: null,
      lessonId: null,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const navigateToModule = (courseId: string, moduleId: string) => {
    const path = `/teacher/courses/${courseId}/modules/${moduleId}`
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path)
    }
    setRouteState({
      level: "course",
      courseId,
      moduleId,
      lessonId: null,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const navigateToLesson = (
    courseId: string,
    moduleId: string,
    lessonId: string
  ) => {
    const path = `/teacher/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path)
    }
    setRouteState({
      level: "course",
      courseId,
      moduleId,
      lessonId,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Filtered courses based on search query and active tab
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (activeStatusFilter !== "All" && c.status !== activeStatusFilter)
        return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.assignedClass.toLowerCase().includes(q)
      )
    })
  }, [courses, activeStatusFilter, searchQuery])

  // Resolve currently active course if navigating inside course
  const activeCourse = useMemo(() => {
    if (!routeState.courseId) return null
    return courses.find((c) => c.id === routeState.courseId) || null
  }, [courses, routeState.courseId])

  // Generate subtitle for header depending on active depth
  const headerSubtitle = useMemo(() => {
    if (routeState.level === "course" && activeCourse) {
      return `Course Curriculum & Roster: ${activeCourse.name}`
    }
    return undefined
  }, [routeState.level, activeCourse])

  return (
    <>
      <CoursesHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAiModal={onOpenAiModal}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
        totalCount={courses.length}
        breadcrumbSubtitle={headerSubtitle}
      />

      {/* Metrics Grid (4 folder tab status cards for Courses) */}
      <div className="metrics-grid">
        {metrics.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* UNIFIED CONTINUOUS COURSE LEARNING PAGE (Modules, Lessons, Resources & Assignments) */}
      {routeState.level === "course" && (
        <div className="mt-2" aria-label="Course Learning Section">
          {activeCourse ? (
            <CourseDetailsView
              course={activeCourse}
              allStudents={allStudents}
              initialModuleId={routeState.moduleId}
              initialLessonId={routeState.lessonId}
              onBack={navigateToCourses}
              onSelectStudentDetails={onSelectStudentDetails}
              onToast={onToast}
            />
          ) : (
            <NotFoundFallback
              title="Course Not Found"
              message={`We could not locate the course matching ID "${routeState.courseId}". It may have been archived or moved.`}
              onReset={navigateToCourses}
              buttonLabel="Back to All Courses"
            />
          )}
        </div>
      )}

      {/* LEVEL 1: ALL COURSES LIST (GRID & LIST VIEW) */}
      {routeState.level === "list" && (
        <div className="panel p-5 mt-2" aria-label="Assigned Courses Section">
          {/* Top Header, Filters & View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="card-title">Assigned Courses</h3>
              <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
                Showing {filteredCourses.length} of {courses.length} courses
                assigned to your instruction
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter pills */}
              <div
                className="filter-pills"
                role="tablist"
                aria-label="Filter courses by status"
              >
                <button
                  className={`filter-pill ${
                    activeStatusFilter === "All" ? "active" : ""
                  }`}
                  onClick={() => setActiveStatusFilter("All")}
                  aria-selected={activeStatusFilter === "All"}
                >
                  All Courses ({courses.length})
                </button>
                <button
                  className={`filter-pill ${
                    activeStatusFilter === "Active" ? "active" : ""
                  }`}
                  onClick={() => setActiveStatusFilter("Active")}
                  aria-selected={activeStatusFilter === "Active"}
                >
                  Active (
                  {courses.filter((c) => c.status === "Active").length})
                </button>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="clear-filters-btn cursor-pointer"
                    aria-label="Clear course search"
                  >
                    ✕ Clear Search
                  </button>
                )}
              </div>

              {/* Grid / List View Toggle Switcher */}
              <div
                className="inline-flex items-center p-1 rounded-xl bg-gray-100 border border-gray-200"
                role="group"
                aria-label="View style switcher"
              >
                <button
                  type="button"
                  onClick={() => handleViewModeChange("grid")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white text-purple-700 shadow-xs border border-gray-200"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                  aria-pressed={viewMode === "grid"}
                  title="Grid View"
                >
                  <Icon name="grid" size={14} />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange("list")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white text-purple-700 shadow-xs border border-gray-200"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                  aria-pressed={viewMode === "list"}
                  title="List View"
                >
                  <Icon name="list" size={14} />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>

          {/* Courses List Content (Grid or List presentation) */}
          {filteredCourses.length === 0 ? (
            <div className="roster-empty-state">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 grid place-items-center mb-1">
                <Icon name="book" size={20} />
              </div>
              <strong className="text-sm text-zinc-800">
                No matching courses found
              </strong>
              <p className="text-xs text-zinc-500 max-w-sm">
                {courses.length === 0
                  ? "There are currently no courses assigned to your teacher account."
                  : "No courses matched your current search criteria."}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-2 px-4 h-8 rounded-full btn-primary text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Reset Search
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onViewCourse={(c) => navigateToCourse(c.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredCourses.map((course) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  onViewCourse={(c) => navigateToCourse(c.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
