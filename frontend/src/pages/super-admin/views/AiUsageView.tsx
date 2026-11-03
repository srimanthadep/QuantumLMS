import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Bot,
  Cpu,
  Sparkles,
  Sliders,
  Wallet,
  Save,
  Check,
  Video,
  FileAudio,
  ClipboardCheck,
} from "lucide-react"
import DonutChart from "@/components/charts/DonutChart"
import type { useSuperAdminStore } from "@/data/adminStore"

interface AiUsageViewProps {
  store: ReturnType<typeof useSuperAdminStore>
  onToast: (msg: string) => void
}

export default function AiUsageView({ store, onToast }: AiUsageViewProps) {
  const { aiUsage, updateAiModelSettings } = store

  const [primaryModel, setPrimaryModel] = useState(aiUsage.primaryModel)
  const [fallbackModel, setFallbackModel] = useState(aiUsage.fallbackModel)
  const [temperature, setTemperature] = useState(aiUsage.temperature)
  const [strictnessScore, setStrictnessScore] = useState(aiUsage.strictnessScore)
  const [monthlyBudgetCapInr, setMonthlyBudgetCapInr] = useState(aiUsage.monthlyBudgetCapInr)

  const donutData = [
    { label: "AI Tutor (Clover)", value: aiUsage.tokensByFeature.aiTutor, color: "#6d4aff" },
    { label: "Whisper Transcription", value: aiUsage.tokensByFeature.transcription, color: "#2563eb" },
    { label: "Video Chaptering", value: aiUsage.tokensByFeature.videoChaptering, color: "#047857" },
    { label: "Grading Assist", value: aiUsage.tokensByFeature.evaluatorAssist, color: "#b45309" },
  ]

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateAiModelSettings({
      primaryModel,
      fallbackModel,
      temperature: Number(temperature),
      strictnessScore: Number(strictnessScore),
      monthlyBudgetCapInr: Number(monthlyBudgetCapInr),
    })
    onToast("AI engine parameters and model allocations saved")
  }

  const budgetUsedPct = Math.round((aiUsage.totalCostInr / aiUsage.monthlyBudgetCapInr) * 100)

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-text">
            <Cpu className="h-3.5 w-3.5" />
            Foundation Models & Inference Telemetry
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            AI Engine Usage & Controls
          </h1>
          <p className="text-sm text-muted-foreground">
            Token telemetry by feature, API cost expenditure in INR, and LLM temperature orchestration
          </p>
        </div>

        <Button type="submit" className="gap-1.5">
          <Save className="h-4 w-4" />
          Update AI Engine
        </Button>
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-1">
          <div className="text-xs text-muted-foreground">Total Tokens (Current Month)</div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {(aiUsage.totalTokensMonth / 1000000).toFixed(1)}M Tokens
          </div>
          <div className="text-[11px] text-primary-text font-medium">Primary: {aiUsage.primaryModel}</div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-1">
          <div className="text-xs text-muted-foreground">Est. Inference Cost (₹)</div>
          <div className="text-2xl font-bold text-primary-text font-mono">
            ₹{aiUsage.totalCostInr.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Budget Cap: ₹{aiUsage.monthlyBudgetCapInr.toLocaleString("en-IN")} ({budgetUsedPct}% used)
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-1">
          <div className="text-xs text-muted-foreground">Clover Real-Time Tutor</div>
          <div className="text-2xl font-bold text-success font-mono">99.8% Accuracy</div>
          <div className="text-[11px] text-muted-foreground">Strictness guardrails active</div>
        </div>
      </div>

      {/* Token Distribution by Feature */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-foreground">Token Consumption by Capability</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
            <div className="h-48 w-48 shrink-0">
              <DonutChart data={donutData} />
            </div>

            <div className="space-y-3 w-full text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-2 border border-border">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <Bot className="h-4 w-4 text-primary-text" /> AI Tutor (Clover)
                </span>
                <span className="font-mono font-bold text-foreground">
                  {(aiUsage.tokensByFeature.aiTutor / 1000000).toFixed(1)}M
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-2 border border-border">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <FileAudio className="h-4 w-4 text-blue-500" /> Whisper Transcription
                </span>
                <span className="font-mono font-bold text-foreground">
                  {(aiUsage.tokensByFeature.transcription / 1000000).toFixed(1)}M
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-2 border border-border">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <Video className="h-4 w-4 text-emerald-500" /> Video Auto-Chaptering
                </span>
                <span className="font-mono font-bold text-foreground">
                  {(aiUsage.tokensByFeature.videoChaptering / 1000000).toFixed(1)}M
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-2 border border-border">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <ClipboardCheck className="h-4 w-4 text-amber-500" /> Evaluator Assist
                </span>
                <span className="font-mono font-bold text-foreground">
                  {(aiUsage.tokensByFeature.evaluatorAssist / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Model Configuration Form */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border">
            <Sliders className="h-5 w-5 text-primary-text" />
            <h2 className="text-base font-bold text-foreground">Model Allocation & Temperature</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Primary Inference Model</label>
                <select
                  className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none"
                  value={primaryModel}
                  onChange={(e) => setPrimaryModel(e.target.value)}
                >
                  <option value="Gemini 2.5 Flash">Gemini 2.5 Flash (Google Cloud)</option>
                  <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet (AWS Bedrock)</option>
                  <option value="GPT-4o Mini">GPT-4o Mini (Azure OpenAI)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Failover Backup Model</label>
                <select
                  className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none"
                  value={fallbackModel}
                  onChange={(e) => setFallbackModel(e.target.value)}
                >
                  <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                  <option value="Gemini 2.5 Flash">Gemini 2.5 Flash</option>
                  <option value="Mistral Large 2">Mistral Large 2</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-foreground">Sampling Temperature ({temperature})</span>
                <span className="text-muted-foreground font-mono">0.0 (Deterministic) - 1.0 (Creative)</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-foreground">Strictness Guardrail Score ({strictnessScore}%)</span>
                <span className="text-muted-foreground font-mono">Hallucination suppression threshold</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="1"
                value={strictnessScore}
                onChange={(e) => setStrictnessScore(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-foreground">Monthly Cap (₹ INR)</label>
              <Input
                type="number"
                min={50000}
                step={25000}
                value={monthlyBudgetCapInr}
                onChange={(e) => setMonthlyBudgetCapInr(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

