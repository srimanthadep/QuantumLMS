import { useState } from "react"
import {
  Bell,
  Bot,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  Mail,
  RefreshCw,
  Save,
  Send,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Volume2,
  Webhook,
  Zap,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/ui"
import { cn } from "@/lib/utils"

interface SupportSettingsPageProps {
  onToast?: (msg: string) => void
}

export default function SupportSettingsPage({ onToast }: SupportSettingsPageProps) {
  const [activeTab, setActiveTab] = useState("general")
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingWebhook, setIsTestingWebhook] = useState(false)

  // Form states - General
  const [deskName, setDeskName] = useState("Quantum Tier-1 Academic Support Desk")
  const [deskEmail, setDeskEmail] = useState("support@quantumlms.ai")
  const [operatingHours, setOperatingHours] = useState("08:00 AM - 11:00 PM (IST)")
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST - UTC+05:30)")
  const [liveChatEnabled, setLiveChatEnabled] = useState(true)
  const [inactivityTimeout, setInactivityTimeout] = useState("15")

  // Form states - SLAs
  const [urgentSlaMinutes, setUrgentSlaMinutes] = useState("15")
  const [highSlaHours, setHighSlaHours] = useState("1")
  const [autoEscalate, setAutoEscalate] = useState(true)

  // Form states - Auto Responder
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hello {student_name}! Thank you for reaching out to the Quantum LMS Support Desk. Our academic support specialists are reviewing your inquiry. We typically reply within 15 minutes.",
  )
  const [awayMessage, setAwayMessage] = useState(
    "Hello! Our desk is currently offline for the night. Your inquiry has been queued for our morning shift specialists (08:00 AM IST).",
  )

  // Form states - Webhooks
  const [webhookUrl, setWebhookUrl] = useState("https://hooks.slack.com/services/T00/B00/quantum-support")
  const [notifyOnUrgent, setNotifyOnUrgent] = useState(true)
  const [notifyOnAppeal, setNotifyOnAppeal] = useState(true)

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      onToast?.("Support desk settings updated successfully.")
    }, 600)
  }

  const handleTestWebhook = () => {
    setIsTestingWebhook(true)
    setTimeout(() => {
      setIsTestingWebhook(false)
      onToast?.("Test payload successfully delivered to webhook endpoint.")
    }, 800)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Support Desk Settings"
        description="Configure queue routing, operating hours, SLA thresholds, automated responses, and webhook integrations."
        breadcrumb={[{ label: "Support", href: "/support" }, { label: "Settings" }]}
      />

      <form onSubmit={handleSaveSettings}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 max-w-xl">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="slas">SLAs & Triage</TabsTrigger>
            <TabsTrigger value="auto-responder">Auto-Responder</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>

          {/* Tab 1: General */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-base">Desk Identification & Hours</CardTitle>
                <CardDescription>Primary support channels and working hours schedule</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 max-w-xl">
                <Field label="Support Desk Name">
                  <Input value={deskName} onChange={(e) => setDeskName(e.target.value)} />
                </Field>

                <Field label="Inbound Contact Email">
                  <Input type="email" value={deskEmail} onChange={(e) => setDeskEmail(e.target.value)} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Operating Hours">
                    <Input value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} />
                  </Field>
                  <Field label="Timezone">
                    <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                  </Field>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Live Chat Inquiries</p>
                    <p className="text-xs text-muted-foreground">
                      Allow learners to initiate real-time chat sessions with on-duty specialists
                    </p>
                  </div>
                  <Switch checked={liveChatEnabled} onCheckedChange={setLiveChatEnabled} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: SLAs & Triage */}
          <TabsContent value="slas" className="space-y-6">
            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-base">SLA Benchmarks & Auto-Escalation</CardTitle>
                <CardDescription>Configure target response windows and supervisor alerts</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Urgent Priority Target (Minutes)">
                    <Input
                      type="number"
                      value={urgentSlaMinutes}
                      onChange={(e) => setUrgentSlaMinutes(e.target.value)}
                    />
                  </Field>
                  <Field label="High Priority Target (Hours)">
                    <Input
                      type="number"
                      value={highSlaHours}
                      onChange={(e) => setHighSlaHours(e.target.value)}
                    />
                  </Field>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Automatic Supervisor Escalation</p>
                    <p className="text-xs text-muted-foreground">
                      Escalate tickets to Lead Specialists if unanswered within 80% of SLA deadline
                    </p>
                  </div>
                  <Switch checked={autoEscalate} onCheckedChange={setAutoEscalate} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Auto Responder */}
          <TabsContent value="auto-responder" className="space-y-6">
            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-base">Automated Support Messages</CardTitle>
                <CardDescription>Instant receipts and offline notification messages</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 max-w-xl">
                <Field
                  label="Standard Welcome Acknowledgment"
                  hint="Available tags: {student_name}, {ticket_number}, {cohort}"
                >
                  <Textarea
                    rows={4}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                  />
                </Field>

                <Field label="Offline / After-Hours Message">
                  <Textarea
                    rows={3}
                    value={awayMessage}
                    onChange={(e) => setAwayMessage(e.target.value)}
                  />
                </Field>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Webhooks */}
          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-base">Outbound Notification Webhooks</CardTitle>
                <CardDescription>Forward ticket alerts to Slack, Discord, or internal incident tools</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 max-w-xl">
                <Field label="Webhook Endpoint URL">
                  <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
                </Field>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-foreground">Event Triggers</p>
                  <div className="flex items-center justify-between rounded-md border border-border p-3 text-xs">
                    <div>
                      <p className="font-semibold text-foreground">Urgent SLA Tickets</p>
                      <p className="text-muted-foreground">Trigger alert when urgent priority ticket is filed</p>
                    </div>
                    <Switch checked={notifyOnUrgent} onCheckedChange={setNotifyOnUrgent} />
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-border p-3 text-xs">
                    <div>
                      <p className="font-semibold text-foreground">AI Evaluation Appeals</p>
                      <p className="text-muted-foreground">Notify when a student disputes an automated grade</p>
                    </div>
                    <Switch checked={notifyOnAppeal} onCheckedChange={setNotifyOnAppeal} />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestWebhook}
                    loading={isTestingWebhook}
                  >
                    <Webhook className="mr-1.5 h-3.5 w-3.5" />
                    Send Test Webhook
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Save Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="submit" loading={isSaving}>
              <Save className="mr-1.5 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  )
}
