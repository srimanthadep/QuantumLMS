import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui"
import type { LiveSessionItem } from "@/types"
import SessionScheduleForm from "@/components/live/SessionScheduleForm"
import LiveSessionsPanel from "@/components/live/LiveSessionsPanel"
export default function ScheduleSessionDialog({ open, onOpenChange, defaultCourseId, session }: { open: boolean; onOpenChange: (open: boolean) => void; defaultCourseId?: string; session?: LiveSessionItem | null }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{session ? "Manage class" : "Schedule a class"}</DialogTitle><DialogDescription>Classes are saved to an assigned batch and its timezone.</DialogDescription></DialogHeader>{session ? <LiveSessionsPanel role="Teacher" sessionId={session.id} /> : <SessionScheduleForm courseId={defaultCourseId} onSaved={() => onOpenChange(false)} />}</DialogContent></Dialog>
}
