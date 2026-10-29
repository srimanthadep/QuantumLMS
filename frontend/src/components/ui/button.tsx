import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "framer-motion"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"

const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,color,box-shadow,opacity] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[var(--elev-xs)] hover:bg-primary-hover hover:shadow-[var(--glow-primary)]",
        secondary: "border border-border bg-surface-2 text-foreground hover:bg-surface-3 hover:border-border-strong/40",
        outline: "border border-border bg-transparent text-foreground hover:bg-surface-2",
        ghost: "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
        danger: "bg-danger text-white hover:opacity-90 dark:text-ink-950",
        link: "h-auto px-0 text-primary-text underline-offset-4 hover:underline",
        glass:
          "border border-white/15 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
        // Aliases kept for older callers
        default:
          "bg-primary text-primary-foreground shadow-[var(--elev-xs)] hover:bg-primary-hover hover:shadow-[var(--glow-primary)]",
        destructive: "bg-danger text-white hover:opacity-90 dark:text-ink-950",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        md: "h-9 px-4 text-sm [&_svg]:size-4",
        lg: "h-11 px-5 text-[15px] [&_svg]:size-4",
        icon: "h-9 w-9 p-0 [&_svg]:size-4",
        "icon-sm": "h-8 w-8 p-0 [&_svg]:size-3.5",
        default: "h-9 px-4 text-sm [&_svg]:size-4",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      block: false,
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, block, asChild = false, loading = false, leftIcon, rightIcon, disabled, children, type, ...props },
    ref,
  ) => {
    const classes = cn(buttonVariants({ variant, size, block }), className)
    if (asChild) {
      return (
        <Slot ref={ref} className={cn(classes, "active:scale-[0.98] transition-transform")} {...props}>
          {children}
        </Slot>
      )
    }
    return (
      <motion.button
        ref={ref}
        type={type ?? "button"}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        whileTap={disabled || loading ? undefined : { scale: 0.97 }}
        transition={spring.snappy}
        {...(props as HTMLMotionProps<"button">)}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </motion.button>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
export default Button
