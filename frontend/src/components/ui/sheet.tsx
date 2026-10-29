import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { duration, ease } from "@/lib/motion"

const SheetOpenContext = React.createContext<boolean>(false)

type SheetProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>

function Sheet({ open: openProp, defaultOpen, onOpenChange, children, ...props }: SheetProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen ?? false)
  const open = openProp ?? uncontrolled
  const handleChange = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )
  return (
    <SheetOpenContext.Provider value={open}>
      <DialogPrimitive.Root open={open} onOpenChange={handleChange} {...props}>
        {children}
      </DialogPrimitive.Root>
    </SheetOpenContext.Provider>
  )
}

const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} forceMount asChild {...props}>
    <motion.div
      className={cn("fixed inset-0 z-50 bg-overlay backdrop-blur-[2px]", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: duration.base, ease: ease.out }}
    />
  </DialogPrimitive.Overlay>
))
SheetOverlay.displayName = "SheetOverlay"

type Side = "top" | "bottom" | "left" | "right"

const SIDE_CLASSES: Record<Side, string> = {
  top: "inset-x-0 top-0 border-b max-h-[85dvh]",
  bottom: "inset-x-0 bottom-0 border-t max-h-[85dvh] rounded-t-xl",
  left: "inset-y-0 left-0 h-full w-[86%] max-w-sm border-r",
  right: "inset-y-0 right-0 h-full w-[92%] max-w-md border-l",
}
const SIDE_OFFSET: Record<Side, { x?: string; y?: string }> = {
  top: { y: "-100%" },
  bottom: { y: "100%" },
  left: { x: "-100%" },
  right: { x: "100%" },
}

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: Side
  hideClose?: boolean
}

const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, hideClose, ...props }, ref) => {
    const open = React.useContext(SheetOpenContext)
    const off = SIDE_OFFSET[side]
    return (
      <AnimatePresence>
        {open && (
          <SheetPortal forceMount>
            <SheetOverlay />
            <DialogPrimitive.Content ref={ref} forceMount asChild {...props}>
              <motion.div
                className={cn(
                  "fixed z-50 flex flex-col gap-4 overflow-y-auto border-border bg-surface p-6 text-foreground shadow-[var(--elev-lg)] focus:outline-none",
                  SIDE_CLASSES[side],
                  className,
                )}
                initial={{ ...off, opacity: 0.6 }}
                animate={{ x: 0, y: 0, opacity: 1 }}
                exit={{ ...off, opacity: 0.6 }}
                transition={{ duration: duration.slow, ease: ease.out }}
              >
                {children}
                {!hideClose && (
                  <DialogPrimitive.Close className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
                    <X className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Close</span>
                  </DialogPrimitive.Close>
                )}
              </motion.div>
            </DialogPrimitive.Content>
          </SheetPortal>
        )}
      </AnimatePresence>
    )
  },
)
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 pr-8 text-left", className)} {...props} />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold tracking-tight text-foreground", className)} {...props} />
))
SheetTitle.displayName = DialogPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
SheetDescription.displayName = DialogPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
export default Sheet
