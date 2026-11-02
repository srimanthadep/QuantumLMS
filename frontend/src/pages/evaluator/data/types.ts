/** Shapes the evaluator API returns (backend/src/modules/evaluator). Timestamps are ISO strings. */

export type QueueState = "pending" | "draft" | "evaluated" | "released"
export type RequestStatus = "Pending" | "In Review" | "Revised" | "Upheld"

export interface QueueItem {
  id: string
  assignment_id: string
  assignment_title: string
  course_code: string
  course_title: string
  due_at: string
  max_marks: number
  student_id: string
  student_name: string
  student_avatar: string | null
  roll_number: string | null
  submitted_at: string
  late: boolean
  repo_url: string | null
  file_name: string | null
  state: QueueState
  evaluator_id: string | null
  evaluator_name: string | null
  /** The caller holds this evaluation. */
  mine: boolean
  /** On the assignment's scale. For drafts, the points given so far. */
  score: number | null
  grade: string | null
  evaluation_updated_at: string | null
  evaluated_at: string | null
  released_at: string | null
  reevaluation_status: RequestStatus | null
}

export interface AssessmentSummary {
  id: string
  title: string
  description: string
  due_at: string
  max_marks: number
  course_code: string
  course_title: string
  rubric_title: string | null
  criteria_count: number
  enrolled: number
  submissions: number
  pending: number
  drafts: number
  evaluated: number
  released: number
}

export interface QueueData {
  items: QueueItem[]
  assessments: AssessmentSummary[]
}

export interface Level {
  label: string
  points: number
  description: string
}

export interface Criterion {
  id: string
  position: number
  title: string
  description: string
  max_points: number
  levels: Level[]
}

export interface Rubric {
  id: string
  title: string
  version: string
  guidance: string
  criteria: Criterion[]
  max_points: number
}

export interface ScoreEntry {
  points: number | null
  comment: string
}
export type Scores = Record<string, ScoreEntry>

export interface Evaluation {
  id: string
  status: "draft" | "evaluated" | "released"
  scores: Scores
  total: number
  feedback: string
  private_note: string
  evaluator_id: string | null
  evaluator_name: string | null
  mine: boolean
  started_at: string
  updated_at: string
  evaluated_at: string | null
  released_at: string | null
}

export interface WorkspaceRequest {
  id: string
  status: RequestStatus
  reason: string
  created_at: string
  original_score: number
  revised_score: number | null
  resolution: string | null
  handled_by: string | null
  handled_by_name: string | null
  mine: boolean
  resolved_at: string | null
}

export interface Workspace {
  submission: {
    id: string
    status: string
    submitted_at: string
    late: boolean
    repo_url: string | null
    comments: string | null
    file: { name: string; size: string | null; language: string | null } | null
    score: number | null
    grade: string | null
    graded_at: string | null
  }
  student: {
    id: string
    name: string
    avatar_url: string | null
    roll_number: string | null
    program: string | null
    batch: string | null
    graded_count: number
    average_pct: number | null
  }
  assignment: {
    id: string
    title: string
    description: string
    due_at: string
    max_marks: number
    course_code: string
    course_title: string
  }
  rubric: Rubric | null
  evaluation: Evaluation | null
  reevaluation: WorkspaceRequest | null
}

export interface FilePreview {
  name: string
  language: string
  size: number
  truncated: boolean
  text: string
}

export interface ReevaluationItem {
  id: string
  status: RequestStatus
  reason: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  original_score: number
  revised_score: number | null
  resolution: string | null
  handled_by: string | null
  handled_by_name: string | null
  mine: boolean
  submission_id: string
  assignment_id: string
  assignment_title: string
  max_marks: number
  course_code: string
  student_id: string
  student_name: string
  student_avatar: string | null
  roll_number: string | null
  graded_at: string | null
}

export interface AssessmentReport {
  id: string
  title: string
  course_code: string
  max_marks: number
  due_at: string
  submissions: number
  finished: number
  released: number
  pending: number
  avg_pct: number | null
  median_pct: number | null
  high_pct: number | null
  low_pct: number | null
  /** Finished work per 10-point band: 0–9, 10–19 … 90–100. */
  distribution: number[]
  grades: Record<string, number>
  criteria: { id: string; title: string; max_points: number; avg_points: number | null; avg_pct: number | null; scored: number }[]
}

export interface Reports {
  me: {
    finished_total: number
    finished_30d: number
    released_30d: number
    avg_turnaround_hours: number | null
    by_day: { day: string; count: number }[]
  }
  assessments: AssessmentReport[]
  team: { id: string; name: string; finished: number; avg_pct: number | null; you: boolean }[]
  reevaluations: { total: number; open: number; revised: number; upheld: number; avg_change: number | null }
}

export interface Preferences {
  queue_sort: "oldest" | "newest" | "due" | "student"
  auto_advance: boolean
  show_levels: boolean
  daily_goal: number
}

export interface EvaluatorProfile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  is_demo: boolean
  title: string
  department: string
  specializations: string[]
  preferences: Preferences
  finished_total: number
  released_total: number
  assigned: { id: string; title: string; course_code: string }[]
}

export type ProfilePatch = Partial<Pick<EvaluatorProfile, "full_name" | "title" | "department" | "specializations">> & { preferences?: Partial<Preferences> }

/** What the workspace sends when saving or finishing. */
export interface EvaluationDraft {
  scores: Scores
  feedback: string
  private_note: string
}
