import React from "react"
import { Menu, Search, Bell, Sparkles, ShieldAlert } from "lucide-react"
import { HexColorField } from "../../../components/HexColorField"
import type { EvaluatorProfile } from "../types"

interface EvaluatorTopBarProps {
  onOpenMobileMenu: () => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  profile: EvaluatorProfile
  hexColor: string
  onChangeHexColor: (hex: string) => void
  unreadCount?: number
  onNotificationsClick: () => void
  onOpenAiAssistant?: () => void
  title: string
  subtitle?: string
}

export function EvaluatorTopBar({
  onOpenMobileMenu,
  searchQuery,
  setSearchQuery,
  profile,
  hexColor,
  onChangeHexColor,
  unreadCount = 0,
  onNotificationsClick,
  onOpenAiAssistant,
  title,
  subtitle,
}: EvaluatorTopBarProps) {
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

        {/* Notifications Icon Button */}
        <button
          type="button"
          onClick={onNotificationsClick}
          className="relative p-2.5 rounded-full bg-white text-zinc-700 hover:text-purple-700 border border-zinc-200/90 shadow-xs transition-colors cursor-pointer"
          title="View Evaluator Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Hex Color Picker integration */}
        <div className="hidden sm:block">
          <HexColorField
            hexColor={hexColor}
            onChangeHex={onChangeHexColor}
          />
        </div>
      </div>
    </header>
  )
}

export default EvaluatorTopBar
