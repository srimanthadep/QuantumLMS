import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StudentNavPage } from "@/pages/student/studentTypes"
import MirrorFlipCarousel from "@/components/ui/MirrorFlipCarousel"

export interface PlacementItem {
  name: string
  company: string
  role?: string
  color?: string
  src?: string
  offsetY?: number
}

export const RECENT_PLACEMENTS: readonly PlacementItem[] = [
  {
    name: "Arnav Bangaria",
    company: "ZS",
    role: "Associate Consultant",
    color: "#e0701a",
    src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
    offsetY: 0,
  },
  {
    name: "Abhishek Ghosh",
    company: "Meesho",
    role: "Software Engineer",
    color: "#e0338a",
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80",
    offsetY: 0,
  },
  {
    name: "Sai Manikanta",
    company: "IBM",
    role: "Cloud Specialist",
    color: "#1f5fbf",
    src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80",
    offsetY: 0,
  },
  {
    name: "Anuraj Satardekar",
    company: "Meesho",
    role: "Product Analyst",
    color: "#9b1b6e",
    src: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1200&q=80",
    offsetY: 0,
  },
  {
    name: "Sandeep Gowda",
    company: "Uber",
    role: "Backend Engineer",
    color: "#111111",
    src: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80",
    offsetY: 0,
  },
  {
    name: "Rhea Chawla",
    company: "Byborg",
    role: "Frontend Architect",
    color: "#2a2f9e",
    src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80",
    offsetY: 0,
  },
]

export interface RecentPlacementsCardProps {
  onNavigate?: (page: StudentNavPage, courseId?: string) => void
  maxItems?: number
  className?: string
  hideHeader?: boolean
}

export default function RecentPlacementsCard({
  onNavigate,
  maxItems,
  className,
  hideHeader = false,
}: RecentPlacementsCardProps) {
  const items = maxItems ? RECENT_PLACEMENTS.slice(0, maxItems) : RECENT_PLACEMENTS

  return (
    <section
      aria-label="Recent student placements"
      className={cn(
        "flex flex-col h-[298px] rounded-[18px] border border-border bg-surface shadow-[var(--elev-xs)] overflow-hidden",
        className
      )}
    >
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 pt-3.5 pb-1 shrink-0 z-10">
          <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
            Recent placements
          </h2>

          <button
            type="button"
            onClick={() => onNavigate?.("Alumni")}
            className="group inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded cursor-pointer"
          >
            View all
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      )}

      <div className="relative flex-1 w-full min-h-0">
        <MirrorFlipCarousel
          images={items}
          scale={122}
          arrows={false}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </section>
  )
}
