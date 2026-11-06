import { memo } from "react"
import { Briefcase, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StudentNavPage } from "@/pages/student/studentTypes"

export interface PlacementItem {
  name: string
  company: string
  color: string
}

export const RECENT_PLACEMENTS: readonly PlacementItem[] = [
  { name: "Anuraj Satardekar", company: "Meesho", color: "#9b1b6e" },
  { name: "Sandeep Gowda", company: "Uber", color: "#111" },
  { name: "Arnav Bangaria", company: "ZS", color: "#e0701a" },
  { name: "Abhishek Ghosh", company: "Meesho", color: "#9b1b6e" },
  { name: "Sai Manikanta", company: "IBM", color: "#1f5fbf" },
  { name: "Rhea Chawla", company: "Byborg", color: "#2a2f9e" },
  { name: "Tina Digambar Kapse", company: "Hexaware", color: "#e8541a" },
  { name: "Anuron Sarma", company: "Amazon", color: "#e47911" },
  { name: "Ashutosh Tiwari", company: "Optum Global", color: "#e87722" },
  { name: "Ashish Kumar", company: "IBM", color: "#1f5fbf" },
  { name: "Meetanshi Gupta", company: "Sigmoid Analytics", color: "#2b6cb0" },
  { name: "Prathmesh Potdar", company: "Flipkart", color: "#2874f0" },
  { name: "Anchal Rani Barnowal", company: "LTIMindtree", color: "#1b6fa8" },
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
  const isDarkCompanyColor = item.color === "#111" || item.color === "#111111"

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-border/70 bg-surface dark:bg-[#202024] p-2 transition-colors hover:border-border-strong">
      <div
        className="h-14 w-14 shrink-0 rounded-[10px] grid place-items-center text-white font-semibold text-lg tracking-wide select-none shadow-xs"
        style={{ backgroundColor: tint }}
        aria-hidden="true"
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[15px] leading-tight text-foreground mb-1">
          {item.name}
        </p>
        <span
          className="block truncate text-[13px] font-bold tracking-tight"
          style={{
            color: isDarkCompanyColor ? "var(--foreground)" : item.color,
          }}
        >
          {item.company}
        </span>
      </div>
    </div>
  )
})

export interface RecentPlacementsCardProps {
  onNavigate?: (page: StudentNavPage, courseId?: string) => void
  className?: string
}

export default function RecentPlacementsCard({ onNavigate, className }: RecentPlacementsCardProps) {
  return (
    <section
      aria-label="Recent student placements"
      className={cn(
        "flex flex-col h-full rounded-[18px] border border-border bg-surface p-4 shadow-[var(--elev-xs)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 px-0.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary-text ring-1 ring-inset ring-primary-border">
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Recent placements
          </h2>
        </div>

        <button
          type="button"
          onClick={() => onNavigate?.("Career Hub")}
          className="group inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {/* Scrolling Marquee Panel */}
      <div className="group relative flex-1 h-[420px] overflow-hidden rounded-[18px] bg-surface-2 dark:bg-[#18181b] border border-border/60 p-2.5 motion-reduce:overflow-y-auto">
        {/* Soft gradient masks at top and bottom for smooth fade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-surface-2 dark:from-[#18181b] to-transparent z-10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-surface-2 dark:from-[#18181b] to-transparent z-10"
        />

        {/* Track with infinite vertical translation */}
        <div
          className="flex flex-col will-change-transform [animation:q-vertical-scroll_62s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:[animation:none]"
        >
          {/* First sequence of records */}
          <div className="flex flex-col gap-2.5">
            {RECENT_PLACEMENTS.map((item, idx) => (
              <PlacementRow
                key={`p1-${idx}-${item.name}`}
                item={item}
                tint={AVATAR_TINTS[idx % AVATAR_TINTS.length]}
              />
            ))}
          </div>

          {/* Duplicate sequence for seamless 50% loop */}
          <div aria-hidden="true" className="flex flex-col gap-2.5 pt-2.5">
            {RECENT_PLACEMENTS.map((item, idx) => (
              <PlacementRow
                key={`p2-${idx}-${item.name}`}
                item={item}
                tint={AVATAR_TINTS[idx % AVATAR_TINTS.length]}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
