import {
  Info,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  Switch,
} from "@/components/ui"
import type { useSuperAdminStore } from "@/data/adminStore"
import { cn } from "@/lib/utils"

interface RbacViewProps {
  store: ReturnType<typeof useSuperAdminStore>
  onToast: (msg: string) => void
}

export default function RbacView({ store, onToast }: RbacViewProps) {
  const { rbac } = store

  return (
    <div className="space-y-6">
      {store.error&&<p role="alert" className="text-destructive">{store.error}</p>}
      {/* Page Header */}
      <PageHeader
        title="Role-Based Access Control (RBAC)"
        description="Fixed server permissions across the six roles."
        breadcrumb={[{ label: "Platform Console", href: "/super-admin" }, { label: "Access Control" }]}
      />

      {/* Security Notice Banner */}
      <div className="rounded-lg border border-primary-border bg-primary-soft p-3.5 text-xs text-primary-text flex items-center gap-2.5">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          This policy is read-only. Access is enforced by the API and explicit course or batch assignments.
        </span>
      </div>

      {/* RBAC Matrix Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base sm:text-lg">Permission Entitlement Matrix</CardTitle>
          <CardDescription>
            Review the fixed role policy. Assignment and ownership checks also apply.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 min-w-[240px]">Permission & Capability</th>
                  <th className="px-4 py-3 text-center">Super Admin</th>
                  <th className="px-4 py-3 text-center">Admin</th>
                  <th className="px-4 py-3 text-center">Teacher</th>
                  <th className="px-4 py-3 text-center">Evaluator</th>
                  <th className="px-4 py-3 text-center">Support</th>
                  <th className="px-4 py-3 text-center">Student</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {rbac.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-2/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground text-sm">{row.permission}</div>
                      <div className="text-muted-foreground text-xs">{row.description}</div>
                      <span className="mt-1 inline-block rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
                        {row.category}
                      </span>
                    </td>

                    {/* Super Admin */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center" title="Immutable system permission">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </td>

                    {/* Admin */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={row.admin}
                          disabled
                          onCheckedChange={() => undefined}
                        />
                      </div>
                    </td>

                    {/* Teacher */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={row.teacher}
                          disabled
                          onCheckedChange={() => undefined}
                        />
                      </div>
                    </td>

                    {/* Evaluator */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={row.evaluator}
                          disabled
                          onCheckedChange={() => undefined}
                        />
                      </div>
                    </td>

                    {/* Support */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={row.support}
                          disabled
                          onCheckedChange={() => undefined}
                        />
                      </div>
                    </td>

                    {/* Student */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={row.student}
                          disabled
                          onCheckedChange={() => undefined}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
