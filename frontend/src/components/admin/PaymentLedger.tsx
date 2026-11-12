import { useCallback, useEffect, useState } from "react"
import { RefreshCw, Search } from "lucide-react"
import { api } from "@/lib/api"
import type { Tables } from "@/lib/api.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

type LedgerOrder = Tables<"orders"> & { student_name: string; student_email: string; payments: Tables<"payments">[]; refunds: Tables<"refunds">[] }
type Ledger = { configured: boolean; test_mode: boolean; revenue: { gross: number; refunded: number; net: number; captured_payments: number }; orders: LedgerOrder[] }
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100)
const label = (status: string) => status.replace(/_/g, " ")

export default function PaymentLedger({ title = "Orders & payments" }: { title?: string }) {
  const [data, setData] = useState<Ledger | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false)
  const [query, setQuery] = useState(""), [selected, setSelected] = useState<LedgerOrder | null>(null), [reason, setReason] = useState("")
  const refresh = useCallback(async () => {
    const response = await api.get<Ledger>("/admin/orders", { bypassCache: true })
    setData(response); setSelected(current => current ? response.orders.find(o => o.id === current.id) ?? null : null)
  }, [])
  useEffect(() => { let active = true; void api.get<Ledger>("/admin/orders", { bypassCache: true }).then(d => { if (active) setData(d) }).catch(e => { if (active) setError(e.message) }); return () => { active = false } }, [])
  const run = async (action: () => Promise<unknown>) => { setBusy(true); setError(""); try { await action(); await refresh() } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }
  const filtered = data?.orders.filter(o => `${o.id} ${o.student_name} ${o.student_email} ${o.offer_title} ${o.status}`.toLowerCase().includes(query.toLowerCase())) ?? []
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">Razorpay test payments · Amounts confirmed by the provider.</p></div><Button variant="outline" disabled={busy} onClick={() => void run(refresh)}><RefreshCw className="mr-2 size-4" />Refresh</Button></div>
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm">Test mode. These transactions do not represent real revenue.{data && !data.configured && " Add Razorpay test credentials to enable checkout and refund processing."}</div>
    {error && <p role="alert" className="rounded-xl border border-danger/30 p-4 text-danger">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-3">{[["Captured payments", data?.revenue.gross], ["Confirmed refunds", data?.revenue.refunded], ["Net receipts", data?.revenue.net]].map(([name, value]) => <div key={String(name)} className="rounded-2xl border border-border bg-surface p-5"><p className="text-sm text-muted-foreground">{name}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value === undefined ? "—" : money(Number(value))}</p></div>)}</div>
    <div className="relative max-w-md"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search learner, offer, order or status" /></div>
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface"><table className="w-full text-left text-sm"><thead className="bg-surface-2 text-muted-foreground"><tr>{["Learner", "Learning offer", "Created", "Amount", "Status", ""].map((s,i) => <th key={i} className="p-4 font-medium">{s}</th>)}</tr></thead><tbody className="divide-y divide-border">
      {filtered.map(o => <tr key={o.id}><td className="p-4"><p className="font-medium">{o.student_name}</p><p className="text-xs text-muted-foreground">{o.student_email}</p></td><td className="p-4">{o.offer_title}<p className="text-xs text-muted-foreground">{o.mode === "live" ? "Live batch" : "Self-paced"}</p></td><td className="p-4 text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td><td className="p-4 tabular-nums">{money(o.amount)}</td><td className="p-4 capitalize">{label(o.status)}</td><td className="p-4"><Button variant="outline" size="sm" onClick={() => { setSelected(o); setReason("") }}>Details</Button></td></tr>)}
      {!filtered.length && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">{data ? "No payment orders found." : "Loading the payment ledger…"}</td></tr>}
    </tbody></table></div>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null) }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Payment details</DialogTitle><DialogDescription>Provider records for this order. This is a test transaction record, not a tax invoice.</DialogDescription></DialogHeader>
      {selected && <div className="space-y-4 text-sm"><p className="break-all font-mono text-xs">{selected.id}</p><div className="rounded-xl bg-surface-2 p-4"><p className="font-semibold">{selected.offer_title}</p><p>{money(selected.amount)} · <span className="capitalize">{label(selected.status)}</span></p><p>{selected.student_name} · {selected.student_email}</p></div>
        {selected.error && <p className="text-amber-700 dark:text-amber-300">{selected.error}</p>}
        {selected.payments.map(p => <div key={p.id} className="rounded-xl border border-border p-3"><p className="break-all font-mono text-xs">{p.provider_payment_id}</p><p className="mt-2 capitalize">{p.status} · {p.method ?? "Method not reported"} · {money(p.amount)}</p>{p.refunded_amount > 0 && <p>Provider-confirmed refund: {money(p.refunded_amount)}</p>}</div>)}
        {selected.refunds.map(r => <div key={r.id} className="rounded-xl border border-border p-3"><p className="font-medium capitalize">Refund: {label(r.status)}</p><p>{r.reason}</p><p>{r.error}</p><p className="text-muted-foreground">{r.confirmed_at ? `Confirmed ${new Date(r.confirmed_at).toLocaleString()}` : "Awaiting provider confirmation. Access changes after confirmation."}</p></div>)}
        {selected.status === "paid" && <div className="space-y-2"><label htmlFor="refund-reason">Reason for a full refund</label><Input id="refund-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain the refund request" /><Button variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => void run(() => api.post(`/admin/orders/${selected.id}/refund`, { reason }))}>Request {money(selected.amount)} refund</Button></div>}
      </div>}
      <DialogFooter><Button variant="outline" disabled={busy || !data?.configured} onClick={() => selected && void run(() => api.post(`/admin/orders/${selected.id}/reconcile`, {}))}>Check provider status</Button><Button onClick={() => setSelected(null)}>Close</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>
}
