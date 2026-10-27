import React from "react"
import type { EvaluationStatus, ReleaseStatus, AssessmentType } from "../types"

export function StatusBadge({ status }: { status: EvaluationStatus | string }) {
  let bgClass = "bg-zinc-100 text-zinc-700 border-zinc-200"
  let dotClass = "bg-zinc-400"

  switch (status) {
    case "Submitted":
      bgClass = "bg-blue-50 text-blue-700 border-blue-200"
      dotClass = "bg-blue-500"
      break
    case "In Progress":
      bgClass = "bg-amber-50 text-amber-700 border-amber-200"
      dotClass = "bg-amber-500 animate-pulse"
      break
    case "Draft Saved":
      bgClass = "bg-purple-50 text-purple-700 border-purple-200"
      dotClass = "bg-purple-500"
      break
    case "Evaluated":
      bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200"
      dotClass = "bg-emerald-500"
      break
    case "Resubmitted":
      bgClass = "bg-indigo-50 text-indigo-700 border-indigo-200"
      dotClass = "bg-indigo-500"
      break
    case "Reassessment Requested":
      bgClass = "bg-rose-50 text-rose-700 border-rose-200"
      dotClass = "bg-rose-500 animate-ping"
      break
    case "Reassessment In Progress":
      bgClass = "bg-orange-50 text-orange-700 border-orange-200"
      dotClass = "bg-orange-500"
      break
    case "Overdue":
      bgClass = "bg-red-50 text-red-700 border-red-200"
      dotClass = "bg-red-500"
      break
    case "Returned for Correction":
      bgClass = "bg-amber-50 text-amber-800 border-amber-200"
      dotClass = "bg-amber-600"
      break
    default:
      break
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bgClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      <span>{status}</span>
    </span>
  )
}

export function ReleaseBadge({ status }: { status: ReleaseStatus | string }) {
  let bgClass = "bg-zinc-100 text-zinc-700 border-zinc-200"
  let label = status

  switch (status) {
    case "Draft":
      bgClass = "bg-zinc-100 text-zinc-600 border-zinc-200"
      label = "Draft Only"
      break
    case "Evaluated":
    case "Awaiting Release":
      bgClass = "bg-amber-50 text-amber-700 border-amber-200"
      label = "Awaiting Release"
      break
    case "Released":
      bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200"
      label = "Released to Student"
      break
    case "Reassessment Pending":
      bgClass = "bg-rose-50 text-rose-700 border-rose-200"
      label = "Reassessment Pending"
      break
    case "Reassessed":
      bgClass = "bg-purple-50 text-purple-700 border-purple-200"
      label = "Reassessed"
      break
    default:
      break
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${bgClass}`}>
      <span>{label}</span>
    </span>
  )
}

export function TypeBadge({ type }: { type: AssessmentType | string }) {
  let color = "bg-zinc-100 text-zinc-700 border-zinc-200"

  switch (type) {
    case "Assignment":
      color = "bg-sky-50 text-sky-700 border-sky-200"
      break
    case "Quiz":
      color = "bg-indigo-50 text-indigo-700 border-indigo-200"
      break
    case "Test":
      color = "bg-violet-50 text-violet-700 border-violet-200"
      break
    case "Midterm Examination":
      color = "bg-blue-50 text-blue-800 border-blue-200"
      break
    case "Final Examination":
      color = "bg-red-50 text-red-800 border-red-200"
      break
    case "Project":
      color = "bg-emerald-50 text-emerald-800 border-emerald-200"
      break
    case "Practical Examination":
      color = "bg-amber-50 text-amber-800 border-amber-200"
      break
    case "Lab Assessment":
      color = "bg-teal-50 text-teal-800 border-teal-200"
      break
    case "Presentation":
      color = "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200"
      break
    case "Viva Assessment":
      color = "bg-purple-50 text-purple-800 border-purple-200"
      break
    default:
      break
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${color}`}>
      {type}
    </span>
  )
}
