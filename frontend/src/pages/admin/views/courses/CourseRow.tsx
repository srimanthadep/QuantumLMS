import { memo } from "react"
import { Star } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { AdminCourse } from "@/data/adminStore"
import CourseActionsMenu from "./CourseActionsMenu"
import { formatINR, seatPercent, STATUS_TONE, themeFor } from "./courseTheme"

interface CourseRowProps {
  course: AdminCourse
  onOpen: (course: AdminCourse) => void
  onEdit: (course: AdminCourse) => void
  onToggleStatus: (course: AdminCourse) => void
  onDelete: (course: AdminCourse) => void
}

/** Dense list-view row. The whole row opens the full-screen course workspace. */
function CourseRow({ course, onOpen, onEdit, onToggleStatus, onDelete }: CourseRowProps) {
  const { gradient, icon: Icon } = themeFor(course.category)
  const pct = seatPercent(course)

  return (
    <tr
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
        "cursor-pointer transition-colors hover:bg-surface-2/60 focus-visible:bg-surface-2/60 focus-visible:outline-none",
        course.status === "Archived" && "opacity-75",
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white", gradient)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{course.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {course.category} · {course.cohortCount} {course.cohortCount === 1 ? "cohort" : "cohorts"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-2">
          <Avatar src={course.instructorAvatar} name={course.instructor} size="xs" />
          <span className="truncate text-xs font-medium text-foreground">{course.instructor}</span>
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="w-28 space-y-1">
          <p className="text-xs font-medium tabular-nums text-foreground">
            {course.enrolledStudents} / {course.capacity}
          </p>
          <Progress value={pct} size="xs" tone={pct >= 100 ? "danger" : pct >= 85 ? "warning" : "primary"} label={`${pct}% of seats filled`} />
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-semibold tabular-nums text-foreground">{formatINR(course.price)}</td>
      <td className="px-4 py-3 text-sm font-semibold tabular-nums text-primary-text">{formatINR(course.revenue)}</td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1 text-xs font-semibold tabular-nums text-foreground">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
          {course.rating}
        </span>
      </td>
      <td className="px-4 py-3">
        <Badge tone={STATUS_TONE[course.status]} dot>
          {course.status}
        </Badge>
      </td>
      <td className="px-2 py-3 text-right">
        <CourseActionsMenu
          course={course}
          onOpen={onOpen}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          className="inline-block"
        />
      </td>
    </tr>
  )
}

export default memo(CourseRow)

