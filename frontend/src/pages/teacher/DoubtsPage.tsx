import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useSearchParams } from "react-router-dom"
import { ArrowLeft, Check, CheckCheck, ChevronRight, Inbox, MessageCircleQuestion, MoreHorizontal, RotateCcw, Search, Send, Sparkles, Timer } from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  PageHeader,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import type { DoubtItem } from "@/types"
import { useTeacherData } from "./teacherStore"
import { DOUBT_PRIORITY_TONE, DOUBT_STATUS_TONE, firstName } from "./teacherUtils"

type Filter = "open" | "resolved" | "all"

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 } as const

/** Hints for the seeded questions; other questions get a general nudge. */
const HINTS: Record<string, string> = {
  d1: "Tenths have one digit after the point and hundredths have two, so 0.3 is the same as 0.30. Lining both up on a place-value chart makes it click.",
  d2: "Branch on the attribute that splits the shapes into the purest groups first. Side count usually does that better than colour, so it goes higher in the tree.",
  d3: "Python won't join text and a number directly. Wrap the number in str(), or use an f-string like f\"Score: {score}\".",
  d4: "At a steep angle the echo bounces away from the sensor. Face the target square-on, or take three readings and keep the middle one.",
  d8: "75% means 75 out of 100. Divide the top and bottom by 25 and you get 3/4.",
}

const QUICK = ["Great question! We'll cover this at the start of the next class.", "Can you share a screenshot of your work so far?", "Rewatch the lesson video from the worked example, then try again."]

function suggestReply(d: DoubtItem): string {
  const hint = HINTS[d.id] ?? "Start from the worked example in the lesson and change one thing at a time so you can see what makes the difference."
  return `Hi ${firstName(d.studentName)}, good question. ${hint} Give it a try and tell me what you get.`
}

/** Learner questions as an inbox: triage by priority, answer with context, resolve. */
export default function DoubtsPage() {
  const { doubts, courses, replyToDoubt, setDoubtStatus, notify } = useTeacherData()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>("open")
  const [course, setCourse] = useState("all")
  const [query, setQuery] = useState("")
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [suggesting, setSuggesting] = useState(false)
  const param = params.get("doubt")

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return doubts
      .filter((d) => (filter === "open" ? d.status !== "Resolved" : filter === "resolved" ? d.status === "Resolved" : true))
      .filter((d) => course === "all" || d.courseId === course)
      .filter((d) => !q || `${d.questionTitle} ${d.questionText} ${d.studentName} ${d.courseCode}`.toLowerCase().includes(q))
      .sort((a, b) => Number(a.status === "Resolved") - Number(b.status === "Resolved") || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
  }, [doubts, filter, course, query])

  const selected = doubts.find((d) => d.id === param) ?? visible[0] ?? null
  const draft = selected ? (drafts[selected.id] ?? "") : ""
  const setDraft = (text: string) => selected && setDrafts((all) => ({ ...all, [selected.id]: text }))

  const select = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set("doubt", id)
    else next.delete("doubt")
    setParams(next, { replace: true })
  }

  const open = doubts.filter((d) => d.status !== "Resolved")
  const high = open.filter((d) => d.priority === "High").length

  const send = (resolve: boolean) => {
    if (!selected || !draft.trim()) return
    replyToDoubt(selected.id, draft.trim(), resolve)
    setDrafts((all) => ({ ...all, [selected.id]: "" }))
    notify(resolve ? `Replied to ${firstName(selected.studentName)} and marked it resolved` : `Reply sent to ${firstName(selected.studentName)}`)
    if (resolve && filter === "open") {
      const next = visible.find((d) => d.id !== selected.id && d.status !== "Resolved")
      select(next?.id ?? null)
    }
  }

  const suggest = () => {
    if (!selected) return
    setSuggesting(true)
    const target = selected
    setTimeout(() => {
      setDrafts((all) => ({ ...all, [target.id]: suggestReply(target) }))
      setSuggesting(false)
    }, 650)
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <PageHeader
        title="Doubts"
        description={open.length ? `${open.length} open questions, ${high} of them high priority. High-priority questions stay at the top.` : "Every question has an answer. Nice work."}
      />

      <Stagger stagger={0.05}>
        <StaggerItem>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
            <Card className={cn("flex min-w-0 flex-col overflow-hidden", param && "hidden lg:flex")}>
              <div className="space-y-3 border-b border-border p-3">
                <Input leading={<Search aria-hidden="true" />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions" aria-label="Search questions" />
                <div className="flex items-center gap-2">
                  <SegmentedControl
                    size="sm"
                    aria-label="Show questions"
                    options={[
                      { value: "open" as Filter, label: `Open ${open.length}` },
                      { value: "resolved" as Filter, label: "Resolved" },
                      { value: "all" as Filter, label: "All" },
                    ]}
                    value={filter}
                    onChange={setFilter}
                  />
                  <Select value={course} onValueChange={setCourse}>
                    <SelectTrigger className="ml-auto h-8 w-32 text-xs" aria-label="Filter by course">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">All courses</SelectItem>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {visible.length === 0 ? (
                <EmptyState
                  className="m-3 border-0"
                  size="sm"
                  icon={<Inbox aria-hidden="true" />}
                  title={filter === "open" ? "Inbox zero" : "Nothing here"}
                  description={filter === "open" ? "No open questions. New ones show up here first." : "Try a different filter."}
                />
              ) : (
                <ul className="flex max-h-[640px] flex-col gap-0.5 overflow-y-auto p-2" aria-label="Questions">
                  <AnimatePresence initial={false}>
                    {visible.map((d) => {
                      const active = selected?.id === d.id
                      const unread = d.status === "Pending" && d.responses.length === 0
                      return (
                        <motion.li key={d.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -12 }} transition={spring.soft}>
                          <button
                            type="button"
                            onClick={() => select(d.id)}
                            aria-current={active ? "true" : undefined}
                            className={cn("relative flex w-full gap-3 rounded-md p-3 text-left", !active && "hover:bg-surface-2")}
                          >
                            {active && <motion.span layoutId="doubt-active" transition={spring.snappy} aria-hidden="true" className="absolute inset-0 rounded-md border border-primary-border bg-primary-soft" />}
                            <Avatar src={d.studentAvatar} name={d.studentName} size="sm" className="relative" />
                            <span className="relative min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className={cn("truncate text-sm text-foreground", unread ? "font-semibold" : "font-medium")}>{d.studentName}</span>
                                {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="New" />}
                                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{d.submittedAt.replace(/, \d{4}/, "")}</span>
                              </span>
                              <span className={cn("mt-0.5 line-clamp-2 text-sm", d.status === "Resolved" ? "text-muted-foreground" : "text-foreground")}>{d.questionTitle}</span>
                              <span className="mt-1.5 flex items-center gap-1.5">
                                <Badge tone={DOUBT_PRIORITY_TONE[d.priority]} size="sm">
                                  {d.priority}
                                </Badge>
                                {d.status !== "Pending" && (
                                  <Badge tone={DOUBT_STATUS_TONE[d.status]} size="sm">
                                    {d.status}
                                  </Badge>
                                )}
                                <span className="truncate text-[11px] text-muted-foreground">{d.courseCode}</span>
                              </span>
                            </span>
                          </button>
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </Card>

            <Card className={cn("flex min-h-[560px] min-w-0 flex-col overflow-hidden", !param && "hidden lg:flex")}>
              {!selected ? (
                <EmptyState className="m-6 flex-1 border-0" icon={<MessageCircleQuestion aria-hidden="true" />} title="Pick a question" description="Its thread and your reply box open here." />
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selected.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6, transition: transition.fast }}
                    transition={transition.base}
                    className="flex flex-1 flex-col"
                  >
                    <div className="flex items-center gap-3 border-b border-border p-4">
                      <Button size="icon-sm" variant="ghost" className="lg:hidden" aria-label="Back to questions" onClick={() => select(null)}>
                        <ArrowLeft aria-hidden="true" />
                      </Button>
                      <Avatar src={selected.studentAvatar} name={selected.studentName} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{selected.studentName}</p>
                        <p className="truncate text-caption text-muted-foreground">
                          {selected.studentRoll} · {selected.courseCode} · {selected.submittedAt}
                        </p>
                      </div>
                      <div className="hidden items-center gap-1.5 sm:flex">
                        <Badge tone={DOUBT_PRIORITY_TONE[selected.priority]}>{selected.priority}</Badge>
                        <Badge tone={DOUBT_STATUS_TONE[selected.status]} dot={selected.status !== "Resolved"}>
                          {selected.status}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost" aria-label="Change status">
                            <MoreHorizontal aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {selected.status !== "In Progress" && (
                            <DropdownMenuItem
                              onSelect={() => {
                                setDoubtStatus(selected.id, "In Progress")
                                notify("Marked in progress")
                              }}
                            >
                              <Timer aria-hidden="true" /> Mark in progress
                            </DropdownMenuItem>
                          )}
                          {selected.status !== "Resolved" ? (
                            <DropdownMenuItem
                              onSelect={() => {
                                setDoubtStatus(selected.id, "Resolved")
                                notify("Marked resolved")
                              }}
                            >
                              <CheckCheck aria-hidden="true" /> Mark resolved
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() => {
                                setDoubtStatus(selected.id, "Pending")
                                notify("Question reopened")
                              }}
                            >
                              <RotateCcw aria-hidden="true" /> Reopen
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
                      {(selected.moduleName || selected.lessonName) && (
                        <p className="flex flex-wrap items-center gap-1 text-caption text-muted-foreground">
                          <span className="font-medium text-foreground">{selected.courseName}</span>
                          {selected.moduleName && (
                            <>
                              <ChevronRight className="h-3 w-3" aria-hidden="true" />
                              {selected.moduleName}
                            </>
                          )}
                          {selected.lessonName && (
                            <>
                              <ChevronRight className="h-3 w-3" aria-hidden="true" />
                              {selected.lessonName}
                            </>
                          )}
                        </p>
                      )}
                      <div>
                        <h2 className="text-h3 font-semibold text-foreground">{selected.questionTitle}</h2>
                        <p className="mt-2 text-sm leading-6 text-foreground">{selected.questionText}</p>
                      </div>
                      {selected.responses.length > 0 && (
                        <ol className="space-y-3" aria-label="Replies">
                          {selected.responses.map((r) => {
                            const teacher = r.authorRole === "Teacher"
                            return (
                              <motion.li key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className={cn("flex gap-2.5", teacher && "flex-row-reverse")}>
                                <Avatar src={r.authorAvatar} name={r.author} size="sm" />
                                <div className={cn("max-w-[85%] rounded-lg px-3.5 py-2.5", teacher ? "rounded-tr-sm bg-primary-soft" : "rounded-tl-sm bg-surface-2")}>
                                  <p className="text-caption text-muted-foreground">
                                    <span className="font-medium text-foreground">{teacher ? "You" : r.author}</span> · {r.createdAt}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-foreground">{r.text}</p>
                                </div>
                              </motion.li>
                            )
                          })}
                        </ol>
                      )}
                    </div>

                    <form
                      className="space-y-3 border-t border-border bg-surface-2/40 p-4"
                      onSubmit={(e) => {
                        e.preventDefault()
                        send(false)
                      }}
                    >
                      <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="Quick replies">
                        {QUICK.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setDraft(q)}
                            className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border-strong/60 hover:text-foreground"
                          >
                            {q.length > 42 ? `${q.slice(0, 40)}…` : q}
                          </button>
                        ))}
                      </div>
                      <label htmlFor="doubt-reply" className="sr-only">
                        Reply to {selected.studentName}
                      </label>
                      <Textarea
                        id="doubt-reply"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={selected.status === "Resolved" ? "Add a follow-up…" : `Reply to ${firstName(selected.studentName)}…`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault()
                            send(false)
                          }
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" variant="ghost" loading={suggesting} leftIcon={<Sparkles aria-hidden="true" />} onClick={suggest}>
                          Suggest reply
                        </Button>
                        <span className="hidden text-[11px] text-muted-foreground sm:inline">Ctrl + Enter to send</span>
                        <div className="ml-auto flex gap-2">
                          <Button type="submit" size="sm" variant="secondary" disabled={!draft.trim()} leftIcon={<Send aria-hidden="true" />}>
                            Send
                          </Button>
                          {selected.status !== "Resolved" && (
                            <Button type="button" size="sm" disabled={!draft.trim()} leftIcon={<Check aria-hidden="true" />} onClick={() => send(true)}>
                              Send and resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </form>
                  </motion.div>
                </AnimatePresence>
              )}
            </Card>
          </div>
        </StaggerItem>
      </Stagger>
    </div>
  )
}
