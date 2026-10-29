import { Check, Monitor, Moon, Palette, Sun } from "lucide-react"
import { motion } from "framer-motion"
import { useTheme } from "@/app/ThemeProvider"
import { THEME_ACCENTS, type ThemeMode } from "@/services/themeService"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { spring } from "@/lib/motion"
import { cn } from "@/lib/utils"

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
]

/** Colour mode segmented control + accent swatches. Used inside the picker popover and on settings pages. */
export function ThemeControls({ className, idPrefix = "theme" }: { className?: string; idPrefix?: string }) {
  const { mode, accent, setMode, setAccent } = useTheme()
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <p className="mb-2 text-caption font-medium text-muted-foreground" id={`${idPrefix}-mode-label`}>
          Appearance
        </p>
        <div
          role="radiogroup"
          aria-labelledby={`${idPrefix}-mode-label`}
          className="grid grid-cols-3 gap-1 rounded-md border border-border bg-surface-2 p-1"
        >
          {MODES.map((m) => {
            const active = mode === m.id
            const Icon = m.icon
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMode(m.id)}
                className={cn(
                  "relative flex h-8 items-center justify-center gap-1.5 rounded-sm text-caption font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`${idPrefix}-mode-indicator`}
                    transition={spring.snappy}
                    className="absolute inset-0 rounded-sm border border-border bg-surface-3 shadow-[var(--elev-xs)]"
                  />
                )}
                <Icon className="relative h-3.5 w-3.5" aria-hidden="true" />
                <span className="relative">{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <p className="mb-2 text-caption font-medium text-muted-foreground" id={`${idPrefix}-accent-label`}>
          Accent
        </p>
        <div role="radiogroup" aria-labelledby={`${idPrefix}-accent-label`} className="flex items-center gap-2">
          {THEME_ACCENTS.map((a) => {
            const active = accent === a.id
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={a.name}
                title={a.name}
                onClick={() => setAccent(a.id)}
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full border transition-transform duration-150 hover:scale-105 active:scale-95",
                  active ? "border-foreground/40" : "border-transparent",
                )}
              >
                <span className="h-6 w-6 rounded-full" style={{ backgroundColor: a.colorHex }} />
                {active && <Check className="absolute h-3.5 w-3.5 text-white" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Top-bar trigger that opens the theme popover. */
export function ThemeAccentPicker({ className }: { className?: string }) {
  const { resolved } = useTheme()
  const Icon = resolved === "dark" ? Moon : Sun
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Theme and accent"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
            className,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Palette className="h-4 w-4 text-primary-text" aria-hidden="true" />
          Theme
        </div>
        <ThemeControls idPrefix="theme-popover" />
      </PopoverContent>
    </Popover>
  )
}

export default ThemeAccentPicker
