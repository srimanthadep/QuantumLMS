import { api, type StudentProfile, type Tables } from "@/lib/api"
import type { AssessmentAttempt, AssignmentData, CourseItem, LessonItem, ModuleItem, QuizData } from "../studentTypes"
import { fmtDate, fmtDateTime, relTime, stamp } from "../studentUtils"

/**
 * The data most pages share: the student's profile, every course with its curriculum and the student's progress,
 * and the assignments and quizzes of enrolled courses. Raw rows are cached; deriveCore turns them into the view
 * models the pages render, so a mutation only has to touch the rows.
 */
export type Profile = StudentProfile
export type AttemptRow = Pick<
  Tables<"quiz_attempts">,
  "id" | "quiz_id" | "attempt_number" | "started_at" | "deadline_at" | "submitted_at" | "time_taken_seconds" | "score" | "max_score" | "pct" | "passed" | "feedback" | "answers"
>
type LessonRow = Pick<Tables<"lessons">, "id" | "module_id" | "course_id" | "position" | "title" | "duration" | "minutes" | "type" | "summary">

export interface CoreRaw {
  uid: string
  profile: Profile
  courses: Tables<"courses">[]
  modules: Tables<"course_modules">[]
  lessons: LessonRow[]
  /** course_id -> enrolled_at */
  enrollments: Record<string, string>
  /** lesson_id -> completed_at */
  progress: Record<string, string>
  assignments: Tables<"assignments">[]
  /** assignment_id -> submission */
  submissions: Record<string, Tables<"assignment_submissions">>
  quizzes: Tables<"quizzes">[]
  attempts: AttemptRow[]
  /** assignment_id -> the student's re-evaluation request */
  reevaluations: Record<string, ReevaluationRow>
}

export interface ReevaluationRow {
  id: string
  assignment_id: string
  status: "Pending" | "In Review" | "Revised" | "Upheld"
  original_score: number
  revised_score: number | null
  created_at: string
  resolved_at: string | null
}

/** The student's quiz attempts. The server grades any that ran out of time first. */
export async function loadAttempts(): Promise<AttemptRow[]> {
  return api.get<AttemptRow[]>("/student/quiz-attempts")
}

interface CoreResponse {
  profile: Profile
  courses: Tables<"courses">[]
  modules: Tables<"course_modules">[]
  lessons: LessonRow[]
  enrollments: { course_id: string; enrolled_at: string }[]
  progress: { lesson_id: string; completed_at: string }[]
  assignments: Tables<"assignments">[]
  submissions: Tables<"assignment_submissions">[]
  quizzes: Tables<"quizzes">[]
  attempts: AttemptRow[]
  reevaluations: ReevaluationRow[]
}

export async function loadCore(uid: string): Promise<CoreRaw> {
  const r = await api.get<CoreResponse>("/student/core", "Your profile could not be loaded.")
  return {
    uid,
    profile: r.profile,
    courses: r.courses,
    modules: r.modules,
    lessons: r.lessons,
    enrollments: Object.fromEntries(r.enrollments.map((e) => [e.course_id, e.enrolled_at])),
    progress: Object.fromEntries(r.progress.map((p) => [p.lesson_id, p.completed_at])),
    assignments: r.assignments,
    submissions: Object.fromEntries(r.submissions.map((s) => [s.assignment_id, s])),
    quizzes: r.quizzes,
    attempts: r.attempts,
    reevaluations: Object.fromEntries((r.reevaluations ?? []).map((x) => [x.assignment_id, x])),
  }
}

export interface CoreView {
  /** Enrolled courses, most recently studied first. */
  courses: CourseItem[]
  /** Courses the student hasn't enrolled in. */
  catalog: CourseItem[]
  curriculum: Record<string, ModuleItem[]>
  completed: Set<string>
  assignments: AssignmentData[]
  quizzes: QuizData[]
  /** Submitted attempts by id. */
  attempts: Record<string, AssessmentAttempt>
}

/** "Project 1: End-to-End RAG…" -> "Project 1". */
function shortTitle(title: string) {
  const head = title.split(":")[0].trim()
  return head.length <= 32 ? head : `${head.slice(0, 30).trimEnd()}…`
}
const monthDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit" })

export function toAttempt(a: AttemptRow, uid: string, name?: string): AssessmentAttempt {
  const answers: Record<number, number> = {}
  if (a.answers && typeof a.answers === "object" && !Array.isArray(a.answers)) {
    for (const [k, v] of Object.entries(a.answers)) if (typeof v === "number") answers[Number(k)] = v
  }
  return {
    id: a.id,
    quizId: a.quiz_id,
    studentId: uid,
    studentName: name,
    attemptNumber: a.attempt_number,
    startedAt: stamp(a.started_at),
    submittedAt: a.submitted_at ? stamp(a.submitted_at) : "",
    timeTakenSeconds: a.time_taken_seconds ?? 0,
    answers,
    score: a.score ?? 0,
    maxScore: a.max_score ?? 0,
    scoreStr: `${a.score ?? 0}/${a.max_score ?? 0}`,
    pct: a.pct ?? 0,
    passed: !!a.passed,
    feedback: a.feedback ?? undefined,
  }
}

export function deriveCore(raw: CoreRaw, now = Date.now()): CoreView {
  const completed = new Set(Object.keys(raw.progress))
  const courseTitle = new Map(raw.courses.map((c) => [c.id, c.title]))
  const lessonsByModule = new Map<string, LessonRow[]>()
  for (const l of raw.lessons) {
    const list = lessonsByModule.get(l.module_id)
    if (list) list.push(l)
    else lessonsByModule.set(l.module_id, [l])
  }
  for (const list of lessonsByModule.values()) list.sort((a, b) => a.position - b.position)

  // Assignments and quizzes only for enrolled courses.
  const assignments: AssignmentData[] = raw.assignments
    .filter((a) => raw.enrollments[a.course_id])
    .map((a) => {
      const sub = raw.submissions[a.id]
      return {
        id: a.id,
        title: a.title,
        course: courseTitle.get(a.course_id) ?? "",
        courseId: a.course_id,
        dueAt: a.due_at,
        dueDate: fmtDate(a.due_at),
        maxMarks: a.max_marks,
        priority: a.priority as AssignmentData["priority"],
        description: a.description,
        status: (sub?.status as AssignmentData["status"]) ?? "Pending",
        submittedAt: sub?.submitted_at,
        submissionDate: sub ? relTime(sub.submitted_at, now) : undefined,
        grade: sub?.grade ?? undefined,
        score: sub?.score ?? undefined,
        feedback: sub?.feedback ?? undefined,
        repoUrl: sub?.repo_url ?? undefined,
        comments: sub?.comments ?? undefined,
        uploadedFileName: sub?.file_name ? `${sub.file_name}${sub.file_size ? ` (${sub.file_size})` : ""}` : undefined,
        reevaluation: raw.reevaluations[a.id]
          ? { status: raw.reevaluations[a.id].status, originalScore: raw.reevaluations[a.id].original_score, revisedScore: raw.reevaluations[a.id].revised_score }
          : undefined,
      }
    })

  // Work to do first (soonest due), then work with evaluators, then graded work (most recent first).
  const STATUS_ORDER = { Pending: 0, Submitted: 1, "Under Review": 1, Graded: 2 } as const
  assignments.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.status === "Pending" ? (a.dueAt ?? "").localeCompare(b.dueAt ?? "") : (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")),
  )

  const attempts: Record<string, AssessmentAttempt> = {}
  const name = raw.profile.full_name
  for (const a of raw.attempts) if (a.submitted_at) attempts[a.id] = toAttempt(a, raw.uid, name)

  const quizzes: QuizData[] = raw.quizzes
    .filter((q) => raw.enrollments[q.course_id])
    .map((q) => {
      const mine = raw.attempts.filter((a) => a.quiz_id === q.id)
      const submitted = mine.filter((a) => a.submitted_at).sort((a, b) => a.attempt_number - b.attempt_number)
      const open = mine.find((a) => !a.submitted_at)
      const latest = submitted[submitted.length - 1]
      const opensLater = !!q.available_from && now < Date.parse(q.available_from)
      const closed = now > Date.parse(q.due_at)
      const status: QuizData["status"] = open
        ? "Active"
        : submitted.length >= q.max_attempts
          ? "Completed"
          : opensLater
            ? "Upcoming"
            : closed
              ? submitted.length
                ? "Completed"
                : "Closed"
              : "Active"
      return {
        id: q.id,
        title: q.title,
        course: courseTitle.get(q.course_id) ?? "",
        courseId: q.course_id,
        dueAt: q.due_at,
        dueDate: fmtDate(q.due_at),
        availableAt: q.available_from ?? undefined,
        availableFrom: q.available_from ? fmtDateTime(q.available_from) : undefined,
        durationMinutes: q.duration_minutes,
        questionCount: q.question_count,
        passingPct: q.passing_pct,
        maxAttempts: q.max_attempts,
        attemptsUsed: submitted.length,
        status,
        score: latest ? `${latest.score}/${latest.max_score}` : undefined,
        pct: latest?.pct ?? undefined,
        latestAttemptId: latest?.id,
        openAttemptId: open?.id,
        openDeadline: open?.deadline_at,
      }
    })

  const curriculum: Record<string, ModuleItem[]> = {}
  const items: (CourseItem & { _enrolledAt?: string })[] = []
  for (const c of raw.courses) {
    const enrolledAt = raw.enrollments[c.id]
    const mods = raw.modules.filter((m) => m.course_id === c.id).sort((a, b) => a.position - b.position)
    const ordered = mods.flatMap((m) => lessonsByModule.get(m.id) ?? [])
    const current = enrolledAt ? ordered.find((l) => !completed.has(l.id)) : undefined
    const modules: ModuleItem[] = mods.map((m) => {
      const lessons: LessonItem[] = (lessonsByModule.get(m.id) ?? []).map((l) => ({
        id: l.id,
        title: l.title,
        duration: l.duration,
        minutes: l.minutes,
        type: l.type as LessonItem["type"],
        summary: l.summary,
        status: completed.has(l.id) ? "Completed" : l.id === current?.id ? "In Progress" : "Locked",
      }))
      const done = lessons.filter((l) => l.status === "Completed").length
      return {
        id: m.id,
        title: m.title,
        lessonCount: lessons.length,
        duration: m.duration,
        status: lessons.length && done === lessons.length ? "Completed" : done > 0 || lessons.some((l) => l.status === "In Progress") ? "In Progress" : "Locked",
        lessons,
      }
    })
    curriculum[c.id] = modules

    const total = ordered.length
    const doneCount = ordered.filter((l) => completed.has(l.id)).length
    const finished = !!enrolledAt && total > 0 && doneCount === total
    const lastActivityAt = ordered.reduce<string | undefined>((latest, l) => {
      const t = raw.progress[l.id]
      return t && (!latest || t > latest) ? t : latest
    }, undefined)
    const currentModule = current ? mods.find((m) => m.id === current.module_id) : undefined

    // The next dated piece of work for this course, else the next lesson.
    const nextWork = [
      ...assignments.filter((a) => a.courseId === c.id && a.status === "Pending" && a.dueAt && Date.parse(a.dueAt) >= now).map((a) => ({ title: a.title, due: a.dueAt! })),
      ...quizzes.filter((q) => q.courseId === c.id && q.status === "Active" && q.dueAt).map((q) => ({ title: q.title, due: q.dueAt! })),
    ].sort((a, b) => a.due.localeCompare(b.due))[0]

    items.push({
      id: c.id,
      code: c.code,
      title: c.title,
      category: c.category,
      image: c.image,
      instructor: c.instructor,
      instructorRole: c.instructor_role,
      description: c.description,
      level: c.level as CourseItem["level"],
      credits: c.credits,
      duration: c.duration,
      rating: c.rating,
      reviews: c.reviews,
      progressColor: c.progress_color,
      totalModules: mods.length,
      completedModules: modules.filter((m) => m.status === "Completed").length,
      totalLessons: total,
      completedLessons: doneCount,
      progress: total ? Math.round((doneCount / total) * 100) : 0,
      status: !enrolledAt ? "Catalog" : finished ? "Completed" : "In Progress",
      lastActivityAt,
      lastWatched: !enrolledAt
        ? "Not started"
        : finished
          ? (ordered[ordered.length - 1]?.title ?? "Course complete")
          : current && currentModule
            ? `Module ${currentModule.position} · ${current.title}`
            : "Start the first lesson",
      nextMilestone: !enrolledAt
        ? "Enroll to begin"
        : finished
          ? "Course complete"
          : nextWork
            ? `${shortTitle(nextWork.title)} due ${monthDay(nextWork.due)}`
            : current
              ? `Next: ${current.title}`
              : "Keep going",
      _enrolledAt: enrolledAt,
    })
  }

  const recency = (c: (typeof items)[number]) => c.lastActivityAt ?? c._enrolledAt ?? ""
  const strip = ({ _enrolledAt, ...c }: (typeof items)[number]): CourseItem => (void _enrolledAt, c)
  return {
    courses: items.filter((c) => c.status !== "Catalog").sort((a, b) => recency(b).localeCompare(recency(a))).map(strip),
    catalog: items.filter((c) => c.status === "Catalog").map(strip),
    curriculum,
    completed,
    assignments,
    quizzes,
    attempts,
  }
}
