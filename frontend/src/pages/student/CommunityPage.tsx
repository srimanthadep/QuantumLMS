import { useEffect, useMemo, useRef, useState } from "react"
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
  Trash2,
  Trophy,
  Users,
  X,
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
  Skeleton,
  Textarea,
} from "@/components/ui"
import { copyText, relTime } from "./studentUtils"
import { useStudentData, useStudentResource } from "./data/StudentDataProvider"
import { createPost, deletePost, deleteReply, loadCommunity, replyToPost, setLike, setSave, setSquadMember, type CommunityData } from "./data/community"

interface CommunityPageProps {
  onToast: (msg: string) => void
}

interface Reply {
  id: string
  author: string
  avatar?: string
  text: string
  time: string
  mine: boolean
}

interface Post {
  id: string
  author: string
  avatar?: string
  badge: string
  time: string
  channel: Channel
  title: string
  content: string
  likes: number
  replies: number
  isLiked: boolean
  saved: boolean
  mine: boolean
  createdAt: number
  replyList: Reply[]
}

const CHANNELS = [
  { id: "Hackathons", icon: Trophy },
  { id: "Research & Labs", icon: FlaskConical },
  { id: "Study Groups", icon: Users },
  { id: "General", icon: MessagesSquare },
  { id: "Career", icon: Briefcase },
] as const
type Channel = (typeof CHANNELS)[number]["id"]
const CHANNEL_ICON = Object.fromEntries(CHANNELS.map((c) => [c.id, c.icon])) as Record<Channel, typeof Trophy>
const asChannel = (s: string): Channel => (CHANNELS.find((c) => c.id === s)?.id ?? "General") as Channel

// Community app copy; the activity behind these isn't tracked per student.
const TRENDING = ["LangGraph", "Hackathon", "LoRA", "Midterm", "RAG", "Evals"]
const HELPERS = [
  { name: "Priya Sharma", avatar: "/assets/student-2.png", points: 342 },
  { name: "Rohit Verma", avatar: "/assets/student-3.png", points: 298 },
  { name: "Sneha Patel", avatar: "/assets/student-4.png", points: 251 },
]

const postLink = (id: string) => `${window.location.origin}/student?page=community&post=${encodeURIComponent(id)}`

export default function CommunityPage({ onToast }: CommunityPageProps) {
  const { user } = useSession()
  const { uid, now } = useStudentData()
  const res = useStudentResource<CommunityData>("community", loadCommunity, 60_000)
  const [channel, setChannel] = useState<Channel | "All">("All")
  const [sort, setSort] = useState<"latest" | "top">("latest")
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState({ title: "", content: "", channel: "General" as Channel })
  const [draftError, setDraftError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [highlight, setHighlight] = useState<string | null>(() => new URLSearchParams(window.location.search).get("post"))
  const composerRef = useRef<HTMLDivElement>(null)
  const { mutate } = res

  const posts = useMemo<Post[]>(() => {
    const d = res.data
    if (!d) return []
    const liked = new Set(d.liked)
    const saved = new Set(d.saved)
    const byPost = new Map<string, Reply[]>()
    for (const r of d.replies) {
      const list = byPost.get(r.post_id) ?? []
      list.push({ id: r.id, author: r.author_name, avatar: r.author_avatar ?? undefined, text: r.body, time: relTime(r.created_at, now), mine: r.author_id === uid })
      byPost.set(r.post_id, list)
    }
    return d.posts.map((p) => ({
      id: p.id,
      author: p.author_name,
      avatar: p.author_avatar ?? undefined,
      badge: p.author_badge,
      time: relTime(p.created_at, now),
      channel: asChannel(p.channel),
      title: p.title,
      content: p.content,
      likes: p.base_likes + p.like_count,
      replies: p.base_replies + p.reply_count,
      isLiked: liked.has(p.id),
      saved: saved.has(p.id),
      mine: p.author_id === uid,
      createdAt: Date.parse(p.created_at),
      replyList: byPost.get(p.id) ?? [],
    }))
  }, [res.data, now, uid])

  const visible = useMemo(() => {
    const t = tagFilter?.toLowerCase()
    const list = posts.filter((p) => (channel === "All" || p.channel === channel) && (!t || `${p.title} ${p.content}`.toLowerCase().includes(t)))
    return sort === "top" ? [...list].sort((a, b) => b.likes + b.replies * 2 - (a.likes + a.replies * 2)) : [...list].sort((a, b) => b.createdAt - a.createdAt)
  }, [posts, channel, sort, tagFilter])

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    posts.forEach((p) => m.set(p.channel, (m.get(p.channel) ?? 0) + 1))
    return m
  }, [posts])

  // A shared link (?post=…) scrolls to that post once the feed has loaded.
  useEffect(() => {
    if (!highlight || !res.data) return
    const el = document.getElementById(`post-${highlight}`)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
    const t = setTimeout(() => setHighlight(null), 2400)
    return () => clearTimeout(t)
  }, [highlight, res.data])

  const openComposer = () => {
    setComposing(true)
    requestAnimationFrame(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }))
  }

  const publish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (draft.title.trim().length < 6) {
      setDraftError("Add a title with at least 6 characters.")
      return
    }
    setPublishing(true)
    try {
      const row = await createPost(draft.channel, draft.title, draft.content)
      mutate((d) => ({ ...d, posts: [row, ...d.posts] }))
      setDraft({ title: "", content: "", channel: draft.channel })
      setComposing(false)
      setChannel("All")
      setTagFilter(null)
      setSort("latest")
      onToast(`Posted to ${draft.channel}`)
    } catch (err) {
      setDraftError((err as Error).message)
    } finally {
      setPublishing(false)
    }
  }

  const toggleLike = (p: Post) => {
    const on = !p.isLiked
    const apply = (value: boolean) =>
      mutate((d) => ({
        ...d,
        liked: value ? [...d.liked.filter((x) => x !== p.id), p.id] : d.liked.filter((x) => x !== p.id),
        posts: d.posts.map((x) => (x.id === p.id ? { ...x, like_count: Math.max(0, x.like_count + (value ? 1 : -1)) } : x)),
      }))
    apply(on)
    setLike(p.id, on).catch((err: Error) => {
      apply(!on)
      onToast(`Couldn't save your like: ${err.message}`)
    })
  }
  const toggleSave = (p: Post) => {
    const on = !p.saved
    const apply = (value: boolean) => mutate((d) => ({ ...d, saved: value ? [...d.saved.filter((x) => x !== p.id), p.id] : d.saved.filter((x) => x !== p.id) }))
    apply(on)
    setSave(p.id, on)
      .then(() => on && onToast("Saved to your bookmarks"))
      .catch((err: Error) => {
        apply(!on)
        onToast(`Couldn't update your bookmarks: ${err.message}`)
      })
  }
  const reply = async (p: Post, text: string) => {
    const row = await replyToPost(p.id, text)
    mutate((d) => ({ ...d, replies: [...d.replies, row], posts: d.posts.map((x) => (x.id === p.id ? { ...x, reply_count: x.reply_count + 1 } : x)) }))
  }
  const removeReply = (p: Post, r: Reply) =>
    deleteReply(r.id)
      .then(() => mutate((d) => ({ ...d, replies: d.replies.filter((x) => x.id !== r.id), posts: d.posts.map((x) => (x.id === p.id ? { ...x, reply_count: Math.max(0, x.reply_count - 1) } : x)) })))
      .catch((err: Error) => onToast(`Couldn't delete the reply: ${err.message}`))
  const removePost = (p: Post) =>
    deletePost(p.id)
      .then(() => {
        mutate((d) => ({ ...d, posts: d.posts.filter((x) => x.id !== p.id) }))
        onToast("Post deleted")
      })
      .catch((err: Error) => onToast(`Couldn't delete the post: ${err.message}`))

  const squads = (res.data?.squads ?? []).map((s) => ({ id: s.id, name: s.name, members: s.base_members + s.member_count, next: s.next_session, joined: (res.data?.joined ?? []).includes(s.id) }))
  const toggleSquad = (s: (typeof squads)[number]) => {
    const on = !s.joined
    const apply = (value: boolean) =>
      mutate((d) => ({
        ...d,
        joined: value ? [...d.joined.filter((x) => x !== s.id), s.id] : d.joined.filter((x) => x !== s.id),
        squads: d.squads.map((x) => (x.id === s.id ? { ...x, member_count: Math.max(0, x.member_count + (value ? 1 : -1)) } : x)),
      }))
    apply(on)
    setSquadMember(s.id, on)
      .then(() => onToast(on ? `Joined ${s.name}. Next session ${s.next}` : `Left ${s.name}`))
      .catch((err: Error) => {
        apply(!on)
        onToast(`Couldn't update the squad: ${err.message}`)
      })
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
                        maxLength={160}
                        onChange={(e) => {
                          setDraft((d) => ({ ...d, title: e.target.value }))
                          setDraftError(null)
                        }}
                        placeholder="What do you want to discuss?"
                      />
                    </Field>
                    <Field label="Details">
                      <Textarea value={draft.content} maxLength={5000} onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))} placeholder="Add context, links or code…" />
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
                        <Button type="button" variant="ghost" onClick={() => setComposing(false)} disabled={publishing}>
                          Cancel
                        </Button>
                        <Button type="submit" leftIcon={<Send aria-hidden="true" />} loading={publishing}>
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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <p className="text-sm font-medium text-foreground">{channel === "All" ? "All posts" : channel}</p>
              {tagFilter && (
                <button
                  type="button"
                  onClick={() => setTagFilter(null)}
                  aria-label={`Clear the #${tagFilter} filter`}
                  className="inline-flex items-center gap-1 rounded-full border border-primary-border bg-primary-soft px-2 py-0.5 text-caption font-medium text-primary-text"
                >
                  #{tagFilter} <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </div>
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

          {res.error && !res.data ? (
            <EmptyState
              icon={<MessagesSquare aria-hidden="true" />}
              title="The feed didn't load"
              description={res.error.message}
              action={
                <Button size="sm" variant="secondary" onClick={() => void res.reload()}>
                  Try again
                </Button>
              }
            />
          ) : !res.data ? (
            <div className="flex flex-col gap-4" role="status" aria-label="Loading posts">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-44" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<MessagesSquare aria-hidden="true" />}
              title={tagFilter ? `No posts mention #${tagFilter}` : "No posts in this channel yet"}
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
                    highlighted={highlight === p.id}
                    userName={user.name}
                    userAvatar={user.avatar}
                    onLike={() => toggleLike(p)}
                    onSave={() => toggleSave(p)}
                    onShare={async () => {
                      const ok = await copyText(postLink(p.id))
                      onToast(ok ? "Link to post copied" : "Copy isn't available in this browser")
                    }}
                    onReply={(text) => reply(p, text)}
                    onDeleteReply={(r) => void removeReply(p, r)}
                    onDelete={() => void removePost(p)}
                    onTag={(t) => setTagFilter(t)}
                    onError={onToast}
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
              {!res.data && [0, 1, 2].map((i) => <Skeleton key={i} className="h-9" />)}
              {squads.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-text ring-1 ring-inset ring-primary-border">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                    <p className="truncate text-caption text-muted-foreground">
                      {s.members} members · {s.next}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={s.joined ? "secondary" : "outline"}
                    aria-pressed={s.joined}
                    onClick={() => toggleSquad(s)}
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
                  aria-pressed={tagFilter === t}
                  onClick={() => setTagFilter(tagFilter === t ? null : t)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-caption font-medium transition-colors",
                    tagFilter === t ? "border-primary-border bg-primary-soft text-primary-text" : "border-border bg-surface text-muted-foreground hover:border-primary-border hover:text-primary-text",
                  )}
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
  highlighted,
  userName,
  userAvatar,
  onLike,
  onSave,
  onShare,
  onReply,
  onDeleteReply,
  onDelete,
  onTag,
  onError,
}: {
  post: Post
  highlighted: boolean
  userName: string
  userAvatar?: string
  onLike: () => void
  onSave: () => void
  onShare: () => void
  onReply: (text: string) => Promise<void>
  onDeleteReply: (r: Reply) => void
  onDelete: () => void
  onTag: (t: string) => void
  onError: (m: string) => void
}) {
  const [open, setOpen] = useState(highlighted)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [burst, setBurst] = useState(0)
  const Icon = CHANNEL_ICON[post.channel]
  const send = async () => {
    const t = reply.trim()
    if (!t || sending) return
    setSending(true)
    try {
      await onReply(t)
      setReply("")
    } catch (e) {
      onError(`Couldn't post your reply: ${(e as Error).message}`)
    } finally {
      setSending(false)
    }
  }
  const tags = [...new Set((post.title.match(/\b(RAG|LangGraph|LoRA|SVM|Hackathon|Midterm|Evals)\w*/gi) ?? []).map((t) => t.replace(/s$/i, "")))].slice(0, 2)

  return (
    <motion.article
      id={`post-${post.id}`}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: transition.fast }}
      transition={transition.base}
      className={cn(
        "scroll-mt-24 rounded-lg border bg-surface p-5 shadow-[var(--elev-xs)] transition-[border-color,box-shadow] duration-200 hover:border-border-strong/60",
        highlighted ? "border-primary shadow-[var(--glow-primary)]" : "border-border",
      )}
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
      {post.content && <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{post.content}</p>}
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
          aria-pressed={post.isLiked}
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
          <span className="tabular-nums">{post.replies}</span>
          <span className="hidden sm:inline">{post.replies === 1 ? "reply" : "replies"}</span>
        </button>
        <span className="flex-1" />
        {post.mine && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete post"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <motion.button
          type="button"
          onClick={onSave}
          aria-pressed={post.saved}
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
            {post.replies > post.replyList.length && (
              <p className="text-caption text-subtle-foreground">
                {post.replies - post.replyList.length} earlier repl{post.replies - post.replyList.length === 1 ? "y" : "ies"} from before this feed
              </p>
            )}
            {post.replyList.map((r) => (
              <motion.div key={r.id} layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={transition.base} className="flex gap-2.5">
                <Avatar src={r.avatar} name={r.author} size="xs" className="mt-0.5" />
                <div className="min-w-0 flex-1 rounded-md bg-surface-2 px-3 py-2">
                  <p className="flex flex-wrap items-center gap-x-1.5 text-caption">
                    <span className="font-semibold text-foreground">{r.author}</span> <span className="text-subtle-foreground">· {r.time}</span>
                    {r.mine && (
                      <button type="button" onClick={() => onDeleteReply(r)} className="font-medium text-muted-foreground underline-offset-2 hover:text-danger hover:underline">
                        Delete
                      </button>
                    )}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-6 text-foreground">{r.text}</p>
                </div>
              </motion.div>
            ))}
            <div className="flex items-center gap-2.5">
              <Avatar src={userAvatar} name={userName} size="xs" />
              <Input
                aria-label="Write a reply"
                placeholder="Write a reply…"
                value={reply}
                maxLength={2000}
                disabled={sending}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void send()
                  }
                }}
                trailing={
                  <button type="button" aria-label="Send reply" onClick={() => void send()} disabled={!reply.trim() || sending} className="flex rounded p-1 text-primary-text transition-opacity disabled:opacity-40">
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
