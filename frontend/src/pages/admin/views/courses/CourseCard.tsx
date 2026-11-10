import { memo } from "react"
import { Star, Users } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { AdminCourse } from "@/data/adminStore"
import CourseActionsMenu from "./CourseActionsMenu"
import { compactINR, formatINR, seatPercent, STATUS_TONE, themeFor } from "./courseTheme"

interface CourseCardProps {
  course: AdminCourse
  onOpen: (course: AdminCourse) => void
  onEdit: (course: AdminCourse) => void
  onToggleStatus: (course: AdminCourse) => void
  onDelete: (course: AdminCourse) => void
}

/** Catalog card. The whole card opens the full-screen course workspace. */
function CourseCard({ course, onOpen, onEdit, onToggleStatus, onDelete }: CourseCardProps) {
  const { gradient, icon: Icon } = themeFor(course.category)
  const pct = seatPercent(course)
  const full = pct >= 100
  const nearlyFull = pct >= 85

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open ${course.title}`}
      onClick={() => onOpen(course)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen(course)
        }
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xs",
        "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary-border hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30",
        course.status === "Archived" && "opacity-75",
      )}
    >
      {/* Cover */}
      <div className={cn("relative h-28 overflow-hidden bg-gradient-to-br", gradient)}>
        <Icon
          className="absolute -bottom-4 -right-3 h-28 w-28 rotate-[-8deg] text-white/20 transition-transform duration-300 group-hover:scale-110"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" aria-hidden="true" />
        <div className="absolute left-3 top-3">
          <Badge tone={STATUS_TONE[course.status]} dot className="bg-surface/90 backdrop-blur">
            {course.status}
          </Badge>
        </div>
        <CourseActionsMenu
          course={course}
          onOpen={onOpen}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          className="absolute right-2 top-2 rounded-lg bg-surface/90 backdrop-blur"
        />
        <span className="absolute bottom-3 left-3 rounded-full bg-black/40 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
          {course.category}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-2">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-[15px] font-semibold leading-5 text-foreground">{course.title}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar src={course.instructorAvatar} name={course.instructor} size="xs" />
            <span className="truncate font-medium text-foreground/80">{course.instructor}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">
              {course.cohortCount} {course.cohortCount === 1 ? "cohort" : "cohorts"}
            </span>
          </div>
        </div>

        {/* Seats */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-semibold tabular-nums text-foreground">{course.enrolledStudents}</span>
              <span className="tabular-nums">/ {course.capacity} seats</span>
            </span>
            <span className={cn("font-semibold tabular-nums", full ? "text-danger" : nearlyFull ? "text-warning" : "text-muted-foreground")}>
              {pct}%
            </span>
          </div>
          <Progress value={pct} size="sm" tone={full ? "danger" : nearlyFull ? "warning" : "primary"} label={`${pct}% of seats filled`} />
        </div>

        {/* Metrics */}
        <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3">
          <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">Price</dt>
            <dd className="truncate text-sm font-semibold tabular-nums text-foreground" title={formatINR(course.price)}>
              {compactINR(course.price)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">Revenue</dt>
            <dd className="truncate text-sm font-semibold tabular-nums text-primary-text" title={formatINR(course.revenue)}>
              {compactINR(course.revenue)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">Rating</dt>
            <dd className="flex items-center gap-1 text-sm font-semibold tabular-nums text-foreground">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
              {course.rating}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  )
}

export default memo(CourseCard)

