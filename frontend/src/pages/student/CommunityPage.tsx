import { useState } from "react"
import { Icon } from "../../components/Icon"
import type { CommunityPost } from "./studentTypes"
import { initialCommunityPosts } from "./studentMockData"

interface CommunityPageProps {
  onToast: (msg: string) => void
  initialTab?: "squads" | "discussions" | "speech"
}

interface ForumTopic {
  id: string
  course: string
  title: string
  author: string
  avatar: string
  replies: number
  upvotes: number
  isSolved: boolean
  lastActive: string
  tags: string[]
}

const initialForumTopics: ForumTopic[] = [
  {
    id: "ft-1",
    course: "Generative AI Masterclass",
    title: "How to tune temperature vs top_p in multi-turn agent tool-calling?",
    author: "Arjun Mehta",
    avatar: "/assets/student-1.png",
    replies: 7,
    upvotes: 19,
    isSolved: true,
    lastActive: "15 mins ago",
    tags: ["RAG", "Tool Calling", "Agents"],
  },
  {
    id: "ft-2",
    course: "Python for AI",
    title: "Best practice for vectorized embeddings indexing in pgvector vs Qdrant?",
    author: "Srimanth",
    avatar: "/assets/srimanth.png",
    replies: 12,
    upvotes: 34,
    isSolved: true,
    lastActive: "1 hour ago",
    tags: ["Vector DB", "Embeddings", "FastAPI"],
  },
  {
    id: "ft-3",
    course: "Machine Learning Foundations",
    title: "Gradient vanishing in deep RNNs vs LSTM forget gate dynamics",
    author: "Priya Patel",
    avatar: "/assets/student-2.png",
    replies: 4,
    upvotes: 8,
    isSolved: false,
    lastActive: "3 hours ago",
    tags: ["Neural Nets", "Backprop"],
  },
]

export function CommunityPage({ onToast, initialTab = "squads" }: CommunityPageProps) {
  const [activeTab, setActiveTab] = useState<"squads" | "discussions" | "speech">(initialTab)

  // SQUADS & POSTS STATE
  const [posts, setPosts] = useState<CommunityPost[]>(initialCommunityPosts)
  const [selectedChannel, setSelectedChannel] = useState<string>("All Channels")
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false)
  const [newReplyText, setNewReplyText] = useState("")
  const [postTitle, setPostTitle] = useState("")
  const [postChannel, setPostChannel] = useState("🏆 Hackathons")
  const [postContent, setPostContent] = useState("")

  // DISCUSSIONS STATE
  const [forumTopics, setForumTopics] = useState<ForumTopic[]>(initialForumTopics)
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("All Courses")
  const [discussionSearch, setDiscussionSearch] = useState("")

  // SPEECH LAB STATE
  const [isRecording, setIsRecording] = useState(false)
  const [speechTimer, setSpeechTimer] = useState(0)
  const [selectedSpeechTopic, setSelectedSpeechTopic] = useState("Explain Flash Attention to an AI Architect")

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

  const handleUpvoteTopic = (id: string) => {
    setForumTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, upvotes: t.upvotes + 1 } : t))
    )
    onToast("Upvoted discussion question!")
  }

  const filteredPosts =
    selectedChannel === "All Channels"
      ? posts
      : posts.filter((p) => p.channel === selectedChannel)

  const filteredTopics = forumTopics.filter((t) => {
    if (selectedCourseFilter !== "All Courses" && t.course !== selectedCourseFilter) return false
    if (discussionSearch.trim()) {
      const q = discussionSearch.toLowerCase()
      return t.title.toLowerCase().includes(q) || t.author.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="app-card-stack flex flex-col gap-[var(--app-card-gap,14px)]">
      {/* Top Header Hub */}
      <section className="panel" aria-label="Community Header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title">Community & Peer Collaboration Hub</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                Cohort 2026
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Connect with study squads, ask questions in technical forums, and practice verbal AI communication.
            </p>
          </div>

          {/* View Tabs */}
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-full border border-zinc-200/60">
            <button
              type="button"
              onClick={() => setActiveTab("squads")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "squads"
                  ? "bg-surface text-zinc-900 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Squads & Channels
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("discussions")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "discussions"
                  ? "bg-surface text-zinc-900 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Course Discussions ({forumTopics.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("speech")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "speech"
                  ? "bg-surface text-zinc-900 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Speech & Verbal Lab
            </button>
          </div>
        </div>
      </section>

      {/* VIEW 1: SQUADS & CHANNELS */}
      {activeTab === "squads" && (
        <div className="flex flex-col gap-4">
          <div className="panel p-3 bg-surface border border-zinc-150 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {["All Channels", "🏆 Hackathons", "🔬 Research & Labs", "📚 Study Groups", "💬 General"].map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedChannel(c)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      selectedChannel === c
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {c}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsNewPostModalOpen(true)}
              className="px-4 py-1.5 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 shadow-xs ml-auto"
            >
              + Create Post
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="panel p-5 bg-surface border border-zinc-100 rounded-2xl shadow-xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={post.avatar || "/assets/srimanth.png"}
                      alt={post.author}
                      className="w-8 h-8 rounded-full object-cover border border-purple-200"
                    />
                    <div>
                      <strong className="text-xs text-zinc-900 block">{post.author}</strong>
                      <span className="text-[10px] text-zinc-400">{post.badge} · {post.time}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700">
                    {post.channel}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-zinc-900 mb-1">{post.title}</h4>
                <p className="text-xs text-zinc-600 leading-relaxed mb-3">{post.content}</p>
                <div className="flex items-center gap-4 pt-2 border-t border-zinc-100 text-xs text-zinc-500">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post.id)}
                    className={`flex items-center gap-1 font-semibold ${
                      post.isLiked ? "text-rose-600" : "hover:text-zinc-800"
                    }`}
                  >
                    <span>{post.isLiked ? "❤️" : "🤍"}</span>
                    <span>{post.likes}</span>
                  </button>
                  <span className="flex items-center gap-1">
                    <span>💬</span>
                    <span>{post.replies} Replies</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {isNewPostModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <form onSubmit={handleCreatePost} className="bg-surface rounded-3xl p-6 max-w-lg w-full flex flex-col gap-3">
                <h3 className="font-bold text-base text-zinc-900 mb-1">Create Community Post</h3>
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Channel</label>
                  <select
                    value={postChannel}
                    onChange={(e) => setPostChannel(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs"
                  >
                    <option value="🏆 Hackathons">🏆 Hackathons</option>
                    <option value="🔬 Research & Labs">🔬 Research & Labs</option>
                    <option value="📚 Study Groups">📚 Study Groups</option>
                    <option value="💬 General">💬 General</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Title</label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="E.g. Squad forming for Agents Hackathon"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Content</label>
                  <textarea
                    rows={4}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Details about your squad or research inquiry..."
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewPostModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800"
                  >
                    Publish Post
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: COURSE DISCUSSIONS */}
      {activeTab === "discussions" && (
        <div className="flex flex-col gap-4">
          <div className="panel p-3 bg-surface border border-zinc-150 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {["All Courses", "Generative AI Masterclass", "Python for AI", "Machine Learning Foundations"].map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCourseFilter(c)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      selectedCourseFilter === c
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {c}
                  </button>
                )
              )}
            </div>
            <input
              type="text"
              placeholder="Search topics..."
              value={discussionSearch}
              onChange={(e) => setDiscussionSearch(e.target.value)}
              className="px-3 py-1 rounded-full border border-zinc-200 text-xs w-48"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                className="panel p-4 bg-surface border border-zinc-100 rounded-2xl flex items-center justify-between gap-4 hover:border-purple-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleUpvoteTopic(topic.id)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 min-w-10 text-xs font-bold cursor-pointer"
                  >
                    <span>▲</span>
                    <span>{topic.upvotes}</span>
                  </button>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-zinc-400">{topic.course}</span>
                      {topic.isSolved && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                          ✓ Solved
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900 line-clamp-1">{topic.title}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                      <span>Asked by {topic.author}</span>
                      <span>·</span>
                      <span>{topic.lastActive}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-500 font-semibold">💬 {topic.replies}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: SPEECH & VERBAL LAB */}
      {activeTab === "speech" && (
        <div className="panel p-6 bg-surface border border-zinc-100 rounded-3xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-base font-bold text-zinc-900">AI Speech & Presentation Rehearsal Lab</h3>
              <p className="text-xs text-zinc-500">Record your technical presentation and receive real-time clarity feedback.</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-700">
              🎙️ Interactive Audio Mode
            </span>
          </div>

          <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
            <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block mb-1">
              Active Speaking Prompt:
            </span>
            <strong className="text-sm text-zinc-900 block">{selectedSpeechTopic}</strong>
          </div>

          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-purple-200 rounded-2xl bg-zinc-50/50">
            <button
              type="button"
              onClick={() => {
                const next = !isRecording
                setIsRecording(next)
                onToast(next ? "Recording session started! Speak clearly into your mic." : "Recording captured! AI analysis completed.")
              }}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-md transition-all cursor-pointer ${
                isRecording
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-purple-700 text-white hover:bg-purple-800"
              }`}
            >
              {isRecording ? "⏹" : "🎙️"}
            </button>
            <span className="text-xs font-bold text-zinc-700 mt-3">
              {isRecording ? "Recording in progress... Click to finish" : "Click microphone to start rehearsal"}
            </span>
            <span className="text-[11px] text-zinc-400 mt-1">Evaluates cadence, technical depth, and filler words</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommunityPage
