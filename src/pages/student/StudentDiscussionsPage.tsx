import React, { useState } from "react";
import { StudentDropdown } from "../../components/StudentDropdown";

// ============================================================================
// SELF-CONTAINED SVG ICONS (Pixel-perfect, matching Noorly Soft UI stroke & design)
// ============================================================================
const IconPropsDefault = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function MessageSquareIcon({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SearchIcon({ className = "", size = 14 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
    </svg>
  );
}

function PlusCircleIcon({ className = "", size = 16 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="16" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}

function ThumbsUpIcon({ className = "", size = 14 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.5L12 4.12A2 2 0 0 1 15 5.88z" />
    </svg>
  );
}

function UsersIcon({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FlagIcon({ className = "", size = 13 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  );
}

function SendIcon({ className = "", size = 14 }: { className?: string; size?: number }) {
  return (
    <svg {...IconPropsDefault} width={size} height={size} className={className}>
      <line x1="22" x2="11" y1="2" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ============================================================================
// NOORLY SOFT UI PRIMITIVES
// ============================================================================
const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", children, ...props }) => (
  <div
    className={`bg-white rounded-[22px] border border-[#E2DCEE] shadow-[0_8px_28px_rgba(39,28,61,0.055)] transition-all ${className}`}
    {...props}
  >
    {children}
  </div>
);

const Badge: React.FC<{
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
  className?: string;
  children: React.ReactNode;
}> = ({ variant = "default", className = "", children }) => {
  let styleClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight ";
  if (variant === "default") {
    styleClasses += "bg-[#F0E7FF] text-[#5F2BC0] border border-[#D8C2FF]/60 ";
  } else if (variant === "secondary") {
    styleClasses += "bg-[#E7FF9C] text-[#385000] border border-[#D2F66A]/60 ";
  } else if (variant === "outline") {
    styleClasses += "border border-[#B6AEC8] text-[#514B68] bg-transparent ";
  } else if (variant === "success") {
    styleClasses += "bg-[#E7FF9C] text-[#253700] border border-[#D2F66A] ";
  } else if (variant === "warning") {
    styleClasses += "bg-[#FFF6C9] text-[#7A5B00] border border-[#FFE885] ";
  }
  return <span className={`${styleClasses} ${className}`}>{children}</span>;
};

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
    size?: "default" | "sm" | "lg";
  }
> = ({ variant = "default", size = "default", className = "", children, ...props }) => {
  let base =
    "inline-flex items-center justify-center font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ";
  if (variant === "default") {
    base += "bg-[#905FEB] text-white hover:bg-[#7D4BD8] shadow-[0_6px_16px_rgba(91,51,163,0.14)] ";
  } else if (variant === "outline") {
    base += "border border-[#E2DCEE] bg-white text-[#171526] hover:bg-[#F0EDFF] hover:border-[#905FEB] ";
  } else if (variant === "ghost") {
    base += "bg-transparent text-[#514B68] hover:bg-[#F0EDFF] hover:text-[#171526] ";
  } else if (variant === "secondary") {
    base += "bg-[#F0EDFF] text-[#5F2BC0] hover:bg-[#E4DFFD] ";
  } else if (variant === "destructive") {
    base += "bg-[#E21D2D] text-white hover:bg-[#C91322] shadow-sm ";
  }

  if (size === "sm") {
    base += "h-8 px-3 text-xs rounded-full ";
  } else if (size === "lg") {
    base += "h-11 px-6 text-sm rounded-full ";
  } else {
    base += "h-9 px-4 text-xs rounded-full ";
  }

  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
};

// ============================================================================
// DATA TYPES
// ============================================================================
export interface DiscussionReply {
  id: string;
  author: string;
  role: "student" | "faculty" | "ta";
  content: string;
  timestamp: string;
  likes: number;
}

export interface DiscussionPost {
  id: string;
  course: string;
  title: string;
  author: string;
  taggedFaculty?: string;
  content: string;
  timestamp: string;
  likes: number;
  hasLiked?: boolean;
  replies: DiscussionReply[];
}

interface StudentDiscussionsPageProps {
  onToast?: (msg: string) => void;
  onNavigate?: (page: any, courseId?: string) => void;
  onOpenAiModal?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const StudentDiscussionsPage: React.FC<StudentDiscussionsPageProps> = ({
  onToast,
  onOpenAiModal,
}) => {
  const [posts, setPosts] = useState<DiscussionPost[]>([
    {
      id: "disc-1",
      course: "Full-Stack AI Engineering",
      title: "Why does PagedAttention avoid external memory fragmentation in CUDA allocations?",
      author: "Arjun Mehta (You)",
      taggedFaculty: "@Prof. Rajesh Verma",
      content:
        "In lecture 1.2, Prof. Verma noted that standard continuous KV buffers suffer from 60-80% memory waste. How does PagedAttention's block table map virtual continuous token keys to non-contiguous physical blocks without cache invalidation penalties?",
      timestamp: "Today, 11:15 AM",
      likes: 12,
      hasLiked: false,
      replies: [
        {
          id: "rep-1",
          author: "Prof. Rajesh Verma",
          role: "faculty",
          content:
            "Great question, Arjun! The key is that the GPU kernel accesses the block table in SRAM prior to computing QK^T. Since pages are fixed size (e.g. 16 or 32 tokens), the memory allocator never has to search for variable-sized free chunks, entirely eliminating external fragmentation.",
          timestamp: "Today, 12:40 PM",
          likes: 9,
        },
        {
          id: "rep-2",
          author: "Kavita Rao",
          role: "student",
          content:
            "To add to Prof.'s point: this also enables zero-copy prompt sharing across parallel decoding streams during fork-and-join agent branching!",
          timestamp: "Today, 01:05 PM",
          likes: 4,
        },
      ],
    },
    {
      id: "disc-2",
      course: "Distributed Systems & KV-Cache",
      title: "Recommended chunk overlap when indexing technical code with recursive character splitter?",
      author: "Sneha Reddy",
      taggedFaculty: "@Karthik Sundaram",
      content:
        "For Python AST parsing, does 15% overlap guarantee that function decorator headers won't be truncated across chunk boundaries?",
      timestamp: "Yesterday",
      likes: 8,
      hasLiked: false,
      replies: [
        {
          id: "rep-3",
          author: "Karthik Sundaram",
          role: "faculty",
          content:
            "For codebases, prefer AST-aware splitters like tree-sitter rather than pure character splitters. If using character splitting, use at least 20-25% overlap with `\ndef ` and `\nclass ` as primary split delimiters.",
          timestamp: "Yesterday",
          likes: 7,
        },
      ],
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");

  // Ask Question Modal
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCourse, setNewCourse] = useState("Full-Stack AI Engineering");
  const [newTaggedFaculty, setNewTaggedFaculty] = useState("@Prof. Rajesh Verma");
  const [newContent, setNewContent] = useState("");

  // Report Inappropriate Content Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportedPostId, setReportedPostId] = useState("");
  const [reportReason, setReportReason] = useState("Off-topic or spam");

  // Inline Reply state
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const handleToggleLike = (postId: string) => {
    setPosts(
      posts.map((p) => {
        if (p.id === postId) {
          const hasLiked = !p.hasLiked;
          return {
            ...p,
            hasLiked,
            likes: hasLiked ? p.likes + 1 : p.likes - 1,
          };
        }
        return p;
      })
    );
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newPost: DiscussionPost = {
      id: `disc-${Date.now()}`,
      course: newCourse,
      title: newTitle,
      author: "Arjun Mehta (You)",
      taggedFaculty: newTaggedFaculty || undefined,
      content: newContent,
      timestamp: "Just now",
      likes: 0,
      replies: [],
    };

    setPosts([newPost, ...posts]);
    setIsAskModalOpen(false);
    setNewTitle("");
    setNewContent("");

    if (onToast) {
      onToast(`Question Posted: Your thread "${newTitle}" has been published to the forum! 🚀`);
    }
  };

  const handleAddReply = (postId: string) => {
    const text = replyDrafts[postId];
    if (!text || !text.trim()) return;

    const newReply: DiscussionReply = {
      id: `rep-${Date.now()}`,
      author: "Arjun Mehta (You)",
      role: "student",
      content: text,
      timestamp: "Just now",
      likes: 0,
    };

    setPosts(
      posts.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, newReply] } : p))
    );

    setReplyDrafts({ ...replyDrafts, [postId]: "" });

    if (onToast) {
      onToast("Reply Published: Your answer was posted to the discussion thread. 💬");
    }
  };

  const handleReportPost = () => {
    setIsReportModalOpen(false);
    if (onToast) {
      onToast("Report Submitted: Our faculty moderators have received your report for review. 🛡️");
    }
  };

  const handleJoinStudyCircle = () => {
    if (onToast) {
      onToast("Joined Cohort 7 Study Circle: Added to virtual Discord & Slack sync channel! 👥");
    }
  };

  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = courseFilter === "All" || p.course === courseFilter;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="flex flex-col gap-4 sm:gap-5 pb-10">
      {/* Page Header */}
      <section
        className="student-shared-panel p-5 sm:p-6 mb-0"
        aria-label="Course Discussions Header"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="card-title flex items-center gap-2 text-lg sm:text-xl font-bold text-[#171526] m-0">
                <MessageSquareIcon size={20} className="text-[#905FEB] shrink-0" />
                <span>Course Discussions & Study Groups</span>
              </h3>
              <Badge variant="default" className="shrink-0">
                Cohort Feed
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#514B68] mt-1.5 leading-relaxed">
              Ask technical questions, tag course faculty, exchange lab insights, and join peer study circles.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            {onOpenAiModal && (
              <button
                type="button"
                onClick={onOpenAiModal}
                className="px-3.5 h-9 rounded-full bg-[#F0EDFF] text-[#5F2BC0] text-xs font-bold hover:bg-[#E4DFFD] transition-colors flex items-center gap-1.5 cursor-pointer border border-[#D8C2FF]/60 shrink-0"
              >
                <span className="text-sm">✦</span>
                <span>Ask AI First</span>
              </button>
            )}
            <Button
              type="button"
              onClick={() => setIsAskModalOpen(true)}
              className="gap-2 shadow-sm shrink-0"
            >
              <PlusCircleIcon size={14} /> Ask a Question
            </Button>
          </div>
        </div>
      </section>

      {/* Active Study Circles Bar */}
      <Card className="p-4 sm:p-5 bg-gradient-to-r from-[#F0EDFF]/50 via-white to-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#905FEB]/10 flex items-center justify-center shrink-0">
              <UsersIcon size={18} className="text-[#905FEB]" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#171526]">Active Peer Study Groups</h4>
              <p className="text-[11px] sm:text-xs text-[#514B68] mt-0.5 leading-tight">
                Cohort 7 LangGraph Swarm Team (4 members) • Weekend vLLM Profiling Lab (6 members)
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleJoinStudyCircle}
            className="border-[#905FEB]/40 text-[#905FEB] hover:bg-[#F0EDFF] self-start sm:self-auto shrink-0"
          >
            Join Active Study Circle
          </Button>
        </div>
      </Card>

      {/* Search and Filters */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80 min-w-0">
            <SearchIcon size={14} className="absolute left-3.5 top-2.5 text-[#514B68]" />
            <input
              type="text"
              placeholder="Search forum questions & topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-full border border-[#E2DCEE] bg-[#FBFAFC] text-xs focus:outline-none focus:ring-2 focus:ring-[#905FEB]"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <span className="text-xs text-[#514B68] font-semibold whitespace-nowrap">Filter Course:</span>
            <StudentDropdown
              value={courseFilter}
              onChange={(val) => setCourseFilter(val)}
              options={[
                { value: "All", label: "All Courses" },
                { value: "Full-Stack AI Engineering", label: "Full-Stack AI Engineering" },
                { value: "Distributed Systems & KV-Cache", label: "Distributed Systems & KV-Cache" },
              ]}
              size="sm"
              fullWidth={false}
              rounded="full"
              triggerClassName="min-w-[190px]"
            />
          </div>
        </div>
      </Card>

      {/* Posts Stream */}
      <div className="flex flex-col gap-4">
        {filteredPosts.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <MessageSquareIcon size={32} className="mx-auto text-[#905FEB]/50" />
            <h4 className="font-bold text-sm text-[#171526]">No discussions match your filter</h4>
            <p className="text-xs text-[#514B68]">Try clearing your search query or selecting "All Courses".</p>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <Card key={post.id} className="p-5 space-y-4 hover:border-[#905FEB]/40">
              {/* Post Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-[#E2DCEE] pb-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {post.course}
                    </Badge>
                    {post.taggedFaculty && (
                      <Badge variant="default" className="text-[10px] font-bold">
                        Tagged: {post.taggedFaculty}
                      </Badge>
                    )}
                    <span className="text-xs text-[#514B68]">• {post.timestamp}</span>
                  </div>

                  <h3 className="font-bold text-base text-[#171526] leading-snug pt-0.5">
                    {post.title}
                  </h3>

                  <p className="text-xs text-[#514B68]">
                    Asked by <strong className="text-[#171526]">{post.author}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => {
                      setReportedPostId(post.id);
                      setIsReportModalOpen(true);
                    }}
                    className="h-7 px-2.5 rounded-full text-[11px] text-[#514B68] hover:text-[#E21D2D] hover:bg-[#FFE4E5] transition-colors flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <FlagIcon size={12} /> Report
                  </button>
                </div>
              </div>

              {/* Post Content */}
              <p className="text-xs text-[#171526] leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>

              {/* Like Counter & Reply Toggle */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  variant={post.hasLiked ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToggleLike(post.id)}
                  className={`gap-1.5 ${
                    post.hasLiked ? "bg-[#905FEB] text-white" : ""
                  }`}
                >
                  <ThumbsUpIcon size={13} />
                  <span>Helpful ({post.likes})</span>
                </Button>
                <span className="text-xs text-[#514B68] font-medium">
                  {post.replies.length} {post.replies.length === 1 ? "response" : "responses"}
                </span>
              </div>

              {/* Nested Replies */}
              {post.replies.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-[#E2DCEE] pl-2 sm:pl-4">
                  {post.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-3.5 rounded-[16px] border text-xs space-y-1.5 ${
                        reply.role === "faculty"
                          ? "bg-[#F0E7FF]/60 border-[#D8C2FF]"
                          : "bg-[#FBFAFC] border-[#E2DCEE]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#171526]">{reply.author}</span>
                          {reply.role === "faculty" && (
                            <Badge variant="default" className="text-[9px] font-bold">
                              Faculty Answer
                            </Badge>
                          )}
                        </div>
                        <span className="text-[#514B68]">{reply.timestamp}</span>
                      </div>

                      <p className="text-[#171526] leading-relaxed">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Reply Input */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Write your answer or follow-up clarification..."
                  value={replyDrafts[post.id] || ""}
                  onChange={(e) => setReplyDrafts({ ...replyDrafts, [post.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddReply(post.id);
                    }
                  }}
                  className="h-9 px-3.5 rounded-full border border-[#E2DCEE] bg-[#FBFAFC] text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-[#905FEB]"
                />
                <Button
                  size="sm"
                  onClick={() => handleAddReply(post.id)}
                  className="gap-1 shrink-0"
                >
                  <SendIcon size={12} /> Reply
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODAL: ASK QUESTION */}
      {/* ==================================================================== */}
      {isAskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsAskModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-[24px] shadow-2xl border border-[#E2DCEE] p-6 max-w-lg w-full space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E2DCEE] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#171526] flex items-center gap-2">
                  <PlusCircleIcon size={18} className="text-[#905FEB]" /> Ask a Question
                </h3>
                <p className="text-xs text-[#514B68] mt-0.5">
                  Post to the cohort discussion board. Tag instructors for official replies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAskModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#514B68] hover:bg-[#F0EDFF] hover:text-[#171526] transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#171526] block mb-1">Course *</label>
                <StudentDropdown
                  value={newCourse}
                  onChange={(val) => setNewCourse(val)}
                  options={[
                    "Full-Stack AI Engineering",
                    "Distributed Systems & KV-Cache",
                  ]}
                  rounded="full"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#171526] block mb-1">Tag Faculty / Instructor</label>
                <StudentDropdown
                  value={newTaggedFaculty}
                  onChange={(val) => setNewTaggedFaculty(val)}
                  options={[
                    { value: "@Prof. Rajesh Verma", label: "@Prof. Rajesh Verma (Lead Faculty)" },
                    { value: "@Dr. Priya Sharma", label: "@Dr. Priya Sharma (LLM Architect)" },
                    { value: "@Karthik Sundaram", label: "@Karthik Sundaram (Staff MLOps)" },
                    { value: "", label: "No tag" },
                  ]}
                  rounded="full"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#171526] block mb-1">Question Title *</label>
                <input
                  type="text"
                  placeholder="e.g. How does cross-encoder reranking handle multi-lingual queries?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-9 w-full rounded-full border border-[#E2DCEE] bg-[#FBFAFC] px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#905FEB]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#171526] block mb-1">Detailed Description *</label>
                <textarea
                  rows={4}
                  placeholder="Include code snippets, lecture references, or specific questions..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full rounded-[16px] border border-[#E2DCEE] bg-[#FBFAFC] p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#905FEB]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2DCEE]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAskModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                >
                  Post Question
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: REPORT INAPPROPRIATE CONTENT */}
      {/* ==================================================================== */}
      {isReportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsReportModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-[24px] shadow-2xl border border-[#E2DCEE] p-6 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between border-b border-[#E2DCEE] pb-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 text-[#E21D2D]">
                  <FlagIcon size={16} /> Report Inappropriate Content
                </h3>
                <p className="text-xs text-[#514B68] mt-0.5">
                  Help maintain a high academic standard in student discussions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#514B68] hover:bg-[#F0EDFF] hover:text-[#171526] transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <label className="text-xs font-bold text-[#171526] block">Select Reason</label>
              <StudentDropdown
                value={reportReason}
                onChange={(val) => setReportReason(val)}
                options={[
                  "Off-topic or spam",
                  "Academic dishonesty / Code dumping",
                  "Harassment or rude conduct",
                  "Misleading technical assertions",
                ]}
                rounded="full"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2DCEE]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReportModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReportPost}
              >
                Submit Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDiscussionsPage;
