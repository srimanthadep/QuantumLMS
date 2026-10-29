import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  size?: "sm" | "md"
}

/** Accessible toggle (role="switch") with a spring thumb. */
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, size = "md", className, disabled, ...props }, ref) => {
    const dims = size === "sm" ? { track: "h-4 w-7", thumb: "h-3 w-3", travel: 12 } : { track: "h-5 w-9", thumb: "h-4 w-4", travel: 16 }
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full border p-px transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          dims.track,
          checked ? "border-primary bg-primary" : "border-border-strong bg-surface-2",
          className,
        )}
        {...props}
      >
        <motion.span
          aria-hidden="true"
          className={cn("block rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.3)]", dims.thumb)}
          animate={{ x: checked ? dims.travel : 0 }}
          transition={spring.snappy}
          initial={false}
        />
      </button>
    )
  },
)
Switch.displayName = "Switch"

export { Switch }
export default Switch
