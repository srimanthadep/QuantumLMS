import { Archive, ArrowUpRight, Copy, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { AdminBatch } from "@/data/adminStore"
import { cn } from "@/lib/utils"

interface BatchActionsMenuProps {
  batch: AdminBatch
  onOpenWorkspace?: () => void
  onEdit: () => void
  onDuplicate: () => void
  onToggleArchive: () => void
  onDelete: () => void
  /** Sits on dark cover art. */
  onCover?: boolean
  /** Bordered trigger for page headers. */
  outlined?: boolean
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation()

/** Overflow menu on batch cards, rows and the batch page, matching CourseActionsMenu. */
export default function BatchActionsMenu({ batch, onOpenWorkspace, onEdit, onDuplicate, onToggleArchive, onDelete, onCover, outlined }: BatchActionsMenuProps) {
  const isArchived = batch.status === "Archived"
  return (
    <div onClick={stop} onPointerDown={stop} onKeyDown={stop}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant={outlined ? "outline" : "ghost"}
            size={outlined ? "icon" : "icon-sm"}
            aria-label={`More actions for ${batch.name}`}
            className={cn(
              !outlined && "h-8 w-8",
              onCover && "bg-ink-950/60 text-white ring-1 ring-white/15 backdrop-blur-md hover:bg-ink-950/85 hover:text-white data-[state=open]:bg-ink-950/90",
            )}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {onOpenWorkspace && (
            <DropdownMenuItem onSelect={onOpenWorkspace}>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              Open batch
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Quick edit details
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Duplicate batch
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleArchive}>
            {isArchived ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
            {isArchived ? "Restore batch" : "Archive batch"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={onDelete}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete batch
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
