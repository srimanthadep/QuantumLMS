import { AnimatePresence, motion } from "framer-motion"
import { Bell, BookOpen, CheckCheck, CreditCard, MessageCircleQuestion, Radio, Sparkles } from "lucide-react"
import { useNotifications, type AppNotification } from "@/context/NotificationContext"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"

export interface ShellNotification {
  id: string
  title: string
  message: string
  timestamp: string
  read: boolean
  kind?: AppNotification["type"] | "assessment"
}

/** Optional custom source (e.g. the evaluator's own notification store). */
export interface NotificationSource {
  items: ShellNotification[]
  onSelect?: (n: ShellNotification) => void
  onMarkAllRead?: () => void
}

const ICON: Record<string, typeof Bell> = {
  class: Radio,
  doubt: MessageCircleQuestion,
  grade: BookOpen,
  system: Sparkles,
  payment: CreditCard,
  assessment: BookOpen,
}

function useSource(custom?: NotificationSource): Required<NotificationSource> {
  const ctx = useNotifications()
  if (custom) return { onSelect: () => {}, onMarkAllRead: () => {}, ...custom }
  return {
    items: ctx.notifications.map((n) => ({ id: n.id, title: n.title, message: n.message, timestamp: n.timestamp, read: n.read, kind: n.type })),
    onSelect: (n) => ctx.markAsRead(n.id),
    onMarkAllRead: ctx.markAllAsRead,
  }
}

/** Bell with an animated unread badge and a popover list. */
export default function NotificationsMenu({ source }: { source?: NotificationSource }) {
  const { items, onSelect, onMarkAllRead } = useSource(source)
  const unread = items.filter((n) => !n.read).length
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                key={unread}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={spring.snappy}
                className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground ring-2 ring-background"
                aria-hidden="true"
              >
                {unread}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,360px)] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={!unread}
            className="inline-flex items-center gap-1 rounded text-caption font-medium text-primary-text hover:underline disabled:pointer-events-none disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" /> Mark all read
          </button>
        </div>
        <ul className="max-h-[360px] overflow-y-auto p-1.5">
          {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted-foreground">You're all caught up.</li>}
          {items.map((n, i) => {
            const Icon = ICON[n.kind ?? "system"] ?? Bell
            return (
              <motion.li key={n.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <button
                  type="button"
                  onClick={() => onSelect(n)}
                  className={cn("flex w-full gap-3 rounded-md p-2.5 text-left transition-colors hover:bg-surface-2", !n.read && "bg-primary-soft/60")}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    </span>
                    <span className="line-clamp-2 text-caption text-muted-foreground">{n.message}</span>
                    <span className="mt-0.5 block text-[11px] text-subtle-foreground">{n.timestamp}</span>
                  </span>
                </button>
              </motion.li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
