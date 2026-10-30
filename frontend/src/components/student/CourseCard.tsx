import { motion } from "framer-motion"
import { ArrowRight, Clock, Layers, Play, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import { Badge, Button, Progress } from "@/components/ui"
import CourseCover from "@/components/shared/CourseCover"
import type { CourseItem } from "@/pages/student/studentTypes"
import { coverCategory } from "@/pages/student/studentUtils"

interface CourseCardProps {
  course: CourseItem
  onOpen: () => void
  /** Catalog cards show rating, duration and an Enroll action instead of progress. */
  variant?: "enrolled" | "catalog"
  onEnroll?: () => void
  className?: string
}

const CHIP =
  "absolute z-10 rounded-full border border-white/15 bg-ink-950/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm"

/**
 * Course tile used across the student portal. The whole card opens the course;
 * it lifts on hover, the cover zooms and a play affordance scales in.
 */
export default function CourseCard({ course, onOpen, variant = "enrolled", onEnroll, className }: CourseCardProps) {
  const done = course.status === "Completed"
  const catalog = variant === "catalog"
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: transition.fast }}
      transition={transition.base}
      role="button"
      tabIndex={0}
      aria-label={catalog ? `Preview ${course.title}` : `Open ${course.title}, ${course.progress}% complete`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        "group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--elev-xs)] transition-[translate,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-border-strong/60 hover:shadow-[var(--elev-md)]",
        className,
      )}
    >
      <CourseCover title={course.title} category={coverCategory(course.category)} image={course.image} showTitle={false}>
        <span className={cn(CHIP, "left-3 top-3")}>{course.category}</span>
        {!catalog && (
          <span className={cn(CHIP, "right-3 top-3", done && "border-success/40 text-success")}>{done ? "Completed" : course.status}</span>
        )}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 scale-90 items-center justify-center rounded-full bg-white/95 text-ink-950 opacity-0 shadow-[var(--elev-md)] transition-[opacity,scale] duration-200 group-hover:scale-100 group-hover:opacity-100"
        >
          {catalog ? <ArrowRight className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
        </span>
      </CourseCover>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-foreground" title={course.title}>
            {course.title}
          </h3>
          <p className="mt-0.5 truncate text-caption text-muted-foreground">
            {course.instructor} · {course.level} · {course.credits} credits
          </p>
        </div>

        {catalog ? (
          <>
            <p className="line-clamp-2 text-caption text-muted-foreground">{course.description}</p>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
              <div className="flex items-center gap-3 text-caption text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                  <span className="font-medium tabular-nums text-foreground">{course.rating}</span>
                  <span>({course.reviews})</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {course.duration}
                </span>
              </div>
              {onEnroll && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEnroll()
                  }}
                >
                  Enroll
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-caption">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  {course.completedModules} of {course.totalModules} modules
                </span>
                <span className="font-semibold tabular-nums text-foreground">{course.progress}%</span>
              </div>
              <Progress value={course.progress} tone={done ? "success" : "primary"} size="xs" label={`${course.title} progress`} />
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
              <p className="min-w-0 truncate text-caption text-subtle-foreground" title={course.lastWatched}>
                {done ? "Completed" : "Last watched"} · <span className="text-muted-foreground">{course.lastWatched}</span>
              </p>
              <Badge tone={done ? "success" : "primary"} size="sm" className="shrink-0">
                {done ? "Review" : "Resume"}
              </Badge>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
