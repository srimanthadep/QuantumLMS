import { useEffect, useState } from "react"
import { api } from "@/lib/api"

const EVENT = "qlms:approvals-changed"
const POLL_MS = 60_000

/** Tell every listener (the sidebar badge) that the queue changed, e.g. after an approve or decline. */
export function announceApprovalsChanged() {
  window.dispatchEvent(new Event(EVENT))
}

/**
 * Pending approval count for the sidebar badge. Refreshes every minute while the tab is visible,
 * when the tab regains focus, and right after a decision on the Approvals page.
 */
export function usePendingApprovals(enabled = true): number {
  const [pending, setPending] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let active = true
    const load = () => {
      if (document.visibilityState === "hidden") return
      api
        .get<{ pending: number }>("/admin/approvals/count", { bypassCache: true })
        .then((r) => active && setPending(r.pending))
        .catch(() => {
          // The badge is a hint; the page itself reports errors.
        })
    }
    load()
    const timer = window.setInterval(load, POLL_MS)
    window.addEventListener(EVENT, load)
    document.addEventListener("visibilitychange", load)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener(EVENT, load)
      document.removeEventListener("visibilitychange", load)
    }
  }, [enabled])

  return pending
}
