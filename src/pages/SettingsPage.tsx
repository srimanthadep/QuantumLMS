import { useState } from "react"
import type { MetricItem } from "../types"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"
import { MetricCard } from "../components/MetricCard"

export function SettingsHeader({
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onSavePreferences,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onSavePreferences: () => void
}) {
  return (
    <header className="dashboard-header">
      <div>
        <div className="greeting">
          <span>Settings & Preferences</span>
        </div>
        <div className="subtitle">
          Manage teacher credentials, classroom grading benchmarks, and automated notifications
        </div>
      </div>
      <div className="header-actions">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search configuration..."
            aria-label="Search settings"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <HexColorField
          hexColor={hexColor}
          onChangeHex={onChangeHexColor}
        />
        <button
          className="ask-ai"
          onClick={onSavePreferences}
          aria-label="Save Settings"
        >
          <span>✓</span>
          Save All
        </button>
      </div>
    </header>
  )
}

const settingsMetrics: MetricItem[] = [
  {
    icon: "settings",
    label: "Active System",
    value: "v2.4",
    trend: "Quantum Core",
    tone: "lavender",
  },
  {
    icon: "users",
    label: "Enrolled Cohort",
    value: "24",
    trend: "Year 4 Maple",
    tone: "pink",
  },
  {
    icon: "document",
    label: "Grading Model",
    value: "Standard",
    trend: "A-D Rubric",
    tone: "yellow",
  },
  {
    icon: "calendar",
    label: "Auto Schedules",
    value: "4 Active",
    trend: "Parents synced",
    tone: "lime",
  },
]

export default function SettingsPage({
  searchQuery,
  setSearchQuery,
  hexColor,
  onChangeHexColor,
  onSave,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  hexColor: string
  onChangeHexColor: (color: string) => void
  onSave: () => void
}) {
  const [teacherName, setTeacherName] = useState("Srimanth")
  const [teacherEmail, setTeacherEmail] = useState("srimanth@quantum-lms.edu")
  const [className, setClassName] = useState("Year 4 – Maple Class")
  const [academicYear, setAcademicYear] = useState("2026 - 2027 Term 1")
  const [passingThreshold, setPassingThreshold] = useState("70")
  const [masteryThreshold, setMasteryThreshold] = useState("80")
  const [autoEmailParents, setAutoEmailParents] = useState(true)
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(true)
  const [lateSubmissionGrace, setLateSubmissionGrace] = useState("24")

  return (
    <>
      <SettingsHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hexColor={hexColor}
        onChangeHexColor={onChangeHexColor}
        onSavePreferences={onSave}
      />

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {settingsMetrics.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        <div className="left-column">
          {/* Teacher Profile & Classroom Configuration */}
          <section className="panel p-6 flex flex-col gap-5" aria-label="Teacher Profile">
            <div>
              <div className="card-title">Teacher Profile & Classroom Identity</div>
              <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
                Primary educator information and active classroom metadata
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#f8f8fd] border border-purple-100">
              <img
                src="assets/srimanth.png"
                alt="Srimanth"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-300"
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-black">{teacherName}</div>
                <div className="text-xs text-zinc-500">Lead Instructor · Year 4 Department</div>
                <div className="text-[11px] text-purple-700 font-medium mt-1">
                  Active Session · Quantum LMS Verified
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Teacher Display Name
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Instructor Email
                </label>
                <input
                  type="email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Assigned Class Name
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Academic Term
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
                />
              </div>
            </div>
          </section>

          {/* Academic Benchmarks */}
          <section className="panel p-6 flex flex-col gap-4" aria-label="Academic Benchmarks">
            <div>
              <div className="card-title">Academic & Competency Benchmarks</div>
              <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
                Set thresholds for at-risk alerts, standard proficiency, and honors
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#fff5f5] border border-rose-100 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-rose-700">At-Risk Alert Trigger</span>
                <div className="flex items-center gap-1">
                  <strong className="text-lg font-bold text-rose-950">&lt; {passingThreshold}%</strong>
                </div>
                <span className="text-[10px] text-rose-600">Automated teacher notice</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#efffbd] border border-lime-200 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-lime-800">Target Mastery Goal</span>
                <div className="flex items-center gap-1">
                  <strong className="text-lg font-bold text-lime-950">&ge; {masteryThreshold}%</strong>
                </div>
                <span className="text-[10px] text-lime-700">Curriculum milestone</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f3f0ff] border border-purple-200 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-purple-800">Honor Roll Cutoff</span>
                <div className="flex items-center gap-1">
                  <strong className="text-lg font-bold text-purple-950">&ge; 88%</strong>
                </div>
                <span className="text-[10px] text-purple-700">Monthly recognition</span>
              </div>
            </div>
          </section>
        </div>

        <div className="right-column">
          {/* Automation & Notification Preferences */}
          <section className="panel p-6 flex flex-col gap-5" aria-label="Automated Preferences">
            <div>
              <div className="card-title">Automation & Dispatch Schedules</div>
              <div className="text-[11px] font-normal text-zinc-500 mt-0.5">
                Manage AI assistants and parental report triggers
              </div>
            </div>

            <div className="flex flex-col gap-3.5">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 hover:bg-purple-50/50 cursor-pointer transition-colors">
                <div>
                  <strong className="text-xs font-bold text-black block">Automated Parent Delivery</strong>
                  <span className="text-[11px] text-zinc-500 font-normal">
                    Dispatch weekly progress digests every Friday at 4:00 PM
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoEmailParents}
                  onChange={(e) => setAutoEmailParents(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--purple)] focus:ring-[var(--purple)]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 hover:bg-purple-50/50 cursor-pointer transition-colors">
                <div>
                  <strong className="text-xs font-bold text-black block">Quantum AI Diagnostic Assistant</strong>
                  <span className="text-[11px] text-zinc-500 font-normal">
                    Continuous student gap detection and tailored worksheet generation
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={aiSuggestionsEnabled}
                  onChange={(e) => setAiSuggestionsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--purple)] focus:ring-[var(--purple)]"
                />
              </label>

              <div className="p-3 rounded-2xl bg-zinc-50 flex items-center justify-between">
                <div>
                  <strong className="text-xs font-bold text-black block">Grace Period Window</strong>
                  <span className="text-[11px] text-zinc-500 font-normal">
                    Allow delayed turn-in without penalizing timeliness score
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={lateSubmissionGrace}
                    onChange={(e) => setLateSubmissionGrace(e.target.value)}
                    className="w-14 h-8 px-2 rounded-lg border border-zinc-200 text-xs text-center font-bold"
                  />
                  <span className="text-xs text-zinc-500">hours</span>
                </div>
              </div>
            </div>

            <button
              onClick={onSave}
              className="w-full h-10 rounded-full btn-primary text-xs font-bold transition-colors shadow-sm"
            >
              Save Configuration Changes
            </button>
          </section>
        </div>
      </div>
    </>
  )
}
