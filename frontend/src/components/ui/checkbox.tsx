import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"

export interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean | "indeterminate"
  onCheckedChange: (checked: boolean) => void
}

/** Accessible checkbox (role="checkbox") with an animated tick. Pair with <Label htmlFor>. */
const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked, onCheckedChange, className, disabled, ...props }, ref) => {
    const on = checked === true || checked === "indeterminate"
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={checked === "indeterminate" ? "mixed" : checked}
        disabled={disabled}
        onClick={() => onCheckedChange(checked !== true)}
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
          on ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface hover:border-subtle-foreground",
          className,
        )}
        {...props}
      >
        <AnimatePresence initial={false}>
          {on && (
            <motion.span
              key={String(checked)}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={transition.fast}
              className="flex"
            >
              {checked === "indeterminate" ? (
                <Minus className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              ) : (
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    )
  },
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
export default Checkbox
