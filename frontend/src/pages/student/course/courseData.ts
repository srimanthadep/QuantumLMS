import type { CourseItem, LessonItem, ModuleItem } from "../studentTypes"
import { courseCurriculum } from "../studentMockData"

const MODULE_TOPICS = [
  "Foundations",
  "Core concepts",
  "Applied techniques",
  "Hands-on lab",
  "Advanced patterns",
  "Evaluation and testing",
  "Production deployment",
  "Capstone project",
]

/** Seeded curriculum for the course, or a generated one that matches its module counts. */
export function buildCurriculum(course: CourseItem): ModuleItem[] {
  const seeded = courseCurriculum[course.id]
  if (seeded?.length) return seeded
  const done = course.completedModules
  return Array.from({ length: course.totalModules }, (_, i) => {
    const topic = MODULE_TOPICS[i % MODULE_TOPICS.length]
    const moduleStatus: ModuleItem["status"] =
      course.status === "Catalog" ? "Locked" : i < done ? "Completed" : i === done ? "In Progress" : "Locked"
    const lessonStatus = (j: number): LessonItem["status"] => {
      if (moduleStatus === "Completed") return "Completed"
      if (moduleStatus === "Locked") return "Locked"
      return j === 0 ? "Completed" : j === 1 ? "In Progress" : "Locked"
    }
    const lessons: LessonItem[] = [
      { id: `${course.id}-m${i + 1}-l1`, title: `${topic}: lecture`, duration: "45 mins", type: "video", status: lessonStatus(0), summary: `Instructor walkthrough of ${topic.toLowerCase()} for ${course.title}.` },
      { id: `${course.id}-m${i + 1}-l2`, title: `${topic} in practice`, duration: "30 mins", type: "reading", status: lessonStatus(1), summary: `Guided reading with worked examples and references.` },
      { id: `${course.id}-m${i + 1}-l3`, title: `Lab: ${topic.toLowerCase()} exercises`, duration: "50 mins", type: "lab", status: lessonStatus(2), summary: `Hands-on notebook exercises with automated checks.` },
    ]
    return {
      id: `${course.id}-m${i + 1}`,
      title: `Module ${i + 1}: ${topic}`,
      lessonCount: lessons.length,
      duration: "2 hours",
      status: moduleStatus,
      lessons,
    }
  })
}

/** "55 mins" -> 55, "1.5 hours" -> 90. */
export function parseMinutes(duration: string): number {
  const n = Number.parseFloat(duration) || 0
  return /hour/i.test(duration) ? Math.round(n * 60) : Math.round(n)
}

export interface CourseQuestion {
  id: string
  author: string
  avatar?: string
  time: string
  text: string
  votes: number
  voted?: boolean
  answer?: { author: string; text: string }
}

export function seedQuestions(course: CourseItem): CourseQuestion[] {
  return [
    {
      id: `${course.id}-q1`,
      author: "Priya Sharma",
      avatar: "/assets/student-2.png",
      time: "2 hours ago",
      text: `For the module lab, is it fine to use a smaller dataset locally before running the full benchmark?`,
      votes: 12,
      answer: {
        author: course.instructor,
        text: "Yes. Validate the pipeline on a 5–10% sample first, then run the full benchmark on the cluster. Mention the sample size in your write-up.",
      },
    },
    {
      id: `${course.id}-q2`,
      author: "Rohit Verma",
      avatar: "/assets/student-3.png",
      time: "Yesterday",
      text: `Will the slides for ${course.title} be updated with the examples from the live session?`,
      votes: 7,
    },
    {
      id: `${course.id}-q3`,
      author: "Sneha Patel",
      avatar: "/assets/student-4.png",
      time: "3 days ago",
      text: "What's the best way to revise before the module quiz: notebooks or the reading list?",
      votes: 5,
      answer: {
        author: course.instructor,
        text: "Start with the notebooks; the quiz questions follow the lab exercises closely. Use the reading list for the theory questions.",
      },
    },
  ]
}
