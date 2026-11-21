import { memo } from "react"
import { ArrowRight, BookOpen, Tag, Users } from "lucide-react"
import CourseCover from "@/components/shared/CourseCover"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { AdminCourse } from "@/data/adminStore"
import CourseActionsMenu from "./CourseActionsMenu"
import { compactINR, formatINR, isFreeCourse, seatPercent, STATUS_TONE } from "./courseTheme"

interface CourseCardProps {
  course: AdminCourse
  onOpen: (course: AdminCourse) => void
  onEdit: (course: AdminCourse) => void
  onToggleStatus: (course: AdminCourse) => void
  onDelete: (course: AdminCourse) => void
}

const CHIP =
  "rounded-full border border-white/15 bg-ink-950/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm"

/** Catalog tile, styled like the learner course card. The whole tile opens the course page. */
function CourseCard({ course, onOpen, onEdit, onToggleStatus, onDelete }: CourseCardProps) {
  const pct = seatPercent(course)
  const seatTone = pct >= 100 ? "danger" : pct >= 85 ? "warning" : "primary"
  const chapters = course.modulesCount ?? 0
  const lessons = course.lessonsCount ?? 0

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open ${course.title}`}
      onClick={() => onOpen(course)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen(course)
        }
      }}
      className={cn(
        "group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--elev-xs)]",
        "transition-[translate,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-border-strong/60 hover:shadow-[var(--elev-md)]",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30",
      )}
    >
      <CourseCover title={course.title} category={course.category} showTitle={false} className={cn("aspect-[16/8]", course.status === "Archived" && "grayscale-[60%]")}>
        <span className={cn(CHIP, "absolute left-3 top-3 z-10 max-w-[65%] truncate")}>{course.category}</span>
        <CourseActionsMenu
          appearance="overlay"
          course={course}
          onOpen={onOpen}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          className="absolute right-2.5 top-2.5 z-10"
        />
        <div className="absolute inset-x-3 bottom-3 z-10 flex items-end justify-between gap-2">
          <Badge tone={STATUS_TONE[course.status]} dot className="bg-ink-950/75 text-white ring-1 ring-white/15 backdrop-blur-md">
            {course.status}
          </Badge>
          <span className="rounded-md bg-ink-950/70 px-2 py-0.5 text-xs font-semibold tabular-nums text-white ring-1 ring-white/15 backdrop-blur-md">
            {course.price > 0 ? formatINR(course.price) : "Free"}
          </span>
        </div>
      </CourseCover>

      <div className="flex flex-1 flex-col gap-3.5 p-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-[15px] font-semibold leading-5 text-foreground" title={course.title}>
            {course.title}
          </h3>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <Avatar src={course.instructorAvatar || undefined} name={course.instructor} size="xs" />
            <p className="truncate text-caption text-muted-foreground">{course.instructor}</p>
          </div>
        </div>

        <dl className="grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-surface-2/60 text-center">
          <div className="px-2 py-2">
            <dt className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <BookOpen className="h-3 w-3" aria-hidden="true" /> Lessons
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground" title={`${chapters} chapters, ${lessons} lessons`}>
              {lessons}
              <span className="ml-1 text-[11px] font-normal text-subtle-foreground">/ {chapters} ch</span>
            </dd>
          </div>
          <div className="px-2 py-2">
            <dt className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Tag className="h-3 w-3" aria-hidden="true" /> Access
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">{isFreeCourse(course) ? "Free" : "Paid"}</dd>
          </div>
          <div className="px-2 py-2">
            <dt className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" aria-hidden="true" /> Learners
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{course.enrolledStudents.toLocaleString("en-IN")}</dd>
          </div>
        </dl>

        {course.capacity ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-caption">
              <span className="text-muted-foreground">
                Learner cap <span className="tabular-nums">{course.enrolledStudents.toLocaleString("en-IN")} / {course.capacity.toLocaleString("en-IN")}</span>
              </span>
              <span className="font-semibold tabular-nums text-foreground">{pct}%</span>
            </div>
            <Progress value={pct} tone={seatTone} size="xs" label={`${course.title} learner cap`} />
          </div>
        ) : (
          <p className="text-caption text-muted-foreground">Open to everyone · no learner cap</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <p className="min-w-0 truncate text-caption text-subtle-foreground">
            Net collected · <span className="font-medium tabular-nums text-foreground">{compactINR(course.revenue)}</span>
          </p>
          <span className="flex shrink-0 items-center gap-1 text-caption font-medium text-primary-text">
            Manage
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  )
}

export default memo(CourseCard)
