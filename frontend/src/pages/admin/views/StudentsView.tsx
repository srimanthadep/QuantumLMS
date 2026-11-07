import { useState } from "react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CustomSelect } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Users,
  UserPlus,
  Search,
  Sparkles,
  Edit2,
  Trash2,
} from "lucide-react"
import type { useAdminStore, AdminStudent } from "@/data/adminStore"

interface StudentsViewProps {
  store: ReturnType<typeof useAdminStore>
  onOpenManualEnrol: () => void
}

export default function StudentsView({ store, onOpenManualEnrol }: StudentsViewProps) {
  const { students, updateStudent, deleteStudent } = store
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [selectedBatch, setSelectedBatch] = useState("All")

  // Edit student state
  const [editingStudent, setEditingStudent] = useState<AdminStudent | null>(null)
  const [editName, setEditName] = useState("")
  const [editBatchName, setEditBatchName] = useState("")
  const [editStatus, setEditStatus] = useState<AdminStudent["status"]>("Active")

  // Delete student state
  const [deletingStudent, setDeletingStudent] = useState<AdminStudent | null>(null)

  const batches = Array.from(new Set(students.map((s) => s.batchName)))

  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.courseTitle.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "All" || s.status === statusFilter
    const matchBatch = selectedBatch === "All" || s.batchName === selectedBatch
    return matchSearch && matchStatus && matchBatch
  })

  const handleOpenEdit = (s: AdminStudent) => {
    setEditingStudent(s)
    setEditName(s.name)
    setEditBatchName(s.batchName)
    setEditStatus(s.status)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent || !editName.trim()) return

    updateStudent(editingStudent.id, {
      name: editName,
      batchName: editBatchName,
      status: editStatus,
    })
    setEditingStudent(null)
  }

  const handleDeleteStudent = () => {
    if (!deletingStudent) return
    deleteStudent(deletingStudent.id)
    setDeletingStudent(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Learner Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            Enrolled students, syllabus completion rates, cohort progress, and evaluation grades
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
            placeholder="Search students by name, email, or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
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

          <CustomSelect
            className="w-36"
            triggerClassName="h-8 text-xs py-1"
            value={selectedBatch}
            onChange={setSelectedBatch}
            options={["All", ...batches].map((b) => ({
              value: b,
              label: b === "All" ? "All Cohorts" : b,
            }))}
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Learner Profile</th>
                <th className="px-4 py-3">Course Track</th>
                <th className="px-4 py-3">Enrolled Date</th>
                <th className="px-4 py-3">Curriculum Progress</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 text-center text-muted-foreground px-4 py-3">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={s.avatar} name={s.name} size="md" />
                        <div>
                          <div className="font-semibold text-foreground text-sm">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="font-medium text-foreground text-xs">{s.courseTitle}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{s.batchName}</div>
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

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(s)}
                          className="h-8 px-2 text-xs text-primary-text hover:text-primary-hover"
                          title="Edit Learner"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingStudent(s)}
                          className="h-8 px-2 text-xs text-danger hover:text-danger hover:bg-danger/10"
                          title="Delete Learner"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Student Modal */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text border border-primary-border">
                <Edit2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Edit Learner Profile</DialogTitle>
                <DialogDescription>Modify student details, cohort batch, or progress status</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editingStudent && (
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Full Name</label>
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Cohort Batch</label>
                <Input
                  required
                  value={editBatchName}
                  onChange={(e) => setEditBatchName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Status</label>
                <CustomSelect
                  value={editStatus}
                  onChange={(val) => setEditStatus(val as any)}
                  options={["Active", "Completed", "At Risk", "Paused"]}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Student Confirmation Dialog */}
      <Dialog open={!!deletingStudent} onOpenChange={(open) => !open && setDeletingStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-danger border border-danger/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Delete Learner Record?</DialogTitle>
                <DialogDescription>
                  This student and their active course enrollment will be permanently removed.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deletingStudent && (
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">{deletingStudent.name}</p>
              <p className="text-muted-foreground">{deletingStudent.email} · {deletingStudent.courseTitle}</p>
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setDeletingStudent(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteStudent}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
