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

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onWheel, leading, trailing, wrapperClassName, ...props }, ref) => {
    const input = (
      <input
        type={type}
        ref={ref}
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

export { Input }
export default Input
