import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor
const PopoverClose = PopoverPrimitive.Close

/** Shared floating-surface classes (popover, dropdown, select, tooltip). */
export const floatingClasses =
  "z-50 rounded-lg border border-border bg-surface-3 text-foreground shadow-[var(--elev-lg)] outline-none origin-[var(--radix-popper-transform-origin)] data-[state=open]:animate-[q-pop-in_160ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[q-pop-out_120ms_ease-in_forwards]"

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(floatingClasses, "w-72 p-4", className)}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverClose }
export default Popover
