import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  X,
  ArrowUpRight,
  Trophy,
  Briefcase,
  Quote,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"
import { Button } from "@/components/ui"
import type { StudentNavPage } from "@/pages/student/studentTypes"
import { useAlumniNetwork, type PlacementStory } from "@/data/alumniStore"

export type { PlacementStory }

export interface PlacementStoriesAdminControls {
  onPost?: () => void
  onEdit: (story: PlacementStory) => void
  onDelete: (story: PlacementStory) => void
}

interface PlacementStoriesProps {
  onNavigate?: (page: StudentNavPage, courseId?: string) => void
  className?: string
  adminControls?: PlacementStoriesAdminControls
}

export default function PlacementStories({ onNavigate, className, adminControls }: PlacementStoriesProps) {
  const { stories } = useAlumniNetwork(adminControls ? "admin" : "student")
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null)
  const [isStoryModalPaused, setIsStoryModalPaused] = useState(false)

  // Update button disabled states based on scroll position
  const updateScrollButtons = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 6)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    updateScrollButtons()
    el.addEventListener("scroll", updateScrollButtons, { passive: true })
    window.addEventListener("resize", updateScrollButtons)
    return () => {
      el.removeEventListener("scroll", updateScrollButtons)
      window.removeEventListener("resize", updateScrollButtons)
    }
  }, [updateScrollButtons, stories.length])

  // Scroll step (one card width + gap)
  const handleScroll = (direction: "left" | "right") => {
    const el = scrollerRef.current
    if (!el) return
    const cardStep = 260 // card width (244) + gap (16)
    const delta = direction === "left" ? -cardStep * 2 : cardStep * 2
    el.scrollBy({ left: delta, behavior: "smooth" })
  }

  // Auto-scroll pace (every 5 seconds when not hovering)
  useEffect(() => {
    if (isPaused || activeStoryIndex !== null || stories.length === 0) return
    const interval = setInterval(() => {
      const el = scrollerRef.current
      if (!el) return
      const maxScroll = el.scrollWidth - el.clientWidth
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: "smooth" })
      } else {
        el.scrollBy({ left: 260, behavior: "smooth" })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isPaused, activeStoryIndex, stories.length])

  // Modal story autoplay pace (6 seconds per story, driven by a single timeout + CSS animation)
  useEffect(() => {
    if (activeStoryIndex === null || isStoryModalPaused || stories.length === 0) return

    const timer = setTimeout(() => {
      setActiveStoryIndex((curr) => {
        if (curr === null || stories.length === 0) return null
        return curr < stories.length - 1 ? curr + 1 : 0
      })
    }, 6000)

    return () => clearTimeout(timer)
  }, [activeStoryIndex, isStoryModalPaused, stories.length])

  // Clamp or close modal if stories list shrinks while open
  useEffect(() => {
    if (activeStoryIndex !== null && activeStoryIndex >= stories.length) {
      setActiveStoryIndex(stories.length > 0 ? stories.length - 1 : null)
    }
  }, [activeStoryIndex, stories.length])

  // Prevent background scroll when story modal is open
  useEffect(() => {
    if (activeStoryIndex !== null) {
      const original = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = original
      }
    }
  }, [activeStoryIndex])

  const openStory = (idx: number) => {
    setActiveStoryIndex(idx)
    setIsStoryModalPaused(false)
  }

  const closeStory = () => {
    setActiveStoryIndex(null)
  }

  // Keyboard navigation for modal
  useEffect(() => {
    if (activeStoryIndex === null || stories.length === 0) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeStory()
      if (e.key === "ArrowLeft") {
        setActiveStoryIndex((curr) => (curr !== null && curr > 0 ? curr - 1 : stories.length - 1))
      }
      if (e.key === "ArrowRight") {
        setActiveStoryIndex((curr) => (curr !== null && curr < stories.length - 1 ? curr + 1 : 0))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeStoryIndex, stories.length])

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] ?? null : null

  if (stories.length === 0 && !adminControls) return null

  return (
    <section
      aria-label="Placement stories"
      className={cn("w-full py-1", className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Editorial Section Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="select-none text-base font-bold tracking-tight text-foreground">
            Placement stories
          </h2>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("Alumni")}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-text transition-colors hover:bg-primary/15"
            >
              <span>View all alumni</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          {adminControls?.onPost && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={adminControls.onPost}
              className="h-7 rounded-full px-2.5 text-xs"
            >
              Post story
            </Button>
          )}
        </div>

        {/* Sleek Prev / Next Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Previous"
            className={cn(
              "grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-border bg-surface text-foreground shadow-2xs transition-all hover:border-border-strong hover:bg-surface-2 active:scale-95",
              !canScrollLeft && "cursor-default opacity-35 hover:border-border hover:bg-surface active:scale-100"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="Next"
            className={cn(
              "grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-border bg-surface text-foreground shadow-2xs transition-all hover:border-border-strong hover:bg-surface-2 active:scale-95",
              !canScrollRight && "cursor-default opacity-35 hover:border-border hover:bg-surface active:scale-100"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Editorial Story Reel */}
      {stories.length === 0 ? (
        <div className="flex h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface text-center">
          <p className="text-sm font-medium text-foreground">No placement stories published yet</p>
          {adminControls?.onPost && (
            <Button type="button" variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={adminControls.onPost}>
              Post Placement Story
            </Button>
          )}
        </div>
      ) : (
      <div
        ref={scrollerRef}
        className="scrollbar-none flex gap-4 overflow-x-auto scroll-smooth px-0.5 py-1.5 [scroll-snap-type:x_mandatory] [-ms-overflow-style:none]"
        style={{ scrollbarWidth: "none" }}
      >
        {stories.map((story, idx) => {
          const initials = story.fullName
            .trim()
            .split(/\s+/)
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()

          return (
            <div key={story.id} className="group/story relative flex-none [scroll-snap-align:start]">
            <button
              type="button"
              onClick={() => openStory(idx)}
              aria-label={`${story.fullName} at ${story.company}`}
              className="group relative flex h-[324px] w-[248px] flex-none cursor-pointer flex-col justify-between overflow-hidden rounded-[20px] border border-white/[0.12] p-5 text-left select-none shadow-[0_12px_28px_-10px_rgba(3,10,28,0.45)] transition-all duration-300 hover:-translate-y-1.5 hover:border-white/25 hover:shadow-[0_22px_40px_-14px_rgba(3,10,28,0.65)] focus-visible:outline-3 focus-visible:outline-[#6aa7ff] active:scale-[0.985]"
              style={{
                background: `radial-gradient(120% 80% at 92% 4%, ${story.glow} 0%, transparent 62%), linear-gradient(175deg, #0F182D 0%, #070C18 100%)`,
              }}
            >
              {/* Subtle top edge specular shine & ambient editorial watermark */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
              <Quote
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 top-11 h-24 w-24 rotate-180 text-white/[0.035] transition-transform duration-500 group-hover:scale-105"
              />

              {/* Top Meta: Crisp Non-Wrapping Company & Package Pills */}
              <div className="relative z-10 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white/95 backdrop-blur-md">
                    <Briefcase className="h-3 w-3 shrink-0 text-white/70" />
                    <span className="truncate">{story.company}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-amber-300/25 bg-amber-400/15 px-2.5 py-1 text-[11px] font-bold tracking-tight text-amber-200 backdrop-blur-xs">
                    <Trophy className="h-3 w-3 shrink-0 text-amber-300" />
                    {story.package}
                  </span>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  <p className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", story.kickerClass)}>
                    {story.highlight}
                  </p>
                  <h3 className="line-clamp-3 text-[15.5px] font-bold leading-[1.32] tracking-[-0.01em] text-white">
                    {story.head}
                  </h3>
                </div>
              </div>

              {/* Editorial Quote Excerpt */}
              <div className="relative z-10 my-auto py-1">
                <p className="line-clamp-3 border-l-2 border-white/20 pl-2.5 text-[12px] leading-relaxed text-slate-300/90">
                  “{story.quote}”
                </p>
              </div>

              {/* Bottom Footer: Gradient Monogram Avatar + Name/Role + Glass Play Pill */}
              <div className="relative z-10 flex items-center justify-between gap-2 border-t border-white/[0.1] pt-3.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ring-1 ring-white/25 shadow-sm",
                      story.avatarBg
                    )}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold leading-tight text-white">
                      {story.fullName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-400">
                      {story.role}
                    </p>
                  </div>
                </div>

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/95 text-[#081022] shadow-sm transition-all duration-200 group-hover:scale-110 group-hover:bg-white group-hover:shadow-[0_0_16px_rgba(255,255,255,0.35)]">
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                </div>
              </div>
            </button>
            {adminControls && (
              <div className="absolute right-3 bottom-[74px] z-20 flex items-center gap-1 rounded-full border border-white/20 bg-black/70 p-1 backdrop-blur-md">
                <button
                  type="button"
                  aria-label={`Edit ${story.fullName}`}
                  onClick={() => adminControls.onEdit(story)}
                  className="grid h-6 w-6 place-items-center rounded-full text-white/90 transition hover:bg-white/20 hover:text-white"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${story.fullName}`}
                  onClick={() => adminControls.onDelete(story)}
                  className="grid h-6 w-6 place-items-center rounded-full text-rose-300 transition hover:bg-rose-500/30 hover:text-rose-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
            </div>
          )
        })}
      </div>
      )}

      {/* Story Modal Player (Instagram/Reels Style Portal) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {activeStory && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`${activeStory.fullName} placement story`}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5"
                onClick={closeStory}
              >
                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: 15 }}
                  transition={spring.snappy}
                  className="relative flex h-[600px] max-h-[90vh] w-full max-w-[360px] select-none flex-col overflow-hidden rounded-[22px] border border-white/20 text-white shadow-2xl sm:h-[640px] sm:max-w-[380px]"
                  style={{
                    backgroundColor: "#070C18",
                    background: `radial-gradient(125% 70% at 50% 0%, ${activeStory.glow}, transparent 68%), linear-gradient(180deg, #0E172B 0%, #050912 100%)`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={() => setIsStoryModalPaused(true)}
                  onMouseLeave={() => setIsStoryModalPaused(false)}
                >
                  {/* Top Progress Segment Bar */}
                  <div className="absolute top-2.5 inset-x-3 z-30 flex gap-1.5">
                    {stories.map((s, idx) => (
                      <div
                        key={s.id}
                        className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden"
                      >
                        <div
                          key={idx === activeStoryIndex ? `active-${activeStoryIndex}` : `seg-${idx}`}
                          className="h-full bg-white rounded-full origin-left"
                          style={
                            idx === activeStoryIndex
                              ? {
                                  width: "100%",
                                  animation: "storyBarFill 6000ms linear forwards",
                                  animationPlayState: isStoryModalPaused ? "paused" : "running",
                                }
                              : {
                                  width: idx < (activeStoryIndex ?? 0) ? "100%" : "0%",
                                }
                          }
                        />
                      </div>
                    ))}
                  </div>

                  {/* Story Modal Header */}
                  <div className="relative z-30 flex items-center justify-between p-4 pt-6">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-10 w-10 rounded-full border-2 border-white/60 shrink-0 shadow-sm bg-white/25 backdrop-blur-md flex items-center justify-center text-xs font-bold text-white">
                        {activeStory.fullName
                          .trim()
                          .split(/\s+/)
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate leading-tight text-white drop-shadow-xs">
                          {activeStory.fullName}
                        </p>
                        <p className="text-xs text-white/80 truncate">
                          {activeStory.role} • @{activeStory.company}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsStoryModalPaused((p) => !p)}
                        className="h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white/90 grid place-items-center transition-colors cursor-pointer"
                        title={isStoryModalPaused ? "Resume" : "Pause"}
                      >
                        {isStoryModalPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
                      </button>
                      <button
                        type="button"
                        onClick={closeStory}
                        className="h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white grid place-items-center transition-colors cursor-pointer"
                        title="Close (Esc)"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tap Left / Right Hotspots for Quick Navigation */}
                  <button
                    type="button"
                    aria-label="Previous story"
                    onClick={() => {
                      setActiveStoryIndex((c) => (c !== null && c > 0 ? c - 1 : stories.length - 1))
                    }}
                    className="absolute inset-y-16 left-0 w-1/4 z-20 cursor-pointer opacity-0"
                  />
                  <button
                    type="button"
                    aria-label="Next story"
                    onClick={() => {
                      setActiveStoryIndex((c) => (c !== null && c < stories.length - 1 ? c + 1 : 0))
                    }}
                    className="absolute inset-y-16 right-0 w-1/4 z-20 cursor-pointer opacity-0"
                  />

                  {/* Story Content Area */}
                  <div className="relative z-10 flex-1 flex flex-col justify-between p-5 pt-2">
                    {/* Headline & Badges */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-xs px-2.5 py-1 text-xs font-bold text-white border border-white/25">
                          <Trophy className="h-3.5 w-3.5 text-amber-300" />
                          {activeStory.package}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/30 backdrop-blur-xs px-2.5 py-1 text-xs font-semibold text-white/90 border border-white/10">
                          <Briefcase className="h-3 w-3" />
                          {activeStory.company}
                        </span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-white drop-shadow-md">
                        "{activeStory.head}"
                      </h3>
                    </div>

                    {/* Quote Card */}
                    <div className="rounded-xl border border-white/20 bg-black/35 backdrop-blur-md p-4 space-y-2.5 shadow-lg">
                      <div className="flex items-center gap-1.5 text-white/70 text-xs font-semibold uppercase tracking-wider">
                        <Quote className="h-3.5 w-3.5 text-sky-300 rotate-180" />
                        Student journey
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed text-white/95 italic">
                        "{activeStory.quote}"
                      </p>
                      <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-300 flex items-center gap-1">
                          ★ {activeStory.highlight}
                        </span>
                        <span className="font-semibold text-white/80">
                          @{activeStory.company}
                        </span>
                      </div>
                    </div>

                    {/* Action CTA */}
                    <div className="pt-2">
                      {adminControls ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="primary"
                            className="flex-1 bg-white font-bold text-slate-900 shadow-lg hover:bg-white/90"
                            leftIcon={<Pencil className="h-3.5 w-3.5" />}
                            onClick={() => {
                              const target = activeStory
                              closeStory()
                              adminControls.onEdit(target)
                            }}
                          >
                            Edit Story
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            className="font-bold shadow-lg"
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                            onClick={() => {
                              const target = activeStory
                              closeStory()
                              adminControls.onDelete(target)
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          className="w-full font-bold shadow-lg bg-white text-slate-900 hover:bg-white/90 active:scale-98"
                          onClick={() => {
                            closeStory()
                            onNavigate?.("Career Hub")
                          }}
                        >
                          Explore career opportunities
                          <ArrowUpRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </section>
  )
}
