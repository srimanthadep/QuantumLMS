import type {
  ContentSubmissionRecord,
  CreateAssignmentInput,
  CreateQuizInput,
  UploadMaterialInput,
  ContentApprovalStatus,
} from "./teacherContentWorkflowTypes"
import { initialCourses } from "../../data/mockData"

const STORAGE_KEY = "quantum_teacher_content_submissions_v1"

/**
 * Initial mock submissions seeded on first run to simulate realistic workflow states:
 * - Approved
 * - Pending Approval
 * - Changes Requested (with Admin feedback)
 * - Rejected (with Admin feedback)
 * - Draft
 */
const SEED_SUBMISSIONS: ContentSubmissionRecord[] = [
  {
    id: "sub-seed-1",
    title: "AI Ethics & Algorithmic Bias Matrix",
    type: "assignment",
    courseId: "c1",
    courseCode: "QAI-Y401",
    courseName: "Year 4 Elementary STEM & AI",
    moduleId: "m1",
    moduleTitle: "Introduction to Artificial Intelligence & Pattern Recognition",
    teacherId: "teacher-srimanth",
    teacherName: "Srimanth",
    status: "approved",
    createdAt: "2026-10-20T09:30:00.000Z",
    submittedAt: "2026-10-20T10:15:00.000Z",
    updatedAt: "2026-10-21T14:00:00.000Z",
    version: 1,
    adminFeedback: "Approved by Academic Administration. Curriculum objectives verified for Year 4 AI cohort.",
    history: [
      {
        timestamp: "2026-10-20T09:30:00.000Z",
        action: "created",
        actor: "Srimanth (Lead Educator)",
        notes: "Initial draft created.",
      },
      {
        timestamp: "2026-10-20T10:15:00.000Z",
        action: "submitted",
        actor: "Srimanth (Lead Educator)",
        notes: "Submitted for Curriculum Director review.",
      },
      {
        timestamp: "2026-10-21T14:00:00.000Z",
        action: "approved",
        actor: "Dr. Sarah Chan (Curriculum Admin)",
        notes: "Approved and published to Year 4 cohort.",
      },
    ],
    assignmentData: {
      description: "Analyze ethical frameworks and identify algorithmic bias in real-world facial recognition datasets.",
      instructions: "1. Review the case study.\n2. Complete the 3-part bias assessment grid.\n3. Submit PDF or markdown summary by the deadline.",
      maxMarks: 100,
      dueDate: "2026-11-05",
      dueTime: "23:59",
      attachmentName: "AI_Ethics_Matrix_Template.pdf",
      attachmentSize: "1.4 MB",
      attachmentType: "application/pdf",
    },
  },
  {
    id: "sub-seed-2",
    title: "Python Loops & List Comprehension Checkpoint",
    type: "quiz",
    courseId: "c2",
    courseCode: "QAI-PY201",
    courseName: "Python & Computational Thinking",
    moduleId: "m1",
    moduleTitle: "Foundational Syntax, Variables & Flow Control",
    teacherId: "teacher-srimanth",
    teacherName: "Srimanth",
    status: "pending_approval",
    createdAt: "2026-10-27T11:00:00.000Z",
    submittedAt: "2026-10-27T11:45:00.000Z",
    updatedAt: "2026-10-27T11:45:00.000Z",
    version: 1,
    adminFeedback: undefined,
    history: [
      {
        timestamp: "2026-10-27T11:00:00.000Z",
        action: "created",
        actor: "Srimanth (Lead Educator)",
        notes: "Drafted 5 multiple-choice questions.",
      },
      {
        timestamp: "2026-10-27T11:45:00.000Z",
        action: "submitted",
        actor: "Srimanth (Lead Educator)",
        notes: "Awaiting Admin approval queue verification.",
      },
    ],
    quizData: {
      description: "Formative quiz testing students' mastery of for-loops, while-loops, and list comprehension shortcuts.",
      instructions: "Answer all questions. You have 25 minutes. Once submitted, your score will be calculated automatically upon Admin release.",
      timeLimitMinutes: 25,
      maxAttempts: 2,
      totalMarks: 25,
      questions: [
        {
          id: "q1",
          questionText: "What does [x**2 for x in range(4)] produce in Python?",
          marks: 5,
          correctOptionId: "opt-2",
          options: [
            { id: "opt-1", text: "[1, 4, 9, 16]" },
            { id: "opt-2", text: "[0, 1, 4, 9]" },
            { id: "opt-3", text: "[0, 2, 4, 6]" },
            { id: "opt-4", text: "[1, 2, 3, 4]" },
          ],
        },
        {
          id: "q2",
          questionText: "Which keyword is used to terminate a while-loop immediately?",
          marks: 5,
          correctOptionId: "opt-3",
          options: [
            { id: "opt-1", text: "continue" },
            { id: "opt-2", text: "pass" },
            { id: "opt-3", text: "break" },
            { id: "opt-4", text: "exit" },
          ],
        },
        {
          id: "q3",
          questionText: "What is the time complexity of looking up a key in a Python dictionary?",
          marks: 5,
          correctOptionId: "opt-1",
          options: [
            { id: "opt-1", text: "O(1) average time" },
            { id: "opt-2", text: "O(n) linear time" },
            { id: "opt-3", text: "O(log n)" },
            { id: "opt-4", text: "O(n^2)" },
          ],
        },
        {
          id: "q4",
          questionText: "How do you access the last element in a Python list named `items`?",
          marks: 5,
          correctOptionId: "opt-4",
          options: [
            { id: "opt-1", text: "items[last]" },
            { id: "opt-2", text: "items[items.length]" },
            { id: "opt-3", text: "items.end()" },
            { id: "opt-4", text: "items[-1]" },
          ],
        },
        {
          id: "q5",
          questionText: "What does range(2, 8, 2) evaluate to?",
          marks: 5,
          correctOptionId: "opt-1",
          options: [
            { id: "opt-1", text: "2, 4, 6" },
            { id: "opt-2", text: "2, 4, 6, 8" },
            { id: "opt-3", text: "2, 3, 4, 5, 6, 7" },
            { id: "opt-4", text: "0, 2, 4, 6" },
          ],
        },
      ],
    },
  },
  {
    id: "sub-seed-3",
    title: "Reinforcement Learning Lab 2 Experiment Report",
    type: "assignment",
    courseId: "c1",
    courseCode: "QAI-Y401",
    courseName: "Year 4 Elementary STEM & AI",
    moduleId: "m2",
    moduleTitle: "Perception Sensors, Neural Networks & Learning Loops",
    teacherId: "teacher-srimanth",
    teacherName: "Srimanth",
    status: "changes_requested",
    createdAt: "2026-10-24T14:20:00.000Z",
    submittedAt: "2026-10-24T15:00:00.000Z",
    updatedAt: "2026-10-25T16:30:00.000Z",
    version: 1,
    adminFeedback: "Please add a detailed grading rubric for Section 3 (Reward Function Analysis) and specify whether pair/group work is permitted before publication to students.",
    history: [
      {
        timestamp: "2026-10-24T14:20:00.000Z",
        action: "created",
        actor: "Srimanth (Lead Educator)",
      },
      {
        timestamp: "2026-10-24T15:00:00.000Z",
        action: "submitted",
        actor: "Srimanth (Lead Educator)",
      },
      {
        timestamp: "2026-10-25T16:30:00.000Z",
        action: "changes_requested",
        actor: "School Admin (Dean of STEM)",
        notes: "Missing evaluation rubric for Section 3.",
      },
    ],
    assignmentData: {
      description: "Students simulate an agent navigating a grid environment and evaluate Q-learning vs SARSA policies.",
      instructions: "Implement the Python environment script and write a 2-page reflection on hyperparameter convergence.",
      maxMarks: 50,
      dueDate: "2026-11-12",
      dueTime: "18:00",
      attachmentName: "GridWorld_Simulation_Starter.zip",
      attachmentSize: "3.2 MB",
      attachmentType: "application/zip",
    },
  },
  {
    id: "sub-seed-4",
    title: "Legacy Arduino Micro-controller Pinout Guide (2023 Edition)",
    type: "material",
    courseId: "c3",
    courseCode: "QAI-ROB101",
    courseName: "Robotics & Physical Systems",
    moduleId: "m1",
    moduleTitle: "Micro-controllers, PWM Motor Drivers & Sensors",
    teacherId: "teacher-srimanth",
    teacherName: "Srimanth",
    status: "rejected",
    createdAt: "2026-10-22T08:00:00.000Z",
    submittedAt: "2026-10-22T08:30:00.000Z",
    updatedAt: "2026-10-23T11:15:00.000Z",
    version: 1,
    adminFeedback: "The Curriculum Advisory Committee has deprecated the 2023 hardware pinouts. Please update this reference material to the current 2026 Raspberry Pi RP2040 and ROS2 hardware standard before resubmitting.",
    history: [
      {
        timestamp: "2026-10-22T08:00:00.000Z",
        action: "created",
        actor: "Srimanth (Lead Educator)",
      },
      {
        timestamp: "2026-10-22T08:30:00.000Z",
        action: "submitted",
        actor: "Srimanth (Lead Educator)",
      },
      {
        timestamp: "2026-10-23T11:15:00.000Z",
        action: "rejected",
        actor: "Head of Robotics Lab",
        notes: "Outdated standard. Needs 2026 revision.",
      },
    ],
    materialData: {
      description: "Reference manual for breadboard pinout connections and digital logic pins.",
      materialType: "PDF Document",
      fileName: "Arduino_Uno_Pinout_v2023.pdf",
      fileSize: "4.8 MB",
      fileType: "application/pdf",
    },
  },
  {
    id: "sub-seed-5",
    title: "Generative AI Prompt Engineering Benchmark Quiz",
    type: "quiz",
    courseId: "c4",
    courseCode: "QAI-AG101",
    courseName: "AI Agents & Creative Tools",
    moduleId: "m1",
    moduleTitle: "Prompt Architectures & Multimodal Generation",
    teacherId: "teacher-srimanth",
    teacherName: "Srimanth",
    status: "draft",
    createdAt: "2026-10-26T16:00:00.000Z",
    updatedAt: "2026-10-26T16:45:00.000Z",
    version: 1,
    adminFeedback: undefined,
    history: [
      {
        timestamp: "2026-10-26T16:00:00.000Z",
        action: "created",
        actor: "Srimanth (Lead Educator)",
        notes: "Drafted 3 initial questions.",
      },
      {
        timestamp: "2026-10-26T16:45:00.000Z",
        action: "draft_saved",
        actor: "Srimanth (Lead Educator)",
        notes: "Saved progress locally.",
      },
    ],
    quizData: {
      description: "Benchmark test evaluating few-shot prompting, chain-of-thought, and system prompt constraints.",
      instructions: "Read each prompt snippet carefully and choose the most effective formulation.",
      timeLimitMinutes: 20,
      maxAttempts: 1,
      totalMarks: 15,
      questions: [
        {
          id: "q1",
          questionText: "What is 'Chain-of-Thought' (CoT) prompting primarily designed to improve?",
          marks: 5,
          correctOptionId: "opt-2",
          options: [
            { id: "opt-1", text: "Image resolution in diffusion models" },
            { id: "opt-2", text: "Step-by-step reasoning in complex logic problems" },
            { id: "opt-3", text: "GPU memory consumption" },
            { id: "opt-4", text: "Token generation speed" },
          ],
        },
        {
          id: "q2",
          questionText: "Which parameter controls the randomness of token sampling in LLMs?",
          marks: 5,
          correctOptionId: "opt-1",
          options: [
            { id: "opt-1", text: "Temperature" },
            { id: "opt-2", text: "Max tokens" },
            { id: "opt-3", text: "Frequency penalty" },
            { id: "opt-4", text: "Stop sequence" },
          ],
        },
        {
          id: "q3",
          questionText: "What does 'Few-Shot' prompting provide that 'Zero-Shot' does not?",
          marks: 5,
          correctOptionId: "opt-3",
          options: [
            { id: "opt-1", text: "API keys" },
            { id: "opt-2", text: "Code interpreters" },
            { id: "opt-3", text: "Explicit input-output demonstration examples" },
            { id: "opt-4", text: "Fine-tuned model weights" },
          ],
        },
      ],
    },
  },
]

/**
 * Retrieve all teacher submissions from localStorage with fallback to seed data.
 */
export function getContentSubmissions(courseId?: string): ContentSubmissionRecord[] {
  if (typeof window === "undefined") return SEED_SUBMISSIONS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SUBMISSIONS))
      return filterByCourse(SEED_SUBMISSIONS, courseId)
    }
    const parsed = JSON.parse(raw) as ContentSubmissionRecord[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SUBMISSIONS))
      return filterByCourse(SEED_SUBMISSIONS, courseId)
    }
    return filterByCourse(parsed, courseId)
  } catch (err) {
    console.warn("Error reading teacher content submissions from localStorage:", err)
    return filterByCourse(SEED_SUBMISSIONS, courseId)
  }
}

function filterByCourse(items: ContentSubmissionRecord[], courseId?: string): ContentSubmissionRecord[] {
  if (!courseId || courseId === "all") return items
  return items.filter((item) => item.courseId === courseId)
}

/**
 * Save all submissions to localStorage safely.
 */
function saveAllSubmissions(items: ContentSubmissionRecord[]): boolean {
  if (typeof window === "undefined") return false
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    // Dispatch custom event so any open teacher component re-renders reactively
    window.dispatchEvent(new CustomEvent("quantum-teacher-submissions-changed"))
    return true
  } catch (err) {
    console.error("Failed to save teacher submissions to localStorage:", err)
    return false
  }
}

/**
 * Lookup course name and code
 */
function getCourseMeta(courseId: string) {
  const c = initialCourses.find((x) => x.id === courseId)
  return {
    code: c?.code || "QAI-COURSE",
    name: c?.name || "Assigned Course",
  }
}

/**
 * Lookup module and lesson title
 */
function getModuleAndLessonMeta(courseId: string, moduleId?: string, lessonId?: string) {
  const c = initialCourses.find((x) => x.id === courseId)
  if (!c) return {}
  const m = c.modules?.find((x) => x.id === moduleId)
  const l = m?.lessons?.find((x) => x.id === lessonId)
  return {
    moduleTitle: m?.title,
    lessonTitle: l?.title,
  }
}

/**
 * Save or update an Assignment submission
 */
export function saveAssignmentSubmission(
  input: CreateAssignmentInput,
  existingId?: string
): ContentSubmissionRecord {
  const all = getContentSubmissions()
  const now = new Date().toISOString()
  const courseMeta = getCourseMeta(input.courseId)
  const hierarchyMeta = getModuleAndLessonMeta(input.courseId, input.moduleId, input.lessonId)

  const status: ContentApprovalStatus = input.submitForApproval ? "pending_approval" : "draft"

  if (existingId) {
    const index = all.findIndex((x) => x.id === existingId)
    if (index >= 0) {
      const prev = all[index]
      const updated: ContentSubmissionRecord = {
        ...prev,
        title: input.title.trim(),
        courseId: input.courseId,
        courseCode: courseMeta.code,
        courseName: courseMeta.name,
        moduleId: input.moduleId,
        moduleTitle: hierarchyMeta.moduleTitle || prev.moduleTitle,
        lessonId: input.lessonId,
        lessonTitle: hierarchyMeta.lessonTitle || prev.lessonTitle,
        status,
        updatedAt: now,
        submittedAt: input.submitForApproval ? now : prev.submittedAt,
        version: input.submitForApproval ? prev.version + 1 : prev.version,
        // Clear previous rejection feedback upon resubmission
        adminFeedback: input.submitForApproval ? undefined : prev.adminFeedback,
        assignmentData: {
          description: input.description,
          instructions: input.instructions,
          maxMarks: Number(input.maxMarks) || 100,
          dueDate: input.dueDate,
          dueTime: input.dueTime,
          attachmentName: input.attachmentName,
          attachmentSize: input.attachmentSize,
          attachmentType: input.attachmentType,
        },
        history: [
          ...prev.history,
          {
            timestamp: now,
            action: input.submitForApproval ? "resubmitted" : "draft_saved",
            actor: "Srimanth (Lead Educator)",
            notes: input.submitForApproval
              ? "Resubmitted assignment for Admin verification."
              : "Draft updated by educator.",
          },
        ],
      }
      all[index] = updated
      saveAllSubmissions(all)
      return updated
    }
  }

  // Brand new assignment
  const newRecord: ContentSubmissionRecord = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: input.title.trim(),
    type: "assignment",
    courseId: input.courseId,
    courseCode: courseMeta.code,
    courseName: courseMeta.name,
    moduleId: input.moduleId,
    moduleTitle: hierarchyMeta.moduleTitle,
    lessonId: input.lessonId,
    lessonTitle: hierarchyMeta.lessonTitle,
    teacherId: "teacher-srimanth",
    teacherName: "Srimanth",
    status,
    createdAt: now,
    submittedAt: input.submitForApproval ? now : undefined,
    updatedAt: now,
    version: 1,
    history: [
      {
        timestamp: now,
        action: input.submitForApproval ? "submitted" : "created",
        actor: "Srimanth (Lead Educator)",
        notes: input.submitForApproval
          ? "Created and submitted for Admin approval."
          : "Created initial draft.",
      },
    ],
    assignmentData: {
      description: input.description,
      instructions: input.instructions,
      maxMarks: Number(input.maxMarks) || 100,
      dueDate: input.dueDate,
      dueTime: input.dueTime,
      attachmentName: input.attachmentName,
      attachmentSize: input.attachmentSize,
      attachmentType: input.attachmentType,
    },
  }

  all.unshift(newRecord)
  saveAllSubmissions(all)
  return newRecord
}

/**
 * Save or update a Quiz submission
 */
export function saveQuizSubmission(
  input: CreateQuizInput,
  existingId?: string
): ContentSubmissionRecord {
  const all = getContentSubmissions()
  const now = new Date().toISOString()
  const courseMeta = getCourseMeta(input.courseId)
  const hierarchyMeta = getModuleAndLessonMeta(input.courseId, input.moduleId, input.lessonId)

  const totalMarks = input.questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)
  const status: ContentApprovalStatus = input.submitForApproval ? "pending_approval" : "draft"

  if (existingId) {
    const index = all.findIndex((x) => x.id === existingId)
    if (index >= 0) {
      const prev = all[index]
      const updated: ContentSubmissionRecord = {
        ...prev,
        title: input.title.trim(),
        courseId: input.courseId,
        courseCode: courseMeta.code,
        courseName: courseMeta.name,
        moduleId: input.moduleId,
        moduleTitle: hierarchyMeta.moduleTitle || prev.moduleTitle,
        lessonId: input.lessonId,
        lessonTitle: hierarchyMeta.lessonTitle || prev.lessonTitle,
        status,
        updatedAt: now,
        submittedAt: input.submitForApproval ? now : prev.submittedAt,
        version: input.submitForApproval ? prev.version + 1 : prev.version,
        adminFeedback: input.submitForApproval ? undefined : prev.adminFeedback,
        quizData: {
          description: input.description,
          instructions: input.instructions,
          timeLimitMinutes: Number(input.timeLimitMinutes) || 30,
          maxAttempts: input.maxAttempts,
          totalMarks,
          questions: input.questions,
        },
        history: [
          ...prev.history,
          {
            timestamp: now,
            action: input.submitForApproval ? "resubmitted" : "draft_saved",
            actor: "Srimanth (Lead Educator)",
            notes: input.submitForApproval
              ? "Resubmitted quiz for Admin review."
              : "Quiz draft saved locally.",
          },
        ],
      }
      all[index] = updated
      saveAllSubmissions(all)
      return updated
    }
  }

  // Brand new quiz
  const newRecord: ContentSubmissionRecord = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: input.title.trim(),
    type: "quiz",
    courseId: input.courseId,
    courseCode: courseMeta.code,
    courseName: courseMeta.name,
    moduleId: input.moduleId,
    moduleTitle: hierarchyMeta.moduleTitle,
    lessonId: input.lessonId,
    lessonTitle: hierarchyMeta.lessonTitle,
    teacherId: "teacher-srimanth",
    teacherName: "Srimanth",
    status,
    createdAt: now,
    submittedAt: input.submitForApproval ? now : undefined,
    updatedAt: now,
    version: 1,
    history: [
      {
        timestamp: now,
        action: input.submitForApproval ? "submitted" : "created",
        actor: "Srimanth (Lead Educator)",
        notes: input.submitForApproval
          ? "Created quiz and submitted for approval."
          : "Created quiz draft.",
      },
    ],
    quizData: {
      description: input.description,
      instructions: input.instructions,
      timeLimitMinutes: Number(input.timeLimitMinutes) || 30,
      maxAttempts: input.maxAttempts,
      totalMarks,
      questions: input.questions,
    },
  }

  all.unshift(newRecord)
  saveAllSubmissions(all)
  return newRecord
}

/**
 * Save or update a Learning Material submission
 */
export function saveMaterialSubmission(
  input: UploadMaterialInput,
  existingId?: string
): ContentSubmissionRecord {
  const all = getContentSubmissions()
  const now = new Date().toISOString()
  const courseMeta = getCourseMeta(input.courseId)
  const hierarchyMeta = getModuleAndLessonMeta(input.courseId, input.moduleId, input.lessonId)

  const status: ContentApprovalStatus = input.submitForApproval ? "pending_approval" : "draft"

  if (existingId) {
    const index = all.findIndex((x) => x.id === existingId)
    if (index >= 0) {
      const prev = all[index]
      const updated: ContentSubmissionRecord = {
        ...prev,
        title: input.title.trim(),
        courseId: input.courseId,
        courseCode: courseMeta.code,
        courseName: courseMeta.name,
        moduleId: input.moduleId,
        moduleTitle: hierarchyMeta.moduleTitle || prev.moduleTitle,
        lessonId: input.lessonId,
        lessonTitle: hierarchyMeta.lessonTitle || prev.lessonTitle,
        status,
        updatedAt: now,
        submittedAt: input.submitForApproval ? now : prev.submittedAt,
        version: input.submitForApproval ? prev.version + 1 : prev.version,
        adminFeedback: input.submitForApproval ? undefined : prev.adminFeedback,
        materialData: {
          description: input.description,
          materialType: input.materialType,
          fileName: input.fileName,
          fileSize: input.fileSize,
          fileType: input.fileType,
          externalUrl: input.externalUrl,
        },
        history: [
          ...prev.history,
          {
            timestamp: now,
            action: input.submitForApproval ? "resubmitted" : "draft_saved",
            actor: "Srimanth (Lead Educator)",
            notes: input.submitForApproval
              ? "Replaced material asset and resubmitted for verification."
              : "Updated material draft.",
          },
        ],
      }
      all[index] = updated
      saveAllSubmissions(all)
      return updated
    }
  }

  // Brand new material
  const newRecord: ContentSubmissionRecord = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: input.title.trim(),
    type: "material",
    courseId: input.courseId,
    courseCode: courseMeta.code,
    courseName: courseMeta.name,
    moduleId: input.moduleId,
    moduleTitle: hierarchyMeta.moduleTitle,
    lessonId: input.lessonId,
    lessonTitle: hierarchyMeta.lessonTitle,
    teacherId: "teacher-srimanth",
    teacherName: "Srimanth",
    status,
    createdAt: now,
    submittedAt: input.submitForApproval ? now : undefined,
    updatedAt: now,
    version: 1,
    history: [
      {
        timestamp: now,
        action: input.submitForApproval ? "submitted" : "created",
        actor: "Srimanth (Lead Educator)",
        notes: input.submitForApproval
          ? "Uploaded material and queued for Admin review."
          : "Saved material draft.",
      },
    ],
    materialData: {
      description: input.description,
      materialType: input.materialType,
      fileName: input.fileName,
      fileSize: input.fileSize,
      fileType: input.fileType,
      externalUrl: input.externalUrl,
    },
  }

  all.unshift(newRecord)
  saveAllSubmissions(all)
  return newRecord
}

/**
 * Delete a submission (strictly permitted only for drafts or rejected items)
 */
export function deleteSubmission(id: string): boolean {
  const all = getContentSubmissions()
  const target = all.find((x) => x.id === id)
  if (!target) return false

  // Cannot delete items currently pending approval or approved without administrative action
  if (target.status === "pending_approval") {
    return false
  }

  const remaining = all.filter((x) => x.id !== id)
  return saveAllSubmissions(remaining)
}
