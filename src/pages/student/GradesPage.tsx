import { useState } from "react"
import { Icon } from "../../components/Icon"
import { MetricCard } from "../../components/MetricCard"
import { studentGrades } from "./studentMockData"

interface GradesPageProps {
  onToast: (msg: string) => void
}

export function GradesPage({ onToast }: GradesPageProps) {
  const [selectedSemester, setSelectedSemester] =
    useState<"All Semesters" | "Fall 2026" | "Spring 2026">("Fall 2026")
  const [isCertModalOpen, setIsCertModalOpen] = useState(false)

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
      studentGrades.map(g => `${g.courseCode} | ${g.courseTitle} | Credits: ${g.credits} | Grade: ${g.letterGrade} (${g.totalScore}%) | Status: ${g.status}`).join("\n") +
      "\n-----------------------------------------------------------\n" +
      `Date Generated: ${new Date().toLocaleDateString()}\n` +
      "Verification Key: 0x8F9B2C3D4E5A6B7C\n"
    const blob = new Blob([transcriptText], { type: "text/plain;charset=utf-8;" })
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
      {/* Top Banner with Action */}
      <section className="panel" aria-label="Grades Header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title">Grades, GPA & Academic Transcript</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                Dean's Honor List
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Official semester transcripts, course credit audits, and
              cumulative grade point performance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCertModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="award" size={13} />
              <span>Verified Certificate</span>
            </button>
            <button
              onClick={handleDownloadTranscript}
              className="px-4 py-1.5 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Icon name="document" size={13} />
              <span>Download Transcript</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4 Metric Cards */}
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
            value: "94.2%",
            trend: "Distinction standing",
            tone: "pink",
            icon: "check",
          }}
        />
      </section>

      {/* Gradebook Table */}
      <section className="panel" aria-label="Gradebook">
        <div className="card-header mb-4">
          <div>
            <h3 className="card-title">Gradebook & Examination Performance</h3>
            <span className="text-xs text-zinc-500">
              Official course grade weights and grading rubrics
            </span>
          </div>

          <div className="filter-pills">
            {(["Fall 2026", "Spring 2026", "All Semesters"] as const).map(
              (sem) => (
                <button
                  key={sem}
                  className={`filter-pill ${
                    selectedSemester === sem ? "active" : ""
                  }`}
                  onClick={() => setSelectedSemester(sem)}
                >
                  {sem}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-2">Course Code & Title</th>
                <th className="pb-3 text-center">Credits</th>
                <th className="pb-3 text-center">Midterm (100)</th>
                <th className="pb-3 text-center">Assignments (100)</th>
                <th className="pb-3 text-center">Final Exam (100)</th>
                <th className="pb-3 text-center">Overall Score</th>
                <th className="pb-3 text-center">Grade</th>
                <th className="pb-3 text-right pr-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {studentGrades.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-zinc-50/70 transition-colors"
                >
                  <td className="py-3.5 pl-2">
                    <div className="font-bold text-zinc-900">
                      {item.courseTitle}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {item.courseCode}
                    </div>
                  </td>
                  <td className="py-3.5 text-center font-bold text-zinc-700">
                    {item.credits}.0
                  </td>
                  <td className="py-3.5 text-center text-zinc-700">
                    {item.midterm}
                  </td>
                  <td className="py-3.5 text-center text-zinc-700">
                    {item.assignments}
                  </td>
                  <td className="py-3.5 text-center text-zinc-700">
                    {item.finalExam}
                  </td>
                  <td className="py-3.5 text-center font-black text-purple-700">
                    {item.totalScore}%
                  </td>
                  <td className="py-3.5 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800">
                      {item.letterGrade}
                    </span>
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.status === "Passed with Honors"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-purple-50 text-purple-700 border border-purple-200"
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
      </section>

      {/* Performance Analytics & Comparison */}
      <section className="panel" aria-label="Performance Comparison">
        <div className="card-header mb-4">
          <h3 className="card-title">Subject Score vs Class Benchmark</h3>
          <span className="text-xs text-zinc-500">
            Comparing Srimanth (Purple) vs Maple Class Average (Zinc)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              subject: "Generative AI Masterclass",
              student: 95.5,
              classAvg: 86.2,
            },
            { subject: "Python for AI", student: 93.6, classAvg: 84.1 },
            {
              subject: "Machine Learning Foundations",
              student: 90.0,
              classAvg: 81.5,
            },
            { subject: "AI Agents Bootcamp", student: 98.0, classAvg: 87.8 },
          ].map((bar) => (
            <div
              key={bar.subject}
              className="p-3 bg-zinc-50 rounded-xl border border-zinc-100"
            >
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-zinc-800">{bar.subject}</span>
                <span className="text-purple-700">
                  {bar.student}%{" "}
                  <span className="text-zinc-400 font-normal">
                    (Avg: {bar.classAvg}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden flex">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${bar.student}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Official Certificate Modal */}
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
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Icon name="award" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Official Certificate
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Quantum School of AI · Verified Credential
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCertModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="my-4 p-6 border-2 border-dashed border-purple-200 rounded-2xl bg-purple-50/40 text-center">
              <div className="text-xs uppercase tracking-widest font-bold text-purple-600 mb-2">
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
              <div className="flex justify-center items-center gap-6 text-xs text-zinc-500">
                <span>Issued: October 18, 2026</span>
                <span>•</span>
                <span>Credential ID: QAI-88392-PY</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
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
                  const blob = new Blob([certText], { type: "text/plain;charset=utf-8;" })
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
                className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer"
                onClick={() => {
                  navigator.clipboard?.writeText?.("https://verify.quantumschool.ai/cert/QAI-88392-PY")
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
