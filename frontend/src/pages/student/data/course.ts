import { api, type Tables } from "@/lib/api"
import type { ResourceMaterial } from "../studentTypes"
import { fmtDate } from "../studentUtils"

/* -------------------------------- Materials ------------------------------- */

export async function loadMaterials(courseId: string): Promise<ResourceMaterial[]> {
  const rows = await api.get<Tables<"course_materials">[]>(`/student/courses/${encodeURIComponent(courseId)}/materials`)
  return rows.map((m) => ({
    id: m.id,
    title: m.title,
    type: m.type as ResourceMaterial["type"],
    size: m.size,
    date: m.published_at ? fmtDate(m.published_at) : "",
    description: m.description,
    fileName: m.file_name ?? undefined,
    url: m.url ?? undefined,
    driveUrl: m.drive_url ?? undefined,
    driveId: m.drive_id ?? undefined,
    isAvailable: m.is_available,
    errorMessage: m.error_message ?? undefined,
    content: m.content ?? undefined,
    mimeType: m.mime_type ?? undefined,
  }))
}

/* ---------------------------------- Q & A --------------------------------- */

export type QuestionRow = Tables<"course_questions">

export interface QandAData {
  questions: QuestionRow[]
  /** Question ids the student upvoted. */
  voted: string[]
}

export async function loadQandA(courseId: string): Promise<QandAData> {
  return api.get<QandAData>(`/student/courses/${encodeURIComponent(courseId)}/questions`)
}

export async function askQuestion(courseId: string, body: string): Promise<QuestionRow> {
  return api.post<QuestionRow>(`/student/courses/${encodeURIComponent(courseId)}/questions`, { body: body.trim() }, "Your question couldn't be posted.")
}

export async function setQuestionVote(questionId: string, on: boolean) {
  await api.put(`/student/questions/${encodeURIComponent(questionId)}/vote`, { on })
}

export async function deleteQuestion(id: string) {
  await api.del(`/student/questions/${encodeURIComponent(id)}`)
}
