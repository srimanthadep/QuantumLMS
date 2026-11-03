import type {
  StudentItem,
  StudentDayActivity,
  StudentActivityEvent,
  StudentActivitySummary,
} from "../types"

// Deterministic pseudo-random number generator seeded with string
function pseudoRandom(seed: string): () => number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return function () {
    hash = Math.imul(hash ^ (hash >>> 15), 1 | hash)
    hash = (hash + Math.imul(hash ^ (hash >>> 7), 61 | hash)) ^ hash
    return (hash >>> 0) / 4294967296
  }
}

const SAMPLE_LESSONS = [
  "Multi-Head Attention & Scaled Dot-Product Math",
  "Rotary Position Embeddings (RoPE) Deep Dive",
  "Structured JSON Outputs with Pydantic & Instructor",
  "Vector Indexing with Hierarchical Navigable Small World (HNSW)",
  "Reciprocal Rank Fusion (RRF) & Cross-Encoder Reranking",
  "Evaluation of RAG Faithfulness with Ragas",
  "Cyclic Multi-Agent State Graphs with LangGraph",
  "Human-in-the-Loop Interrupts & Authorization Gates",
  "Parameter-Efficient Fine-Tuning with QLoRA & 4-bit NF4",
]

const SAMPLE_VIDEOS = [
  "Video: Attention Heads & KV Cache Optimization (32m)",
  "Video: Building Production Agents with LangGraph (45m)",
  "Video: Vector Search with ChromaDB & pgvector (28m)",
  "Video: Quantization & Low-Rank Adaptation (35m)",
  "Video: Distributed Training with PyTorch FSDP (40m)",
]

const SAMPLE_MATERIALS = [
  "PDF: Module 1 Architecture Guide - Attention Mechanisms",
  "Document: Lab Notebook - Implementing RoPE from Scratch",
  "PDF: Production RAG Blueprint - Hybrid Dense & BM25",
  "Document: Agentic Workflow Best Practices & Checkpointing",
  "PDF: QLoRA Fine-Tuning Hyperparameter Cheat Sheet",
]

const SAMPLE_ASSIGNMENTS = [
  "Submitted: Multi-Head Attention Mechanism from Scratch",
  "Submitted: Structured Pydantic LLM Output Generator",
  "Submitted: Dense Vector Indexing & Benchmark Evaluation",
  "Submitted: End-to-End RAG Pipeline with Faithfulness Score",
  "Submitted: LangGraph Multi-Agent Customer Support Swarm",
]

const SAMPLE_QUIZZES = [
  "Quiz Attempt: Transformer Math & Attention Checkpoint (Score: 10/10)",
  "Quiz Attempt: Vector Embeddings & Distance Metrics (Score: 9/10)",
  "Quiz Attempt: Prompt Engineering & Tool Calling Diagnostic (Score: 10/10)",
  "Quiz Attempt: Fine-Tuning & Quantization Assessment (Score: 9/10)",
]

/**
 * Generates an 84-day (12-week) GitHub-style activity matrix for a student.
 * Uses deterministic PRNG based on student id, attendance, and completion rate
 * so each student receives consistent, unique, and believable learning activity data.
 */
export function getStudentActivityHeatmap(student: StudentItem): StudentActivitySummary {
  const seedString = `${student.id}_${student.rollNumber}_${student.completion}_${student.attendance}`
  const rand = pseudoRandom(seedString)

  // Reference anchor: 2026-11-03 (current date)
  const baseDate = new Date(2026, 10, 3) // month is 0-indexed: 10 = November

  // 12 weeks = 84 days
  const totalDays = 84
  const days: StudentDayActivity[] = []

  // Activity probability based on student's attendance & completion
  const attendanceRate = (student.attendance ?? 85) / 100
  const completionRate = (student.completion ?? 75) / 100
  const activeProb = Math.min(0.85, Math.max(0.25, attendanceRate * 0.7 + completionRate * 0.3))

  let streak = 0
  let maxStreak = 0
  let currentStreak = 0
  let mostRecentDate = ""

  // Generate days going back from day 83 to day 0 (day 83 is today)
  for (let offset = totalDays - 1; offset >= 0; offset--) {
    const d = new Date(baseDate)
    d.setDate(baseDate.getDate() - offset)

    const dateStr = d.toISOString().split("T")[0]
    const dayOfWeek = d.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Weekend probability is naturally lower
    const dayProb = isWeekend ? activeProb * 0.35 : activeProb
    const isActive = rand() < dayProb

    if (isActive) {
      streak++
      if (streak > maxStreak) maxStreak = streak
      mostRecentDate = dateStr

      // Activity count: 1 to 7 depending on completion rate
      const countRoll = rand()
      let count = 1
      if (countRoll > 0.85) count = Math.floor(rand() * 3) + 5 // 5 - 7 (tier 4)
      else if (countRoll > 0.6) count = Math.floor(rand() * 2) + 3 // 3 - 4 (tier 3)
      else if (countRoll > 0.3) count = 2 // tier 2
      else count = 1 // tier 1

      // Determine level 1-4
      let level: 0 | 1 | 2 | 3 | 4 = 1
      if (count >= 5) level = 4
      else if (count >= 3) level = 3
      else if (count >= 2) level = 2
      else level = 1

      // Generate distinct events
      const events: StudentActivityEvent[] = []
      const hours = [9, 10, 11, 13, 14, 15, 16, 17]

      for (let i = 0; i < count; i++) {
        const h = hours[i % hours.length]
        const m = Math.floor(rand() * 4) * 15
        const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
        const rollType = rand()

        if (rollType > 0.75) {
          events.push({
            id: `ev_${student.id}_${offset}_${i}`,
            type: "lesson_completed",
            title: SAMPLE_LESSONS[Math.floor(rand() * SAMPLE_LESSONS.length)],
            timestamp: timeStr,
            detail: "Lesson marked completed · 100% video & lab finished",
            courseName: student.assignedCourse || "Cohort 14 · GenAI & Agentic Systems",
          })
        } else if (rollType > 0.5) {
          events.push({
            id: `ev_${student.id}_${offset}_${i}`,
            type: "video_watched",
            title: SAMPLE_VIDEOS[Math.floor(rand() * SAMPLE_VIDEOS.length)],
            timestamp: timeStr,
            detail: "Watched high-definition lecture streaming playback",
            courseName: student.assignedCourse || "Cohort 14 · GenAI & Agentic Systems",
          })
        } else if (rollType > 0.3) {
          events.push({
            id: `ev_${student.id}_${offset}_${i}`,
            type: "material_opened",
            title: SAMPLE_MATERIALS[Math.floor(rand() * SAMPLE_MATERIALS.length)],
            timestamp: timeStr,
            detail: "Opened verified cohort reference asset",
            courseName: student.assignedCourse || "Cohort 14 · GenAI & Agentic Systems",
          })
        } else if (rollType > 0.15) {
          events.push({
            id: `ev_${student.id}_${offset}_${i}`,
            type: "assignment_submitted",
            title: SAMPLE_ASSIGNMENTS[Math.floor(rand() * SAMPLE_ASSIGNMENTS.length)],
            timestamp: timeStr,
            detail: "Submitted project code repository for faculty evaluation",
            courseName: student.assignedCourse || "Cohort 14 · GenAI & Agentic Systems",
          })
        } else {
          events.push({
            id: `ev_${student.id}_${offset}_${i}`,
            type: "quiz_attempted",
            title: SAMPLE_QUIZZES[Math.floor(rand() * SAMPLE_QUIZZES.length)],
            timestamp: timeStr,
            detail: "Completed automated interactive check-in assessment",
            courseName: student.assignedCourse || "Cohort 14 · GenAI & Agentic Systems",
          })
        }
      }

      days.push({
        date: dateStr,
        dayOfWeek,
        level,
        count,
        events,
      })
    } else {
      streak = 0
      days.push({
        date: dateStr,
        dayOfWeek,
        level: 0,
        count: 0,
        events: [],
      })
    }
  }

  // Calculate current streak at the end of the array (most recent days)
  let cur = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) cur++
    else break
  }
  currentStreak = cur

  const activeDaysList = days.filter((d) => d.count > 0)
  const totalActiveDays = activeDaysList.length
  const totalActivities = activeDaysList.reduce((acc, d) => acc + d.count, 0)

  // Chunk days into 12 weeks (7 days per week)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const weeks: { weekIndex: number; monthLabel?: string; days: StudentDayActivity[] }[] = []

  let lastMonth = -1
  for (let w = 0; w < 12; w++) {
    const weekDays = days.slice(w * 7, (w + 1) * 7)
    // Check if a new month starts in this week
    let monthLabel: string | undefined = undefined
    if (weekDays.length > 0) {
      const firstDate = new Date(weekDays[0].date)
      const currentMonth = firstDate.getMonth()
      if (currentMonth !== lastMonth) {
        monthLabel = monthNames[currentMonth]
        lastMonth = currentMonth
      }
    }

    weeks.push({
      weekIndex: w + 1,
      monthLabel,
      days: weekDays,
    })
  }

  return {
    studentId: student.id,
    totalActiveDays,
    totalActivities,
    mostRecentDate: mostRecentDate || "2026-11-03",
    currentStreakDays: currentStreak,
    longestStreakDays: Math.max(maxStreak, currentStreak),
    isDemoData: true,
    weeks,
  }
}
