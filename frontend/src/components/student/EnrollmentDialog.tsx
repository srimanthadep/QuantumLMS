import { useEffect, useRef, useState } from "react"
import { api } from "@/lib/api"
import type { Tables } from "@/lib/api.types"
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui"

type Offer = Pick<Tables<"course_offers">, "id" | "title" | "price" | "mode"> & { batches: { id: string; name: string; starts_at: string | null; timezone: string }[] }
type Confirmation = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
type Checkout = { open(): void; on(event: "payment.failed", handler: () => void): void }
declare global { interface Window { Razorpay?: new(options: { key: string; order_id: string; amount: number; currency: string; name: string; description: string; handler: (result: Confirmation) => void; modal: { ondismiss: () => void } }) => Checkout } }
let script: Promise<void> | undefined
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve()
  return script ??= new Promise<void>((resolve, reject) => {
    const node = document.createElement("script"); node.src = "https://checkout.razorpay.com/v1/checkout.js"; node.async = true
    node.onload = () => resolve(); node.onerror = () => { script = undefined; node.remove(); reject(new Error("Payment checkout did not load. Please retry.")) }
    document.head.appendChild(node)
  })
}

export default function EnrollmentDialog({ course, onClose, onEnrolled }: { course: { id: string; title: string }; onClose: () => void; onEnrolled: () => Promise<void> }) {
  const [offers, setOffers] = useState<Offer[]>([]), [selected, setSelected] = useState(""), [batch, setBatch] = useState("")
  const [order, setOrder] = useState<Tables<"orders"> | null>(null), [previous, setPrevious] = useState<Tables<"orders">[]>([])
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false)
  const keys = useRef(new Map<string, string>())
  const offer = offers.find(o => o.id === selected)
  useEffect(() => {
    let active = true
    void Promise.all([api.get<{ offers: Offer[] }>(`/catalog/offers?course_id=${encodeURIComponent(course.id)}`, { bypassCache: true }), api.get<{ orders: Tables<"orders">[] }>("/student/orders", { bypassCache: true })]).then(([catalog, history]) => {
      if (!active) return
      setOffers(catalog.offers); setSelected(catalog.offers[0]?.id ?? ""); setPrevious(history.orders.filter(o => o.course_id === course.id))
      for (const o of history.orders) if (new Date(o.expires_at).getTime() > Date.now() && ["creating", "pending"].includes(o.status)) keys.current.set(`${o.offer_id}:${o.batch_id ?? ""}`, o.idempotency_key)
      setLoaded(true)
    }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [course.id])
  const accept = async (current: Tables<"orders">) => {
    setOrder(current)
    if (current.status === "paid") { await onEnrolled(); onClose() }
    else setMessage(current.status === "refund_pending" ? "Payment received, but admission could not be completed. Your refund is awaiting provider confirmation." : current.status === "refunded" ? "The provider has confirmed this refund." : "Payment confirmation is pending. You can close this window and check again later.")
  }
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(""); try { await action() } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }
  const enroll = async () => {
    if (!offer) return
    if (offer.price === 0) { await api.post("/student/enrollments", { offer_id: offer.id }); await onEnrolled(); onClose(); return }
    const key = `${offer.id}:${batch}`; if (!keys.current.has(key)) keys.current.set(key, crypto.randomUUID())
    const checkout = await api.post<{ order: Tables<"orders">; key: string }>("/student/checkout", { offer_id: offer.id, ...(offer.mode === "live" ? { batch_id: batch } : {}), idempotency_key: keys.current.get(key) })
    setOrder(checkout.order)
    if (checkout.order.status === "paid") { await accept(checkout.order); return }
    if (!checkout.order.provider_order_id) { setMessage("Your checkout is being confirmed by the payment provider. Please check its status shortly."); return }
    if (new Date(checkout.order.expires_at).getTime() <= Date.now()) { keys.current.delete(key); throw new Error("Your reservation expired. Start a new checkout to check seat availability.") }
    if (checkout.order.status !== "pending") { await accept(checkout.order); return }
    await loadCheckout()
    if (!window.Razorpay) throw new Error("Payment checkout is unavailable")
    const modal = new window.Razorpay({ key: checkout.key, order_id: checkout.order.provider_order_id, amount: checkout.order.amount, currency: checkout.order.currency,
      name: "QuantumLMS · Test mode", description: offer.title,
      handler: result => void run(async () => { const verified = await api.post<{ order: Tables<"orders"> }>(`/student/orders/${checkout.order.id}/verify`, result); await accept(verified.order) }),
      modal: { ondismiss: () => setMessage("Checkout closed. Your order remains available below; payment confirmation is checked on the server.") } })
    modal.on("payment.failed", () => setError("Payment was not confirmed. You can retry the checkout or check its status.")); modal.open()
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }} modal={false}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Join {course.title}</DialogTitle><DialogDescription>Choose how you want to learn. Paid checkout currently runs in Razorpay test mode.</DialogDescription></DialogHeader>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}{message && <p role="status" className="rounded-xl bg-surface-2 p-4 text-sm">{message}</p>}
    <div className="space-y-3">{offers.map(o => <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4"><input type="radio" name="learning-offer" checked={selected === o.id} onChange={() => { setSelected(o.id); setBatch(""); setOrder(null); setMessage("") }} /><span className="flex-1"><span className="block font-medium">{o.title}</span><span className="text-sm text-muted-foreground">{o.mode === "live" ? "Scheduled live classes with a batch" : "Learn at your own pace"}</span></span><span>{o.price ? `₹${o.price.toLocaleString("en-IN")}` : "Free"}</span></label>)}
      {!offers.length && <p className="text-sm text-muted-foreground">{loaded ? "No learning offers are open for enrollment yet." : "Loading available offers…"}</p>}
      {offer?.mode === "live" && <label className="block space-y-2 text-sm"><span>Choose a batch</span><select className="w-full rounded-lg border border-border bg-surface p-3" value={batch} onChange={e => setBatch(e.target.value)}><option value="">Select a batch</option>{offer.batches.map(b => <option key={b.id} value={b.id}>{b.name} · {b.starts_at ? new Date(b.starts_at).toLocaleDateString() : "Dates to be announced"} · {b.timezone}</option>)}</select></label>}
      <Button className="w-full" disabled={busy || !offer || (offer.mode === "live" && (!batch || offer.price === 0))} onClick={() => void run(enroll)}>{busy ? "Please wait…" : offer?.price ? "Continue to test checkout" : "Enroll for free"}</Button>
      {offer?.mode === "live" && offer.price === 0 && <p className="text-sm text-muted-foreground">Contact the academy for admission to this free live batch.</p>}
    </div>
    {(order || previous.length > 0) && <div className="space-y-2 border-t border-border pt-4"><h3 className="font-medium">Your orders for this course</h3>{[...(order ? [order] : []), ...previous.filter(o => o.id !== order?.id)].map(o => <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 p-3 text-sm"><div><p>{o.offer_title} · ₹{(o.amount/100).toLocaleString("en-IN")}</p><p className="capitalize text-muted-foreground">{o.status.replace(/_/g, " ")}</p></div><Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => { const response = await api.get<{ order: Tables<"orders"> }>(`/student/orders/${o.id}`, { bypassCache: true }); await accept(response.order) })}>Check status</Button></div>)}</div>}
  </DialogContent></Dialog>
}
