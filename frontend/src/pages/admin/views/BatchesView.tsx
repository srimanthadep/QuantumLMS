import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  Layers,
  Plus,
  Calendar,
  Clock,
  Users,
  Video,
  Bot,
  MessageSquare,
  Award,
  Sparkles,
  AlertTriangle,
  Edit2,
  Trash2,
} from "lucide-react"
import type { useAdminStore, AdminBatch } from "@/data/adminStore"

interface BatchesViewProps {
  store: ReturnType<typeof useAdminStore>
  onOpenCreateBatch: () => void
}

export default function BatchesView({ store, onOpenCreateBatch }: BatchesViewProps) {
  const { batches, updateBatch, deleteBatch } = store
  const [filter, setFilter] = useState<string>("All")

  // Edit batch state
  const [editingBatch, setEditingBatch] = useState<AdminBatch | null>(null)
  const [editName, setEditName] = useState("")
  const [editSchedule, setEditSchedule] = useState("")
  const [editMaxSeats, setEditMaxSeats] = useState(100)
  const [editDeliveryMode, setEditDeliveryMode] = useState<AdminBatch["deliveryMode"]>("Live + Replay")
  const [editStatus, setEditStatus] = useState<AdminBatch["status"]>("Active")

  // Delete batch state
  const [deletingBatch, setDeletingBatch] = useState<AdminBatch | null>(null)

  const filteredBatches = batches.filter((b) => {
    if (filter === "All") return true
    return b.status === filter
  })

  const handleOpenEdit = (b: AdminBatch) => {
    setEditingBatch(b)
    setEditName(b.name)
    setEditSchedule(b.schedule)
    setEditMaxSeats(b.maxSeats)
    setEditDeliveryMode(b.deliveryMode)
    setEditStatus(b.status)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBatch || !editName.trim()) return

    updateBatch(editingBatch.id, {
      name: editName,
      schedule: editSchedule,
      maxSeats: Number(editMaxSeats),
      deliveryMode: editDeliveryMode,
      status: editStatus,
    })
    setEditingBatch(null)
  }

  const handleDeleteBatch = () => {
    if (!deletingBatch) return
    deleteBatch(deletingBatch.id)
    setDeletingBatch(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Cohort Batches & Schedules
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage live cohorts, seat fill rates, broadcast timetables, and student entitlements
          </p>
        </div>

        <Button onClick={onOpenCreateBatch}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create Cohort Batch
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {["All", "Active", "Upcoming", "Completed"].map((st) => (
          <Button
            key={st}
            size="sm"
            variant={filter === st ? "default" : "ghost"}
            onClick={() => setFilter(st)}
            className="h-8 text-xs font-semibold"
          >
            {st} Batches
          </Button>
        ))}
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {filteredBatches.map((batch) => {
          const fillPct = Math.round((batch.enrolledSeats / batch.maxSeats) * 100)
          const isFull = fillPct >= 90

          return (
            <div
              key={batch.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs hover:border-primary/40 transition-colors space-y-4"
            >
              <div className="space-y-3">
                {/* Top Badge & Status */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold text-primary-text mb-1">
                      {batch.courseTitle}
                    </div>
                    <h3 className="text-lg font-bold text-foreground leading-snug">
                      {batch.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={
                        batch.status === "Active"
                          ? "default"
                          : batch.status === "Upcoming"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {batch.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(batch)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary-text"
                      title="Edit Batch"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingBatch(batch)}
                      className="h-7 w-7 p-0 text-danger hover:text-danger hover:bg-danger/10"
                      title="Delete Batch"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Schedule & Timing Info */}
                <div className="space-y-2 rounded-xl border border-border bg-surface-2 p-3 text-xs">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Clock className="h-3.5 w-3.5 text-primary-text" />
                    <span>{batch.schedule}</span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/60">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {batch.startDate} ➔ {batch.endDate}
                    </span>
                    <span className="font-semibold text-foreground">
                      Lead: {batch.instructor}
                    </span>
                  </div>
                </div>

                {/* Seat Capacity Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      Seat Capacity
                    </span>
                    <span className={`font-mono font-bold ${isFull ? "text-danger" : "text-foreground"}`}>
                      {batch.enrolledSeats} / {batch.maxSeats} ({fillPct}%)
                    </span>
                  </div>

                  <Progress
                    value={fillPct}
                    className={`h-2 ${isFull ? "[&>div]:bg-danger" : "[&>div]:bg-primary"}`}
                  />

                  {isFull && (
                    <div className="text-[11px] text-danger flex items-center gap-1 font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      Nearly full — consider creating a new cohort batch
                    </div>
                  )}
                </div>
              </div>

              {/* Entitlement Badges */}
              <div className="border-t border-border pt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <Badge variant="outline" className="gap-1 bg-surface-2">
                  <Video className="h-3 w-3 text-primary-text" />
                  {batch.deliveryMode}
                </Badge>

                {batch.features.liveChat && (
                  <Badge variant="outline" className="gap-1 bg-surface-2">
                    <MessageSquare className="h-3 w-3 text-emerald-500" />
                    Live Chat
                  </Badge>
                )}

                {batch.features.aiTutor && (
                  <Badge variant="outline" className="gap-1 bg-surface-2">
                    <Bot className="h-3 w-3 text-blue-500" />
                    Clover AI Tutor
                  </Badge>
                )}

                {batch.features.certificate && (
                  <Badge variant="outline" className="gap-1 bg-surface-2">
                    <Award className="h-3 w-3 text-amber-500" />
                    Verified Certificate
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit Batch Modal */}
      <Dialog open={!!editingBatch} onOpenChange={(open) => !open && setEditingBatch(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text border border-primary-border">
                <Edit2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Edit Cohort Batch</DialogTitle>
                <DialogDescription>Modify batch timing, max capacity, or status</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editingBatch && (
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Cohort Name</label>
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Schedule</label>
                <Input
                  required
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Max Seats</label>
                  <Input
                    type="number"
                    min={10}
                    max={1000}
                    value={editMaxSeats}
                    onChange={(e) => setEditMaxSeats(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select
                    className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                  >
                    <option value="Active">Active</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Delivery Mode</label>
                <select
                  className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={editDeliveryMode}
                  onChange={(e) => setEditDeliveryMode(e.target.value as any)}
                >
                  <option value="Live + Replay">Live + Replay</option>
                  <option value="Replay Only">Replay Only</option>
                </select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingBatch(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Batch Confirmation Dialog */}
      <Dialog open={!!deletingBatch} onOpenChange={(open) => !open && setDeletingBatch(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-danger border border-danger/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Delete Cohort Batch?</DialogTitle>
                <DialogDescription>
                  This cohort will be permanently removed. Registered students may need reassignment.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deletingBatch && (
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">{deletingBatch.name}</p>
              <p className="text-muted-foreground">{deletingBatch.courseTitle} · {deletingBatch.schedule}</p>
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setDeletingBatch(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteBatch}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
