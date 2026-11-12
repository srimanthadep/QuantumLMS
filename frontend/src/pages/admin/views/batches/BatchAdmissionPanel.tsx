import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"

type Offer = { id: string; course_id: string; title: string; mode: string; price: number; status: string }
type Teacher = { id: string; name: string; role: string; disabled_at: string | null; provisioning_state: string }
type Admission = { batch: { lifecycle: string; offer_id: string | null; minimum_paid_registrations: number | null; max_seats: number;
  starts_at: string | null; ends_at: string | null; registration_deadline: string | null; allow_late_join: boolean; timezone: string }; teachers: { id: string }[]; paid: number; available: number }
const localInput = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""
export default function BatchAdmissionPanel({ batchId, courseId, name, onSaved }: { batchId: string; courseId: string; name: string; onSaved?: () => Promise<unknown> }) {
  const [data, setData] = useState<Admission | null>(null), [offers, setOffers] = useState<Offer[]>([]), [teachers, setTeachers] = useState<Teacher[]>([])
  const [selected, setSelected] = useState<string[]>([]), [offerId, setOfferId] = useState("")
  const [minimum, setMinimum] = useState(0), [starts, setStarts] = useState(""), [ends, setEnds] = useState(""), [deadline, setDeadline] = useState("")
  const [late, setLate] = useState(false), [price, setPrice] = useState(0)
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("")
  const [targets, setTargets] = useState<{ id: string; name: string; course_id: string }[]>([]), [target, setTarget] = useState("")
  const load = useCallback(async () => {
    const [admission, offersData, faculty, batches] = await Promise.all([api.get<Admission>(`/admin/batches/${batchId}/admission`, { bypassCache: true }),
      api.get<{ offers: Offer[] }>("/admin/offers", { bypassCache: true }), api.get<{ teachers: Teacher[] }>("/admin/teachers", { bypassCache: true }), api.get<{ batches: typeof targets }>("/admin/batches", { bypassCache: true })])
    setData(admission); setOffers(offersData.offers.filter(o => o.course_id === courseId && o.mode === "live")); setTeachers(faculty.teachers.filter(t => t.role === "Teacher" && !t.disabled_at && t.provisioning_state === "active"))
    setTargets(batches.batches.filter(b => b.id !== batchId && b.course_id === courseId))
    setSelected(admission.teachers.map(t => t.id)); setOfferId(admission.batch.offer_id ?? "")
    setMinimum(admission.batch.minimum_paid_registrations ?? Math.ceil(admission.batch.max_seats * 0.6))
    setStarts(localInput(admission.batch.starts_at)); setEnds(localInput(admission.batch.ends_at)); setDeadline(localInput(admission.batch.registration_deadline)); setLate(admission.batch.allow_late_join)
  }, [batchId, courseId])
  useEffect(() => { void load().catch(e => setError(e.message)) }, [load])
  async function perform(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setMessage("")
    try { await action(); await load(); await onSaved?.(); setMessage(success) }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to save changes") }
    finally { setBusy(false) }
  }
  const save = () => perform(() => api.patch(`/admin/batches/${batchId}/admission`, {
    ...(offerId ? { offer_id: offerId } : {}), minimum_paid_registrations: minimum, teacher_ids: selected, allow_late_join: late,
    ...(starts ? { starts_at: new Date(starts).toISOString() } : {}), ...(ends ? { ends_at: new Date(ends).toISOString() } : {}), ...(deadline ? { registration_deadline: new Date(deadline).toISOString() } : {}),
  }), "Admission rules saved")
  const transitions: Record<string, string[]> = { Draft: ["Recruiting"], Recruiting: ["Ready"], Ready: ["Scheduled", "Recruiting"], Scheduled: ["Running", "Recruiting"], Running: ["Completed"] }
  const selectClass = "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
  return <section className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Admission & launch</h3><p className="mt-1 text-xs text-muted-foreground">Set the offer, teaching team and conditions for starting this batch.</p></div><span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-text">{data?.batch.lifecycle ?? "Loading…"}</span></div>
    {data && <div className="grid grid-cols-3 gap-3 rounded-xl bg-surface-2 p-3 text-sm"><span><strong>{data.paid}</strong><br /><span className="text-xs text-muted-foreground">Paid registrations</span></span><span><strong>{minimum}</strong><br /><span className="text-xs text-muted-foreground">Required to start</span></span><span><strong>{data.available}</strong><br /><span className="text-xs text-muted-foreground">Available seats</span></span></div>}
    <label className="block space-y-2 text-sm">Live offer<select className={selectClass} value={offerId} onChange={e => setOfferId(e.target.value)}><option value="">Choose an offer</option>{offers.map(o => <option key={o.id} value={o.id}>{o.title} · ₹{o.price} · {o.status}</option>)}</select></label>
    <div className="flex flex-wrap items-end gap-2"><label className="flex-1 space-y-2 text-xs text-muted-foreground">New offer price (INR)<Input type="number" min={0} value={price} onChange={e => setPrice(Number(e.target.value))} /></label>
      <Button type="button" variant="outline" disabled={busy} onClick={() => void perform(async () => { await api.post("/admin/offers", { title: name, course_id: courseId, mode: "live", price }); }, "Draft offer created")}>Create draft offer</Button>
      {offerId && offers.find(o => o.id === offerId)?.status !== "Published" && <Button type="button" variant="outline" disabled={busy} onClick={() => void perform(() => api.patch(`/admin/offers/${offerId}`, { status: "Published" }), "Offer published")}>Publish offer</Button>}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm">Starts<Input type="datetime-local" value={starts} onChange={e => setStarts(e.target.value)} /></label>
      <label className="space-y-2 text-sm">Ends<Input type="datetime-local" value={ends} onChange={e => setEnds(e.target.value)} /></label>
      <label className="space-y-2 text-sm">Registration deadline<Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} /><span className="text-xs text-muted-foreground">Defaults to 3 days before the start.</span></label>
      <label className="space-y-2 text-sm">Minimum paid registrations<Input type="number" min={0} max={data?.batch.max_seats} value={minimum} onChange={e => setMinimum(Number(e.target.value))} /></label>
    </div>
    <p className="text-xs text-muted-foreground">Dates above use your device timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p>
    <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Assigned teachers</legend>{teachers.length ? teachers.map(t => <label key={t.id} className="mr-5 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(t.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))} />{t.name}</label>) : <p className="text-sm text-muted-foreground">Invite a teacher from Faculty before assigning this batch.</p>}</fieldset>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={late} onChange={e => setLate(e.target.checked)} />Allow joining after the batch starts</label>
    <Button type="button" disabled={busy} onClick={() => void save()}>Save admission rules</Button>
    {!!data && <div className="flex flex-wrap gap-2 border-t border-border pt-4">{(transitions[data.batch.lifecycle] ?? []).map(state => <Button type="button" key={state} variant="outline" disabled={busy} onClick={() => void perform(() => api.post(`/admin/batches/${batchId}/transition`, { state }), `Batch is now ${state}`)}>Move to {state}</Button>)}</div>}
    <details className="border-t border-border pt-4"><summary className="cursor-pointer text-sm font-medium">Underfilled batch decisions</summary><div className="mt-3 space-y-3">
      <p className="text-xs text-muted-foreground">Save the intended dates first. A merge preserves registration history; cancellation requires paid learners to be refunded.</p>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy || !deadline} onClick={() => void perform(() => api.post(`/admin/batches/${batchId}/underfilled`, { action: "extend", deadline: new Date(deadline).toISOString() }), "Registration extended")}>Extend to selected deadline</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void perform(() => api.post(`/admin/batches/${batchId}/underfilled`, { action: "refund" }), "Refunds requested")}>Request refunds</Button></div>
      <div className="flex gap-2"><select value={target} onChange={e => setTarget(e.target.value)} className={selectClass}><option value="">Choose a merge destination</option>{targets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select><Button type="button" variant="outline" disabled={busy || !target} onClick={() => void perform(() => api.post(`/admin/batches/${batchId}/underfilled`, { action: "merge", target_batch_id: target }), "Batches merged")}>Merge</Button></div>
      <Button type="button" variant="outline" disabled={busy} onClick={() => { if (window.confirm("Cancel this batch and revoke its registration access? Other purchases remain active.")) void perform(() => api.post(`/admin/batches/${batchId}/underfilled`, { action: "cancel" }), "Batch cancelled") }}>Cancel batch</Button>
    </div></details>
    {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}{message && <p role="status" className="text-sm text-success">{message}</p>}
  </section>
}
