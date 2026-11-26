import { useEffect, useRef } from "react"
import { useToast } from "@/components/ui/toast"
import { useStudentData, useStudentResource } from "./StudentDataProvider"
import { classAlertCopy, classAlerts, rememberAlert, seenAlerts, type AlertSession } from "./classAlerts"
import { loadTimetable, type SlotRow } from "./schedule"

/**
 * Toasts for the student's classes: once when one is about to start (joining has opened) and once when it is live or
 * has started. Reads the same timetable the Schedule page uses. Start times are already in it, so the minute tick finds
 * classes that are due; the timetable reloads only when the tab comes back into view.
 */
export function useLiveClassAlerts(onOpenTimetable: () => void) {
  const { uid, now } = useStudentData()
  const toast = useToast()
  const timetable = useStudentResource<SlotRow[]>("timetable", loadTimetable, 15_000)
  const { reload, data } = timetable
  const open = useRef(onOpenTimetable)
  open.current = onOpenTimetable

  // Pick up classes added, moved or started early while the tab was in the background.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void reload()
    }
    document.addEventListener("visibilitychange", refresh)
    return () => document.removeEventListener("visibilitychange", refresh)
  }, [reload])

  useEffect(() => {
    if (!data) return
    const clock = Date.now()
    const seen = seenAlerts(uid, clock)
    for (const alert of classAlerts(data as AlertSession[], clock)) {
      if (seen[alert.key]) continue
      rememberAlert(uid, alert.key, clock)
      const copy = classAlertCopy(alert)
      toast.show(copy.message, {
        title: copy.title,
        description: copy.description,
        tone: copy.live ? "success" : "info",
        duration: 15_000,
        action: { label: copy.live ? "Join from timetable" : "Open timetable", onClick: () => open.current() },
      })
    }
  }, [data, now, uid, toast])
}
