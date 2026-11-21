import * as React from "react"
import { cn } from "@/lib/utils"

/** Shared field chrome for inputs, textareas and select triggers. */
export const fieldClasses =
  "w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground shadow-[var(--elev-xs)] transition-[border-color,box-shadow] duration-150 placeholder:text-subtle-foreground hover:border-subtle-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/20"

export interface InputProps extends React.ComponentProps<"input"> {
  /** Icon or element rendered inside the left edge. */
  leading?: React.ReactNode
  /** Icon or element rendered inside the right edge. */
  trailing?: React.ReactNode
  wrapperClassName?: string
}

function toNumberDraft(val: InputProps["value"], min: InputProps["min"]): string {
  if (val === undefined || val === null || val === "") return ""
  if (typeof val === "number") {
    if (!Number.isFinite(val)) return ""
    if (val === 0 && min !== undefined && Number(min) > 0) return ""
    return String(val)
  }
  return String(val)
}

function stripLeadingNumberZeros(raw: string): string {
  return raw.replace(/^(-?)0+(\d)/, "$1$2")
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, onChange, onWheel, leading, trailing, wrapperClassName, ...props }, ref) => {
    const isNumberType = type === "number"
    const isControlled = value !== undefined
    const [numberDraft, setNumberDraft] = React.useState<string>(() =>
      isNumberType && isControlled ? toNumberDraft(value, props.min) : "",
    )
    const prevValueRef = React.useRef(value)

    React.useEffect(() => {
      if (!isNumberType || !isControlled) return
      if (value === prevValueRef.current) return
      prevValueRef.current = value
      if (
        numberDraft === "" &&
        (value === 0 || value === "" || (typeof value === "number" && !Number.isFinite(value)))
      ) {
        return
      }
      const nextStr = value === null ? "" : String(value)
      const nextNum = nextStr.trim() === "" ? NaN : Number(nextStr)
      const draftNum = numberDraft.trim() === "" ? NaN : Number(numberDraft)
      if (Number.isFinite(nextNum) && Number.isFinite(draftNum) && nextNum === draftNum) {
        return
      }
      setNumberDraft(toNumberDraft(value, props.min))
    }, [isNumberType, isControlled, value, props.min, numberDraft])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isNumberType) {
        const raw = e.target.value
        if (isControlled && raw === "" && e.target.validity?.badInput) {
          return
        }
        const cleaned = stripLeadingNumberZeros(raw)
        if (cleaned !== raw) {
          e.target.value = cleaned
        }
        if (isControlled) {
          setNumberDraft(cleaned)
        }
      }
      onChange?.(e)
    }

    const input = (
      <input
        type={type}
        ref={ref}
        value={isNumberType && isControlled ? numberDraft : value}
        onChange={handleChange}
        className={cn(
          fieldClasses,
          "h-9 py-2 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          leading ? "pl-9" : undefined,
          trailing ? "pr-9" : undefined,
          className,
        )}
        onWheel={(e) => {
          if (type === "number") (e.target as HTMLElement).blur()
          onWheel?.(e)
        }}
        {...props}
      />
    )
    if (!leading && !trailing) return input
    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        {leading && (
          <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-subtle-foreground [&_svg]:size-4">
            {leading}
          </span>
        )}
        {input}
        {trailing && <span className="absolute right-2 top-1/2 flex -translate-y-1/2 text-subtle-foreground">{trailing}</span>}
      </div>
    )
  },
)
Input.displayName = "Input"

export { Input, toNumberDraft, stripLeadingNumberZeros }
export default Input
