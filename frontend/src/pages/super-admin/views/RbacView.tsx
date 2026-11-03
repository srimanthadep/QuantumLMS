import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  ShieldCheck,
  Lock,
  Sparkles,
  Info,
} from "lucide-react"
import type { useSuperAdminStore, RbacPermissionRow } from "@/data/adminStore"

interface RbacViewProps {
  store: ReturnType<typeof useSuperAdminStore>
  onToast: (msg: string) => void
}

export default function RbacView({ store, onToast }: RbacViewProps) {
  const { rbac, toggleRbacPermission } = store

  const handleToggle = (
    id: string,
    roleKey: "superAdmin" | "admin" | "teacher" | "evaluator" | "support" | "student",
    permName: string
  ) => {
    toggleRbacPermission(id, roleKey)
    onToast(`Updated permission "${permName}" for role ${roleKey}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-text">
            <ShieldCheck className="h-3.5 w-3.5" />
            Governance & Security Policy
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Role-Based Access Control (RBAC)
          </h1>
          <p className="text-sm text-muted-foreground">
            Granular capability matrix across the 6 system roles with automated security audit logging
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-primary-border bg-primary-soft p-3.5 text-xs text-primary-text flex items-center gap-2.5">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          Changes made here immediately take effect across Cognito token claims and API authorization filters.
        </span>
      </div>

      {/* RBAC Matrix Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 w-[300px]">Permission & Capability</th>
                <th className="px-4 py-3 text-center">Super Admin</th>
                <th className="px-4 py-3 text-center">Admin</th>
                <th className="px-4 py-3 text-center">Teacher</th>
                <th className="px-4 py-3 text-center">Evaluator</th>
                <th className="px-4 py-3 text-center">Support</th>
                <th className="px-4 py-3 text-center">Student</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rbac.map((row) => (
                <tr key={row.id} className="hover:bg-surface-2/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground text-xs">{row.permission}</div>
                      <div className="text-[11px] text-muted-foreground">{row.description}</div>
                    </div>
                  </td>

                  {/* Super Admin - Locked to True */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <Switch checked={row.superAdmin} disabled onCheckedChange={() => {}} />
                    </div>
                  </td>

                  {/* Admin */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={row.admin}
                        onCheckedChange={() => handleToggle(row.id, "admin", row.permission)}
                      />
                    </div>
                  </td>

                  {/* Teacher */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={row.teacher}
                        onCheckedChange={() => handleToggle(row.id, "teacher", row.permission)}
                      />
                    </div>
                  </td>

                  {/* Evaluator */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={row.evaluator}
                        onCheckedChange={() => handleToggle(row.id, "evaluator", row.permission)}
                      />
                    </div>
                  </td>

                  {/* Support */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={row.support}
                        onCheckedChange={() => handleToggle(row.id, "support", row.permission)}
                      />
                    </div>
                  </td>

                  {/* Student */}
                  <td className="px-4 py-3 text-center">
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
      </div>
    </div>
  )
}
