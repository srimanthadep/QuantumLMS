/** Shapes and helpers for course content returned by GET /admin/courses/:id. */

export interface CourseModuleItem {
  id: string
  course_id: string
  position: number
  title: string
  duration: string
}

export type LessonType = "video" | "reading" | "lab"

export interface LessonRowItem {
  id: string
  course_id: string
  module_id: string
  position: number
  title: string
  duration: string
  minutes: number
  type: LessonType
  summary: string
  video_url?: string | null
  video_qualities?: unknown
}

export type MaterialType = "PDF" | "Code Notebook" | "Dataset" | "Slides"

export interface MaterialItem {
  id: string
  course_id: string
  position: number
  title: string
  type: MaterialType
  description: string
  url?: string | null
  file_name?: string | null
  size: string
  published_at?: string | null
}

/** Course record as the detail endpoint returns it (snake_case API row). */
export interface CourseDetailRecord {
  id: string
  title: string
  category: string
  instructor: string
  level: "Beginner" | "Intermediate" | "Advanced" | string
  duration: string
  description: string
  price: number | string
  capacity: number | string
  status: "Published" | "Draft" | "Archived"
}

export interface CourseDetailResponse {
  course: CourseDetailRecord
  modules: CourseModuleItem[]
  lessons: LessonRowItem[]
  materials: MaterialItem[]
}

export const LESSON_TYPE_OPTIONS = [
  { value: "video", label: "Video lecture" },
  { value: "reading", label: "Reading / article" },
  { value: "lab", label: "Hands-on lab" },
]

export const MATERIAL_TYPE_OPTIONS = [
  { value: "PDF", label: "PDF document / notes" },
  { value: "Slides", label: "Presentation slides" },
  { value: "Code Notebook", label: "Code notebook (IPYNB / ZIP)" },
  { value: "Dataset", label: "Dataset (CSV / JSON / H5)" },
]

export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const

/** Converts YouTube/Vimeo watch URLs to embed URLs; returns null for direct/R2 video streams. */
export function toVideoEmbedUrl(url?: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url, window.location.origin)
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "")
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v")
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null
    }
  } catch {
    return null
  }
  return null
}

export function lessonHasPlayableVideo(l: LessonRowItem): boolean {
  const q = l.video_qualities
  const hasQualities = Boolean(q && typeof q === "object" && Object.keys(q as object).length > 0)
  return l.type === "video" && Boolean(l.video_url || hasQualities)
}

export function formatRuntime(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m"
  if (totalMinutes < 60) return `${totalMinutes}m`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}
