import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { LayoutGroup, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"

type TabsVariant = "pill" | "underline"

interface TabsCtx {
  value: string | undefined
  variant: TabsVariant
  layoutId: string
}
const TabsContext = React.createContext<TabsCtx>({ value: undefined, variant: "pill", layoutId: "tabs" })

interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  /** pill: sliding pill inside a track. underline: sliding bar under the active tab. */
  variant?: TabsVariant
}

/** Radix Tabs with a shared-layout sliding indicator. */
const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ value: valueProp, defaultValue, onValueChange, variant = "pill", ...props }, ref) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
    const value = valueProp ?? uncontrolled
    const id = React.useId()
    return (
      <TabsContext.Provider value={{ value, variant, layoutId: `tabs-indicator-${id}` }}>
        <LayoutGroup id={id}>
          <TabsPrimitive.Root
            ref={ref}
            value={value}
            onValueChange={(v) => {
              if (valueProp === undefined) setUncontrolled(v)
              onValueChange?.(v)
            }}
            {...props}
          />
        </LayoutGroup>
      </TabsContext.Provider>
    )
  },
)
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext)
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "no-scrollbar relative inline-flex max-w-full items-center overflow-x-auto text-muted-foreground",
        variant === "pill" ? "h-9 gap-0.5 rounded-md border border-border bg-surface-2 p-0.5" : "h-10 gap-4 border-b border-border",
        className,
      )}
      {...props}
    />
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, value, ...props }, ref) => {
  const ctx = React.useContext(TabsContext)
  const active = ctx.value === value
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground hover:text-foreground",
        ctx.variant === "pill" ? "h-full rounded-[7px] px-3" : "h-full px-0.5",
        className,
      )}
      {...props}
    >
      {active && (
        <motion.span
          layoutId={ctx.layoutId}
          transition={spring.snappy}
          aria-hidden="true"
          className={cn(
            "absolute",
            ctx.variant === "pill"
              ? "inset-0 rounded-[7px] border border-border bg-surface-3 shadow-[var(--elev-xs)]"
              : "inset-x-0 -bottom-px h-0.5 rounded-full bg-primary",
          )}
        />
      )}
      <span className="relative z-[1] inline-flex items-center gap-1.5">{children}</span>
    </TabsPrimitive.Trigger>
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-4 focus-visible:outline-none", className)} {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  "aria-label": string
  size?: "sm" | "md"
  className?: string
  block?: boolean
}

/** Radio-group style segmented control with a sliding thumb. Arrow keys move the selection. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  block,
  ...aria
}: SegmentedControlProps<T>) {
  const id = React.useId()
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const enabled = options.filter((o) => !o.disabled)
  const onKey = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return
    e.preventDefault()
    const idx = enabled.findIndex((o) => o.value === value)
    let next = idx
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % enabled.length
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + enabled.length) % enabled.length
    if (e.key === "Home") next = 0
    if (e.key === "End") next = enabled.length - 1
    const target = enabled[next]
    onChange(target.value)
    refs.current[options.indexOf(target)]?.focus()
  }
  return (
    <div
      role="radiogroup"
      aria-label={aria["aria-label"]}
      onKeyDown={onKey}
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5",
        size === "sm" ? "h-8" : "h-9",
        block && "flex w-full",
        className,
      )}
    >
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex h-full items-center justify-center gap-1.5 rounded-[7px] px-3 font-medium transition-colors disabled:opacity-50",
              size === "sm" ? "text-xs" : "text-sm",
              block && "flex-1",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id}`}
                transition={spring.snappy}
                aria-hidden="true"
                className="absolute inset-0 rounded-[7px] border border-border bg-surface-3 shadow-[var(--elev-xs)]"
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
export default Tabs
