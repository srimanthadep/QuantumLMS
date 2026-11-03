import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  UserPlus,
  Search,
  CheckCircle,
  AlertTriangle,
  GraduationCap,
  Sparkles,
} from "lucide-react"
import type { useAdminStore } from "@/data/adminStore"

interface StudentsViewProps {
  store: ReturnType<typeof useAdminStore>
  onOpenManualEnrol: () => void
}

export default function StudentsView({ store, onOpenManualEnrol }: StudentsViewProps) {
  const { students, courses } = store
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [courseFilter, setCourseFilter] = useState("All")

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.courseTitle.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "All" || s.status === statusFilter
      const matchCourse = courseFilter === "All" || s.courseId === courseFilter
      return matchSearch && matchStatus && matchCourse
    })
  }, [students, search, statusFilter, courseFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Student Roster & Enrolments
          </h1>
          <p className="text-sm text-muted-foreground">
            Learner progress tracking, live attendance rates, rubric evaluation scores, and cohort management
          </p>
        </div>

        <Button onClick={onOpenManualEnrol}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          Manual Enrolment
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search learner by name, email, course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Status:</span>
            {["All", "Active", "Completed", "At Risk"].map((st) => (
              <Button
                key={st}
                size="sm"
                variant={statusFilter === st ? "default" : "outline"}
                onClick={() => setStatusFilter(st)}
                className="h-8 text-xs"
              >
                {st}
              </Button>
            ))}
          </div>

          <select
            className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="All">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 w-[280px]">Learner</th>
                <th className="px-4 py-3">Course & Cohort</th>
                <th className="px-4 py-3">Enrolled Date</th>
                <th className="px-4 py-3">Curriculum Progress</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-32 text-center text-muted-foreground px-4 py-3">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={s.avatar}
                          alt={s.name}
                          className="h-9 w-9 rounded-full object-cover border border-border"
                          onError={(e) => {
                            ;(e.target as any).src = "/assets/student-1.png"
                          }}
                        />
                        <div>
                          <div className="font-semibold text-foreground text-sm">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="font-medium text-foreground text-xs">{s.courseTitle}</div>
                        <div className="text-[11px] text-primary-text">{s.batchName}</div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {s.enrolledAt}
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="text-xs font-mono font-semibold text-foreground">
                          {s.progress}%
                        </div>
                        <div className="h-1.5 w-24 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${s.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-mono font-semibold ${
                          s.attendanceRate >= 80 ? "text-success" : "text-danger"
                        }`}
                      >
                        {s.attendanceRate}%
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-bold text-foreground">
                        {s.evaluationScore}/100
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          s.status === "Active"
                            ? "default"
                            : s.status === "Completed"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
