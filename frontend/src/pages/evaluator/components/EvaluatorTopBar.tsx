import React, { useState, useRef, useEffect } from "react"
import { Menu, Search, Bell, Sparkles, Check, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { ThemeAccentPicker } from "../../../components/ui/ThemeAccentPicker"
import type { EvaluatorProfile, EvaluatorNotification } from "../types"

interface EvaluatorTopBarProps {
  onOpenMobileMenu: () => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  profile: EvaluatorProfile
  hexColor?: string
  onChangeHexColor?: (hex: string) => void
  unreadCount?: number
  notifications?: EvaluatorNotification[]
  onMarkNotificationRead?: (id: string) => void
  onMarkAllNotificationsRead?: () => void
  onNotificationSelect?: (notif: EvaluatorNotification) => void
  onOpenAiAssistant?: () => void
  title: string
  subtitle?: string
}

export function EvaluatorTopBar({
  onOpenMobileMenu,
  searchQuery,
  setSearchQuery,
  profile,
  unreadCount = 0,
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onNotificationSelect,
  onOpenAiAssistant,
  title,
  subtitle,
}: EvaluatorTopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showNotifications])

  return (
    <header className="evaluator-top-bar w-full flex items-center justify-between gap-4 mb-5 flex-wrap">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-white/70 hover:bg-white text-zinc-800 border border-zinc-200/80 shadow-xs cursor-pointer"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>{title}</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/30">
              Assessor Portal
            </span>
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-white/90 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        {/* Search Bar */}
        <div className="relative min-w-[200px] sm:min-w-[260px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assessments, students, IDs..."
            className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-full bg-white text-zinc-800 placeholder-zinc-400 border border-zinc-200/90 shadow-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-full bg-white text-zinc-700 hover:text-purple-700 border border-zinc-200/90 shadow-xs transition-colors cursor-pointer"
            title="Evaluator Notifications"
            aria-label="Evaluator Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200/80 dark:border-zinc-800 z-50 p-3">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 px-2 py-0.5 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && onMarkAllNotificationsRead && (
                  <button
                    type="button"
                    onClick={onMarkAllNotificationsRead}
                    className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5 no-scrollbar">
                {notifications.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    No notifications right now
                  </p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        onMarkNotificationRead?.(notif.id)
                        onNotificationSelect?.(notif)
                        setShowNotifications(false)
                      }}
                      className={`p-2.5 rounded-xl text-left cursor-pointer transition-colors ${
                        notif.read
                          ? "bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60 opacity-75"
                          : "bg-purple-50/70 dark:bg-purple-950/30 hover:bg-purple-100/70 border border-purple-100 dark:border-purple-900/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                          {notif.title}
                        </div>
                        <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                          {notif.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Curated Theme Accent Picker */}
        <div className="hidden sm:block">
          <ThemeAccentPicker />
        </div>
      </div>
    </header>
  )
}

export default EvaluatorTopBar
