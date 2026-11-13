import { useState } from "react"
import { Button, Input } from "@/components/ui"
import { useAttendance } from "@/pages/student/data/hooks"
import { useStudentData } from "@/pages/student/data/StudentDataProvider"
import { requestLeave } from "@/pages/student/data/schedule"
import { ScheduleField } from "./SessionScheduleForm"

export default function LeaveRequests() {
  const { view: { courses } } = useStudentData(), attendance = useAttendance()
  const [course, setCourse] = useState(""), [date, setDate] = useState(""), [reason, setReason] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false)
  return <details className="mt-6 rounded-2xl border border-border bg-surface p-5"><summary className="cursor-pointer font-medium">Leave requests</summary><div className="mt-4 space-y-4">
    <p className="text-sm text-muted-foreground">Submit a request to your academy. Approval does not change a recorded join click.</p>
    <div className="grid gap-3 sm:grid-cols-2"><ScheduleField label="Course"><select className="h-10 rounded-lg border border-border bg-surface px-3" value={course} onChange={e => setCourse(e.target.value)}><option value="">Choose course</option>{courses.map(c => <option key={c.id} value={c.code}>{c.title}</option>)}</select></ScheduleField><ScheduleField label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></ScheduleField></div>
    <ScheduleField label="Reason"><Input value={reason} onChange={e => setReason(e.target.value)} /></ScheduleField>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <Button type="button" disabled={busy || !course || !date || !reason.trim()} onClick={async () => { setBusy(true); setError(""); try { await requestLeave(course,date,reason); setReason(""); await attendance.reload() } catch (e) { setError(e instanceof Error ? e.message : "Unable to submit request") } finally { setBusy(false) } }}>{busy ? "Submitting…" : "Submit request"}</Button>
    {attendance.data?.leaves.map(r => <p className="border-t border-border pt-3 text-sm" key={r.id}>{r.course_code} · {r.leave_date} · {r.status}</p>)}
  </div></details>
}
