import { useState, useMemo, useEffect } from "react"
import type {
  CurrentUser,
  UserRole,
  FacultyMember,
  AuditLogItem,
  CampusTenant,
  ClassRoomInfo,
} from "../types"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"
import { MetricCard } from "../components/MetricCard"
import { AdminSidebar } from "../components/AdminSidebar"
import {
  AddFacultyModal,
  SchoolAnnouncementModal,
  AuditDetailModal,
} from "../components/AdminModals"
import {
  initialSuperAdminMetrics,
  initialAdminMetrics,
  initialFaculty,
  initialAuditLogs,
  initialCampuses,
  initialClassRooms,
} from "../data/adminMockData"

interface AdminPortalProps {
  role: "Super Admin" | "Admin"
  currentUser: CurrentUser
  onSwitchRole: (role: UserRole) => void
  onLogout: () => void
  onToast: (msg: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  isLightBg?: boolean
}

export default function AdminPortal({
  role,
  currentUser,
  onSwitchRole,
  onLogout,
  onToast,
  hexColor,
  onChangeHexColor,
  isLightBg,
}: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<string>(
    role === "Super Admin" ? "System Health" : "Overview"
  )

  // Automatically reset active tab to role default if current tab is not supported by target role
  useEffect(() => {
    if (
      role === "Super Admin" &&
      !["System Health", "Campuses", "Access Control", "Audit Logs", "AI Engine", "Faculty & Staff", "School Pulse"].includes(activeTab)
    ) {
      setActiveTab("System Health")
    } else if (
      role === "Admin" &&
      !["Overview", "Faculty Directory", "Student Roster", "Class Schedules", "School Reports", "School Settings"].includes(activeTab)
    ) {
      setActiveTab("Overview")
    }
  }, [role, activeTab])

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCampus, setSelectedCampus] = useState("Main Campus (San Francisco)")
  const [facultyList, setFacultyList] = useState<FacultyMember[]>(initialFaculty)
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(initialAuditLogs)
  const [campuses, setCampuses] = useState<CampusTenant[]>(initialCampuses)
  const [classRooms] = useState<ClassRoomInfo[]>(initialClassRooms)

  // Modals
  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState(false)
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false)
  const [inspectAuditLog, setInspectAuditLog] = useState<AuditLogItem | null>(null)
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<string>("All")

  // Interactive RBAC matrix state
  const [rbacMatrix, setRbacMatrix] = useState<{
    [permission: string]: { [r: string]: boolean }
  }>({
    "Root System & Tenant Config": {
      "Super Admin": true,
      Admin: false,
      Teacher: false,
      Student: false,
    },
    "Security & Cryptographic Audit Logs": {
      "Super Admin": true,
      Admin: false,
      Teacher: false,
      Student: false,
    },
    "AI Diagnostic Prompt Tuning": {
      "Super Admin": true,
      Admin: true,
      Teacher: false,
      Student: false,
    },
    "Faculty Hiring & Class Assignment": {
      "Super Admin": true,
      Admin: true,
      Teacher: false,
      Student: false,
    },
    "School-Wide Student Enrollment": {
      "Super Admin": true,
      Admin: true,
      Teacher: true,
      Student: false,
    },
    "Dispatched Parent Reports": {
      "Super Admin": true,
      Admin: true,
      Teacher: true,
      Student: false,
    },
    "Assignment Creation & Grading": {
      "Super Admin": true,
      Admin: true,
      Teacher: true,
      Student: false,
    },
    "AI Student Learning Assistant": {
      "Super Admin": true,
      Admin: true,
      Teacher: true,
      Student: true,
    },
  })

  // AI settings state
  const [aiModel, setAiModel] = useState("Gemini 2.5 Flash")
  const [aiStrictness, setAiStrictness] = useState("High Precision (Grade-Aligned)")
  const [aiDailyQuota, setAiDailyQuota] = useState("Unlimited")
  const [parentDigestTone, setParentDigestTone] = useState("Warm & Constructive")

  const toggleRbac = (permission: string, targetRole: string) => {
    setRbacMatrix((prev) => ({
      ...prev,
      [permission]: {
        ...prev[permission],
        [targetRole]: !prev[permission]?.[targetRole],
      },
    }))
    onToast(`Updated permission: "${permission}" for ${targetRole}`)
  }

  const handleAddFaculty = (
    faculty: Omit<FacultyMember, "id" | "rating" | "attendanceRate">
  ) => {
    const newMember: FacultyMember = {
      ...faculty,
      id: `fac-${Date.now()}`,
      rating: 4.9,
      attendanceRate: 98.5,
    }
    setFacultyList((prev) => [newMember, ...prev])
    onToast(`Faculty member "${newMember.name}" successfully enrolled!`)

    // Log the audit event
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: "Just now",
      actor: currentUser.name,
      role: currentUser.role,
      action: `Enrolled new faculty member ${newMember.name} to ${newMember.department}`,
      target: "Faculty Directory",
      ip: "192.168.1.104 (TLS 1.3)",
      severity: "info",
      category: "Academic",
    }
    setAuditLogs((prev) => [newLog, ...prev])
  }

  const handleSendAnnouncement = (
    title: string,
    priority: string,
    targetAudience: string
  ) => {
    onToast(`Broadcast dispatched: "${title}" to ${targetAudience}`)
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: "Just now",
      actor: currentUser.name,
      role: currentUser.role,
      action: `Dispatched bulletin [${priority}]: "${title}" to ${targetAudience}`,
      target: "Broadcast Sentinel",
      ip: "192.168.1.104 (TLS 1.3)",
      severity: priority.includes("Urgent") ? "warning" : "info",
      category: "Auth",
    }
    setAuditLogs((prev) => [newLog, ...prev])
  }

  const handleTriggerSnapshot = () => {
    onToast("Cryptographic database snapshot triggered! Syncing with AWS S3 cold vault...")
    setTimeout(() => {
      onToast("Snapshot complete: 2.4 GB encrypted and verified.")
    }, 1200)
  }

  const handleFlushCache = () => {
    onToast("Flushing Quantum AI Vector Redis Cache...")
    setTimeout(() => {
      onToast("Redis cache flushed. 42,910 vector keys purged & refreshed.")
    }, 900)
  }

  const filteredFaculty = useMemo(() => {
    if (!searchQuery.trim()) return facultyList
    const q = searchQuery.toLowerCase()
    return facultyList.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.department.toLowerCase().includes(q) ||
        f.classesAssigned.some((c) => c.toLowerCase().includes(q))
    )
  }, [facultyList, searchQuery])

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditSeverityFilter !== "All" && log.severity !== auditSeverityFilter.toLowerCase()) {
        return false
      }
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        log.actor.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q)
      )
    })
  }, [auditLogs, auditSeverityFilter, searchQuery])

  return (
    <div
      className="dashboard-shell admin-dashboard-shell"
      style={{
        backgroundColor: hexColor,
        backgroundImage: isLightBg
          ? "linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px)"
          : "linear-gradient(rgba(255, 255, 255, 0.19) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.19) 1px, transparent 1px)",
      }}
    >
      {/* Admin Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        currentUser={currentUser}
        onSwitchRole={onSwitchRole}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <main className="dashboard-content">
        {/* Top Navigation & Status Bar */}
        <header className="page-header admin-top-bar">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  role === "Super Admin"
                    ? "bg-red-500/20 text-red-900 border border-red-400/40"
                    : "bg-purple-500/20 text-purple-950 border border-purple-400/40"
                }`}
              >
                {role === "Super Admin" ? "⚡ Super Admin Root Console" : "🏫 School Admin Portal"}
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-950 text-[11px] font-bold border border-emerald-400/40">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>All Systems Operational</span>
              </span>
            </div>
            <h1 className="header-title">
              {role === "Super Admin"
                ? `System Command · ${activeTab}`
                : `Campus Operations · ${activeTab}`}
            </h1>
            <p className="header-subtitle">
              {role === "Super Admin"
                ? "Full root sovereignty over multi-campus clusters, AI inference engines, and security governance."
                : "Comprehensive oversight of faculty educators, student cohorts, schedules, and academic compliance."}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Campus Selector for Super Admin */}
            {role === "Super Admin" && (
              <select
                value={selectedCampus}
                onChange={(e) => {
                  setSelectedCampus(e.target.value)
                  onToast(`Switched active context to: ${e.target.value}`)
                }}
                className="px-3 py-1.5 rounded-xl bg-white/90 border border-purple-200 text-xs font-bold text-zinc-800 shadow-sm focus:outline-none cursor-pointer"
              >
                <option value="Main Campus (San Francisco)">📍 Main Campus (San Francisco)</option>
                <option value="Virtual Academy (Remote Multi-Zone)">🌐 Virtual Academy (Remote)</option>
                <option value="STEM Innovation Hub (London)">🔬 STEM Hub (London)</option>
              </select>
            )}

            {/* Quick Action: Broadcast Bulletin */}
            <button
              type="button"
              onClick={() => setIsAnnouncementOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-900 text-white hover:bg-black text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="bell" size={14} />
              <span>Broadcast Bulletin</span>
            </button>

            {/* Hex Color Field */}
            <HexColorField hexColor={hexColor} onChangeHex={onChangeHexColor} />
          </div>
        </header>

        {/* -------------------- SUPER ADMIN VIEWS -------------------- */}
        {role === "Super Admin" && (
          <>
            {/* View 1: System Health */}
            {activeTab === "System Health" && (
              <div className="flex flex-col gap-2">
                {/* 4 Infrastructure Metric Cards */}
                <div className="metrics-grid">
                  {initialSuperAdminMetrics.map((m) => (
                    <MetricCard key={m.label} item={m} />
                  ))}
                </div>

                {/* Live Node Cluster Health Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="p-4 rounded-2xl bg-white/90 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                          <Icon name="server" size={14} />
                          <span>us-west-2 (Oregon)</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          Primary Node
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">CPU Load</div>
                          <div className="text-sm font-bold text-zinc-800 mt-0.5">18.4%</div>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">Memory</div>
                          <div className="text-sm font-bold text-zinc-800 mt-0.5">42.1%</div>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">Latency</div>
                          <div className="text-sm font-bold text-emerald-700 mt-0.5">18 ms</div>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">Packet Loss</div>
                          <div className="text-sm font-bold text-emerald-700 mt-0.5">0.00%</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                      <span>Uptime: 142 days 8h</span>
                      <span className="text-emerald-600 font-bold">● Synchronized</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/90 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                          <Icon name="server" size={14} />
                          <span>us-east-1 (N. Virginia)</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          Virtual Cluster
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">CPU Load</div>
                          <div className="text-sm font-bold text-zinc-800 mt-0.5">24.2%</div>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">Memory</div>
                          <div className="text-sm font-bold text-zinc-800 mt-0.5">51.0%</div>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">Latency</div>
                          <div className="text-sm font-bold text-emerald-700 mt-0.5">26 ms</div>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">Packet Loss</div>
                          <div className="text-sm font-bold text-emerald-700 mt-0.5">0.00%</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                      <span>Uptime: 98 days 14h</span>
                      <span className="text-emerald-600 font-bold">● Synchronized</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/90 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                          <Icon name="server" size={14} />
                          <span>eu-west-1 (Ireland)</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          Hub Gateway
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">CPU Load</div>
                          <div className="text-sm font-bold text-zinc-800 mt-0.5">15.8%</div>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">Memory</div>
                          <div className="text-sm font-bold text-zinc-800 mt-0.5">38.4%</div>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">Latency</div>
                          <div className="text-sm font-bold text-emerald-700 mt-0.5">34 ms</div>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">Packet Loss</div>
                          <div className="text-sm font-bold text-emerald-700 mt-0.5">0.00%</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                      <span>Uptime: 210 days 2h</span>
                      <span className="text-emerald-600 font-bold">● Synchronized</span>
                    </div>
                  </div>
                </div>

                {/* AI Inference Cluster & Database Vault */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="p-5 rounded-2xl bg-white/90 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                            <Icon name="cpu" size={18} />
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-zinc-900">Quantum AI Inference Pipeline</h3>
                            <p className="text-xs text-zinc-500">Gemini 2.5 Flash Orchestration</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          99.99% Success
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50">
                          <span className="text-zinc-600 font-semibold">Active Model:</span>
                          <span className="font-mono font-bold text-purple-800">{aiModel}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50">
                          <span className="text-zinc-600 font-semibold">Tokens Consumed Today:</span>
                          <span className="font-bold text-zinc-900">1,420,890 / Unlimited</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50">
                          <span className="text-zinc-600 font-semibold">Average Prompt Inference:</span>
                          <span className="font-bold text-emerald-700">184 ms</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50">
                          <span className="text-zinc-600 font-semibold">Vector Embeddings Indexed:</span>
                          <span className="font-mono text-zinc-700">42,910 student items</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleFlushCache}
                        className="px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-50 rounded-xl transition-colors cursor-pointer"
                      >
                        Flush Vector Cache →
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("AI Engine")}
                        className="px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Configure Model Settings
                      </button>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/90 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                            <Icon name="database" size={18} />
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-zinc-900">PostgreSQL Multi-Tenant DB</h3>
                            <p className="text-xs text-zinc-500">Encrypted Shards & Cold Backup</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                          Encrypted AES-256
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50">
                          <span className="text-zinc-600 font-semibold">Database Storage:</span>
                          <span className="font-bold text-zinc-900">2.41 GB / 50 GB (4.8%)</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50">
                          <span className="text-zinc-600 font-semibold">Active Connections:</span>
                          <span className="font-mono text-zinc-800">18 / 200 pool</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50">
                          <span className="text-zinc-600 font-semibold">Last Verified Cold Snapshot:</span>
                          <span className="font-bold text-emerald-700">Today at 04:00 UTC (S3 Vault)</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50">
                          <span className="text-zinc-600 font-semibold">Multi-AZ Failover Replication:</span>
                          <span className="font-bold text-emerald-700">Active (Zero Drift)</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleTriggerSnapshot}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Trigger Immediate Snapshot ⚡
                      </button>
                      <button
                        type="button"
                        onClick={() => onToast("Database health check: All 14 tables passing integrity tests.")}
                        className="px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Run Health Check
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View 2: Campuses */}
            {activeTab === "Campuses" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">Multi-Campus Tenant Network</h2>
                    <p className="text-xs text-zinc-500">Autonomous school nodes managed under Quantum AI umbrella</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToast("New Campus Provisioning Wizard opened.")}
                    className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="plus" size={14} />
                    <span>Provision New Campus</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {campuses.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-white/95 border border-zinc-200/80 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            {c.type}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{c.status}</span>
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-zinc-900 mt-2">{c.name}</h3>
                        <p className="text-xs text-zinc-500">{c.location}</p>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-zinc-50">
                            <div className="text-[10px] text-zinc-400 font-bold uppercase">Students</div>
                            <div className="text-sm font-bold text-zinc-900 mt-0.5">{c.studentCount}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-zinc-50">
                            <div className="text-[10px] text-zinc-400 font-bold uppercase">Faculty</div>
                            <div className="text-sm font-bold text-zinc-900 mt-0.5">{c.facultyCount}</div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex justify-between text-[11px] font-semibold text-zinc-600 mb-1">
                            <span>AI Quota Consumed</span>
                            <span>{c.aiQuotaUsed}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full"
                              style={{ width: `${c.aiQuotaUsed}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                        <span className="text-zinc-500 font-mono text-[10px]">{c.cloudRegion}</span>
                        <button
                          type="button"
                          onClick={() => onToast(`Managing node: ${c.name}`)}
                          className="font-bold text-purple-700 hover:underline cursor-pointer"
                        >
                          Manage Node →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View 3: Access Control (RBAC) */}
            {activeTab === "Access Control" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">Role-Based Access Control (RBAC) Matrix</h2>
                    <p className="text-xs text-zinc-500">Configure global permission flags per user role</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToast("RBAC Access Matrix synced to identity provider.")}
                    className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-black rounded-xl transition-colors cursor-pointer"
                  >
                    Save & Deploy Permissions
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white/95 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="py-3 px-4">System Privilege / Action</th>
                        <th className="py-3 px-4 text-center">Super Admin</th>
                        <th className="py-3 px-4 text-center">School Admin</th>
                        <th className="py-3 px-4 text-center">Teacher</th>
                        <th className="py-3 px-4 text-center">Student</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {Object.entries(rbacMatrix).map(([permission, roles]) => (
                        <tr key={permission} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-zinc-800 flex items-center gap-2">
                            <Icon name="key" size={14} />
                            <span>{permission}</span>
                          </td>
                          {["Super Admin", "Admin", "Teacher", "Student"].map((r) => {
                            const isGranted = roles[r]
                            return (
                              <td key={r} className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleRbac(permission, r)}
                                  className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold transition-all cursor-pointer ${
                                    isGranted
                                      ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                      : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
                                  }`}
                                  title={`Toggle ${permission} for ${r}`}
                                >
                                  {isGranted ? "✓" : "—"}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* View 4: Audit Logs */}
            {activeTab === "Audit Logs" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">Immutable Security & Audit Trail</h2>
                    <p className="text-xs text-zinc-500">Cryptographically signed record of all system events</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={auditSeverityFilter}
                      onChange={(e) => setAuditSeverityFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-zinc-200 bg-white"
                    >
                      <option value="All">All Severities</option>
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="security">Security</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => onToast("Exported 5 audit records as compliance-audit.json")}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-zinc-900 text-white hover:bg-black transition-colors cursor-pointer"
                    >
                      Export Audit (JSON)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white/95 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Target Resource</th>
                        <th className="py-3 px-4">Severity</th>
                        <th className="py-3 px-4 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredAuditLogs.map((log) => (
                        <tr
                          key={log.id}
                          onClick={() => setInspectAuditLog(log)}
                          className="hover:bg-purple-50/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-zinc-900 block">{log.actor}</span>
                            <span className="text-[10px] text-zinc-400 font-semibold">{log.role}</span>
                          </td>
                          <td className="py-3 px-4 font-medium text-zinc-800">{log.action}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-zinc-600">{log.target}</td>
                          <td className="py-3 px-4">
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
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-purple-600 font-bold hover:underline">
                              Inspect →
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* View 5: AI Engine */}
            {activeTab === "AI Engine" && (
              <div className="flex flex-col gap-2 max-w-4xl">
                <div>
                  <h2 className="text-base font-bold text-zinc-900">Quantum AI Inference Engine Settings</h2>
                  <p className="text-xs text-zinc-500">Configure global model parameters, prompt policies, and student guardrails</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/95 border border-zinc-200/80 shadow-sm flex flex-col gap-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 uppercase">Primary LLM Model</label>
                      <select
                        value={aiModel}
                        onChange={(e) => {
                          setAiModel(e.target.value)
                          onToast(`AI Model set to: ${e.target.value}`)
                        }}
                        className="mt-1.5 w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 font-semibold"
                      >
                        <option value="Gemini 2.5 Flash">Gemini 2.5 Flash (Ultra-Low Latency, Recommended)</option>
                        <option value="Gemini 2.5 Pro">Gemini 2.5 Pro (Deep Diagnostic Reasoning)</option>
                        <option value="Quantum Neural Hybrid">Quantum Neural Hybrid (Fine-Tuned for K-12)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-700 uppercase">Diagnostic Strictness</label>
                      <select
                        value={aiStrictness}
                        onChange={(e) => {
                          setAiStrictness(e.target.value)
                          onToast(`Diagnostic strictness updated to: ${e.target.value}`)
                        }}
                        className="mt-1.5 w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 font-semibold"
                      >
                        <option value="High Precision (Grade-Aligned)">High Precision (Grade-Aligned)</option>
                        <option value="Encouraging & Formative">Encouraging & Formative</option>
                        <option value="Strict Diagnostic Rubric">Strict Diagnostic Rubric</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 uppercase">Daily Token Allocation</label>
                      <select
                        value={aiDailyQuota}
                        onChange={(e) => setAiDailyQuota(e.target.value)}
                        className="mt-1.5 w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 font-semibold"
                      >
                        <option value="Unlimited">Unlimited (Enterprise Campus License)</option>
                        <option value="5,000,000 Tokens/Day">5,000,000 Tokens/Day</option>
                        <option value="2,000,000 Tokens/Day">2,000,000 Tokens/Day</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-700 uppercase">Parent AI Digest Tone</label>
                      <select
                        value={parentDigestTone}
                        onChange={(e) => setParentDigestTone(e.target.value)}
                        className="mt-1.5 w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 font-semibold"
                      >
                        <option value="Warm & Constructive">Warm & Constructive</option>
                        <option value="Concise & Metric-Driven">Concise & Metric-Driven</option>
                        <option value="Academic & Detailed">Academic & Detailed</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      Changes propagate instantly across all 3 school clusters.
                    </span>
                    <button
                      type="button"
                      onClick={() => onToast("AI Inference Engine parameters successfully updated and active!")}
                      className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-colors cursor-pointer"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* View 6: Faculty & Staff */}
            {activeTab === "Faculty & Staff" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">Faculty Staff & Educators</h2>
                    <p className="text-xs text-zinc-500">28 active teaching faculty across all departments</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search faculty..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-3 py-1.5 pl-8 text-xs rounded-xl border border-zinc-200 bg-white"
                      />
                      <span className="absolute left-2.5 top-2 text-zinc-400">
                        <Icon name="search" size={13} />
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddFacultyOpen(true)}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Icon name="plus" size={14} />
                      <span>Add Faculty Member</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredFaculty.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 rounded-2xl bg-white/95 border border-zinc-200/80 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              f.status === "Active"
                                ? "bg-emerald-100 text-emerald-800"
                                : f.status === "In Class"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-zinc-100 text-zinc-700"
                            }`}
                          >
                            ● {f.status}
                          </span>
                          <span className="text-xs font-bold text-amber-500">★ {f.rating}</span>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <img
                            src={f.avatar}
                            alt={f.name}
                            className="w-12 h-12 rounded-2xl object-cover border border-zinc-200"
                          />
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-zinc-900 truncate">{f.name}</h4>
                            <p className="text-[11px] text-zinc-500 truncate">{f.title}</p>
                            <span className="text-[10px] text-purple-700 font-bold block">
                              {f.department}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 p-2 rounded-xl bg-zinc-50 text-[11px] flex justify-between font-medium text-zinc-600">
                          <span>Classes: {f.classesAssigned.join(", ")}</span>
                          <span className="font-bold text-zinc-900">{f.studentCount} students</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                        <span className="text-zinc-500 text-[10px]">{f.email}</span>
                        <button
                          type="button"
                          onClick={() => onToast(`Message dispatched to ${f.name}`)}
                          className="font-bold text-purple-600 hover:underline cursor-pointer"
                        >
                          Contact →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View 7: School Pulse */}
            {activeTab === "School Pulse" && (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  {initialAdminMetrics.map((m) => (
                    <MetricCard key={m.label} item={m} />
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-white/95 border border-zinc-200/80 shadow-sm">
                  <h3 className="text-base font-bold text-zinc-900">Multi-Campus Performance Synthesis</h3>
                  <p className="text-xs text-zinc-500 mb-3">Real-time attendance, mastery, and parental satisfaction metrics</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                      <div className="text-xs font-bold text-zinc-500 uppercase">STEM & AI Literacy</div>
                      <div className="text-2xl font-bold text-zinc-900 mt-1">91.4%</div>
                      <div className="text-xs text-emerald-600 font-semibold mt-1">↑ +4.2% vs last term</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                      <div className="text-xs font-bold text-zinc-500 uppercase">Parent Portal Engagement</div>
                      <div className="text-2xl font-bold text-zinc-900 mt-1">98.4%</div>
                      <div className="text-xs text-emerald-600 font-semibold mt-1">↑ 472 active parent accounts</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                      <div className="text-xs font-bold text-zinc-500 uppercase">Diagnostic Interventions</div>
                      <div className="text-2xl font-bold text-zinc-900 mt-1">14 Students</div>
                      <div className="text-xs text-purple-600 font-semibold mt-1">All on active support plans</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* -------------------- SCHOOL ADMIN VIEWS -------------------- */}
        {role === "Admin" && (
          <>
            {/* View 1: Overview */}
            {activeTab === "Overview" && (
              <div className="flex flex-col gap-2">
                {/* 4 School Metric Cards */}
                <div className="metrics-grid">
                  {initialAdminMetrics.map((m) => (
                    <MetricCard key={m.label} item={m} />
                  ))}
                </div>

                {/* Campus Academic Health & Classroom Roster Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                  <div className="lg:col-span-2 p-4 rounded-2xl bg-white/95 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-zinc-900">Active Classroom Cohorts</h3>
                          <p className="text-xs text-zinc-500">Year 3 to Year 6 classroom capacities and performance</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("Class Schedules")}
                          className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                        >
                          View All Classrooms →
                        </button>
                      </div>

                      <div className="mt-2.5 flex flex-col gap-1.5">
                        {classRooms.map((cls) => (
                          <div
                            key={cls.id}
                            className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center">
                                {cls.grade.split(" ")[1] || "Y4"}
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-zinc-900">{cls.name}</h4>
                                <span className="text-[11px] text-zinc-500">
                                  Lead: {cls.leadTeacher} · {cls.room}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <div className="text-right">
                                <span className="font-bold text-zinc-900 block">
                                  {cls.studentsEnrolled} / {cls.maxCapacity}
                                </span>
                                <span className="text-[10px] text-zinc-500">Enrolled</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-emerald-700 block">
                                  {cls.avgScore}% Avg
                                </span>
                                <span className="text-[10px] text-zinc-500">{cls.attendance}% Att</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        Total school load: 105 active student desks occupied
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddFacultyOpen(true)}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors cursor-pointer"
                      >
                        Add Faculty Member
                      </button>
                    </div>
                  </div>

                  {/* Administrative Approvals & Real-Time Feed */}
                  <div className="p-4 rounded-2xl bg-white/95 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-zinc-900">Pending Approvals</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          3 Actions
                        </span>
                      </div>

                      <div className="mt-2 flex flex-col gap-1.5">
                        <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-zinc-800">Transfer Request</span>
                            <span className="text-[10px] text-zinc-400">12m ago</span>
                          </div>
                          <p className="text-[11px] text-zinc-600 mt-1">
                            Aarav Patel (Year 4 Maple → Robotics Specialization)
                          </p>
                          <div className="mt-2 flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => onToast("Approved transfer for Aarav Patel.")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => onToast("Declined request.")}
                              className="px-2.5 py-1 rounded-lg bg-zinc-200 text-zinc-700 font-bold text-[10px] cursor-pointer"
                            >
                              Review
                            </button>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-zinc-800">Leave Notification</span>
                            <span className="text-[10px] text-zinc-400">1h ago</span>
                          </div>
                          <p className="text-[11px] text-zinc-600 mt-1">
                            Marcus Thorne (Applied Technology Lab Cover required)
                          </p>
                          <div className="mt-2 flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => onToast("Cover educator assigned to Tech Lab.")}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold text-[10px] cursor-pointer"
                            >
                              Assign Cover
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => setIsAnnouncementOpen(true)}
                        className="w-full py-2 text-xs font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Send Campus-Wide Notice →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View 2: Faculty Directory */}
            {activeTab === "Faculty Directory" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">Teaching Faculty Roster</h2>
                    <p className="text-xs text-zinc-500">28 registered educators across academic departments</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddFacultyOpen(true)}
                    className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="plus" size={14} />
                    <span>Add Faculty Member</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {facultyList.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 rounded-2xl bg-white/95 border border-zinc-200/80 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              f.status === "Active"
                                ? "bg-emerald-100 text-emerald-800"
                                : f.status === "In Class"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-zinc-100 text-zinc-700"
                            }`}
                          >
                            ● {f.status}
                          </span>
                          <span className="text-xs font-bold text-amber-500">★ {f.rating}</span>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <img
                            src={f.avatar}
                            alt={f.name}
                            className="w-12 h-12 rounded-2xl object-cover border border-zinc-200"
                          />
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-zinc-900 truncate">{f.name}</h4>
                            <p className="text-[11px] text-zinc-500 truncate">{f.title}</p>
                            <span className="text-[10px] text-purple-700 font-bold block">
                              {f.department}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 p-2 rounded-xl bg-zinc-50 text-[11px] flex justify-between font-medium text-zinc-600">
                          <span>Classes: {f.classesAssigned.join(", ")}</span>
                          <span className="font-bold text-zinc-900">{f.studentCount} students</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                        <span className="text-zinc-500 text-[10px]">{f.email}</span>
                        <button
                          type="button"
                          onClick={() => onToast(`Opening file for ${f.name}`)}
                          className="font-bold text-purple-600 hover:underline cursor-pointer"
                        >
                          View File →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View 3: Student Roster */}
            {activeTab === "Student Roster" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">Student Directory & Cohorts</h2>
                    <p className="text-xs text-zinc-500">480 enrolled students across Years 1-6</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToast("Bulk Enrollment CSV Upload modal opened.")}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-zinc-900 text-white hover:bg-black transition-colors cursor-pointer"
                  >
                    Bulk Import Roster (CSV)
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="p-3 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Year 3 Cohort</span>
                    <div className="text-lg font-bold text-zinc-900 mt-1">112 Students</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">97.8% Attendance</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Year 4 Cohort</span>
                    <div className="text-lg font-bold text-zinc-900 mt-1">124 Students</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">98.4% Attendance</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Year 5 Cohort</span>
                    <div className="text-lg font-bold text-zinc-900 mt-1">120 Students</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">96.5% Attendance</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Year 6 Cohort</span>
                    <div className="text-lg font-bold text-zinc-900 mt-1">124 Students</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">98.9% Attendance</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                  <h3 className="text-xs font-bold text-zinc-700 uppercase mb-2.5">Key Year 4 Spotlight (Maple Class)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                      <div className="font-bold text-zinc-900">Leo Thompson</div>
                      <div className="text-zinc-500 text-[11px]">Roll: #2026-0401 · 94% Avg</div>
                      <div className="text-emerald-600 font-semibold text-[10px] mt-1">Status: Excelling</div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                      <div className="font-bold text-zinc-900">Maya Lin</div>
                      <div className="text-zinc-500 text-[11px]">Roll: #2026-0402 · 91% Avg</div>
                      <div className="text-emerald-600 font-semibold text-[10px] mt-1">Status: Excelling</div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                      <div className="font-bold text-zinc-900">Liam O&apos;Connor</div>
                      <div className="text-zinc-500 text-[11px]">Roll: #2026-0403 · 72% Avg</div>
                      <div className="text-amber-600 font-semibold text-[10px] mt-1">Status: Needs Support</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View 4: Class Schedules */}
            {activeTab === "Class Schedules" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">Classrooms & Timetable Matrix</h2>
                    <p className="text-xs text-zinc-500">Room allocations and daily schedule blocks</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToast("Schedule conflict detection: No room collisions found.")}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 cursor-pointer"
                  >
                    Run Schedule Diagnostic
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {classRooms.map((c) => (
                    <div key={c.id} className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                            {c.grade}
                          </span>
                          <h3 className="text-base font-bold text-zinc-900 mt-1">{c.name}</h3>
                          <p className="text-xs text-zinc-500">{c.room}</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                          {c.studentsEnrolled}/{c.maxCapacity} Seats
                        </span>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-xs">
                        <span className="text-zinc-600">Lead: <strong>{c.leadTeacher}</strong></span>
                        <span className="text-zinc-500">Avg Mastery: <strong>{c.avgScore}%</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View 5: School Reports */}
            {activeTab === "School Reports" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">School-Wide Reports & Accreditation</h2>
                    <p className="text-xs text-zinc-500">Statutory reporting, attendance registers, and academic progress exports</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToast("Generating whole-school accreditation PDF bundle...")}
                    className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs cursor-pointer"
                  >
                    Download Full Accreditation Bundle (PDF)
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">Term 2 Statutory Attendance Register</h4>
                      <p className="text-[11px] text-zinc-500">97.2% overall attendance · All 480 students verified</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToast("Downloading Attendance Register (PDF)")}
                      className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                    >
                      Export CSV / PDF →
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">AI Diagnostic Skill Distribution Report</h4>
                      <p className="text-[11px] text-zinc-500">Mastery analysis across Mathematics, Science, and English</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToast("Downloading Skill Distribution Report (PDF)")}
                      className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                    >
                      Export PDF →
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">Parent Engagement & Digest Delivery Audit</h4>
                      <p className="text-[11px] text-zinc-500">98.4% read rate · Dispatched via Quantum Parent Portal</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToast("Downloading Parent Engagement Audit (PDF)")}
                      className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                    >
                      Export PDF →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* View 6: School Settings */}
            {activeTab === "School Settings" && (
              <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col gap-2 max-w-2xl">
                <div>
                  <h2 className="text-base font-bold text-zinc-900">School Operations Preferences</h2>
                  <p className="text-xs text-zinc-500">Academic calendars, institutional details, and alerts</p>
                </div>

                <div className="flex flex-col gap-2.5 text-xs">
                  <div>
                    <label className="font-bold text-zinc-700 uppercase">Institution Name</label>
                    <input
                      type="text"
                      defaultValue="Quantum School of AI"
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-300 font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 uppercase">Academic Year & Term</label>
                    <input
                      type="text"
                      defaultValue="Academic Year 2026-2027 · Term 2"
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-300 font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 uppercase">Emergency Contact Hotline</label>
                    <input
                      type="text"
                      defaultValue="+1 (415) 880-9200 (24/7 Security Desk)"
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-300 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2.5 border-t border-zinc-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onToast("School preferences saved successfully!")}
                    className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs cursor-pointer"
                  >
                    Save School Settings
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <AddFacultyModal
        isOpen={isAddFacultyOpen}
        onClose={() => setIsAddFacultyOpen(false)}
        onSubmit={handleAddFaculty}
      />

      <SchoolAnnouncementModal
        isOpen={isAnnouncementOpen}
        onClose={() => setIsAnnouncementOpen(false)}
        onSend={handleSendAnnouncement}
      />

      <AuditDetailModal
        log={inspectAuditLog}
        onClose={() => setInspectAuditLog(null)}
      />
    </div>
  )
}
