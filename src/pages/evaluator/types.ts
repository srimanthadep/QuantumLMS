import type { UserRole, CurrentUser, IconName } from "../../types"

export type AssessmentType =
  | "Assignment"
  | "Quiz"
  | "Test"
  | "Midterm Examination"
  | "Final Examination"
  | "Project"
  | "Practical Examination"
  | "Lab Assessment"
  | "Presentation"
  | "Viva Assessment"

export type EvaluationStatus =
  | "Submitted"
  | "In Progress"
  | "Draft Saved"
  | "Evaluated"
  | "Resubmitted"
  | "Reassessment Requested"
  | "Reassessment In Progress"
  | "Overdue"
  | "Returned for Correction"

export type ReleaseStatus =
  | "Draft"
  | "Evaluated"
  | "Awaiting Release"
  | "Released"
  | "Reassessment Pending"
  | "Reassessed"

export interface RubricPerformanceLevel {
  level: "Exemplary" | "Proficient" | "Developing" | "Novice"
  points: number
  description: string
}

export interface RubricCriterion {
  id: string
  name: string
  description: string
  maxMarks: number
  weightPercentage?: number
  performanceLevels: RubricPerformanceLevel[]
  partialCreditAllowed: boolean
  markingInstructions?: string
}

export interface Rubric {
  id: string
  name: string
  version: string
  totalMarks: number
  assessmentType: AssessmentType
  criteria: RubricCriterion[]
  partialCreditRules: string
  instructions: string
  isOfficialLocked: boolean
}

export interface EvaluatorAssessment {
  id: string
  title: string
  code: string
  course: string
  courseCode: string
  batch: string
  type: AssessmentType
  description: string
  instructions: string
  maxMarks: number
  rubric: Rubric
  assignedStudentsCount: number
  submissionCount: number
  evaluatedCount: number
  pendingCount: number
  deadline: string
  status: "Active" | "Completed" | "Pending Review"
}

export interface SubmissionFile {
  id: string
  name: string
  size: string
  type: "pdf" | "image" | "code" | "doc" | "text" | "archive"
  language?: string
  content?: string
  pageCount?: number
  url?: string
}

export interface QuestionAnswer {
  id: string
  questionNumber: number
  questionText: string
  questionType: "multiple_choice" | "subjective" | "code"
  studentAnswer: string
  correctAnswer?: string
  maxMarks: number
  assignedForManualGrading: boolean
  awardedMarks?: number
  evaluatorFeedback?: string
}

export interface CriterionScore {
  criterionId: string
  criterionName: string
  awardedMarks: number
  maxMarks: number
  feedback?: string
}

export interface EvaluationRecord {
  id: string
  submissionId: string
  assessmentId: string
  evaluatorId: string
  evaluatorName: string
  timestamp: string
  status: "Draft" | "Evaluated"
  criterionScores: CriterionScore[]
  questionScores?: Record<string, number>
  questionFeedback?: Record<string, string>
  totalAwardedMarks: number
  maxMarks: number
  overallFeedback: string
  strengths: string
  areasForImprovement: string
  suggestions: string
  lastSavedAt: string
  completedAt?: string
  releaseStatus: ReleaseStatus
}

export interface ReassessmentRequest {
  id: string
  submissionId: string
  studentId: string
  studentName: string
  studentRoll: string
  assessmentId: string
  assessmentTitle: string
  course: string
  requestDate: string
  reason: string
  originalMarks: number
  maxMarks: number
  originalFeedback: string
  status: "Pending" | "In Progress" | "Resolved" | "Upheld"
  revisedMarks?: number
  findings?: string
  outcomeDate?: string
  evaluatorNotes?: string
}

export interface StudentSubmission {
  id: string
  studentId: string
  studentName: string
  studentRoll: string
  studentAvatar: string
  assessmentId: string
  assessmentTitle: string
  assessmentType: AssessmentType
  course: string
  courseCode: string
  submissionDate: string
  version: string
  status: EvaluationStatus
  releaseStatus: ReleaseStatus
  finalMarks?: number
  maxMarks: number
  files: SubmissionFile[]
  questionAnswers?: QuestionAnswer[]
  projectRepoUrl?: string
  projectDemoUrl?: string
  previousAttemptsCount?: number
  draftEvaluation?: EvaluationRecord
  finalizedEvaluation?: EvaluationRecord
  reassessmentRequest?: ReassessmentRequest
}

export interface EvaluatorActivity {
  id: string
  type: "completed" | "draft_saved" | "feedback_submitted" | "reassessment_received" | "correction_returned"
  title: string
  description: string
  timestamp: string
  assessmentId?: string
  submissionId?: string
}

export interface EvaluatorNotification {
  id: string
  title: string
  message: string
  category: "Assignment" | "Submission" | "Deadline" | "Reassessment" | "System"
  timestamp: string
  read: boolean
  priority: "normal" | "high" | "urgent"
  targetTab?: string
  relatedId?: string
}

export interface EvaluatorProfile {
  id: string
  name: string
  role: string
  title: string
  email: string
  avatar: string
  department: string
  assignedSpecializations: string[]
  assignedCourses: string[]
}

export interface EvaluatorSettings {
  profile: EvaluatorProfile
  notificationPreferences: {
    newSubmissions: boolean
    deadlineReminders: boolean
    reassessmentRequests: boolean
    systemAnnouncements: boolean
  }
  defaultSort: "deadline" | "submissionDate" | "studentName" | "score"
  listView: "detailed" | "compact"
  autoAdvanceOnSubmit: boolean
  showRubricWeights: boolean
}
