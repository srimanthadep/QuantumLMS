import { useParams } from "react-router-dom"
import RecordingLibrary from "@/components/live/RecordingLibrary"
export default function RecordingReviewPage() { const { recordingId } = useParams(); return <RecordingLibrary role="Teacher" recordingId={recordingId} /> }
