import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Copy } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui"
import { transition } from "@/lib/motion"
import { copyText } from "@/pages/student/studentUtils"

interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  text: string
  label?: string
  copiedLabel?: string
  onCopied?: () => void
}

/** Copy action whose icon morphs into a check for 1.6 s after copying. */
export default function CopyButton({ text, label, copiedLabel = "Copied", onCopied, variant = "ghost", size = "sm", ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  const icon = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={copied ? "check" : "copy"}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={transition.fast}
        className="flex"
      >
        {copied ? <Check className="text-success" aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </motion.span>
    </AnimatePresence>
  )

  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label ? undefined : copied ? copiedLabel : "Copy"}
      onClick={async (e) => {
        e.stopPropagation()
        await copyText(text)
        setCopied(true)
        onCopied?.()
      }}
      {...props}
    >
      {icon}
      {label && <span>{copied ? copiedLabel : label}</span>}
    </Button>
  )
}
