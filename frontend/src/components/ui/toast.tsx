import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, duration } from "@/lib/motion"

export type ToastTone = "default" | "success" | "error" | "warning" | "info"

export interface ToastOptions {
  title?: string
  description?: string
  tone?: ToastTone
  /** ms; 0 keeps it until dismissed. */
  duration?: number
  action?: { label: string; onClick: () => void }
}

interface ToastItem extends ToastOptions {
  id: number
  message: string
}

interface ToastContextValue {
  /** Show a toast. Returns its id. */
  show: (message: string, opts?: ToastOptions) => number
  success: (message: string, opts?: ToastOptions) => number
  error: (message: string, opts?: ToastOptions) => number
  dismiss: (id: number) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastTone, React.ReactNode> = {
  default: <Info className="h-4 w-4 text-primary-text" aria-hidden="true" />,
  info: <Info className="h-4 w-4 text-info" aria-hidden="true" />,
  success: <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />,
  error: <XCircle className="h-4 w-4 text-danger" aria-hidden="true" />,
}

/** Infer a tone from legacy toast copy so existing `onToast("...")` calls look right. */
function inferTone(message: string): ToastTone {
  const m = message.toLowerCase()
  if (/(fail|error|invalid|denied|unable|could not)/.test(m)) return "error"
  if (/(warning|overdue|expired|escalat)/.test(m)) return "warning"
  if (/(success|saved|created|submitted|enrolled|published|sent|dispatched|updated|copied|welcome|completed|approved|scheduled)/.test(m))
    return "success"
  return "default"
}

function stripEmoji(s: string) {
  return s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\uFE0F?/gu, "").replace(/\s{2,}/g, " ").trim()
}

/** Stacked toasts, bottom-right on desktop and bottom-center on mobile. */
export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const counter = React.useRef(0)
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = React.useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const show = React.useCallback(
    (message: string, opts: ToastOptions = {}) => {
      const id = ++counter.current
      const item: ToastItem = { ...opts, id, message: stripEmoji(message), tone: opts.tone ?? inferTone(message) }
      setToasts((t) => [...t.slice(-3), item])
      const ms = opts.duration ?? 4200
      if (ms > 0) timers.current.set(id, setTimeout(() => dismiss(id), ms))
      return id
    },
    [dismiss],
  )

  React.useEffect(() => {
    const map = timers.current
    return () => map.forEach((t) => clearTimeout(t))
  }, [])

  const value = React.useMemo<ToastContextValue>(
    () => ({
      show,
      dismiss,
      success: (m, o) => show(m, { ...o, tone: "success" }),
      error: (m, o) => show(m, { ...o, tone: "error" }),
    }),
    [show, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: duration.fast } }}
              transition={spring.soft}
              role={t.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-surface-3 p-3.5 pr-2.5 text-sm text-foreground shadow-[var(--elev-lg)]"
            >
              <span className="mt-0.5">{ICONS[t.tone ?? "default"]}</span>
              <div className="min-w-0 flex-1">
                {t.title && <p className="font-semibold">{t.title}</p>}
                <p className={cn(t.title ? "text-muted-foreground" : "text-foreground")}>{t.message}</p>
                {t.description && <p className="mt-0.5 text-caption text-muted-foreground">{t.description}</p>}
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action!.onClick()
                      dismiss(t.id)
                    }}
                    className="mt-2 text-xs font-semibold text-primary-text hover:underline"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

/** Toast API. Outside a provider it logs instead of throwing so isolated renders keep working. */
export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (ctx) return ctx
  const noop = (m: string) => {
    console.info("[toast]", m)
    return 0
  }
  return { show: noop, success: noop, error: noop, dismiss: () => {} }
}

export { ToastProvider }
