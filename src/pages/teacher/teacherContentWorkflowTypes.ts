/**
 * Quantum LMS - Teacher Content Creation & Approval Workflow Types
 * Strictly used within the Teacher Portal frontend.
 */

export type ContentSubmissionType = "assignment" | "quiz" | "material"

export type ContentApprovalStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "changes_requested"
  | "rejected"

export interface QuizQuestionOption {
  id: string
  text: string
}

export interface QuizQuestionItem {
  id: string
  questionText: string
  options: QuizQuestionOption[]
  correctOptionId: string
  marks: number
}

export interface ContentSubmissionHistoryEntry {
  timestamp: string
  action: "created" | "draft_saved" | "submitted" | "resubmitted" | "changes_requested" | "rejected" | "approved"
  notes?: string
  actor: string
}

export interface ContentSubmissionRecord {
  id: string
  title: string
  type: ContentSubmissionType
  courseId: string
  courseCode: string
  courseName: string
  moduleId?: string
  moduleTitle?: string
  lessonId?: string
  lessonTitle?: string
  teacherId: string
  teacherName: string
  status: ContentApprovalStatus
  createdAt: string
  submittedAt?: string
  updatedAt: string
  version: number
  adminFeedback?: string
  feedback?: string
  history: ContentSubmissionHistoryEntry[]

  // Assignment-specific payload
  assignmentData?: {
    description: string
    instructions: string
    maxMarks: number
    dueDate: string
    dueTime?: string
    attachmentName?: string
    attachmentSize?: string
    attachmentType?: string
  }

  // Quiz-specific payload
  quizData?: {
    description: string
    instructions: string
    timeLimitMinutes: number
    maxAttempts: number | "unlimited"
    totalMarks: number
    questions: QuizQuestionItem[]
  }

  // Material-specific payload
  materialData?: {
    description: string
    materialType: "PDF Document" | "Slide Deck" | "Lab Worksheet" | "Video Lecture" | "Audio Lecture" | "Reading & Notes"
    fileName: string
    fileSize: string
    fileType: string
    externalUrl?: string
  }
}

export interface CreateAssignmentInput {
  title: string
  courseId: string
  moduleId?: string
  lessonId?: string
  description: string
  instructions: string
  maxMarks: number
  dueDate: string
  dueTime?: string
  attachmentName?: string
  attachmentSize?: string
  attachmentType?: string
  submitForApproval: boolean
}

export interface CreateQuizInput {
  title: string
  courseId: string
  moduleId?: string
  lessonId?: string
  description: string
  instructions: string
  timeLimitMinutes: number
  maxAttempts: number | "unlimited"
  questions: QuizQuestionItem[]
  submitForApproval: boolean
}

export interface UploadMaterialInput {
  title: string
  courseId: string
  moduleId?: string
  lessonId?: string
  description: string
  materialType: "PDF Document" | "Slide Deck" | "Lab Worksheet" | "Video Lecture" | "Audio Lecture" | "Reading & Notes"
  fileName: string
  fileSize: string
  fileType: string
  externalUrl?: string
  submitForApproval: boolean
}
