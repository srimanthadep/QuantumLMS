import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowRightLeft,
  Download,
  Loader2,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { CustomSelect } from "@/components/ui/select"
import type {
  AdminBatch,
  BatchAvailableStudent,
  BatchRosterStatus,
  BatchRosterStudent,
  useAdminStore,
} from "@/data/adminStore"
import { cn } from "@/lib/utils"
import { PanelHeader, WorkspaceEmpty } from "../courses/WorkspaceParts"
import { seatTone, seatUtilization } from "./batchTheme"
import BatchEnrollmentPanel from "./BatchEnrollmentPanel"
interface BatchRosterPanelProps {
  batch: AdminBatch
  allBatches: AdminBatch[]
  store: ReturnType<typeof useAdminStore>
  onToast?: (msg: string) => void
  onBusyChange: (busy: boolean) => void
  onRosterLoaded?: (liveBatch: AdminBatch, studentCount: number) => void
}
const ROSTER_STATUS_OPTIONS: {
  value: BatchRosterStatus
  label: string
}[] = [
  { value: "Active", label: "Active" },
  { value: "Waitlisted", label: "Waitlisted" },
  { value: "Completed", label: "Completed" },
  { value: "Paused", label: "Paused" },
  { value: "At Risk", label: "At Risk" },
]
const STATUS_TONE: Record<BatchRosterStatus, BadgeTone> = {
  Active: "success",
  Waitlisted: "warning",
  Completed: "info",
  Paused: "neutral",
  "At Risk": "danger",
}
const csvCell = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`
/** Full-width Students & Roster workspace tab inside the Batch Workspace modal. */
export default function BatchRosterPanel({
  batch,
  allBatches,
  store,
  onToast,
  onRosterLoaded,
  onBusyChange,
}: BatchRosterPanelProps) {
  const {
    fetchBatchStudents,
    addStudentsToBatch,
    updateBatchStudent,
    removeStudentFromBatch,
  } = store
  const [loading, setLoading] = useState(false)
  const [liveBatch, setLiveBatch] = useState<AdminBatch>(batch)
  const [students, setStudents] = useState<BatchRosterStudent[]>([])
  const [available, setAvailable] = useState<BatchAvailableStudent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [rosterSearch, setRosterSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null)
  const [transferTarget, setTransferTarget] = useState<Record<string, string>>(
    {},
  )
  const activeBatch =
    liveBatch.id === batch.id
      ? {
          ...batch,
          enrolledSeats: liveBatch.enrolledSeats,
          waitlistedSeats: liveBatch.waitlistedSeats,
        }
      : batch
  const loadRoster = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBatchStudents(batch.id)
      setLiveBatch(data.batch)
      setStudents(data.students)
      setAvailable(data.availableStudents)
      onRosterLoaded?.(data.batch, data.students.length)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load batch roster.",
      )
    } finally {
      setLoading(false)
    }
  }, [batch.id, fetchBatchStudents, onRosterLoaded])
  useEffect(() => {
    setLiveBatch(batch)
    setShowAddPanel(false)
    setRosterSearch("")
    setStatusFilter("All")
    loadRoster()
  }, [batch.id, loadRoster])
  const filteredRoster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase()
    return students.filter((s) => {
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q)
      const matchesStatus = statusFilter === "All" || s.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [students, rosterSearch, statusFilter])
  const otherBatches = useMemo(
    () =>
      allBatches.filter(
        (b) => b.id !== activeBatch.id && b.status !== "Archived",
      ),
    [allBatches, activeBatch.id],
  )
  const handleStatusChange = async (
    student: BatchRosterStudent,
    nextStatus: BatchRosterStatus,
  ) => {
    if (nextStatus === student.status) return
    setBusyStudentId(student.id)
    setError(null)
    try {
      await updateBatchStudent(activeBatch.id, student.id, {
        status: nextStatus,
      })
      onToast?.(`${student.name} marked ${nextStatus}`)
      await loadRoster()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update student status.",
      )
    } finally {
      setBusyStudentId(null)
    }
  }
  const handleTransfer = async (
    student: BatchRosterStudent,
    targetId: string,
  ) => {
    if (!targetId || targetId === activeBatch.id) return
    setBusyStudentId(student.id)
    setError(null)
    try {
      const targetName =
        allBatches.find((b) => b.id === targetId)?.name ?? "target batch"
      await updateBatchStudent(activeBatch.id, student.id, {
        targetBatchId: targetId,
      })
      onToast?.(`Transferred ${student.name} to ${targetName}`)
      setTransferTarget((prev) => {
        const next = { ...prev }
        delete next[student.id]
        return next
      })
      await loadRoster()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not transfer student.",
      )
    } finally {
      setBusyStudentId(null)
    }
  }
  const handleRemove = async (student: BatchRosterStudent) => {
    setBusyStudentId(student.id)
    setError(null)
    try {
      await removeStudentFromBatch(activeBatch.id, student.id)
      onToast?.(`Removed ${student.name} from ${activeBatch.name}`)
      await loadRoster()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not remove student from batch.",
      )
    } finally {
      setBusyStudentId(null)
    }
  }
  const handleExportCsv = () => {
    if (students.length === 0) return
    const headers = [
      "Roll Number",
      "Name",
      "Email",
      "Status",
      "Join click %",
      "Progress %",
      "Joined",
    ]
    const lines = [
      headers.map(csvCell).join(","),
      ...students.map((s) =>
        [
          s.rollNumber,
          s.name,
          s.email,
          s.status,
          s.attendanceRate ?? "",
          s.courseProgress,
          s.enrolledAt,
        ]
          .map(csvCell)
          .join(","),
      ),
    ]
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${activeBatch.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-roster.csv`
    link.click()
    URL.revokeObjectURL(url)
    onToast?.(`Exported ${students.length} roster record(s)`)
  }
  const pct = seatUtilization(activeBatch.enrolledSeats, activeBatch.maxSeats)
  if (showAddPanel) {
    return (
      <BatchEnrollmentPanel
        batch={activeBatch}
        available={available}
        addStudents={addStudentsToBatch}
        onBack={() => setShowAddPanel(false)}
        onAdded={async () => {
          await loadRoster()
          setShowAddPanel(false)
        }}
        onBusyChange={onBusyChange}
        onToast={onToast}
      />
    )
  }
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PanelHeader
        title="Learners"
        description="The people in this cohort. Manage enrollment, progress and access in one place."
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={students.length === 0}
          onClick={handleExportCsv}
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={loading || !!error}
          onClick={() => setShowAddPanel(true)}
          leftIcon={<UserPlus />}
        >
          Add students
        </Button>
      </PanelHeader>
      <div className="space-y-4">
        {/* Capacity Bar Card */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              Enrollment:{" "}
              <strong className="font-semibold text-foreground tabular-nums">
                {activeBatch.enrolledSeats} / {activeBatch.maxSeats}
              </strong>
              {activeBatch.waitlistedSeats > 0 && (
                <span className="ml-2 font-medium text-warning">
                  ({activeBatch.waitlistedSeats} waitlisted)
                </span>
              )}
            </span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                pct >= 100
                  ? "text-danger"
                  : pct >= 85
                    ? "text-warning"
                    : "text-primary-text",
              )}
            >
              {pct}% filled
            </span>
          </div>
          <Progress
            value={pct}
            tone={seatTone(pct)}
            label={`${activeBatch.name} seat occupancy`}
          />
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-xs font-medium text-danger"
          >
            {error}
            <button
              type="button"
              disabled={loading}
              onClick={loadRoster}
              className="ml-3 rounded font-semibold underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}
        {/* Roster Filter Bar */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <Input
            leading={<Search className="h-4 w-4" />}
            placeholder="Filter enrolled students by name, email, or roll number..."
            aria-label="Search enrolled learners"
            value={rosterSearch}
            onChange={(e) => setRosterSearch(e.target.value)}
            wrapperClassName="flex-1"
          />
          <CustomSelect
            aria-label="Filter learners by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "All", label: `All Statuses (${students.length})` },
              ...ROSTER_STATUS_OPTIONS.map((o) => ({
                value: o.value,
                label: `${o.label} (${students.filter((s) => s.status === o.value).length})`,
              })),
            ]}
            className="sm:w-52"
          />
        </div>
        {/* Enrolled Students List */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-14 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading batch roster...
          </div>
        ) : filteredRoster.length === 0 ? (
          <WorkspaceEmpty
            icon={Users}
            title={
              students.length === 0
                ? "No students in this batch yet"
                : "No matching students"
            }
            description={
              students.length === 0
                ? "Add existing students or enrol a new learner directly into this cohort."
                : "Adjust your search or status filter."
            }
          >
            {students.length === 0 && !showAddPanel && (
              <Button
                type="button"
                size="sm"
                onClick={() => setShowAddPanel(true)}
                disabled={loading || !!error}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add students
              </Button>
            )}
          </WorkspaceEmpty>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            {filteredRoster.map((student) => {
              const isBusy = busyStudentId === student.id
              return (
                <div
                  key={student.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      src={student.avatarUrl || ""}
                      name={student.name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {student.name}
                        </span>
                        {student.rollNumber && (
                          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {student.rollNumber}
                          </span>
                        )}
                        <Badge tone={STATUS_TONE[student.status]}>
                          {student.status}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="truncate">{student.email}</span>
                        <span>· Join clicks: {student.attendanceRate == null ? "No ended classes" : `${student.attendanceRate}%`}</span>
                        <span>· Progress: {student.courseProgress}%</span>
                        {student.enrolledAt && (
                          <span>· Joined {student.enrolledAt}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <CustomSelect
                      aria-label={`Enrollment status for ${student.name}`}
                      value={student.status}
                      onChange={(v) =>
                        handleStatusChange(student, v as BatchRosterStatus)
                      }
                      options={ROSTER_STATUS_OPTIONS}
                      className="w-32"
                    />
                    {otherBatches.length > 0 && (
                      <div className="flex items-center gap-1">
                        <CustomSelect
                          aria-label={`Transfer ${student.name} to another batch`}
                          value={transferTarget[student.id] ?? ""}
                          placeholder="Transfer..."
                          onChange={(targetId) => {
                            setTransferTarget((prev) => ({
                              ...prev,
                              [student.id]: targetId,
                            }))
                            handleTransfer(student, targetId)
                          }}
                          options={otherBatches.map((b) => ({
                            value: b.id,
                            label: b.name,
                          }))}
                          className="w-36"
                        />
                        <ArrowRightLeft
                          className="hidden h-3.5 w-3.5 text-muted-foreground sm:block"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      aria-label={`Remove ${student.name} from batch`}
                      className="border-danger/30 text-danger hover:bg-danger/10"
                      onClick={() => handleRemove(student)}
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
