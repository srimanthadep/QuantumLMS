import { useMemo } from "react"
import type { MetricItem, ReportItem } from "../types"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"
import { MetricCard } from "../components/MetricCard"

export function ReportsHeader({
  searchQuery,
  setSearchQuery,
  onOpenReportModal,
  hexColor,
  onChangeHexColor,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenReportModal: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>Parent & Academic Reports</span>
        </div>
        <div className="subtitle">
          Year 4 · Maple Class · Automated dispatch and performance summaries
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports or recipients..."
            aria-label="Search reports"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <HexColorField
          hexColor={hexColor}
          onChangeHex={onChangeHexColor}
        />
        <button
          className="ask-ai"
          onClick={onOpenReportModal}
          aria-label="Generate Report"
        >
          <span>+</span>
          New Report
        </button>
      </div>
    </header>
  )
}

function ReportsArchiveCard({
  reports,
  selectedReportId,
  onSelectReport,
  activeFilter,
  setActiveFilter,
  onOpenNewReport,
}: {
  reports: ReportItem[]
  selectedReportId: string
  onSelectReport: (report: ReportItem) => void
  activeFilter: string
  setActiveFilter: (filter: string) => void
  onOpenNewReport: () => void
}) {
  const counts = useMemo(() => {
    return {
      all: reports.length,
      sent: reports.filter((r) => r.status === "Sent").length,
      inProgress: reports.filter((r) => r.status === "In Progress").length,
      scheduled: reports.filter((r) => r.status === "Scheduled").length,
    }
  }, [reports])

  const filtered = useMemo(() => {
    if (activeFilter === "Sent") return reports.filter((r) => r.status === "Sent")
    if (activeFilter === "In Progress") return reports.filter((r) => r.status === "In Progress")
    if (activeFilter === "Scheduled") return reports.filter((r) => r.status === "Scheduled")
    return reports
  }, [reports, activeFilter])

  return (
    <section className="reports-archive-card panel" aria-label="Report Archives & Dispatches">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="card-title">Report Archives & Dispatches</div>
          <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
            Showing {filtered.length} of {reports.length} reports
          </div>
        </div>

        <div className="filter-pills">
          <button
            className={`filter-pill ${activeFilter === "All" ? "active" : ""}`}
            onClick={() => setActiveFilter("All")}
          >
            All ({counts.all})
          </button>
          <button
            className={`filter-pill ${activeFilter === "Sent" ? "active" : ""}`}
            onClick={() => setActiveFilter("Sent")}
          >
            Sent ({counts.sent})
          </button>
          <button
            className={`filter-pill ${activeFilter === "In Progress" ? "active" : ""}`}
            onClick={() => setActiveFilter("In Progress")}
          >
            In Progress ({counts.inProgress})
          </button>
          <button
            className={`filter-pill ${activeFilter === "Scheduled" ? "active" : ""}`}
            onClick={() => setActiveFilter("Scheduled")}
          >
            Scheduled ({counts.scheduled})
          </button>
        </div>
      </div>

      <div className="report-archive-list">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400 font-medium">
            No reports found matching your criteria.
          </div>
        ) : (
          filtered.map((report) => {
            const isSelected = report.id === selectedReportId
            return (
              <div
                key={report.id}
                className={`report-archive-item ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectReport(report)}
              >
                <div className="report-archive-left">
                  <div
                    className="report-icon-box"
                    style={{
                      background:
                        report.tone === "green"
                          ? "var(--lime-soft)"
                          : report.tone === "purple"
                          ? "rgba(152, 96, 233, 0.12)"
                          : report.tone === "yellow"
                          ? "var(--yellow-soft)"
                          : "#f3f0ff",
                      color:
                        report.tone === "green"
                          ? "#659000"
                          : report.tone === "purple"
                          ? "var(--purple-dark)"
                          : report.tone === "yellow"
                          ? "#9b7200"
                          : "#7f4ee3",
                    }}
                  >
                    <Icon name="document" size={18} />
                  </div>
                  <div className="report-meta-box">
                    <strong>{report.title}</strong>
                    <span>
                      {report.date} · {report.recipients}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {report.status === "Sent" && (
                    <div className="hidden sm:flex flex-col items-end text-right">
                      <span className="text-[11px] font-bold text-black">
                        {report.readRate}% Read
                      </span>
                      <span className="text-[9.5px] font-normal text-zinc-400">
                        delivered
                      </span>
                    </div>
                  )}
                  <span className={`status ${report.tone}`}>{report.status}</span>
                  <button
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 text-zinc-400 hover:text-black transition-colors"
                    aria-label={`Select ${report.title}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectReport(report)
                    }}
                  >
                    <Icon name="dots" size={14} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

function ReportPreviewCard({
  report,
  onDownloadPdf,
  onResend,
}: {
  report?: ReportItem
  onDownloadPdf: () => void
  onResend: () => void
}) {
  if (!report) {
    return (
      <section className="report-preview-panel panel">
        <div className="text-center py-10 text-xs text-zinc-400 font-medium">
          Select a report to preview details
        </div>
      </section>
    )
  }

  const summary = report.summary || {
    avgScore: 80,
    attendance: 96,
    readCount: "All recipients",
    topGain: "+5% overall progress",
    notes: "Report dispatched to all enrolled student guardians.",
  }

  return (
    <section className="report-preview-panel panel" aria-label="Report Detail & Preview">
      <div className="card-header">
        <div className="card-title">Report Detail & Preview</div>
        <span className={`status ${report.tone}`}>{report.status}</span>
      </div>

      <div className="report-preview-header">
        <h3 className="text-[16px] font-bold text-black leading-snug">
          {report.title}
        </h3>
        <div className="text-[11px] font-normal text-zinc-500">
          {report.type} · Dispatched: {report.date}
        </div>
        <div className="text-[10.5px] font-medium text-purple-900 mt-0.5">
          Audience: {report.recipients}
        </div>
      </div>

      <div className="report-preview-stats">
        <div className="report-preview-stat">
          <span>Class Average</span>
          <strong>{summary.avgScore}%</strong>
        </div>
        <div className="report-preview-stat">
          <span>Attendance</span>
          <strong>{summary.attendance}%</strong>
        </div>
        <div className="report-preview-stat">
          <span>Parent Engagement</span>
          <strong>{report.readRate}%</strong>
        </div>
      </div>

      <div className="report-notes-box">
        <div className="font-medium mb-1 flex items-center gap-1.5 text-purple-950">
          <span>✦</span>
          <span>Teacher & AI Synthesis:</span>
        </div>
        {summary.notes}
        <div className="mt-2 text-[10px] font-medium text-purple-800 flex items-center gap-1">
          <span>📈</span>
          <span>Key Milestone: {summary.topGain}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <button
          className="flex-1 h-8 rounded-full btn-primary text-xs font-bold transition-colors shadow-sm"
          onClick={onDownloadPdf}
        >
          Download PDF
        </button>
        <button
          className="flex-1 h-8 rounded-full btn-secondary text-xs font-medium transition-colors"
          onClick={onResend}
        >
          {report.status === "Scheduled" ? "Dispatch Now" : "Resend Alert"}
        </button>
      </div>
    </section>
  )
}

function RecurringSchedulesCard({
  onAddSchedule,
}: {
  onAddSchedule: () => void
}) {
  const schedules = [
    {
      title: "Weekly Performance Digest",
      cadence: "Every Friday at 4:00 PM · 24 Parents",
      active: true,
    },
    {
      title: "Bi-weekly STEM & Fractions",
      cadence: "Alternate Mondays at 9:00 AM · 24 Parents",
      active: true,
    },
    {
      title: "Monthly Attendance & Honor Roll",
      cadence: "1st of each month · All Guardians",
      active: true,
    },
    {
      title: "At-Risk Grade Alert Trigger",
      cadence: "Automated real-time on score dip < 70%",
      active: true,
    },
  ]

  return (
    <section className="schedules-card panel" aria-label="Automated Report Schedules">
      <div className="card-header">
        <div className="card-title">Automated Schedules</div>
        <button
          onClick={onAddSchedule}
          className="text-[11px] font-medium text-[var(--purple-dark)] hover:underline"
        >
          + Add Schedule
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {schedules.map((item) => (
          <div key={item.title} className="schedule-row">
            <div>
              <strong>{item.title}</strong>
              <span>{item.cadence}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-lime-700 bg-lime-100 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-600 animate-pulse" />
              Active
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function ReportsPage({
  metrics,
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenReportModal,
  reports,
  selectedReportId,
  setSelectedReportId,
  selectedReport,
  reportFilter,
  setReportFilter,
  onDownloadPdf,
  onResendAlert,
  onAddSchedule,
}: {
  metrics: MetricItem[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenReportModal: () => void
  reports: ReportItem[]
  selectedReportId: string
  setSelectedReportId: (id: string) => void
  selectedReport?: ReportItem
  reportFilter: string
  setReportFilter: (filter: string) => void
  onDownloadPdf: () => void
  onResendAlert: () => void
  onAddSchedule: () => void
}) {
  return (
    <>
      <ReportsHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenReportModal={onOpenReportModal}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
      />

      {/* Metrics Grid (4 folder tab status cards for Reports) */}
      <div className="metrics-grid">
        {metrics.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* Content Grid (2 columns on desktop) */}
      <div className="content-grid">
        <div className="left-column">
          <ReportsArchiveCard
            reports={reports}
            selectedReportId={selectedReportId}
            onSelectReport={(r) => setSelectedReportId(r.id)}
            activeFilter={reportFilter}
            setActiveFilter={setReportFilter}
            onOpenNewReport={onOpenReportModal}
          />
        </div>
        <div className="right-column">
          <ReportPreviewCard
            report={selectedReport}
            onDownloadPdf={onDownloadPdf}
            onResend={onResendAlert}
          />
          <RecurringSchedulesCard onAddSchedule={onAddSchedule} />
        </div>
      </div>
    </>
  )
}
