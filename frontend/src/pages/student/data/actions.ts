import { api, ApiError, fileUrl, uploadFile as upload, type Json, type Tables, type UploadBucket } from "@/lib/api"
import type { AssessmentAttempt, AssessmentQuestion } from "../studentTypes"
import { toAttempt, type AttemptRow, type Profile } from "./core"

/* --------------------------------- Courses -------------------------------- */

export async function enroll(courseId: string): Promise<string> {
  const row = await api.post<{ enrolled_at: string }>("/student/enrollments", { course_id: courseId }, "Enrolling failed. Try again.")
  return row.enrolled_at
}

export interface LessonResult {
  course_id: string
  completed: number
  total: number
  certificate: Tables<"certificates"> | null
}

export async function setLessonComplete(lessonId: string, done: boolean): Promise<LessonResult> {
  return api.post<LessonResult>(`/student/lessons/${encodeURIComponent(lessonId)}/complete`, { done }, "Your progress couldn't be saved.")
}

/* ------------------------------- Assignments ------------------------------ */

export const MAX_SUBMISSION_BYTES = 50 * 1024 * 1024

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Uploads to the student's own folder and returns the storage key. */
export async function uploadFile(bucket: UploadBucket, _uid: string, folder: string, file: File): Promise<string> {
  return upload(bucket, folder, file)
}

export interface SubmissionInput {
  repoUrl?: string
  comments?: string
  file?: File | null
}

export async function submitAssignment(_uid: string, assignmentId: string, input: SubmissionInput): Promise<Tables<"assignment_submissions">> {
  let fileKey: string | undefined
  if (input.file) {
    if (input.file.size > MAX_SUBMISSION_BYTES) throw new ApiError("Files can be up to 50 MB.")
    fileKey = await upload("submissions", assignmentId, input.file)
  }
  return api.post<Tables<"assignment_submissions">>(
    `/student/assignments/${encodeURIComponent(assignmentId)}/submission`,
    {
      repo_url: input.repoUrl?.trim() || undefined,
      comments: input.comments?.trim() || undefined,
      file_key: fileKey,
      file_name: input.file?.name,
      file_size: input.file ? fileSize(input.file.size) : undefined,
    },
    "Your submission couldn't be saved.",
  )
}

/** A short-lived link to a submitted file. */
export async function submissionFileUrl(path: string): Promise<string> {
  return fileUrl(path)
}

/* --------------------------------- Quizzes -------------------------------- */

export interface QuizQuestion {
  position: number
  question: string
  options: string[]
  topic?: string
  difficulty?: "Easy" | "Medium" | "Hard"
}

export interface LiveQuiz {
  attemptId: string
  attemptNumber: number
  /** Deadline in this device's clock (corrected for clock skew). */
  deadline: number
  answers: Record<number, number>
  questions: QuizQuestion[]
}

function answersFrom(json: unknown): Record<number, number> {
  const out: Record<number, number> = {}
  if (json && typeof json === "object" && !Array.isArray(json)) for (const [k, v] of Object.entries(json)) if (typeof v === "number") out[Number(k)] = v
  return out
}

interface QuestionJson {
  position: number
  question: string
  options: string[]
  topic: string | null
  difficulty: QuizQuestion["difficulty"] | null
  correct_index?: number
  explanation?: string
}

/** Starts the quiz (or resumes the running attempt). Questions arrive without answers. */
export async function startQuiz(quizId: string): Promise<LiveQuiz> {
  const requested = Date.now()
  const p = await api.post<{ attempt_id: string; attempt_number: number; deadline_at: string; server_now: string; answers: Json; questions: QuestionJson[] }>(
    `/student/quizzes/${encodeURIComponent(quizId)}/start`,
    {},
    "The quiz couldn't be started.",
  )
  const received = Date.now()
  const offset = Date.parse(p.server_now) - (requested + received) / 2
  return {
    attemptId: p.attempt_id,
    attemptNumber: p.attempt_number,
    deadline: Date.parse(p.deadline_at) - offset,
    answers: answersFrom(p.answers),
    questions: p.questions.map((q) => ({ position: q.position, question: q.question, options: q.options, topic: q.topic ?? undefined, difficulty: q.difficulty ?? undefined })),
  }
}

const toJsonAnswers = (answers: Record<number, number>) => Object.fromEntries(Object.entries(answers).map(([k, v]) => [String(k), v]))

export async function saveQuizAnswers(attemptId: string, answers: Record<number, number>) {
  await api.put(`/student/quiz-attempts/${encodeURIComponent(attemptId)}/answers`, { answers: toJsonAnswers(answers) }, "Your answers couldn't be saved.")
}

export interface QuizReview {
  row: AttemptRow
  attempt: AssessmentAttempt
  questions: AssessmentQuestion[]
}

function toReview(json: { attempt: AttemptRow; questions: QuestionJson[] }, uid: string, name?: string): QuizReview {
  return {
    row: json.attempt,
    attempt: toAttempt(json.attempt, uid, name),
    questions: json.questions.map((q) => ({
      id: q.position,
      question: q.question,
      options: q.options,
      correctAnswer: q.correct_index ?? -1,
      explanation: q.explanation ?? "",
      topic: q.topic ?? undefined,
      difficulty: q.difficulty ?? undefined,
    })),
  }
}

export async function submitQuiz(uid: string, attemptId: string, answers: Record<number, number>, name?: string): Promise<QuizReview> {
  const res = await api.post<{ attempt: AttemptRow; questions: QuestionJson[] }>(
    `/student/quiz-attempts/${encodeURIComponent(attemptId)}/submit`,
    { answers: toJsonAnswers(answers) },
    "The quiz couldn't be submitted. Your answers are saved; try again.",
  )
  return toReview(res, uid, name)
}

export async function getQuizReview(uid: string, attemptId: string, name?: string): Promise<QuizReview> {
  return toReview(await api.get(`/student/quiz-attempts/${encodeURIComponent(attemptId)}/review`, "The review couldn't be loaded."), uid, name)
}

/* --------------------------------- Profile -------------------------------- */

export type ProfilePatch = Partial<Pick<Profile, "full_name" | "phone" | "location" | "bio" | "avatar_url" | "notification_prefs" | "quiet_hours" | "ui_state">>

export async function updateProfile(_uid: string, patch: ProfilePatch): Promise<Profile> {
  return api.patch<Profile>("/student/profile", patch, "Your profile couldn't be saved.")
}

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024

/** Uploads a profile photo and returns the URL to store as avatar_url. */
export async function uploadAvatar(_uid: string, file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new ApiError("Use a PNG, JPG, WebP or GIF image.")
  if (file.size > MAX_AVATAR_BYTES) throw new ApiError("Profile photos can be up to 2 MB.")
  const key = await upload("avatars", "profile", file)
  return `/api/files/${key}`
}
