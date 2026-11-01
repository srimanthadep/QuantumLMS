import { ApiError, supabase, toApiError, unwrap, type Json, type Tables } from "@/lib/supabase"
import type { AssessmentAttempt, AssessmentQuestion } from "../studentTypes"
import { toAttempt, type AttemptRow, type Profile } from "./core"

/* --------------------------------- Courses -------------------------------- */

export async function enroll(courseId: string): Promise<string> {
  const row = unwrap(await supabase.from("enrollments").insert({ course_id: courseId }).select("enrolled_at").single(), "Enrolling failed. Try again.")
  return row.enrolled_at
}

export interface LessonResult {
  course_id: string
  completed: number
  total: number
  certificate: Tables<"certificates"> | null
}

export async function setLessonComplete(lessonId: string, done: boolean): Promise<LessonResult> {
  const res = await supabase.rpc("set_lesson_complete", { p_lesson_id: lessonId, p_done: done })
  return unwrap(res, "Your progress couldn't be saved.") as unknown as LessonResult
}

/* ------------------------------- Assignments ------------------------------ */

export const MAX_SUBMISSION_BYTES = 50 * 1024 * 1024

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Storage-safe object name that keeps the extension. */
function objectName(file: File) {
  const clean = file.name.normalize("NFKD").replace(/[^\w.-]+/g, "_").replace(/_+/g, "_").slice(-80) || "file"
  return `${Date.now().toString(36)}-${clean}`
}

/** Uploads to "<bucket>/<uid>/<folder>/<name>" and returns the object path. */
export async function uploadFile(bucket: "submissions" | "ticket-attachments" | "avatars", uid: string, folder: string, file: File): Promise<string> {
  const path = `${uid}/${folder}/${objectName(file)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false })
  if (error) throw new ApiError(/exceeded|too large|413/i.test(error.message) ? "That file is too large." : `Upload failed: ${error.message}`)
  return path
}

export interface SubmissionInput {
  repoUrl?: string
  comments?: string
  file?: File | null
}

export async function submitAssignment(uid: string, assignmentId: string, input: SubmissionInput): Promise<Tables<"assignment_submissions">> {
  let filePath: string | undefined
  if (input.file) {
    if (input.file.size > MAX_SUBMISSION_BYTES) throw new ApiError("Files can be up to 50 MB.")
    filePath = await uploadFile("submissions", uid, assignmentId, input.file)
  }
  const res = await supabase.rpc("submit_assignment", {
    p_assignment_id: assignmentId,
    p_repo_url: input.repoUrl?.trim() || undefined,
    p_comments: input.comments?.trim() || undefined,
    p_file_path: filePath,
    p_file_name: input.file?.name,
    p_file_size: input.file ? fileSize(input.file.size) : undefined,
  })
  return unwrap(res, "Your submission couldn't be saved.")
}

/** A short-lived link to a submitted file. */
export async function submissionFileUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("submissions").createSignedUrl(path, 300)
  if (error || !data) throw toApiError(error ?? undefined, "The file couldn't be opened.")
  return data.signedUrl
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
  const p = unwrap(await supabase.rpc("start_quiz", { p_quiz_id: quizId }), "The quiz couldn't be started.") as unknown as {
    attempt_id: string
    attempt_number: number
    deadline_at: string
    server_now: string
    answers: Json
    questions: QuestionJson[]
  }
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

const toJsonAnswers = (answers: Record<number, number>) => Object.fromEntries(Object.entries(answers).map(([k, v]) => [String(k), v])) as Json

export async function saveQuizAnswers(attemptId: string, answers: Record<number, number>) {
  const { error } = await supabase.rpc("save_quiz_answers", { p_attempt_id: attemptId, p_answers: toJsonAnswers(answers) })
  if (error) throw toApiError(error, "Your answers couldn't be saved.")
}

export interface QuizReview {
  row: AttemptRow
  attempt: AssessmentAttempt
  questions: AssessmentQuestion[]
}

function toReview(json: unknown, uid: string, name?: string): QuizReview {
  const p = json as { attempt: AttemptRow; questions: QuestionJson[] }
  return {
    row: p.attempt,
    attempt: toAttempt(p.attempt, uid, name),
    questions: p.questions.map((q) => ({
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
  const res = await supabase.rpc("submit_quiz", { p_attempt_id: attemptId, p_answers: toJsonAnswers(answers) })
  return toReview(unwrap(res, "The quiz couldn't be submitted. Your answers are saved; try again."), uid, name)
}

export async function getQuizReview(uid: string, attemptId: string, name?: string): Promise<QuizReview> {
  return toReview(unwrap(await supabase.rpc("get_quiz_review", { p_attempt_id: attemptId }), "The review couldn't be loaded."), uid, name)
}

/* --------------------------------- Profile -------------------------------- */

export type ProfilePatch = Partial<Pick<Profile, "full_name" | "phone" | "location" | "bio" | "avatar_url" | "notification_prefs" | "quiet_hours" | "ui_state">>

export async function updateProfile(uid: string, patch: ProfilePatch): Promise<Profile> {
  return unwrap(await supabase.from("profiles").update(patch).eq("id", uid).select("*").single(), "Your profile couldn't be saved.")
}

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new ApiError("Use a PNG, JPG, WebP or GIF image.")
  if (file.size > MAX_AVATAR_BYTES) throw new ApiError("Profile photos can be up to 2 MB.")
  const path = await uploadFile("avatars", uid, "profile", file)
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl
}
