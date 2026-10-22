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
    return ((hash >>> 0) / 4294967296)
  }
}

const SAMPLE_LESSONS = [
  "What is AI? Human vs Machine Intelligence",
  "Sensors & Pattern Sorting Algorithms",
  "Introductory Machine Learning Paradigms",
  "Fractions & Geometric Decomposition",
  "STEM Inquiry: Plant Cellular Structures",
  "Logic Gates & Decision Trees Lab",
  "Python Variables & String Sequences",
  "Visual Coding with Turtle Graphics",
  "Robotics Perception & Obstacle Avoidance",
]

const SAMPLE_VIDEOS = [
  "Video: How Neural Networks Classify Images (14m)",
  "Video: Biology in Action - Chloroplasts (18m)",
  "Video: Visualizing Fraction Equivalencies (10m)",
  "Video: Quantum Computing Explained for Beginners (12m)",
  "Video: Robotics Actuators & Motor Control (16m)",
]

const SAMPLE_MATERIALS = [
  "PDF: Module 1 Slide Deck - The Story of AI",
  "Document: Lab Worksheet - Human vs Robot Perception",
  "PDF: STEM Investigation Guide - Photosynthesis",
  "Document: Python Syntax Quick Reference Card",
  "PDF: Fractions Word Problems Companion",
]

const SAMPLE_ASSIGNMENTS = [
  "Submitted: Logic Gates Lab Report",
  "Submitted: Reading Comprehension Reflection",
  "Submitted: Fractions Practice Problem Set",
  "Submitted: AI Pattern Classifier Project Milestone",
]

const SAMPLE_QUIZZES = [
  "Quiz Attempt: Module 1 Checkpoint (Score: 10/10)",
  "Quiz Attempt: Fractions Mastery Diagnostic (Score: 9/10)",
  "Quiz Attempt: Python Syntax Micro-Assessment (Score: 8/10)",
  "Quiz Attempt: STEM Unit 2 Review Test (Score: 10/10)",
]

/**
 * Generates an 84-day (12-week) GitHub-style activity matrix for a student.
 * Uses deterministic PRNG based on student id, attendance, and completion rate
 * so each student receives consistent, unique, and believable learning activity data.
 */
export function getStudentActivityHeatmap(student: StudentItem): StudentActivitySummary {
  const seedString = `${student.id}_${student.rollNumber}_${student.completion}_${student.attendance}`
  const rand = pseudoRandom(seedString)

  // Reference anchor: 2026-10-22 (current date)
  const baseDate = new Date(2026, 9, 22) // month is 0-indexed: 9 = October

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
            detail: "Lesson marked completed · 100% video & reading finished",
            courseName: student.assignedCourse || "Year 4 Elementary STEM & AI",
          })
        } else if (rollType > 0.5) {
          events.push({
            id: `ev_${student.id}_${offset}_${i}`,
            type: "video_watched",
            title: SAMPLE_VIDEOS[Math.floor(rand() * SAMPLE_VIDEOS.length)],
            timestamp: timeStr,
            detail: "Watched high-definition lecture streaming playback",
            courseName: student.assignedCourse || "Year 4 Elementary STEM & AI",
          })
        } else if (rollType > 0.3) {
          events.push({
            id: `ev_${student.id}_${offset}_${i}`,
            type: "material_opened",
            title: SAMPLE_MATERIALS[Math.floor(rand() * SAMPLE_MATERIALS.length)],
            timestamp: timeStr,
            detail: "Opened verified classroom digital asset",
            courseName: student.assignedCourse || "Year 4 Elementary STEM & AI",
          })
        } else if (rollType > 0.15) {
          events.push({
            id: `ev_${student.id}_${offset}_${i}`,
            type: "assignment_submitted",
            title: SAMPLE_ASSIGNMENTS[Math.floor(rand() * SAMPLE_ASSIGNMENTS.length)],
            timestamp: timeStr,
            detail: "Submitted assignment attachment for teacher evaluation",
            courseName: student.assignedCourse || "Year 4 Elementary STEM & AI",
          })
        } else {
          events.push({
            id: `ev_${student.id}_${offset}_${i}`,
            type: "quiz_attempted",
            title: SAMPLE_QUIZZES[Math.floor(rand() * SAMPLE_QUIZZES.length)],
            timestamp: timeStr,
            detail: "Completed automated interactive check-in assessment",
            courseName: student.assignedCourse || "Year 4 Elementary STEM & AI",
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
    mostRecentDate: mostRecentDate || "2026-10-22",
    currentStreakDays: currentStreak,
    longestStreakDays: Math.max(maxStreak, currentStreak),
    isDemoData: true,
    weeks,
  }
}
