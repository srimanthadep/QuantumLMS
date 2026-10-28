import { useState } from "react"
import { Icon } from "../../components/Icon"
import { StudentDropdown } from "../../components/StudentDropdown"
import type { CommunityPost } from "./studentTypes"
import { initialCommunityPosts } from "./studentMockData"

interface CommunityPageProps {
  onToast: (msg: string) => void
}

export function CommunityPage({ onToast }: CommunityPageProps) {
  const [posts, setPosts] = useState<CommunityPost[]>(initialCommunityPosts)
  const [selectedChannel, setSelectedChannel] = useState<string>("All Channels")
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false)
  const [activeThreadPost, setActiveThreadPost] = useState<CommunityPost | null>(null)
  const [newReplyText, setNewReplyText] = useState("")
  const [threadReplies, setThreadReplies] = useState<Record<string, { id: string; user: string; text: string; time: string }[]>>({
    "post-1": [
      { id: "r-1", user: "Rohan V.", text: "Hey Srimanth! I would love to join your squad. I'm focusing on LangGraph multi-agent systems.", time: "1 hour ago" },
      { id: "r-2", user: "Ananya S.", text: "Count me in for evaluation benchmarks and latency testing on the H100 cluster.", time: "30 mins ago" },
    ],
    "post-2": [
      { id: "r-3", user: "Kabir D.", text: "Great findings! Cross-encoders definitely give higher NDCG@10 on domain-specific corpora.", time: "2 hours ago" },
    ],
  })

  // Form state
  const [postTitle, setPostTitle] = useState("")
  const [postChannel, setPostChannel] = useState("🏆 Hackathons")
  const [postContent, setPostContent] = useState("")

  const channels = [
    "All Channels",
    "🏆 Hackathons",
    "🔬 Research & Labs",
    "📚 Study Groups",
    "💬 General",
  ]

  const handleToggleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextLiked = !p.isLiked
          return {
            ...p,
            isLiked: nextLiked,
            likes: nextLiked ? p.likes + 1 : p.likes - 1,
          }
        }
        return p
      }),
    )
  }

  const handleAddReply = (postId: string) => {
    if (!newReplyText.trim()) return
    const newRep = {
      id: `rep-${Date.now()}`,
      user: "Srimanth",
      text: newReplyText.trim(),
      time: "Just now",
    }
    setThreadReplies((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newRep],
    }))
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, replies: p.replies + 1 } : p)),
    )
    setNewReplyText("")
    onToast("Reply posted to thread! 💬")
  }

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault()
    if (!postTitle.trim() || !postContent.trim()) return
    const newPost: CommunityPost = {
      id: `cp-${Date.now()}`,
      author: "Srimanth",
      avatar: "/assets/srimanth.png",
      badge: "Student · Maple Class",
      time: "Just now",
      channel: postChannel,
      title: postTitle,
      content: postContent,
      likes: 1,
      replies: 0,
      isLiked: true,
    }
    setPosts([newPost, ...posts])
    setIsNewPostModalOpen(false)
    setPostTitle("")
    setPostContent("")
    onToast("Posted to student community board! 🎉")
  }

  const filtered =
    selectedChannel === "All Channels"
      ? posts
      : posts.filter((p) => p.channel === selectedChannel)

  return (
    <div className="flex flex-col gap-5">
      {/* Header Panel */}
      <section className="panel" aria-label="Community Header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title">Student AI Community & Collab Hub</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                128 Active Students
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Connect with classmates, form hackathon squads, share research
              benchmarks, and organize study sessions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onToast(
                  "Redirecting to Quantum AI official Discord community...",
                )
              }
              className="px-3.5 py-1.5 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>💬 Join Discord</span>
            </button>
            <button
              onClick={() => setIsNewPostModalOpen(true)}
              className="px-4 py-1.5 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>+ New Discussion</span>
            </button>
          </div>
        </div>

        {/* Channel Filter Pills */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-zinc-100 overflow-x-auto pb-1 sm:pb-0">
          {channels.map((ch) => (
            <button
              key={ch}
              className={`filter-pill ${
                selectedChannel === ch ? "active" : ""
              }`}
              onClick={() => setSelectedChannel(ch)}
            >
              {ch}
            </button>
          ))}
        </div>
      </section>

      {/* Community Posts Feed */}
      <div className="flex flex-col gap-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="panel p-5 flex flex-col justify-between hover:shadow-md transition-shadow border border-zinc-100"
          >
            <div>
              {/* Post Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={item.avatar}
                    alt={item.author}
                    className="w-9 h-9 rounded-full object-cover border border-purple-200"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-900">
                        {item.author}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                        {item.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {item.time}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                  {item.channel}
                </span>
              </div>

              {/* Title & Content */}
              <h4 className="font-bold text-sm text-zinc-900 mb-1.5 leading-snug">
                {item.title}
              </h4>
              <p className="text-xs text-zinc-600 leading-relaxed mb-4">
                {item.content}
              </p>
            </div>

            {/* Post Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleLike(item.id)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full font-bold transition-colors cursor-pointer ${
                    item.isLiked
                      ? "bg-rose-50 text-rose-600 border border-rose-200"
                      : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <span>{item.isLiked ? "❤️" : "🤍"}</span>
                  <span>{item.likes}</span>
                </button>

                <button
                  onClick={() => setActiveThreadPost(item)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-50 text-zinc-600 hover:bg-zinc-100 font-bold transition-colors cursor-pointer"
                >
                  <Icon name="mail" size={12} />
                  <span>{item.replies} Replies</span>
                </button>
              </div>

              <button
                onClick={() => onToast("Thread link copied to clipboard!")}
                className="text-zinc-400 hover:text-zinc-700 font-semibold cursor-pointer text-[11px]"
              >
                Share
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Discussion Modal */}
      {isNewPostModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsNewPostModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  Community Collab Board
                </span>
                <h3 className="font-bold text-lg text-zinc-900">
                  Start a Discussion
                </h3>
              </div>
              <button
                onClick={() => setIsNewPostModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <form
              onSubmit={handleCreatePost}
              className="flex flex-col gap-3 text-xs"
            >
              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Select Channel
                </label>
                <StudentDropdown
                  value={postChannel}
                  onChange={setPostChannel}
                  options={[
                    { value: "🏆 Hackathons", label: "🏆 Hackathons & Team Formation" },
                    { value: "🔬 Research & Labs", label: "🔬 Research & Labs" },
                    { value: "📚 Study Groups", label: "📚 Study Groups & Midterm Prep" },
                    { value: "💬 General", label: "💬 General Student Discussion" },
                  ]}
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Discussion Topic / Title
                </label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. Forming team for Multi-Agent Track at Hackathon"
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Message Body
                </label>
                <textarea
                  required
                  rows={4}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Provide context, required skills, meeting times, or paper links..."
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsNewPostModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-purple-700 text-white font-bold hover:bg-purple-800 cursor-pointer shadow-sm"
                >
                  Post Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thread Discussions & Replies Modal */}
      {activeThreadPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setActiveThreadPost(null)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  {activeThreadPost.channel} • Thread Discussion
                </span>
                <h3 className="font-bold text-base text-zinc-900">
                  {activeThreadPost.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveThreadPost(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            {/* Original Post */}
            <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <img
                  src={activeThreadPost.avatar}
                  alt={activeThreadPost.author}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <strong className="text-zinc-900">{activeThreadPost.author}</strong>
                <span className="text-[10px] text-zinc-400">• {activeThreadPost.time}</span>
              </div>
              <p className="text-zinc-700 leading-relaxed">{activeThreadPost.content}</p>
            </div>

            {/* Replies List */}
            <div className="flex flex-col gap-2.5 max-h-52 overflow-y-auto mb-4 pr-1">
              <span className="text-xs font-bold text-zinc-700">
                Replies ({(threadReplies[activeThreadPost.id] || []).length}):
              </span>
              {(threadReplies[activeThreadPost.id] || []).length === 0 ? (
                <div className="text-xs text-zinc-400 py-3 text-center">
                  No replies yet. Be the first to join the conversation!
                </div>
              ) : (
                (threadReplies[activeThreadPost.id] || []).map((rep) => (
                  <div key={rep.id} className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-purple-900 font-bold">{rep.user}</strong>
                      <span className="text-[10px] text-zinc-400">{rep.time}</span>
                    </div>
                    <p className="text-zinc-700 text-[11px] leading-relaxed">{rep.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAddReply(activeThreadPost.id)
              }}
              className="flex flex-col gap-2 pt-3 border-t border-zinc-100"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newReplyText}
                  onChange={(e) => setNewReplyText(e.target.value)}
                  placeholder="Write a constructive reply to this thread..."
                  className="flex-1 p-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-purple-600"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-700 text-white font-bold text-xs hover:bg-purple-800 cursor-pointer shadow-sm whitespace-nowrap"
                >
                  Send Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
