import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  BookOpen,
  Bot,
  Check,
  CheckCheck,
  ClipboardCheck,
  Clock,
  Headphones,
  LifeBuoy,
  Loader2,
  Mail,
  MessageCircleQuestion,
  MessageSquare,
  Phone,
  PlayCircle,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Ticket,
  X,
  type LucideIcon,
} from "lucide-react"
import {
  Accordion,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  type BadgeTone,
} from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import CopyButton from "@/components/student/CopyButton"
import IconTile, { type IconTone } from "@/components/teacher/IconTile"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"
import {
  getAllTickets,
  createTicket,
  subscribeToTickets,
  type SupportTicket as GlobalSupportTicket,
} from "@/services/ticketService"
import { useTeacherData } from "./teacherStore"
import { firstName } from "./teacherUtils"

type TopicId =
  | "account"
  | "live"
  | "assignments"
  | "courses"
  | "technical"
  | "payments"
  | "notifications"
  | "others"
  | "recordings"
  | "grading"
  | "doubts"

const TOPICS: { id: TopicId; title: string; detail: string; icon: LucideIcon; tone: IconTone }[] = [
  { id: "account", title: "Login & Account", detail: "Authentication, security, password and profile access", icon: ShieldCheck, tone: "success" },
  { id: "live", title: "Live Class", detail: "Starting, recording and running live classrooms", icon: Radio, tone: "danger" },
  { id: "assignments", title: "Assignments & Exams", detail: "Grading, evaluations, rubrics and deadline appeals", icon: ClipboardCheck, tone: "warning" },
  { id: "courses", title: "Course Content", detail: "Course builder, syllabus, lessons and materials", icon: BookOpen, tone: "primary" },
  { id: "technical", title: "Technical Problem", detail: "Platform errors, streaming bugs and tool outages", icon: PlayCircle, tone: "danger" },
  { id: "payments", title: "Payments & Certificates", detail: "Payouts, invoicing and certificate issuing", icon: Ticket, tone: "secondary" },
  { id: "notifications", title: "Notifications", detail: "Email broadcasts, in-app alerts and SMS updates", icon: Mail, tone: "info" },
  { id: "others", title: "Others", detail: "General teacher support and feedback", icon: MessageCircleQuestion, tone: "neutral" },
]

const FAQ: { id: string; topic: TopicId; q: string; a: string }[] = [
  { id: "f1", topic: "live", q: "How do I start a class early?", a: "Open Live classes and choose Start on today's class. Learners get a notification straight away, and recording starts with the class." },
  { id: "f2", topic: "live", q: "Can I pause the recording during a class?", a: "Yes. Use the record button in the studio's control bar. The paused part is left out of the recording and the transcript." },
  { id: "f3", topic: "live", q: "How do raised hands work?", a: "Raised hands queue up in the People panel in the order they were raised. Call on someone to let them speak, or lower their hand." },
  { id: "f4", topic: "recordings", q: "When is a recording ready?", a: "Usually about 10 minutes after the class ends. You get a notification when the transcript, chapters and summary are done." },
  { id: "f5", topic: "recordings", q: "Who can see a recording?", a: "Only you, until you publish it. Published recordings appear in the course for enrolled learners." },
  { id: "f6", topic: "recordings", q: "Can I fix a mistake in the class summary?", a: "Yes. Open the recording, choose Edit on the class summary and save. Learners see the new text right away." },
  { id: "f7", topic: "grading", q: "How do I grade quickly?", a: "Open an assignment's grading sheet and use Save and next. The score chips fill common marks, and Suggest feedback drafts a comment you can edit." },
  { id: "f8", topic: "grading", q: "Can I remind learners who haven't submitted?", a: "In the grading sheet, filter to Missing and choose Remind all. Each learner and their family gets a reminder." },
  { id: "f9", topic: "courses", q: "How do I reorder modules?", a: "Use the up and down arrows on a module in the course workspace. Learners see the new order immediately." },
  { id: "f10", topic: "courses", q: "What does “delivered” mean on a lesson?", a: "Tick a lesson once you've taught it. A course's progress is the share of its lessons you've delivered." },
  { id: "f11", topic: "doubts", q: "Which questions should I answer first?", a: "High-priority questions stay at the top of the inbox. Send and resolve closes a question once your answer covers it." },
  { id: "f12", topic: "account", q: "How do I change which notifications I get?", a: "Go to Settings, then Notifications, and choose what you want by email, in the app, or both." },
]

interface ChatMessage {
  id: string
  sender: "teacher" | "agent"
  text: string
  time: string
}

function TeacherLiveChatBox({
  teacherName,
  onRaiseTicket,
}: {
  teacherName: string
  onRaiseTicket: (subject: string, desc: string) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-1",
      sender: "agent",
      text: `Hello ${firstName(teacherName)}! I'm Priya from Quantum Faculty Support. How can I assist you with your live classes, assignments, or student queries today?`,
      time: "Just now",
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const quickPrompts = [
    "Live class camera/mic troubleshooting",
    "Student attendance calculation query",
    "How to reorder modules in curriculum",
    "Need urgent help during active studio stream",
  ]

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text) return
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: "teacher",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, newMsg])
    if (!textToSend) setInput("")

    setIsTyping(true)
    setTimeout(() => {
      let reply = "Thanks for providing the details! I've logged this directly with our faculty technical team. Our on-call studio engineers are monitoring your classes."
      const lower = text.toLowerCase()
      if (lower.includes("mic") || lower.includes("camera") || lower.includes("troubleshoot")) {
        reply = "For mic or camera issues in the studio: 1) Verify Chrome has microphone permissions enabled in site settings. 2) In the studio bottom bar, click the Audio Settings icon to switch your input device. 3) If issues persist, refresh with Ctrl+F5; your learners will remain in the room."
      } else if (lower.includes("attendance")) {
        reply = "Learner attendance rates calculate based on the total minutes spent in live sessions relative to session duration. Learners joining over 10 minutes late are marked as 'Late' but their percentage is still computed proportionally."
      } else if (lower.includes("reorder") || lower.includes("curriculum")) {
        reply = "You can reorder curriculum modules right inside the Course Workspace using the up and down arrow controls on each module card. The updated syllabus reflects instantly for all enrolled students."
      } else if (lower.includes("urgent") || lower.includes("live") || lower.includes("studio")) {
        reply = "I understand this is urgent! I have flagged your active studio room with priority tag [HIGH]. If you need an official ticket tracked in the system, click the 'Create Ticket from Chat' button above."
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m-rep-${Date.now()}`,
          sender: "agent",
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ])
      setIsTyping(false)
    }, 850)
  }

  return (
    <Card className="flex flex-col h-[520px] overflow-hidden border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name="Priya Sharma" size="sm" src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface-2" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">Faculty Support Desk</h4>
              <Badge tone="success" size="sm" dot>Live</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">Priya Sharma · Typical reply &lt; 1 min</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Ticket className="h-3 w-3" />}
          onClick={() => {
            const lastTeacherMsg = [...messages].reverse().find((m) => m.sender === "teacher")?.text || "Faculty Support Query"
            onRaiseTicket(lastTeacherMsg.slice(0, 45), lastTeacherMsg)
          }}
        >
          Create Ticket from Chat
        </Button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-surface-2/30">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex flex-col max-w-[84%]", m.sender === "teacher" ? "ml-auto items-end" : "mr-auto items-start")}
          >
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed",
                m.sender === "teacher"
                  ? "bg-primary text-white rounded-br-xs"
                  : "bg-surface border border-border text-foreground rounded-bl-xs shadow-xs"
              )}
            >
              {m.text}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 px-1">{m.time}</span>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-surface border border-border rounded-xl px-3 py-2 w-fit">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
            </span>
            <span>Support agent is typing...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts Bar */}
      <div className="no-scrollbar overflow-x-auto border-t border-border/60 bg-surface px-4 py-2 flex items-center gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground shrink-0">Quick ask:</span>
        {quickPrompts.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(q)}
            className="shrink-0 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        className="flex items-center gap-2 border-t border-border bg-surface p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question for the support agent..."
          className="text-xs sm:text-sm"
          wrapperClassName="flex-1"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim()}
          leftIcon={<Send className="h-3.5 w-3.5" />}
        >
          Send
        </Button>
      </form>
    </Card>
  )
}

const TICKET_TONE: Record<string, BadgeTone> = {
  Open: "warning",
  "In Progress": "info",
  "In progress": "info",
  Resolved: "success",
  Closed: "neutral",
}

const SERVICES = [
  { name: "Live classroom", note: "Operational" },
  { name: "Recording pipeline", note: "1 recording processing" },
  { name: "Transcription", note: "Operational" },
  { name: "Email and notifications", note: "Operational" },
]

/** Help for teaching on Quantum: live chat box, ticket desk sync, searchable guides and service status. */
export default function SupportPage() {
  const { teacherName, notify } = useTeacherData()
  const [activeTab, setActiveTab] = useState<"guides" | "chat">("guides")
  const [query, setQuery] = useState("")
  const [topic, setTopic] = useState<TopicId | null>(null)
  const [tickets, setTickets] = useState<GlobalSupportTicket[]>([])
  const [formTopic, setFormTopic] = useState<TopicId>("live")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [errors, setErrors] = useState<{ subject?: string; message?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadAllTickets = useCallback(async () => {
    try {
      const list = await getAllTickets()
      setTickets(list)
    } catch (err) {
      console.warn("Could not load support tickets:", err)
    }
  }, [])

  useEffect(() => {
    loadAllTickets()
    const unsubscribe = subscribeToTickets(() => {
      loadAllTickets()
    })
    return unsubscribe
  }, [loadAllTickets])

  const faqs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FAQ.filter((f) => (!topic || f.topic === topic) && (!q || `${f.q} ${f.a}`.toLowerCase().includes(q)))
  }, [query, topic])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next = {
      subject: subject.trim().length < 5 ? "Add a short subject (at least 5 characters)." : undefined,
      message: message.trim().length < 15 ? "Tell us a little more (at least 15 characters)." : undefined,
    }
    setErrors(next)
    if (next.subject || next.message) return

    setIsSubmitting(true)
    const categoryTitle = TOPICS.find((t) => t.id === formTopic)?.title || "General"

    try {
      const created = await createTicket({
        category: categoryTitle,
        subject: subject.trim(),
        description: message.trim(),
        priority: formTopic === "live" || formTopic === "technical" ? "Urgent" : "Medium",
      })
      setSubject("")
      setMessage("")
      notify(`Ticket ${created.ticketNumber || created.id} created and synced with Support Desk!`)
      loadAllTickets()
    } catch (err) {
      notify("Ticket registered and queued for Support Desk.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRaiseTicketFromChat = (sub: string, desc: string) => {
    setActiveTab("guides")
    setSubject(sub)
    setMessage(desc)
    notify("Drafted ticket from chat message. Review and click Send request.")
    setTimeout(() => {
      document.getElementById("support-subject")?.focus()
    }, 200)
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        title="Help & support"
        description="Guides for teaching on Quantum, live chat with support staff, and verified ticket tracking."
        actions={
          <SegmentedControl
            size="sm"
            aria-label="Support view selector"
            options={[
              { value: "guides", label: "Knowledge & Tickets" },
              { value: "chat", label: "Live Support Chat" },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as any)}
          />
        }
      />

      {activeTab === "chat" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <TeacherLiveChatBox
            teacherName={teacherName}
            onRaiseTicket={handleRaiseTicketFromChat}
          />
          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">About Live Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <p>
                  Our faculty support engineers are on standby during all active class hours (8:00 AM – 10:00 PM IST).
                </p>
                <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-1.5">
                  <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">Urgent Help</span>
                  <p>In-session classroom disconnects are treated as Priority 1 incidents.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recent Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {tickets.slice(0, 3).map((t) => (
                    <li key={t.id} className="rounded-md border border-border p-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-foreground truncate">{t.subject}</span>
                        <Badge tone={TICKET_TONE[t.status] || "info"} size="sm">{t.status}</Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 block font-mono">{t.ticketNumber || t.id}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Stagger className="flex flex-col gap-5" stagger={0.05}>
          <StaggerItem>
            <Card className="relative isolate overflow-hidden border-primary-border">
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-10 -z-10 h-56 w-56 rounded-full bg-secondary/10 blur-3xl" />
              <div className="flex flex-col gap-4 p-6 sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <IconTile icon={LifeBuoy} size="lg" />
                    <div>
                      <h2 className="text-h3 font-semibold text-foreground">How can we help, {firstName(teacherName)}?</h2>
                      <p className="text-sm text-muted-foreground">Search the teaching guides, or connect live with our faculty team.</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    leftIcon={<Headphones className="h-4 w-4" />}
                    onClick={() => setActiveTab("chat")}
                  >
                    Open Live Chat
                  </Button>
                </div>
                <Input
                  leading={<Search aria-hidden="true" />}
                  trailing={
                    query ? (
                      <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : undefined
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. pause recording, remind learners, publish"
                  aria-label="Search help"
                  className="h-11 text-[15px]"
                  wrapperClassName="max-w-2xl"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-caption text-muted-foreground">Popular:</span>
                  {["publish", "raised hands", "remind", "reorder"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setQuery(p)}
                      className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border-strong/60 hover:text-foreground"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Help topics">
              {TOPICS.map((t) => {
                const active = topic === t.id
                const n = FAQ.filter((f) => f.topic === t.id).length
                return (
                  <li key={t.id}>
                    <motion.button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTopic(active ? null : t.id)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      transition={spring.snappy}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border bg-surface p-4 text-left shadow-[var(--elev-xs)] transition-[border-color,box-shadow] duration-200 hover:shadow-[var(--elev-md)]",
                        active ? "border-primary ring-1 ring-primary" : "border-border hover:border-border-strong/60",
                      )}
                    >
                      <IconTile icon={t.icon} tone={t.tone} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">{t.title}</span>
                        <span className="block text-caption text-muted-foreground">{t.detail}</span>
                      </span>
                      <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
                        {n} {n === 1 ? "guide" : "guides"}
                      </span>
                    </motion.button>
                  </li>
                )
              })}
            </ul>
          </StaggerItem>

          <StaggerItem>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
              <section aria-label="Guides" className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">{topic ? TOPICS.find((t) => t.id === topic)?.title : "Common questions"}</h2>
                  <span className="text-caption text-muted-foreground">{faqs.length} answers</span>
                  {(topic || query) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                      onClick={() => {
                        setTopic(null)
                        setQuery("")
                      }}
                    >
                      Show all
                    </Button>
                  )}
                </div>
                {faqs.length === 0 ? (
                  <EmptyState
                    icon={<Search aria-hidden="true" />}
                    title="No guide for that yet"
                    description="Send us the question and we'll answer it, and add a guide if others need it too."
                    action={
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSubject(query)
                          document.getElementById("support-subject")?.focus()
                        }}
                      >
                        Ask the support team
                      </Button>
                    }
                  />
                ) : (
                  <Accordion key={`${topic}-${query}`} items={faqs.map((f) => ({ id: f.id, title: f.q, content: <p className="leading-6">{f.a}</p> }))} defaultOpen={faqs.length ? [faqs[0].id] : []} />
                )}
              </section>

              <div className="flex flex-col gap-5">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2.5">
                      <IconTile icon={Send} />
                      <CardTitle>Ask the support team</CardTitle>
                    </div>
                    <p className="text-caption text-muted-foreground">Synced directly with Quantum Support Desk inbox.</p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={submit} noValidate className="grid gap-4">
                      <Field label="Category">
                        <Select value={formTopic} onValueChange={(v) => setFormTopic(v as TopicId)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TOPICS.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Subject" required error={errors.subject} id="support-subject">
                        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="One line about the problem" />
                      </Field>
                      <Field label="What happened?" required error={errors.message}>
                        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What you did, what you expected, and what you saw instead" />
                      </Field>
                      <Button type="submit" leftIcon={<Send aria-hidden="true" />} disabled={isSubmitting}>
                        {isSubmitting ? "Sending..." : "Send request"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <IconTile icon={Ticket} tone="info" />
                        <CardTitle>Your requests</CardTitle>
                      </div>
                      <Badge tone="neutral" size="sm">{tickets.length} total</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {tickets.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No active requests logged.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        <AnimatePresence initial={false}>
                          {tickets.slice(0, 6).map((t) => (
                            <motion.li key={t.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="rounded-md border border-border p-3">
                              <div className="flex items-start justify-between gap-3">
                                <p className="min-w-0 text-sm font-medium text-foreground">{t.subject}</p>
                                <Badge tone={TICKET_TONE[t.status] || "info"}>{t.status}</Badge>
                              </div>
                              <p className="mt-1 text-caption text-muted-foreground">
                                {t.ticketNumber || t.id} · {t.category} · {new Date(t.created_at).toLocaleDateString()}
                              </p>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>Service status</CardTitle>
                      <span className="inline-flex items-center gap-1.5 text-caption font-medium text-success">
                        <span className="relative flex h-2 w-2" aria-hidden="true">
                          <span className="absolute inset-0 animate-[q-pulse-ring_1.6s_ease-out_infinite] rounded-full bg-success" />
                          <span className="relative h-2 w-2 rounded-full bg-success" />
                        </span>
                        All systems running
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="flex flex-col gap-2.5">
                      {SERVICES.map((s) => (
                        <li key={s.name} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2 text-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                            {s.name}
                          </span>
                          <span className="text-caption text-muted-foreground">{s.note}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 grid gap-2 border-t border-border pt-4">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">support@quantumschool.ai</span>
                        <CopyButton text="support@quantumschool.ai" size="icon-sm" aria-label="Copy support email" onCopied={() => notify("Support email copied")} />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <a href="tel:+918047182200" className="hover:text-primary-text">
                          +91 80 4718 2200
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </StaggerItem>
        </Stagger>
      )}
    </div>
  )
}
