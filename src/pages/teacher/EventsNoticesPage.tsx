import { useState, useMemo, useEffect } from "react"
import { Icon } from "../../components/Icon"
import { MetricCard } from "../../components/MetricCard"
import type { MetricItem } from "../../types"
import { TeacherHeaderActions } from "./TeacherHeaderActions"
import {
  getEventsNoticesData,
  toggleEventRegistration,
  markNoticeAsRead,
  markAllNoticesAsRead,
  type TeacherEventItem,
  type TeacherNoticeItem,
  type EventsNoticesState,
} from "./teacherEventsNoticesData"

export function EventsNoticesHeader({
  searchQuery,
  setSearchQuery,
  onOpenAiModal,
  hexColor,
  onChangeHexColor,
  totalEvents,
  totalNotices,
  onSwitchToCalendar,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenAiModal?: () => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  totalEvents: number
  totalNotices: number
  onSwitchToCalendar?: () => void
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>Events & Notices</span>
        </div>
        <div className="subtitle">
          Campus academic events, faculty announcements, research colloquiums, and school notices ({totalEvents} Events · {totalNotices} Notices)
        </div>
      </div>
      <div className="header-actions flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, notices, speakers..."
            aria-label="Search events and notices"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1 cursor-pointer"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <TeacherHeaderActions
          hexColor={hexColor}
          onChangeHexColor={onChangeHexColor}
          onOpenAiModal={onOpenAiModal}
          showPortalSwitch={true}
        >
          {onSwitchToCalendar && (
            <button
              type="button"
              onClick={onSwitchToCalendar}
              className="h-9 px-3.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              aria-label="View Academic Calendar Schedule"
            >
              <Icon name="calendar" size={13} />
              <span>Calendar Schedule</span>
            </button>
          )}
        </TeacherHeaderActions>
      </div>
    </header>
  )
}

/* --------------------------------------------------------------------------
   DETAILED EVENT SUMMARY POPUP MODAL
-------------------------------------------------------------------------- */
function EventDetailsModal({
  isOpen,
  onClose,
  event,
  onToggleRsvp,
  onToast,
}: {
  isOpen: boolean
  onClose: () => void
  event: TeacherEventItem | null
  onToggleRsvp: (id: string) => void
  onToast?: (msg: string) => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.body.style.overflow = "auto"
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !event) return null

  const getCategoryBadgeClass = (category: TeacherEventItem["category"]) => {
    switch (category) {
      case "Hackathons":
        return "bg-amber-100 text-amber-900 border-amber-200"
      case "Guest Lectures":
        return "bg-purple-100 text-purple-900 border-purple-200"
      case "Workshops":
        return "bg-teal-100 text-teal-900 border-teal-200"
      case "Faculty Meetings":
        return "bg-blue-100 text-blue-900 border-blue-200"
      case "Academic":
        return "bg-rose-100 text-rose-900 border-rose-200"
      case "Research Colloquium":
        return "bg-indigo-100 text-indigo-900 border-indigo-200"
      default:
        return "bg-zinc-100 text-zinc-800 border-zinc-200"
    }
  }

  const hasValidMeeting = Boolean(event.meetingUrl && event.meetingUrl.startsWith("http"))
  const hasAttachments = Boolean(event.attachments && event.attachments.length > 0)

  const handleDownloadAttachment = (name: string) => {
    if (onToast) onToast(`Opening document: "${name}"...`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-details-title"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4.5 border-b border-zinc-150 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-white to-white shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`px-3 py-0.5 rounded-full text-[10.5px] font-bold border uppercase tracking-wider ${getCategoryBadgeClass(
                event.category
              )}`}
            >
              {event.category}
            </span>
            {event.isToday && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-lime-100 text-lime-800 border border-lime-200">
                ● TODAY
              </span>
            )}
            {event.registered ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span>✓</span>
                <span>RSVP Confirmed</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                Open Registration
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 grid place-items-center cursor-pointer transition-colors"
            aria-label="Close event details"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Title & Core Date/Time Badge */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2
                id="event-details-title"
                className="text-lg sm:text-xl font-bold text-zinc-900 leading-snug tracking-tight"
              >
                {event.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-2 flex-wrap">
                <span className="font-semibold text-purple-700 flex items-center gap-1">
                  <Icon name="calendar" size={13} />
                  <span>{event.displayDate}</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 text-zinc-700 font-mono">
                  <Icon name="clock" size={13} />
                  <span>{event.time}</span>
                </span>
              </div>
            </div>

            {/* Calendar Tile Visual */}
            <div className="w-14 sm:w-16 py-2 px-1 text-center shrink-0 rounded-2xl bg-purple-50/80 border border-purple-200 shadow-2xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-700">
                {event.month}
              </span>
              <span className="block text-xl font-black text-purple-950 mt-0.5">
                {event.day}
              </span>
            </div>
          </div>

          {/* Location & Organizer Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-50/80 border border-zinc-150">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
                Venue & Location
              </span>
              <div className="flex items-start gap-1.5 text-xs text-zinc-800 font-medium">
                <span className="text-purple-600 mt-0.5">📍</span>
                <span className="leading-relaxed">{event.location}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
                Organizer / Host
              </span>
              <div className="flex items-start gap-1.5 text-xs text-zinc-800 font-medium">
                <span className="text-purple-600 mt-0.5">👤</span>
                <div className="leading-relaxed">
                  <strong className="block text-zinc-900">{event.organizer}</strong>
                  {event.organizerRole && (
                    <span className="text-[11px] text-zinc-500 block">
                      {event.organizerRole}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Event Overview & Description
            </h3>
            <p className="text-xs sm:text-[13px] text-zinc-700 leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-2xl border border-zinc-150">
              {event.fullDescription || event.description}
            </p>
          </div>

          {/* Chronological Agenda Breakdown (if available) */}
          {event.agenda && event.agenda.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="sparkles" size={13} />
                <span>Event Schedule & Agenda</span>
              </h3>
              <div className="space-y-2 border-l-2 border-purple-200 pl-3 ml-2">
                {event.agenda.map((item, idx) => (
                  <div key={idx} className="relative group">
                    <span className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-purple-600 ring-4 ring-purple-100" />
                    <div className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-150">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
                        <strong className="text-xs text-zinc-900">{item.title}</strong>
                        <span className="text-[10.5px] font-mono text-purple-700 font-semibold bg-purple-50 px-2 py-0.2 rounded">
                          {item.time}
                        </span>
                      </div>
                      {item.speakerOrLead && (
                        <span className="text-[11px] text-zinc-500 block">
                          Lead: {item.speakerOrLead}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments Section (Rendered wherever available) */}
          {hasAttachments && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="document" size={13} />
                <span>Event Attachments & Materials ({event.attachments!.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {event.attachments!.map((att, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-purple-50/40 border border-purple-150 hover:border-purple-300 transition-all flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 grid place-items-center shrink-0 font-bold text-[10px]">
                        {att.type}
                      </div>
                      <div className="min-w-0">
                        <strong className="block text-xs text-zinc-900 truncate">
                          {att.name}
                        </strong>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {att.size}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(att.name)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 rounded-xl border border-zinc-250 text-zinc-700 font-bold hover:bg-zinc-100 text-xs transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Meeting Button (Rendered ONLY when valid link exists) */}
            {hasValidMeeting ? (
              <a
                href={event.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span>🎥 Join Meeting ({event.meetingPlatform || "Live"})</span>
                <span>→</span>
              </a>
            ) : (
              <span className="text-[11px] text-zinc-400 italic">
                In-person venue · No virtual link
              </span>
            )}

            {/* RSVP / Register Toggle Button */}
            <button
              type="button"
              onClick={() => onToggleRsvp(event.id)}
              className={`px-4 h-9 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                event.registered
                  ? "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                  : "btn-primary"
              }`}
            >
              {event.registered ? (
                <>
                  <span>✓</span>
                  <span>Registered (Cancel RSVP)</span>
                </>
              ) : (
                <>
                  <span>+ RSVP / Register</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   DETAILED NOTICE SUMMARY POPUP MODAL
-------------------------------------------------------------------------- */
function NoticeDetailsModal({
  isOpen,
  onClose,
  notice,
  onToggleRead,
  onToast,
}: {
  isOpen: boolean
  onClose: () => void
  notice: TeacherNoticeItem | null
  onToggleRead: (id: string, nextRead: boolean) => void
  onToast?: (msg: string) => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.body.style.overflow = "auto"
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !notice) return null

  const getPriorityBadgeClass = (priority: TeacherNoticeItem["priority"]) => {
    switch (priority) {
      case "Urgent":
        return "bg-rose-100 text-rose-900 border-rose-200"
      case "Important":
        return "bg-amber-100 text-amber-900 border-amber-200"
      case "Normal":
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200"
    }
  }

  const handleDownloadAttachment = (name: string) => {
    if (onToast) onToast(`Opening document: "${name}"...`)
  }

  const handleCopyNotice = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${notice.title}\n\n${notice.fullContent}`)
      if (onToast) onToast("Notice text copied to clipboard!")
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notice-details-title"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4.5 border-b border-zinc-150 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-white to-white shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-3 py-0.5 rounded-full text-[10.5px] font-bold border uppercase tracking-wider ${getPriorityBadgeClass(
                notice.priority
              )}`}
            >
              {notice.priority} Priority
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
              {notice.category}
            </span>
            {notice.isPinned && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                📌 Pinned
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              ✓ Marked as Read
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 grid place-items-center cursor-pointer transition-colors"
            aria-label="Close notice details"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          <div>
            <h2
              id="notice-details-title"
              className="text-lg sm:text-xl font-bold text-zinc-900 leading-snug tracking-tight"
            >
              {notice.title}
            </h2>
            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-2 flex-wrap">
              <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
                <Icon name="document" size={13} />
                <span>{notice.publisher}</span>
              </span>
              <span>·</span>
              <span className="text-zinc-500">{notice.authorRole}</span>
              <span>·</span>
              <span className="text-purple-700 font-medium">{notice.displayDate}</span>
            </div>
          </div>

          {/* Full Content */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/90 border border-zinc-150 text-xs sm:text-[13px] text-zinc-800 leading-relaxed whitespace-pre-wrap">
            {notice.fullContent}
          </div>

          {/* Attachments (if available) */}
          {notice.attachments && notice.attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="document" size={13} />
                <span>Notice Attachments ({notice.attachments.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {notice.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white border border-zinc-200 hover:border-purple-300 transition-all flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 grid place-items-center shrink-0 font-bold text-[10px]">
                        {att.type}
                      </div>
                      <div className="min-w-0">
                        <strong className="block text-xs text-zinc-900 truncate">
                          {att.name}
                        </strong>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {att.size}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(att.name)}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-9 rounded-xl border border-zinc-250 text-zinc-700 font-bold hover:bg-zinc-100 text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleCopyNotice}
              className="px-3 h-9 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 text-xs font-medium transition-colors cursor-pointer"
            >
              Copy Text
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onToggleRead(notice.id, false)
                onClose()
              }}
              className="px-3.5 h-9 rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-bold transition-colors cursor-pointer"
            >
              Mark as Unread
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-9 rounded-xl btn-primary text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              Done Reading
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   MAIN EVENTS & NOTICES PAGE COMPONENT
-------------------------------------------------------------------------- */
export default function EventsNoticesPage({
  searchQuery = "",
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
  onToast,
  onSwitchToCalendar,
}: {
  searchQuery?: string
  setSearchQuery?: (q: string) => void
  hexColor?: string
  onChangeHexColor?: (color: string) => void
  onOpenAiModal?: () => void
  onToast?: (msg: string) => void
  onSwitchToCalendar?: () => void
}) {
  const [internalSearch, setInternalSearch] = useState("")
  const effectiveSearch = searchQuery !== undefined ? searchQuery : internalSearch
  const setEffectiveSearch = setSearchQuery || setInternalSearch

  // Persistent State
  const [data, setData] = useState<EventsNoticesState>(() => getEventsNoticesData())

  useEffect(() => {
    const handleUpdate = () => {
      setData(getEventsNoticesData())
    }
    window.addEventListener("quantum-events-notices-changed", handleUpdate)
    return () => window.removeEventListener("quantum-events-notices-changed", handleUpdate)
  }, [])

  // Primary Tab Switcher: "events" | "notices"
  const [activeMainTab, setActiveMainTab] = useState<"events" | "notices">("events")

  // Events Filters
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>("All")
  const [eventDateFilter, setEventDateFilter] = useState<string>("All")

  // Notices Filters
  const [noticeCategoryFilter, setNoticeCategoryFilter] = useState<string>("All")
  const [noticePriorityFilter, setNoticePriorityFilter] = useState<string>("All")
  const [noticeReadFilter, setNoticeReadFilter] = useState<"All" | "Unread" | "Read">("All")

  // Modal States
  const [selectedEvent, setSelectedEvent] = useState<TeacherEventItem | null>(null)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)

  const [selectedNotice, setSelectedNotice] = useState<TeacherNoticeItem | null>(null)
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false)

  // Handlers
  const handleOpenEvent = (ev: TeacherEventItem) => {
    setSelectedEvent(ev)
    setIsEventModalOpen(true)
  }

  const handleOpenNotice = (n: TeacherNoticeItem) => {
    setSelectedNotice(n)
    setIsNoticeModalOpen(true)
    // Automatically mark notice as read upon opening
    if (!n.isRead) {
      markNoticeAsRead(n.id, true)
    }
  }

  const handleToggleEventRsvp = (eventId: string) => {
    const res = toggleEventRegistration(eventId)
    if (onToast) {
      onToast(
        res.registered
          ? `RSVP confirmed for "${res.title}". Added to personal schedule.`
          : `RSVP cancelled for "${res.title}".`
      )
    }
    // Update local modal view if open
    setSelectedEvent((prev) => (prev && prev.id === eventId ? { ...prev, registered: res.registered } : prev))
  }

  const handleToggleNoticeRead = (noticeId: string, nextRead: boolean) => {
    markNoticeAsRead(noticeId, nextRead)
    if (onToast) {
      onToast(nextRead ? "Notice marked as read." : "Notice marked as unread.")
    }
    setSelectedNotice((prev) => (prev && prev.id === noticeId ? { ...prev, isRead: nextRead } : prev))
  }

  const handleMarkAllRead = () => {
    const count = markAllNoticesAsRead()
    if (onToast) {
      onToast(count > 0 ? `Marked ${count} notices as read.` : "All notices are already read.")
    }
  }

  // Summary Metrics Computation
  const upcomingEventsCount = data.events.filter((e) => e.isUpcoming !== false).length
  const todayEventsCount = data.events.filter((e) => e.isToday).length
  const unreadNoticesCount = data.notices.filter((n) => !n.isRead).length
  const importantNoticesCount = data.notices.filter(
    (n) => n.priority === "Urgent" || n.priority === "Important"
  ).length

  const summaryMetrics: MetricItem[] = useMemo(() => {
    return [
      {
        label: "Upcoming Events",
        value: String(upcomingEventsCount),
        trend: "Scheduled next 30 days · 2 this week",
        tone: "lavender",
        icon: "calendar",
      },
      {
        label: "Today's Events",
        value: String(todayEventsCount),
        trend: "Active schedule · 1 live session",
        tone: "lime",
        icon: "clock",
      },
      {
        label: "Unread Notices",
        value: String(unreadNoticesCount),
        trend: unreadNoticesCount > 0 ? "Action required from faculty" : "All notices up to date",
        tone: "yellow",
        icon: "bell",
      },
      {
        label: "Important Notices",
        value: String(importantNoticesCount),
        trend: "Urgent & High-priority dispatches",
        tone: "pink",
        icon: "sparkles",
      },
    ]
  }, [upcomingEventsCount, todayEventsCount, unreadNoticesCount, importantNoticesCount])

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return data.events.filter((ev) => {
      if (eventCategoryFilter !== "All" && ev.category !== eventCategoryFilter) return false
      if (eventDateFilter === "Today" && !ev.isToday) return false
      if (eventDateFilter === "Upcoming" && !ev.isUpcoming) return false
      if (effectiveSearch.trim()) {
        const q = effectiveSearch.toLowerCase()
        const matchTitle = ev.title.toLowerCase().includes(q)
        const matchDesc = ev.description.toLowerCase().includes(q)
        const matchOrg = ev.organizer.toLowerCase().includes(q)
        const matchLoc = ev.location.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchOrg && !matchLoc) return false
      }
      return true
    })
  }, [data.events, eventCategoryFilter, eventDateFilter, effectiveSearch])

  // Filtered Notices
  const filteredNotices = useMemo(() => {
    return data.notices.filter((n) => {
      if (noticeCategoryFilter !== "All" && n.category !== noticeCategoryFilter) return false
      if (noticePriorityFilter !== "All" && n.priority !== noticePriorityFilter) return false
      if (noticeReadFilter === "Unread" && n.isRead) return false
      if (noticeReadFilter === "Read" && !n.isRead) return false
      if (effectiveSearch.trim()) {
        const q = effectiveSearch.toLowerCase()
        const matchTitle = n.title.toLowerCase().includes(q)
        const matchDesc = n.description.toLowerCase().includes(q)
        const matchPub = n.publisher.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchPub) return false
      }
      return true
    })
  }, [data.notices, noticeCategoryFilter, noticePriorityFilter, noticeReadFilter, effectiveSearch])

  const eventCategories = [
    "All",
    "Hackathons",
    "Guest Lectures",
    "Workshops",
    "Faculty Meetings",
    "Academic",
    "Research Colloquium",
  ]

  const noticeCategories = [
    "All",
    "Academic",
    "Faculty & Administration",
    "Examination & Grading",
    "Curriculum & AI Lab",
    "Campus Facilities",
  ]

  return (
    <>
      <EventsNoticesHeader
        searchQuery={effectiveSearch}
        setSearchQuery={setEffectiveSearch}
        onOpenAiModal={onOpenAiModal}
        hexColor={hexColor || "#9860e9"}
        onChangeHexColor={onChangeHexColor || (() => {})}
        totalEvents={data.events.length}
        totalNotices={data.notices.length}
        onSwitchToCalendar={onSwitchToCalendar}
      />

      {/* Top View Mode Navigation Pill Switcher */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-150 flex-wrap gap-2">
        <div className="inline-flex items-center p-1 bg-gray-100/90 rounded-full border border-gray-200 shadow-2xs">
          {onSwitchToCalendar && (
            <button
              type="button"
              onClick={onSwitchToCalendar}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icon name="calendar" size={13} />
              <span>Academic Schedule</span>
            </button>
          )}
          <div className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-purple-900 shadow-xs flex items-center gap-1.5">
            <Icon name="bell" size={13} />
            <span>Events &amp; Notices</span>
          </div>
        </div>

        <div className="text-xs text-zinc-500 flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Campus Bulletin &amp; Faculty Dispatches</span>
        </div>
      </div>

      {/* 4 Summary Dashboard Metric Cards */}
      <div className="metrics-grid">
        {summaryMetrics.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* Main Panel with Two Tabs: Events & Notices */}
      <div className="panel p-5 assigned-courses-panel flex flex-col" aria-label="Events and Notices Workspace">
        {/* Top Switcher Tabs & Global Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-150 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveMainTab("events")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMainTab === "events"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Icon name="calendar" size={14} />
              <span>Events ({data.events.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab("notices")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMainTab === "notices"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Icon name="bell" size={14} />
              <span>Notices ({data.notices.length})</span>
              {unreadNoticesCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-0.5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeMainTab === "notices" && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-3 h-8.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>✓</span>
                <span>Mark All as Read</span>
              </button>
            )}
            <div className="text-xs text-zinc-400 font-medium hidden md:block">
              Quantum School of AI · Faculty Board
            </div>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: EVENTS VIEW
           ========================================================================= */}
        {activeMainTab === "events" && (
          <div className="flex flex-col flex-1 min-h-0 space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
              <div className="filter-pills flex-wrap">
                {eventCategories.map((cat) => (
                  <button
                    key={cat}
                    className={`filter-pill ${eventCategoryFilter === cat ? "active" : ""}`}
                    onClick={() => setEventCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Date Filter Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-zinc-500 font-medium">Date:</span>
                <select
                  value={eventDateFilter}
                  onChange={(e) => setEventDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-zinc-800 outline-none cursor-pointer hover:border-purple-300"
                  aria-label="Filter events by date"
                >
                  <option value="All">All Dates</option>
                  <option value="Today">Today Only</option>
                  <option value="Upcoming">Upcoming Only</option>
                </select>
                {(eventCategoryFilter !== "All" || eventDateFilter !== "All" || effectiveSearch) && (
                  <button
                    onClick={() => {
                      setEventCategoryFilter("All")
                      setEventDateFilter("All")
                      setEffectiveSearch("")
                    }}
                    className="text-xs text-purple-700 hover:text-purple-900 font-bold ml-1 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Events Cards Grid */}
            <div className="assigned-courses-scroll flex-1 overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <div className="roster-empty-state">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 grid place-items-center mb-1">
                    <Icon name="calendar" size={20} />
                  </div>
                  <strong className="text-sm text-zinc-800">No events found</strong>
                  <p className="text-xs text-zinc-500 max-w-sm">
                    No academic events match your selected category or search criteria.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                  {filteredEvents.map((ev) => {
                    const hasMeeting = Boolean(ev.meetingUrl)
                    const hasAtt = Boolean(ev.attachments && ev.attachments.length > 0)

                    return (
                      <div
                        key={ev.id}
                        onClick={() => handleOpenEvent(ev)}
                        className="p-4 sm:p-5 rounded-2xl bg-white hover:bg-purple-50/20 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between gap-3 cursor-pointer group"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") handleOpenEvent(ev)
                        }}
                        aria-label={`Event: ${ev.title}`}
                      >
                        <div>
                          {/* Card Top: Date Tile + Badges */}
                          <div className="flex items-start justify-between gap-3 mb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 grid place-items-center shrink-0 text-center py-1 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <span className="block text-[9.5px] font-bold uppercase tracking-wider text-purple-700 group-hover:text-purple-100">
                                  {ev.month}
                                </span>
                                <span className="block text-base font-black text-purple-950 group-hover:text-white leading-none">
                                  {ev.day}
                                </span>
                              </div>
                              <div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wide">
                                  {ev.category}
                                </span>
                                <div className="text-[11px] font-semibold text-zinc-500 mt-1 flex items-center gap-1 font-mono">
                                  <Icon name="clock" size={11} />
                                  <span>{ev.time}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {ev.isToday && (
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-lime-100 text-lime-800 border border-lime-200">
                                  TODAY
                                </span>
                              )}
                              {ev.registered && (
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  ✓ RSVP
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Title & Short Description */}
                          <h3 className="font-bold text-sm sm:text-base text-zinc-900 group-hover:text-purple-700 transition-colors line-clamp-2 leading-snug">
                            {ev.title}
                          </h3>
                          <p className="text-xs text-zinc-600 mt-1.5 line-clamp-2 leading-relaxed">
                            {ev.description}
                          </p>

                          {/* Location & Speaker Meta */}
                          <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-1 text-[11px] text-zinc-500">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-purple-600">📍</span>
                              <span className="truncate">{ev.location}</span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-zinc-400">👤</span>
                              <span className="truncate">{ev.organizer}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer Actions & Indicators */}
                        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[10.5px]">
                            {hasMeeting && (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <span>🎥</span>
                                <span>Meeting Link</span>
                              </span>
                            )}
                            {hasAtt && (
                              <span className="text-zinc-500 flex items-center gap-1">
                                <span>📎</span>
                                <span>{ev.attachments!.length} Assets</span>
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            className="view-details-btn cursor-pointer shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenEvent(ev)
                            }}
                          >
                            <span>View Details →</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: NOTICES VIEW
           ========================================================================= */}
        {activeMainTab === "notices" && (
          <div className="flex flex-col flex-1 min-h-0 space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
              <div className="filter-pills flex-wrap">
                {noticeCategories.map((cat) => (
                  <button
                    key={cat}
                    className={`filter-pill ${noticeCategoryFilter === cat ? "active" : ""}`}
                    onClick={() => setNoticeCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Priority & Read Filter Controls */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <span className="text-xs text-zinc-500 font-medium">Priority:</span>
                <select
                  value={noticePriorityFilter}
                  onChange={(e) => setNoticePriorityFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-zinc-800 outline-none cursor-pointer hover:border-purple-300"
                  aria-label="Filter notices by priority"
                >
                  <option value="All">All Priorities</option>
                  <option value="Urgent">Urgent Only</option>
                  <option value="Important">Important Only</option>
                  <option value="Normal">Normal Only</option>
                </select>

                <span className="text-xs text-zinc-500 font-medium ml-1">Status:</span>
                <select
                  value={noticeReadFilter}
                  onChange={(e) => setNoticeReadFilter(e.target.value as "All" | "Unread" | "Read")}
                  className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-zinc-800 outline-none cursor-pointer hover:border-purple-300"
                  aria-label="Filter notices by read status"
                >
                  <option value="All">All</option>
                  <option value="Unread">Unread Only</option>
                  <option value="Read">Read Only</option>
                </select>

                {(noticeCategoryFilter !== "All" ||
                  noticePriorityFilter !== "All" ||
                  noticeReadFilter !== "All" ||
                  effectiveSearch) && (
                  <button
                    onClick={() => {
                      setNoticeCategoryFilter("All")
                      setNoticePriorityFilter("All")
                      setNoticeReadFilter("All")
                      setEffectiveSearch("")
                    }}
                    className="text-xs text-purple-700 hover:text-purple-900 font-bold ml-1 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Notices List */}
            <div className="assigned-courses-scroll flex-1 overflow-y-auto pr-1">
              {filteredNotices.length === 0 ? (
                <div className="roster-empty-state">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 grid place-items-center mb-1">
                    <Icon name="bell" size={20} />
                  </div>
                  <strong className="text-sm text-zinc-800">No notices found</strong>
                  <p className="text-xs text-zinc-500 max-w-sm">
                    No school notices match your filter or search criteria.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pb-2">
                  {filteredNotices.map((n) => {
                    const getPriorityPill = (p: TeacherNoticeItem["priority"]) => {
                      switch (p) {
                        case "Urgent":
                          return "bg-rose-100 text-rose-800 border-rose-200"
                        case "Important":
                          return "bg-amber-100 text-amber-800 border-amber-200"
                        case "Normal":
                        default:
                          return "bg-zinc-100 text-zinc-700 border-zinc-200"
                      }
                    }

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleOpenNotice(n)}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group ${
                          !n.isRead
                            ? "bg-purple-50/30 border-purple-300 shadow-2xs hover:bg-purple-50/50 hover:shadow-xs"
                            : "bg-white border-gray-200 hover:bg-gray-50/80 hover:border-gray-300"
                        }`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") handleOpenNotice(n)
                        }}
                        aria-label={`Notice: ${n.title}`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Unread indicator circle or read icon */}
                          <div className="pt-0.5 shrink-0">
                            {!n.isRead ? (
                              <span
                                className="w-3 h-3 rounded-full bg-purple-600 ring-4 ring-purple-100 block mt-1"
                                title="Unread Notice"
                              />
                            ) : (
                              <span
                                className="w-3 h-3 rounded-full bg-zinc-200 block mt-1"
                                title="Read Notice"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className={`px-2 py-0.2 rounded-full text-[9.5px] font-bold border uppercase tracking-wide ${getPriorityPill(
                                  n.priority
                                )}`}
                              >
                                {n.priority}
                              </span>
                              <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-gray-100 text-zinc-700">
                                {n.category}
                              </span>
                              {n.isPinned && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                                  📌 Pinned
                                </span>
                              )}
                              <span className="text-[11px] text-purple-700 font-medium">
                                · {n.displayDate}
                              </span>
                            </div>

                            <h3
                              className={`text-sm sm:text-base leading-snug group-hover:text-purple-700 transition-colors ${
                                !n.isRead ? "font-extrabold text-zinc-950" : "font-bold text-zinc-800"
                              }`}
                            >
                              {n.title}
                            </h3>

                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                              {n.description}
                            </p>

                            <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-400">
                              <span>Published by: <strong>{n.publisher}</strong></span>
                              {n.attachments && n.attachments.length > 0 && (
                                <span className="text-purple-700 font-semibold flex items-center gap-1">
                                  <span>📎</span>
                                  <span>{n.attachments.length} Document(s)</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Column */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                          <button
                            type="button"
                            className="view-details-btn cursor-pointer shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenNotice(n)
                            }}
                          >
                            <span>Read Notice →</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Popups & Modals */}
      <EventDetailsModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        event={selectedEvent}
        onToggleRsvp={handleToggleEventRsvp}
        onToast={onToast}
      />

      <NoticeDetailsModal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        notice={selectedNotice}
        onToggleRead={handleToggleNoticeRead}
        onToast={onToast}
      />
    </>
  )
}
