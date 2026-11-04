import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  GraduationCap,
  Plus,
  Star,
  Users,
  BookOpen,
  Mail,
  Search,
  Radio,
  Sparkles,
  Edit2,
  Trash2,
} from "lucide-react"
import type { useAdminStore, AdminTeacher } from "@/data/adminStore"

interface TeachersViewProps {
  store: ReturnType<typeof useAdminStore>
  onOpenAddTeacher: () => void
}

export default function TeachersView({ store, onOpenAddTeacher }: TeachersViewProps) {
  const { teachers, updateTeacher, deleteTeacher } = store
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("All")

  // Edit teacher state
  const [editingTeacher, setEditingTeacher] = useState<AdminTeacher | null>(null)
  const [editName, setEditName] = useState("")
  const [editRole, setEditRole] = useState<AdminTeacher["role"]>("Lead Instructor")
  const [editSpecialization, setEditSpecialization] = useState("")

  // Delete teacher state
  const [deletingTeacher, setDeletingTeacher] = useState<AdminTeacher | null>(null)

  const filteredTeachers = teachers.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.specialization.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === "All" || t.role === roleFilter
    return matchSearch && matchRole
  })

  const handleOpenEdit = (t: AdminTeacher) => {
    setEditingTeacher(t)
    setEditName(t.name)
    setEditRole(t.role)
    setEditSpecialization(t.specialization)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTeacher || !editName.trim()) return

    updateTeacher(editingTeacher.id, {
      name: editName,
      role: editRole,
      specialization: editSpecialization,
    })
    setEditingTeacher(null)
  }

  const handleDeleteTeacher = () => {
    if (!deletingTeacher) return
    deleteTeacher(deletingTeacher.id)
    setDeletingTeacher(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Instructors & Faculty
          </h1>
          <p className="text-sm text-muted-foreground">
            Faculty roster, domain specializations, teaching loads, and student feedback scores
          </p>
        </div>

        <Button onClick={onOpenAddTeacher}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Instructor / TA
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search instructors by name, domain, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">Role:</span>
          {["All", "Lead Instructor", "Teaching Assistant", "Evaluator"].map((r) => (
            <Button
              key={r}
              size="sm"
              variant={roleFilter === r ? "default" : "outline"}
              onClick={() => setRoleFilter(r)}
              className="h-8 text-xs"
            >
              {r}
            </Button>
          ))}
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {filteredTeachers.map((teacher) => (
          <div
            key={teacher.id}
            className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs hover:border-primary/40 transition-colors space-y-4"
          >
            <div className="space-y-3">
              {/* Profile Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={teacher.avatar}
                      alt={teacher.name}
                      className="h-12 w-12 rounded-full object-cover border border-border"
                      onError={(e) => {
                        ;(e.target as any).src = "/assets/srimanth.png"
                      }}
                    />
                    {teacher.status === "Live Now" && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger ring-2 ring-surface animate-pulse" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground leading-tight">
                      {teacher.name}
                    </h3>
                    <p className="text-xs text-primary-text font-medium">{teacher.title}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3" />
                      {teacher.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={
                      teacher.status === "Live Now"
                        ? "destructive"
                        : teacher.status === "Available"
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {teacher.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(teacher)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-primary-text"
                    title="Edit Instructor"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingTeacher(teacher)}
                    className="h-7 w-7 p-0 text-danger hover:text-danger hover:bg-danger/10"
                    title="Delete Instructor"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Specialization Pill */}
              <div className="p-2.5 rounded-xl border border-border bg-surface-2 text-xs">
                <span className="text-muted-foreground font-medium">Domain: </span>
                <span className="text-foreground font-semibold">{teacher.specialization}</span>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                <div className="rounded-lg bg-surface-2 p-2">
                  <div className="text-[11px] text-muted-foreground">Rating</div>
                  <div className="text-sm font-bold text-warning flex items-center justify-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    {teacher.rating}
                  </div>
                </div>

                <div className="rounded-lg bg-surface-2 p-2">
                  <div className="text-[11px] text-muted-foreground">Learners</div>
                  <div className="text-sm font-bold text-foreground font-mono">
                    {teacher.studentCount > 0 ? teacher.studentCount : "380+"}
                  </div>
                </div>

                <div className="rounded-lg bg-surface-2 p-2">
                  <div className="text-[11px] text-muted-foreground">Attendance</div>
                  <div className="text-sm font-bold text-success font-mono">
                    {teacher.attendanceRate}%
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Courses */}
            <div className="border-t border-border pt-3 space-y-1.5">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Assigned Curriculum
              </div>
              <div className="flex flex-wrap gap-1.5">
                {teacher.assignedCourses.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-[11px] bg-surface-2">
                    <BookOpen className="mr-1 h-3 w-3 text-primary-text" />
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Teacher Modal */}
      <Dialog open={!!editingTeacher} onOpenChange={(open) => !open && setEditingTeacher(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text border border-primary-border">
                <Edit2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Edit Faculty Profile</DialogTitle>
                <DialogDescription>Update teacher name, specialization, or staff role</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editingTeacher && (
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
                <label className="text-xs font-semibold text-foreground">Specialization Domain</label>
                <Input
                  required
                  value={editSpecialization}
                  onChange={(e) => setEditSpecialization(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Role</label>
                <select
                  className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                >
                  <option value="Lead Instructor">Lead Instructor</option>
                  <option value="Teaching Assistant">Teaching Assistant</option>
                  <option value="Evaluator">Evaluator</option>
                </select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingTeacher(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Teacher Confirmation Dialog */}
      <Dialog open={!!deletingTeacher} onOpenChange={(open) => !open && setDeletingTeacher(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-danger border border-danger/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Remove Faculty Member?</DialogTitle>
                <DialogDescription>
                  This teacher will be removed from the active faculty roster.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deletingTeacher && (
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">{deletingTeacher.name}</p>
              <p className="text-muted-foreground">{deletingTeacher.email} · {deletingTeacher.role}</p>
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setDeletingTeacher(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteTeacher}>
              Confirm Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
