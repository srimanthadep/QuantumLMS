import { useState } from "react"
import {
  Bot,
  ClipboardCheck,
  Cpu,
  FileAudio,
  Save,
  Sliders,
  Sparkles,
  Video,
  Wallet,
} from "lucide-react"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageHeader,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatCard,
} from "@/components/ui"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import DonutChart from "@/components/charts/DonutChart"
import type { MetricItem } from "@/types"
import type { useSuperAdminStore } from "@/data/adminStore"
import { cn } from "@/lib/utils"

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
    { label: "AI Tutor (Clover)", value: aiUsage.tokensByFeature.aiTutor, color: "var(--primary)" },
    { label: "Whisper Transcription", value: aiUsage.tokensByFeature.transcription, color: "var(--secondary)" },
    { label: "Video Chaptering", value: aiUsage.tokensByFeature.videoChaptering, color: "var(--success)" },
    { label: "Grading Assist", value: aiUsage.tokensByFeature.evaluatorAssist, color: "var(--warning)" },
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

  const kpis: MetricItem[] = [
    {
      icon: "trend",
      label: "Monthly AI Spend",
      value: `₹${aiUsage.totalCostInr.toLocaleString("en-IN")}`,
      trend: `${budgetUsedPct}% of ₹${(aiUsage.monthlyBudgetCapInr / 1000).toFixed(0)}k budget`,
      tone: "lime",
    },
    {
      icon: "fire",
      label: "Total Tokens",
      value: `${(aiUsage.totalTokensMonth / 1_000_000).toFixed(1)}M`,
      trend: "Current billing cycle",
      tone: "lavender",
    },
    {
      icon: "star",
      label: "Primary LLM",
      value: primaryModel.split(" ")[0],
      trend: "Fast streaming token tier",
      tone: "yellow",
    },
    {
      icon: "users",
      label: "Fallback Ladder",
      value: "Ready",
      trend: fallbackModel.split(" ")[0],
      tone: "pink",
    },
  ]

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="AI Model Routing & Compute Quotas"
        description="Token consumption telemetry, model fallback ladders, temperature parameters, and budget caps."
        breadcrumb={[{ label: "Platform Console", href: "/super-admin" }, { label: "AI Usage" }]}
        actions={
          <Button type="submit">
            <Save className="mr-1.5 h-4 w-4" />
            Save AI Parameters
          </Button>
        }
      />

      {/* KPI Cards */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <StaggerItem key={kpi.label}>
            <StatCard item={kpi} />
          </StaggerItem>
        ))}
      </Stagger>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Routing Parameters & Features (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base sm:text-lg">Inference Engine Routing</CardTitle>
              <CardDescription>
                Configure upstream foundation model providers and fallback safety ladders
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Primary Model (Default Inference)">
                  <Select value={primaryModel} onValueChange={setPrimaryModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gemini 2.5 Flash">Gemini 2.5 Flash (Google Vertex AI)</SelectItem>
                      <SelectItem value="Gemini 1.5 Pro">Gemini 1.5 Pro (Ultra Reasoning)</SelectItem>
                      <SelectItem value="GPT-4o Mini">GPT-4o Mini (OpenAI)</SelectItem>
                      <SelectItem value="Claude 3.5 Sonnet">Claude 3.5 Sonnet (Anthropic)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Failover Model (Zero Downtime Fallback)">
                  <Select value={fallbackModel} onValueChange={setFallbackModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GPT-4o Mini">GPT-4o Mini (OpenAI)</SelectItem>
                      <SelectItem value="Gemini 2.5 Flash">Gemini 2.5 Flash (Google)</SelectItem>
                      <SelectItem value="Claude 3.5 Haiku">Claude 3.5 Haiku (Anthropic)</SelectItem>
                      <SelectItem value="Llama 3.3 70B">Llama 3.3 70B (AWS Bedrock)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <Field label="Inference Temperature">
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                  />
                </Field>

                <Field label="Rubric Strictness Score">
                  <Input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="1"
                    value={strictnessScore}
                    onChange={(e) => setStrictnessScore(parseFloat(e.target.value) || 0.8)}
                  />
                </Field>

                <Field label="Monthly Budget Cap (₹ INR)">
                  <Input
                    type="number"
                    step="5000"
                    value={monthlyBudgetCapInr}
                    onChange={(e) => setMonthlyBudgetCapInr(parseInt(e.target.value) || 100000)}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Tokens Consumed by Feature */}
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base">Token Ingestion by Workload</CardTitle>
              <CardDescription>Breakdown of consumed tokens across academy modules</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {[
                {
                  label: "AI Student Tutor (Clover Assistant)",
                  tokens: aiUsage.tokensByFeature.aiTutor,
                  pct: Math.round((aiUsage.tokensByFeature.aiTutor / aiUsage.totalTokensMonth) * 100),
                },
                {
                  label: "Whisper Audio & Lecture Transcription",
                  tokens: aiUsage.tokensByFeature.transcription,
                  pct: Math.round((aiUsage.tokensByFeature.transcription / aiUsage.totalTokensMonth) * 100),
                },
                {
                  label: "Video Chaptering & Automated Summary",
                  tokens: aiUsage.tokensByFeature.videoChaptering,
                  pct: Math.round((aiUsage.tokensByFeature.videoChaptering / aiUsage.totalTokensMonth) * 100),
                },
                {
                  label: "Rubric Grading Assist & Plagiarism Check",
                  tokens: aiUsage.tokensByFeature.evaluatorAssist,
                  pct: Math.round((aiUsage.tokensByFeature.evaluatorAssist / aiUsage.totalTokensMonth) * 100),
                },
              ].map((feat) => (
                <div key={feat.label} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{feat.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {(feat.tokens / 1_000_000).toFixed(2)}M tokens ({feat.pct}%)
                    </span>
                  </div>
                  <Progress value={feat.pct} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Donut & Budget Meter (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base">Token Distribution</CardTitle>
              <CardDescription>Proportional compute utilization</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col items-center">
              <DonutChart
                data={donutData}
                size={180}
                thickness={20}
                formatValue={(v) => `${(v / 1_000_000).toFixed(1)}M`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base">Budget Exhaustion Meter</CardTitle>
              <CardDescription>Target monthly spending guardrail</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Spent this month</span>
                <span className="font-bold text-foreground text-sm">
                  ₹{aiUsage.totalCostInr.toLocaleString("en-IN")}
                </span>
              </div>
              <Progress value={budgetUsedPct} className="h-2" />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>0%</span>
                <span className="font-semibold text-primary-text">{budgetUsedPct}% Allocated</span>
                <span>₹{(aiUsage.monthlyBudgetCapInr / 1000).toFixed(0)}k Cap</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
