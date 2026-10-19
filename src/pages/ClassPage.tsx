import { type ReactNode } from "react"
import type { MetricItem, AssignmentItem, StudentItem, ReportItem } from "../types"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"
import { MetricCard } from "../components/MetricCard"

export function DashboardHeader({
  searchQuery,
  setSearchQuery,
  onOpenAiModal,
  hexColor,
  onChangeHexColor,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenAiModal: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>Good morning, Srimanth</span>
          <span className="wave-emoji" role="img" aria-label="waving hand">👋</span>
        </div>
        <div className="subtitle">
          3 assignments are due this week · 2 students need attention
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students or topics"
            aria-label="Search students or topics"
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
          onClick={onOpenAiModal}
          aria-label="Ask AI assistant"
        >
          <span>✦</span>
          Ask AI
        </button>
      </div>
    </header>
  )
}

function CardHeader({
  title,
  action,
}: {
  title: string
  action: ReactNode
}) {
  return (
    <div className="card-header">
      <div className="card-title">{title}</div>
      {action}
    </div>
  )
}

function StudentAvatarGroup() {
  return (
    <div className="avatar-group" aria-label="Student avatars">
      {[1, 2, 3, 4, 5].map((number) => (
        <img
          key={number}
          src={`/assets/student-${number}.png`}
          alt={`Student ${number}`}
        />
      ))}
      <div className="avatar-more">+19</div>
    </div>
  )
}

function ClassOverviewCard() {
  return (
    <section className="class-card" aria-label="Class Overview">
      <div className="class-heading">Year 4 – Maple Class</div>
      <div className="class-subtitle">
        24 students | English Math Science
      </div>
      <span className="on-track">On track</span>
      <img
        className="hand-art"
        src="/assets/hand.png"
        alt=""
        aria-hidden="true"
      />
      <StudentAvatarGroup />
      <div className="class-progress">
        <span>Class progress</span>
        <strong>76%</strong>
        <div className="class-progress-track">
          <i />
        </div>
      </div>
    </section>
  )
}

function AssignmentRow({ item }: { item: AssignmentItem }) {
  return (
    <div className="assignment-row">
      <div className="row-icon">
        <Icon name={item.icon} size={17} />
      </div>
      <div className="row-copy">
        <strong>{item.title}</strong>
        <span>{item.meta}</span>
      </div>
      <span className={`status ${item.tone}`}>{item.status}</span>
    </div>
  )
}

function AssignmentsCard({
  items,
  onOpenNewAssignment,
}: {
  items: AssignmentItem[]
  onOpenNewAssignment: () => void
}) {
  return (
    <section className="assignments-card panel" aria-label="Assignments">
      <CardHeader
        title="Assignments"
        action={
          <button
            className="view-all"
            onClick={onOpenNewAssignment}
          >
            View all
          </button>
        }
      />
      <div>
        {items.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-400 font-medium">
            No assignments match your search
          </div>
        ) : (
          items.map((item) => <AssignmentRow key={item.id} item={item} />)
        )}
      </div>
    </section>
  )
}

function StudentProgressRow({
  student,
  onClick,
}: {
  student: StudentItem
  onClick?: () => void
}) {
  return (
    <div className="student-row" onClick={onClick}>
      <div className="student-name">
        <img src={student.image} alt={student.name} />
        <span>{student.name}</span>
      </div>
      <div className="completion">
        <div className="completion-track">
          <i
            className={student.tone}
            style={{ width: `${student.completion}%` }}
          />
        </div>
        <span>{student.completion}%</span>
      </div>
      <strong className="average">{student.average}%</strong>
      <button
        className="more"
        aria-label={`More options for ${student.name}`}
      >
        <Icon name="dots" size={15} />
      </button>
    </div>
  )
}

function StudentProgressCard({
  students,
  onShowAll,
  onSelectStudent,
}: {
  students: StudentItem[]
  onShowAll: () => void
  onSelectStudent?: (s: StudentItem) => void
}) {
  return (
    <section
      className="student-card panel"
      aria-label="Individual Student Progress"
    >
      <CardHeader
        title="Individual Student Progress"
        action={
          <button className="view-all" onClick={onShowAll}>
            View all
          </button>
        }
      />

      {students.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-400 font-medium">
          No students match your search
        </div>
      ) : (
        <>
          <div className="student-table-head">
            <span>Student</span>
            <span>Completion</span>
            <span>Avg. score</span>
          </div>
          <div>
            {students.slice(0, 4).map((student) => (
              <StudentProgressRow
                key={student.id}
                student={student}
                onClick={() => onSelectStudent?.(student)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function ReportRow({ report }: { report: ReportItem }) {
  return (
    <div className="report-row">
      <div className="row-icon">
        <Icon name="document" size={17} />
      </div>
      <div className="row-copy">
        <strong>{report.title}</strong>
        <span>{report.meta}</span>
      </div>
      <span className={`status ${report.tone}`}>{report.status}</span>
    </div>
  )
}

function ParentReportsCard({
  reports,
  onOpenReportModal,
}: {
  reports: ReportItem[]
  onOpenReportModal: () => void
}) {
  return (
    <section className="reports-card panel" aria-label="Parent Reports">
      <CardHeader
        title="Parent Reports"
        action={
          <button className="report-button" onClick={onOpenReportModal}>
            Report
          </button>
        }
      />
      <p>
        Keep parents informed with automated
        <br />
        progress reports.
      </p>
      <div>
        {reports.map((report) => (
          <ReportRow key={report.id} report={report} />
        ))}
      </div>
    </section>
  )
}

export default function ClassPage({
  metrics,
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  students,
  assignments,
  reports,
  onOpenNewAssignment,
  onOpenReportModal,
  onSelectStudent,
  onShowAllStudents,
}: {
  metrics: MetricItem[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenAiModal: () => void
  students: StudentItem[]
  assignments: AssignmentItem[]
  reports: ReportItem[]
  onOpenNewAssignment: () => void
  onOpenReportModal: () => void
  onSelectStudent: (s: StudentItem) => void
  onShowAllStudents: () => void
}) {
  return (
    <>
      <DashboardHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAiModal={onOpenAiModal}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
      />

      {/* Metrics Grid (4 folder tab status cards) */}
      <div className="metrics-grid">
        {metrics.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* Content Grid (2 columns on desktop) */}
      <div className="content-grid">
        <div className="left-column">
          <ClassOverviewCard />
          <StudentProgressCard
            students={students}
            onShowAll={onShowAllStudents}
            onSelectStudent={onSelectStudent}
          />
        </div>
        <div className="right-column">
          <AssignmentsCard
            items={assignments}
            onOpenNewAssignment={onOpenNewAssignment}
          />
          <ParentReportsCard
            reports={reports}
            onOpenReportModal={onOpenReportModal}
          />
        </div>
      </div>
    </>
  )
}
