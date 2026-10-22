import { useState } from "react"
import { Icon } from "./Icon"
import type { FacultyMember, AuditLogItem } from "../types"

export function AddFacultyModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (faculty: Omit<FacultyMember, "id" | "rating" | "attendanceRate">) => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [title, setTitle] = useState("")
  const [department, setDepartment] = useState("STEM & Computing")
  const [classes, setClasses] = useState("Year 4 Maple")

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, ".")}@quantum-lms.edu`,
      title: title || "Classroom Educator",
      department,
      classesAssigned: classes.split(",").map((c) => c.trim()),
      studentCount: 24,
      status: "Active",
      avatar: "/assets/student-3.png",
    })
    setName("")
    setEmail("")
    setTitle("")
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Icon name="users" size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Add Faculty Member</h3>
              <p className="text-xs text-zinc-500">Register new educator or staff to Quantum AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 text-zinc-500"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Julian Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase">Official Email</label>
            <input
              type="email"
              placeholder="j.vance@quantum-lms.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600"
              >
                <option value="STEM & Computing">STEM & Computing</option>
                <option value="Natural Sciences">Natural Sciences</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Humanities">Humanities</option>
                <option value="Applied Technology">Applied Technology</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase">Academic Title</label>
              <input
                type="text"
                placeholder="Senior Educator"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase">Assigned Classes (comma separated)</label>
            <input
              type="text"
              placeholder="Year 4 Maple, Robotics Lab"
              value={classes}
              onChange={(e) => setClasses(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-colors"
            >
              Enroll Faculty Member
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function SchoolAnnouncementModal({
  isOpen,
  onClose,
  onSend,
}: {
  isOpen: boolean
  onClose: () => void
  onSend: (title: string, priority: string, targetAudience: string) => void
}) {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [priority, setPriority] = useState("High Priority")
  const [audience, setAudience] = useState("All Faculty & Parents (508 Users)")

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSend(title, priority, audience)
    setTitle("")
    setMessage("")
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Icon name="bell" size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Broadcast Announcement</h3>
              <p className="text-xs text-zinc-500">Dispatch school-wide bulletin notification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 text-zinc-500"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase">Subject / Headline</label>
            <input
              type="text"
              required
              placeholder="e.g. Term 2 AI Diagnostic Assessment Schedule"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase">Target Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600"
              >
                <option value="All Faculty & Parents (508 Users)">All Faculty & Parents (508 Users)</option>
                <option value="All Teaching Faculty (28 Staff)">All Teaching Faculty (28 Staff)</option>
                <option value="Parents Only (480 Families)">Parents Only (480 Families)</option>
                <option value="Year 4 Maple Class Parents (24 Families)">Year 4 Maple Parents (24 Families)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase">Priority Alert</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600"
              >
                <option value="Urgent Bulletin">Urgent Bulletin</option>
                <option value="High Priority">High Priority</option>
                <option value="Standard Notice">Standard Notice</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase">Announcement Body</label>
            <textarea
              rows={3}
              placeholder="Enter announcement details for portals and SMS broadcast..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-colors"
            >
              Broadcast Bulletin →
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AuditDetailModal({
  log,
  onClose,
}: {
  log: AuditLogItem | null
  onClose: () => void
}) {
  if (!log) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl border border-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-zinc-900 text-white">
              <Icon name="shield" size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Security Audit Record</h3>
              <p className="text-xs text-zinc-500">Immutable Cryptographic Log #{log.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 text-zinc-500"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between">
              <span className="font-bold text-zinc-500">Timestamp:</span>
              <span className="font-mono text-zinc-900">{log.timestamp}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-zinc-500">Actor:</span>
              <span className="font-semibold text-zinc-900">{log.actor} ({log.role})</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-zinc-500">IP Origin:</span>
              <span className="font-mono text-zinc-900">{log.ip}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-zinc-500">Severity:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  log.severity === "security"
                    ? "bg-red-100 text-red-700"
                    : log.severity === "warning"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {log.severity}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-zinc-500">Category:</span>
              <span className="font-semibold text-zinc-800">{log.category}</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-zinc-700 uppercase mb-1">Action Description</div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-xs text-zinc-800 leading-relaxed font-medium">
              {log.action}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-zinc-700 uppercase mb-1">Target Resource</div>
            <div className="p-2.5 bg-zinc-900 text-zinc-100 rounded-xl font-mono text-[11px]">
              {log.target}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-black rounded-xl transition-colors"
          >
            Close Audit Inspector
          </button>
        </div>
      </div>
    </div>
  )
}
