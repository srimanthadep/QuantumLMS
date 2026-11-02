import React, { useState } from "react"
import { motion } from "framer-motion"
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
  Sliders,
  SlidersHorizontal,
  GraduationCap,
  Sparkles,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Avatar,
  Switch,
  Input,
} from "@/components/ui"
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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Evaluator Preferences & Profile
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your grading studio workflow, SLA reminders, and assessor profile
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          className="cursor-pointer font-bold shadow-xs"
        >
          <Save className="h-4 w-4 mr-1.5" />
          <span>Save Changes</span>
        </Button>
      </div>

      {/* 2. Assessor Profile Card */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold text-foreground">
              Institutional Evaluator Identity
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-surface-2/60 border border-border">
            <Avatar
              src={formSettings.profile.avatar}
              name={formSettings.profile.name}
              size="lg"
              className="ring-2 ring-primary/20"
            />
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  {formSettings.profile.name}
                </h3>
                <Badge tone="primary" size="sm">
                  {formSettings.profile.title}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formSettings.profile.email} · {formSettings.profile.department}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Specializations
              </span>
              <div className="flex flex-wrap gap-1.5">
                {formSettings.profile.assignedSpecializations.map((spec) => (
                  <Badge key={spec} tone="secondary" size="sm">
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Assigned Evaluation Courses
              </span>
              <div className="flex flex-wrap gap-1.5">
                {formSettings.profile.assignedCourses.map((c) => (
                  <Badge key={c} tone="neutral" size="sm">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Grading Studio Preferences */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold text-foreground">
              Grading Studio Workflow
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 divide-y divide-border/60">
          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5 max-w-lg">
              <span className="text-sm font-semibold text-foreground block">
                Auto-advance on Submission
              </span>
              <p className="text-xs text-muted-foreground">
                When you finalize an evaluation, automatically open the next pending student in your queue.
              </p>
            </div>
            <Switch
              checked={formSettings.autoAdvanceOnSubmit}
              onCheckedChange={(checked) =>
                setFormSettings((prev) => ({ ...prev, autoAdvanceOnSubmit: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="space-y-0.5 max-w-lg">
              <span className="text-sm font-semibold text-foreground block">
                Show Rubric Weight Percentages
              </span>
              <p className="text-xs text-muted-foreground">
                Display explicit criterion weight percentages next to point marks during grading.
              </p>
            </div>
            <Switch
              checked={formSettings.showRubricWeights}
              onCheckedChange={(checked) =>
                setFormSettings((prev) => ({ ...prev, showRubricWeights: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. Notification Preferences */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold text-foreground">
              SLA & Notification Preferences
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 divide-y divide-border/60">
          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground block">
                New Submission Alerts
              </span>
              <p className="text-xs text-muted-foreground">
                Notify when students submit assignments in your assigned courses.
              </p>
            </div>
            <Switch
              checked={formSettings.notificationPreferences.newSubmissions}
              onCheckedChange={() => handleToggleNotification("newSubmissions")}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground block">
                24h SLA Deadline Warnings
              </span>
              <p className="text-xs text-muted-foreground">
                Urgent alerts for submissions approaching the grading deadline threshold.
              </p>
            </div>
            <Switch
              checked={formSettings.notificationPreferences.deadlineReminders}
              onCheckedChange={() => handleToggleNotification("deadlineReminders")}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground block">
                Reassessment Appeals
              </span>
              <p className="text-xs text-muted-foreground">
                High-priority notifications when students request a re-evaluation of marks.
              </p>
            </div>
            <Switch
              checked={formSettings.notificationPreferences.reassessmentRequests}
              onCheckedChange={() => handleToggleNotification("reassessmentRequests")}
            />
          </div>
        </CardContent>
      </Card>

      {/* 5. Danger Zone */}
      <Card className="border-danger/30 bg-danger-soft/10 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-sm font-bold text-danger block">
              Reset Evaluator Environment
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Re-seed all assessments, student mock files, and draft evaluations to factory defaults.
            </p>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={handleReset}
            className="cursor-pointer font-semibold text-xs shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            <span>Reset to Defaults</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings
