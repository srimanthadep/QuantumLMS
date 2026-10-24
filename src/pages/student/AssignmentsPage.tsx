import { useState, useMemo, useRef } from "react"
import { Icon } from "../../components/Icon"
import type { AssignmentData } from "./studentTypes"

interface AssignmentsPageProps {
  assignments: AssignmentData[]
  onSubmitAssignment: (id: string, repoUrl: string, comments: string) => void
  onToast: (msg: string) => void
}

export function AssignmentsPage({
  assignments,
  onSubmitAssignment,
  onToast,
}: AssignmentsPageProps) {
  const [filter, setFilter] =
    useState<"All" | "Pending" | "Submitted" | "Graded">("All")
  const [search, setSearch] = useState("")

  // Active Assignment for Dedicated Detail / Submission View
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null)
  const [isResubmitting, setIsResubmitting] = useState(false)

  // Submission Form State
  const [repoUrl, setRepoUrl] = useState("")
  const [comments, setComments] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const activeAssignment = useMemo(() => {
    if (!activeAssignmentId) return null
    return assignments.find((a) => a.id === activeAssignmentId) || null
  }, [assignments, activeAssignmentId])

  const filtered = useMemo(() => {
    let list = assignments
    if (filter !== "All") {
      list = assignments.filter((a) => a.status === filter)
    }
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) || a.course.toLowerCase().includes(q),
    )
  }, [assignments, filter, search])

  const handleOpenAssignment = (item: AssignmentData, forceSubmitMode = false) => {
    setActiveAssignmentId(item.id)
    setIsResubmitting(forceSubmitMode)
    setRepoUrl(item.repoUrl || "")
    setComments(item.comments || "")
    setUploadedFileName(item.uploadedFileName || null)
    setSelectedFile(null)
    setSubmissionError(null)
  }

  const handleBackToList = () => {
    setActiveAssignmentId(null)
    setIsResubmitting(false)
    setSubmissionError(null)
    setSelectedFile(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedExts = [".pdf", ".zip", ".tar.gz", ".ipynb", ".py", ".docx"]
      const ext = "." + file.name.split(".").pop()?.toLowerCase()
      if (!allowedExts.includes(ext)) {
        setSubmissionError(
          `Invalid file format (${ext}). Supported formats: ${allowedExts.join(", ")}`
        )
        return
      }
      setSelectedFile(file)
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
      setUploadedFileName(`${file.name} (${sizeMb} MB)`)
      setSubmissionError(null)
      onToast(`Attached ${file.name} (${sizeMb} MB)`)
    }
  }

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAssignment) return

    if (!uploadedFileName && !repoUrl.trim()) {
      setSubmissionError("Please provide either an uploaded solution archive or a GitHub repository URL.")
      onToast("Please provide a solution file or repository link.")
      return
    }

    if (
      repoUrl.trim() &&
      !repoUrl.trim().startsWith("http://") &&
      !repoUrl.trim().startsWith("https://")
    ) {
      setSubmissionError("Please enter a valid URL starting with https:// or http://")
      onToast("Invalid repository URL format.")
      return
    }

    setSubmissionError(null)
    onSubmitAssignment(activeAssignment.id, repoUrl.trim(), comments.trim())
    onToast(`Submitted "${activeAssignment.title}" successfully! 🚀`)
    setIsResubmitting(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ==================================================================== */}
      {/* 1. DEDICATED IN-PAGE ASSIGNMENT DETAIL & SUBMISSION VIEW             */}
      {/* ==================================================================== */}
      {activeAssignment ? (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Top Bar: Back Button & Breadcrumbs */}
          <div className="panel p-4 bg-white border border-zinc-100 shadow-sm rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleBackToList}
                className="px-4 py-1.5 rounded-full bg-zinc-100 hover:bg-[#F0EDFF] text-zinc-700 hover:text-[#5F2BC0] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <span>←</span>
                <span>Back to Assignments List</span>
              </button>
              <span className="text-zinc-300">/</span>
              <span className="text-xs font-semibold text-zinc-500 truncate max-w-[260px]">
                {activeAssignment.course}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  activeAssignment.status === "Graded"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : activeAssignment.status === "Submitted"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {activeAssignment.status === "Graded" ? "✓ Graded" : activeAssignment.status}
              </span>
              <button
                type="button"
                onClick={handleBackToList}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
                title="Close detail view"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          </div>

          {/* Assignment Hero Details Banner */}
          <section className="panel p-6 bg-white border border-zinc-100 shadow-sm rounded-3xl">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {activeAssignment.course}
                  </span>
                  {activeAssignment.priority === "High" && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                      ⚡ High Priority Milestone
                    </span>
                  )}
                  <span className="text-xs text-zinc-500 font-medium">
                    Due: <strong className="text-zinc-800">{activeAssignment.dueDate}</strong>
                  </span>
                </div>

                <h2 className="text-xl font-black text-zinc-900 leading-snug">
                  {activeAssignment.title}
                </h2>

                <p className="text-xs text-zinc-600 mt-2 leading-relaxed max-w-3xl">
                  {activeAssignment.description}
                </p>
              </div>

              {/* Score / Points Card */}
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200/80 min-w-[180px] text-center self-stretch lg:self-start">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Evaluation Weight
                </span>
                <div className="text-2xl font-black text-purple-800 mt-1">
                  {activeAssignment.maxMarks} Points
                </div>
                {activeAssignment.status === "Graded" && activeAssignment.score !== undefined && (
                  <span className="mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    Awarded: {activeAssignment.score} ({activeAssignment.grade})
                  </span>
                )}
              </div>
            </div>

            {/* Rubric Criteria Guidelines */}
            <div className="mt-5 pt-4 border-t border-zinc-100">
              <h4 className="font-bold text-xs text-zinc-900 uppercase tracking-wider mb-2">
                Evaluation Rubric Breakdown
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 text-xs">
                  <strong className="text-purple-900 block font-bold mb-1">
                    1. Vector Accuracy (30 pts)
                  </strong>
                  <p className="text-[11px] text-zinc-600">
                    Reciprocal rank merges match theoretical formula with zero index skew.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 text-xs">
                  <strong className="text-purple-900 block font-bold mb-1">
                    2. Pipeline Latency (40 pts)
                  </strong>
                  <p className="text-[11px] text-zinc-600">
                    Benchmark throughput passes 50 QPS at &lt;15ms latency budget.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 text-xs">
                  <strong className="text-purple-900 block font-bold mb-1">
                    3. Report & Tests (30 pts)
                  </strong>
                  <p className="text-[11px] text-zinc-600">
                    Full ablation write-up with pytest test coverage exceeding 85%.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Graded Feedback Card (if Graded) */}
          {activeAssignment.status === "Graded" && (
            <section className="panel p-6 bg-white border border-emerald-100 shadow-sm rounded-3xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🏆</span>
                <h3 className="card-title text-emerald-900">
                  Faculty Grading & Verified Feedback
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-emerald-800 font-semibold block">
                      Final Score Awarded:
                    </span>
                    <div className="text-3xl font-black text-emerald-700 mt-1">
                      {activeAssignment.score} / {activeAssignment.maxMarks}
                    </div>
                  </div>
                  <span className="px-4 py-1.5 rounded-full text-base font-black bg-emerald-600 text-white shadow-xs">
                    Grade {activeAssignment.grade}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-zinc-400 font-semibold block">
                      Submitted File Archive:
                    </span>
                    <strong className="text-xs font-mono text-zinc-800 mt-1 block">
                      📄 {activeAssignment.uploadedFileName || "solution_submission.zip"}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToast(`Downloading ${activeAssignment.uploadedFileName || "submission"}...`)}
                    className="mt-2 text-xs font-bold text-purple-700 hover:text-purple-900 text-left cursor-pointer"
                  >
                    📥 Download Graded Submission Archive
                  </button>
                </div>
              </div>

              {activeAssignment.feedback && (
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200">
                  <div className="font-bold text-xs text-purple-900 mb-1 flex items-center gap-1.5">
                    <span>👨‍🏫 Faculty Assessment Notes (Srimanth):</span>
                  </div>
                  <p className="text-xs text-zinc-700 leading-relaxed italic">
                    "{activeAssignment.feedback}"
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Submitted Review Card (if Submitted and not in re-submission) */}
          {activeAssignment.status === "Submitted" && !isResubmitting && (
            <section className="panel p-6 bg-white border border-blue-100 shadow-sm rounded-3xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    ● Submission Received
                  </span>
                  <h3 className="card-title text-zinc-900 mt-1">
                    Your Submission is In Review
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Recorded on {activeAssignment.submissionDate || "Oct 20, 2026"}. Faculty grading is in progress.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsResubmitting(true)}
                  className="px-4 py-2 rounded-full border border-purple-300 text-purple-700 hover:bg-purple-50 text-xs font-bold cursor-pointer transition-colors"
                >
                  ↻ Resubmit Updated Work
                </button>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600">📁</span>
                    <div>
                      <strong className="text-zinc-900 block font-mono text-[11px]">
                        {activeAssignment.uploadedFileName || "rag_pipeline_solution_v1.zip (4.8 MB)"}
                      </strong>
                      <span className="text-[10px] text-zinc-400">Attached solution file</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToast("Downloading your submitted archive...")}
                    className="px-3 py-1 rounded-full bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Download File
                  </button>
                </div>

                {activeAssignment.repoUrl && (
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <strong className="text-zinc-500 text-[11px] block">Repository:</strong>
                    <a
                      href={activeAssignment.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-700 font-mono font-bold hover:underline text-xs"
                    >
                      {activeAssignment.repoUrl} ↗
                    </a>
                  </div>
                )}

                {activeAssignment.comments && (
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <strong className="text-zinc-500 text-[11px] block">Implementation Remarks:</strong>
                    <p className="text-zinc-700 mt-0.5 leading-relaxed">
                      {activeAssignment.comments}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Submission / Resubmission Interface (if Pending or Resubmitting) */}
          {(activeAssignment.status === "Pending" || isResubmitting) && (
            <section className="panel p-6 bg-white border border-zinc-100 shadow-sm rounded-3xl">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="card-title text-zinc-900">
                    {isResubmitting ? "Resubmit Assignment" : "Submit Your Solution"}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Upload your implementation package, code repository link, and notes for faculty grading.
                  </p>
                </div>

                {isResubmitting && (
                  <button
                    type="button"
                    onClick={() => setIsResubmitting(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-800 font-bold cursor-pointer"
                  >
                    Cancel Resubmission
                  </button>
                )}
              </div>

              <form onSubmit={handleConfirmSubmit} className="flex flex-col gap-4 text-xs">
                {/* File Upload Box */}
                <div>
                  <label className="font-bold text-zinc-700 block mb-1.5">
                    Upload Solution Archive (.zip, .ipynb, .pdf, .py, .docx)
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.zip,.tar.gz,.ipynb,.py,.docx"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-300 hover:border-purple-500 rounded-2xl p-6 text-center cursor-pointer bg-zinc-50 hover:bg-purple-50/20 transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      📁
                    </div>
                    <div>
                      <span className="font-bold text-zinc-800 block text-xs">
                        Click to browse or drag and drop your assignment files
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        Supported: ZIP, Jupyter Notebook (.ipynb), PDF, Python (.py) • Max 50 MB
                      </span>
                    </div>

                    {uploadedFileName && (
                      <div className="mt-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-2">
                        <span>✓ Selected: {uploadedFileName}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setUploadedFileName(null)
                            setSelectedFile(null)
                          }}
                          className="text-xs text-rose-600 hover:text-rose-800 ml-1 cursor-pointer"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Repository URL Input */}
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    GitHub / GitLab Repository URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/your-username/ai-project-repo"
                    className="w-full p-3 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600 text-xs"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Public repo or invitation sent to faculty mentor Srimanth.
                  </span>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">
                    Implementation Notes / Architecture Remarks
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Include key design decisions, benchmark test scores, setup commands, or notes on experimental observations..."
                    rows={4}
                    className="w-full p-3 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600 text-xs"
                  />
                </div>

                {submissionError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{submissionError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="px-5 py-2.5 rounded-full border border-zinc-200 font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-purple-700 text-white font-bold hover:bg-purple-800 cursor-pointer shadow-sm text-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>🚀</span>
                    <span>{isResubmitting ? "Submit Updated Solution" : "Submit Assignment"}</span>
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Bottom Back Button */}
          <div className="flex justify-start">
            <button
              type="button"
              onClick={handleBackToList}
              className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-white bg-white/70 transition-colors cursor-pointer"
            >
              ← Back to All Assignments
            </button>
          </div>
        </div>
      ) : (
        /* ==================================================================== */
        /* 2. ASSIGNMENTS LIST VIEW                                             */
        /* ==================================================================== */
        <div className="flex flex-col gap-5">
          {/* Header Panel with Controls */}
          <section className="panel" aria-label="Assignments Header">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="card-title">Assignments & Project Submissions</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    2 Due this week
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Submit GitHub lab solutions, write-ups, and review instructor
                  feedback rubrics.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="filter-pills">
                  {(["All", "Pending", "Submitted", "Graded"] as const).map(
                    (tab) => {
                      const count =
                        tab === "All"
                          ? assignments.length
                          : assignments.filter((a) => a.status === tab).length
                      return (
                        <button
                          key={tab}
                          className={`filter-pill ${
                            filter === tab ? "active" : ""
                          }`}
                          onClick={() => setFilter(tab)}
                        >
                          {tab} ({count})
                        </button>
                      )
                    },
                  )}
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Icon name="search" size={14} />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search assignments by title or course..."
                  className="w-full pl-9 pr-8 py-1.5 rounded-full text-xs bg-zinc-50 border border-zinc-200 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-zinc-400 hover:text-zinc-700"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="text-xs text-zinc-500 font-medium">
                Showing {filtered.length} assignments
              </div>
            </div>
          </section>

          {/* Assignments List */}
          <div className="flex flex-col gap-3">
            {filtered.map((item) => {
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenAssignment(item)}
                  className="panel p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow border border-zinc-100 cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        item.status === "Graded"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "Submitted"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      <Icon name="document" size={20} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                          {item.course}
                        </span>
                        {item.priority === "High" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                            ⚡ High Priority
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-zinc-900 leading-snug group-hover:text-purple-700 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1 max-w-2xl">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-2 font-medium">
                        <span>
                          Due:{" "}
                          <strong className="text-zinc-700">{item.dueDate}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Max Points:{" "}
                          <strong className="text-zinc-700">{item.maxMarks}</strong>
                        </span>
                        {item.submissionDate && (
                          <>
                            <span>•</span>
                            <span>Submitted: {item.submissionDate}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center gap-3 self-end md:self-center">
                    {item.status === "Graded" && (
                      <div className="text-right mr-2">
                        <span className="text-xs font-black text-emerald-700 block">
                          {item.score} / {item.maxMarks} ({item.grade})
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          Feedback Available
                        </span>
                      </div>
                    )}

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        item.status === "Graded"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : item.status === "Submitted"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {item.status === "Graded" ? "✓ Graded" : item.status}
                    </span>

                    {item.status === "Pending" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenAssignment(item, true)
                        }}
                        className="px-4 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-all cursor-pointer shadow-sm whitespace-nowrap"
                      >
                        Submit Work
                      </button>
                    ) : item.status === "Graded" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenAssignment(item)
                        }}
                        className="px-3.5 py-1.5 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-all cursor-pointer whitespace-nowrap"
                      >
                        View Rubric
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenAssignment(item)
                        }}
                        className="px-3.5 py-1.5 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-all cursor-pointer whitespace-nowrap"
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
