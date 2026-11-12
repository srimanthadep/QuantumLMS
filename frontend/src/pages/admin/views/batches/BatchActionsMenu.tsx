import {
  Archive,
  Copy,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AdminBatch } from "@/data/adminStore"
import { cn } from "@/lib/utils"
interface BatchActionsMenuProps {
  batch: AdminBatch
  onOpenWorkspace: () => void
  onEdit: () => void
  onDuplicate: () => void
  onToggleArchive: () => void
  onDelete: () => void
  onCover?: boolean
}
const stop = (e: React.SyntheticEvent) => e.stopPropagation()
/** Overflow menu on batch cards and table rows, matching CourseActionsMenu. */
export default function BatchActionsMenu({
  batch,
  onOpenWorkspace,
  onEdit,
  onDuplicate,
  onToggleArchive,
  onDelete,
  onCover,
}: BatchActionsMenuProps) {
  const isArchived = batch.status === "Archived"
  return (
    <div onClick={stop} onPointerDown={stop} onKeyDown={stop}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${batch.name}`}
            className={cn(
              "h-8 w-8 rounded-full",
              onCover
                ? "bg-black/25 text-white hover:bg-black/40 hover:text-white"
                : "",
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onOpenWorkspace}>
            <Users className="h-4 w-4" />
            Manage learners
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit details
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy className="h-4 w-4" />
            Duplicate batch
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleArchive}>
            {isArchived ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            {isArchived ? "Restore batch" : "Archive batch"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete batch
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
