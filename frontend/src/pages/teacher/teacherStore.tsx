import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type {
  AIMonitoringData,
  CalendarEventItem,
  CourseItem,
  DoubtItem,
  LessonItem,
  LiveAttendanceRecord,
  LiveSessionItem,
  ModuleAssignmentItem,
  RecordingReviewDataset,
  ReportItem,
  SessionRecordingItem,
  StudentItem,
  TeachingSuggestionItem,
} from "@/types"
import {
  initialAIMonitoringData,
  initialAttendanceRecords,
  initialCalendarEvents,
  initialCourses,
  initialDoubts,
  initialLiveSessions,
  initialRecordingReviews,
  initialRecordings,
  initialReports,
  initialStudents,
  initialTeachingSuggestions,
} from "@/data/mockData"
import { getModuleAssignment } from "@/data/courseAssignmentsData"
import { useSession } from "@/app/session"
import { minutesOf } from "./teacherUtils"

const KEYS = {
  sessions: "quantum_teacher_sessions_v2",
  doubts: "quantum_teacher_doubts_v2",
  events: "quantum_teacher_events_v2",
} as const

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // ignore and use the seed data
  }
  return fallback
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable: state stays in memory
  }
}

export const assignmentKey = (courseId: string, moduleId: string) => `${courseId}:${moduleId}`

/** Module and course progress = share of lessons delivered (the seed's stored percentages disagree with its lesson ticks). */
function recompute(c: CourseItem): CourseItem {
  const lessons = c.modules.flatMap((m) => m.lessons)
  const modules = c.modules.map((m) => {
    const done = m.lessons.filter((l) => l.completed).length
    const progress = m.lessons.length ? Math.round((done / m.lessons.length) * 100) : 0
    return { ...m, progress, completed: m.lessons.length > 0 && done === m.lessons.length }
  })
  const progress = lessons.length ? Math.round((lessons.filter((l) => l.completed).length / lessons.length) * 100) : 0
  return { ...c, modules, lessonsCount: lessons.length, progress }
}

/** Seed assignments per course module. The seed helper keys by module id only, so other courses get theirs by prefix. */
function seedAssignments(courses: CourseItem[]): Record<string, ModuleAssignmentItem> {
  const out: Record<string, ModuleAssignmentItem> = {}
  for (const c of courses) {
    for (const m of c.modules) {
      const a = c.id === "c1" ? getModuleAssignment(c.id, m.id) : getModuleAssignment(c.id, `${c.id}_${m.id}`)
      if (a) out[assignmentKey(c.id, m.id)] = { ...a, courseId: c.id, moduleId: m.id, moduleTitle: m.title }
    }
  }
  return out
}

export interface NewSessionInput {
  title: string
  courseId: string
  scheduledDate: string
  startTime: string
  endTime: string
  platform: LiveSessionItem["platform"]
  classNotes?: string
}

export interface NewCourseInput {
  name: string
  code: string
  assignedClass: string
  term: string
  description: string
}

interface TeacherData {
  teacherName: string
  teacherAvatar?: string
  notify: (msg: string) => void

  courses: CourseItem[]
  students: StudentItem[]
  sessions: LiveSessionItem[]
  doubts: DoubtItem[]
  events: CalendarEventItem[]
  recordings: SessionRecordingItem[]
  reviews: Record<string, RecordingReviewDataset>
  published: Set<string>
  reports: ReportItem[]
  suggestions: TeachingSuggestionItem[]
  attendance: LiveAttendanceRecord[]
  monitoring: AIMonitoringData
  assignments: Record<string, ModuleAssignmentItem>

  addCourse: (input: NewCourseInput) => CourseItem
  addModule: (courseId: string, title: string) => void
  moveModule: (courseId: string, moduleId: string, dir: -1 | 1) => void
  addLesson: (courseId: string, moduleId: string, lesson: Pick<LessonItem, "title" | "type" | "duration">) => void
  toggleLessonDelivered: (courseId: string, moduleId: string, lessonId: string) => void

  scheduleSession: (input: NewSessionInput) => LiveSessionItem
  updateSession: (id: string, patch: Partial<LiveSessionItem>) => void
  startSession: (id: string) => void
  endSession: (id: string) => string

  replyToDoubt: (id: string, text: string, resolve: boolean) => void
  setDoubtStatus: (id: string, status: DoubtItem["status"]) => void

  addEvent: (e: Omit<CalendarEventItem, "id" | "isReadOnly">) => void
  deleteEvent: (id: string) => void

  togglePublished: (recordingId: string) => void
  updateSummary: (recordingId: string, text: string) => void

  addReport: (r: Omit<ReportItem, "id">) => void
  updateStudent: (id: string, patch: Partial<StudentItem>) => void
  addStudent: (s: Pick<StudentItem, "name" | "email" | "assignedCourse">) => void
  dismissSuggestion: (id: string) => void

  gradeSubmission: (key: string, studentId: string, score: number, feedback: string) => void
}

const TeacherDataContext = createContext<TeacherData | null>(null)

export function TeacherDataProvider({ onToast, children }: { onToast: (msg: string) => void; children: ReactNode }) {
  const { user } = useSession()
  const [courses, setCourses] = useState<CourseItem[]>(() => initialCourses.map(recompute))
  const [students, setStudents] = useState<StudentItem[]>(initialStudents)
  const [sessions, setSessions] = useState<LiveSessionItem[]>(() => load(KEYS.sessions, initialLiveSessions))
  const [doubts, setDoubts] = useState<DoubtItem[]>(() => load(KEYS.doubts, initialDoubts))
  const [events, setEvents] = useState<CalendarEventItem[]>(() => load(KEYS.events, initialCalendarEvents))
  const [recordings, setRecordings] = useState<SessionRecordingItem[]>(initialRecordings)
  const [reviews, setReviews] = useState<Record<string, RecordingReviewDataset>>(initialRecordingReviews)
  const [published, setPublished] = useState<Set<string>>(() => new Set(initialRecordings.filter((r) => r.status === "Available").map((r) => r.id)))
  const [reports, setReports] = useState<ReportItem[]>(initialReports)
  const [suggestions, setSuggestions] = useState<TeachingSuggestionItem[]>(initialTeachingSuggestions)
  const [assignments, setAssignments] = useState<Record<string, ModuleAssignmentItem>>(() => seedAssignments(initialCourses))

  useEffect(() => save(KEYS.sessions, sessions), [sessions])
  useEffect(() => save(KEYS.doubts, doubts), [doubts])
  useEffect(() => save(KEYS.events, events), [events])

  const editCourse = useCallback((id: string, fn: (c: CourseItem) => CourseItem) => setCourses((list) => list.map((c) => (c.id === id ? fn(c) : c))), [])

  const addCourse = useCallback(
    (input: NewCourseInput) => {
      const course: CourseItem = {
        id: `c-${Date.now()}`,
        code: input.code,
        name: input.name,
        thumbnail: "",
        description: input.description,
        enrolledStudentsCount: 0,
        modulesCount: 0,
        lessonsCount: 0,
        progress: 0,
        status: "Active",
        tone: "purple",
        assignedClass: input.assignedClass,
        term: input.term,
        instructor: user.name,
        modules: [],
        enrolledStudentIds: [],
      }
      setCourses((list) => [course, ...list])
      return course
    },
    [user.name],
  )

  const addModule = useCallback(
    (courseId: string, title: string) =>
      editCourse(courseId, (c) => ({
        ...c,
        modulesCount: c.modules.length + 1,
        modules: [...c.modules, { id: `m-${Date.now()}`, title, description: "", objectives: [], lessons: [], completed: false, progress: 0 }],
      })),
    [editCourse],
  )

  const moveModule = useCallback(
    (courseId: string, moduleId: string, dir: -1 | 1) =>
      editCourse(courseId, (c) => {
        const i = c.modules.findIndex((m) => m.id === moduleId)
        const j = i + dir
        if (i < 0 || j < 0 || j >= c.modules.length) return c
        const modules = [...c.modules]
        ;[modules[i], modules[j]] = [modules[j], modules[i]]
        return { ...c, modules }
      }),
    [editCourse],
  )

  const addLesson = useCallback(
    (courseId: string, moduleId: string, lesson: Pick<LessonItem, "title" | "type" | "duration">) =>
      editCourse(courseId, (c) =>
        recompute({
          ...c,
          modules: c.modules.map((m) =>
            m.id === moduleId
              ? { ...m, lessons: [...m.lessons, { ...lesson, id: `l-${Date.now()}`, completed: false, description: "", objectives: [], contentSummary: "", materials: [] }] }
              : m,
          ),
        }),
      ),
    [editCourse],
  )

  const toggleLessonDelivered = useCallback(
    (courseId: string, moduleId: string, lessonId: string) =>
      editCourse(courseId, (c) =>
        recompute({
          ...c,
          modules: c.modules.map((m) => (m.id === moduleId ? { ...m, lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, completed: !l.completed } : l)) } : m)),
        }),
      ),
    [editCourse],
  )

  const scheduleSession = useCallback(
    (input: NewSessionInput) => {
      const course = courses.find((c) => c.id === input.courseId)
      const session: LiveSessionItem = {
        id: `ls-${Date.now()}`,
        title: input.title,
        courseId: input.courseId,
        courseName: course?.name ?? "",
        courseCode: course?.code ?? "",
        batchName: course?.assignedClass,
        scheduledDate: input.scheduledDate,
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: Math.max(15, minutesOf(input.endTime) - minutesOf(input.startTime)),
        status: "Upcoming",
        platform: input.platform,
        meetingUrl: `https://classroom.quantumschool.ai/live/${Date.now().toString(36)}`,
        classNotes: input.classNotes,
        instructorName: user.name,
        instructorAvatar: user.avatar,
        enrolledCount: course?.enrolledStudentsCount ?? 0,
        topicsCovered: [],
        isReadOnly: false,
      }
      setSessions((list) => [...list, session])
      return session
    },
    [courses, user.name, user.avatar],
  )

  const updateSession = useCallback((id: string, patch: Partial<LiveSessionItem>) => setSessions((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s))), [])
  const startSession = useCallback((id: string) => updateSession(id, { status: "Live Now" }), [updateSession])

  const endSession = useCallback(
    (id: string) => {
      const session = sessions.find((s) => s.id === id)
      updateSession(id, { status: "Completed" })
      const existing = recordings.find((r) => r.sessionId === id)
      if (existing) {
        setRecordings((list) => list.map((r) => (r.id === existing.id && r.status === "Not Available" ? { ...r, status: "Processing" } : r)))
        return existing.id
      }
      const recId = `rec-${id}`
      setRecordings((list) => [
        {
          id: recId,
          sessionId: id,
          title: session?.title ?? "Live class",
          courseName: session?.courseName ?? "",
          courseCode: session?.courseCode ?? "",
          sessionDate: session?.scheduledDate ?? "",
          duration: `${session?.durationMinutes ?? 60} mins`,
          status: "Processing",
          fileSize: "Transcoding",
          viewsCount: 0,
          keyTakeaways: ["Transcoding and chaptering in progress", "Available for review in about 10 minutes"],
        },
        ...list,
      ])
      return recId
    },
    [sessions, recordings, updateSession],
  )

  const replyToDoubt = useCallback(
    (id: string, text: string, resolve: boolean) =>
      setDoubts((list) =>
        list.map((d) =>
          d.id === id
            ? {
                ...d,
                status: resolve ? "Resolved" : "In Progress",
                responses: [...d.responses, { id: `dr-${Date.now()}`, author: user.name, authorRole: "Teacher", authorAvatar: user.avatar, text, createdAt: "Just now" }],
              }
            : d,
        ),
      ),
    [user.name, user.avatar],
  )
  const setDoubtStatus = useCallback((id: string, status: DoubtItem["status"]) => setDoubts((list) => list.map((d) => (d.id === id ? { ...d, status } : d))), [])

  const addEvent = useCallback((e: Omit<CalendarEventItem, "id" | "isReadOnly">) => setEvents((list) => [...list, { ...e, id: `ev-${Date.now()}`, isReadOnly: false }]), [])
  const deleteEvent = useCallback((id: string) => setEvents((list) => list.filter((e) => e.id !== id)), [])

  const togglePublished = useCallback(
    (recordingId: string) =>
      setPublished((s) => {
        const n = new Set(s)
        if (n.has(recordingId)) n.delete(recordingId)
        else n.add(recordingId)
        return n
      }),
    [],
  )
  const updateSummary = useCallback(
    (recordingId: string, text: string) =>
      setReviews((r) =>
        r[recordingId]
          ? { ...r, [recordingId]: { ...r[recordingId], executiveSummary: { ...r[recordingId].executiveSummary, text, lastUpdated: "Edited just now" } } }
          : r,
      ),
    [],
  )

  const addReport = useCallback((r: Omit<ReportItem, "id">) => setReports((list) => [{ ...r, id: `r-${Date.now()}` }, ...list]), [])
  const updateStudent = useCallback((id: string, patch: Partial<StudentItem>) => setStudents((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s))), [])
  const addStudent = useCallback(
    (s: Pick<StudentItem, "name" | "email" | "assignedCourse">) =>
      setStudents((list) => [
        ...list,
        {
          id: `s-${Date.now()}`,
          name: s.name,
          email: s.email,
          assignedCourse: s.assignedCourse,
          rollNumber: `#Y4-${100 + list.length + 1}`,
          image: "",
          completion: 0,
          average: 0,
          attendance: 100,
          status: "On Track",
          tone: "purple",
          subjects: { english: 0, math: 0, science: 0, art: 0 },
          tags: ["New learner"],
          parentName: "",
          parentEmail: "",
          lastActivity: "Invited just now",
          pendingAssignments: 0,
        },
      ]),
    [],
  )
  const dismissSuggestion = useCallback((id: string) => setSuggestions((list) => list.filter((s) => s.id !== id)), [])

  const gradeSubmission = useCallback(
    (key: string, studentId: string, score: number, feedback: string) =>
      setAssignments((all) => {
        const a = all[key]
        if (!a?.submissions) return all
        const submissions = a.submissions.map((s) => (s.studentId === studentId ? { ...s, status: "Graded" as const, score, teacherFeedback: feedback } : s))
        const graded = submissions.filter((s) => s.status === "Graded" && typeof s.score === "number")
        const averageScore = graded.length ? Math.round(graded.reduce((sum, s) => sum + (s.score ?? 0), 0) / graded.length) : a.averageScore
        return { ...all, [key]: { ...a, submissions, averageScore } }
      }),
    [],
  )

  const value = useMemo<TeacherData>(
    () => ({
      teacherName: user.name,
      teacherAvatar: user.avatar,
      notify: onToast,
      courses,
      students,
      sessions,
      doubts,
      events,
      recordings,
      reviews,
      published,
      reports,
      suggestions,
      attendance: initialAttendanceRecords,
      monitoring: initialAIMonitoringData,
      assignments,
      addCourse,
      addModule,
      moveModule,
      addLesson,
      toggleLessonDelivered,
      scheduleSession,
      updateSession,
      startSession,
      endSession,
      replyToDoubt,
      setDoubtStatus,
      addEvent,
      deleteEvent,
      togglePublished,
      updateSummary,
      addReport,
      updateStudent,
      addStudent,
      dismissSuggestion,
      gradeSubmission,
    }),
    [
      user.name,
      user.avatar,
      onToast,
      courses,
      students,
      sessions,
      doubts,
      events,
      recordings,
      reviews,
      published,
      reports,
      suggestions,
      assignments,
      addCourse,
      addModule,
      moveModule,
      addLesson,
      toggleLessonDelivered,
      scheduleSession,
      updateSession,
      startSession,
      endSession,
      replyToDoubt,
      setDoubtStatus,
      addEvent,
      deleteEvent,
      togglePublished,
      updateSummary,
      addReport,
      updateStudent,
      addStudent,
      dismissSuggestion,
      gradeSubmission,
    ],
  )

  return <TeacherDataContext.Provider value={value}>{children}</TeacherDataContext.Provider>
}

export function useTeacherData(): TeacherData {
  const ctx = useContext(TeacherDataContext)
  if (!ctx) throw new Error("useTeacherData must be used inside <TeacherDataProvider>")
  return ctx
}
