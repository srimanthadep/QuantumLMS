import { useSyncExternalStore } from "react"
import { onSessionReset } from "./sessionBoundary"

export type UploadPhase = "uploading" | "queued" | "processing" | "ready" | "failed"

export interface UploadItem {
  id: string
  name: string
  phase: UploadPhase
  /** 0-100 while uploading. */
  percent: number
  error?: string
  /** The media asset, once the server knows it. The tray follows its processing by this id. */
  assetId?: string
  /** When the file started sending (ms), and the server's times for the finished upload and its processing. */
  addedAt?: number
  uploadedAt?: string
  startedAt?: string
  completedAt?: string
  /** Server-side processing, 0-100. */
  processed?: number
}

/** Video uploads started in this tab, so one tray can show them wherever the admin navigates. */
const STORE = "quantum_uploads"

/** Kept in this tab's session storage so a refresh doesn't empty the tray. A file still being sent can't continue after a refresh. */
function restore(): UploadItem[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "[]") as UploadItem[]
    return saved.map((i) => (i.phase === "uploading" ? { ...i, phase: "failed", error: "The page was refreshed while this was uploading. Upload it again." } : i))
  } catch {
    return []
  }
}

let items: UploadItem[] = restore()
const listeners = new Set<() => void>()
const set = (next: UploadItem[]) => {
  items = next
  try {
    sessionStorage.setItem(STORE, JSON.stringify(next))
  } catch {
    // Storage unavailable: the tray still works until the next refresh.
  }
  listeners.forEach((l) => l())
}

export const uploadTracker = {
  add(item: Omit<UploadItem, "id" | "percent" | "phase"> & Partial<Pick<UploadItem, "percent" | "phase">>): string {
    const id = crypto.randomUUID()
    set([{ percent: 0, phase: "uploading", addedAt: Date.now(), ...item, id }, ...items])
    return id
  },
  update(id: string, patch: Partial<UploadItem>) {
    set(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  },
  remove(id: string) {
    set(items.filter((i) => i.id !== id))
  },
  clearFinished() {
    set(items.filter((i) => i.phase !== "ready" && i.phase !== "failed"))
  },
  /** Forget everything (sign-out), so the next account doesn't see these. */
  reset() {
    set([])
  },
}

onSessionReset(() => uploadTracker.reset())

export function useUploads(): UploadItem[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => items,
  )
}
