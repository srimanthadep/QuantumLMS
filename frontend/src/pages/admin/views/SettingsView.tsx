import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Settings,
  Building,
  Award,
  Bell,
  ShieldCheck,
  Save,
  Check,
} from "lucide-react"
import type { useAdminStore } from "@/data/adminStore"

interface SettingsViewProps {
  store: ReturnType<typeof useAdminStore>
  onToast: (msg: string) => void
}

export default function SettingsView({ store, onToast }: SettingsViewProps) {
  const { settings, updateSettings } = store

  const [name, setName] = useState(settings.name)
  const [tagline, setTagline] = useState(settings.tagline)
  const [domain, setDomain] = useState(settings.domain)
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail)
  const [gstNumber, setGstNumber] = useState(settings.gstNumber)
  const [certificateSignatory, setCertificateSignatory] = useState(settings.certificateSignatory)

  const [autoIssueCertificates, setAutoIssueCertificates] = useState(settings.autoIssueCertificates)
  const [enablePublicVerification, setEnablePublicVerification] = useState(settings.enablePublicVerification)
  const [requireMfaForStaff, setRequireMfaForStaff] = useState(settings.requireMfaForStaff)
  const [notifyOnEnrolment, setNotifyOnEnrolment] = useState(settings.notifyOnEnrolment)
  const [notifyOnLowBatchSeats, setNotifyOnLowBatchSeats] = useState(settings.notifyOnLowBatchSeats)
  const [notifyOnRefundRequest, setNotifyOnRefundRequest] = useState(settings.notifyOnRefundRequest)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateSettings({
      name,
      tagline,
      domain,
      supportEmail,
      gstNumber,
      certificateSignatory,
      autoIssueCertificates,
      enablePublicVerification,
      requireMfaForStaff,
      notifyOnEnrolment,
      notifyOnLowBatchSeats,
      notifyOnRefundRequest,
    })
    onToast("Academy operational settings saved successfully")
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Academy Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Organization branding, tax identifiers, certificate automation, and staff security
          </p>
        </div>

        <Button type="submit" className="gap-1.5">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>

      {/* Organization Profile */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border">
          <Building className="h-5 w-5 text-primary-text" />
          <h2 className="text-base font-bold text-foreground">Academy Identity & Tax Details</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Academy Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Tagline</label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Custom Web Domain</label>
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Support Desk Email</label>
            <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">GSTIN (India)</label>
            <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Base Currency</label>
            <Input disabled value="INR (₹) - Indian Rupee" className="bg-surface-2" />
          </div>
        </div>
      </div>

      {/* Certificate Authority */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border">
          <Award className="h-5 w-5 text-primary-text" />
          <h2 className="text-base font-bold text-foreground">Digital Certificate Authority</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5 max-w-md">
            <label className="text-xs font-semibold text-foreground">Official Certificate Signatory</label>
            <Input
              value={certificateSignatory}
              onChange={(e) => setCertificateSignatory(e.target.value)}
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
              <div>
                <div className="text-xs font-semibold text-foreground">Auto-issue upon 100% Course Completion</div>
                <div className="text-[11px] text-muted-foreground">
                  Automatically sign and dispatch certificate when learner completes all lessons and passing capstone
                </div>
              </div>
              <Switch checked={autoIssueCertificates} onCheckedChange={setAutoIssueCertificates} />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
              <div>
                <div className="text-xs font-semibold text-foreground">Public Verification Portal Link</div>
                <div className="text-[11px] text-muted-foreground">
                  Allow recruiters and third parties to verify certificate validity on /verify/:id
                </div>
              </div>
              <Switch checked={enablePublicVerification} onCheckedChange={setEnablePublicVerification} />
            </label>
          </div>
        </div>
      </div>

      {/* Staff Security & Notifications */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border">
          <Bell className="h-5 w-5 text-primary-text" />
          <h2 className="text-base font-bold text-foreground">Alerts & Security Governance</h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
            <div>
              <div className="text-xs font-semibold text-foreground">Require Multi-Factor Authentication (MFA)</div>
              <div className="text-[11px] text-muted-foreground">
                Enforce TOTP authenticator verification on all Teacher, Evaluator, and Admin staff sign-ins
              </div>
            </div>
            <Switch checked={requireMfaForStaff} onCheckedChange={setRequireMfaForStaff} />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
            <div>
              <div className="text-xs font-semibold text-foreground">Notify on New Learner Enrolment</div>
              <div className="text-[11px] text-muted-foreground">
                Send instant notification to academy staff whenever an order is paid
              </div>
            </div>
            <Switch checked={notifyOnEnrolment} onCheckedChange={setNotifyOnEnrolment} />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
            <div>
              <div className="text-xs font-semibold text-foreground">Cohort Seat Warning Alert (&gt;90% Fill)</div>
              <div className="text-[11px] text-muted-foreground">
                Alert operations team when cohort has fewer than 10 seats remaining
              </div>
            </div>
            <Switch checked={notifyOnLowBatchSeats} onCheckedChange={setNotifyOnLowBatchSeats} />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
            <div>
              <div className="text-xs font-semibold text-foreground">Notify on Refund / Chargeback Request</div>
              <div className="text-[11px] text-muted-foreground">
                Instant alert for financial review before reversal
              </div>
            </div>
            <Switch checked={notifyOnRefundRequest} onCheckedChange={setNotifyOnRefundRequest} />
          </label>
        </div>
      </div>
    </form>
  )
}

