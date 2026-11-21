import type { ReplayChapter } from "@/components/live/RecordingPlayer"

export type RecordingRow = {
  id: string
  /** null for a batch video that is not tied to a class. */
  session_id: string | null
  kind?: "video" | "replay"
  title: string
  summary: string
  status: string
  version: number
  release_at: string
  expires_at: string
  batch_name: string
  processing_state: string
  processing_error: string | null
  duration_seconds: number | null
  /** Latest publish request from a teacher (staff lists only). */
  approval_id?: string | null
  approval_state?: string | null
  approval_version?: number | null
  approval_note?: string | null
}

export type RecordingApproval = {
  id: string
  state: string
  target_version: number
  note: string
  decision_note: string
  created_at: string
  decided_at: string | null
}

export type RecordingDetail = {
  recording: RecordingRow & { asset_id: string }
  approval?: RecordingApproval | null
  asset: { id: string; state: string; error: string | null; duration_seconds: number | null; transcript: { start: number; end: number; text: string }[] }
  chapters: ReplayChapter[]
}

export type MediaAsset = { id: string; state: string; error: string | null; session_id: string | null; duration_seconds: number | null }

export type ProviderNotice = { id: string; title: string; meeting_id: string; recording_start: string | null }
