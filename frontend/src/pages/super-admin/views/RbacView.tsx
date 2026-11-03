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
  const { rbac, toggleRbacPermission } = store

  const handleToggle = (
    id: string,
    roleKey: "superAdmin" | "admin" | "teacher" | "evaluator" | "support" | "student",
    permName: string,
  ) => {
    toggleRbacPermission(id, roleKey)
    onToast(`Updated permission "${permName}" for role ${roleKey}`)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Role-Based Access Control (RBAC)"
        description="Granular capability matrix across the 6 system roles with automated security audit logging."
        breadcrumb={[{ label: "Platform Console", href: "/super-admin" }, { label: "Access Control" }]}
      />

      {/* Security Notice Banner */}
      <div className="rounded-lg border border-primary-border bg-primary-soft p-3.5 text-xs text-primary-text flex items-center gap-2.5">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          Policy changes made here take immediate effect across Cognito token claims, API middleware, and route gates.
        </span>
      </div>

      {/* RBAC Matrix Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base sm:text-lg">Permission Entitlement Matrix</CardTitle>
          <CardDescription>
            Configure read, write, and execute capabilities per user role
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
                          onCheckedChange={() => handleToggle(row.id, "admin", row.permission)}
                        />
                      </div>
                    </td>

                    {/* Teacher */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={row.teacher}
                          onCheckedChange={() => handleToggle(row.id, "teacher", row.permission)}
                        />
                      </div>
                    </td>

                    {/* Evaluator */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={row.evaluator}
                          onCheckedChange={() => handleToggle(row.id, "evaluator", row.permission)}
                        />
                      </div>
                    </td>

                    {/* Support */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={row.support}
                          onCheckedChange={() => handleToggle(row.id, "support", row.permission)}
                        />
                      </div>
                    </td>

                    {/* Student */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={row.student}
                          onCheckedChange={() => handleToggle(row.id, "student", row.permission)}
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
