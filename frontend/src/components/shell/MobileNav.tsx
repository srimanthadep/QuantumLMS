import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import Sidebar, { type SidebarProps } from "./Sidebar"

interface MobileNavProps extends Omit<SidebarProps, "collapsed" | "onToggleCollapse" | "instance"> {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Slide-in navigation drawer for mobile and tablet. */
export default function MobileNav({ open, onOpenChange, onNavigate, onOpenAi, ...props }: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[84%] max-w-[300px] gap-0 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Pages in this workspace</SheetDescription>
        <Sidebar
          {...props}
          instance="mobile"
          onNavigate={(id) => {
            onOpenChange(false)
            onNavigate(id)
          }}
          onOpenAi={() => {
            onOpenChange(false)
            onOpenAi()
          }}
        />
      </SheetContent>
    </Sheet>
  )
}
