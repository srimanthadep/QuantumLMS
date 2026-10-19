import type { ReactNode } from "react"

type IconName = "users" | "calendar" | "document" | "trend" | "home" | "reports" | "analytics" | "settings" | "search" | "book" | "chart" | "ruler" | "dots"

const metrics = [
  {
    icon: "users" as IconName,
    label: "Total Students",
    value: "24",
    trend: "+3%",
    tone: "lavender",
  },
  {
    icon: "calendar" as IconName,
    label: "Exercises Assigned",
    value: "48",
    trend: "+48%",
    tone: "pink",
  },
  {
    icon: "document" as IconName,
    label: "Parent Reports",
    value: "18",
    trend: "+6%",
    tone: "yellow",
  },
  {
    icon: "trend" as IconName,
    label: "Avg. Progress",
    value: "76%",
    trend: "+8%",
    tone: "lime",
  },
]

const assignments = [
  {
    icon: "book" as IconName,
    title: "Reading Comprehension",
    meta: "Year 4  Due Oct 18",
    status: "Completed",
    tone: "green",
  },
  {
    icon: "chart" as IconName,
    title: "Fractions Practice",
    meta: "Year 4  Due Oct 20",
    status: "In Progress",
    tone: "purple",
  },
  {
    icon: "document" as IconName,
    title: "Grammar Worksheet",
    meta: "Year 4  Due Oct 22",
    status: "Assigned",
    tone: "yellow",
  },
  {
    icon: "ruler" as IconName,
    title: "Science Quiz",
    meta: "Year 4  Due Oct 28",
    status: "Not Started",
    tone: "gray",
  },
]

const students = [
  {
    name: "Olivia Benett",
    image: "assets/student-1.png",
    completion: 92,
    average: 88,
    tone: "lime",
  },
  {
    name: "Noah Wilson",
    image: "assets/student-2.png",
    completion: 76,
    average: 74,
    tone: "pink",
  },
  {
    name: "Liam Brooks",
    image: "assets/student-3.png",
    completion: 68,
    average: 70,
    tone: "yellow",
  },
  {
    name: "Ava Patel",
    image: "assets/student-4.png",
    completion: 67,
    average: 62,
    tone: "purple",
  },
]

const reports = [
  {
    title: "Weekly Progress Report",
    meta: "Year 4  Due Oct 18",
    status: "Sent",
    tone: "green",
  },
  {
    title: "Math Progress Update",
    meta: "Year 4  Due Oct 20",
    status: "In Progress",
    tone: "purple",
  },
]

function Icon({ name, size = 18 }: { name: IconName size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  if (name === "users")
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19v-1.2c0-3 2.5-5.3 5.5-5.3s5.5 2.3 5.5 5.3V19M16 5.5a3 3 0 0 1 0 5.8M17 13c2.2.5 3.5 2.2 3.5 4.8V19" />
      </svg>
    )
  if (name === "calendar")
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3v4m8-4v4M8 12l2.2 2.2L15 10" />
      </svg>
    )
  if (name === "document" || name === "reports")
    return (
      <svg {...common}>
        <path d="M7 3.5h7l4 4V20H7z" />
        <path d="M14 3.5V8h4M10 12h5m-5 3h5" />
      </svg>
    )
  if (name === "trend")
    return (
      <svg {...common}>
        <path d="m5 16 4.5-4.5 3 3L19 8" />
        <path d="M14 8h5v5" />
      </svg>
    )
  if (name === "home")
    return (
      <svg {...common}>
        <path d="m4 11 8-7 8 7v8H4z" />
      </svg>
    )
  if (name === "analytics")
    return (
      <svg {...common}>
        <path d="M5 20V10h4v10m2 0V4h4v16m2 0v-7h4v7z" />
      </svg>
    )
  if (name === "settings")
    return (
      <svg {...common}>
        <path d="m12 3 7 4v10l-7 4-7-4V7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  if (name === "search")
    return (
      <svg {...common}>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    )
  if (name === "book")
    return (
      <svg {...common}>
        <path d="M4 5.5c3.2-.8 5.8.1 8 2.1v12c-2.2-2-4.8-2.9-8-2.1zm16 0c-3.2-.8-5.8.1-8 2.1v12c2.2-2 4.8-2.9 8-2.1z" />
      </svg>
    )
  if (name === "chart")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4v8l6.5 4.5M12 12H4" />
      </svg>
    )
  if (name === "ruler")
    return (
      <svg {...common}>
        <rect
          x="5"
          y="7"
          width="14"
          height="10"
          rx="2"
          transform="rotate(-42 12 12)"
        />
        <path d="m9.5 9.5 2 2m.5-5 2 2m-7.5 5 2 2" />
      </svg>
    )
  if (name === "dots")
    return (
      <svg {...common}>
        <circle cx="12" cy="5" r=".8" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none" />
        <circle cx="12" cy="19" r=".8" fill="currentColor" stroke="none" />
      </svg>
    )
  return null
}

function Logo() {
  return (
    <div className="logo" aria-label="Noorly">
      <span className="logo-mark">
        <i />
        <i />
      </span>
      <span>Noorly</span>
    </div>
  )
}

function WaveIcon() {
  return (
    <svg className="wave" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.1 12.2 4.8 7.6a1.3 1.3 0 0 1 2.1-1.5l3 4.1-3.3-6A1.3 1.3 0 0 1 9 3l3.4 6.1-2.6-6A1.3 1.3 0 0 1 12.2 2l2.7 6.1-1.4-4.6a1.3 1.3 0 0 1 2.5-.7l2.7 9.3c1 3.3-.8 6.9-4.1 8.1-3.4 1.3-7.2-.3-8.7-3.6l-1.2-2.7a1.5 1.5 0 0 1 2.6-1.4l1.5 2.1" />
      <path d="M19 4.7c1 .4 1.8 1.2 2.2 2.2M18.3 1.8c2.4.7 4.1 2.5 4.8 4.8" />
    </svg>
  )
}

function Sidebar() {
  const navigation = [
    { icon: "home" as IconName, label: "Class", active: true },
    { icon: "users" as IconName, label: "Students" },
    { icon: "reports" as IconName, label: "Reports" },
    { icon: "analytics" as IconName, label: "Analytics" },
    { icon: "settings" as IconName, label: "Settings" },
  ]

  return (
    <aside className="sidebar">
      <Logo />
      <div className="teacher">
        <img src="assets/teacher.png" alt="Ms. Carter" />
        <strong>Ms. Carter</strong>
        <span>Teacher</span>
      </div>
      <nav aria-label="Dashboard navigation">
        {navigation.map((item) => (
          <button
            className={item.active ? "nav-item active" : "nav-item"}
            key={item.label}
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <button className="new-assignment">+ New Assignment</button>
    </aside>
  )
}

function DashboardHeader() {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          Good morning, Ms. Carter <WaveIcon />
        </div>
        <div className="subtitle">
          3 assignments are due this week · 2 students need attention
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={16} />
          <span>Search students or topics</span>
        </div>
        <button className="ask-ai">
          <span>✦</span> Ask AI
        </button>
      </div>
    </header>
  )
}

function MetricCard({ item }: { item: typeof metrics[number] }) {
  return (
    <section className="metric-card">
      <div className={`metric-icon ${item.tone}`}>
        <Icon name={item.icon} size={18} />
      </div>
      <div className="metric-label">{item.label}</div>
      <div className="metric-bottom">
        <strong>{item.value}</strong>
        <span>{item.trend}</span>
      </div>
    </section>
  )
}

function StudentAvatarGroup() {
  return (
    <div className="avatar-group">
      {[1, 2, 3, 4, 5].map((number) => (
        <img key={number} src={`assets/student-${number}.png`} alt="" />
      ))}
      <div className="avatar-more">+19</div>
    </div>
  )
}

function ClassOverviewCard() {
  return (
    <section className="class-card">
      <div className="class-heading">Year 4 – Maple Class</div>
      <div className="class-subtitle">24 students | English Math Science</div>
      <span className="on-track">On track</span>
      <img className="hand-art" src="assets/hand.png" alt="" />
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

function CardHeader({ title, action }: { title: string action: ReactNode }) {
  return (
    <div className="card-header">
      <div className="card-title">{title}</div>
      {action}
    </div>
  )
}

function AssignmentRow({ item }: { item: typeof assignments[number] }) {
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

function AssignmentsCard() {
  return (
    <section className="assignments-card panel">
      <CardHeader
        title="Assignments"
        action={<button className="view-all">View all</button>}
      />
      <div>
        {assignments.map((item) => (
          <AssignmentRow key={item.title} item={item} />
        ))}
      </div>
    </section>
  )
}

function StudentProgressRow({ student }: { student: typeof students[number] }) {
  return (
    <div className="student-row">
      <div className="student-name">
        <img src={student.image} alt="" />
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
      <button className="more" aria-label={`More options for ${student.name}`}>
        <Icon name="dots" size={15} />
      </button>
    </div>
  )
}

function StudentProgressCard() {
  return (
    <section className="student-card panel">
      <CardHeader
        title="Individual Student Progress"
        action={<button className="view-all">View all</button>}
      />
      <div className="student-table-head">
        <span>Student</span>
        <span>Completion</span>
        <span>Avg. score</span>
      </div>
      <div>
        {students.map((student) => (
          <StudentProgressRow key={student.name} student={student} />
        ))}
      </div>
    </section>
  )
}

function ReportRow({ report }: { report: typeof reports[number] }) {
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

function ParentReportsCard() {
  return (
    <section className="reports-card panel">
      <CardHeader
        title="Parent Reports"
        action={<button className="report-button">Report</button>}
      />
      <p>
        Keep parents informed with automated
        <br />
        progress reports.
      </p>
      <div>
        {reports.map((report) => (
          <ReportRow key={report.title} report={report} />
        ))}
      </div>
    </section>
  )
}

function DashboardShell() {
  return (
    <main className="dashboard-shell">
      <Sidebar />
      <div className="dashboard-content">
        <DashboardHeader />
        <div className="metrics-grid">
          {metrics.map((item) => (
            <MetricCard key={item.label} item={item} />
          ))}
        </div>
        <div className="content-grid">
          <div className="left-column">
            <ClassOverviewCard />
            <StudentProgressCard />
          </div>
          <div className="right-column">
            <AssignmentsCard />
            <ParentReportsCard />
          </div>
        </div>
      </div>
    </main>
  )
}

export default function App() {
  return <DashboardShell />
}
