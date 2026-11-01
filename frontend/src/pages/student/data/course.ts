import { supabase, unwrap, type Tables } from "@/lib/supabase"
import type { ResourceMaterial } from "../studentTypes"
import { fmtDate } from "../studentUtils"

/* -------------------------------- Materials ------------------------------- */

export async function loadMaterials(courseId: string): Promise<ResourceMaterial[]> {
  const rows = unwrap(await supabase.from("course_materials").select("*").eq("course_id", courseId).order("position"))
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
  const [questions, votes] = await Promise.all([
    supabase.from("course_questions").select("*").eq("course_id", courseId).order("created_at", { ascending: false }),
    supabase.from("course_question_votes").select("question_id"),
  ])
  return { questions: unwrap(questions), voted: unwrap(votes).map((v) => v.question_id) }
}

export async function askQuestion(courseId: string, body: string): Promise<QuestionRow> {
  return unwrap(await supabase.from("course_questions").insert({ course_id: courseId, body: body.trim() }).select("*").single(), "Your question couldn't be posted.")
}

export async function setQuestionVote(questionId: string, on: boolean) {
  if (on) unwrap(await supabase.from("course_question_votes").upsert({ question_id: questionId }, { onConflict: "question_id,student_id", ignoreDuplicates: true }).select("question_id"))
  else unwrap(await supabase.from("course_question_votes").delete().eq("question_id", questionId).select("question_id"))
}

export async function deleteQuestion(id: string) {
  unwrap(await supabase.from("course_questions").delete().eq("id", id).select("id"))
}
