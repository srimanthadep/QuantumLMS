import { Bot, Brain, Eye, Layers, Workflow, type LucideIcon } from "lucide-react"
import type { BadgeTone } from "@/components/ui/badge"
import type { AdminCourse } from "@/data/adminStore"

export const CATEGORIES = ["LLM Engineering", "Agentic Systems", "MLOps", "Computer Vision", "AI Foundations"] as const

export const STATUSES: AdminCourse["status"][] = ["Published", "Draft", "Archived"]

interface CategoryTheme {
  /** Tailwind gradient classes for the card cover. */
  gradient: string
  icon: LucideIcon
}

const CATEGORY_THEME: Record<string, CategoryTheme> = {
  "LLM Engineering": { gradient: "from-violet-500 via-indigo-500 to-indigo-700", icon: Brain },
  "Agentic Systems": { gradient: "from-orange-400 via-orange-500 to-rose-600", icon: Bot },
  MLOps: { gradient: "from-emerald-400 via-teal-500 to-cyan-700", icon: Workflow },
  "Computer Vision": { gradient: "from-sky-400 via-blue-500 to-blue-700", icon: Eye },
  "AI Foundations": { gradient: "from-fuchsia-400 via-pink-500 to-purple-700", icon: Layers },
}

const FALLBACK_THEME: CategoryTheme = { gradient: "from-slate-500 via-slate-600 to-slate-800", icon: Layers }

export const themeFor = (category: string): CategoryTheme => CATEGORY_THEME[category] ?? FALLBACK_THEME

export const STATUS_TONE: Record<AdminCourse["status"], BadgeTone> = {
  Published: "success",
  Draft: "warning",
  Archived: "neutral",
}

export const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`

/** Compact Indian-style currency: ₹1.25 Cr, ₹4.8 L, ₹39,999. */
export function compactINR(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`
  return formatINR(n)
}

export const seatPercent = (c: Pick<AdminCourse, "enrolledStudents" | "capacity">) =>
  c.capacity > 0 ? Math.min(100, Math.round((c.enrolledStudents / c.capacity) * 100)) : 0

export type SortKey = "default" | "enrollment" | "revenue" | "rating" | "price" | "title"

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Default order" },
  { value: "enrollment", label: "Most enrolled" },
  { value: "revenue", label: "Highest revenue" },
  { value: "rating", label: "Top rated" },
  { value: "price", label: "Price: high to low" },
  { value: "title", label: "Title A–Z" },
]

