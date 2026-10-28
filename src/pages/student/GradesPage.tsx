import { useState, useMemo } from "react"
import { Icon } from "../../components/Icon"
import { MetricCard } from "../../components/MetricCard"
import { studentGrades } from "./studentMockData"

interface GradesPageProps {
  onToast: (msg: string) => void
}

// Cohort benchmarks for academic comparison (sample cohort baseline)
const courseBenchmarks: Record<
  string,
  { classAvg: number; top10: number; shortTitle: string }
> = {
  "AI-401": { classAvg: 86.2, top10: 98.0, shortTitle: "GenAI" },
  "PY-201": { classAvg: 84.1, top10: 97.5, shortTitle: "Python AI" },
  "ML-301": { classAvg: 81.5, top10: 95.0, shortTitle: "ML Found." },
  "AG-501": { classAvg: 87.8, top10: 99.0, shortTitle: "AI Agents" },
  "CS-102": { classAvg: 83.0, top10: 96.5, shortTitle: "DSA" },
  "MATH-201": { classAvg: 85.4, top10: 97.0, shortTitle: "Math AI" },
}

export function GradesPage({ onToast }: GradesPageProps) {
  const [selectedSemester, setSelectedSemester] = useState<
    "All Semesters" | "Fall 2026" | "Spring 2026"
  >("Fall 2026")
  const [isCertModalOpen, setIsCertModalOpen] = useState(false)
  const [hoveredOverview, setHoveredOverview] = useState<string | null>(null)
  const [hoveredBenchmark, setHoveredBenchmark] = useState<string | null>(null)
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null)
  const [hoveredRadarCategory, setHoveredRadarCategory] = useState<string | null>(null)

  // Filter grades based on semester
  const displayedGrades = useMemo(() => {
    if (selectedSemester === "Fall 2026") {
      return studentGrades.filter((g) =>
        ["AI-401", "PY-201", "ML-301", "AG-501"].includes(g.courseCode),
      )
    }
    if (selectedSemester === "Spring 2026") {
      return studentGrades.filter((g) =>
        ["CS-102", "MATH-201"].includes(g.courseCode),
      )
    }
    return studentGrades
  }, [selectedSemester])

  // Average score across current displayed grades
  const currentAverage = useMemo(() => {
    if (!displayedGrades.length) return "0.0"
    const sum = displayedGrades.reduce((acc, curr) => acc + curr.totalScore, 0)
    return (sum / displayedGrades.length).toFixed(1)
  }, [displayedGrades])

  // Radar categories calculation from studentGrades
  const radarData = useMemo(() => {
    const count = studentGrades.length || 1
    const midtermAvg =
      studentGrades.reduce((sum, g) => sum + g.midterm, 0) / count
    const assignAvg =
      studentGrades.reduce((sum, g) => sum + g.assignments, 0) / count
    const finalAvg =
      studentGrades.reduce((sum, g) => sum + g.finalExam, 0) / count
    const participationAvg = 96.0 // Cohort active attendance & discussion metric
    const projectAvg = 98.0 // Capstone & lab project score

    return [
      {
        category: "Midterm",
        student: parseFloat(midtermAvg.toFixed(1)),
        classAvg: 83.5,
      },
      {
        category: "Assignments",
        student: parseFloat(assignAvg.toFixed(1)),
        classAvg: 88.0,
      },
      {
        category: "Final Exam",
        student: parseFloat(finalAvg.toFixed(1)),
        classAvg: 81.0,
      },
      {
        category: "Participation",
        student: participationAvg,
        classAvg: 85.0,
      },
      {
        category: "Project Work",
        student: projectAvg,
        classAvg: 86.5,
      },
    ]
  }, [])

  const handleDownloadTranscript = () => {
    const transcriptText =
      "===========================================================\n" +
      "             QUANTUM SCHOOL OF AI - ACADEMIC TRANSCRIPT    \n" +
      "===========================================================\n" +
      "Student Name: Srimanth\n" +
      "Student ID: QS-2024-8821\n" +
      "Degree Program: B.S. in Artificial Intelligence & Machine Learning\n" +
      "Semester: Fall 2026\n" +
      "Cumulative GPA: 3.88 / 4.0\n" +
      "Academic Standing: Dean's Honor List (Distinction)\n" +
      "Total Credits Earned: 42 / 60\n\n" +
      "COURSE GRADE DETAILS:\n" +
      "-----------------------------------------------------------\n" +
      studentGrades
        .map(
          (g) =>
            `${g.courseCode} | ${g.courseTitle} | Credits: ${g.credits} | Grade: ${g.letterGrade} (${g.totalScore}%) | Status: ${g.status}`,
        )
        .join("\n") +
      "\n-----------------------------------------------------------\n" +
      `Date Generated: ${new Date().toLocaleDateString()}\n` +
      "Verification Key: 0x8F9B2C3D4E5A6B7C\n"
    const blob = new Blob([transcriptText], {
      type: "text/plain;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "Quantum_Academic_Transcript_Srimanth.txt"
    link.click()
    URL.revokeObjectURL(url)
    onToast("Official academic transcript downloaded successfully! 📄")
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner & Academic Summary Action */}
      <section
        className="panel p-5 sm:p-6 bg-white border border-zinc-200/80 shadow-[0_8px_28px_rgba(39,28,61,0.055)] rounded-3xl"
        aria-label="Grades Header"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title text-xl font-black text-zinc-900 tracking-tight">
                Grades, GPA & Academic Transcript
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F0E7FF] text-[#5F2BC0] border border-[#D8C2FF]/60">
                Dean's Honor List
              </span>
            </div>
            <p className="text-xs text-[#514B68] mt-1">
              Official semester transcripts, course credit audits, and cumulative grade point performance.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsCertModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full border border-[#B6AEC8] text-xs font-bold text-[#171526] hover:bg-[#F0EDFF]/50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Icon name="award" size={13} />
              <span>Verified Certificate</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadTranscript}
              className="px-4 py-1.5 rounded-full bg-[#905FEB] text-white text-xs font-bold hover:bg-[#7D4BD8] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Icon name="document" size={13} />
              <span>Download Transcript</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Four Academic Summary Cards */}
      <section className="metrics-grid" aria-label="Academic Metrics">
        <MetricCard
          item={{
            label: "Cumulative GPA",
            value: "3.88 / 4.0",
            trend: "↗ Rank #2 of 24",
            tone: "lavender",
            icon: "trend",
          }}
        />
        <MetricCard
          item={{
            label: "Term GPA (Fall 2026)",
            value: "3.92",
            trend: "↗ +0.08 improvement",
            tone: "lime",
            icon: "chart",
          }}
        />
        <MetricCard
          item={{
            label: "Credits Completed",
            value: "42 / 60",
            trend: "70% degree completed",
            tone: "yellow",
            icon: "book",
          }}
        />
        <MetricCard
          item={{
            label: "Academic Average",
            value: `${currentAverage}%`,
            trend: "Distinction standing",
            tone: "pink",
            icon: "check",
          }}
        />
      </section>

      {/* 3. Upper Section: Gradebook Table & Performance Overview Graph */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Gradebook Table (7 columns on XL) */}
        <section
          className="xl:col-span-7 panel p-5 sm:p-6 bg-white border border-zinc-200/80 shadow-[0_8px_28px_rgba(39,28,61,0.055)] rounded-3xl flex flex-col justify-between"
          aria-label="Gradebook"
        >
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="card-title text-base font-bold text-zinc-900 tracking-tight">
                  Gradebook & Examination Performance
                </h3>
                <span className="text-xs text-[#514B68]">
                  Official course grade weights and grading rubrics
                </span>
              </div>

              {/* Semester Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-[#F0EDFF] rounded-full border border-[#E2DCEE] self-start sm:self-auto">
                {(["Fall 2026", "Spring 2026", "All Semesters"] as const).map(
                  (sem) => (
                    <button
                      key={sem}
                      type="button"
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        selectedSemester === sem
                          ? "bg-[#905FEB] text-white shadow-sm"
                          : "text-[#514B68] hover:text-[#171526]"
                      }`}
                      onClick={() => setSelectedSemester(sem)}
                    >
                      {sem}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-100">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F0EDFF]/50 border-b border-zinc-200 text-[#514B68] font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3 px-3">Course Code & Title</th>
                    <th className="py-3 px-2 text-center">Credits</th>
                    <th className="py-3 px-2 text-center">Midterm</th>
                    <th className="py-3 px-2 text-center">Assignments</th>
                    <th className="py-3 px-2 text-center">Final Exam</th>
                    <th className="py-3 px-2 text-center">Score</th>
                    <th className="py-3 px-2 text-center">Grade</th>
                    <th className="py-3 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {displayedGrades.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F0EDFF]/30 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-zinc-900">
                          {item.courseTitle}
                        </div>
                        <div className="text-[11px] text-[#514B68]">
                          {item.courseCode}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-zinc-700">
                        {item.credits}.0
                      </td>
                      <td className="py-3 px-2 text-center text-zinc-700 font-semibold">
                        {item.midterm}
                      </td>
                      <td className="py-3 px-2 text-center text-zinc-700 font-semibold">
                        {item.assignments}
                      </td>
                      <td className="py-3 px-2 text-center text-zinc-700 font-semibold">
                        {item.finalExam}
                      </td>
                      <td className="py-3 px-2 text-center font-black text-[#905FEB]">
                        {item.totalScore}%
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#F0E7FF] text-[#5F2BC0] border border-[#D8C2FF]/60">
                          {item.letterGrade}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === "Passed with Honors"
                              ? "bg-[#E7FF9C] text-[#253700] border border-[#D2F66A]"
                              : "bg-[#F0EDFF] text-[#5F2BC0] border border-[#D8C2FF]/60"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-[#514B68]">
            <span>Showing {displayedGrades.length} courses in {selectedSemester}</span>
            <span className="font-bold text-zinc-700">
              Total Credits: {displayedGrades.reduce((sum, g) => sum + g.credits, 0)} Units
            </span>
          </div>
        </section>

        {/* Performance Overview Graph (5 columns on XL) */}
        <section
          className="xl:col-span-5 panel p-5 sm:p-6 bg-white border border-zinc-200/80 shadow-[0_8px_28px_rgba(39,28,61,0.055)] rounded-3xl flex flex-col justify-between"
          aria-label="Performance Overview"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="card-title text-base font-bold text-zinc-900 tracking-tight">
                  Performance Overview
                </h3>
                <span className="text-xs text-[#514B68]">
                  Overall score by subject (0–100 scale)
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#E7FF9C] text-[#253700] border border-[#D2F66A]">
                Avg {currentAverage}%
              </span>
            </div>

            {/* Vertical Bar Chart SVG */}
            <div className="relative w-full h-[240px] pt-4">
              <svg
                viewBox="0 0 420 220"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="purpleBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#905FEB" />
                    <stop offset="100%" stopColor="#6E36D5" />
                  </linearGradient>
                  <linearGradient id="purpleBarGradHover" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A780F1" />
                    <stop offset="100%" stopColor="#5F2BC0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Horizontal Gridlines & Values */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = 175 - (val / 100) * 145
                  return (
                    <g key={val}>
                      <line
                        x1="36"
                        y1={y}
                        x2="410"
                        y2={y}
                        stroke="#E2DCEE"
                        strokeDasharray={val === 0 ? "none" : "3 3"}
                        strokeWidth="1"
                      />
                      <text
                        x="30"
                        y={y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fill="#89858E"
                        fontWeight="600"
                      >
                        {val}
                      </text>
                    </g>
                  )
                })}

                {/* Average Reference Line */}
                {(() => {
                  const avgY = 175 - (parseFloat(currentAverage) / 100) * 145
                  return (
                    <g>
                      <line
                        x1="36"
                        y1={avgY}
                        x2="410"
                        y2={avgY}
                        stroke="#AEEB00"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                      />
                      <rect
                        x="355"
                        y={avgY - 9}
                        width="54"
                        height="16"
                        rx="8"
                        fill="#E7FF9C"
                      />
                      <text
                        x="382"
                        y={avgY + 2.5}
                        textAnchor="middle"
                        fontSize="8.5"
                        fill="#253700"
                        fontWeight="800"
                      >
                        Avg {currentAverage}%
                      </text>
                    </g>
                  )
                })()}

                {/* Vertical Bars */}
                {displayedGrades.map((item, idx) => {
                  const n = displayedGrades.length
                  const availableWidth = 370
                  const step = availableWidth / n
                  const barWidth = Math.min(38, step * 0.62)
                  const x = 40 + idx * step + (step - barWidth) / 2
                  const barHeight = (item.totalScore / 100) * 145
                  const y = 175 - barHeight
                  const isHovered = hoveredOverview === item.id
                  const bench = courseBenchmarks[item.courseCode]

                  return (
                    <g
                      key={item.id}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredOverview(item.id)}
                      onMouseLeave={() => setHoveredOverview(null)}
                    >
                      {/* Background hover column */}
                      <rect
                        x={40 + idx * step}
                        y="15"
                        width={step}
                        height="165"
                        fill={isHovered ? "rgba(144, 95, 235, 0.08)" : "transparent"}
                        rx="8"
                      />

                      {/* Bar Fill */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="6"
                        ry="6"
                        fill={isHovered ? "url(#purpleBarGradHover)" : "url(#purpleBarGrad)"}
                        filter={isHovered ? "drop-shadow(0 4px 10px rgba(144, 95, 235, 0.4))" : undefined}
                      />

                      {/* Percentage Label on Top of Bar */}
                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="700"
                        fill={isHovered ? "#5F2BC0" : "#171526"}
                      >
                        {item.totalScore}%
                      </text>

                      {/* Subject Label below X-axis */}
                      <text
                        x={x + barWidth / 2}
                        y="192"
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="700"
                        fill="#171526"
                      >
                        {item.courseCode}
                      </text>
                      <text
                        x={x + barWidth / 2}
                        y="203"
                        textAnchor="middle"
                        fontSize="8"
                        fill="#514B68"
                      >
                        {bench?.shortTitle || item.courseTitle.slice(0, 8)}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {/* Tooltip on hover */}
              {hoveredOverview && (
                (() => {
                  const target = displayedGrades.find((g) => g.id === hoveredOverview)
                  if (!target) return null
                  return (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[11px] py-1 px-3 rounded-xl shadow-lg pointer-events-none flex items-center gap-2 z-10">
                      <span className="font-bold">{target.courseTitle}:</span>
                      <span className="text-[#AEEB00] font-black">{target.totalScore}%</span>
                      <span className="text-zinc-400">({target.letterGrade} · {target.status})</span>
                    </div>
                  )
                })()
              )}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-[#514B68]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#905FEB]" />
              Subject Overall Score
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-[#AEEB00]" />
              Term Benchmark ({currentAverage}%)
            </span>
          </div>
        </section>
      </div>

      {/* 4. Lower Section: 3-Card Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Card 1: Score vs Class Benchmark */}
        <section
          className="panel p-5 sm:p-6 bg-white border border-zinc-200/80 shadow-[0_8px_28px_rgba(39,28,61,0.055)] rounded-3xl flex flex-col justify-between"
          aria-label="Score vs Class Benchmark"
        >
          <div>
            <div className="flex flex-col gap-1 mb-3">
              <div className="flex items-center justify-between">
                <h3 className="card-title text-base font-bold text-zinc-900 tracking-tight">
                  Score vs Class Benchmark
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0EDFF] text-[#5F2BC0]">
                  Cohort Analysis
                </span>
              </div>
              <span className="text-xs text-[#514B68]">
                Grouped comparison: My Score vs Class Average vs Top 10%
              </span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[10.5px] font-semibold text-[#514B68] mb-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#905FEB]" />
                My Score
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#C1A6F7]" />
                Class Avg
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#AEEB00]" />
                Top 10%
              </span>
            </div>

            {/* Grouped Bar Chart SVG */}
            <div className="relative w-full h-[220px]">
              <svg
                viewBox="0 0 340 200"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                {/* Horizontal reference gridlines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = 160 - (val / 100) * 135
                  return (
                    <line
                      key={val}
                      x1="25"
                      y1={y}
                      x2="330"
                      y2={y}
                      stroke="#F1F0F3"
                      strokeWidth="1"
                    />
                  )
                })}

                {/* Subject Groups */}
                {displayedGrades.map((item, idx) => {
                  const count = displayedGrades.length
                  const availableWidth = 300
                  const groupWidth = availableWidth / count
                  const groupX = 28 + idx * groupWidth
                  const barWidth = Math.min(13, groupWidth * 0.24)
                  const bench = courseBenchmarks[item.courseCode] || {
                    classAvg: 85,
                    top10: 97,
                    shortTitle: item.courseCode,
                  }

                  const myHeight = (item.totalScore / 100) * 135
                  const avgHeight = (bench.classAvg / 100) * 135
                  const topHeight = (bench.top10 / 100) * 135

                  return (
                    <g
                      key={item.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredBenchmark(item.id)}
                      onMouseLeave={() => setHoveredBenchmark(null)}
                    >
                      {/* Bar 1: My Score */}
                      <rect
                        x={groupX}
                        y={160 - myHeight}
                        width={barWidth}
                        height={myHeight}
                        rx="3"
                        fill="#905FEB"
                      />
                      <text
                        x={groupX + barWidth / 2}
                        y={160 - myHeight - 4}
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="700"
                        fill="#171526"
                      >
                        {Math.round(item.totalScore)}
                      </text>

                      {/* Bar 2: Class Average */}
                      <rect
                        x={groupX + barWidth + 2}
                        y={160 - avgHeight}
                        width={barWidth}
                        height={avgHeight}
                        rx="3"
                        fill="#C1A6F7"
                      />
                      <text
                        x={groupX + barWidth + 2 + barWidth / 2}
                        y={160 - avgHeight - 4}
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="600"
                        fill="#514B68"
                      >
                        {Math.round(bench.classAvg)}
                      </text>

                      {/* Bar 3: Top 10% */}
                      <rect
                        x={groupX + (barWidth + 2) * 2}
                        y={160 - topHeight}
                        width={barWidth}
                        height={topHeight}
                        rx="3"
                        fill="#AEEB00"
                      />
                      <text
                        x={groupX + (barWidth + 2) * 2 + barWidth / 2}
                        y={160 - topHeight - 4}
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="700"
                        fill="#253700"
                      >
                        {Math.round(bench.top10)}
                      </text>

                      {/* Group Subject Label */}
                      <text
                        x={groupX + (barWidth * 3 + 4) / 2}
                        y="178"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="700"
                        fill="#171526"
                      >
                        {bench.shortTitle}
                      </text>
                      <text
                        x={groupX + (barWidth * 3 + 4) / 2}
                        y="190"
                        textAnchor="middle"
                        fontSize="7.5"
                        fill="#89858E"
                      >
                        {item.courseCode}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {/* Hover Tooltip */}
              {hoveredBenchmark && (
                (() => {
                  const target = displayedGrades.find((g) => g.id === hoveredBenchmark)
                  if (!target) return null
                  const b = courseBenchmarks[target.courseCode]
                  return (
                    <div className="absolute top-0 right-0 bg-zinc-900 text-white text-[10px] p-2 rounded-xl shadow-lg pointer-events-none z-10 leading-snug">
                      <div className="font-bold border-b border-zinc-700 pb-1 mb-1">
                        {target.courseTitle}
                      </div>
                      <div>My Score: <span className="text-[#A780F1] font-bold">{target.totalScore}%</span></div>
                      <div>Class Average: <span className="text-zinc-300 font-bold">{b?.classAvg}%</span></div>
                      <div>Top 10% Benchmark: <span className="text-[#AEEB00] font-bold">{b?.top10}%</span></div>
                    </div>
                  )
                })()
              )}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-zinc-100 text-[10px] text-[#514B68]">
            * Class & Top 10% benchmark percentiles sourced from cohort academic baselines.
          </div>
        </section>

        {/* Card 2: Performance by Component */}
        <section
          className="panel p-5 sm:p-6 bg-white border border-zinc-200/80 shadow-[0_8px_28px_rgba(39,28,61,0.055)] rounded-3xl flex flex-col justify-between"
          aria-label="Performance by Component"
        >
          <div>
            <div className="flex flex-col gap-1 mb-3">
              <div className="flex items-center justify-between">
                <h3 className="card-title text-base font-bold text-zinc-900 tracking-tight">
                  Performance by Component
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E7FF9C] text-[#253700]">
                  Exam Breakdown
                </span>
              </div>
              <span className="text-xs text-[#514B68]">
                Midterm, Assignments & Final Exam scores per subject
              </span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[10.5px] font-semibold text-[#514B68] mb-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#6E36D5]" />
                Midterm
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#905FEB]" />
                Assignments
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#AEEB00]" />
                Final Exam
              </span>
            </div>

            {/* Component Bar Chart SVG */}
            <div className="relative w-full h-[220px]">
              <svg
                viewBox="0 0 340 200"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                {/* Horizontal gridlines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = 160 - (val / 100) * 135
                  return (
                    <line
                      key={val}
                      x1="25"
                      y1={y}
                      x2="330"
                      y2={y}
                      stroke="#F1F0F3"
                      strokeWidth="1"
                    />
                  )
                })}

                {/* Subject Component Groups */}
                {displayedGrades.map((item, idx) => {
                  const count = displayedGrades.length
                  const availableWidth = 300
                  const groupWidth = availableWidth / count
                  const groupX = 28 + idx * groupWidth
                  const barWidth = Math.min(13, groupWidth * 0.24)
                  const bench = courseBenchmarks[item.courseCode]

                  const midH = (item.midterm / 100) * 135
                  const assignH = (item.assignments / 100) * 135
                  const finalH = (item.finalExam / 100) * 135

                  return (
                    <g
                      key={item.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredComponent(item.id)}
                      onMouseLeave={() => setHoveredComponent(null)}
                    >
                      {/* Bar 1: Midterm */}
                      <rect
                        x={groupX}
                        y={160 - midH}
                        width={barWidth}
                        height={midH}
                        rx="3"
                        fill="#6E36D5"
                      />
                      <text
                        x={groupX + barWidth / 2}
                        y={160 - midH - 4}
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="700"
                        fill="#171526"
                      >
                        {item.midterm}
                      </text>

                      {/* Bar 2: Assignments */}
                      <rect
                        x={groupX + barWidth + 2}
                        y={160 - assignH}
                        width={barWidth}
                        height={assignH}
                        rx="3"
                        fill="#905FEB"
                      />
                      <text
                        x={groupX + barWidth + 2 + barWidth / 2}
                        y={160 - assignH - 4}
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="700"
                        fill="#5F2BC0"
                      >
                        {item.assignments}
                      </text>

                      {/* Bar 3: Final Exam */}
                      <rect
                        x={groupX + (barWidth + 2) * 2}
                        y={160 - finalH}
                        width={barWidth}
                        height={finalH}
                        rx="3"
                        fill="#AEEB00"
                      />
                      <text
                        x={groupX + (barWidth + 2) * 2 + barWidth / 2}
                        y={160 - finalH - 4}
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="700"
                        fill="#253700"
                      >
                        {item.finalExam}
                      </text>

                      {/* Subject Label */}
                      <text
                        x={groupX + (barWidth * 3 + 4) / 2}
                        y="178"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="700"
                        fill="#171526"
                      >
                        {bench?.shortTitle || item.courseCode}
                      </text>
                      <text
                        x={groupX + (barWidth * 3 + 4) / 2}
                        y="190"
                        textAnchor="middle"
                        fontSize="7.5"
                        fill="#89858E"
                      >
                        {item.courseCode}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {/* Hover Tooltip */}
              {hoveredComponent && (
                (() => {
                  const target = displayedGrades.find((g) => g.id === hoveredComponent)
                  if (!target) return null
                  return (
                    <div className="absolute top-0 right-0 bg-zinc-900 text-white text-[10px] p-2 rounded-xl shadow-lg pointer-events-none z-10 leading-snug">
                      <div className="font-bold border-b border-zinc-700 pb-1 mb-1">
                        {target.courseTitle}
                      </div>
                      <div>Midterm: <span className="text-[#C1A6F7] font-bold">{target.midterm}/100</span></div>
                      <div>Assignments: <span className="text-[#A780F1] font-bold">{target.assignments}/100</span></div>
                      <div>Final Exam: <span className="text-[#AEEB00] font-bold">{target.finalExam}/100</span></div>
                    </div>
                  )
                })()
              )}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-zinc-100 text-[10px] text-[#514B68]">
            * Actual component weights: Midterm 30%, Assignments 30%, Final Exam 40%.
          </div>
        </section>

        {/* Card 3: Overall Performance Analysis (Radar Chart) */}
        <section
          className="panel p-5 sm:p-6 bg-white border border-zinc-200/80 shadow-[0_8px_28px_rgba(39,28,61,0.055)] rounded-3xl flex flex-col justify-between"
          aria-label="Overall Performance Analysis"
        >
          <div>
            <div className="flex flex-col gap-1 mb-3">
              <div className="flex items-center justify-between">
                <h3 className="card-title text-base font-bold text-zinc-900 tracking-tight">
                  Overall Performance Analysis
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0EDFF] text-[#5F2BC0]">
                  Radar Telemetry
                </span>
              </div>
              <span className="text-xs text-[#514B68]">
                Multi-category evaluation against cohort average
              </span>
            </div>

            {/* Radar Chart SVG */}
            <div className="relative w-full h-[220px] flex items-center justify-center">
              <svg
                viewBox="0 0 280 230"
                className="w-full h-full overflow-visible"
              >
                {(() => {
                  const cx = 140
                  const cy = 112
                  const maxRadius = 78
                  const n = radarData.length

                  // Helper function to get coordinates
                  const getCoords = (index: number, value: number) => {
                    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / n
                    const r = (value / 100) * maxRadius
                    return {
                      x: cx + r * Math.cos(angle),
                      y: cy + r * Math.sin(angle),
                    }
                  }

                  // Rings for 25, 50, 75, 100
                  const rings = [25, 50, 75, 100]

                  // Polygon points string builder
                  const buildPoints = (type: "student" | "classAvg") =>
                    radarData
                      .map((d, i) => {
                        const val = type === "student" ? d.student : d.classAvg
                        const pt = getCoords(i, val)
                        return `${pt.x},${pt.y}`
                      })
                      .join(" ")

                  return (
                    <g>
                      {/* Concentric grid pentagons */}
                      {rings.map((ring) => {
                        const pts = radarData
                          .map((_, i) => {
                            const pt = getCoords(i, ring)
                            return `${pt.x},${pt.y}`
                          })
                          .join(" ")
                        return (
                          <g key={ring}>
                            <polygon
                              points={pts}
                              fill="none"
                              stroke="#E2DCEE"
                              strokeDasharray={ring === 100 ? "none" : "2 2"}
                              strokeWidth="1"
                            />
                            <text
                              x={cx + 3}
                              y={cy - (ring / 100) * maxRadius + 3}
                              fontSize="7"
                              fill="#B6AEC8"
                              fontWeight="600"
                            >
                              {ring}
                            </text>
                          </g>
                        )
                      })}

                      {/* Radial Axis Lines */}
                      {radarData.map((_, i) => {
                        const pt = getCoords(i, 100)
                        return (
                          <line
                            key={i}
                            x1={cx}
                            y1={cy}
                            x2={pt.x}
                            y2={pt.y}
                            stroke="#E2DCEE"
                            strokeWidth="1"
                          />
                        )
                      })}

                      {/* Class Average Polygon */}
                      <polygon
                        points={buildPoints("classAvg")}
                        fill="#E4DFFD"
                        fillOpacity="0.45"
                        stroke="#B6AEC8"
                        strokeWidth="1.8"
                      />

                      {/* Student Score Polygon */}
                      <polygon
                        points={buildPoints("student")}
                        fill="#905FEB"
                        fillOpacity="0.4"
                        stroke="#905FEB"
                        strokeWidth="2.4"
                      />

                      {/* Student Data Points */}
                      {radarData.map((d, i) => {
                        const pt = getCoords(i, d.student)
                        const isHovered = hoveredRadarCategory === d.category
                        return (
                          <circle
                            key={d.category}
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? "5" : "3.5"}
                            fill="#FFFFFF"
                            stroke="#905FEB"
                            strokeWidth="2"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredRadarCategory(d.category)}
                            onMouseLeave={() => setHoveredRadarCategory(null)}
                          />
                        )
                      })}

                      {/* Outer Labels */}
                      {radarData.map((d, i) => {
                        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
                        const labelRadius = maxRadius + 22
                        const lx = cx + labelRadius * Math.cos(angle)
                        const ly = cy + labelRadius * Math.sin(angle)

                        let textAnchor: "middle" | "start" | "end" = "middle"
                        if (Math.cos(angle) > 0.3) textAnchor = "start"
                        else if (Math.cos(angle) < -0.3) textAnchor = "end"

                        return (
                          <g
                            key={d.category}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredRadarCategory(d.category)}
                            onMouseLeave={() => setHoveredRadarCategory(null)}
                          >
                            <text
                              x={lx}
                              y={ly}
                              textAnchor={textAnchor}
                              fontSize="8.5"
                              fontWeight="700"
                              fill="#171526"
                            >
                              {d.category}
                            </text>
                            <text
                              x={lx}
                              y={ly + 9}
                              textAnchor={textAnchor}
                              fontSize="8"
                              fontWeight="700"
                              fill="#905FEB"
                            >
                              {d.student}%
                            </text>
                          </g>
                        )
                      })}
                    </g>
                  )
                })()}
              </svg>

              {/* Radar Hover Tooltip */}
              {hoveredRadarCategory && (
                (() => {
                  const target = radarData.find((r) => r.category === hoveredRadarCategory)
                  if (!target) return null
                  return (
                    <div className="absolute top-1 right-1 bg-zinc-900 text-white text-[10px] p-2 rounded-xl shadow-lg pointer-events-none z-10 leading-snug">
                      <div className="font-bold border-b border-zinc-700 pb-0.5 mb-1">
                        {target.category}
                      </div>
                      <div>Srimanth: <span className="text-[#AEEB00] font-bold">{target.student}%</span></div>
                      <div>Class Average: <span className="text-zinc-300 font-bold">{target.classAvg}%</span></div>
                    </div>
                  )
                })()
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10.5px]">
            <span className="flex items-center gap-1.5 font-semibold text-[#171526]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#905FEB]" />
              Srimanth (Student)
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-[#514B68]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B6AEC8]" />
              Cohort Baseline
            </span>
          </div>
        </section>
      </div>

      {/* 5. Official Certificate Modal */}
      {isCertModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsCertModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#F0E7FF] text-[#5F2BC0] flex items-center justify-center font-bold">
                  <Icon name="award" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Official Certificate
                  </h3>
                  <p className="text-xs text-[#514B68]">
                    Quantum School of AI · Verified Credential
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCertModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="my-4 p-6 border-2 border-dashed border-[#D8C2FF] rounded-2xl bg-[#F0EDFF]/40 text-center">
              <div className="text-xs uppercase tracking-widest font-bold text-[#905FEB] mb-2">
                Certificate of Completion & Distinction
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-1">
                Python for AI
              </h2>
              <p className="text-sm text-zinc-600 mb-4">
                This credential certifies that{" "}
                <strong className="text-black">Srimanth</strong> has
                successfully mastered Python for Data Analysis, NumPy, Pandas,
                and Neural Architectures with Distinction.
              </p>
              <div className="flex justify-center items-center gap-6 text-xs text-[#514B68]">
                <span>Issued: October 18, 2026</span>
                <span>•</span>
                <span>Credential ID: QAI-88392-PY</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-full border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                onClick={() => {
                  const certText =
                    "===========================================================\n" +
                    "       QUANTUM SCHOOL OF AI - CERTIFICATE OF DISTINCTION  \n" +
                    "===========================================================\n" +
                    "Recipient: Srimanth\n" +
                    "Course: Python for AI (PY-201)\n" +
                    "Grade: A+ (98.4%) · Dean's Honor List\n" +
                    "Credential ID: QAI-88392-PY\n" +
                    "Issue Date: October 18, 2026\n" +
                    "Blockchain Verification Hash: 0x98A1B2C3D4E5F67890ABCDEF\n" +
                    "Issuer: Quantum School of AI Academic Registry\n"
                  const blob = new Blob([certText], {
                    type: "text/plain;charset=utf-8;",
                  })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "Quantum_Certificate_Python_for_AI.txt"
                  a.click()
                  URL.revokeObjectURL(url)
                  setIsCertModalOpen(false)
                  onToast("Certificate downloaded successfully! 🎓")
                }}
              >
                Download PDF
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer"
                onClick={() => {
                  navigator.clipboard?.writeText?.(
                    "https://verify.quantumschool.ai/cert/QAI-88392-PY",
                  )
                  setIsCertModalOpen(false)
                  onToast("Credential verification link copied to clipboard! 🔗")
                }}
              >
                Share Credential
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GradesPage
