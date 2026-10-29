import * as React from "react"
import { cn } from "@/lib/utils"
import { fieldClasses } from "./input"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldClasses, "min-h-[88px] resize-y py-2 leading-6", className)} {...props} />
))
Textarea.displayName = "Textarea"

export { Textarea }
export default Textarea
