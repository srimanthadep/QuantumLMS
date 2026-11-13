import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui"
import LiveSessionsPanel from "@/components/live/LiveSessionsPanel"
export default function LiveStudioPage() {
  const { sessionId } = useParams(), navigate = useNavigate()
  return <div className="space-y-5 p-5"><Button variant="ghost" onClick={() => navigate("/teacher/live-class")}>All live classes</Button><LiveSessionsPanel role="Teacher" sessionId={sessionId} /></div>
}
