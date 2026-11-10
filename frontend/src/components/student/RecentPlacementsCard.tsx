import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StudentNavPage } from "@/pages/student/studentTypes"
import MirrorFlipCarousel from "@/components/ui/MirrorFlipCarousel"

export interface PlacementItem {
  name: string
  company: string
  color: string
}

export interface RecentPlacementsCardProps {
  onNavigate?: (page: StudentNavPage, courseId?: string) => void
  maxItems?: number
  className?: string
  hideHeader?: boolean
}

export default function RecentPlacementsCard({
  onNavigate,
  className,
  hideHeader = false,
}: RecentPlacementsCardProps) {
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
        <MirrorFlipCarousel style={{ width: "100%", height: "100%" }} />
      </div>
    </section>
  )
}
