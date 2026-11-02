import React, { useState, useEffect, useMemo, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { CurrentUser } from "../../types"
import type { EvaluatorTab, StudentSubmission } from "./types"
import AppShell from "../../components/shell/AppShell"
import { useAiAssistant } from "../../components/shell/AiAssistantDialog"
import type { NotificationSource } from "../../components/shell/NotificationsMenu"
import PageHeader from "../../components/ui/page-header"
import PageTransition from "@/components/motion/PageTransition"
import { Dashboard } from "./Dashboard"
import { Submissions } from "./Submissions"
import { EvaluationWorkspace } from "./EvaluationWorkspace"
import { Reports } from "./Reports"
import { Settings } from "./Settings"
import {
  loadEvaluatorState,
  saveSubmissionDraft,
  finalizeEvaluation,
  markNotificationRead,
  markAllNotificationsRead,
  type EvaluatorState,
} from "./data/evaluatorStorage"

export interface EvaluatorPortalProps {
  currentUser?: CurrentUser
  onToast: (msg: string) => void
}

function parseInitialRoute(): {
  tab: EvaluatorTab
  submissionId: string | null
} {
  if (typeof window === "undefined") {
    return { tab: "Dashboard", submissionId: null }
  }

  const path = window.location.pathname.toLowerCase()
  const search = new URLSearchParams(window.location.search)
  const tabParam = search.get("tab") || search.get("page")

  if (path.includes("/workspace/") || path.includes("/evaluate/")) {
    const parts = path.split("/")
    const id = parts[parts.length - 1]
    return { tab: "Submissions", submissionId: id || null }
  }

  const target = (tabParam || path).toLowerCase()
  if (
    target.includes("my-evaluations") ||
    target.includes("evaluations") ||
    target.includes("assessments") ||
    target.includes("submissions") ||
    target.includes("queue") ||
    target.includes("reassessment") ||
    target.includes("results") ||
    target.includes("feedback")
  ) {
    return { tab: "Submissions", submissionId: null }
  }
  if (target.includes("reports")) {
    return { tab: "Reports", submissionId: null }
  }
  if (target.includes("settings")) {
    return { tab: "Settings", submissionId: null }
  }

  return { tab: "Dashboard", submissionId: null }
}

export function EvaluatorPortal({ currentUser, onToast }: EvaluatorPortalProps) {
  const [evaluatorState, setEvaluatorState] = useState<EvaluatorState>(() =>
    loadEvaluatorState()
  )

  const initialRoute = useMemo(() => parseInitialRoute(), [])
  const [activeTab, setActiveTab] = useState<EvaluatorTab>(initialRoute.tab)
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(
    initialRoute.submissionId
  )

  const [assessmentFilterContext, setAssessmentFilterContext] = useState<
    string | undefined
  >(undefined)

  const [searchQuery, setSearchQuery] = useState<string>("")
  const [queueTab, setQueueTab] = useState<"all" | "assigned" | "reassessment" | "published">(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname.toLowerCase()
      if (p.includes("reassessment") || p.includes("reevaluations")) return "reassessment"
    }
    return "all"
  })

  // Listen to cross-component evaluator updates
  useEffect(() => {
    const handleStorageUpdate = (e: any) => {
      if (e.detail) {
        setEvaluatorState(e.detail)
      }
    }
    window.addEventListener("quantum_evaluator_updated", handleStorageUpdate)
    return () =>
      window.removeEventListener("quantum_evaluator_updated", handleStorageUpdate)
  }, [])

  // Synchronize route with back/forward history navigation
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseInitialRoute()
      setActiveTab(parsed.tab)
      setActiveSubmissionId(parsed.submissionId)
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // Sync tab changes with browser URL
  const handleTabChange = useCallback(
    (newTab: EvaluatorTab, context?: any) => {
      setActiveTab(newTab)
      setActiveSubmissionId(null)
      if (context?.filter === "reassessment") {
        setQueueTab("reassessment")
      } else if (context?.filter === "published") {
        setQueueTab("published")
      } else if (context?.filter === "assigned") {
        setQueueTab("assigned")
      }

      if (context?.assessmentId) {
        setAssessmentFilterContext(context.assessmentId)
      }

      const slug =
        newTab === "Dashboard"
          ? "dashboard"
          : newTab === "Submissions"
          ? context?.filter === "reassessment"
            ? "reevaluations"
            : "queue"
          : newTab === "Reports"
          ? "reports"
          : "settings"

      window.history.pushState(null, "", `/evaluator/${slug}`)
    },
    []
  )

  // Open Workspace for a specific student submission
  const handleOpenWorkspace = useCallback((submission: StudentSubmission) => {
    setActiveSubmissionId(submission.id)
    window.history.pushState(null, "", `/evaluator/workspace/${submission.id}`)
  }, [])

  const handleCloseWorkspace = useCallback(() => {
    setActiveSubmissionId(null)
    window.history.pushState(null, "", `/evaluator/queue`)
  }, [])

  // Active workspace submission and assessment
  const activeWorkspaceSubmission = useMemo(() => {
    if (!activeSubmissionId) return null
    return (
      evaluatorState.submissions.find((s) => s.id === activeSubmissionId) ||
      evaluatorState.submissions[0] ||
      null
    )
  }, [activeSubmissionId, evaluatorState.submissions])

  const activeWorkspaceAssessment = useMemo(() => {
    if (!activeWorkspaceSubmission) return null
    return (
      evaluatorState.assessments.find(
        (a) => a.id === activeWorkspaceSubmission.assessmentId
      ) || evaluatorState.assessments[0]
    )
  }, [activeWorkspaceSubmission, evaluatorState.assessments])

  // Next / Previous Submission in Workspace
  const { hasPrevSubmission, hasNextSubmission } = useMemo(() => {
    if (!activeWorkspaceSubmission) {
      return { hasPrevSubmission: false, hasNextSubmission: false }
    }
    const idx = evaluatorState.submissions.findIndex(
      (s) => s.id === activeWorkspaceSubmission.id
    )
    return {
      hasPrevSubmission: idx > 0,
      hasNextSubmission: idx >= 0 && idx < evaluatorState.submissions.length - 1,
    }
  }, [activeWorkspaceSubmission, evaluatorState.submissions])

  const handleNavigateSubmission = useCallback(
    (direction: "prev" | "next") => {
      if (!activeWorkspaceSubmission) return
      const idx = evaluatorState.submissions.findIndex(
        (s) => s.id === activeWorkspaceSubmission.id
      )
      if (idx === -1) return

      const nextIdx = direction === "prev" ? idx - 1 : idx + 1
      if (nextIdx >= 0 && nextIdx < evaluatorState.submissions.length) {
        const nextSub = evaluatorState.submissions[nextIdx]
        handleOpenWorkspace(nextSub)
      }
    },
    [activeWorkspaceSubmission, evaluatorState.submissions, handleOpenWorkspace]
  )

  // Keyboard navigation for Workspace ([ and ])
  useEffect(() => {
    if (!activeWorkspaceSubmission) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      if (e.key === "[" && hasPrevSubmission) {
        e.preventDefault()
        handleNavigateSubmission("prev")
      } else if (e.key === "]" && hasNextSubmission) {
        e.preventDefault()
        handleNavigateSubmission("next")
      } else if (e.key === "Escape") {
        e.preventDefault()
        handleCloseWorkspace()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeWorkspaceSubmission, hasPrevSubmission, hasNextSubmission, handleNavigateSubmission, handleCloseWorkspace])

  // Save draft evaluation handler
  const handleSaveDraft = useCallback(
    (subId: string, evaluation: any) => {
      const nextState = saveSubmissionDraft(evaluatorState, subId, evaluation)
      setEvaluatorState(nextState)
    },
    [evaluatorState]
  )

  // Finalize evaluation handler
  const handleSubmitEvaluation = useCallback(
    (subId: string, evaluation: any) => {
      const nextState = finalizeEvaluation(evaluatorState, subId, evaluation)
      setEvaluatorState(nextState)

      if (evaluatorState.settings.autoAdvanceOnSubmit && hasNextSubmission) {
        handleNavigateSubmission("next")
      } else {
        handleCloseWorkspace()
      }
    },
    [
      evaluatorState,
      hasNextSubmission,
      handleNavigateSubmission,
      handleCloseWorkspace,
    ]
  )

  // Summary counts
  const pendingCount = useMemo(
    () =>
      evaluatorState.submissions.filter(
        (s) =>
          s.status === "Submitted" ||
          s.status === "In Progress" ||
          s.status === "Draft Saved" ||
          s.status === "Resubmitted"
      ).length,
    [evaluatorState.submissions]
  )

  const reassessmentCount = useMemo(
    () =>
      evaluatorState.submissions.filter((s) => s.status.includes("Reassessment"))
        .length,
    [evaluatorState.submissions]
  )

  const notificationSource: NotificationSource = {
    items: evaluatorState.notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      read: n.read,
      kind: n.category === "System" ? "system" : "assessment",
    })),
    onSelect: (item) => {
      const notif = evaluatorState.notifications.find((n) => n.id === item.id)
      setEvaluatorState(markNotificationRead(evaluatorState, item.id))
      const sub = notif?.relatedId ? evaluatorState.submissions.find((x) => x.id === notif.relatedId) : undefined
      if (sub) handleOpenWorkspace(sub)
      else handleTabChange("Submissions")
    },
    onMarkAllRead: () => {
      setEvaluatorState(markAllNotificationsRead(evaluatorState))
      onToast("All notifications marked as read.")
    },
  }

  const activeNav =
    activeTab === "Submissions"
      ? queueTab === "reassessment"
        ? "reevaluations"
        : "queue"
      : activeTab.toLowerCase()

  const onShellNavigate = (id: string) => {
    if (id === "queue") handleTabChange("Submissions", { filter: "all" })
    else if (id === "reevaluations") handleTabChange("Submissions", { filter: "reassessment" })
    else if (id === "reports") handleTabChange("Reports")
    else if (id === "settings") handleTabChange("Settings")
    else handleTabChange("Dashboard")
  }

  return (
    <AppShell
      role="Evaluator"
      activeId={activeNav}
      onNavigate={onShellNavigate}
      badges={{ queue: pendingCount, reevaluations: reassessmentCount }}
      notifications={notificationSource}
    >
      <div className="evaluator-portal-container min-w-0">
        <AnimatePresence mode="wait">
          {activeWorkspaceSubmission && activeWorkspaceAssessment ? (
            <PageTransition key={`workspace-${activeWorkspaceSubmission.id}`}>
              <EvaluationWorkspace
                submission={activeWorkspaceSubmission}
                assessment={activeWorkspaceAssessment}
                state={evaluatorState}
                onSaveDraft={handleSaveDraft}
                onSubmitEvaluation={handleSubmitEvaluation}
                onBackToSubmissions={handleCloseWorkspace}
                onNavigateSubmission={handleNavigateSubmission}
                hasPrevSubmission={hasPrevSubmission}
                hasNextSubmission={hasNextSubmission}
                onToast={onToast}
              />
            </PageTransition>
          ) : (
            <PageTransition key={activeTab}>
              {activeTab === "Dashboard" && (
                <Dashboard
                  state={evaluatorState}
                  onNavigateTab={handleTabChange}
                  onOpenWorkspace={handleOpenWorkspace}
                />
              )}

              {activeTab === "Submissions" && (
                <Submissions
                  state={evaluatorState}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onOpenWorkspace={handleOpenWorkspace}
                  initialAssessmentFilter={assessmentFilterContext}
                  initialQueueTab={queueTab}
                  key={queueTab}
                />
              )}

              {activeTab === "Reports" && (
                <Reports state={evaluatorState} onToast={onToast} />
              )}

              {activeTab === "Settings" && (
                <Settings
                  state={evaluatorState}
                  onUpdateState={setEvaluatorState}
                  onToast={onToast}
                />
              )}
            </PageTransition>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}

export default EvaluatorPortal
