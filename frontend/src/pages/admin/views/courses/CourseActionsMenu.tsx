import { memo } from "react"
import { Archive, ArrowUpRight, MoreHorizontal, Pencil, Rocket, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { AdminCourse } from "@/data/adminStore"

interface CourseActionsMenuProps {
  course: AdminCourse
  onOpen?: (course: AdminCourse) => void
  onEdit: (course: AdminCourse) => void
  onToggleStatus: (course: AdminCourse) => void
  onDelete: (course: AdminCourse) => void
  className?: string
  /** "overlay" sits on dark cover art; "plain" sits on the page surface. */
  appearance?: "overlay" | "plain"
}

/** Overflow menu shared by the course card, list row and course page. Stops propagation so a parent's open-on-click never fires. */
function CourseActionsMenu({ course, onOpen, onEdit, onToggleStatus, onDelete, className, appearance = "plain" }: CourseActionsMenuProps) {
  const isPublished = course.status === "Published"
  return (
    <div className={className} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={appearance === "overlay" ? "ghost" : "outline"}
            size="icon-sm"
            aria-label={`More actions for ${course.title}`}
            className={cn(
              "h-8 w-8",
              appearance === "overlay" &&
                "bg-ink-950/60 text-white ring-1 ring-white/15 backdrop-blur-md hover:bg-ink-950/85 hover:text-white data-[state=open]:bg-ink-950/90",
            )}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {onOpen && (
            <DropdownMenuItem onSelect={() => onOpen(course)}>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              Open course
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => onEdit(course)}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Quick edit details
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onToggleStatus(course)}>
            {isPublished ? <Archive className="h-4 w-4" aria-hidden="true" /> : <Rocket className="h-4 w-4" aria-hidden="true" />}
            {isPublished ? "Unpublish (archive)" : "Publish course"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onDelete(course)} destructive>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove from catalog
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default memo(CourseActionsMenu)
