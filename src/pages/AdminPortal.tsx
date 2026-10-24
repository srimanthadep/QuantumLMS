import { useState, useMemo, useEffect, type ReactNode } from "react"
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

function CardHeader({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="card-header">
      <div className="card-title">{title}</div>
      {action}
    </div>
  )
}

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
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)

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
      className="dashboard-shell"
      style={{
        backgroundColor: hexColor,
        backgroundImage: isLightBg
          ? "linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px)"
          : "linear-gradient(rgba(255, 255, 255, 0.19) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.19) 1px, transparent 1px)",
      }}
    >
      {/* Admin Sidebar - matches teacher sidebar design, fonts, avatar, and navigation */}
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
        {/* Top Header - identical structure, height, and spacing to teacher's .dashboard-header */}
        <header className="dashboard-header">
          <div className="min-w-fit flex-shrink-0">
            <div className="greeting whitespace-nowrap">
              <span>Good morning, {currentUser.name.split(" ")[0] || "Admin"}</span>
              <span className="wave-emoji" role="img" aria-label="waving hand">
                👋
              </span>
            </div>
            <div className="subtitle whitespace-nowrap">
              {role === "Super Admin"
                ? "3 cluster nodes operational · Zero security incidents"
                : "Active Year 3–6 cohorts · 28 educators on duty"}
            </div>
          </div>

          <div className="header-actions flex-shrink-0">
            <div className="search-box !w-[155px] md:!w-[185px]">
              <Icon name="search" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={role === "Super Admin" ? "Search clusters, logs..." : "Search students or topics"}
                aria-label="Search"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1 cursor-pointer"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* Quick Role Switcher Pill - matches Teacher page Student Portal pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="px-3 h-[35px] rounded-full bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-purple-700 transition-colors cursor-pointer whitespace-nowrap"
                aria-label="Switch active role view"
              >
                <span>🔄 {role === "Super Admin" ? "Super Admin" : "School Admin"}</span>
                <span className="text-[10px] opacity-80">▾</span>
              </button>

              {showRoleDropdown && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 p-2 flex flex-col gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
                    Switch Perspective
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchRole("Super Admin")
                      setShowRoleDropdown(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-zinc-100 cursor-pointer ${
                      role === "Super Admin" ? "bg-red-50 text-red-800 font-bold" : "text-zinc-700"
                    }`}
                  >
                    <span>⚡ Super Admin Console</span>
                    {role === "Super Admin" && <span className="text-red-600">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchRole("Admin")
                      setShowRoleDropdown(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-zinc-100 cursor-pointer ${
                      role === "Admin" ? "bg-purple-50 text-purple-800 font-bold" : "text-zinc-700"
                    }`}
                  >
                    <span>🏫 School Admin Portal</span>
                    {role === "Admin" && <span className="text-purple-600">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchRole("Teacher")
                      setShowRoleDropdown(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    <span>🎓 Teacher Workspace</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchRole("Student")
                      setShowRoleDropdown(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    <span>🎒 Student Portal</span>
                  </button>
                </div>
              )}
            </div>

            {/* Campus Selector for Super Admin */}
            {role === "Super Admin" && (
              <select
                value={selectedCampus}
                onChange={(e) => {
                  setSelectedCampus(e.target.value)
                  onToast(`Switched active context to: ${e.target.value}`)
                }}
                className="h-[35px] px-3 rounded-full bg-white text-zinc-800 text-xs font-bold border-none shadow-sm focus:outline-none cursor-pointer"
              >
                <option value="Main Campus (San Francisco)">📍 SF Campus</option>
                <option value="Virtual Academy (Remote Multi-Zone)">🌐 Virtual</option>
                <option value="STEM Innovation Hub (London)">🔬 London</option>
              </select>
            )}

            <HexColorField hexColor={hexColor} onChangeHex={onChangeHexColor} />

            <button
              type="button"
              className="ask-ai"
              onClick={() => setIsAnnouncementOpen(true)}
              aria-label="Broadcast Bulletin"
            >
              <span>✦</span>
              Bulletin
            </button>
          </div>
        </header>

        {/* -------------------- SUPER ADMIN VIEWS -------------------- */}
        {role === "Super Admin" && (
          <>
            {/* View 1: System Health */}
            {activeTab === "System Health" && (
              <>
                {/* 4 Infrastructure Metric Cards */}
                <div className="metrics-grid">
                  {initialSuperAdminMetrics.map((m) => (
                    <MetricCard key={m.label} item={m} />
                  ))}
                </div>

                {/* Content Grid (2 columns on desktop) - identical to ClassPage */}
                <div className="content-grid">
                  <div className="left-column">
                    {/* Live Node Cluster Health Panel */}
                    <section className="panel p-[16px_20px]" aria-label="Multi-Region Node Clusters">
                      <div className="mb-3">
                        <CardHeader
                          title="Live Multi-Region Node Clusters"
                          action={
                            <button
                              type="button"
                              className="view-all"
                              onClick={handleTriggerSnapshot}
                            >
                              Sync Cluster
                            </button>
                          }
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                                <Icon name="server" size={14} />
                                <span>us-west-2</span>
                              </span>
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                                Primary
                              </span>
                            </div>
                            <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs">
                              <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                                <div className="text-[9px] text-zinc-400 font-bold uppercase">CPU</div>
                                <div className="text-xs font-bold text-zinc-800">18.4%</div>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                                <div className="text-[9px] text-zinc-400 font-bold uppercase">Memory</div>
                                <div className="text-xs font-bold text-zinc-800">42.1%</div>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                                <div className="text-[9px] text-zinc-400 font-bold uppercase">Ping</div>
                                <div className="text-xs font-bold text-emerald-600">18 ms</div>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                                <div className="text-[9px] text-zinc-400 font-bold uppercase">Loss</div>
                                <div className="text-xs font-bold text-emerald-600">0.00%</div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[10px] text-zinc-500">
                            <span>Uptime: 142d</span>
                            <span className="text-emerald-600 font-bold">● Sync</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                                <Icon name="server" size={14} />
                                <span>us-east-1</span>
                              </span>
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                                Cluster
                              </span>
                            </div>
                            <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs">
                              <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                                <div className="text-[9px] text-zinc-400 font-bold uppercase">CPU</div>
                                <div className="text-xs font-bold text-zinc-800">24.2%</div>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                                <div className="text-[9px] text-zinc-400 font-bold uppercase">Memory</div>
                                <div className="text-xs font-bold text-zinc-800">51.0%</div>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                                <div className="text-[9px] text-zinc-400 font-bold uppercase">Ping</div>
                                <div className="text-xs font-bold text-emerald-600">26 ms</div>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                                <div className="text-[9px] text-zinc-400 font-bold uppercase">Loss</div>
                                <div className="text-xs font-bold text-emerald-600">0.00%</div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[10px] text-zinc-500">
                            <span>Uptime: 98d</span>
                            <span className="text-emerald-600 font-bold">● Sync</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                                <Icon name="server" size={14} />
                                <span>eu-west-1</span>
                              </span>
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                                Gateway
                              </span>
                            </div>
                            <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs">
                              <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                                <div className="text-[9px] text-zinc-400 font-bold uppercase">CPU</div>
                                <div className="text-xs font-bold text-zinc-800">15.8%</div>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                                <div className="text-[9px] text-zinc-400 font-bold uppercase">Memory</div>
                                <div className="text-xs font-bold text-zinc-800">38.4%</div>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                                <div className="text-[9px] text-zinc-400 font-bold uppercase">Ping</div>
                                <div className="text-xs font-bold text-emerald-600">34 ms</div>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                                <div className="text-[9px] text-zinc-400 font-bold uppercase">Loss</div>
                                <div className="text-xs font-bold text-emerald-600">0.00%</div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[10px] text-zinc-500">
                            <span>Uptime: 210d</span>
                            <span className="text-emerald-600 font-bold">● Sync</span>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* AI Inference Pipeline Panel */}
                    <section className="panel p-[16px_20px]" aria-label="Quantum AI Inference Core">
                      <div className="mb-3">
                        <CardHeader
                          title="Quantum AI Inference Core"
                          action={
                            <button
                              type="button"
                              className="view-all"
                              onClick={handleFlushCache}
                            >
                              Flush Cache
                            </button>
                          }
                        />
                      </div>
                      <div className="flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                              <Icon name="cpu" size={18} />
                            </span>
                            <div>
                              <strong className="text-xs font-bold text-zinc-900 block">Gemini 2.5 Flash Pipeline</strong>
                              <span className="text-[11px] text-zinc-500">Multi-campus distributed LLM orchestrator</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                            99.99% UP
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-zinc-50">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">Daily Tokens</span>
                            <div className="text-sm font-bold text-zinc-900 mt-0.5">1,420,890</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-zinc-50">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">Inference Time</span>
                            <div className="text-sm font-bold text-purple-700 mt-0.5">184 ms avg</div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="right-column">
                    {/* Database Cold Vault Panel */}
                    <section className="panel p-[16px_20px]" aria-label="PostgreSQL Cold Vault">
                      <div className="mb-3">
                        <CardHeader
                          title="PostgreSQL Multi-Tenant Vault"
                          action={
                            <button
                              type="button"
                              className="view-all"
                              onClick={handleTriggerSnapshot}
                            >
                              Snapshot
                            </button>
                          }
                        />
                      </div>
                      <div className="flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                              <Icon name="database" size={18} />
                            </span>
                            <div>
                              <strong className="text-xs font-bold text-zinc-900 block">Encrypted Tenant Storage</strong>
                              <span className="text-[11px] text-zinc-500">AWS S3 Cold Storage Failover Active</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                            AES-256
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-zinc-50">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">Vault Storage</span>
                            <div className="text-sm font-bold text-zinc-900 mt-0.5">2.41 GB / 50 GB</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-zinc-50">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">Pool Connections</span>
                            <div className="text-sm font-bold text-emerald-700 mt-0.5">18 / 200 pool</div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Security Sentinel Panel */}
                    <section className="panel p-[16px_20px]" aria-label="Security Sentinel">
                      <div className="mb-3">
                        <CardHeader
                          title="Sentinel Security Shield"
                          action={
                            <button
                              type="button"
                              className="view-all"
                              onClick={() => setActiveTab("Audit Logs")}
                            >
                              View Logs
                            </button>
                          }
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 text-xs">
                          <div className="flex items-center gap-2">
                            <Icon name="shield" size={14} />
                            <span className="font-bold text-zinc-800">Zero Trust TLS 1.3 Handshake</span>
                          </div>
                          <span className="text-emerald-600 font-bold text-[11px]">Enforced</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 text-xs">
                          <div className="flex items-center gap-2">
                            <Icon name="lock" size={14} />
                            <span className="font-bold text-zinc-800">Tamper-Proof Ledger</span>
                          </div>
                          <span className="text-purple-600 font-bold text-[11px]">Verified</span>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </>
            )}

            {/* View 2: Campuses */}
            {activeTab === "Campuses" && (
              <section className="panel p-[16px_20px]" aria-label="Multi-Campus Tenant Network">
                <div className="mb-3">
                  <CardHeader
                    title="Multi-Campus Tenant Network"
                    action={
                      <button
                        type="button"
                        onClick={() => onToast("New Campus Provisioning Wizard opened.")}
                        className="view-all"
                      >
                        + Provision Campus
                      </button>
                    }
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {campuses.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex flex-col justify-between"
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
                        <h3 className="text-sm font-bold text-zinc-900 mt-2">{c.name}</h3>
                        <p className="text-[11px] text-zinc-500">{c.location}</p>

                        <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
                          <div className="p-2 rounded-xl bg-white border border-zinc-100">
                            <div className="text-[9px] text-zinc-400 font-bold uppercase">Students</div>
                            <div className="text-xs font-bold text-zinc-900 mt-0.5">{c.studentCount}</div>
                          </div>
                          <div className="p-2 rounded-xl bg-white border border-zinc-100">
                            <div className="text-[9px] text-zinc-400 font-bold uppercase">Faculty</div>
                            <div className="text-xs font-bold text-zinc-900 mt-0.5">{c.facultyCount}</div>
                          </div>
                        </div>

                        <div className="mt-2.5">
                          <div className="flex justify-between text-[10px] font-semibold text-zinc-600 mb-1">
                            <span>AI Quota Consumed</span>
                            <span>{c.aiQuotaUsed}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-200 overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full"
                              style={{ width: `${c.aiQuotaUsed}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-zinc-200/60 flex items-center justify-between text-xs">
                        <span className="text-zinc-400 font-mono text-[10px]">{c.cloudRegion}</span>
                        <button
                          type="button"
                          onClick={() => onToast(`Managing node: ${c.name}`)}
                          className="font-bold text-purple-700 hover:underline cursor-pointer text-xs"
                        >
                          Manage Node →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* View 3: Access Control (RBAC) */}
            {activeTab === "Access Control" && (
              <section className="panel p-[16px_20px]" aria-label="Role-Based Access Control">
                <div className="mb-3">
                  <CardHeader
                    title="Role-Based Access Control (RBAC) Matrix"
                    action={
                      <button
                        type="button"
                        onClick={() => onToast("RBAC Access Matrix synced to identity provider.")}
                        className="view-all"
                      >
                        Save & Deploy
                      </button>
                    }
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">System Privilege / Action</th>
                        <th className="py-2.5 px-3 text-center">Super Admin</th>
                        <th className="py-2.5 px-3 text-center">School Admin</th>
                        <th className="py-2.5 px-3 text-center">Teacher</th>
                        <th className="py-2.5 px-3 text-center">Student</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {Object.entries(rbacMatrix).map(([permission, roles]) => (
                        <tr key={permission} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-zinc-800 flex items-center gap-2">
                            <Icon name="key" size={14} />
                            <span>{permission}</span>
                          </td>
                          {["Super Admin", "Admin", "Teacher", "Student"].map((r) => {
                            const isGranted = roles[r]
                            return (
                              <td key={r} className="py-2.5 px-3 text-center">
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
              </section>
            )}

            {/* View 4: Audit Logs */}
            {activeTab === "Audit Logs" && (
              <section className="panel p-[16px_20px]" aria-label="Immutable Security & Audit Trail">
                <div className="mb-3">
                  <CardHeader
                    title="Immutable Security & Audit Trail"
                    action={
                      <div className="flex items-center gap-2">
                        <select
                          value={auditSeverityFilter}
                          onChange={(e) => setAuditSeverityFilter(e.target.value)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-zinc-200 bg-zinc-50 cursor-pointer"
                        >
                          <option value="All">All Severities</option>
                          <option value="info">Info</option>
                          <option value="warning">Warning</option>
                          <option value="security">Security</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => onToast("Exported audit trail (JSON).")}
                          className="view-all"
                        >
                          Export
                        </button>
                      </div>
                    }
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Actor</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Target</th>
                        <th className="py-2.5 px-3">Severity</th>
                        <th className="py-2.5 px-3 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredAuditLogs.map((log) => (
                        <tr
                          key={log.id}
                          onClick={() => setInspectAuditLog(log)}
                          className="hover:bg-purple-50/50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-zinc-900 block">{log.actor}</span>
                            <span className="text-[10px] text-zinc-400 font-semibold">{log.role}</span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-zinc-800">{log.action}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-600">{log.target}</td>
                          <td className="py-2.5 px-3">
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
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-purple-600 font-bold hover:underline">
                              Inspect →
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* View 5: AI Engine */}
            {activeTab === "AI Engine" && (
              <div className="content-grid">
                <div className="left-column">
                  <section className="panel p-[16px_20px]" aria-label="Primary Model Configuration">
                    <div className="mb-3">
                      <CardHeader
                        title="Primary LLM Model Orchestration"
                        action={
                          <button
                            type="button"
                            className="view-all"
                            onClick={() => onToast("AI settings updated.")}
                          >
                            Save
                          </button>
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-3 text-xs">
                      <div>
                        <label className="font-bold text-zinc-700 uppercase">Primary LLM Model</label>
                        <select
                          value={aiModel}
                          onChange={(e) => {
                            setAiModel(e.target.value)
                            onToast(`AI Model set to: ${e.target.value}`)
                          }}
                          className="mt-1.5 w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 font-semibold bg-zinc-50"
                        >
                          <option value="Gemini 2.5 Flash">Gemini 2.5 Flash (Ultra-Low Latency, Recommended)</option>
                          <option value="Gemini 2.5 Pro">Gemini 2.5 Pro (Deep Diagnostic Reasoning)</option>
                          <option value="Quantum Neural Hybrid">Quantum Neural Hybrid (Fine-Tuned for K-12)</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-zinc-700 uppercase">Diagnostic Strictness</label>
                        <select
                          value={aiStrictness}
                          onChange={(e) => {
                            setAiStrictness(e.target.value)
                            onToast(`Diagnostic strictness: ${e.target.value}`)
                          }}
                          className="mt-1.5 w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 font-semibold bg-zinc-50"
                        >
                          <option value="High Precision (Grade-Aligned)">High Precision (Grade-Aligned)</option>
                          <option value="Encouraging & Formative">Encouraging & Formative</option>
                          <option value="Strict Diagnostic Rubric">Strict Diagnostic Rubric</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="right-column">
                  <section className="panel p-[16px_20px]" aria-label="Token Allocation & Tone">
                    <div className="mb-3">
                      <CardHeader
                        title="Token Quotas & Tone Guardrails"
                        action={
                          <button
                            type="button"
                            className="view-all"
                            onClick={() => onToast("Guardrails deployed.")}
                          >
                            Deploy
                          </button>
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-3 text-xs">
                      <div>
                        <label className="font-bold text-zinc-700 uppercase">Daily Token Allocation</label>
                        <select
                          value={aiDailyQuota}
                          onChange={(e) => setAiDailyQuota(e.target.value)}
                          className="mt-1.5 w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 font-semibold bg-zinc-50"
                        >
                          <option value="Unlimited">Unlimited (Enterprise Campus License)</option>
                          <option value="5,000,000 Tokens/Day">5,000,000 Tokens/Day</option>
                          <option value="2,000,000 Tokens/Day">2,000,000 Tokens/Day</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-zinc-700 uppercase">Parent AI Digest Tone</label>
                        <select
                          value={parentDigestTone}
                          onChange={(e) => setParentDigestTone(e.target.value)}
                          className="mt-1.5 w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 font-semibold bg-zinc-50"
                        >
                          <option value="Warm & Constructive">Warm & Constructive</option>
                          <option value="Concise & Metric-Driven">Concise & Metric-Driven</option>
                          <option value="Academic & Detailed">Academic & Detailed</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* View 6: Faculty & Staff */}
            {activeTab === "Faculty & Staff" && (
              <section className="panel p-[16px_20px]" aria-label="Multi-Campus Faculty & Staff">
                <div className="mb-3">
                  <CardHeader
                    title="Multi-Campus Faculty & Staff Roster"
                    action={
                      <button
                        type="button"
                        onClick={() => setIsAddFacultyOpen(true)}
                        className="view-all"
                      >
                        + Add Faculty Member
                      </button>
                    }
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredFaculty.map((f) => (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex flex-col justify-between"
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

                        <div className="mt-2.5 flex items-center gap-2.5">
                          <img
                            src={f.avatar}
                            alt={f.name}
                            className="w-10 h-10 rounded-xl object-cover bg-purple-100"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-zinc-900 truncate">{f.name}</h4>
                            <p className="text-[11px] text-zinc-500 truncate">{f.title}</p>
                            <span className="text-[10px] text-purple-700 font-bold block">
                              {f.department}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 p-2 rounded-xl bg-white border border-zinc-100 text-[11px] flex justify-between font-medium text-zinc-600">
                          <span>Classes: {f.classesAssigned.join(", ")}</span>
                          <span className="font-bold text-zinc-900">{f.studentCount} students</span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-zinc-200/60 flex items-center justify-between text-xs">
                        <span className="text-zinc-500 text-[10px]">{f.email}</span>
                        <button
                          type="button"
                          onClick={() => onToast(`Message dispatched to ${f.name}`)}
                          className="font-bold text-purple-600 hover:underline cursor-pointer text-xs"
                        >
                          Contact →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* View 7: School Pulse */}
            {activeTab === "School Pulse" && (
              <div className="content-grid">
                <div className="left-column">
                  <section className="panel p-[16px_20px]" aria-label="Performance Synthesis">
                    <div className="mb-3">
                      <CardHeader title="Multi-Campus Performance Synthesis" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                        <div className="font-bold text-zinc-500 uppercase text-[10px]">STEM & AI Literacy</div>
                        <div className="text-xl font-bold text-zinc-900 mt-1">91.4%</div>
                        <div className="text-emerald-600 font-semibold text-[10px] mt-0.5">↑ +4.2% vs last term</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                        <div className="font-bold text-zinc-500 uppercase text-[10px]">Parent Engagement</div>
                        <div className="text-xl font-bold text-zinc-900 mt-1">98.4%</div>
                        <div className="text-emerald-600 font-semibold text-[10px] mt-0.5">↑ 472 active accounts</div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="right-column">
                  <section className="panel p-[16px_20px]" aria-label="Interventions">
                    <div className="mb-3">
                      <CardHeader title="Diagnostic Interventions" />
                    </div>
                    <div>
                      <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60 text-xs">
                        <div className="font-bold text-zinc-500 uppercase text-[10px]">Active Support Plans</div>
                        <div className="text-xl font-bold text-zinc-900 mt-1">14 Students</div>
                        <p className="text-zinc-600 text-[11px] mt-1">
                          Personalized learning pathways active with targeted formative reviews.
                        </p>
                      </div>
                    </div>
                  </section>
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
              <>
                {/* 4 School Metric Cards */}
                <div className="metrics-grid">
                  {initialAdminMetrics.map((m) => (
                    <MetricCard key={m.label} item={m} />
                  ))}
                </div>

                {/* Content Grid (2 columns on desktop) - identical to ClassPage */}
                <div className="content-grid">
                  <div className="left-column">
                    {/* Active Classroom Cohorts Card */}
                    <section className="panel p-[16px_20px]" aria-label="Active Classroom Cohorts">
                      <div className="mb-3">
                        <CardHeader
                          title="Active Classroom Cohorts"
                          action={
                            <button
                              type="button"
                              className="view-all"
                              onClick={() => setActiveTab("Class Schedules")}
                            >
                              View all
                            </button>
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {classRooms.map((cls) => (
                          <div
                            key={cls.id}
                            className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center">
                                {cls.grade.split(" ")[1] || "Y4"}
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-zinc-900">{cls.name}</h4>
                                <span className="text-[10px] text-zinc-500">
                                  Lead: {cls.leadTeacher} · {cls.room}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <div className="text-right">
                                <span className="font-bold text-zinc-900 block text-xs">
                                  {cls.studentsEnrolled}/{cls.maxCapacity}
                                </span>
                                <span className="text-[9px] text-zinc-400">Enrolled</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-emerald-700 block text-xs">
                                  {cls.avgScore}%
                                </span>
                                <span className="text-[9px] text-zinc-400">{cls.attendance}% Att</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Faculty on Duty */}
                    <section className="panel p-[16px_20px]" aria-label="Teaching Faculty on Duty">
                      <div className="mb-3">
                        <CardHeader
                          title="Teaching Faculty on Duty"
                          action={
                            <button
                              type="button"
                              className="view-all"
                              onClick={() => setActiveTab("Faculty Directory")}
                            >
                              View all
                            </button>
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {facultyList.slice(0, 3).map((f) => (
                          <div
                            key={f.id}
                            className="p-2 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={f.avatar}
                                alt={f.name}
                                className="w-8 h-8 rounded-xl object-cover bg-purple-100"
                              />
                              <div>
                                <span className="font-bold text-zinc-900 block text-xs">{f.name}</span>
                                <span className="text-[10px] text-zinc-500">{f.department} · {f.classesAssigned[0]}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              ★ {f.rating}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="right-column">
                    {/* Pending Approvals Card */}
                    <section className="panel p-[16px_20px]" aria-label="Pending Approvals">
                      <div className="mb-3">
                        <CardHeader
                          title="Pending Approvals"
                          action={
                            <button
                              type="button"
                              className="view-all"
                              onClick={() => setIsAddFacultyOpen(true)}
                            >
                              Add Faculty
                            </button>
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2">
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
                              onClick={() => onToast("Declined transfer request.")}
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
                    </section>

                    {/* School Bulletins Card */}
                    <section className="panel p-[16px_20px]" aria-label="Campus Bulletins & Reports">
                      <div className="mb-3">
                        <CardHeader
                          title="Campus Bulletins"
                          action={
                            <button
                              type="button"
                              className="view-all"
                              onClick={() => setIsAnnouncementOpen(true)}
                            >
                              Broadcast
                            </button>
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-zinc-800">Whole-School Assembly</span>
                            <span className="text-[10px] text-purple-600 font-bold">Today 09:00</span>
                          </div>
                          <p className="text-[11px] text-zinc-600 mt-0.5">
                            AI Ethics & Robotics Showcase in Main Auditorium
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAnnouncementOpen(true)}
                          className="w-full py-2 text-xs font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
                        >
                          Send Campus-Wide Notice →
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              </>
            )}

            {/* View 2: Faculty Directory */}
            {activeTab === "Faculty Directory" && (
              <section className="panel p-[16px_20px]" aria-label="Teaching Faculty Roster">
                <div className="mb-3">
                  <CardHeader
                    title="Teaching Faculty Roster"
                    action={
                      <button
                        type="button"
                        onClick={() => setIsAddFacultyOpen(true)}
                        className="view-all"
                      >
                        + Add Faculty Member
                      </button>
                    }
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {facultyList.map((f) => (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex flex-col justify-between"
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

                        <div className="mt-2.5 flex items-center gap-2.5">
                          <img
                            src={f.avatar}
                            alt={f.name}
                            className="w-10 h-10 rounded-xl object-cover bg-purple-100"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-zinc-900 truncate">{f.name}</h4>
                            <p className="text-[11px] text-zinc-500 truncate">{f.title}</p>
                            <span className="text-[10px] text-purple-700 font-bold block">
                              {f.department}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 p-2 rounded-xl bg-white border border-zinc-100 text-[11px] flex justify-between font-medium text-zinc-600">
                          <span>Classes: {f.classesAssigned.join(", ")}</span>
                          <span className="font-bold text-zinc-900">{f.studentCount} students</span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-zinc-200/60 flex items-center justify-between text-xs">
                        <span className="text-zinc-500 text-[10px]">{f.email}</span>
                        <button
                          type="button"
                          onClick={() => onToast(`Opening file for ${f.name}`)}
                          className="font-bold text-purple-600 hover:underline cursor-pointer text-xs"
                        >
                          View File →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* View 3: Student Roster */}
            {activeTab === "Student Roster" && (
              <div className="content-grid">
                <div className="left-column">
                  <section className="panel p-[16px_20px]" aria-label="Student Directory">
                    <div className="mb-3">
                      <CardHeader
                        title="Student Directory & Cohorts"
                        action={
                          <button
                            type="button"
                            onClick={() => onToast("Bulk Enrollment CSV Upload opened.")}
                            className="view-all"
                          >
                            Import CSV
                          </button>
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Year 3 Cohort</span>
                        <div className="text-base font-bold text-zinc-900 mt-0.5">112 Students</div>
                        <span className="text-[10px] text-emerald-600 font-semibold">97.8% Attendance</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Year 4 Cohort</span>
                        <div className="text-base font-bold text-zinc-900 mt-0.5">124 Students</div>
                        <span className="text-[10px] text-emerald-600 font-semibold">98.4% Attendance</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Year 5 Cohort</span>
                        <div className="text-base font-bold text-zinc-900 mt-0.5">120 Students</div>
                        <span className="text-[10px] text-emerald-600 font-semibold">96.5% Attendance</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Year 6 Cohort</span>
                        <div className="text-base font-bold text-zinc-900 mt-0.5">124 Students</div>
                        <span className="text-[10px] text-emerald-600 font-semibold">98.9% Attendance</span>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="right-column">
                  <section className="panel p-[16px_20px]" aria-label="Student Spotlight">
                    <div className="mb-3">
                      <CardHeader title="Cohort Spotlight" />
                    </div>
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                        <div className="font-bold text-zinc-900">Leo Thompson</div>
                        <div className="text-zinc-500 text-[11px]">Roll: #2026-0401 · 94% Avg</div>
                        <div className="text-emerald-600 font-semibold text-[10px] mt-0.5">Status: Excelling</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                        <div className="font-bold text-zinc-900">Maya Lin</div>
                        <div className="text-zinc-500 text-[11px]">Roll: #2026-0402 · 91% Avg</div>
                        <div className="text-emerald-600 font-semibold text-[10px] mt-0.5">Status: Excelling</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                        <div className="font-bold text-zinc-900">Liam O&apos;Connor</div>
                        <div className="text-zinc-500 text-[11px]">Roll: #2026-0403 · 72% Avg</div>
                        <div className="text-amber-600 font-semibold text-[10px] mt-0.5">Status: Needs Support</div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* View 4: Class Schedules */}
            {activeTab === "Class Schedules" && (
              <section className="panel p-[16px_20px]" aria-label="Classrooms & Timetable Matrix">
                <div className="mb-3">
                  <CardHeader
                    title="Classrooms & Timetable Matrix"
                    action={
                      <button
                        type="button"
                        onClick={() => onToast("Schedule conflict detection: No collisions found.")}
                        className="view-all"
                      >
                        Run Diagnostic
                      </button>
                    }
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {classRooms.map((c) => (
                    <div key={c.id} className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                            {c.grade}
                          </span>
                          <h3 className="text-sm font-bold text-zinc-900 mt-1">{c.name}</h3>
                          <p className="text-xs text-zinc-500">{c.room}</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                          {c.studentsEnrolled}/{c.maxCapacity} Seats
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-zinc-200/60 flex items-center justify-between text-xs">
                        <span className="text-zinc-600">Lead: <strong>{c.leadTeacher}</strong></span>
                        <span className="text-zinc-500">Avg Mastery: <strong>{c.avgScore}%</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* View 5: School Reports */}
            {activeTab === "School Reports" && (
              <section className="panel p-[16px_20px]" aria-label="School-Wide Reports & Accreditation">
                <div className="mb-3">
                  <CardHeader
                    title="School-Wide Reports & Accreditation"
                    action={
                      <button
                        type="button"
                        onClick={() => onToast("Generating whole-school accreditation PDF bundle...")}
                        className="view-all"
                      >
                        Download PDF Bundle
                      </button>
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
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
                      Export PDF →
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
              </section>
            )}

            {/* View 6: School Settings */}
            {activeTab === "School Settings" && (
              <div className="content-grid">
                <div className="left-column">
                  <section className="panel p-[16px_20px]" aria-label="School Operations Preferences">
                    <div className="mb-3">
                      <CardHeader
                        title="Campus Operational Preferences"
                        action={
                          <button
                            type="button"
                            onClick={() => onToast("School settings saved successfully!")}
                            className="view-all"
                          >
                            Save
                          </button>
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2.5 text-xs">
                      <div>
                        <label className="font-bold text-zinc-700 uppercase">Institution Name</label>
                        <input
                          type="text"
                          defaultValue="Quantum School of AI"
                          className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 font-medium"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-zinc-700 uppercase">Academic Year & Term</label>
                        <input
                          type="text"
                          defaultValue="Academic Year 2026-2027 · Term 2"
                          className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 font-medium"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-zinc-700 uppercase">Emergency Contact Hotline</label>
                        <input
                          type="text"
                          defaultValue="+1 (415) 880-9200 (24/7 Security Desk)"
                          className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 font-medium"
                        />
                      </div>
                    </div>
                  </section>
                </div>

                <div className="right-column">
                  <section className="panel p-[16px_20px]" aria-label="Security Protocols">
                    <div className="mb-3">
                      <CardHeader title="Safety Protocol & Access" />
                    </div>
                    <div className="text-xs text-zinc-600">
                      <p>
                        Autonomous emergency lockdowns, perimeter verification, and cryptographic student logs are synchronized with local authorities.
                      </p>
                      <div className="mt-3 p-2.5 rounded-xl bg-purple-50 text-purple-800 font-bold text-center">
                        All Safety Systems Online
                      </div>
                    </div>
                  </section>
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
