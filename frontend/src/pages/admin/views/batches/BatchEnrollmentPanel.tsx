import { useDeferredValue, useMemo, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Info,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import type {
  AdminBatch,
  BatchAvailableStudent,
  useAdminStore,
} from "@/data/adminStore"
import { cn } from "@/lib/utils"
import { seatTone, seatUtilization } from "./batchTheme"

interface BatchEnrollmentPanelProps {
  batch: AdminBatch
  available: BatchAvailableStudent[]
  addStudents: ReturnType<typeof useAdminStore>["addStudentsToBatch"]
  onBack: () => void
  onAdded: () => Promise<void>
  onBusyChange: (busy: boolean) => void
  onToast?: (message: string) => void
}

const MAX_SELECTION = 200

export default function BatchEnrollmentPanel({
  batch,
  available,
  addStudents,
  onBack,
  onAdded,
  onBusyChange,
  onToast,
}: BatchEnrollmentPanelProps) {
  const [mode, setMode] = useState<"existing" | "new">("existing")
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [status, setStatus] = useState<"Active" | "Waitlisted">("Active")
  const [autoWaitlist, setAutoWaitlist] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [program, setProgram] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visible = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return available.filter(
      (student) =>
        !q ||
        [student.name, student.email, student.rollNumber].some((value) =>
          value.toLowerCase().includes(q),
        ),
    )
  }, [available, deferredSearch])
  const selected = useMemo(() => new Set(selectedIds), [selectedIds])
  const visibleSelected = visible.filter((student) =>
    selected.has(student.id),
  ).length
  const allVisibleSelected =
    visible.length > 0 && visibleSelected === visible.length
  const selectionCount =
    mode === "existing"
      ? selectedIds.length
      : name.trim() || email.trim()
        ? 1
        : 0
  const seatsLeft = Math.max(0, batch.maxSeats - batch.enrolledSeats)
  const tooMany =
    status === "Active" && !autoWaitlist && selectionCount > seatsLeft
  const enrolling =
    status === "Waitlisted" ? 0 : Math.min(selectionCount, seatsLeft)
  const waitlisting =
    status === "Waitlisted"
      ? selectionCount
      : autoWaitlist
        ? Math.max(0, selectionCount - seatsLeft)
        : 0
  const occupancy = seatUtilization(batch.enrolledSeats, batch.maxSeats)

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : prev.length < MAX_SELECTION
          ? [...prev, id]
          : prev,
    )
    setError(null)
  }
  const toggleResults = () => {
    const visibleIds = new Set(visible.map((student) => student.id))
    setSelectedIds((prev) =>
      allVisibleSelected
        ? prev.filter((id) => !visibleIds.has(id))
        : Array.from(new Set([...prev, ...visibleIds])).slice(0, MAX_SELECTION),
    )
    setError(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving || tooMany || !selectionCount) return
    if (mode === "new" && name.trim().length < 2)
      return setError("Enter the student's full name (at least 2 characters).")
    setError(null)
    setSaving(true)
    onBusyChange(true)
    try {
      const result = await addStudents(batch.id, {
        ...(mode === "existing"
          ? { studentIds: selectedIds }
          : {
              name: name.trim(),
              email: email.trim(),
              program: program.trim() || undefined,
            }),
        status,
        autoWaitlistWhenFull: autoWaitlist,
      })
      const parts = [
        `${result.added_count} enrolled`,
        `${result.waitlisted_count} waitlisted`,
      ]
      if (result.skipped_count)
        parts.push(`${result.skipped_count} already in this batch`)
      onToast?.(parts.join(" · "))
      await onAdded()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not add students. Your selection is saved here; please try again.",
      )
    } finally {
      setSaving(false)
      onBusyChange(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <button
          type="button"
          disabled={saving}
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to students
        </button>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Add students
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Select students from your directory or create a new learner profile.
        </p>
      </div>

      <form onSubmit={submit}>
        <fieldset
          disabled={saving}
          className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="min-w-0 space-y-4">
            <div
              role="group"
              aria-label="How to add students"
              className="grid grid-cols-2 gap-3"
            >
              {([
                {
                  value: "existing",
                  title: "From your directory",
                  description: "Select existing students",
                  icon: Users,
                },
                {
                  value: "new",
                  title: "New student",
                  description: "Create a learner profile",
                  icon: UserPlus,
                },
              ] as const).map(({ value, title, description, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => {
                    setMode(value)
                    setError(null)
                  }}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                    mode === value
                      ? "border-primary-border bg-primary-soft"
                      : "border-border bg-surface hover:bg-surface-2",
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 hidden h-4 w-4 shrink-0 sm:block",
                      mode === value
                        ? "text-primary-text"
                        : "text-subtle-foreground",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  {mode === value && (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary-text"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>

            {mode === "existing" ? (
              <section
                aria-label="Student directory"
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <div className="space-y-4 border-b border-border p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Student directory
                    </h3>
                    <span className="text-xs tabular-nums text-subtle-foreground">
                      {available.length} available
                    </span>
                  </div>
                  <Input
                    aria-label="Search student directory"
                    leading={<Search />}
                    placeholder="Search by name, email or student ID…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <p role="status" className="text-muted-foreground">
                      {visible.length}{" "}
                      {visible.length === 1 ? "student" : "students"}
                      {search.trim() ? " found" : " in your directory"}
                    </p>
                    <button
                      type="button"
                      disabled={!visible.length}
                      onClick={toggleResults}
                      className="rounded font-medium text-primary-text hover:underline disabled:opacity-40"
                    >
                      {allVisibleSelected
                        ? "Deselect results"
                        : "Select results"}
                    </button>
                  </div>
                </div>
                {visible.length ? (
                  <div className="max-h-[420px] divide-y divide-border overflow-y-auto">
                    {visible.map((student) => (
                      <label
                        key={student.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors sm:px-5",
                          selected.has(student.id)
                            ? "bg-primary-soft"
                            : "hover:bg-surface-2/70",
                        )}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${student.name}`}
                          checked={selected.has(student.id)}
                          disabled={
                            !selected.has(student.id) &&
                            selectedIds.length >= MAX_SELECTION
                          }
                          onChange={() => toggleStudent(student.id)}
                          className="h-4 w-4 shrink-0 accent-primary"
                        />
                        <Avatar
                          src={student.avatarUrl || ""}
                          name={student.name}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {student.name}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {student.email}
                          </span>
                        </span>
                        <span className="hidden text-right sm:block">
                          <span className="block font-mono text-[10px] text-subtle-foreground">
                            {student.rollNumber || "No student ID"}
                          </span>
                          {student.currentBatch && (
                            <span
                              className="mt-1 block max-w-36 truncate text-[11px] text-muted-foreground"
                              title={student.currentBatch}
                            >
                              {student.currentBatch}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <Search
                      className="mx-auto mb-3 h-6 w-6 text-subtle-foreground"
                      aria-hidden="true"
                    />
                    <h4 className="text-sm font-medium text-foreground">
                      {available.length
                        ? "No students found"
                        : "No students available"}
                    </h4>
                    <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                      {available.length
                        ? "Try another name, email or student ID."
                        : "There are no available students to add. Create a new student profile to grow this cohort."}
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="mt-3"
                      onClick={() =>
                        available.length ? setSearch("") : setMode("new")
                      }
                    >
                      {available.length ? "Clear search" : "Add a new student"}
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-2/40 px-4 py-3 text-xs sm:px-5">
                  <span role="status" className="text-muted-foreground">
                    <strong className="font-semibold text-foreground">
                      {selectedIds.length}
                    </strong>{" "}
                    selected
                    {selectedIds.length > visibleSelected
                      ? ` · ${selectedIds.length - visibleSelected} outside this search`
                      : ""}
                  </span>
                  {selectedIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="flex items-center gap-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                      Clear selection
                    </button>
                  ) : (
                    <span className="text-[11px] text-subtle-foreground">
                      Up to {MAX_SELECTION} at a time
                    </span>
                  )}
                </div>
                {selectedIds.length === MAX_SELECTION && (
                  <p
                    role="status"
                    className="px-5 pb-3 pt-2 text-xs text-warning"
                  >
                    200 students selected. Add this group before selecting more.
                  </p>
                )}
              </section>
            ) : (
              <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
                <h3 className="text-base font-semibold text-foreground">
                  Student details
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Use the email address the student will use to sign in.
                </p>
                <div className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <label
                      htmlFor="batch-new-name"
                      className="text-xs font-medium text-foreground"
                    >
                      Full name{" "}
                      <span className="text-subtle-foreground">(required)</span>
                    </label>
                    <Input
                      id="batch-new-name"
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="name"
                      placeholder="e.g. Aarav Kulkarni"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="batch-new-email"
                      className="text-xs font-medium text-foreground"
                    >
                      Email address{" "}
                      <span className="text-subtle-foreground">(required)</span>
                    </label>
                    <Input
                      id="batch-new-email"
                      required
                      type="email"
                      maxLength={200}
                      autoComplete="email"
                      placeholder="student@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="batch-new-program"
                      className="text-xs font-medium text-foreground"
                    >
                      Program or track{" "}
                      <span className="text-subtle-foreground">(optional)</span>
                    </label>
                    <Input
                      id="batch-new-program"
                      maxLength={150}
                      placeholder="e.g. AI Engineering"
                      value={program}
                      onChange={(event) => setProgram(event.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
                <p className="mt-6 flex gap-2 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-muted-foreground">
                  <Info
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  An existing account with this email will be reused. Course
                  enrollment is added when the student gets an active place.
                </p>
              </section>
            )}
          </div>

          <aside
            aria-label="Enrollment summary"
            className="min-w-0 space-y-4 lg:sticky lg:top-0"
          >
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">
                  Enrollment summary
                </p>
                <h3 className="mt-2 break-words text-sm font-semibold text-foreground">
                  {batch.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {batch.courseTitle}
                </p>
                <div className="mb-2 mt-5 flex items-baseline gap-1.5">
                  <strong className="text-2xl font-semibold tabular-nums text-foreground">
                    {seatsLeft}
                  </strong>
                  <span className="text-xs text-muted-foreground">
                    {seatsLeft === 1 ? "seat available" : "seats available"}
                  </span>
                </div>
                <Progress
                  value={occupancy}
                  size="xs"
                  tone={seatTone(occupancy)}
                  label="Current batch capacity"
                />
                <p className="mt-2 text-[11px] text-subtle-foreground">
                  {batch.enrolledSeats} of {batch.maxSeats} seats filled
                </p>
              </div>
              <div className="space-y-4 p-5">
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-xs font-semibold text-foreground">
                    Add students to
                  </legend>
                  {([
                    {
                      value: "Active",
                      label: "Active roster",
                      hint: "Give students a place now",
                      icon: CheckCircle2,
                    },
                    {
                      value: "Waitlisted",
                      label: "Waitlist",
                      hint: "Hold for a future place",
                      icon: Clock3,
                    },
                  ] as const).map(({ value, label, hint, icon: Icon }) => (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                        status === value
                          ? "border-primary-border bg-primary-soft"
                          : "border-border hover:bg-surface-2",
                      )}
                    >
                      <input
                        type="radio"
                        name="batch-enrollment-status"
                        value={value}
                        checked={status === value}
                        onChange={() => setStatus(value)}
                        className="h-3.5 w-3.5 shrink-0 accent-primary"
                      />
                      <span className="flex-1">
                        <span className="block text-xs font-medium text-foreground">
                          {label}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {hint}
                        </span>
                      </span>
                      <Icon
                        className="h-4 w-4 text-subtle-foreground"
                        aria-hidden="true"
                      />
                    </label>
                  ))}
                </fieldset>
                {status === "Active" && (
                  <div className="flex items-start justify-between gap-3">
                    <label
                      htmlFor="batch-auto-waitlist"
                      className="cursor-pointer"
                    >
                      <span className="block text-xs font-medium text-foreground">
                        Waitlist when full
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                        Keep extra students on the waitlist when seats run out.
                      </span>
                    </label>
                    <Switch
                      id="batch-auto-waitlist"
                      aria-label="Waitlist when full"
                      checked={autoWaitlist}
                      onCheckedChange={setAutoWaitlist}
                    />
                  </div>
                )}
                <dl
                  aria-live="polite"
                  className="space-y-2.5 border-t border-border pt-4 text-xs"
                >
                  <div className="flex justify-between text-muted-foreground">
                    <dt>
                      {mode === "existing"
                        ? "Selected students"
                        : "New student"}
                    </dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {selectionCount}
                    </dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Expected active places</dt>
                    <dd className="font-medium tabular-nums text-success">
                      {enrolling}
                    </dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Expected waitlist places</dt>
                    <dd className="font-medium tabular-nums text-warning">
                      {waitlisting}
                    </dd>
                  </div>
                </dl>
                <p className="text-[11px] leading-relaxed text-subtle-foreground">
                  Availability is checked again when you add students.
                </p>
                {tooMany && (
                  <p
                    role="alert"
                    className="rounded-lg bg-warning-soft p-3 text-xs leading-relaxed text-warning"
                  >
                    There{" "}
                    {seatsLeft === 1
                      ? "is only 1 seat"
                      : `are only ${seatsLeft} seats`}{" "}
                    left. Enable waitlisting or select fewer students.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </fieldset>
        <footer className="sticky -bottom-4 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-[var(--elev-xs)] sm:-bottom-7 sm:px-5">
          <div className="min-w-0 flex-1 text-xs">
            <p
              role="status"
              className={tooMany ? "text-warning" : "text-muted-foreground"}
            >
              {tooMany
                ? "Not enough seats. Enable waitlisting or select fewer students."
                : selectionCount
                  ? `${selectionCount} ${
                      selectionCount === 1 ? "student" : "students"
                    } ready to add`
                  : mode === "existing"
                    ? "Select students to continue."
                    : "Enter student details to continue."}
            </p>
            {error && (
              <p role="alert" className="mt-1.5 text-danger">
                {error}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={onBack}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={!selectionCount || tooMany}
              rightIcon={<ArrowRight />}
            >
              {mode === "new"
                ? "Create & add student"
                : selectionCount
                  ? `Add ${selectionCount} ${
                      selectionCount === 1 ? "student" : "students"
                    }`
                  : "Add students"}
            </Button>
          </div>
        </footer>
      </form>
    </div>
  )
}
