import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  BookOpen,
  ClipboardCheck,
  LifeBuoy,
  Mail,
  MessageCircleQuestion,
  Phone,
  PlayCircle,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Ticket,
  X,
  type LucideIcon,
} from "lucide-react"
import {
  Accordion,
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
import { useTeacherData } from "./teacherStore"
import { firstName } from "./teacherUtils"

type TopicId = "live" | "recordings" | "grading" | "courses" | "doubts" | "account"

const TOPICS: { id: TopicId; title: string; detail: string; icon: LucideIcon; tone: IconTone }[] = [
  { id: "live", title: "Live classes", detail: "Starting, recording and running the room", icon: Radio, tone: "danger" },
  { id: "recordings", title: "Recordings", detail: "Chapters, transcripts and publishing", icon: PlayCircle, tone: "secondary" },
  { id: "grading", title: "Grading", detail: "Scores, feedback and reminders", icon: ClipboardCheck, tone: "warning" },
  { id: "courses", title: "Course builder", detail: "Modules, lessons and materials", icon: BookOpen, tone: "primary" },
  { id: "doubts", title: "Doubts", detail: "Answering and resolving questions", icon: MessageCircleQuestion, tone: "info" },
  { id: "account", title: "Account", detail: "Notifications, security and privacy", icon: ShieldCheck, tone: "success" },
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

interface SupportTicket {
  id: string
  subject: string
  topic: TopicId
  status: "Open" | "In progress" | "Resolved"
  updated: string
}

const TICKET_KEY = "quantum_teacher_support_tickets_v2"
const SEED_TICKETS: SupportTicket[] = [
  { id: "TCK-2041", subject: "Recording audio drifts out of sync after 40 minutes", topic: "recordings", status: "In progress", updated: "Updated 2 hours ago" },
  { id: "TCK-1987", subject: "Import marks from a spreadsheet", topic: "grading", status: "Resolved", updated: "Resolved 15 Oct" },
]
const TICKET_TONE: Record<SupportTicket["status"], BadgeTone> = { Open: "warning", "In progress": "info", Resolved: "success" }

const SERVICES = [
  { name: "Live classroom", note: "Operational" },
  { name: "Recording pipeline", note: "1 recording processing" },
  { name: "Transcription", note: "Operational" },
  { name: "Email and notifications", note: "Operational" },
]

function loadTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(TICKET_KEY)
    if (raw) return JSON.parse(raw) as SupportTicket[]
  } catch {
    // fall back to the seed tickets
  }
  return SEED_TICKETS
}

/** Help for teaching on Quantum: searchable guides, a request form and service status. */
export default function SupportPage() {
  const { teacherName, notify } = useTeacherData()
  const [query, setQuery] = useState("")
  const [topic, setTopic] = useState<TopicId | null>(null)
  const [tickets, setTickets] = useState<SupportTicket[]>(loadTickets)
  const [formTopic, setFormTopic] = useState<TopicId>("live")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [priority, setPriority] = useState<"low" | "normal" | "urgent">("normal")
  const [errors, setErrors] = useState<{ subject?: string; message?: string }>({})

  useEffect(() => {
    try {
      localStorage.setItem(TICKET_KEY, JSON.stringify(tickets))
    } catch {
      // storage unavailable
    }
  }, [tickets])

  const faqs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FAQ.filter((f) => (!topic || f.topic === topic) && (!q || `${f.q} ${f.a}`.toLowerCase().includes(q)))
  }, [query, topic])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = {
      subject: subject.trim().length < 6 ? "Add a short subject (at least 6 characters)." : undefined,
      message: message.trim().length < 20 ? "Tell us a little more (at least 20 characters)." : undefined,
    }
    setErrors(next)
    if (next.subject || next.message) return
    const id = `TCK-${2042 + tickets.length}`
    setTickets((list) => [{ id, subject: subject.trim(), topic: formTopic, status: "Open", updated: "Sent just now" }, ...list])
    setSubject("")
    setMessage("")
    setPriority("normal")
    notify(priority === "urgent" ? `Request ${id} sent. Urgent requests get a reply within 30 minutes.` : `Request ${id} sent. We usually reply within 2 hours.`)
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader title="Help & support" description="Guides for teaching on Quantum, or a direct line to our team." />

      <Stagger className="flex flex-col gap-5" stagger={0.05}>
        <StaggerItem>
          <Card className="relative isolate overflow-hidden border-primary-border">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-10 -z-10 h-56 w-56 rounded-full bg-secondary/10 blur-3xl" />
            <div className="flex flex-col gap-4 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <IconTile icon={LifeBuoy} size="lg" />
                <div>
                  <h2 className="text-h3 font-semibold text-foreground">How can we help, {firstName(teacherName)}?</h2>
                  <p className="text-sm text-muted-foreground">Search the teaching guides, or pick a topic below.</p>
                </div>
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
                  <p className="text-caption text-muted-foreground">We reply within 2 hours, 8 AM to 8 PM, Monday to Saturday.</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submit} noValidate className="grid gap-4">
                    <Field label="Topic">
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
                    <div className="grid gap-1.5">
                      <span className="text-sm font-medium text-foreground">Priority</span>
                      <span className="-mt-1 text-caption text-muted-foreground">Choose Urgent only if a class can't go ahead.</span>
                      <SegmentedControl
                        aria-label="Priority"
                        block
                        options={[
                          { value: "low" as const, label: "Low" },
                          { value: "normal" as const, label: "Normal" },
                          { value: "urgent" as const, label: "Urgent" },
                        ]}
                        value={priority}
                        onChange={setPriority}
                      />
                    </div>
                    <Button type="submit" leftIcon={<Send aria-hidden="true" />}>
                      Send request
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5">
                    <IconTile icon={Ticket} tone="info" />
                    <CardTitle>Your requests</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-2">
                    <AnimatePresence initial={false}>
                      {tickets.map((t) => (
                        <motion.li key={t.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="rounded-md border border-border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 text-sm font-medium text-foreground">{t.subject}</p>
                            <Badge tone={TICKET_TONE[t.status]}>{t.status}</Badge>
                          </div>
                          <p className="mt-1 text-caption text-muted-foreground">
                            {t.id} · {TOPICS.find((x) => x.id === t.topic)?.title} · {t.updated}
                          </p>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
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
    </div>
  )
}
