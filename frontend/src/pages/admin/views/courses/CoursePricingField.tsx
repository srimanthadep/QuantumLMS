import { useEffect, useRef, useState } from "react"
import Field from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { SegmentedControl } from "@/components/ui/tabs"
import { formatINR } from "./courseTheme"

interface CoursePricingFieldProps {
  price: number
  /** null means unlimited. */
  capacity: number | null
  onChange: (next: { price: number; capacity: number | null }) => void
  priceError?: string
  capacityError?: string
}

/** A whole-number input that clears completely on Backspace and never snaps back on blur. */
function WholeNumberInput({
  value,
  onChangeValue,
  ...rest
}: {
  value: number
  onChangeValue: (n: number) => void
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">) {
  const [draft, setDraft] = useState(Number.isFinite(value) && value > 0 ? String(value) : "")

  useEffect(() => {
    const nextValid = Number.isFinite(value) && value > 0
    setDraft((d) => {
      if (!nextValid) return ""
      return Number(d) === value ? d : String(value)
    })
  }, [value])

  return (
    <Input
      {...rest}
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").replace(/^0+(\d)/, "$1")
        setDraft(digits)
        if (!digits) {
          onChangeValue(Number.NaN)
          return
        }
        const n = Math.floor(Number(digits))
        onChangeValue(n >= 1 ? n : Number.NaN)
      }}
    />
  )
}

/**
 * Courses work like a catalog: free courses bring learners in, paid courses convert them.
 * One switch decides which, so there is no separate offer or seat setup to keep in sync.
 */
export default function CoursePricingField({ price, capacity, onChange, priceError, capacityError }: CoursePricingFieldProps) {
  const free = price === 0
  // Remembers the last paid fee entered by the user so flipping Free -> Paid restores it without forcing a default.
  const lastPaid = useRef<number | null>(Number.isFinite(price) && price > 0 ? price : null)
  if (Number.isFinite(price) && price > 0) lastPaid.current = price
  const lastCapacity = useRef<number | null>(capacity !== null && Number.isFinite(capacity) && capacity > 0 ? capacity : null)
  if (capacity !== null && Number.isFinite(capacity) && capacity > 0) lastCapacity.current = capacity
  const limited = capacity !== null

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Access</p>
        <SegmentedControl
          size="sm"
          aria-label="Course access"
          className="w-full [&_button]:flex-1"
          value={free ? "free" : "paid"}
          onChange={(v) => onChange({ price: v === "free" ? 0 : lastPaid.current ?? Number.NaN, capacity })}
          options={[
            { value: "free", label: "Free" },
            { value: "paid", label: "Paid" },
          ]}
        />
        <p className="text-caption text-muted-foreground">
          {free
            ? "Anyone can enroll in one click and start learning. Free courses are a good way to bring in new learners."
            : "Learners pay at checkout, then keep access to every lesson. Use paid courses to convert learners who started free."}
        </p>
      </div>

      {!free && (
        <Field label="Price (₹)" error={priceError} hint={Number.isFinite(price) && price > 0 ? `Learners pay ${formatINR(price)}.` : undefined}>
          <WholeNumberInput value={price} placeholder="e.g. 4999" onChangeValue={(n) => onChange({ price: n, capacity })} />
        </Field>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Limit learners</p>
            <p className="text-caption text-muted-foreground">Off by default. Courses are open to everyone.</p>
          </div>
          <Switch
            aria-label="Limit learners"
            checked={limited}
            onCheckedChange={(on) => onChange({ price, capacity: on ? lastCapacity.current ?? Number.NaN : null })}
          />
        </div>
        {limited && (
          <Field label="Maximum learners" error={capacityError}>
            <WholeNumberInput value={capacity ?? Number.NaN} placeholder="e.g. 500" onChangeValue={(n) => onChange({ price, capacity: n })} />
          </Field>
        )}
      </div>
    </div>
  )
}
