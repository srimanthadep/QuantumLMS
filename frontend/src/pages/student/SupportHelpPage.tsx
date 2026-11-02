import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Headphones,
  LifeBuoy,
  Mail,
  MessageSquare,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Ticket,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import { useSession } from "@/app/session"
import {
  Accordion,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/ui"
import CopyButton from "@/components/student/CopyButton"
import type { FaqItem, StudentNavPage, SupportTicket, TicketCategory, TicketPriority, TicketReply, TicketStatus } from "./studentTypes"
import { useStudentData, useStudentResource } from "./data/StudentDataProvider"
import {
  attachmentUrl,
  createTicket,
  loadChat,
  loadSupport,
  MAX_TICKET_FILE_BYTES,
  replyToTicket,
  sendChat,
  setTicketStatus,
  toTicket,
  voteFaq,
  type ChatRow,
  type NewTicket,
  type SupportData,
} from "./data/support"

interface SupportHelpPageProps {
  onToast: (msg: string) => void
  onOpenAiModal: () => void
  onNavigate: (page: StudentNavPage, courseId?: string) => void
}

const FAQ_CATEGORIES = ["All", "Getting Started", "Courses & Labs", "Submissions & Quizzes", "Attendance & Leaves", "Technical"] as const
const TICKET_CATEGORIES: TicketCategory[] = [
  "Login & Account",
  "Live Class",
  "Assignments & Exams",
  "Course Content",
  "Technical Problem",
  "Payments & Certificates",
  "Notifications",
  "Others",
]
const PRIORITIES: TicketPriority[] = ["Low", "Medium", "High", "Urgent"]
const STATUS_TONE: Record<TicketStatus, "warning" | "info" | "success" | "neutral"> = { Open: "warning", "In Progress": "info", Resolved: "success", Closed: "neutral" }
const PRIORITY_TONE: Record<TicketPriority, "neutral" | "info" | "warning" | "danger"> = { Low: "neutral", Medium: "info", High: "warning", Urgent: "danger" }
const POPULAR = ["Submit assignment", "Attendance", "GPU cluster", "Transcript", "Mentor"]

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (q.length < 2) return <>{text}</>
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-warning-soft px-0.5 text-foreground">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

export default function SupportHelpPage({ onToast, onOpenAiModal, onNavigate }: SupportHelpPageProps) {
  const { user } = useSession()
  const { uid, refresh } = useStudentData()
  const res = useStudentResource<SupportData>("support", loadSupport, 60_000)
  const [tab, setTab] = useState("help")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<(typeof FAQ_CATEGORIES)[number]>("All")
  const [openTicket, setOpenTicket] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const votes = res.data?.votes ?? {}
  const tickets = useMemo(() => res.data?.tickets ?? [], [res.data])
  const { mutate } = res

  const faqs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (res.data?.faqs ?? []).filter((f) => (category === "All" || f.category === category) && (!q || `${f.question} ${f.answer}`.toLowerCase().includes(q)))
  }, [res.data, query, category])
  const activeTickets = tickets.filter((t) => t.status === "Open" || t.status === "In Progress").length
  const current = tickets.find((t) => t.id === openTicket) ?? null

  const vote = (f: FaqItem, v: "up" | "down") => {
    const before = votes[f.id]
    mutate((d) => ({ ...d, votes: { ...d.votes, [f.id]: v } }))
    voteFaq(f.id, v)
      .then(() => onToast(v === "up" ? "Thanks! Glad that helped." : "Thanks for the feedback. Raise a ticket if you still need help."))
      .catch((e: Error) => {
        mutate((d) => {
          const next = { ...d.votes }
          if (before) next[f.id] = before
          else delete next[f.id]
          return { ...d, votes: next }
        })
        onToast(`Couldn't save your feedback: ${e.message}`)
      })
  }

  const updateTicket = (id: string, fn: (t: SupportTicket) => SupportTicket) => mutate((d) => ({ ...d, tickets: d.tickets.map((t) => (t.id === id ? fn(t) : t)) }))

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Help center"
        title="Support"
        description="Find answers, chat with the learner success team or raise a ticket."
        actions={
          <Button leftIcon={<Plus aria-hidden="true" />} onClick={() => setCreating(true)}>
            New ticket
          </Button>
        }
      />

      <Card className="relative mb-5 overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <CardContent className="relative pt-6">
          <h2 className="text-h3 text-foreground">How can we help?</h2>
          <Input
            aria-label="Search help articles"
            placeholder="Search for submissions, attendance, GPU access…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setTab("help")
            }}
            leading={<Search aria-hidden="true" />}
            trailing={
              query ? (
                <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="flex rounded p-0.5 hover:text-foreground">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null
            }
            className="h-11 text-[15px]"
            wrapperClassName="mt-4 max-w-2xl"
          />
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-caption text-muted-foreground">Popular:</span>
            {POPULAR.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setQuery(p.split(" ")[0])
                  setCategory("All")
                  setTab("help")
                }}
                className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-caption font-medium text-muted-foreground transition-colors hover:border-primary-border hover:text-primary-text"
              >
                {p}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ChannelCard
          icon={Headphones}
          tile="bg-success-soft text-success ring-success/20"
          title="Live chat"
          meta={
            <Badge tone="success" dot>
              Online · ~2 min
            </Badge>
          }
          description="Talk to the learner success team now."
          action={
            <Button variant="secondary" size="sm" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => setChatOpen(true)}>
              Start chat
            </Button>
          }
        />
        <ChannelCard
          icon={Mail}
          tile="bg-info-soft text-info ring-info/20"
          title="Email"
          meta={<Badge tone="neutral">Replies within 24 h</Badge>}
          description="support@quantumschool.ai"
          action={<CopyButton text="support@quantumschool.ai" label="Copy address" variant="secondary" onCopied={() => onToast("Email address copied")} />}
        />
        <ChannelCard
          icon={Sparkles}
          tile="bg-primary-soft text-primary-text ring-primary-border"
          title="AI assistant"
          meta={<Badge tone="primary">Instant · 24/7</Badge>}
          description="Get answers about your courses and the platform."
          action={
            <Button variant="secondary" size="sm" rightIcon={<ArrowRight aria-hidden="true" />} onClick={onOpenAiModal}>
              Ask a question
            </Button>
          }
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Support sections">
          <TabsTrigger value="help">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Help articles
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <Ticket className="h-4 w-4" aria-hidden="true" />
            My tickets
            {activeTickets > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">{activeTickets}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="help" className="mt-5">
          <div className="no-scrollbar mb-4 overflow-x-auto">
            <SegmentedControl size="sm" aria-label="Article category" options={FAQ_CATEGORIES.map((c) => ({ value: c, label: c }))} value={category} onChange={setCategory} />
          </div>
          {res.error && !res.data ? (
            <EmptyState
              icon={<LifeBuoy aria-hidden="true" />}
              title="Help articles didn't load"
              description={res.error.message}
              action={
                <Button size="sm" variant="secondary" onClick={() => void res.reload()}>
                  Try again
                </Button>
              }
            />
          ) : !res.data ? (
            <div className="grid gap-2" role="status" aria-label="Loading help articles">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : faqs.length === 0 ? (
            <EmptyState
              icon={<LifeBuoy aria-hidden="true" />}
              title="No articles match"
              description="Try different words, or raise a ticket and we'll help directly."
              action={
                <Button size="sm" onClick={() => setCreating(true)}>
                  Raise a ticket
                </Button>
              }
            />
          ) : (
            <Accordion
              key={`${category}-${query.trim().length >= 2 ? query : ""}`}
              defaultOpen={query.trim().length >= 2 && faqs[0] ? [faqs[0].id] : []}
              items={faqs.map((f) => ({
                id: f.id,
                title: <Highlight text={f.question} query={query} />,
                meta: <span className="hidden sm:inline">{f.category}</span>,
                content: (
                  <div className="grid gap-3">
                    <p className="leading-6">
                      <Highlight text={f.answer} query={query} />
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {f.linkTarget && (
                        <Button variant="link" size="sm" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => onNavigate(f.linkTarget!)}>
                          {(f.linkLabel ?? "Open").replace(/\s*→\s*$/, "")}
                        </Button>
                      )}
                      <div className="flex items-center gap-1 text-caption text-muted-foreground">
                        Was this helpful?
                        {(["up", "down"] as const).map((v) => {
                          const active = votes[f.id] === v
                          const Icon = v === "up" ? ThumbsUp : ThumbsDown
                          return (
                            <motion.button
                              key={v}
                              type="button"
                              aria-pressed={active}
                              aria-label={v === "up" ? "Yes" : "No"}
                              onClick={() => vote(f, v)}
                              whileTap={{ scale: 0.85 }}
                              transition={spring.snappy}
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                                active ? (v === "up" ? "bg-success-soft text-success" : "bg-danger-soft text-danger") : "hover:bg-surface-2 hover:text-foreground",
                              )}
                            >
                              <Icon className={cn("h-3.5 w-3.5", active && "fill-current")} aria-hidden="true" />
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ),
              }))}
            />
          )}
        </TabsContent>

        <TabsContent value="tickets" className="mt-5">
          {!res.data ? (
            <div className="grid gap-2" role="status" aria-label="Loading tickets">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={<Ticket aria-hidden="true" />}
              title="No tickets"
              description="Raised tickets appear here."
              action={
                <Button size="sm" onClick={() => setCreating(true)}>
                  Raise a ticket
                </Button>
              }
            />
          ) : (
            <motion.ul layout className="overflow-hidden rounded-lg border border-border bg-surface">
              <AnimatePresence initial={false}>
                {tickets.map((t) => (
                  <motion.li key={t.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={transition.base} className="border-b border-border last:border-b-0">
                    <button type="button" onClick={() => setOpenTicket(t.id)} className="flex w-full flex-col gap-2 px-4 py-4 text-left transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-caption text-muted-foreground">{t.id}</span>
                          <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                          <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                        </div>
                        <p className="mt-1.5 truncate text-sm font-medium text-foreground">{t.subject}</p>
                        <p className="truncate text-caption text-muted-foreground">
                          {t.category} · updated {t.lastUpdate}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1.5 text-caption text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                        {t.replies.length}
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </span>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </TabsContent>
      </Tabs>

      <TicketSheet
        ticket={current}
        userName={user.name}
        userAvatar={user.avatar}
        onClose={() => setOpenTicket(null)}
        onReply={async (text) => {
          if (!current) return
          const reply = await replyToTicket(uid, current.id, text)
          updateTicket(current.id, (t) => ({ ...t, replies: [...t.replies, reply], lastUpdate: "Just now by You", status: t.status === "Resolved" || t.status === "Closed" ? "Open" : t.status }))
          onToast("Reply sent to the support team")
        }}
        onStatus={async (status) => {
          if (!current) return
          try {
            const row = await setTicketStatus(current.id, status)
            updateTicket(current.id, (t) => ({ ...toTicket(row, []), replies: t.replies }))
            onToast(status === "Resolved" ? "Ticket marked as resolved" : "Ticket reopened")
          } catch (e) {
            onToast(`Couldn't update the ticket: ${(e as Error).message}`)
          }
        }}
        onOpenAttachment={(path) =>
          attachmentUrl(path)
            .then((url) => window.open(url, "_blank", "noopener,noreferrer"))
            .catch((e: Error) => onToast(e.message))
        }
      />

      <NewTicketDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (t) => {
          const ticket = await createTicket(uid, t)
          mutate((d) => ({ ...d, tickets: [ticket, ...d.tickets] }))
          refresh("notifications")
          setCreating(false)
          setTab("tickets")
          onToast(`Ticket ${ticket.id} created. We'll reply soon.`)
        }}
      />

      <LiveChat open={chatOpen} onClose={() => setChatOpen(false)} userName={user.name} userAvatar={user.avatar} />
    </div>
  )
}

function ChannelCard({
  icon: Icon,
  tile,
  title,
  meta,
  description,
  action,
}: {
  icon: typeof Mail
  tile: string
  title: string
  meta: React.ReactNode
  description: string
  action: React.ReactNode
}) {
  return (
    <Card className="flex flex-col gap-3 p-5 transition-[border-color,box-shadow] duration-200 hover:border-border-strong/60 hover:shadow-[var(--elev-md)]">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-md ring-1 ring-inset", tile)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {meta}
      </div>
      <div>
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-auto">{action}</div>
    </Card>
  )
}

function TicketSheet({
  ticket,
  userName,
  userAvatar,
  onClose,
  onReply,
  onStatus,
  onOpenAttachment,
}: {
  ticket: SupportTicket | null
  userName: string
  userAvatar?: string
  onClose: () => void
  onReply: (text: string) => Promise<void>
  onStatus: (s: TicketStatus) => Promise<void>
  onOpenAttachment: (path: string) => void
}) {
  const last = useRef<SupportTicket | null>(null)
  if (ticket) last.current = ticket
  const t = ticket ?? last.current
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [t?.replies.length])
  useEffect(() => {
    setError(null)
    setReply("")
  }, [ticket?.id])

  const send = async () => {
    const text = reply.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    try {
      await onReply(text)
      setReply("")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }
  const status = async (s: TicketStatus) => {
    setUpdating(true)
    try {
      await onStatus(s)
    } finally {
      setUpdating(false)
    }
  }
  const closed = t?.status === "Resolved" || t?.status === "Closed"

  return (
    <Sheet open={!!ticket} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        {t && (
          <>
            <SheetHeader className="border-b border-border p-6">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-caption text-muted-foreground">{t.id}</span>
                <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
              </div>
              <SheetTitle className="mt-1 leading-7">{t.subject}</SheetTitle>
              <SheetDescription>
                {t.category} · opened {t.createdDate}
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <ol className="relative grid gap-5 border-l border-border pl-5">
                {t.replies.map((r) => {
                  const mine = r.role === "Student"
                  return (
                    <motion.li key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={transition.base} className="relative">
                      <span className="absolute -left-[33px] top-0">
                        <Avatar src={mine ? (userAvatar ?? r.avatar) : r.avatar} name={mine ? userName : r.author} size="sm" className="ring-4 ring-surface" />
                      </span>
                      <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
                        <span className="font-semibold text-foreground">{mine ? userName : r.author}</span>
                        {!mine && <Badge tone={r.role === "Faculty" ? "primary" : "info"} size="sm">{r.role}</Badge>}
                        <span className="text-caption text-subtle-foreground">{r.timestamp}</span>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{r.content}</p>
                      {r.attachmentName &&
                        (r.attachmentPath ? (
                          <button
                            type="button"
                            onClick={() => onOpenAttachment(r.attachmentPath!)}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1 text-caption text-foreground transition-colors hover:border-primary-border"
                          >
                            <Paperclip className="h-3 w-3" aria-hidden="true" /> {r.attachmentName}
                          </button>
                        ) : (
                          <span className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1 text-caption text-foreground">
                            <Paperclip className="h-3 w-3" aria-hidden="true" /> {r.attachmentName}
                          </span>
                        ))}
                    </motion.li>
                  )
                })}
              </ol>
              {t.resolutionNotes && closed && (
                <div className="mt-6 rounded-md border border-success/30 bg-success-soft p-3">
                  <p className="flex items-center gap-1.5 text-caption font-semibold text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Resolution
                  </p>
                  <p className="mt-1 text-sm leading-6 text-foreground">{t.resolutionNotes}</p>
                </div>
              )}
              <div ref={end} />
            </div>
            <div className="grid gap-3 border-t border-border p-4">
              <Textarea
                aria-label="Reply to support"
                placeholder={closed ? "Replying reopens this ticket…" : "Write a reply…"}
                value={reply}
                maxLength={5000}
                disabled={sending}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void send()
                }}
                className="min-h-[72px]"
              />
              {error && (
                <p role="alert" className="text-caption font-medium text-danger">
                  {error}
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                {closed ? (
                  <Button variant="ghost" size="sm" leftIcon={<RotateCcw aria-hidden="true" />} loading={updating} onClick={() => void status("Open")}>
                    Reopen
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" leftIcon={<CheckCircle2 aria-hidden="true" />} loading={updating} onClick={() => void status("Resolved")}>
                    Mark resolved
                  </Button>
                )}
                <Button size="sm" leftIcon={<Send aria-hidden="true" />} onClick={() => void send()} disabled={!reply.trim()} loading={sending}>
                  Send reply
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function NewTicketDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (t: NewTicket) => Promise<void> }) {
  const [category, setCategory] = useState<TicketCategory>(TICKET_CATEGORIES[0])
  const [priority, setPriority] = useState<TicketPriority>("Medium")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<{ subject?: string; description?: string; form?: string }>({})
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    setCategory(TICKET_CATEGORIES[0])
    setPriority("Medium")
    setSubject("")
    setDescription("")
    setFile(null)
    setErrors({})
    setSending(false)
  }, [open])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending) return
    const next = {
      subject: subject.trim().length < 8 ? "Summarise the issue in at least 8 characters." : undefined,
      description: description.trim().length < 20 ? "Describe what happened in at least 20 characters." : undefined,
    }
    setErrors(next)
    if (next.subject || next.description) return
    setSending(true)
    try {
      await onCreate({ category, priority, subject: subject.trim(), description: description.trim(), file })
    } catch (err) {
      setErrors({ form: (err as Error).message })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !sending && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Raise a support ticket</DialogTitle>
            <DialogDescription>Most tickets get a first reply within a few hours.</DialogDescription>
          </DialogHeader>
          <Field label="Category">
            <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          
          <Field label="Subject" required error={errors.subject}>
            <Input value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Can't access the GPU cluster" />
          </Field>
          <Field label="Description" required error={errors.description}>
            <Textarea value={description} maxLength={5000} onChange={(e) => setDescription(e.target.value)} placeholder="What happened, what you expected, and any error messages" className="min-h-[110px]" />
          </Field>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {file ? "Change file" : "Attach a file"}
              <input
                type="file"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  e.target.value = ""
                  if (f && f.size > MAX_TICKET_FILE_BYTES) {
                    setErrors((x) => ({ ...x, form: `${f.name} is larger than 10 MB.` }))
                    return
                  }
                  setErrors((x) => ({ ...x, form: undefined }))
                  setFile(f)
                }}
              />
            </label>
            {file && (
              <span className="flex min-w-0 items-center gap-1 text-caption text-muted-foreground">
                <span className="truncate">{file.name}</span>
                <button type="button" aria-label="Remove attachment" onClick={() => setFile(null)} className="flex rounded p-0.5 hover:text-foreground">
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
          {errors.form && (
            <p role="alert" className="text-caption font-medium text-danger">
              {errors.form}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" leftIcon={<Send aria-hidden="true" />} loading={sending}>
              Submit ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ChatMessage {
  id: string
  from: "agent" | "me"
  text: string
  failed?: boolean
}

const toMessage = (r: ChatRow): ChatMessage => ({ id: String(r.id), from: r.sender === "agent" ? "agent" : "me", text: r.body })

/** Learner Success chat. The conversation is stored with the student; replies come from the backend. */
function LiveChat({ open, onClose, userName, userAvatar }: { open: boolean; onClose: () => void; userName: string; userAvatar?: string }) {
  const chat = useStudentResource<ChatRow[]>(open ? "chat" : null, loadChat, 30_000)
  const greeting: ChatMessage = { id: "greeting", from: "agent", text: `Hi ${userName.split(" ")[0]}! I'm Neha from Learner Success. What can I help you with today?` }
  const [pending, setPending] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [typing, setTyping] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const messages = [greeting, ...(chat.data ?? []).map(toMessage), ...pending]

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length, typing])
  useEffect(() => () => clearTimeout(timer.current), [])

  const send = async () => {
    const text = draft.trim()
    if (!text || typing) return
    const temp: ChatMessage = { id: `pending-${Date.now()}`, from: "me", text }
    setPending((p) => [...p, temp])
    setDraft("")
    setTyping(true)
    try {
      const rows = await sendChat(text)
      const mine = rows.filter((r) => r.sender === "student")
      const agent = rows.filter((r) => r.sender === "agent")
      setPending((p) => p.filter((m) => m.id !== temp.id))
      chat.mutate((list) => [...list, ...mine])
      // A short pause so the reply reads like someone typed it.
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        setTyping(false)
        chat.mutate((list) => [...list, ...agent])
      }, 900)
    } catch {
      setTyping(false)
      setPending((p) => p.map((m) => (m.id === temp.id ? { ...m, failed: true } : m)))
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="flex-row items-center gap-3 border-b border-border p-5">
          <Avatar src="/assets/teacher-female.png" name="Neha Kapoor" size="md" status="online" />
          <div className="min-w-0">
            <SheetTitle className="text-base">Neha · Learner Success</SheetTitle>
            <SheetDescription className="text-caption">Typically replies in 2 minutes</SheetDescription>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-5" aria-live="polite">
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={spring.soft}
                className={cn("flex items-end gap-2", m.from === "me" && "flex-row-reverse")}
              >
                {m.from === "me" ? <Avatar src={userAvatar} name={userName} size="xs" /> : <Avatar src="/assets/teacher-female.png" name="Neha Kapoor" size="xs" />}
                <div className={cn("flex max-w-[80%] flex-col", m.from === "me" && "items-end")}>
                  <p
                    className={cn(
                      "whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-6",
                      m.from === "me" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-surface-2 text-foreground",
                      m.failed && "opacity-60",
                    )}
                  >
                    {m.text}
                  </p>
                  {m.failed && <span className="mt-0.5 text-[11px] font-medium text-danger">Not sent. Check your connection and try again.</span>}
                </div>
              </motion.div>
            ))}
            <AnimatePresence>
              {typing && (
                <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transition.fast} className="flex items-end gap-2">
                  <Avatar src="/assets/teacher-female.png" name="Neha Kapoor" size="xs" />
                  <span className="flex gap-1 rounded-lg rounded-bl-sm border border-border bg-surface-2 px-3 py-3" role="status" aria-label="Neha is typing">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                        animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={end} />
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
          className="flex items-center gap-2 border-t border-border p-4"
        >
          <Input aria-label="Message" placeholder="Type your message…" value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)} autoFocus />
          <Button type="submit" size="icon" aria-label="Send message" disabled={!draft.trim() || typing}>
            <Send aria-hidden="true" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
