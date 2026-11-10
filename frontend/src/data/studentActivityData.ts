import type {
  StudentItem,
  StudentDayActivity,
  StudentActivitySummary,
} from "../types"

export function getStudentActivityHeatmap(student: StudentItem): StudentActivitySummary {
  const days: StudentDayActivity[] = []
  const today = new Date()

  // Generate 84 days (12 weeks * 7 days)
  for (let offset = 83; offset >= 0; offset--) {
    const d = new Date(today)
    d.setDate(d.getDate() - offset)
    const dateStr = d.toISOString().split("T")[0]
    const dayOfWeek = (d.getDay() + 6) % 7

    days.push({
      date: dateStr,
      dayOfWeek,
      level: 0,
      count: 0,
      events: [],
    })
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const weeks: { weekIndex: number; monthLabel?: string; days: StudentDayActivity[] }[] = []

  let lastMonth = -1
  for (let w = 0; w < 12; w++) {
    const weekDays = days.slice(w * 7, (w + 1) * 7)
    let monthLabel: string | undefined = undefined
    if (weekDays.length > 0) {
      const firstDate = new Date(weekDays[0].date)
      const currentMonth = firstDate.getMonth()
      if (currentMonth !== lastMonth) {
        monthLabel = monthNames[currentMonth]
        lastMonth = currentMonth
      }
    }

    weeks.push({
      weekIndex: w + 1,
      monthLabel,
      days: weekDays,
    })
  }

  return {
    studentId: student.id,
    totalActiveDays: 0,
    totalActivities: 0,
    mostRecentDate: today.toISOString().split("T")[0],
    currentStreakDays: 0,
    longestStreakDays: 0,
    isDemoData: false,
    weeks,
  }
}
