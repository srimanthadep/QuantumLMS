import { useState } from "react"
import { Icon } from "../../components/Icon"
import type { EventItem } from "./studentTypes"
import { campusEvents } from "./studentMockData"

interface EventsPageProps {
  onToast: (msg: string) => void
}

export function EventsPage({ onToast }: EventsPageProps) {
  const [filter, setFilter] =
    useState<"All" | "Hackathons" | "Guest Lectures" | "Workshops" | "Academic">(
      "All",
    )
  const [eventsList, setEventsList] = useState<EventItem[]>(campusEvents)

  const handleToggleRsvp = (id: string, title: string) => {
    setEventsList((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const next = !e.registered
          onToast(
            next
              ? `Registered for "${title}"! Calendar invite sent.`
              : `RSVP cancelled for "${title}".`,
          )
          return { ...e, registered: next }
        }
        return e
      }),
    )
  }

  const filtered =
    filter === "All"
      ? eventsList
      : eventsList.filter((e) => e.category === filter)

  const featuredEvent = eventsList.find((e) => e.isFeatured)

  return (
    <div className="flex flex-col gap-5">
      {/* Header Panel */}
      <section className="panel" aria-label="Events Header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title">
                Events, Hackathons & Campus Notices
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                Fall 2026 Season
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Participate in university AI hackathons, research colloquiums, and
              technical guest workshops.
            </p>
          </div>

          <div className="filter-pills">
            {([
              "All",
              "Hackathons",
              "Guest Lectures",
              "Workshops",
              "Academic",
            ] as const).map((tab) => (
              <button
                key={tab}
                className={`filter-pill ${filter === tab ? "active" : ""}`}
                onClick={() => setFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Hackathon Hero Banner */}
      {featuredEvent && (
        <section className="panel p-6 bg-white border border-zinc-100 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-6 items-start justify-between relative z-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-zinc-950 shadow-xs">
                  ⭐ FEATURED HACKATHON
                </span>
                <span className="text-xs font-semibold text-purple-700">
                  {featuredEvent.date || "Oct 30 - Nov 01, 2026"}
                </span>
              </div>

              <h2 className="text-2xl font-black text-zinc-900 leading-tight mb-2">
                {featuredEvent.title}
              </h2>
              <p className="text-xs text-zinc-600 leading-relaxed mb-4">
                {featuredEvent.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                  <span>🏆 $15,000 Prize Pool</span>
                </span>
                <span className="text-zinc-300 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                  <span>⏱️</span>
                  <span>{featuredEvent.time}</span>
                </span>
                <span className="text-zinc-300 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                  <span>📍</span>
                  <span>{featuredEvent.location}</span>
                </span>
                <span className="text-zinc-300 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                  <span>👨‍⚖️</span>
                  <span>{featuredEvent.speaker}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto self-end lg:self-center">
              <button
                onClick={() =>
                  handleToggleRsvp(featuredEvent.id, featuredEvent.title)
                }
                className={`px-6 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer shadow-md ${
                  featuredEvent.registered
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-purple-700 text-white hover:bg-purple-800"
                }`}
              >
                {featuredEvent.registered
                  ? "✓ You Are Registered"
                  : "Register Team / Join Solo"}
              </button>
              <button
                onClick={() =>
                  onToast(
                    "Added Quantum AI Hackathon to Google Calendar & Apple iCal!",
                  )
                }
                className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Icon name="calendar" size={14} />
                <span>Add to Calendar</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Events List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="panel p-5 flex flex-col justify-between hover:shadow-md transition-shadow border border-zinc-100"
          >
            <div>
              <div className="flex items-start gap-4 mb-3">
                {/* Date Badge */}
                <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 text-purple-800 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {item.month}
                  </span>
                  <span className="text-lg font-black leading-none">
                    {item.day}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                      {item.category}
                    </span>
                    <span className="text-xs font-bold text-purple-700">
                      {item.time}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-zinc-900 leading-snug">
                    {item.title}
                  </h4>
                </div>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed mb-4 line-clamp-2">
                {item.description}
              </p>

              <div className="text-xs text-zinc-400 flex flex-col gap-1 mb-4 bg-zinc-50 p-2.5 rounded-xl">
                <div>
                  📍 <strong className="text-zinc-700">{item.location}</strong>
                </div>
                {item.speaker && (
                  <div>
                    🎙 Speaker:{" "}
                    <strong className="text-zinc-700">{item.speaker}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
              <button
                onClick={() =>
                  onToast(`Added "${item.title}" to calendar reminder.`)
                }
                className="px-3.5 py-1.5 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Icon name="calendar" size={12} />
                <span>Remind Me</span>
              </button>

              <button
                onClick={() => handleToggleRsvp(item.id, item.title)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm ${
                  item.registered
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                    : "bg-purple-700 text-white hover:bg-purple-800"
                }`}
              >
                {item.registered ? "✓ Registered" : "RSVP / Attend"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
