import { useState, useMemo } from "react"
import { Icon } from "../../components/Icon"
import type {
  FaqItem,
  SupportTicket,
  StudentNavPage,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketReply,
} from "./studentTypes"
import { initialFaqs, initialSupportTickets } from "./studentMockData"

interface SupportHelpPageProps {
  onToast: (msg: string) => void
  onOpenAiModal: () => void
  onNavigate: (page: StudentNavPage) => void
  initialSection?: "help" | "support" | "tickets"
}

export function SupportHelpPage({
  onToast,
  onOpenAiModal,
  onNavigate,
  initialSection = "tickets",
}: SupportHelpPageProps) {
  // Main section switcher: Primary = Ticket Management ("tickets"), Secondary = Help Center ("help")
  const [activeSection, setActiveSection] = useState<"tickets" | "help">(
    initialSection === "help" ? "help" : "tickets",
  )

  // ==================== TICKET MANAGEMENT STATE ====================
  const [tickets, setTickets] = useState<SupportTicket[]>(initialSupportTickets)
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)

  // Filters & Search
  const [ticketSearch, setTicketSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"All" | TicketStatus>("All")
  const [categoryFilter, setCategoryFilter] = useState<"All" | TicketCategory>("All")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  // Create Ticket Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newSubject, setNewSubject] = useState("")
  const [newCategory, setNewCategory] = useState<TicketCategory>("Technical Issue")
  const [newPriority, setNewPriority] = useState<TicketPriority>("Medium")
  const [newDescription, setNewDescription] = useState("")
  const [newAttachment, setNewAttachment] = useState<{ name: string; size: string } | null>(null)

  // Validation Errors
  const [formErrors, setFormErrors] = useState<{
    subject?: string
    description?: string
  }>({})

  // Post-Creation Confirmation Modal State
  const [createdConfirmation, setCreatedConfirmation] = useState<SupportTicket | null>(null)

  // Reply state in Ticket Details View
  const [replyText, setReplyText] = useState("")
  const [replyAttachment, setReplyAttachment] = useState<{ name: string; size: string } | null>(null)

  // Category options requested by user
  const categoryOptions: TicketCategory[] = [
    "Technical Issue",
    "Course/Content",
    "Attendance",
    "Assignment",
    "Timetable",
    "Account/Profile",
    "Mentor",
    "Other",
  ]

  // Priority options requested by user
  const priorityOptions: TicketPriority[] = ["Low", "Medium", "High", "Urgent"]

  // Active selected ticket for details view
  const activeTicket = useMemo(() => {
    return tickets.find((t) => t.id === activeTicketId) || null
  }, [tickets, activeTicketId])

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Status filter
      if (statusFilter !== "All" && t.status !== statusFilter) return false
      // Category filter
      if (categoryFilter !== "All" && t.category !== categoryFilter) return false
      // Search query (matches Subject, ID, Description, or Category)
      if (ticketSearch.trim()) {
        const q = ticketSearch.toLowerCase()
        const matchesSubject = t.subject.toLowerCase().includes(q)
        const matchesId = t.id.toLowerCase().includes(q)
        const matchesCategory = t.category.toLowerCase().includes(q)
        const matchesDesc = t.description.toLowerCase().includes(q)
        if (!matchesSubject && !matchesId && !matchesCategory && !matchesDesc) {
          return false
        }
      }
      return true
    })
  }, [tickets, statusFilter, categoryFilter, ticketSearch])

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize))
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTickets.slice(start, start + pageSize)
  }, [filteredTickets, currentPage, pageSize])

  // Reset page when filter changes
  const handleFilterChange = (status: "All" | TicketStatus) => {
    setStatusFilter(status)
    setCurrentPage(1)
  }

  // ==================== TICKET CREATION LOGIC ====================
  const handleOpenCreateModal = () => {
    setNewSubject("")
    setNewCategory("Technical Issue")
    setNewPriority("Medium")
    setNewDescription("")
    setNewAttachment(null)
    setFormErrors({})
    setIsCreateModalOpen(true)
  }

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: { subject?: string; description?: string } = {}

    if (!newSubject.trim()) {
      errors.subject = "Please enter a subject describing your issue."
    }
    if (!newDescription.trim()) {
      errors.description = "Please provide detailed information about your issue."
    } else if (newDescription.trim().length < 15) {
      errors.description = "Description must be at least 15 characters long."
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const uniqueId = `TKT-${Math.floor(10000 + Math.random() * 90000)}`
    const now = new Date()
    const dateFormatted = `${now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}, ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`

    const initialReply: TicketReply = {
      id: `rep-${Date.now()}`,
      author: "Srimanth (Student)",
      role: "Student",
      avatar: "/assets/srimanth.png",
      timestamp: dateFormatted,
      content: newDescription.trim(),
      attachmentName: newAttachment?.name,
      attachmentSize: newAttachment?.size,
    }

    const createdTicket: SupportTicket = {
      id: uniqueId,
      subject: newSubject.trim(),
      category: newCategory,
      priority: newPriority,
      status: "Open",
      createdDate: dateFormatted,
      lastUpdate: "Just now by Student",
      description: newDescription.trim(),
      attachmentName: newAttachment?.name,
      attachmentSize: newAttachment?.size,
      replies: [initialReply],
    }

    setTickets((prev) => [createdTicket, ...prev])
    setIsCreateModalOpen(false)
    setCreatedConfirmation(createdTicket)
    onToast(`Ticket ${uniqueId} created successfully!`)
  }

  // ==================== REPLY IN TICKET DETAILS ====================
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTicket) return
    if (!replyText.trim()) {
      onToast("Please write a message before sending your reply.")
      return
    }

    const now = new Date()
    const timeFormatted = `${now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}, ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`

    const newReplyItem: TicketReply = {
      id: `rep-${Date.now()}`,
      author: "Srimanth (Student)",
      role: "Student",
      avatar: "/assets/srimanth.png",
      timestamp: timeFormatted,
      content: replyText.trim(),
      attachmentName: replyAttachment?.name,
      attachmentSize: replyAttachment?.size,
    }

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === activeTicket.id) {
          return {
            ...t,
            lastUpdate: "Just now by Student",
            replies: [...t.replies, newReplyItem],
          }
        }
        return t
      }),
    )

    setReplyText("")
    setReplyAttachment(null)
    onToast("Reply sent to support staff!")
  }

  // Update ticket status
  const handleUpdateStatus = (ticketId: string, newStatus: TicketStatus) => {
    const now = new Date()
    const timeFormatted = `${now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}, ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`

    const systemReply: TicketReply = {
      id: `sys-${Date.now()}`,
      author: "System Note",
      role: "System",
      timestamp: timeFormatted,
      content: `Ticket status updated to "${newStatus}" by student.`,
    }

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: newStatus,
            lastUpdate: timeFormatted,
            replies: [...t.replies, systemReply],
            resolutionNotes:
              newStatus === "Resolved"
                ? "Marked as resolved by student."
                : t.resolutionNotes,
          }
        }
        return t
      }),
    )
    onToast(`Ticket status updated to ${newStatus}.`)
  }

  // Status Badge Component
  const renderStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case "Open":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Open
          </span>
        )
      case "In Progress":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            In Progress
          </span>
        )
      case "Resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E7FF9C] text-[#253700] border border-[#D2F66A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#385000]" />
            Resolved
          </span>
        )
      case "Closed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            Closed
          </span>
        )
    }
  }

  // Priority Badge Component
  const renderPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case "Urgent":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
            🔥 Urgent
          </span>
        )
      case "High":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            ⚡ High
          </span>
        )
      case "Medium":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
            Medium
          </span>
        )
      case "Low":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
            Low
          </span>
        )
    }
  }

  // ==================== HELP CENTER STATE ====================
  const [faqs] = useState<FaqItem[]>(initialFaqs)
  const [faqSearch, setFaqSearch] = useState("")
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>("All")
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("faq-1")

  const filteredFaqs = faqs.filter((faq) => {
    if (selectedFaqCategory !== "All" && faq.category !== selectedFaqCategory)
      return false
    if (!faqSearch.trim()) return true
    const q = faqSearch.toLowerCase()
    return (
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q)
    )
  })

  // Quick feature guide cards for Help Center
  const guideCards: {
    title: string
    desc: string
    icon: string
    page: StudentNavPage
    btnLabel: string
  }[] = [
      {
        title: "Class Timetable & Schedule",
        desc: "Check your daily lecture rooms, laboratory schedules, and join live streams.",
        icon: "📅",
        page: "Timetable",
        btnLabel: "Open Timetable →",
      },
      {
        title: "Attendance & Leaves",
        desc: "Monitor your 75% semester minimum threshold and submit medical absence slips.",
        icon: "✅",
        page: "Attendance",
        btnLabel: "Track Attendance →",
      },
      {
        title: "Assignments & Submissions",
        desc: "Upload GitHub repositories and Jupyter notebooks before deadline cutoffs.",
        icon: "📝",
        page: "Assignments",
        btnLabel: "View Assignments →",
      },
      {
        title: "Faculty Mentoring & Office Hours",
        desc: "Meet Prof. Srimanth Adep for thesis advising, research feedback, and guidance.",
        icon: "👨‍🏫",
        page: "Mentor Details",
        btnLabel: "Mentor Details →",
      },
      {
        title: "Grades & Academic Transcripts",
        desc: "Inspect grade distributions, honors standing, and download verified PDF transcripts.",
        icon: "📈",
        page: "Grades",
        btnLabel: "Check Grades →",
      },
      {
        title: "Submit a Ticket",
        desc: "Need immediate assistance with GPU clusters, portal access, or timetable conflicts?",
        icon: "🎧",
        page: "Support & Help",
        btnLabel: "Raise a Ticket →",
      },
    ]

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner & Section Switcher */}
      <section
        className="panel p-6 bg-white border border-zinc-100 shadow-sm rounded-3xl"
        aria-label="Support & Help Header"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-full bg-[#F0E7FF] text-[#5F2BC0] flex items-center justify-center font-bold text-sm">
                🎧
              </span>
              <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                Support & Help Center
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F0E7FF] text-[#5F2BC0]">
                24/7 Student Desk
              </span>
            </div>
            <p className="text-xs text-zinc-500 max-w-2xl">
              Raise and track support tickets, submit administrative requests, and
              explore official portal handbook guides.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Section Switcher Tabs */}
            <div className="flex items-center p-1 bg-[#F1F0F3] rounded-full border border-zinc-200">
              <button
                type="button"
                onClick={() => {
                  setActiveSection("tickets")
                  setActiveTicketId(null)
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeSection === "tickets"
                  ? "bg-[#905FEB] text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
                  }`}
              >
                <span>🎧 My Tickets & Requests</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeSection === "tickets" ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-700"
                  }`}>
                  {tickets.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("help")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeSection === "help"
                  ? "bg-[#905FEB] text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
                  }`}
              >
                <span>💡 Help Center & FAQs</span>
              </button>
            </div>

            {/* Create Ticket Primary CTA */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-full bg-[#905FEB] text-white text-xs font-bold hover:bg-[#7D4BD8] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span className="text-sm font-black">+</span>
              <span>Create Ticket</span>
            </button>

            {/* Ask AI Helper */}
            <button
              type="button"
              onClick={onOpenAiModal}
              className="px-3.5 py-2 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>✦</span>
              <span>Ask AI</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 1: TICKET MANAGEMENT (PRIMARY)                   */}
      {/* ========================================================= */}
      {activeSection === "tickets" && (
        <div className="flex flex-col gap-5">
          {/* If viewing a single ticket details */}
          {activeTicket ? (
            <div className="flex flex-col gap-4">
              {/* Top Navigation: Back to Tickets */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTicketId(null)}
                  className="px-3.5 py-1.5 rounded-full bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                >
                  <span>←</span>
                  <span>Back to My Tickets</span>
                </button>

                <div className="flex items-center gap-2">
                  {activeTicket.status !== "Resolved" && activeTicket.status !== "Closed" && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(activeTicket.id, "Resolved")}
                      className="px-3 py-1.5 rounded-full bg-[#AEEB00] text-[#151B00] text-xs font-bold hover:bg-[#9ED500] cursor-pointer shadow-sm transition-colors"
                    >
                      ✓ Mark as Resolved
                    </button>
                  )}
                  {activeTicket.status !== "Closed" ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(activeTicket.id, "Closed")}
                      className="px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-xs font-bold hover:bg-zinc-200 cursor-pointer transition-colors"
                    >
                      Close Ticket
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(activeTicket.id, "Open")}
                      className="px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold hover:bg-purple-200 cursor-pointer transition-colors"
                    >
                      Reopen Ticket
                    </button>
                  )}
                </div>
              </div>

              {/* Ticket Details Card */}
              <div className="panel p-6 bg-white border border-zinc-100 shadow-sm rounded-3xl">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-4 border-b border-zinc-100">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap mb-2">
                      <span className="font-mono font-bold text-xs bg-[#F0E7FF] text-[#5F2BC0] px-2.5 py-1 rounded-lg">
                        {activeTicket.id}
                      </span>
                      {renderStatusBadge(activeTicket.status)}
                      {renderPriorityBadge(activeTicket.priority)}
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-600">
                        {activeTicket.category}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-zinc-900 tracking-tight">
                      {activeTicket.subject}
                    </h3>
                  </div>

                  <div className="text-left md:text-right text-[11px] text-zinc-400 space-y-1">
                    <div>
                      <strong className="text-zinc-600">Created:</strong>{" "}
                      {activeTicket.createdDate}
                    </div>
                    <div>
                      <strong className="text-zinc-600">Last Update:</strong>{" "}
                      {activeTicket.lastUpdate}
                    </div>
                  </div>
                </div>

                {/* Original Description */}
                <div className="py-4 border-b border-zinc-100">
                  <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                    Issue Description
                  </h4>
                  <p className="text-xs text-zinc-700 leading-relaxed bg-[#F1F0F3] p-4 rounded-2xl border border-zinc-200">
                    {activeTicket.description}
                  </p>

                  {/* Attachment if present */}
                  {activeTicket.attachmentName && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-zinc-500">
                        Attachment:
                      </span>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold">
                        <Icon name="document" size={13} />
                        <span>{activeTicket.attachmentName}</span>
                        {activeTicket.attachmentSize && (
                          <span className="text-[10px] text-purple-600 font-mono">
                            ({activeTicket.attachmentSize})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            onToast(`Downloading ${activeTicket.attachmentName}...`)
                          }
                          className="ml-1 text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Staff Resolution Notes if available */}
                {activeTicket.resolutionNotes && (
                  <div className="py-3 px-4 my-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs">
                    <strong className="text-emerald-900 block font-bold mb-1">
                      Resolution Note:
                    </strong>
                    <p className="text-emerald-800 leading-relaxed text-[11px]">
                      {activeTicket.resolutionNotes}
                    </p>
                  </div>
                )}

                {/* Conversation / Reply Thread */}
                <div className="pt-4">
                  <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-3">
                    Conversation & Activity ({activeTicket.replies.length})
                  </h4>

                  <div className="space-y-3.5 mb-6">
                    {activeTicket.replies.map((reply) => {
                      const isStudent = reply.role === "Student"
                      const isSystem = reply.role === "System"

                      if (isSystem) {
                        return (
                          <div
                            key={reply.id}
                            className="py-1 px-3 text-center text-[11px] text-zinc-500 italic bg-zinc-50 rounded-xl"
                          >
                            <span>{reply.content}</span>
                            <span className="ml-2 text-zinc-400 not-italic">
                              ({reply.timestamp})
                            </span>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={reply.id}
                          className={`p-4 rounded-2xl border transition-all ${isStudent
                            ? "bg-purple-50/40 border-purple-200 ml-0 md:ml-6"
                            : "bg-white border-zinc-200 mr-0 md:mr-6"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {reply.avatar ? (
                                <img
                                  src={reply.avatar}
                                  alt={reply.author}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                                  {reply.role === "Faculty" ? "👨‍🏫" : "🎧"}
                                </div>
                              )}
                              <span className="text-xs font-bold text-zinc-900">
                                {reply.author}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isStudent
                                  ? "bg-[#F0E7FF] text-[#5F2BC0]"
                                  : reply.role === "Faculty"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-indigo-100 text-indigo-800"
                                  }`}
                              >
                                {reply.role}
                              </span>
                            </div>

                            <span className="text-[10px] text-zinc-400 font-medium">
                              {reply.timestamp}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-line pl-8">
                            {reply.content}
                          </p>

                          {reply.attachmentName && (
                            <div className="mt-2.5 pl-8 flex items-center gap-2">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-zinc-700 text-[11px] font-medium">
                                <Icon name="document" size={12} />
                                <span>{reply.attachmentName}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onToast(`Downloading ${reply.attachmentName}...`)
                                  }
                                  className="text-purple-700 font-bold hover:underline cursor-pointer ml-1"
                                >
                                  Download
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Reply Composer Box */}
                  {activeTicket.status !== "Closed" ? (
                    <form
                      onSubmit={handleSendReply}
                      className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs"
                    >
                      <label className="font-bold text-zinc-800 block mb-1.5">
                        Add a Follow-up Reply:
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Provide more context, test results, or answers to staff inquiries..."
                        className="w-full p-3 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-[#905FEB] text-xs leading-relaxed mb-3"
                      />

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyAttachment({
                                name: "terminal_trace_log.txt",
                                size: "48 KB",
                              })
                              onToast("Attached terminal_trace_log.txt")
                            }}
                            className="px-3 py-1.5 rounded-xl border border-dashed border-zinc-300 text-zinc-600 text-xs font-semibold hover:bg-white cursor-pointer flex items-center gap-1.5"
                          >
                            <Icon name="document" size={13} />
                            <span>
                              {replyAttachment
                                ? replyAttachment.name
                                : "+ Attach screenshot / log"}
                            </span>
                          </button>
                          {replyAttachment && (
                            <button
                              type="button"
                              onClick={() => setReplyAttachment(null)}
                              className="text-xs text-rose-500 hover:underline cursor-pointer font-bold"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="px-5 py-2 rounded-full bg-[#905FEB] text-white text-xs font-bold hover:bg-[#7D4BD8] transition-colors cursor-pointer shadow-sm"
                        >
                          Send Reply
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-4 bg-zinc-100 rounded-2xl text-center text-xs text-zinc-500">
                      This ticket is closed. If you still require help on this topic,
                      you can click <strong>Reopen Ticket</strong> above or raise a new ticket.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Ticket List Overview ("My Tickets") */
            <div className="flex flex-col gap-4">
              {/* Filter, Search & Action Bar */}
              <div className="panel p-5 bg-white border border-zinc-100 shadow-sm rounded-3xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  {/* Status Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(["All", "Open", "In Progress", "Resolved", "Closed"] as const).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleFilterChange(st)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${statusFilter === st
                            ? "bg-[#905FEB] text-white shadow-sm"
                            : "bg-[#F1F0F3] text-zinc-600 hover:bg-zinc-200"
                            }`}
                        >
                          {st}
                        </button>
                      ),
                    )}
                  </div>

                  {/* Category Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 font-medium hidden sm:inline">
                      Category:
                    </span>
                    <select
                      value={categoryFilter}
                      onChange={(e) => {
                        setCategoryFilter(e.target.value as "All" | TicketCategory)
                        setCurrentPage(1)
                      }}
                      className="px-3 py-1.5 rounded-full border border-zinc-200 bg-[#F1F0F3] text-xs font-semibold text-zinc-700 focus:outline-none focus:border-[#905FEB] cursor-pointer"
                    >
                      <option value="All">All Categories</option>
                      {categoryOptions.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Icon name="search" size={14} />
                  </div>
                  <input
                    type="text"
                    value={ticketSearch}
                    onChange={(e) => {
                      setTicketSearch(e.target.value)
                      setCurrentPage(1)
                    }}
                    placeholder="Search by ticket ID, subject, category, or description..."
                    className="w-full pl-10 pr-24 py-2.5 rounded-full text-xs bg-[#F1F0F3] border border-zinc-200 text-zinc-900 focus:outline-none focus:border-[#905FEB] focus:bg-white transition-colors"
                  />
                  {ticketSearch && (
                    <button
                      type="button"
                      onClick={() => setTicketSearch("")}
                      className="absolute right-3 top-2 text-xs text-zinc-400 hover:text-zinc-700 font-bold px-2 py-0.5 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* My Tickets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        <th className="py-3 px-3">Ticket ID</th>
                        <th className="py-3 px-3">Subject</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Priority</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Date Created</th>
                        <th className="py-3 px-3">Last Updated</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {paginatedTickets.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-zinc-500">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <span className="text-3xl">🎫</span>
                              <p className="font-bold text-zinc-700 text-sm">
                                No support tickets found
                              </p>
                              <p className="text-xs text-zinc-400 max-w-sm">
                                {ticketSearch || statusFilter !== "All" || categoryFilter !== "All"
                                  ? "Try adjusting your search query or status filter."
                                  : "You have not raised any support requests yet."}
                              </p>
                              <button
                                type="button"
                                onClick={handleOpenCreateModal}
                                className="mt-2 px-4 py-2 rounded-full bg-[#905FEB] text-white text-xs font-bold hover:bg-[#7D4BD8] cursor-pointer shadow-sm"
                              >
                                + Create First Ticket
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedTickets.map((ticket) => (
                          <tr
                            key={ticket.id}
                            className="hover:bg-purple-50/30 transition-colors group"
                          >
                            <td className="py-3.5 px-3 whitespace-nowrap font-mono font-bold text-[#5F2BC0]">
                              {ticket.id}
                            </td>
                            <td className="py-3.5 px-3">
                              <div
                                onClick={() => setActiveTicketId(ticket.id)}
                                className="font-bold text-zinc-900 group-hover:text-[#905FEB] transition-colors cursor-pointer line-clamp-1 flex items-center gap-1.5"
                                title={ticket.subject}
                              >
                                <span>{ticket.subject}</span>
                                {ticket.attachmentName && (
                                  <span className="text-[10px] text-zinc-400" title="Has attachment">
                                    📎
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                                {ticket.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {renderPriorityBadge(ticket.priority)}
                            </td>
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {renderStatusBadge(ticket.status)}
                            </td>
                            <td className="py-3.5 px-3 whitespace-nowrap text-zinc-500 text-[11px]">
                              {ticket.createdDate}
                            </td>
                            <td className="py-3.5 px-3 whitespace-nowrap text-zinc-500 text-[11px]">
                              {ticket.lastUpdate}
                            </td>
                            <td className="py-3.5 px-3 whitespace-nowrap text-right">
                              <button
                                type="button"
                                onClick={() => setActiveTicketId(ticket.id)}
                                className="px-3 py-1 rounded-full bg-[#F0E7FF] text-[#5F2BC0] text-xs font-bold hover:bg-[#905FEB] hover:text-white transition-all cursor-pointer shadow-xs"
                              >
                                View Details →
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredTickets.length > pageSize && (
                  <div className="pt-4 mt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      Showing {(currentPage - 1) * pageSize + 1} to{" "}
                      {Math.min(currentPage * pageSize, filteredTickets.length)} of{" "}
                      {filteredTickets.length} tickets
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="px-2 text-xs font-bold text-zinc-700">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="px-3 py-1 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: HELP CENTER & FAQS (SECONDARY)                */}
      {/* ========================================================= */}
      {activeSection === "help" && (
        <div className="flex flex-col gap-6">
          {/* Quick Guidance Cards */}
          <section aria-label="Feature Quick Guidance">
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">
                  Student Portal Usage Instructions
                </h3>
                <span className="text-[11px] text-zinc-500">
                  Fast shortcuts to primary learning modules and instructions
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {guideCards.map((card) => (
                <div
                  key={card.title}
                  className="p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{card.icon}</span>
                      <h4 className="font-bold text-xs text-zinc-900">
                        {card.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
                      {card.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        if (card.title === "Submit a Ticket") {
                          setActiveSection("tickets")
                          handleOpenCreateModal()
                        } else {
                          onToast(`Opening ${card.page}...`)
                          onNavigate(card.page)
                        }
                      }}
                      className="text-xs font-bold text-[#905FEB] hover:text-[#5F2BC0] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>{card.btnLabel}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Knowledge Base FAQs with Search */}
          <section
            className="panel p-6 bg-white border border-zinc-100 shadow-sm rounded-3xl"
            aria-label="Knowledge Base FAQs"
          >
            <div className="card-header mb-4 flex-wrap gap-3">
              <div>
                <h3 className="card-title text-base font-black">
                  Frequently Asked Questions & Troubleshooting
                </h3>
                <span className="text-[11px] text-zinc-500">
                  Official student handbook guidance with verified answers
                </span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "All",
                  "Getting Started",
                  "Courses & Labs",
                  "Submissions & Quizzes",
                  "Attendance & Leaves",
                  "Technical",
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedFaqCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${selectedFaqCategory === cat
                      ? "bg-[#905FEB] text-white shadow-sm"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-5">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Icon name="search" size={14} />
              </div>
              <input
                type="text"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search troubleshooting guidance, submissions, timetables, or leaves..."
                className="w-full pl-10 pr-24 py-2.5 rounded-full text-xs bg-[#F1F0F3] border border-zinc-200 text-zinc-900 focus:outline-none focus:border-[#905FEB] focus:bg-white transition-colors"
              />
              {faqSearch && (
                <button
                  type="button"
                  onClick={() => setFaqSearch("")}
                  className="absolute right-3 top-2 text-xs text-zinc-400 hover:text-zinc-700 font-bold px-2 py-0.5 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* FAQ Accordion List */}
            <div className="divide-y divide-zinc-100">
              {filteredFaqs.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  No questions match "{faqSearch}". Try searching another
                  keyword or switch to the Ticket Management tab.
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqId === faq.id
                  return (
                    <div key={faq.id} className="py-3.5">
                      <div
                        onClick={() =>
                          setExpandedFaqId(isExpanded ? null : faq.id)
                        }
                        className="flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 pr-4">
                          <span className="w-5 h-5 rounded-md bg-[#F0E7FF] text-[#5F2BC0] flex items-center justify-center font-extrabold text-[11px] flex-shrink-0">
                            ?
                          </span>
                          <span className="text-xs font-bold text-zinc-900 group-hover:text-[#905FEB] transition-colors">
                            {faq.question}
                          </span>
                          <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-100 text-zinc-500">
                            {faq.category}
                          </span>
                        </div>
                        <span className="text-zinc-400 text-xs font-mono">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pl-7 pr-2 flex flex-col gap-2.5">
                          <p className="text-xs text-zinc-600 leading-relaxed bg-[#F0E7FF]/40 p-3.5 rounded-xl border border-purple-100">
                            {faq.answer}
                          </p>

                          {faq.linkTarget && (
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    faq.linkTarget === "Support" ||
                                    faq.linkTarget === "Support & Help"
                                  ) {
                                    setActiveSection("tickets")
                                    handleOpenCreateModal()
                                  } else {
                                    onToast(
                                      `Navigating to ${faq.linkTarget}...`,
                                    )
                                    if (faq.linkTarget) {
                                      onNavigate(faq.linkTarget)
                                    }
                                  }
                                }}
                                className="px-3.5 py-1.5 rounded-full bg-[#905FEB] text-white text-xs font-bold hover:bg-[#7D4BD8] transition-colors cursor-pointer shadow-sm inline-flex items-center gap-1.5"
                              >
                                <span>
                                  {faq.linkLabel || `Go to ${faq.linkTarget} →`}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Still Need Assistance Banner */}
          <section className="p-6 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-5">
            <div>
              <h4 className="text-lg font-black mb-1">
                Didn't find what you need in the FAQs?
              </h4>
              <p className="text-xs text-purple-200 max-w-lg">
                Submit an official ticket to university departments, or prepare
                your questions with our 24/7 AI tutor.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={onOpenAiModal}
                className="px-5 py-2.5 rounded-full bg-white text-purple-900 text-xs font-bold hover:bg-purple-50 cursor-pointer shadow"
              >
                ✦ Ask AI Assistant
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSection("tickets")
                  handleOpenCreateModal()
                }}
                className="px-5 py-2.5 rounded-full bg-[#AEEB00] text-[#151B00] text-xs font-bold hover:bg-[#9ED500] cursor-pointer shadow"
              >
                + Create Support Ticket →
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CREATE A TICKET FORM                             */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-zinc-100 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#F0E7FF] text-[#5F2BC0] flex items-center justify-center font-bold text-sm">
                  ✉️
                </span>
                <div>
                  <h3 className="text-base font-black text-zinc-900">
                    Create Support Ticket
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Submit an official request to faculty or campus administration.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="flex flex-col gap-4 text-xs">
              {/* Subject */}
              <div>
                <label className="font-bold text-zinc-800 block mb-1">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => {
                    setNewSubject(e.target.value)
                    if (formErrors.subject) {
                      setFormErrors((prev) => ({ ...prev, subject: undefined }))
                    }
                  }}
                  placeholder="e.g. GPU quota exceeded on node slurm-h100-04"
                  className={`w-full p-2.5 rounded-xl border bg-white text-zinc-900 focus:outline-none focus:border-[#905FEB] ${formErrors.subject ? "border-rose-400 bg-rose-50/30" : "border-zinc-200"
                    }`}
                />
                {formErrors.subject && (
                  <span className="text-[11px] font-bold text-rose-500 mt-1 block">
                    {formErrors.subject}
                  </span>
                )}
              </div>

              {/* Issue Category (All 8 user requested categories) */}
              <div>
                <label className="font-bold text-zinc-800 block mb-1">
                  Issue Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-[#905FEB] cursor-pointer"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Select the department or subject area responsible for this request.
                </span>
              </div>

              {/* Priority Level */}
              <div>
                <label className="font-bold text-zinc-800 block mb-1">
                  Priority <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {priorityOptions.map((p) => {
                    const isSelected = newPriority === p
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewPriority(p)}
                        className={`py-2 px-2 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${isSelected
                          ? p === "Urgent"
                            ? "bg-rose-50 border-rose-500 text-rose-700 shadow-xs"
                            : p === "High"
                              ? "bg-amber-50 border-amber-500 text-amber-800 shadow-xs"
                              : p === "Medium"
                                ? "bg-yellow-50 border-yellow-500 text-yellow-800 shadow-xs"
                                : "bg-[#F0E7FF] border-[#905FEB] text-[#5F2BC0] shadow-xs"
                          : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                          }`}
                      >
                        {p === "Urgent"
                          ? "🔥 Urgent"
                          : p === "High"
                            ? "⚡ High"
                            : p === "Medium"
                              ? "Medium"
                              : "Low"}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-zinc-800 block mb-1">
                  Description of the Issue <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={newDescription}
                  onChange={(e) => {
                    setNewDescription(e.target.value)
                    if (formErrors.description) {
                      setFormErrors((prev) => ({ ...prev, description: undefined }))
                    }
                  }}
                  placeholder="Provide precise details, steps to reproduce, course codes, error traces, or student ID..."
                  className={`w-full p-2.5 rounded-xl border bg-white text-zinc-900 focus:outline-none focus:border-[#905FEB] leading-relaxed ${formErrors.description ? "border-rose-400 bg-rose-50/30" : "border-zinc-200"
                    }`}
                />
                {formErrors.description && (
                  <span className="text-[11px] font-bold text-rose-500 mt-1 block">
                    {formErrors.description}
                  </span>
                )}
              </div>

              {/* Attachment Upload */}
              <div>
                <label className="font-bold text-zinc-800 block mb-1">
                  Attachment Upload (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewAttachment({
                        name: "quantum_cluster_diagnostics.txt",
                        size: "32 KB",
                      })
                      onToast("Simulated diagnostics log attached.")
                    }}
                    className="px-3.5 py-2 rounded-xl border border-dashed border-zinc-300 text-zinc-600 text-xs font-semibold hover:bg-zinc-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Icon name="document" size={13} />
                    <span>
                      {newAttachment ? newAttachment.name : "+ Attach screenshot / file"}
                    </span>
                  </button>
                  {newAttachment && (
                    <button
                      type="button"
                      onClick={() => setNewAttachment(null)}
                      className="text-xs text-rose-500 hover:underline cursor-pointer font-bold"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {newAttachment && (
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Attached: {newAttachment.name} ({newAttachment.size})
                  </span>
                )}
              </div>

              {/* Action Buttons: Submit Ticket and Cancel */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 text-zinc-600 text-xs font-bold hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#905FEB] text-white text-xs font-bold hover:bg-[#7D4BD8] cursor-pointer shadow-sm transition-colors"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CONFIRMATION WITH "VIEW TICKET" OPTION           */}
      {/* ========================================================= */}
      {createdConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setCreatedConfirmation(null)}
        >
          <div
            className="bg-white rounded-3xl border border-zinc-100 shadow-2xl max-w-md w-full p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-[#E7FF9C] text-[#253700] mx-auto flex items-center justify-center text-2xl font-black mb-3">
              ✓
            </div>
            <h3 className="text-lg font-black text-zinc-900 mb-1">
              Ticket Submitted Successfully!
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Your support request has been logged in the student services queue.
            </p>

            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 mb-5 text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Ticket ID:</span>
                <span className="font-mono font-bold text-[#5F2BC0]">
                  {createdConfirmation.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Subject:</span>
                <span className="font-bold text-zinc-800 line-clamp-1">
                  {createdConfirmation.subject}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Category:</span>
                <span className="font-bold text-zinc-700">
                  {createdConfirmation.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Status:</span>
                <span className="text-blue-600 font-bold">● Open</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setCreatedConfirmation(null)}
                className="px-4 py-2 rounded-full border border-zinc-200 text-zinc-600 text-xs font-bold hover:bg-zinc-50 cursor-pointer"
              >
                Back to Tickets List
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = createdConfirmation.id
                  setCreatedConfirmation(null)
                  setActiveTicketId(id)
                }}
                className="px-5 py-2 rounded-full bg-[#905FEB] text-white text-xs font-bold hover:bg-[#7D4BD8] cursor-pointer shadow-sm transition-colors"
              >
                View Ticket Details →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
