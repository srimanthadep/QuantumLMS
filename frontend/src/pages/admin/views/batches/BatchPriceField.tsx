import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface BatchPriceFieldProps {
  id: string
  value: number
  onChange: (price: number) => void
  /** Why the price cannot change (for example a running batch). */
  lockedReason?: string
  error?: string
  className?: string
}

/** Free / Paid switch with a price box. A batch has one price; free batches are joined by invitation from the team. */
export default function BatchPriceField({ id, value, onChange, lockedReason, error, className }: BatchPriceFieldProps) {
  const paid = value !== 0
  const lastPaid = useRef<number | null>(Number.isFinite(value) && value > 0 ? value : null)
  const [draft, setDraft] = useState(Number.isFinite(value) && value > 0 ? String(value) : "")

  useEffect(() => {
    if (Number.isFinite(value) && value > 0) {
      lastPaid.current = value
      setDraft((d) => (Number(d) === value ? d : String(value)))
    } else if (value === 0) {
      setDraft("")
    }
  }, [value])

  const locked = Boolean(lockedReason)
  const choose = (next: "free" | "paid") => {
    if (locked) return
    if (next === "free") {
      onChange(0)
      setDraft("")
    } else if (!paid) {
      const restored = lastPaid.current
      if (restored && restored > 0) {
        onChange(restored)
        setDraft(String(restored))
      } else {
        onChange(Number.NaN)
        setDraft("")
      }
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <p id={`${id}-label`} className="text-xs font-semibold text-foreground">
        Price
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
          {(["paid", "free"] as const).map((opt) => {
            const on = (opt === "paid") === paid
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={locked}
                onClick={() => choose(opt)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                  on ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt === "paid" ? "Paid" : "Free"}
              </button>
            )
          })}
        </div>
        {paid && (
          <div className="relative w-40">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden="true">
              ₹
            </span>
            <input
              id={id}
              type="text"
              inputMode="numeric"
              aria-label="Batch price in rupees"
              placeholder="e.g. 4999"
              disabled={locked}
              value={draft}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").replace(/^0+(\d)/, "$1").slice(0, 8)
                setDraft(digits)
                if (!digits) {
                  onChange(Number.NaN)
                  return
                }
                const n = Number(digits)
                onChange(n > 0 ? n : Number.NaN)
              }}
              className="h-10 w-full rounded-lg border border-border-strong bg-surface pl-7 pr-3 text-sm tabular-nums text-foreground placeholder:text-subtle-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 disabled:opacity-60"
            />
          </div>
        )}
      </div>
      <p className={cn("text-[11px]", error ? "text-danger" : "text-subtle-foreground")}>
        {error ?? lockedReason ?? (paid ? "Learners pay once at checkout to join this batch." : "Free batches have no checkout. Your team adds learners from Admissions & team.")}
      </p>
    </div>
  )
}
