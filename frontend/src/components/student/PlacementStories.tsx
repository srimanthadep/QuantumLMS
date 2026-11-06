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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"
import { Button } from "@/components/ui"
import type { StudentNavPage } from "@/pages/student/studentTypes"

export interface PlacementStory {
  id: string
  firstName: string
  fullName: string
  company: string
  role: string
  package: string
  head: string
  quote: string
  highlight: string
  image: string
  cardImage: string
  bg1?: string
  bg2?: string
}

const PLACEMENT_STORIES: readonly PlacementStory[] = [
  {
    id: "story-rhea",
    firstName: "Rhea",
    fullName: "Rhea Chawla",
    company: "Byborg",
    role: "International Systems Architect",
    package: "₹50 Lakhs+",
    head: "From Delhi to Luxembourg One Code at a Time!",
    quote:
      "Transitioning from university to a high-scale European tech team in Luxembourg felt like a massive leap. QuantumLMS's distributed systems tracks and live system design labs gave me the exact domain knowledge to clear all technical evaluation rounds.",
    highlight: "Luxembourg International Offer",
    image: "/placements/rhea_portrait.png",
    cardImage: "/placements/rhea_card.png",
    bg1: "#1e5be0",
    bg2: "#5aa0ff",
  },
  {
    id: "story-shubhadip",
    firstName: "Shubhadip",
    fullName: "Subhadip Das",
    company: "Mr.Cooper",
    role: "Senior Data & Analytics Engineer",
    package: "₹21 LPA",
    head: "FROM CRICKET TO DATA ANALYTICS",
    quote:
      "I spent my college years focused entirely on competitive cricket before discovering data engineering. Building real-time analytics pipelines during the cohort bridged the entire gap and made my transition into Mr. Cooper seamless.",
    highlight: "Cricket to Data Analytics Switch",
    image: "/placements/shubhadip_portrait.png",
    cardImage: "/placements/shubhadip_card.png",
    bg1: "#1547c4",
    bg2: "#3b82f6",
  },
  {
    id: "story-nikita",
    firstName: "Nikita",
    fullName: "Nikita Singh Raghav",
    company: "Zepto",
    role: "Product Growth & Operations",
    package: "₹19 LPA",
    head: "Why Nikita Chose Upskilling Over Waiting",
    quote:
      "Instead of waiting a full year for traditional MBA admissions, I chose to upskill in product analytics and modern tech stacks. Joining Zepto's fast-paced engineering team proved it was the right decision.",
    highlight: "Fast-Track Tech Career",
    image: "/placements/nikita_portrait.png",
    cardImage: "/placements/nikita_card.png",
    bg1: "#1e5be0",
    bg2: "#5aa0ff",
  },
  {
    id: "story-yoshita",
    firstName: "Yoshita",
    fullName: "Yoshita B Shankar",
    company: "1DS",
    role: "Full Stack Engineer",
    package: "₹18 LPA",
    head: "Every late-night effort built her tomorrow",
    quote:
      "Balancing college coursework and deep-dive coding was tough, but the consistency built resilience. The mentorship and code reviews transformed my code quality to industry standards.",
    highlight: "Consistent Daily Learner",
    image: "/placements/yoshita_portrait.png",
    cardImage: "/placements/yoshita_card.png",
    bg1: "#1747c4",
    bg2: "#4b8cf5",
  },
  {
    id: "story-anup",
    firstName: "Anup",
    fullName: "Anup Dhangar",
    company: "Bhanzu",
    role: "Core Platform Engineer",
    package: "₹16 LPA",
    head: "Success starts When you refuse to settle",
    quote:
      "After facing initial rejections, I doubled down on my core algorithms and web infrastructure fundamentals. Committing to structured daily problem solving opened the door to Bhanzu.",
    highlight: "Turned Rejections into Offer",
    image: "/placements/anup_portrait.png",
    cardImage: "/placements/anup_card.png",
    bg1: "#1a4fcf",
    bg2: "#5b9cff",
  },
] as const

interface PlacementStoriesProps {
  onNavigate?: (page: StudentNavPage, courseId?: string) => void
  className?: string
}

export default function PlacementStories({ onNavigate, className }: PlacementStoriesProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null)
  const [storyProgress, setStoryProgress] = useState(0)
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
  }, [updateScrollButtons])

  // Scroll step (one or two cards width + gap)
  const handleScroll = (direction: "left" | "right") => {
    const el = scrollerRef.current
    if (!el) return
    const cardStep = 248 // card width (226) + gap (22)
    const delta = direction === "left" ? -cardStep * 2 : cardStep * 2
    el.scrollBy({ left: delta, behavior: "smooth" })
  }

  // Auto-scroll pace (every 5 seconds when not hovering)
  useEffect(() => {
    if (isPaused || activeStoryIndex !== null) return
    const interval = setInterval(() => {
      const el = scrollerRef.current
      if (!el) return
      const maxScroll = el.scrollWidth - el.clientWidth
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: "smooth" })
      } else {
        el.scrollBy({ left: 248, behavior: "smooth" })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isPaused, activeStoryIndex])

  // Modal story autoplay pace (6 seconds per story)
  useEffect(() => {
    if (activeStoryIndex === null || isStoryModalPaused) return

    const duration = 6000
    const intervalMs = 50
    const step = (intervalMs / duration) * 100

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          setActiveStoryIndex((curr) => {
            if (curr === null) return null
            return curr < PLACEMENT_STORIES.length - 1 ? curr + 1 : 0
          })
          return 0
        }
        return prev + step
      })
    }, intervalMs)

    return () => clearInterval(timer)
  }, [activeStoryIndex, isStoryModalPaused])

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
    setStoryProgress(0)
    setIsStoryModalPaused(false)
  }

  const closeStory = () => {
    setActiveStoryIndex(null)
    setStoryProgress(0)
  }

  // Keyboard navigation for modal
  useEffect(() => {
    if (activeStoryIndex === null) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeStory()
      if (e.key === "ArrowLeft") {
        setActiveStoryIndex((curr) => (curr !== null && curr > 0 ? curr - 1 : PLACEMENT_STORIES.length - 1))
        setStoryProgress(0)
      }
      if (e.key === "ArrowRight") {
        setActiveStoryIndex((curr) => (curr !== null && curr < PLACEMENT_STORIES.length - 1 ? curr + 1 : 0))
        setStoryProgress(0)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeStoryIndex])

  const activeStory = activeStoryIndex !== null ? PLACEMENT_STORIES[activeStoryIndex] : null

  return (
    <section
      aria-label="Placement stories"
      className={cn("w-full py-1", className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Clean Header Matching Reference Image 2: Plain title & navigation buttons */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-medium text-muted-foreground tracking-tight select-none">
          Placement stories
        </h2>

        {/* Minimalist Prev / Next Controls Matching Reference Image 2 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Previous"
            className={cn(
              "w-[50px] h-[40px] rounded-[10px] border border-border bg-surface text-foreground grid place-items-center transition-all hover:bg-surface-2 active:scale-95 cursor-pointer shadow-2xs",
              !canScrollLeft && "opacity-35 cursor-default hover:bg-surface active:scale-100"
            )}
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="Next"
            className={cn(
              "w-[50px] h-[40px] rounded-[10px] border border-border bg-surface text-foreground grid place-items-center transition-all hover:bg-surface-2 active:scale-95 cursor-pointer shadow-2xs",
              !canScrollRight && "opacity-35 cursor-default hover:bg-surface active:scale-100"
            )}
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Horizontal Story Cards Carousel (No Grid, Smooth Scroll Snap) */}
      <div
        ref={scrollerRef}
        className="flex gap-[22px] overflow-x-auto scroll-smooth py-1 px-0.5 scrollbar-none [scroll-snap-type:x_mandatory] [-ms-overflow-style:none]"
        style={{ scrollbarWidth: "none" }}
      >
        {PLACEMENT_STORIES.map((story, idx) => (
          <button
            key={story.id}
            type="button"
            onClick={() => openStory(idx)}
            aria-label={`${story.fullName} at ${story.company}`}
            className="group relative flex-none w-[226px] h-[340px] rounded-[16px] overflow-hidden p-0 text-left cursor-pointer [scroll-snap-align:start] border border-border/40 focus-visible:outline-3 focus-visible:outline-[#6aa7ff] select-none shadow-md transition-transform duration-200 hover:-translate-y-1 active:scale-[0.985]"
            style={{
              backgroundColor: story.bg1 || "#1e5be0",
            }}
          >
            <img
              src={story.cardImage}
              alt={`${story.fullName} at ${story.company}`}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* Story Modal Player (Instagram/Reels Style Portal) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {activeStory && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`${activeStory.fullName} placement story`}
                className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm"
                onClick={closeStory}
              >
                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: 15 }}
                  transition={spring.snappy}
                  className="relative w-full max-w-[360px] sm:max-w-[380px] h-[600px] sm:h-[640px] max-h-[90vh] rounded-[22px] overflow-hidden shadow-2xl flex flex-col text-white select-none border border-white/20"
                  style={{
                    backgroundColor: activeStory.bg1 || "#1e5be0",
                    background: `radial-gradient(130% 70% at 50% 0%, ${activeStory.bg2 || "#5aa0ff"}, transparent 75%), linear-gradient(180deg, ${activeStory.bg1 || "#1e5be0"}, #061338)`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={() => setIsStoryModalPaused(true)}
                  onMouseLeave={() => setIsStoryModalPaused(false)}
                >
                  {/* Top Progress Segment Bar */}
                  <div className="absolute top-2.5 inset-x-3 z-30 flex gap-1.5">
                    {PLACEMENT_STORIES.map((s, idx) => (
                      <div
                        key={s.id}
                        className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden"
                      >
                        <div
                          className="h-full bg-white rounded-full transition-all duration-75"
                          style={{
                            width:
                              idx === activeStoryIndex
                                ? `${storyProgress}%`
                                : idx < (activeStoryIndex ?? 0)
                                ? "100%"
                                : "0%",
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Story Modal Header */}
                  <div className="relative z-30 flex items-center justify-between p-4 pt-6">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-10 w-10 rounded-full border-2 border-white/60 overflow-hidden shrink-0 shadow-sm bg-white/20">
                        <img
                          src={activeStory.image}
                          alt={activeStory.fullName}
                          className="w-full h-full object-cover object-top"
                        />
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
                      setActiveStoryIndex((c) => (c !== null && c > 0 ? c - 1 : PLACEMENT_STORIES.length - 1))
                      setStoryProgress(0)
                    }}
                    className="absolute inset-y-16 left-0 w-1/4 z-20 cursor-pointer opacity-0"
                  />
                  <button
                    type="button"
                    aria-label="Next story"
                    onClick={() => {
                      setActiveStoryIndex((c) => (c !== null && c < PLACEMENT_STORIES.length - 1 ? c + 1 : 0))
                      setStoryProgress(0)
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
