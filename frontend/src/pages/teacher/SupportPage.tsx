import { useState, useEffect, useMemo, useRef } from "react"
import { Icon } from "../../components/Icon"
import type { IconName } from "../../types"
import { HexColorField } from "../../components/HexColorField"

export type TeacherTicketCategory =
  | "Account & Access Management"
  | "Course & Content Management"
  | "Assignments & Assessments"
  | "Live Classes & Attendance"
  | "Technical Support"
  | "Communication & Notifications"
  | "Others"

export const TEACHER_TICKET_CATEGORIES: TeacherTicketCategory[] = [
  "Account & Access Management",
  "Course & Content Management",
  "Assignments & Assessments",
  "Live Classes & Attendance",
  "Technical Support",
  "Communication & Notifications",
  "Others",
]

export const normalizeCategory = (cat: string): TeacherTicketCategory => {
  if (cat === "Account & Access Management" || cat === "Login & Access" || cat === "Student Management") {
    return "Account & Access Management"
  }
  if (cat === "Course & Content Management" || cat === "Courses & Lessons") {
    return "Course & Content Management"
  }
  if (cat === "Assignments & Assessments") {
    return "Assignments & Assessments"
  }
  if (cat === "Live Classes & Attendance" || cat === "Live Classes" || cat === "Attendance") {
    return "Live Classes & Attendance"
  }
  if (cat === "Technical Support" || cat === "Technical Issue") {
    return "Technical Support"
  }
  if (cat === "Communication & Notifications") {
    return "Communication & Notifications"
  }
  return "Others"
}

export interface TicketMessage {
  id: string
  senderId: string
  senderName: string
  senderRole: "Teacher" | "Support Specialist" | "Academic Registrar"
  senderAvatar?: string
  message: string
  timestamp: string
  attachment?: {
    name: string
    size: string
  }
}

export interface TeacherSupportTicket {
  id: string
  subject: string
  category: TeacherTicketCategory
  description: string
  status: TeacherTicketStatus
  submittedAt: string
  lastUpdatedAt: string
  teacherId: string
  teacherName: string
  attachment?: {
    name: string
    size: string
  }
  conversation: TicketMessage[]
  resolutionDetails?: string
}

export type TeacherTicketStatus =
  | "Open"
  | "In Progress"
  | "Awaiting Response"
  | "Resolved"
  | "Closed"

// -------------------------------------------------------------
// Initial Mock Support Requests for Srimanth (Lead Educator)
// -------------------------------------------------------------
export const initialTeacherTickets: TeacherSupportTicket[] = [
  {
    id: "TKT-4081",
    subject: "Audio echo and video desync during Maple Class Live Studio stream",
    category: "Live Classes & Attendance",
    description:
      "During our Year 4 live lecture yesterday, students reported a 1.5-second audio feedback echo whenever more than 18 attendees activated their microphones. We tested using the WebRTC studio mode on Chrome 124.",
    status: "In Progress",
    submittedAt: "2026-10-24T14:30:00Z",
    lastUpdatedAt: "2026-10-25T16:45:00Z",
    teacherId: "u-1",
    teacherName: "Srimanth",
    attachment: {
      name: "studio_latency_telemetry.log",
      size: "42.8 KB",
    },
    conversation: [
      {
        id: "msg-1",
        senderId: "u-1",
        senderName: "Srimanth",
        senderRole: "Teacher",
        senderAvatar: "/assets/srimanth.png",
        message:
          "During our Year 4 live lecture yesterday, students reported a 1.5-second audio feedback echo whenever more than 18 attendees activated their microphones. We tested using the WebRTC studio mode on Chrome 124.",
        timestamp: "2026-10-24T14:30:00Z",
        attachment: {
          name: "studio_latency_telemetry.log",
          size: "42.8 KB",
        },
      },
      {
        id: "msg-2",
        senderId: "agent-1",
        senderName: "Elena Rostova",
        senderRole: "Support Specialist",
        senderAvatar: "/assets/student-2.png",
        message:
          "Hi Srimanth, thanks for reporting. We reviewed your stream telemetrics from Session #104. We noticed acoustic echo cancellation was set to passthrough on the WebRTC mixer. We have adjusted the audio jitter buffer threshold on your studio profile. Could you run a 2-minute test class before your next scheduled lecture?",
        timestamp: "2026-10-25T16:45:00Z",
      },
    ],
  },
  {
    id: "TKT-4074",
    subject: "Bulk import of Year 4 student attendance records failed for Week 8",
    category: "Live Classes & Attendance",
    description:
      "Exported attendance CSV from the biometric scanner had validation errors on 3 transfer students (roll numbers: CS26-042, CS26-089, CS26-015). The system flagged missing batch headers.",
    status: "Resolved",
    submittedAt: "2026-10-21T09:15:00Z",
    lastUpdatedAt: "2026-10-23T11:20:00Z",
    teacherId: "u-1",
    teacherName: "Srimanth",
    resolutionDetails:
      "Data format discrepancy resolved. CSV header mapping updated to match student roll number schema with automatic leading zero preservation.",
    conversation: [
      {
        id: "msg-10",
        senderId: "u-1",
        senderName: "Srimanth",
        senderRole: "Teacher",
        senderAvatar: "/assets/srimanth.png",
        message:
          "Exported attendance CSV from the biometric scanner had validation errors on 3 transfer students. The system flagged missing batch headers.",
        timestamp: "2026-10-21T09:15:00Z",
      },
      {
        id: "msg-11",
        senderId: "agent-2",
        senderName: "Marcus Chen",
        senderRole: "Academic Registrar",
        senderAvatar: "/assets/student-3.png",
        message:
          "Hello Srimanth! We inspected the roster sync; the IDs for the three transfer students had leading zeroes trimmed by Excel. We updated the CSV parser to preserve string formatting and processed the attendance records for Week 8.",
        timestamp: "2026-10-22T14:10:00Z",
      },
      {
        id: "msg-12",
        senderId: "u-1",
        senderName: "Srimanth",
        senderRole: "Teacher",
        senderAvatar: "/assets/srimanth.png",
        message:
          "Thank you Marcus, verified all 24 student records now display correctly in the Attendance breakdown.",
        timestamp: "2026-10-23T11:20:00Z",
      },
    ],
  },
  {
    id: "TKT-4062",
    subject: "Assignment grading rubric percentage weights sum validation error",
    category: "Assignments & Assessments",
    description:
      "When creating a 4-criteria rubric totaling 50 marks, the system reported a weight sum mismatch at 99.9% due to floating point calculation and prevented publishing.",
    status: "Awaiting Response",
    submittedAt: "2026-10-23T16:00:00Z",
    lastUpdatedAt: "2026-10-25T10:15:00Z",
    teacherId: "u-1",
    teacherName: "Srimanth",
    conversation: [
      {
        id: "msg-20",
        senderId: "u-1",
        senderName: "Srimanth",
        senderRole: "Teacher",
        senderAvatar: "/assets/srimanth.png",
        message:
          "When creating a 4-criteria rubric totaling 50 marks, the system reported a weight sum mismatch at 99.9% due to floating point calculation and prevented publishing.",
        timestamp: "2026-10-23T16:00:00Z",
      },
      {
        id: "msg-21",
        senderId: "agent-3",
        senderName: "Priya Nair",
        senderRole: "Support Specialist",
        senderAvatar: "/assets/student-4.png",
        message:
          "Hi Srimanth, our engineering team pushed a patch to resolve the floating point rounding error in the rubric validator (tolerance increased to 0.1%). Could you please verify saving your rubric again and confirm if you can publish?",
        timestamp: "2026-10-25T10:15:00Z",
      },
    ],
  },
  {
    id: "TKT-4055",
    subject: "Request to add co-teacher permissions for Computer Vision guest lecturer",
    category: "Course & Content Management",
    description:
      "Dr. Alistair Vance will be delivering guest lectures for Module 4 (Neural Object Detection). Please provision co-teacher access for his Quantum faculty account on the Maple Class course page.",
    status: "Open",
    submittedAt: "2026-10-25T18:20:00Z",
    lastUpdatedAt: "2026-10-25T18:20:00Z",
    teacherId: "u-1",
    teacherName: "Srimanth",
    conversation: [
      {
        id: "msg-30",
        senderId: "u-1",
        senderName: "Srimanth",
        senderRole: "Teacher",
        senderAvatar: "/assets/srimanth.png",
        message:
          "Dr. Alistair Vance will be delivering guest lectures for Module 4 (Neural Object Detection). Please provision co-teacher access for his Quantum faculty account on the Maple Class course page.",
        timestamp: "2026-10-25T18:20:00Z",
      },
    ],
  },
  {
    id: "TKT-4048",
    subject: "Sandbox GPU workstation Jupyter terminal connection timeout",
    category: "Technical Support",
    description:
      "JupyterLab kernel disconnecting unexpectedly every 8 minutes on GPU node #3 for students executing PyTorch training assignments.",
    status: "Resolved",
    submittedAt: "2026-10-20T10:00:00Z",
    lastUpdatedAt: "2026-10-21T15:30:00Z",
    teacherId: "u-1",
    teacherName: "Srimanth",
    resolutionDetails:
      "Pod inactivity lease increased from 8 minutes to 90 minutes across all student compute clusters.",
    conversation: [
      {
        id: "msg-40",
        senderId: "u-1",
        senderName: "Srimanth",
        senderRole: "Teacher",
        senderAvatar: "/assets/srimanth.png",
        message:
          "JupyterLab kernel disconnecting unexpectedly every 8 minutes on GPU node #3 for students executing PyTorch training assignments.",
        timestamp: "2026-10-20T10:00:00Z",
      },
      {
        id: "msg-41",
        senderId: "agent-1",
        senderName: "Elena Rostova",
        senderRole: "Support Specialist",
        senderAvatar: "/assets/student-2.png",
        message:
          "Hi Srimanth, we modified the ingress WebSocket keep-alive interval and adjusted pod idle timeout limits to 90 minutes. Resolved on node #3.",
        timestamp: "2026-10-21T15:30:00Z",
      },
    ],
  },
  {
    id: "TKT-4039",
    subject: "SMS notification broadcast failed for rescheduled Module 3 quiz",
    category: "Communication & Notifications",
    description:
      "Urgent SMS alert to 24 students regarding room shift from Hall B to Lab 4 failed to deliver on 6 carrier networks.",
    status: "Open",
    submittedAt: "2026-10-25T19:00:00Z",
    lastUpdatedAt: "2026-10-25T19:00:00Z",
    teacherId: "u-1",
    teacherName: "Srimanth",
    conversation: [
      {
        id: "msg-50",
        senderId: "u-1",
        senderName: "Srimanth",
        senderRole: "Teacher",
        senderAvatar: "/assets/srimanth.png",
        message:
          "Urgent SMS alert to 24 students regarding room shift from Hall B to Lab 4 failed to deliver on 6 carrier networks.",
        timestamp: "2026-10-25T19:00:00Z",
      },
    ],
  },
]

const STORAGE_KEY = "quantum_teacher_support_tickets_v1"

// -------------------------------------------------------------
// Custom Dropdown Option & Component
// -------------------------------------------------------------
export interface DropdownOption<T extends string> {
  value: T
  label: string
  icon?: IconName
}

export function CustomDropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select issue",
  className = "",
  buttonClassName = "",
  menuClassName = "",
}: {
  value: T
  onChange: (val: T) => void
  options: DropdownOption<T>[]
  placeholder?: string
  className?: string
  buttonClassName?: string
  menuClassName?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2.5 transition-all cursor-pointer select-none text-left ${buttonClassName} ${
          isOpen ? "ring-2 ring-purple-400/50 border-purple-400 bg-white shadow-xs" : ""
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">
          {selectedOption ? (
            <span className="truncate font-semibold text-xs text-zinc-800">
              {selectedOption.label}
            </span>
          ) : (
            <span className="truncate font-normal text-xs text-zinc-400">
              {placeholder || "Select issue"}
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-purple-600" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 mt-1.5 z-50 bg-white/98 backdrop-blur-md rounded-2xl border border-zinc-200/90 shadow-xl py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
          role="listbox"
        >
          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-50">
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-purple-50 text-purple-800 font-bold"
                      : "text-zinc-700 hover:bg-purple-50/50 hover:text-purple-700 font-medium"
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-purple-600 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export const categoryFilterOptions: DropdownOption<string>[] = [
  { value: "All", label: "All Categories" },
  { value: "Account & Access Management", label: "Account & Access Management" },
  { value: "Course & Content Management", label: "Course & Content Management" },
  { value: "Assignments & Assessments", label: "Assignments & Assessments" },
  { value: "Live Classes & Attendance", label: "Live Classes & Attendance" },
  { value: "Technical Support", label: "Technical Support" },
  { value: "Communication & Notifications", label: "Communication & Notifications" },
  { value: "Others", label: "Others" },
]

export const modalCategoryOptions: DropdownOption<TeacherTicketCategory>[] = [
  { value: "Account & Access Management", label: "Account & Access Management" },
  { value: "Course & Content Management", label: "Course & Content Management" },
  { value: "Assignments & Assessments", label: "Assignments & Assessments" },
  { value: "Live Classes & Attendance", label: "Live Classes & Attendance" },
  { value: "Technical Support", label: "Technical Support" },
  { value: "Communication & Notifications", label: "Communication & Notifications" },
  { value: "Others", label: "Others" },
]

// -------------------------------------------------------------
// Header for Teacher Support Page
// -------------------------------------------------------------
export function SupportHeader({
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onOpenCreateModal,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onOpenCreateModal: () => void
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>Help & Support</span>
          <span className="wave-emoji" role="img" aria-label="life preserver">
            🛟
          </span>
        </div>
        <div className="subtitle">
          Submit technical requests, track ticket status, and access teaching resources
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by subject or ID..."
            aria-label="Search support tickets"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1 cursor-pointer"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <HexColorField hexColor={hexColor} onChangeHex={onChangeHexColor} />
        <button
          className="ask-ai"
          onClick={onOpenCreateModal}
          aria-label="Create Support Request"
          style={{ gap: "6px" }}
        >
          <span>+</span>
          New Request
        </button>
      </div>
    </header>
  )
}

// -------------------------------------------------------------
// Main SupportPage Component
// -------------------------------------------------------------
export default function SupportPage({
  searchQuery = "",
  setSearchQuery = () => {},
  hexColor,
  onChangeHexColor,
  onNavigateTab,
  onToast,
}: {
  searchQuery?: string
  setSearchQuery?: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onNavigateTab?: (tab: string) => void
  onToast: (msg: string) => void
}) {
  // Load tickets from localStorage or fallback
  const [tickets, setTickets] = useState<TeacherSupportTicket[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((t) => ({
              ...t,
              category: normalizeCategory(t.category),
            }))
          }
        }
      } catch (err) {
        console.error("Failed to load teacher support tickets:", err)
      }
    }
    return initialTeacherTickets
  })

  // Save tickets to localStorage whenever updated
  const updateTickets = (newTickets: TeacherSupportTicket[]) => {
    setTickets(newTickets)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTickets))
    } catch (err) {
      console.error("Failed to persist teacher support tickets:", err)
    }
  }

  // Active status filter tab
  const [statusFilter, setStatusFilter] = useState<"All" | TeacherTicketStatus>("All")
  const [categoryFilter, setCategoryFilter] = useState<string>("All")

  // Selected ticket for details modal/drawer
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  // Create Ticket Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newSubject, setNewSubject] = useState("")
  const [newCategory, setNewCategory] = useState<TeacherTicketCategory | "">("")
  const [newDescription, setNewDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<{ subject?: string; category?: string; description?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Follow-up message state
  const [followUpText, setFollowUpText] = useState("")
  const [followUpError, setFollowUpError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)


  // Filtered tickets list
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesSub = t.subject.toLowerCase().includes(q)
        const matchesId = t.id.toLowerCase().includes(q)
        const matchesDesc = t.description.toLowerCase().includes(q)
        if (!matchesSub && !matchesId && !matchesDesc) return false
      }
      if (statusFilter !== "All" && t.status !== statusFilter) {
        return false
      }
      if (categoryFilter !== "All" && t.category !== categoryFilter) {
        return false
      }
      return true
    })
  }, [tickets, searchQuery, statusFilter, categoryFilter])

  // Selected ticket object
  const selectedTicket = useMemo(() => {
    return tickets.find((t) => t.id === selectedTicketId) || null
  }, [tickets, selectedTicketId])

  // File selection handler with validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) return

    // Max 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setFileError("File size exceeds 10MB limit. Please choose a smaller attachment.")
      return
    }

    // Supported extensions
    const allowed = [".pdf", ".png", ".jpg", ".jpeg", ".txt", ".log", ".zip", ".csv"]
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase()
    if (!allowed.includes(ext)) {
      setFileError(`Unsupported file extension (${ext}). Allowed: PDF, PNG, JPG, TXT, LOG, CSV, ZIP.`)
      return
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`

    setSelectedFile({
      name: file.name,
      size: sizeFormatted,
    })
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Create Ticket Submission
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: { subject?: string; category?: string; description?: string } = {}

    if (!newSubject.trim()) {
      errors.subject = "Subject is required."
    } else if (newSubject.trim().length < 5) {
      errors.subject = "Subject must be at least 5 characters long."
    }

    if (!newCategory) {
      errors.category = "Please select an issue category."
    }

    if (!newDescription.trim()) {
      errors.description = "Description is required."
    } else if (newDescription.trim().length < 15) {
      errors.description = "Please provide more details (at least 15 characters)."
    }

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)

    const now = new Date().toISOString()
    const ticketId = `TKT-${Math.floor(4100 + Math.random() * 900)}`

    const newTicket: TeacherSupportTicket = {
      id: ticketId,
      subject: newSubject.trim(),
      category: newCategory as TeacherTicketCategory,
      description: newDescription.trim(),
      status: "Open",
      submittedAt: now,
      lastUpdatedAt: now,
      teacherId: "u-1",
      teacherName: "Srimanth",
      attachment: selectedFile || undefined,
      conversation: [
        {
          id: `msg-${Date.now()}`,
          senderId: "u-1",
          senderName: "Srimanth",
          senderRole: "Teacher",
          senderAvatar: "/assets/srimanth.png",
          message: newDescription.trim(),
          timestamp: now,
          attachment: selectedFile || undefined,
        },
      ],
    }

    const nextTickets = [newTicket, ...tickets]
    updateTickets(nextTickets)

    setIsSubmitting(false)
    setIsCreateModalOpen(false)
    setNewSubject("")
    setNewCategory("")
    setNewDescription("")
    setSelectedFile(null)
    setFormErrors({})

    onToast(`Support Request #${ticketId} created successfully! Our team is reviewing it.`)
  }

  // Follow-up message handler
  const handleSendFollowUp = () => {
    if (!selectedTicket) return
    if (!followUpText.trim()) {
      setFollowUpError("Please enter a follow-up message before sending.")
      return
    }

    setFollowUpError(null)
    const now = new Date().toISOString()
    const newMsg: TicketMessage = {
      id: `msg-${Date.now()}`,
      senderId: "u-1",
      senderName: "Srimanth",
      senderRole: "Teacher",
      senderAvatar: "/assets/srimanth.png",
      message: followUpText.trim(),
      timestamp: now,
    }

    const updatedTickets = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          lastUpdatedAt: now,
          status: t.status === "Awaiting Response" ? ("In Progress" as TeacherTicketStatus) : t.status,
          conversation: [...t.conversation, newMsg],
        }
      }
      return t
    })

    updateTickets(updatedTickets)
    setFollowUpText("")
    onToast("Follow-up response added to ticket timeline.")
  }

  // Status badge styling helper
  const getStatusBadge = (status: TeacherTicketStatus) => {
    switch (status) {
      case "Open":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "In Progress":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "Awaiting Response":
        return "bg-purple-50 text-purple-700 border-purple-200 font-bold"
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "Closed":
        return "bg-zinc-100 text-zinc-600 border-zinc-200"
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200"
    }
  }

  // Category badge styling helper
  const getCategoryBadge = (category: TeacherTicketCategory) => {
    switch (category) {
      case "Account & Access Management":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "Course & Content Management":
        return "bg-indigo-50 text-indigo-700 border-indigo-200"
      case "Assignments & Assessments":
        return "bg-purple-50 text-purple-700 border-purple-200"
      case "Live Classes & Attendance":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "Technical Support":
        return "bg-rose-50 text-rose-700 border-rose-200"
      case "Communication & Notifications":
        return "bg-cyan-50 text-cyan-700 border-cyan-200"
      case "Others":
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200"
    }
  }

  return (
    <div className="support-page space-y-6">
      {/* Teacher Dashboard Header */}
      <SupportHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
        onOpenCreateModal={() => {
          setNewSubject("")
          setNewCategory("")
          setNewDescription("")
          setSelectedFile(null)
          setFormErrors({})
          setIsCreateModalOpen(true)
        }}
      />

      {/* Overview Section */}
      <section className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-bold text-zinc-900">
              Quantum Faculty Support Desk
            </h2>
          </div>
          <p className="text-xs text-zinc-500 max-w-2xl leading-relaxed">
            Welcome to the educator assistance portal for Maple Class. Our academic operations and technical engineering teams provide dedicated troubleshooting for live lectures, attendance discrepancies, grading rubrics, and LMS account configurations. Average response time is under 2 hours during school operating hours.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewSubject("")
            setNewCategory("")
            setNewDescription("")
            setSelectedFile(null)
            setFormErrors({})
            setIsCreateModalOpen(true)
          }}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <span>+</span>
          <span>Create Support Request</span>
        </button>
      </section>


      {/* Main Support Requests Section */}
      <section className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar: Filters and Search */}
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {(["All", "Open", "In Progress", "Awaiting Response", "Resolved", "Closed"] as const).map((st) => {
              const isActive = statusFilter === st
              const count =
                st === "All"
                  ? tickets.length
                  : tickets.filter((t) => t.status === st).length

              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <span>{st}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <CustomDropdown
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
              options={categoryFilterOptions}
              buttonClassName="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 focus:outline-none cursor-pointer min-w-[210px] shadow-2xs"
              menuClassName="min-w-[240px] right-0 left-auto"
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Ticket ID</th>
                <th className="py-3.5 px-3">Subject</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3">Submitted Date</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Last Updated</th>
                <th className="py-3.5 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <p className="font-semibold text-zinc-700">No support requests found</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {searchQuery
                        ? "No tickets match your search query."
                        : "You haven't submitted any requests in this status category."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const subDate = new Date(ticket.submittedAt)
                  const updDate = new Date(ticket.lastUpdatedAt)

                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                        {ticket.id}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-zinc-900 group-hover:text-purple-700 max-w-[280px]">
                        <div className="truncate">{ticket.subject}</div>
                        {ticket.attachment && (
                          <div className="text-[10px] text-zinc-400 font-normal flex items-center gap-1 mt-0.5">
                            <Icon name="document" size={11} />
                            <span>{ticket.attachment.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getCategoryBadge(
                            ticket.category
                          )}`}
                        >
                          {ticket.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-zinc-600">
                        {subDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                            ticket.status
                          )}`}
                        >
                          {ticket.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-zinc-500">
                        {updDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 pr-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTicketId(ticket.id)
                          }}
                          className="px-3 py-1 rounded-lg bg-zinc-100 hover:bg-purple-100 hover:text-purple-700 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>


      {/* ========================================================
          CREATE SUPPORT REQUEST MODAL
          ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Create a Support Request
                </h3>
                <p className="text-xs text-zinc-500">
                  Provide details so our operations team can assist you
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              {/* Subject */}
              <div className="space-y-1">
                <label className="font-bold text-zinc-700">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => {
                    setNewSubject(e.target.value)
                    if (formErrors.subject) setFormErrors({ ...formErrors, subject: undefined })
                  }}
                  placeholder="Brief summary of the issue (e.g. Attendance sync error)"
                  className={`w-full px-3 py-2 rounded-xl border text-zinc-800 placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                    formErrors.subject ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                  }`}
                />
                {formErrors.subject && (
                  <p className="text-[11px] text-red-600">{formErrors.subject}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="font-bold text-zinc-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  value={newCategory}
                  onChange={(val) => {
                    setNewCategory(val as TeacherTicketCategory)
                    if (formErrors.category) setFormErrors({ ...formErrors, category: undefined })
                  }}
                  placeholder="Select issue"
                  options={modalCategoryOptions}
                  buttonClassName={`px-3.5 py-2.5 rounded-xl border bg-white hover:border-purple-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-2xs ${
                    formErrors.category ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                  }`}
                />
                {formErrors.category && (
                  <p className="text-[11px] text-red-600">{formErrors.category}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-zinc-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={newDescription}
                  onChange={(e) => {
                    setNewDescription(e.target.value)
                    if (formErrors.description) setFormErrors({ ...formErrors, description: undefined })
                  }}
                  placeholder="Describe what occurred, any error messages displayed, and steps to reproduce..."
                  className={`w-full p-3 rounded-xl border text-zinc-800 placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                    formErrors.description ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                  }`}
                />
                {formErrors.description && (
                  <p className="text-[11px] text-red-600">{formErrors.description}</p>
                )}
              </div>

              {/* Optional Attachment */}
              <div className="space-y-1">
                <label className="font-bold text-zinc-700">
                  Optional Attachment (Screenshot, error log, or document)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="teacher-support-file"
                  />
                  <label
                    htmlFor="teacher-support-file"
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="document" size={13} />
                    <span>Choose File</span>
                  </label>
                  <span className="text-[11px] text-zinc-400">
                    Max 10MB (PDF, PNG, JPG, TXT, LOG, CSV, ZIP)
                  </span>
                </div>

                {selectedFile && (
                  <div className="mt-2 p-2 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <Icon name="document" size={14} />
                      <span className="font-bold text-purple-900 truncate">{selectedFile.name}</span>
                      <span className="text-[10px] text-purple-600">({selectedFile.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="text-xs font-bold text-red-600 hover:text-red-800 px-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {fileError && <p className="text-[11px] text-red-600 mt-1">{fileError}</p>}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          SUPPORT REQUEST DETAILS MODAL
          ======================================================== */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-purple-700">
                    {selectedTicket.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                      selectedTicket.status
                    )}`}
                  >
                    {selectedTicket.status}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getCategoryBadge(
                      selectedTicket.category
                    )}`}
                  >
                    {selectedTicket.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-zinc-900 mt-1">
                  {selectedTicket.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketId(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Ticket Metadata Bar */}
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-[10px] uppercase font-bold text-zinc-400">Submitted By</div>
                <div className="font-semibold text-zinc-800">{selectedTicket.teacherName}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-zinc-400">Submission Date</div>
                <div className="font-semibold text-zinc-800">
                  {new Date(selectedTicket.submittedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-zinc-400">Last Updated</div>
                <div className="font-semibold text-zinc-800">
                  {new Date(selectedTicket.lastUpdatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>

            {/* Resolution Banner if present */}
            {selectedTicket.resolutionDetails && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Icon name="check" size={14} />
                  <span>Resolution Details</span>
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  {selectedTicket.resolutionDetails}
                </p>
              </div>
            )}

            {/* Conversation Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Conversation & Activity Timeline
              </h4>

              {selectedTicket.conversation.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs bg-zinc-50 rounded-xl">
                  Our support engineering team has received your ticket and is actively reviewing. Estimated response time is under 2 hours.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedTicket.conversation.map((msg) => {
                    const isTeacher = msg.senderRole === "Teacher"
                    return (
                      <div
                        key={msg.id}
                        className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                          isTeacher
                            ? "bg-purple-50/40 border-purple-200 ml-4 sm:ml-8"
                            : "bg-white border-zinc-200/90 mr-4 sm:mr-8 shadow-xs"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900">
                              {msg.senderName}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                isTeacher
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-zinc-100 text-zinc-700"
                              }`}
                            >
                              {msg.senderRole}
                            </span>
                          </div>
                          <span className="text-zinc-400">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>

                        <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">
                          {msg.message}
                        </p>

                        {msg.attachment && (
                          <div className="pt-2 border-t border-zinc-200/60 flex items-center gap-2 text-[11px] text-zinc-600">
                            <Icon name="document" size={12} />
                            <span className="font-semibold">{msg.attachment.name}</span>
                            <span className="text-zinc-400">({msg.attachment.size})</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Follow-Up Message Input */}
            {selectedTicket.status !== "Closed" && (
              <div className="pt-3 border-t border-zinc-100 space-y-2 text-xs">
                <label className="font-bold text-zinc-800">
                  Add Follow-Up Message
                </label>
                <textarea
                  rows={3}
                  value={followUpText}
                  onChange={(e) => {
                    setFollowUpText(e.target.value)
                    if (followUpError) setFollowUpError(null)
                  }}
                  placeholder="Type an additional response or question regarding this ticket..."
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-zinc-800 text-xs placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                {followUpError && (
                  <p className="text-[11px] text-red-600">{followUpError}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-400">
                    Posting will notify the assigned support specialist.
                  </span>
                  <button
                    type="button"
                    onClick={handleSendFollowUp}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Send Follow-up
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-zinc-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedTicketId(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
