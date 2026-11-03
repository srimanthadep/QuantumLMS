import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Settings,
  ShieldAlert,
  Server,
  Lock,
  Save,
  CheckCircle,
} from "lucide-react"
import type { useSuperAdminStore } from "@/data/adminStore"

interface SuperAdminSettingsViewProps {
  store: ReturnType<typeof useSuperAdminStore>
  onToast: (msg: string) => void
}

export default function SuperAdminSettingsView({ store, onToast }: SuperAdminSettingsViewProps) {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [ipWhitelisting, setIpWhitelisting] = useState(true)
  const [requireEncryptedSessions, setRequireEncryptedSessions] = useState(true)
  const [poolerMaxClients, setPoolerMaxClients] = useState(5)
  const [jwtClockSkewSecs, setJwtClockSkewSecs] = useState(5)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onToast("Global cloud infrastructure policies synchronized")
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Console & Security Configuration
          </h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide guardrails, database pooler caps, and zero-trust authentication policies
          </p>
        </div>

        <Button type="submit" className="gap-1.5">
          <Save className="h-4 w-4" />
          Save Global Config
        </Button>
      </div>

      {/* Cluster Guardrails */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border">
          <Server className="h-5 w-5 text-primary-text" />
          <h2 className="text-base font-bold text-foreground">PostgreSQL & Connection Pooler</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              DATABASE_POOL_MAX (Clients per Container)
            </label>
            <Input
              type="number"
              min={1}
              max={15}
              value={poolerMaxClients}
              onChange={(e) => setPoolerMaxClients(Number(e.target.value))}
            />
            <p className="text-[11px] text-muted-foreground">
              Supabase session pooler ceiling is 15 clients in development
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Cognito Token Clock Skew (Seconds)
            </label>
            <Input
              type="number"
              min={0}
              max={60}
              value={jwtClockSkewSecs}
              onChange={(e) => setJwtClockSkewSecs(Number(e.target.value))}
            />
            <p className="text-[11px] text-muted-foreground">
              Acceptable clock drift tolerance for jose JWT verification
            </p>
          </div>
        </div>
      </div>

      {/* Emergency & Security Toggles */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border">
          <ShieldAlert className="h-5 w-5 text-danger" />
          <h2 className="text-base font-bold text-foreground">Zero-Trust & Emergency Policies</h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
            <div>
              <div className="text-xs font-semibold text-foreground">Global Maintenance Mode</div>
              <div className="text-[11px] text-muted-foreground">
                Refuse all incoming non-admin traffic with HTTP 503 and custom status banner
              </div>
            </div>
            <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
            <div>
              <div className="text-xs font-semibold text-foreground">Strict Admin IP Whitelisting</div>
              <div className="text-[11px] text-muted-foreground">
                Restrict console access to recognized corporate VPN cidr blocks
              </div>
            </div>
            <Switch checked={ipWhitelisting} onCheckedChange={setIpWhitelisting} />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-2">
            <div>
              <div className="text-xs font-semibold text-foreground">Encrypted Session Tokens (JWE)</div>
              <div className="text-[11px] text-muted-foreground">
                Require nested encrypted payloads on top of signed Cognito JWTs
              </div>
            </div>
            <Switch
              checked={requireEncryptedSessions}
              onCheckedChange={setRequireEncryptedSessions}
            />
          </label>
        </div>
      </div>
    </form>
  )
}
