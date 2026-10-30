import fs from "node:fs"
const file = "c:/Users/srima/Downloads/QuantumLMS/.worktrees/redesign-premium-ui/frontend/src/pages/evaluator/EvaluatorPortal.tsx"
let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")

function between(startMarker, endMarker, replacement, includeEnd = true) {
  const a = s.indexOf(startMarker)
  const b = s.indexOf(endMarker, a)
  if (a < 0 || b < 0) throw new Error(`markers not found: ${startMarker.slice(0, 40)} / ${endMarker.slice(0, 40)}`)
  s = s.slice(0, a) + replacement + s.slice(includeEnd ? b + endMarker.length : b)
}

between(
  "  return (\n    <div\n      className=\"dashboard-shell evaluator-portal-shell",
  '<main className="dashboard-content flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto no-scrollbar">',
  `  const notificationSource: NotificationSource = {
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
    activeTab === "Submissions" ? (queueTab === "reassessment" ? "reevaluations" : "queue") : activeTab.toLowerCase()

  const onShellNavigate = (id: string) => {
    if (id === "queue") handleTabChange("Submissions")
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
      <div className="dashboard-content evaluator-content min-w-0">`,
)

between(
  "            <EvaluatorTopBar\n",
  "              subtitle={headerInfo.subtitle}\n            />\n",
  `            <PageHeader title={headerInfo.title} description={headerInfo.subtitle} />\n`,
)

s = s.replace(
  "                initialAssessmentFilter={assessmentFilterContext}\n",
  "                initialAssessmentFilter={assessmentFilterContext}\n                initialQueueTab={queueTab}\n                key={queueTab}\n",
)

between(
  "      </main>\n",
  "    </div>\n  )\n}\n",
  "      </div>\n    </AppShell>\n  )\n}\n",
)
s = s.replace(/\s*\{\/\* AI Assistant Modal \*\/\}\s*<AskAiModal[\s\S]*?\/>\n/, "\n")

fs.writeFileSync(file, s.replace(/\n/g, "\r\n"))
console.log("ok")
