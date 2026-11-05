import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle,
  Archive,
  Star,
  Users,
  Wallet,
  Sparkles,
  Edit2,
  Trash2,
  Video,
  ClipboardCheck,
} from "lucide-react"
import type { useAdminStore, AdminCourse } from "@/data/adminStore"
import VideoCourseUploadModal from "./VideoCourseUploadModal"

interface CoursesViewProps {
  store: ReturnType<typeof useAdminStore>
  onToast: (msg: string) => void
}

export default function CoursesView({ store, onToast }: CoursesViewProps) {
  const navigate = useNavigate()
  const { courses, addCourse, updateCourse, toggleCourseStatus, deleteCourse } = store

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [selectedStatus, setSelectedStatus] = useState<string>("All")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isVideoUploadOpen, setIsVideoUploadOpen] = useState(false)

  // Edit course state
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editCategory, setEditCategory] = useState<AdminCourse["category"]>("LLM Engineering")
  const [editInstructor, setEditInstructor] = useState("Srimanth")
  const [editPrice, setEditPrice] = useState(39999)
  const [editCapacity, setEditCapacity] = useState(300)
  const [editStatus, setEditStatus] = useState<AdminCourse["status"]>("Published")

  // Delete confirm state
  const [deletingCourse, setDeletingCourse] = useState<AdminCourse | null>(null)

  // New course state
  const [newTitle, setNewTitle] = useState("")
  const [newCategory, setNewCategory] = useState<AdminCourse["category"]>("LLM Engineering")
  const [newInstructor, setNewInstructor] = useState("Srimanth")
  const [newPrice, setNewPrice] = useState(39999)
  const [newCapacity, setNewCapacity] = useState(300)

  const categories = ["All", "LLM Engineering", "Agentic Systems", "MLOps", "Computer Vision", "AI Foundations"]

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.instructor.toLowerCase().includes(search.toLowerCase())
      const matchCat = selectedCategory === "All" || c.category === selectedCategory
      const matchStatus = selectedStatus === "All" || c.status === selectedStatus
      return matchSearch && matchCat && matchStatus
    })
  }, [courses, search, selectedCategory, selectedStatus])

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    addCourse({
      title: newTitle,
      slug,
      category: newCategory,
      instructor: newInstructor,
      instructorAvatar: newInstructor === "Srimanth" ? "/assets/srimanth.png" : "/assets/teacher-male.png",
      capacity: Number(newCapacity),
      price: Number(newPrice),
      status: "Published",
    })

    setNewTitle("")
    setIsAddModalOpen(false)
    onToast(`Published new course: "${newTitle}"`)
  }

  const handleOpenEdit = (c: AdminCourse) => {
    setEditingCourse(c)
    setEditTitle(c.title)
    setEditCategory(c.category)
    setEditInstructor(c.instructor)
    setEditPrice(c.price)
    setEditCapacity(c.capacity)
    setEditStatus(c.status)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourse || !editTitle.trim()) return

    updateCourse(editingCourse.id, {
      title: editTitle,
      category: editCategory,
      instructor: editInstructor,
      price: Number(editPrice),
      capacity: Number(editCapacity),
      status: editStatus,
    })

    setEditingCourse(null)
    onToast(`Updated course: "${editTitle}"`)
  }

  const handleDeleteCourse = () => {
    if (!deletingCourse) return
    deleteCourse(deletingCourse.id)
    onToast(`Permanently deleted course: "${deletingCourse.title}"`)
    setDeletingCourse(null)
  }

  const handleToggleStatus = (c: AdminCourse) => {
    toggleCourseStatus(c.id)
    const next = c.status === "Published" ? "Archived" : "Published"
    onToast(`Course status changed to ${next}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Curriculum & Courses
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage AI courses, pricing tiers, publication status, and seat enrollments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/approvals")}
            leftIcon={<ClipboardCheck className="h-4 w-4 text-warning" />}
          >
            Teacher Approvals
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsVideoUploadOpen(true)}
            leftIcon={<Video className="h-4 w-4 text-primary" />}
          >
            Upload Video Course
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Add AI Course
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search course title or instructor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Status:</span>
            {["All", "Published", "Draft", "Archived"].map((st) => (
              <Button
                key={st}
                size="sm"
                variant={selectedStatus === st ? "default" : "outline"}
                onClick={() => setSelectedStatus(st)}
                className="h-8 text-xs"
              >
                {st}
              </Button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <span className="text-xs font-medium text-muted-foreground mr-1">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-primary-soft text-primary-text border border-primary-border"
                  : "bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 w-[320px]">Course Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Lead Instructor</th>
                <th className="px-4 py-3">Enrolled / Cap</th>
                <th className="px-4 py-3">Tuition Price</th>
                <th className="px-4 py-3">Total Revenue</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="h-32 text-center text-muted-foreground px-4 py-3">
                    No courses match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-2/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-text font-bold">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm">{c.title}</div>
                          <div className="text-xs text-muted-foreground">{c.cohortCount} cohorts delivered</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs font-normal">
                        {c.category}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{c.instructor}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="text-xs font-mono font-medium text-foreground">
                          {c.enrolledStudents} / {c.capacity}
                        </div>
                        <div className="h-1.5 w-24 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.min(100, (c.enrolledStudents / c.capacity) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-sm font-semibold text-foreground">
                      ₹{c.price.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3 font-mono text-sm font-semibold text-primary-text">
                      ₹{c.revenue.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs font-semibold text-warning">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span>{c.rating}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          c.status === "Published"
                            ? "default"
                            : c.status === "Draft"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(c)}
                          className="h-8 px-2 text-xs text-primary-text hover:text-primary-hover"
                          title="Edit Course"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(c)}
                          className="h-8 px-2 text-xs"
                          title={c.status === "Published" ? "Archive Course" : "Publish Course"}
                        >
                          {c.status === "Published" ? (
                            <span className="text-muted-foreground hover:text-warning">Archive</span>
                          ) : (
                            <span className="text-success hover:text-success">Publish</span>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingCourse(c)}
                          className="h-8 px-2 text-xs text-danger hover:text-danger hover:bg-danger/10"
                          title="Delete Course"
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

      {/* Add Course Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text border border-primary-border">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Add New AI Course</DialogTitle>
                <DialogDescription>Create a master course curriculum for cohort enrollment</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateCourse} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Course Title</label>
              <Input
                required
                placeholder="e.g. Multi-Modal Vision & Speech Systems"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Domain Category</label>
                <select
                  className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                >
                  <option value="LLM Engineering">LLM Engineering</option>
                  <option value="Agentic Systems">Agentic Systems</option>
                  <option value="MLOps">MLOps</option>
                  <option value="Computer Vision">Computer Vision</option>
                  <option value="AI Foundations">AI Foundations</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Lead Instructor</label>
                <select
                  className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newInstructor}
                  onChange={(e) => setNewInstructor(e.target.value)}
                >
                  <option value="Srimanth">Srimanth</option>
                  <option value="Dr. Vikram Sen">Dr. Vikram Sen</option>
                  <option value="Meera Nair">Meera Nair</option>
                  <option value="Ananya Roy">Ananya Roy</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Tuition Fee (₹ INR)</label>
                <Input
                  type="number"
                  min={1000}
                  step={1}
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Max Learner Capacity</label>
                <Input
                  type="number"
                  min={50}
                  max={1000}
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Publish to Catalog</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Course Modal */}
      <Dialog open={!!editingCourse} onOpenChange={(open) => !open && setEditingCourse(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text border border-primary-border">
                <Edit2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Edit Course Curriculum</DialogTitle>
                <DialogDescription>Modify syllabus details, tuition fees, and capacity</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editingCourse && (
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Course Title</label>
                <Input
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Domain Category</label>
                  <select
                    className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                  >
                    <option value="LLM Engineering">LLM Engineering</option>
                    <option value="Agentic Systems">Agentic Systems</option>
                    <option value="MLOps">MLOps</option>
                    <option value="Computer Vision">Computer Vision</option>
                    <option value="AI Foundations">AI Foundations</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Lead Instructor</label>
                  <Input
                    required
                    value={editInstructor}
                    onChange={(e) => setEditInstructor(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Tuition Fee (₹ INR)</label>
                  <Input
                    type="number"
                    min={1000}
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Max Learner Capacity</label>
                  <Input
                    type="number"
                    min={10}
                    max={2000}
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Publication Status</label>
                <select
                  className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                >
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingCourse(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Course Confirmation Dialog */}
      <Dialog open={!!deletingCourse} onOpenChange={(open) => !open && setDeletingCourse(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-danger border border-danger/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Permanently Delete Course?</DialogTitle>
                <DialogDescription>
                  This will remove the course curriculum, modules, and lessons. This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deletingCourse && (
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">{deletingCourse.title}</p>
              <p className="text-muted-foreground">{deletingCourse.instructor} · {deletingCourse.category} · {deletingCourse.enrolledStudents} learners</p>
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setDeletingCourse(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteCourse}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Course Upload & Audio Extraction Modal */}
      <VideoCourseUploadModal
        open={isVideoUploadOpen}
        onOpenChange={setIsVideoUploadOpen}
        onCourseCreated={(newCourse) => {
          addCourse(newCourse)
        }}
        onToast={onToast}
      />
    </div>
  )
}
