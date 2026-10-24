import { useState, useMemo } from "react"
import { Icon } from "../../components/Icon"
import type { AnnouncementItem } from "./studentTypes"
import { schoolAnnouncements } from "./studentMockData"

interface AnnouncementsPageProps {
  onToast: (msg: string) => void
}

export function AnnouncementsPage({ onToast }: AnnouncementsPageProps) {
  const [announcements, setAnnouncements] =
    useState<AnnouncementItem[]>(schoolAnnouncements)
  const [filter, setFilter] =
    useState<"All" | "Urgent" | "Academic" | "Infrastructure" | "General">(
      "All",
    )
  const [search, setSearch] = useState("")
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    "ann-1": true,
    "ann-2": true,
  })

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const markAllRead = () => {
    setAnnouncements((prev) => prev.map((a) => ({ ...a, isRead: true })))
    onToast("All announcements marked as read!")
  }

  const filtered = useMemo(() => {
    let list = announcements
    if (filter !== "All") {
      list = announcements.filter((a) => a.category === filter)
    }
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q),
    )
  }, [announcements, filter, search])

  return (
    <div className="flex flex-col gap-5">
      {/* Header Panel */}
      <section className="panel" aria-label="Announcements Header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title">School Announcements & Bulletins</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                Official Campus Feed
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Verified dispatches from faculty chairs, Dean of Academic Affairs,
              and system admins.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="px-3.5 py-1.5 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Mark All as Read
            </button>
          </div>
        </div>

        {/* Filters and Search Row */}
        <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="filter-pills">
            {([
              "All",
              "Urgent",
              "Academic",
              "Infrastructure",
              "General",
            ] as const).map((tab) => {
              const count =
                tab === "All"
                  ? announcements.length
                  : announcements.filter((a) => a.category === tab).length
              return (
                <button
                  key={tab}
                  className={`filter-pill ${filter === tab ? "active" : ""}`}
                  onClick={() => setFilter(tab)}
                >
                  {tab} ({count})
                </button>
              )
            })}
          </div>

          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <Icon name="search" size={13} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search announcements..."
              className="w-full pl-8 pr-7 py-1 rounded-full text-xs bg-zinc-50 border border-zinc-200 focus:outline-none focus:border-purple-500 focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-xs text-zinc-400 hover:text-zinc-700"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Announcements Feed */}
      <div className="flex flex-col gap-3">
        {filtered.map((item) => {
          const isExpanded = expandedIds[item.id] ?? false
          return (
            <div
              key={item.id}
              className={`panel p-5 transition-all border ${
                !item.isRead
                  ? "border-purple-200 bg-white shadow-sm"
                  : "border-zinc-100 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.category === "Urgent"
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : item.category === "Academic"
                          ? "bg-purple-100 text-purple-800"
                          : item.category === "Infrastructure"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {item.category === "Urgent"
                      ? "🚨 Urgent Notice"
                      : item.category}
                  </span>

                  {!item.isRead && (
                    <span
                      className="w-2 h-2 rounded-full bg-purple-600"
                      title="Unread"
                    />
                  )}

                  <span className="text-xs font-bold text-zinc-900">
                    {item.department}
                  </span>
                  <span className="text-xs text-zinc-400">
                    • By {item.author}
                  </span>
                </div>

                <span className="text-[11px] text-zinc-400 whitespace-nowrap">
                  {item.timestamp}
                </span>
              </div>

              <h4 className="font-bold text-base text-zinc-900 mb-2 leading-snug">
                {item.title}
              </h4>

              <p
                className={`text-xs text-zinc-600 leading-relaxed ${
                  !isExpanded ? "line-clamp-2" : ""
                }`}
              >
                {item.content}
              </p>

              {/* Attachment Download Box if any */}
              {item.attachmentName && (
                <div className="mt-3 p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-700">📄</span>
                    <div>
                      <strong className="text-purple-900 block">
                        {item.attachmentName}
                      </strong>
                      <span className="text-[10px] text-zinc-500">
                        {item.attachmentSize} · Official Document
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onToast(`Downloading "${item.attachmentName}"...`)
                    }
                    className="px-3 py-1 rounded-full bg-purple-700 text-white font-bold text-xs hover:bg-purple-800 transition-colors cursor-pointer"
                  >
                    Download
                  </button>
                </div>
              )}

              {/* Footer action toggle */}
              <div className="flex justify-end pt-3 mt-3 border-t border-zinc-100">
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>
                    {isExpanded ? "Show Less" : "Read Full Announcement"}
                  </span>
                  <span>{isExpanded ? "▲" : "▼"}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
