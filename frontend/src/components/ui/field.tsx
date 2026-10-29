import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import { Label } from "./label"

interface FieldProps {
  label: React.ReactNode
  /** Child control; receives id / aria-describedby / aria-invalid automatically when it is a single element. */
  children: React.ReactElement<Record<string, unknown>>
  hint?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  className?: string
  /** Optional element on the right of the label (e.g. "Forgot password?"). */
  aside?: React.ReactNode
  id?: string
}

/** Label + control + hint + animated error message, wired for screen readers. */
export default function Field({ label, children, hint, error, required, className, aside, id: idProp }: FieldProps) {
  const autoId = React.useId()
  const id = idProp ?? (children.props.id as string | undefined) ?? `field-${autoId}`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined
  const control = React.cloneElement(children, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    "aria-required": required || undefined,
  })
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </Label>
        {aside}
      </div>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            key="error"
            id={errorId}
            role="alert"
            className="text-caption font-medium text-danger"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={transition.fast}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export { Field }
