import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from "react"
import { CheckCircle2, Clock3, Search, UserPlus, Users, X } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import Field from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { SegmentedControl } from "@/components/ui/tabs"
import type { AdminBatch, BatchAvailableStudent, useAdminStore } from "@/data/adminStore"
import { cn } from "@/lib/utils"
import { seatTone, seatUtilization } from "./batchTheme"
import { InlineAlert } from "./parts"

interface BatchEnrollmentPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: AdminBatch
  available: BatchAvailableStudent[]
  addStudents: ReturnType<typeof useAdminStore>["addStudentsToBatch"]
  onAdded: () => Promise<void>
  onBusyChange: (busy: boolean) => void
  onToast?: (message: string) => void
}

const MAX_SELECTION = 200
type Mode = "existing" | "new"

/** Side sheet for adding learners: pick from the directory or create one, then choose roster or waitlist. */
export default function BatchEnrollmentPanel({ open, onOpenChange, batch, available, addStudents, onAdded, onBusyChange, onToast }: BatchEnrollmentPanelProps) {
  const [mode, setMode] = useState<Mode>("existing")
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

  // Start fresh every time the sheet opens.
  useEffect(() => {
    if (!open) return
    setMode("existing")
    setSearch("")
    setSelectedIds([])
    setStatus("Active")
    setAutoWaitlist(true)
    setName("")
    setEmail("")
    setProgram("")
    setError(null)
  }, [open])

  const visible = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return available.filter((s) => !q || [s.name, s.email, s.rollNumber].some((v) => v.toLowerCase().includes(q)))
  }, [available, deferredSearch])
  const selected = useMemo(() => new Set(selectedIds), [selectedIds])
  const visibleSelected = visible.filter((s) => selected.has(s.id)).length
  const allVisibleSelected = visible.length > 0 && visibleSelected === visible.length

  const selectionCount = mode === "existing" ? selectedIds.length : name.trim() || email.trim() ? 1 : 0
  const seatsLeft = Math.max(0, batch.maxSeats - batch.enrolledSeats)
  const tooMany = status === "Active" && !autoWaitlist && selectionCount > seatsLeft
  const enrolling = status === "Waitlisted" ? 0 : Math.min(selectionCount, seatsLeft)
  const waitlisting = status === "Waitlisted" ? selectionCount : autoWaitlist ? Math.max(0, selectionCount - seatsLeft) : 0
  const occupancy = seatUtilization(batch.enrolledSeats, batch.maxSeats)

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_SELECTION ? [...prev, id] : prev))
    setError(null)
  }
  const toggleResults = () => {
    const ids = new Set(visible.map((s) => s.id))
    setSelectedIds((prev) => (allVisibleSelected ? prev.filter((id) => !ids.has(id)) : Array.from(new Set([...prev, ...ids])).slice(0, MAX_SELECTION)))
    setError(null)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || tooMany || !selectionCount) return
    if (mode === "new" && name.trim().length < 2) return setError("Enter the learner's full name (at least 2 characters).")
    if (mode === "new" && !/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.")
    setError(null)
    setSaving(true)
    onBusyChange(true)
    try {
      const result = await addStudents(batch.id, {
        ...(mode === "existing" ? { studentIds: selectedIds } : { name: name.trim(), email: email.trim(), program: program.trim() || undefined }),
        status,
        autoWaitlistWhenFull: autoWaitlist,
      })
      const parts = [`${result.added_count} enrolled`, `${result.waitlisted_count} waitlisted`]
      if (result.skipped_count) parts.push(`${result.skipped_count} already in this batch`)
      onToast?.(parts.join(" · "))
      await onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add learners. Your selection is kept here; try again.")
    } finally {
      setSaving(false)
      onBusyChange(false)
    }
  }

  const ctaLabel = mode === "new" ? "Create and add learner" : selectionCount ? `Add ${selectionCount} ${selectionCount === 1 ? "learner" : "learners"}` : "Add learners"

  return (
    <Sheet open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <SheetContent side="right" className="w-full max-w-xl gap-0 p-0 sm:max-w-xl">
        <form onSubmit={submit} className="flex min-h-full flex-col">
          {/* Header */}
          <div className="border-b border-border px-6 pb-4 pt-6 pr-12">
            <SheetTitle>Add learners</SheetTitle>
            <SheetDescription className="mt-1">{batch.name}</SheetDescription>
            <div className="mt-4 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <Progress value={occupancy} size="xs" tone={seatTone(occupancy)} label="Seats filled" />
              </div>
              <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{seatsLeft}</span> {seatsLeft === 1 ? "seat" : "seats"} left of {batch.maxSeats}
              </span>
            </div>
          </div>

          <fieldset disabled={saving} className="flex min-w-0 flex-1 flex-col gap-5 px-6 py-5">
            <SegmentedControl
              aria-label="How to add learners"
              block
              value={mode}
              onChange={(v) => {
                setMode(v)
                setError(null)
              }}
              options={[
                { value: "existing" as Mode, label: "From directory" },
                { value: "new" as Mode, label: "New learner" },
              ]}
            />

            {mode === "existing" ? (
              <section aria-label="Student directory" className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border">
                <div className="space-y-2 border-b border-border bg-surface-2/40 p-3">
                  <Input
                    aria-label="Search student directory"
                    leading={<Search className="h-3.5 w-3.5" />}
                    placeholder="Search name, email or student ID"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="flex items-center justify-between gap-2 text-caption">
                    <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                      <Checkbox
                        aria-label="Select all results"
                        checked={allVisibleSelected ? true : visibleSelected > 0 ? "indeterminate" : false}
                        disabled={!visible.length}
                        onCheckedChange={toggleResults}
                      />
                      {visible.length} {visible.length === 1 ? "student" : "students"}
                      {search.trim() ? " found" : " available"}
                    </label>
                    {selectedIds.length > 0 && (
                      <button type="button" onClick={() => setSelectedIds([])} className="flex items-center gap-1 rounded text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" aria-hidden="true" />
                        Clear {selectedIds.length}
                      </button>
                    )}
                  </div>
                </div>
                {visible.length ? (
                  <ul className="max-h-[42dvh] divide-y divide-border overflow-y-auto">
                    {visible.map((s) => {
                      const isOn = selected.has(s.id)
                      return (
                        <li key={s.id}>
                          <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors", isOn ? "bg-primary-soft/60" : "hover:bg-surface-2")}>
                            <Checkbox
                              aria-label={`Select ${s.name}`}
                              checked={isOn}
                              disabled={!isOn && selectedIds.length >= MAX_SELECTION}
                              onCheckedChange={() => toggleStudent(s.id)}
                            />
                            <Avatar src={s.avatarUrl || undefined} name={s.name} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">{s.name}</span>
                              <span className="block truncate text-caption text-muted-foreground">{s.email}</span>
                            </span>
                            <span className="hidden max-w-[130px] text-right sm:block">
                              {s.rollNumber && <span className="block font-mono text-[10px] text-subtle-foreground">{s.rollNumber}</span>}
                              {s.currentBatch && (
                                <span className="block truncate text-[11px] text-muted-foreground" title={s.currentBatch}>
                                  {s.currentBatch}
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <div className="px-6 py-10 text-center">
                    <Users className="mx-auto mb-2 h-6 w-6 text-subtle-foreground" aria-hidden="true" />
                    <p className="text-sm font-medium text-foreground">{available.length ? "No students match" : "Everyone is already placed"}</p>
                    <p className="mx-auto mt-1 max-w-xs text-caption text-muted-foreground">
                      {available.length ? "Try another name, email or ID." : "Create a new learner to grow this cohort."}
                    </p>
                    <Button type="button" variant="link" size="sm" className="mt-2" onClick={() => (available.length ? setSearch("") : setMode("new"))}>
                      {available.length ? "Clear search" : "Add a new learner"}
                    </Button>
                  </div>
                )}
                {selectedIds.length >= MAX_SELECTION && <p className="border-t border-border px-3 py-2 text-caption text-warning">{MAX_SELECTION} selected. Add this group before selecting more.</p>}
              </section>
            ) : (
              <section className="space-y-4">
                <Field label="Full name" required>
                  <Input autoComplete="name" maxLength={120} placeholder="e.g. Aarav Kulkarni" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Email" required hint="The address they will sign in with. An existing account is reused.">
                  <Input type="email" autoComplete="email" maxLength={200} placeholder="learner@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Program or track">
                  <Input maxLength={150} placeholder="Optional, e.g. AI Engineering" value={program} onChange={(e) => setProgram(e.target.value)} />
                </Field>
              </section>
            )}

            <section className="space-y-3">
              <p className="text-sm font-medium text-foreground">Place them on</p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Placement">
                {(
                  [
                    { value: "Active", label: "Active roster", hint: "Give them a seat now", icon: CheckCircle2 },
                    { value: "Waitlisted", label: "Waitlist", hint: "Hold for a future seat", icon: Clock3 },
                  ] as const
                ).map(({ value, label, hint, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={status === value}
                    onClick={() => setStatus(value)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors",
                      status === value ? "border-primary-border bg-primary-soft" : "border-border hover:bg-surface-2",
                    )}
                  >
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", status === value ? "text-primary-text" : "text-subtle-foreground")} aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-medium text-foreground">{label}</span>
                      <span className="block text-caption text-muted-foreground">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
              {status === "Active" && (
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                  <span>
                    <span className="block text-sm font-medium text-foreground">Waitlist the overflow</span>
                    <span className="block text-caption text-muted-foreground">If seats run out, extra learners go to the waitlist.</span>
                  </span>
                  <Switch aria-label="Waitlist the overflow" checked={autoWaitlist} onCheckedChange={setAutoWaitlist} />
                </label>
              )}
            </section>

            {tooMany && (
              <InlineAlert tone="warning">
                Only {seatsLeft} {seatsLeft === 1 ? "seat is" : "seats are"} left. Turn on waitlisting or select fewer learners.
              </InlineAlert>
            )}
            {error && <InlineAlert tone="danger">{error}</InlineAlert>}
          </fieldset>

          {/* Footer */}
          <div className="sticky bottom-0 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4">
            <p className="text-caption text-muted-foreground" aria-live="polite">
              {selectionCount ? (
                <>
                  <span className="font-semibold text-success">{enrolling}</span> get a seat ·{" "}
                  <span className="font-semibold text-warning">{waitlisting}</span> to waitlist
                </>
              ) : mode === "existing" ? (
                "Select learners to continue"
              ) : (
                "Enter learner details to continue"
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} disabled={!selectionCount || tooMany} leftIcon={<UserPlus aria-hidden="true" />}>
                {ctaLabel}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
