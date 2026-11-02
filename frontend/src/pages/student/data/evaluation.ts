import { api } from "@/lib/api"

/** A released grade's rubric breakdown, and the student's re-evaluation request for it. */
export interface StudentRequest {
  id: string
  status: "Pending" | "In Review" | "Revised" | "Upheld"
  reason: string
  created_at: string
  original_score: number
  revised_score: number | null
  resolution: string | null
  resolved_at: string | null
}

export interface StudentEvaluation {
  assignment_id: string
  score: number | null
  grade: string | null
  max_marks: number
  feedback: string | null
  graded_at: string | null
  evaluator_name: string | null
  rubric: { title: string; criteria: { id: string; title: string; description: string; max_points: number }[] } | null
  /** Points and comments per criterion; null for grades given before rubric scoring. */
  scores: Record<string, { points: number | null; comment: string }> | null
  reevaluation: StudentRequest | null
  reevaluation_closes_at: string | null
  can_request: boolean
}

export const loadEvaluation = (assignmentId: string) => api.get<StudentEvaluation>(`/student/assignments/${assignmentId}/evaluation`, "The evaluation couldn't be loaded.")

export const requestReevaluation = (assignmentId: string, reason: string) =>
  api.post<StudentRequest>(`/student/assignments/${assignmentId}/reevaluation`, { reason }, "Your request couldn't be sent.")
