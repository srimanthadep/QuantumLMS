import { memo } from "react"
import { Archive, ExternalLink, MoreHorizontal, Pencil, Rocket, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AdminCourse } from "@/data/adminStore"

interface CourseActionsMenuProps {
  course: AdminCourse
  onOpen: (course: AdminCourse) => void
  onEdit: (course: AdminCourse) => void
  onToggleStatus: (course: AdminCourse) => void
  onDelete: (course: AdminCourse) => void
  className?: string
}

/** Overflow menu shared by the course card and list row. Stops propagation so the parent's open-on-click never fires. */
function CourseActionsMenu({ course, onOpen, onEdit, onToggleStatus, onDelete, className }: CourseActionsMenuProps) {
  const isPublished = course.status === "Published"
  return (
    <div className={className} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${course.title}`} className="h-8 w-8">
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => onOpen(course)}>
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
            Open workspace
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onEdit(course)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Edit details
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onToggleStatus(course)}>
            {isPublished ? (
              <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {isPublished ? "Archive course" : "Publish course"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onDelete(course)} className="text-danger focus:text-danger">
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Delete course
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default memo(CourseActionsMenu)

