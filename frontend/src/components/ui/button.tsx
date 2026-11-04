import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "framer-motion"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"

const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "kumo-btn",
        secondary:
          "border border-border bg-surface-2 text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:bg-surface-3 hover:border-border-strong/40 active:scale-[0.98]",
        outline: "border border-border bg-transparent text-foreground hover:bg-surface-2 active:scale-[0.98]",
        ghost: "text-muted-foreground hover:bg-surface-2 hover:text-foreground active:scale-[0.98]",
        danger: "kumo-btn kumo-btn--danger",
        link: "h-auto px-0 text-primary-text underline-offset-4 hover:underline",
        glass:
          "border border-white/15 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
        // Aliases kept for older callers
        default: "kumo-btn",
        destructive: "kumo-btn kumo-btn--danger",
      },
      size: {
        sm: "h-8 px-3 pb-0.5 text-xs gap-1.5 [&_svg]:size-3.5",
        md: "h-9 px-3.5 pb-0.5 text-sm gap-1.5 [&_svg]:size-4",
        lg: "h-11 px-5 pb-0.5 text-[15px] gap-2 [&_svg]:size-4",
        icon: "h-9 w-9 p-0 [&_svg]:size-4",
        "icon-sm": "h-8 w-8 p-0 [&_svg]:size-3.5",
        default: "h-9 px-3.5 pb-0.5 text-sm gap-1.5 [&_svg]:size-4",
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
    const isKumo =
      variant === "primary" ||
      variant === "default" ||
      variant === "danger" ||
      variant === "destructive" ||
      !variant

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
        whileTap={disabled || loading ? undefined : { scale: 0.98 }}
        transition={spring.snappy}
        {...(props as HTMLMotionProps<"button">)}
      >
        {isKumo && <span className="kumo-btn__bg" aria-hidden="true" />}
        <span className="kumo-btn__content">
          {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : leftIcon}
          {children}
          {!loading && rightIcon}
        </span>
      </motion.button>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
export default Button
