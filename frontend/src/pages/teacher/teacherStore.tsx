import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { api } from "@/lib/api"
import type {
  AIMonitoringData,
  CalendarEventItem,
  CourseItem,
  DoubtItem,
  LessonItem,
  LessonMaterial,
  LiveAttendanceRecord,
  LiveSessionItem,
  ModuleAssignmentItem,
  ReportItem,
  SessionRecordingItem,
  StudentItem,
  TeachingSuggestionItem,
} from "@/types"
import { useSession } from "@/app/session"

const KEYS = {
  sessions: "quantum_teacher_sessions_v2",
  doubts: "quantum_teacher_doubts_v2",
  events: "quantum_teacher_events_v2",
} as const

const isLegacyMockId = (id: string) =>
  /^(c[0-9]+|s[0-9]+|m[0-9]+|d-[0-9]+|tt-[0-9]+|asg_m[0-9]+|ses-[0-9]+|ev-[0-9]+)$/.test(id)

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((item: any) => !isLegacyMockId(item?.id || ""))
        return cleaned as T
      }
      return parsed as T
    }
  } catch {
    // ignore
  }
  return fallback
}
const teacherSaveTimers = new Map<string, ReturnType<typeof setTimeout>>()
function save(key: string, value: unknown) {
  const prev = teacherSaveTimers.get(key)
  if (prev) clearTimeout(prev)
  teacherSaveTimers.set(
    key,
    setTimeout(() => {
      teacherSaveTimers.delete(key)
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        // storage unavailable: state stays in memory
      }
    }, 250),
  )
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

/** Seed assignments per course module (empty by default). */
function seedAssignments(_courses: CourseItem[]): Record<string, ModuleAssignmentItem> {
  return {}
}

const EMPTY_MONITORING: AIMonitoringData = {
  lastUpdated: "",
  overallStatus: "Optimal",
  engagementScore: 0,
  activeParticipants: 0,
  totalEnrolled: 0,
  questionsCount: 0,
  participationTrend: "Stable",
  lectureProgressPercent: 0,
  currentSegmentTitle: "",
  attentionFlags: [],
  suggestions: [],
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
  addAssignment: (courseId: string, moduleId: string, input: { title: string; type: ModuleAssignmentItem["type"]; description: string; instructions: string; dueDate: string; maxMarks: number; attachments?: { name: string; size: string; type: string; url?: string }[] }) => void
  addQuiz: (courseId: string, moduleId: string, input: { title: string; dueDate: string; maxMarks: number; timeLimitMins: number; passingMarks: number; attachments?: { name: string; size: string; type: string; url?: string }[]; questionsCount?: number }) => void
  addMaterial: (courseId: string, moduleId: string, lessonId: string, material: { title: string; type: LessonMaterial["type"]; sizeOrDuration: string; url?: string }) => void
  submitGradesForApproval: (key: string) => void



  replyToDoubt: (id: string, text: string, resolve: boolean) => void
  setDoubtStatus: (id: string, status: DoubtItem["status"]) => void

  addEvent: (e: Omit<CalendarEventItem, "id" | "isReadOnly">) => void
  deleteEvent: (id: string) => void


  addReport: (r: Omit<ReportItem, "id">) => void
  updateStudent: (id: string, patch: Partial<StudentItem>) => void
  addStudent: (s: Pick<StudentItem, "name" | "email" | "assignedCourse">) => void
  dismissSuggestion: (id: string) => void

  gradeSubmission: (key: string, studentId: string, score: number, feedback: string) => void
}

const TeacherDataContext = createContext<TeacherData | null>(null)

export function TeacherDataProvider({ onToast, children }: { onToast: (msg: string) => void; children: ReactNode }) {
  const { user } = useSession()
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [students, setStudents] = useState<StudentItem[]>([])
  const [sessions, setSessions] = useState<LiveSessionItem[]>([])
  const [doubts, setDoubts] = useState<DoubtItem[]>(() => load(KEYS.doubts, []))
  const [events, setEvents] = useState<CalendarEventItem[]>(() => load(KEYS.events, []))
  const [recordings, setRecordings] = useState<SessionRecordingItem[]>([])
  const [reports, setReports] = useState<ReportItem[]>([])
  const [suggestions, setSuggestions] = useState<TeachingSuggestionItem[]>([])
  const [assignments, setAssignments] = useState<Record<string, ModuleAssignmentItem>>({})

  useEffect(() => save(KEYS.sessions, sessions), [sessions])
  useEffect(() => save(KEYS.doubts, doubts), [doubts])
  useEffect(() => save(KEYS.events, events), [events])

  // Sync Teacher data with Backend API
  useEffect(() => {
    let cancelled = false
    async function fetchTeacherData() {
      try {
        const [courseRes, cRes, dRes, eRes, sRes, rRes] = await Promise.allSettled([
          api.get<{ courses: CourseItem[] }>("/teacher/courses"),
          api.get<{ classes: any[] }>("/teacher/classes"),
          api.get<{ doubts: any[] }>("/teacher/doubts"),
          api.get<{ events: any[] }>("/teacher/calendar"),
          api.get<{ students: any[] }>("/teacher/students"),
          api.get<{ recordings: { id:string;session_id:string;title:string;course_title:string;course_code:string;starts_at:string;processing_state:string;duration_seconds:number|null }[] }>("/recordings", { bypassCache:true }),
        ])
        if (cancelled) return

        if (rRes.status === "fulfilled") setRecordings(rRes.value.recordings.map(r=>({ id:r.id,sessionId:r.session_id,title:r.title,courseName:r.course_title,courseCode:r.course_code,sessionDate:r.starts_at.slice(0,10),duration:r.duration_seconds?`${Math.ceil(r.duration_seconds/60)} min`:"Pending",status:r.processing_state==="ready"?"Available":["queued","processing"].includes(r.processing_state)?"Processing":"Not Available",keyTakeaways:[] })))
        if (courseRes.status === "fulfilled" && Array.isArray(courseRes.value?.courses)) {
          setCourses(courseRes.value.courses.map(recompute))
        }

        if (cRes.status === "fulfilled" && Array.isArray(cRes.value?.classes)) {
          const apiSessions: LiveSessionItem[] = cRes.value.classes.map((c: any) => ({
            id: c.id,
            title: c.title,
            courseId: c.course_id || "",
            courseName: c.course_title || "Course",
            courseCode: c.course_code || "",
            batchName: c.batch_name,
            scheduledDate: new Intl.DateTimeFormat("en-CA", { timeZone: c.timezone }).format(new Date(c.starts_at)),
            startTime: new Intl.DateTimeFormat("en-GB", { timeZone: c.timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(c.starts_at)),
            endTime: new Intl.DateTimeFormat("en-GB", { timeZone: c.timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(c.ends_at)),
            durationMinutes: (Date.parse(c.ends_at) - Date.parse(c.starts_at)) / 60000,
            status: c.status === "Live" ? "Live Now" : c.status === "Ended" ? "Completed" : c.status,
            platform: c.provider === "meet_link" ? "Google Meet" : "Zoom",
            meetingUrl: undefined,
            instructorName: c.teacher_name || "Teacher pending",
            enrolledCount: 0,
            topicsCovered: [],
            isReadOnly: false,
          }))
          setSessions(apiSessions)
        }

        if (dRes.status === "fulfilled" && Array.isArray(dRes.value?.doubts)) {
          const apiDoubts: DoubtItem[] = dRes.value.doubts.map((d: any) => ({
            id: d.id,
            studentId: d.student_id || "",
            studentName: d.student_name || "Student",
            studentAvatar: d.student_avatar || undefined,
            studentRoll: "QAI-104",
            courseId: d.course_id || "",
            courseName: d.course_title || "Course",
            courseCode: "",
            questionTitle: d.body?.slice(0, 50) || "",
            questionText: d.body || "",
            submittedAt: d.created_at ? new Date(d.created_at).toLocaleDateString() : "Recently",
            priority: "Medium",
            status: d.answer ? "Resolved" : "Pending",
            responses: d.answer
              ? [
                  {
                    id: `ans-${d.id}`,
                    author: d.answer_author || "Teacher",
                    authorRole: "Teacher",
                    text: d.answer,
                    createdAt: "Recently",
                  },
                ]
              : [],
          }))
          setDoubts(apiDoubts)
        }

        if (eRes.status === "fulfilled" && Array.isArray(eRes.value?.events)) {
          const apiEvents: CalendarEventItem[] = eRes.value.events.map((e: any) => ({
            id: e.id,
            title: e.title,
            category: "Meeting",
            startDate: e.starts_at ? new Date(e.starts_at).toISOString().split("T")[0] : "",
            startTime: e.time_label?.split("-")[0]?.trim() || "10:00",
            endTime: e.time_label?.split("-")[1]?.trim() || "11:30",
            location: e.location || "Online Lab",
            description: e.description || "",
            isReadOnly: false,
          }))
          setEvents(apiEvents)
        }

        if (sRes.status === "fulfilled" && Array.isArray(sRes.value?.students)) {
          const apiStudents: StudentItem[] = sRes.value.students.map((s: any) => ({
            id: s.id,
            name: s.name,
            rollNumber: s.roll_number || "",
            image: s.avatar_url || undefined,
            email: s.email,
            completion: 0,
            average: 0,
            attendance: s.attendance_rate || 100,
            status: "On Track",
            tone: "purple",
            subjects: { english: 0, math: 0, science: 0, art: 0 },
            tags: [],
            assignedCourse: "",
            grade: "A",
            pendingAssignments: 0,
          }))
          setStudents(apiStudents)
        }
      } catch {
        // Safe offline fallback
      }
    }
    void fetchTeacherData()
    const refresh = window.setInterval(() => void fetchTeacherData(), 30000)
    return () => {
      window.clearInterval(refresh)
      cancelled = true
    }
  }, [])

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

  const replyToDoubt = useCallback(
    (id: string, text: string, resolve: boolean) => {
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
      )
      api.post(`/teacher/doubts/${id}/reply`, { answer: text }).catch(() => {})
    },
    [user.name, user.avatar],
  )
  const setDoubtStatus = useCallback((id: string, status: DoubtItem["status"]) => setDoubts((list) => list.map((d) => (d.id === id ? { ...d, status } : d))), [])

  const addEvent = useCallback((e: Omit<CalendarEventItem, "id" | "isReadOnly">) => {
    setEvents((list) => [...list, { ...e, id: `ev-${Date.now()}`, isReadOnly: false }])
    api
      .post("/teacher/calendar", {
        title: e.title,
        description: e.description || "",
        location: e.location || "Online Lab",
        starts_at: e.startDate ? `${e.startDate}T10:00:00Z` : new Date().toISOString(),
        category: "Workshops",
        time_label: `${e.startTime || "10:00"} - ${e.endTime || "11:30"}`,
      })
      .catch(() => {})
  }, [])
  const deleteEvent = useCallback((id: string) => setEvents((list) => list.filter((e) => e.id !== id)), [])

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

  const addAssignment = useCallback(
    (courseId: string, moduleId: string, input: { title: string; type: ModuleAssignmentItem["type"]; description: string; instructions: string; dueDate: string; maxMarks: number; attachments?: { name: string; size: string; type: string; url?: string }[] }) => {
      const key = assignmentKey(courseId, moduleId)
      const course = courses.find((c) => c.id === courseId)
      const mod = course?.modules.find((m) => m.id === moduleId)
      const newAssignment: ModuleAssignmentItem = {
        id: `asg-${Date.now()}`,
        courseId,
        moduleId,
        moduleTitle: mod?.title ?? "Module",
        title: input.title,
        type: input.type,
        description: input.description,
        instructions: input.instructions,
        dueDate: input.dueDate,
        maxMarks: input.maxMarks,
        status: "Assigned",
        approvalStatus: "Pending Approval",
        attachments: input.attachments || [],
        submissionsCount: 0,
        totalEnrolled: course?.enrolledStudentsCount ?? 25,
        submissions: (students || []).slice(0, 5).map((s) => ({
          studentId: s.id,
          studentName: s.name,
          studentRoll: s.rollNumber,
          studentAvatar: s.image,
          submittedAt: "Pending",
          status: "Pending",
          maxMarks: input.maxMarks,
        })),
      }
      setAssignments((prev) => ({ ...prev, [key]: newAssignment }))
      onToast(`Assignment “${input.title}” submitted for Admin approval`)
    },
    [courses, students, onToast],
  )

  const addQuiz = useCallback(
    (courseId: string, moduleId: string, input: { title: string; dueDate: string; maxMarks: number; timeLimitMins: number; passingMarks: number; attachments?: { name: string; size: string; type: string; url?: string }[]; questionsCount?: number }) => {
      const key = assignmentKey(courseId, moduleId)
      const course = courses.find((c) => c.id === courseId)
      const mod = course?.modules.find((m) => m.id === moduleId)
      const newQuiz: ModuleAssignmentItem = {
        id: `quiz-${Date.now()}`,
        courseId,
        moduleId,
        moduleTitle: mod?.title ?? "Module",
        title: input.title,
        type: "Quiz Assessment",
        description: `Timed Knowledge Assessment (${input.timeLimitMins} mins, pass mark: ${input.passingMarks}/${input.maxMarks})${input.questionsCount ? ` · ${input.questionsCount} questions` : ""}.`,
        instructions: "Answer all multiple choice and conceptual questions within the allocated time.",
        dueDate: input.dueDate,
        maxMarks: input.maxMarks,
        status: "Assigned",
        approvalStatus: "Pending Approval",
        attachments: input.attachments || [],
        submissionsCount: 0,
        totalEnrolled: course?.enrolledStudentsCount ?? 25,
        submissions: (students || []).slice(0, 5).map((s) => ({
          studentId: s.id,
          studentName: s.name,
          studentRoll: s.rollNumber,
          studentAvatar: s.image,
          submittedAt: "Pending",
          status: "Pending",
          maxMarks: input.maxMarks,
        })),
      }
      setAssignments((prev) => ({ ...prev, [key]: newQuiz }))
      onToast(`Quiz “${input.title}” submitted for Admin approval`)
    },
    [courses, students, onToast],
  )

  const addMaterial = useCallback(
    (courseId: string, moduleId: string, lessonId: string, material: { title: string; type: LessonMaterial["type"]; sizeOrDuration: string; url?: string }) => {
      const newMat: LessonMaterial = {
        id: `mat-${Date.now()}`,
        title: material.title,
        type: material.type,
        sizeOrDuration: material.sizeOrDuration || "PDF · 2.4 MB",
        url: material.url || "#",
        approvalStatus: "Pending Approval",
      }
      editCourse(courseId, (c) => ({
        ...c,
        modules: c.modules.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, materials: [...l.materials, newMat] } : l)),
              }
            : m,
        ),
      }))
      onToast(`Study material “${material.title}” submitted for Admin approval`)
    },
    [editCourse, onToast],
  )

  const submitGradesForApproval = useCallback(
    (key: string) => {
      setAssignments((prev) => {
        const a = prev[key]
        if (!a) return prev
        return {
          ...prev,
          [key]: { ...a, publishGradeApproval: "Pending Approval" },
        }
      })
      onToast("Final grades submitted for Admin publish approval")
    },
    [onToast],
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
      reports,
      suggestions,
      attendance: [],
      monitoring: EMPTY_MONITORING,
      assignments,
      addCourse,
      addModule,
      moveModule,
      addLesson,
      toggleLessonDelivered,
      replyToDoubt,
      setDoubtStatus,
      addEvent,
      deleteEvent,
      addReport,
      updateStudent,
      addStudent,
      dismissSuggestion,
      gradeSubmission,
      addAssignment,
      addQuiz,
      addMaterial,
      submitGradesForApproval,
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
      reports,
      suggestions,
      assignments,
      addCourse,
      addModule,
      moveModule,
      addLesson,
      toggleLessonDelivered,
      replyToDoubt,
      setDoubtStatus,
      addEvent,
      deleteEvent,
      addReport,
      updateStudent,
      addStudent,
      dismissSuggestion,
      gradeSubmission,
      addAssignment,
      addQuiz,
      addMaterial,
      submitGradesForApproval,
    ],
  )

  return <TeacherDataContext.Provider value={value}>{children}</TeacherDataContext.Provider>
}

export function useTeacherData(): TeacherData {
  const ctx = useContext(TeacherDataContext)
  if (!ctx) throw new Error("useTeacherData must be used inside <TeacherDataProvider>")
  return ctx
}
