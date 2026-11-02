import React from "react"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import type { EvaluationStatus, ReleaseStatus, AssessmentType } from "../types"

interface StatusConfig {
  tone: BadgeTone
  dot?: boolean
}

const EVALUATION_STATUS_MAP: Record<string, StatusConfig> = {
  Submitted: { tone: "info", dot: true },
  "In Progress": { tone: "warning", dot: true },
  "Draft Saved": { tone: "primary", dot: true },
  Evaluated: { tone: "success", dot: true },
  Resubmitted: { tone: "secondary", dot: true },
  "Reassessment Requested": { tone: "danger", dot: true },
  "Reassessment In Progress": { tone: "warning", dot: true },
  Overdue: { tone: "danger", dot: true },
  "Returned for Correction": { tone: "warning", dot: true },
}

export function StatusBadge({ status }: { status: EvaluationStatus | string }) {
  const config = EVALUATION_STATUS_MAP[status] ?? { tone: "neutral", dot: false }

  return (
    <Badge tone={config.tone} dot={config.dot} className="font-semibold shadow-xs">
      {status}
    </Badge>
  )
}

const RELEASE_STATUS_MAP: Record<string, { tone: BadgeTone; label: string }> = {
  Draft: { tone: "neutral", label: "Draft Only" },
  Evaluated: { tone: "warning", label: "Awaiting Release" },
  "Awaiting Release": { tone: "warning", label: "Awaiting Release" },
  Released: { tone: "success", label: "Released to Student" },
  "Reassessment Pending": { tone: "danger", label: "Reassessment Pending" },
  Reassessed: { tone: "primary", label: "Reassessed" },
}

export function ReleaseBadge({ status }: { status: ReleaseStatus | string }) {
  const config = RELEASE_STATUS_MAP[status] ?? { tone: "neutral", label: status }

  return (
    <Badge tone={config.tone} size="sm">
      {config.label}
    </Badge>
  )
}

const ASSESSMENT_TYPE_MAP: Record<string, BadgeTone> = {
  Assignment: "info",
  Quiz: "primary",
  Test: "primary",
  "Midterm Examination": "warning",
  "Final Examination": "danger",
  Project: "success",
  "Practical Examination": "warning",
  "Lab Assessment": "secondary",
  Presentation: "primary",
  "Viva Assessment": "primary",
}

export function TypeBadge({ type }: { type: AssessmentType | string }) {
  const tone = ASSESSMENT_TYPE_MAP[type] ?? "neutral"

  return (
    <Badge tone={tone} size="sm" className="font-medium">
      {type}
    </Badge>
  )
}

export default StatusBadge
