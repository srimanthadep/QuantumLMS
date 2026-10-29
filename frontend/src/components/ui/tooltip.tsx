import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider
const TooltipRoot = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[60] max-w-xs origin-[var(--radix-tooltip-content-transform-origin)] rounded-md border border-border bg-surface-3 px-2 py-1 text-xs font-medium text-foreground shadow-[var(--elev-md)] data-[state=closed]:animate-[q-pop-out_100ms_ease-in_forwards] data-[state=delayed-open]:animate-[q-pop-in_140ms_cubic-bezier(0.22,1,0.36,1)] data-[state=instant-open]:animate-[q-pop-in_140ms_cubic-bezier(0.22,1,0.36,1)]",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  delayDuration?: number
  /** Render nothing extra when disabled (e.g. labels already visible). */
  disabled?: boolean
}

/** Convenience tooltip. Wrap the app (or a subtree) in <TooltipProvider>; falls back to its own provider. */
function Tooltip({ content, children, side = "top", align = "center", delayDuration = 250, disabled }: TooltipProps) {
  if (disabled) return children
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={300}>
      <TooltipRoot>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align}>
          {content}
        </TooltipContent>
      </TooltipRoot>
    </TooltipPrimitive.Provider>
  )
}

export { Tooltip, TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent }
export default Tooltip
