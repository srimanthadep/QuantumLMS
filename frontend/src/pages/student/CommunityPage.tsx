import { useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Bookmark,
  Briefcase,
  Check,
  FlaskConical,
  Flame,
  Hash,
  Heart,
  Layers,
  MessageCircle,
  MessagesSquare,
  PenSquare,
  Send,
  Share2,
  Trophy,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import { useSession } from "@/app/session"
import {
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
} from "@/components/ui"
import type { CommunityPost } from "./studentTypes"
import { initialCommunityPosts } from "./studentMockData"
import { copyText } from "./studentUtils"

interface CommunityPageProps {
  onToast: (msg: string) => void
}

interface Reply {
  id: string
  author: string
  avatar?: string
  text: string
  time: string
}
type Post = Omit<CommunityPost, "channel"> & { channel: Channel; replyList: Reply[]; saved?: boolean; createdAt: number }

const CHANNELS = [
  { id: "Hackathons", icon: Trophy },
  { id: "Research & Labs", icon: FlaskConical },
  { id: "Study Groups", icon: Users },
  { id: "General", icon: MessagesSquare },
  { id: "Career", icon: Briefcase },
] as const
type Channel = (typeof CHANNELS)[number]["id"]
const CHANNEL_ICON = Object.fromEntries(CHANNELS.map((c) => [c.id, c.icon])) as Record<Channel, typeof Trophy>

const stripEmoji = (s: string) => s.replace(/[^\p{L}\p{N}&\s-]/gu, "").trim()
const asChannel = (s: string): Channel => (CHANNELS.find((c) => c.id === stripEmoji(s))?.id ?? "General") as Channel

const SEED_REPLIES: Record<string, Reply[]> = {
  "cp-1": [
    { id: "r1", author: "Rohit Verma", avatar: "/assets/student-3.png", text: "I can take the frontend. Built a Next.js dashboard for last year's hackathon.", time: "1 hour ago" },
    { id: "r2", author: "Sneha Patel", avatar: "/assets/student-4.png", text: "Interested in the vector DB side. DM me?", time: "45 min ago" },
  ],
  "cp-2": [{ id: "r3", author: "Priya Sharma", avatar: "/assets/student-2.png", text: "Super useful. Did you try a reranker on top of the 512-token chunks?", time: "3 hours ago" }],
  "cp-3": [{ id: "r4", author: "Aarav Patel", avatar: "/assets/student-1.png", text: "Count me in. I'll bring my SVM dual notes.", time: "20 hours ago" }],
}

const SQUADS = [
  { id: "sq-1", name: "RAG Builders", members: 18, next: "Thu · 7:00 PM", joined: true },
  { id: "sq-2", name: "ML Math Circle", members: 24, next: "Wed · 6:30 PM", joined: false },
  { id: "sq-3", name: "Agents & Evals", members: 12, next: "Fri · 5:00 PM", joined: false },
]
const TRENDING = ["LangGraph", "Hackathon2026", "LoRA", "Midterms", "VectorDB", "Evals"]
const HELPERS = [
  { name: "Priya Sharma", avatar: "/assets/student-2.png", points: 342 },
  { name: "Rohit Verma", avatar: "/assets/student-3.png", points: 298 },
  { name: "Sneha Patel", avatar: "/assets/student-4.png", points: 251 },
]

export default function CommunityPage({ onToast }: CommunityPageProps) {
  const { user } = useSession()
  const [posts, setPosts] = useState<Post[]>(() =>
    initialCommunityPosts.map((p, i) => ({ ...p, channel: asChannel(p.channel), replyList: SEED_REPLIES[p.id] ?? [], createdAt: Date.now() - (i + 1) * 3_600_000 })),
  )
  const [channel, setChannel] = useState<Channel | "All">("All")
  const [sort, setSort] = useState<"latest" | "top">("latest")
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState({ title: "", content: "", channel: "General" as Channel })
  const [draftError, setDraftError] = useState<string | null>(null)
  const [squads, setSquads] = useState(SQUADS)
  const composerRef = useRef<HTMLDivElement>(null)

  const visible = useMemo(() => {
    const list = posts.filter((p) => channel === "All" || p.channel === channel)
    return sort === "top" ? [...list].sort((a, b) => b.likes + b.replyList.length * 2 - (a.likes + a.replyList.length * 2)) : [...list].sort((a, b) => b.createdAt - a.createdAt)
  }, [posts, channel, sort])

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    posts.forEach((p) => m.set(p.channel, (m.get(p.channel) ?? 0) + 1))
    return m
  }, [posts])

  const update = (id: string, fn: (p: Post) => Post) => setPosts((list) => list.map((p) => (p.id === id ? fn(p) : p)))

  const openComposer = () => {
    setComposing(true)
    requestAnimationFrame(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }))
  }

  const publish = (e: React.FormEvent) => {
    e.preventDefault()
    if (draft.title.trim().length < 6) {
      setDraftError("Add a title with at least 6 characters.")
      return
    }
    const post: Post = {
      id: `cp-${Date.now()}`,
      author: user.name,
      avatar: user.avatar ?? "",
      badge: "Student",
      time: "Just now",
      channel: draft.channel,
      title: draft.title.trim(),
      content: draft.content.trim(),
      likes: 0,
      replies: 0,
      replyList: [],
      createdAt: Date.now(),
    }
    setPosts((list) => [post, ...list])
    setDraft({ title: "", content: "", channel: draft.channel })
    setComposing(false)
    setChannel("All")
    setSort("latest")
    onToast(`Posted to ${post.channel}`)
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Community"
        title="Community"
        description="Ask questions, find hackathon teammates and study together."
        actions={
          <Button leftIcon={<PenSquare aria-hidden="true" />} onClick={openComposer}>
            New post
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[210px_minmax(0,1fr)_300px]">
        {/* Channels */}
        <nav aria-label="Channels" className="min-w-0 lg:col-span-2 xl:col-span-1">
          <ul className="no-scrollbar flex gap-1 overflow-x-auto xl:sticky xl:top-0 xl:flex-col">
            {[{ id: "All" as const, icon: Layers }, ...CHANNELS].map((c) => {
              const active = channel === c.id
              const count = c.id === "All" ? posts.length : (counts.get(c.id) ?? 0)
              return (
                <li key={c.id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => setChannel(c.id)}
                    className={cn(
                      "relative flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active ? "text-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    {active && <motion.span layoutId="community-channel" transition={spring.snappy} aria-hidden="true" className="absolute inset-0 rounded-md border border-border bg-surface-2" />}
                    <c.icon className="relative h-4 w-4" aria-hidden="true" />
                    <span className="relative whitespace-nowrap">{c.id === "All" ? "All posts" : c.id}</span>
                    <span className="relative ml-auto pl-2 text-caption tabular-nums text-subtle-foreground">{count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Feed */}
        <div className="flex min-w-0 flex-col gap-4">
          <div ref={composerRef}>
            <Card className="overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {composing ? (
                  <motion.form
                    key="open"
                    onSubmit={publish}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: transition.fast }}
                    transition={transition.base}
                    className="grid gap-4 p-5"
                    noValidate
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={user.avatar} name={user.name} size="sm" />
                      <p className="text-sm font-medium text-foreground">New post</p>
                    </div>
                    <Field label="Title" required error={draftError}>
                      <Input
                        autoFocus
                        value={draft.title}
                        onChange={(e) => {
                          setDraft((d) => ({ ...d, title: e.target.value }))
                          setDraftError(null)
                        }}
                        placeholder="What do you want to discuss?"
                      />
                    </Field>
                    <Field label="Details">
                      <Textarea value={draft.content} onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))} placeholder="Add context, links or code…" />
                    </Field>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Select value={draft.channel} onValueChange={(v) => setDraft((d) => ({ ...d, channel: v as Channel }))}>
                        <SelectTrigger aria-label="Channel" className="sm:w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHANNELS.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={() => setComposing(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" leftIcon={<Send aria-hidden="true" />}>
                          Publish
                        </Button>
                      </div>
                    </div>
                  </motion.form>
                ) : (
                  <motion.button
                    key="closed"
                    type="button"
                    onClick={openComposer}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: transition.fast }}
                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2"
                  >
                    <Avatar src={user.avatar} name={user.name} size="sm" />
                    <span className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-muted-foreground">Share something with your cohort…</span>
                    <PenSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </motion.button>
                )}
              </AnimatePresence>
            </Card>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{channel === "All" ? "All posts" : channel}</p>
            <SegmentedControl
              size="sm"
              aria-label="Sort posts"
              options={[
                { value: "latest" as const, label: "Latest" },
                { value: "top" as const, label: "Top", icon: <Flame className="h-3.5 w-3.5" aria-hidden="true" /> },
              ]}
              value={sort}
              onChange={setSort}
            />
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={<MessagesSquare aria-hidden="true" />}
              title="No posts in this channel yet"
              description="Start the conversation."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    if (channel !== "All") setDraft((d) => ({ ...d, channel }))
                    openComposer()
                  }}
                >
                  Write a post
                </Button>
              }
            />
          ) : (
            <motion.div layout className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {visible.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    userName={user.name}
                    userAvatar={user.avatar}
                    onLike={() => update(p.id, (x) => ({ ...x, isLiked: !x.isLiked, likes: x.likes + (x.isLiked ? -1 : 1) }))}
                    onSave={() => {
                      update(p.id, (x) => ({ ...x, saved: !x.saved }))
                      if (!p.saved) onToast("Saved to your bookmarks")
                    }}
                    onShare={async () => {
                      await copyText(`https://community.quantumschool.ai/post/${p.id}`)
                      onToast("Link to post copied")
                    }}
                    onReply={(text) =>
                      update(p.id, (x) => ({ ...x, replyList: [...x.replyList, { id: `r-${Date.now()}`, author: user.name, avatar: user.avatar, text, time: "Just now" }] }))
                    }
                    onTag={(t) => onToast(`Showing posts tagged #${t}`)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Rail */}
        <aside className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Study squads</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {squads.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-text ring-1 ring-inset ring-primary-border">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                    <p className="truncate text-caption text-muted-foreground">
                      {s.members + (s.joined ? 1 : 0)} members · {s.next}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={s.joined ? "secondary" : "outline"}
                    aria-pressed={s.joined}
                    onClick={() => {
                      setSquads((list) => list.map((x) => (x.id === s.id ? { ...x, joined: !x.joined } : x)))
                      onToast(s.joined ? `Left ${s.name}` : `Joined ${s.name}. Next session ${s.next}`)
                    }}
                    leftIcon={
                      s.joined ? (
                        <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={spring.snappy} className="flex">
                          <Check className="text-success" aria-hidden="true" />
                        </motion.span>
                      ) : undefined
                    }
                  >
                    {s.joined ? "Joined" : "Join"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Trending</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {TRENDING.map((t, i) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onToast(`#${t} is trending in your cohort`)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-caption font-medium text-muted-foreground transition-colors hover:border-primary-border hover:text-primary-text"
                >
                  <Hash className="h-3 w-3" aria-hidden="true" />
                  {t}
                  {i < 2 && <Flame className="h-3 w-3 text-warning" aria-label="Hot" />}
                </button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Top helpers this week</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {HELPERS.map((h, i) => (
                <div key={h.name} className="flex items-center gap-3">
                  <span className={cn("w-4 text-center text-sm font-semibold tabular-nums", i === 0 ? "text-warning" : "text-subtle-foreground")}>{i + 1}</span>
                  <Avatar src={h.avatar} name={h.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{h.name}</span>
                  <span className="text-caption tabular-nums text-muted-foreground">{h.points} pts</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function PostCard({
  post,
  userName,
  userAvatar,
  onLike,
  onSave,
  onShare,
  onReply,
  onTag,
}: {
  post: Post
  userName: string
  userAvatar?: string
  onLike: () => void
  onSave: () => void
  onShare: () => void
  onReply: (text: string) => void
  onTag: (t: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [reply, setReply] = useState("")
  const [burst, setBurst] = useState(0)
  const Icon = CHANNEL_ICON[post.channel]
  const replyCount = post.replyList.length + Math.max(0, post.replies - (SEED_REPLIES[post.id]?.length ?? 0))
  const send = () => {
    const t = reply.trim()
    if (!t) return
    onReply(t)
    setReply("")
  }
  const tags = (post.title.match(/\b(RAG|LangGraph|LoRA|SVM|Hackathon|Midterm)\w*/gi) ?? []).slice(0, 2)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: transition.fast }}
      transition={transition.base}
      className="rounded-lg border border-border bg-surface p-5 shadow-[var(--elev-xs)] transition-[border-color] duration-200 hover:border-border-strong/60"
    >
      <header className="flex items-start gap-3">
        <Avatar src={post.avatar} name={post.author} size="md" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
            <span className="font-semibold text-foreground">{post.author}</span>
            <span className="text-caption text-subtle-foreground">· {post.badge}</span>
          </p>
          <p className="text-caption text-muted-foreground">{post.time}</p>
        </div>
        <Badge tone="neutral">
          <Icon className="h-3 w-3" aria-hidden="true" />
          {post.channel}
        </Badge>
      </header>
      <h3 className="mt-3 text-[15px] font-semibold leading-6 text-foreground">{post.title}</h3>
      {post.content && <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{post.content}</p>}
      {tags.length > 0 && (
        <div className="mt-3 flex gap-1">
          {tags.map((t) => (
            <button key={t} type="button" onClick={() => onTag(t)} className="rounded-full px-1.5 py-0.5 text-caption font-medium text-primary-text transition-colors hover:bg-primary-soft">
              #{t}
            </button>
          ))}
        </div>
      )}

      <footer className="mt-4 flex items-center gap-1 border-t border-border pt-3">
        <motion.button
          type="button"
          onClick={() => {
            if (!post.isLiked) setBurst((b) => b + 1)
            onLike()
          }}
          aria-pressed={!!post.isLiked}
          aria-label={`${post.isLiked ? "Unlike" : "Like"}, ${post.likes} likes`}
          whileTap={{ scale: 0.92 }}
          transition={spring.snappy}
          className={cn(
            "relative inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-caption font-semibold transition-colors",
            post.isLiked ? "text-danger" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
          )}
        >
          <motion.span key={burst} initial={burst ? { scale: 0.6 } : false} animate={{ scale: [0.6, 1.3, 1] }} transition={{ duration: 0.35 }} className="flex">
            <Heart className={cn("h-4 w-4", post.isLiked && "fill-current")} aria-hidden="true" />
          </motion.span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={post.likes} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={transition.fast} className="tabular-nums">
              {post.likes}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-caption font-semibold transition-colors",
            open ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
          )}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span className="tabular-nums">{replyCount}</span>
          <span className="hidden sm:inline">{replyCount === 1 ? "reply" : "replies"}</span>
        </button>
        <span className="flex-1" />
        <motion.button
          type="button"
          onClick={onSave}
          aria-pressed={!!post.saved}
          aria-label={post.saved ? "Remove bookmark" : "Bookmark post"}
          whileTap={{ scale: 0.9 }}
          transition={spring.snappy}
          className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors", post.saved ? "text-primary-text" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground")}
        >
          <Bookmark className={cn("h-4 w-4", post.saved && "fill-current")} aria-hidden="true" />
        </motion.button>
        <button
          type="button"
          onClick={onShare}
          aria-label="Copy link to post"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </footer>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: transition.fast }}
            transition={transition.base}
            className="mt-3 flex flex-col gap-3"
          >
            {post.replyList.map((r) => (
              <motion.div key={r.id} layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={transition.base} className="flex gap-2.5">
                <Avatar src={r.avatar} name={r.author} size="xs" className="mt-0.5" />
                <div className="min-w-0 flex-1 rounded-md bg-surface-2 px-3 py-2">
                  <p className="text-caption">
                    <span className="font-semibold text-foreground">{r.author}</span> <span className="text-subtle-foreground">· {r.time}</span>
                  </p>
                  <p className="mt-0.5 text-sm leading-6 text-foreground">{r.text}</p>
                </div>
              </motion.div>
            ))}
            <div className="flex items-center gap-2.5">
              <Avatar src={userAvatar} name={userName} size="xs" />
              <Input
                aria-label="Write a reply"
                placeholder="Write a reply…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    send()
                  }
                }}
                trailing={
                  <button type="button" aria-label="Send reply" onClick={send} disabled={!reply.trim()} className="flex rounded p-1 text-primary-text transition-opacity disabled:opacity-40">
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}
