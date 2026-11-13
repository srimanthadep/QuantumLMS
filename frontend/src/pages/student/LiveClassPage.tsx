import { Button } from "@/components/ui"
import LiveSessionsPanel from "@/components/live/LiveSessionsPanel"
import type { StudentNavPage } from "./studentTypes"
import type { SubmissionInput } from "./data/actions"
export default function LiveClassPage({ onNavigate, initialSessionId }: { onNavigate: (page: StudentNavPage) => void; onToast: (msg: string) => void; onSubmitAssignment?: (id: string, input: SubmissionInput) => Promise<void>; initialSessionId?: string }) {
  return <div className="space-y-5"><Button variant="ghost" onClick={() => onNavigate("Schedule")}>Back to schedule</Button><LiveSessionsPanel role="Student" sessionId={initialSessionId} /></div>
}
