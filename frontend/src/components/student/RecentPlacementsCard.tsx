import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StudentNavPage } from "@/pages/student/studentTypes"
import MirrorFlipCarousel from "@/components/ui/MirrorFlipCarousel"
import { useAlumniNetwork, type PlacementItem } from "@/data/alumniStore"

export type { PlacementItem }

export interface RecentPlacementsCardProps {
  onNavigate?: (page: StudentNavPage, courseId?: string) => void
  maxItems?: number
  className?: string
  hideHeader?: boolean
  mode?: "admin" | "student"
}

export default function RecentPlacementsCard({
  onNavigate,
  maxItems,
  className,
  hideHeader = false,
  mode = "student",
}: RecentPlacementsCardProps) {
  const { recentPlacements } = useAlumniNetwork(mode)
  const items = maxItems ? recentPlacements.slice(0, maxItems) : recentPlacements

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
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
            Recent placement highlights will appear here once published by an administrator.
          </div>
        ) : (
          <MirrorFlipCarousel
            images={items}
            scale={122}
            arrows={false}
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </div>
    </section>
  )
}
