import { useState } from "react"
import {
  CheckCircle,
  Lock,
  Save,
  Server,
  Settings,
  ShieldAlert,
} from "lucide-react"
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageHeader,
  Switch,
} from "@/components/ui"
import type { useSuperAdminStore } from "@/data/adminStore"
import { cn } from "@/lib/utils"

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
      {/* Page Header */}
      <PageHeader
        title="Console & Security Configuration"
        description="Platform-wide guardrails, database pooler caps, and zero-trust authentication policies."
        breadcrumb={[{ label: "Platform Console", href: "/super-admin" }, { label: "Settings" }]}
        actions={
          <Button type="submit">
            <Save className="mr-1.5 h-4 w-4" />
            Save Global Config
          </Button>
        }
      />

      {/* Cluster Guardrails */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-primary-text" />
            PostgreSQL & Connection Pooler Guardrails
          </CardTitle>
          <CardDescription>
            Enforce Supabase session pooler limits (maximum 15 clients total across all dev environments)
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="DATABASE_POOL_MAX"
              hint="Max concurrent PostgreSQL clients (recommended <= 5 in development)"
            >
              <Input
                type="number"
                min={1}
                max={15}
                value={poolerMaxClients}
                onChange={(e) => setPoolerMaxClients(parseInt(e.target.value) || 5)}
              />
            </Field>

            <Field
              label="JWT Clock Skew Tolerance (Seconds)"
              hint="Allowed time drift between Cognito issuer and Fastify API"
            >
              <Input
                type="number"
                min={0}
                max={60}
                value={jwtClockSkewSecs}
                onChange={(e) => setJwtClockSkewSecs(parseInt(e.target.value) || 5)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Zero-Trust Authentication Guardrails */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary-text" />
            Zero-Trust Access & Device Invalidation
          </CardTitle>
          <CardDescription>
            Global credential requirements and session integrity checks
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border p-3 text-xs">
            <div>
              <p className="font-semibold text-foreground">Strict Cognito Token Validation</p>
              <p className="text-muted-foreground">
                Verify RSA key signature, audience client ID, and token use (`access` token only)
              </p>
            </div>
            <Switch checked={requireEncryptedSessions} onCheckedChange={setRequireEncryptedSessions} />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3 text-xs">
            <div>
              <p className="font-semibold text-foreground">CIDR IP Whitelisting for Admin Endpoints</p>
              <p className="text-muted-foreground">
                Restrict administrative mutations to authorized office and VPN IP blocks
              </p>
            </div>
            <Switch checked={ipWhitelisting} onCheckedChange={setIpWhitelisting} />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Platform Controls */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-danger" />
            Emergency Platform Killswitch
          </CardTitle>
          <CardDescription>
            Place academy portals into read-only maintenance mode during database schema migrations
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border p-3 text-xs">
            <div>
              <p className="font-semibold text-foreground">Platform Maintenance Mode</p>
              <p className="text-muted-foreground">
                Block new quiz submissions, live classroom streams, and student course registrations
              </p>
            </div>
            <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
