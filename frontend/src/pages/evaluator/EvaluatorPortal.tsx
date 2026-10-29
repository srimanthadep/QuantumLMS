import React, { useState, useEffect, useMemo, useCallback } from "react"
import type { CurrentUser, UserRole } from "../../types"
import type { EvaluatorTab, StudentSubmission } from "./types"
import { AppSidebar as EvaluatorSidebar } from "../../components/Sidebar"
import { EvaluatorTopBar } from "./components/EvaluatorTopBar"
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
import { AskAiModal } from "../../components/Modals"

export interface EvaluatorPortalProps {
  currentUser?: CurrentUser
  onSwitchRole?: (role: UserRole) => void
  onLogout: () => void
  onToast: (msg: string) => void
  hexColor?: string
  onChangeHexColor?: (hex: string) => void
  isLightBg?: boolean
}

// Parse initial tab or workspace route from window.location
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

export function EvaluatorPortal({
  currentUser,
  onSwitchRole,
  onLogout,
  onToast,
  hexColor = "#9860e9",
  onChangeHexColor = () => {},
  isLightBg = false,
}: EvaluatorPortalProps) {
  // Evaluator State synchronized with localStorage
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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false)

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
      setActiveSubmissionId(null) // Exit workspace when switching sidebar tabs
      setIsMobileDrawerOpen(false)

      if (context?.assessmentId) {
        setAssessmentFilterContext(context.assessmentId)
      }

      const slug =
        newTab === "Dashboard"
          ? "dashboard"
          : newTab === "Submissions"
          ? "submissions"
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
    window.history.pushState(null, "", `/evaluator/submissions`)
  }, [])

  // Find active workspace submission and assessment
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

      // Auto-advance if configured
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
      evaluatorState.submissions.filter((s) => s.status === "Reassessment Requested")
        .length,
    [evaluatorState.submissions]
  )

  const unreadNotifsCount = useMemo(
    () => evaluatorState.notifications.filter((n) => !n.read).length,
    [evaluatorState.notifications]
  )

  // Header dynamic title & subtitle
  const headerInfo = useMemo(() => {
    switch (activeTab) {
      case "Dashboard":
        return {
          title: "Assessor Command Center",
          subtitle: `Overview · ${pendingCount} submissions pending your evaluation`,
        }
      case "Submissions":
        return {
          title: "Unified Grading Queue",
          subtitle: "Evaluate cohort submissions, review reassessments, and release grades",
        }
      case "Reports":
        return {
          title: "Evaluation Reports & Analytics",
          subtitle: "Workload distribution, scoring metrics, and completion summaries",
        }
      case "Settings":
        return {
          title: "Evaluator Settings",
          subtitle: "Assigned course profiles, grading preferences, and notifications",
        }
      default:
        return { title: "Evaluator Portal", subtitle: "Quantum LMS" }
    }
  }, [activeTab, pendingCount])

  return (
    <div
      className="dashboard-shell evaluator-portal-shell flex flex-row min-h-screen w-full relative"
      style={{
        backgroundColor: hexColor,
      }}
    >
      {/* Persistent Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <EvaluatorSidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          profile={evaluatorState.settings.profile}
          pendingCount={pendingCount}
          reassessmentCount={reassessmentCount}
          unreadNotifsCount={unreadNotifsCount}
          onLogout={onLogout}
          onSwitchRole={onSwitchRole}
          currentUser={currentUser}
          onOpenAiModal={() => setIsAiModalOpen(true)}
        />
      </div>

      {/* Mobile Slide-over Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] bg-surface h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <EvaluatorSidebar
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              profile={evaluatorState.settings.profile}
              pendingCount={pendingCount}
              reassessmentCount={reassessmentCount}
              unreadNotifsCount={unreadNotifsCount}
              onLogout={onLogout}
              onSwitchRole={onSwitchRole}
              currentUser={currentUser}
              onOpenAiModal={() => {
                setIsMobileDrawerOpen(false)
                setIsAiModalOpen(true)
              }}
            />
          </div>
        </div>
      )}

      {/* Main Viewport Content */}
      <main className="dashboard-content flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto no-scrollbar">
        {/* If in Workspace: Fullscreen grading experience */}
        {activeWorkspaceSubmission && activeWorkspaceAssessment ? (
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
        ) : (
          /* Normal Tab Content */
          <>
            <EvaluatorTopBar
              onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              profile={evaluatorState.settings.profile}
              hexColor={hexColor}
              onChangeHexColor={onChangeHexColor}
              unreadCount={unreadNotifsCount}
              notifications={evaluatorState.notifications}
              onMarkNotificationRead={(id) => {
                const nextState = markNotificationRead(evaluatorState, id)
                setEvaluatorState(nextState)
              }}
              onMarkAllNotificationsRead={() => {
                const nextState = markAllNotificationsRead(evaluatorState)
                setEvaluatorState(nextState)
                onToast("All notifications marked as read.")
              }}
              onNotificationSelect={(notif) => {
                if (notif.relatedId) {
                  const sub = evaluatorState.submissions.find(
                    (s) => s.id === notif.relatedId
                  )
                  if (sub) {
                    handleOpenWorkspace(sub)
                    return
                  }
                }
                handleTabChange("Submissions")
              }}
              onOpenAiAssistant={() => setIsAiModalOpen(true)}
              title={headerInfo.title}
              subtitle={headerInfo.subtitle}
            />

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
          </>
        )}
      </main>

      {/* AI Assistant Modal */}
      <AskAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  )
}

export default EvaluatorPortal
