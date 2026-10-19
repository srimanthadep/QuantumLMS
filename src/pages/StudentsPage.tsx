import { useMemo } from "react"
import type { MetricItem, StudentItem } from "../types"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"
import { MetricCard } from "../components/MetricCard"

export function StudentsHeader({
  searchQuery,
  setSearchQuery,
  onOpenAddStudent,
  hexColor,
  onChangeHexColor,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenAddStudent: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>Students & Roster</span>
        </div>
        <div className="subtitle">
          Year 4 · Maple Class · 24 enrolled students
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, tag, status..."
            aria-label="Search students"
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
          onClick={onOpenAddStudent}
          aria-label="Add Student"
        >
          <span>+</span>
          Add Student
        </button>
      </div>
    </header>
  )
}

function StudentRosterCard({
  students,
  selectedStudentId,
  onSelectStudent,
  activeFilter,
  setActiveFilter,
}: {
  students: StudentItem[]
  selectedStudentId: string
  onSelectStudent: (student: StudentItem) => void
  activeFilter: string
  setActiveFilter: (filter: string) => void
}) {
  const counts = useMemo(() => {
    return {
      all: students.length,
      excelling: students.filter((s) => s.status === "Excelling").length,
      onTrack: students.filter((s) => s.status === "On Track").length,
      attention: students.filter((s) => s.status === "Needs Attention").length,
    }
  }, [students])

  const filtered = useMemo(() => {
    if (activeFilter === "Excelling") return students.filter((s) => s.status === "Excelling")
    if (activeFilter === "On Track") return students.filter((s) => s.status === "On Track")
    if (activeFilter === "Needs Attention") return students.filter((s) => s.status === "Needs Attention")
    return students
  }, [students, activeFilter])

  return (
    <section className="roster-card panel" aria-label="Enrolled Students Roster">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="card-title">Enrolled Students</div>
          <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
            Showing {filtered.length} of {students.length} students
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
            className={`filter-pill ${activeFilter === "Excelling" ? "active" : ""}`}
            onClick={() => setActiveFilter("Excelling")}
          >
            Excelling ({counts.excelling})
          </button>
          <button
            className={`filter-pill ${activeFilter === "On Track" ? "active" : ""}`}
            onClick={() => setActiveFilter("On Track")}
          >
            On Track ({counts.onTrack})
          </button>
          <button
            className={`filter-pill ${activeFilter === "Needs Attention" ? "active" : ""}`}
            onClick={() => setActiveFilter("Needs Attention")}
          >
            Needs Support ({counts.attention})
          </button>
        </div>
      </div>

      <div className="roster-table-head">
        <span>Student</span>
        <span>Attendance</span>
        <span>Completion</span>
        <span>Avg. score</span>
        <span>Status</span>
        <span />
      </div>

      <div className="roster-list">
        {filtered.map((student) => {
          const isSelected = student.id === selectedStudentId
          return (
            <div
              key={student.id}
              className={`roster-row ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectStudent(student)}
            >
              <div className="student-name">
                <img src={student.image} alt={student.name} />
                <div className="student-meta">
                  <strong>{student.name}</strong>
                  <span>{student.rollNumber}</span>
                </div>
              </div>

              <div className="text-[11.5px] font-medium text-zinc-600">
                {student.attendance}%
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

              <div>
                <span
                  className={`status ${
                    student.status === "Excelling"
                      ? "purple"
                      : student.status === "On Track"
                      ? "green"
                      : "yellow"
                  }`}
                >
                  {student.status}
                </span>
              </div>

              <button
                className="more"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectStudent(student)
                }}
                aria-label={`View ${student.name}`}
              >
                <Icon name="dots" size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function StudentSpotlightCard({
  student,
  onOpenReportModal,
  onOpenNewAssignment,
}: {
  student: StudentItem
  onOpenReportModal: (studentName: string) => void
  onOpenNewAssignment: () => void
}) {
  return (
    <section className="spotlight-card panel" aria-label="Student Profile Spotlight">
      <div className="card-header">
        <div className="card-title">Student Spotlight</div>
        <span
          className={`status ${
            student.status === "Excelling"
              ? "purple"
              : student.status === "On Track"
              ? "green"
              : "yellow"
          }`}
        >
          {student.status}
        </span>
      </div>

      <div className="spotlight-header">
        <img src={student.image} alt={student.name} />
        <div>
          <h3 className="text-[15px] font-bold text-black leading-snug">
            {student.name}
          </h3>
          <div className="text-[11px] font-normal text-zinc-500">
            {student.rollNumber} · Parent: {student.parentName}
          </div>
          <div className="text-[10px] text-zinc-400 font-normal">
            {student.parentEmail}
          </div>
        </div>
      </div>

      <div className="spotlight-stats">
        <div className="spotlight-stat">
          <span>Average GPA</span>
          <strong>{student.average}%</strong>
        </div>
        <div className="spotlight-stat">
          <span>Completion</span>
          <strong>{student.completion}%</strong>
        </div>
        <div className="spotlight-stat">
          <span>Attendance</span>
          <strong>{student.attendance}%</strong>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-medium text-zinc-700 mb-2">
          Subject Performance
        </div>
        <div className="subject-bars">
          <div className="subject-bar-row">
            <span className="w-16 text-zinc-600">English</span>
            <div className="subject-bar-track">
              <i
                style={{ width: `${student.subjects.english}%`, background: "var(--purple)" }}
              />
            </div>
            <span className="w-8 text-right font-bold">{student.subjects.english}%</span>
          </div>

          <div className="subject-bar-row">
            <span className="w-16 text-zinc-600">Math</span>
            <div className="subject-bar-track">
              <i
                style={{ width: `${student.subjects.math}%`, background: "var(--lime)" }}
              />
            </div>
            <span className="w-8 text-right font-bold">{student.subjects.math}%</span>
          </div>

          <div className="subject-bar-row">
            <span className="w-16 text-zinc-600">Science</span>
            <div className="subject-bar-track">
              <i
                style={{ width: `${student.subjects.science}%`, background: "#f2a6c7" }}
              />
            </div>
            <span className="w-8 text-right font-bold">{student.subjects.science}%</span>
          </div>

          <div className="subject-bar-row">
            <span className="w-16 text-zinc-600">Art</span>
            <div className="subject-bar-track">
              <i
                style={{ width: `${student.subjects.art}%`, background: "#f8dc70" }}
              />
            </div>
            <span className="w-8 text-right font-bold">{student.subjects.art}%</span>
          </div>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-medium text-zinc-700 mb-1.5">
          Strengths & Behavioral Tags
        </div>
        <div className="tag-list">
          {student.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              ✦ {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <button
          className="flex-1 h-8 rounded-full btn-primary text-xs font-bold transition-colors"
          onClick={() => onOpenReportModal(student.name)}
        >
          Send Report
        </button>
        <button
          className="flex-1 h-8 rounded-full btn-secondary text-xs font-medium transition-colors"
          onClick={onOpenNewAssignment}
        >
          Assign Task
        </button>
      </div>
    </section>
  )
}

function ClassDistributionCard() {
  return (
    <section className="distribution-card panel" aria-label="Class Grade Distribution">
      <div className="card-header">
        <div className="card-title">Grade Distribution</div>
        <span className="text-[10px] font-medium text-zinc-400">Term 1</span>
      </div>

      <div className="distribution-segment-bar">
        <div style={{ width: "42%", background: "var(--purple)" }} title="Grade A: 42%" />
        <div style={{ width: "42%", background: "var(--lime)" }} title="Grade B: 42%" />
        <div style={{ width: "16%", background: "#f8dc70" }} title="Grade C: 16%" />
      </div>

      <div className="distribution-legend">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--purple)]" />
          <span>Grade A (5)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--lime)]" />
          <span>Grade B (5)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f8dc70]" />
          <span>Grade C (2)</span>
        </div>
      </div>

      <div className="mt-3 p-2.5 rounded-xl bg-purple-50 text-[10.5px] font-normal text-purple-950 leading-relaxed">
        💡 <strong>Teacher Note:</strong> Liam Brooks and Ava Patel have shown +6% progress this week and are on track to enter Grade B.
      </div>
    </section>
  )
}

export default function StudentsPage({
  metrics,
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAddStudent,
  students,
  selectedStudentId,
  setSelectedStudentId,
  selectedStudent,
  activeFilter,
  setActiveFilter,
  onOpenReportModal,
  onOpenNewAssignment,
}: {
  metrics: MetricItem[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenAddStudent: () => void
  students: StudentItem[]
  selectedStudentId: string
  setSelectedStudentId: (id: string) => void
  selectedStudent: StudentItem
  activeFilter: string
  setActiveFilter: (filter: string) => void
  onOpenReportModal: (studentName: string) => void
  onOpenNewAssignment: () => void
}) {
  return (
    <>
      <StudentsHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAddStudent={onOpenAddStudent}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
      />

      {/* Metrics Grid (4 folder tab status cards for Students) */}
      <div className="metrics-grid">
        {metrics.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* Content Grid (2 columns on desktop) */}
      <div className="content-grid">
        <div className="left-column">
          <StudentRosterCard
            students={students}
            selectedStudentId={selectedStudentId}
            onSelectStudent={(s) => setSelectedStudentId(s.id)}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />
        </div>
        <div className="right-column">
          <StudentSpotlightCard
            student={selectedStudent}
            onOpenReportModal={onOpenReportModal}
            onOpenNewAssignment={onOpenNewAssignment}
          />
          <ClassDistributionCard />
        </div>
      </div>
    </>
  )
}
