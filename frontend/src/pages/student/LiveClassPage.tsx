import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  Calendar,
  Captions,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileArchive,
  FileCode,
  FileText,
  GitBranch,
  Hand,
  Maximize2,
  MessagesSquare,
  Mic,
  Paperclip,
  Radio,
  Send,
  Sparkles,
  UploadCloud,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageHeader,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/ui"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import type { AssignmentData, StudentNavPage } from "./studentTypes"
import { formatClock } from "./studentUtils"
import { useStudentData } from "./data/StudentDataProvider"
import type { SubmissionInput } from "./data/actions"

interface LiveClassPageProps {
  onNavigate: (page: StudentNavPage) => void
  onToast: (msg: string) => void
  onSubmitAssignment?: (id: string, input: SubmissionInput) => Promise<void>
  initialSessionId?: string
}

interface ChatMessage {
  id: string
  sender: string
  avatar?: string
  isTeacher?: boolean
  isMe?: boolean
  time: string
  text: string
}

interface TranscriptLine {
  id: string
  speaker: string
  time: string
  text: string
}

function LiveElapsedClock({ initialSeconds }: { initialSeconds: number }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds)
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  return <>{formatClock(elapsedSeconds)}</>
}

export default function LiveClassPage({ onNavigate, onToast, onSubmitAssignment }: LiveClassPageProps) {
  const data = useStudentData()
  const user = data.profile
  const assignments = data.view?.assignments ?? []

  // Active Live Session details
  const session = {
    id: "ls-1",
    courseCode: "AI-401",
    courseName: "Generative AI Masterclass",
    title: "Multi-Agent Graph Orchestration with LangGraph",
    instructor: "Srimanth",
    instructorRole: "Lead AI Systems Instructor",
    instructorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    cohort: "Cohort 14 · Interactive Systems Lab",
    time: "05:00 PM - 06:30 PM",
    startTime: "17:00",
    enrolledCount: 28,
    room: "Virtual Room 104",
    topics: [
      "Cyclical Graph Memory Checkpoints",
      "Agent Supervisor Routing Patterns",
      "Tool Execution Sandboxes & Fallbacks",
      "State Reducers for In-Class Lab",
    ],
  }

  // Live Interactive States
  const [handRaised, setHandRaised] = useState(false)
  const [captionsOn, setCaptionsOn] = useState(true)
  const [muted, setMuted] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "transcript" | "assessment">("chat")

  // Chat Feed State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "c-1",
      sender: "Srimanth",
      isTeacher: true,
      time: "17:02",
      text: "Welcome everyone! Make sure you pull down the starter notebook for the LangGraph exercise.",
    },
    {
      id: "c-2",
      sender: "Aria Kapoor",
      time: "17:08",
      text: "Should we use PostgreSQL or MemorySaver for the checkpoint backend?",
    },
    {
      id: "c-3",
      sender: "Srimanth",
      isTeacher: true,
      time: "17:09",
      text: "Start with MemorySaver locally, then we will attach Postgres state persistence during the milestone assessment.",
    },
    {
      id: "c-4",
      sender: "Arjun Verma",
      time: "17:14",
      text: "The supervisor router pattern makes cyclical branching so much cleaner!",
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat on new message
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" })
  }, [chatMessages])

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!chatInput.trim()) return
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: user?.full_name || "Me",
      avatar: user?.avatar_url ?? undefined,
      isMe: true,
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      text: chatInput.trim(),
    }
    setChatMessages((prev) => [...prev, newMsg])
    setChatInput("")
  }

  // Live Transcript Stream
  const transcriptLines: TranscriptLine[] = [
    {
      id: "t-1",
      speaker: "Srimanth",
      time: "17:02",
      text: "Today we are diving into multi-agent graph orchestration using cyclical state machines.",
    },
    {
      id: "t-2",
      speaker: "Srimanth",
      time: "17:06",
      text: "Notice that conventional linear chains fail when an agent tool produces unexpected output that requires a retry loop.",
    },
    {
      id: "t-3",
      speaker: "Srimanth",
      time: "17:11",
      text: "By configuring state reducers on messages, each agent node appends its execution context without clobbering preceding agent state.",
    },
    {
      id: "t-4",
      speaker: "Srimanth",
      time: "17:18",
      text: "Take a look at the milestone assessment in the side panel. You will construct a supervisor node that routes between a researcher and coder.",
    },
    {
      id: "t-5",
      speaker: "Srimanth",
      time: "17:24",
      text: "Ensure you attach unit test assertions demonstrating that cyclical loops terminate once output validation succeeds.",
    },
  ]

  // Hand Raise Toggle
  const toggleHandRaise = () => {
    setHandRaised((prev) => {
      const next = !prev
      onToast(next ? "Hand raised! The instructor has been notified." : "Hand lowered.")
      return next
    })
  }

  // Assessment Upload State
  const activeAssignment: AssignmentData =
    assignments?.find((a) => a.courseId === session.courseCode || a.course?.includes("Generative")) ||
    assignments?.[0] || {
      id: "as-live-1",
      title: "In-Class Milestone: Cyclical Graph Checkpoint Reducer",
      course: session.courseName,
      dueDate: "Due Today · 11:59 PM",
      maxMarks: 50,
      status: "Pending",
      priority: "High",
      description:
        "Build a cyclical LangGraph state machine with checkpointer memory. Implement a supervisor routing node that stops execution after 3 failed tool retries.",
    }

  const [repoUrl, setRepoUrl] = useState("")
  const [submissionComments, setSubmissionComments] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)

  const handleFileSelect = (f: File | null) => {
    if (!f) return
    if (f.size > 50 * 1024 * 1024) {
      onToast("File is too large. Max 50 MB.")
      return
    }
    setSelectedFile(f)
  }

  const handleAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile && !repoUrl.trim()) {
      onToast("Please attach your code notebook/file or provide a repository link.")
      return
    }
    setIsSubmitting(true)
    try {
      if (onSubmitAssignment && activeAssignment) {
        await onSubmitAssignment(activeAssignment.id, {
          repoUrl: repoUrl.trim(),
          comments: submissionComments.trim(),
          file: selectedFile,
        })
      }
      setSubmittedSuccess(true)
      onToast("Milestone assessment uploaded successfully!")
    } catch (err) {
      onToast((err as Error).message || "Submission failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const crumbs = [
    { label: "Schedule", onClick: () => onNavigate("Schedule") },
    { label: "Live Classroom" },
  ]

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 pb-6">
      {/* Top Navigation Header */}
      <PageHeader
        breadcrumb={crumbs}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="live" dot className="animate-pulse">
              LIVE
            </Badge>
            <Badge tone="neutral" className="font-mono text-xs">
              {session.courseCode}
            </Badge>
            <span className="text-xs font-semibold text-muted-foreground">{session.courseName}</span>
          </div>
        }
        title={session.title}
        description={`Instructor: ${session.instructor} · Started at ${session.startTime} · Attendance tracked`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-1.5 text-xs font-medium text-success-text shadow-xs">
              <UserCheck className="h-4 w-4 text-success" />
              <span>Attendance: Marked Present</span>
              <span className="rounded bg-success/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-success-text">
                <LiveElapsedClock initialSeconds={1455} />
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground shadow-xs">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                <strong className="font-semibold tabular-nums">{session.enrolledCount}</strong> learners in room
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => onNavigate("Schedule")}
            >
              Leave Class
            </Button>
          </div>
        }
      />

      {/* Main Grid: Live Stage (Left) & Interactive Hub (Right) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Video Broadcast Stage (8 Cols) */}
        <div className="flex flex-col gap-4 lg:col-span-8">
          {/* Main Visual Stage */}
          <div className="relative isolate aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-ink-950 shadow-2xl flex flex-col justify-between p-4 sm:p-5 text-white">
            {/* Ambient Backlight Glow */}
            <div className="pointer-events-none absolute -left-20 -top-20 -z-10 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 right-0 -z-10 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

            {/* Simulated Live Instructor Screen / Code Slides */}
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-6 bg-radial from-slate-900/90 to-black pointer-events-none">
              <div className="max-w-xl text-center space-y-2 sm:space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-mono text-primary-text">
                  <FileCode className="h-3.5 w-3.5" /> LangGraph StateGraph Architecture
                </div>
                <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white">
                  Cyclical Checkpoint Reducers & Supervisor Routing
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Sharing screen: <span className="font-mono text-white">graph_orchestration_demo.ipynb</span>
                </p>
                <div className="mx-auto flex items-center justify-center gap-3 pt-1">
                  <div className="flex items-center gap-2 rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs">
                    <Avatar src={session.instructorAvatar} name={session.instructor} size="xs" />
                    <span>{session.instructor} (Presenting)</span>
                  </div>
                  <span className="flex h-2 w-2 rounded-full bg-success animate-ping" />
                </div>
              </div>
            </div>

            {/* Stage Top Bar */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
                <span className="rounded-md bg-black/60 px-2.5 py-1 text-xs font-mono tabular-nums text-white/90 backdrop-blur-sm border border-white/10">
                  <LiveElapsedClock initialSeconds={1455} />
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {handRaised && (
                  <Badge tone="warning" className="animate-bounce">
                    <Hand className="h-3 w-3 mr-1" /> Hand Raised
                  </Badge>
                )}
              </div>
            </div>

            {/* Live Subtitle Overlay - placed cleanly in lower-third */}
            <div className="relative z-10 flex flex-col items-center gap-2 mt-auto mb-2">
              <AnimatePresence>
                {captionsOn && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="max-w-lg rounded-lg bg-black/85 px-4 py-2 text-center text-xs sm:text-sm text-white/95 backdrop-blur-md border border-white/10 shadow-lg"
                  >
                    <span className="font-semibold text-primary-text">{session.instructor}: </span>
                    &ldquo;When you initialize the Checkpointer, ensure the thread ID is persisted across cycles.&rdquo;
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stage Controls Bottom Bar */}
            <div className="relative z-10 flex items-center justify-between rounded-xl bg-black/70 px-4 py-2.5 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={muted ? "Unmute audio" : "Mute audio"}
                  onClick={() => setMuted((m) => !m)}
                  className="rounded-lg p-2 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  aria-label="Toggle subtitles"
                  onClick={() => setCaptionsOn((c) => !c)}
                  className={cn(
                    "rounded-lg p-2 transition-colors",
                    captionsOn ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/15 hover:text-white",
                  )}
                >
                  <Captions className="h-4 w-4" />
                </button>
              </div>

              {/* Hand Raise Option */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={handRaised ? "secondary" : "outline"}
                  className={cn(
                    "text-xs gap-1.5",
                    handRaised
                      ? "border-warning bg-warning/20 text-warning hover:bg-warning/30"
                      : "border-white/20 text-white hover:bg-white/10",
                  )}
                  onClick={toggleHandRaise}
                  leftIcon={<Hand className="h-3.5 w-3.5" />}
                >
                  {handRaised ? "Lower Hand" : "Raise Hand"}
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-primary text-primary-foreground hover:bg-primary-hover gap-1.5"
                  onClick={() => setActiveTab("assessment")}
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Assessment Upload
                </Button>
              </div>
            </div>
          </div>

          {/* Session Overview & Covered Topics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary-text" /> In-Class Agenda & Topics Covered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {session.topics.map((t, idx) => (
                  <div key={t} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-text font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-foreground">{t}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Interactive Sidebar (Chat, Transcript, Assessment Upload) (4 Cols) */}
        <div className="flex flex-col lg:col-span-4">
          <Card className="flex flex-col h-[580px] lg:h-full lg:min-h-[560px] overflow-hidden border border-border bg-surface shadow-sm gap-0">
            {/* Tabs Header */}
            <div className="shrink-0 border-b border-border bg-surface-2 p-2">
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors",
                    activeTab === "chat"
                      ? "bg-surface text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <MessagesSquare className="h-3.5 w-3.5" />
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("transcript")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors",
                    activeTab === "transcript"
                      ? "bg-surface text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Transcript
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("assessment")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors relative",
                    activeTab === "assessment"
                      ? "bg-primary-soft text-primary-text shadow-xs border border-primary-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Upload
                  <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                </button>
              </div>
            </div>

            {/* Tab 1: Live Chat Box */}
            {activeTab === "chat" && (
              <div className="flex flex-1 flex-col min-h-0">
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[85%] rounded-xl p-3 text-xs leading-relaxed",
                        msg.isTeacher
                          ? "border border-primary-border bg-primary-soft/40 ml-0"
                          : msg.isMe
                            ? "border border-primary/20 bg-primary/10 ml-auto"
                            : "border border-border bg-surface-2 ml-0",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          {msg.sender}
                          {msg.isTeacher && (
                            <Badge tone="primary" size="sm" className="text-[9px] px-1 py-0">
                              Instructor
                            </Badge>
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{msg.time}</span>
                      </div>
                      <p className="text-foreground">{msg.text}</p>
                    </div>
                  ))}
                </div>

                {/* Chat Input Bar */}
                <form onSubmit={handleSendChat} className="shrink-0 border-t border-border p-3 flex items-center gap-2 bg-surface">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question or reply..."
                    aria-label="Send in-class chat message"
                    className="flex-1"
                  />
                  <Button size="icon-sm" type="submit" disabled={!chatInput.trim()} aria-label="Send message">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            )}

            {/* Tab 2: Live Transcript Stream */}
            {activeTab === "transcript" && (
              <div className="flex flex-1 flex-col min-h-0 p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Live Speech Transcription
                  </span>
                  <Badge tone="neutral" size="sm">
                    Whisper AI
                  </Badge>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                  {transcriptLines.map((line) => (
                    <div key={line.id} className="rounded-lg border border-border bg-surface-2 p-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{line.speaker}</span>
                        <span className="font-mono">{line.time}</span>
                      </div>
                      <p className="text-foreground leading-relaxed">{line.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Assessment Upload ("assesment upload") */}
            {activeTab === "assessment" && (
              <div className="flex flex-1 flex-col min-h-0 p-4 overflow-y-auto space-y-4">
                <div className="rounded-xl border border-primary-border bg-primary-soft/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge tone="warning" size="sm">
                      {activeAssignment.dueDate}
                    </Badge>
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      {activeAssignment.maxMarks} Marks
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground leading-snug">{activeAssignment.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{activeAssignment.description}</p>
                </div>

                {submittedSuccess ? (
                  <div className="rounded-xl border border-success/30 bg-success-soft p-5 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-foreground">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">Assessment Submitted!</h4>
                    <p className="text-xs text-muted-foreground">
                      Your solution file and notes were delivered to your instructor for evaluation.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setSubmittedSuccess(false)
                        setSelectedFile(null)
                        setRepoUrl("")
                      }}
                    >
                      Resubmit Work
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleAssessmentSubmit} className="space-y-3.5">
                    {/* Drag and Drop Upload Area */}
                    <div>
                      <span className="text-xs font-semibold text-foreground block mb-1">Upload Solution File</span>
                      <label
                        onDragOver={(e) => {
                          e.preventDefault()
                          setIsDragging(true)
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault()
                          setIsDragging(false)
                          handleFileSelect(e.dataTransfer.files?.[0] ?? null)
                        }}
                        className={cn(
                          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors",
                          isDragging
                            ? "border-primary bg-primary-soft"
                            : "border-border hover:border-primary-border bg-surface-2",
                        )}
                      >
                        <UploadCloud className="h-6 w-6 text-primary-text mb-1.5" />
                        <span className="text-xs font-semibold text-foreground">
                          {selectedFile ? selectedFile.name : "Drop .ipynb, .zip or .py"}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {selectedFile
                            ? `${(selectedFile.size / 1024).toFixed(1)} KB · Click to replace`
                            : "or click to browse from device (max 50 MB)"}
                        </span>
                        <input
                          type="file"
                          accept=".ipynb,.zip,.pdf,.py,.tar,.gz"
                          className="sr-only"
                          onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      {selectedFile && (
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground bg-surface-2 px-2.5 py-1 rounded-md">
                          <span className="truncate max-w-[200px] text-foreground font-medium">{selectedFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="text-danger hover:underline text-[11px]"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* GitHub Repo Link */}
                    <Field label="GitHub Repository (Optional)" hint="Link to public or shared repo">
                      <Input
                        leading={<GitBranch className="h-3.5 w-3.5" />}
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/you/graph-project"
                      />
                    </Field>

                    {/* Comments */}
                    <Field label="Notes for Evaluator">
                      <Textarea
                        rows={2}
                        value={submissionComments}
                        onChange={(e) => setSubmissionComments(e.target.value)}
                        placeholder="Describe your solution architecture..."
                        className="text-xs"
                      />
                    </Field>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      block
                      disabled={isSubmitting || (!selectedFile && !repoUrl.trim())}
                      loading={isSubmitting}
                      leftIcon={<UploadCloud className="h-4 w-4" />}
                    >
                      Submit In-Class Assessment
                    </Button>
                  </form>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

