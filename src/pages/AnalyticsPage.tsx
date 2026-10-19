import { useState, useMemo } from "react"
import type { MetricItem } from "../types"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"
import { MetricCard } from "../components/MetricCard"

export function AnalyticsHeader({
  searchQuery,
  setSearchQuery,
  onOpenAiDiagnostic,
  hexColor,
  onChangeHexColor,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenAiDiagnostic: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>Academic & Growth Analytics</span>
        </div>
        <div className="subtitle">
          Year 4 · Maple Class · Cohort Mastery, Learning Velocity & Predictive Diagnostics
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topic, skill or concept..."
            aria-label="Search analytics"
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
          onClick={onOpenAiDiagnostic}
          aria-label="Generate AI Diagnostic"
        >
          <span>✦</span>
          AI Diagnostic
        </button>
      </div>
    </header>
  )
}

function SubjectMasteryChartCard({
  searchQuery,
}: {
  searchQuery: string
}) {
  const [timeframe, setTimeframe] = useState<"8w" | "4w" | "1w">("8w")
  const [selectedSubjectKey, setSelectedSubjectKey] = useState("math")

  const subjects = useMemo(() => [
    {
      key: "english",
      name: "English Language Arts",
      short: "English",
      color: "var(--purple)",
      hex: "#9860e9",
      mastery: 86,
      benchmark: 80,
      trendPoints: [72, 74, 76, 79, 81, 83, 85, 86],
      subskills: [
        { name: "Reading Comprehension & Inference", score: 91 },
        { name: "Vocabulary & Context Clues", score: 88 },
        { name: "Grammar & Complex Sentences", score: 79 },
      ],
    },
    {
      key: "math",
      name: "Mathematics & Reasoning",
      short: "Math",
      color: "var(--lime)",
      hex: "#a8ed00",
      mastery: 81,
      benchmark: 75,
      trendPoints: [65, 68, 70, 72, 75, 77, 80, 81],
      subskills: [
        { name: "Fractions & Mixed Numbers", score: 92 },
        { name: "Geometry & 2D Perimeters", score: 84 },
        { name: "Decimal Operations & Division", score: 68 },
      ],
    },
    {
      key: "science",
      name: "Natural Science & Discovery",
      short: "Science",
      color: "#f2a6c7",
      hex: "#f2a6c7",
      mastery: 89,
      benchmark: 78,
      trendPoints: [70, 73, 75, 78, 82, 85, 88, 89],
      subskills: [
        { name: "Earth Weather Systems & Orbits", score: 94 },
        { name: "Forces, Magnetism & Energy", score: 86 },
        { name: "Scientific Observations & Lab", score: 87 },
      ],
    },
    {
      key: "art",
      name: "Creative Arts & Logic",
      short: "Art & Logic",
      color: "#f8dc70",
      hex: "#f8dc70",
      mastery: 94,
      benchmark: 82,
      trendPoints: [82, 84, 87, 89, 90, 92, 93, 94],
      subskills: [
        { name: "Color Harmony & Perspective", score: 96 },
        { name: "Visual Analysis & Structure", score: 92 },
        { name: "Creative Problem Solving", score: 94 },
      ],
    },
  ], [])

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects
    const q = searchQuery.toLowerCase()
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.short.toLowerCase().includes(q) ||
        s.subskills.some((sk) => sk.name.toLowerCase().includes(q))
    )
  }, [subjects, searchQuery])

  const activeSubject =
    filteredSubjects.find((s) => s.key === selectedSubjectKey) ||
    filteredSubjects[0] ||
    subjects[0]

  const getX = (idx: number) => 40 + idx * (520 / 7)
  const getY = (val: number) => {
    const clamped = Math.max(60, Math.min(100, val))
    return 155 - ((clamped - 60) / 40) * 130
  }

  const buildPath = (points: number[]) => {
    const pts = points.map((p, idx) => ({ x: getX(idx), y: getY(p) }))
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2
      const yc = (pts[i].y + pts[i + 1].y) / 2
      d += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`
    }
    d += ` T ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`
    return d
  }

  const buildAreaPath = (points: number[]) => {
    const linePath = buildPath(points)
    const lastX = getX(points.length - 1)
    const firstX = getX(0)
    return `${linePath} L ${lastX} 165 L ${firstX} 165 Z`
  }

  return (
    <section className="analytics-chart-card panel" aria-label="Subject Mastery & Growth Curve">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="card-title">Subject Mastery & Growth Curve</div>
          <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
            Cross-discipline trajectory · Class average vs 80% mastery target
          </div>
        </div>
        <div className="filter-pills">
          <button
            className={`filter-pill ${timeframe === "8w" ? "active" : ""}`}
            onClick={() => setTimeframe("8w")}
          >
            Term 1 (8 Wks)
          </button>
          <button
            className={`filter-pill ${timeframe === "4w" ? "active" : ""}`}
            onClick={() => setTimeframe("4w")}
          >
            Month (4 Wks)
          </button>
          <button
            className={`filter-pill ${timeframe === "1w" ? "active" : ""}`}
            onClick={() => setTimeframe("1w")}
          >
            Week
          </button>
        </div>
      </div>

      <div className="analytics-svg-wrapper">
        <svg viewBox="0 0 600 175" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="grad-active-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeSubject.hex} stopOpacity="0.25" />
              <stop offset="100%" stopColor={activeSubject.hex} stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow-line" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={activeSubject.hex} floodOpacity="0.35" />
            </filter>
          </defs>

          <line x1="30" y1="25" x2="570" y2="25" stroke="#edf0f5" strokeWidth="1" strokeDasharray="3 3" />
          <text x="24" y="28" fill="#9e9cb0" fontSize="9" fontWeight="500" textAnchor="end">100%</text>

          <line x1="30" y1="57.5" x2="570" y2="57.5" stroke="#edf0f5" strokeWidth="1" strokeDasharray="3 3" />
          <text x="24" y="60.5" fill="#9e9cb0" fontSize="9" fontWeight="500" textAnchor="end">90%</text>

          <line x1="30" y1="90" x2="570" y2="90" stroke="#c4b5fd" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x="24" y="93" fill="var(--purple)" fontSize="9" fontWeight="700" textAnchor="end">80%</text>
          <rect x="495" y="81" width="80" height="15" rx="4" fill="#f5f3ff" />
          <text x="535" y="92" fill="var(--purple-dark)" fontSize="8.5" fontWeight="700" textAnchor="middle">Target Goal 80%</text>

          <line x1="30" y1="122.5" x2="570" y2="122.5" stroke="#edf0f5" strokeWidth="1" strokeDasharray="3 3" />
          <text x="24" y="125.5" fill="#9e9cb0" fontSize="9" fontWeight="500" textAnchor="end">70%</text>

          <line x1="30" y1="155" x2="570" y2="155" stroke="#edf0f5" strokeWidth="1" />
          <text x="24" y="158" fill="#9e9cb0" fontSize="9" fontWeight="500" textAnchor="end">60%</text>

          {["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"].map((wk, idx) => (
            <text key={wk} x={getX(idx)} y="171" fill="#71717a" fontSize="9" fontWeight="500" textAnchor="middle">
              {wk}
            </text>
          ))}

          <path d={buildAreaPath(activeSubject.trendPoints)} fill="url(#grad-active-area)" />

          {subjects
            .filter((s) => s.key !== activeSubject.key)
            .map((s) => (
              <path
                key={s.key}
                d={buildPath(s.trendPoints)}
                fill="none"
                stroke={s.hex}
                strokeWidth="2"
                strokeOpacity="0.32"
                strokeLinecap="round"
              />
            ))}

          <path
            d={buildPath(activeSubject.trendPoints)}
            fill="none"
            stroke={activeSubject.hex}
            strokeWidth="3.2"
            strokeLinecap="round"
            filter="url(#glow-line)"
          />

          {activeSubject.trendPoints.map((pt, idx) => {
            const cx = getX(idx)
            const cy = getY(pt)
            const isLast = idx === activeSubject.trendPoints.length - 1
            return (
              <g key={idx}>
                <circle cx={cx} cy={cy} r={isLast ? "5.5" : "3.5"} fill="#fff" stroke={activeSubject.hex} strokeWidth={isLast ? "3" : "2"} />
                {isLast && (
                  <>
                    <rect x={cx - 16} y={cy - 20} width="32" height="15" rx="5" fill="#000" />
                    <text x={cx} y={cy - 10} fill="#fff" fontSize="9" fontWeight="700" textAnchor="middle">
                      {pt}%
                    </text>
                  </>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div>
        <div className="text-[11px] font-medium text-zinc-500 mb-2">
          Click a subject to inspect competency breakdown & benchmark delta:
        </div>
        <div className="analytics-subject-pills">
          {filteredSubjects.map((sub) => {
            const isSelected = sub.key === activeSubject.key
            const delta = sub.mastery - sub.benchmark
            return (
              <button
                key={sub.key}
                className={`analytics-subject-pill ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedSubjectKey(sub.key)}
              >
                <span className="pill-dot" style={{ background: sub.hex }} />
                <span>{sub.name}</span>
                <strong className="text-black ml-1">{sub.mastery}%</strong>
                <span
                  className="text-[9.5px] font-medium ml-1"
                  style={{ color: delta >= 0 ? "#557c00" : "#d9534f" }}
                >
                  ({delta >= 0 ? `+${delta}%` : `${delta}%`})
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="analytics-subskill-list">
        <div className="flex items-center justify-between text-[11px] font-medium text-zinc-700">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: activeSubject.hex }} />
            <span>{activeSubject.name} — Competency Breakdown</span>
          </span>
          <span className="text-[10px] text-zinc-400">Class Benchmark: {activeSubject.benchmark}%</span>
        </div>

        {activeSubject.subskills.map((skill) => (
          <div key={skill.name} className="analytics-subskill-row">
            <span className="w-48 text-zinc-700 truncate">{skill.name}</span>
            <div className="analytics-subskill-track">
              <i
                style={{
                  width: `${skill.score}%`,
                  background: activeSubject.hex,
                }}
              />
            </div>
            <strong className="w-9 text-right text-black font-bold">{skill.score}%</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function DiagnosticInterventionCard({
  searchQuery,
  onAssignSkill,
}: {
  searchQuery: string
  onAssignSkill: (skillTitle: string, subjectType: string) => void
}) {
  const [activeFilter, setActiveFilter] = useState("All")

  const competencies = useMemo(() => [
    {
      id: "c1",
      topic: "Fractions: Addition & Mixed Denominators",
      subject: "Fractions Practice",
      passRate: 96,
      proficient: "23 of 24",
      status: "Mastered" as const,
      tone: "green" as const,
      detail: "Curriculum velocity is +1.4 weeks ahead of schedule. Exceptional student engagement.",
      btnText: "Assign Extension",
    },
    {
      id: "c2",
      topic: "Earth Systems: Weather & Planetary Orbits",
      subject: "Science Quiz",
      passRate: 92,
      proficient: "22 of 24",
      status: "Mastered" as const,
      tone: "green" as const,
      detail: "High concept retention on interactive solar diagrams and gravitational pull prompts.",
      btnText: "View Records",
    },
    {
      id: "c3",
      topic: "Decimal Division & Multi-Step Word Problems",
      subject: "Fractions Practice",
      passRate: 72,
      proficient: "17 of 24",
      status: "Review Needed" as const,
      tone: "yellow" as const,
      detail: "4 students need targeted support aligning decimal points in quotient step.",
      btnText: "+ Assign Recap",
    },
    {
      id: "c4",
      topic: "English Grammar: Subordinate Clauses & Commas",
      subject: "Grammar Worksheet",
      passRate: 64,
      proficient: "15 of 24",
      status: "At-Risk Alert" as const,
      tone: "purple" as const,
      detail: "6 students scored below 70%. 15-minute group modeling recommended before quiz.",
      btnText: "+ Assign Practice",
    },
    {
      id: "c5",
      topic: "Geometry: Polygon Perimeters & Angles",
      subject: "Fractions Practice",
      passRate: 88,
      proficient: "21 of 24",
      status: "Mastered" as const,
      tone: "green" as const,
      detail: "Students demonstrated strong visual understanding of acute/obtuse angle sums.",
      btnText: "View Records",
    },
    {
      id: "c6",
      topic: "Reading: Text Evidence & Inferences",
      subject: "Reading Comprehension",
      passRate: 76,
      proficient: "18 of 24",
      status: "Review Needed" as const,
      tone: "yellow" as const,
      detail: "Weekly reading prompts showing steady upward trajectory; 2 students need prompt aid.",
      btnText: "+ Assign Practice",
    },
  ], [])

  const counts = useMemo(() => ({
    all: competencies.length,
    review: competencies.filter((c) => c.status === "Review Needed").length,
    risk: competencies.filter((c) => c.status === "At-Risk Alert").length,
    mastered: competencies.filter((c) => c.status === "Mastered").length,
  }), [competencies])

  const filtered = useMemo(() => {
    let list = competencies
    if (activeFilter === "Review") {
      list = list.filter((c) => c.status === "Review Needed")
    } else if (activeFilter === "Risk") {
      list = list.filter((c) => c.status === "At-Risk Alert")
    } else if (activeFilter === "Mastered") {
      list = list.filter((c) => c.status === "Mastered")
    }

    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(
      (c) =>
        c.topic.toLowerCase().includes(q) ||
        c.detail.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
    )
  }, [competencies, activeFilter, searchQuery])

  return (
    <section className="diagnostic-card panel" aria-label="Curriculum Diagnostic & Learning Gaps">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="card-title">Skill Diagnostic & Intervention Matrix</div>
          <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
            Real-time competency health · Automated risk detection & teacher actions
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
            className={`filter-pill ${activeFilter === "Risk" ? "active" : ""}`}
            onClick={() => setActiveFilter("Risk")}
          >
            At-Risk ({counts.risk})
          </button>
          <button
            className={`filter-pill ${activeFilter === "Review" ? "active" : ""}`}
            onClick={() => setActiveFilter("Review")}
          >
            Needs Review ({counts.review})
          </button>
          <button
            className={`filter-pill ${activeFilter === "Mastered" ? "active" : ""}`}
            onClick={() => setActiveFilter("Mastered")}
          >
            Mastered ({counts.mastered})
          </button>
        </div>
      </div>

      <div className="diagnostic-list">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400 font-medium">
            No competencies match your search criteria.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="diagnostic-item">
              <div className="diagnostic-info">
                <div className="flex items-center gap-2">
                  <strong>{item.topic}</strong>
                  <span className={`status ${item.tone}`}>{item.status}</span>
                </div>
                <span>{item.detail}</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-28 h-1.5 rounded-full bg-zinc-200 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${item.passRate}%`,
                        background:
                          item.tone === "green"
                            ? "var(--lime)"
                            : item.tone === "yellow"
                            ? "#f8dc70"
                            : "var(--purple)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-zinc-600">
                    {item.passRate}% Class Pass ({item.proficient})
                  </span>
                </div>
              </div>

              <button
                className="diagnostic-action-btn"
                onClick={() => onAssignSkill(item.topic, item.subject)}
              >
                {item.btnText}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function CohortGrowthQuadrantCard({
  onSelectStudentForReport,
}: {
  onSelectStudentForReport: (studentName: string) => void
}) {
  const [selectedQuadrantId, setSelectedQuadrantId] = useState("accelerators")

  const quadrants = useMemo(() => [
    {
      id: "accelerators",
      label: "Accelerators",
      icon: "🚀",
      sublabel: "11 Students · 88-96% GPA",
      summary: "High Mastery & Rapid Growth",
      color: "var(--purple)",
      students: [
        {
          name: "Olivia Benett",
          rollNumber: "#Y4-101",
          image: "/assets/student-1.png",
          gpa: 88,
          growthRate: "+12% this term",
          actionTag: "Advance to Level 5 Reading",
        },
        {
          name: "Ethan Davies",
          rollNumber: "#Y4-105",
          image: "/assets/student-5.png",
          gpa: 93,
          growthRate: "+14% this term",
          actionTag: "Math Olympiad Candidate",
        },
        {
          name: "Mia Anderson",
          rollNumber: "#Y4-112",
          image: "/assets/student-2.png",
          gpa: 91,
          growthRate: "+9% this term",
          actionTag: "Peer Mentor in Science",
        },
        {
          name: "Emma Johnson",
          rollNumber: "#Y4-108",
          image: "/assets/student-8.png",
          gpa: 90,
          growthRate: "+11% this term",
          actionTag: "Creative Writing Showcase",
        },
      ],
    },
    {
      id: "fast_movers",
      label: "Fast Movers",
      icon: "📈",
      sublabel: "7 Students · 70-80% GPA",
      summary: "High Growth, Developing Mastery",
      color: "var(--lime)",
      students: [
        {
          name: "Liam Brooks",
          rollNumber: "#Y4-103",
          image: "/assets/student-3.png",
          gpa: 70,
          growthRate: "+18% growth!",
          actionTag: "Fractions Visual Practice",
        },
        {
          name: "Ava Patel",
          rollNumber: "#Y4-104",
          image: "/assets/student-4.png",
          gpa: 62,
          growthRate: "+16% growth!",
          actionTag: "Reading Fluency Boost",
        },
        {
          name: "Noah Wilson",
          rollNumber: "#Y4-102",
          image: "/assets/student-2.png",
          gpa: 74,
          growthRate: "+10% growth",
          actionTag: "STEM Lab Project Lead",
        },
      ],
    },
    {
      id: "consistent",
      label: "Consistent",
      icon: "🛡️",
      sublabel: "4 Students · 84-88% GPA",
      summary: "Stable & Consistent Mastery",
      color: "#f8dc70",
      students: [
        {
          name: "Sophia Martinez",
          rollNumber: "#Y4-106",
          image: "/assets/student-6.png",
          gpa: 86,
          growthRate: "+4% stable",
          actionTag: "Maintain Enrichment Track",
        },
        {
          name: "Isabella Brown",
          rollNumber: "#Y4-110",
          image: "/assets/student-1.png",
          gpa: 85,
          growthRate: "+5% steady",
          actionTag: "Weekly Discussion Lead",
        },
      ],
    },
    {
      id: "priority",
      label: "Priority Focus",
      icon: "🎯",
      sublabel: "2 Students · < 68% GPA",
      summary: "Targeted 1-on-1 Intervention",
      color: "#f2a6c7",
      students: [
        {
          name: "Lucas Chen",
          rollNumber: "#Y4-107",
          image: "/assets/student-7.png",
          gpa: 68,
          growthRate: "+3% steady",
          actionTag: "1-on-1 Geometry Check-in",
        },
        {
          name: "Alexander Wright",
          rollNumber: "#Y4-111",
          image: "/assets/student-3.png",
          gpa: 71,
          growthRate: "+4% steady",
          actionTag: "Reading Support Group",
        },
      ],
    },
  ], [])

  const activeQuadrant =
    quadrants.find((q) => q.id === selectedQuadrantId) || quadrants[0]

  return (
    <section className="quadrant-card panel" aria-label="Cohort Growth Quadrant">
      <div className="card-header">
        <div>
          <div className="card-title">Cohort Growth Quadrant</div>
          <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
            Velocity vs Current GPA · 24 students mapped by learning momentum
          </div>
        </div>
      </div>

      <div className="quadrant-selector-grid">
        {quadrants.map((q) => {
          const isSelected = q.id === activeQuadrant.id
          return (
            <button
              key={q.id}
              className={`quadrant-selector-btn ${isSelected ? "active" : ""}`}
              onClick={() => setSelectedQuadrantId(q.id)}
            >
              <strong>
                <span>{q.icon}</span>
                <span>{q.label}</span>
              </strong>
              <span className="quadrant-sub">{q.sublabel}</span>
            </button>
          )
        })}
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] font-medium text-zinc-600 mb-2">
          <span>{activeQuadrant.summary} ({activeQuadrant.students.length} students shown)</span>
          <span className="text-[10px] text-zinc-400">Click student to send report</span>
        </div>

        <div className="quadrant-roster-list">
          {activeQuadrant.students.map((student) => (
            <div
              key={student.rollNumber}
              className="quadrant-student-row hover:bg-purple-50/60 cursor-pointer transition-colors"
              onClick={() => onSelectStudentForReport(student.name)}
              title={`Send parent progress update for ${student.name}`}
            >
              <div className="quadrant-student-left">
                <img src={student.image} alt={student.name} />
                <div className="quadrant-student-meta">
                  <strong>{student.name}</strong>
                  <span>{student.rollNumber} · {student.actionTag}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <strong className="text-black font-bold text-xs">{student.gpa}%</strong>
                <span className="quadrant-velocity-badge">{student.growthRate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SubmissionTimelinessCard() {
  return (
    <section className="timeliness-card panel" aria-label="Assignment Submission Timeliness">
      <div className="card-header">
        <div className="card-title">Submission Velocity & Timeliness</div>
        <span className="status green">96% On-Track</span>
      </div>

      <div className="timeliness-bar">
        <div style={{ width: "88%", background: "var(--lime)" }} title="88% Early & On-Time" />
        <div style={{ width: "8%", background: "#f8dc70" }} title="8% Grace Period (<24h)" />
        <div style={{ width: "4%", background: "#f2a6c7" }} title="4% Extended Extension" />
      </div>

      <div className="timeliness-legend">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--lime)]" />
          <span>Early / On-Time (88%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f8dc70]" />
          <span>Grace Period (8%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f2a6c7]" />
          <span>Extended (4%)</span>
        </div>
      </div>

      <div className="timeliness-stats-grid">
        <div className="timeliness-stat-box">
          <span>Avg. Turn-In</span>
          <strong>1.2 Days</strong>
        </div>
        <div className="timeliness-stat-box">
          <span>Final Completion</span>
          <strong>96.4%</strong>
        </div>
        <div className="timeliness-stat-box">
          <span>Ahead of Due</span>
          <strong>68%</strong>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-purple-50 text-[10.5px] font-normal text-purple-950 leading-relaxed">
        💡 <strong>Pedagogical Correlation:</strong> Students submitting homework before Thursday 6 PM average <strong>+14.2% higher score</strong> on weekly Friday assessments.
      </div>
    </section>
  )
}

function AiDiagnosticDigestCard({
  onOpenAiAssistant,
  onShareDigest,
}: {
  onOpenAiAssistant: () => void
  onShareDigest: () => void
}) {
  return (
    <section className="ai-digest-card" aria-label="Quantum AI Learning Synthesis">
      <div className="ai-digest-header">
        <div className="ai-digest-title">
          <span className="text-base text-[#f3ff9b]">✦</span>
          <span>Quantum AI Learning Diagnostics</span>
        </div>
        <span className="ai-digest-badge">Synthesized 10m ago</span>
      </div>

      <div className="ai-digest-body">
        <p className="mb-2">
          Analysis of <strong>148 recent submissions & assessments</strong> indicates strong conceptual acceleration across Year 4 Maple Class (+8.4% monthly aggregate).
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong>Key Breakthrough:</strong> Fractions visual guides lifted Liam & Ava's arithmetic accuracy by <strong>+24%</strong> this week.
          </li>
          <li>
            <strong>Focus Area:</strong> 4 students exhibit decimal point confusion during long division. Guided 10-min worksheet recommended.
          </li>
          <li>
            <strong>Exam Readiness:</strong> Cohort is <strong>92% ready</strong> for Mid-Term Comprehensive Evaluation.
          </li>
        </ul>
      </div>

      <div className="ai-digest-actions">
        <button
          className="flex-1 h-8 rounded-full bg-[#f3ff9b] text-black text-xs font-bold hover:bg-[#e4f57c] transition-colors flex items-center justify-center gap-1 shadow-sm"
          onClick={onOpenAiAssistant}
        >
          <span>✦</span>
          <span>Ask AI Diagnostic</span>
        </button>
        <button
          className="flex-1 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
          onClick={onShareDigest}
        >
          Dispatch to Parents
        </button>
      </div>
    </section>
  )
}

export default function AnalyticsPage({
  metrics,
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiDiagnostic,
  onAssignSkill,
  onSelectStudentForReport,
  onOpenAiAssistant,
  onShareDigest,
}: {
  metrics: MetricItem[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenAiDiagnostic: () => void
  onAssignSkill: (skillTitle: string, subjectType: string) => void
  onSelectStudentForReport: (studentName: string) => void
  onOpenAiAssistant: () => void
  onShareDigest: () => void
}) {
  return (
    <>
      <AnalyticsHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAiDiagnostic={onOpenAiDiagnostic}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
      />

      {/* Metrics Grid (4 folder tab status cards for Analytics) */}
      <div className="metrics-grid">
        {metrics.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* Content Grid (2 columns on desktop) */}
      <div className="content-grid">
        <div className="left-column">
          <SubjectMasteryChartCard searchQuery={searchQuery} />
          <DiagnosticInterventionCard
            searchQuery={searchQuery}
            onAssignSkill={onAssignSkill}
          />
        </div>
        <div className="right-column">
          <CohortGrowthQuadrantCard
            onSelectStudentForReport={onSelectStudentForReport}
          />
          <SubmissionTimelinessCard />
          <AiDiagnosticDigestCard
            onOpenAiAssistant={onOpenAiAssistant}
            onShareDigest={onShareDigest}
          />
        </div>
      </div>
    </>
  )
}
