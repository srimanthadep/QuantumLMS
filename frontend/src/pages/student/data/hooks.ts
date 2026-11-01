import { useCallback, useMemo } from "react"
import { useStudentData, useStudentResource } from "./StudentDataProvider"
import { loadActivity, loadAttendance, loadReminders, loadTimetable, reminderKey, setReminder, timetableWeek, type ReminderType } from "./schedule"

/** The student's "remind me" toggles for classes, quizzes and events. toggle resolves to the new state. */
export function useReminders() {
  const res = useStudentResource("reminders", loadReminders, 300_000)
  const keys = useMemo(() => new Set(res.data ?? []), [res.data])
  const { mutate } = res
  const toggle = useCallback(
    async (type: ReminderType, id: string): Promise<boolean> => {
      const k = reminderKey(type, id)
      const on = !keys.has(k)
      const apply = (value: boolean) => mutate((list) => (value ? [...list.filter((x) => x !== k), k] : list.filter((x) => x !== k)))
      apply(on)
      try {
        await setReminder(type, id, on)
      } catch (e) {
        apply(!on)
        throw e
      }
      return on
    },
    [keys, mutate],
  )
  const has = useCallback((type: ReminderType, id: string) => keys.has(reminderKey(type, id)), [keys])
  return { has, toggle, ready: !!res.data }
}

/** This week's timetable with live statuses (re-evaluated every minute). */
export function useTimetable() {
  const { now } = useStudentData()
  const res = useStudentResource("timetable", loadTimetable, 600_000)
  const week = useMemo(() => (res.data ? timetableWeek(res.data, now) : null), [res.data, now])
  return { ...res, week }
}

export function useAttendance() {
  return useStudentResource("attendance", loadAttendance, 300_000)
}

export function useActivity() {
  return useStudentResource("activity", loadActivity, 120_000)
}
