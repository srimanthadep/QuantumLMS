import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  FileText,
  User,
  ArrowRight,
  ExternalLink,
  Edit3,
  Eye,
  CheckCircle2,
  Clock,
  RotateCcw,
  LayoutGrid,
  List,
  Sparkles,
  SlidersHorizontal,
  X,
  Code,
  Check,
  ChevronRight,
  BookOpen,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Input,
  SegmentedControl,
  Avatar,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import { StatusBadge, TypeBadge } from "./components/StatusBadge"
import type { EvaluatorState } from "./data/evaluatorStorage"
import type { StudentSubmission, EvaluationStatus, AssessmentType } from "./types"

interface SubmissionsProps {
  state: EvaluatorState
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenWorkspace: (submission: StudentSubmission) => void
  initialAssessmentFilter?: string
  initialQueueTab?: "all" | "assigned" | "reassessment" | "published"
}

export function Submissions({
  state,
  searchQuery,
  setSearchQuery,
  onOpenWorkspace,
  initialAssessmentFilter,
  initialQueueTab = "all",
}: SubmissionsProps) {
  const [queueTab, setQueueTab] = useState<"all" | "assigned" | "reassessment" | "published">(initialQueueTab)
  const [selectedCourse, setSelectedCourse] = useState<string>("All")
  const [selectedType, setSelectedType] = useState<string>("All")
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "student_name" | "marks">("date_desc")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  // Quick Preview Modal state
  const [previewSubmission, setPreviewSubmission] = useState<StudentSubmission | null>(null)

  // Queue counts
  const queueCounts = useMemo(() => {
    return {
      all: state.submissions.length,
      assigned: state.submissions.filter((s) => s.status === "In Progress" || s.status === "Submitted" || s.status === "Draft Saved").length,
      reassessment: state.submissions.filter((s) => s.status.includes("Reassessment")).length,
      published: state.submissions.filter((s) => s.status === "Evaluated").length,
    }
  }, [state.submissions])

  // Distinct courses
  const courses = useMemo(() => {
    return Array.from(new Set(state.assessments.map((a) => a.course)))
  }, [state.assessments])

  // Distinct assessment types
  const types = useMemo(() => {
    return Array.from(new Set(state.submissions.map((s) => s.assessmentType)))
  }, [state.submissions])

  // Filtered & Sorted Submissions
  const filteredSubmissions = useMemo(() => {
    let list = state.submissions.filter((sub) => {
      // 0. Queue Tab Filter
      if (queueTab === "assigned") {
        if (sub.status !== "In Progress" && sub.status !== "Submitted" && sub.status !== "Draft Saved") return false
      } else if (queueTab === "reassessment") {
        if (!sub.status.includes("Reassessment")) return false
      } else if (queueTab === "published") {
        if (sub.status !== "Evaluated") return false
      }

      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const mStudent = sub.studentName.toLowerCase().includes(q)
        const mRoll = sub.studentRoll.toLowerCase().includes(q)
        const mTitle = sub.assessmentTitle.toLowerCase().includes(q)
        const mCourse = sub.course.toLowerCase().includes(q)
        if (!mStudent && !mRoll && !mTitle && !mCourse) return false
      }

      // 2. Course filter
      if (selectedCourse !== "All" && sub.course !== selectedCourse) {
        return false
      }

      // 3. Type filter
      if (selectedType !== "All" && sub.assessmentType !== selectedType) {
        return false
      }

      return true
    })

    // Sort
    return list.sort((a, b) => {
      if (sortBy === "date_desc") {
        return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
      }
      if (sortBy === "date_asc") {
        return new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime()
      }
      if (sortBy === "student_name") {
        return a.studentName.localeCompare(b.studentName)
      }
      if (sortBy === "marks") {
        return (b.finalMarks ?? 0) - (a.finalMarks ?? 0)
      }
      return 0
    })
  }, [state.submissions, queueTab, searchQuery, selectedCourse, selectedType, sortBy])

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCourse("All")
    setSelectedType("All")
    setQueueTab("all")
  }

  return (
    <div className="space-y-6">
      {/* 1. Header with Queue Segmented Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {queueTab === "reassessment"
              ? "Re-evaluations & Appeals Queue"
              : "Unified Grading Queue"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {queueTab === "reassessment"
              ? "Review student regrading appeals with original submissions and requested rubrics"
              : "Evaluate cohort submissions, review drafts, and publish official scores"}
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <SegmentedControl
            aria-label="Queue tab filter"
            size="sm"
            options={[
              { value: "all", label: `All (${queueCounts.all})` },
              { value: "assigned", label: `Needs Grading (${queueCounts.assigned})` },
              { value: "reassessment", label: `Appeals (${queueCounts.reassessment})` },
              { value: "published", label: `Graded (${queueCounts.published})` },
            ]}
            value={queueTab}
            onChange={(v) => setQueueTab(v as any)}
          />

          <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "grid" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "table" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View"
              aria-label="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Search & Filters Bar */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student, roll number, or assessment..."
                className="pl-9 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Course filter */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Course:</span>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="All">All Courses</option>
                  {courses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assessment Type filter */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Type:</span>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="All">All Types</option>
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort by */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="student_name">Student Name (A-Z)</option>
                  <option value="marks">Highest Marks</option>
                </select>
              </div>

              {(searchQuery || selectedCourse !== "All" || selectedType !== "All") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs text-danger hover:text-danger/80 cursor-pointer h-8 px-2"
                >
                  <X className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Submissions Display */}
      {filteredSubmissions.length === 0 ? (
        <Card className="border-border/80 p-12 text-center shadow-xs">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-foreground">No Submissions Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            We couldn't find any submissions matching your search criteria or active filters.
          </p>
          <Button variant="secondary" size="sm" onClick={clearFilters} className="mt-4 cursor-pointer">
            Clear All Filters
          </Button>
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {filteredSubmissions.map((sub) => {
              const isReassessment = sub.status.includes("Reassessment")
              const isEvaluated = sub.status === "Evaluated"
              const isDraft = sub.status === "Draft Saved"

              return (
                <motion.div
                  key={sub.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`group flex flex-col justify-between rounded-2xl border p-5 transition-all shadow-xs ${
                    isReassessment
                      ? "border-danger/40 bg-gradient-to-b from-danger-soft/20 to-surface hover:border-danger hover:shadow-md"
                      : isDraft
                      ? "border-primary-border bg-gradient-to-b from-primary-soft/20 to-surface hover:border-primary hover:shadow-md"
                      : isEvaluated
                      ? "border-border/60 bg-surface/80 hover:border-border hover:shadow-md"
                      : "border-border/80 bg-surface hover:border-border hover:shadow-md"
                  }`}
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <TypeBadge type={sub.assessmentType} />
                      <StatusBadge status={sub.status} />
                    </div>

                    {/* Assessment Title */}
                    <h3 className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {sub.assessmentTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {sub.course}
                    </p>

                    {/* Student Info Card */}
                    <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-surface-2/60 border border-border/40">
                      <Avatar
                        src={sub.studentAvatar}
                        name={sub.studentName}
                        size="md"
                        className="ring-1 ring-border"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {sub.studentName}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          Roll: {sub.studentRoll}
                        </p>
                      </div>

                      {/* Marks Awarded Badge if evaluated or draft */}
                      {sub.finalMarks !== undefined && (
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-foreground">
                            {sub.finalMarks}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            / {sub.maxMarks} pts
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Reassessment appeal note banner if present */}
                    {sub.reassessmentRequest && (
                      <div className="mt-3 p-2.5 rounded-lg bg-danger-soft/30 border border-danger/30 text-[11px] text-danger leading-relaxed">
                        <div className="flex items-center gap-1 font-bold mb-0.5">
                          <RotateCcw className="h-3 w-3" />
                          <span>Student Appeal Request</span>
                        </div>
                        <p className="line-clamp-2 text-foreground/80">
                          "{sub.reassessmentRequest.reason}"
                        </p>
                      </div>
                    )}

                    {/* Files attached & metadata */}
                    <div className="flex flex-wrap items-center gap-2 mt-3.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {sub.files?.length || 0} file(s)
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {sub.submissionDate}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewSubmission(sub)}
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Quick Preview"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      <span>Peek</span>
                    </Button>

                    <Button
                      variant={isReassessment ? "danger" : isEvaluated ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => onOpenWorkspace(sub)}
                      className="text-xs font-semibold cursor-pointer shadow-xs group-hover:scale-102 transition-transform"
                    >
                      <span>
                        {isReassessment
                          ? "Review Appeal"
                          : isDraft
                          ? "Continue Draft"
                          : isEvaluated
                          ? "View Evaluation"
                          : "Grade Submission"}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="border-border/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-bold">Student</th>
                  <th className="px-4 py-3 font-bold">Assessment</th>
                  <th className="px-4 py-3 font-bold">Course</th>
                  <th className="px-4 py-3 font-bold">Submitted Date</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Score</th>
                  <th className="px-4 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={sub.studentAvatar}
                          name={sub.studentName}
                          size="sm"
                        />
                        <div>
                          <p className="font-bold text-foreground">{sub.studentName}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {sub.studentRoll}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-foreground line-clamp-1">
                        {sub.assessmentTitle}
                      </p>
                      <TypeBadge type={sub.assessmentType} />
                    </td>

                    <td className="px-4 py-3.5 text-muted-foreground">
                      <span className="line-clamp-1">{sub.course}</span>
                    </td>

                    <td className="px-4 py-3.5 text-muted-foreground font-mono text-[11px]">
                      {sub.submissionDate}
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge status={sub.status} />
                    </td>

                    <td className="px-4 py-3.5 font-bold">
                      {sub.finalMarks !== undefined ? (
                        <span className="text-foreground">
                          {sub.finalMarks} / {sub.maxMarks}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-normal">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewSubmission(sub)}
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenWorkspace(sub)}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        <span>Evaluate</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. Quick Preview Dialog */}
      <Dialog open={!!previewSubmission} onOpenChange={(open) => !open && setPreviewSubmission(null)}>
        {previewSubmission && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <TypeBadge type={previewSubmission.assessmentType} />
                <StatusBadge status={previewSubmission.status} />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {previewSubmission.assessmentTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Submitted by {previewSubmission.studentName} ({previewSubmission.studentRoll}) · {previewSubmission.course}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Files list */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                  Attached Files ({previewSubmission.files?.length || 0})
                </span>
                <div className="space-y-2">
                  {previewSubmission.files?.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2/60 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Code className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground">{file.size} · {file.type.toUpperCase()}</p>
                        </div>
                      </div>

                      <span className="text-[10px] text-muted-foreground font-mono">
                        Ready for grading
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Appeal if present */}
              {previewSubmission.reassessmentRequest && (
                <div className="p-3 rounded-xl bg-danger-soft/30 border border-danger/30 text-xs text-foreground space-y-1">
                  <span className="font-bold text-danger block">
                    Student Reassessment Reason:
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    "{previewSubmission.reassessmentRequest.reason}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewSubmission(null)}
                className="cursor-pointer"
              >
                Close Peek
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const s = previewSubmission
                  setPreviewSubmission(null)
                  onOpenWorkspace(s)
                }}
                className="cursor-pointer font-bold"
              >
                <span>Launch Evaluation Studio</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

export default Submissions
