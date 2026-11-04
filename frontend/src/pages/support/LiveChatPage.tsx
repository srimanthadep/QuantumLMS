import { useState, useRef, useEffect } from "react"
import {
  ArrowRight,
  Bot,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Headphones,
  Paperclip,
  Radio,
  Search,
  Send,
  Sparkles,
  User,
} from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui"
import { Student360Drawer } from "@/components/shared/Student360Drawer"
import { useChannel, useWsStatus, ws } from "@/lib/ws"
import { cn } from "@/lib/utils"

interface LiveChatPageProps {
  onToast?: (msg: string) => void
}

interface ChatMessage {
  id: string
  sender: "student" | "agent" | "system"
  senderName: string
  text: string
  time: string
}

interface ChatSession {
  id: string
  studentId: string
  studentName: string
  email: string
  courseTitle: string
  batchName: string
  unreadCount: number
  status: "active" | "waiting" | "closed"
  lastMessage: string
  lastTime: string
  messages: ChatMessage[]
}

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "chat-1",
    studentId: "usr-student-1",
    studentName: "Arjun Mehta",
    email: "arjun.m@learner.ai",
    courseTitle: "Full-Stack AI & LLM Systems",
    batchName: "Cohort 7 (Live + Replay)",
    unreadCount: 1,
    status: "active",
    lastMessage: "I'm encountering an issue running the Docker container for Module 4.",
    lastTime: "Just now",
    messages: [
      {
        id: "m-1",
        sender: "student",
        senderName: "Arjun Mehta",
        text: "Hi support team! I'm encountering an issue running the Docker container for Module 4. It says port 8000 is already in use.",
        time: "11:42 AM",
      },
      {
        id: "m-2",
        sender: "agent",
        senderName: "Support Team",
        text: "Hello Arjun! Let's check which process is occupying port 8000. Try running `lsof -i :8000` or `netstat -ano | findstr :8000` to locate it.",
        time: "11:43 AM",
      },
      {
        id: "m-3",
        sender: "student",
        senderName: "Arjun Mehta",
        text: "I'm running Windows. Let me run `netstat` right away.",
        time: "11:44 AM",
      },
    ],
  },
  {
    id: "chat-2",
    studentId: "usr-student-2",
    studentName: "Pooja Hegde",
    email: "pooja.h@example.com",
    courseTitle: "Autonomous Multi-Agent Architectures",
    batchName: "Agentic Systems Bootcamp",
    unreadCount: 0,
    status: "waiting",
    lastMessage: "Can someone verify my rubric evaluation appeal status?",
    lastTime: "5m ago",
    messages: [
      {
        id: "p-1",
        sender: "student",
        senderName: "Pooja Hegde",
        text: "Can someone verify my rubric evaluation appeal status? It was submitted 2 days ago.",
        time: "11:38 AM",
      },
    ],
  },
  {
    id: "chat-3",
    studentId: "usr-student-3",
    studentName: "Rohan Sharma",
    email: "rohan.s@learner.ai",
    courseTitle: "Advanced ML Pipelines & LLMOps",
    batchName: "Cohort 6 (Evening)",
    unreadCount: 0,
    status: "closed",
    lastMessage: "Thank you, that solved the environment variable issue!",
    lastTime: "1h ago",
    messages: [
      {
        id: "r-1",
        sender: "student",
        senderName: "Rohan Sharma",
        text: "Thank you, that solved the environment variable issue!",
        time: "10:30 AM",
      },
    ],
  },
]

export default function LiveChatPage({ onToast }: LiveChatPageProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_SESSIONS)
  const [selectedSessionId, setSelectedSessionId] = useState<string>("chat-1")
  const [tabFilter, setTabFilter] = useState<"all" | "active" | "waiting">("all")
  const [inputText, setInputText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isStudent360Open, setIsStudent360Open] = useState(false)
  const wsStatus = useWsStatus()

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0]

  // Real-time WebSocket channel subscription for current chat session
  useChannel(currentSession ? `chat:${currentSession.id}` : null, (event, payload) => {
    if (event === "message" && payload && payload.id) {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSession.id) {
            if (s.messages.some((m) => m.id === payload.id)) return s
            return {
              ...s,
              lastMessage: payload.text,
              lastTime: "Just now",
              messages: [...s.messages, payload],
            }
          }
          return s
        }),
      )
    } else if (event === "resolved") {
      setSessions((prev) =>
        prev.map((s) => (s.id === currentSession.id ? { ...s, status: "closed" } : s)),
      )
    }
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentSession?.messages?.length])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !currentSession) return

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "agent",
      senderName: "Support Team",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentSession.id) {
          return {
            ...s,
            lastMessage: newMsg.text,
            lastTime: "Just now",
            messages: [...s.messages, newMsg],
          }
        }
        return s
      }),
    )

    // Publish to WebSocket room for instant delivery
    ws.publish(`chat:${currentSession.id}`, "message", newMsg, {
      id: "agent-support",
      name: "Support Desk",
      role: "Support",
    })

    setInputText("")
  }

  const handleResolveSession = () => {
    if (!currentSession) return
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSession.id ? { ...s, status: "closed" } : s)),
    )
    ws.publish(`chat:${currentSession.id}`, "resolved", { sessionId: currentSession.id })
    onToast?.(`Chat session with ${currentSession.studentName} marked as resolved.`)
  }

  const filteredSessions = sessions.filter((s) => {
    if (tabFilter === "active" && s.status !== "active") return false
    if (tabFilter === "waiting" && s.status !== "waiting") return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      return (
        s.studentName.toLowerCase().includes(q) ||
        s.courseTitle.toLowerCase().includes(q) ||
        s.lastMessage.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Live Support Desk"
        description="Real-time interactive messaging with enrolled learners across active cohorts."
        breadcrumb={[{ label: "Support", href: "/support" }, { label: "Live Chat" }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={wsStatus === "connected" ? "live" : "warning"} dot>
              {wsStatus === "connected" ? "Live Gateway Active" : "Connecting..."}
            </Badge>
          </div>
        }
      />

      {/* Main Two-Pane Chat Container */}
      <Card className="flex flex-col h-[700px] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 h-full min-h-0 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Left Sessions Sidebar (4 cols) */}
          <div className="md:col-span-4 flex flex-col h-full min-h-0 bg-surface">
            {/* Search & Tabs */}
            <div className="p-3 border-b border-border space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search live sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1 text-xs">
                {(["all", "active", "waiting"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTabFilter(tab)}
                    className={cn(
                      "rounded py-1 font-medium capitalize transition-colors cursor-pointer",
                      tabFilter === tab
                        ? "bg-surface text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {filteredSessions.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No active chats match your query.
                </div>
              ) : (
                filteredSessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSessionId(s.id)}
                    className={cn(
                      "w-full text-left p-3.5 transition-colors flex items-start gap-3 cursor-pointer",
                      selectedSessionId === s.id
                        ? "bg-primary-soft/40 border-l-2 border-primary"
                        : "hover:bg-surface-2",
                    )}
                  >
                    <Avatar name={s.studentName} className="h-9 w-9 shrink-0 border border-border" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="font-semibold text-foreground truncate">
                          {s.studentName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{s.lastTime}</span>
                      </div>
                      <p className="text-[11px] text-primary-text font-medium truncate">
                        {s.courseTitle}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {s.lastMessage}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Conversation Pane (8 cols) */}
          <div className="md:col-span-8 flex flex-col h-full min-h-0 bg-surface">
            {currentSession ? (
              <>
                {/* Active Chat Header */}
                <div className="p-3.5 border-b border-border flex items-center justify-between bg-surface-2/40 shrink-0">
                  <div className="flex items-center gap-3">
                    <Avatar name={currentSession.studentName} className="h-9 w-9" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {currentSession.studentName}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {currentSession.batchName} · {currentSession.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => setIsStudent360Open(true)}
                    >
                      Student 360°
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={handleResolveSession}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-success" />
                      Resolve Chat
                    </Button>
                  </div>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="text-center py-2">
                    <span className="rounded-full bg-surface-2 px-3 py-1 text-[11px] text-muted-foreground border border-border">
                      Chat session opened · SLA Target: Immediate
                    </span>
                  </div>

                  {currentSession.messages.map((msg) => {
                    const isAgent = msg.sender === "agent"
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex flex-col", isAgent ? "items-end" : "items-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg p-3 text-xs sm:text-sm space-y-1 shadow-xs",
                            isAgent
                              ? "bg-primary text-primary-foreground"
                              : "bg-surface-2 text-foreground border border-border",
                          )}
                        >
                          <div
                            className={cn(
                              "text-[10px] font-medium flex items-center justify-between gap-3",
                              isAgent ? "text-primary-foreground/80" : "text-muted-foreground",
                            )}
                          >
                            <span>{msg.senderName}</span>
                            <span>{msg.time}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Composer */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-border bg-surface flex items-center gap-2 shrink-0"
                >
                  <Input
                    placeholder="Type your message to the student..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 text-xs sm:text-sm"
                  />
                  <Button type="submit" size="sm" disabled={!inputText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <EmptyState
                  icon={<Headphones className="h-5 w-5" />}
                  title="No conversation selected"
                  description="Choose a student session from the left queue to begin live assistance."
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Student 360 Drawer */}
      {currentSession && (
        <Student360Drawer
          open={isStudent360Open}
          onOpenChange={setIsStudent360Open}
          studentId={currentSession.studentId}
        />
      )}
    </div>
  )
}
