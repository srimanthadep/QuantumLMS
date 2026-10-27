import React, { useState } from "react"
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react"
import type { EvaluatorState } from "./data/evaluatorStorage"
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "./data/evaluatorStorage"
import type { EvaluatorTab } from "./components/EvaluatorSidebar"
import type { EvaluatorNotification } from "./types"

interface NotificationsProps {
  state: EvaluatorState
  onUpdateState: (newState: EvaluatorState) => void
  onNavigateTab: (tab: EvaluatorTab, context?: any) => void
  onToast: (msg: string) => void
}

export function Notifications({
  state,
  onUpdateState,
  onNavigateTab,
  onToast,
}: NotificationsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All")

  const categories = [
    "All",
    "Deadline",
    "Reassessment",
    "Submission",
    "Assignment",
    "System",
  ]

  const filteredNotifications = state.notifications.filter((n) => {
    if (selectedCategory !== "All" && n.category !== selectedCategory) {
      return false
    }
    return true
  })

  const handleMarkAsRead = (id: string) => {
    const nextState = markNotificationRead(state, id)
    onUpdateState(nextState)
  }

  const handleMarkAllRead = () => {
    const nextState = markAllNotificationsRead(state)
    onUpdateState(nextState)
    onToast("All notifications marked as read.")
  }

  const handleNotificationClick = (notif: EvaluatorNotification) => {
    handleMarkAsRead(notif.id)
    if (notif.targetTab) {
      onNavigateTab(notif.targetTab as EvaluatorTab, {
        relatedId: notif.relatedId,
      })
    }
  }

  const unreadCount = state.notifications.filter((n) => !n.read).length

  return (
    <div className="evaluator-notifications space-y-5">
      {/* Header and Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {/* Mark All as Read CTA */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-500">
            {unreadCount} Unread
          </span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs divide-y divide-zinc-100 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="py-14 text-center text-zinc-500 text-xs">
            <Bell className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="font-semibold text-zinc-700">No notifications in this category</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            let icon = <Bell className="w-4 h-4 text-purple-600" />
            let bgIcon = "bg-purple-50"

            if (notif.category === "Deadline") {
              icon = <Clock className="w-4 h-4 text-rose-600" />
              bgIcon = "bg-rose-50"
            } else if (notif.category === "Reassessment") {
              icon = <RotateCcw className="w-4 h-4 text-amber-600" />
              bgIcon = "bg-amber-50"
            } else if (notif.category === "Submission") {
              icon = <FileText className="w-4 h-4 text-blue-600" />
              bgIcon = "bg-blue-50"
            } else if (notif.category === "Assignment") {
              icon = <BookOpen className="w-4 h-4 text-emerald-600" />
              bgIcon = "bg-emerald-50"
            }

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 flex items-start justify-between gap-4 transition-colors cursor-pointer ${
                  notif.read ? "bg-white hover:bg-zinc-50/70" : "bg-purple-50/30 hover:bg-purple-50/50"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl ${bgIcon} flex items-center justify-center shrink-0 mt-0.5`}>
                    {icon}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-xs font-bold ${notif.read ? "text-zinc-800" : "text-zinc-900"}`}>
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                      )}
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-zinc-100 text-zinc-500 font-semibold">
                        {notif.category}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="text-[10px] text-zinc-400">
                      {new Date(notif.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Action */}
                <div className="flex items-center gap-2 shrink-0 self-center">
                  {notif.targetTab && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleNotificationClick(notif)
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  {!notif.read && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkAsRead(notif.id)
                      }}
                      className="text-[11px] text-purple-600 hover:underline font-bold px-1.5 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Notifications
