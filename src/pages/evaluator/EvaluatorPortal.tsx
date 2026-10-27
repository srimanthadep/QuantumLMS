import React, { useState, useEffect, useMemo, useCallback } from "react"
import type { CurrentUser, UserRole } from "../../types"
import type { EvaluatorTab } from "./components/EvaluatorSidebar"
import { EvaluatorSidebar } from "./components/EvaluatorSidebar"
import { EvaluatorTopBar } from "./components/EvaluatorTopBar"
import { Dashboard } from "./Dashboard"
import { MyEvaluations } from "./MyEvaluations"
import { Assessments } from "./Assessments"
import { Submissions } from "./Submissions"
import { EvaluationWorkspace } from "./EvaluationWorkspace"
import { Reassessment } from "./Reassessment"
import { ResultsFeedback } from "./ResultsFeedback"
import { Reports } from "./Reports"
import { Notifications } from "./Notifications"
import { Settings } from "./Settings"
import type { StudentSubmission, EvaluatorAssessment } from "./types"
import {
  loadEvaluatorState,
  saveEvaluatorState,
  saveSubmissionDraft,
  finalizeEvaluation,
  type EvaluatorState,
} from "./data/evaluatorStorage"
import { AskAiModal, Toast } from "../../components/Modals"

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
  if (target.includes("my-evaluations") || target.includes("evaluations")) {
    return { tab: "My Evaluations", submissionId: null }
  }
  if (target.includes("assessments")) {
    return { tab: "Assessments", submissionId: null }
  }
  if (target.includes("submissions")) {
    return { tab: "Submissions", submissionId: null }
  }
  if (target.includes("reassessment")) {
    return { tab: "Reassessment", submissionId: null }
  }
  if (target.includes("results") || target.includes("feedback")) {
    return { tab: "Results & Feedback", submissionId: null }
  }
  if (target.includes("reports")) {
    return { tab: "Reports", submissionId: null }
  }
  if (target.includes("notifications")) {
    return { tab: "Notifications", submissionId: null }
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

  // Context filters passed between pages
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
          : newTab === "My Evaluations"
          ? "my-evaluations"
          : newTab === "Assessments"
          ? "assessments"
          : newTab === "Submissions"
          ? "submissions"
          : newTab === "Reassessment"
          ? "reassessment"
          : newTab === "Results & Feedback"
          ? "results"
          : newTab === "Reports"
          ? "reports"
          : newTab === "Notifications"
          ? "notifications"
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
      }
    },
    [evaluatorState, hasNextSubmission, handleNavigateSubmission]
  )

  // Calculate notification and badge counts
  const pendingCount = useMemo(
    () => evaluatorState.submissions.filter((s) => s.status !== "Evaluated").length,
    [evaluatorState.submissions]
  )

  const reassessmentCount = useMemo(
    () =>
      evaluatorState.submissions.filter(
        (s) => s.status === "Reassessment Requested"
      ).length,
    [evaluatorState.submissions]
  )

  const unreadNotifsCount = useMemo(
    () => evaluatorState.notifications.filter((n) => !n.read).length,
    [evaluatorState.notifications]
  )

  // Dynamic header titles
  const headerInfo = useMemo(() => {
    switch (activeTab) {
      case "Dashboard":
        return {
          title: "Evaluator Dashboard",
          subtitle: `Welcome back, ${evaluatorState.settings.profile.name} · Senior Academic Assessor`,
        }
      case "My Evaluations":
        return {
          title: "My Evaluation Tasks",
          subtitle: `${pendingCount} pending submissions across ${evaluatorState.assessments.length} assigned assessments`,
        }
      case "Assessments":
        return {
          title: "Assigned Assessments",
          subtitle: "Institutional rubrics, official criteria, and evaluation parameters",
        }
      case "Submissions":
        return {
          title: "Student Submissions",
          subtitle: "Review artifacts, code repositories, question answers, and award grades",
        }
      case "Reassessment":
        return {
          title: "Reassessment Appeals",
          subtitle: "Review student grade contestations and record formal findings",
        }
      case "Results & Feedback":
        return {
          title: "Results & Feedback Archive",
          subtitle: "Finalized evaluation records awaiting institutional release",
        }
      case "Reports":
        return {
          title: "Evaluation Reports & Analytics",
          subtitle: "Workload distribution, scoring metrics, and completion summaries",
        }
      case "Notifications":
        return {
          title: "Assessor Notification Center",
          subtitle: `${unreadNotifsCount} unread deadlines and submission alerts`,
        }
      case "Settings":
        return {
          title: "Evaluator Settings",
          subtitle: "Assigned course profiles, grading preferences, and notifications",
        }
      default:
        return { title: "Evaluator Portal", subtitle: "Quantum LMS" }
    }
  }, [activeTab, evaluatorState, pendingCount, unreadNotifsCount])

  return (
    <div
      className="dashboard-shell evaluator-portal-shell flex flex-row min-h-screen w-full relative"
      style={{
        backgroundColor: hexColor,
        backgroundImage: isLightBg
          ? "linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px)"
          : "linear-gradient(rgba(255, 255, 255, 0.19) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.19) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
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
          <div className="relative z-10 w-72 max-w-[85vw] bg-white h-full shadow-2xl animate-in slide-in-from-left duration-200">
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
              onNotificationsClick={() => handleTabChange("Notifications")}
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

            {activeTab === "My Evaluations" && (
              <MyEvaluations
                state={evaluatorState}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelectAssessment={(asm) =>
                  handleTabChange("Submissions", { assessmentId: asm.id })
                }
                onOpenSubmissionsForAssessment={(asmId) =>
                  handleTabChange("Submissions", { assessmentId: asmId })
                }
              />
            )}

            {activeTab === "Assessments" && (
              <Assessments
                state={evaluatorState}
                searchQuery={searchQuery}
                onOpenSubmissionsForAssessment={(asmId) =>
                  handleTabChange("Submissions", { assessmentId: asmId })
                }
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

            {activeTab === "Reassessment" && (
              <Reassessment
                state={evaluatorState}
                onUpdateState={setEvaluatorState}
                onOpenWorkspaceForSubmission={handleOpenWorkspace}
                onToast={onToast}
              />
            )}

            {activeTab === "Results & Feedback" && (
              <ResultsFeedback
                state={evaluatorState}
                onOpenWorkspace={handleOpenWorkspace}
                onToast={onToast}
              />
            )}

            {activeTab === "Reports" && (
              <Reports state={evaluatorState} onToast={onToast} />
            )}

            {activeTab === "Notifications" && (
              <Notifications
                state={evaluatorState}
                onUpdateState={setEvaluatorState}
                onNavigateTab={handleTabChange}
                onToast={onToast}
              />
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
