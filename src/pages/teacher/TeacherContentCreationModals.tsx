import { useState, useEffect, useRef } from "react"
import { Icon } from "../../components/Icon"
import type { CourseItem } from "../../types"
import type {
  ContentSubmissionRecord,
  QuizQuestionItem,
  CreateAssignmentInput,
  CreateQuizInput,
  UploadMaterialInput,
} from "./teacherContentWorkflowTypes"
import {
  saveAssignmentSubmission,
  saveQuizSubmission,
  saveMaterialSubmission,
} from "./teacherContentWorkflowStorage"

/* --------------------------------------------------------------------------
   1. CREATE / EDIT ASSIGNMENT MODAL
-------------------------------------------------------------------------- */
export function CreateAssignmentModal({
  isOpen,
  onClose,
  courses,
  initialCourseId,
  initialModuleId,
  initialLessonId,
  editingSubmission,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  courses: CourseItem[]
  initialCourseId?: string
  initialModuleId?: string
  initialLessonId?: string
  editingSubmission?: ContentSubmissionRecord | null
  onSuccess: (item: ContentSubmissionRecord, submitted: boolean) => void
}) {
  const [courseId, setCourseId] = useState(
    editingSubmission?.courseId || initialCourseId || courses[0]?.id || ""
  )
  const [moduleId, setModuleId] = useState(
    editingSubmission?.moduleId || initialModuleId || ""
  )
  const [lessonId, setLessonId] = useState(
    editingSubmission?.lessonId || initialLessonId || ""
  )
  const [title, setTitle] = useState(editingSubmission?.title || "")
  const [description, setDescription] = useState(
    editingSubmission?.assignmentData?.description || ""
  )
  const [instructions, setInstructions] = useState(
    editingSubmission?.assignmentData?.instructions || ""
  )
  const [maxMarks, setMaxMarks] = useState<number>(
    editingSubmission?.assignmentData?.maxMarks || 100
  )
  const [dueDate, setDueDate] = useState(
    editingSubmission?.assignmentData?.dueDate || ""
  )
  const [dueTime, setDueTime] = useState(
    editingSubmission?.assignmentData?.dueTime || "23:59"
  )
  const [attachment, setAttachment] = useState<{
    name: string
    size: string
    type: string
  } | null>(
    editingSubmission?.assignmentData?.attachmentName
      ? {
        name: editingSubmission.assignmentData.attachmentName,
        size: editingSubmission.assignmentData.attachmentSize || "1.2 MB",
        type: editingSubmission.assignmentData.attachmentType || "application/pdf",
      }
      : null
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Current course modules & lessons
  const selectedCourse = courses.find((c) => c.id === courseId)
  const availableModules = selectedCourse?.modules || []
  const selectedModule = availableModules.find((m) => m.id === moduleId)
  const availableLessons = selectedModule?.lessons || []

  // Sync state on open / editing change
  useEffect(() => {
    if (editingSubmission) {
      setCourseId(editingSubmission.courseId)
      setModuleId(editingSubmission.moduleId || "")
      setLessonId(editingSubmission.lessonId || "")
      setTitle(editingSubmission.title)
      setDescription(editingSubmission.assignmentData?.description || "")
      setInstructions(editingSubmission.assignmentData?.instructions || "")
      setMaxMarks(editingSubmission.assignmentData?.maxMarks || 100)
      setDueDate(editingSubmission.assignmentData?.dueDate || "")
      setDueTime(editingSubmission.assignmentData?.dueTime || "23:59")
      if (editingSubmission.assignmentData?.attachmentName) {
        setAttachment({
          name: editingSubmission.assignmentData.attachmentName,
          size: editingSubmission.assignmentData.attachmentSize || "1.5 MB",
          type: editingSubmission.assignmentData.attachmentType || "application/pdf",
        })
      } else {
        setAttachment(null)
      }
    } else {
      setCourseId(initialCourseId || courses[0]?.id || "")
      setModuleId(initialModuleId || "")
      setLessonId(initialLessonId || "")
      setTitle("")
      setDescription("")
      setInstructions("")
      setMaxMarks(100)
      // Default due date: 7 days in future
      const d = new Date()
      d.setDate(d.getDate() + 7)
      setDueDate(d.toISOString().split("T")[0])
      setDueTime("23:59")
      setAttachment(null)
    }
    setErrors({})
    setIsSubmitting(false)
  }, [editingSubmission, isOpen, initialCourseId, initialModuleId, initialLessonId, courses])

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
      const sizeStr = Number(sizeMb) < 0.1 ? `${Math.round(file.size / 1024)} KB` : `${sizeMb} MB`
      setAttachment({
        name: file.name,
        size: sizeStr,
        type: file.type || "application/octet-stream",
      })
    }
  }

  const validate = (submitForApproval: boolean): boolean => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = "Assignment title is required"
    if (!courseId) newErrors.courseId = "Please select an assigned course"
    if (submitForApproval) {
      if (!description.trim()) newErrors.description = "Assignment overview description is required"
      if (!instructions.trim()) newErrors.instructions = "Student instructions and submission guidelines are required"
      if (!dueDate) newErrors.dueDate = "Due date is required"
      if (maxMarks <= 0) newErrors.maxMarks = "Maximum marks must be greater than 0"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (submitForApproval: boolean) => {
    if (isSubmitting) return
    if (!validate(submitForApproval)) return

    setIsSubmitting(true)
    try {
      const input: CreateAssignmentInput = {
        title: title.trim(),
        courseId,
        moduleId: moduleId || undefined,
        lessonId: lessonId || undefined,
        description: description.trim(),
        instructions: instructions.trim(),
        maxMarks: Number(maxMarks) || 100,
        dueDate,
        dueTime,
        attachmentName: attachment?.name,
        attachmentSize: attachment?.size,
        attachmentType: attachment?.type,
        submitForApproval,
      }

      const saved = saveAssignmentSubmission(input, editingSubmission?.id)
      onSuccess(saved, submitForApproval)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assignment-modal-title"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-gradient-to-r from-purple-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Icon name="document" size={18} />
            </div>
            <div>
              <h2 id="assignment-modal-title" className="text-base font-bold text-zinc-900">
                {editingSubmission ? "Edit & Resubmit Assignment" : "Create New Course Assignment"}
              </h2>
              <p className="text-xs text-zinc-500">
                Submissions require Admin approval before publication to students
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 grid place-items-center cursor-pointer transition-colors"
            aria-label="Close dialog"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Admin Feedback Notice if Rejection/Changes Requested */}
          {editingSubmission?.adminFeedback && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <Icon name="help" size={14} />
                <span>Admin Reviewer Feedback:</span>
              </div>
              <p className="text-[11.5px] leading-relaxed pl-5">
                {editingSubmission.adminFeedback}
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              Assignment Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Heuristic Evaluation & Ethical AI Matrix"
              className={`w-full px-3 py-2 rounded-xl border text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 ${errors.title ? "border-red-400 bg-red-50/30" : "border-zinc-250"
                }`}
            />
            {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Course, Module & Lesson Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Assigned Course <span className="text-red-500">*</span>
              </label>
              <select
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value)
                  setModuleId("")
                  setLessonId("")
                }}
                className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} – {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Course Module
              </label>
              <select
                value={moduleId}
                onChange={(e) => {
                  setModuleId(e.target.value)
                  setLessonId("")
                }}
                className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="">Course-wide / All Modules</option>
                {availableModules.map((m, idx) => (
                  <option key={m.id} value={m.id}>
                    Module {idx + 1}: {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Specific Lesson (Optional)
              </label>
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                disabled={!moduleId || availableLessons.length === 0}
                className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer disabled:opacity-50"
              >
                <option value="">Full Module Assignment</option>
                {availableLessons.map((l, idx) => (
                  <option key={l.id} value={l.id}>
                    Lesson {idx + 1}: {l.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              Overview Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary explaining the core topic and objective of this assignment..."
              className={`w-full px-3 py-2 rounded-xl border text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 ${errors.description ? "border-red-400 bg-red-50/30" : "border-zinc-250"
                }`}
            />
            {errors.description && (
              <p className="text-[11px] text-red-500 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Detailed Instructions */}
          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              Student Instructions & Submission Guidelines
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Step-by-step guidance for students (formatting requirements, deliverable formats, rubrics)..."
              className={`w-full px-3 py-2 rounded-xl border text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 ${errors.instructions ? "border-red-400 bg-red-50/30" : "border-zinc-250"
                }`}
            />
            {errors.instructions && (
              <p className="text-[11px] text-red-500 mt-1">{errors.instructions}</p>
            )}
          </div>

          {/* Marks and Due Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Maximum Marks
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value) || 0)}
                className={`w-full px-3 py-2 rounded-xl border text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 ${errors.maxMarks ? "border-red-400" : "border-zinc-250"
                  }`}
              />
              {errors.maxMarks && (
                <p className="text-[11px] text-red-500 mt-1">{errors.maxMarks}</p>
              )}
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer ${errors.dueDate ? "border-red-400" : "border-zinc-250"
                  }`}
              />
              {errors.dueDate && (
                <p className="text-[11px] text-red-500 mt-1">{errors.dueDate}</p>
              )}
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Due Time
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
              </input>
            </div>
          </div>

          {/* Attachment Upload (Optional) */}
          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              Supplementary Attachment (Rubric, Dataset, Template)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {attachment ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/70 border border-purple-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 grid place-items-center shrink-0">
                    <Icon name="document" size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-900 truncate">{attachment.name}</p>
                    <p className="text-[10px] text-zinc-500">{attachment.size}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-purple-700 hover:text-purple-900 font-semibold cursor-pointer text-[11px]"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="text-red-500 hover:text-red-700 font-semibold cursor-pointer text-[11px]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-zinc-250 hover:border-purple-400 p-4 rounded-xl text-center cursor-pointer transition-colors bg-zinc-50/50 hover:bg-purple-50/20"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 grid place-items-center mx-auto mb-1">
                  <Icon name="plus" size={14} />
                </div>
                <p className="font-semibold text-zinc-700">Choose file or drag & drop</p>
                <p className="text-[10.5px] text-zinc-400 mt-0.5">
                  PDF, DOCX, ZIP, or CSV up to 25MB
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-150 flex items-center justify-between bg-zinc-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 rounded-xl border border-zinc-250 text-zinc-700 font-bold hover:bg-zinc-100 text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-4 h-9 rounded-xl border border-purple-250 text-purple-700 bg-white font-bold hover:bg-purple-50 text-xs transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="px-5 h-9 rounded-xl btn-primary text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Submit for Approval</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   2. CREATE / EDIT QUIZ MODAL
-------------------------------------------------------------------------- */
export function CreateQuizModal({
  isOpen,
  onClose,
  courses,
  initialCourseId,
  initialModuleId,
  initialLessonId,
  editingSubmission,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  courses: CourseItem[]
  initialCourseId?: string
  initialModuleId?: string
  initialLessonId?: string
  editingSubmission?: ContentSubmissionRecord | null
  onSuccess: (item: ContentSubmissionRecord, submitted: boolean) => void
}) {
  const [courseId, setCourseId] = useState(
    editingSubmission?.courseId || initialCourseId || courses[0]?.id || ""
  )
  const [moduleId, setModuleId] = useState(
    editingSubmission?.moduleId || initialModuleId || ""
  )
  const [lessonId, setLessonId] = useState(
    editingSubmission?.lessonId || initialLessonId || ""
  )
  const [title, setTitle] = useState(editingSubmission?.title || "")
  const [description, setDescription] = useState(
    editingSubmission?.quizData?.description || ""
  )
  const [instructions, setInstructions] = useState(
    editingSubmission?.quizData?.instructions || ""
  )
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(
    editingSubmission?.quizData?.timeLimitMinutes || 25
  )
  const [maxAttempts, setMaxAttempts] = useState<number | "unlimited">(
    editingSubmission?.quizData?.maxAttempts ?? 2
  )

  const [questions, setQuestions] = useState<QuizQuestionItem[]>([
    {
      id: "q-1",
      questionText: "",
      marks: 5,
      correctOptionId: "opt-1",
      options: [
        { id: "opt-1", text: "" },
        { id: "opt-2", text: "" },
        { id: "opt-3", text: "" },
        { id: "opt-4", text: "" },
      ],
    },
  ])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedCourse = courses.find((c) => c.id === courseId)
  const availableModules = selectedCourse?.modules || []
  const selectedModule = availableModules.find((m) => m.id === moduleId)
  const availableLessons = selectedModule?.lessons || []

  // Auto-calculated total marks
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)

  useEffect(() => {
    if (editingSubmission && editingSubmission.quizData) {
      setCourseId(editingSubmission.courseId)
      setModuleId(editingSubmission.moduleId || "")
      setLessonId(editingSubmission.lessonId || "")
      setTitle(editingSubmission.title)
      setDescription(editingSubmission.quizData.description || "")
      setInstructions(editingSubmission.quizData.instructions || "")
      setTimeLimitMinutes(editingSubmission.quizData.timeLimitMinutes || 25)
      setMaxAttempts(editingSubmission.quizData.maxAttempts ?? 2)
      setQuestions(
        editingSubmission.quizData.questions?.length
          ? editingSubmission.quizData.questions
          : [
            {
              id: "q-1",
              questionText: "",
              marks: 5,
              correctOptionId: "opt-1",
              options: [
                { id: "opt-1", text: "" },
                { id: "opt-2", text: "" },
                { id: "opt-3", text: "" },
                { id: "opt-4", text: "" },
              ],
            },
          ]
      )
    } else {
      setCourseId(initialCourseId || courses[0]?.id || "")
      setModuleId(initialModuleId || "")
      setLessonId(initialLessonId || "")
      setTitle("")
      setDescription("")
      setInstructions("")
      setTimeLimitMinutes(25)
      setMaxAttempts(2)
      setQuestions([
        {
          id: `q-${Date.now()}-1`,
          questionText: "",
          marks: 5,
          correctOptionId: "opt-1",
          options: [
            { id: "opt-1", text: "" },
            { id: "opt-2", text: "" },
            { id: "opt-3", text: "" },
            { id: "opt-4", text: "" },
          ],
        },
      ])
    }
    setErrors({})
    setIsSubmitting(false)
  }, [editingSubmission, isOpen, initialCourseId, initialModuleId, initialLessonId, courses])

  if (!isOpen) return null

  // Question mutators
  const addQuestion = () => {
    const qId = `q-${Date.now()}-${questions.length + 1}`
    setQuestions([
      ...questions,
      {
        id: qId,
        questionText: "",
        marks: 5,
        correctOptionId: "opt-1",
        options: [
          { id: "opt-1", text: "" },
          { id: "opt-2", text: "" },
          { id: "opt-3", text: "" },
          { id: "opt-4", text: "" },
        ],
      },
    ])
  }

  const removeQuestion = (qIndex: number) => {
    if (questions.length <= 1) return
    setQuestions(questions.filter((_, idx) => idx !== qIndex))
  }

  const updateQuestionText = (qIndex: number, text: string) => {
    const next = [...questions]
    next[qIndex].questionText = text
    setQuestions(next)
  }

  const updateQuestionMarks = (qIndex: number, marks: number) => {
    const next = [...questions]
    next[qIndex].marks = Math.max(1, marks)
    setQuestions(next)
  }

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const next = [...questions]
    next[qIndex].options[optIndex].text = text
    setQuestions(next)
  }

  const setCorrectOption = (qIndex: number, optId: string) => {
    const next = [...questions]
    next[qIndex].correctOptionId = optId
    setQuestions(next)
  }

  const addOptionToQuestion = (qIndex: number) => {
    const next = [...questions]
    const optId = `opt-${next[qIndex].options.length + 1}`
    next[qIndex].options.push({ id: optId, text: "" })
    setQuestions(next)
  }

  const removeOptionFromQuestion = (qIndex: number, optIndex: number) => {
    const next = [...questions]
    if (next[qIndex].options.length <= 2) return
    const removedId = next[qIndex].options[optIndex].id
    next[qIndex].options = next[qIndex].options.filter((_, i) => i !== optIndex)
    if (next[qIndex].correctOptionId === removedId) {
      next[qIndex].correctOptionId = next[qIndex].options[0].id
    }
    setQuestions(next)
  }

  const validate = (submitForApproval: boolean): boolean => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = "Quiz title is required"
    if (!courseId) newErrors.courseId = "Please select an assigned course"

    if (submitForApproval) {
      if (questions.length === 0) {
        newErrors.questions = "Add at least one question to the quiz"
      }
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q.questionText.trim()) {
          newErrors[`q_${i}`] = `Question ${i + 1} text is required`
        }
        const validOpts = q.options.filter((o) => o.text.trim())
        if (validOpts.length < 2) {
          newErrors[`q_opt_${i}`] = `Question ${i + 1} needs at least 2 filled options`
        }
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (submitForApproval: boolean) => {
    if (isSubmitting) return
    if (!validate(submitForApproval)) return

    setIsSubmitting(true)
    try {
      const input: CreateQuizInput = {
        title: title.trim(),
        courseId,
        moduleId: moduleId || undefined,
        lessonId: lessonId || undefined,
        description: description.trim(),
        instructions: instructions.trim(),
        timeLimitMinutes: Number(timeLimitMinutes) || 25,
        maxAttempts,
        questions,
        submitForApproval,
      }

      const saved = saveQuizSubmission(input, editingSubmission?.id)
      onSuccess(saved, submitForApproval)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-gradient-to-r from-purple-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Icon name="sparkles" size={18} />
            </div>
            <div>
              <h2 id="quiz-modal-title" className="text-base font-bold text-zinc-900">
                {editingSubmission ? "Edit & Resubmit Quiz" : "Create Multiple-Choice Quiz"}
              </h2>
              <p className="text-xs text-zinc-500">
                Formative assessments undergo Administrative verification before student enrollment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 grid place-items-center cursor-pointer transition-colors"
            aria-label="Close dialog"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Admin Feedback Notice */}
          {editingSubmission?.adminFeedback && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <Icon name="help" size={14} />
                <span>Admin Reviewer Feedback:</span>
              </div>
              <p className="text-[11.5px] leading-relaxed pl-5">
                {editingSubmission.adminFeedback}
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              Quiz Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Python Loops & Flow Control Checkpoint"
              className={`w-full px-3 py-2 rounded-xl border text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 ${errors.title ? "border-red-400 bg-red-50/30" : "border-zinc-250"
                }`}
            />
            {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Course, Module & Lesson Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Assigned Course <span className="text-red-500">*</span>
              </label>
              <select
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value)
                  setModuleId("")
                  setLessonId("")
                }}
                className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} – {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Course Module
              </label>
              <select
                value={moduleId}
                onChange={(e) => {
                  setModuleId(e.target.value)
                  setLessonId("")
                }}
                className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="">Course-wide Quiz</option>
                {availableModules.map((m, idx) => (
                  <option key={m.id} value={m.id}>
                    Module {idx + 1}: {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Specific Lesson (Optional)
              </label>
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                disabled={!moduleId || availableLessons.length === 0}
                className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer disabled:opacity-50"
              >
                <option value="">Full Module Quiz</option>
                {availableLessons.map((l, idx) => (
                  <option key={l.id} value={l.id}>
                    Lesson {idx + 1}: {l.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Limit & Attempts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Time Limit (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={180}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value) || 10)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Maximum Attempts
              </label>
              <select
                value={maxAttempts}
                onChange={(e) => {
                  const val = e.target.value
                  setMaxAttempts(val === "unlimited" ? "unlimited" : Number(val))
                }}
                className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value={1}>1 Attempt (Strict)</option>
                <option value={2}>2 Attempts (Recommended)</option>
                <option value={3}>3 Attempts</option>
                <option value="unlimited">Unlimited Practice</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Total Calculated Score
              </label>
              <div className="h-9 rounded-xl bg-purple-50 border border-purple-200 px-3 flex items-center justify-between font-bold text-purple-900">
                <span>{questions.length} Questions</span>
                <span>{totalMarks} Marks</span>
              </div>
            </div>
          </div>

          {/* Question Builder Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-150">
              <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                <span>Quiz Questions ({questions.length})</span>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                  Auto-graded
                </span>
              </h3>
              <button
                type="button"
                onClick={addQuestion}
                className="px-3 h-8 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>+</span>
                <span>Add Question</span>
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIndex) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 hover:bg-purple-50/20 transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-purple-900 text-xs bg-purple-100 px-2.5 py-0.5 rounded-full">
                      Question {qIndex + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-zinc-500">Marks:</span>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={q.marks}
                          onChange={(e) => updateQuestionMarks(qIndex, Number(e.target.value) || 1)}
                          className="w-14 px-2 py-1 rounded-lg border border-zinc-250 text-xs bg-white text-zinc-900 text-center font-bold"
                        />
                      </div>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-red-500 hover:text-red-700 font-bold px-1.5 py-1 text-xs cursor-pointer"
                          title="Delete question"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={q.questionText}
                      onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                      placeholder={`Enter question ${qIndex + 1} text here...`}
                      className={`w-full px-3 py-2 rounded-xl border text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 ${errors[`q_${qIndex}`] ? "border-red-400" : "border-zinc-250"
                        }`}
                    />
                    {errors[`q_${qIndex}`] && (
                      <p className="text-[11px] text-red-500 mt-0.5">{errors[`q_${qIndex}`]}</p>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-2 pl-1">
                    <span className="block text-[10.5px] font-bold text-zinc-500 uppercase tracking-wider">
                      Options & Correct Answer (Select Radio for Correct):
                    </span>
                    {q.options.map((opt, optIndex) => {
                      const isCorrect = q.correctOptionId === opt.id
                      return (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            checked={isCorrect}
                            onChange={() => setCorrectOption(qIndex, opt.id)}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                            className={`flex-1 px-3 py-1.5 rounded-lg border text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 ${isCorrect
                                ? "border-purple-400 bg-purple-50/40 font-medium"
                                : "border-zinc-200"
                              }`}
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOptionFromQuestion(qIndex, optIndex)}
                              className="text-zinc-400 hover:text-red-500 text-xs px-1 cursor-pointer"
                              title="Remove option"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      )
                    })}
                    {q.options.length < 6 && (
                      <button
                        type="button"
                        onClick={() => addOptionToQuestion(qIndex)}
                        className="text-[11px] text-purple-600 hover:text-purple-800 font-bold mt-1 cursor-pointer"
                      >
                        + Add Another Option
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-150 flex items-center justify-between bg-zinc-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 rounded-xl border border-zinc-250 text-zinc-700 font-bold hover:bg-zinc-100 text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-4 h-9 rounded-xl border border-purple-250 text-purple-700 bg-white font-bold hover:bg-purple-50 text-xs transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="px-5 h-9 rounded-xl btn-primary text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Submit for Approval</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   3. UPLOAD LEARNING MATERIAL MODAL
-------------------------------------------------------------------------- */
export function UploadMaterialModal({
  isOpen,
  onClose,
  courses,
  initialCourseId,
  initialModuleId,
  initialLessonId,
  editingSubmission,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  courses: CourseItem[]
  initialCourseId?: string
  initialModuleId?: string
  initialLessonId?: string
  editingSubmission?: ContentSubmissionRecord | null
  onSuccess: (item: ContentSubmissionRecord, submitted: boolean) => void
}) {
  const [courseId, setCourseId] = useState(
    editingSubmission?.courseId || initialCourseId || courses[0]?.id || ""
  )
  const [moduleId, setModuleId] = useState(
    editingSubmission?.moduleId || initialModuleId || ""
  )
  const [lessonId, setLessonId] = useState(
    editingSubmission?.lessonId || initialLessonId || ""
  )
  const [title, setTitle] = useState(editingSubmission?.title || "")
  const [description, setDescription] = useState(
    editingSubmission?.materialData?.description || ""
  )
  const [materialType, setMaterialType] = useState<
    "PDF Document" | "Slide Deck" | "Lab Worksheet" | "Video Lecture" | "Audio Lecture" | "Reading & Notes"
  >(editingSubmission?.materialData?.materialType || "PDF Document")

  const [selectedFile, setSelectedFile] = useState<{
    name: string
    size: string
    type: string
  } | null>(
    editingSubmission?.materialData?.fileName
      ? {
        name: editingSubmission.materialData.fileName,
        size: editingSubmission.materialData.fileSize || "2.4 MB",
        type: editingSubmission.materialData.fileType || "application/pdf",
      }
      : null
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedCourse = courses.find((c) => c.id === courseId)
  const availableModules = selectedCourse?.modules || []
  const selectedModule = availableModules.find((m) => m.id === moduleId)
  const availableLessons = selectedModule?.lessons || []

  useEffect(() => {
    if (editingSubmission && editingSubmission.materialData) {
      setCourseId(editingSubmission.courseId)
      setModuleId(editingSubmission.moduleId || "")
      setLessonId(editingSubmission.lessonId || "")
      setTitle(editingSubmission.title)
      setDescription(editingSubmission.materialData.description || "")
      setMaterialType(editingSubmission.materialData.materialType || "PDF Document")
      setSelectedFile({
        name: editingSubmission.materialData.fileName,
        size: editingSubmission.materialData.fileSize || "2.0 MB",
        type: editingSubmission.materialData.fileType || "application/pdf",
      })
    } else {
      setCourseId(initialCourseId || courses[0]?.id || "")
      setModuleId(initialModuleId || "")
      setLessonId(initialLessonId || "")
      setTitle("")
      setDescription("")
      setMaterialType("PDF Document")
      setSelectedFile(null)
    }
    setErrors({})
    setIsSubmitting(false)
  }, [editingSubmission, isOpen, initialCourseId, initialModuleId, initialLessonId, courses])

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
      const sizeStr = Number(sizeMb) < 0.1 ? `${Math.round(file.size / 1024)} KB` : `${sizeMb} MB`
      setSelectedFile({
        name: file.name,
        size: sizeStr,
        type: file.type || "application/pdf",
      })
      if (!title) {
        // Auto-fill title from filename
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
        setTitle(cleanName)
      }
    }
  }

  const validate = (submitForApproval: boolean): boolean => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = "Material title is required"
    if (!courseId) newErrors.courseId = "Please select an assigned course"
    if (submitForApproval && !selectedFile) {
      newErrors.file = "Please select or upload a document/media asset"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (submitForApproval: boolean) => {
    if (isSubmitting) return
    if (!validate(submitForApproval)) return

    setIsSubmitting(true)
    try {
      const input: UploadMaterialInput = {
        title: title.trim(),
        courseId,
        moduleId: moduleId || undefined,
        lessonId: lessonId || undefined,
        description: description.trim(),
        materialType,
        fileName: selectedFile?.name || "Untitled_Document.pdf",
        fileSize: selectedFile?.size || "1.0 MB",
        fileType: selectedFile?.type || "application/pdf",
        submitForApproval,
      }

      const saved = saveMaterialSubmission(input, editingSubmission?.id)
      onSuccess(saved, submitForApproval)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-modal-title"
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-gradient-to-r from-purple-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Icon name="book" size={18} />
            </div>
            <div>
              <h2 id="material-modal-title" className="text-base font-bold text-zinc-900">
                {editingSubmission ? "Update & Resubmit Material" : "Upload Learning Material"}
              </h2>
              <p className="text-xs text-zinc-500">
                Administrative verification required prior to student curriculum publication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 grid place-items-center cursor-pointer transition-colors"
            aria-label="Close dialog"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Admin Feedback Notice */}
          {editingSubmission?.adminFeedback && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <Icon name="help" size={14} />
                <span>Admin Reviewer Feedback:</span>
              </div>
              <p className="text-[11.5px] leading-relaxed pl-5">
                {editingSubmission.adminFeedback}
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              Material Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Raspberry Pi RP2040 Breadboard Wiring Diagram"
              className={`w-full px-3 py-2 rounded-xl border text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 ${errors.title ? "border-red-400 bg-red-50/30" : "border-zinc-250"
                }`}
            />
            {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Type Picker */}
          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              Material Format / Category
            </label>
            <select
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="PDF Document">PDF Document (Lecture Notes / Handout)</option>
              <option value="Slide Deck">Slide Deck (PPTX / Keynote)</option>
              <option value="Lab Worksheet">Lab Worksheet / Problem Set</option>
              <option value="Video Lecture">Video Lecture / Demonstration MP4</option>
              <option value="Audio Lecture">Audio Lecture / Podcast</option>
              <option value="Reading & Notes">Reading & Reference Paper</option>
            </select>
          </div>

          {/* Course, Module, Lesson */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Assigned Course <span className="text-red-500">*</span>
              </label>
              <select
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value)
                  setModuleId("")
                  setLessonId("")
                }}
                className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} – {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Target Module
              </label>
              <select
                value={moduleId}
                onChange={(e) => {
                  setModuleId(e.target.value)
                  setLessonId("")
                }}
                className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="">Course Resource</option>
                {availableModules.map((m, idx) => (
                  <option key={m.id} value={m.id}>
                    Module {idx + 1}: {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Specific Lesson (Optional)
              </label>
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                disabled={!moduleId || availableLessons.length === 0}
                className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer disabled:opacity-50"
              >
                <option value="">Module Asset</option>
                {availableLessons.map((l, idx) => (
                  <option key={l.id} value={l.id}>
                    Lesson {idx + 1}: {l.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              Description / Teaching Context
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context on how students should use this material during study or lab sessions..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-250 text-xs bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* File Upload Selector */}
          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              File Selection <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mp3,.zip,.png,.jpg,.jpeg"
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-50/70 border border-purple-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 grid place-items-center shrink-0">
                    <Icon name="document" size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-900 truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-zinc-500">
                      {selectedFile.size} · {materialType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-purple-700 hover:text-purple-900 font-semibold cursor-pointer text-[11px]"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-red-500 hover:text-red-700 font-semibold cursor-pointer text-[11px]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed p-5 rounded-xl text-center cursor-pointer transition-colors bg-zinc-50/50 hover:bg-purple-50/20 ${errors.file ? "border-red-400 bg-red-50/20" : "border-zinc-250 hover:border-purple-400"
                  }`}
              >
                <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 grid place-items-center mx-auto mb-1.5">
                  <Icon name="plus" size={16} />
                </div>
                <p className="font-bold text-zinc-700">Click to select document or media</p>
                <p className="text-[10.5px] text-zinc-400 mt-0.5">
                  Supported formats: PDF, PPTX, DOCX, MP4 up to 50MB
                </p>
              </button>
            )}
            {errors.file && <p className="text-[11px] text-red-500 mt-1">{errors.file}</p>}
          </div>

          <div className="p-3 rounded-xl bg-zinc-100/70 border border-zinc-200 text-[11px] text-zinc-600 flex items-start gap-2">
            <span className="text-zinc-500 mt-0.5">ℹ</span>
            <span>
              <strong>Administrative Governance Policy:</strong> Uploaded materials are preserved locally and submitted for Administrative curriculum sign-off. Material is published to students only after Admin verification.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-150 flex items-center justify-between bg-zinc-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 rounded-xl border border-zinc-250 text-zinc-700 font-bold hover:bg-zinc-100 text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-4 h-9 rounded-xl border border-purple-250 text-purple-700 bg-white font-bold hover:bg-purple-50 text-xs transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="px-5 h-9 rounded-xl btn-primary text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Submit for Approval</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   4. VIEW SUBMISSION DETAILS MODAL
-------------------------------------------------------------------------- */
export function ViewSubmissionDetailsModal({
  submission,
  isOpen,
  onClose,
  onEdit,
}: {
  submission: ContentSubmissionRecord | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (submission: ContentSubmissionRecord) => void
}) {
  if (!isOpen || !submission) return null

  const getStatusBadge = (status: ContentSubmissionRecord["status"]) => {
    switch (status) {
      case "approved":
        return {
          label: "Approved",
          className: "bg-emerald-100 text-emerald-800 border-emerald-200",
        }
      case "pending_approval":
        return {
          label: "Pending Approval",
          className: "bg-amber-100 text-amber-800 border-amber-200",
        }
      case "changes_requested":
        return {
          label: "Changes Requested",
          className: "bg-orange-100 text-orange-800 border-orange-200",
        }
      case "rejected":
        return {
          label: "Rejected",
          className: "bg-red-100 text-red-800 border-red-200",
        }
      case "draft":
      default:
        return {
          label: "Draft",
          className: "bg-zinc-100 text-zinc-700 border-zinc-200",
        }
    }
  }

  const badge = getStatusBadge(submission.status)
  const canEdit =
    submission.status === "draft" ||
    submission.status === "changes_requested" ||
    submission.status === "rejected"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="submission-details-title"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-gradient-to-r from-purple-50/60 to-white">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
              {submission.type}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              v{submission.version}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 grid place-items-center cursor-pointer transition-colors"
            aria-label="Close dialog"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          <div>
            <h2 id="submission-details-title" className="text-lg font-bold text-zinc-900 leading-snug">
              {submission.title}
            </h2>
            <div className="flex items-center gap-2 flex-wrap text-zinc-500 mt-1">
              <span>{submission.courseCode} · {submission.courseName}</span>
              {submission.moduleTitle && (
                <>
                  <span>›</span>
                  <span>{submission.moduleTitle}</span>
                </>
              )}
              {submission.lessonTitle && (
                <>
                  <span>›</span>
                  <span>{submission.lessonTitle}</span>
                </>
              )}
            </div>
          </div>

          {/* Admin Feedback Box */}
          {submission.adminFeedback && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Icon name="help" size={15} />
                <span>Administrative Feedback:</span>
              </div>
              <p className="text-xs leading-relaxed pl-5">
                {submission.adminFeedback}
              </p>
            </div>
          )}

          {/* Payload specifics */}
          {submission.type === "assignment" && submission.assignmentData && (
            <div className="space-y-3 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2 border-b border-zinc-200">
                <div>
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Max Marks</span>
                  <strong className="text-sm text-zinc-900">{submission.assignmentData.maxMarks}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Due Date</span>
                  <strong className="text-sm text-zinc-900">
                    {submission.assignmentData.dueDate} {submission.assignmentData.dueTime || ""}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Attachment</span>
                  <span className="text-xs text-purple-700 font-bold truncate block">
                    {submission.assignmentData.attachmentName || "None"}
                  </span>
                </div>
              </div>

              {submission.assignmentData.description && (
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">Overview</span>
                  <p className="text-zinc-700 leading-relaxed">{submission.assignmentData.description}</p>
                </div>
              )}

              {submission.assignmentData.instructions && (
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">Instructions</span>
                  <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">{submission.assignmentData.instructions}</p>
                </div>
              )}
            </div>
          )}

          {submission.type === "quiz" && submission.quizData && (
            <div className="space-y-3 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="grid grid-cols-3 gap-2 pb-2 border-b border-zinc-200">
                <div>
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Time Limit</span>
                  <strong className="text-sm text-zinc-900">{submission.quizData.timeLimitMinutes} Mins</strong>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Total Marks</span>
                  <strong className="text-sm text-purple-700">{submission.quizData.totalMarks} Marks</strong>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Attempts</span>
                  <strong className="text-sm text-zinc-900">{submission.quizData.maxAttempts}</strong>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <span className="font-bold text-zinc-900 block">
                  Questions ({submission.quizData.questions.length})
                </span>
                {submission.quizData.questions.map((q, idx) => (
                  <div key={q.id} className="p-3 rounded-lg bg-white border border-zinc-200 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <strong className="text-zinc-900">
                        {idx + 1}. {q.questionText}
                      </strong>
                      <span className="font-bold text-purple-700 text-[11px]">{q.marks} marks</span>
                    </div>
                    <div className="space-y-1 pl-2">
                      {q.options.map((opt) => {
                        const isCorrect = q.correctOptionId === opt.id
                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-2 p-1.5 rounded text-[11px] ${isCorrect
                                ? "bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200"
                                : "text-zinc-600"
                              }`}
                          >
                            <span>{isCorrect ? "✓ Correct:" : "•"}</span>
                            <span>{opt.text}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {submission.type === "material" && submission.materialData && (
            <div className="space-y-3 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 grid place-items-center shrink-0">
                  <Icon name="document" size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-900">{submission.materialData.fileName}</p>
                  <p className="text-zinc-500 text-[11px]">
                    {submission.materialData.fileSize} · {submission.materialData.materialType}
                  </p>
                </div>
              </div>
              {submission.materialData.description && (
                <p className="text-zinc-700 leading-relaxed pt-1">
                  {submission.materialData.description}
                </p>
              )}
            </div>
          )}

          {/* Submission Audit History */}
          <div className="pt-2 border-t border-zinc-150">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
              Workflow Activity & History Log
            </span>
            <div className="space-y-1.5">
              {submission.history.map((h, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 p-2 rounded-lg bg-zinc-50/70 border border-zinc-150 text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-800 capitalize">{h.action.replace("_", " ")}</span>
                    <span className="text-zinc-400">by</span>
                    <span className="text-purple-700 font-medium">{h.actor}</span>
                    {h.notes && <span className="text-zinc-500 italic">({h.notes})</span>}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                    {new Date(h.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-150 flex items-center justify-between bg-zinc-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 rounded-xl border border-zinc-250 text-zinc-700 font-bold hover:bg-zinc-100 text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onEdit?.(submission)
              }}
              className="px-4 h-9 rounded-xl btn-primary text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>Edit & Resubmit</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
