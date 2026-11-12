import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { Tables } from "@/lib/api.types"
import { Button, Input } from "@/components/ui"

export default function SelfPacedOfferPanel({ courseId, title, onChanged }: { courseId: string; title: string; onChanged: () => Promise<void> }) {
  const [offers, setOffers] = useState<Tables<"course_offers">[]>([]), [id, setId] = useState("")
  const [name, setName] = useState(title), [price, setPrice] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("")
  async function load() { const data = await api.get<{ offers: Tables<"course_offers">[] }>("/admin/offers", { bypassCache: true }); setOffers(data.offers.filter(o => o.course_id === courseId && o.mode === "self_paced")) }
  useEffect(() => { void load().catch(e => setError(e.message)) }, [courseId])
  const selected = offers.find(o => o.id === id)
  function select(value: string) { setId(value); const current = offers.find(o => o.id === value); setName(current?.title ?? title); setPrice(current?.price ?? 0); setMessage("") }
  async function save(publish: boolean) {
    setBusy(true); setError(""); setMessage("")
    try {
      let target = id
      if (!target) { const result = await api.post<{ offer: Tables<"course_offers"> }>("/admin/offers", { course_id: courseId, title: name, mode: "self_paced", price }); target = result.offer.id; setId(target) }
      else await api.patch(`/admin/offers/${target}`, { title: name, price })
      if (publish) await api.patch(`/admin/offers/${target}`, { status: "Published" })
      await load(); await onChanged(); setMessage(publish ? "Published. Learners can now enroll through the catalog." : "Offer saved. Publish after reviewing the course content.")
    } catch (e) { setError((e as Error).message); await load().catch(() => {}) }
    finally { setBusy(false) }
  }
  async function unpublish() {
    setBusy(true); setError("")
    try { await api.patch(`/admin/offers/${id}`, { status: "Draft" }); await load(); setMessage("Enrollment is closed. Existing learners retain their purchased access.") }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <section className="max-w-3xl space-y-5"><div><h2 className="text-xl font-semibold">Self-paced enrollment</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Publish an offer after the lessons are ready. Free offers enroll immediately; paid offers use Razorpay test checkout. Content edits return self-paced offers to draft for review.</p></div>
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-6"><label className="block space-y-2 text-sm font-medium">Offer<select className="w-full rounded-lg border border-border bg-surface p-3" value={id} onChange={e => select(e.target.value)}><option value="">Create a new self-paced offer</option>{offers.map(o => <option key={o.id} value={o.id}>{o.title} · {o.status}</option>)}</select></label>
      <label className="block space-y-2 text-sm font-medium">Offer title<Input value={name} onChange={e => setName(e.target.value)} /></label><label className="block space-y-2 text-sm font-medium">Price in INR · enter 0 for free enrollment<Input type="number" min={0} max={10000000} step={1} value={price} onChange={e => setPrice(Number(e.target.value))} /></label>
      <p className="text-sm text-muted-foreground">{selected ? `Current status: ${selected.status}` : "A new offer starts as Draft."} Publishing checks every active module and video asset. Learner progress stays attached to its original lesson ID when content is edited or reordered.</p>
      <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy || name.trim().length < 2} onClick={() => void save(false)}>Save offer</Button><Button disabled={busy || name.trim().length < 2} onClick={() => void save(true)}>{busy ? "Saving…" : "Review & publish"}</Button>{selected?.status === "Published" && <Button variant="ghost" disabled={busy} onClick={() => void unpublish()}>Close enrollment</Button>}</div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}{message && <p role="status" className="text-sm text-success">{message}</p>}
    </div>
  </section>
}
