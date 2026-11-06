import { useState, useRef, useEffect, useCallback, memo } from "react"
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
import { spring, transition } from "@/lib/motion"
import { Button } from "@/components/ui"
import CompanyLogo from "@/components/shared/CompanyLogo"
import type { StudentNavPage } from "@/pages/student/studentTypes"

export interface PlacementStory {
  id: string
  name: string
  company: string
  role: string
  package: string
  head: string
  quote: string
  highlight: string
  bg1: string
  bg2: string
  img?: string
}

export const PLACEMENT_STORIES: readonly PlacementStory[] = [
  {
    id: "story-1",
    name: "Anuraj Satardekar",
    company: "Meesho",
    role: "Software Development Engineer",
    package: "₹18 LPA",
    head: "From campus to a first big offer",
    quote:
      "I spent months feeling overwhelmed by DSA until the structured cohort broke it down topic by topic. The real-time mock interviews gave me the composure to clear all 4 rounds at Meesho.",
    highlight: "Cleared 4 rounds in 2 weeks",
    bg1: "#1e5be0",
    bg2: "#5aa0ff",
  },
  {
    id: "story-2",
    name: "Sandeep Gowda",
    company: "Uber",
    role: "Backend Systems Engineer",
    package: "₹32 LPA",
    head: "From mechanical to Uber Systems",
    quote:
      "Coming from a non-CS background, building distributed systems felt out of reach. Building production-grade microservices during the program became the standout talking point in my Uber interview.",
    highlight: "Non-CS to Tier-1 Product Firm",
    bg1: "#0e1a38",
    bg2: "#3b82f6",
  },
  {
    id: "story-3",
    name: "Diya Sharma",
    company: "ZS",
    role: "Decision Analytics Associate",
    package: "₹16.5 LPA",
    head: "From cricket to data analytics",
    quote:
      "Transitioning careers required proof of skills, not just certificates. Deploying end-to-end analytics pipelines in the live labs helped me tackle ZS's real-world case study with precision.",
    highlight: "Career Switch in 5 Months",
    bg1: "#1747c4",
    bg2: "#4b8cf5",
  },
  {
    id: "story-4",
    name: "Sai Manikanta",
    company: "IBM",
    role: "Cloud & DevOps Specialist",
    package: "₹14 LPA",
    head: "Every late-night effort built my tomorrow",
    quote:
      "The Docker and Kubernetes sandbox workspaces mirrored the exact problem statements IBM tested in their cloud engineering evaluation round.",
    highlight: "Cracked Cloud Associate Track",
    bg1: "#1d52d6",
    bg2: "#4f95fa",
  },
  {
    id: "story-5",
    name: "Tina Digambar Kapse",
    company: "Hexaware",
    role: "Full Stack Engineer",
    package: "₹12 LPA",
    head: "Why I chose upskilling over waiting",
    quote:
      "Waiting endlessly for off-campus notifications was frustrating. Committing 3 hours daily on QuantumLMS turned multiple rejections into three simultaneous offers.",
    highlight: "3 Job Offers Received",
    bg1: "#a3370b",
    bg2: "#ea580c",
  },
  {
    id: "story-6",
    name: "Prathmesh Potdar",
    company: "Flipkart",
    role: "Frontend UI Engineer",
    package: "₹24 LPA",
    head: "One line of code at a time",
    quote:
      "The component design patterns, accessibility standards, and web performance optimizations taught here immediately set me apart during Flipkart's machine coding round.",
    highlight: "Aced Machine Coding Round",
    bg1: "#1e3a8a",
    bg2: "#2563eb",
  },
  {
    id: "story-7",
    name: "Sakshi Singh",
    company: "Razorpay",
    role: "FinTech Platform Engineer",
    package: "₹20 LPA",
    head: "Success starts when you refuse to settle",
    quote:
      "FinTech interviews require deep clarity on transactions and distributed locks. The backend cohorts gave me the exact architecture principles to explain with conviction.",
    highlight: "Top 1% Assessment Rank",
    bg1: "#1e40af",
    bg2: "#60a5fa",
  },
  {
    id: "story-8",
    name: "Anuron Sarma",
    company: "Amazon",
    role: "Cloud Support Associate",
    package: "₹22 LPA",
    head: "My first interview, my best lesson",
    quote:
      "The mock behavioral sessions drilled Amazon's Leadership Principles so deeply that I handled the bar-raiser round without any hesitation.",
    highlight: "Direct Amazon Off-Campus Hire",
    bg1: "#c2410c",
    bg2: "#f97316",
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

  // Update button disabled state based on scroll position
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

  // Scroll step (width of one card + gap)
  const handleScroll = (direction: "left" | "right") => {
    const el = scrollerRef.current
    if (!el) return
    const cardWidth = 248 // card width (226) + gap (22)
    const delta = direction === "left" ? -cardWidth * 2 : cardWidth * 2
    el.scrollBy({ left: delta, behavior: "smooth" })
  }

  // Auto-scroll pace: smooth automatic tick every 4.8 seconds when not hovered
  useEffect(() => {
    if (isPaused || activeStoryIndex !== null) return
    const interval = setInterval(() => {
      const el = scrollerRef.current
      if (!el) return
      const maxScroll = el.scrollWidth - el.clientWidth
      if (el.scrollLeft >= maxScroll - 10) {
        // Loop gently back to start
        el.scrollTo({ left: 0, behavior: "smooth" })
      } else {
        el.scrollBy({ left: 248, behavior: "smooth" })
      }
    }, 4800)

    return () => clearInterval(interval)
  }, [isPaused, activeStoryIndex])

  // Modal story autoplay pace (6 seconds per story)
  useEffect(() => {
    if (activeStoryIndex === null || isStoryModalPaused) return

    const duration = 6000 // 6 seconds
    const intervalMs = 50
    const step = (intervalMs / duration) * 100

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          // Advance to next story or loop
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

  // Reset progress when active story changes
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
      aria-label="Student placement stories"
      className={cn(
        "relative rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 shadow-[var(--elev-xs)] transition-all",
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header with Title and Carousel Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Placement stories
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real experiences from students who transformed their careers. Click any story to view.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onNavigate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("Career Hub")}
              className="text-xs font-semibold text-primary hover:text-primary-hover gap-1 h-8 px-2.5 mr-1"
            >
              Career Hub
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Carousel Arrows */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Previous placement stories"
              className={cn(
                "h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-border bg-surface-2 dark:bg-[#202024] text-foreground grid place-items-center transition-all hover:bg-surface-3 hover:border-border-strong active:scale-95",
                !canScrollLeft && "opacity-35 cursor-not-allowed hover:bg-surface-2 active:scale-100"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Next placement stories"
              className={cn(
                "h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-border bg-surface-2 dark:bg-[#202024] text-foreground grid place-items-center transition-all hover:bg-surface-3 hover:border-border-strong active:scale-95",
                !canScrollRight && "opacity-35 cursor-not-allowed hover:bg-surface-2 active:scale-100"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stories Scroller Track */}
      <div
        ref={scrollerRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto scroll-smooth py-1 px-0.5 scrollbar-none [scroll-snap-type:x_mandatory] [-ms-overflow-style:none]"
        style={{ scrollbarWidth: "none" }}
      >
        {PLACEMENT_STORIES.map((story, idx) => (
          <motion.button
            key={story.id}
            type="button"
            onClick={() => openStory(idx)}
            whileHover={{ y: -4, scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            transition={spring.snappy}
            aria-label={`${story.name} at ${story.company}: ${story.head}`}
            className="group relative flex-none w-[214px] sm:w-[226px] h-[320px] sm:h-[340px] rounded-2xl overflow-hidden p-0 text-left cursor-pointer [scroll-snap-align:start] shadow-md border border-white/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
            style={{
              backgroundColor: story.bg1,
            }}
          >
            {/* Background Gradient Mesh */}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(120% 60% at 50% 0%, ${story.bg2}, transparent 70%), linear-gradient(180deg, ${story.bg1}, #06153d)`,
              }}
            />

            {/* Subtle Watermark Branding */}
            <div
              aria-hidden="true"
              className="absolute -left-2 top-2 font-black text-[30px] sm:text-[34px] leading-[0.92] tracking-tight text-white/12 uppercase pointer-events-none select-none"
            >
              Path to<br />Placements
            </div>

            {/* Stylized Alumni Silhouette */}
            <div
              aria-hidden="true"
              className="absolute left-1/2 bottom-14 -translate-x-1/2 w-[140px] h-[180px] pointer-events-none opacity-80 transition-transform duration-300 group-hover:scale-105"
            >
              {/* Head */}
              <div className="absolute left-1/2 -translate-x-1/2 top-2 w-16 h-16 rounded-full bg-white/85 shadow-sm" />
              {/* Body */}
              <div className="absolute left-1/2 -translate-x-1/2 top-[72px] w-32 h-28 rounded-t-[54px] bg-white/85 shadow-sm" />
            </div>

            {/* Headline */}
            <div className="absolute left-3.5 right-3.5 top-14">
              <h3 className="font-extrabold text-[17px] sm:text-[18px] leading-[1.18] tracking-tight text-white drop-shadow-sm line-clamp-3">
                {story.head}
              </h3>
            </div>

            {/* Bottom Dark Gradient Shade */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-[#041038] via-[#041038]/85 to-transparent pointer-events-none"
            />

            {/* Story Meta Footer */}
            <div className="absolute left-3.5 right-3.5 bottom-3.5 flex items-end justify-between gap-2 z-10">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] sm:text-[15px] font-bold text-white leading-tight">
                  {story.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                  <span className="truncate text-xs font-semibold text-white/85">
                    @{story.company}
                  </span>
                  <CompanyLogo
                    name={story.company}
                    size="xs"
                    variant="plain"
                    className="h-3.5 w-auto max-w-[48px] shrink-0 brightness-0 invert opacity-90"
                  />
                </div>
              </div>

              {/* Play Button Icon */}
              <span
                aria-hidden="true"
                className="flex-none h-9 w-9 rounded-full bg-white/20 border border-white/50 backdrop-blur-xs grid place-items-center text-white shadow-sm transition-all duration-200 group-hover:scale-110 group-hover:bg-white/30"
              >
                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Full Story Modal Player (Instagram/Reels Style Portal) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {activeStory && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`${activeStory.name} placement story`}
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
                    backgroundColor: activeStory.bg1,
                    background: `radial-gradient(130% 70% at 50% 0%, ${activeStory.bg2}, transparent 75%), linear-gradient(180deg, ${activeStory.bg1}, #061338)`,
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
                      <div className="h-10 w-10 rounded-full border-2 border-white/60 bg-white/20 backdrop-blur-xs grid place-items-center font-bold text-sm text-white shrink-0 shadow-sm">
                        {activeStory.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate leading-tight text-white drop-shadow-xs">
                          {activeStory.name}
                        </p>
                        <p className="text-xs text-white/80 truncate">
                          {activeStory.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsStoryModalPaused((p) => !p)}
                        className="h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white/90 grid place-items-center transition-colors"
                        title={isStoryModalPaused ? "Resume" : "Pause"}
                      >
                        {isStoryModalPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
                      </button>
                      <button
                        type="button"
                        onClick={closeStory}
                        className="h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white grid place-items-center transition-colors"
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
                          <Trophy className="h-3.5 w-3.5 text-warning" />
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
                        <Quote className="h-3.5 w-3.5 text-primary-soft rotate-180" />
                        Student journey
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed text-white/95 italic">
                        "{activeStory.quote}"
                      </p>
                      <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs">
                        <span className="font-bold text-warning-text flex items-center gap-1">
                          ★ {activeStory.highlight}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <CompanyLogo
                            name={activeStory.company}
                            size="sm"
                            variant="plain"
                            className="h-4 w-auto brightness-0 invert"
                          />
                        </div>
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
