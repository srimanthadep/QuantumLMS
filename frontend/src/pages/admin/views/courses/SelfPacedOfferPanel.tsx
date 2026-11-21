import { useEffect, useState } from "react"
import { CheckCircle2, CircleAlert, Rocket, Save, ShieldCheck, Tag, XCircle } from "lucide-react"
import { api } from "@/lib/api"
import type { Tables } from "@/lib/api.types"
import { Badge, Button, Card, CustomSelect, Input } from "@/components/ui"
import Field from "@/components/ui/field"
import { formatINR } from "./courseTheme"
import { PanelHeader } from "./WorkspaceParts"

type Offer = Tables<"course_offers">

const NEW_OFFER = "__new__"

/** Self-paced offer: create, price, publish or close enrollment. Same API calls as before; new layout. */
export default function SelfPacedOfferPanel({ courseId, title, onChanged }: { courseId: string; title: string; onChanged: () => Promise<void> }) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [id, setId] = useState("")
  const [name, setName] = useState(title)
  const [priceInput, setPriceInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const numericPrice = priceInput.trim() === "" ? 0 : Math.max(0, Math.floor(Number(priceInput)) || 0)

  async function load() {
    const data = await api.get<{ offers: Offer[] }>("/admin/offers", { bypassCache: true })
    setOffers(data.offers.filter((o) => o.course_id === courseId && o.mode === "self_paced"))
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const selected = offers.find((o) => o.id === id)
  function select(value: string) {
    const next = value === NEW_OFFER ? "" : value
    setId(next)
    const current = offers.find((o) => o.id === next)
    setName(current?.title ?? title)
    setPriceInput(current && current.price > 0 ? String(current.price) : "")
    setMessage("")
    setError("")
  }

  async function save(publish: boolean) {
    setBusy(true)
    setError("")
    setMessage("")
    try {
      let target = id
      if (!target) {
        const result = await api.post<{ offer: Offer }>("/admin/offers", { course_id: courseId, title: name, mode: "self_paced", price: numericPrice })
        target = result.offer.id
        setId(target)
      } else await api.patch(`/admin/offers/${target}`, { title: name, price: numericPrice })
      if (publish) await api.patch(`/admin/offers/${target}`, { status: "Published" })
      await load()
      await onChanged()
      setMessage(publish ? "Published. Learners can now enroll from the catalog." : "Offer saved as a draft. Publish once the lessons are ready.")
    } catch (e) {
      setError((e as Error).message)
      await load().catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  async function unpublish() {
    setBusy(true)
    setError("")
    try {
      await api.patch(`/admin/offers/${id}`, { status: "Draft" })
      await load()
      setMessage("Enrollment closed. Learners who already bought keep their access.")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const nameOk = name.trim().length >= 2
  const isPublished = selected?.status === "Published"

  return (
    <div className="space-y-4">
      <PanelHeader title="Enrollment and pricing" description="Sell this course as a self-paced offer. Live cohorts are sold through batches." />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Self-paced offer</h3>
              <p className="text-caption text-muted-foreground">{selected ? "Editing an existing offer." : "A new offer starts as a draft."}</p>
            </div>
            {selected && (
              <Badge tone={isPublished ? "success" : "warning"} dot>
                {selected.status}
              </Badge>
            )}
          </div>

          <Field label="Offer">
            <CustomSelect
              value={id || NEW_OFFER}
              onChange={select}
              options={[{ value: NEW_OFFER, label: "Create a new self-paced offer" }, ...offers.map((o) => ({ value: o.id, label: `${o.title} · ${o.status}` }))]}
            />
          </Field>
          <Field label="Offer title" required error={!nameOk ? "Use at least 2 characters." : undefined}>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Price (₹)" hint={numericPrice > 0 ? `${formatINR(numericPrice)} via Razorpay checkout` : "Leave blank or enter 0 for free instant enrollment."}>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={10000000}
              step={1}
              placeholder="e.g. 4999 (or 0 for free)"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
            />
          </Field>

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="flex items-start gap-2 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {message}
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button variant="outline" disabled={busy || !nameOk} leftIcon={<Save aria-hidden="true" />} onClick={() => void save(false)}>
              Save draft
            </Button>
            <Button disabled={busy || !nameOk} loading={busy} leftIcon={<Rocket aria-hidden="true" />} onClick={() => void save(true)}>
              {isPublished ? "Save and keep published" : "Review and publish"}
            </Button>
            {isPublished && (
              <Button variant="ghost" disabled={busy} leftIcon={<XCircle aria-hidden="true" />} onClick={() => void unpublish()}>
                Close enrollment
              </Button>
            )}
          </div>
        </Card>

        <Card variant="subtle" className="h-fit space-y-3 p-5 text-sm">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary-text" aria-hidden="true" /> Before you publish
          </h3>
          <ul className="space-y-2 text-caption leading-5 text-muted-foreground">
            <li className="flex gap-2">
              <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Publishing checks that every active chapter and video is ready.
            </li>
            <li className="flex gap-2">
              <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Editing course content returns self-paced offers to draft for review.
            </li>
            <li className="flex gap-2">
              <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Learner progress stays linked to each lesson when content is edited or reordered.
            </li>
          </ul>
          {offers.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">All offers</p>
              <ul className="space-y-1.5">
                {offers.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 text-caption">
                    <span className="min-w-0 truncate text-foreground">{o.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {o.price > 0 ? formatINR(o.price) : "Free"} · {o.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
