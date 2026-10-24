import { useState, useEffect } from "react"
import type { AssignmentItem, StudentItem } from "../types"
import { Icon } from "./Icon"

export function NewAssignmentModal({
  isOpen,
  onClose,
  onSubmit,
  initialTitle,
  initialSubject,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (assignment: Omit<AssignmentItem, "id">) => void
  initialTitle?: string
  initialSubject?: string
}) {
  const [title, setTitle] = useState(initialTitle || "")
  const [subject, setSubject] = useState(initialSubject || "Reading Comprehension")
  const [dueDate, setDueDate] = useState("Oct 30")

  useEffect(() => {
    if (initialTitle) setTitle(initialTitle)
    if (initialSubject) setSubject(initialSubject)
  }, [initialTitle, initialSubject, isOpen])

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSubmit({
      title: title.trim(),
      icon: subject.includes("Math") || subject.includes("Fractions")
        ? "chart"
        : subject.includes("Science")
          ? "ruler"
          : "book",
      meta: `Year 4 Due ${dueDate}`,
      status: "Assigned",
      tone: "yellow",
    })
    setTitle("")
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold tracking-tight">Create Assignment</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Assignment Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Geometry & Angles"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Subject Type
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="form-select-standard"
            >
              <option value="Reading Comprehension">Reading Comprehension</option>
              <option value="Fractions Practice">Fractions & Math</option>
              <option value="Grammar Worksheet">English Grammar</option>
              <option value="Science Quiz">Science & Experiments</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Due Date
            </label>
            <input
              type="text"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 h-10 rounded-xl btn-primary text-xs font-bold transition-colors shadow-sm"
            >
              Add Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AddStudentModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (student: Omit<StudentItem, "id">) => void
}) {
  const [name, setName] = useState("")
  const [parentName, setParentName] = useState("")
  const [parentEmail, setParentEmail] = useState("")
  const [status, setStatus] = useState<"Excelling" | "On Track" | "Needs Attention">("On Track")

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const randomNum = Math.floor(100 + Math.random() * 900)
    onSubmit({
      name: name.trim(),
      rollNumber: `#Y4-${randomNum}`,
      image: `/assets/student-${(randomNum % 8) + 1}.png`,
      completion: status === "Excelling" ? 92 : status === "On Track" ? 80 : 65,
      average: status === "Excelling" ? 90 : status === "On Track" ? 78 : 64,
      attendance: 96,
      status,
      tone: status === "Excelling" ? "lime" : status === "On Track" ? "pink" : "yellow",
      subjects: { english: 82, math: 80, science: 85, art: 90 },
      tags: ["Enthusiastic", "New Student"],
      parentName: parentName.trim() || `${name.trim()} Guardian`,
      parentEmail: parentEmail.trim() || `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    })
    setName("")
    setParentName("")
    setParentEmail("")
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold tracking-tight">Add Student to Roster</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Student Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Benjamin Walker"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Academic Tier
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="form-select-standard"
            >
              <option value="Excelling">Excelling (Grade A)</option>
              <option value="On Track">On Track (Grade B)</option>
              <option value="Needs Attention">Needs Attention (Grade C)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Parent / Guardian Name
            </label>
            <input
              type="text"
              placeholder="e.g., Katherine Walker"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Parent Email Address
            </label>
            <input
              type="email"
              placeholder="e.g., katherine@example.com"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 h-10 rounded-xl btn-primary text-xs font-bold transition-colors shadow-sm"
            >
              Enroll Student
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AskAiModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [prompt, setPrompt] = useState("")
  const [reply, setReply] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setReply(
        `Based on Maple Class performance, 2 students (Liam & Ava) could benefit from reviewing decimal arithmetic before Thursday's quiz. Would you like me to generate a tailored 10-minute recap worksheet?`
      )
    }, 600)
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-black text-[#f3ff9b] grid place-items-center text-sm">
              ✦
            </span>
            <h2 className="text-lg font-bold tracking-tight">Quantum AI Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="text-xs text-gray-600 font-normal">
            Ask any pedagogical or classroom question. AI analyzes recent student submissions and progress data.
          </div>

          <form onSubmit={handleAsk} className="flex flex-col gap-3">
            <textarea
              rows={3}
              placeholder="e.g., Which students need extra support in Math this week?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)] resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 h-9 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="px-5 h-9 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <span>✦</span>
                <span>{loading ? "Analyzing..." : "Ask Assistant"}</span>
              </button>
            </div>
          </form>

          {reply && (
            <div className="mt-2 p-3.5 rounded-xl bg-purple-50 border border-purple-150 text-xs text-purple-950 leading-relaxed font-normal">
              <strong className="block text-purple-900 font-bold mb-1">
                AI Recommendation:
              </strong>
              {reply}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ReportSenderModal({
  isOpen,
  onClose,
  onSent,
  initialTarget,
}: {
  isOpen: boolean
  onClose: () => void
  onSent: (title: string) => void
  initialTarget?: string
}) {
  const [recipient, setRecipient] = useState(initialTarget ? `Parent of ${initialTarget}` : "All Year 4 Maple Parents")
  const [reportType, setReportType] = useState(initialTarget ? `${initialTarget} – Bi-Weekly Progress Evaluation` : "Term 1 Mid-Term Comprehensive Evaluation")

  useEffect(() => {
    if (initialTarget) {
      setRecipient(`Parent of ${initialTarget}`)
      setReportType(`${initialTarget} – Bi-Weekly Progress Evaluation`)
    }
  }, [initialTarget])

  if (!isOpen) return null

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    onSent(reportType)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold tracking-tight">Send Parent Report</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleSend} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Report Subject
            </label>
            <input
              type="text"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Recipients
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
            />
          </div>

          <div className="p-3 rounded-xl bg-purple-50 text-[11.5px] text-purple-900 font-normal">
            This will automatically compile attendance, quiz scores, and recent assignment completion statistics.
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 h-10 rounded-xl btn-primary text-xs font-bold transition-colors shadow-sm"
            >
              Dispatch Report
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="toast-notice" role="status">
      <span className="w-5 h-5 rounded-full bg-[#a8ed00] text-black grid place-items-center text-xs font-bold">
        ✓
      </span>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-zinc-400 hover:text-white"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  )
}
