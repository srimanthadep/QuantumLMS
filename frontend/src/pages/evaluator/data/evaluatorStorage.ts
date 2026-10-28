import type {
  EvaluatorAssessment,
  StudentSubmission,
  ReassessmentRequest,
  EvaluatorNotification,
  EvaluatorActivity,
  EvaluatorSettings,
  EvaluationRecord,
} from "../types"
import {
  initialAssessments,
  initialSubmissions,
  initialActivities,
  initialNotifications,
  initialSettings,
} from "./evaluatorMockData"

const STORAGE_KEY = "quantum_evaluator_state_v1"

export interface EvaluatorState {
  assessments: EvaluatorAssessment[]
  submissions: StudentSubmission[]
  activities: EvaluatorActivity[]
  notifications: EvaluatorNotification[]
  settings: EvaluatorSettings
  lastUpdated: string
}

export function loadEvaluatorState(): EvaluatorState {
  if (typeof window === "undefined") {
    return {
      assessments: initialAssessments,
      submissions: initialSubmissions,
      activities: initialActivities,
      notifications: initialNotifications,
      settings: initialSettings,
      lastUpdated: new Date().toISOString(),
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as EvaluatorState
      if (parsed && Array.isArray(parsed.assessments) && Array.isArray(parsed.submissions)) {
        return parsed
      }
    }
  } catch (err) {
    console.error("Failed to parse quantum evaluator state from localStorage:", err)
  }

  // Fallback to fresh initial state and save
  const freshState: EvaluatorState = {
    assessments: initialAssessments,
    submissions: initialSubmissions,
    activities: initialActivities,
    notifications: initialNotifications,
    settings: initialSettings,
    lastUpdated: new Date().toISOString(),
  }
  saveEvaluatorState(freshState)
  return freshState
}

export function saveEvaluatorState(state: EvaluatorState): void {
  if (typeof window === "undefined") return
  try {
    const updated = { ...state, lastUpdated: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    // Dispatch custom event so multiple evaluator components can react if needed
    window.dispatchEvent(new CustomEvent("quantum_evaluator_updated", { detail: updated }))
  } catch (err) {
    console.error("Failed to save quantum evaluator state to localStorage:", err)
  }
}

// -------------------------------------------------------------
// Pure Calculation Helpers
// -------------------------------------------------------------
export function getDashboardMetrics(state: EvaluatorState) {
  const totalAssigned = state.assessments.length
  
  // Pending submissions: any submission assigned to evaluator not yet finalized as Evaluated
  const pendingEvaluations = state.submissions.filter(
    (s) => s.status !== "Evaluated"
  ).length

  // Completed evaluations: finalized evaluations
  const completedEvaluations = state.submissions.filter(
    (s) => s.status === "Evaluated"
  ).length

  // Upcoming deadlines: assessments with deadlines approaching within 7 days or pending
  const now = new Date()
  const upcomingDeadlinesCount = state.assessments.filter((a) => {
    const d = new Date(a.deadline)
    const diffDays = (d.getTime() - now.getTime()) / (1000 * 3600 * 24)
    return diffDays >= -1 && diffDays <= 7 && a.pendingCount > 0
  }).length

  return {
    totalAssigned,
    pendingEvaluations,
    completedEvaluations,
    upcomingDeadlinesCount,
  }
}

// -------------------------------------------------------------
// Mutation Actions
// -------------------------------------------------------------

/**
 * Save draft evaluation for a submission
 */
export function saveSubmissionDraft(
  state: EvaluatorState,
  submissionId: string,
  evaluation: EvaluationRecord
): EvaluatorState {
  const now = new Date().toISOString()
  const submission = state.submissions.find((s) => s.id === submissionId)
  if (!submission) return state

  const updatedSubmissions = state.submissions.map((sub) => {
    if (sub.id === submissionId) {
      return {
        ...sub,
        status: "Draft Saved" as const,
        draftEvaluation: {
          ...evaluation,
          status: "Draft" as const,
          lastSavedAt: now,
        },
      }
    }
    return sub
  })

  // Add activity entry
  const newActivity: EvaluatorActivity = {
    id: `act-${Date.now()}`,
    type: "draft_saved",
    title: "Draft Saved",
    description: `Saved draft evaluation for ${submission.studentName} (${submission.assessmentTitle}).`,
    timestamp: now,
    assessmentId: submission.assessmentId,
    submissionId: submission.id,
  }

  const nextState: EvaluatorState = {
    ...state,
    submissions: updatedSubmissions,
    activities: [newActivity, ...state.activities.slice(0, 19)],
  }

  saveEvaluatorState(nextState)
  return nextState
}

/**
 * Finalize and submit evaluation
 */
export function finalizeEvaluation(
  state: EvaluatorState,
  submissionId: string,
  evaluation: EvaluationRecord
): EvaluatorState {
  const now = new Date().toISOString()
  const submission = state.submissions.find((s) => s.id === submissionId)
  if (!submission) return state

  const wasEvaluated = submission.status === "Evaluated"

  const finalizedRecord: EvaluationRecord = {
    ...evaluation,
    status: "Evaluated",
    releaseStatus: "Awaiting Release", // Institutional rule: evaluators cannot directly publish
    completedAt: now,
    lastSavedAt: now,
  }

  const updatedSubmissions = state.submissions.map((sub) => {
    if (sub.id === submissionId) {
      return {
        ...sub,
        status: "Evaluated" as const,
        releaseStatus: "Awaiting Release" as const,
        finalMarks: evaluation.totalAwardedMarks,
        finalizedEvaluation: finalizedRecord,
        draftEvaluation: undefined, // Clear draft once finalized
      }
    }
    return sub
  })

  // Update assessment counts if newly evaluated
  const updatedAssessments = state.assessments.map((asm) => {
    if (asm.id === submission.assessmentId && !wasEvaluated) {
      return {
        ...asm,
        evaluatedCount: asm.evaluatedCount + 1,
        pendingCount: Math.max(0, asm.pendingCount - 1),
      }
    }
    return asm
  })

  const newActivity: EvaluatorActivity = {
    id: `act-${Date.now()}`,
    type: "completed",
    title: "Evaluation Completed",
    description: `Completed evaluation for ${submission.studentName}: ${evaluation.totalAwardedMarks}/${submission.maxMarks} marks awarded.`,
    timestamp: now,
    assessmentId: submission.assessmentId,
    submissionId: submission.id,
  }

  const nextState: EvaluatorState = {
    ...state,
    assessments: updatedAssessments,
    submissions: updatedSubmissions,
    activities: [newActivity, ...state.activities.slice(0, 19)],
  }

  saveEvaluatorState(nextState)
  return nextState
}

/**
 * Review and decide on a student reassessment request
 */
export function resolveReassessment(
  state: EvaluatorState,
  requestId: string,
  decision: "Revised" | "Upheld",
  revisedMarks: number | undefined,
  findings: string,
  evaluatorNotes?: string
): EvaluatorState {
  const now = new Date().toISOString()
  
  let targetSubmissionId = ""
  let studentName = ""
  let assessmentTitle = ""
  let originalMarks = 0

  const updatedSubmissions = state.submissions.map((sub) => {
    if (sub.reassessmentRequest && sub.reassessmentRequest.id === requestId) {
      targetSubmissionId = sub.id
      studentName = sub.studentName
      assessmentTitle = sub.assessmentTitle
      originalMarks = sub.reassessmentRequest.originalMarks

      const updatedRequest: ReassessmentRequest = {
        ...sub.reassessmentRequest,
        status: decision === "Revised" ? "Resolved" : "Upheld",
        revisedMarks: decision === "Revised" ? revisedMarks : sub.reassessmentRequest.originalMarks,
        findings,
        outcomeDate: now,
        evaluatorNotes,
      }

      const nextFinalMarks = decision === "Revised" && typeof revisedMarks === "number"
        ? revisedMarks
        : sub.finalMarks

      return {
        ...sub,
        status: "Evaluated" as const,
        releaseStatus: (decision === "Revised" ? "Reassessed" : "Awaiting Release") as any,
        finalMarks: nextFinalMarks,
        reassessmentRequest: updatedRequest,
      }
    }
    return sub
  })

  const newActivity: EvaluatorActivity = {
    id: `act-${Date.now()}`,
    type: "completed",
    title: `Reassessment ${decision === "Revised" ? "Approved & Revised" : "Upheld"}`,
    description: decision === "Revised"
      ? `Reassessed ${studentName} for ${assessmentTitle}: marks adjusted from ${originalMarks} to ${revisedMarks}.`
      : `Reassessment reviewed for ${studentName}: original score of ${originalMarks} was upheld.`,
    timestamp: now,
    submissionId: targetSubmissionId,
  }

  const nextState: EvaluatorState = {
    ...state,
    submissions: updatedSubmissions,
    activities: [newActivity, ...state.activities.slice(0, 19)],
  }

  saveEvaluatorState(nextState)
  return nextState
}

/**
 * Mark notification as read
 */
export function markNotificationRead(state: EvaluatorState, notificationId: string): EvaluatorState {
  const nextNotifications = state.notifications.map((n) =>
    n.id === notificationId ? { ...n, read: true } : n
  )
  const nextState = { ...state, notifications: nextNotifications }
  saveEvaluatorState(nextState)
  return nextState
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsRead(state: EvaluatorState): EvaluatorState {
  const nextNotifications = state.notifications.map((n) => ({ ...n, read: true }))
  const nextState = { ...state, notifications: nextNotifications }
  saveEvaluatorState(nextState)
  return nextState
}

/**
 * Update evaluator settings
 */
export function updateEvaluatorSettings(
  state: EvaluatorState,
  newSettings: EvaluatorSettings
): EvaluatorState {
  const nextState = { ...state, settings: newSettings }
  saveEvaluatorState(nextState)
  return nextState
}

/**
 * Reset back to default mock data (useful for testing)
 */
export function resetEvaluatorToDefaults(): EvaluatorState {
  const defaultState: EvaluatorState = {
    assessments: initialAssessments,
    submissions: initialSubmissions,
    activities: initialActivities,
    notifications: initialNotifications,
    settings: initialSettings,
    lastUpdated: new Date().toISOString(),
  }
  saveEvaluatorState(defaultState)
  return defaultState
}
