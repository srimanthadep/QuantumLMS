import { memo } from "react"
import CourseCover from "@/components/shared/CourseCover"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { AdminCourse } from "@/data/adminStore"
import CourseActionsMenu from "./CourseActionsMenu"
import { compactINR, formatINR, isFreeCourse, seatPercent, STATUS_TONE } from "./courseTheme"

interface CourseRowProps {
  course: AdminCourse
  onOpen: (course: AdminCourse) => void
  onEdit: (course: AdminCourse) => void
  onToggleStatus: (course: AdminCourse) => void
  onDelete: (course: AdminCourse) => void
  /** Select mode: a leading checkbox cell, and a click ticks the row instead of opening it. */
  selecting?: boolean
  selected?: boolean
  onToggleSelect?: (course: AdminCourse) => void
}

/** Dense list-view row. The whole row opens the course page. */
function CourseRow({ course, onOpen, onEdit, onToggleStatus, onDelete, selecting = false, selected = false, onToggleSelect }: CourseRowProps) {
  const pct = seatPercent(course)
  const seatTone = pct >= 100 ? "danger" : pct >= 85 ? "warning" : "primary"

  return (
    <tr
      role="button"
      tabIndex={0}
      aria-label={selecting ? `Select ${course.title}` : `Open ${course.title}`}
      aria-pressed={selecting ? selected : undefined}
      onClick={() => (selecting ? onToggleSelect?.(course) : onOpen(course))}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          if (selecting) onToggleSelect?.(course)
          else onOpen(course)
        }
      }}
      className={cn("group cursor-pointer transition-colors hover:bg-surface-2/70 focus-visible:bg-surface-2 focus-visible:outline-none", selected && "bg-primary-soft/60 hover:bg-primary-soft/70")}
    >
      {selecting && (
        <td className="w-10 pl-4 pr-0">
          <Checkbox checked={selected} onCheckedChange={() => {}} tabIndex={-1} aria-hidden="true" className="pointer-events-none" />
        </td>
      )}
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <CourseCover title={course.title} category={course.category} showTitle={false} hoverZoom={false} className="aspect-auto h-10 w-16 shrink-0 rounded-md" />
          <div className="min-w-0">
            <p className="max-w-[260px] truncate font-medium text-foreground group-hover:text-primary-text" title={course.title}>
              {course.title}
            </p>
            <p className="truncate text-caption text-muted-foreground">{course.category}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar src={course.instructorAvatar || undefined} name={course.instructor} size="xs" />
          <span className="max-w-[140px] truncate text-muted-foreground">{course.instructor}</span>
        </div>
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">
        <span className="font-medium text-foreground">{course.lessonsCount ?? 0}</span> lessons
        <span className="block text-caption text-subtle-foreground">{course.modulesCount ?? 0} chapters</span>
      </td>
      <td className="px-4 py-3">
        <Badge tone={isFreeCourse(course) ? "success" : "info"}>{isFreeCourse(course) ? "Free" : "Paid"}</Badge>
      </td>
      <td className="px-4 py-3">
        {course.capacity ? (
          <div className="w-32">
            <div className="mb-1 flex justify-between text-caption tabular-nums">
              <span className="text-foreground">{course.enrolledStudents.toLocaleString("en-IN")}</span>
              <span className="text-muted-foreground">/ {course.capacity.toLocaleString("en-IN")}</span>
            </div>
            <Progress value={pct} tone={seatTone} size="xs" label={`${course.title} learner cap`} />
          </div>
        ) : (
          <span className="tabular-nums text-foreground">{course.enrolledStudents.toLocaleString("en-IN")}</span>
        )}
      </td>
      <td className="px-4 py-3 tabular-nums text-foreground">{course.price > 0 ? formatINR(course.price) : "Free"}</td>
      <td className="px-4 py-3 font-medium tabular-nums text-foreground">{compactINR(course.revenue)}</td>
      <td className="px-4 py-3">
        <Badge tone={STATUS_TONE[course.status]} dot>
          {course.status}
        </Badge>
      </td>
      <td className="px-2 py-3 text-right">
        {!selecting && <CourseActionsMenu course={course} onOpen={onOpen} onEdit={onEdit} onToggleStatus={onToggleStatus} onDelete={onDelete} appearance="plain" className="inline-flex" />}
      </td>
    </tr>
  )
}

export default memo(CourseRow)
