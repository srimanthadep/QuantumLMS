import React, { useState } from "react"
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Eye,
  Save,
  RotateCcw,
  Check,
  Shield,
  BookOpen,
} from "lucide-react"
import type { EvaluatorState } from "./data/evaluatorStorage"
import {
  updateEvaluatorSettings,
  resetEvaluatorToDefaults,
} from "./data/evaluatorStorage"
import type { EvaluatorSettings } from "./types"

interface SettingsProps {
  state: EvaluatorState
  onUpdateState: (newState: EvaluatorState) => void
  onToast: (msg: string) => void
}

export function Settings({ state, onUpdateState, onToast }: SettingsProps) {
  const [formSettings, setFormSettings] = useState<EvaluatorSettings>(
    state.settings
  )

  const handleToggleNotification = (
    key: keyof EvaluatorSettings["notificationPreferences"]
  ) => {
    setFormSettings((prev) => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [key]: !prev.notificationPreferences[key],
      },
    }))
  }

  const handleSave = () => {
    const nextState = updateEvaluatorSettings(state, formSettings)
    onUpdateState(nextState)
    onToast("Evaluator preferences saved successfully!")
  }

  const handleReset = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all evaluator data, mock evaluations, and preferences to defaults?"
      )
    ) {
      const resetState = resetEvaluatorToDefaults()
      setFormSettings(resetState.settings)
      onUpdateState(resetState)
      onToast("Evaluator environment reset to factory defaults.")
    }
  }

  const profile = formSettings.profile

  return (
    <div className="evaluator-settings space-y-6 max-w-4xl">
      {/* Evaluator Profile Section */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              Evaluator Academic Profile
            </h2>
            <p className="text-xs text-zinc-500">
              Assessor credential details managed by Institution Academic Affairs
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Full Name
            </label>
            <input
              type="text"
              readOnly
              value={profile.name}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 font-semibold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Academic Role
            </label>
            <input
              type="text"
              readOnly
              value={profile.role}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-purple-700 font-bold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Institutional Email
            </label>
            <input
              type="email"
              readOnly
              value={profile.email}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 font-mono cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Academic Faculty & School
            </label>
            <input
              type="text"
              readOnly
              value={profile.department}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Assigned Courses Roster */}
        <div>
          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
            Assigned Teaching & Evaluation Courses (Admin Assigned)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {profile.assignedCourses.map((c) => (
              <div
                key={c}
                className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center gap-2 font-medium text-zinc-800"
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evaluation Workspace & Display Preferences */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              Evaluation Workspace & View Preferences
            </h2>
            <p className="text-xs text-zinc-500">
              Configure submission lists and grading flow behavior
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-[11px] font-bold text-zinc-700 block mb-1">
              Default Submission Sort Order
            </label>
            <select
              value={formSettings.defaultSort}
              onChange={(e) =>
                setFormSettings((prev) => ({
                  ...prev,
                  defaultSort: e.target.value as any,
                }))
              }
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="deadline">Evaluation Deadline (Closest first)</option>
              <option value="submissionDate">Submission Timestamp (Recent first)</option>
              <option value="studentName">Student Alphabetical (A-Z)</option>
              <option value="score">Finalized Score</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-700 block mb-1">
              Submission List Style
            </label>
            <select
              value={formSettings.listView}
              onChange={(e) =>
                setFormSettings((prev) => ({
                  ...prev,
                  listView: e.target.value as any,
                }))
              }
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="detailed">Detailed Table (Expanded columns)</option>
              <option value="compact">Compact Row View</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2 text-xs">
          <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100 cursor-pointer">
            <div>
              <div className="font-bold text-zinc-900">
                Auto-advance upon Evaluation Submission
              </div>
              <div className="text-zinc-500 text-[11px]">
                Automatically navigate to next pending submission after submitting marks
              </div>
            </div>
            <input
              type="checkbox"
              checked={formSettings.autoAdvanceOnSubmit}
              onChange={(e) =>
                setFormSettings((prev) => ({
                  ...prev,
                  autoAdvanceOnSubmit: e.target.checked,
                }))
              }
              className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100 cursor-pointer">
            <div>
              <div className="font-bold text-zinc-900">
                Show Rubric Percentage Weights
              </div>
              <div className="text-zinc-500 text-[11px]">
                Display weight % alongside criterion marks in grading panel
              </div>
            </div>
            <input
              type="checkbox"
              checked={formSettings.showRubricWeights}
              onChange={(e) =>
                setFormSettings((prev) => ({
                  ...prev,
                  showRubricWeights: e.target.checked,
                }))
              }
              className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              Notification & Deadline Alerts
            </h2>
            <p className="text-xs text-zinc-500">
              Control alert categories shown in Evaluator Portal
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100 cursor-pointer">
            <div>
              <div className="font-bold text-zinc-900">
                New Student Submission Arrivals
              </div>
              <div className="text-zinc-500 text-[11px]">
                Notify when students submit new or revised attempts
              </div>
            </div>
            <input
              type="checkbox"
              checked={formSettings.notificationPreferences.newSubmissions}
              onChange={() => handleToggleNotification("newSubmissions")}
              className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100 cursor-pointer">
            <div>
              <div className="font-bold text-zinc-900">
                Approaching Evaluation Deadline Reminders
              </div>
              <div className="text-zinc-500 text-[11px]">
                Urgent banners when submissions are within 48h of deadline
              </div>
            </div>
            <input
              type="checkbox"
              checked={formSettings.notificationPreferences.deadlineReminders}
              onChange={() => handleToggleNotification("deadlineReminders")}
              className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100 cursor-pointer">
            <div>
              <div className="font-bold text-zinc-900">
                Student Reassessment Requests & Appeals
              </div>
              <div className="text-zinc-500 text-[11px]">
                High-priority notification when a student appeals evaluation marks
              </div>
            </div>
            <input
              type="checkbox"
              checked={formSettings.notificationPreferences.reassessmentRequests}
              onChange={() => handleToggleNotification("reassessmentRequests")}
              className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Save & Reset Actions */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Portal Data to Defaults</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Preferences</span>
        </button>
      </div>
    </div>
  )
}

export default Settings
