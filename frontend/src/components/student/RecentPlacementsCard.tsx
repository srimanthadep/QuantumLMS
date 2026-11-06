import { memo, useRef, useState, useCallback, useEffect } from "react"
import { Briefcase, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StudentNavPage } from "@/pages/student/studentTypes"
import CompanyLogo from "@/components/shared/CompanyLogo"

export interface PlacementItem {
  name: string
  company: string
  color: string
}

export const RECENT_PLACEMENTS: readonly PlacementItem[] = [
  { name: "Abhishek Ghosh", company: "Meesho", color: "#9b1b6e" },
  { name: "Sai Manikanta", company: "IBM", color: "#1f5fbf" },
  { name: "Anuraj Satardekar", company: "Meesho", color: "#9b1b6e" },
  { name: "Sandeep Gowda", company: "Uber", color: "#111" },
  { name: "Arnav Bangaria", company: "ZS", color: "#e0701a" },
  { name: "Rhea Chawla", company: "Byborg", color: "#2a2f9e" },
  { name: "Tina Digambar Kapse", company: "Hexaware", color: "#e8541a" },
  { name: "Anuron Sarma", company: "Amazon", color: "#e47911" },
  { name: "Ashutosh Tiwari", company: "Optum Global", color: "#e87722" },
  { name: "Ashish Kumar", company: "IBM", color: "#1f5fbf" },
  { name: "Meetanshi Gupta", company: "Sigmoid Analytics", color: "#2b6cb0" },
  { name: "Prathmesh Potdar", company: "Flipkart", color: "#2874f0" },
  { name: "Sakshi Singh", company: "Razorpay", color: "#2b6ae0" },
  { name: "Akash Chakraborty", company: "EY", color: "#c9a400" },
  { name: "Suman Bera", company: "Cognizant", color: "#2459a6" },
  { name: "Mohammed Israhar", company: "Meesho", color: "#9b1b6e" },
  { name: "Shahbaaz Shaikh", company: "DP World", color: "#1c2b5a" },
  { name: "Ravneet Singh", company: "IndiGo", color: "#2a2f9e" },
  { name: "Subhadip Das", company: "Mr. Cooper", color: "#2a6f4e" },
  { name: "Shlok Singh", company: "Cure.fit", color: "#d63a3a" },
  { name: "Pallavi Dash", company: "IndiGo", color: "#2a2f9e" },
  { name: "Gaurav Agrawal", company: "Myntra", color: "#e0338a" },
  { name: "Dheeraj B S", company: "IBM", color: "#1f5fbf" },
  { name: "Anchal Rani Barnowal", company: "LTIMindtree", color: "#1b6fa8" },
] as const

const AVATAR_TINTS = [
  "#5b6b8c",
  "#7a5c8a",
  "#4f7d73",
  "#8a6a4f",
  "#566f93",
  "#7b6a5a",
] as const

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}

interface PlacementRowProps {
  item: PlacementItem
  tint: string
}

const PlacementRow = memo(function PlacementRow({ item, tint }: PlacementRowProps) {
  const initials = getInitials(item.name)

  return (
    <div className="group/row flex h-[72px] shrink-0 snap-start items-center justify-between gap-3 rounded-[17px] border border-[#ECECF0] dark:border-white/10 bg-white dark:bg-[#18181c] px-3.5 transition-colors hover:border-[#DFDFE4] dark:hover:border-white/20">
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar Initials */}
        <div
          className="h-[42px] w-[42px] shrink-0 rounded-xl grid place-items-center text-white font-semibold text-xs tracking-wider select-none shadow-xs"
          style={{ backgroundColor: tint }}
          aria-hidden="true"
        >
          {initials}
        </div>

        {/* Candidate & Placement Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold text-[#171717] dark:text-foreground leading-tight">
            {item.name}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[#777780] dark:text-muted-foreground mt-0.5 truncate">
            <span className="font-medium truncate text-[#55555c] dark:text-neutral-300">
              {item.company}
            </span>
            <span className="shrink-0 text-[#777780] dark:text-neutral-500">·</span>
            <span className="shrink-0 font-medium text-[#16865B]">
              Placed
            </span>
          </div>
        </div>
      </div>

      {/* Official Company Logo */}
      <CompanyLogo
        name={item.company}
        size="sm"
        className="h-8 w-8 rounded-lg p-1 shrink-0 bg-white border border-[#ECECF0] dark:border-white/10 shadow-2xs hover:scale-105 transition-transform"
      />
    </div>
  )
})

export interface RecentPlacementsCardProps {
  onNavigate?: (page: StudentNavPage, courseId?: string) => void
  maxItems?: number
  className?: string
}

export default function RecentPlacementsCard({
  onNavigate,
  maxItems = 12,
  className,
}: RecentPlacementsCardProps) {
  const displayItems = RECENT_PLACEMENTS.slice(0, maxItems)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollDown, setCanScrollDown] = useState(true)
  const [hasScrolledTop, setHasScrolledTop] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setHasScrolledTop(el.scrollTop > 8)
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 6
    setCanScrollDown(!isAtBottom)
  }, [])

  useEffect(() => {
    checkScroll()
  }, [checkScroll])

  return (
    <section
      aria-label="Recent student placements"
      className={cn(
        "flex flex-col rounded-[22px] border border-[#E9E9ED] dark:border-border bg-white dark:bg-surface p-5 shadow-xs",
        className
      )}
    >
      {/* Header - Fixed, never scrolls */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F47738] border border-orange-200/60 dark:border-orange-900/40 shrink-0">
            <Briefcase className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <h2 className="text-[17px] font-semibold text-[#171717] dark:text-foreground tracking-tight leading-none whitespace-nowrap">
            Recent placements
          </h2>
          <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-xs font-semibold bg-[#F4F4F6] dark:bg-white/10 text-[#777780] dark:text-neutral-300 tabular-nums shrink-0">
            {displayItems.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onNavigate?.("Career Hub")}
          className="group inline-flex items-center gap-0.5 text-xs sm:text-[13px] font-semibold text-[#F47738] hover:text-[#d95d20] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F47738] rounded shrink-0 whitespace-nowrap"
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {/* Scrollable list - sits directly on card surface without nested grey containers */}
      <div className="relative">
        {/* Subtle top fade (only visible after user scrolls down) */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-5 z-10 bg-gradient-to-b from-white dark:from-surface to-transparent transition-opacity duration-200",
            hasScrolledTop ? "opacity-100" : "opacity-0"
          )}
        />

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="h-[280px] overflow-y-auto pr-0.5 flex flex-col gap-2 scroll-smooth snap-y snap-mandatory [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-neutral-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:rgb(212_212_216)_transparent]"
        >
          {displayItems.map((item, idx) => (
            <PlacementRow
              key={`${item.name}-${idx}`}
              item={item}
              tint={AVATAR_TINTS[idx % AVATAR_TINTS.length]}
            />
          ))}
        </div>

        {/* Subtle bottom fade when more items exist */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-[17px] bg-gradient-to-t from-white dark:from-surface to-transparent transition-opacity duration-200",
            canScrollDown ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    </section>
  )
}
