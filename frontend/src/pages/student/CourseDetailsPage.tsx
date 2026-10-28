import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Icon } from "../../components/Icon"
import { StudentDropdown } from "../../components/StudentDropdown"
import type {
  CourseItem,
  ModuleItem,
  ResourceMaterial,
  LessonItem,
  StudentNavPage,
  AssignmentData,
  NoteItem,
  QuizData,
  AssessmentQuestion,
  AssessmentAttempt,
} from "./studentTypes"
import {
  courseCurriculum,
  courseMaterials,
  initialAssignmentsList,
  initialNotesList,
  initialQuizzesList,
  quizQuestionBanks,
  initialQuizAttempts,
} from "./studentMockData"
import {
  extractGoogleDriveFileId,
  getGoogleDrivePreviewUrl,
  getGoogleDriveDownloadUrl,
  downloadSingleMaterial,
  downloadCourseMaterialsZip,
} from "./materialUtils"

interface CourseDetailsPageProps {
  selectedCourseId: string
  courses: CourseItem[]
  onSelectCourse: (id: string) => void
  onBackToCourses: () => void
  onNavigate?: (page: StudentNavPage) => void
  onToast: (msg: string) => void
  onOpenAiModal: () => void
  onEnrollCourse?: (course: CourseItem) => void
  assignments?: AssignmentData[]
  onSubmitAssignment?: (id: string, repoUrl: string, comments: string) => void
  quizzes?: QuizData[]
  onCompleteQuiz?: (
    id: string,
    scoreStr: string,
    pct: number,
    attemptData?: AssessmentAttempt,
  ) => void
  quizAttempts?: Record<string, AssessmentAttempt>
}

export function CourseDetailsPage({
  selectedCourseId,
  courses,
  onSelectCourse,
  onBackToCourses,
  onNavigate,
  onToast,
  onOpenAiModal,
  onEnrollCourse,
  assignments,
  onSubmitAssignment,
  quizzes,
  onCompleteQuiz,
  quizAttempts,
}: CourseDetailsPageProps) {
  const currentCourse =
    courses.find((c) => c.id === selectedCourseId) || courses[0]
  const [activeSubTab, setActiveSubTab] =
    useState<"Curriculum" | "Materials" | "Discussion" | "Notes" | "Assignments" | "Quizzes">("Curriculum")
  const [activeLesson, setActiveLesson] = useState<LessonItem | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState("1.0x")
  const [previewMaterial, setPreviewMaterial] = useState<ResourceMaterial | null>(null)
  const [previewTab, setPreviewTab] = useState<"drive" | "overview">("drive")
  const [copiedNotebookOrJson, setCopiedNotebookOrJson] = useState(false)

  // Easily dismiss preview modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && previewMaterial) {
        setPreviewMaterial(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [previewMaterial])

  const handleOpenPreview = (mat: ResourceMaterial) => {
    setPreviewMaterial(mat)
    setPreviewTab("drive")
    setCopiedNotebookOrJson(false)
  }

  const [expandedModules, setExpandedModules] =
    useState<Record<string, boolean>>({
      "m-1": false,
      "m-2": false,
      "m-3": false,
      "m-4": true,
    })

  // Q&A state
  const [questions, setQuestions] = useState<{
    id: string
    user: string
    text: string
    answer?: string
    time: string
  }[]>([
    {
      id: "q-1",
      user: "Srimanth",
      text: "Is Reciprocal Rank Fusion (RRF) preferred over Cross-Encoder re-ranking for latency-sensitive RAG?",
      answer:
        "Yes, RRF computes rank merges in O(N log N) without deep neural forward passes, reducing retrieval latency from ~120ms to under 15ms. Srimanth covered this in Lecture 3.4.",
      time: "2 hours ago",
    },
    {
      id: "q-2",
      user: "Aarav Mehta",
      text: "Which embedding model should we use for benchmark evaluation in Assignment 1?",
      answer:
        "We recommend text-embedding-3-small or BAAI/bge-small-en-v1.5 to stay within compute budgets.",
      time: "1 day ago",
    },
  ])
  const [newQuestionText, setNewQuestionText] = useState("")

  const modules: ModuleItem[] =
    courseCurriculum[currentCourse.id] || courseCurriculum["c-1"] || []
  const materials: ResourceMaterial[] =
    courseMaterials[currentCourse.id] || courseMaterials["c-1"] || []

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handlePostQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuestionText.trim()) return
    const q = {
      id: `q-${Date.now()}`,
      user: "Srimanth",
      text: newQuestionText,
      answer:
        "Great question! Instructor Srimanth has been notified and will review your question shortly. Instant AI summary: Refer to Module 4 notes for implementation patterns.",
      time: "Just now",
    }
    setQuestions([q, ...questions])
    setNewQuestionText("")
    onToast("Question posted to course discussion board!")
  }

  // All lesson titles for associating notes
  const courseLessons = useMemo(() => {
    return modules.flatMap((m) => m.lessons.map((l) => l.title))
  }, [modules])

  // --- SELF NOTES STATE & PERSISTENCE ---
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const stored = localStorage.getItem(`quantum_course_notes_${currentCourse.id}`)
      if (stored) return JSON.parse(stored)
    } catch {
      // ignore
    }
    const seeded = initialNotesList.filter(
      (n) =>
        n.course.toLowerCase().includes(currentCourse.title.toLowerCase()) ||
        currentCourse.title.toLowerCase().includes(n.course.toLowerCase()),
    )
    if (seeded.length > 0) return seeded
    return [
      {
        id: `nt-${currentCourse.id}-1`,
        title: `${currentCourse.title} - Key Takeaways & Core Concepts`,
        course: currentCourse.title,
        lastModified: "Yesterday",
        content: `Core foundational takeaways for ${currentCourse.title}. Make sure to review vector embeddings, transformer layers, and pipeline optimizations before the assignment deadline.`,
        snippet: "# Course quickstart snippet\nimport numpy as np\nprint('Quantum LMS Course Workspace Ready')",
        tags: ["Core Concepts", "Revision"],
        lesson: modules[0]?.lessons[0]?.title || "Course Overview",
      },
    ]
  })

  // Synchronize notes when switching courses
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`quantum_course_notes_${currentCourse.id}`)
      if (stored) {
        setNotes(JSON.parse(stored))
        return
      }
    } catch {
      // ignore
    }
    const seeded = initialNotesList.filter(
      (n) =>
        n.course.toLowerCase().includes(currentCourse.title.toLowerCase()) ||
        currentCourse.title.toLowerCase().includes(n.course.toLowerCase()),
    )
    if (seeded.length > 0) {
      setNotes(seeded)
    } else {
      setNotes([
        {
          id: `nt-${currentCourse.id}-1`,
          title: `${currentCourse.title} - Key Takeaways & Core Concepts`,
          course: currentCourse.title,
          lastModified: "Yesterday",
          content: `Core foundational takeaways for ${currentCourse.title}. Make sure to review vector embeddings, transformer layers, and pipeline optimizations before the assignment deadline.`,
          snippet: "# Course quickstart snippet\nimport numpy as np\nprint('Quantum LMS Course Workspace Ready')",
          tags: ["Core Concepts", "Revision"],
          lesson: modules[0]?.lessons[0]?.title || "Course Overview",
        },
      ])
    }
  }, [currentCourse.id, currentCourse.title, modules])

  // Save notes helper
  const persistNotes = (updated: NoteItem[]) => {
    setNotes(updated)
    try {
      localStorage.setItem(`quantum_course_notes_${currentCourse.id}`, JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  // Note Modal & Form state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null)
  const [noteFormTitle, setNoteFormTitle] = useState("")
  const [noteFormContent, setNoteFormContent] = useState("")
  const [noteFormSnippet, setNoteFormSnippet] = useState("")
  const [noteFormLesson, setNoteFormLesson] = useState("")
  const [noteFormTags, setNoteFormTags] = useState("")
  const [searchNote, setSearchNote] = useState("")
  const [selectedLessonFilter, setSelectedLessonFilter] = useState("All")
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null)

  const handleOpenCreateNote = (defaultLesson?: string) => {
    setEditingNote(null)
    setNoteFormTitle("")
    setNoteFormContent("")
    setNoteFormSnippet("")
    setNoteFormLesson(defaultLesson || courseLessons[0] || "General / Course Overview")
    setNoteFormTags("")
    setIsNoteModalOpen(true)
  }

  const handleOpenEditNote = (note: NoteItem) => {
    setEditingNote(note)
    setNoteFormTitle(note.title)
    setNoteFormContent(note.content)
    setNoteFormSnippet(note.snippet || "")
    setNoteFormLesson(note.lesson || "General / Course Overview")
    setNoteFormTags(note.tags.join(", "))
    setIsNoteModalOpen(true)
  }

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteFormTitle.trim()) {
      onToast("Please enter a note title.")
      return
    }
    if (!noteFormContent.trim()) {
      onToast("Please enter note content.")
      return
    }
    const tags = noteFormTags
      ? noteFormTags.split(",").map((t) => t.trim()).filter(Boolean)
      : ["Study Notes"]

    if (editingNote) {
      const updated = notes.map((n) =>
        n.id === editingNote.id
          ? {
              ...n,
              title: noteFormTitle.trim(),
              content: noteFormContent.trim(),
              snippet: noteFormSnippet.trim() || undefined,
              lesson: noteFormLesson.trim() || undefined,
              tags,
              lastModified: "Updated just now",
            }
          : n,
      )
      persistNotes(updated)
      onToast(`Note "${noteFormTitle.trim()}" updated successfully! 📝`)
    } else {
      const newNote: NoteItem = {
        id: `nt-${Date.now()}`,
        title: noteFormTitle.trim(),
        course: currentCourse.title,
        lastModified: "Just now",
        content: noteFormContent.trim(),
        snippet: noteFormSnippet.trim() || undefined,
        lesson: noteFormLesson.trim() || undefined,
        tags,
      }
      persistNotes([newNote, ...notes])
      onToast(`New study note "${newNote.title}" saved! 📝`)
    }
    setIsNoteModalOpen(false)
    setEditingNote(null)
  }

  const handleDeleteNote = (id: string, title: string) => {
    const updated = notes.filter((n) => n.id !== id)
    persistNotes(updated)
    onToast(`Deleted note "${title}".`)
  }

  const handleCopySnippet = (id: string, code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code)
      setCopiedSnippetId(id)
      onToast("Code snippet copied to clipboard!")
      setTimeout(() => setCopiedSnippetId(null), 2500)
    }
  }

  // Filtered notes
  const filteredNotes = useMemo(() => {
    let list = notes
    if (selectedLessonFilter !== "All") {
      list = list.filter((n) => n.lesson === selectedLessonFilter)
    }
    if (!searchNote.trim()) return list
    const q = searchNote.toLowerCase()
    return list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.snippet && n.snippet.toLowerCase().includes(q)) ||
        (n.lesson && n.lesson.toLowerCase().includes(q)) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [notes, selectedLessonFilter, searchNote])

  // --- ASSIGNMENTS STATE, DETAIL VIEW & PERSISTENCE ---
  const ALLOWED_EXTENSIONS = [
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "zip",
    "ipynb",
    "py",
    "tar.gz",
  ]
  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Assignment overrides to persist submissions in localStorage
  const [assignmentOverrides, setAssignmentOverrides] = useState<
    Record<string, Partial<AssignmentData>>
  >(() => {
    try {
      const saved = localStorage.getItem(
        `quantum_course_assignments_${currentCourse.id}`,
      )
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return {}
  })

  // Sync assignment overrides & reset active assignment when course changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        `quantum_course_assignments_${currentCourse.id}`,
      )
      if (saved) {
        setAssignmentOverrides(JSON.parse(saved))
      } else {
        setAssignmentOverrides({})
      }
    } catch {
      // ignore
    }
    setSelectedAssignmentId(null)
    setSelectedFile(null)
    setSubmissionError(null)
    setIsResubmitting(false)
  }, [currentCourse.id])

  // Selected assignment ID for dedicated detail view (replaces list)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)

  // Dedicated detail upload form state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isResubmitting, setIsResubmitting] = useState(false)
  const [detailRepoUrl, setDetailRepoUrl] = useState("")
  const [detailComments, setDetailComments] = useState("")

  const [assignmentFilter, setAssignmentFilter] =
    useState<"All" | "Pending" | "Submitted" | "Graded">("All")
  const [assignmentSearch, setAssignmentSearch] = useState("")

  // Course assignments merged with persistent overrides
  const allAssignmentsList = assignments || initialAssignmentsList
  const courseAssignments = useMemo(() => {
    const q = currentCourse.title.toLowerCase()
    return allAssignmentsList
      .filter((a) => {
        const courseName = a.course.toLowerCase()
        return (
          courseName.includes(q) ||
          q.includes(courseName) ||
          (q.includes("genai") && courseName.includes("generative")) ||
          (q.includes("python") && courseName.includes("python")) ||
          (q.includes("machine learning") &&
            courseName.includes("machine learning")) ||
          (q.includes("agent") && courseName.includes("agent"))
        )
      })
      .map((a) => {
        const override = assignmentOverrides[a.id]
        if (override) {
          return { ...a, ...override }
        }
        return a
      })
  }, [allAssignmentsList, currentCourse.title, assignmentOverrides])

  // Active assignment for dedicated detail view
  const activeAssignment = useMemo(() => {
    if (!selectedAssignmentId) return null
    return courseAssignments.find((a) => a.id === selectedAssignmentId) || null
  }, [courseAssignments, selectedAssignmentId])

  // Filtered assignments for list view
  const filteredAssignments = useMemo(() => {
    let list = courseAssignments
    if (assignmentFilter !== "All") {
      list = list.filter((a) => a.status === assignmentFilter)
    }
    if (!assignmentSearch.trim()) return list
    const q = assignmentSearch.toLowerCase()
    return list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.grade && a.grade.toLowerCase().includes(q)),
    )
  }, [courseAssignments, assignmentFilter, assignmentSearch])

  const pendingAssignmentsCount = courseAssignments.filter(
    (a) => a.status === "Pending",
  ).length

  // Handlers for dedicated assignment detail view
  const handleOpenAssignment = (asg: AssignmentData) => {
    setSelectedAssignmentId(asg.id)
    setIsResubmitting(false)
    setSelectedFile(null)
    setSubmissionError(null)
    setDetailRepoUrl(asg.repoUrl || "")
    setDetailComments(asg.comments || "")
  }

  const handleBackToAssignmentsList = () => {
    setSelectedAssignmentId(null)
    setSelectedFile(null)
    setSubmissionError(null)
    setIsResubmitting(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const lowerName = file.name.toLowerCase()
    const ext = lowerName.split(".").pop() || ""
    const isTarGz = lowerName.endsWith(".tar.gz")
    if (!ALLOWED_EXTENSIONS.includes(ext) && !isTarGz) {
      setSubmissionError(
        `File format ".${ext}" is not supported. Please upload a PDF, DOC, DOCX, PPT, PPTX, or ZIP file.`,
      )
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setSubmissionError(
        `File size (${formatFileSize(file.size)}) exceeds the maximum allowed limit of 50MB.`,
      )
      return
    }

    setSubmissionError(null)
    setSelectedFile(file)
  }

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmitAssignmentInDetail = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAssignment) return

    if (!selectedFile && !detailRepoUrl.trim()) {
      setSubmissionError(
        "Please select an assignment file (PDF, DOC, DOCX, PPT, PPTX, ZIP) to upload or provide a project repository URL.",
      )
      onToast("Please select a file to upload.")
      return
    }

    if (
      detailRepoUrl.trim() &&
      !detailRepoUrl.trim().startsWith("http://") &&
      !detailRepoUrl.trim().startsWith("https://")
    ) {
      setSubmissionError(
        "Repository URL must be a valid link starting with https:// or http://",
      )
      onToast("Invalid repository URL format.")
      return
    }

    const formattedSize = selectedFile
      ? formatFileSize(selectedFile.size)
      : "3.8 MB"
    const fileName = selectedFile
      ? `${selectedFile.name} (${formattedSize})`
      : activeAssignment.uploadedFileName || "solution_submission.zip (3.8 MB)"

    const nowStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    const updatedOverride: Partial<AssignmentData> = {
      status: "Submitted",
      submissionDate: nowStr,
      uploadedFileName: fileName,
      repoUrl: detailRepoUrl.trim() || undefined,
      comments: detailComments.trim() || undefined,
    }

    const newOverrides = {
      ...assignmentOverrides,
      [activeAssignment.id]: updatedOverride,
    }

    setAssignmentOverrides(newOverrides)
    try {
      localStorage.setItem(
        `quantum_course_assignments_${currentCourse.id}`,
        JSON.stringify(newOverrides),
      )
    } catch {
      // ignore
    }

    if (onSubmitAssignment) {
      onSubmitAssignment(
        activeAssignment.id,
        detailRepoUrl.trim(),
        detailComments.trim(),
      )
    }

    onToast(`Assignment "${activeAssignment.title}" submitted successfully! 🚀`)
    setIsResubmitting(false)
    setSelectedFile(null)
    setSubmissionError(null)
  }

  // --- COURSE QUIZZES STATE, TAKING LOGIC & PERSISTENCE ---
  const [localAttempts, setLocalAttempts] = useState<Record<string, AssessmentAttempt>>(() => {
    try {
      const stored = localStorage.getItem(`quantum_course_quiz_attempts_${currentCourse.id}`)
      if (stored) return JSON.parse(stored)
    } catch {
      // ignore
    }
    return {}
  })

  const [quizOverrides, setQuizOverrides] = useState<Record<string, Partial<QuizData>>>(() => {
    try {
      const stored = localStorage.getItem(`quantum_course_quizzes_${currentCourse.id}`)
      if (stored) return JSON.parse(stored)
    } catch {
      // ignore
    }
    return {}
  })

  const [quizViewMode, setQuizViewMode] = useState<"list" | "taking" | "review">("list")
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null)
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null)
  const [quizFilter, setQuizFilter] = useState<"All" | "Available" | "In Progress" | "Completed" | "Upcoming">("All")
  const [quizSearch, setQuizSearch] = useState("")

  // Taking state
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [secondsLeft, setSecondsLeft] = useState<number>(0)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [takingStartTime, setTakingStartTime] = useState<number>(0)

  // Review state
  const [reviewFilter, setReviewFilter] = useState<"All" | "Correct" | "Incorrect" | "Unanswered">("All")

  // Check saved in-progress progress for quizzes in this course
  const [savedProgressMap, setSavedProgressMap] = useState<Record<string, { answers: Record<number, number>; secondsLeft: number }>>({})

  const refreshSavedProgress = useCallback(() => {
    try {
      const map: Record<string, { answers: Record<number, number>; secondsLeft: number }> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(`quantum_quiz_progress_${currentCourse.id}_`)) {
          const qId = key.replace(`quantum_quiz_progress_${currentCourse.id}_`, "")
          const val = localStorage.getItem(key)
          if (val) {
            map[qId] = JSON.parse(val)
          }
        }
      }
      setSavedProgressMap(map)
    } catch {
      // ignore
    }
  }, [currentCourse.id])

  useEffect(() => {
    refreshSavedProgress()
  }, [refreshSavedProgress])

  // Reset quiz state when switching courses
  useEffect(() => {
    try {
      const storedAttempts = localStorage.getItem(`quantum_course_quiz_attempts_${currentCourse.id}`)
      if (storedAttempts) setLocalAttempts(JSON.parse(storedAttempts))
      else setLocalAttempts({})

      const storedOverrides = localStorage.getItem(`quantum_course_quizzes_${currentCourse.id}`)
      if (storedOverrides) setQuizOverrides(JSON.parse(storedOverrides))
      else setQuizOverrides({})
    } catch {
      // ignore
    }
    setQuizViewMode("list")
    setSelectedQuizId(null)
    setActiveAttemptId(null)
    setSelectedAnswers({})
    refreshSavedProgress()
  }, [currentCourse.id, refreshSavedProgress])

  // Combined attempts from props and local storage
  const allQuizAttempts = useMemo(() => {
    return { ...initialQuizAttempts, ...(quizAttempts || {}), ...localAttempts }
  }, [quizAttempts, localAttempts])

  // Quizzes filtered for current course with fallback generator
  const allQuizzesSource = quizzes || initialQuizzesList
  const courseQuizzes: QuizData[] = useMemo(() => {
    const q = currentCourse.title.toLowerCase()
    let list = allQuizzesSource.filter((quiz) => {
      const c = quiz.course.toLowerCase()
      return (
        c.includes(q) ||
        q.includes(c) ||
        (q.includes("genai") && c.includes("generative")) ||
        (q.includes("python") && c.includes("python")) ||
        (q.includes("machine learning") && c.includes("machine learning")) ||
        (q.includes("agent") && c.includes("agent"))
      )
    })

    if (list.length === 0) {
      list = [
        {
          id: `qz-${currentCourse.id}-1`,
          title: `${currentCourse.title} - Midterm Knowledge Assessment`,
          course: currentCourse.title,
          dueDate: "Oct 28, 2026",
          durationMinutes: 20,
          questionCount: 10,
          passingPct: 70,
          status: "Active",
          availableFrom: "Oct 15, 2026, 09:00 AM",
          maxAttempts: 1,
          attemptsUsed: 0,
        },
        {
          id: `qz-${currentCourse.id}-2`,
          title: `${currentCourse.title} - Advanced Architectures & Optimization`,
          course: currentCourse.title,
          dueDate: "Nov 04, 2026",
          durationMinutes: 25,
          questionCount: 10,
          passingPct: 75,
          status: "Upcoming",
          availableFrom: "Nov 04, 2026, 10:00 AM",
          maxAttempts: 1,
          attemptsUsed: 0,
        },
      ]
    }

    return list.map((item) => {
      const override = quizOverrides[item.id]
      if (override) return { ...item, ...override }
      return item
    })
  }, [allQuizzesSource, currentCourse.id, currentCourse.title, quizOverrides])

  // Active quiz object
  const activeQuiz = useMemo(() => {
    if (!selectedQuizId) return null
    return courseQuizzes.find((q) => q.id === selectedQuizId) || null
  }, [courseQuizzes, selectedQuizId])

  // Active questions
  const activeQuestions = useMemo(() => {
    if (!activeQuiz) return []
    if (activeQuiz.questions && activeQuiz.questions.length > 0) {
      return activeQuiz.questions
    }
    if (quizQuestionBanks[activeQuiz.id]) {
      return quizQuestionBanks[activeQuiz.id]
    }
    const qLower = currentCourse.title.toLowerCase()
    if (qLower.includes("python")) return quizQuestionBanks["qz-3"]
    if (qLower.includes("machine learning") || qLower.includes("math")) return quizQuestionBanks["qz-2"]
    if (qLower.includes("agent")) return quizQuestionBanks["qz-4"]
    return quizQuestionBanks["qz-1"]
  }, [activeQuiz, currentCourse.title])

  // Active attempt for review
  const activeAttempt = useMemo(() => {
    if (!activeQuiz) return null
    if (activeAttemptId && allQuizAttempts[activeAttemptId]) {
      return allQuizAttempts[activeAttemptId]
    }
    if (activeQuiz.latestAttemptId && allQuizAttempts[activeQuiz.latestAttemptId]) {
      return allQuizAttempts[activeQuiz.latestAttemptId]
    }
    if (allQuizAttempts[activeQuiz.id]) {
      return allQuizAttempts[activeQuiz.id]
    }
    const found = Object.values(allQuizAttempts).find((a) => a.quizId === activeQuiz.id)
    if (found) return found
    return null
  }, [activeQuiz, activeAttemptId, allQuizAttempts])

  // Available count for badge
  const availableQuizzesCount = useMemo(() => {
    return courseQuizzes.filter(
      (q) => q.status === "Active" || (q.status as string) === "Available"
    ).length
  }, [courseQuizzes])

  // Filtered course quizzes
  const filteredCourseQuizzes = useMemo(() => {
    let list = courseQuizzes
    if (quizFilter !== "All") {
      list = list.filter((q) => {
        const inProg = !q.score && !!savedProgressMap[q.id]
        if (quizFilter === "In Progress") return inProg
        if (quizFilter === "Completed") return q.status === "Completed"
        if (quizFilter === "Upcoming") return q.status === "Upcoming"
        if (quizFilter === "Available") return (q.status === "Active" || (q.status as string) === "Available") && !inProg
        return true
      })
    }
    if (!quizSearch.trim()) return list
    const term = quizSearch.toLowerCase()
    return list.filter((q) => q.title.toLowerCase().includes(term) || q.course.toLowerCase().includes(term))
  }, [courseQuizzes, quizFilter, quizSearch, savedProgressMap])

  // Timer countdown
  useEffect(() => {
    if (activeSubTab !== "Quizzes" || quizViewMode !== "taking" || !activeQuiz || secondsLeft <= 0) return
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [activeSubTab, quizViewMode, activeQuiz, secondsLeft])

  // Save progress automatically
  useEffect(() => {
    if (activeSubTab === "Quizzes" && quizViewMode === "taking" && activeQuiz) {
      try {
        localStorage.setItem(
          `quantum_quiz_progress_${currentCourse.id}_${activeQuiz.id}`,
          JSON.stringify({ answers: selectedAnswers, secondsLeft, timestamp: Date.now() })
        )
      } catch {
        // ignore
      }
    }
  }, [activeSubTab, quizViewMode, activeQuiz, selectedAnswers, secondsLeft, currentCourse.id])

  const formatQuizTimer = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const handleStartQuiz = (quiz: QuizData) => {
    setSelectedQuizId(quiz.id)
    setQuizViewMode("taking")
    setCurrentQIndex(0)
    setIsSubmitModalOpen(false)

    let restoredAnswers = {}
    let restoredSeconds = quiz.durationMinutes * 60
    try {
      const saved = localStorage.getItem(`quantum_quiz_progress_${currentCourse.id}_${quiz.id}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.answers) restoredAnswers = parsed.answers
        if (typeof parsed.secondsLeft === "number" && parsed.secondsLeft > 0) {
          restoredSeconds = parsed.secondsLeft
        }
      }
    } catch {
      // ignore
    }

    setSelectedAnswers(restoredAnswers)
    setSecondsLeft(restoredSeconds)
    setTakingStartTime(Date.now() - (quiz.durationMinutes * 60 - restoredSeconds) * 1000)
    onToast(`Started "${quiz.title}". Good luck! ⏱`)
  }

  const handleExitQuizTaking = () => {
    const answeredCount = Object.keys(selectedAnswers).length
    if (answeredCount > 0) {
      if (window.confirm("You have progress recorded. Your answers are saved locally and you can resume anytime. Return to quizzes list?")) {
        setQuizViewMode("list")
        setSelectedQuizId(null)
        refreshSavedProgress()
      }
    } else {
      setQuizViewMode("list")
      setSelectedQuizId(null)
      refreshSavedProgress()
    }
  }

  const handleFinalSubmitQuiz = (isTimeExpiry = false) => {
    if (!activeQuiz) return
    setIsSubmitModalOpen(false)

    let correctCount = 0
    activeQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        correctCount++
      }
    })

    const totalQuestions = activeQuestions.length || activeQuiz.questionCount || 10
    const pct = Math.round((correctCount / totalQuestions) * 100)
    const passed = pct >= activeQuiz.passingPct
    const timeTaken = Math.max(1, activeQuiz.durationMinutes * 60 - secondsLeft)

    const nowStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    const attemptId = `att-${activeQuiz.id}-${Date.now()}`
    const newAttempt: AssessmentAttempt = {
      id: attemptId,
      quizId: activeQuiz.id,
      studentId: "std-srimanth",
      studentName: "Srimanth",
      attemptNumber: (activeQuiz.attemptsUsed || 0) + 1,
      startedAt: new Date(takingStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      submittedAt: `${nowStr} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      timeTakenSeconds: timeTaken,
      answers: { ...selectedAnswers },
      score: correctCount,
      maxScore: totalQuestions,
      scoreStr: `${correctCount}/${totalQuestions}`,
      pct,
      passed,
      feedback: passed
        ? `Outstanding performance! You've demonstrated comprehensive mastery of ${currentCourse.title} concepts with a score of ${pct}%. All core competencies met.`
        : `Assessment finished with a score of ${pct}% (passing mark is ${activeQuiz.passingPct}%). Please review the concept explanations below and consult instructor office hours for reinforcement.`,
    }

    const updatedAttempts = { ...localAttempts, [attemptId]: newAttempt, [activeQuiz.id]: newAttempt }
    setLocalAttempts(updatedAttempts)
    try {
      localStorage.setItem(`quantum_course_quiz_attempts_${currentCourse.id}`, JSON.stringify(updatedAttempts))
      localStorage.removeItem(`quantum_quiz_progress_${currentCourse.id}_${activeQuiz.id}`)
    } catch {
      // ignore
    }

    const updatedQuizOverride: Partial<QuizData> = {
      status: "Completed",
      score: `${correctCount}/${totalQuestions}`,
      pct,
      latestAttemptId: attemptId,
      attemptsUsed: (activeQuiz.attemptsUsed || 0) + 1,
    }
    const updatedOverrides = { ...quizOverrides, [activeQuiz.id]: updatedQuizOverride }
    setQuizOverrides(updatedOverrides)
    try {
      localStorage.setItem(`quantum_course_quizzes_${currentCourse.id}`, JSON.stringify(updatedOverrides))
    } catch {
      // ignore
    }

    if (onCompleteQuiz) {
      onCompleteQuiz(activeQuiz.id, `${correctCount}/${totalQuestions}`, pct, newAttempt)
    }

    setActiveAttemptId(attemptId)
    setQuizViewMode("review")
    refreshSavedProgress()
    if (isTimeExpiry) {
      onToast(`Time expired! Quiz submitted automatically. Score: ${correctCount}/${totalQuestions} (${pct}%)`)
    } else {
      onToast(`Quiz submitted successfully! Score: ${correctCount}/${totalQuestions} (${pct}%) 🎉`)
    }
  }

  // Auto-submit when time expires
  const handleAutoSubmitOnExpiry = useCallback(() => {
    if (!activeQuiz) return
    handleFinalSubmitQuiz(true)
  }, [activeQuiz])

  useEffect(() => {
    if (activeSubTab === "Quizzes" && quizViewMode === "taking" && activeQuiz && secondsLeft === 0 && takingStartTime > 0) {
      handleAutoSubmitOnExpiry()
    }
  }, [secondsLeft, activeSubTab, quizViewMode, activeQuiz, takingStartTime, handleAutoSubmitOnExpiry])

  const handleOpenReview = (quiz: QuizData, attId?: string) => {
    setSelectedQuizId(quiz.id)
    setActiveAttemptId(attId || quiz.latestAttemptId || null)
    setReviewFilter("All")
    setQuizViewMode("review")
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Back button and Course Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-white/50">
        <button
          onClick={onBackToCourses}
          className="flex items-center gap-2 text-xs font-bold text-zinc-700 hover:text-black transition-colors cursor-pointer px-3 py-1.5 rounded-full hover:bg-zinc-100 w-fit"
        >
          <span>←</span>
          <span>Back to All Courses</span>
        </button>

        {/* Course quick picker */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
            Switch:
          </span>
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCourse(c.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                c.id === currentCourse.id
                  ? "bg-purple-700 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Course Hero Panel */}
      <section
        className="panel p-6 bg-white border border-zinc-100"
        aria-label="Course Header"
      >
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                {currentCourse.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                {currentCourse.level}
              </span>
              <span className="text-xs text-zinc-400">
                ⏱ {currentCourse.duration}
              </span>
              <span className="text-xs text-zinc-400">
                • {currentCourse.credits} Credits
              </span>
            </div>

            <h2 className="text-2xl font-black text-zinc-900 mb-2">
              {currentCourse.title}
            </h2>
            <p className="text-xs text-zinc-600 leading-relaxed max-w-2xl mb-4">
              {currentCourse.description}
            </p>

            <div className="flex items-center gap-4 text-xs">
              <div
                onClick={() => {
                  if (onNavigate) {
                    onToast("Opening Mentor Details...")
                    onNavigate("Mentor Details")
                  }
                }}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity p-1 -m-1 rounded-xl"
                title="View Faculty Mentor Profile & Office Hours"
              >
                <img
                  src="/assets/srimanth.png"
                  alt={currentCourse.instructor}
                  className="w-7 h-7 rounded-full object-cover border border-purple-200"
                />
                <div>
                  <div className="font-bold text-zinc-900 flex items-center gap-1">
                    <span>{currentCourse.instructor}</span>
                    <span className="text-[10px] text-purple-600 font-bold">
                      →
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {currentCourse.instructorRole}
                  </div>
                </div>
              </div>

              <div className="h-6 w-px bg-zinc-200" />

              <div>
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                  Active Milestone
                </div>
                <div className="font-bold text-purple-700">
                  {currentCourse.lastWatched}
                </div>
              </div>
            </div>
          </div>

          {/* Right Progress Card */}
          <div className="w-full lg:w-72 bg-purple-50/60 p-4 rounded-2xl border border-purple-100 flex flex-col justify-between">
            {currentCourse.status === "Catalog" ? (
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="text-zinc-700">Course Status</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-[#5F2BC0] text-xs font-bold">
                    Open for Enrollment
                  </span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2.5 overflow-hidden mb-3">
                  <div
                    className="bg-[#AEEB00] h-2.5 rounded-full"
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="text-[11px] text-zinc-500 mb-4">
                  {currentCourse.totalModules} Comprehensive Modules • {currentCourse.duration} of lectures and code labs.
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="text-zinc-700">Course Completion</span>
                  <span className="text-purple-700 text-base font-extrabold">
                    {currentCourse.progress}%
                  </span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2.5 overflow-hidden mb-3">
                  <div
                    className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${currentCourse.progress}%` }}
                  />
                </div>
                <div className="text-[11px] text-zinc-500 mb-4">
                  {currentCourse.completedModules} of {currentCourse.totalModules}{" "}
                  Modules completed. Next deadline: Oct 22.
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {currentCourse.status === "Catalog" ? (
                <button
                  onClick={() => {
                    if (onEnrollCourse) {
                      onEnrollCourse(currentCourse)
                    }
                    onToast(`Enrolled in "${currentCourse.title}" successfully! 🎉`)
                  }}
                  className="w-full py-2.5 rounded-full bg-[#111111] hover:bg-zinc-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Enroll in Course</span>
                  <span>→</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const activeMod =
                      modules.find((m) => m.status === "In Progress") ||
                      modules[0]
                    const activeLes =
                      activeMod?.lessons.find(
                        (l) => l.status === "In Progress",
                      ) || activeMod?.lessons[0]
                    if (activeLes) setActiveLesson(activeLes)
                    onToast(`Resuming "${currentCourse.title}"...`)
                  }}
                  className="w-full py-2.5 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Icon name="play" size={14} />
                  <span>Resume Lecture</span>
                </button>
              )}

              <button
                onClick={onOpenAiModal}
                className="w-full py-2 rounded-full border border-purple-200 bg-white text-xs font-bold text-purple-700 hover:bg-purple-100/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>✦</span>
                <span>Ask AI Tutor About This Course</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Sub Tabs: Curriculum / Materials / Discussion / Notes / Assignments */}
      <div className="panel p-0 overflow-hidden border border-zinc-100">
        <div className="flex border-b border-zinc-100 px-4 sm:px-6 pt-3 gap-3 sm:gap-6 bg-zinc-50/50 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab("Curriculum")}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === "Curriculum"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <span>📚</span>
            <span>Curriculum & Lessons ({modules.length} Modules)</span>
          </button>
          <button
            onClick={() => setActiveSubTab("Materials")}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === "Materials"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <span>📥</span>
            <span>Learning Materials & Downloads ({materials.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("Discussion")}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === "Discussion"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <span>💬</span>
            <span>Course Q&A ({questions.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("Notes")}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === "Notes"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <span>📝</span>
            <span>Self Notes ({notes.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("Assignments")}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === "Assignments"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <span>📄</span>
            <span>Assignments ({courseAssignments.length})</span>
            {pendingAssignmentsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {pendingAssignmentsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveSubTab("Quizzes")
              setQuizViewMode("list")
            }}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === "Quizzes"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <span>🎯</span>
            <span>Quizzes ({courseQuizzes.length})</span>
            {availableQuizzesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E7FF9C] text-[#385000] border border-[#AEEB00]">
                {availableQuizzesCount} Available
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Curriculum & Lessons */}
        {activeSubTab === "Curriculum" && (
          <div className="p-6 flex flex-col gap-4">
            {modules.map((mod, index) => {
              const isExpanded = expandedModules[mod.id] ?? false
              return (
                <div
                  key={mod.id}
                  className="border border-zinc-200 rounded-2xl overflow-hidden transition-all"
                >
                  {/* Module Header Bar */}
                  <div
                    onClick={() => toggleModule(mod.id)}
                    className="p-4 bg-zinc-50/80 hover:bg-zinc-100/80 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          mod.status === "Completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : mod.status === "In Progress"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-zinc-200 text-zinc-500"
                        }`}
                      >
                        {mod.status === "Completed" ? "✓" : index + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-zinc-900">
                          {mod.title}
                        </h4>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {mod.lessonCount} Lessons • {mod.duration}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          mod.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : mod.status === "In Progress"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {mod.status}
                      </span>
                      <span className="text-zinc-400 font-bold text-xs">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>

                  {/* Lessons list */}
                  {isExpanded && (
                    <div className="divide-y divide-zinc-100 bg-white">
                      {mod.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="p-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-purple-50/30 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-1 text-purple-600">
                              <Icon
                                name={
                                  lesson.type === "video"
                                    ? "play"
                                    : lesson.type === "lab"
                                      ? "sparkles"
                                      : "note"
                                }
                                size={14}
                              />
                            </span>
                            <div>
                              <div className="text-xs font-bold text-zinc-900">
                                {lesson.title}
                              </div>
                              <div className="text-[11px] text-zinc-500 mt-0.5">
                                {lesson.summary}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">
                              ⏱ {lesson.duration}
                            </span>
                            <button
                              onClick={() => {
                                setActiveLesson(lesson)
                                onToast(`Playing "${lesson.title}"...`)
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                lesson.status === "Completed"
                                  ? "border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                  : lesson.status === "In Progress"
                                    ? "bg-purple-700 text-white hover:bg-purple-800"
                                    : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                              }`}
                            >
                              {lesson.status === "Completed"
                                ? "Review"
                                : lesson.status === "In Progress"
                                  ? "▶ Resume"
                                  : "Start Lesson"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Tab 2: Learning Materials & Downloads */}
        {activeSubTab === "Materials" && (
          <div className="p-6">
            {previewMaterial ? (() => {
              const driveFileId = extractGoogleDriveFileId(
                previewMaterial.driveUrl || previewMaterial.driveId || previewMaterial.url
              )
              const drivePreviewUrl = driveFileId
                ? `https://drive.google.com/file/d/${driveFileId}/preview`
                : null
              const driveViewUrl = driveFileId
                ? `https://drive.google.com/file/d/${driveFileId}/view`
                : null
              const isAvailable = previewMaterial.isAvailable !== false
              const isPdfOrSlides =
                previewMaterial.type === "PDF" ||
                previewMaterial.type === "Slides" ||
                Boolean(driveFileId)

              return (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                  {/* Top Navigation & Breadcrumbs Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-zinc-200/80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setPreviewMaterial(null)}
                        className="px-4 py-1.5 rounded-full bg-zinc-100 hover:bg-[#F0EDFF] text-zinc-700 hover:text-[#5F2BC0] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <span>←</span>
                        <span>Back to Learning Materials</span>
                      </button>
                      <span className="text-zinc-300">/</span>
                      <span className="text-xs font-semibold text-zinc-500 truncate max-w-[260px]">
                        {previewMaterial.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {isAvailable && driveViewUrl && (
                        <a
                          href={driveViewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 rounded-full border border-purple-300 text-[#5F2BC0] text-xs font-bold hover:bg-purple-50 transition-colors cursor-pointer flex items-center gap-1"
                          title="Open original resource in Google Drive"
                        >
                          <span>Open in Drive</span>
                          <span>↗</span>
                        </a>
                      )}
                      <button
                        onClick={() =>
                          downloadSingleMaterial(
                            previewMaterial,
                            currentCourse.title,
                            onToast
                          )
                        }
                        disabled={!isAvailable}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                          !isAvailable
                            ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                            : "bg-[#905FEB] text-white hover:bg-[#7b46dc] cursor-pointer"
                        }`}
                      >
                        <span>📥</span>
                        <span>{isAvailable ? `Download (${previewMaterial.size})` : "Unavailable"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Document Header & Metadata Strip */}
                  <div className="p-4 bg-zinc-50/90 rounded-2xl border border-zinc-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            !isAvailable
                              ? "bg-amber-100 text-amber-800"
                              : previewMaterial.type === "PDF"
                              ? "bg-purple-100 text-purple-700"
                              : previewMaterial.type === "Code Notebook"
                              ? "bg-emerald-100 text-emerald-700"
                              : previewMaterial.type === "Dataset"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {previewMaterial.type}
                        </span>
                        {driveFileId && isAvailable && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0EDFF] text-[#5F2BC0] border border-purple-200">
                            Google Drive Document
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-400">
                          {previewMaterial.size} • {previewMaterial.date}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-zinc-900 leading-snug">
                        {previewMaterial.title}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 max-w-2xl">
                        {previewMaterial.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center">
                      {isAvailable ? (
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <span>✓</span> Verified Asset
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                          <span>⚠️</span> Storage Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preview Main Panel */}
                  <div className="flex flex-col gap-3 min-h-[420px]">
                    {/* CASE 1: Missing or Inaccessible Resource */}
                    {!isAvailable && (
                      <div className="p-6 rounded-2xl bg-amber-50/90 border border-amber-200 flex flex-col gap-3 text-amber-950">
                        <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                          <span className="text-xl">⚠️</span>
                          <span>Resource File Unavailable on Storage Server</span>
                        </div>
                        <p className="text-xs leading-relaxed text-amber-900">
                          {previewMaterial.errorMessage ||
                            `The requested asset "${previewMaterial.fileName || previewMaterial.title}" could not be retrieved from the configured cloud storage cluster.`}
                        </p>
                        <div className="p-3 bg-white/90 rounded-xl border border-amber-200 font-mono text-[11px] text-zinc-700 space-y-1">
                          <div>
                            <strong>Target Asset:</strong>{" "}
                            {previewMaterial.fileName || previewMaterial.title}
                          </div>
                          <div>
                            <strong>Server Status:</strong> HTTP 404 Not Found (Missing Blob Object)
                          </div>
                          <div>
                            <strong>Storage URL:</strong>{" "}
                            {previewMaterial.url || "s3://quantum-ai-assets/materials/pending_upload"}
                          </div>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          To preserve academic integrity, empty placeholder downloads are not served. Please notify Instructor Srimanth or use the course Q&A board.
                        </p>
                      </div>
                    )}

                    {/* CASE 2: Google Drive PDF Preview */}
                    {isAvailable && isPdfOrSlides && driveFileId && (
                      <div className="flex flex-col gap-3">
                        {/* Mode switcher & Drive link bar */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2.5 rounded-xl bg-[#F0EDFF]/80 border border-purple-200 text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewTab("drive")}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                previewTab === "drive"
                                  ? "bg-[#905FEB] text-white shadow-sm"
                                  : "bg-white text-purple-700 hover:bg-purple-100"
                              }`}
                            >
                              Google Drive Document Preview
                            </button>
                            <button
                              onClick={() => setPreviewTab("overview")}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                previewTab === "overview"
                                  ? "bg-[#905FEB] text-white shadow-sm"
                                  : "bg-white text-purple-700 hover:bg-purple-100"
                              }`}
                            >
                              Academic Syllabus Outline
                            </button>
                          </div>

                          {driveViewUrl && (
                            <a
                              href={driveViewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-[#5F2BC0] hover:text-[#905FEB] flex items-center gap-1 text-[11px] hover:underline"
                              title="Open original file on Google Drive in a new browser tab"
                            >
                              <span>Open in Google Drive</span>
                              <span>↗</span>
                            </a>
                          )}
                        </div>

                        {previewTab === "drive" ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-zinc-500 font-mono bg-zinc-100 px-3 py-1.5 rounded-lg flex items-center justify-between">
                              <span className="truncate">
                                Google Drive Preview: <strong>{previewMaterial.fileName || previewMaterial.title}</strong>
                              </span>
                              <span className="text-[10px] text-zinc-400 hidden sm:inline">
                                File ID: {driveFileId}
                              </span>
                            </div>

                            {/* Google Drive Preview Iframe */}
                            <div className="relative w-full h-[560px] rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 shadow-inner">
                              <iframe
                                src={drivePreviewUrl!}
                                className="w-full h-full border-0"
                                allow="autoplay"
                                title={previewMaterial.title}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="p-5 rounded-2xl bg-white border border-zinc-200 space-y-3 text-xs text-zinc-700">
                            <h5 className="font-bold text-sm text-zinc-900">
                              {previewMaterial.title}
                            </h5>
                            <p className="leading-relaxed">
                              {previewMaterial.description}
                            </p>
                            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 space-y-2">
                              <strong className="text-purple-900 block font-bold">
                                Key Curriculum Takeaways:
                              </strong>
                              <ul className="list-disc pl-4 space-y-1 text-zinc-600">
                                <li>Formal algorithmic formulation and computational complexity proofs.</li>
                                <li>Comparative benchmark analysis with state-of-the-art architectures.</li>
                                <li>Empirical validation results on canonical dataset benchmarks.</li>
                                <li>Recommended laboratory exercises and research references.</li>
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASE 3: Code Notebook (.ipynb / .py) */}
                    {isAvailable && previewMaterial.type === "Code Notebook" && (
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs">
                          <span className="font-mono text-zinc-600 truncate">
                            Jupyter Notebook · Python 3.11 Kernel (CUDA accelerated)
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(
                                `# ${previewMaterial.title}\nimport numpy as np\nimport torch\nprint('Kernel initialised successfully')`
                              )
                              setCopiedNotebookOrJson(true)
                              onToast("Code cells copied to clipboard!")
                              setTimeout(() => setCopiedNotebookOrJson(false), 2000)
                            }}
                            className="px-3 py-1 rounded-full bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1"
                          >
                            <span>{copiedNotebookOrJson ? "✓ Copied!" : "📋 Copy Code"}</span>
                          </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-zinc-900 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800 shadow-inner space-y-3">
                          <div className="text-zinc-500">// Cell [1] - Import dependencies & initialize embedding models</div>
                          <div className="text-purple-300">
                            import torch<br />
                            import numpy as np<br />
                            from sentence_transformers import SentenceTransformer, CrossEncoder
                          </div>
                          <div className="text-zinc-500 pt-2 border-t border-zinc-800">// Cell [2] - Reciprocal Rank Fusion Core Algorithm</div>
                          <div className="text-emerald-300">
                            def reciprocal_rank_fusion(ranked_lists, k=60):<br />
                            &nbsp;&nbsp;scores = &#123;&#125;<br />
                            &nbsp;&nbsp;for doc_list in ranked_lists:<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;for rank, doc in enumerate(doc_list):<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;scores[doc] = scores.get(doc, 0.0) + (1.0 / (k + rank + 1))<br />
                            &nbsp;&nbsp;return sorted(scores.items(), key=lambda x: x[1], reverse=True)
                          </div>
                          <div className="text-zinc-500 pt-2 border-t border-zinc-800">// Output [2]</div>
                          <div className="text-zinc-400 bg-zinc-800/60 p-2.5 rounded-lg">
                            ✓ RRF algorithm compiled in 0.002s. Latency speedup: 8.4x over Cross-Encoder forward pass.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CASE 4: Dataset Explorer (.json / .csv) */}
                    {isAvailable && previewMaterial.type === "Dataset" && (
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs">
                          <span className="font-mono text-zinc-600 truncate">
                            Dataset Records Preview · JSON Benchmark Array
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(
                                JSON.stringify(
                                  {
                                    dataset: previewMaterial.title,
                                    records: 1250,
                                    sample: {
                                      id: "eval-001",
                                      question: "Trade-offs of RRF vs Cross-Encoder",
                                      retrieverScore: 0.948,
                                    },
                                  },
                                  null,
                                  2
                                )
                              )
                              setCopiedNotebookOrJson(true)
                              onToast("Dataset records copied to clipboard!")
                              setTimeout(() => setCopiedNotebookOrJson(false), 2000)
                            }}
                            className="px-3 py-1 rounded-full bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1"
                          >
                            <span>{copiedNotebookOrJson ? "✓ Copied!" : "📋 Copy Dataset"}</span>
                          </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-zinc-900 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800 shadow-inner">
                          <span className="text-zinc-500">// {previewMaterial.title} - Benchmark Sample Records</span><br />
                          &#123;<br />
                          &nbsp;&nbsp;<span className="text-purple-400">"datasetName"</span>: <span className="text-amber-300">"{previewMaterial.title}"</span>,<br />
                          &nbsp;&nbsp;<span className="text-purple-400">"format"</span>: <span className="text-amber-300">"JSON-Lines"</span>,<br />
                          &nbsp;&nbsp;<span className="text-purple-400">"sampleRecords"</span>: [<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&#123;<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">"id"</span>: <span className="text-amber-300">"eval-001"</span>,<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">"question"</span>: <span className="text-amber-300">"What is the primary trade-off of Reciprocal Rank Fusion over Cross-Encoders?"</span>,<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">"retrieverScore"</span>: <span className="text-cyan-300">0.948</span>,<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">"groundTruthAnswer"</span>: <span className="text-emerald-400">"RRF calculates rank merges in O(N log N) without deep neural passes, reducing latency to under 15ms."</span><br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&#123;<br />
                          &nbsp;&nbsp;]<br />
                          &#125;
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preview Footer Actions */}
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-3 border-t border-zinc-200 mt-2">
                    <span className="text-xs text-zinc-500">
                      Ready for download: <strong>{previewMaterial.fileName || previewMaterial.title}</strong>
                    </span>
                    <div className="flex items-center gap-2 justify-end flex-wrap">
                      <button
                        type="button"
                        onClick={() => setPreviewMaterial(null)}
                        className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer transition-colors"
                      >
                        ← Back to Learning Materials
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          downloadSingleMaterial(
                            previewMaterial,
                            currentCourse.title,
                            onToast
                          )
                        }}
                        disabled={!isAvailable}
                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all shadow-sm ${
                          !isAvailable
                            ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                            : "bg-[#905FEB] text-white hover:bg-[#7b46dc] cursor-pointer"
                        }`}
                      >
                        {isAvailable
                          ? `📥 Download File (${previewMaterial.size})`
                          : "File Unavailable"}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })() : (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900">
                      Lecture Notes, Lab Notebooks & Datasets
                    </h4>
                    <p className="text-xs text-zinc-500">
                      Official course assets verified by Quantum School of AI.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      downloadCourseMaterialsZip(materials, currentCourse.title, onToast)
                    }
                    className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                    title="Download complete course assets archive"
                  >
                    <span>📥</span>
                    <span>Download All (.ZIP)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {materials.map((mat) => {
                    const isDriveFile = Boolean(
                      extractGoogleDriveFileId(mat.driveUrl || mat.driveId || mat.url)
                    )
                    const isAvailable = mat.isAvailable !== false

                    return (
                      <div
                        key={mat.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          !isAvailable
                            ? "border-amber-200 bg-amber-50/40"
                            : "border-zinc-100 bg-zinc-50/60 hover:bg-white hover:shadow-sm"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  !isAvailable
                                    ? "bg-amber-100 text-amber-800"
                                    : mat.type === "PDF"
                                    ? "bg-purple-100 text-purple-700"
                                    : mat.type === "Code Notebook"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : mat.type === "Dataset"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-purple-100 text-purple-700"
                                }`}
                              >
                                {mat.type}
                              </span>
                              {!isAvailable && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                  Missing from Storage
                                </span>
                              )}
                              {isDriveFile && isAvailable && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F0EDFF] text-[#5F2BC0] border border-purple-200">
                                  Google Drive
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400">
                              {mat.size} • {mat.date}
                            </span>
                          </div>
                          <h5 className="font-bold text-sm text-zinc-900 mb-1">
                            {mat.title}
                          </h5>
                          <p className="text-xs text-zinc-500 mb-2">{mat.description}</p>
                          {mat.fileName && (
                            <div className="text-[11px] text-zinc-400 font-mono truncate">
                              📄 {mat.fileName}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100">
                          <button
                            onClick={() =>
                              downloadSingleMaterial(mat, currentCourse.title, onToast)
                            }
                            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer text-center ${
                              !isAvailable
                                ? "bg-zinc-200 text-zinc-500 hover:bg-zinc-300"
                                : "bg-[#905FEB] text-white hover:bg-[#7b46dc]"
                            }`}
                          >
                            {!isAvailable ? "File Unavailable" : "Download File"}
                          </button>
                          <button
                            onClick={() => handleOpenPreview(mat)}
                            className="px-3 py-1.5 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                          >
                            Preview
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Discussion & Q&A */}
        {activeSubTab === "Discussion" && (
          <div className="p-6">
            {/* Ask Question Form */}
            <form
              onSubmit={handlePostQuestion}
              className="mb-6 p-4 rounded-2xl bg-zinc-50 border border-zinc-200"
            >
              <h4 className="font-bold text-sm text-zinc-900 mb-2">
                Ask a Question / Post to Discussion
              </h4>
              <textarea
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="Type your question about lecture concepts, lab setups, or assignment rubrics..."
                rows={3}
                className="w-full p-3 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-purple-600 mb-3"
              />
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-zinc-400">
                  Questions are answered by Srimanth and AI Assistant.
                </span>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors cursor-pointer"
                >
                  Post Question
                </button>
              </div>
            </form>

            {/* Questions Feed */}
            <div className="flex flex-col gap-4">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl border border-zinc-100 bg-white"
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                        {q.user.charAt(0)}
                      </span>
                      <span className="font-bold text-xs text-zinc-900">
                        {q.user}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">{q.time}</span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-800 my-2">
                    {q.text}
                  </p>
                  {q.answer && (
                    <div className="mt-3 p-3 rounded-xl bg-purple-50/80 border-l-2 border-purple-600 text-xs text-zinc-700">
                      <div className="font-bold text-purple-800 mb-1 flex items-center gap-1.5">
                        <span>👨‍🏫 Srimanth & AI Assistant</span>
                        <span className="text-[10px] font-normal text-purple-600">
                          · Instructor Verified
                        </span>
                      </div>
                      <p className="leading-relaxed">{q.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Self Notes */}
        {activeSubTab === "Notes" && (
          <div className="p-4 sm:p-6 flex flex-col gap-5">
            {/* Action Bar: Search, Lesson Filter, and Add Note Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200/80">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px]">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                    <Icon name="search" size={14} />
                  </span>
                  <input
                    type="text"
                    value={searchNote}
                    onChange={(e) => setSearchNote(e.target.value)}
                    placeholder="Search notes by title, topic, or tags..."
                    className="w-full pl-9 pr-7 py-2 text-xs rounded-full border border-zinc-200 bg-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all text-zinc-800"
                  />
                  {searchNote && (
                    <button
                      onClick={() => setSearchNote("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter by Lesson Dropdown */}
                {courseLessons.length > 0 && (
                  <StudentDropdown
                    value={selectedLessonFilter}
                    onChange={setSelectedLessonFilter}
                    className="min-w-[200px]"
                    options={[
                      { value: "All", label: `All Lessons & Topics (${notes.length})` },
                      ...courseLessons.map((les) => ({
                        value: les,
                        label: `Lesson: ${les.length > 35 ? les.slice(0, 35) + "..." : les}`,
                      })),
                    ]}
                  />
                )}
              </div>

              {/* Add Note Button */}
              <button
                onClick={() => handleOpenCreateNote()}
                className="px-4 py-2 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap self-start md:self-auto"
              >
                <span>+</span>
                <span>Add Self Note</span>
              </button>
            </div>

            {/* Notes List / Empty State */}
            {filteredNotes.length === 0 ? (
              <div className="p-8 sm:p-12 rounded-2xl bg-zinc-50/70 border border-dashed border-zinc-300 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-[#F0EDFF] text-[#905FEB] flex items-center justify-center text-2xl mb-3 shadow-inner">
                  📝
                </div>
                <h4 className="font-bold text-sm text-zinc-900 mb-1">
                  {searchNote || selectedLessonFilter !== "All"
                    ? "No notes match your filter"
                    : `No personal notes for ${currentCourse.title} yet`}
                </h4>
                <p className="text-xs text-zinc-500 max-w-md mb-4 leading-relaxed">
                  {searchNote || selectedLessonFilter !== "All"
                    ? "Try adjusting your search query or selecting 'All Lessons' to view your saved notes."
                    : "Capture lecture takeaways, algorithm formulations, code snippets, and study insights while progressing through this course."}
                </p>
                {searchNote || selectedLessonFilter !== "All" ? (
                  <button
                    onClick={() => {
                      setSearchNote("")
                      setSelectedLessonFilter("All")
                    }}
                    className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    Clear Search Filters
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenCreateNote()}
                    className="px-5 py-2.5 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <span>+</span>
                    <span>Create Your First Note</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Note Header: Lesson badge & Actions */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        {note.lesson ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F0E7FF] text-[#5F2BC0] border border-purple-200 truncate max-w-[240px]">
                            📖 {note.lesson}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                            📌 Course Note
                          </span>
                        )}

                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                          <button
                            onClick={() => handleOpenEditNote(note)}
                            className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-purple-100 hover:text-purple-700 flex items-center justify-center text-zinc-600 text-xs transition-colors cursor-pointer"
                            title="Edit note"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id, note.title)}
                            className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-red-100 hover:text-red-700 flex items-center justify-center text-zinc-600 text-xs transition-colors cursor-pointer"
                            title="Delete note"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Note Title */}
                      <h4 className="font-bold text-sm text-zinc-900 mb-1.5 leading-snug">
                        {note.title}
                      </h4>

                      {/* Note Content */}
                      <p className="text-xs text-zinc-600 leading-relaxed mb-3 whitespace-pre-line">
                        {note.content}
                      </p>

                      {/* Optional Code Snippet */}
                      {note.snippet && (
                        <div className="relative mb-3 bg-zinc-900 text-zinc-100 rounded-xl p-3 font-mono text-[11px] leading-relaxed border border-zinc-800">
                          <div className="flex justify-between items-center text-[10px] text-zinc-400 pb-1.5 mb-1.5 border-b border-zinc-800">
                            <span>Code / Reference Snippet</span>
                            <button
                              onClick={() => handleCopySnippet(note.id, note.snippet!)}
                              className="text-[10px] text-purple-400 hover:text-purple-200 font-sans font-bold cursor-pointer transition-colors"
                            >
                              {copiedSnippetId === note.id ? "✓ Copied" : "Copy Code"}
                            </button>
                          </div>
                          <pre className="overflow-x-auto scrollbar-none">{note.snippet}</pre>
                        </div>
                      )}
                    </div>

                    {/* Bottom Metadata & Tags */}
                    <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 mt-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 text-zinc-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        🕒 {note.lastModified}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Course Assignments */}
        {activeSubTab === "Assignments" && (
          <div className="p-4 sm:p-6 flex flex-col gap-5">
            {activeAssignment ? (
              /* =========================================================
                 DEDICATED ASSIGNMENT DETAIL VIEW (Replaces List)
                 ========================================================= */
              <div className="flex flex-col gap-6">
                {/* 1. Header Bar: Back button, breadcrumb, and status badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleBackToAssignmentsList}
                      className="px-3.5 py-1.5 rounded-full bg-zinc-100 hover:bg-purple-100 text-zinc-700 hover:text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <span>←</span>
                      <span>Back to Assignments</span>
                    </button>
                    <div className="text-xs text-zinc-400 hidden md:flex items-center gap-1.5">
                      <span className="truncate max-w-[180px]">{currentCourse.title}</span>
                      <span>/</span>
                      <span className="text-zinc-700 font-semibold truncate max-w-[220px]">
                        {activeAssignment.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                        activeAssignment.status === "Pending"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : activeAssignment.status === "Submitted"
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {activeAssignment.status === "Pending"
                        ? "⏳ Action Required: Pending"
                        : activeAssignment.status === "Submitted"
                          ? "🚀 Submitted · Under Faculty Review"
                          : "✓ Graded & Evaluated"}
                    </span>
                  </div>
                </div>

                {/* 2. Assignment Overview Card */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-200/90 shadow-xs flex flex-col gap-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F0E7FF] text-[#5F2BC0] border border-purple-200">
                        {currentCourse.title}
                      </span>
                      {activeAssignment.priority === "High" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          High Priority Milestone
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-zinc-900 leading-snug">
                      {activeAssignment.title}
                    </h2>
                  </div>

                  {/* 4 Metadata Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-zinc-50/90 rounded-xl p-3 border border-zinc-200/70">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                        Due Date
                      </span>
                      <span className="text-xs font-bold text-zinc-900 flex items-center gap-1">
                        <Icon name="calendar" size={13} />
                        <span>{activeAssignment.dueDate}</span>
                      </span>
                    </div>

                    <div className="bg-zinc-50/90 rounded-xl p-3 border border-zinc-200/70">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                        Maximum Marks
                      </span>
                      <span className="text-xs font-bold text-purple-700">
                        {activeAssignment.maxMarks} Marks (100%)
                      </span>
                    </div>

                    <div className="bg-zinc-50/90 rounded-xl p-3 border border-zinc-200/70">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                        Submission Formats
                      </span>
                      <span className="text-xs font-bold text-zinc-800">
                        PDF, DOCX, ZIP, PPTX
                      </span>
                    </div>

                    <div className="bg-zinc-50/90 rounded-xl p-3 border border-zinc-200/70">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                        Evaluation Type
                      </span>
                      <span className="text-xs font-bold text-emerald-700">
                        Faculty Graded
                      </span>
                    </div>
                  </div>

                  {/* Detailed Description & Instructions */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                      Assignment Instructions & Objectives:
                    </h4>
                    <div className="p-4 rounded-xl bg-zinc-50/90 border border-zinc-200/80 text-xs text-zinc-700 leading-relaxed space-y-2">
                      <p>{activeAssignment.description}</p>
                      <p className="text-zinc-600">
                        Please review all required laboratory dependencies, model configs, and dataset splits before submitting. Ensure your solution file includes modular source code, dependencies manifest, and a concise write-up documenting experimental methodology and benchmark comparisons.
                      </p>
                    </div>
                  </div>

                  {/* Reference Materials & Course Attachments */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                      Reference Materials & Course Attachments:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-white border border-zinc-200 flex items-center justify-between gap-2 hover:border-purple-300 transition-colors">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            ZIP
                          </span>
                          <div className="truncate">
                            <div className="text-xs font-bold text-zinc-800 truncate">
                              Starter_Code_Repository.zip
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              3.4 MB • Python & Notebooks
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToast("Downloading Starter_Code_Repository.zip...")}
                          className="px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-purple-100 text-[10px] font-bold text-purple-700 cursor-pointer flex-shrink-0"
                        >
                          Download
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-zinc-200 flex items-center justify-between gap-2 hover:border-purple-300 transition-colors">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            PDF
                          </span>
                          <div className="truncate">
                            <div className="text-xs font-bold text-zinc-800 truncate">
                              Milestone_Evaluation_Rubric.pdf
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              820 KB • Rubric Guidelines
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToast("Viewing Milestone_Evaluation_Rubric.pdf...")}
                          className="px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-purple-100 text-[10px] font-bold text-purple-700 cursor-pointer flex-shrink-0"
                        >
                          View Rubric
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Submission & Evaluation Section */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-200/90 shadow-xs flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                      <span>📤</span>
                      <span>Assignment Submission & Evaluation</span>
                    </h3>
                    <span className="text-[11px] font-medium text-zinc-500">
                      Due: {activeAssignment.dueDate}
                    </span>
                  </div>

                  {/* CASE 1: GRADED */}
                  {activeAssignment.status === "Graded" && (
                    <div className="flex flex-col gap-4">
                      {/* Score Highlight Box */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                            Final Evaluated Score
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
                              {activeAssignment.score} / {activeAssignment.maxMarks}
                            </span>
                            <span className="text-xs font-bold text-emerald-700">
                              ({Math.round(((activeAssignment.score || 0) / activeAssignment.maxMarks) * 100)}%)
                            </span>
                          </div>
                          <div className="text-xs text-emerald-800/80 mt-1">
                            ✓ Evaluated and certified by Faculty Mentor Srimanth
                          </div>
                        </div>

                        <div className="w-16 h-16 rounded-2xl bg-white border border-emerald-300 shadow-sm flex flex-col items-center justify-center self-start sm:self-auto">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">Grade</span>
                          <span className="text-2xl font-black text-emerald-700">{activeAssignment.grade}</span>
                        </div>
                      </div>

                      {/* Rubric Evaluation Breakdown */}
                      <div>
                        <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                          Evaluated Rubric Breakdown:
                        </h4>
                        <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
                          <div className="flex justify-between items-center p-3 bg-zinc-50 font-bold text-zinc-700 border-b border-zinc-200">
                            <span>Criterion</span>
                            <span>Score</span>
                          </div>
                          <div className="flex justify-between items-center p-3 border-b border-zinc-100 text-zinc-700">
                            <div>
                              <div className="font-semibold text-zinc-900">1. Architecture & Algorithmic Implementation</div>
                              <div className="text-[11px] text-zinc-500">Correct implementation of RAG vector index and retrieval pipeline</div>
                            </div>
                            <strong className="text-zinc-900 whitespace-nowrap">40 / 40</strong>
                          </div>
                          <div className="flex justify-between items-center p-3 border-b border-zinc-100 text-zinc-700">
                            <div>
                              <div className="font-semibold text-zinc-900">2. Code Quality, Modularity & Error Handling</div>
                              <div className="text-[11px] text-zinc-500">Clean Python functions, type hints, and exception fallbacks</div>
                            </div>
                            <strong className="text-zinc-900 whitespace-nowrap">28 / 30</strong>
                          </div>
                          <div className="flex justify-between items-center p-3 text-zinc-700">
                            <div>
                              <div className="font-semibold text-zinc-900">3. Experimental Benchmark Report & Tests</div>
                              <div className="text-[11px] text-zinc-500">Latency evaluation and unit test coverage documentation</div>
                            </div>
                            <strong className="text-zinc-900 whitespace-nowrap">30 / 30</strong>
                          </div>
                        </div>
                      </div>

                      {/* Instructor Feedback Box */}
                      {activeAssignment.feedback && (
                        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80 text-xs text-zinc-800">
                          <div className="font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                            <span>💬 Faculty Mentor Feedback</span>
                            <span className="text-[10px] font-normal text-purple-700">
                              · Instructor Srimanth
                            </span>
                          </div>
                          <p className="italic text-zinc-700 leading-relaxed bg-white/70 p-3 rounded-lg border border-purple-100 mt-2">
                            &ldquo;{activeAssignment.feedback}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Submitted Archive Details */}
                      <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 flex flex-col gap-1">
                        <span className="font-bold text-zinc-800">Submitted Artifact:</span>
                        <div className="text-zinc-700">
                          📁 File: <strong className="text-zinc-900">{activeAssignment.uploadedFileName || "solution_srimanth_rag.zip (4.8 MB)"}</strong>
                        </div>
                        {activeAssignment.repoUrl && (
                          <div className="text-purple-700 font-mono text-[11px]">
                            🔗 Repo: <a href={activeAssignment.repoUrl} target="_blank" rel="noreferrer" className="underline">{activeAssignment.repoUrl}</a>
                          </div>
                        )}
                        <div className="text-[10px] text-zinc-400 mt-1">
                          🔒 Grading completed. Resubmission is locked for this milestone.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CASE 2: SUBMITTED (Not Graded yet) & Not in Resubmitting Mode */}
                  {activeAssignment.status === "Submitted" && !isResubmitting && (
                    <div className="flex flex-col gap-4">
                      {/* Submission Confirmed Box */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/80 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#905FEB] text-white flex items-center justify-center text-lg flex-shrink-0 shadow-xs">
                            ✓
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-purple-950">
                              Assignment Submitted Successfully
                            </h4>
                            <p className="text-xs text-purple-900/80 mt-0.5">
                              Recorded on {activeAssignment.submissionDate || "Today"}. Awaiting faculty grading.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsResubmitting(true)}
                          className="px-4 py-2 rounded-full bg-white hover:bg-purple-100 text-purple-700 border border-purple-300 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
                        >
                          ↻ Resubmit / Replace File
                        </button>
                      </div>

                      {/* Submitted File Details */}
                      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs flex flex-col gap-2">
                        <span className="font-bold text-zinc-800">Your Submitted Deliverables:</span>
                        <div className="p-3 rounded-lg bg-white border border-zinc-200 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">📁</span>
                            <span className="font-semibold text-zinc-900">
                              {activeAssignment.uploadedFileName || "solution_archive.zip (4.2 MB)"}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Verified Upload
                          </span>
                        </div>

                        {activeAssignment.repoUrl && (
                          <div className="p-2.5 rounded-lg bg-white border border-zinc-200 font-mono text-[11px] text-purple-800 break-all">
                            🔗 Repository: <a href={activeAssignment.repoUrl} target="_blank" rel="noreferrer" className="underline">{activeAssignment.repoUrl}</a>
                          </div>
                        )}

                        {activeAssignment.comments && (
                          <div className="text-zinc-600 mt-1">
                            <span className="font-bold text-zinc-700">Student Comments: </span>
                            {activeAssignment.comments}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CASE 3: PENDING OR RESUBMITTING */}
                  {(activeAssignment.status === "Pending" || isResubmitting) && (
                    <form onSubmit={handleSubmitAssignmentInDetail} className="flex flex-col gap-4">
                      {isResubmitting && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex justify-between items-center">
                          <span>
                            <strong>Resubmission Mode:</strong> Submitting a new file will replace your previously uploaded file for this milestone.
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsResubmitting(false)}
                            className="text-xs font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer ml-3"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Error Alert Box */}
                      {submissionError && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center justify-between">
                          <span>⚠️ {submissionError}</span>
                          <button
                            type="button"
                            onClick={() => setSubmissionError(null)}
                            className="text-red-500 hover:text-red-800 text-xs font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* A. System File Picker Section */}
                      <div>
                        <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                          Upload Assignment File (PDF, DOC, DOCX, PPT, PPTX, ZIP) <span className="text-red-500">*</span>
                        </label>

                        {/* Hidden native input */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.ipynb,.py,.tar.gz,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip"
                          onChange={handleFileSelect}
                          className="hidden"
                        />

                        {/* Drop / Click Box */}
                        {!selectedFile ? (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-purple-300 hover:border-purple-600 rounded-2xl p-6 text-center bg-purple-50/20 hover:bg-purple-50/40 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group"
                          >
                            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                              📤
                            </div>
                            <div>
                              <div className="text-xs font-bold text-zinc-800">
                                Click to choose assignment file from your device
                              </div>
                              <div className="text-[11px] text-zinc-500 mt-0.5">
                                Supported formats: PDF, DOC, DOCX, PPT, PPTX, ZIP (Max file size: 50MB)
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                fileInputRef.current?.click()
                              }}
                              className="mt-1 px-4 py-1.5 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-xs font-bold shadow-xs cursor-pointer"
                            >
                              Browse Files
                            </button>
                          </div>
                        ) : (
                          /* Selected File Box with Name, Size, and Remove Option */
                          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
                                {selectedFile.name.split(".").pop() || "FILE"}
                              </div>
                              <div className="overflow-hidden">
                                <div className="text-xs font-bold text-zinc-900 truncate max-w-[240px] sm:max-w-md">
                                  {selectedFile.name}
                                </div>
                                <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                                  <span>{formatFileSize(selectedFile.size)}</span>
                                  <span>•</span>
                                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                                    <span>✓</span>
                                    <span>File validated & ready</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-1.5 rounded-full bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-semibold cursor-pointer"
                              >
                                Change File
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveSelectedFile}
                                className="px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold cursor-pointer"
                              >
                                ✕ Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* B. Optional Repository Link */}
                      <div>
                        <label className="block text-xs font-bold text-zinc-800 mb-1">
                          Project / GitHub Repository URL (Optional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-mono">
                            🔗
                          </span>
                          <input
                            type="url"
                            value={detailRepoUrl}
                            onChange={(e) => {
                              setDetailRepoUrl(e.target.value)
                              setSubmissionError(null)
                            }}
                            placeholder="https://github.com/your-username/course-lab-solution"
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-zinc-900"
                          />
                        </div>
                      </div>

                      {/* C. Student Comments */}
                      <div>
                        <label className="block text-xs font-bold text-zinc-800 mb-1">
                          Submission Notes / Comments for Instructor
                        </label>
                        <textarea
                          rows={2}
                          value={detailComments}
                          onChange={(e) => setDetailComments(e.target.value)}
                          placeholder="Include instructions on dependencies, virtual environment, or model checkpoints..."
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600 text-zinc-900 leading-relaxed"
                        />
                      </div>

                      {/* D. Action Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                        <div className="text-[11px] text-zinc-400">
                          {selectedFile ? "1 file staged for submission" : "Please choose a file to submit"}
                        </div>

                        <div className="flex items-center gap-2">
                          {isResubmitting && (
                            <button
                              type="button"
                              onClick={() => setIsResubmitting(false)}
                              className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="submit"
                            className="px-6 py-2 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                          >
                            <span>🚀</span>
                            <span>{isResubmitting ? "Submit Updated Solution" : "Submit Assignment"}</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              /* =========================================================
                 ASSIGNMENTS LIST VIEW
                 ========================================================= */
              <div className="flex flex-col gap-5">
                {/* Metrics Ribbon for Course Assignments */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-zinc-50/90 rounded-2xl p-3.5 border border-zinc-200/80 flex flex-col">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Total
                    </span>
                    <span className="text-xl font-bold text-zinc-900 mt-1">
                      {courseAssignments.length}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">Assigned projects</span>
                  </div>
                  <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-200/70 flex flex-col">
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                      Pending
                    </span>
                    <span className="text-xl font-bold text-amber-900 mt-1">
                      {courseAssignments.filter((a) => a.status === "Pending").length}
                    </span>
                    <span className="text-[10px] text-amber-700/80 mt-0.5">Action required</span>
                  </div>
                  <div className="bg-purple-50/60 rounded-2xl p-3.5 border border-purple-200/70 flex flex-col">
                    <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
                      Submitted
                    </span>
                    <span className="text-xl font-bold text-purple-900 mt-1">
                      {courseAssignments.filter((a) => a.status === "Submitted").length}
                    </span>
                    <span className="text-[10px] text-purple-700/80 mt-0.5">Awaiting review</span>
                  </div>
                  <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200/70 flex flex-col">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      Graded
                    </span>
                    <span className="text-xl font-bold text-emerald-900 mt-1">
                      {courseAssignments.filter((a) => a.status === "Graded").length}
                    </span>
                    <span className="text-[10px] text-emerald-700/80 mt-0.5">Evaluated with grade</span>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200/80">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {(["All", "Pending", "Submitted", "Graded"] as const).map((filterTab) => {
                      const count =
                        filterTab === "All"
                          ? courseAssignments.length
                          : courseAssignments.filter((a) => a.status === filterTab).length
                      const isActive = assignmentFilter === filterTab
                      return (
                        <button
                          key={filterTab}
                          onClick={() => setAssignmentFilter(filterTab)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            isActive
                              ? "bg-[#905FEB] text-white shadow-xs"
                              : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                          }`}
                        >
                          {filterTab} ({count})
                        </button>
                      )
                    })}
                  </div>

                  <div className="relative min-w-[220px]">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                      <Icon name="search" size={14} />
                    </span>
                    <input
                      type="text"
                      value={assignmentSearch}
                      onChange={(e) => setAssignmentSearch(e.target.value)}
                      placeholder="Search course assignments..."
                      className="w-full pl-9 pr-7 py-1.5 text-xs rounded-full border border-zinc-200 bg-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all text-zinc-800"
                    />
                    {assignmentSearch && (
                      <button
                        onClick={() => setAssignmentSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Assignments List / Empty State */}
                {filteredAssignments.length === 0 ? (
                  <div className="p-8 sm:p-12 rounded-2xl bg-zinc-50/70 border border-dashed border-zinc-300 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-full bg-[#F0EDFF] text-[#905FEB] flex items-center justify-center text-2xl mb-3 shadow-inner">
                      📄
                    </div>
                    <h4 className="font-bold text-sm text-zinc-900 mb-1">
                      {assignmentSearch || assignmentFilter !== "All"
                        ? "No assignments match your search filter"
                        : `No assignments assigned yet for ${currentCourse.title}`}
                    </h4>
                    <p className="text-xs text-zinc-500 max-w-md mb-4 leading-relaxed">
                      {assignmentSearch || assignmentFilter !== "All"
                        ? "Try resetting your filter to 'All' or searching for another term."
                        : "Course instructors publish coding assignments, laboratory reports, and capstone milestones here as the syllabus progresses."}
                    </p>
                    {(assignmentSearch || assignmentFilter !== "All") && (
                      <button
                        onClick={() => {
                          setAssignmentSearch("")
                          setAssignmentFilter("All")
                        }}
                        className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {filteredAssignments.map((asg) => {
                      const isPending = asg.status === "Pending"
                      const isSubmitted = asg.status === "Submitted"
                      const isGraded = asg.status === "Graded"

                      return (
                        <div
                          key={asg.id}
                          onClick={() => handleOpenAssignment(asg)}
                          className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-xs hover:shadow-md transition-all flex flex-col gap-3.5 cursor-pointer group"
                        >
                          {/* Top Row: Title, Priority, Status */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isPending
                                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : isSubmitted
                                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  }`}
                                >
                                  {asg.status === "Pending"
                                    ? "⏳ Pending Submission"
                                    : asg.status === "Submitted"
                                      ? "🚀 Submitted"
                                      : "✓ Graded"}
                                </span>

                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                                  {asg.maxMarks} Marks
                                </span>

                                {asg.priority === "High" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    High Priority
                                  </span>
                                )}
                              </div>

                              <h4 className="font-bold text-sm text-zinc-900 leading-snug group-hover:text-purple-700 transition-colors">
                                {asg.title}
                              </h4>
                            </div>

                            {/* Due Date Indicator */}
                            <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-semibold bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200 self-start">
                              <Icon name="calendar" size={13} />
                              <span>Due: <strong className="text-zinc-800">{asg.dueDate}</strong></span>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                            {asg.description}
                          </p>

                          {/* Submitted State Info Box */}
                          {isSubmitted && (
                            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 text-xs text-zinc-700 flex flex-col gap-1.5">
                              <div className="flex items-center justify-between font-bold text-purple-900">
                                <span className="flex items-center gap-1.5">
                                  <span>✓</span>
                                  <span>Submission Received</span>
                                </span>
                                <span className="text-[11px] font-normal text-purple-700">
                                  {asg.submissionDate || "Recently submitted"}
                                </span>
                              </div>
                              {asg.uploadedFileName && (
                                <div className="text-[11px] text-zinc-600">
                                  📁 File: <span className="font-semibold text-zinc-800">{asg.uploadedFileName}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Graded State Info Box */}
                          {isGraded && (
                            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-zinc-800 flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                                  <span>🏆</span>
                                  <span>Grade Awarded: {asg.grade}</span>
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-200/80 text-emerald-900">
                                  {asg.score} / {asg.maxMarks} Marks ({Math.round(((asg.score || 0) / asg.maxMarks) * 100)}%)
                                </span>
                              </div>
                              {asg.feedback && (
                                <div className="text-xs text-zinc-700 bg-white/80 p-2 rounded-lg border border-emerald-100 italic leading-relaxed line-clamp-2">
                                  &ldquo;{asg.feedback}&rdquo;
                                </div>
                              )}
                            </div>
                          )}

                          {/* Card Action Buttons */}
                          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 mt-1">
                            <span className="text-xs font-bold text-purple-700 group-hover:underline flex items-center gap-1">
                              <span>Open Assignment Details</span>
                              <span>→</span>
                            </span>

                            <div className="flex items-center gap-2">
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenAssignment(asg)
                                  }}
                                  className="px-4 py-1.5 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                                >
                                  <span>🚀</span>
                                  <span>Submit Solution</span>
                                </button>
                              )}

                              {isSubmitted && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenAssignment(asg)
                                  }}
                                  className="px-4 py-1.5 rounded-full bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                                >
                                  <span>↻</span>
                                  <span>View / Resubmit</span>
                                </button>
                              )}

                              {isGraded && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenAssignment(asg)
                                  }}
                                  className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                                >
                                  <span>✓</span>
                                  <span>View Graded Feedback</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Course Quizzes */}
        {activeSubTab === "Quizzes" && (
          <div className="p-4 sm:p-6 flex flex-col gap-5">
            {/* =========================================================================
                MODE A: QUIZ TAKING INTERFACE (REPLACES LIST)
                ========================================================================= */}
            {quizViewMode === "taking" && activeQuiz && (
              <div className="flex flex-col gap-5">
                {/* 1. Top Test Header Bar */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <button
                        type="button"
                        onClick={handleExitQuizTaking}
                        className="px-3 py-1 rounded-full bg-zinc-100 hover:bg-purple-100 text-zinc-700 hover:text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <span>←</span>
                        <span>Exit Quiz</span>
                      </button>
                      <span className="text-zinc-300">/</span>
                      <span className="text-xs font-semibold text-zinc-500 truncate max-w-[200px]">
                        {currentCourse.title}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug">
                      {activeQuiz.title}
                    </h2>
                  </div>

                  {/* Timer & Submit CTA */}
                  <div className="flex items-center gap-3 self-start md:self-auto">
                    <div
                      className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                        secondsLeft <= 120
                          ? "bg-rose-100 text-rose-700 border border-rose-300 animate-pulse"
                          : "bg-purple-100 text-purple-800 border border-purple-200"
                      }`}
                    >
                      <Icon name="clock" size={13} />
                      <span>{formatQuizTimer(secondsLeft)} Remaining</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSubmitModalOpen(true)}
                      className="px-5 py-2 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-xs font-bold cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <span>Submit Quiz</span>
                      <span>🚀</span>
                    </button>
                  </div>
                </div>

                {/* 2. Progress Tracker & Question Selector Ribbon */}
                <div className="p-4 rounded-2xl bg-zinc-50/90 border border-zinc-200/80 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-xs text-zinc-600 font-semibold">
                    <span>
                      Question <strong className="text-zinc-900 font-bold">{currentQIndex + 1}</strong> of {activeQuestions.length}
                    </span>
                    <span className="text-purple-700 font-bold">
                      {Object.keys(selectedAnswers).length} of {activeQuestions.length} Answered
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-zinc-200/70 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#905FEB] h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${((currentQIndex + 1) / (activeQuestions.length || 1)) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Question Navigator Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
                    {activeQuestions.map((_, idx) => {
                      const isCurrent = currentQIndex === idx
                      const isAnswered = selectedAnswers[idx] !== undefined

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentQIndex(idx)}
                          className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                            isCurrent
                              ? "bg-[#905FEB] text-white ring-2 ring-purple-300 ring-offset-1"
                              : isAnswered
                                ? "bg-purple-100 text-purple-800 hover:bg-purple-200"
                                : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                          }`}
                          title={`Go to Question ${idx + 1}`}
                        >
                          {idx + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 3. Main Question & Options Card */}
                {activeQuestions[currentQIndex] ? (
                  <div className="bg-white rounded-2xl p-5 sm:p-7 border border-zinc-200/90 shadow-xs flex flex-col gap-5">
                    {/* Topic and Difficulty Badges */}
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#F0EDFF] text-[#5F2BC0] text-xs font-bold flex items-center justify-center">
                          {currentQIndex + 1}
                        </span>
                        <span className="text-xs font-bold text-zinc-500">
                          Topic: <strong className="text-zinc-800 font-bold">{activeQuestions[currentQIndex].topic || "Course Knowledge"}</strong>
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                        {activeQuestions[currentQIndex].difficulty || "Medium"} • 1 Mark
                      </span>
                    </div>

                    {/* Question Prompt */}
                    <h3 className="font-bold text-sm sm:text-base text-zinc-900 leading-relaxed">
                      {activeQuestions[currentQIndex].question}
                    </h3>

                    {/* Single-Choice Radio Options */}
                    <div className="flex flex-col gap-2.5">
                      {activeQuestions[currentQIndex].options.map((option, optIdx) => {
                        const isSelected = selectedAnswers[currentQIndex] === optIdx
                        return (
                          <div
                            key={optIdx}
                            onClick={() => {
                              setSelectedAnswers((prev) => ({ ...prev, [currentQIndex]: optIdx }))
                            }}
                            className={`p-4 rounded-xl border text-xs flex items-center gap-3 transition-all cursor-pointer ${
                              isSelected
                                ? "border-[#905FEB] bg-purple-50/70 text-purple-950 font-bold ring-1 ring-purple-400 shadow-2xs"
                                : "border-zinc-200 hover:border-purple-300 hover:bg-purple-50/20 bg-white text-zinc-800"
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-[#905FEB] text-white"
                                  : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="leading-snug flex-1">{option}</span>
                            {isSelected && (
                              <span className="text-purple-700 font-extrabold text-sm ml-auto">
                                ✓
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Footer Navigation Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-100 mt-2">
                      <button
                        type="button"
                        disabled={currentQIndex === 0}
                        onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                        className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                          currentQIndex === 0
                            ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                            : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 cursor-pointer shadow-2xs"
                        }`}
                      >
                        <span>←</span>
                        <span>Previous Question</span>
                      </button>

                      <div className="text-[11px] text-zinc-400 hidden sm:block">
                        Auto-saving progress locally
                      </div>

                      {currentQIndex < activeQuestions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setCurrentQIndex((prev) => prev + 1)}
                          className="px-5 py-2 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        >
                          <span>Next Question</span>
                          <span>→</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsSubmitModalOpen(true)}
                          className="px-6 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        >
                          <span>Review & Submit</span>
                          <span>🚀</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-zinc-200">
                    <p className="text-xs text-zinc-500">No question data available.</p>
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                MODE B: QUIZ RESULTS & EXPLANATIONS REVIEW (REPLACES LIST)
                ========================================================================= */}
            {quizViewMode === "review" && activeQuiz && (
              <div className="flex flex-col gap-5">
                {/* 1. Header Bar with Back Button */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setQuizViewMode("list")
                          setSelectedQuizId(null)
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-zinc-100 hover:bg-purple-100 text-zinc-700 hover:text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <span>←</span>
                        <span>Back to Quizzes List</span>
                      </button>
                      <span className="text-zinc-300">/</span>
                      <span className="text-xs font-semibold text-zinc-500 truncate max-w-[200px]">
                        {currentCourse.title}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug">
                      Assessment Results: {activeQuiz.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartQuiz(activeQuiz)}
                      className="px-4 py-2 rounded-full bg-[#F0EDFF] hover:bg-[#E4DFFD] text-[#5F2BC0] text-xs font-bold border border-purple-200 transition-all cursor-pointer"
                    >
                      ↻ Retake Quiz
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuizViewMode("list")
                        setSelectedQuizId(null)
                      }}
                      className="px-4 py-2 rounded-full bg-[#111111] hover:bg-zinc-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      Close Review
                    </button>
                  </div>
                </div>

                {/* 2. Score Metrics Banner */}
                {activeAttempt ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-zinc-50/90 rounded-2xl p-4 border border-zinc-200/80 flex flex-col">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        Final Score
                      </span>
                      <span className="text-2xl font-black text-zinc-900 mt-1">
                        {activeAttempt.scoreStr}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">Total Points</span>
                    </div>

                    <div className="bg-zinc-50/90 rounded-2xl p-4 border border-zinc-200/80 flex flex-col">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        Percentage
                      </span>
                      <span
                        className={`text-2xl font-black mt-1 ${
                          activeAttempt.passed ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {activeAttempt.pct}%
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">
                        {activeQuiz.passingPct}% required to pass
                      </span>
                    </div>

                    <div className="bg-zinc-50/90 rounded-2xl p-4 border border-zinc-200/80 flex flex-col">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        Assessment Status
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-extrabold mt-1.5 px-2.5 py-0.5 rounded-full w-fit ${
                          activeAttempt.passed
                            ? "bg-[#E7FF9C] text-[#385000] border border-[#AEEB00]"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {activeAttempt.passed ? "✓ PASSED" : "✗ NEEDS RETAKE"}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-1">Verified Result</span>
                    </div>

                    <div className="bg-zinc-50/90 rounded-2xl p-4 border border-zinc-200/80 flex flex-col">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        Submitted At
                      </span>
                      <span className="text-xs font-bold text-zinc-800 mt-1.5 truncate">
                        {activeAttempt.submittedAt}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">Attempt #{activeAttempt.attemptNumber}</span>
                    </div>
                  </div>
                ) : null}

                {/* 3. Feedback Box */}
                {activeAttempt?.feedback && (
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-xs text-zinc-800">
                    <div className="font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                      <span>💬 Faculty Feedback & Evaluation Rationale</span>
                      <span className="text-[10px] font-normal text-purple-700">· Instructor Srimanth</span>
                    </div>
                    <p className="italic text-zinc-700 leading-relaxed bg-white/70 p-3 rounded-xl border border-purple-100 mt-2">
                      &ldquo;{activeAttempt.feedback}&rdquo;
                    </p>
                  </div>
                )}

                {/* 4. Question Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/80 p-3 rounded-2xl border border-zinc-200/80">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {(["All", "Correct", "Incorrect", "Unanswered"] as const).map((filterKey) => {
                      const count = activeQuestions.filter((q, idx) => {
                        const ans = activeAttempt?.answers[idx]
                        if (filterKey === "Correct") return ans === q.correctAnswer
                        if (filterKey === "Incorrect") return ans !== undefined && ans !== q.correctAnswer
                        if (filterKey === "Unanswered") return ans === undefined
                        return true
                      }).length

                      return (
                        <button
                          key={filterKey}
                          type="button"
                          onClick={() => setReviewFilter(filterKey)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            reviewFilter === filterKey
                              ? "bg-[#905FEB] text-white shadow-xs"
                              : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                          }`}
                        >
                          {filterKey} ({count})
                        </button>
                      )
                    })}
                  </div>

                  <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Correct
                    </span>
                    <span className="flex items-center gap-1 text-rose-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Incorrect
                    </span>
                  </div>
                </div>

                {/* 5. Question by Question Explanations List */}
                <div className="flex flex-col gap-4">
                  {activeQuestions
                    .filter((q, idx) => {
                      const ans = activeAttempt?.answers[idx]
                      if (reviewFilter === "Correct") return ans === q.correctAnswer
                      if (reviewFilter === "Incorrect") return ans !== undefined && ans !== q.correctAnswer
                      if (reviewFilter === "Unanswered") return ans === undefined
                      return true
                    })
                    .map((q) => {
                      const originalIndex = activeQuestions.findIndex((item) => item.id === q.id)
                      const selectedOptIndex = activeAttempt?.answers[originalIndex]
                      const isCorrect = selectedOptIndex === q.correctAnswer
                      const isUnanswered = selectedOptIndex === undefined

                      return (
                        <div
                          key={q.id}
                          className={`rounded-2xl p-5 border transition-all flex flex-col gap-3.5 ${
                            isCorrect
                              ? "border-emerald-200 bg-white"
                              : isUnanswered
                                ? "border-zinc-200 bg-zinc-50/50"
                                : "border-rose-200 bg-white"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-100">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold flex items-center justify-center">
                                {originalIndex + 1}
                              </span>
                              <span className="text-xs font-bold text-zinc-500">
                                Topic: <strong className="text-zinc-800">{q.topic || "Core Concept"}</strong>
                              </span>
                            </div>

                            <span
                              className={`px-3 py-0.5 rounded-full text-xs font-black flex items-center gap-1 ${
                                isCorrect
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : isUnanswered
                                    ? "bg-zinc-100 text-zinc-600 border border-zinc-200"
                                    : "bg-rose-100 text-rose-800 border border-rose-200"
                              }`}
                            >
                              {isCorrect ? "✓ Correct (+1 Mark)" : isUnanswered ? "○ Not Answered (0 Marks)" : "✗ Incorrect (0 Marks)"}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-zinc-900 leading-relaxed">
                            {q.question}
                          </h4>

                          {/* Options */}
                          <div className="flex flex-col gap-2">
                            {q.options.map((opt, optIdx) => {
                              const isStudentChoice = selectedOptIndex === optIdx
                              const isCorrectAnswer = q.correctAnswer === optIdx

                              let styleClasses = "border-zinc-200 bg-zinc-50/40 text-zinc-700"
                              let badge = null

                              if (isStudentChoice && isCorrectAnswer) {
                                styleClasses = "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold shadow-2xs"
                                badge = (
                                  <span className="ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                                    Your Answer (Correct)
                                  </span>
                                )
                              } else if (isStudentChoice && !isCorrectAnswer) {
                                styleClasses = "border-rose-400 bg-rose-50/80 text-rose-950 font-bold shadow-2xs"
                                badge = (
                                  <span className="ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                                    Your Answer (Incorrect)
                                  </span>
                                )
                              } else if (!isStudentChoice && isCorrectAnswer) {
                                styleClasses = "border-emerald-400 bg-emerald-50/40 text-emerald-900 font-semibold"
                                badge = (
                                  <span className="ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    Correct Answer
                                  </span>
                                )
                              }

                              return (
                                <div
                                  key={optIdx}
                                  className={`p-3 rounded-xl border text-xs flex items-center gap-3 transition-colors ${styleClasses}`}
                                >
                                  <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${
                                      isStudentChoice && isCorrectAnswer
                                        ? "bg-emerald-600 text-white"
                                        : isStudentChoice && !isCorrectAnswer
                                          ? "bg-rose-600 text-white"
                                          : isCorrectAnswer
                                            ? "bg-emerald-600 text-white"
                                            : "bg-zinc-200 text-zinc-600"
                                    }`}
                                  >
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className="leading-snug">{opt}</span>
                                  {badge}
                                </div>
                              )
                            })}
                          </div>

                          {/* Concept Explanation Box */}
                          <div className="p-3.5 rounded-xl bg-[#F0EDFF] border border-[#D8CFFF] text-xs mt-1">
                            <div className="flex items-center gap-1.5 text-[#5F2BC0] font-bold mb-1">
                              <span>💡</span>
                              <span>Concept Explanation & Rationale:</span>
                            </div>
                            <p className="text-[#33295A] leading-relaxed">
                              {q.explanation}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* =========================================================================
                MODE C: COURSE QUIZZES LIST VIEW (DEFAULT)
                ========================================================================= */}
            {quizViewMode === "list" && (
              <div className="flex flex-col gap-5">
                {/* 1. Metrics Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-zinc-50/90 rounded-2xl p-3.5 border border-zinc-200/80 flex flex-col">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Total Quizzes
                    </span>
                    <span className="text-xl font-bold text-zinc-900 mt-1">
                      {courseQuizzes.length}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">Course assessments</span>
                  </div>

                  <div className="bg-[#E7FF9C]/40 rounded-2xl p-3.5 border border-[#AEEB00]/60 flex flex-col">
                    <span className="text-[11px] font-bold text-[#385000] uppercase tracking-wider">
                      Available
                    </span>
                    <span className="text-xl font-bold text-[#182600] mt-1">
                      {courseQuizzes.filter((q) => (q.status === "Active" || (q.status as string) === "Available") && !savedProgressMap[q.id]).length}
                    </span>
                    <span className="text-[10px] text-[#385000]/80 mt-0.5">Ready to attempt</span>
                  </div>

                  <div className="bg-purple-50/60 rounded-2xl p-3.5 border border-purple-200/70 flex flex-col">
                    <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
                      In Progress
                    </span>
                    <span className="text-xl font-bold text-purple-900 mt-1">
                      {courseQuizzes.filter((q) => !q.score && !!savedProgressMap[q.id]).length}
                    </span>
                    <span className="text-[10px] text-purple-700/80 mt-0.5">Saved draft session</span>
                  </div>

                  <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200/70 flex flex-col">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      Completed
                    </span>
                    <span className="text-xl font-bold text-emerald-900 mt-1">
                      {courseQuizzes.filter((q) => q.status === "Completed").length}
                    </span>
                    <span className="text-[10px] text-emerald-700/80 mt-0.5">Evaluated with grade</span>
                  </div>
                </div>

                {/* 2. Filter & Search Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200/80">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {(["All", "Available", "In Progress", "Completed", "Upcoming"] as const).map((f) => {
                      const count = courseQuizzes.filter((q) => {
                        const inProg = !q.score && !!savedProgressMap[q.id]
                        if (f === "All") return true
                        if (f === "In Progress") return inProg
                        if (f === "Completed") return q.status === "Completed"
                        if (f === "Upcoming") return q.status === "Upcoming"
                        if (f === "Available") return (q.status === "Active" || (q.status as string) === "Available") && !inProg
                        return true
                      }).length

                      const isActive = quizFilter === f
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setQuizFilter(f)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            isActive
                              ? "bg-[#905FEB] text-white shadow-xs"
                              : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                          }`}
                        >
                          {f} ({count})
                        </button>
                      )
                    })}
                  </div>

                  <div className="relative min-w-[220px]">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                      <Icon name="search" size={14} />
                    </span>
                    <input
                      type="text"
                      value={quizSearch}
                      onChange={(e) => setQuizSearch(e.target.value)}
                      placeholder="Search course quizzes..."
                      className="w-full pl-9 pr-7 py-1.5 text-xs rounded-full border border-zinc-200 bg-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all text-zinc-800"
                    />
                    {quizSearch && (
                      <button
                        onClick={() => setQuizSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Quizzes List Cards */}
                {filteredCourseQuizzes.length === 0 ? (
                  <div className="p-8 sm:p-12 rounded-2xl bg-zinc-50/70 border border-dashed border-zinc-300 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-full bg-[#F0EDFF] text-[#905FEB] flex items-center justify-center text-2xl mb-3 shadow-inner">
                      🎯
                    </div>
                    <h4 className="font-bold text-sm text-zinc-900 mb-1">
                      {quizSearch || quizFilter !== "All"
                        ? "No quizzes match your filter"
                        : `No quizzes scheduled yet for ${currentCourse.title}`}
                    </h4>
                    <p className="text-xs text-zinc-500 max-w-md mb-4 leading-relaxed">
                      {quizSearch || quizFilter !== "All"
                        ? "Try resetting your filter or searching for another term."
                        : "Course instructors publish multiple-choice knowledge checks and midterm evaluations here as syllabus modules conclude."}
                    </p>
                    {(quizSearch || quizFilter !== "All") && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuizSearch("")
                          setQuizFilter("All")
                        }}
                        className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {filteredCourseQuizzes.map((quiz) => {
                      const hasSaved = !quiz.score && !!savedProgressMap[quiz.id]
                      const isCompleted = quiz.status === "Completed"
                      const isUpcoming = quiz.status === "Upcoming"
                      const isAvailable = (quiz.status === "Active" || (quiz.status as string) === "Available") && !hasSaved

                      return (
                        <div
                          key={quiz.id}
                          className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-xs hover:shadow-md transition-all flex flex-col gap-3.5 group"
                        >
                          {/* Top Row: Title, Badges, Due Date */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isCompleted
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : hasSaved
                                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                                        : isUpcoming
                                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                                          : "bg-[#E7FF9C] text-[#385000] border border-[#AEEB00]"
                                  }`}
                                >
                                  {isCompleted
                                    ? "✓ Completed & Graded"
                                    : hasSaved
                                      ? "⏳ In Progress (Draft Saved)"
                                      : isUpcoming
                                        ? "🔒 Upcoming Window"
                                        : "✓ Available to Take"}
                                </span>

                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                                  {quiz.questionCount} Questions
                                </span>

                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                                  {quiz.durationMinutes} Minutes
                                </span>
                              </div>

                              <h4 className="font-bold text-sm text-zinc-900 leading-snug group-hover:text-purple-700 transition-colors">
                                {quiz.title}
                              </h4>
                            </div>

                            {/* Due date or window info */}
                            <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-semibold bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200 self-start">
                              <Icon name="calendar" size={13} />
                              <span>
                                {isUpcoming ? "Opens: " : "Due: "}
                                <strong className="text-zinc-800">{isUpcoming ? quiz.availableFrom || quiz.dueDate : quiz.dueDate}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Details Metadata Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-zinc-600">
                            <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                              <span className="text-[10px] text-zinc-400 block font-semibold">Passing Threshold</span>
                              <strong className="text-zinc-800">{quiz.passingPct}% Minimum</strong>
                            </div>
                            <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                              <span className="text-[10px] text-zinc-400 block font-semibold">Total Points</span>
                              <strong className="text-zinc-800">{quiz.questionCount} Marks (100%)</strong>
                            </div>
                            <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                              <span className="text-[10px] text-zinc-400 block font-semibold">Format</span>
                              <strong className="text-zinc-800">Multiple Choice (Single)</strong>
                            </div>
                            <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                              <span className="text-[10px] text-zinc-400 block font-semibold">Permitted Attempts</span>
                              <strong className="text-zinc-800">1 Evaluation Attempt</strong>
                            </div>
                          </div>

                          {/* Saved draft alert */}
                          {hasSaved && (
                            <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200/80 text-xs text-purple-900 flex items-center justify-between">
                              <span className="flex items-center gap-1.5 font-medium">
                                <span>💾</span>
                                <span>
                                  You have an unfinished session ({Object.keys(savedProgressMap[quiz.id].answers).length} of {quiz.questionCount} answered). Your selections are saved!
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartQuiz(quiz)}
                                className="px-3 py-1 rounded-full bg-[#905FEB] text-white text-xs font-bold hover:bg-[#7E4BDC] cursor-pointer shadow-2xs whitespace-nowrap ml-2"
                              >
                                Resume Now →
                              </button>
                            </div>
                          )}

                          {/* Completed info banner */}
                          {isCompleted && (
                            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-zinc-800 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-base">🏆</span>
                                <div>
                                  <span className="font-bold text-emerald-900">
                                    Final Evaluation Score: {quiz.score || "10/10"} ({quiz.pct || 100}%)
                                  </span>
                                  <span className="text-[11px] text-emerald-700 block">
                                    ✓ Graded by Automated Evaluation Engine
                                  </span>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#E7FF9C] text-[#385000] border border-[#AEEB00]">
                                PASSED
                              </span>
                            </div>
                          )}

                          {/* Card Footer Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 mt-1">
                            <span className="text-xs text-zinc-400">
                              Quantum LMS Secure Evaluation Environment
                            </span>

                            <div className="flex items-center gap-2">
                              {isAvailable && (
                                <button
                                  type="button"
                                  onClick={() => handleStartQuiz(quiz)}
                                  className="px-5 py-2 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                                >
                                  <span>Start Quiz</span>
                                  <span>→</span>
                                </button>
                              )}

                              {hasSaved && (
                                <button
                                  type="button"
                                  onClick={() => handleStartQuiz(quiz)}
                                  className="px-5 py-2 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                                >
                                  <span>Resume Quiz</span>
                                  <span>→</span>
                                </button>
                              )}

                              {isCompleted && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReview(quiz)}
                                  className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                                >
                                  <span>Review Results & Feedback</span>
                                  <span>→</span>
                                </button>
                              )}

                              {isUpcoming && (
                                <div className="px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
                                  <span>🔒</span>
                                  <span>Unlocks on {quiz.availableFrom || quiz.dueDate}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Submission Confirmation Modal */}
            {isSubmitModalOpen && activeQuiz && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
                onClick={() => setIsSubmitModalOpen(false)}
              >
                <div
                  className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                        ❓
                      </span>
                      <h3 className="font-bold text-base text-zinc-900">
                        Submit Quiz Assessment?
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSubmitModalOpen(false)}
                      className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 text-xs text-zinc-600 mb-5">
                    <p className="leading-relaxed">
                      You are about to finalize your answers for <strong className="text-zinc-900 font-bold">{activeQuiz.title}</strong>.
                    </p>

                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex justify-between items-center">
                      <span>Questions Answered:</span>
                      <span className="font-extrabold text-sm text-purple-900">
                        {Object.keys(selectedAnswers).length} of {activeQuestions.length}
                      </span>
                    </div>

                    {Object.keys(selectedAnswers).length < activeQuestions.length && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-medium">
                        ⚠️ <strong>Warning:</strong> You have {activeQuestions.length - Object.keys(selectedAnswers).length} unanswered questions. Unanswered questions will receive 0 marks.
                      </div>
                    )}

                    <p className="text-[11px] text-zinc-400">
                      Once submitted, your responses will be evaluated immediately and your score recorded to your course grade profile.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setIsSubmitModalOpen(false)}
                      className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                    >
                      Cancel & Review
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFinalSubmitQuiz(false)}
                      className="px-5 py-2 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-xs font-bold cursor-pointer shadow-sm"
                    >
                      Confirm & Submit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Lecture Player Modal */}
      {activeLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setActiveLesson(null)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <div>
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                  Quantum Video Player · {activeLesson.type}
                </span>
                <h3 className="font-bold text-base text-zinc-900">
                  {activeLesson.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveLesson(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            {/* Video Player Canvas Simulation */}
            <div className="w-full h-64 bg-zinc-950 rounded-2xl flex flex-col items-center justify-center text-white relative overflow-hidden mb-4 shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
              <div className="z-10 text-center p-6">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isPlaying
                    setIsPlaying(next)
                    onToast(next ? `Resumed "${activeLesson.title}"` : `Paused video lecture`)
                  }}
                  className="w-14 h-14 rounded-full bg-purple-600/90 hover:bg-purple-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg hover:scale-105 transition-transform cursor-pointer"
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                >
                  {isPlaying ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <Icon name="play" size={24} />
                  )}
                </button>
                <div className="font-bold text-sm">{activeLesson.title}</div>
                <div className="text-xs text-zinc-400 mt-1">
                  Instructor: Srimanth · High Definition 1080p Stream · {isPlaying ? "▶ Playing" : "⏸ Paused"}
                </div>
              </div>
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-zinc-300 z-10">
                <span>{isPlaying ? "05:42" : "04:12"} / {activeLesson.duration}</span>
                <button
                  type="button"
                  onClick={() => {
                    const speeds = ["1.0x", "1.25x", "1.5x", "2.0x"]
                    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length
                    const nextSpeed = speeds[nextIdx]
                    setPlaybackSpeed(nextSpeed)
                    onToast(`Playback speed set to ${nextSpeed}`)
                  }}
                  className="font-bold text-purple-400 hover:text-purple-200 cursor-pointer bg-black/40 px-2 py-0.5 rounded-md"
                  title="Cycle playback speed"
                >
                  {playbackSpeed} Speed
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 mb-4">
              <strong className="text-zinc-900 block mb-1">
                Lesson Key Takeaways:
              </strong>
              {activeLesson.summary}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsPlaying(false)
                  setActiveLesson(null)
                }}
                className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                Close Player
              </button>
              <button
                onClick={() => {
                  setIsPlaying(false)
                  onToast(
                    `Marked "${activeLesson.title}" as completed! (+10 XP)`,
                  )
                  setActiveLesson(null)
                }}
                className="px-5 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-sm"
              >
                ✓ Mark Lesson Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Self Note Create / Edit Modal */}
      {isNoteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsNoteModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#F0EDFF] text-[#905FEB] flex items-center justify-center text-sm font-bold">
                  📝
                </span>
                <h3 className="font-bold text-base text-zinc-900">
                  {editingNote ? "Edit Personal Note" : "Create New Self Note"}
                </h3>
              </div>
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Note Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={noteFormTitle}
                  onChange={(e) => setNoteFormTitle(e.target.value)}
                  placeholder="e.g., Vector Index Configurations & RAG Benchmarks"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Associated Lesson / Topic
                  </label>
                  <StudentDropdown
                    value={noteFormLesson}
                    onChange={setNoteFormLesson}
                    options={[
                      { value: "General / Course Overview", label: "General / Course Overview" },
                      ...courseLessons.map((les) => ({
                        value: les,
                        label: les.length > 35 ? les.slice(0, 35) + "..." : les,
                      })),
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={noteFormTags}
                    onChange={(e) => setNoteFormTags(e.target.value)}
                    placeholder="e.g., RAG, Latency, Exam"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Note Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={noteFormContent}
                  onChange={(e) => setNoteFormContent(e.target.value)}
                  placeholder="Write your study notes, key takeaways, formulas, or questions here..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-zinc-900 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Optional Code / Reference Snippet
                </label>
                <textarea
                  rows={3}
                  value={noteFormSnippet}
                  onChange={(e) => setNoteFormSnippet(e.target.value)}
                  placeholder="Paste Python, SQL, or shell snippets..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 font-mono focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-zinc-900 bg-zinc-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#905FEB] hover:bg-[#7E4BDC] text-white text-xs font-bold cursor-pointer shadow-sm"
                >
                  {editingNote ? "Save Changes" : "Save Personal Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

